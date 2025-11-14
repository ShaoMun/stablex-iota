import { useState, useEffect, useRef } from "react";
import CurrencyModal from "@/components/CurrencyModal";
import AppLayout from "@/components/AppLayout";
import FAQ from "@/components/FAQ";
import DualWalletButton from "@/components/DualWalletButton";
import { useCurrentAccount, useSignAndExecuteTransaction, useIotaClient } from "@iota/dapp-kit";
import { Transaction } from "@iota/iota-sdk/transactions";
import { ethers } from "ethers";
import { useAccount } from "wagmi";
import { useWalletType } from "@/lib/useWalletType";
import { addTokenToMetaMask, TOKEN_ADDRESSES, TOKEN_ADDRESSES as TOKEN_ADDRS } from "@/lib/addTokenToMetaMask";

// Token addresses for contract interactions
const TOKEN_ADDRESSES_MAP: Record<Currency, string> = {
  SBX: TOKEN_ADDRS.wSBX,
  CHFX: TOKEN_ADDRS.CHFX,
  TRYB: TOKEN_ADDRS.TRYB,
  SEKX: TOKEN_ADDRS.SEKX,
  USDC: TOKEN_ADDRS.USDC,
};

type Currency = "USDC" | "CHFX" | "TRYB" | "SEKX" | "SBX";
type Chain = "L1" | "EVM";

// Bridge contract addresses (to be set after deployment)
const L1_BRIDGE_PACKAGE_ID = process.env.NEXT_PUBLIC_L1_BRIDGE_PACKAGE_ID || "";
const L1_BRIDGE_OBJECT_ID = process.env.NEXT_PUBLIC_L1_BRIDGE_OBJECT_ID || "";
// Deployed EVM Bridge address on IOTA EVM Testnet
const EVM_BRIDGE_ADDRESS = process.env.NEXT_PUBLIC_EVM_BRIDGE_ADDRESS || "0x5bEACC92487733898E786138410E8AC9486CC418";
const EVM_RPC_URL = process.env.NEXT_PUBLIC_EVM_RPC_URL || "https://json-rpc.evm.testnet.iota.cafe";

// Token type mapping
const TOKEN_TYPES: Record<Currency, number> = {
  SBX: 0,
  CHFX: 1,
  TRYB: 2,
  SEKX: 3,
  USDC: 4,
};

