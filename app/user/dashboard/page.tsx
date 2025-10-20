'use client'

import { useEffect, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { WalletConnectButton } from '@/components/walletConnectButton' // Assuming this is needed for initial connection if not already connected
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
import { toast } from 'sonner' // Ensure sonner is imported for toasts
import { CopyIcon } from 'lucide-react'
import axios from 'axios'

interface Booking {
  id: string
  meeting: {
    id: string
    title: string
    slug?: string
    price: number
  }
  bookedAt: string
  status: string
  transactionSig: string
}

export default function UserDashboard() {
  const { publicKey } = useWallet()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  const handleCopyLink = (text: string, message: string) => {
    navigator.clipboard.writeText(text)
    toast.success(message)
  }

  useEffect(() => {
    if (!publicKey) {
      setLoading(false)
      return
    }
  
    axios.get<Booking[]>(`/api/bookings`, {
        params: { wallet: publicKey.toBase58() },
      })
      .then((res) => {
        setBookings(res.data)
      })
      .catch((error) => {
        console.error('Error fetching bookings:', error)
        toast.error('Failed to load your bookings.')
      })
      .finally(() => setLoading(false))
  }, [publicKey])

  if (loading) return <div className="container mx-auto py-8"><Loading /></div>

  if (!publicKey) {
    return (
      <div className="container mx-auto py-16 px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mb-6">My Bookings</h1>
        <p className="text-lg text-gray-700 dark:text-gray-300 mb-8">
          Connect your wallet to view your scheduled meetings.
        </p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">My Bookings</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bookings.length > 0 ? (
          bookings.map((booking) => (
            <Card key={booking.id} className="flex flex-col justify-between shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out">
              <CardHeader className="border-b pb-4">
                <CardTitle className="flex items-center justify-between text-xl font-semibold text-gray-800 dark:text-gray-200">
                  <span>{booking.meeting.title}</span>
                  <Badge className={`px-3 py-1 text-sm font-medium ${booking.status === 'Completed' ? 'bg-green-500 hover:bg-green-600' : booking.status === 'Pending' ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-gray-500 hover:bg-gray-600'}`}>
                    {booking.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow space-y-4 py-6">
                <div className="flex justify-between items-center text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Price:</span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{booking.meeting.price} SOL</span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>Booked On:</span>
                  <span>{new Date(booking.bookedAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3 pt-4 border-t">
                {booking.meeting.slug && (
                  <Link href={`/meet/${booking.meeting.slug}`} className="w-full">
                    <Button variant="outline" className="w-full cursor-pointer">View Meeting Details</Button>
                  </Link>
                )}
                {booking.transactionSig ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="secondary" className="w-full cursor-pointer">View Transaction</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Transaction Details</DialogTitle>
                        <DialogDescription>
                          Here is the transaction signature for your booking.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex items-center space-x-2">
                        <div className="grid flex-1 gap-2">
                          <Label htmlFor="tx-sig" className="sr-only">
                            Transaction Signature
                          </Label>
                          <Input
                            id="tx-sig"
                            defaultValue={booking.transactionSig}
                            readOnly
                          />
                        </div>
                        <Button type="submit" size="sm" className="px-3" onClick={() => handleCopyLink(booking.transactionSig, 'Transaction signature copied!')}>
                          <span className="sr-only">Copy</span>
                          <CopyIcon className="h-4 w-4 cursor-pointer" />
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
                ) : (
                  <Button variant="secondary" disabled className="w-full opacity-70 cursor-not-allowed">Transaction Pending</Button>
                )}
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-16 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-inner">
            <p className="text-xl font-semibold text-gray-600 dark:text-gray-300 mb-4">You haven not booked any meetings yet.</p>
            {/* You could add a link here to browse available meetings if applicable */}
            <p className="mt-8 text-gray-500 dark:text-gray-400 text-sm">
              Discover and book new meetings to get started!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}