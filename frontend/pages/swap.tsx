import { useState, useEffect } from "react";
import CurrencyModal from "@/components/CurrencyModal";
import AppLayout from "@/components/AppLayout";
import FAQ from "@/components/FAQ";

type Currency = "USDC" | "CHFX" | "TRYB" | "SEKX";

export default function SwapPage() {
  const [fromCurrency, setFromCurrency] = useState<Currency>("USDC");
  const [toCurrency, setToCurrency] = useState<Currency>("CHFX");
  const [fromAmount, setFromAmount] = useState<string>("0");
  const [toAmount, setToAmount] = useState<string>("0");
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [isFromCurrencyModalOpen, setIsFromCurrencyModalOpen] = useState(false);
  const [isToCurrencyModalOpen, setIsToCurrencyModalOpen] = useState(false);

  useEffect(() => {
    const amount = parseFloat(fromAmount) || 0;
    // Simple 1:1 conversion for now - can be updated with actual swap rates
    setToAmount(amount === 0 ? "0" : amount.toFixed(6));
  }, [fromAmount, fromCurrency, toCurrency]);

  const handleConnectWallet = () => {
    setIsWalletConnected(true);
  };

  const handleSwap = () => {
    console.log("Swapping", fromAmount, fromCurrency, "to", toCurrency);
  };

  return (
    <AppLayout activeTab="swap">
      {/* Main Glass Card */}
        <div 
          className="relative rounded-3xl backdrop-blur-xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(200, 200, 200, 0.1) 50%, rgba(255, 255, 255, 0.15) 100%), rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            boxShadow: `
              0 8px 30px rgba(0, 0, 0, 0.4),
              inset 0 1px 0 rgba(255, 255, 255, 0.3),
              inset 0 -1px 0 rgba(0, 0, 0, 0.2),
              inset 1px 0 0 rgba(255, 255, 255, 0.2),
              inset -1px 0 0 rgba(255, 255, 255, 0.2)
            `,
          }}
        >
          {/* Reflection highlight */}
          <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-36 w-[85%] bg-gradient-to-b from-white/15 to-transparent rounded-[32px] blur-2xl" />

          <div className="p-8">
            {/* Title */}
            <h2 className="text-[22px] sm:text-2xl font-semibold text-white mb-7 leading-tight">
              Swap currencies
            </h2>

            {/* From Container */}
            <div className="bg-white/3 rounded-2xl border border-white/10 ring-1 ring-white/10 backdrop-blur-xl p-6 mb-4">
              <label className="text-zinc-400 text-[11px] font-medium mb-3 block uppercase tracking-wider">
                From
              </label>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <input
                    type="number"
                    value={fromAmount}
                    onChange={(e) => setFromAmount(e.target.value)}
                    onFocus={(e) => {
                      if (e.target.value === "0") {
                        setFromAmount("");
                      }
                    }}
                    placeholder="0"
                    className={`w-full bg-transparent text-[34px] sm:text-[36px] font-semibold outline-none placeholder:text-zinc-600 leading-none ${
                      parseFloat(fromAmount) === 0 || fromAmount === "" || fromAmount === "0" ? "text-zinc-500" : "text-white"
                    }`}
                  />
                  <p className="text-zinc-500 text-sm mt-2">${(parseFloat(fromAmount) || 0).toFixed(2)}</p>
                </div>
                <button
                  onClick={() => setIsFromCurrencyModalOpen(true)}
                  className="px-4 py-2.5 rounded-full bg-white/10 text-white font-medium text-sm border border-white/15 hover:bg-white/15 transition-all flex items-center gap-2 flex-shrink-0 backdrop-blur-xl ring-1 ring-inset ring-white/10"
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-white/60 to-white/20 ring-1 ring-inset ring-white/40 flex-shrink-0" />
                  <span>{fromCurrency}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
              </div>
            </div>

            {/* To Container */}
            <div className="bg-white/3 rounded-2xl border border-white/10 ring-1 ring-white/10 backdrop-blur-xl p-6 mb-5">
              <label className="text-zinc-400 text-[11px] font-medium mb-3 block uppercase tracking-wider">
                To
              </label>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={toAmount}
                    readOnly
                    className={`w-full bg-transparent text-[34px] sm:text-[36px] font-semibold outline-none leading-none ${
                      parseFloat(toAmount) === 0 || toAmount === "" || toAmount === "0" ? "text-zinc-500" : "text-white"
                    }`}
                  />
                  <p className="text-zinc-500 text-sm mt-2">${(parseFloat(toAmount) || 0).toFixed(2)}</p>
                </div>
                <button
                  onClick={() => setIsToCurrencyModalOpen(true)}
                  className="px-4 py-2.5 rounded-full bg-white/10 text-white font-medium text-sm border border-white/15 hover:bg-white/15 transition-all flex items-center gap-2 flex-shrink-0 backdrop-blur-xl ring-1 ring-inset ring-white/10"
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-white/60 to-white/20 ring-1 ring-inset ring-white/40 flex-shrink-0" />
                  <span>{toCurrency}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Connect Wallet / Swap Button */}
            <button
              onClick={isWalletConnected ? handleSwap : handleConnectWallet}
              className="w-full py-4 rounded-xl font-semibold text-black text-base transition-all bg-gradient-to-r from-zinc-200/80 to-white/70 hover:to-white ring-1 ring-inset ring-white/30 shadow-[0_4px_20px_rgba(255,255,255,0.12)] active:scale-[0.99]"
            >
              {isWalletConnected ? "Swap" : "Connect Wallet"}
            </button>
          </div>
        </div>

      {/* FAQ Section */}
      <FAQ
        items={[
          {
            question: "How do direct swaps work?",
            answer: "Swap one stablecoin for another directly (e.g., CHFX to TRYB) without converting to USD first. The rate is based on current prices, and one fee applies based on how much liquidity is available."
          },
          {
            question: "Why no USD intermediate?",
            answer: "Skipping USD saves fees and time. All currencies are in one pool, so you can swap directly between any two stablecoins instantly."
          },
          {
            question: "What are the swap fees?",
            answer: "Fees depend on pool depth: healthy pools (≥80%) pay low fees (~0.07%), medium pools (30-80%) pay moderate fees (0.07-0.32%), and low pools (<30%) pay high fees (up to 14%+) to protect liquidity."
          },
          {
            question: "Can I swap between any currencies?",
            answer: "Yes! Swap directly between CHFX, TRYB, and SEKX. Rates use real-time prices from our API, so you get accurate exchange rates instantly."
          },
          {
            question: "How are prices determined?",
            answer: "Prices come from external APIs and are passed to the swap. This keeps gas costs low and transactions fast compared to checking prices on-chain."
          }
        ]}
      />

      {/* Currency Selection Modals */}
      <CurrencyModal
        isOpen={isFromCurrencyModalOpen}
        onClose={() => setIsFromCurrencyModalOpen(false)}
        selectedCurrency={fromCurrency}
        onSelect={(currency) => {
          setFromCurrency(currency);
          setIsFromCurrencyModalOpen(false);
        }}
      />
      <CurrencyModal
        isOpen={isToCurrencyModalOpen}
        onClose={() => setIsToCurrencyModalOpen(false)}
        selectedCurrency={toCurrency}
        onSelect={(currency) => {
          setToCurrency(currency);
          setIsToCurrencyModalOpen(false);
        }}
      />
    </AppLayout>
  );
}

