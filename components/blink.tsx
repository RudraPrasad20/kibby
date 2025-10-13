// components/BlinkShare.tsx (NEW)
'use client'

import { Button } from '@/components/ui/button'
import QRCode from "react-qr-code";

import { Clipboard } from 'lucide-react' // Add if using shadcn icons
import { toast } from 'sonner'

interface Props { url: string }

export function BlinkShare({ url }: Props) {


  const copyToClipboard = () => {
    navigator.clipboard.writeText(url)
    toast( 'Blink copied!')
  }

  return (
    <div className="flex flex-col items-center space-y-2 mt-4 p-4 border rounded-lg">
      <QRCode value={url} size={128} />
      <p className="text-sm text-muted-foreground">Scan or share to book instantly</p>
      <Button variant="outline" size="sm" onClick={copyToClipboard}>
        <Clipboard className="w-4 h-4 mr-2" />
        Copy Blink Link
      </Button>
    </div>
  )
}