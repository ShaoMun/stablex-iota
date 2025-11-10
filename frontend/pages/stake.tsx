import { useState, useEffect } from "react";
import CurrencyModal from "@/components/CurrencyModal";
import AppLayout from "@/components/AppLayout";
import FAQ from "@/components/FAQ";

type Currency = "USDC" | "CHFX" | "TRYB" | "SEKX";

export default function StakePage() {
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("USDC");
  const [stakeAmount, setStakeAmount] = useState<string>("0");
  const [sbxAmount, setSbxAmount] = useState<string>("0");
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [apy] = useState<number>(7.02);
  const [estimatedRewards, setEstimatedRewards] = useState<number>(0);
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);

  useEffect(() => {
    const amount = parseFloat(stakeAmount) || 0;
    if (amount === 0) {
      setSbxAmount("0");
    } else if (selectedCurrency === "USDC") {
      setSbxAmount(amount.toFixed(6));
    } else {
      setSbxAmount((amount * 0.725949575).toFixed(6));
    }
  }, [stakeAmount, selectedCurrency]);

  useEffect(() => {
    const amount = parseFloat(stakeAmount) || 0;
    const yearlyReward = (amount * apy) / 100;
    setEstimatedRewards(yearlyReward);
  }, [stakeAmount, apy]);

  const handleConnectWallet = () => {
    setIsWalletConnected(true);
  };

  const handleStake = () => {
    console.log("Staking", stakeAmount, selectedCurrency);
  };

  const handleCurrencySelect = (currency: Currency) => {
    setSelectedCurrency(currency);
    setIsCurrencyModalOpen(false);
  };

  return (
    <AppLayout activeTab="stake">
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
              Liquid stake your {selectedCurrency}
            </h2>

            {/* APY and Rewards */}
            <div className="flex items-start justify-between gap-6 mb-8 pb-6 border-b border-white/10">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400 text-sm">SBX APY</span>
                  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-white/60 to-white/20 ring-1 ring-inset ring-white/40" />
                  <button className="text-zinc-500 hover:text-zinc-300 transition-colors p-0.5">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm1 12H7V7h2v5zm0-6H7V4h2v2z" />
                    </svg>
                  </button>
                </div>
                <span className="text-white font-semibold text-2xl">{apy}%</span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400 text-sm">Est. rewards per year</span>
                  <button className="text-zinc-500 hover:text-zinc-300 transition-colors p-0.5">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm1 12H7V7h2v5zm0-6H7V4h2v2z" />
                    </svg>
                  </button>
                  <button className="text-zinc-500 hover:text-zinc-300 transition-colors p-0.5">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 4L4 8h8L8 4zm0 4L4 12h8L8 8z" />
                    </svg>
                  </button>
                </div>
                <span className="text-white font-semibold text-2xl">
                  {estimatedRewards === 0 ? "0" : estimatedRewards.toFixed(6)} {selectedCurrency}
                </span>
              </div>
            </div>

            {/* You're staking Container */}
            <div className="bg-white/3 rounded-2xl border border-white/10 ring-1 ring-white/10 backdrop-blur-xl p-6 mb-4">
              <label className="text-zinc-400 text-[11px] font-medium mb-3 block uppercase tracking-wider">
                You're staking
              </label>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <input
                    type="number"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    onFocus={(e) => {
                      if (e.target.value === "0") {
                        setStakeAmount("");
                      }
                    }}
                    placeholder="0"
                    className={`w-full bg-transparent text-[34px] sm:text-[36px] font-semibold outline-none placeholder:text-zinc-600 leading-none ${
                      parseFloat(stakeAmount) === 0 || stakeAmount === "" || stakeAmount === "0" ? "text-zinc-500" : "text-white"
                    }`}
                  />
                  <p className="text-zinc-500 text-sm mt-2">${(parseFloat(stakeAmount) || 0).toFixed(2)}</p>
                </div>
                <button
                  onClick={() => setIsCurrencyModalOpen(true)}
                  className="px-4 py-2.5 rounded-full bg-white/10 text-white font-medium text-sm border border-white/15 hover:bg-white/15 transition-all flex items-center gap-2 flex-shrink-0 backdrop-blur-xl ring-1 ring-inset ring-white/10"
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-white/60 to-white/20 ring-1 ring-inset ring-white/40 flex-shrink-0" />
                  <span>{selectedCurrency}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
              </div>
            </div>

            {/* To receive Container */}
            <div className="bg-white/3 rounded-2xl border border-white/10 ring-1 ring-white/10 backdrop-blur-xl p-6 mb-5">
              <label className="text-zinc-400 text-[11px] font-medium mb-3 block uppercase tracking-wider">
                To receive
              </label>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={sbxAmount}
                    readOnly
                    className={`w-full bg-transparent text-[34px] sm:text-[36px] font-semibold outline-none leading-none ${
                      parseFloat(sbxAmount) === 0 || sbxAmount === "" || sbxAmount === "0" ? "text-zinc-500" : "text-white"
                    }`}
                  />
                  <p className="text-zinc-500 text-sm mt-2">${(parseFloat(sbxAmount) || 0).toFixed(2)}</p>
                </div>
                <div className="px-4 py-2.5 rounded-full bg-white/10 text-white font-medium text-sm border border-white/15 backdrop-blur-xl ring-1 ring-inset ring-white/10 flex items-center gap-2 flex-shrink-0">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-white/60 to-white/20 ring-1 ring-inset ring-white/40 flex-shrink-0" />
                  <span>SBX</span>
                </div>
              </div>
            </div>

            {/* Connect Wallet / Stake Button */}
            <button
              onClick={isWalletConnected ? handleStake : handleConnectWallet}
              className="w-full py-4 rounded-xl font-semibold text-black text-base transition-all bg-gradient-to-r from-zinc-200/80 to-white/70 hover:to-white ring-1 ring-inset ring-white/30 shadow-[0_4px_20px_rgba(255,255,255,0.12)] active:scale-[0.99]"
            >
              {isWalletConnected ? "Stake" : "Connect Wallet"}
            </button>
          </div>
        </div>

      {/* FAQ Section */}
      <FAQ
        items={[
          {
            question: "What is unified APY?",
            answer: "All depositors earn the same APY, which is higher than staking USDC alone. This unified APY comes from swap fees and market making returns, shared by everyone in the pool."
          },
          {
            question: "What is SBX token?",
            answer: "SBX is your staking receipt. 1 SBX = 1 USD. When you stake, you get SBX tokens representing your share. Your SBX amount grows automatically as you earn yield."
          },
          {
            question: "Can I deposit any stablecoin?",
            answer: "Yes! Deposit USDC, CHFX, TRYB, or SEKX. All go into the same pool and earn the same APY. Your deposit converts to SBX tokens at 1:1 USD value."
          },
          {
            question: "How does the unified yield work?",
            answer: "Yield comes from two sources: swap fees and market making. Everyone shares this yield equally, so you get higher returns than staking USDC by itself."
          },
          {
            question: "What happens when I stake?",
            answer: "Your stablecoins go into the unified pool. You receive SBX tokens equal to your deposit's USD value. Your SBX balance grows over time as you earn yield."
          }
        ]}
      />

      {/* Currency Selection Modal */}
      <CurrencyModal
        isOpen={isCurrencyModalOpen}
        onClose={() => setIsCurrencyModalOpen(false)}
        selectedCurrency={selectedCurrency}
        onSelect={handleCurrencySelect}
      />
    </AppLayout>
  );
}
