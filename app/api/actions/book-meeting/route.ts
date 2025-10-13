// app/api/actions/book-meeting/route.ts (Latest with memo for Helius)
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

import { db } from '@/lib/db';

// CAIP-2 format for Solana
const blockchain = BLOCKCHAIN_IDS.devnet;

// Create a connection to the Solana blockchain
const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL!);

// Create headers with CAIP blockchain ID
const headers = {
  ...ACTIONS_CORS_HEADERS,
  "x-blockchain-ids": blockchain,
  "x-action-version": "2.4",
};

// OPTIONS endpoint is required for CORS preflight requests
// Your Blink won't render if you don't add this
export const OPTIONS = async () => {
  return new Response(null, { headers });
};

// GET endpoint returns the Blink metadata (JSON) and UI configuration
export const GET = async (req: Request) => {
  // Extract meetingId from URL params
  const url = new URL(req.url);
  const meetingId = url.searchParams.get("meetingId");

  if (!meetingId) {
    return new Response(JSON.stringify({ error: "Meeting ID required" }), {
      status: 400,
      headers,
    });
  }

  try {
    // Fetch meeting details from database
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

    // This JSON is used to render the Blink UI
    const response: ActionGetResponse = {
      type: "action",
      icon: `${new URL("/meeting-icon.png", req.url).toString()}`, // Replace with your meeting icon
      label: `${meeting.price} SOL`,
      title: `Book ${meeting.title}`,
      description: `Pay ${meeting.price} SOL to book a ${meeting.title} meeting.`,
      // Links is used if you have multiple actions or if you need more than one params
      links: {
        actions: [
          {
            // Defines this as a blockchain transaction
            type: "transaction",
            label: `${meeting.price} SOL`,
            // This is the endpoint for the POST request
            href: `/api/actions/book-meeting?meetingId=${meetingId}&amount=${meeting.price}`,
          },
          {
            // Example for a custom input field (in case user wants to tip extra)
            type: "transaction",
            href: `/api/actions/book-meeting?meetingId=${meetingId}&amount={amount}`,
            label: "Book with Custom Amount",
            parameters: [
              {
                name: "amount",
                label: `Enter SOL amount (min ${meeting.price})`,
                type: "number",
                min: meeting.price, // Set minimum to enforce at least the meeting price
                required: true,
              },
            ],
          },
        ],
      },
    };

    // Return the response with proper headers
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

// POST endpoint handles the actual transaction creation
export const POST = async (req: Request) => {
  try {
    // Step 1: Extract parameters from the URL
    const url = new URL(req.url);

    // Meeting ID and amount of SOL to transfer are passed in the URL
    const meetingId = url.searchParams.get("meetingId");
    const amountParam = url.searchParams.get("amount");
    const amount = Number(amountParam);

    if (!meetingId || amountParam === null || isNaN(amount) || amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid meeting ID or amount" }), {
        status: 400,
        headers,
      });
    }

    // Fetch meeting to get creator wallet
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

    // Payer public key is passed in the request body
    const request: ActionPostRequest = await req.json();
    const payer = new PublicKey(request.account);

    // Receiver is the creator wallet address
    const receiver = new PublicKey(meeting.creatorWallet);

    // Create pending booking in DB
    const pendingBooking = await db.booking.create({
      data: {
        meetingId,
        userWallet: payer.toBase58(),
        status: "pending",
        transactionSig: "blink-pending", // Placeholder; update later with real sig
      },
    });

    // Step 2: Prepare the transaction (with optional memo for Helius)
    const transaction = await prepareTransaction(
      connection,
      payer,
      receiver,
      amount,
      pendingBooking.id // Pass for memo if using webhook
    );

    // Step 3: Create a response with the serialized transaction
    const response: ActionPostResponse = {
      type: "transaction",
      transaction: Buffer.from(transaction.serialize()).toString("base64"),
      message: `Booking ${meeting.title} for ${amount} SOL`, // Optional message for user
    };

    // Return the response with proper headers
    return Response.json(response, { status: 200, headers });
  } catch (error) {
    // Log and return an error response
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
  amount: number,
  bookingId?: string // Optional for memo
) => {
  // Create transfer instruction
  const transferIx = SystemProgram.transfer({
    fromPubkey: payer,
    toPubkey: receiver,
    lamports: amount * LAMPORTS_PER_SOL,
  });

  // Optional: Create memo instruction with booking ID (for Helius webhook matching)
  let instructions = [transferIx];
  if (bookingId) {
    const memoIx = createMemoInstruction(bookingId, [payer]);
    instructions = [memoIx, transferIx];
  }

  // Get the latest blockhash
  const { blockhash } = await connection.getLatestBlockhash();

  // Create a transaction message
  const message = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();

  // Create and return a versioned transaction
  return new VersionedTransaction(message);
};