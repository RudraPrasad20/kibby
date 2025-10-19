'use client'
import { Button } from '@/components/ui/button'
import { Clipboard } from 'lucide-react'
import { toast } from 'sonner'
import QRCode from 'react-qr-code'

interface Props {
  url: string
  price?: number  // SOL amount
  recipient?: string  // Wallet address as string
}

export function BlinkShare({ url, price, recipient }: Props) {
  const deepLink = price && recipient 
    ? `https://phantom.app/ul/browse/${btoa(JSON.stringify({ type: 'pay', params: { recipient, amount: price.toString() } }))}`  // Simplified Phantom deep link
    : url

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(deepLink)
      toast.success('Blink copied! Open in Phantom for payment.')
    } catch (err) {
      console.log(err)
      toast.error('Copy failed—copy manually.')
      // Fallback: Create a temp input and select it
      const textArea = document.createElement('textarea')
      textArea.value = deepLink
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
  }

  return (
    <div className="flex flex-col items-center space-y-4 p-4 border rounded-lg">
      <h3 className="text-lg font-semibold">Scan to book instantly</h3>
      <QRCode value={deepLink} size={200} />
      <Button onClick={copyToClipboard} variant="outline" className="flex items-center gap-2">
        <Clipboard size={16} />
        Copy Blink Link
      </Button>
      {price && <p className="text-sm text-muted-foreground">Pays {price} SOL</p>}
    </div>
  )
}