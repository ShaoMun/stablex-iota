import { useState, useEffect, useRef } from "react";
import CurrencyModal from "@/components/CurrencyModal";
import AppLayout from "@/components/AppLayout";
import FAQ from "@/components/FAQ";
import { useCurrentAccount, ConnectModal, useSignAndExecuteTransaction, useIotaClient } from "@iota/dapp-kit";
import { Transaction } from "@iota/iota-sdk/transactions";
import { useAccount } from "wagmi";
import { ethers } from "ethers";
import { useWalletType } from "@/lib/useWalletType";
import { TOKEN_ADDRESSES } from "@/lib/addTokenToMetaMask";

type Currency = "USDC" | "CHFX" | "TRYB" | "SEKX";

export default function SwapPage() {
  const [fromCurrency, setFromCurrency] = useState<Currency | null>(null);
  const [toCurrency, setToCurrency] = useState<Currency | null>(null);
  const [fromAmount, setFromAmount] = useState<string>("0");
  const [toAmount, setToAmount] = useState<string>("0");
  const [isFromCurrencyModalOpen, setIsFromCurrencyModalOpen] = useState(false);
  const [isToCurrencyModalOpen, setIsToCurrencyModalOpen] = useState(false);
  const [fromCurrencyPrice, setFromCurrencyPrice] = useState<number>(0);
  const [toCurrencyPrice, setToCurrencyPrice] = useState<number>(0);
  const [loadingFromPrice, setLoadingFromPrice] = useState<boolean>(false);
  const [loadingToPrice, setLoadingToPrice] = useState<boolean>(false);
  const [swapFeeBps, setSwapFeeBps] = useState<number>(0);
  const [swapTier, setSwapTier] = useState<1 | 2 | null>(null);
  const [loadingSwapRate, setLoadingSwapRate] = useState<boolean>(false);
  // Store prices from API to ensure exact match with calculation
  const [swapFromPriceMu, setSwapFromPriceMu] = useState<number>(0);
  const [swapToPriceMu, setSwapToPriceMu] = useState<number>(0);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  
  const currentAccount = useCurrentAccount();
  const evmAccount = useAccount();
  const walletType = useWalletType();
  const isWalletConnected = !!currentAccount || evmAccount.isConnected;
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const client = useIotaClient();
  const [isSwapping, setIsSwapping] = useState(false);
  const [snackbar, setSnackbar] = useState<{ show: boolean; digest?: string; txHash?: string; error?: boolean; message?: string; isEVM?: boolean }>({ show: false });
  const snackbarTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // L1 Contract addresses
  const POOL_PACKAGE_ID = "0x1cf79de8cac02b52fa384df41e7712b5bfadeae2d097a818008780cf7d7783c6";
  const POOL_OBJECT_ID = "0x8587158f53289362bb94530c6e174ae414e6eea32c9400cfc6da2704e80c5517";
  const REGISTRY_OBJECT_ID = "0xb1e480f286dfb4e668235acca148be2ec901aedeed62d79aa4a1e5d01642c4ad";

  // EVM Contract addresses
  const EVM_POOL_ADDRESS = process.env.NEXT_PUBLIC_EVM_POOL_ADDRESS || "0x0Bd0C0F30b84007fcDC44756E077BbF91d12b48d";

  // Currency code mapping (0 = CHFX, 1 = TRYB, 2 = SEKX)
  const currencyCodes: Record<Currency, number> = {
    USDC: 0, // Not used in L1 swaps, but required for type
    CHFX: 0,
    TRYB: 1,
    SEKX: 2,
  };

  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction({
    onSuccess: (result) => {
      setIsSwapping(false);
      setSnackbar({ show: true, digest: result.digest, error: false });
      if (snackbarTimeoutRef.current) {
        clearTimeout(snackbarTimeoutRef.current);
      }
      snackbarTimeoutRef.current = setTimeout(() => {
        setSnackbar({ show: false });
      }, 5000);
    },
    onError: (error) => {
      try {
        console.error('Transaction failed:', error);
        setIsSwapping(false);
        
        // Safely extract error message
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
          // If we can't extract message, use default
          errorMessage = 'Transaction failed';
        }
        
        // Check if user rejected the transaction
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
        // If error handler itself fails, just log and set a simple message
        console.error('Error in error handler:', handlerError);
        setIsSwapping(false);
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

  // Currency to price pair mapping
  const currencyPricePairs: Record<Currency, string> = {
    USDC: 'USDC-USD',
    CHFX: 'USD-CHF',
    TRYB: 'USD-TRY',
    SEKX: 'USD-SEK',
  };

  // Trigger animation on mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch price for fromCurrency
  useEffect(() => {
    if (!fromCurrency) {
      setFromCurrencyPrice(0);
      return;
    }

    const fetchPrice = async () => {
      setLoadingFromPrice(true);
      try {
        const pair = currencyPricePairs[fromCurrency];
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
            if (fromCurrency !== 'USDC') {
              priceInUSD = data.price > 0 ? 1 / data.price : 0;
            }
            
            setFromCurrencyPrice(priceInUSD);
          } else {
            setFromCurrencyPrice(0);
          }
        } else {
          // Set fallback: USDC defaults to 1.00 if API fails, others to 0
          if (fromCurrency === 'USDC') {
            setFromCurrencyPrice(1.00);
          } else {
            setFromCurrencyPrice(0);
          }
        }
      } catch (error) {
        console.error(`Error fetching ${fromCurrency} price:`, error);
        // Set fallback: USDC defaults to 1.00 if API fails, others to 0
        if (fromCurrency === 'USDC') {
          setFromCurrencyPrice(1.00);
        } else {
          setFromCurrencyPrice(0);
        }
      } finally {
        setLoadingFromPrice(false);
      }
    };

    fetchPrice();
  }, [fromCurrency]);

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
            // Oracle shows USD per currency (e.g., USD/CHF = 0.92 means 1 USD = 0.92 CHF)
            // We want to show currency in USD (e.g., 1 CHF = 1/0.92 = 1.087 USD)
            // So we need to invert: 1 / oracle_price
            let priceInUSD = data.price;
            
            // For USDC-USD, the oracle already shows USDC in USD, so no inversion needed
            // For USD-CHF, USD-TRY, USD-SEK, we need to invert
            if (toCurrency !== 'USDC') {
              priceInUSD = data.price > 0 ? 1 / data.price : 0;
            }
            
            setToCurrencyPrice(priceInUSD);
          } else {
            setToCurrencyPrice(0);
          }
        } else {
          // Set fallback: USDC defaults to 1.00 if API fails, others to 0
          if (toCurrency === 'USDC') {
            setToCurrencyPrice(1.00);
          } else {
            setToCurrencyPrice(0);
          }
        }
      } catch (error) {
        console.error(`Error fetching ${toCurrency} price:`, error);
        // Set fallback: USDC defaults to 1.00 if API fails, others to 0
        if (toCurrency === 'USDC') {
          setToCurrencyPrice(1.00);
        } else {
          setToCurrencyPrice(0);
        }
      } finally {
        setLoadingToPrice(false);
      }
    };

    fetchPrice();
  }, [toCurrency]);

  // Calculate swap rate using the pool contract logic with three-tier fees
  useEffect(() => {
    // If either currency is not selected, keep toAmount at 0
    if (!fromCurrency || !toCurrency) {
      setToAmount("0");
      setSwapFeeBps(0);
      setSwapTier(null);
      setSwapFromPriceMu(0);
      setSwapToPriceMu(0);
      return;
    }

    const amount = parseFloat(fromAmount) || 0;
    if (amount === 0) {
      setToAmount("0");
      setSwapFeeBps(0);
      setSwapTier(null);
      setSwapFromPriceMu(0);
      setSwapToPriceMu(0);
      return;
    }

    const calculateSwapRate = async () => {
      setLoadingSwapRate(true);
      try {
        const response = await fetch(
          `/api/swap-rate?fromCurrency=${fromCurrency}&toCurrency=${toCurrency}&amount=${amount}`
        );

        if (response.ok) {
          const data = await response.json();
          setToAmount(data.amountOut.toFixed(6));
          setSwapFeeBps(data.feeBps);
          setSwapTier(data.tier);
          // Store prices from API to use in transaction
          if (data.fromPriceMu && data.toPriceMu) {
            setSwapFromPriceMu(data.fromPriceMu);
            setSwapToPriceMu(data.toPriceMu);
          }
        } else {
          const errorData = await response.json().catch(() => ({ error: response.statusText }));
          console.error('Failed to fetch swap rate:', response.status, errorData);
          
          // Fallback to simple calculation if API fails
          if (fromCurrencyPrice > 0 && toCurrencyPrice > 0) {
            const exchangeRate = fromCurrencyPrice / toCurrencyPrice;
            const calculatedAmount = amount * exchangeRate;
            setToAmount(calculatedAmount.toFixed(6));
            // Use a default fee (5 bps = 0.05%) so button doesn't get disabled
            setSwapFeeBps(5);
            setSwapTier(1);
          } else {
            setToAmount("0");
            // Keep previous swapFeeBps if available, otherwise use default
            if (swapFeeBps === 0) {
              setSwapFeeBps(5); // Default fee so button isn't disabled
            }
            setSwapTier(null);
          }
        }
      } catch (error) {
        console.error('Error calculating swap rate:', error);
        // Fallback to simple calculation if API fails
        if (fromCurrencyPrice > 0 && toCurrencyPrice > 0) {
          const exchangeRate = fromCurrencyPrice / toCurrencyPrice;
          const calculatedAmount = amount * exchangeRate;
          setToAmount(calculatedAmount.toFixed(6));
          setSwapFeeBps(0);
          setSwapTier(null);
        } else {
          setToAmount("0");
          setSwapFeeBps(0);
          setSwapTier(null);
        }
      } finally {
        setLoadingSwapRate(false);
      }
    };

    calculateSwapRate();
  }, [fromAmount, fromCurrency, toCurrency]);

  const handleConnectWallet = () => {
    setIsConnectModalOpen(true);
  };

  const handleSwap = async () => {
    // Check which wallet is connected
    if (walletType === 'evm') {
      await handleSwapEVM();
    } else if (walletType === 'iota') {
      await handleSwapL1();
    } else {
      alert("Please connect either IOTA or EVM wallet first");
      return;
    }
  };

  // EVM Swap (NEW FUNCTION)
  const handleSwapEVM = async () => {
    if (!evmAccount.isConnected || !evmAccount.address) {
      alert("Please connect your EVM wallet first");
      return;
    }

    if (!EVM_POOL_ADDRESS) {
      alert("EVM Pool contract not deployed yet. Please use IOTA L1 for now.");
      return;
    }

    if (!fromCurrency || !toCurrency) {
      alert("Please select currencies");
      return;
    }

    const amount = parseFloat(fromAmount);
    if (amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (swapFeeBps === 0) {
      alert("Please wait for swap rate calculation");
      return;
    }

    setIsSwapping(true);

    try {
      const amountMicro = BigInt(Math.floor(amount * 1_000_000));

      // Get provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const signer = await provider.getSigner();

      // Get token address for fromCurrency
      const fromTokenAddress = TOKEN_ADDRESSES[fromCurrency];
      if (!fromTokenAddress) {
        throw new Error(`Token address not found for ${fromCurrency}`);
      }

      // Approve token spending
      const tokenContract = new ethers.Contract(
        fromTokenAddress,
        [
          "function approve(address spender, uint256 amount) external returns (bool)",
          "function allowance(address owner, address spender) external view returns (uint256)",
        ],
        signer
      );

      const currentAllowance = await tokenContract.allowance(evmAccount.address, EVM_POOL_ADDRESS);
      if (currentAllowance < amountMicro) {
        const approveTx = await tokenContract.approve(EVM_POOL_ADDRESS, ethers.MaxUint256);
        await approveTx.wait();
      }

      // Get prices (convert to uint64)
      const fromPriceMu = swapFromPriceMu > 0 
        ? parseInt(String(swapFromPriceMu), 10)
        : Math.floor(fromCurrencyPrice * 1_000_000);
      const toPriceMu = swapToPriceMu > 0 
        ? parseInt(String(swapToPriceMu), 10)
        : Math.floor(toCurrencyPrice * 1_000_000);

      // Currency codes: CHFX=1, TRYB=2, SEKX=3 (matching contract)
      const currencyCodesEVM: Record<Currency, number> = {
        USDC: 0, // Not used in EVM swaps, but required for type
        CHFX: 1,
        TRYB: 2,
        SEKX: 3,
      };

      const fromType = currencyCodesEVM[fromCurrency];
      const toType = currencyCodesEVM[toCurrency];

      // Call swap function
      const poolContract = new ethers.Contract(
        EVM_POOL_ADDRESS,
        [
          "function swapRegional(uint8 fromType, uint8 toType, uint256 amountIn, uint64 priceFromMu, uint64 priceToMu) external",
        ],
        signer
      );

      const tx = await poolContract.swapRegional(
        fromType,
        toType,
        amountMicro,
        fromPriceMu,
        toPriceMu
      );

      await tx.wait();

      setIsSwapping(false);
      setSnackbar({ show: true, txHash: tx.hash, error: false, isEVM: true });
      if (snackbarTimeoutRef.current) {
        clearTimeout(snackbarTimeoutRef.current);
      }
      snackbarTimeoutRef.current = setTimeout(() => {
        setSnackbar({ show: false });
      }, 5000);
    } catch (error: any) {
      console.error("EVM Swap error:", error);
      setIsSwapping(false);
      setSnackbar({ show: true, error: true, message: error.message || "Swap failed" });
      if (snackbarTimeoutRef.current) {
        clearTimeout(snackbarTimeoutRef.current);
      }
      snackbarTimeoutRef.current = setTimeout(() => {
        setSnackbar({ show: false });
      }, 5000);
    }
  };

  // L1 Swap (existing logic, renamed from handleSwap)
  const handleSwapL1 = async () => {
    if (!currentAccount || !client || !fromCurrency || !toCurrency) {
      alert("Please connect your wallet and select currencies");
      return;
    }

    const amount = parseFloat(fromAmount);
    if (amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (swapFeeBps === 0) {
      alert("Please wait for swap rate calculation");
      return;
    }

    setIsSwapping(true);

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
        setIsSwapping(false);
        return;
      }

      const accountObjectId = accountObjects.data[0].data?.objectId;
      if (!accountObjectId) {
        alert("Failed to get account object");
        setIsSwapping(false);
        return;
      }

      // Get coin objects for fromCurrency
      // Use the correct package ID from POOL_PACKAGE_ID
      const currencyInfo: Record<Currency, { packageAddress: string; coinType: string }> = {
        USDC: {
          packageAddress: POOL_PACKAGE_ID,
          coinType: `${POOL_PACKAGE_ID}::usdc::USDC`
        },
        CHFX: {
          packageAddress: POOL_PACKAGE_ID,
          coinType: `${POOL_PACKAGE_ID}::chfx::CHFX`
        },
        TRYB: {
          packageAddress: POOL_PACKAGE_ID,
          coinType: `${POOL_PACKAGE_ID}::tryb::TRYB`
        },
        SEKX: {
          packageAddress: POOL_PACKAGE_ID,
          coinType: `${POOL_PACKAGE_ID}::sekx::SEKX`
        },
      };
      
      const coinType = currencyInfo[fromCurrency].coinType;

      const coins = await client.getCoins({
        owner: currentAccount.address,
        coinType,
      });

      if (!coins.data || coins.data.length === 0) {
        // Check if user has coins from old package
        const oldPackageId = '0x6bb0ab2db1ff01f7cdb754ef1c459cd300695afcc4a8e6b8d1ab537eb0d30803';
        const oldCoinType = coinType.replace(POOL_PACKAGE_ID, oldPackageId);
        const oldCoins = await client.getCoins({
          owner: currentAccount.address,
          coinType: oldCoinType,
        });
        
        if (oldCoins && oldCoins.data.length > 0) {
          alert(
            `You have ${fromCurrency} coins from the old package. ` +
            `Please get new ${fromCurrency} coins from the new package. ` +
            `The old coins are not compatible with the updated contract.`
          );
          setIsSwapping(false);
          return;
        }
        
        alert(`No ${fromCurrency} coins found in your wallet. Please ensure you have ${fromCurrency} coins from the new package.`);
        setIsSwapping(false);
        return;
      }

      // Calculate total balance
      const totalBalance = coins.data.reduce((sum, coin) => sum + BigInt(coin.balance || 0), BigInt(0));
      if (totalBalance < amountMicro) {
        alert(`Insufficient ${fromCurrency} balance`);
        setIsSwapping(false);
        return;
      }

      // Build transaction
      const txb = new Transaction();
      const accountRef = txb.object(accountObjectId);
      const poolRef = txb.object(POOL_OBJECT_ID);
      const registryRef = txb.object(REGISTRY_OBJECT_ID);

      // Simple approach: one function does everything (like staking)
      // swap_chfx/swap_tryb/swap_sekx: takes coin, adds to reserves, calculates swap, transfers "to" currency
      const swapFunctionName = fromCurrency === 'CHFX' ? 'swap_chfx' : 
                               fromCurrency === 'TRYB' ? 'swap_tryb' : 
                               'swap_sekx';
      
      // Get the coin object - ensure it matches the fromCurrency type
      const coinObject = coins.data[0];
      const coinObjectId = coinObject.coinObjectId;
      const coinBalance = BigInt(coinObject.balance || 0);
      
      // Verify coin type matches fromCurrency (for debugging)
      const expectedCoinType = currencyInfo[fromCurrency].coinType;
      if (coinObject.coinType && coinObject.coinType !== expectedCoinType) {
        console.warn(`Coin type mismatch: expected ${expectedCoinType}, got ${coinObject.coinType}`);
      }
      
      // Get prices and currency codes
      // Use prices from API calculation to ensure exact match
      // Fallback to fetched prices if API prices not available
      const fromPriceMu = swapFromPriceMu > 0 
        ? swapFromPriceMu 
        : Math.floor(fromCurrencyPrice * 1_000_000);
      const toPriceMu = swapToPriceMu > 0 
        ? swapToPriceMu 
        : Math.floor(toCurrencyPrice * 1_000_000);
      const toCode = currencyCodes[toCurrency];
      
      // Split coin if needed to get exact amount
      const firstCoin = txb.object(coinObjectId);
      let coinToSwap: any;
      
      if (coinBalance === amountMicro) {
        // Exact amount - use whole coin
        coinToSwap = firstCoin;
      } else if (coinBalance > amountMicro) {
        // Split to get exact amount
        txb.splitCoins(firstCoin, [amountMicro]);
        // Reference the split coin using NestedResult (command index 0, result index 0)
        // NestedResult: [command_index, result_index] - splitCoins is at index 0, first result is at index 0
        coinToSwap = { $kind: 'NestedResult' as const, NestedResult: [0, 0] };
      } else {
        throw new Error(`Insufficient balance: need ${amountMicro}, have ${coinBalance}`);
      }
      
      // One function call: takes coin, does everything, transfers "to" currency to user
      // In IOTA SDK, coins are passed as object references using txb.object() or Result references
      txb.moveCall({
        target: `${POOL_PACKAGE_ID}::sbx_pool::${swapFunctionName}`,
        arguments: [
          accountRef,      // &mut Account (0)
          poolRef,         // &mut Pool (1)
          registryRef,     // &mut Registry (2)
          coinToSwap,      // Coin<CHFX/TRYB/SEKX> (3) - whole coin or split coin via Result
          txb.pure.u8(toCode),           // to_code (4)
          txb.pure.u64(fromPriceMu),     // price_from_microusd (5)
          txb.pure.u64(toPriceMu),       // price_to_microusd (6)
          txb.pure.u64(swapFeeBps),      // fee_bps (7)
          // ctx: &mut TxContext is automatically added by SDK (8)
        ],
      });

      // Execute transaction
      try {
        signAndExecuteTransaction({
          transaction: txb as any,
        });
      } catch (syncError: any) {
        // Catch any synchronous errors (shouldn't happen, but just in case)
        console.error('Synchronous error in signAndExecuteTransaction:', syncError);
        setIsSwapping(false);
        
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
        console.error('Swap error:', error);
        setIsSwapping(false);
        
        // Safely extract error message
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
          errorMessage = 'Swap failed';
        }
        
        setSnackbar({ 
          show: true, 
          error: true, 
          message: `Swap failed: ${errorMessage}` 
        });
        if (snackbarTimeoutRef.current) {
          clearTimeout(snackbarTimeoutRef.current);
        }
        snackbarTimeoutRef.current = setTimeout(() => {
          setSnackbar({ show: false });
        }, 5000);
      } catch (handlerError) {
        // If error handler itself fails, just set a simple message
        console.error('Error in error handler:', handlerError);
        setIsSwapping(false);
        setSnackbar({ show: true, error: true, message: 'Swap failed' });
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
    if (!snackbar.error) {
      if (snackbar.isEVM && snackbar.txHash) {
        // Open EVM explorer for EVM transactions
        window.open(`https://explorer.evm.testnet.iotaledger.net/tx/${snackbar.txHash}`, '_blank', 'noopener,noreferrer');
      } else if (snackbar.digest) {
        // Open IOTA L1 explorer for L1 transactions
        window.open(`https://explorer.iota.org/transaction/${snackbar.digest}?network=testnet`, '_blank', 'noopener,noreferrer');
      }
    }
  };

  return (
    <AppLayout activeTab="swap">
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
                  <p className="text-zinc-500 text-sm mt-2">
                    {loadingFromPrice ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="w-3 h-3 border border-zinc-500 border-t-transparent rounded-full animate-spin"></span>
                        Loading...
                      </span>
                    ) : fromCurrency && fromCurrencyPrice > 0 ? (
                      `$${((parseFloat(fromAmount) || 0) * fromCurrencyPrice).toFixed(2)}`
                    ) : (
                      "$0.00"
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setIsFromCurrencyModalOpen(true)}
                  className="px-4 py-2.5 rounded-full bg-white/10 text-white font-medium text-sm border border-white/15 hover:bg-white/15 transition-all flex items-center gap-2 flex-shrink-0 backdrop-blur-xl ring-1 ring-inset ring-white/10"
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-white/60 to-white/20 ring-1 ring-inset ring-white/40 flex-shrink-0" />
                  <span>{fromCurrency || "Select Token"}</span>
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
                    value={loadingSwapRate ? "..." : toAmount}
                    readOnly
                    className={`w-full bg-transparent text-[34px] sm:text-[36px] font-semibold outline-none leading-none ${
                      parseFloat(toAmount) === 0 || toAmount === "" || toAmount === "0" || loadingSwapRate ? "text-zinc-500" : "text-white"
                    }`}
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-zinc-500 text-sm">
                      {loadingSwapRate ? (
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
                    {swapFeeBps > 0 && swapTier && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        swapTier === 1 
                          ? "bg-green-500/20 text-green-400" 
                          : "bg-red-500/20 text-red-400"
                      }`}>
                        Fee: {(swapFeeBps / 100).toFixed(2)}% {swapTier === 1 ? "(Healthy)" : "(High Fee)"}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setIsToCurrencyModalOpen(true)}
                  className="px-4 py-2.5 rounded-full bg-white/10 text-white font-medium text-sm border border-white/15 hover:bg-white/15 transition-all flex items-center gap-2 flex-shrink-0 backdrop-blur-xl ring-1 ring-inset ring-white/10"
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-white/60 to-white/20 ring-1 ring-inset ring-white/40 flex-shrink-0" />
                  <span>{toCurrency || "Select Token"}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Connect Wallet / Swap Button */}
            <button
              onClick={isWalletConnected ? handleSwap : handleConnectWallet}
              disabled={!walletType || isSwapping || !fromCurrency || !toCurrency || parseFloat(fromAmount) <= 0 || parseFloat(toAmount) <= 0 || loadingSwapRate}
              className="w-full py-4 rounded-xl font-semibold text-black text-base transition-all bg-gradient-to-r from-zinc-200/80 to-white/70 hover:to-white ring-1 ring-inset ring-white/30 shadow-[0_4px_20px_rgba(255,255,255,0.12)] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSwapping ? "Swapping..." : walletType ? "Swap" : "Connect Wallet"}
            </button>
            {walletType && (
              <p className="text-xs text-zinc-500 mt-2 text-center">
                Connected: {walletType === 'iota' ? 'IOTA L1' : 'EVM'}
              </p>
            )}
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
          // Only accept currencies supported by swap page
          if (currency === "USDC" || currency === "CHFX" || currency === "TRYB" || currency === "SEKX") {
            setFromCurrency(currency as Currency);
            setIsFromCurrencyModalOpen(false);
          }
        }}
        excludedCurrencies={["USDC"]}
        refreshTrigger={snackbar.digest} // Refresh balances when transaction completes
      />
      <CurrencyModal
        isOpen={isToCurrencyModalOpen}
        onClose={() => setIsToCurrencyModalOpen(false)}
        selectedCurrency={toCurrency}
        onSelect={(currency) => {
          // Only accept currencies supported by swap page
          if (currency === "USDC" || currency === "CHFX" || currency === "TRYB" || currency === "SEKX") {
            setToCurrency(currency as Currency);
            setIsToCurrencyModalOpen(false);
          }
        }}
        excludedCurrencies={["USDC"]}
        refreshTrigger={snackbar.digest} // Refresh balances when transaction completes
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
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 ${snackbar.error || (!snackbar.digest && !snackbar.txHash) ? '' : 'cursor-pointer'}`}
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
              <div className="flex items-center gap-2">
                <span className="text-white font-medium text-sm">
                  {snackbar.error ? (snackbar.message || 'Transaction failed') : 'Transaction successful'}
                </span>
                {!snackbar.error && (snackbar.digest || snackbar.txHash) && (
                  <span className="text-white/70 text-xs">
                    {snackbar.isEVM ? '(EVM)' : '(L1)'}
                  </span>
                )}
              </div>
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

