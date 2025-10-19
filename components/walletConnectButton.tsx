
'use client'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'

export function WalletConnectButton() {

  return (
    <div className="flex justify-end p-4">
      <WalletMultiButton className="!bg-blue-600 !text-white hover:!bg-blue-700" />
    </div>
  )
}