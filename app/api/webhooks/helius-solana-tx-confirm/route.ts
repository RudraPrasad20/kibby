// app/api/webhooks/helius-solana-tx-confirm/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Connection, PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com", "confirmed");
const CREATOR_WALLET_ADDRESS = "GHZ29nUjyQrLcfxFNUTtKbLxmrkW3Za7ysk9Xi6yofsc"; 

export async function POST(request: NextRequest) {
  // --- CRITICAL FIX HERE: Use a server-side only environment variable ---
  const HELIUS_WEBHOOK_SECRET = process.env.HELIUS_WEBHOOK_SECRET; 

  // --- 1. Webhook Verification (CRITICAL FOR SECURITY) ---
  // ... (rest of the verification logic is good, assuming HELIUS_WEBHOOK_SECRET is now correctly set) ...
  if (!HELIUS_WEBHOOK_SECRET) {
    console.error("HELIUS_WEBHOOK_SECRET is not set. Webhook verification skipped. THIS IS INSECURE IN PRODUCTION.");
    // In production, you would definitely return a 401 or 500 here
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  // ... (rest of the file as you provided it, it looks syntactically correct for the POST handler) ...
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
    
    let payload;
    try {
      payload = JSON.parse(body); // Parse JSON from the already-read text body
    } catch (jsonError) {
      console.error("Error parsing webhook payload as JSON after verification:", jsonError);
      return NextResponse.json({ error: 'Invalid JSON payload after verification' }, { status: 400 });
    }

    console.log("Helius Webhook received payload:", JSON.stringify(payload, null, 2));

    // ... (rest of the transaction extraction and booking update logic is fine) ...
    const transactionEvent = payload.event; // Helius sends individual events
    const transaction = transactionEvent?.transaction;

    if (!transaction) {
      console.warn("Webhook payload missing transaction data.");
      return NextResponse.json({ message: 'No relevant transaction data found' }, { status: 200 });
    }

    const transactionSig = transaction.signature;
    // const feePayer = transaction.feePayer; // Not directly used, can keep or remove if linting

    let senderWallet: string | null = null;
    let receiverWallet: string | null = null;
    let solAmount: number = 0;

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
    const bookingToConfirm = await db.booking.findFirst({
      where: {
        userWallet: senderWallet,
        status: "pending",
        // CONSIDER: You might want to also match `meetingId` if possible for robustness
        // e.g., `meeting: { creatorWallet: receiverWallet }` to narrow down
      },
      orderBy: { bookedAt: 'desc' }, 
      include: { meeting: true }
    });

    if (!bookingToConfirm) {
      console.warn(`No pending booking found for sender ${senderWallet} with signature ${transactionSig}`);
      return NextResponse.json({ message: 'No matching pending booking found' }, { status: 200 });
    }

    // Double-check the meeting details for robustness
    if (bookingToConfirm.meeting.creatorWallet !== receiverWallet) {
        console.warn(`Creator wallet mismatch for booking ${bookingToConfirm.id}. Expected ${bookingToConfirm.meeting.creatorWallet}, got ${receiverWallet}`);
        return NextResponse.json({ message: 'Creator wallet mismatch' }, { status: 400 });
    }
    if (solAmount < bookingToConfirm.meeting.price - 0.000000001) { 
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

    return NextResponse.json({ message: 'Booking confirmed successfully', booking: updatedBooking });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
}