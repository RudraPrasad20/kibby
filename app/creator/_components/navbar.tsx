"use client"
import Link from "next/link";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { ModeToggle } from "@/components/modeToggle";


export function Navbar() {
  return (
    <header className="flex items-center justify-between p-4 lg:px-8 py-6">
      <div className="flex items-center space-x-8">
        <Link href="#" className="flex items-center">
          <span className="font-extrabold text-lg">KIBBY</span>
        </Link>
      </div>
      <div className="flex items-center space-x-4">
        <ModeToggle />
        <WalletMultiButton />
      </div>
    </header>
  );
}