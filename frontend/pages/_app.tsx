import "@/styles/globals.css";
import "@iota/dapp-kit/dist/index.css";
import type { AppProps } from "next/app";
import { Inter } from "next/font/google";
import { createNetworkConfig, IotaClientProvider, WalletProvider } from "@iota/dapp-kit";
import { getFullnodeUrl } from "@iota/iota-sdk/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const { networkConfig } = createNetworkConfig({
  testnet: { url: getFullnodeUrl("testnet") },
});

export default function App({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  }));

  return (
    <div className={inter.variable}>
      <QueryClientProvider client={queryClient}>
        <IotaClientProvider networks={networkConfig} defaultNetwork="testnet">
          <WalletProvider 
            storageKey="iota-wallet-connection"
            autoConnect
          >
            <Component {...pageProps} />
          </WalletProvider>
        </IotaClientProvider>
      </QueryClientProvider>
    </div>
  );
}
