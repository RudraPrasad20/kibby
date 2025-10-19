"use client"

import Link from "next/link"
import { WalletConnectButton } from "../walletConnectButton"
import { ModeToggle } from "../modeToggle"

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-18 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2" aria-label="Home">
          <span className="font-semibold text-3xl">Kibby</span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-6 md:flex">
          <Link href="creator" className="text-sm text-muted-foreground hover:text-foreground">
            Create
          </Link>
          <Link href="creator" className="text-sm text-muted-foreground hover:text-foreground">
            User
          </Link>
        </nav>

        <div className="flex items-center gap-2">
            <ModeToggle/>
        <WalletConnectButton/>
        </div>
      </div>
    </header>
  )
}
