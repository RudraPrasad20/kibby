"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white dark:bg-black">
      <div
        className={cn(
          "absolute inset-0 z-0",
          "[background-size:50px_50px]",
          "[background-image:linear-gradient(to_right,#e4e4e7_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e7_1px,transparent_1px)]",
          "dark:[background-image:linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)]"
        )}
      />

      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] dark:bg-black" />
      <main className="relative z-10 flex h-full flex-col items-center justify-center gap-4 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.6,
            delay: 0.2,
            type: "spring",
            damping: 10,
            stiffness: 100,
          }}
          className="flex max-w-7xl flex-col items-center justify-center gap-2"
        >
          <h1 className="max-w-3xl py-2 pt-20 text-center text-5xl font-extrabold tracking-tighter md:text-6xl xl:text-7xl">
            <span className="bg-gradient-to-r from-pink-500 to-blue-500 bg-clip-text pr-1.5 text-transparent">
              Kibby,
            </span>{" "}
            <span className="bg-gradient-to-b from-primary/90 to-primary/60 bg-clip-text py-1 text-transparent">
              Book Meetings. Earn Instantly.
            </span>
          </h1>

          <p className="mx-auto max-w-xl text-center text-lg font-medium tracking-tight text-primary/80 md:text-xl">
            Host or book verified meetings on Solana — instant payments, NFT
            confirmations, and seamless scheduling in one place.
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.6,
            delay: 0.4,
            type: "spring",
            damping: 10,
            stiffness: 100,
          }}
          className="flex flex-col items-center justify-center gap-3 py-5 sm:flex-row"
        >
          <Button
            size="lg"
            asChild
            className="bg-gradient-to-r text-white from-pink-500 to-blue-500 "
          >
            <Link href="/creator">
              Start as Creator <ArrowRight />
            </Link>
          </Button>

          <Button
            size="lg"
            asChild
            className="bg-gradient-to-r text-white from-pink-500 to-blue-500 "
          >
            <Link href="/user">
              Continue as User <ArrowRight />
            </Link>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.6,
            delay: 0.6,
            type: "spring",
            damping: 10,
            stiffness: 100,
          }}
          className="mt-8 grid w-full max-w-5xl grid-cols-1 gap-4 text-left md:grid-cols-3"
        >
          <div className="rounded-lg border border-border p-6 text-center backdrop-blur-sm">
            <p className="text-base font-semibold">Instant Payments</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Get paid directly in SOL as soon as your meeting is booked — no
              delays, no middlemen.
            </p>
          </div>
          <div className="rounded-lg border border-border p-6 text-center backdrop-blur-sm">
            <p className="text-base font-semibold">NFT Confirmation</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Every booking is verified on-chain with an NFT receipt — your
              proof of participation.
            </p>
          </div>
          <div className="rounded-lg border border-border p-6 text-center backdrop-blur-sm">
            <p className="text-base font-semibold">Seamless Booking</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Connect your wallet, pick a slot, and confirm in seconds. Smooth
              and secure.
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
