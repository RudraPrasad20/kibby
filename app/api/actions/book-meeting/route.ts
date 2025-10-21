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

const blockchain = BLOCKCHAIN_IDS.mainnet;

const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com');

const headers = {
  ...ACTIONS_CORS_HEADERS,
  "x-blockchain-ids": blockchain,
  "x-action-version": "2.4",
  "Content-Type": "application/json",
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
      select: { title: true, price: true, creatorWallet: true, description: true }
    });

    if (!meeting) {
      return new Response(JSON.stringify({ error: "Meeting not found" }), {
        status: 404,
        headers,
      });
    }

    // Validate creator wallet address
    try {
      new PublicKey(meeting.creatorWallet);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid creator wallet address" }), {
        status: 400,
        headers,
      });
    }

    const baseUrl = url.origin;

    const response: ActionGetResponse = {
      type: "action",
      icon: `${baseUrl}/static/ticket.png`,
      label: "Book Meeting",
      title: `Book ${meeting.title}`,
      description: `Pay ${meeting.price} SOL to book this meeting. ${meeting.description || ''}`,
      links: {
        actions: [
          {
            type: "transaction",
            label: `Pay ${meeting.price} SOL`,
            href: `${baseUrl}/api/actions/book-meeting?meetingId=${meetingId}&amount=${meeting.price}`,
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

    if (!meeting) {
      return new Response(JSON.stringify({ error: "Meeting not found" }), {
        status: 404,
        headers,
      });
    }

    if (amount < meeting.price) {
      return new Response(JSON.stringify({ error: "Insufficient amount" }), {
        status: 400,
        headers,
      });
    }

    // Validate creator wallet address
    try {
      new PublicKey(meeting.creatorWallet);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid creator wallet address" }), {
        status: 400,
        headers,
      });
    }

    const request: ActionPostRequest = await req.json();
    
    if (!request.account) {
      return new Response(JSON.stringify({ error: "Account required" }), {
        status: 400,
        headers,
      });
    }

    const payer = new PublicKey(request.account);
    const receiver = new PublicKey(meeting.creatorWallet);

    const pendingBooking = await db.booking.create({
      data: {
        meetingId,
        userWallet: payer.toBase58(),
        status: "pending",
        transactionSig: "blink-pending", 
      },
    });

    const transaction = await prepareTransaction(
      connection,
      payer,
      receiver,
      amount,
      pendingBooking.id 
    );

    const response: ActionPostResponse = {
      type: "transaction",
      transaction: Buffer.from(transaction.serialize()).toString("base64"),
      message: `Booking ${meeting.title} for ${amount} SOL`,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers,
    });
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
  amount: number,
  bookingId?: string 
) => {
  const transferIx = SystemProgram.transfer({
    fromPubkey: payer,
    toPubkey: receiver,
    lamports: amount * LAMPORTS_PER_SOL,
  });

  let instructions = [transferIx];
  if (bookingId) {
    const memoIx = createMemoInstruction(bookingId, [payer]);
    instructions = [memoIx, transferIx];
  }

  const { blockhash } = await connection.getLatestBlockhash();

  const message = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();

  return new VersionedTransaction(message);
};