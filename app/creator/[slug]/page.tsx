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
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>{meeting.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {meeting.description && <p>{meeting.description}</p>}
          <p>Duration: {meeting.duration} min</p>
          <p>Price: {meeting.price} SOL</p>
          <h3 className="font-semibold">
            Bookings ({meeting.bookings.length})
          </h3>
          <div className="space-y-2">
            {meeting.bookings.map((booking) => (
              <div
                key={booking.id}
                className="flex justify-between items-center p-2 border rounded"
              >
                <span>
                  {booking.userWallet.slice(0, 4)}...
                  {booking.userWallet.slice(-4)}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {new Date(booking.bookedAt).toLocaleDateString()}
                  </span>
                  <Badge
                    variant={
                      booking.status === "confirmed" ? "default" : "secondary"
                    }
                  >
                    {booking.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
}
