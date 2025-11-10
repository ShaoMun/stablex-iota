import type { NextApiRequest, NextApiResponse } from 'next';

// Pyth price feed IDs for currency pairs
const PYTH_CURRENCY_FEEDS: Record<string, string> = {
  'USD-CHF': '0x0b1e3297e69f162877b577b0d6a47a0d63b2392bc8499e6540da4187a63e28f8', // Swiss Franc
  'USD-TRY': '0x032a2eba1c2635bf973e95fb62b2c0705c1be2603b9572cc8d5edeaf8744e058', // Turkish Lira
  'USD-SEK': '0x8ccb376aa871517e807358d4e3cf0bc7fe4950474dbe6c9ffc21ef64e43fc676', // Swedish Krona
  'USDC-USD': '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a', // USDC/USD
  'USD-SGD': '0x396a969a9c1480fa15ed50bc59149e2c0075a72fe8f458ed941ddec48bdb4918',
  'USD-MYR': '0x6049eac22964b1ac2119e54c98f3caa165817d84273a121ee122fafb664a8094',
  'USD-JPY': '0xef2c98c804ba503c6a707e38be4dfbb16683775f195b091252bf24693042fd52',
};

// Fallback prices (update with current rates)
const FALLBACK_PRICES: Record<string, number> = {
  'USDC-USD': 1.00, // USDC should always be ~1.00 USD
  'USD-CHF': 0.92, // Approximate
  'USD-TRY': 0.03, // Approximate
  'USD-SEK': 0.095, // Approximate
  'USD-MYR': 4.47,
};

const HERMES_URL = 'https://hermes.pyth.network';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pair } = req.query;

    if (!pair) {
      return res.status(400).json({ error: 'Missing pair parameter' });
    }

    // Normalize pair format (accept both USD/SGD and USD-SGD)
    const pairStr = Array.isArray(pair) ? pair[0] : pair;
    const normalizedPair = pairStr.toUpperCase().replace('/', '-');
    const priceId = PYTH_CURRENCY_FEEDS[normalizedPair];

    if (!priceId) {
      return res.status(400).json({
        error: `No price data for ${normalizedPair}`,
        availablePairs: Object.keys(PYTH_CURRENCY_FEEDS),
      });
    }

    // Fetch from Pyth Hermes
    const response = await fetch(
      `${HERMES_URL}/v2/updates/price/latest?ids[]=${priceId}`
    );

    if (!response.ok) {
      throw new Error(`Hermes API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.parsed || data.parsed.length === 0) {
      throw new Error('No price data returned');
    }

    const priceData = data.parsed[0];

    // Convert Pyth price format
    // Pyth prices have expo (e.g., -8 means divide by 10^8)
    const price = parseFloat(priceData.price.price) * Math.pow(10, priceData.price.expo);
    const confidence = parseFloat(priceData.price.conf) * Math.pow(10, priceData.price.expo);

    // If price is 0 or publish_time is 0, the feed is not actively publishing
    // Use fallback price if available
    if (price === 0 || priceData.price.publish_time === 0) {
      const fallbackPrice = FALLBACK_PRICES[normalizedPair];
      if (fallbackPrice) {
        console.log(`Pyth feed not publishing for ${normalizedPair}, using fallback: $${fallbackPrice}`);
        return res.status(200).json({
          pair: normalizedPair,
          price: fallbackPrice,
          confidence: 0.01,
          source: 'fallback',
          timestamp: Math.floor(Date.now() / 1000),
          note: `${normalizedPair} feed not actively publishing on Pyth, using fallback price`,
        });
      }
      return res.status(503).json({
        error: `Price feed for ${normalizedPair} is not actively publishing`,
        pair: normalizedPair,
        note: 'The feed exists but is not providing live data',
      });
    }

    return res.status(200).json({
      pair: normalizedPair,
      price,
      confidence,
      expo: priceData.price.expo,
      publishTime: priceData.price.publish_time,
      source: 'pyth',
      priceId,
    });
  } catch (error: any) {
    console.error('Pyth currency price fetch error:', error);
    return res.status(500).json({
      error: 'Failed to fetch currency price',
      message: error.message,
    });
  }
}

