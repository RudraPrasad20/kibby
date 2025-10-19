// app/creator/page.tsx (full updated file with Blink integration)
"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
import QRCode from "react-qr-code";
import { useRouter } from "next/navigation";
import axios from "axios";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  duration: z.enum(["15", "30", "45", "60"], { error: "Duration is required" }),
  price: z.enum(["0.1", "0.2", "0.3"], { error: "Price is required" }),
});

type FormData = z.infer<typeof formSchema>;

export default function CreateMeeting() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  // NEW: State for Blink URL
  const [blinkUrl, setBlinkUrl] = useState("");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      duration: "30",
      price: "0.1",
    },
  });

  async function onSubmit(values: FormData) {
    if (!publicKey) {
      toast("Connect wallet first");
      return;
    }

    const parsedValues = {
      ...values,
      duration: parseInt(values.duration, 10),
      price: parseFloat(values.price),
    };

    setLoading(true);
    try {
      const res = await axios.post("/api/meetings", {
        ...parsedValues,
        creatorWallet: publicKey.toBase58(),
      });
      const meetingData = res.data;
      toast("Meeting created!");
      form.reset();

      // NEW: Generate Blink URL after creation
      const baseUrl = window.location.origin; // e.g., https://kibby.vercel.app
      const generatedBlinkUrl = `${baseUrl}/api/actions/book-meeting?meetingId=${meetingData.id}&amount=${parsedValues.price}`;
      setBlinkUrl(generatedBlinkUrl);
      toast.success(`Blink ready: ${generatedBlinkUrl}`);
      router.push(`/creator/${meetingData.slug}`);
    } catch (error) {
      console.log(error);
      toast("Error creating meeting");
    }
    setLoading(false);
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Create New Meeting</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter meeting title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter meeting description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="15">15</SelectItem>
                        <SelectItem value="30">30</SelectItem>
                        <SelectItem value="45">45</SelectItem>
                        <SelectItem value="60">60</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (SOL)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select price" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0.1">0.1</SelectItem>
                        <SelectItem value="0.2">0.2</SelectItem>
                        <SelectItem value="0.3">0.3</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={loading || !publicKey}
                className="w-full"
              >
                {loading ? "Creating..." : "Create Meeting"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* NEW: Blink Display Section */}
      {blinkUrl && (
        <Card className="max-w-md mx-auto mt-6">
          <CardHeader>
            <CardTitle>Blink Ready to Share!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input value={blinkUrl} readOnly className="text-xs" />
            <Button
              onClick={() => {
                navigator.clipboard.writeText(blinkUrl);
                toast.success("Blink copied!");
              }}
              className="w-full"
            >
              Copy Blink Link
            </Button>
            <QRCode value={blinkUrl} size={200} className="mx-auto" />
            <p className="text-sm text-muted-foreground">
              Share on X, Discord, or scan for instant booking!
            </p>
          </CardContent>
        </Card>
      )}

      {publicKey && (
        <Link
          href="/creator/dashboard"
          className="block mt-4 text-blue-600 hover:underline"
        >
          View Dashboard
        </Link>
      )}
    </div>
  );
}
