// scripts/test-mint.ts
import { mintBookingNft } from '@/lib/nft';

async function testMint() {
  try {
    const mockMeeting = { title: 'Test Meeting', description: 'Test desc', duration: 30, price: 0.1, id: 'test-id-123' };
    const mockUserWallet = 'YourPhantomPubkeyHere';  // Replace with your Phantom address

    const mintAddress = await mintBookingNft(mockMeeting, mockUserWallet);
    console.log('✅ Mint success:', mintAddress);
    console.log('Check explorer: https://explorer.solana.com/address/' + mintAddress + '?cluster=devnet');
  } catch (error) {
    console.error('❌ Mint failed:', error);
  }
}

testMint();