'use client'

import { useEffect, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

import { Badge } from '@/components/ui/badge'
// New: Mock preview
import { generateBlinkUrl } from '@/lib/utils'
import { createWebhook } from '@/lib/helius'
import { WalletConnectButton } from '@/components/walletConnectButton'
import { BlinkShare } from '@/components/blink'
import { BlinkPreview } from '@/components/blinkPreview'

interface Meeting {
  id: string
  title: string
  slug: string
  price: number
  iconUrl?: string  // New: For Blink icon
  createdAt: string
  bookings: { id: string }[]
}

export default function CreatorDashboard() {
  const { publicKey } = useWallet()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'

  useEffect(() => {
    if (!publicKey) return

    createWebhook(`${baseUrl}/api/webhooks`).catch(console.error)

    fetch(`/api/meetings?wallet=${publicKey.toBase58()}&type=creator`)
      .then(res => res.json())
      .then(setMeetings)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [publicKey, baseUrl])

  if (loading) return <div className="container mx-auto py-8">Loading...</div>

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Creator Dashboard</h1>
        <WalletConnectButton />
      </div>
      <div className="grid gap-4">
        {meetings.map((meeting) => {
          const blinkUrl = generateBlinkUrl(baseUrl, meeting.id)
          return (
            <Card key={meeting.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <span>{meeting.title}</span>
                  <Badge>{meeting.bookings.length} bookings</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p>Price: {meeting.price} SOL</p>
                <p>Share: /meet/{meeting.slug}</p>
                <p className="text-sm">Blink URL: <a href={blinkUrl} className="text-blue-600 hover:underline break-all">{blinkUrl}</a></p>
                <BlinkShare url={blinkUrl} />  
                <BlinkPreview  // <-- Here: Mock UI preview
                  title={meeting.title}
                  price={meeting.price}
                  iconUrl={meeting.iconUrl}
                  blinkUrl={blinkUrl}
                />
                <Link href={`/creator/${meeting.slug}`}>
                  <Button variant="outline" className="w-full">View Details</Button>
                </Link>
              </CardContent>
            </Card>
          )
        })}
      </div>
      {meetings.length === 0 && <p>No meetings yet. <Link href="/creator" className="text-blue-600 hover:underline">Create one</Link></p>}
    </div>
  )
}