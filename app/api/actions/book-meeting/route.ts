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

import { createMemoInstruction } from "@solana/spl-memo";
import { db } from "@/lib/db";

// Set blockchain network
const blockchain = BLOCKCHAIN_IDS.devnet;

// Create connection to Solana
const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com");

// Headers for CORS + Blink metadata
const headers = {
  ...ACTIONS_CORS_HEADERS,
  "x-blockchain-ids": blockchain,
  "x-action-version": "2.4",
};

// OPTIONS for CORS preflight
export const OPTIONS = async () => {
  return new Response(null, { headers });
};

// ------------------------------------------------------------
// GET  → Blink metadata + UI
// ------------------------------------------------------------
export const GET = async (req: Request) => {
  const url = new URL(req.url);
  const meetingId = url.searchParams.get("meetingId");

  if (!meetingId) {
    return new Response(JSON.stringify({ error: "Meeting ID required" }), {
      status: 400,
      headers,
    });
  }

  const meeting = await db.meeting.findUnique({
    where: { id: meetingId },
    select: { title: true, price: true, creatorWallet: true },
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
    icon: `${baseUrl}/static/ticket.png`, // absolute HTTPS path
    label: `${meeting.price} SOL`,
    title: `Book ${meeting.title}`,
    description: `Pay ${meeting.price} SOL to book this meeting.`,
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
};

// ------------------------------------------------------------
// POST  → Handles transaction + DB creation
// ------------------------------------------------------------
export const POST = async (req: Request) => {
  try {
    const url = new URL(req.url);
    const meetingId = url.searchParams.get("meetingId");
    const amount = Number(url.searchParams.get("amount"));

    if (!meetingId || isNaN(amount) || amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid meeting ID or amount" }), {
        status: 400,
        headers,
      });
    }

    const meeting = await db.meeting.findUnique({
      where: { id: meetingId },
      select: { title: true, creatorWallet: true, price: true },
    });

    if (!meeting) {
      return new Response(JSON.stringify({ error: "Meeting not found" }), {
        status: 404,
        headers,
      });
    }

    // Parse payer account from Blink POST
    const request: ActionPostRequest = await req.json();
    const payer = new PublicKey(request.account);
    const receiver = new PublicKey(meeting.creatorWallet);

    // Create booking record before transaction for dashboard visibility
    const booking = await db.booking.create({
      data: {
        meetingId,
        userWallet: payer.toBase58(),
        status: "pending",
        transactionSig: "blink-init",
      },
    });

    // Also store in user dashboard (if schema supports it)
    await db.booking.create({
      data: {
        meetingId,
        userWallet: payer.toBase58(),
        status: "pending",
      },
    }).catch(() => {
      // optional: ignore if userMeeting table doesn't exist
    });

    // Build the Solana transaction
    const transaction = await prepareTransaction(connection, payer, receiver, amount, booking.id);

    // Create response payload
    const response: ActionPostResponse = {
      type: "transaction",
      transaction: Buffer.from(transaction.serialize()).toString("base64"),
    };

    return Response.json(response, { status: 200, headers });
  } catch (error) {
    console.error("Error processing booking:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers,
    });
  }
};

// ------------------------------------------------------------
// Helper: Build unsigned transfer transaction
// ------------------------------------------------------------
const prepareTransaction = async (
  connection: Connection,
  payer: PublicKey,
  receiver: PublicKey,
  amount: number,
  bookingId: string
) => {
  const lamports = amount * LAMPORTS_PER_SOL;

  // Create transfer + memo instructions
  const transferIx = SystemProgram.transfer({
    fromPubkey: payer,
    toPubkey: receiver,
    lamports,
  });
  const memoIx = createMemoInstruction(`Booking:${bookingId}`, [payer]);

  const { blockhash } = await connection.getLatestBlockhash("finalized");

  const message = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions: [memoIx, transferIx],
  }).compileToV0Message();

  const tx = new VersionedTransaction(message);
  tx.signatures = []; // Blink will sign client-side

  return tx;
};
