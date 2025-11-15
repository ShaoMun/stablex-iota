import { useState, useEffect, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import FAQ from "@/components/FAQ";
import { useCurrentAccount, ConnectModal, useSignAndExecuteTransaction, useIotaClient } from "@iota/dapp-kit";
import { Transaction } from "@iota/iota-sdk/transactions";

export default function WithdrawPage() {
  const [sbxAmount, setSbxAmount] = useState<string>("0");
  const [toAmount, setToAmount] = useState<string>("0");
  const [sbxBalance, setSbxBalance] = useState<string>("0.000000");
  const [unstakeFeeBps, setUnstakeFeeBps] = useState<number>(0);
  const [unstakeTier, setUnstakeTier] = useState<1 | 2 | null>(null);
  const [loadingUnstakeRate, setLoadingUnstakeRate] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  
  const currentAccount = useCurrentAccount();
  const isWalletConnected = !!currentAccount;
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const client = useIotaClient();
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [snackbar, setSnackbar] = useState<{ show: boolean; digest?: string; error?: boolean; message?: string }>({ show: false });
  const snackbarTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Contract addresses
  const POOL_PACKAGE_ID = "0x1cf79de8cac02b52fa384df41e7712b5bfadeae2d097a818008780cf7d7783c6";
  const POOL_OBJECT_ID = "0x8587158f53289362bb94530c6e174ae414e6eea32c9400cfc6da2704e80c5517";
  const REGISTRY_OBJECT_ID = "0xb1e480f286dfb4e668235acca148be2ec901aedeed62d79aa4a1e5d01642c4ad";
  const SBX_COIN_TYPE = `${POOL_PACKAGE_ID}::sbx::SBX`;

  // Fixed currency for withdraw: SBX -> USDC
  const toCurrency = "USDC" as const;
  const toCurrencyPrice = 1.00; // USDC is always 1:1 with USD

  // Currency to price pair mapping
  const currencyPricePairs: Record<string, string> = {
    USDC: 'USDC-USD',
    CHFX: 'USD-CHF',
    TRYB: 'USD-TRY',
    SEKX: 'USD-SEK',
  };

  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction({
    onSuccess: (result) => {
      setIsWithdrawing(false);
      setSnackbar({ show: true, digest: result.digest, error: false });
      if (snackbarTimeoutRef.current) {
        clearTimeout(snackbarTimeoutRef.current);
      }
      snackbarTimeoutRef.current = setTimeout(() => {
        setSnackbar({ show: false });
      }, 5000);
      // Refresh SBX balance after successful withdraw
      fetchSbxBalance();
    },
    onError: (error) => {
      try {
        console.error('Transaction failed:', error);
        setIsWithdrawing(false);
        
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
        setIsWithdrawing(false);
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

  // Fetch SBX balance from wallet (excluding USDC positions)
  const fetchSbxBalance = async () => {
    if (!currentAccount || !client) {
      setSbxBalance("0.000000");
      return;
    }

    try {
      // Get total SBX balance
      const coins = await client.getCoins({
        owner: currentAccount.address,
        coinType: SBX_COIN_TYPE,
      });

      let totalBalance = BigInt(0);
      if (coins.data && coins.data.length > 0) {
        totalBalance = coins.data.reduce((sum, coin) => sum + BigInt(coin.balance || 0), BigInt(0));
      }

      // Get account object to check USDC deposits
      let usdcStakedAmount = BigInt(0);
      try {
        const accountObjects = await client.getOwnedObjects({
          owner: currentAccount.address,
          filter: { StructType: `${POOL_PACKAGE_ID}::sbx_pool::Account` },
          options: { showContent: true, showType: true },
        });

        if (accountObjects.data && accountObjects.data.length > 0) {
          const accountData = accountObjects.data[0].data?.content;
          if (accountData && 'fields' in accountData) {
            const fields = accountData.fields as any;
            const stakedUsdc = fields?.staked_usdc;
            if (stakedUsdc) {
              usdcStakedAmount = BigInt(stakedUsdc);
            }
          }
        }
      } catch (accountError) {
        // If account doesn't exist or error fetching, assume no USDC deposits
        console.log('No account found or error fetching account:', accountError);
      }

      // Calculate withdrawable balance: total SBX minus USDC-staked amount
      // Note: staked_usdc is the original USDC amount, but SBX was minted after deposit fees
      // We use staked_usdc as an upper bound to be conservative
      const withdrawableBalance = totalBalance > usdcStakedAmount 
        ? totalBalance - usdcStakedAmount 
        : BigInt(0);
      
      const balanceNum = Number(withdrawableBalance) / 1_000_000;
      setSbxBalance(balanceNum.toFixed(6));
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

  // Calculate withdraw rate using the pool contract logic
  useEffect(() => {
    const amount = parseFloat(sbxAmount) || 0;
    if (amount === 0) {
      setToAmount("0");
      setUnstakeFeeBps(0);
      setUnstakeTier(null);
      return;
    }

    const calculateWithdrawRate = async () => {
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
        } else {
          const errorData = await response.json().catch(() => ({ error: response.statusText }));
          console.error('Failed to fetch withdraw rate:', response.status, errorData);
          
          // Fallback to simple calculation if API fails
          // SBX is 1:1 with USD, so amountOut = amount * 1.00 (before fees)
          const calculatedAmount = amount * 0.997; // Apply 0.3% fee
          setToAmount(calculatedAmount.toFixed(6));
          setUnstakeFeeBps(30); // Default 0.3%
          setUnstakeTier(1);
        }
      } catch (error) {
        console.error('Error calculating withdraw rate:', error);
        const calculatedAmount = amount * 0.997;
        setToAmount(calculatedAmount.toFixed(6));
        setUnstakeFeeBps(30);
        setUnstakeTier(1);
      } finally {
        setLoadingUnstakeRate(false);
      }
    };

    calculateWithdrawRate();
  }, [sbxAmount]);

  const handleConnectWallet = () => {
    setIsConnectModalOpen(true);
  };

  const handlePercentageClick = async (percentage: number) => {
    if (!currentAccount || !client) return;
    
    try {
      // Get total SBX balance
      const coins = await client.getCoins({
        owner: currentAccount.address,
        coinType: SBX_COIN_TYPE,
      });

      let totalBalance = BigInt(0);
      if (coins.data && coins.data.length > 0) {
        totalBalance = coins.data.reduce((sum, coin) => sum + BigInt(coin.balance || 0), BigInt(0));
      }

      // Get account object to check USDC deposits
      let usdcStakedAmount = BigInt(0);
      try {
        const accountObjects = await client.getOwnedObjects({
          owner: currentAccount.address,
          filter: { StructType: `${POOL_PACKAGE_ID}::sbx_pool::Account` },
          options: { showContent: true, showType: true },
        });

        if (accountObjects.data && accountObjects.data.length > 0) {
          const accountData = accountObjects.data[0].data?.content;
          if (accountData && 'fields' in accountData) {
            const fields = accountData.fields as any;
            const stakedUsdc = fields?.staked_usdc;
            if (stakedUsdc) {
              usdcStakedAmount = BigInt(stakedUsdc);
            }
          }
        }
      } catch (accountError) {
        // If account doesn't exist or error fetching, assume no USDC deposits
        console.log('No account found or error fetching account:', accountError);
      }

      // Calculate withdrawable balance: total SBX minus USDC-staked amount
      const withdrawableBalance = totalBalance > usdcStakedAmount 
        ? totalBalance - usdcStakedAmount 
        : BigInt(0);
      
      const withdrawableNum = Number(withdrawableBalance) / 1_000_000;
      const targetAmount = (withdrawableNum * percentage) / 100;
      
      // Cap at withdrawable balance
      const finalAmount = Math.min(targetAmount, withdrawableNum);
      
      setSbxAmount(finalAmount.toFixed(6));
    } catch (error) {
      console.error('Error calculating percentage amount:', error);
      // Fallback to simple calculation using displayed balance
      const balance = parseFloat(sbxBalance) || 0;
      const amount = (balance * percentage) / 100;
      setSbxAmount(amount.toFixed(6));
    }
  };

  const handleWithdraw = async () => {
    if (!currentAccount || !client) {
      alert("Please connect your wallet");
      return;
    }

    const amount = parseFloat(sbxAmount);
    if (amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (unstakeFeeBps === 0) {
      alert("Please wait for withdraw rate calculation");
      return;
    }

    setIsWithdrawing(true);

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
        setIsWithdrawing(false);
        return;
      }

      const accountObjectId = accountObjects.data[0].data?.objectId;
      if (!accountObjectId) {
        alert("Failed to get account object");
        setIsWithdrawing(false);
        return;
      }

      // Get account data to check USDC deposits
      const accountData = accountObjects.data[0].data?.content;
      let usdcStakedAmount = BigInt(0);
      if (accountData && 'fields' in accountData) {
        const fields = accountData.fields as any;
        const stakedUsdc = fields?.staked_usdc;
        if (stakedUsdc) {
          usdcStakedAmount = BigInt(stakedUsdc);
        }
      }

      // Get SBX coin objects
      const coins = await client.getCoins({
        owner: currentAccount.address,
        coinType: SBX_COIN_TYPE,
      });

      if (!coins.data || coins.data.length === 0) {
        alert("No SBX tokens found in your wallet");
        setIsWithdrawing(false);
        return;
      }

      // Calculate total balance
      const totalBalance = coins.data.reduce((sum, coin) => sum + BigInt(coin.balance || 0), BigInt(0));
      
      // Calculate withdrawable balance (excluding USDC positions)
      const withdrawableBalance = totalBalance > usdcStakedAmount 
        ? totalBalance - usdcStakedAmount 
        : BigInt(0);
      
      // Check if user has sufficient withdrawable balance
      if (amountMicro > withdrawableBalance) {
        const withdrawableBalanceNum = Number(withdrawableBalance) / 1_000_000;
        if (usdcStakedAmount > 0) {
          alert(`Insufficient withdrawable balance. You have ${withdrawableBalanceNum.toFixed(6)} SBX available for USDC withdrawal (excluding USDC deposits).`);
        } else {
          alert(`Insufficient SBX balance. You have ${withdrawableBalanceNum.toFixed(6)} SBX available.`);
        }
        setIsWithdrawing(false);
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
        const pair = currencyPricePairs[curr];
        pricePromises.push(
          fetch(`/api/currency-price?pair=${pair}`)
            .then(res => res.json())
            .then(data => {
              // Convert to micro-USD (invert for non-USDC)
              const price = data.price || 0;
              return (1 / price) * 1_000_000;
            })
            .catch(() => 0)
        );
      }

      const [chfxPriceMu, trybPriceMu, sekxPriceMu] = await Promise.all(pricePromises);

      if (chfxPriceMu === 0 || trybPriceMu === 0 || sekxPriceMu === 0) {
        alert("Failed to fetch currency prices. Please try again.");
        setIsWithdrawing(false);
        return;
      }

      // Prepare SBX coin for burning
      // Collect coins until we have enough balance, merge them, then split to exact amount
      let coinToBurn: any;
      
      // Find coins that cover the needed amount
      let remaining = amountMicro;
      const coinsToUse: typeof coins.data = [];
      
      for (const coin of coins.data) {
        if (remaining <= 0) break;
        const coinValue = BigInt(coin.balance || 0);
        if (coinValue > 0) {
          coinsToUse.push(coin);
          remaining -= coinValue > remaining ? remaining : coinValue;
        }
      }
      
      if (remaining > 0) {
        throw new Error(`Insufficient SBX balance: need ${amountMicro}, but don't have enough coins`);
      }
      
      if (coinsToUse.length === 1) {
        // Single coin - split if needed
        const coinObject = coinsToUse[0];
        const coinObjectId = coinObject.coinObjectId;
        const coinBalance = BigInt(coinObject.balance || 0);
        const coinRef = txb.object(coinObjectId);
        
        if (coinBalance === amountMicro) {
          // Exact amount - use whole coin
          coinToBurn = coinRef;
        } else {
          // Split to get exact amount
          txb.splitCoins(coinRef, [amountMicro]);
          coinToBurn = { $kind: 'NestedResult' as const, NestedResult: [0, 0] };
        }
      } else {
        // Multiple coins - merge all into first coin, then split to exact amount
        const coinRefs = coinsToUse.map(coin => txb.object(coin.coinObjectId));
        const primaryCoin = coinRefs[0];
        
        // Merge all other coins into the primary coin
        // Each mergeCoins creates a command, so we need to track the command index
        for (let i = 1; i < coinRefs.length; i++) {
          txb.mergeCoins(primaryCoin, [coinRefs[i]]);
        }
        
        // Split to get exact amount
        // splitCoins is at index = number of merge operations
        const splitCommandIndex = coinRefs.length - 1;
        txb.splitCoins(primaryCoin, [amountMicro]);
        coinToBurn = { $kind: 'NestedResult' as const, NestedResult: [splitCommandIndex, 0] };
      }
      
      // Call unstake_usdc function: burns SBX and transfers USDC to user
      // The contract function will:
      // 1. Burn the SBX tokens (reduce total_sbx_supply)
      // 2. Calculate USDC payout (after fees)
      // 3. Transfer USDC from pool reserves to connected wallet
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

      // Execute transaction
      try {
        signAndExecuteTransaction({
          transaction: txb as any,
        });
      } catch (syncError: any) {
        console.error('Synchronous error in signAndExecuteTransaction:', syncError);
        setIsWithdrawing(false);
        
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
        console.error('Withdraw error:', error);
        setIsWithdrawing(false);
        
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
          errorMessage = 'Withdraw failed';
        }
        
        setSnackbar({ 
          show: true, 
          error: true, 
          message: `Withdraw failed: ${errorMessage}` 
        });
        if (snackbarTimeoutRef.current) {
          clearTimeout(snackbarTimeoutRef.current);
        }
        snackbarTimeoutRef.current = setTimeout(() => {
          setSnackbar({ show: false });
        }, 5000);
      } catch (handlerError) {
        console.error('Error in error handler:', handlerError);
        setIsWithdrawing(false);
        setSnackbar({ show: true, error: true, message: 'Withdraw failed' });
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
    <AppLayout activeTab="withdraw">
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
            Withdraw USDC
          </h2>

          {/* Amount to Withdraw Container */}
          <div className="bg-white/3 rounded-2xl border border-white/10 ring-1 ring-white/10 backdrop-blur-xl p-6 mb-4">
            <label className="text-zinc-400 text-[11px] font-medium mb-3 block uppercase tracking-wider">
              AMOUNT TO WITHDRAW
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
              <div className="px-4 py-2.5 rounded-full bg-white/10 text-white font-medium text-sm border border-white/15 backdrop-blur-xl ring-1 ring-inset ring-white/10 flex items-center gap-2 flex-shrink-0">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-white/60 to-white/20 ring-1 ring-inset ring-white/40 flex-shrink-0" />
                <span>SBX</span>
              </div>
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
                    ) : (
                      `$${(parseFloat(toAmount) || 0).toFixed(2)}`
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

          {/* Connect Wallet / Withdraw Button */}
          <button
            onClick={isWalletConnected ? handleWithdraw : handleConnectWallet}
            disabled={isWithdrawing || parseFloat(sbxAmount) <= 0 || parseFloat(toAmount) <= 0 || loadingUnstakeRate}
            className="w-full py-4 rounded-xl font-semibold text-black text-base transition-all bg-gradient-to-r from-zinc-200/80 to-white/70 hover:to-white ring-1 ring-inset ring-white/30 shadow-[0_4px_20px_rgba(255,255,255,0.12)] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isWithdrawing ? "Withdrawing..." : isWalletConnected ? "Withdraw" : "Connect Wallet"}
          </button>
        </div>
      </div>

      {/* FAQ Section */}
      <FAQ
        items={[
          {
            question: "What is the difference between Withdraw and Unstake?",
            answer: "Withdraw (only for regional stakers) keeps your position in the pool—you continue earning rewards. Unstake removes your position—you stop earning rewards. Withdraw is designed to encourage regional staking by providing liquidity while still earning yield."
          },
          {
            question: "What is double yield?",
            answer: "Double yield is the key benefit of withdraw: You can withdraw regional currencies (getting liquidity), then restake them to earn yield again. Since your original position remains in the pool earning rewards, you effectively earn yield on both positions—this is the unique advantage for regional stakers."
          },
          {
            question: "Who can use Withdraw?",
            answer: "Withdraw is only available for regional stakers who originally staked CHFX, TRYB, or SEKX. USDC stakers cannot use withdraw—they must use unstake instead. This design encourages regional currency staking by providing this additional benefit."
          }
        ]}
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

