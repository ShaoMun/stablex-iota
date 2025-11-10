import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import FAQ from "@/components/FAQ";

export default function MigratePage() {
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "deactivating">("active");

  const handleConnectWallet = () => {
    setIsWalletConnected(true);
  };

  const handleMigrate = () => {
    console.log("Migrate to LST");
  };

  const handleUnstake = () => {
    console.log("Unstake Instantly");
  };

  return (
    <AppLayout activeTab="migrate">
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
            Migrate stake accounts to LSTs
          </h2>

          {/* Status Filters */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                statusFilter === "active"
                  ? "bg-white/20 text-white border border-white/30"
                  : "bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10 hover:text-white"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter("deactivating")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                statusFilter === "deactivating"
                  ? "bg-white/20 text-white border border-white/30"
                  : "bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10 hover:text-white"
              }`}
            >
              Deactivating
            </button>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search account or validator"
                className="w-full px-4 py-3 pl-10 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Content Area */}
          {!isWalletConnected ? (
            <div className="bg-white/3 rounded-2xl border border-white/10 ring-1 ring-white/10 backdrop-blur-xl p-8 mb-6">
              <div className="text-center">
                <p className="text-zinc-400 text-sm mb-6">
                  Connect your wallet to view your stake accounts
                </p>
                <button
                  onClick={handleConnectWallet}
                  className="px-6 py-3 rounded-xl font-semibold text-black text-base transition-all bg-gradient-to-r from-zinc-200/80 to-white/70 hover:to-white ring-1 ring-inset ring-white/30 shadow-[0_4px_20px_rgba(255,255,255,0.12)] active:scale-[0.99]"
                >
                  Connect Wallet
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white/3 rounded-2xl border border-white/10 ring-1 ring-white/10 backdrop-blur-xl p-6 mb-6">
              <div className="text-center py-8">
                <p className="text-zinc-400 text-sm mb-4">
                  No stake accounts found
                </p>
                <p className="text-zinc-500 text-xs">
                  {searchQuery ? "Try a different search term" : "Stake accounts will appear here"}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            {statusFilter === "deactivating" ? (
              <button
                onClick={isWalletConnected ? handleUnstake : undefined}
                disabled={!isWalletConnected}
                className="w-full py-4 rounded-xl font-semibold text-black text-base transition-all bg-gradient-to-r from-zinc-200/80 to-white/70 hover:to-white ring-1 ring-inset ring-white/30 shadow-[0_4px_20px_rgba(255,255,255,0.12)] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:to-white/70"
              >
                Unstake Instantly
              </button>
            ) : (
              <>
                <button
                  onClick={isWalletConnected ? handleMigrate : undefined}
                  disabled={!isWalletConnected}
                  className="w-full py-4 rounded-xl font-semibold text-black text-base transition-all bg-gradient-to-r from-zinc-200/80 to-white/70 hover:to-white ring-1 ring-inset ring-white/30 shadow-[0_4px_20px_rgba(255,255,255,0.12)] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:to-white/70"
                >
                  Migrate to LST
                </button>
                <button
                  onClick={isWalletConnected ? handleUnstake : undefined}
                  disabled={!isWalletConnected}
                  className="w-full py-4 rounded-xl font-semibold text-white text-base transition-all bg-white/10 hover:bg-white/15 border border-white/20 ring-1 ring-inset ring-white/10 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/10"
                >
                  Unstake Instantly
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <FAQ
        items={[
          {
            question: "What is account migration?",
            answer: "Move your staking from one account to another. All your staked amounts (USDC, CHFX, TRYB, SEKX) transfer together to the new account."
          },
          {
            question: "Why would I migrate my staking status?",
            answer: "Useful if you want to combine multiple accounts, move to a new wallet, or reorganize your staking. After migration, the new account can unstake using their SBX tokens."
          },
          {
            question: "How does migration work?",
            answer: "Only you (the account owner) can start migration. The destination account must already exist. All your staked amounts move together in one transaction."
          },
          {
            question: "What happens after migration?",
            answer: "The new account gets all your staking status and can unstake using SBX tokens. Your old account's staking is cleared after migration completes."
          },
          {
            question: "Can I migrate partial amounts?",
            answer: "No, you must migrate everything at once. All staked amounts (USDC, CHFX, TRYB, SEKX) transfer together in a single operation."
          }
        ]}
      />
    </AppLayout>
  );
}

