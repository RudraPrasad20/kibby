'use client'

import { useEffect, useState, useMemo } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useParams, useRouter } from 'next/navigation'
import { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card' // Added CardDescription, CardFooter
import { toast } from 'sonner'
import { WalletConnectButton } from '@/components/walletConnectButton'
import Loading from '@/app/loading'
import axios from 'axios'
import { Loader2 } from 'lucide-react' // For loading spinner on button

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
  const { publicKey, sendTransaction, connected } = useWallet() // Added 'connected'
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [loading, setLoading] = useState(true)
  const [isBooking, setIsBooking] = useState(false) // Renamed for clarity

  const userHasBooked = useMemo(() => {
    if (!publicKey || !meeting) return false
    return meeting.bookings.some((b) => b.userWallet === publicKey.toBase58())
  }, [publicKey, meeting])

  useEffect(() => {
    if (!slug) {
      setLoading(false)
      return
    }

    axios.get<Meeting>(`/api/meetings/${slug}`)
      .then((res) => setMeeting(res.data))
      .catch((error) => {
        console.error("Failed to fetch meeting:", error);
        setMeeting(null);
        toast.error("Failed to load meeting details.");
      })
      .finally(() => setLoading(false))
  }, [slug])

  const handleBook = async () => {
    if (!publicKey || !meeting) {
      toast.error("Please connect your wallet to book a meeting.");
      return;
    }
    if (userHasBooked) {
      toast.info("You've already booked this meeting.");
      return;
    }

    setIsBooking(true)
    try {
      const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL!)

      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(meeting.creatorWallet),
          lamports: Math.floor(meeting.price * LAMPORTS_PER_SOL),
        })
      )

      const signature = await sendTransaction(tx, connection)
      await connection.confirmTransaction(signature, 'confirmed') // Use 'confirmed' for better reliability

      await axios.post('/api/bookings', {
        meetingId: meeting.id,
        userWallet: publicKey.toBase58(),
        transactionSig: signature,
      })

      toast.success('Meeting booked successfully!')
      router.push('/user/dashboard')
    } catch (error) {
      console.error('Payment or booking failed:', error)
      if (error) {
        toast.error("Transaction cancelled by user.");
      } else {
        toast.error('Payment or booking failed. Please try again.');
      }
    } finally {
      setIsBooking(false)
    }
  }

  // Loading State
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] px-4 sm:px-6 lg:px-8">
        <Loading />
      </div>
    );
  }

  // Meeting Not Found State
  if (!meeting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 sm:px-6 lg:px-8 text-center bg-background">
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 mb-4">Meeting Not Found</h1>
        <p className="text-lg text-gray-700 dark:text-gray-300 mb-8">
          The meeting you are looking for does not exist or has been removed.
        </p>
        <Button onClick={() => router.push('/')}>Go to Homepage</Button>
      </div>
    );
  }

  // Main Content
  return (
    <div className="flex justify-center items-start py-8 px-4 sm:px-6 lg:px-8 min-h-[80vh] bg-background">
      <Card className="w-full max-w-lg shadow-xl dark:bg-gray-800 border-2 dark:border-gray-700">
        <CardHeader className="pb-4 border-b dark:border-gray-700">
          <CardTitle className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {meeting.title}
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400 mt-2">
            A {meeting.duration}-minute session with {meeting.creatorWallet.slice(0, 6)}...{meeting.creatorWallet.slice(-6)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 py-6 text-gray-700 dark:text-gray-300">
          {meeting.description && (
            <div>
              <h3 className="font-semibold text-lg mb-2 dark:text-gray-200">Description</h3>
              <p className="text-base leading-relaxed">{meeting.description}</p>
            </div>
          )}

          <div className="flex justify-between items-center text-xl font-bold">
            <span>Price:</span>
            <span className="text-blue-600 dark:text-blue-400">{meeting.price} SOL</span>
          </div>

          <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400 pt-2">
            <span>Creator Wallet:</span>
            <span className="font-mono text-xs md:text-sm">
              {meeting.creatorWallet.slice(0, 8)}...{meeting.creatorWallet.slice(-8)}
            </span>
          </div>

          {!connected && (
            <div className="pt-4 text-center">
              <p className="text-md text-gray-600 dark:text-gray-300 mb-4">
                Connect your wallet to book this meeting.
              </p>
              <WalletConnectButton />
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-6 border-t dark:border-gray-700">
          <Button
            onClick={handleBook}
            disabled={isBooking || userHasBooked || !connected}
            className="w-full h-12 text-lg font-semibold cursor-pointer"
          >
            {isBooking ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Booking...
              </>
            ) : userHasBooked ? (
              'Already Booked'
            ) : (
              `Pay ${meeting.price} SOL & Book`
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}