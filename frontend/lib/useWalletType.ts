import { useCurrentAccount } from "@iota/dapp-kit";
import { useAccount } from "wagmi";

/**
 * Hook to determine which wallet type is connected
 * Returns 'iota' if IOTA wallet is connected, 'evm' if EVM wallet is connected, or null
 */
export function useWalletType(): 'iota' | 'evm' | null {
  const iotaAccount = useCurrentAccount();
  const { isConnected: evmConnected } = useAccount();

  if (iotaAccount) return 'iota';
  if (evmConnected) return 'evm';
  return null;
}

/**
 * Hook to get both wallet states
 */
export function useWalletStates() {
  const iotaAccount = useCurrentAccount();
  const evmAccount = useAccount();

  return {
    iotaConnected: !!iotaAccount,
    iotaAccount: iotaAccount?.address || null,
    evmConnected: evmAccount.isConnected,
    evmAddress: evmAccount.address || null,
    walletType: useWalletType(),
  };
}


