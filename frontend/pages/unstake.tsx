import { useState, useEffect } from "react";
import CurrencyModal from "@/components/CurrencyModal";
import AppLayout from "@/components/AppLayout";
import FAQ from "@/components/FAQ";
import { useCurrentAccount, ConnectModal } from "@iota/dapp-kit";

type Currency = "USDC" | "CHFX" | "TRYB" | "SEKX";

export default function UnstakePage() {
  const [toCurrency, setToCurrency] = useState<Currency>("USDC");
  const [fromAmount, setFromAmount] = useState<string>("0");
  const [toAmount, setToAmount] = useState<string>("0");
  const [isToCurrencyModalOpen, setIsToCurrencyModalOpen] = useState(false);
  
  const currentAccount = useCurrentAccount();
  const isWalletConnected = !!currentAccount;
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  useEffect(() => {
    const amount = parseFloat(fromAmount) || 0;
    // Simple 1:1 conversion for now - can be updated with actual unstake rates
    setToAmount(amount === 0 ? "0" : amount.toFixed(6));
  }, [fromAmount, toCurrency]);

  const handleConnectWallet = () => {
    setIsConnectModalOpen(true);
  };

  const handleUnstake = () => {
    console.log("Unstaking", fromAmount, "SBX", "to", toCurrency);
  };

  return (
    <AppLayout activeTab="unstake">
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
            Unstake currencies
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
              <div className="px-4 py-2.5 rounded-full bg-white/10 text-white font-medium text-sm border border-white/15 backdrop-blur-xl ring-1 ring-inset ring-white/10 flex items-center gap-2 flex-shrink-0">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-white/60 to-white/20 ring-1 ring-inset ring-white/40 flex-shrink-0" />
                <span>SBX</span>
              </div>
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

          {/* Connect Wallet / Unstake Button */}
          <button
            onClick={isWalletConnected ? handleUnstake : handleConnectWallet}
            className="w-full py-4 rounded-xl font-semibold text-black text-base transition-all bg-gradient-to-r from-zinc-200/80 to-white/70 hover:to-white ring-1 ring-inset ring-white/30 shadow-[0_4px_20px_rgba(255,255,255,0.12)] active:scale-[0.99]"
          >
            {isWalletConnected ? "Unstake" : "Connect Wallet"}
          </button>
        </div>
      </div>

      {/* FAQ Section */}
      <FAQ
        items={[
          {
            question: "What are asymmetric withdrawal rules?",
            answer: "Different rules for different depositors: If you deposited regional coins (CHFX, TRYB, SEKX), you can withdraw any regional coin OR USDC. If you deposited USDC, you can only withdraw regional coins, not USDC. This keeps the pool balanced."
          },
          {
            question: "Can I withdraw USDC?",
            answer: "Only if you originally deposited regional stablecoins. If you deposited USDC, you cannot withdraw USDC—only regional coins. This prevents circular staking and maintains pool balance."
          },
          {
            question: "What fees apply to withdrawals?",
            answer: "Fees depend on pool depth: healthy pools (≥80%) pay low fees (~0.07%), medium pools (30-80%) pay moderate fees (0.07-0.32%), and low pools (<30%) pay high fees (up to 14%+) to protect liquidity."
          },
          {
            question: "How do I unlock my liquidity?",
            answer: "Unstake your SBX tokens to get your funds back. You'll receive the USD value in your chosen currency (following withdrawal rules). The amount depends on current pool depth and fees."
          },
          {
            question: "Why can't USDC depositors withdraw USDC?",
            answer: "This prevents people from staking USDC, earning yield, then immediately withdrawing USDC. USDC depositors get higher APY as compensation, while regional depositors get the benefit of USDC withdrawal."
          }
        ]}
      />

      {/* Currency Selection Modal */}
      <CurrencyModal
        isOpen={isToCurrencyModalOpen}
        onClose={() => setIsToCurrencyModalOpen(false)}
        selectedCurrency={toCurrency}
        onSelect={(currency) => {
          setToCurrency(currency);
          setIsToCurrencyModalOpen(false);
        }}
      />

      {/* Wallet Connection Modal */}
      <ConnectModal
        trigger={<button style={{ display: 'none' }} />}
        open={isConnectModalOpen}
        onOpenChange={setIsConnectModalOpen}
      />
    </AppLayout>
  );
}

