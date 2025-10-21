// app/api/actions/book-meeting/route.ts (fixed: Simplified like donate-sol, finalized blockhash, no memo to avoid signing issues, pending booking wrapped)
import {
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
  ACTIONS_CORS_HEADERS,
  BLOCKCHAIN_IDS,
} from "@solana/actions";

import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

import { db } from '@/lib/db';

const blockchain = BLOCKCHAIN_IDS.devnet;

const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com");

const headers = {
  ...ACTIONS_CORS_HEADERS,
  "x-blockchain-ids": blockchain,
  "x-action-version": "2.4",
};

export const OPTIONS = async () => {
  return new Response(null, { headers });
};

export const GET = async (req: Request) => {
  const url = new URL(req.url);
  const meetingId = url.searchParams.get("meetingId");

  if (!meetingId) {
    return new Response(JSON.stringify({ error: "Meeting ID required" }), {
      status: 400,
      headers,
    });
  }

  try {
    const meeting = await db.meeting.findUnique({
      where: { id: meetingId },
      select: { title: true, price: true, creatorWallet: true }
    });

    if (!meeting) {
      return new Response(JSON.stringify({ error: "Meeting not found" }), {
        status: 404,
        headers,
      });
    }

    const baseUrl = new URL("/", req.url).toString();

    const response: ActionGetResponse = {
      type: "action",
      icon: `${baseUrl}/next.svg`,
      label: `${meeting.price} SOL`,
      title: `Book ${meeting.title}`,
      description: `Pay ${meeting.price} SOL to book a ${meeting.title} meeting.`,
      links: {
        actions: [
          {
            type: "transaction",
            label: `${meeting.price} SOL`,
            href: `/api/actions/book-meeting?meetingId=${meetingId}&amount=${meeting.price}`,
          },
        ],
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Error fetching meeting:", error);
    return new Response(JSON.stringify({ error: "Failed to load meeting" }), {
      status: 500,
      headers,
    });
  }
};

export const POST = async (req: Request) => {
  try {
    const url = new URL(req.url);

    const meetingId = url.searchParams.get("meetingId");
    const amountParam = url.searchParams.get("amount");
    const amount = Number(amountParam);

    if (!meetingId || amountParam === null || isNaN(amount) || amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid meeting ID or amount" }), {
        status: 400,
        headers,
      });
    }

    const meeting = await db.meeting.findUnique({
      where: { id: meetingId },
      select: { creatorWallet: true, price: true, title: true }
    });

    if (!meeting || amount < meeting.price) {
      return new Response(JSON.stringify({ error: "Meeting not found or insufficient amount" }), {
        status: 400,
        headers,
      });
    }

    const request: ActionPostRequest = await req.json();
    const payer = new PublicKey(request.account);

    const receiver = new PublicKey(meeting.creatorWallet);

    // Create pending booking for immediate dashboard visibility (wrapped in try-catch)
    let pendingBookingId: string | null = null;
    try {
      const pendingBooking = await db.booking.create({
        data: {
          meetingId,
          userWallet: payer.toBase58(),
          status: "pending",
          transactionSig: "blink-pending", 
        },
      });
      pendingBookingId = pendingBooking.id;
      console.log(`Pending booking created: ${pendingBooking.id}`);
    } catch (dbError) {
      console.error("DB error for pending booking:", dbError);
      // Continue without booking if DB fails (tx still works)
    }

    const transaction = await prepareTransaction(
      connection,
      payer,
      receiver,
      amount
    );


    // In POST, after transaction = await prepareTransaction(...)
console.log(`Polling for tx confirmation for user ${payer.toBase58()}...`);

let confirmedSig: string | null = null;
const startTime = Date.now();
while (Date.now() - startTime < 5000) {  // 5s timeout
  const signatures = await connection.getSignaturesForAddress(payer, { limit: 3 });
  for (const sigInfo of signatures) {
    if (sigInfo.confirmationStatus === 'confirmed') {
      const tx = await connection.getTransaction(sigInfo.signature, { commitment: 'confirmed' });
      if (tx && tx.meta && !tx.meta.err) {  // Check transaction success
        confirmedSig = sigInfo.signature;
        break;
      }
    }
  }
  if (confirmedSig) break;
  await new Promise(resolve => setTimeout(resolve, 500));  // Poll every 0.5s
}

if (confirmedSig) {
  // Create confirmed booking
  const booking = await db.booking.create({
    data: {
      meetingId,
      userWallet: payer.toBase58(),
      status: 'confirmed',
      transactionSig: confirmedSig,
      bookedAt: new Date(),
    },
  });

  // Optional: Mint NFT here
  // mintBookingNft(meeting, payer.toBase58());

  console.log(`Confirmed booking: ${booking.id}`);
} else {
  console.log('Tx not confirmed in time – try manual');
}

// Response (tx for signing)
const response: ActionPostResponse = {
  type: "transaction",
  transaction: Buffer.from(transaction.serialize()).toString("base64"),
  message: `Booking ${meeting.title} for ${amount} SOL`,
};

return Response.json(response, { status: 200, headers });


    // const response: ActionPostResponse = {
    //   type: "transaction",
    //   transaction: Buffer.from(transaction.serialize()).toString("base64"),
    //   message: `Booking ${meeting.title} for ${amount} SOL`,
    // };

    // return Response.json(response, { status: 200, headers });
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers,
    });
  }
};

const prepareTransaction = async (
  connection: Connection,
  payer: PublicKey,
  receiver: PublicKey,
  amount: number
) => {
  // Create a transfer instruction
  const transferIx = SystemProgram.transfer({
    fromPubkey: payer,
    toPubkey: receiver,
    lamports: amount * LAMPORTS_PER_SOL,
  });

  // Get the latest blockhash with 'finalized' commitment for reliable signing
  const { blockhash } = await connection.getLatestBlockhash("finalized");

  // Create a transaction message
  const message = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions: [transferIx],
  }).compileToV0Message();

  return new VersionedTransaction(message);
};