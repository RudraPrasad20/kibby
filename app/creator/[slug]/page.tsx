// app/creator/[slug]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Loading from "@/app/loading";
import QRCode from "react-qr-code";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";
import { CopyIcon } from "lucide-react";

interface Booking {
  id: string;
  userWallet: string;
  bookedAt: string;
  status: string;
}

interface Meeting {
  id: string;
  title: string;
  description?: string;
  duration: number;
  price: number;
  creatorWallet: string;
  bookings: Booking[];
}

export default function MeetingDetails() {
  const params = useParams();
  const slug = params.slug as string;
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [blinkUrl, setBlinkUrl] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }

    axios
      .get(`/api/meetings/${slug}`)
      .then((res) => {
        if (res.status !== 200) {
          throw new Error("Meeting not found");
        }
        return res.data;
      })
      .then((data: Meeting) => {
        setMeeting(data);
        const baseUrl = window.location.origin;
        const generatedBlinkUrl = `${baseUrl}/api/actions/book-meeting?meetingId=${data.id}&amount=${data.price}`;
        setBlinkUrl(generatedBlinkUrl);
      })
      .catch(() => setMeeting(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading)
    return (
      <div className="container mx-auto py-8">
        <Loading />
      </div>
    );
  if (!meeting)
    return <div className="container mx-auto py-8">Meeting not found</div>;

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 mb-8">
        {/* Meeting Details Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              {meeting.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {meeting.description && (
              <p className="text-muted-foreground">{meeting.description}</p>
            )}
            <div className="flex justify-between items-center text-lg">
              <span>Duration:</span>
              <Badge variant="outline" className="px-3 py-1 text-base">
                {meeting.duration} min
              </Badge>
            </div>
            <div className="flex justify-between items-center text-lg">
              <span>Price:</span>
              <Badge variant="outline" className="px-3 py-1 text-base">
                {meeting.price} SOL
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Blink Share Card */}
        {blinkUrl && (
          <Card className="md:col-span-1 flex flex-col justify-between">
            <CardHeader>
              <CardTitle className="text-xl font-bold">
                Blink Ready to Share!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 flex flex-col items-center">
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
              <div className="p-2 border rounded-lg bg-white shadow-sm">
                <QRCode value={blinkUrl} size={160} />
              </div>
              <p className="text-sm text-center text-muted-foreground">
                Share on X, Discord, or scan for instant booking!
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bookings Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-xl font-bold">
            Bookings ({meeting.bookings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {meeting.bookings.length === 0 ? (
            <p className="text-muted-foreground">No bookings yet.</p>
          ) : (
            <div className="space-y-3">
              {meeting.bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border rounded-lg hover:bg-accent transition-colors duration-200"
                >
                  <span className="font-medium text-blue-600 dark:text-blue-400 mb-1 sm:mb-0">
                    {booking.userWallet.slice(0, 6)}...
                    {booking.userWallet.slice(-6)}
                  </span>
                  <div className="flex items-center gap-3 text-sm">
                  <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              onClick={() => {
                navigator.clipboard.writeText(booking.userWallet);
                toast.success("Wallet address copied!");
              }}
              aria-label="Copy wallet address"
            >
              <CopyIcon className="h-4 w-4 cursor-pointer" />
            </Button>
                    <span className="text-muted-foreground">
                      {new Date(booking.bookedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <Badge
                      variant={
                        booking.status === "confirmed" ? "default" : "secondary"
                      }
                      className={`capitalize ${
                        booking.status === "confirmed"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                      }`}
                    >
                      {booking.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}