/**
 * Helper functions to add tokens to MetaMask
 */

// Token contract addresses on IOTA EVM Testnet
export const TOKEN_ADDRESSES = {
  CHFX: "0x956Cc9A9a71347b0d392D49DAdD49b4dC74b21bE",
  TRYB: "0x00f791a9E86f58Af72179b432b060FD1C40b8268",
  SEKX: "0x00fec4B374a0B74B4718AfefD41dB07469d85A71",
  USDC: "0x34E1C1F3CFAa76C058eB6B7e77b0F81e1E6aB61f",
  wSBX: "0xf8bA1417dA2f8746364E3A325B457374Da531D9e",
};

export const TOKEN_SYMBOLS: Record<string, string> = {
  CHFX: "CHFX",
  TRYB: "TRYB",
  SEKX: "SEKX",
  USDC: "USDC",
  wSBX: "wSBX",
};

export const TOKEN_DECIMALS = 6;

/**
 * Add a token to MetaMask
 */
export async function addTokenToMetaMask(
  tokenAddress: string,
  tokenSymbol: string,
  tokenDecimals: number = 6,
  tokenImage?: string
): Promise<boolean> {
  if (typeof window === "undefined" || !window.ethereum) {
    alert("MetaMask is not installed");
    return false;
  }

  try {
    const wasAdded = await window.ethereum.request({
      method: "wallet_watchAsset",
      params: [
        {
          type: "ERC20",
          options: {
            address: tokenAddress,
            symbol: tokenSymbol,
            decimals: tokenDecimals,
            image: tokenImage,
          },
        },
      ],
    });

    if (wasAdded) {
      console.log(`Token ${tokenSymbol} added to MetaMask`);
      return true;
    } else {
      console.log(`Token ${tokenSymbol} was not added`);
      return false;
    }
  } catch (error) {
    console.error("Error adding token to MetaMask:", error);
    return false;
  }
}

/**
 * Add all StableX tokens to MetaMask
 */
export async function addAllTokensToMetaMask(): Promise<void> {
  const tokens = [
    { symbol: "CHFX", address: TOKEN_ADDRESSES.CHFX },
    { symbol: "TRYB", address: TOKEN_ADDRESSES.TRYB },
    { symbol: "SEKX", address: TOKEN_ADDRESSES.SEKX },
    { symbol: "USDC", address: TOKEN_ADDRESSES.USDC },
    { symbol: "wSBX", address: TOKEN_ADDRESSES.wSBX },
  ];

  for (const token of tokens) {
    await addTokenToMetaMask(token.address, token.symbol, TOKEN_DECIMALS);
    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}