export default function BridgePage() {
  const [fromChain, setFromChain] = useState<Chain>("L1");
  const [toChain, setToChain] = useState<Chain>("EVM");
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("SBX");
  const [bridgeAmount, setBridgeAmount] = useState<string>("0");
  const [recipientAddress, setRecipientAddress] = useState<string>("");
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  const currentAccount = useCurrentAccount();
  const client = useIotaClient();
  const [isBridging, setIsBridging] = useState(false);
  const [snackbar, setSnackbar] = useState<{ show: boolean; digest?: string; error?: boolean; message?: string }>({ show: false });
  const snackbarTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Wallet connections
  const iotaAccount = currentAccount;
  const iotaConnected = !!currentAccount;
  const evmAccountHook = useAccount();
  const evmAccount = evmAccountHook.isConnected ? evmAccountHook.address : null;
  const evmConnected = evmAccountHook.isConnected;
  
  // Get EVM provider
  const getEVMProvider = () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      return new ethers.BrowserProvider(window.ethereum);
    }
    return null;
  };
  const evmProvider = evmConnected ? getEVMProvider() : null;

  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction({
    onSuccess: (result) => {
      setIsBridging(false);
      setSnackbar({ show: true, digest: result.digest, error: false });
      if (snackbarTimeoutRef.current) {
        clearTimeout(snackbarTimeoutRef.current);
      }
      snackbarTimeoutRef.current = setTimeout(() => {
        setSnackbar({ show: false });
      }, 5000);
    },
    onError: (error) => {
      setIsBridging(false);
      const errorMessage = error?.message || "Transaction failed";
      setSnackbar({ show: true, error: true, message: errorMessage });
      if (snackbarTimeoutRef.current) {
        clearTimeout(snackbarTimeoutRef.current);
      }
      snackbarTimeoutRef.current = setTimeout(() => {
        setSnackbar({ show: false });
      }, 5000);
    },
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auto-fill recipient address when EVM wallet connects
  useEffect(() => {
    if (evmConnected && evmAccount && toChain === "EVM" && !recipientAddress) {
      setRecipientAddress(evmAccount);
    }
  }, [evmConnected, evmAccount, toChain, recipientAddress]);

  // Convert L1 address to EVM address bytes (20 bytes)
  const l1AddressToEvmBytes = (address: string): Uint8Array => {
    // For POC: convert hex address to bytes
    // In production, use proper address conversion
    const hex = address.replace("0x", "");
    const bytes = new Uint8Array(20);
    for (let i = 0; i < Math.min(hex.length / 2, 20); i++) {
      bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
  };

  // Convert L1 address to bytes for EVM contract (32 bytes as hex string)
  const l1AddressToBytes = (address: string): string => {
    // IOTA addresses are 32 bytes, convert to hex string
    // Remove 0x prefix if present
    const cleanAddress = address.replace("0x", "");
    
    // If address is already hex, pad to 64 characters (32 bytes)
    if (cleanAddress.length === 64) {
      return "0x" + cleanAddress;
    }
    
    // If it's shorter, pad with zeros
    const padded = cleanAddress.padStart(64, "0");
    return "0x" + padded;
  };

  // Bridge from L1 to EVM
  const bridgeL1ToEVM = async () => {
    if (!iotaConnected || !iotaAccount || !client || !recipientAddress) {
      alert("Please connect IOTA wallet and enter recipient address");
      return;
    }

    const amount = parseFloat(bridgeAmount);
    if (amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setIsBridging(true);

    try {
      const amountMicro = BigInt(Math.floor(amount * 1_000_000));
      // Convert EVM address to 20-byte array for L1 bridge
      const recipientEvmBytes = Array.from(l1AddressToEvmBytes(recipientAddress));

      // Get coin objects
      let coinType = "";
      if (selectedCurrency === "SBX") {
        coinType = `${L1_BRIDGE_PACKAGE_ID}::sbx::SBX`;
      } else if (selectedCurrency === "CHFX") {
        coinType = `${L1_BRIDGE_PACKAGE_ID}::chfx::CHFX`;
      } else if (selectedCurrency === "TRYB") {
        coinType = `${L1_BRIDGE_PACKAGE_ID}::tryb::TRYB`;
      } else if (selectedCurrency === "SEKX") {
        coinType = `${L1_BRIDGE_PACKAGE_ID}::sekx::SEKX`;
      } else {
        coinType = `${L1_BRIDGE_PACKAGE_ID}::usdc::USDC`;
      }

      const coins = await client.getCoins({
        owner: iotaAccount,
        coinType,
      });

      if (!coins.data || coins.data.length === 0) {
        alert(`No ${selectedCurrency} tokens found`);
        setIsBridging(false);
        return;
      }

      const totalBalance = coins.data.reduce((sum, coin) => sum + BigInt(coin.balance || 0), BigInt(0));
      if (totalBalance < amountMicro) {
        alert(`Insufficient balance. You have ${Number(totalBalance) / 1_000_000} ${selectedCurrency}`);
        setIsBridging(false);
        return;
      }

      // Build transaction
      const txb = new Transaction();
      txb.setSender(iotaAccount);
      const bridgeRef = txb.object(L1_BRIDGE_OBJECT_ID);

      // Prepare coin
      const coinObjects = coins.data.map(c => c.coinObjectId);
      let coinToLock: any;
      
      if (coinObjects.length === 1) {
        const coinBalance = BigInt(coins.data[0].balance || 0);
        const coinRef = txb.object(coinObjects[0]);
        if (coinBalance === amountMicro) {
          coinToLock = coinRef;
        } else {
          txb.splitCoins(coinRef, [amountMicro]);
          coinToLock = { $kind: 'NestedResult' as const, NestedResult: [0, 0] };
        }
      } else {
        const coinRefs = coinObjects.map(id => txb.object(id));
        const primaryCoin = coinRefs[0];
        for (let i = 1; i < coinRefs.length; i++) {
          txb.mergeCoins(primaryCoin, coinRefs[i]);
        }
        const splitCommandIndex = coinRefs.length - 1;
        txb.splitCoins(primaryCoin, [amountMicro]);
        coinToLock = { $kind: 'NestedResult' as const, NestedResult: [splitCommandIndex, 0] };
      }

      // Call lock function based on currency
      const lockFunction = selectedCurrency === "SBX" ? "lock_sbx" :
                          selectedCurrency === "CHFX" ? "lock_chfx" :
                          selectedCurrency === "TRYB" ? "lock_tryb" :
                          selectedCurrency === "SEKX" ? "lock_sekx" : "lock_usdc";

      txb.moveCall({
        target: `${L1_BRIDGE_PACKAGE_ID}::bridge_l1::${lockFunction}`,
        arguments: [
          bridgeRef,
          coinToLock,
          txb.pure(recipientEvmBytes, "vector<u8>"),
        ],
      });

      signAndExecuteTransaction({ transaction: txb });
    } catch (error: any) {
      console.error("Bridge error:", error);
      setIsBridging(false);
      setSnackbar({ show: true, error: true, message: error.message || "Bridge failed" });
    }
  };

  // Bridge from EVM to L1
  const bridgeEVMToL1 = async () => {
    if (!evmConnected || !evmProvider || !evmAccount || !recipientAddress) {
      alert("Please connect EVM wallet and enter recipient L1 address");
      return;
    }

    if (!EVM_BRIDGE_ADDRESS || EVM_BRIDGE_ADDRESS === "") {
      alert("EVM Bridge address is not configured. Please set NEXT_PUBLIC_EVM_BRIDGE_ADDRESS in environment variables.");
      return;
    }

    const amount = parseFloat(bridgeAmount);
    if (amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setIsBridging(true);

    try {
      const amountMicro = BigInt(Math.floor(amount * 1_000_000));
      const recipientL1Bytes = l1AddressToBytes(recipientAddress);
      const tokenType = TOKEN_TYPES[selectedCurrency];

      const signer = await evmProvider.getSigner();
      
      // Validate bridge address
      if (!ethers.isAddress(EVM_BRIDGE_ADDRESS)) {
        throw new Error(`Invalid bridge address: ${EVM_BRIDGE_ADDRESS}`);
      }

      // For non-SBX tokens, we need to approve the bridge contract first
      if (selectedCurrency !== "SBX") {
        const tokenAddress = TOKEN_ADDRESSES_MAP[selectedCurrency];
        if (!tokenAddress) {
          throw new Error(`Token address not found for ${selectedCurrency}`);
        }

        // Create token contract instance
        const tokenContract = new ethers.Contract(
          tokenAddress,
          [
            "function approve(address spender, uint256 amount) external returns (bool)",
            "function allowance(address owner, address spender) external view returns (uint256)",
          ],
          signer
        );

        // Check current allowance
        const currentAllowance = await tokenContract.allowance(evmAccount, EVM_BRIDGE_ADDRESS);
        
        if (currentAllowance < amountMicro) {
          // Need to approve
          console.log(`Approving bridge to spend ${selectedCurrency}...`);
          const approveTx = await tokenContract.approve(EVM_BRIDGE_ADDRESS, ethers.MaxUint256);
          await approveTx.wait();
          console.log("Approval confirmed");
        }
      }

      // Now call burn
      const bridgeContract = new ethers.Contract(
        EVM_BRIDGE_ADDRESS,
        [
          "function burn(uint8 tokenType, uint256 amount, bytes memory recipientL1) external",
        ],
        signer
      );

      const tx = await bridgeContract.burn(tokenType, amountMicro, recipientL1Bytes);
      await tx.wait();

      setIsBridging(false);
      setSnackbar({ show: true, digest: tx.hash, error: false });
    } catch (error: any) {
      console.error("Bridge error:", error);
      setIsBridging(false);
      setSnackbar({ show: true, error: true, message: error.message || "Bridge failed" });
    }
  };

  const handleBridge = () => {
    if (fromChain === "L1" && toChain === "EVM") {
      bridgeL1ToEVM();
    } else if (fromChain === "EVM" && toChain === "L1") {
      bridgeEVMToL1();
    } else {
      alert("Please select different chains for source and destination");
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Cross-Chain Bridge
          </h1>

          {/* Chain Selection */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From Chain</label>
                <select
                  value={fromChain}
                  onChange={(e) => {
                    setFromChain(e.target.value as Chain);
                    setToChain(e.target.value === "L1" ? "EVM" : "L1");
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="L1">IOTA L1</option>
                  <option value="EVM">IOTA EVM</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">To Chain</label>
                <select
                  value={toChain}
                  onChange={(e) => setToChain(e.target.value as Chain)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="L1">IOTA L1</option>
                  <option value="EVM">IOTA EVM</option>
                </select>
              </div>
            </div>
          </div>

          {/* Currency Selection */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
            <button
              onClick={() => setIsCurrencyModalOpen(true)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-left focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {selectedCurrency}
            </button>
          </div>

          {/* Amount Input */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
            <input
              type="number"
              value={bridgeAmount}
              onChange={(e) => setBridgeAmount(e.target.value)}
              placeholder="0.00"
              step="0.000001"
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Wallet Connection Status */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Wallet Connection
            </label>
            <DualWalletButton />
            {fromChain === "L1" && !iotaConnected && (
              <p className="mt-2 text-sm text-amber-600">Please connect IOTA wallet to bridge from L1</p>
            )}
            {fromChain === "EVM" && !evmConnected && (
              <p className="mt-2 text-sm text-amber-600">Please connect MetaMask to bridge from EVM</p>
            )}
            {evmConnected && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Add tokens to MetaMask:</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(TOKEN_ADDRESSES).map(([symbol, address]) => (
                    <button
                      key={symbol}
                      onClick={() => addTokenToMetaMask(address, symbol)}
                      className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors"
                    >
                      Add {symbol}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recipient Address */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipient Address ({toChain})
            </label>
            <input
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder={toChain === "EVM" ? "0x..." : "0x..."}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {toChain === "EVM" && evmConnected && evmAccount && (
              <button
                onClick={() => setRecipientAddress(evmAccount)}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 underline"
              >
                Use connected wallet address
              </button>
            )}
          </div>

          {/* Bridge Button */}
          <button
            onClick={handleBridge}
            disabled={
              isBridging || 
              !bridgeAmount || 
              !recipientAddress ||
              (fromChain === "L1" && !iotaConnected) ||
              (fromChain === "EVM" && !evmConnected)
            }
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isBridging ? "Bridging..." : `Bridge ${selectedCurrency} from ${fromChain} to ${toChain}`}
          </button>

          {/* Snackbar */}
          {snackbar.show && (
            <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg ${
              snackbar.error ? "bg-red-500" : "bg-green-500"
            } text-white`}>
              {snackbar.error ? (
                <p>{snackbar.message}</p>
              ) : (
                <div>
                  <p>Transaction successful!</p>
                  {snackbar.digest && (
                    <a
                      href={`https://explorer.iota.org/testnet/transaction/${snackbar.digest}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      View on Explorer
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <FAQ
          items={[
            {
              question: "How does the cross-chain bridge work?",
              answer: "The bridge allows you to transfer tokens between IOTA L1 and IOTA EVM. When you bridge from L1 to EVM, tokens are locked on L1 and wrapped tokens are minted on EVM. When bridging back, wrapped tokens are burned and original tokens are unlocked on L1."
            },
            {
              question: "What tokens can I bridge?",
              answer: "You can bridge SBX, CHFX, TRYB, SEKX, and USDC. SBX is wrapped as wSBX on EVM, while other tokens maintain their original form."
            },
            {
              question: "How long does bridging take?",
              answer: "Bridging requires a relayer to process the transaction. For L1→EVM, the relayer watches for lock events and mints tokens. For EVM→L1, the relayer watches for burn events and unlocks tokens. This typically takes a few minutes."
            },
            {
              question: "Do I need to run the relayer?",
              answer: "For testing, you can run the relayer locally. In production, a relayer service will handle this automatically. The relayer watches events on both chains and processes bridge transactions."
            },
            {
              question: "What are the fees?",
              answer: "Bridging requires gas fees on both chains. There are no additional bridge fees in this POC implementation. Gas fees depend on network congestion."
            }
          ]}
        />

        {/* Currency Modal */}
        {isCurrencyModalOpen && (
          <CurrencyModal
            isOpen={isCurrencyModalOpen}
            onClose={() => setIsCurrencyModalOpen(false)}
            selectedCurrency={selectedCurrency}
            onSelect={(currency) => {
              setSelectedCurrency(currency as Currency);
              setIsCurrencyModalOpen(false);
            }}
            excludedCurrencies={[]}
          />
        )}

      </div>
    </AppLayout>
  );
}

