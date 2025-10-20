// app/api/actions/book-meeting/success/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Connection, PublicKey } from '@solana/web3.js';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { mintBookingNft } from '@/lib/nft';  // Mint NFT here

const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com');

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const reference = searchParams.get('reference');
  const meetingId = searchParams.get('meetingId');
  const expectedAmount = parseFloat(searchParams.get('amount') || '0');

  if (!reference || !meetingId || expectedAmount <= 0) {
    return NextResponse.json({ error: 'Missing reference, meeting, or amount' }, { status: 400 });
  }

  try {
    const meeting = await db.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Poll for tx with memo containing reference (limit 5 recent txs to creator wallet)
    const signatures = await connection.getSignaturesForAddress(new PublicKey(meeting.creatorWallet), { limit: 5 });

    let confirmedSig: string | null = null;
    let userWallet: string | null = null;

    for (const sigInfo of signatures) {
      const tx = await connection.getTransaction(sigInfo.signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) continue;
      if (!tx.meta) continue;

      // Verify memo includes reference, amount matches (pre/post balance diff)
      const memos = tx.meta.logMessages?.filter(log => log.startsWith('book:')) || [];
      const payerIndex = 0;  // Fee payer
      const amountDiff = (tx.meta.preBalances[payerIndex] - tx.meta.postBalances[payerIndex]) / LAMPORTS_PER_SOL;
      if (memos.some(memo => memo.includes(reference)) && amountDiff >= expectedAmount) {
        confirmedSig = sigInfo.signature;
        userWallet = tx.transaction.message.staticAccountKeys[payerIndex].toBase58();  // Fee payer = user
        break;
      }
    }

    if (!confirmedSig || !userWallet) {
      return NextResponse.json({ error: 'Payment not confirmed yet. Retrying...' }, { status: 202 });
    }

    // Idempotency: Check if txSig already processed
    const existing = await db.booking.findUnique({
      where: { transactionSig: confirmedSig },
    });

    if (existing) {
      return NextResponse.json({ success: true, bookingId: existing.id, message: 'Already confirmed' });
    }

    // Create single confirmed booking
    const booking = await db.booking.create({
      data: {
        meetingId,
        userWallet,
        status: 'confirmed',
        transactionSig: confirmedSig,
        bookedAt: new Date(),
      },
    });

    // Mint NFT
    let nftMint: string | null = null;
    try {
      nftMint = await mintBookingNft(meeting, userWallet);
      await db.booking.update({
        where: { id: booking.id },
        data: { nftMint },
      });
      console.log(`✅ NFT minted for Blink booking ${booking.id}: ${nftMint}`);
    } catch (mintError) {
      console.error('❌ NFT mint failed for Blink:', mintError);
      // Booking succeeds anyway
    }

    return NextResponse.json({ 
      success: true, 
      bookingId: booking.id, 
      userWallet,
      nftMint,
      message: 'Booking confirmed! Check your wallet for NFT ticket.' 
    });
  } catch (error) {
    console.error('Blink confirmation error:', error);
    return NextResponse.json({ error: 'Confirmation failed' }, { status: 500 });
  }
}