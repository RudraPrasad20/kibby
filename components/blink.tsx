'use client'

import { Button } from '@/components/ui/button'
import QRCode from 'react-qr-code'  // Ensure installed: npm i qrcode.react
import { Clipboard } from 'lucide-react'  // npm i lucide-react
import { toast } from 'sonner'

interface Props { url: string }

export function BlinkShare({ url }: Props) {

  const copyToClipboard = () => {
    navigator.clipboard.writeText(url)
    toast( 'Blink copied!' )
  }

  return (
    <div className="flex flex-col items-center space-y-2 p-3 border rounded">
      <QRCode value={url} size={128} />  
      <p className="text-xs text-muted-foreground">Scan to book instantly</p>
      <Button variant="outline" size="sm" onClick={copyToClipboard}>
        <Clipboard className="w-4 h-4 mr-2" />
        Copy Link
      </Button>
    </div>
  )
}