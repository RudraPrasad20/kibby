// app/api/actions/book-meeting/route.ts (fixed: Proper reference in href/memo, links.next as string for redirect)
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
import crypto from 'crypto';  // For reference generation

import { db } from '@/lib/db';

const blockchain = BLOCKCHAIN_IDS.devnet;
const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL!);

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

    const baseUrl = url.origin;

    // FIXED: Generate unique reference for idempotency/polling
    const reference = crypto.randomUUID();

    const response: ActionGetResponse = {
      type: "action",
      icon: `${baseUrl}/next.svg`,
      label: "Trusted by Kibby",
      title: `Book ${meeting.title}`,
      description: `Pay ${meeting.price} SOL to book a ${meeting.title} meeting.`,
      links: {
        actions: [
          {
            type: "transaction",
            label: `${meeting.price} SOL`,
            href: `${baseUrl}/api/actions/book-meeting?meetingId=${meetingId}&amount=${meeting.price}&reference=${reference}`,  // FIXED: Include reference in href
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
    const reference = url.searchParams.get("reference");  // FIXED: From GET href
    const amount = Number(amountParam);

    if (!meetingId || !reference || amountParam === null || isNaN(amount) || amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid meeting ID, reference, or amount" }), {
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
    const payer = new PublicKey(request.account);  // User's wallet

    const receiver = new PublicKey(meeting.creatorWallet);

    // FIXED: DON'T CREATE BOOKING HERE – wait for success route to avoid pending/dups

    const transaction = await prepareTransaction(
      connection,
      payer,
      receiver,
      amount,
      reference  // FIXED: Use reference in memo
    );

    const baseUrl = url.origin;
    const successUrl = `${baseUrl}/api/actions/book-meeting/success?reference=${reference}&meetingId=${meetingId}&amount=${amount}`;

    const response: ActionPostResponse = {
      type: "transaction",
      transaction: Buffer.from(transaction.serialize()).toString("base64"),
      message: `Booking ${meeting.title} for ${amount} SOL`,
      links: {
        next: { type: "post", href: successUrl },
      },
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

const prepareTransaction = async (
  connection: Connection,
  payer: PublicKey,
  receiver: PublicKey,
  amount: number,
  reference: string
) => {
  const transferIx = SystemProgram.transfer({
    fromPubkey: payer,
    toPubkey: receiver,
    lamports: amount * LAMPORTS_PER_SOL,
  });

  // FIXED: Memo with reference for polling in success
  const memoIx = createMemoInstruction(`book:${reference}:${payer.toBase58()}`, [payer]);
  const instructions = [memoIx, transferIx];

  const { blockhash } = await connection.getLatestBlockhash();

  const message = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();

  return new VersionedTransaction(message);
};