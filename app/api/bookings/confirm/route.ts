// app/api/bookings/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mintBookingNft } from '@/lib/nft';  // Optional NFT

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
    }

    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: { meeting: true },
    });

    if (!booking || booking.status !== 'pending') {
      return NextResponse.json({ error: 'Not pending' }, { status: 400 });
    }

    // Update to confirmed
    await db.booking.update({
      where: { id: bookingId },
      data: { status: 'confirmed' },
    });

    // Optional: Mint NFT
    try {
      const nftMint = await mintBookingNft(booking.meeting, booking.userWallet);
      await db.booking.update({
        where: { id: bookingId },
        data: { nftMint },
      });
      console.log(`NFT minted for confirmed booking: ${nftMint}`);
    } catch (mintError) {
      console.error('NFT mint failed:', mintError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Confirm error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}