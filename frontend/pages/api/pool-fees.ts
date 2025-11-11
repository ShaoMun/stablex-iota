import type { NextApiRequest, NextApiResponse } from 'next';

// Pool contract addresses - Updated Dec 2024 with coin transfer logic
const POOL_PACKAGE_ID = "0xe3a167fa29d171fc79d0b76534fcd8fa86e719177e732373fb9e004076e16a0f";
const POOL_MODULE = 'sbx_pool';
const POOL_STRUCT = 'Pool';
const REGISTRY_STRUCT = 'Registry';

// Pool and Registry object IDs - Updated Dec 2024
// These can be overridden with environment variables
const POOL_OBJECT_ID = "0xb107e62bfcfe4a1492212d3039e357aa443eba350a91963f2e74214e10c7e703";
const REGISTRY_OBJECT_ID = "0x4cdef4b7bb87bd7abbae95dc8eb034fc88ab0ea78f252d333f2dcecb22e623be";

// Currency price pairs for fetching prices
const currencyPricePairs: Record<string, string> = {
  USDC: 'USDC-USD',
  CHFX: 'USD-CHF',
  TRYB: 'USD-TRY',
  SEKX: 'USD-SEK',
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { currency, amount } = req.query;

    if (!currency || !amount) {
      return res.status(400).json({ error: 'Missing currency or amount parameter' });
    }

    const currencyStr = currency as string;
    const amountNum = parseFloat(amount as string);

    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Initialize IOTA client (dynamic import for Next.js compatibility)
    const { IotaClient, getFullnodeUrl } = await import('@iota/iota-sdk/client');
    const client = new IotaClient({
      url: getFullnodeUrl('testnet'),
    });

    // Fetch currency prices for coverage calculation (needed for swap fee)
    const host = req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || (host?.includes('localhost') ? 'http' : 'https');
    const baseUrl = `${protocol}://${host}`;
    const pricePromises = ['CHFX', 'TRYB', 'SEKX'].map(async (curr) => {
      try {
        const pair = currencyPricePairs[curr];
        const priceRes = await fetch(`${baseUrl}/api/currency-price?pair=${pair}`);
        if (priceRes.ok) {
          const priceData = await priceRes.json();
          // Invert price for non-USDC currencies
          return priceData.price > 0 ? 1 / priceData.price : 0;
        }
        return 0;
      } catch {
        return 0;
      }
    });

    const [chfxPrice, trybPrice, sekxPrice] = await Promise.all(pricePromises);

    // Convert prices to micro-USD (1e6 = $1.00)
    const chfxPriceMu = Math.floor(chfxPrice * 1_000_000);
    const trybPriceMu = Math.floor(trybPrice * 1_000_000);
    const sekxPriceMu = Math.floor(sekxPrice * 1_000_000);

    // Query network fee (gas fee) from IOTA
    // Note: getReferenceGasPrice() queries the on-chain network state for the current reference gas price
    // This is truly on-chain data from the IOTA network
    let networkFee = 0; // Start with 0, will calculate from actual gas price
    try {
      // Get reference gas price from the network (on-chain query)
      // This returns the gas price per computation unit in smallest IOTA units
      const referenceGasPrice = await client.getReferenceGasPrice();
      
      // Log the actual gas price for debugging
      console.log('Reference gas price from IOTA (on-chain):', referenceGasPrice.toString());
      
      // Estimate computation units for a typical stake transaction
      // A stake transaction typically uses around 1000-5000 computation units
      // This is an estimate - actual computation units depend on transaction complexity
      const estimatedComputationUnits = 3000; // Conservative estimate
      
      // Calculate computation fee: computation_units * gas_price
      // The gas price is returned as a BigInt in smallest units
      const gasPriceBigInt = BigInt(referenceGasPrice);
      
      // Calculate total gas cost in smallest IOTA units
      const totalGasCost = gasPriceBigInt * BigInt(estimatedComputationUnits);
      
      // IOTA reference gas price is typically in very small units
      // For IOTA, we need to understand the actual unit being used
      // The gas price is usually returned in a format where we need to convert to IOTA
      // Then convert IOTA to USD to get the fee in stablecoin terms
      
      // Convert BigInt to number for calculation
      // Note: IOTA gas prices are typically very small (often 0 on testnet)
      const totalGasCostNumber = Number(totalGasCost);
      
      if (totalGasCostNumber > 0) {
        // The reference gas price is typically in a very small unit
        // We need to convert it properly. Let's assume it's in the smallest unit
        // and convert to IOTA (1 IOTA = 1e9 smallest units, but this may vary)
        // For now, let's try a more direct approach: convert directly to USD
        
        // Fetch IOTA/USD price to convert properly
        try {
          // Try to get IOTA price from a price API (you might want to use a different source)
          // For now, we'll use a reasonable estimate for testnet/mainnet
          // On testnet, fees are often subsidized (near 0)
          // On mainnet, IOTA is typically worth around $0.15-0.25
          
          // Since we're on testnet, and gas prices are often 0 or very small,
          // we'll calculate the fee more carefully
          
          // The gas price from getReferenceGasPrice() is typically in a format where
          // we need to divide by a large number to get IOTA
          // Let's assume it's in smallest units (1e9 per IOTA) for now
          const gasCostInIOTA = totalGasCostNumber / 1_000_000_000; // Convert to IOTA
          
          // For testnet, fees are typically near zero or subsidized
          // For mainnet, we'd fetch IOTA/USD price
          // Using a conservative estimate: if gas cost is meaningful, convert to USD
          if (gasCostInIOTA > 0.000001) { // Very small threshold
            // For testnet, use a minimal conversion (testnet IOTA has little value)
            // For mainnet, you'd fetch real IOTA/USD price
            const iotaToUSD = 0.20; // Rough estimate (mainnet), testnet is much lower
            networkFee = gasCostInIOTA * iotaToUSD;
            
            // Cap at a reasonable maximum and ensure it's not too small
            if (networkFee < 0.00001) {
              networkFee = 0; // Essentially free on testnet
            }
          } else {
            networkFee = 0; // Gas price is 0 or negligible
          }
        } catch (priceError) {
          console.error('Error converting gas price to USD:', priceError);
          networkFee = 0; // Default to 0 if conversion fails
        }
      } else {
        // Gas price is 0 (testnet often has free transactions)
        networkFee = 0;
      }
      
      console.log('Calculated network fee (on-chain):', networkFee, currencyStr, 'from gas price:', referenceGasPrice.toString());
    } catch (error) {
      console.error('Error fetching network fee:', error);
      // Default to 0 if we can't fetch (testnet often has free transactions)
      networkFee = 0;
    }
    
    // If network fee is still 0 or very small, that's fine for testnet
    // But we might want to show a minimal estimate for display purposes
    // For now, we'll return the actual calculated value (which may be 0 on testnet)

    // Deposit fee for staking - fixed rate
    const depositFeeBps = 10; // 0.1% (10 bps) fixed rate for staking
    const depositFee = (amountNum * depositFeeBps) / 10_000;

    // Swap fee: Staking operations should not incur a swap fee.
    // The three-tier system for swap fees is primarily for withdrawals/swaps
    // to prevent draining a specific currency from the pool.
    // For staking, users are depositing into the pool, not swapping.
    const swapFee = 0;
    const swapFeeBps = 0;

    const totalFees = networkFee + depositFee + swapFee;

    return res.status(200).json({
      networkFee,
      depositFee,
      swapFee,
      totalFees,
      currency: currencyStr,
      amount: amountNum,
      // Include metadata for debugging
      metadata: {
        note: 'Gas fee (network fee) is queried from IOTA network for every transaction. Deposit fee is a fixed rate. Staking operations do not incur a swap fee.',
        depositFeeBps,
        swapFeeBps,
        poolPackageId: POOL_PACKAGE_ID,
        networkFeeSource: networkFee === 0.0001 ? 'estimated (testnet fees are typically near-zero)' : 'calculated from network',
      },
    });
  } catch (error: any) {
    console.error('Pool fees fetch error:', error);
    return res.status(500).json({
      error: 'Failed to fetch pool fees',
      message: error.message,
    });
  }
}

