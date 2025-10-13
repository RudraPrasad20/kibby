// app/api/webhooks/route.ts (Corrected for Helius payload)
import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/helius';
import { db } from '@/lib/db';

const WEBHOOK_SECRET = 'my-secret-token'; // Matches authHeader from creation

export async function POST(request: NextRequest) {
  const payload = await request.text(); // Raw body for HMAC
  const signature = request.headers.get('X-Hook-Signature') || '';

  // Verify signature
  if (!verifyWebhookSignature(payload, signature, WEBHOOK_SECRET)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  try {
    const txs = JSON.parse(payload); // Array of tx objects (not 'events' with sub-'transactions')

    for (const tx of txs) { // Direct loop over tx array
      if (tx.type !== 'TRANSFER' || tx.transactionError !== null) continue; // Skip non-transfers or errors

      const sig = tx.signature;
      if (!sig) continue;

      // Find memo instruction
      const memoIx = tx.instructions?.find(
        (ix: any) => ix.programId === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr' && ix.data
      );
      let bookingId: string | null = null;
      if (memoIx) {
        try {
          // Decode base64 data to UTF-8 (memo content = bookingId)
          bookingId = Buffer.from(memoIx.data, 'base64').toString('utf8').trim();
        } catch (decodeErr) {
          console.error('Memo decode error:', decodeErr);
          continue;
        }
      }

      if (!bookingId) continue;

      // Check for successful native SOL transfer (to any monitored creator, via nativeTransfers)
      const successfulTransfer = tx.nativeTransfers?.some((t: any) => 
        t.amount > 0 && // Positive incoming
        t.toUserAccount && // To a user account (creator)
        tx.accountData?.some((acc: any) => acc.account === t.toUserAccount && acc.nativeBalanceChange > 0) // Confirm balance change
      );

      if (successfulTransfer) {
        // Update pending booking to confirmed
        const updated = await db.booking.updateMany({
          where: { 
            id: bookingId, 
            status: 'pending',
            transactionSig: 'blink-pending' 
          },
          data: { 
            status: 'confirmed',
            transactionSig: sig 
          },
        });

        if (updated.count > 0) {
          console.log(`Confirmed booking ${bookingId} via webhook: ${sig}`);
        }
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}