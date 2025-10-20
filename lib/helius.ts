// lib/helius.ts (For webhook setup)
import { db } from '@/lib/db';

const HELIUS_API =process.env.NEXT_PUBLIC_RPC_URL!;
const API_KEY = process.env.NEXT_PUBLIC_API_KEY!;

export async function createWebhook(_webhookUrl: string) {
  // Fetch all creator wallets (or hardcode for demo)
  const creatorWallets = await db.meeting.findMany({
    select: { creatorWallet: true },
    distinct: ['creatorWallet'],
  }).then(wallets => wallets.map(w => w.creatorWallet));

  if (creatorWallets.length === 0) {
    throw new Error('No creator wallets to monitor');
  }

  const body = {
    webhookURL: "https://httpdump.app/inspect/f401a629-7df8-4f85-8735-336e40df89bc",
    transactionTypes: ['TRANSFER'], // Filter for SOL transfers
    accountAddresses: creatorWallets, // Monitor all creators
    webhookType: 'enhancedDevnet', // Or 'enhanced' for mainnet
    authHeader: 'Bearer my-secret-token', // For verification in handler
  };

  const res = await fetch(`${HELIUS_API}/webhooks?api-key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Failed to create webhook: ${await res.text()}`);
  }

  const { webhookID } = await res.json();
  console.log(`Webhook created: ${webhookID}`);
  return webhookID;
}

export async function deleteWebhook(webhookId: string) {
  const res = await fetch(`${HELIUS_API}/webhooks/${webhookId}?api-key=${API_KEY}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    console.error(`Failed to delete webhook: ${await res.text()}`);
  } else {
    console.log(`Webhook deleted: ${webhookId}`);
  }
}

// HMAC verification util (Helius sends X-Hook-Signature header)
import * as crypto from 'crypto';
export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expected = `v1,${hmac.digest('hex')}`;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}