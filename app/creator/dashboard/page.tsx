'use client'

import { useEffect, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import axios from 'axios'
import { generateBlinkUrl } from '@/lib/utils'

import Loading from '@/app/loading'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CopyIcon } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Meeting {
  id: string
  title: string
  slug: string
  price: number
  iconUrl?: string
  createdAt: string
  bookings: { id: string; userWallet: string; status: string }[]  // Include status for badges
}

export default function CreatorDashboard() {
  const { publicKey } = useWallet()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)  // NEW: For refresh button
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'

  const handleDelete = async (meetingId: string) => {
    try {
      await axios.delete(`/api/meetings/${meetingId}`, {
        data: { wallet: publicKey?.toBase58() }
      })
      setMeetings(prev => prev.filter(m => m.id !== meetingId))
      toast.success('Meeting deleted successfully')
    } catch (error) {
      console.error(error)
      toast.error('Error deleting meeting')
    }
  }

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link)
    toast.success('Link copied to clipboard!')
  }

  // NEW: Refresh function for testing after Blink pay
  const refreshMeetings = async () => {
    setRefreshing(true);
    try {
      if (!publicKey) {
        toast.error('Please connect your wallet');
        setRefreshing(false);
        return;
      }
      const res = await axios.get(`/api/meetings?wallet=${publicKey.toBase58()}&type=creator`);
      setMeetings(res.data);
      toast.success('Dashboard refreshed!');
    } catch (error) {
      console.log(error)
      toast.error('Refresh failed');
    }
    setRefreshing(false);
  };

  // NEW: Confirm pending booking
  const confirmBooking = async (bookingId: string) => {
    try {
      await axios.post('/api/bookings/confirm', { bookingId });
      toast.success('Booking confirmed!');
      refreshMeetings();  // Refresh to update
    } catch (error) {
      console.log(error)
      toast.error('Confirm failed');
    }
  };

  useEffect(() => {
    if (!publicKey) return

    axios.get(`/api/meetings?wallet=${publicKey.toBase58()}&type=creator`)
      .then(res => res.data)
      .then(setMeetings)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [publicKey, baseUrl])

  if (loading) return <div className="container mx-auto py-8"><Loading /></div>

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">Your Meetings</h1>
        <div className="flex gap-2">
          <Button onClick={refreshMeetings} disabled={refreshing} variant="outline">
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Link href="/creator/create">
            <Button className="w-full sm:w-auto cursor-pointer">Create New Meeting</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {meetings.length > 0 ? (
          meetings.map((meeting) => {
            const meetingShareUrl = `${baseUrl}/meet/${meeting.slug}`
            const blinkUrl = generateBlinkUrl(baseUrl, meeting.id, meeting.price)
            return (
              <Card key={meeting.id} className="flex flex-col justify-between shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out">
                <CardHeader className="border-b pb-4">
                  <CardTitle className="flex items-center justify-between text-xl font-semibold text-gray-800 dark:text-gray-200">
                    <span>{meeting.title}</span>
                    <Badge variant="secondary" className="px-3 py-1 text-sm font-medium">
                      {meeting.bookings.length} Bookings
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-grow space-y-4 py-6">
                  <div className="flex justify-between items-center text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Price:</span>
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{meeting.price} SOL</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Created:</span>
                    <span>{new Date(meeting.createdAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 pt-4 border-t">
                  <div className="flex gap-2 w-full">
                    <Link href={`/creator/${meeting.slug}`} className="flex-1">
                      <Button variant="outline" className="w-full cursor-pointer">View Details</Button>
                    </Link>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="cursor-pointer">Share</Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Share Meeting Link</DialogTitle>
                          <DialogDescription>
                            Share this link with your audience to book a meeting.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex items-center space-x-2">
                          <div className="grid flex-1 gap-2">
                            <Label htmlFor="meeting-link">
                              Meeting Link
                            </Label>
                            <Input
                              id="meeting-link"
                              defaultValue={meetingShareUrl}
                              readOnly
                            />
                          </div>
                          <Button type="submit" size="sm" className="px-3 cursor-pointer" onClick={() => handleCopyLink(meetingShareUrl)}>
                            <span className="sr-only">Copy</span>
                            <CopyIcon className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="grid flex-1 gap-2">
                            <Label htmlFor="blink-link">
                              Blink URL
                            </Label>
                            <Input
                              id="blink-link"
                              defaultValue={blinkUrl}
                              readOnly
                            />
                          </div>
                          <Button type="submit" size="sm" className="px-3 cursor-pointer" onClick={() => handleCopyLink(blinkUrl)}>
                            <span className="sr-only">Copy Blink URL</span>
                            <CopyIcon className="h-4 w-4" />
                          </Button>
                        </div>
                        <DialogFooter className="sm:justify-start">
                          <DialogClose asChild>
                            <Button type="button" variant="secondary" className='cursor-pointer'>
                              Close
                            </Button>
                          </DialogClose>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  {/* AlertDialog for Delete Confirmation */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        className="w-full cursor-pointer"
                      >
                        Delete Meeting
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your
                          meeting &quot;{meeting.title}&quot; and all associated bookings.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(meeting.id)}>
                          Continue
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardFooter>
                {/* NEW: Show bookings list with status */}
                {meeting.bookings.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Bookings</h3>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {meeting.bookings.map((booking) => (
                        <div key={booking.id} className="flex justify-between items-center p-2 border rounded text-sm">
                          <span>{booking.userWallet.slice(0, 4)}...{booking.userWallet.slice(-4)}</span>
                          <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>{booking.status}</Badge>
                          {booking.status === 'pending' && (
                            <Button size="sm" onClick={() => confirmBooking(booking.id)} className="ml-2">Confirm</Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )
          })
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-16 bg-gray-200 dark:bg-gray-800 rounded-lg shadow-inner">
            <p className="text-xl font-semibold text-gray-600 dark:text-gray-300 mb-4">You haven&apos;t created any meetings yet.</p>
            <Link href="/creator/create">
              <Button size="lg" className='cursor-pointer'>Create Your First Meeting</Button>
            </Link>
            <p className="mt-8 text-gray-500 dark:text-gray-400 text-sm">
              Start building your schedule and connect with your audience!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}