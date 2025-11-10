import { useState } from "react";
import { cn } from "@/lib/utils";

type Currency = "USDC" | "CHFX" | "TRYB" | "SEKX";

interface CurrencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCurrency: Currency;
  onSelect: (currency: Currency) => void;
}

const currencies: Currency[] = ["USDC", "CHFX", "TRYB", "SEKX"];

// Package addresses for Move/IOTA tokens (equivalent to contract addresses)
const currencyInfo: Record<Currency, { packageAddress: string }> = {
  USDC: {
    packageAddress: "0x71157d06f6ea5ac0d5f952881126591da1c0d5e3980e9ab9dbf1d08dff989846"
  },
  CHFX: {
    packageAddress: "0x71157d06f6ea5ac0d5f952881126591da1c0d5e3980e9ab9dbf1d08dff989846"
  },
  TRYB: {
    packageAddress: "0x71157d06f6ea5ac0d5f952881126591da1c0d5e3980e9ab9dbf1d08dff989846"
  },
  SEKX: {
    packageAddress: "0x71157d06f6ea5ac0d5f952881126591da1c0d5e3980e9ab9dbf1d08dff989846"
  }
};

const truncateAddress = (address: string, startChars: number = 6, endChars: number = 6) => {
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};

const getExplorerUrl = (packageAddress: string) => {
  // IOTA Testnet Explorer URL
  return `https://explorer.iota.org/object/${packageAddress}?network=testnet`;
};

export default function CurrencyModal({ isOpen, onClose, selectedCurrency, onSelect }: CurrencyModalProps) {
  const [searchQuery, setSearchQuery] = useState<string>("");

  if (!isOpen) return null;

  const filteredCurrencies = currencies.filter((currency) => {
    const query = searchQuery.toLowerCase();
    const currencyName = currency.toLowerCase();
    const packageAddress = currencyInfo[currency].packageAddress.toLowerCase();
    const truncatedAddress = truncateAddress(currencyInfo[currency].packageAddress).toLowerCase();
    
    return (
      currencyName.includes(query) ||
      packageAddress.includes(query) ||
      truncatedAddress.includes(query)
    );
  });

  const handleSelect = (currency: Currency) => {
    onSelect(currency);
    setSearchQuery("");
  };

  const handleClose = () => {
    onClose();
    setSearchQuery("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 ring-1 ring-white/20 shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Reflection highlight */}
        <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-32 w-[80%] bg-gradient-to-b from-white/20 to-transparent rounded-[32px] blur-2xl" />
        
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">Select Currency</h3>
            <button
              onClick={handleClose}
              className="text-zinc-400 hover:text-white transition-colors p-1"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search currency..."
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
          
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredCurrencies.length > 0 ? (
              filteredCurrencies.map((currency) => (
                <button
                  key={currency}
                  onClick={() => handleSelect(currency)}
                  className={cn(
                    "w-full flex flex-col gap-2 px-4 py-3.5 rounded-xl transition-all text-left",
                    selectedCurrency === currency
                      ? "bg-white/20 text-white border border-white/30"
                      : "bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white border border-white/10"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/60 to-white/20 ring-1 ring-inset ring-white/40 flex-shrink-0" />
                    <span className="font-medium">{currency}</span>
                    {selectedCurrency === currency && (
                      <svg
                        className="ml-auto w-5 h-5 text-white flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="flex items-center gap-2 pl-11">
                    <p className="text-xs text-zinc-400 font-mono">
                      {truncateAddress(currencyInfo[currency].packageAddress)}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(getExplorerUrl(currencyInfo[currency].packageAddress), '_blank', 'noopener,noreferrer');
                      }}
                      className="text-zinc-500 hover:text-white transition-colors p-1"
                      title="View in explorer"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </button>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center py-8 text-zinc-400">
                No currencies found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

