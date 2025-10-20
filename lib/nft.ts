// lib/nft.ts
import { Connection } from '@solana/web3.js';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplCore } from '@metaplex-foundation/mpl-core';
import { create } from '@metaplex-foundation/mpl-core';
import { generateSigner, publicKey } from '@metaplex-foundation/umi';
import { baseRuleSet } from '@metaplex-foundation/mpl-core/dist/src/generated/types';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';  // For client signer
import type { WalletAdapter } from '@solana/wallet-adapter-base';

const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com';
export const connection = new Connection(rpcUrl, 'confirmed');

export const umi = createUmi(rpcUrl).use(mplCore());

export async function mintBookingNft(
  meeting: { title: string; id: string; duration: number; price: number; description?: string | null },
  userWallet: string,
  wallet?: WalletAdapter  // User's connected wallet (from useWallet)
): Promise<string> {
  if (!wallet || !wallet.publicKey) {
    throw new Error('Wallet required for minting');
  }

  umi.use(walletAdapterIdentity(wallet));  // Use user's wallet as signer/payer

  const asset = generateSigner(umi);
  const metadataUri = '/static/meeting-template.json';  

  const plugins = [
    {
      type: "Royalties" as const,
      basisPoints: 500,
      creators: [
        {
          address: publicKey(wallet.publicKey.toBase58()),  // User gets royalties (or change to creator)
          percentage: 100,
        },
      ],
      ruleSet: baseRuleSet("None"),
      authority: { type: "UpdateAuthority" as const },
    },
  ];

  await create(umi, {
    asset,
    name: `${meeting.title} Ticket #${Date.now()}`,
    uri: metadataUri,
    plugins,
    owner: publicKey(userWallet),  // Mint to user
  }).sendAndConfirm(umi);

  console.log('Minted NFT:', asset.publicKey.toString());
  return asset.publicKey.toString();
}