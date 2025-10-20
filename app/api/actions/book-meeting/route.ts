// app/api/actions/book-meeting/success/route.ts (NEW FILE: Handles tx confirmation, booking create, NFT mint)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Connection, PublicKey } from '@solana/web3.js';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { mintBookingNft } from '@/lib/nft';  // Import mint func

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

    // Poll for tx with memo containing reference (up to 30s, limit 5 recent)
    const signatures = await connection.getSignaturesForAddress(
      new PublicKey(meeting.creatorWallet),  // Poll creator's account for incoming txs
      { limit: 5 }
    );

    let confirmedSig: string | null = null;
    let userWallet: string | null = null;

    for (const sigInfo of signatures) {
      const tx = await connection.getTransaction(sigInfo.signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) continue;

      // Verify memo includes reference, amount matches
      const memos = tx.meta?.logMessages?.filter(log => log.startsWith('book:')) || [];
      if (memos.some(memo => memo.includes(reference)) &&
          (tx.meta?.preBalances?.[tx.meta.preBalances.length - 1] || 0) - (tx.meta?.postBalances?.[tx.meta.postBalances.length - 1] || 0) / LAMPORTS_PER_SOL === expectedAmount) {
        confirmedSig = sigInfo.signature;
        userWallet = tx.transaction.message.staticAccountKeys[0].toBase58();  // Fee payer = user
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
      console.log(`✅ NFT minted for booking ${booking.id}: ${nftMint}`);
    } catch (mintError) {
      console.error('❌ NFT mint failed:', mintError);
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
    console.error('Confirmation error:', error);
    return NextResponse.json({ error: 'Confirmation failed' }, { status: 500 });
  }
}