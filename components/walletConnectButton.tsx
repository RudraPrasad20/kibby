// components/WalletConnectButton.tsx
'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'

export function WalletConnectButton() {
  const { publicKey } = useWallet()

  return (
    <div className="flex justify-end p-4">
      <WalletMultiButton className="!bg-blue-600 !text-white hover:!bg-blue-700" />
      {publicKey && (
        <p className="ml-2 text-sm text-muted-foreground">
          {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
        </p>
      )}
    </div>
  )
}