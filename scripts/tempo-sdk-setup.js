#!/usr/bin/env node
/**
 * Tempo SDK Integration Setup
 * Alternative to CLI binary for systems with GLIBC < 2.38
 */

const { createPublicClient, http } = require('viem');
const { tempoMainnet, tempoModerato } = require('@tempo-xyz/viem/chains');

async function setupTempoSDK() {
  console.log('🎭 Tempo SDK Setup');
  
  try {
    // Create client for Tempo Moderato (testnet)
    const client = createPublicClient({
      chain: tempoModerato,
      transport: http('https://rpc.moderato.tempo.xyz'),
    });

    const blockNumber = await client.getBlockNumber();
    console.log(`✅ Connected to Tempo Moderato`);
    console.log(`   Latest Block: ${blockNumber}`);
    console.log(`   Chain ID: ${tempoModerato.id}`);
    
    // Test TIP-20 token read (pathUSD predeployed)
    const pathUSD_ADDRESS = '0x20c0000000000000000000000000000000000000';
    const name = await client.readContract({
      address: pathUSD_ADDRESS,
      abi: [{ type: 'function', name: 'name', inputs: [], outputs: [{ type: 'string' }], stateMutability: 'view' }],
      functionName: 'name',
    });
    
    console.log(`   TIP-20 Token: ${name} (${pathUSD_ADDRESS})`);
    console.log('\n🚀 SDK Ready! Use for all Tempo interactions.');
    console.log('   - Fee sponsorship supported');
    console.log('   - Batch transactions enabled');
    console.log('   - MPP payments via transferWithMessage');
    
    return { client, chain: 'moderato' };
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run setup
setupTempoSDK().then(() => {
  console.log('\n✨ Tempo SDK successfully initialized!');
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
