import { useState, useEffect, useRef } from "react";
import StakedCurrencyModal from "@/components/StakedCurrencyModal";
import AppLayout from "@/components/AppLayout";
import FAQ from "@/components/FAQ";
import { useCurrentAccount, ConnectModal, useSignAndExecuteTransaction, useIotaClient } from "@iota/dapp-kit";
import { Transaction } from "@iota/iota-sdk/transactions";

type Currency = "USDC" | "CHFX" | "TRYB" | "SEKX";

export default function UnstakePage() {
  const [toCurrency, setToCurrency] = useState<Currency>("USDC");
  const [sbxAmount, setSbxAmount] = useState<string>("0");
  const [toAmount, setToAmount] = useState<string>("0");
  const [isToCurrencyModalOpen, setIsToCurrencyModalOpen] = useState(false);
  const [sbxBalance, setSbxBalance] = useState<string>("0.000000");
  const [toCurrencyPrice, setToCurrencyPrice] = useState<number>(0);
  const [loadingToPrice, setLoadingToPrice] = useState<boolean>(false);
  const [unstakeFeeBps, setUnstakeFeeBps] = useState<number>(0);
  const [unstakeTier, setUnstakeTier] = useState<1 | 2 | null>(null);
  const [loadingUnstakeRate, setLoadingUnstakeRate] = useState<boolean>(false);
  const [unstakeToPriceMu, setUnstakeToPriceMu] = useState<number>(0);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  
  const currentAccount = useCurrentAccount();
  const isWalletConnected = !!currentAccount;
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const client = useIotaClient();
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [snackbar, setSnackbar] = useState<{ show: boolean; digest?: string; error?: boolean; message?: string }>({ show: false });
  const snackbarTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Contract addresses
  const POOL_PACKAGE_ID = "0x05c4be9ea7e0ab044c923099fa41f94f524fd29339f0b2447373574377b2a20e";
  const POOL_OBJECT_ID = "0xb727a10b1d354bd1f4b7f19152aee6fbf33bafcf9e741560a34bdaa0365fd189";
  const REGISTRY_OBJECT_ID = "0x911ad622c7b733650e06a609ee8bb808d4a6ff184cd15ce731b5033c036e914d";
  const SBX_COIN_TYPE = `${POOL_PACKAGE_ID}::sbx::SBX`;

  // Currency code mapping (0 = CHFX, 1 = TRYB, 2 = SEKX)
  const currencyCodes: Record<Currency, number> = {
    USDC: -1, // USDC doesn't have a code, it's handled separately
    CHFX: 0,
    TRYB: 1,
    SEKX: 2,
  };

  // Currency to price pair mapping
  const currencyPricePairs: Record<Currency, string> = {
    USDC: 'USDC-USD',
    CHFX: 'USD-CHF',
    TRYB: 'USD-TRY',
    SEKX: 'USD-SEK',
  };

  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction({
    onSuccess: (result) => {
      setIsUnstaking(false);
      setSnackbar({ show: true, digest: result.digest, error: false });
      if (snackbarTimeoutRef.current) {
        clearTimeout(snackbarTimeoutRef.current);
      }
      snackbarTimeoutRef.current = setTimeout(() => {
        setSnackbar({ show: false });
      }, 5000);
      // Refresh SBX balance after successful unstake
      fetchSbxBalance();
    },
    onError: (error) => {
      try {
        console.error('Transaction failed:', error);
        setIsUnstaking(false);
        
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
        setIsUnstaking(false);
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

  // Fetch SBX balance from wallet
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

  // Fetch SBX balance when wallet connects
  useEffect(() => {
    if (isWalletConnected) {
      fetchSbxBalance();
      // Refresh balance periodically
      const interval = setInterval(fetchSbxBalance, 10000);
      return () => clearInterval(interval);
    } else {
      setSbxBalance("0.000000");
    }
  }, [isWalletConnected, currentAccount, client]);

  // Fetch price for toCurrency
  useEffect(() => {
    if (!toCurrency) {
      setToCurrencyPrice(0);
      return;
    }

    const fetchPrice = async () => {
      setLoadingToPrice(true);
      try {
        const pair = currencyPricePairs[toCurrency];
        const response = await fetch(`/api/currency-price?pair=${pair}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.price) {
            let priceInUSD = data.price;
            
            if (toCurrency !== 'USDC') {
              priceInUSD = data.price > 0 ? 1 / data.price : 0;
            }
            
            setToCurrencyPrice(priceInUSD);
          } else {
            setToCurrencyPrice(toCurrency === 'USDC' ? 1.00 : 0);
          }
        } else {
          setToCurrencyPrice(toCurrency === 'USDC' ? 1.00 : 0);
        }
      } catch (error) {
        console.error(`Error fetching ${toCurrency} price:`, error);
        setToCurrencyPrice(toCurrency === 'USDC' ? 1.00 : 0);
      } finally {
        setLoadingToPrice(false);
      }
    };

    fetchPrice();
  }, [toCurrency]);

  // Calculate unstake rate using the pool contract logic
  useEffect(() => {
    if (!toCurrency) {
      setToAmount("0");
      setUnstakeFeeBps(0);
      setUnstakeTier(null);
      setUnstakeToPriceMu(0);
      return;
    }

    const amount = parseFloat(sbxAmount) || 0;
    if (amount === 0) {
      setToAmount("0");
      setUnstakeFeeBps(0);
      setUnstakeTier(null);
      setUnstakeToPriceMu(0);
      return;
    }

    const calculateUnstakeRate = async () => {
      setLoadingUnstakeRate(true);
      try {
        const response = await fetch(
          `/api/unstake-rate?toCurrency=${toCurrency}&amount=${amount}`
        );

        if (response.ok) {
          const data = await response.json();
          setToAmount(data.amountOut.toFixed(6));
          setUnstakeFeeBps(data.feeBps);
          setUnstakeTier(data.tier);
          if (data.toPriceMu) {
            setUnstakeToPriceMu(data.toPriceMu);
          }
        } else {
          const errorData = await response.json().catch(() => ({ error: response.statusText }));
          console.error('Failed to fetch unstake rate:', response.status, errorData);
          
          // Fallback to simple calculation if API fails
          if (toCurrencyPrice > 0) {
            // SBX is 1:1 with USD, so amountOut = amount * toCurrencyPrice (before fees)
            const calculatedAmount = amount * toCurrencyPrice * 0.997; // Apply 0.3% fee
            setToAmount(calculatedAmount.toFixed(6));
            setUnstakeFeeBps(30); // Default 0.3%
            setUnstakeTier(1);
          } else {
            setToAmount("0");
            if (unstakeFeeBps === 0) {
              setUnstakeFeeBps(30);
            }
            setUnstakeTier(null);
          }
        }
      } catch (error) {
        console.error('Error calculating unstake rate:', error);
        if (toCurrencyPrice > 0) {
          const calculatedAmount = amount * toCurrencyPrice * 0.997;
          setToAmount(calculatedAmount.toFixed(6));
          setUnstakeFeeBps(30);
          setUnstakeTier(1);
        } else {
          setToAmount("0");
          setUnstakeFeeBps(0);
          setUnstakeTier(null);
        }
      } finally {
        setLoadingUnstakeRate(false);
      }
    };

    calculateUnstakeRate();
  }, [sbxAmount, toCurrency, toCurrencyPrice]);

  const handleConnectWallet = () => {
    setIsConnectModalOpen(true);
  };

  const handlePercentageClick = (percentage: number) => {
    const balance = parseFloat(sbxBalance) || 0;
    const amount = (balance * percentage) / 100;
    setSbxAmount(amount.toFixed(6));
  };

  const handleUnstake = async () => {
    if (!currentAccount || !client || !toCurrency) {
      alert("Please connect your wallet and select a currency");
      return;
    }

    const amount = parseFloat(sbxAmount);
    if (amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (unstakeFeeBps === 0) {
      alert("Please wait for unstake rate calculation");
      return;
    }

    setIsUnstaking(true);

    try {
      // Convert amount to micro units (6 decimals)
      const amountMicro = BigInt(Math.floor(amount * 1_000_000));

      // Get account object
      const accountObjects = await client.getOwnedObjects({
        owner: currentAccount.address,
        filter: { StructType: `${POOL_PACKAGE_ID}::sbx_pool::Account` },
        options: { showContent: true, showType: true },
      });

      if (!accountObjects.data || accountObjects.data.length === 0) {
        alert("Please create an account first by staking");
        setIsUnstaking(false);
        return;
      }

      const accountObjectId = accountObjects.data[0].data?.objectId;
      if (!accountObjectId) {
        alert("Failed to get account object");
        setIsUnstaking(false);
        return;
      }

      // Get SBX coin objects
      const coins = await client.getCoins({
        owner: currentAccount.address,
        coinType: SBX_COIN_TYPE,
      });

      if (!coins.data || coins.data.length === 0) {
        alert("No SBX tokens found in your wallet");
        setIsUnstaking(false);
        return;
      }

      // Calculate total balance
      const totalBalance = coins.data.reduce((sum, coin) => sum + BigInt(coin.balance || 0), BigInt(0));
      if (totalBalance < amountMicro) {
        alert(`Insufficient SBX balance. You have ${Number(totalBalance) / 1_000_000} SBX`);
        setIsUnstaking(false);
        return;
      }

      // Build transaction
      const txb = new Transaction();
      txb.setSender(currentAccount.address);
      const accountRef = txb.object(accountObjectId);
      const poolRef = txb.object(POOL_OBJECT_ID);
      const registryRef = txb.object(REGISTRY_OBJECT_ID);

      // Fetch all three prices needed for the contract
      const pricePromises: Promise<number>[] = [];
      const currencies = ['CHFX', 'TRYB', 'SEKX'];
      
      for (const curr of currencies) {
        const pair = currencyPricePairs[curr as Currency];
        pricePromises.push(
          fetch(`/api/currency-price?pair=${pair}`)
            .then(res => res.json())
            .then(data => {
              // Convert to micro-USD (invert for non-USDC)
              const price = data.price || 0;
              return curr === 'USDC' ? price * 1_000_000 : (1 / price) * 1_000_000;
            })
            .catch(() => 0)
        );
      }

      const [chfxPriceMu, trybPriceMu, sekxPriceMu] = await Promise.all(pricePromises);

      if (chfxPriceMu === 0 || trybPriceMu === 0 || sekxPriceMu === 0) {
        alert("Failed to fetch currency prices. Please try again.");
        setIsUnstaking(false);
        return;
      }

      // Get SBX coin object
      const coinObject = coins.data[0];
      const coinObjectId = coinObject.coinObjectId;
      const coinBalance = BigInt(coinObject.balance || 0);
      
      // Split coin if needed to get exact amount
      const firstCoin = txb.object(coinObjectId);
      let coinToBurn: any;
      
      if (coinBalance === amountMicro) {
        // Exact amount - use whole coin
        coinToBurn = firstCoin;
      } else if (coinBalance > amountMicro) {
        // Split to get exact amount
        txb.splitCoins(firstCoin, [amountMicro]);
        coinToBurn = { $kind: 'NestedResult' as const, NestedResult: [0, 0] };
      } else {
        throw new Error(`Insufficient balance: need ${amountMicro}, have ${coinBalance}`);
      }
      
      // Call unstake function based on currency
      // All functions require: account, pool, registry, sbx_coin, chfx_price, tryb_price, sekx_price
      if (toCurrency === 'USDC') {
        txb.moveCall({
          target: `${POOL_PACKAGE_ID}::sbx_pool::unstake_usdc`,
          arguments: [
            accountRef,
            poolRef,
            registryRef,
            coinToBurn,
            txb.pure.u64(Math.floor(chfxPriceMu)),
            txb.pure.u64(Math.floor(trybPriceMu)),
            txb.pure.u64(Math.floor(sekxPriceMu)),
          ],
        });
      } else if (toCurrency === 'CHFX') {
        txb.moveCall({
          target: `${POOL_PACKAGE_ID}::sbx_pool::unstake_chfx`,
          arguments: [
            accountRef,
            poolRef,
            registryRef,
            coinToBurn,
            txb.pure.u64(Math.floor(chfxPriceMu)),
            txb.pure.u64(Math.floor(trybPriceMu)),
            txb.pure.u64(Math.floor(sekxPriceMu)),
          ],
        });
      } else if (toCurrency === 'TRYB') {
        txb.moveCall({
          target: `${POOL_PACKAGE_ID}::sbx_pool::unstake_tryb`,
          arguments: [
            accountRef,
            poolRef,
            registryRef,
            coinToBurn,
            txb.pure.u64(Math.floor(chfxPriceMu)),
            txb.pure.u64(Math.floor(trybPriceMu)),
            txb.pure.u64(Math.floor(sekxPriceMu)),
          ],
        });
      } else if (toCurrency === 'SEKX') {
        txb.moveCall({
          target: `${POOL_PACKAGE_ID}::sbx_pool::unstake_sekx`,
          arguments: [
            accountRef,
            poolRef,
            registryRef,
            coinToBurn,
            txb.pure.u64(Math.floor(chfxPriceMu)),
            txb.pure.u64(Math.floor(trybPriceMu)),
            txb.pure.u64(Math.floor(sekxPriceMu)),
          ],
        });
      }

      // Execute transaction
      try {
        signAndExecuteTransaction({
          transaction: txb as any,
        });
      } catch (syncError: any) {
        console.error('Synchronous error in signAndExecuteTransaction:', syncError);
        setIsUnstaking(false);
        
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
        console.error('Unstake error:', error);
        setIsUnstaking(false);
        
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
          errorMessage = 'Unstake failed';
        }
        
        setSnackbar({ 
          show: true, 
          error: true, 
          message: `Unstake failed: ${errorMessage}` 
        });
        if (snackbarTimeoutRef.current) {
          clearTimeout(snackbarTimeoutRef.current);
        }
        snackbarTimeoutRef.current = setTimeout(() => {
          setSnackbar({ show: false });
        }, 5000);
      } catch (handlerError) {
        console.error('Error in error handler:', handlerError);
        setIsUnstaking(false);
        setSnackbar({ show: true, error: true, message: 'Unstake failed' });
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

  // Calculate fee in USD
  const feeUsd = (parseFloat(sbxAmount) || 0) * (unstakeFeeBps / 10000);

  return (
    <AppLayout activeTab="unstake">
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
            Unstake currencies
          </h2>

          {/* Amount to Unstake Container */}
          <div className="bg-white/3 rounded-2xl border border-white/10 ring-1 ring-white/10 backdrop-blur-xl p-6 mb-4">
            <label className="text-zinc-400 text-[11px] font-medium mb-3 block uppercase tracking-wider">
              AMOUNT TO UNSTAKE
            </label>
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
                  className={`w-full bg-transparent text-[34px] sm:text-[36px] font-semibold outline-none placeholder:text-zinc-600 leading-none pr-12 ${
                    parseFloat(sbxAmount) === 0 || sbxAmount === "" || sbxAmount === "0" ? "text-zinc-500" : "text-white"
                  }`}
                />
                <span className="absolute right-0 top-0 text-zinc-500 text-sm font-medium pt-1">SBX</span>
                <p className="text-zinc-500 text-sm mt-2">${(parseFloat(sbxAmount) || 0).toFixed(2)}</p>
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
            
            {/* Percentage Buttons */}
            <div className="flex items-center gap-2 mb-2">
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
                Balance: {sbxBalance} SBX
              </div>
            </div>
          </div>

          {/* Transaction Flow Indicator */}
          <div className="flex justify-center mb-4">
            <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
                <path d="M12 5v14M19 12l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* You'll Receive Container */}
          <div className="bg-white/3 rounded-2xl border border-white/10 ring-1 ring-white/10 backdrop-blur-xl p-6 mb-5">
            <label className="text-zinc-400 text-[11px] font-medium mb-3 block uppercase tracking-wider">
              YOU'LL RECEIVE
            </label>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={loadingUnstakeRate ? "..." : toAmount}
                  readOnly
                  className={`w-full bg-transparent text-[34px] sm:text-[36px] font-semibold outline-none leading-none ${
                    parseFloat(toAmount) === 0 || toAmount === "" || toAmount === "0" || loadingUnstakeRate ? "text-zinc-500" : "text-white"
                  }`}
                />
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-zinc-500 text-sm">
                    {loadingUnstakeRate ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="w-3 h-3 border border-zinc-500 border-t-transparent rounded-full animate-spin"></span>
                        Calculating...
                      </span>
                    ) : toCurrency && toCurrencyPrice > 0 ? (
                      `$${((parseFloat(toAmount) || 0) * toCurrencyPrice).toFixed(2)}`
                    ) : (
                      "$0.00"
                    )}
                  </p>
                  {unstakeFeeBps > 0 && unstakeTier && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      unstakeTier === 1 
                        ? "bg-green-500/20 text-green-400" 
                        : "bg-red-500/20 text-red-400"
                    }`}>
                      Fee: {(unstakeFeeBps / 100).toFixed(2)}% {unstakeTier === 1 ? "(Healthy)" : "(High Fee)"}
                    </span>
                  )}
                </div>
              </div>
              <div className="px-4 py-2.5 rounded-full bg-white/10 text-white font-medium text-sm border border-white/15 backdrop-blur-xl ring-1 ring-inset ring-white/10 flex items-center gap-2 flex-shrink-0">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-white/60 to-white/20 ring-1 ring-inset ring-white/40 flex-shrink-0" />
                <span>{toCurrency}</span>
              </div>
            </div>
          </div>

          {/* Withdrawal Fee Details */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-zinc-500 text-[10px] font-medium uppercase tracking-wider">WITHDRAWAL FEE</span>
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 text-[10px]">${feeUsd.toFixed(4)}</span>
                <span className="text-green-400 text-[10px] font-medium">{(unstakeFeeBps / 100).toFixed(2)}%</span>
              </div>
            </div>
            <p className="text-zinc-600 text-[9px] italic">
              Fees depend on pool depth, healthy pools pay higher fees (up to 50%) to protect liquidity.
            </p>
          </div>

          {/* Connect Wallet / Unstake Button */}
          <button
            onClick={isWalletConnected ? handleUnstake : handleConnectWallet}
            disabled={isUnstaking || !toCurrency || parseFloat(sbxAmount) <= 0 || parseFloat(toAmount) <= 0 || loadingUnstakeRate}
            className="w-full py-4 rounded-xl font-semibold text-black text-base transition-all bg-gradient-to-r from-zinc-200/80 to-white/70 hover:to-white ring-1 ring-inset ring-white/30 shadow-[0_4px_20px_rgba(255,255,255,0.12)] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUnstaking ? "Unstaking..." : isWalletConnected ? "Unstake" : "Connect Wallet"}
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
            answer: "Fees depend on pool depth: healthy pools pay 0.3% fee by default, while unhealthy pools (low liquidity) pay higher fees (up to 50%) to protect liquidity."
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

      {/* Staked Currency Selection Modal */}
      <StakedCurrencyModal
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
