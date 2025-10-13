// app/meet/[slug]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useParams, useRouter } from 'next/navigation'
import { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { WalletConnectButton } from '@/components/walletConnectButton'



interface Meeting {
  id: string
  title: string
  description?: string
  duration: number
  price: number
  creatorWallet: string
  slug: string
  bookings: { id: string; userWallet: string }[]
}

export default function BookMeeting() {
  const params = useParams()
  const slug = params.slug as string
  const router = useRouter()
  const { publicKey, sendTransaction } = useWallet()
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)

  useEffect(() => {
    if (!slug) {
      setLoading(false)
      return
    }

    fetch(`/api/meetings/${slug}`)
      .then(res => {
        if (!res.ok) {
          throw new Error('Meeting not found')
        }
        return res.json()
      })
      .then((data: Meeting) => setMeeting(data))
      .catch(() => setMeeting(null))
      .finally(() => setLoading(false))
  }, [slug])

  const handleBook = async () => {
    if (!publicKey || !meeting) return

    const userWallet = publicKey.toBase58()
    if (meeting.bookings.some(b => b.userWallet === userWallet)) {
      toast( 'Already booked!' )
      return
    }

    setBooking(true)
    try {
      const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL!)

      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(meeting.creatorWallet),
          lamports: Math.floor(meeting.price * LAMPORTS_PER_SOL)
        })
      )

      const signature = await sendTransaction(tx, connection)
      await connection.confirmTransaction(signature)

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: meeting.id,
          userWallet,
          transactionSig: signature
        })
      })

      if (res.ok) {
        toast( 'Booked successfully!' )
        router.push('/user/dashboard')
      } else {
        toast( 'Booking failed after payment' )
      }
    } catch (error) {
      console.error(error)
      toast( 'Payment or booking failed' )
    }
    setBooking(false)
  }

  if (loading) return <div className="container mx-auto py-8">Loading...</div>
  if (!meeting) return <div className="container mx-auto py-8">Meeting not found</div>

  return (
    <div className="container mx-auto py-8 max-w-md">
      <WalletConnectButton />
      <Card>
        <CardHeader>
          <CardTitle>{meeting.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {meeting.description && <p>{meeting.description}</p>}
          <p>Duration: {meeting.duration} minutes</p>
          <p className="text-lg font-semibold">Price: {meeting.price} SOL</p>
          <Button
            onClick={handleBook}
            disabled={booking || !publicKey}
            className="w-full"
          >
            {booking ? 'Booking...' : 'Book Meeting'}
          </Button>
          {publicKey && (
            <p className="text-sm text-muted-foreground text-center">
              Paying to: {meeting.creatorWallet.slice(0, 4)}...{meeting.creatorWallet.slice(-4)}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}