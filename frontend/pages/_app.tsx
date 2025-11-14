import "@/styles/globals.css";
import "@iota/dapp-kit/dist/index.css";
import "@rainbow-me/rainbowkit/styles.css";
import type { AppProps } from "next/app";
import { Inter, Do_Hyeon, Montserrat, Great_Vibes } from "next/font/google";
import { createNetworkConfig, IotaClientProvider, WalletProvider } from "@iota/dapp-kit";
import { getFullnodeUrl } from "@iota/iota-sdk/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { wagmiConfig } from "@/lib/wagmiConfig";
import ErrorBoundary from "@/components/ErrorBoundary";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const doHyeon = Do_Hyeon({
  subsets: ["latin"],
  variable: "--font-dohyeon",
  display: "swap",
  weight: "400",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
  weight: ["400", "600", "700"],
});

const greatVibes = Great_Vibes({
  subsets: ["latin"],
  variable: "--font-great-vibes",
  display: "swap",
  weight: "400",
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
      mutations: {
        onError: (error: any) => {
          // Suppress user rejection errors at the React Query level
          const errorMessage = error?.message?.toLowerCase() || String(error || '').toLowerCase();
          const isUserRejection = errorMessage.includes('rejected') || 
                                 errorMessage.includes('user') ||
                                 errorMessage.includes('denied') ||
                                 errorMessage.includes('cancelled') ||
                                 errorMessage.includes('cancel');
          
          if (isUserRejection) {
            console.log('User rejected transaction - suppressed at React Query level');
            // Don't throw - just log
            return;
          }
        },
      },
    },
  }));

  // Add global error handlers to suppress user rejection errors
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Handle unhandled promise rejections
      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        const error = event.reason;
        const errorMessage = error?.message?.toLowerCase() || String(error || '').toLowerCase();
        
        // Check if it's a user rejection
        const isUserRejection = errorMessage.includes('rejected') || 
                               errorMessage.includes('user') ||
                               errorMessage.includes('denied') ||
                               errorMessage.includes('cancelled') ||
                               errorMessage.includes('cancel');
        
        if (isUserRejection) {
          // Prevent the error from showing in console and React error boundary
          event.preventDefault();
          console.log('User rejected transaction - error suppressed');
          return;
        }
      };

      // Handle general errors
      const handleError = (event: ErrorEvent) => {
        const errorMessage = event.message?.toLowerCase() || '';
        const isUserRejection = errorMessage.includes('rejected') || 
                               errorMessage.includes('user') ||
                               errorMessage.includes('denied') ||
                               errorMessage.includes('cancelled') ||
                               errorMessage.includes('cancel');
        
        if (isUserRejection) {
          event.preventDefault();
          console.log('User rejected transaction - error suppressed');
          return;
        }
      };

      window.addEventListener('unhandledrejection', handleUnhandledRejection);
      window.addEventListener('error', handleError);

      return () => {
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        window.removeEventListener('error', handleError);
      };
    }
  }, []);

  return (
    <ErrorBoundary>
      <div className={`${inter.variable} ${doHyeon.variable} ${montserrat.variable} ${greatVibes.variable}`}>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider>
              <IotaClientProvider networks={networkConfig} defaultNetwork="testnet">
                <WalletProvider 
                  storageKey="iota-wallet-connection"
                  autoConnect
                >
                  <Component {...pageProps} />
                </WalletProvider>
              </IotaClientProvider>
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </div>
    </ErrorBoundary>
  );
}
