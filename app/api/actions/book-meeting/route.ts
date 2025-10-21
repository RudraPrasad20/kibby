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

const blockchain = BLOCKCHAIN_IDS.devnet;
const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL!);
const headers = { ...ACTIONS_CORS_HEADERS, "x-blockchain-ids": blockchain, "x-action-version": "2.4" };

export const OPTIONS = async () => new Response(null, { headers });

export const GET = async (req: Request) => {
  const url = new URL(req.url);
  const meetingId = url.searchParams.get("meetingId");
  if (!meetingId)
    return Response.json({ error: "Meeting ID required" }, { status: 400, headers });

  const meeting = await db.meeting.findUnique({
    where: { id: meetingId },
    select: { title: true, price: true, creatorWallet: true },
  });
  if (!meeting)
    return Response.json({ error: "Meeting not found" }, { status: 404, headers });

  const baseUrl = url.origin;
  const response: ActionGetResponse = {
    type: "action",
    icon: `${baseUrl}/next.svg`,
    label: "Book with Kibby",
    title: `Book ${meeting.title}`,
    description: `Pay ${meeting.price} SOL to book a ${meeting.title} meeting.`,
    links: {
      actions: [
        {
          type: "transaction",
          label: `${meeting.price} SOL`,
          href: `${baseUrl}/api/actions/book-meeting?meetingId=${meetingId}&amount=${meeting.price}`,
        },
      ],
    },
  };
  return Response.json(response, { headers });
};

export const POST = async (req: Request) => {
  try {
    const url = new URL(req.url);
    const meetingId = url.searchParams.get("meetingId");
    const amount = Number(url.searchParams.get("amount"));

    if (!meetingId || isNaN(amount) || amount <= 0)
      return Response.json({ error: "Invalid meeting ID or amount" }, { status: 400, headers });

    const meeting = await db.meeting.findUnique({
      where: { id: meetingId },
      select: { creatorWallet: true, price: true, title: true },
    });

    if (!meeting)
      return Response.json({ error: "Meeting not found" }, { status: 404, headers });

    const request: ActionPostRequest = await req.json();
    const payer = new PublicKey(request.account);
    const receiver = new PublicKey(meeting.creatorWallet);

    const pending = await db.booking.create({
      data: {
        meetingId,
        userWallet: payer.toBase58(),
        status: "pending",
        transactionSig: "blink-pending",
      },
    });

    const transaction = await prepareTransaction(connection, payer, receiver, amount, pending.id);

    const serializedTx = Buffer.from(transaction.serialize()).toString("base64");

    const response: ActionPostResponse = {
      type: "transaction",
      transaction: serializedTx,
      message: `Booking ${meeting.title} for ${amount} SOL`,
    };

    return Response.json(response, { headers });
  } catch (err) {
    console.error("Error in POST:", err);
    return Response.json({ error: "Internal error" }, { status: 500, headers });
  }
};

async function prepareTransaction(connection: Connection, payer: PublicKey, receiver: PublicKey, amount: number, bookingId?: string) {
  const transferIx = SystemProgram.transfer({
    fromPubkey: payer,
    toPubkey: receiver,
    lamports: amount * LAMPORTS_PER_SOL,
  });

  const instructions = bookingId
    ? [createMemoInstruction(bookingId, [payer]), transferIx]
    : [transferIx];

  const { blockhash } = await connection.getLatestBlockhash("finalized");
  const message = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();

  const tx = new VersionedTransaction(message);
  tx.signatures = [];
  return tx;
}
