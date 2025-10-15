// app/api/webhook/helius/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';  // Prisma

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();  // Helius webhook body

    // Parse for TRANSFER to creator wallet
    if (payload.type === 'TRANSFER' && payload.account === process.env.CREATOR_WALLET) {  // Or dynamic per meeting
      const signature = payload.signature;
      const amount = payload.nativeTransfers?.[0]?.tokenAmount?.uiAmount || 0;
      const fromUser = payload.nativeTransfers?.[0]?.fromUserAccount || '';
      const memo = payload.instructionAccounts?.[0] || '';  // Memo contains bookingId

      // Extract bookingId from memo (e.g., if memo = bookingId)
      const booking = await db.booking.findFirst({
        where: {
          id: memo,  // Matches memo
          status: 'pending',
          userWallet: fromUser,
        },
        include: { meeting: true }
      });

      if (booking && amount >= booking.meeting.price) {
        await db.booking.update({
          where: { id: booking.id },
          data: {
            status: 'confirmed',
            transactionSig: signature,  // Real sig
          },
        });
        console.log(`Booking ${booking.id} confirmed via tx ${signature}`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
}