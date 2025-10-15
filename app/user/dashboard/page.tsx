// app/user/dashboard/page.tsx (minor tweaks for consistency)
'use client'

import { useEffect, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

import { Badge } from '@/components/ui/badge'
import { WalletConnectButton } from '@/components/walletConnectButton'
import Loading from '@/app/loading'

interface Booking {
  id: string
  meeting: {
    id: string
    title: string
    slug?: string
    price: number
  }
  bookedAt: string  // Assuming this maps to createdAt in Prisma
  status: string
  transactionSig: string
}

export default function UserDashboard() {
  const { publicKey } = useWallet()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!publicKey) {
      setLoading(false)
      return
    }

    fetch(`/api/bookings?wallet=${publicKey.toBase58()}`)
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to fetch')
        }
        return res.json()
      })
      .then((data: Booking[]) => {
        console.log('Fetched bookings:', data)
        setBookings(data)
      })
      .catch((error) => {
        console.error('Error fetching bookings:', error)
      })
      .finally(() => setLoading(false))
  }, [publicKey])

  if (loading) return <div className="container mx-auto py-8"><Loading/></div>

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Bookings</h1>
        <WalletConnectButton />
      </div>
      <div className="grid gap-4">
        {bookings.map((booking) => (
          <Card key={booking.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-start">
                <span>{booking.meeting.title}</span>
                <Badge>{booking.status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>Price: {booking.meeting.price} SOL</p>
              <p>Date: {new Date(booking.bookedAt).toLocaleDateString()}</p>
              <p>Tx: {booking.transactionSig ? `${booking.transactionSig.slice(0, 8)}...` : 'Pending'}</p> 
              {booking.meeting.slug && (
                <Link href={`/meet/${booking.meeting.slug}`}>
                  <Button variant="outline" className="mt-2">View Meeting</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {bookings.length === 0 && <p>No bookings yet.</p>}
      {/* Optional: Link to creator if user is creator */}
      <Link href='/creator/dashboard' className="block mt-4 text-blue-600 hover:underline">Creator Dashboard</Link>
    </div>
  )
}