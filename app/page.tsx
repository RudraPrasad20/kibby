// app/page.tsx

import { BlinkShare } from "@/components/blink";
import { BlinkPreview } from "@/components/blinkPreview";
import { WalletConnectButton } from "@/components/walletConnectButton";
import Link from "next/link";


export default function Home() {
  const meeting = {
    title: "ddj",
    price: 90,
    iconUrl: ""
  }
  const blinkUrl = "https://"
  return (
    <div className="container mx-auto py-8">
      <WalletConnectButton />
      <h1 className="text-4xl font-bold text-center mb-8">Solana Meetings</h1>
      <div className="grid grid-cols-2 gap-8">
        <div className="p-6 border rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">Creators</h2>
          <p>Create and manage meetings.</p>
          <Link href="/creator" className="text-blue-600 hover:underline">Go to Creator Dashboard</Link>
        </div>
        <div className="p-6 border rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">Users</h2>
          <p>Book meetings with SOL.</p>
          <p>Share a link like /meet/[slug] to book.</p>
        </div>
        <BlinkShare url={blinkUrl} />  
                <BlinkPreview  // <-- Here: Mock UI preview
                  title={meeting.title}
                  price={meeting.price}
                  iconUrl={meeting.iconUrl}
                  blinkUrl={blinkUrl}
                />
      </div>
    </div>
  )
}