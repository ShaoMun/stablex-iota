import type { NextApiRequest, NextApiResponse } from 'next';
import { IotaClient, getFullnodeUrl } from '@iota/iota-sdk/client';
import { Transaction } from '@iota/iota-sdk/transactions';
import { Ed25519Keypair } from '@iota/iota-sdk/keypairs/ed25519';
import { fromB64 } from '@iota/iota-sdk/utils';
import { bech32 } from 'bech32';

// Private key for the sender wallet (bech32 encoded)
const SENDER_PRIVATE_KEY = 'iotaprivkey1qq9krr4gw807s9x2nqe487m3ysvu5x4znqlgeff82g4tgcv66dravh99m0k';
const SENDER_PUBLIC_KEY = '0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2';

// Package ID
const PACKAGE_ID = '0x1cf79de8cac02b52fa384df41e7712b5bfadeae2d097a818008780cf7d7783c6';

// Amounts in micro-units (6 decimals)
// 10 tokens = 10,000,000 micro-units (10 * 1,000,000)
const TOKEN_AMOUNT = 10_000_000; // 10 tokens (10 * 1,000,000)

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { recipientAddress } = req.body;

    if (!recipientAddress) {
      return res.status(400).json({ error: 'Missing recipientAddress' });
    }

    // Initialize IOTA client
    const client = new IotaClient({
      url: getFullnodeUrl('testnet'),
    });

    // Create keypair from private key
    // IOTA private keys are bech32 encoded: iotaprivkey1<bech32-encoded-key>
    // We need to find the correct private key bytes that match the provided address
    let keypair: Ed25519Keypair | null = null;
    let privateKeyBytes: Uint8Array | null = null;
    
    try {
      const decoded = bech32.decode(SENDER_PRIVATE_KEY);
      const bytes = bech32.fromWords(decoded.words);
      
      console.log('Decoded bech32 bytes length:', bytes.length);
      
      // Try different byte extraction methods to find the correct private key
      // IOTA private key format can vary, so we try multiple approaches
      const attempts = [
        { skip: 0, take: 32, desc: 'First 32 bytes' },
        { skip: 1, take: 32, desc: 'Skip 1, take 32 bytes' },
        { skip: 0, take: 64, desc: 'First 64 bytes (then take last 32)' },
      ];
      
      for (const attempt of attempts) {
        try {
          if (bytes.length >= attempt.skip + attempt.take) {
            let testBytes: Uint8Array;
            if (attempt.take === 64) {
              // For 64 bytes, take the last 32 (some formats have public key + private key)
              const allBytes = bytes.slice(attempt.skip, attempt.skip + attempt.take);
              testBytes = new Uint8Array(allBytes.slice(32, 64));
            } else {
              testBytes = new Uint8Array(bytes.slice(attempt.skip, attempt.skip + attempt.take));
            }
            
            const testKeypair = Ed25519Keypair.fromSecretKey(testBytes);
            
            // Try to get the address from this keypair
            let testAddress: string | null = null;
            try {
              if ('publicKey' in testKeypair) {
                const pubKey = (testKeypair as any).publicKey;
                if (typeof pubKey.toIotaAddress === 'function') {
                  testAddress = pubKey.toIotaAddress();
                } else if (typeof pubKey.toAddress === 'function') {
                  testAddress = pubKey.toAddress();
                } else if ('toSuiAddress' in pubKey && typeof (pubKey as any).toSuiAddress === 'function') {
                  // IOTA uses similar address format to Sui
                  testAddress = (pubKey as any).toSuiAddress();
                }
              } else if ('getPublicKey' in testKeypair && typeof (testKeypair as any).getPublicKey === 'function') {
                const pubKey = (testKeypair as any).getPublicKey();
                if (typeof pubKey.toIotaAddress === 'function') {
                  testAddress = pubKey.toIotaAddress();
                } else if (typeof pubKey.toAddress === 'function') {
                  testAddress = pubKey.toAddress();
                }
              }
            } catch (e) {
              // Continue
            }
            
            console.log(`Attempt ${attempt.desc}: address = ${testAddress}`);
            
            // Check if this matches the expected address
            if (testAddress && testAddress.toLowerCase() === SENDER_PUBLIC_KEY.toLowerCase()) {
              console.log(`✓ Found matching keypair with ${attempt.desc}`);
              keypair = testKeypair;
              privateKeyBytes = testBytes;
              break;
            }
          }
        } catch (e) {
          // Continue to next attempt
          console.log(`Attempt ${attempt.desc} failed:`, e);
        }
      }
      
      // If no match found, use the first 32 bytes as fallback
      if (!keypair) {
        console.warn('No matching keypair found, using first 32 bytes as fallback');
        privateKeyBytes = new Uint8Array(bytes.slice(0, 32));
        keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);
      }
    } catch (error) {
      // Fallback: try base64 if bech32 fails
      console.warn('Bech32 decode failed, trying base64 fallback:', error);
      try {
        const privateKeyBase64 = SENDER_PRIVATE_KEY.replace('iotaprivkey1', '');
        privateKeyBytes = fromB64(privateKeyBase64);
        if (privateKeyBytes.length > 32) {
          privateKeyBytes = privateKeyBytes.slice(0, 32);
        } else if (privateKeyBytes.length < 32) {
          const padded = new Uint8Array(32);
          padded.set(privateKeyBytes, 0);
          privateKeyBytes = padded;
        }
        keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);
      } catch (fallbackError) {
        throw new Error(`Failed to decode private key: ${error}. Fallback also failed: ${fallbackError}`);
      }
    }
    
    if (!keypair) {
      throw new Error('Failed to create keypair from private key');
    }
    
    // Use the provided sender address directly (this is the correct address for the private key)
    const senderAddress = SENDER_PUBLIC_KEY;

    console.log('Sender address:', senderAddress);

    // Query each token type separately - getCoins may not return all types without specifying coinType
    const usdcCoinType = `${PACKAGE_ID}::usdc::USDC`;
    const chfxCoinType = `${PACKAGE_ID}::chfx::CHFX`;
    const sekxCoinType = `${PACKAGE_ID}::sekx::SEKX`;
    const trybCoinType = `${PACKAGE_ID}::tryb::TRYB`;

    console.log('Querying coins for each token type...');
    console.log('USDC coin type:', usdcCoinType);
    console.log('CHFX coin type:', chfxCoinType);
    console.log('SEKX coin type:', sekxCoinType);
    console.log('TRYB coin type:', trybCoinType);

    // Query each token type separately
    const [usdcCoinsResult, chfxCoinsResult, sekxCoinsResult, trybCoinsResult] = await Promise.all([
      client.getCoins({ owner: senderAddress, coinType: usdcCoinType }).catch(e => {
        console.warn('Error querying USDC:', e);
        return { data: [] };
      }),
      client.getCoins({ owner: senderAddress, coinType: chfxCoinType }).catch(e => {
        console.warn('Error querying CHFX:', e);
        return { data: [] };
      }),
      client.getCoins({ owner: senderAddress, coinType: sekxCoinType }).catch(e => {
        console.warn('Error querying SEKX:', e);
        return { data: [] };
      }),
      client.getCoins({ owner: senderAddress, coinType: trybCoinType }).catch(e => {
        console.warn('Error querying TRYB:', e);
        return { data: [] };
      }),
    ]);

    const usdcCoins = usdcCoinsResult.data || [];
    const chfxCoins = chfxCoinsResult.data || [];
    const sekxCoins = sekxCoinsResult.data || [];
    const trybCoins = trybCoinsResult.data || [];

    console.log(`USDC coins found: ${usdcCoins.length}`);
    console.log(`CHFX coins found: ${chfxCoins.length}`);
    console.log(`SEKX coins found: ${sekxCoins.length}`);
    console.log(`TRYB coins found: ${trybCoins.length}`);

    // Also try getting all coins without filter to see what's available
    const allCoins = await client.getCoins({
      owner: senderAddress,
    });
    console.log(`Total coins (all types): ${allCoins.data?.length || 0}`);
    if (allCoins.data && allCoins.data.length > 0) {
      const uniqueTypes = [...new Set(allCoins.data.map((c: any) => c.coinType))];
      console.log('All unique coin types found:', uniqueTypes.join(', '));
    }

    const results: any[] = [];

    // Check if recipient has enough IOTA for gas fees
    const recipientIotaCoins = await client.getCoins({
      owner: recipientAddress,
      coinType: '0x2::iota::IOTA',
    }).catch(() => ({ data: [] }));
    
    const recipientIotaBalance = (recipientIotaCoins.data || []).reduce(
      (sum, coin) => sum + BigInt(coin.balance || 0), 
      BigInt(0)
    );
    
    const minGasNeeded = BigInt(10_000_000); // Minimum gas needed for transactions

    // Send USDC
    if (usdcCoins.length > 0) {
      try {
        // Calculate total balance
        const totalBalance = usdcCoins.reduce((sum, coin) => sum + BigInt(coin.balance || 0), BigInt(0));
        console.log(`USDC total balance: ${totalBalance}, needed: ${TOKEN_AMOUNT}`);

        if (totalBalance >= BigInt(TOKEN_AMOUNT)) {
          const tx = new Transaction();
          tx.setSender(senderAddress);
          
          // Find a coin with sufficient balance or combine coins
          let coinToUse: any = null;
          
          // Try to find a single coin with enough balance
          for (const coin of usdcCoins) {
            const coinValue = BigInt(coin.balance || 0);
            if (coinValue >= BigInt(TOKEN_AMOUNT)) {
              coinToUse = coin;
              break;
            }
          }
          
          if (coinToUse) {
            // Use a single coin - split and transfer
            const coinRef = tx.object(coinToUse.coinObjectId);
            const splitCoin = tx.splitCoins(coinRef, [TOKEN_AMOUNT]);
            tx.transferObjects([splitCoin], recipientAddress);
          } else {
            // Need to merge coins first, then split
            // Merge all coins into one, then split the needed amount
            const coinRefs = usdcCoins.map(coin => tx.object(coin.coinObjectId));
            const mergedCoin = tx.mergeCoins(coinRefs[0], coinRefs.slice(1));
            const splitCoin = tx.splitCoins(mergedCoin, [TOKEN_AMOUNT]);
            tx.transferObjects([splitCoin], recipientAddress);
          }
          
          tx.setGasBudget(10_000_000);

          const builtTx = await tx.build({ client });
          const signature = await keypair.signTransaction(builtTx);
          const result = await client.executeTransactionBlock({
            transactionBlock: builtTx,
            signature: signature.signature,
            options: { showEffects: true },
          });

          results.push({ type: 'USDC', digest: result.digest, success: true });
        } else {
          results.push({ type: 'USDC', error: `Insufficient USDC balance. Have ${totalBalance}, need ${TOKEN_AMOUNT}`, success: false });
        }
      } catch (error: any) {
        console.error('Error sending USDC:', error);
        results.push({ type: 'USDC', error: error.message, success: false });
      }
    } else {
      results.push({ type: 'USDC', error: 'No USDC coins found', success: false });
    }

    // Send CHFX
    if (chfxCoins.length > 0) {
      try {
        const totalBalance = chfxCoins.reduce((sum, coin) => sum + BigInt(coin.balance || 0), BigInt(0));
        console.log(`CHFX total balance: ${totalBalance}, needed: ${TOKEN_AMOUNT}`);

        if (totalBalance >= BigInt(TOKEN_AMOUNT)) {
          const tx = new Transaction();
          tx.setSender(senderAddress);
          
          let coinToUse: any = null;
          for (const coin of chfxCoins) {
            const coinValue = BigInt(coin.balance || 0);
            if (coinValue >= BigInt(TOKEN_AMOUNT)) {
              coinToUse = coin;
              break;
            }
          }
          
          if (coinToUse) {
            const coinRef = tx.object(coinToUse.coinObjectId);
            const splitCoin = tx.splitCoins(coinRef, [TOKEN_AMOUNT]);
            tx.transferObjects([splitCoin], recipientAddress);
          } else {
            const coinRefs = chfxCoins.map(coin => tx.object(coin.coinObjectId));
            const mergedCoin = tx.mergeCoins(coinRefs[0], coinRefs.slice(1));
            const splitCoin = tx.splitCoins(mergedCoin, [TOKEN_AMOUNT]);
            tx.transferObjects([splitCoin], recipientAddress);
          }
          
          tx.setGasBudget(10_000_000);

          const builtTx = await tx.build({ client });
          const signature = await keypair.signTransaction(builtTx);
          const result = await client.executeTransactionBlock({
            transactionBlock: builtTx,
            signature: signature.signature,
            options: { showEffects: true },
          });

          results.push({ type: 'CHFX', digest: result.digest, success: true });
        } else {
          results.push({ type: 'CHFX', error: `Insufficient CHFX balance. Have ${totalBalance}, need ${TOKEN_AMOUNT}`, success: false });
        }
      } catch (error: any) {
        console.error('Error sending CHFX:', error);
        results.push({ type: 'CHFX', error: error.message, success: false });
      }
    } else {
      results.push({ type: 'CHFX', error: 'No CHFX coins found', success: false });
    }

    // Send SEKX
    if (sekxCoins.length > 0) {
      try {
        const totalBalance = sekxCoins.reduce((sum, coin) => sum + BigInt(coin.balance || 0), BigInt(0));
        console.log(`SEKX total balance: ${totalBalance}, needed: ${TOKEN_AMOUNT}`);

        if (totalBalance >= BigInt(TOKEN_AMOUNT)) {
          const tx = new Transaction();
          tx.setSender(senderAddress);
          
          let coinToUse: any = null;
          for (const coin of sekxCoins) {
            const coinValue = BigInt(coin.balance || 0);
            if (coinValue >= BigInt(TOKEN_AMOUNT)) {
              coinToUse = coin;
              break;
            }
          }
          
          if (coinToUse) {
            const coinRef = tx.object(coinToUse.coinObjectId);
            const splitCoin = tx.splitCoins(coinRef, [TOKEN_AMOUNT]);
            tx.transferObjects([splitCoin], recipientAddress);
          } else {
            const coinRefs = sekxCoins.map(coin => tx.object(coin.coinObjectId));
            const mergedCoin = tx.mergeCoins(coinRefs[0], coinRefs.slice(1));
            const splitCoin = tx.splitCoins(mergedCoin, [TOKEN_AMOUNT]);
            tx.transferObjects([splitCoin], recipientAddress);
          }
          
          tx.setGasBudget(10_000_000);

          const builtTx = await tx.build({ client });
          const signature = await keypair.signTransaction(builtTx);
          const result = await client.executeTransactionBlock({
            transactionBlock: builtTx,
            signature: signature.signature,
            options: { showEffects: true },
          });

          results.push({ type: 'SEKX', digest: result.digest, success: true });
        } else {
          results.push({ type: 'SEKX', error: `Insufficient SEKX balance. Have ${totalBalance}, need ${TOKEN_AMOUNT}`, success: false });
        }
      } catch (error: any) {
        console.error('Error sending SEKX:', error);
        results.push({ type: 'SEKX', error: error.message, success: false });
      }
    } else {
      results.push({ type: 'SEKX', error: 'No SEKX coins found', success: false });
    }

    // Send TRYB
    if (trybCoins.length > 0) {
      try {
        const totalBalance = trybCoins.reduce((sum, coin) => sum + BigInt(coin.balance || 0), BigInt(0));
        console.log(`TRYB total balance: ${totalBalance}, needed: ${TOKEN_AMOUNT}`);

        if (totalBalance >= BigInt(TOKEN_AMOUNT)) {
          const tx = new Transaction();
          tx.setSender(senderAddress);
          
          let coinToUse: any = null;
          for (const coin of trybCoins) {
            const coinValue = BigInt(coin.balance || 0);
            if (coinValue >= BigInt(TOKEN_AMOUNT)) {
              coinToUse = coin;
              break;
            }
          }
          
          if (coinToUse) {
            const coinRef = tx.object(coinToUse.coinObjectId);
            const splitCoin = tx.splitCoins(coinRef, [TOKEN_AMOUNT]);
            tx.transferObjects([splitCoin], recipientAddress);
          } else {
            const coinRefs = trybCoins.map(coin => tx.object(coin.coinObjectId));
            const mergedCoin = tx.mergeCoins(coinRefs[0], coinRefs.slice(1));
            const splitCoin = tx.splitCoins(mergedCoin, [TOKEN_AMOUNT]);
            tx.transferObjects([splitCoin], recipientAddress);
          }
          
          tx.setGasBudget(10_000_000);

          const builtTx = await tx.build({ client });
          const signature = await keypair.signTransaction(builtTx);
          const result = await client.executeTransactionBlock({
            transactionBlock: builtTx,
            signature: signature.signature,
            options: { showEffects: true },
          });

          results.push({ type: 'TRYB', digest: result.digest, success: true });
        } else {
          results.push({ type: 'TRYB', error: `Insufficient TRYB balance. Have ${totalBalance}, need ${TOKEN_AMOUNT}`, success: false });
        }
      } catch (error: any) {
        console.error('Error sending TRYB:', error);
        results.push({ type: 'TRYB', error: error.message, success: false });
      }
    } else {
      results.push({ type: 'TRYB', error: 'No TRYB coins found', success: false });
    }

    // Add notice about IOTA for gas
    const notice = recipientIotaBalance < minGasNeeded
      ? `Please ensure your account has enough IOTA for gas fees (minimum ${minGasNeeded / BigInt(1_000_000)} IOTA). Get IOTA from the faucet: https://testnet.evm-bridge.iota.org/`
      : `Please ensure your account has enough IOTA for gas fees. Get IOTA from the faucet: https://testnet.evm-bridge.iota.org/`;

    return res.status(200).json({
      success: true,
      results,
      notice,
    });
  } catch (error: any) {
    console.error('Error in request-funds API:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}

