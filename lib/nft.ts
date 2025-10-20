import { Connection } from '@solana/web3.js';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplCore } from '@metaplex-foundation/mpl-core';
import { create } from '@metaplex-foundation/mpl-core';
import { generateSigner, signerIdentity, publicKey, type Signer } from '@metaplex-foundation/umi';
import { baseRuleSet } from '@metaplex-foundation/mpl-core/dist/src/generated/types';
// import { percentAmount } from '@metaplex-foundation/umi';

const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com';
export const connection = new Connection(rpcUrl);

export const umi = createUmi(rpcUrl).use(mplCore());

export async function mintBookingNft(
  meeting: { title: string; id: string; duration: number; price: number; description?: string | null },
  userWallet: string,  // Buyer gets NFT
  creatorSigner?: Signer  // Creator's wallet signer (from session)
): Promise<string> {
  if (creatorSigner) {
    umi.use(signerIdentity(creatorSigner));  // Creator signs/pays fee
  }

  const asset = generateSigner(umi);
  const metadataUri = '/static/meeting-template.json';  // Static file (Step 4)

  await create(umi, {
    asset,
    name: `${meeting.title} Ticket`,
    uri: metadataUri,
    owner: publicKey(userWallet),  // To buyer (Umi PublicKey)
    ...(creatorSigner
      ? {
          plugins: [
            {
              type: "Royalties" as const,
              basisPoints: 500,
              creators: [{ address: creatorSigner.publicKey, percentage: 100 }],
              ruleSet: baseRuleSet('None'),
              authority: { type: "UpdateAuthority" as const },
            },
          ],
        }
      : {}),
  }).sendAndConfirm(umi);

  console.log('Minted NFT:', asset.publicKey.toString());
  return asset.publicKey.toString();
}