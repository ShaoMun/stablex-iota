import { useState, useEffect, useRef } from "react";
import CurrencyModal from "@/components/CurrencyModal";
import AppLayout from "@/components/AppLayout";
import FAQ from "@/components/FAQ";
import { useCurrentAccount, ConnectModal, useSignAndExecuteTransaction, useIotaClient } from "@iota/dapp-kit";
import { Transaction } from "@iota/iota-sdk/transactions";

type Currency = "USDC" | "CHFX" | "TRYB" | "SEKX" | "JPYC" | "MYRC" | "XSGD";

// Currency to price pair mapping (same as CurrencyModal)
const currencyPricePairs: Record<Currency, string> = {
  USDC: 'USDC-USD',
  CHFX: 'USD-CHF',
  TRYB: 'USD-TRY',
  SEKX: 'USD-SEK',
  JPYC: 'USD-JPY',
  MYRC: 'USD-MYR',
  XSGD: 'USD-SGD',
};

export default function StakePage() {
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("USDC");
  const [stakeAmount, setStakeAmount] = useState<string>("0");
  const [sbxAmount, setSbxAmount] = useState<string>("0");
  const [apy, setApy] = useState<number>(6.03);
  const [loadingApy, setLoadingApy] = useState<boolean>(false);
  const [estimatedRewards, setEstimatedRewards] = useState<number>(0);
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  const [currencyPrice, setCurrencyPrice] = useState<number>(1.00); // Default to 1.00 for USDC
  const [loadingPrice, setLoadingPrice] = useState<boolean>(false);
  const [isFeesExpanded, setIsFeesExpanded] = useState<boolean>(false);
  
  const currentAccount = useCurrentAccount();
  const isWalletConnected = !!currentAccount;
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const client = useIotaClient();
  const [isStaking, setIsStaking] = useState(false);
  const [snackbar, setSnackbar] = useState<{ show: boolean; digest?: string }>({ show: false });
  const snackbarTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Contract addresses - Updated after redeployment with shared objects
  const POOL_PACKAGE_ID = '0x6ebf91f7fb200377491c41e9a81dbde911a93ff2f8ec7aaa0e3e21fe424c6514';
  // Pool and Registry created as shared objects
  const POOL_OBJECT_ID = process.env.NEXT_PUBLIC_POOL_OBJECT_ID || '0x1f88410b6a652e5f9a31061d7eaa7939b12b3811606070bc2743470f3846756d';
  const REGISTRY_OBJECT_ID = process.env.NEXT_PUBLIC_REGISTRY_OBJECT_ID || '0x967a22966d19e27ced4aea39e5ef90442aa94473b41123445bcd697beae1b5d6';

  const { mutate: signAndExecuteTransaction, mutateAsync: signAndExecuteTransactionAsync } = useSignAndExecuteTransaction({
    onSuccess: (result) => {
      setIsStaking(false);
      setSnackbar({ show: true, digest: result.digest });
      // Auto-hide snackbar after 5 seconds
      if (snackbarTimeoutRef.current) {
        clearTimeout(snackbarTimeoutRef.current);
      }
      snackbarTimeoutRef.current = setTimeout(() => {
        setSnackbar({ show: false });
      }, 5000);
    },
    onError: (error) => {
      console.error('Transaction failed:', error);
      setIsStaking(false);
      alert(`Transaction failed: ${error.message}`);
    },
  });

  const [fees, setFees] = useState({
    networkFee: 0,
    depositFee: 0,
    swapFee: 0,
    totalFees: 0,
  });
  const [loadingFees, setLoadingFees] = useState(false);

  // Fetch real fees from the pool contract
  useEffect(() => {
    const amount = parseFloat(stakeAmount) || 0;
    if (amount === 0) {
      setFees({
        networkFee: 0,
        depositFee: 0,
        swapFee: 0,
        totalFees: 0,
      });
      return;
    }

    const fetchFees = async () => {
      setLoadingFees(true);
      try {
        const response = await fetch(`/api/pool-fees?currency=${selectedCurrency}&amount=${amount}`);
        if (response.ok) {
          const feeData = await response.json();
          setFees({
            networkFee: feeData.networkFee || 0,
            depositFee: feeData.depositFee || 0,
            swapFee: feeData.swapFee || 0,
            totalFees: feeData.totalFees || 0,
          });
        } else {
          console.error('Failed to fetch fees:', response.statusText);
          // Fallback to zero fees on error
          setFees({
            networkFee: 0,
            depositFee: 0,
            swapFee: 0,
            totalFees: 0,
          });
        }
      } catch (error) {
        console.error('Error fetching fees:', error);
        // Fallback to zero fees on error
        setFees({
          networkFee: 0,
          depositFee: 0,
          swapFee: 0,
          totalFees: 0,
        });
      } finally {
        setLoadingFees(false);
      }
    };

    fetchFees();
  }, [stakeAmount, selectedCurrency]);

  // Fetch real APY from the pool contract
  useEffect(() => {
    const fetchApy = async () => {
      setLoadingApy(true);
      try {
        const response = await fetch('/api/pool-apy');
        if (response.ok) {
          const apyData = await response.json();
          const calculatedApy = apyData.apy || 0;
          // If APY is 0.00, fall back to 6.03%
          setApy(calculatedApy > 0 ? calculatedApy : 6.03);
        } else {
          console.error('Failed to fetch APY:', response.statusText);
          // Fallback to 6.03% if fetch fails
          setApy(6.03);
        }
      } catch (error) {
        console.error('Error fetching APY:', error);
        // Fallback to 6.03% if fetch fails
        setApy(6.03);
      } finally {
        setLoadingApy(false);
      }
    };

    fetchApy();
    // Refresh APY every 30 seconds
    const interval = setInterval(fetchApy, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const amount = parseFloat(stakeAmount) || 0;
    if (amount === 0) {
      setSbxAmount("0");
    } else {
      // Deduct fees from staked amount first
      const amountAfterFees = Math.max(0, amount - fees.totalFees);
      
      if (selectedCurrency === "USDC") {
        // For USDC, 1:1 conversion after fees
        setSbxAmount(amountAfterFees.toFixed(3));
      } else {
        // For non-USDC, deduct fees first, then apply conversion rate
        // The conversion rate converts the currency to USD value, which equals SBX
        // Use the fetched currencyPrice for accurate conversion
        const sbxAmount = amountAfterFees * currencyPrice;
        setSbxAmount(sbxAmount.toFixed(3));
      }
    }
  }, [stakeAmount, selectedCurrency, fees.totalFees, currencyPrice]);

  useEffect(() => {
    const amount = parseFloat(stakeAmount) || 0;
    const yearlyReward = (amount * apy) / 100;
    setEstimatedRewards(yearlyReward);
  }, [stakeAmount, apy]);

  // Fetch currency price
  useEffect(() => {
    const fetchPrice = async () => {
      setLoadingPrice(true);
      try {
        const pair = currencyPricePairs[selectedCurrency];
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
            if (selectedCurrency !== 'USDC') {
              priceInUSD = data.price > 0 ? 1 / data.price : 0;
            }
            
            setCurrencyPrice(priceInUSD);
          } else {
            // Set fallback: USDC defaults to 1.00 if API fails, others to 0
            if (selectedCurrency === 'USDC') {
              setCurrencyPrice(1.00);
            } else {
              setCurrencyPrice(0);
            }
          }
        } else {
          // Set fallback: USDC defaults to 1.00 if API fails, others to 0
          if (selectedCurrency === 'USDC') {
            setCurrencyPrice(1.00);
          } else {
            setCurrencyPrice(0);
          }
        }
      } catch (error) {
        console.error(`Error fetching ${selectedCurrency} price:`, error);
        // Set fallback: USDC defaults to 1.00 if API fails, others to 0
        if (selectedCurrency === 'USDC') {
          setCurrencyPrice(1.00);
        } else {
          setCurrencyPrice(0);
        }
      } finally {
        setLoadingPrice(false);
      }
    };

    fetchPrice();
  }, [selectedCurrency]);

  const handleConnectWallet = () => {
    setIsConnectModalOpen(true);
  };

  const handleStake = async () => {
    if (!currentAccount || !client) {
      alert("Please connect your wallet first");
      return;
    }

    const amount = parseFloat(stakeAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setIsStaking(true);

    try {
      // Convert amount to micro-units (6 decimals)
      const amountMicro = Math.floor(amount * 1_000_000);

      // Fetch prices for the transaction
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

      // Get coin type for the selected currency
      const currencyInfo: Record<Currency, { coinType: string }> = {
        USDC: { coinType: "0xa5afd11d15dfa90e5ac47ac1a2a74b810b6d0d3c00df8c35c33b90c44e32931d::usdc::USDC" },
        CHFX: { coinType: "0x7d6fa54ec2a4ae5620967a2129860f5a8a0b4d9849df64f2ae9b5325f3ca7db0::chfx::CHFX" },
        TRYB: { coinType: "0x7d6fa54ec2a4ae5620967a2129860f5a8a0b4d9849df64f2ae9b5325f3ca7db0::tryb::TRYB" },
        SEKX: { coinType: "0x7d6fa54ec2a4ae5620967a2129860f5a8a0b4d9849df64f2ae9b5325f3ca7db0::sekx::SEKX" },
        JPYC: { coinType: "0xa5afd11d15dfa90e5ac47ac1a2a74b810b6d0d3c00df8c35c33b90c44e32931d::jpyc::JPYC" },
        MYRC: { coinType: "0xa5afd11d15dfa90e5ac47ac1a2a74b810b6d0d3c00df8c35c33b90c44e32931d::myrc::MYRC" },
        XSGD: { coinType: "0xa5afd11d15dfa90e5ac47ac1a2a74b810b6d0d3c00df8c35c33b90c44e32931d::xsgd::XSGD" },
      };

      // Fetch user's coin objects for the selected currency
      const coinType = currencyInfo[selectedCurrency].coinType;
      const coins = await client.getCoins({
        owner: currentAccount.address,
        coinType: coinType,
      });

      if (!coins || coins.data.length === 0) {
        throw new Error(`No ${selectedCurrency} coins found in your wallet`);
      }

      // Find or create account object
      // Users need an Account object to stake. Check if one exists, create if not.
      let accountObjectId: string | null = null;
      
      // Check localStorage for stored account object ID
      const storedAccountId = typeof window !== 'undefined' 
        ? localStorage.getItem(`account_${currentAccount.address}`)
        : null;
      
      if (storedAccountId) {
        // Verify the account object still exists, is owned by the user, and matches the current package
        try {
          const accountObj = await client.getObject({
            id: storedAccountId,
            options: { showOwner: true, showType: true },
          });
          const accountData = accountObj.data as any;
          const accountType = accountData?.type || accountData?.objectType;
          
          // Check if account exists, is owned by user, and is an Account type
          // Note: We don't check package ID match since object types use full package addresses
          if (accountData && 
              accountData.owner?.AddressOwner === currentAccount.address &&
              accountType && 
              accountType.includes('sbx_pool::Account')) {
            accountObjectId = storedAccountId;
          } else {
            console.log('Stored account object is invalid or from old package, will create new one');
            // Clear invalid account ID from localStorage
            if (typeof window !== 'undefined') {
              localStorage.removeItem(`account_${currentAccount.address}`);
            }
          }
        } catch (error) {
          console.log('Stored account object not found, will create new one:', error);
          // Clear invalid account ID from localStorage
          if (typeof window !== 'undefined') {
            localStorage.removeItem(`account_${currentAccount.address}`);
          }
        }
      }

      // If no account found, we need to create one first
      // For now, we'll prompt the user or create it automatically
      if (!accountObjectId) {
        // Create account transaction
        const createAccountTx = new Transaction();
        createAccountTx.setSender(currentAccount.address);
        createAccountTx.moveCall({
          target: `${POOL_PACKAGE_ID}::sbx_pool::create_account`,
        });
        
        // Execute account creation first (this will be a separate transaction)
        try {
          const createAccountResult = await signAndExecuteTransactionAsync({
            transaction: createAccountTx as any,
          });

          // Wait a bit for the transaction to be processed
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Query the transaction to get created objects
          const txDetails = await client.getTransactionBlock({
            digest: createAccountResult.digest,
            options: { showEffects: true, showObjectChanges: true },
          });
          
          // Find the created Account object
          const objectChanges = (txDetails as any).objectChanges || [];
          const accountChange = objectChanges.find((change: any) => 
            change.type === 'created' && 
            change.objectType?.includes('sbx_pool::Account')
          );
          
          if (accountChange && accountChange.objectId) {
            accountObjectId = accountChange.objectId;
            // Store for future use
            if (typeof window !== 'undefined' && accountObjectId) {
              localStorage.setItem(`account_${currentAccount.address}`, accountObjectId);
            }
          } else {
            throw new Error('Failed to find created account object. Please try creating an account manually first.');
          }
        } catch (error: any) {
          throw new Error(`Failed to create account: ${error.message}. Please try creating an account first.`);
        }
      }

      if (!accountObjectId) {
        throw new Error('Account object is required. Please try again.');
      }

      // Verify account object exists and get its metadata before building transaction
      const accountObj = await client.getObject({
        id: accountObjectId,
        options: { showOwner: true, showType: true, showPreviousTransaction: true, showContent: true },
      });
      
      if (!accountObj.data) {
        // Account doesn't exist, clear localStorage and create new one
        console.log('Account object not found, will create new one');
        if (typeof window !== 'undefined') {
          localStorage.removeItem(`account_${currentAccount.address}`);
        }
        accountObjectId = null; // Reset to trigger account creation
      } else {
        // Log account object details for debugging
        const accountObjData = accountObj.data as any;
        console.log('Account object details:', {
          id: accountObjectId,
          type: accountObjData.type || accountObjData.objectType,
          owner: accountObjData.owner,
          version: accountObjData.version,
          digest: accountObjData.digest,
        });

        // Verify the account object type matches what the contract expects
        const accountType = accountObjData.type || accountObjData.objectType;
        console.log('Account type check:', {
          accountType,
          expectedPackage: POOL_PACKAGE_ID,
          typeIncludesAccount: accountType?.includes('sbx_pool::Account'),
          typeIncludesPackage: accountType?.includes(POOL_PACKAGE_ID),
        });
        
        if (!accountType || !accountType.includes('sbx_pool::Account')) {
          console.warn('Invalid account type, will create new account');
          if (typeof window !== 'undefined') {
            localStorage.removeItem(`account_${currentAccount.address}`);
          }
          accountObjectId = null; // Reset to trigger account creation
        } else {
          // Check if account is from the current package (important after redeployment)
          if (!accountType.includes(POOL_PACKAGE_ID)) {
            console.warn(
              `Account object is from a different package. ` +
              `Account type: ${accountType}, Current package: ${POOL_PACKAGE_ID}. ` +
              `Creating a new account...`
            );
            // Clear the old account ID and create a new one
            if (typeof window !== 'undefined') {
              localStorage.removeItem(`account_${currentAccount.address}`);
            }
            accountObjectId = null; // Reset to trigger account creation
          } else {
            // Account is valid - verify ownership
            const owner = accountObjData.owner;
            const isOwnedByUser = owner && 
              (owner === currentAccount.address || 
               (typeof owner === 'object' && owner.AddressOwner === currentAccount.address));
            
            if (!isOwnedByUser) {
              console.warn('Account not owned by user, will create new account');
              if (typeof window !== 'undefined') {
                localStorage.removeItem(`account_${currentAccount.address}`);
              }
              accountObjectId = null; // Reset to trigger account creation
            }
          }
        }
      }

      // If accountObjectId is null at this point, we need to create a new account
      if (!accountObjectId) {
        console.log('Creating new account object...');
        // Create account transaction
        const createAccountTx = new Transaction();
        createAccountTx.setSender(currentAccount.address);
        createAccountTx.moveCall({
          target: `${POOL_PACKAGE_ID}::sbx_pool::create_account`,
        });
        
        // Execute account creation first (this will be a separate transaction)
        try {
          const createAccountResult = await signAndExecuteTransactionAsync({
            transaction: createAccountTx as any,
          });

          // Wait a bit for the transaction to be processed
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Query the transaction to get created objects
          const txDetails = await client.getTransactionBlock({
            digest: createAccountResult.digest,
            options: { showEffects: true, showObjectChanges: true },
          });
          
          // Find the created Account object
          const objectChanges = (txDetails as any).objectChanges || [];
          const accountChange = objectChanges.find((change: any) => 
            change.type === 'created' && 
            change.objectType?.includes('sbx_pool::Account')
          );
          
          if (accountChange && accountChange.objectId) {
            accountObjectId = accountChange.objectId;
            // Store for future use
            if (typeof window !== 'undefined' && accountObjectId) {
              localStorage.setItem(`account_${currentAccount.address}`, accountObjectId);
            }
            console.log('New account created:', accountObjectId);
          } else {
            throw new Error('Failed to find created account object. Please try creating an account manually first.');
          }
        } catch (error: any) {
          throw new Error(`Failed to create account: ${error.message}. Please try again.`);
        }
      }

      // Ensure accountObjectId is set at this point
      if (!accountObjectId) {
        throw new Error('Account object is required. Failed to create account.');
      }

      // Build transaction based on currency
      const txb = new Transaction();

      // Set sender
      txb.setSender(currentAccount.address);

      // Get coin objects for the amount
      // We need to split coins to get the exact amount and transfer them to the pool
      const totalNeeded = BigInt(amountMicro);
      let remaining = totalNeeded;
      const coinObjects: string[] = [];
      const amountsToSplit: bigint[] = [];

      // Find coins that cover the needed amount
      for (const coin of coins.data) {
        if (remaining <= 0) break;
        const coinValue = BigInt(coin.balance);
        if (coinValue > 0) {
          const amountToUse = remaining < coinValue ? remaining : coinValue;
          coinObjects.push(coin.coinObjectId);
          amountsToSplit.push(amountToUse);
          remaining -= amountToUse;
        }
      }

      if (remaining > 0) {
        throw new Error(`Insufficient ${selectedCurrency} balance. Need ${amountMicro} but have less.`);
      }

      // Query Pool and Registry objects to get their metadata
      // The Pool should be a shared object, but if it was created as owned, we have an issue
      const [poolObj, registryObj] = await Promise.all([
        client.getObject({
          id: POOL_OBJECT_ID,
          options: { showOwner: true, showType: true, showPreviousTransaction: true },
        }).catch(() => null),
        client.getObject({
          id: REGISTRY_OBJECT_ID,
          options: { showOwner: true, showType: true, showPreviousTransaction: true },
        }).catch(() => null),
      ]);

      // Check if objects are shared and get their metadata
      const poolOwner = (poolObj?.data as any)?.owner;
      const registryOwner = (registryObj?.data as any)?.owner;
      const isPoolShared = poolOwner && typeof poolOwner === 'object' && 'Shared' in poolOwner;
      const isRegistryShared = registryOwner && typeof registryOwner === 'object' && 'Shared' in registryOwner;
      
      if (!isPoolShared && poolOwner) {
        const ownerAddress = (poolOwner as any)?.AddressOwner || 'unknown';
        throw new Error(
          `Pool object is owned by ${ownerAddress}, not shared. ` +
          `The pool needs to be created as a shared object (using transfer::share_object) ` +
          `for users to interact with it. Please contact the admin to recreate the pool as a shared object.`
        );
      }

      // Get shared object metadata if they are shared
      const poolSharedVersion = isPoolShared ? (poolOwner as any)?.Shared?.initial_shared_version : null;
      const registrySharedVersion = isRegistryShared ? (registryOwner as any)?.Shared?.initial_shared_version : null;

      // Get object references (shared or owned) - store them before using
      let poolRef: any;
      let registryRef: any;
      
      if (isPoolShared && poolSharedVersion) {
        poolRef = txb.sharedObjectRef({
          objectId: POOL_OBJECT_ID,
          mutable: true,
          initialSharedVersion: poolSharedVersion,
        });
      } else {
        poolRef = txb.object(POOL_OBJECT_ID);
      }

      if (isRegistryShared && registrySharedVersion) {
        registryRef = txb.sharedObjectRef({
          objectId: REGISTRY_OBJECT_ID,
          mutable: false, // Registry is immutable (&Registry, not &mut Registry)
          initialSharedVersion: registrySharedVersion,
        });
      } else {
        registryRef = txb.object(REGISTRY_OBJECT_ID);
      }
      
      // Get account object reference - use simple object() method
      // The SDK will automatically resolve the object type and mutability based on the function signature
      const accountRef = txb.object(accountObjectId);
      
      // Split coins and transfer them to the pool
      // The contract expects coins to be transferred to the pool before staking
      // We'll split the exact amount and transfer it to the pool object
      const firstCoin = txb.object(coinObjects[0]);
      
      // Split the exact amount needed (if not using the whole coin)
      if (coinObjects.length === 1 && amountsToSplit[0] === BigInt(coins.data.find(c => c.coinObjectId === coinObjects[0])?.balance || 0)) {
        // Using the whole coin - transfer it directly to the pool
        txb.transferObjects([firstCoin], POOL_OBJECT_ID);
      } else {
        // Split the exact amount and transfer the split coin to the pool
        // splitCoins returns the transaction builder, and creates new coin objects
        // The split coins are available as transaction results that we can reference
        txb.splitCoins(firstCoin, [amountMicro]);
        // Reference the first result from the splitCoins command (the split coin)
        // In IOTA/Sui, we use Result index to reference command outputs
        const splitCoinRef = { $kind: 'NestedResult' as const, NestedResult: [0, 0] };
        txb.transferObjects([splitCoinRef as any], POOL_OBJECT_ID);
      }
      
      if (selectedCurrency === 'USDC') {
        // Stake USDC
        // Note: The contract function takes amount: u64, not a Coin
        // Coins might be handled through transaction inputs or a different mechanism
        txb.moveCall({
          target: `${POOL_PACKAGE_ID}::sbx_pool::stake_usdc`,
          arguments: [
            accountRef, // account (owned by user, mutable)
            poolRef, // pool (shared, mutable)
            registryRef, // registry (shared, immutable)
            txb.pure.u64(amountMicro), // amount
            txb.pure.u64(Math.floor(chfxPriceMu)), // chfx_price_microusd
            txb.pure.u64(Math.floor(trybPriceMu)), // tryb_price_microusd
            txb.pure.u64(Math.floor(sekxPriceMu)), // sekx_price_microusd
          ],
        });
      } else if (selectedCurrency === 'CHFX') {
        // Stake CHFX
        const priceMu = Math.floor(currencyPrice * 1_000_000);
        
        txb.moveCall({
          target: `${POOL_PACKAGE_ID}::sbx_pool::stake_chfx`,
          arguments: [
            accountRef, // account
            poolRef, // pool
            registryRef, // registry
            txb.pure.u64(amountMicro), // amount
            txb.pure.u64(priceMu), // price_microusd
          ],
        });
      } else if (selectedCurrency === 'TRYB') {
        // Stake TRYB
        const priceMu = Math.floor(currencyPrice * 1_000_000);
        
        txb.moveCall({
          target: `${POOL_PACKAGE_ID}::sbx_pool::stake_tryb`,
          arguments: [
            accountRef, // account
            poolRef, // pool
            registryRef, // registry
            txb.pure.u64(amountMicro), // amount
            txb.pure.u64(priceMu), // price_microusd
          ],
        });
      } else if (selectedCurrency === 'SEKX') {
        // Stake SEKX
        const priceMu = Math.floor(currencyPrice * 1_000_000);
        
        txb.moveCall({
          target: `${POOL_PACKAGE_ID}::sbx_pool::stake_sekx`,
          arguments: [
            accountRef, // account
            poolRef, // pool
            registryRef, // registry
            txb.pure.u64(amountMicro), // amount
            txb.pure.u64(priceMu), // price_microusd
          ],
        });
      } else {
        throw new Error(`Staking ${selectedCurrency} is not yet implemented`);
      }

      // Execute transaction
      // The useSignAndExecuteTransaction hook will automatically:
      // 1. Build the transaction with the client (resolving all object types)
      // 2. Sign the transaction with the connected wallet
      // 3. Execute the transaction on-chain
      // 
      // Note: We pass the Transaction builder, not a built transaction.
      // The hook needs the builder to properly resolve object types during dry run.
      signAndExecuteTransaction({
        transaction: txb as any, // Type workaround for SDK version mismatch between packages
      });
    } catch (error: any) {
      console.error('Error building transaction:', error);
      setIsStaking(false);
      alert(`Failed to build transaction: ${error.message}`);
    }
  };

  const handleSnackbarClick = () => {
    if (snackbar.digest) {
      // Open IOTA explorer
      window.open(`https://explorer.iota.org/transaction/${snackbar.digest}?network=testnet`, '_blank', 'noopener,noreferrer');
    }
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
                {loadingApy ? (
                  <span className="text-white font-semibold text-2xl">...</span>
                ) : (
                  <span className="text-white font-semibold text-2xl">{apy.toFixed(2)}%</span>
                )}
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
                  {estimatedRewards === 0 ? "0" : estimatedRewards.toFixed(6)} SBX
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
                  <p className="text-zinc-500 text-sm mt-2">
                    {loadingPrice ? (
                      "..."
                    ) : (
                      `$${((parseFloat(stakeAmount) || 0) * currencyPrice).toFixed(2)}`
                    )}
                  </p>
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
                  <p className="text-zinc-500 text-sm mt-2">
                    {/* SBX is 1:1 with USD, so USD value equals SBX amount */}
                    ${(parseFloat(sbxAmount) || 0).toFixed(2)}
                    <span className="text-zinc-600 text-xs ml-1 italic">
                      (estimate - actual amount may vary slightly due to on-chain rounding)
                    </span>
                  </p>
                </div>
                <div className="px-4 py-2.5 rounded-full bg-white/10 text-white font-medium text-sm border border-white/15 backdrop-blur-xl ring-1 ring-inset ring-white/10 flex items-center gap-2 flex-shrink-0">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-white/60 to-white/20 ring-1 ring-inset ring-white/40 flex-shrink-0" />
                  <span>SBX</span>
                </div>
              </div>
            </div>

            {/* Fees Section - Collapsible */}
            <div className="mb-3">
              <button
                onClick={() => setIsFeesExpanded(!isFeesExpanded)}
                className="w-full flex items-center justify-between py-1.5 px-2 text-left hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 text-[10px] font-medium uppercase tracking-wider">
                    Fees
                  </span>
                  {loadingFees ? (
                    <span className="text-zinc-600 text-[10px]">...</span>
                  ) : fees.totalFees > 0 ? (
                    <span className="text-zinc-600 text-[10px]">
                      ${(fees.totalFees * currencyPrice).toFixed(4)}
                    </span>
                  ) : null}
                </div>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`text-zinc-500 transition-transform ${isFeesExpanded ? 'rotate-180' : ''}`}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {isFeesExpanded && (
                <div className="mt-1.5 px-2 py-2 space-y-2">
                  {loadingFees ? (
                    <div className="flex items-center justify-center py-2">
                      <div className="w-3 h-3 border border-zinc-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500 text-[10px]">Network Fee</span>
                        <span className="text-zinc-400 text-[10px] font-mono">
                          {fees.networkFee.toFixed(6)} {selectedCurrency} {loadingPrice ? '(...)' : `($${(fees.networkFee * currencyPrice).toFixed(2)})`}
                        </span>
                      </div>
                      {fees.depositFee > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 text-[10px]">Deposit Fee</span>
                          <span className="text-zinc-400 text-[10px] font-mono">
                            {fees.depositFee.toFixed(6)} {selectedCurrency} {loadingPrice ? '(...)' : `($${(fees.depositFee * currencyPrice).toFixed(2)})`}
                          </span>
                        </div>
                      )}
                      {fees.swapFee > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 text-[10px]">Swap Fee</span>
                          <span className="text-zinc-400 text-[10px] font-mono">
                            {fees.swapFee.toFixed(6)} {selectedCurrency} {loadingPrice ? '(...)' : `($${(fees.swapFee * currencyPrice).toFixed(2)})`}
                          </span>
                        </div>
                      )}
                      <div className="pt-1.5 border-t border-white/5 flex items-center justify-between">
                        <span className="text-zinc-400 text-[10px] font-medium">Total Fees</span>
                        <span className="text-zinc-300 text-[10px] font-mono font-semibold">
                          {fees.totalFees.toFixed(6)} {selectedCurrency} {loadingPrice ? '(...)' : `($${(fees.totalFees * currencyPrice).toFixed(2)})`}
                        </span>
                      </div>
                      <p className="text-zinc-600 text-[9px] mt-1 italic">
                        * Gas fee (network fee) is queried from IOTA network for every transaction. Deposit fee is 0.1%.
                      </p>
                    </>
                  )}
                </div>
              )}
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

          {/* Wallet Connection Modal */}
          <ConnectModal
            trigger={<button style={{ display: 'none' }} />}
            open={isConnectModalOpen}
            onOpenChange={setIsConnectModalOpen}
          />

          {/* Success Snackbar */}
          {snackbar.show && (
            <div
              onClick={handleSnackbarClick}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 cursor-pointer animate-in slide-in-from-bottom-5"
            >
              <div
                className="px-6 py-3 rounded-xl backdrop-blur-xl border border-white/20 shadow-lg transition-all hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.9) 0%, rgba(22, 163, 74, 0.9) 100%)',
                  boxShadow: '0 8px 30px rgba(34, 197, 94, 0.4)',
                }}
              >
                <div className="flex items-center gap-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span className="text-white font-medium text-sm">Transaction successful</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/80">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </div>
              </div>
            </div>
          )}
        </AppLayout>
      );
    }
