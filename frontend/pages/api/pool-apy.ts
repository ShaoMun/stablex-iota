import type { NextApiRequest, NextApiResponse } from 'next';

// Pool contract addresses
const POOL_PACKAGE_ID = '0x6ebf91f7fb200377491c41e9a81dbde911a93ff2f8ec7aaa0e3e21fe424c6514';
const POOL_MODULE = 'sbx_pool';

// Pool and Registry object IDs
const POOL_OBJECT_ID = process.env.POOL_OBJECT_ID || '0x1f88410b6a652e5f9a31061d7eaa7939b12b3811606070bc2743470f3846756d';
const REGISTRY_OBJECT_ID = process.env.REGISTRY_OBJECT_ID || '0x967a22966d19e27ced4aea39e5ef90442aa94473b41123445bcd697beae1b5d6';

// Currency price pairs for fetching prices
const currencyPricePairs: Record<string, string> = {
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
    // Initialize IOTA client
    const { IotaClient, getFullnodeUrl } = await import('@iota/iota-sdk/client');
    const client = new IotaClient({
      url: getFullnodeUrl('testnet'),
    });

    // Fetch currency prices
    const host = req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || (host?.includes('localhost') ? 'http' : 'https');
    const baseUrl = `${protocol}://${host}`;
    
    const pricePromises = ['CHFX', 'TRYB', 'SEKX'].map(async (curr) => {
      try {
        const pair = currencyPricePairs[curr];
        const priceRes = await fetch(`${baseUrl}/api/currency-price?pair=${pair}`);
        if (priceRes.ok) {
          const priceData = await priceRes.json();
          // Invert price for non-USDC currencies and convert to micro-USD
          return priceData.price > 0 ? Math.floor((1 / priceData.price) * 1_000_000) : 0;
        }
        return 0;
      } catch {
        return 0;
      }
    });

    const [chfxPriceMu, trybPriceMu, sekxPriceMu] = await Promise.all(pricePromises);

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
    const mmReservedUsdc = BigInt(poolContent.mm_reserved_usdc || 0);

    // Extract registry fields
    const registryContent = registryData.content?.fields || {};
    const feeAccumulatedMu = BigInt(registryContent.fee_usd_accumulated_mu || 0);
    const mmReturnUsdcBps = Number(registryContent.mm_return_usdc_bps || 0);
    const mmReturnChfxBps = Number(registryContent.mm_return_chfx_bps || 0);
    const mmReturnTrybBps = Number(registryContent.mm_return_tryb_bps || 0);
    const mmReturnSekxBps = Number(registryContent.mm_return_sekx_bps || 0);

    // Calculate current TVL in micro-USD
    const chfxMu = (chfxLiability * BigInt(chfxPriceMu)) / BigInt(1_000_000);
    const trybMu = (trybLiability * BigInt(trybPriceMu)) / BigInt(1_000_000);
    const sekxMu = (sekxLiability * BigInt(sekxPriceMu)) / BigInt(1_000_000);
    const regionalsSumMu = chfxMu + trybMu + sekxMu;
    const currentTvlMu = usdcReserve + regionalsSumMu;

    // For APY calculation, we need fees_7d_mu and avg_tvl_7d_mu
    // Since we don't have historical data, we'll use:
    // - fees_7d_mu: Use accumulated fees as a proxy (or estimate based on current fees)
    // - avg_tvl_7d_mu: Use current TVL as an estimate
    // 
    // For a more accurate calculation, we could:
    // 1. Use accumulated fees divided by days since deployment as daily average, then multiply by 7
    // 2. Use current TVL as avg_tvl_7d_mu (assuming stable TVL)
    //
    // For now, we'll use a simple approach:
    // - If we have accumulated fees, estimate 7d fees as accumulated fees (assuming they're recent)
    // - Use current TVL as avg_tvl_7d_mu
    
    // Estimate 7-day fees: use accumulated fees as a proxy
    // In production, you'd want to track historical data
    // For now, we'll estimate 7-day fees based on accumulated fees
    // If accumulated fees are very small, use a minimal estimate to avoid division by zero
    const fees7dMu = feeAccumulatedMu > 0 ? feeAccumulatedMu : BigInt(1);
    
    // Use current TVL as average TVL (assuming relatively stable)
    const avgTvl7dMu = currentTvlMu > 0 ? currentTvlMu : BigInt(1);

    // Calculate APY manually using the same logic as the contract
    // This matches the estimated_unified_apy_bps function in sbx_pool.move
    
    // Calculate balance ratio
    const balanceRatio = regionalsSumMu > 0 
      ? (usdcReserve * BigInt(10_000)) / regionalsSumMu
      : BigInt(10_000);

    // Calculate fee APY (in basis points)
    // fee_apy_bps = (fees_7d_mu * 52 * 10_000) / avg_tvl_7d_mu
    const feeApyBps = Number(
      (fees7dMu * BigInt(52) * BigInt(10_000)) / avgTvl7dMu
    );

    // Calculate MM APY (if balanced and has MM allocation)
    // Only if balance_ratio >= 10_000 (1.0) and mm_reserved_usdc > 0
    let mmApyBps = 0;
    if (balanceRatio >= BigInt(10_000) && mmReservedUsdc > 0) {
      const totalMu = usdcReserve + regionalsSumMu;
      if (totalMu > 0) {
        // Calculate weights for each currency
        const usdcWeight = Number((usdcReserve * BigInt(10_000)) / totalMu);
        const chfxWeight = Number((chfxMu * BigInt(10_000)) / totalMu);
        const trybWeight = Number((trybMu * BigInt(10_000)) / totalMu);
        const sekxWeight = Number((sekxMu * BigInt(10_000)) / totalMu);

        // Weighted average of MM returns
        const weightedMm = Math.floor(
          (usdcWeight * mmReturnUsdcBps +
           chfxWeight * mmReturnChfxBps +
           trybWeight * mmReturnTrybBps +
           sekxWeight * mmReturnSekxBps) / 10_000
        );
        mmApyBps = weightedMm;
      }
    }

    // Total APY = fee APY + MM APY (capped at 100% = 10_000 bps)
    const apyBps = Math.min(feeApyBps + mmApyBps, 10_000);

    // Convert from basis points to percentage
    const apyPercent = apyBps / 100;

    return res.status(200).json({
      apy: apyPercent,
      apyBps,
      fees7dMu: fees7dMu.toString(),
      avgTvl7dMu: avgTvl7dMu.toString(),
      currentTvlMu: currentTvlMu.toString(),
    });
  } catch (error: any) {
    console.error('Pool APY fetch error:', error);
    return res.status(500).json({
      error: 'Failed to fetch pool APY',
      message: error.message,
    });
  }
}

