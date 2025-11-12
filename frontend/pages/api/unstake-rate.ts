import type { NextApiRequest, NextApiResponse } from 'next';

// Pool contract addresses - Updated Dec 2024 with coin transfer logic
const POOL_PACKAGE_ID = "0x05c4be9ea7e0ab044c923099fa41f94f524fd29339f0b2447373574377b2a20e";
const POOL_MODULE = 'sbx_pool';

// Pool and Registry object IDs - Updated Dec 2024
const POOL_OBJECT_ID = "0xb727a10b1d354bd1f4b7f19152aee6fbf33bafcf9e741560a34bdaa0365fd189";
const REGISTRY_OBJECT_ID = "0x911ad622c7b733650e06a609ee8bb808d4a6ff184cd15ce731b5033c036e914d";

// Currency to price pair mapping
const currencyPricePairs: Record<string, string> = {
  USDC: 'USDC-USD',
  CHFX: 'USD-CHF',
  TRYB: 'USD-TRY',
  SEKX: 'USD-SEK',
};

// Currency code mapping (0 = CHFX, 1 = TRYB, 2 = SEKX)
const currencyCodes: Record<string, number> = {
  CHFX: 0,
  TRYB: 1,
  SEKX: 2,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { toCurrency, amount } = req.query;

    if (!toCurrency || !amount) {
      return res.status(400).json({ error: 'Missing required parameters: toCurrency, amount' });
    }

    // Handle Next.js query params (can be string or string[])
    const toCurrencyRaw = Array.isArray(toCurrency) ? toCurrency[0] : toCurrency;
    const amountRaw = Array.isArray(amount) ? amount[0] : amount;
    
    // Trim and validate currency strings
    const toCurrencyStr = toCurrencyRaw ? String(toCurrencyRaw).trim().toUpperCase() : '';
    const amountStr = amountRaw ? String(amountRaw).trim() : '';
    
    // Validate currencies are provided
    if (!toCurrencyStr || !amountStr) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        details: { toCurrency: toCurrencyStr, amount: amountStr }
      });
    }
    
    // Clean amount string (remove any invalid characters like colons)
    const cleanAmountStr = amountStr.replace(/[^0-9.]/g, '');
    const amountNum = parseFloat(cleanAmountStr);

    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ 
        error: 'Invalid amount',
        details: `Received amount: "${amountStr}", parsed: ${amountNum}`,
      });
    }

    // Debug logging
    console.log('Unstake rate API called:', {
      raw: { toCurrency, amount },
      processed: { toCurrencyStr, amountStr },
      currencyCodes: Object.keys(currencyCodes),
      toCurrencyInCodes: currencyCodes[toCurrencyStr],
    });

    // Validate currency (unstake supports USDC, CHFX, TRYB, SEKX)
    if (!(toCurrencyStr === 'USDC' || toCurrencyStr in currencyCodes)) {
      return res.status(400).json({ 
        error: 'Invalid currency. Supported: USDC, CHFX, TRYB, SEKX',
        details: { 
          received: { to: toCurrencyStr },
          validCurrencies: ['USDC', ...Object.keys(currencyCodes)],
        }
      });
    }

    // Initialize IOTA client
    const { IotaClient, getFullnodeUrl } = await import('@iota/iota-sdk/client');
    const client = new IotaClient({
      url: getFullnodeUrl('testnet'),
    });

    // Fetch currency prices
    const host = req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || (host?.includes('localhost') ? 'http' : 'https');
    const baseUrl = `${protocol}://${host}`;

    const fetchPrice = async (currency: string, retries = 3): Promise<number> => {
      const pair = currencyPricePairs[currency];
      if (!pair) {
        console.error(`No price pair found for currency: ${currency}`);
        return 0;
      }

      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
          
          const priceRes = await fetch(`${baseUrl}/api/currency-price?pair=${pair}`, {
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          if (priceRes.ok) {
            const priceData = await priceRes.json();
            if (priceData.price && priceData.price > 0) {
              // For USDC-USD, the oracle already shows USDC in USD, so just multiply by 1_000_000
              if (currency === 'USDC') {
                return Math.floor(priceData.price * 1_000_000);
              } else {
                // Oracle shows USD per currency (e.g., USD/CHF = 0.92 means 1 USD = 0.92 CHF)
                // Contract expects USD/[CURRENCY] in micro-USD (e.g., USD/CHF = 1/0.92 = 1.087 USD per CHF)
                // So we need to INVERT: 1 / oracle_price, then convert to micro-USD
                const invertedPrice = 1 / priceData.price;
                return Math.floor(invertedPrice * 1_000_000);
              }
            } else {
              console.warn(`Invalid price data for ${currency}:`, priceData);
            }
          } else {
            console.warn(`Price fetch failed for ${currency} (attempt ${attempt}/${retries}):`, priceRes.status, priceRes.statusText);
          }
        } catch (error: any) {
          console.warn(`Price fetch error for ${currency} (attempt ${attempt}/${retries}):`, error.message);
          if (attempt === retries) {
            console.error(`Failed to fetch price for ${currency} after ${retries} attempts`);
          }
        }
        
        // Wait before retry (exponential backoff)
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
      
      return 0;
    };

    // SBX price is always 1 USD (1 SBX = 1 USD)
    const sbxPriceMu = 1_000_000; // 1 USD in micro-USD
    const [toPriceMu, chfxPriceMu, trybPriceMu, sekxPriceMu] = await Promise.all([
      fetchPrice(toCurrencyStr),
      fetchPrice('CHFX'),
      fetchPrice('TRYB'),
      fetchPrice('SEKX'),
    ]);

    if (toPriceMu === 0) {
      console.error('Failed to fetch price for toCurrency:', {
        toCurrency: toCurrencyStr,
        toPriceMu,
      });
      
      return res.status(400).json({ 
        error: 'Failed to fetch currency price',
        details: `Could not fetch price for: ${toCurrencyStr}`,
        toPriceMu,
      });
    }

    // Fetch Pool and Registry objects
    const [poolObj, registryObj] = await Promise.all([
      client.getObject({
        id: POOL_OBJECT_ID,
        options: { showContent: true, showType: true },
      }),
      client.getObject({
        id: REGISTRY_OBJECT_ID,
        options: { showContent: true, showType: true },
      }),
    ]);

    if (!poolObj.data || !registryObj.data) {
      return res.status(404).json({ error: 'Pool or Registry object not found' });
    }

    const poolData = poolObj.data as any;
    const registryData = registryObj.data as any;

    // Extract pool fields
    const poolContent = poolData.content?.fields || {};
    const usdcReserve = BigInt(poolContent.usdc_reserve || 0);
    const chfxLiability = BigInt(poolContent.chfx_liability_units || 0);
    const trybLiability = BigInt(poolContent.tryb_liability_units || 0);
    const sekxLiability = BigInt(poolContent.sekx_liability_units || 0);

    // Extract registry fields
    const registryContent = registryData.content?.fields || {};
    const targetChfxBps = Number(registryContent.target_chfx_bps || 0);
    const targetTrybBps = Number(registryContent.target_tryb_bps || 0);
    const targetSekxBps = Number(registryContent.target_sekx_bps || 0);
    
    // Use registry cached prices for POST-unstake calculation (must match Move contract EXACTLY)
    const registryChfxPriceMu = Number(registryContent.chfx_price_microusd || 0);
    const registryTrybPriceMu = Number(registryContent.tryb_price_microusd || 0);
    const registrySekxPriceMu = Number(registryContent.sekx_price_microusd || 0);
    
    // Debug: Log registry prices
    console.log('Registry cached prices (used by Move contract):', {
      registry_chfx: registryChfxPriceMu,
      registry_tryb: registryTrybPriceMu,
      registry_sekx: registrySekxPriceMu,
      oracle_chfx: chfxPriceMu,
      oracle_tryb: trybPriceMu,
      oracle_sekx: sekxPriceMu,
      warning: (registryChfxPriceMu === 0 || registryTrybPriceMu === 0 || registrySekxPriceMu === 0) 
        ? 'WARNING: Registry prices are 0! Fee calculation may be incorrect. Set prices using admin_set_prices_microusd.'
        : 'Registry prices are set correctly'
    });

    // Calculate vault USD values (micro-USD) - PRE-unstake
    const chfxMu = (chfxLiability * BigInt(chfxPriceMu)) / BigInt(1_000_000);
    const trybMu = (trybLiability * BigInt(trybPriceMu)) / BigInt(1_000_000);
    const sekxMu = (sekxLiability * BigInt(sekxPriceMu)) / BigInt(1_000_000);
    const totalMu = usdcReserve + chfxMu + trybMu + sekxMu;

    // Calculate coverage in basis points for each currency - PRE-unstake
    const chfxBps = totalMu > 0 ? Number((chfxMu * BigInt(10_000)) / totalMu) : 0;
    const trybBps = totalMu > 0 ? Number((trybMu * BigInt(10_000)) / totalMu) : 0;
    const sekxBps = totalMu > 0 ? Number((sekxMu * BigInt(10_000)) / totalMu) : 0;

    // Get target and current coverage for "to" currency
    let toTargetBps: number;
    let toCovBpsPre: number;
    let toLiabilityPre: bigint;

    if (toCurrencyStr === 'USDC') {
      // USDC doesn't have a target or liability, it's the reserve
      toTargetBps = 0;
      toCovBpsPre = totalMu > 0 ? Number((usdcReserve * BigInt(10_000)) / totalMu) : 0;
      toLiabilityPre = usdcReserve;
    } else if (toCurrencyStr === 'CHFX') {
      toTargetBps = targetChfxBps;
      toCovBpsPre = chfxBps;
      toLiabilityPre = chfxLiability;
    } else if (toCurrencyStr === 'TRYB') {
      toTargetBps = targetTrybBps;
      toCovBpsPre = trybBps;
      toLiabilityPre = trybLiability;
    } else {
      toTargetBps = targetSekxBps;
      toCovBpsPre = sekxBps;
      toLiabilityPre = sekxLiability;
    }

    // Compute direct swap rate (from compute_direct_swap_rate in Move)
    // Base rate: price_sbx / price_to (SBX is always 1 USD)
    // Rate = how many units of TO currency per 1 unit of SBX
    // Example: If price_to = 19,000 (0.019 USD), then rate = 1,000,000 / 19,000 = 52.6
    // Keep everything in BigInt to match contract's u128 math exactly
    const baseRate = (BigInt(sbxPriceMu) * BigInt(1_000_000)) / BigInt(toPriceMu);

    // Apply depth penalty if target asset is scarce (using PRE-unstake coverage for rate calculation)
    // Match contract: depth_penalty_bps = ((to_target_bps - to_depth_bps) * 100u64) / to_target_bps
    const depthPenaltyBps = toTargetBps > 0 && toCovBpsPre < toTargetBps
      ? Number((BigInt(toTargetBps - toCovBpsPre) * BigInt(100)) / BigInt(toTargetBps))
      : 0;

    // Apply penalty: rate = base_rate * (1 - penalty/10000)
    // Match contract: adjusted_rate = (base_rate * (10_000u128 - (depth_penalty_bps as u128))) / 10_000u128
    const adjustedRate = (baseRate * (BigInt(10_000) - BigInt(depthPenaltyBps))) / BigInt(10_000);

    // Calculate amount out before fee (keep in BigInt for precision)
    // Match contract: amount_out_before_fee = ((amount_in as u128) * rate) / 1_000_000u128
    const amountInUnits = BigInt(Math.floor(amountNum * 1_000_000)); // Convert to token units (6 decimals)
    const amountOutBeforeFeeUnits = (amountInUnits * adjustedRate) / BigInt(1_000_000);
    const amountOutBeforeFee = amountOutBeforeFeeUnits;

    // Calculate POST-unstake liabilities for fee calculation
    // After unstake: SBX is burned, "to" currency liability decreases (or USDC reserve decreases)
    let chfxLiabilityPost = chfxLiability;
    let trybLiabilityPost = trybLiability;
    let sekxLiabilityPost = sekxLiability;
    let usdcReservePost = usdcReserve;
    
    // Decrease "to" currency liability (using amountOutBeforeFeeUnits for calculation)
    if (toCurrencyStr === 'USDC') {
      usdcReservePost = usdcReserve - amountOutBeforeFeeUnits;
    } else if (toCurrencyStr === 'CHFX') {
      chfxLiabilityPost = chfxLiabilityPost - amountOutBeforeFeeUnits;
    } else if (toCurrencyStr === 'TRYB') {
      trybLiabilityPost = trybLiabilityPost - amountOutBeforeFeeUnits;
    } else if (toCurrencyStr === 'SEKX') {
      sekxLiabilityPost = sekxLiabilityPost - amountOutBeforeFeeUnits;
    }

    // Recalculate vault USD values with POST-unstake liabilities
    // MUST use registry cached prices to match Move contract calculation exactly
    const chfxMuPost = (chfxLiabilityPost * BigInt(registryChfxPriceMu)) / BigInt(1_000_000);
    const trybMuPost = (trybLiabilityPost * BigInt(registryTrybPriceMu)) / BigInt(1_000_000);
    const sekxMuPost = (sekxLiabilityPost * BigInt(registrySekxPriceMu)) / BigInt(1_000_000);
    const totalMuPost = usdcReservePost + chfxMuPost + trybMuPost + sekxMuPost;
    
    // Calculate POST-unstake coverage for "to" currency
    let toLiabilityPost: bigint;
    if (toCurrencyStr === 'USDC') {
      toLiabilityPost = usdcReservePost;
    } else if (toCurrencyStr === 'CHFX') {
      toLiabilityPost = chfxLiabilityPost;
    } else if (toCurrencyStr === 'TRYB') {
      toLiabilityPost = trybLiabilityPost;
    } else {
      toLiabilityPost = sekxLiabilityPost;
    }
    
    // Get registry cached price for "to" currency (must match Move contract)
    let registryToPriceMu: number;
    if (toCurrencyStr === 'USDC') {
      registryToPriceMu = 1_000_000; // USDC is always 1 USD
    } else if (toCurrencyStr === 'CHFX') {
      registryToPriceMu = registryChfxPriceMu;
    } else if (toCurrencyStr === 'TRYB') {
      registryToPriceMu = registryTrybPriceMu;
    } else {
      registryToPriceMu = registrySekxPriceMu;
    }
    
    // Calculate POST-unstake USD value for "to" currency
    const toMuPost = (toLiabilityPost * BigInt(registryToPriceMu)) / BigInt(1_000_000);
    
    // Calculate POST-unstake coverage: (to_currency_usd / total_vault_usd) * 10000
    const toCovBpsPost = totalMuPost > 0 
      ? Number((toMuPost * BigInt(10_000)) / totalMuPost)
      : 0;
    
    // Calculate withdrawal percentage: how much of the "to" currency pool is being withdrawn
    const withdrawalPercentageBps = toLiabilityPre > 0
      ? Number((amountOutBeforeFeeUnits * BigInt(10_000)) / toLiabilityPre)
      : 0;
    
    // Calculate withdrawal percentage and pool utilization for 'to' currency
    const toRemaining = toLiabilityPre;
    
    // Total staked = remaining + amount being withdrawn (this transaction)
    const toTotalStaked = toRemaining + amountOutBeforeFeeUnits;
    
    // withdrawal_pct_bps = (amount_out / total_staked_of_to_currency) * 10000
    const withdrawalPctBps = toTotalStaked > 0n
      ? Number((amountOutBeforeFeeUnits * BigInt(10_000)) / toTotalStaked)
      : 0;
    
    // pool_utilization_bps: how much of the pool has already been withdrawn (before this transaction)
    let poolUtilizationBps: number;
    if (toRemaining === 0n) {
      // Empty pool: treat as 100% utilized
      poolUtilizationBps = 10000;
    } else if (toRemaining < amountOutBeforeFeeUnits) {
      // Remaining is less than withdrawal: pool is highly utilized
      poolUtilizationBps = Number((amountOutBeforeFeeUnits * BigInt(10_000)) / (toRemaining + amountOutBeforeFeeUnits));
    } else {
      // Pool has sufficient remaining: use withdrawal percentage as utilization estimate
      poolUtilizationBps = withdrawalPctBps;
    }

    // Debug logging
    console.log('=== Unstake Fee Calculation ===');
    console.log('To Currency:', toCurrencyStr);
    console.log('  - Remaining (liability/reserve):', toRemaining.toString(), 'units');
    console.log('  - Amount out (before fee):', amountOutBeforeFeeUnits.toString(), 'units');
    console.log('  - Total staked:', toTotalStaked.toString(), 'units');
    console.log('  - Withdrawal %:', withdrawalPctBps, 'bps (' + (withdrawalPctBps / 100).toFixed(2) + '%)');
    console.log('  - Pool utilization:', poolUtilizationBps, 'bps (' + (poolUtilizationBps / 100).toFixed(2) + '%)');
    console.log('===================================');

    // Compute unstake fee using compute_depth_fee_bps logic
    // Base fee: 0.3% = 30 bps (default for unstake)
    let feeBps: number;
    const baseFeeBps = 30; // 0.3% default for unstake

    const poolUtilizationBpsNum = Number(poolUtilizationBps);
    const withdrawalPctBpsNum = Number(withdrawalPctBps);
    
    // If pool is >70% utilized OR withdrawal >30%, apply high fee
    if (poolUtilizationBpsNum > 7000 || withdrawalPctBpsNum > 3000) {
      // High fee: 40-50% depending on severity
      if (poolUtilizationBpsNum > 9000) {
        feeBps = 5000; // 50% fee if pool >90% utilized
      } else if (poolUtilizationBpsNum > 8000) {
        feeBps = 4500; // 45% fee if pool >80% utilized
      } else if (withdrawalPctBpsNum > 5000) {
        feeBps = 5000; // 50% fee if withdrawal >50%
      } else {
        feeBps = 4000; // 40% fee otherwise
      }
    } else {
      feeBps = baseFeeBps; // 30 bps (0.3%) when healthy
    }
    
    // Debug: Log fee calculation
    console.log('Unstake fee calculation:', {
      withdrawalPctBps,
      poolUtilizationBps,
      feeBps,
      tier: poolUtilizationBps > 7000 || withdrawalPctBps > 3000 ? 'high' : 'low'
    });

    // Calculate final amount out after fee
    // Use BigInt to avoid floating point rounding errors
    const feeMultiplier = BigInt(10_000 - feeBps);
    const amountOutAfterFeeUnits = (amountOutBeforeFee * feeMultiplier) / BigInt(10_000);
    const amountOutAfterFee = Number(amountOutAfterFeeUnits);

    // Calculate fee in USD terms
    const usdValueIn = Number((amountInUnits * BigInt(sbxPriceMu)) / BigInt(1_000_000));
    const usdValueOut = Number((BigInt(amountOutAfterFee) * BigInt(toPriceMu)) / BigInt(1_000_000));
    const feeUsd = usdValueIn - usdValueOut;

    // Determine tier for display (simplified: 1 = healthy, 2 = unhealthy)
    let tier: 1 | 2;
    if (poolUtilizationBps > 7000 || withdrawalPctBps > 3000) {
      tier = 2; // Unhealthy
    } else {
      tier = 1; // Healthy
    }

    return res.status(200).json({
      toCurrency: toCurrencyStr,
      amountIn: amountNum,
      amountOut: amountOutAfterFee / 1_000_000, // Convert back to human-readable
      rate: Number(adjustedRate) / 1_000_000,
      feeBps,
      feePercent: feeBps / 100,
      feeUsd,
      tier,
      withdrawalPctBps,
      poolUtilizationBps,
      // Return prices used for calculation so frontend can use exact same prices
      toPriceMu,   // Price in micro-USD (use this in transaction)
      // Metadata
      metadata: {
        baseRate: Number(baseRate) / 1_000_000,
        depthPenaltyBps,
        amountOutBeforeFee: Number(amountOutBeforeFee) / 1_000_000,
        amountOutAfterFee: amountOutAfterFee / 1_000_000,
        toLiabilityPre: toLiabilityPre.toString(),
        toLiabilityPost: toLiabilityPost.toString(),
      },
    });
  } catch (error: any) {
    console.error('Unstake rate calculation error:', {
      error: error.message,
      stack: error.stack,
      query: req.query,
    });
    return res.status(500).json({
      error: 'Failed to calculate unstake rate',
      message: error.message || 'Unknown error occurred',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}

