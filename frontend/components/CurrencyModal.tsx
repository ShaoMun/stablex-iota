import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useCurrentAccount, useIotaClient } from "@iota/dapp-kit";
import { normalizeStructTag } from "@iota/iota-sdk/utils";

type Currency = "USDC" | "CHFX" | "TRYB" | "SEKX" | "JPYC" | "MYRC" | "XSGD";

interface CurrencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCurrency: Currency;
  onSelect: (currency: Currency) => void;
}

const currencies: Currency[] = ["USDC", "CHFX", "TRYB", "SEKX", "JPYC", "MYRC", "XSGD"];

// Package addresses for Move/IOTA tokens (equivalent to contract addresses)
// Note: These are the actual package addresses from the wallet balances
const currencyInfo: Record<Currency, { packageAddress: string; coinType: string }> = {
  USDC: {
    packageAddress: "0xa5afd11d15dfa90e5ac47ac1a2a74b810b6d0d3c00df8c35c33b90c44e32931d",
    coinType: "0xa5afd11d15dfa90e5ac47ac1a2a74b810b6d0d3c00df8c35c33b90c44e32931d::usdc::USDC"
  },
  CHFX: {
    packageAddress: "0x7d6fa54ec2a4ae5620967a2129860f5a8a0b4d9849df64f2ae9b5325f3ca7db0",
    coinType: "0x7d6fa54ec2a4ae5620967a2129860f5a8a0b4d9849df64f2ae9b5325f3ca7db0::chfx::CHFX"
  },
  TRYB: {
    packageAddress: "0x7d6fa54ec2a4ae5620967a2129860f5a8a0b4d9849df64f2ae9b5325f3ca7db0",
    coinType: "0x7d6fa54ec2a4ae5620967a2129860f5a8a0b4d9849df64f2ae9b5325f3ca7db0::tryb::TRYB"
  },
  SEKX: {
    packageAddress: "0x7d6fa54ec2a4ae5620967a2129860f5a8a0b4d9849df64f2ae9b5325f3ca7db0",
    coinType: "0x7d6fa54ec2a4ae5620967a2129860f5a8a0b4d9849df64f2ae9b5325f3ca7db0::sekx::SEKX"
  },
  JPYC: {
    packageAddress: "0xa5afd11d15dfa90e5ac47ac1a2a74b810b6d0d3c00df8c35c33b90c44e32931d",
    coinType: "0xa5afd11d15dfa90e5ac47ac1a2a74b810b6d0d3c00df8c35c33b90c44e32931d::jpyc::JPYC"
  },
  MYRC: {
    packageAddress: "0xa5afd11d15dfa90e5ac47ac1a2a74b810b6d0d3c00df8c35c33b90c44e32931d",
    coinType: "0xa5afd11d15dfa90e5ac47ac1a2a74b810b6d0d3c00df8c35c33b90c44e32931d::myrc::MYRC"
  },
  XSGD: {
    packageAddress: "0xa5afd11d15dfa90e5ac47ac1a2a74b810b6d0d3c00df8c35c33b90c44e32931d",
    coinType: "0xa5afd11d15dfa90e5ac47ac1a2a74b810b6d0d3c00df8c35c33b90c44e32931d::xsgd::XSGD"
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
  const [balances, setBalances] = useState<Record<Currency, string>>({
    USDC: "0",
    CHFX: "0",
    TRYB: "0",
    SEKX: "0",
    JPYC: "0",
    MYRC: "0",
    XSGD: "0",
  });
  const [loadingBalances, setLoadingBalances] = useState<Record<Currency, boolean>>({
    USDC: false,
    CHFX: false,
    TRYB: false,
    SEKX: false,
    JPYC: false,
    MYRC: false,
    XSGD: false,
  });
  const [prices, setPrices] = useState<Record<Currency, number>>({
    USDC: 0, // Will be fetched from API
    CHFX: 0,
    TRYB: 0,
    SEKX: 0,
    JPYC: 0,
    MYRC: 0,
    XSGD: 0,
  });
  const [loadingPrices, setLoadingPrices] = useState<Record<Currency, boolean>>({
    USDC: false,
    CHFX: false,
    TRYB: false,
    SEKX: false,
    JPYC: false,
    MYRC: false,
    XSGD: false,
  });
  
  const currentAccount = useCurrentAccount();
  const client = useIotaClient();

  // Currency to price pair mapping
  const currencyPricePairs: Record<Currency, string> = {
    USDC: 'USDC-USD', // USDC/USD price feed
    CHFX: 'USD-CHF',
    TRYB: 'USD-TRY',
    SEKX: 'USD-SEK',
    JPYC: 'USD-JPY',
    MYRC: 'USD-MYR',
    XSGD: 'USD-SGD',
  };

  // Fetch balances for all currencies
  useEffect(() => {
    if (!isOpen || !currentAccount || !client) {
        // Reset balances if not connected
        if (!currentAccount) {
          setBalances({
            USDC: "0",
            CHFX: "0",
            TRYB: "0",
            SEKX: "0",
            JPYC: "0",
            MYRC: "0",
            XSGD: "0",
          });
        }
      return;
    }

    const fetchBalances = async () => {
      try {
        // First, get all balances for the account
        const allBalances = await client.getAllBalances({
          owner: currentAccount.address,
        });

        console.log("All balances:", allBalances);

        // Create a map of coin types to balances (store both normalized and original)
        const balanceMap = new Map<string, string>();
        const originalCoinTypes: string[] = [];
        
        if (allBalances && Array.isArray(allBalances)) {
          for (const balance of allBalances) {
            if (balance.coinType && balance.totalBalance) {
              const originalType = balance.coinType;
              const normalizedType = normalizeStructTag(originalType);
              
              // Store both normalized and original for matching
              balanceMap.set(normalizedType, balance.totalBalance);
              balanceMap.set(originalType.toLowerCase(), balance.totalBalance);
              
              originalCoinTypes.push(originalType);
              console.log(`Found balance:`, {
                original: originalType,
                normalized: normalizedType,
                balance: balance.totalBalance,
                coinObjectCount: balance.coinObjectCount
              });
            }
          }
        }

        console.log("All coin types found:", originalCoinTypes);

        // Now match each currency to its balance
        for (const currency of currencies) {
          setLoadingBalances(prev => ({ ...prev, [currency]: true }));
          try {
            const coinType = currencyInfo[currency].coinType;
            const normalizedType = normalizeStructTag(coinType);
            
            console.log(`Looking for ${currency} with coinType:`, normalizedType);

            // Try multiple matching strategies
            let balance: string | undefined;
            
            // Strategy 1: Exact match with normalized type
            balance = balanceMap.get(normalizedType);
            
            // Strategy 2: Try matching by currency name in the coin type
            if (!balance) {
              for (const [coinTypeKey, balanceValue] of balanceMap.entries()) {
                const currencyLower = currency.toLowerCase();
                if (coinTypeKey.toLowerCase().includes(currencyLower) && 
                    (coinTypeKey.includes('::usdc::') || 
                     coinTypeKey.includes('::chfx::') || 
                     coinTypeKey.includes('::tryb::') || 
                     coinTypeKey.includes('::sekx::'))) {
                  balance = balanceValue;
                  console.log(`Matched ${currency} by name: ${coinTypeKey} = ${balanceValue}`);
                  break;
                }
              }
            }
            
            // Strategy 3: Try matching the package address + currency name
            if (!balance) {
              const packageAddr = currencyInfo[currency].packageAddress.toLowerCase();
              for (const [coinTypeKey, balanceValue] of balanceMap.entries()) {
                if (coinTypeKey.toLowerCase().includes(packageAddr) && 
                    coinTypeKey.toLowerCase().includes(currency.toLowerCase())) {
                  balance = balanceValue;
                  console.log(`Matched ${currency} by package + name: ${coinTypeKey} = ${balanceValue}`);
                  break;
                }
              }
            }
            
            if (balance) {
              // Format balance (6 decimals based on Move code)
              const balanceNumber = Number(balance) / 1_000_000;
              console.log(`${currency} balance found: ${balanceNumber}`);
              setBalances(prev => ({ ...prev, [currency]: balanceNumber.toFixed(6) }));
            } else {
              console.log(`No balance found for ${currency}, trying getBalance...`);
              // If not found in getAllBalances, try getBalance as fallback
              try {
                const balanceResult = await client.getBalance({
                  owner: currentAccount.address,
                  coinType: normalizedType,
                });
                
                console.log(`${currency} getBalance result:`, balanceResult);
                
                if (balanceResult && balanceResult.totalBalance && balanceResult.totalBalance !== "0") {
                  const balanceNumber = Number(balanceResult.totalBalance) / 1_000_000;
                  setBalances(prev => ({ ...prev, [currency]: balanceNumber.toFixed(6) }));
                } else {
                  setBalances(prev => ({ ...prev, [currency]: "0" }));
                }
              } catch (error) {
                console.log(`getBalance also failed for ${currency}:`, error);
                setBalances(prev => ({ ...prev, [currency]: "0" }));
              }
            }
          } catch (error) {
            console.error(`Error processing ${currency} balance:`, error);
            setBalances(prev => ({ ...prev, [currency]: "0" }));
          } finally {
            setLoadingBalances(prev => ({ ...prev, [currency]: false }));
          }
        }
      } catch (error) {
        console.error("Error fetching all balances:", error);
        // Set all to 0 on error
        setBalances({
          USDC: "0",
          CHFX: "0",
          TRYB: "0",
          SEKX: "0",
          JPYC: "0",
          MYRC: "0",
          XSGD: "0",
        });
        currencies.forEach(currency => {
          setLoadingBalances(prev => ({ ...prev, [currency]: false }));
        });
      }
    };

    fetchBalances();
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
              // Oracle shows USD per currency (e.g., USD/CHF = 0.92 means 1 USD = 0.92 CHF)
              // We want to show currency in USD (e.g., 1 CHF = 1/0.92 = 1.087 USD)
              // So we need to invert: 1 / oracle_price
              let priceInUSD = data.price;
              
              // For USDC-USD, the oracle already shows USDC in USD, so no inversion needed
              // For USD-CHF, USD-TRY, USD-SEK, we need to invert
              if (currency !== 'USDC') {
                priceInUSD = data.price > 0 ? 1 / data.price : 0;
              }
              
              setPrices(prev => ({ ...prev, [currency]: priceInUSD }));
            } else {
              setPrices(prev => ({ ...prev, [currency]: 0 }));
            }
          } else {
            console.error(`Failed to fetch price for ${currency}:`, response.statusText);
            // Set fallback: USDC defaults to 1.00 if API fails, others to 0
            if (currency === 'USDC') {
              setPrices(prev => ({ ...prev, USDC: 1.00 }));
            } else {
              setPrices(prev => ({ ...prev, [currency]: 0 }));
            }
          }
        } catch (error) {
          console.error(`Error fetching ${currency} price:`, error);
          // Set fallback: USDC defaults to 1.00 if API fails, others to 0
          if (currency === 'USDC') {
            setPrices(prev => ({ ...prev, USDC: 1.00 }));
          } else {
            setPrices(prev => ({ ...prev, [currency]: 0 }));
          }
        } finally {
          setLoadingPrices(prev => ({ ...prev, [currency]: false }));
        }
      }
    };

    fetchPrices();
  }, [isOpen]);

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
        className="relative w-full max-w-md rounded-2xl bg-[#1a1a1a] backdrop-blur-xl border border-white/10 ring-1 ring-white/5 shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-white">Select Currency</h3>
            <button
              onClick={handleClose}
              className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                className="w-full px-4 py-2.5 pl-10 rounded-lg bg-[#0f0f0f] border border-white/5 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/10 focus:border-white/10 transition-all"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          <div className="space-y-2.5 max-h-[400px] overflow-y-auto">
            {filteredCurrencies.length > 0 ? (
              filteredCurrencies.map((currency) => (
                <button
                  key={currency}
                  onClick={() => handleSelect(currency)}
                  className={cn(
                    "w-full flex flex-col gap-3 px-4 py-3.5 rounded-lg transition-all text-left",
                    selectedCurrency === currency
                      ? "bg-white/10 text-white border border-white/15"
                      : "bg-[#0f0f0f] text-zinc-200 hover:bg-[#151515] hover:text-white border border-white/5"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/40 to-white/10 ring-1 ring-inset ring-white/20 flex-shrink-0" />
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="font-medium text-sm text-white">{currency}</span>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-zinc-500 font-mono">
                            {truncateAddress(currencyInfo[currency].packageAddress)}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(getExplorerUrl(currencyInfo[currency].packageAddress), '_blank', 'noopener,noreferrer');
                            }}
                            className="text-zinc-600 hover:text-zinc-400 transition-colors p-0.5 flex-shrink-0"
                            title="View in explorer"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {loadingBalances[currency] ? (
                        <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <span className="text-sm text-white font-mono whitespace-nowrap">
                            {parseFloat(balances[currency]) === 0 ? "0" : parseFloat(balances[currency]).toLocaleString(undefined, { 
                              minimumFractionDigits: 0, 
                              maximumFractionDigits: 6 
                            })}
                          </span>
                          {loadingPrices[currency] ? (
                            <div className="w-3 h-3 border border-zinc-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <span className="text-xs text-zinc-400 font-mono whitespace-nowrap">
                              {(() => {
                                const balance = parseFloat(balances[currency]);
                                const price = prices[currency];
                                if (balance > 0 && price > 0) {
                                  const totalValue = balance * price;
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

