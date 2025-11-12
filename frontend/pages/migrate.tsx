import { useState, useEffect, useRef } from "react";
import StakedCurrencyModal from "@/components/StakedCurrencyModal";
import AppLayout from "@/components/AppLayout";
import FAQ from "@/components/FAQ";
import { useCurrentAccount, ConnectModal, useSignAndExecuteTransaction, useIotaClient } from "@iota/dapp-kit";
import { Transaction } from "@iota/iota-sdk/transactions";

type Currency = "USDC" | "CHFX" | "TRYB" | "SEKX";

export default function MigratePage() {
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  const [stakedAmounts, setStakedAmounts] = useState<Record<Currency, string>>({
    USDC: "0",
    CHFX: "0",
    TRYB: "0",
    SEKX: "0",
  });
  const [sbxAmount, setSbxAmount] = useState<string>("0");
  const [sendSbx, setSendSbx] = useState<boolean>(false);
  const [sbxBalance, setSbxBalance] = useState<string>("0.000000");
  const [recipientAddress, setRecipientAddress] = useState<string>("");
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [currencyPrices, setCurrencyPrices] = useState<Record<Currency, number>>({
    USDC: 1.00,
    CHFX: 0,
    TRYB: 0,
    SEKX: 0,
  });
  const [isMigrating, setIsMigrating] = useState(false);
  const [snackbar, setSnackbar] = useState<{ show: boolean; digest?: string; error?: boolean; message?: string }>({ show: false });
  const snackbarTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const currentAccount = useCurrentAccount();
  const isWalletConnected = !!currentAccount;
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const client = useIotaClient();

  // Contract addresses
  const POOL_PACKAGE_ID = "0x1cf79de8cac02b52fa384df41e7712b5bfadeae2d097a818008780cf7d7783c6";
  const SBX_COIN_TYPE = `${POOL_PACKAGE_ID}::sbx::SBX`;

  // Currency to price pair mapping
  const currencyPricePairs: Record<Currency, string> = {
    USDC: 'USDC-USD',
    CHFX: 'USD-CHF',
    TRYB: 'USD-TRY',
    SEKX: 'USD-SEK',
  };

  // Deposit fee is 0.1% (10 basis points)
  const DEPOSIT_FEE_BPS = 10;

  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction({
    onSuccess: (result) => {
      setIsMigrating(false);
      setSnackbar({ show: true, digest: result.digest, error: false });
      if (snackbarTimeoutRef.current) {
        clearTimeout(snackbarTimeoutRef.current);
      }
      snackbarTimeoutRef.current = setTimeout(() => {
        setSnackbar({ show: false });
      }, 5000);
      // Reset form
      setRecipientAddress("");
      setSbxAmount("0");
      setSendSbx(false);
      // Refresh balances
      fetchStakedAmounts();
      fetchSbxBalance();
    },
    onError: (error) => {
      try {
        console.error('Transaction failed:', error);
        setIsMigrating(false);
        
        let errorMessage = 'Unknown error';
        try {
          if (error?.message) {
            errorMessage = String(error.message);
          } else if (typeof error === 'string') {
            errorMessage = error;
          } else if (error?.toString) {
            errorMessage = error.toString();
          }
        } catch (e) {
          errorMessage = 'Transaction failed';
        }
        
        const errorLower = errorMessage.toLowerCase();
        const isUserRejection = errorLower.includes('rejected') || 
                               errorLower.includes('user') ||
                               errorLower.includes('denied') ||
                               errorLower.includes('cancelled') ||
                               errorLower.includes('cancel');
        
        const displayMessage = isUserRejection 
          ? 'Transaction cancelled'
          : `Transaction failed: ${errorMessage}`;
        
        setSnackbar({ show: true, error: true, message: displayMessage });
        if (snackbarTimeoutRef.current) {
          clearTimeout(snackbarTimeoutRef.current);
        }
        snackbarTimeoutRef.current = setTimeout(() => {
          setSnackbar({ show: false });
        }, 5000);
      } catch (handlerError) {
        console.error('Error in error handler:', handlerError);
        setIsMigrating(false);
        setSnackbar({ show: true, error: true, message: 'Transaction cancelled' });
        if (snackbarTimeoutRef.current) {
          clearTimeout(snackbarTimeoutRef.current);
        }
        snackbarTimeoutRef.current = setTimeout(() => {
          setSnackbar({ show: false });
        }, 5000);
      }
    },
  });

  // Fetch staked amounts from Account object
  const fetchStakedAmounts = async () => {
    if (!currentAccount || !client) {
      setStakedAmounts({
        USDC: "0",
        CHFX: "0",
        TRYB: "0",
        SEKX: "0",
      });
      return;
    }

    try {
      const accountObjects = await client.getOwnedObjects({
        owner: currentAccount.address,
        filter: { StructType: `${POOL_PACKAGE_ID}::sbx_pool::Account` },
        options: { showContent: true, showType: true },
      });

      if (!accountObjects.data || accountObjects.data.length === 0) {
        setStakedAmounts({
          USDC: "0",
          CHFX: "0",
          TRYB: "0",
          SEKX: "0",
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
        return;
      }

      const accountContent = (accountObject as any).content?.fields || {};
      
      // USDC is stored in micro-USD
      const stakedUsdcMu = accountContent.staked_usdc || 0;
      const usdcAmount = (Number(stakedUsdcMu) / 1_000_000).toFixed(6);
      
      // Regional currencies are stored in native units (6 decimals)
      const chfxAmount = ((Number(accountContent.staked_chfx || 0)) / 1_000_000).toFixed(6);
      const trybAmount = ((Number(accountContent.staked_tryb || 0)) / 1_000_000).toFixed(6);
      const sekxAmount = ((Number(accountContent.staked_sekx || 0)) / 1_000_000).toFixed(6);
      
      setStakedAmounts({
        USDC: usdcAmount,
        CHFX: chfxAmount,
        TRYB: trybAmount,
        SEKX: sekxAmount,
      });

      // Auto-select first currency with stake if none selected
      if (!selectedCurrency) {
        if (parseFloat(usdcAmount) > 0) {
          setSelectedCurrency("USDC");
        } else if (parseFloat(chfxAmount) > 0) {
          setSelectedCurrency("CHFX");
        } else if (parseFloat(trybAmount) > 0) {
          setSelectedCurrency("TRYB");
        } else if (parseFloat(sekxAmount) > 0) {
          setSelectedCurrency("SEKX");
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
    }
  };

  // Fetch SBX balance
  const fetchSbxBalance = async () => {
    if (!currentAccount || !client) {
      setSbxBalance("0.000000");
      return;
    }

    try {
      const coins = await client.getCoins({
        owner: currentAccount.address,
        coinType: SBX_COIN_TYPE,
      });

      if (coins.data && coins.data.length > 0) {
        const totalBalance = coins.data.reduce((sum, coin) => sum + BigInt(coin.balance || 0), BigInt(0));
        const balanceNum = Number(totalBalance) / 1_000_000;
        setSbxBalance(balanceNum.toFixed(6));
      } else {
        setSbxBalance("0.000000");
      }
    } catch (error) {
      console.error('Error fetching SBX balance:', error);
      setSbxBalance("0.000000");
    }
  };

  // Trigger animation on mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch currency prices
  useEffect(() => {
    const fetchPrices = async () => {
      const currencies: Currency[] = ["USDC", "CHFX", "TRYB", "SEKX"];
      for (const currency of currencies) {
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
              
              setCurrencyPrices(prev => ({ ...prev, [currency]: priceInUSD }));
            } else {
              setCurrencyPrices(prev => ({ ...prev, [currency]: currency === 'USDC' ? 1.00 : 0 }));
            }
          } else {
            setCurrencyPrices(prev => ({ ...prev, [currency]: currency === 'USDC' ? 1.00 : 0 }));
          }
        } catch (error) {
          console.error(`Error fetching ${currency} price:`, error);
          setCurrencyPrices(prev => ({ ...prev, [currency]: currency === 'USDC' ? 1.00 : 0 }));
        }
      }
    };

    fetchPrices();
  }, []);

  // Fetch staked amounts and SBX balance when wallet connects
  useEffect(() => {
    if (isWalletConnected) {
      fetchStakedAmounts();
      fetchSbxBalance();
      // Refresh balances periodically
      const interval = setInterval(() => {
        fetchStakedAmounts();
        fetchSbxBalance();
      }, 10000);
      return () => clearInterval(interval);
    } else {
      setStakedAmounts({
        USDC: "0",
        CHFX: "0",
        TRYB: "0",
        SEKX: "0",
      });
      setSbxBalance("0.000000");
    }
  }, [isWalletConnected, currentAccount, client]);

  // Reset SBX amount when toggle is turned off
  useEffect(() => {
    if (!sendSbx) {
      setSbxAmount("0");
    }
  }, [sendSbx]);

  const handleConnectWallet = () => {
    setIsConnectModalOpen(true);
  };

  // Calculate associated SBX amount for the selected currency's staked amount
  const calculateAssociatedSbx = (): number => {
    if (!selectedCurrency) return 0;
    
    const stakedAmount = parseFloat(stakedAmounts[selectedCurrency] || "0");
    if (stakedAmount === 0) return 0;

    const price = currencyPrices[selectedCurrency];
    if (price === 0 && selectedCurrency !== 'USDC') return 0;

    // Calculate USD value of staked amount
    let usdValue: number;
    if (selectedCurrency === 'USDC') {
      // USDC staked amount is already in USD (stored as micro-USD, displayed as USD)
      usdValue = stakedAmount;
    } else {
      // Regional currencies: convert to USD using price
      usdValue = stakedAmount * price;
    }

    // Apply deposit fee: SBX = USD value * (1 - deposit_fee_bps / 10000)
    const associatedSbx = usdValue * (1 - DEPOSIT_FEE_BPS / 10000);
    return associatedSbx;
  };

  const handlePercentageClick = (percentage: number) => {
    const associatedSbx = calculateAssociatedSbx();
    if (associatedSbx === 0) return;
    
    const amount = (associatedSbx * percentage) / 100;
    // Cap at available balance
    const balance = parseFloat(sbxBalance) || 0;
    const finalAmount = Math.min(amount, balance);
    setSbxAmount(finalAmount.toFixed(6));
  };

  const handleMigrate = async () => {
    if (!currentAccount || !client) {
      alert("Please connect your wallet");
      return;
    }

    if (!recipientAddress || recipientAddress.trim() === "") {
      alert("Please enter a recipient address");
      return;
    }

    // Validate address format (basic check)
    if (!recipientAddress.startsWith("0x") || recipientAddress.length < 10) {
      alert("Please enter a valid recipient address");
      return;
    }

    // Check if selected currency has staking status to migrate
    if (!selectedCurrency) {
      alert("Please select a currency to migrate");
      return;
    }

    const selectedStaked = parseFloat(stakedAmounts[selectedCurrency] || "0");
    if (selectedStaked === 0) {
      alert(`No ${selectedCurrency} staking status to migrate`);
      return;
    }

    if (sendSbx) {
      const amount = parseFloat(sbxAmount);
      if (amount <= 0) {
        alert("Please enter a valid SBX amount");
        return;
      }
      const balance = parseFloat(sbxBalance);
      if (amount > balance) {
        alert(`Insufficient SBX balance. You have ${balance} SBX`);
        return;
      }
    }

    setIsMigrating(true);

    try {
      // Get account object
      const accountObjects = await client.getOwnedObjects({
        owner: currentAccount.address,
        filter: { StructType: `${POOL_PACKAGE_ID}::sbx_pool::Account` },
        options: { showContent: true, showType: true },
      });

      if (!accountObjects.data || accountObjects.data.length === 0) {
        alert("No account found. Please stake first to create an account.");
        setIsMigrating(false);
        return;
      }

      const accountObjectId = accountObjects.data[0].data?.objectId;
      if (!accountObjectId) {
        alert("Failed to get account object");
        setIsMigrating(false);
        return;
      }

      // Build transaction
      const txb = new Transaction();
      txb.setSender(currentAccount.address);
      const accountRef = txb.object(accountObjectId);

      // Get SBX coin if sending SBX
      let sbxCoinRef: any = null;
      if (sendSbx) {
        const amountMicro = BigInt(Math.floor(parseFloat(sbxAmount) * 1_000_000));
        
        const coins = await client.getCoins({
          owner: currentAccount.address,
          coinType: SBX_COIN_TYPE,
        });

        if (!coins.data || coins.data.length === 0) {
          alert("No SBX tokens found in your wallet");
          setIsMigrating(false);
          return;
        }

        const totalBalance = coins.data.reduce((sum, coin) => sum + BigInt(coin.balance || 0), BigInt(0));
        if (totalBalance < amountMicro) {
          alert(`Insufficient SBX balance. You have ${Number(totalBalance) / 1_000_000} SBX`);
          setIsMigrating(false);
          return;
        }

        // Use the first coin as the primary coin
        const firstCoinObject = coins.data[0];
        const firstCoinId = firstCoinObject.coinObjectId;
        const firstCoinBalance = BigInt(firstCoinObject.balance || 0);
        const firstCoin = txb.object(firstCoinId);
        
        if (firstCoinBalance >= amountMicro) {
          // First coin has enough, use it directly or split
          if (firstCoinBalance === amountMicro) {
            sbxCoinRef = firstCoin;
          } else {
            // Split to get exact amount
            txb.splitCoins(firstCoin, [amountMicro]);
            sbxCoinRef = { $kind: 'NestedResult' as const, NestedResult: [0, 0] };
          }
        } else {
          // First coin doesn't have enough, need to merge other coins into it
          // Create references for all coins first
          const coinRefs = coins.data.map(coin => txb.object(coin.coinObjectId));
          const primaryCoin = coinRefs[0];
          const coinsToMerge = coinRefs.slice(1);
          
          // Merge all other coins into the primary coin
          // mergeCoins expects an array of coins to merge
          if (coinsToMerge.length > 0) {
            txb.mergeCoins(primaryCoin, coinsToMerge);
          }
          
          // Now split to get exact amount
          // The split command index is 0 if no merges, 1 if there were merges
          const splitCommandIndex = coinsToMerge.length > 0 ? 1 : 0;
          txb.splitCoins(primaryCoin, [amountMicro]);
          sbxCoinRef = { $kind: 'NestedResult' as const, NestedResult: [splitCommandIndex, 0] };
        }
      } else {
        // Create a zero-amount coin if not sending SBX (contract requires it)
        const coins = await client.getCoins({
          owner: currentAccount.address,
          coinType: SBX_COIN_TYPE,
        });

        if (coins.data && coins.data.length > 0) {
          const coinObject = coins.data[0];
          const coinObjectId = coinObject.coinObjectId;
          const firstCoin = txb.object(coinObjectId);
          // Split a minimal amount (1 micro-unit) to satisfy the contract
          txb.splitCoins(firstCoin, [BigInt(1)]);
          sbxCoinRef = { $kind: 'NestedResult' as const, NestedResult: [0, 0] };
        } else {
          alert("No SBX tokens found. The contract requires at least a minimal SBX coin.");
          setIsMigrating(false);
          return;
        }
      }

      // Map currency to currency type code (0 = USDC, 1 = CHFX, 2 = TRYB, 3 = SEKX)
      const currencyTypeMap: Record<Currency, number> = {
        USDC: 0,
        CHFX: 1,
        TRYB: 2,
        SEKX: 3,
      };

      if (!selectedCurrency) {
        alert("Please select a currency to migrate");
        setIsMigrating(false);
        return;
      }

      const currencyType = currencyTypeMap[selectedCurrency];

      // Call transfer_partial_staking for the selected currency only
      txb.moveCall({
        target: `${POOL_PACKAGE_ID}::sbx_pool::transfer_partial_staking`,
        arguments: [
          accountRef,
          txb.pure.address(recipientAddress),
          txb.pure.u8(currencyType),
          txb.pure.bool(sendSbx),
          sbxCoinRef,
        ],
      });

      // Execute transaction
      try {
        signAndExecuteTransaction({
          transaction: txb as any,
        });
      } catch (syncError: any) {
        console.error('Synchronous error in signAndExecuteTransaction:', syncError);
        setIsMigrating(false);
        
        const errorMessage = syncError?.message?.toLowerCase() || '';
        const isUserRejection = errorMessage.includes('rejected') || 
                               errorMessage.includes('user') ||
                               errorMessage.includes('denied') ||
                               errorMessage.includes('cancelled') ||
                               errorMessage.includes('cancel');
        
        setSnackbar({ 
          show: true, 
          error: true, 
          message: isUserRejection ? 'Transaction cancelled' : `Transaction failed: ${syncError?.message || 'Unknown error'}` 
        });
        if (snackbarTimeoutRef.current) {
          clearTimeout(snackbarTimeoutRef.current);
        }
        snackbarTimeoutRef.current = setTimeout(() => {
          setSnackbar({ show: false });
        }, 5000);
      }
    } catch (error: any) {
      try {
        console.error('Migration error:', error);
        setIsMigrating(false);
        
        let errorMessage = 'Unknown error';
        try {
          if (error?.message) {
            errorMessage = String(error.message);
          } else if (typeof error === 'string') {
            errorMessage = error;
          } else if (error?.toString) {
            errorMessage = error.toString();
          }
        } catch (e) {
          errorMessage = 'Migration failed';
        }
        
        setSnackbar({ 
          show: true, 
          error: true, 
          message: `Migration failed: ${errorMessage}` 
        });
        if (snackbarTimeoutRef.current) {
          clearTimeout(snackbarTimeoutRef.current);
        }
        snackbarTimeoutRef.current = setTimeout(() => {
          setSnackbar({ show: false });
        }, 5000);
      } catch (handlerError) {
        console.error('Error in error handler:', handlerError);
        setIsMigrating(false);
        setSnackbar({ show: true, error: true, message: 'Migration failed' });
        if (snackbarTimeoutRef.current) {
          clearTimeout(snackbarTimeoutRef.current);
        }
        snackbarTimeoutRef.current = setTimeout(() => {
          setSnackbar({ show: false });
        }, 5000);
      }
    }
  };

  const handleSnackbarClick = () => {
    if (snackbar.digest && !snackbar.error) {
      window.open(`https://explorer.iota.org/transaction/${snackbar.digest}?network=testnet`, '_blank', 'noopener,noreferrer');
    }
  };

  const selectedStakedAmount = selectedCurrency ? stakedAmounts[selectedCurrency] : "0";

  return (
    <AppLayout activeTab="migrate">
      {/* Main Glass Card */}
      <div 
        className={`relative rounded-3xl backdrop-blur-xl overflow-hidden ${isMounted ? 'page-container-enter' : 'opacity-0'}`}
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
            Migrate stake accounts
          </h2>

          {!isWalletConnected ? (
            <div className="bg-white/3 rounded-2xl border border-white/10 ring-1 ring-white/10 backdrop-blur-xl p-8 mb-6">
              <div className="text-center">
                <p className="text-zinc-400 text-sm mb-6">
                  Connect your wallet to migrate stake accounts
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
            <>
              {/* Input Container - Currency, Amount, SBX */}
              <div className="bg-white/3 rounded-2xl border border-white/10 ring-1 ring-white/10 backdrop-blur-xl p-6 mb-4">
                {/* Amount Display */}
                <div className="mb-5">
                  <label className="text-zinc-400 text-[11px] font-medium mb-3 block uppercase tracking-wider">
                    STAKED AMOUNT (VIEW ONLY)
                  </label>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={selectedCurrency ? selectedStakedAmount : "0"}
                        readOnly
                        className={`w-full bg-transparent text-[34px] sm:text-[36px] font-semibold outline-none leading-none ${
                          !selectedCurrency || parseFloat(selectedStakedAmount) === 0 ? "text-zinc-500" : "text-white"
                        }`}
                      />
                      <p className="text-zinc-500 text-xs mt-1">
                        Only {selectedCurrency || "selected"} will be migrated
                      </p>
                    </div>
                    <button
                      onClick={() => setIsCurrencyModalOpen(true)}
                      className="px-4 py-2.5 rounded-full bg-white/10 text-white font-medium text-sm border border-white/15 hover:bg-white/15 transition-all flex items-center gap-2 flex-shrink-0 backdrop-blur-xl ring-1 ring-inset ring-white/10"
                    >
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-white/60 to-white/20 ring-1 ring-inset ring-white/40 flex-shrink-0" />
                      <span>{selectedCurrency || "Select Token"}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                  </div>
                  
                </div>

                {/* Send SBX Toggle */}
                <div className="border-t border-white/10 pt-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <label className="text-zinc-400 text-[11px] font-medium block uppercase tracking-wider mb-1">
                        ALSO SEND SBX
                      </label>
                      <p className="text-zinc-500 text-xs">
                        Transfer associated SBX tokens to recipient
                      </p>
                    </div>
                    <button
                      onClick={() => setSendSbx(!sendSbx)}
                      className={`relative w-12 h-6 rounded-full transition-all ${
                        sendSbx ? "bg-white/20" : "bg-white/5"
                      }`}
                    >
                      <div
                        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-all ${
                          sendSbx ? "translate-x-6" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* SBX Amount Input (shown when toggle is on) */}
                  {sendSbx && (
                    <div>
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex-1 min-w-0 relative">
                          <input
                            type="number"
                            value={sbxAmount}
                            onChange={(e) => setSbxAmount(e.target.value)}
                            onFocus={(e) => {
                              if (e.target.value === "0") {
                                setSbxAmount("");
                              }
                            }}
                            placeholder="0"
                            className={`w-full bg-transparent text-[28px] font-semibold outline-none placeholder:text-zinc-600 leading-none pr-12 ${
                              parseFloat(sbxAmount) === 0 || sbxAmount === "" || sbxAmount === "0" ? "text-zinc-500" : "text-white"
                            }`}
                          />
                          <span className="absolute right-0 top-0 text-zinc-500 text-sm font-medium pt-1">SBX</span>
                          <p className="text-zinc-500 text-xs mt-1">${(parseFloat(sbxAmount) || 0).toFixed(2)}</p>
                        </div>
                      </div>
                      
                      {/* Percentage Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePercentageClick(25)}
                          className="px-3 py-1 rounded-lg bg-white/5 text-white text-xs font-medium border border-white/10 hover:bg-white/10 transition-all"
                        >
                          25%
                        </button>
                        <button
                          onClick={() => handlePercentageClick(50)}
                          className="px-3 py-1 rounded-lg bg-white/5 text-white text-xs font-medium border border-white/10 hover:bg-white/10 transition-all"
                        >
                          50%
                        </button>
                        <button
                          onClick={() => handlePercentageClick(75)}
                          className="px-3 py-1 rounded-lg bg-white/5 text-white text-xs font-medium border border-white/10 hover:bg-white/10 transition-all"
                        >
                          75%
                        </button>
                        <button
                          onClick={() => handlePercentageClick(100)}
                          className="px-3 py-1 rounded-lg bg-white/5 text-white text-xs font-medium border border-white/10 hover:bg-white/10 transition-all"
                        >
                          100%
                        </button>
                        <div className="ml-auto text-zinc-500 text-xs">
                          {(() => {
                            const associatedSbx = calculateAssociatedSbx();
                            return associatedSbx > 0 
                              ? `Associated: ${associatedSbx.toFixed(6)} SBX`
                              : `Balance: ${sbxBalance} SBX`;
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Recipient Container */}
              <div className="bg-white/3 rounded-2xl border border-white/10 ring-1 ring-white/10 backdrop-blur-xl p-6 mb-5">
                <label className="text-zinc-400 text-[11px] font-medium mb-3 block uppercase tracking-wider">
                  RECIPIENT ADDRESS
                </label>
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all font-mono text-sm"
                />
              </div>

              {/* Migrate Button */}
              <button
                onClick={handleMigrate}
                disabled={isMigrating || !selectedCurrency || parseFloat(selectedStakedAmount) === 0 || !recipientAddress || (sendSbx && parseFloat(sbxAmount) <= 0)}
                className="w-full py-4 rounded-xl font-semibold text-black text-base transition-all bg-gradient-to-r from-zinc-200/80 to-white/70 hover:to-white ring-1 ring-inset ring-white/30 shadow-[0_4px_20px_rgba(255,255,255,0.12)] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:to-white/70"
              >
                {isMigrating ? "Migrating..." : `Migrate ${selectedCurrency || "Stake Account"}`}
              </button>
            </>
          )}
        </div>
      </div>

      {/* FAQ Section */}
      <FAQ
        items={[
          {
            question: "What is account migration?",
            answer: "Move your staking from one account to another. You can migrate a specific currency (USDC, CHFX, TRYB, or SEKX) to a new account for a recipient address."
          },
          {
            question: "Why would I migrate my staking status?",
            answer: "Useful if you want to transfer specific staked currencies to another wallet, reorganize your staking, or split your staking across multiple accounts. After migration, the recipient can unstake using their SBX tokens."
          },
          {
            question: "How does migration work?",
            answer: "Only you (the account owner) can start migration. Select a currency to migrate, and optionally send associated SBX tokens. The destination account will be created automatically for the recipient address. Only the selected currency's staked amount is migrated."
          },
          {
            question: "What happens after migration?",
            answer: "The new account gets the selected currency's staking status and can unstake using SBX tokens. Your original account's staking for that currency is cleared, but other currencies remain untouched."
          },
          {
            question: "Can I migrate partial amounts?",
            answer: "Yes! You can migrate individual currencies. Select which currency (USDC, CHFX, TRYB, or SEKX) you want to migrate. Only that currency's staked amount will be transferred to the recipient."
          },
          {
            question: "What if I also send SBX?",
            answer: "If you enable 'Also Send SBX', you can transfer SBX tokens along with the staking status. The recipient will be able to unstake immediately if they receive the corresponding SBX tokens."
          }
        ]}
      />

      {/* Staked Currency Selection Modal */}
      <StakedCurrencyModal
        isOpen={isCurrencyModalOpen}
        onClose={() => setIsCurrencyModalOpen(false)}
        selectedCurrency={selectedCurrency}
        onSelect={(currency) => {
          setSelectedCurrency(currency);
          setIsCurrencyModalOpen(false);
        }}
      />

      {/* Wallet Connection Modal */}
      <ConnectModal
        trigger={<button style={{ display: 'none' }} />}
        open={isConnectModalOpen}
        onOpenChange={setIsConnectModalOpen}
      />

      {/* Success/Error Snackbar */}
      {snackbar.show && (
        <div
          onClick={snackbar.error ? undefined : handleSnackbarClick}
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 ${snackbar.error ? '' : 'cursor-pointer'}`}
        >
          <div
            className="px-6 py-3 rounded-xl backdrop-blur-xl border border-white/20 shadow-lg transition-all hover:scale-105"
            style={snackbar.error ? {
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.9) 0%, rgba(220, 38, 38, 0.9) 100%)',
              boxShadow: '0 8px 30px rgba(239, 68, 68, 0.4)',
            } : {
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.9) 0%, rgba(22, 163, 74, 0.9) 100%)',
              boxShadow: '0 8px 30px rgba(34, 197, 94, 0.4)',
            }}
          >
            <div className="flex items-center gap-3">
              {snackbar.error ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              )}
              <span className="text-white font-medium text-sm">
                {snackbar.error ? (snackbar.message || 'Transaction failed') : 'Transaction successful'}
              </span>
              {!snackbar.error && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/80">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
