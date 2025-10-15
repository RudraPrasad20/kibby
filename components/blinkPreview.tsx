'use client'

import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { Input } from '@/components/ui/input'

interface Props {
  title: string
  price: number
  iconUrl?: string
  blinkUrl: string
}

export function BlinkPreview({ title, price, iconUrl, blinkUrl }: Props) {
  return (
    <div className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50">
      <h4 className="font-semibold mb-3 text-center text-sm">Blink Preview (Mock - Full in Wallet)</h4>
      <div className="flex items-center space-x-3 mb-3 p-3 bg-white rounded shadow-sm">
        <Image 
          src={iconUrl || '/api/meeting-icon.svg'}  // Dynamic or fallback
          alt="Icon" 
          width={40} 
          height={40} 
          className="rounded-full" 
        />
        <div className="flex-1">
          <p className="font-medium">{title}</p>
          <p className="text-sm text-gray-600">Pay {price} SOL to book</p>
        </div>
        <div className="ml-auto">
          <Input 
            type="number" 
            defaultValue={price} 
            min={price} 
            className="w-20 text-right" 
            placeholder="SOL" 
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="flex-1" disabled>Book Meeting</Button> 
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => window.open(blinkUrl, '_blank')} 
          className="px-2"
        >
          Test →
        </Button>
      </div>
      <p className="text-xs text-gray-500 mt-2 text-center">Paste link in Phantom for real interaction</p>
    </div>
  )
}