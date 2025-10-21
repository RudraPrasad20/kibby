// app/api/webhooks/helius-solana-tx-confirm/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Connection, PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl'; // For verifying Helius webhook signature
import bs58 from 'bs58';      // For decoding sender wallet from webhook

// Initialize connection (using Helius RPC is recommended for consistency)
const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com", "confirmed");

// IMPORTANT: Replace with your actual creator wallet address
// This should match the wallet address you monitor in Helius webhook settings.
const CREATOR_WALLET_ADDRESS = "GHZ29nUjyQrLcfxFNUTtKbLxmrkW3Za7ysk9Xi6yofsc"; 

export async function POST(request: NextRequest) {
  const HELIUS_WEBHOOK_SECRET = process.env.HELIUS_WEBHOOK_SECRET;

  // --- 1. Webhook Verification (CRITICAL FOR SECURITY) ---
  if (!HELIUS_WEBHOOK_SECRET) {
    console.error("HELIUS_WEBHOOK_SECRET is not set. Webhook verification skipped.");
    // In production, you would return a 500 or 401 here.
    // For now, allow to proceed for easier local testing, but BE AWARE.
  } else {
    try {
      const signature = request.headers.get('x-helius-signature');
      if (!signature) {
        console.warn("Helius signature header missing.");
        return NextResponse.json({ error: 'Unauthorized: Missing signature' }, { status: 401 });
      }

      const body = await request.text(); // Read body as text for verification
      const verified = nacl.sign.detached.verify(
        new TextEncoder().encode(body),
        bs58.decode(signature),
        bs58.decode(HELIUS_WEBHOOK_SECRET)
      );

      if (!verified) {
        console.warn("Helius signature verification failed.");
        return NextResponse.json({ error: 'Unauthorized: Invalid signature' }, { status: 401 });
      }
      
      // If verification passes, parse the body as JSON
      request = new NextRequest(request.url, { headers: request.headers, body: body, method: request.method }); // Reconstruct with text body
      // We need to re-read the body as JSON for processing after verification
      // A common pattern is to read text, verify, then parse JSON
    } catch (error) {
      console.error("Error during Helius webhook verification:", error);
      return NextResponse.json({ error: 'Internal server error during verification' }, { status: 500 });
    }
  }

  let payload;
  try {
    payload = await request.json(); // Now safely parse the body as JSON
  } catch (jsonError) {
    console.error("Error parsing webhook payload as JSON:", jsonError);
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  console.log("Helius Webhook received payload:", JSON.stringify(payload, null, 2));

  // --- 2. Extract relevant transaction data (Helius specific payload) ---
  const transactionEvent = payload.event; // Helius sends individual events
  const transaction = transactionEvent?.transaction;

  if (!transaction) {
    console.warn("Webhook payload missing transaction data.");
    return NextResponse.json({ message: 'No relevant transaction data found' }, { status: 200 });
  }

  const transactionSig = transaction.signature;
  const feePayer = transaction.feePayer; // The wallet that paid the transaction fee (usually the sender)

  let senderWallet: string | null = null;
  let receiverWallet: string | null = null;
  let solAmount: number = 0;

  // Helius provides parsed instructions directly
  // Iterate through the `tokenTransfers` or `nativeTransfers` arrays
  // Native transfers are typically simpler for SOL payments
  const nativeTransfers = transactionEvent.nativeTransfers;

  for (const transfer of nativeTransfers) {
    if (transfer.toUserAccount === CREATOR_WALLET_ADDRESS) {
      senderWallet = transfer.fromUserAccount;
      receiverWallet = transfer.toUserAccount;
      solAmount = transfer.amount; // Helius native transfers usually provide SOL amount directly
      break; 
    }
  }
  
  if (!senderWallet || !receiverWallet || receiverWallet !== CREATOR_WALLET_ADDRESS || solAmount <= 0) {
    console.warn("Irrelevant transaction (not a valid SOL transfer to creator wallet) or missing details:", transactionSig);
    return NextResponse.json({ message: 'Irrelevant transaction for booking confirmation' }, { status: 200 });
  }

  // --- 3. Find and update the pending booking ---
  try {
    const bookingToConfirm = await db.booking.findFirst({
      where: {
        userWallet: senderWallet,
        status: "pending",
        // CONSIDER: In a real app, you might want to find the specific meetingId
        // or ensure the amount matches more precisely.
        // A direct link like bookingId in a memo (if reliable with Blinks) is ideal.
        // For now, we're taking the most recent pending booking for that sender.
      },
      orderBy: { bookedAt: 'desc' }, // Get the most recent pending booking by this user
      include: { meeting: true }
    });

    if (!bookingToConfirm) {
      console.warn(`No pending booking found for sender ${senderWallet} with signature ${transactionSig}`);
      return NextResponse.json({ message: 'No matching pending booking found' }, { status: 200 });
    }

    // Double-check the meeting details for robustness
    if (bookingToConfirm.meeting.creatorWallet !== receiverWallet) {
        console.warn(`Creator wallet mismatch for booking ${bookingToConfirm.id}. Expected ${bookingToConfirm.meeting.creatorWallet}, got ${receiverWallet}`);
        // Consider if this should be an error or just a non-match
        return NextResponse.json({ message: 'Creator wallet mismatch' }, { status: 400 });
    }
    // Allow for slight variations if floating point math is involved or user overpaid
    if (solAmount < bookingToConfirm.meeting.price - 0.000000001) { // Small epsilon for float comparison
        console.warn(`Amount mismatch for booking ${bookingToConfirm.id}. Expected at least ${bookingToConfirm.meeting.price} SOL, got ${solAmount} SOL`);
        return NextResponse.json({ message: 'Amount mismatch' }, { status: 400 });
    }

    const updatedBooking = await db.booking.update({
      where: { id: bookingToConfirm.id },
      data: {
        status: "confirmed",
        transactionSig: transactionSig,
      },
    });

    console.log(`Booking ${updatedBooking.id} confirmed with transaction ${transactionSig}`);

    // --- 4. Optional: Trigger dashboard revalidation/update ---
    // If you use Next.js `revalidatePath` or `revalidateTag`, you can call it here
    // to instantly update dashboards that fetch this data.
    // Example: revalidatePath('/dashboard'); // Requires 'unstable_revalidate' in Next.js 13+ app router

    return NextResponse.json({ message: 'Booking confirmed successfully', booking: updatedBooking });
  } catch (error) {
    console.error('Error finding/updating booking:', error);
    return NextResponse.json({ error: 'Failed to process webhook booking update' }, { status: 500 });
  }
}