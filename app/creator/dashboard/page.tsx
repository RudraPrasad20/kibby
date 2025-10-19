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
import { createWebhook } from '@/lib/helius'
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

interface Meeting {
  id: string
  title: string
  slug: string
  price: number
  iconUrl?: string
  createdAt: string
  bookings: { id: string }[]
}

export default function CreatorDashboard() {
  const { publicKey } = useWallet()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'

  const handleDelete = async (meetingId: string) => {
    if (!confirm('Are you sure you want to delete this meeting? This action cannot be undone.')) return

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

  useEffect(() => {
    if (!publicKey) return

    createWebhook(`${baseUrl}/api/webhooks`).catch(console.error)

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
        <Link href="/creator/create">
          <Button className="w-full sm:w-auto cursor-pointer">Create New Meeting</Button>
        </Link>
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
                            <Label htmlFor="meeting-link" className="sr-only">
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
                            <Label htmlFor="blink-link" className="sr-only">
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
                  <Button
                    variant="destructive"
                    onClick={() => handleDelete(meeting.slug)}
                    className="w-full cursor-pointer"
                  >
                    Delete Meeting
                  </Button>
                </CardFooter>
              </Card>
            )
          })
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-16 bg-gray-200 dark:bg-gray-800 rounded-lg shadow-inner">
            <p className="text-xl font-semibold text-gray-600 dark:text-gray-300 mb-4">You haven not created any meetings yet.</p>
            <Link href="/creator">
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