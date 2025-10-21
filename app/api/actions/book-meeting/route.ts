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

// Import your Prisma client
import { db } from '@/lib/db';

const blockchain = BLOCKCHAIN_IDS.devnet;

const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com", "confirmed"); // Set a default commitment level

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
      icon: `${baseUrl}/next.svg`, // Ensure this path is correct for your project
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

// app/api/actions/book-meeting/route.ts (only showing changes in POST)

// ... (imports and other GET/OPTIONS code remain the same) ...

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

    // Create pending booking
    const pendingBooking = await db.booking.create({
      data: {
        meetingId,
        userWallet: payer.toBase58(),
        status: "pending",
        transactionSig: "pending-blink-tx", // This will be updated by the webhook
      },
    });

    console.log(`Pending booking created for Blink: ${pendingBooking.id}`);

    const transaction = await prepareTransaction(
      connection,
      payer,
      receiver,
      amount
    );

    const response: ActionPostResponse = {
      type: "transaction",
      transaction: Buffer.from(transaction.serialize()).toString("base64"),
      // Add booking ID to message for user feedback and potential debugging
      message: `Booking ${meeting.title} for ${amount} SOL (Booking ID: ${pendingBooking.id}).`,
    };

    return Response.json(response, { status: 200, headers });
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers,
    });
  }
};

// ... (prepareTransaction function remains the same) ...

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

  // Get the latest blockhash with 'finalized' commitment for better reliability
  const { blockhash } = await connection.getLatestBlockhash("finalized");

  // Create a transaction message
  const message = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions: [transferIx], // Only transfer instruction for simplicity and to avoid payer sig issues with memo
  }).compileToV0Message();

  return new VersionedTransaction(message);
};