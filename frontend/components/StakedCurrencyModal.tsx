import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useCurrentAccount, useIotaClient } from "@iota/dapp-kit";

type Currency = "USDC" | "CHFX" | "TRYB" | "SEKX";

interface StakedCurrencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCurrency: Currency | null;
  onSelect: (currency: Currency) => void;
}

const POOL_PACKAGE_ID = "0x1cf79de8cac02b52fa384df41e7712b5bfadeae2d097a818008780cf7d7783c6";
const POOL_OBJECT_ID = "0x8587158f53289362bb94530c6e174ae414e6eea32c9400cfc6da2704e80c5517";

const currencies: Currency[] = ["USDC", "CHFX", "TRYB", "SEKX"];

const currencyPricePairs: Record<Currency, string> = {
  USDC: 'USDC-USD',
  CHFX: 'USD-CHF',
  TRYB: 'USD-TRY',
  SEKX: 'USD-SEK',
};

export default function StakedCurrencyModal({ isOpen, onClose, selectedCurrency, onSelect }: StakedCurrencyModalProps) {
  const [stakedAmounts, setStakedAmounts] = useState<Record<Currency, string>>({
    USDC: "0",
    CHFX: "0",
    TRYB: "0",
    SEKX: "0",
  });
  const [loadingStaked, setLoadingStaked] = useState<Record<Currency, boolean>>({
    USDC: false,
    CHFX: false,
    TRYB: false,
    SEKX: false,
  });
  const [prices, setPrices] = useState<Record<Currency, number>>({
    USDC: 0,
    CHFX: 0,
    TRYB: 0,
    SEKX: 0,
  });
  const [loadingPrices, setLoadingPrices] = useState<Record<Currency, boolean>>({
    USDC: false,
    CHFX: false,
    TRYB: false,
    SEKX: false,
  });
  
  const currentAccount = useCurrentAccount();
  const client = useIotaClient();

  // Fetch staked amounts from Account object
  useEffect(() => {
    if (!isOpen || !currentAccount || !client) {
      if (!currentAccount) {
        setStakedAmounts({
          USDC: "0",
          CHFX: "0",
          TRYB: "0",
          SEKX: "0",
        });
      }
      return;
    }

    const fetchStakedAmounts = async () => {
      try {
        // Get user's Account object
        const accountObjects = await client.getOwnedObjects({
          owner: currentAccount.address,
          filter: { StructType: `${POOL_PACKAGE_ID}::sbx_pool::Account` },
          options: { showContent: true, showType: true },
        });

        if (!accountObjects.data || accountObjects.data.length === 0) {
          // No account found, set all to 0
          setStakedAmounts({
            USDC: "0",
            CHFX: "0",
            TRYB: "0",
            SEKX: "0",
          });
          currencies.forEach(currency => {
            setLoadingStaked(prev => ({ ...prev, [currency]: false }));
          });
          return;
        }

        const accountObject = accountObjects.data[0].data;
        if (!accountObject) {
          setStakedAmounts({
            USDC: "0",
            CHFX: "0",
            TRYB: "0",
            SEKX: "0",
          });
          currencies.forEach(currency => {
            setLoadingStaked(prev => ({ ...prev, [currency]: false }));
          });
          return;
        }

        // Extract staked amounts from account content
        const accountContent = (accountObject as any).content?.fields || {};
        
        for (const currency of currencies) {
          setLoadingStaked(prev => ({ ...prev, [currency]: true }));
          try {
            let stakedAmount = "0";
            
            if (currency === 'USDC') {
              // USDC is stored in micro-USD
              const stakedUsdcMu = accountContent.staked_usdc || 0;
              stakedAmount = (Number(stakedUsdcMu) / 1_000_000).toFixed(6);
            } else {
              // Regional currencies are stored in native units (6 decimals)
              const fieldName = `staked_${currency.toLowerCase()}`;
              const stakedUnits = accountContent[fieldName] || 0;
              stakedAmount = (Number(stakedUnits) / 1_000_000).toFixed(6);
            }
            
            setStakedAmounts(prev => ({ ...prev, [currency]: stakedAmount }));
          } catch (error) {
            console.error(`Error processing ${currency} staked amount:`, error);
            setStakedAmounts(prev => ({ ...prev, [currency]: "0" }));
          } finally {
            setLoadingStaked(prev => ({ ...prev, [currency]: false }));
          }
        }
      } catch (error) {
        console.error("Error fetching staked amounts:", error);
        setStakedAmounts({
          USDC: "0",
          CHFX: "0",
          TRYB: "0",
          SEKX: "0",
        });
        currencies.forEach(currency => {
          setLoadingStaked(prev => ({ ...prev, [currency]: false }));
        });
      }
    };

    fetchStakedAmounts();
  }, [isOpen, currentAccount, client]);

  // Fetch prices for currencies
  useEffect(() => {
    if (!isOpen) return;

    const fetchPrices = async () => {
      for (const currency of currencies) {
        setLoadingPrices(prev => ({ ...prev, [currency]: true }));
        try {
          const pair = currencyPricePairs[currency];
          const response = await fetch(`/api/currency-price?pair=${pair}`);
          
          if (response.ok) {
            const data = await response.json();
            if (data.price) {
              let priceInUSD = data.price;
              
              if (currency !== 'USDC') {
                priceInUSD = data.price > 0 ? 1 / data.price : 0;
              }
              
              setPrices(prev => ({ ...prev, [currency]: priceInUSD }));
            } else {
              setPrices(prev => ({ ...prev, [currency]: currency === 'USDC' ? 1.00 : 0 }));
            }
          } else {
            setPrices(prev => ({ ...prev, [currency]: currency === 'USDC' ? 1.00 : 0 }));
          }
        } catch (error) {
          console.error(`Error fetching ${currency} price:`, error);
          setPrices(prev => ({ ...prev, [currency]: currency === 'USDC' ? 1.00 : 0 }));
        } finally {
          setLoadingPrices(prev => ({ ...prev, [currency]: false }));
        }
      }
    };

    fetchPrices();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = (currency: Currency) => {
    // Only allow selection if there's a staked amount
    const staked = parseFloat(stakedAmounts[currency]);
    if (staked > 0) {
      onSelect(currency);
    }
  };

  const handleClose = () => {
    onClose();
  };

  // Sort currencies: staked tokens first, then tokens with no stake
  const sortedCurrencies = [...currencies].sort((a, b) => {
    const stakedA = parseFloat(stakedAmounts[a]);
    const stakedB = parseFloat(stakedAmounts[b]);
    
    // If both have stake or both don't, maintain original order
    if ((stakedA > 0 && stakedB > 0) || (stakedA === 0 && stakedB === 0)) {
      return 0;
    }
    // Staked tokens come first
    return stakedA > 0 ? -1 : 1;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-2xl bg-[#1a1a1a] backdrop-blur-xl border border-white/10 ring-1 ring-white/5 shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-white">Select Currency to Receive</h3>
            <button
              onClick={handleClose}
              className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-2.5 max-h-[400px] overflow-y-auto">
            {sortedCurrencies.map((currency) => {
              const staked = parseFloat(stakedAmounts[currency]);
              const hasStake = staked > 0;
              const isSelected = selectedCurrency === currency;
              
              return (
                <button
                  key={currency}
                  onClick={() => handleSelect(currency)}
                  disabled={!hasStake}
                  className={cn(
                    "w-full flex flex-col gap-3 px-4 py-3.5 rounded-lg transition-all text-left",
                    !hasStake && "opacity-50 cursor-not-allowed",
                    hasStake && isSelected
                      ? "bg-white/10 text-white border border-white/15"
                      : hasStake
                      ? "bg-[#0f0f0f] text-zinc-200 hover:bg-[#151515] hover:text-white border border-white/5"
                      : "bg-[#0a0a0a] text-zinc-500 border border-white/5"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={cn(
                        "w-8 h-8 rounded-full ring-1 ring-inset flex-shrink-0",
                        hasStake
                          ? "bg-gradient-to-br from-white/40 to-white/10 ring-white/20"
                          : "bg-gradient-to-br from-white/10 to-white/5 ring-white/10"
                      )} />
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className={cn(
                          "font-medium text-sm",
                          hasStake ? "text-white" : "text-zinc-500"
                        )}>{currency}</span>
                        <span className={cn(
                          "text-xs",
                          hasStake ? "text-zinc-500" : "text-zinc-600"
                        )}>Staked Amount</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {loadingStaked[currency] ? (
                        <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <span className={cn(
                            "text-sm font-mono whitespace-nowrap",
                            hasStake ? "text-white" : "text-zinc-500"
                          )}>
                            {staked === 0 ? "0" : staked.toLocaleString(undefined, { 
                              minimumFractionDigits: 0, 
                              maximumFractionDigits: 6 
                            })}
                          </span>
                          {loadingPrices[currency] ? (
                            <div className="w-3 h-3 border border-zinc-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <span className={cn(
                              "text-xs font-mono whitespace-nowrap",
                              hasStake ? "text-zinc-400" : "text-zinc-600"
                            )}>
                              {(() => {
                                const price = prices[currency];
                                if (staked > 0 && price > 0) {
                                  const totalValue = staked * price;
                                  return `$${totalValue.toFixed(2)}`;
                                }
                                return "$0.00";
                              })()}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

