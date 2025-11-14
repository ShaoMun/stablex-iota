import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { defineChain } from 'viem';

// IOTA EVM Testnet chain definition
export const iotaEvmTestnet = defineChain({
  id: 1076,
  name: 'IOTA EVM Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'IOTA',
    symbol: 'IOTA',
  },
  rpcUrls: {
    default: {
      http: ['https://json-rpc.evm.testnet.iota.cafe'],
    },
  },
  blockExplorers: {
    default: {
      name: 'IOTA EVM Explorer',
          url: 'https://explorer.evm.testnet.iotaledger.net',
    },
  },
  testnet: true,
});

export const wagmiConfig = getDefaultConfig({
  appName: 'StableX',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'default-project-id',
  chains: [iotaEvmTestnet],
  ssr: true,
});

