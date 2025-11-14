import { useState, useEffect, useRef } from "react";
import { ConnectModal, useDisconnectWallet, useCurrentAccount, useIotaClientContext } from "@iota/dapp-kit";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useDisconnect } from "wagmi";
import { cn } from "@/lib/utils";

interface DualWalletButtonProps {
  isDarkMode?: boolean;
}

export default function DualWalletButton({ isDarkMode = true }: DualWalletButtonProps) {
  const iotaAccount = useCurrentAccount();
  const { mutate: disconnectWallet } = useDisconnectWallet();
  const { disconnect: disconnectEVM } = useDisconnect();
  const iotaClientContext = useIotaClientContext();
  const [isIOTAModalOpen, setIsIOTAModalOpen] = useState(false);
  const [isIOTADropdownOpen, setIsIOTADropdownOpen] = useState(false);
  const [isEVMDropdownOpen, setIsEVMDropdownOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const iotaDropdownRef = useRef<HTMLDivElement>(null);
  const iotaButtonRef = useRef<HTMLButtonElement>(null);
  const evmDropdownRef = useRef<HTMLDivElement>(null);
  const evmButtonRef = useRef<HTMLButtonElement>(null);

  const networkName = (iotaClientContext as any)?.activeNetwork || 
                     (iotaClientContext as any)?.currentNetwork || 
                     (iotaClientContext as any)?.network ||
                     "testnet";

  const formatAddress = (address: string) => {
    if (!address) return "";
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        iotaDropdownRef.current &&
        iotaButtonRef.current &&
        !iotaDropdownRef.current.contains(event.target as Node) &&
        !iotaButtonRef.current.contains(event.target as Node)
      ) {
        setIsIOTADropdownOpen(false);
      }
      if (
        evmDropdownRef.current &&
        evmButtonRef.current &&
        !evmDropdownRef.current.contains(event.target as Node) &&
        !evmButtonRef.current.contains(event.target as Node)
      ) {
        setIsEVMDropdownOpen(false);
      }
    };

    if (isIOTADropdownOpen || isEVMDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isIOTADropdownOpen, isEVMDropdownOpen]);

  return (
    <div className="flex items-center gap-3">
      {/* IOTA Wallet Button */}
      <div className="relative">
        {iotaAccount ? (
          <>
            <button
              ref={iotaButtonRef}
              onClick={() => setIsIOTADropdownOpen(!isIOTADropdownOpen)}
              className={cn(
                "relative px-6 py-2.5 text-sm font-medium rounded-lg overflow-hidden group transition-all duration-300 ease-out hover:scale-[1.02]",
                isDarkMode ? "text-white" : "text-gray-900"
              )}
              style={isDarkMode ? {
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(200, 200, 255, 0.1) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.2)',
                backdropFilter: 'blur(12px)',
              } : {
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 50%, rgba(240, 240, 255, 0.8) 100%)',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8), inset 0 -1px 0 rgba(0, 0, 0, 0.05)',
                backdropFilter: 'blur(12px)',
              }}
              onMouseEnter={(e) => {
                if (isDarkMode) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.08) 50%, rgba(200, 200, 255, 0.15) 100%)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3), inset 0 -1px 0 rgba(0, 0, 0, 0.2)';
                } else {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.85) 50%, rgba(240, 240, 255, 0.95) 100%)';
                  e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.15)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.9), inset 0 -1px 0 rgba(0, 0, 0, 0.08)';
                }
              }}
              onMouseLeave={(e) => {
                if (isDarkMode) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(200, 200, 255, 0.1) 100%)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.2)';
                } else {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 50%, rgba(240, 240, 255, 0.8) 100%)';
                  e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.1)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8), inset 0 -1px 0 rgba(0, 0, 0, 0.05)';
                }
              }}
            >
              <div 
                className="absolute inset-0 opacity-30 -translate-x-full group-hover:translate-x-full transition-transform duration-[600ms] ease-in-out pointer-events-none"
                style={{
                  background: 'linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%)',
                }}
              ></div>
              <div 
                className="absolute top-0 left-0 right-0 h-[1px] pointer-events-none"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
                }}
              ></div>
              <span className="relative z-10 tracking-wider font-mono font-semibold text-xs uppercase flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                IOTA: {formatAddress(iotaAccount.address)}
              </span>
            </button>

            {/* IOTA Dropdown */}
            {isIOTADropdownOpen && (
              <div
                ref={iotaDropdownRef}
                className="absolute right-0 mt-2 w-96 rounded-xl overflow-hidden backdrop-blur-xl z-50"
                style={isDarkMode ? {
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(200, 200, 200, 0.1) 50%, rgba(255, 255, 255, 0.15) 100%), rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3), inset 0 -1px 0 rgba(0, 0, 0, 0.2)',
                } : {
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 50%, rgba(255, 255, 255, 0.95) 100%)',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.9), inset 0 -1px 0 rgba(0, 0, 0, 0.05)',
                }}
              >
                <div className="p-5">
                  {/* Network Info */}
                  <div className={cn(
                    "mb-4 pb-4 border-b",
                    isDarkMode ? "border-white/10" : "border-gray-200"
                  )}>
                    <p className={cn(
                      "text-xs font-medium mb-2 uppercase tracking-wider",
                      isDarkMode ? "text-zinc-400" : "text-gray-500"
                    )}>Network</p>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-8 h-8 rounded-full ring-1 ring-inset flex items-center justify-center flex-shrink-0",
                        isDarkMode 
                          ? "bg-gradient-to-br from-white/60 to-white/20 ring-white/40"
                          : "bg-gradient-to-br from-gray-100 to-gray-200 ring-gray-300"
                      )}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isDarkMode ? "text-white/80" : "text-gray-700"}>
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="2" x2="12" y2="6"></line>
                          <line x1="12" y1="18" x2="12" y2="22"></line>
                          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                          <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                          <line x1="2" y1="12" x2="6" y2="12"></line>
                          <line x1="18" y1="12" x2="22" y2="12"></line>
                          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                          <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "font-medium text-sm truncate capitalize",
                          isDarkMode ? "text-white" : "text-gray-900"
                        )}>
                          {networkName}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                          <p className={cn(
                            "text-xs truncate",
                            isDarkMode ? "text-zinc-400" : "text-gray-500"
                          )}>Connected</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Account Address */}
                  <div className={cn(
                    "mb-4 pb-4 border-b",
                    isDarkMode ? "border-white/10" : "border-gray-200"
                  )}>
                    <p className={cn(
                      "text-xs font-medium mb-2 uppercase tracking-wider",
                      isDarkMode ? "text-zinc-400" : "text-gray-500"
                    )}>Account Address</p>
                    <div className="flex items-start justify-between gap-3">
                      <p className={cn(
                        "font-mono text-sm break-all flex-1",
                        isDarkMode ? "text-white" : "text-gray-900"
                      )}>{iotaAccount.address}</p>
                      <button
                        onClick={() => copyToClipboard(iotaAccount.address, "iota-address")}
                        className={cn(
                          "flex-shrink-0 p-2 rounded-lg transition-colors",
                          isDarkMode ? "hover:bg-white/10" : "hover:bg-gray-100"
                        )}
                        title={copiedField === "iota-address" ? "Copied!" : "Copy address"}
                      >
                        {copiedField === "iota-address" ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-400">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        ) : (
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={isDarkMode ? "text-zinc-400 hover:text-white" : "text-gray-400 hover:text-gray-700"}
                          >
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Account Label (if available) */}
                  {iotaAccount.label && (
                    <div className={cn(
                      "mb-4 pb-4 border-b",
                      isDarkMode ? "border-white/10" : "border-gray-200"
                    )}>
                      <p className={cn(
                        "text-xs font-medium mb-2 uppercase tracking-wider",
                        isDarkMode ? "text-zinc-400" : "text-gray-500"
                      )}>Account Label</p>
                      <p className={cn(
                        "font-medium text-sm",
                        isDarkMode ? "text-white" : "text-gray-900"
                      )}>{iotaAccount.label}</p>
                    </div>
                  )}

                  {/* Disconnect Button */}
                  <button
                    onClick={() => {
                      disconnectWallet();
                      setIsIOTADropdownOpen(false);
                    }}
                    className={cn(
                      "w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.99]",
                      isDarkMode 
                        ? "text-white bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 ring-1 ring-inset ring-red-500/20"
                        : "text-white bg-red-500 hover:bg-red-600 border border-red-600 shadow-sm"
                    )}
                  >
                    Disconnect Wallet
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <button
            onClick={() => setIsIOTAModalOpen(true)}
            className={cn(
              "relative px-6 py-2.5 text-sm font-medium rounded-lg overflow-hidden group transition-all duration-300 ease-out hover:scale-[1.02]",
              isDarkMode ? "text-white" : "text-gray-900"
            )}
            style={isDarkMode ? {
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(200, 200, 255, 0.1) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.2)',
              backdropFilter: 'blur(12px)',
            } : {
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 50%, rgba(240, 240, 255, 0.8) 100%)',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8), inset 0 -1px 0 rgba(0, 0, 0, 0.05)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <span className="relative z-10 tracking-wider font-mono font-semibold text-xs uppercase">
              CONNECT IOTA
            </span>
          </button>
        )}
      </div>

      {/* EVM Wallet Button */}
      <div className="relative">
        <ConnectButton.Custom>
          {({
            account,
            chain,
            openAccountModal,
            openChainModal,
            openConnectModal,
            authenticationStatus,
            mounted,
          }) => {
            const ready = mounted && authenticationStatus !== 'loading';
            const connected =
              ready &&
              account &&
              chain &&
              (!authenticationStatus ||
                authenticationStatus === 'authenticated');

            return (
              <div
                {...(!ready && {
                  'aria-hidden': true,
                  'style': {
                    opacity: 0,
                    pointerEvents: 'none',
                    userSelect: 'none',
                  },
                })}
              >
                {connected ? (
                  <>
                    <button
                      ref={evmButtonRef}
                      onClick={() => setIsEVMDropdownOpen(!isEVMDropdownOpen)}
                      className={cn(
                        "relative px-6 py-2.5 text-sm font-medium rounded-lg overflow-hidden group transition-all duration-300 ease-out hover:scale-[1.02]",
                        isDarkMode ? "text-white" : "text-gray-900"
                      )}
                      style={isDarkMode ? {
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(200, 200, 255, 0.1) 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.2)',
                        backdropFilter: 'blur(12px)',
                      } : {
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 50%, rgba(240, 240, 255, 0.8) 100%)',
                        border: '1px solid rgba(0, 0, 0, 0.1)',
                        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8), inset 0 -1px 0 rgba(0, 0, 0, 0.05)',
                        backdropFilter: 'blur(12px)',
                      }}
                      onMouseEnter={(e) => {
                        if (isDarkMode) {
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.08) 50%, rgba(200, 200, 255, 0.15) 100%)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)';
                          e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3), inset 0 -1px 0 rgba(0, 0, 0, 0.2)';
                        } else {
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.85) 50%, rgba(240, 240, 255, 0.95) 100%)';
                          e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.15)';
                          e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.9), inset 0 -1px 0 rgba(0, 0, 0, 0.08)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (isDarkMode) {
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(200, 200, 255, 0.1) 100%)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                          e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.2)';
                        } else {
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 50%, rgba(240, 240, 255, 0.8) 100%)';
                          e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.1)';
                          e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8), inset 0 -1px 0 rgba(0, 0, 0, 0.05)';
                        }
                      }}
                    >
                      <div 
                        className="absolute inset-0 opacity-30 -translate-x-full group-hover:translate-x-full transition-transform duration-[600ms] ease-in-out pointer-events-none"
                        style={{
                          background: 'linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%)',
                        }}
                      ></div>
                      <div 
                        className="absolute top-0 left-0 right-0 h-[1px] pointer-events-none"
                        style={{
                          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
                        }}
                      ></div>
                      <span className="relative z-10 tracking-wider font-mono font-semibold text-xs uppercase flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        EVM: {formatAddress(account.address)}
                      </span>
                    </button>

                    {/* EVM Dropdown */}
                    {isEVMDropdownOpen && (
                      <div
                        ref={evmDropdownRef}
                        className="absolute right-0 mt-2 w-96 rounded-xl overflow-hidden backdrop-blur-xl z-50"
                        style={isDarkMode ? {
                          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(200, 200, 200, 0.1) 50%, rgba(255, 255, 255, 0.15) 100%), rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.4)',
                          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3), inset 0 -1px 0 rgba(0, 0, 0, 0.2)',
                        } : {
                          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 50%, rgba(255, 255, 255, 0.95) 100%)',
                          border: '1px solid rgba(0, 0, 0, 0.1)',
                          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.9), inset 0 -1px 0 rgba(0, 0, 0, 0.05)',
                        }}
                      >
                        <div className="p-5">
                          {/* Network Info */}
                          <div className={cn(
                            "mb-4 pb-4 border-b",
                            isDarkMode ? "border-white/10" : "border-gray-200"
                          )}>
                            <p className={cn(
                              "text-xs font-medium mb-2 uppercase tracking-wider",
                              isDarkMode ? "text-zinc-400" : "text-gray-500"
                            )}>Network</p>
                            <div className="flex items-center gap-2">
                              {chain.hasIcon && (
                                <div
                                  className={cn(
                                    "w-8 h-8 rounded-full ring-1 ring-inset flex items-center justify-center flex-shrink-0",
                                    isDarkMode 
                                      ? "bg-gradient-to-br from-white/60 to-white/20 ring-white/40"
                                      : "bg-gradient-to-br from-gray-100 to-gray-200 ring-gray-300"
                                  )}
                                  style={{
                                    background: chain.iconBackground || (isDarkMode ? undefined : 'linear-gradient(to bottom right, rgb(243, 244, 246), rgb(229, 231, 235))'),
                                  }}
                                >
                                  {chain.iconUrl && (
                                    <img
                                      alt={chain.name ?? 'Chain icon'}
                                      src={chain.iconUrl}
                                      style={{ width: 20, height: 20 }}
                                    />
                                  )}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className={cn(
                                  "font-medium text-sm truncate",
                                  isDarkMode ? "text-white" : "text-gray-900"
                                )}>
                                  {chain.name}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                                  <p className={cn(
                                    "text-xs truncate",
                                    isDarkMode ? "text-zinc-400" : "text-gray-500"
                                  )}>Chain ID: {chain.id}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Account Address */}
                          <div className={cn(
                            "mb-4 pb-4 border-b",
                            isDarkMode ? "border-white/10" : "border-gray-200"
                          )}>
                            <p className={cn(
                              "text-xs font-medium mb-2 uppercase tracking-wider",
                              isDarkMode ? "text-zinc-400" : "text-gray-500"
                            )}>Account Address</p>
                            <div className="flex items-start justify-between gap-3">
                              <p className={cn(
                                "font-mono text-sm break-all flex-1",
                                isDarkMode ? "text-white" : "text-gray-900"
                              )}>{account.address}</p>
                              <button
                                onClick={() => copyToClipboard(account.address, "evm-address")}
                                className={cn(
                                  "flex-shrink-0 p-2 rounded-lg transition-colors",
                                  isDarkMode ? "hover:bg-white/10" : "hover:bg-gray-100"
                                )}
                                title={copiedField === "evm-address" ? "Copied!" : "Copy address"}
                              >
                                {copiedField === "evm-address" ? (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-400">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                  </svg>
                                ) : (
                                  <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className={isDarkMode ? "text-zinc-400 hover:text-white" : "text-gray-400 hover:text-gray-700"}
                                  >
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                  </svg>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Account ENS Name (if available) */}
                          {account.ensName && (
                            <div className={cn(
                              "mb-4 pb-4 border-b",
                              isDarkMode ? "border-white/10" : "border-gray-200"
                            )}>
                              <p className={cn(
                                "text-xs font-medium mb-2 uppercase tracking-wider",
                                isDarkMode ? "text-zinc-400" : "text-gray-500"
                              )}>ENS Name</p>
                              <p className={cn(
                                "font-medium text-sm",
                                isDarkMode ? "text-white" : "text-gray-900"
                              )}>{account.ensName}</p>
                            </div>
                          )}

                          {/* Actions */}
                          <div className={cn(
                            "mb-4 pb-4 border-b space-y-2",
                            isDarkMode ? "border-white/10" : "border-gray-200"
                          )}>
                            <button
                              onClick={() => {
                                openChainModal();
                                setIsEVMDropdownOpen(false);
                              }}
                              className={cn(
                                "w-full py-2 px-3 rounded-lg font-medium text-sm transition-all border",
                                isDarkMode 
                                  ? "text-white bg-white/5 hover:bg-white/10 border-white/10"
                                  : "text-gray-900 bg-gray-50 hover:bg-gray-100 border-gray-200"
                              )}
                            >
                              Switch Network
                            </button>
                            <button
                              onClick={openAccountModal}
                              className={cn(
                                "w-full py-2 px-3 rounded-lg font-medium text-sm transition-all border",
                                isDarkMode 
                                  ? "text-white bg-white/5 hover:bg-white/10 border-white/10"
                                  : "text-gray-900 bg-gray-50 hover:bg-gray-100 border-gray-200"
                              )}
                            >
                              View Account
                            </button>
                          </div>

                          {/* Disconnect Button */}
                          <button
                            onClick={() => {
                              disconnectEVM();
                              setIsEVMDropdownOpen(false);
                            }}
                            className={cn(
                              "w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.99]",
                              isDarkMode 
                                ? "text-white bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 ring-1 ring-inset ring-red-500/20"
                                : "text-white bg-red-500 hover:bg-red-600 border border-red-600 shadow-sm"
                            )}
                          >
                            Disconnect Wallet
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <button
                    onClick={openConnectModal}
                    className={cn(
                      "relative px-6 py-2.5 text-sm font-medium rounded-lg overflow-hidden group transition-all duration-300 ease-out hover:scale-[1.02]",
                      isDarkMode ? "text-white" : "text-gray-900"
                    )}
                    style={isDarkMode ? {
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(200, 200, 255, 0.1) 100%)',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.2)',
                      backdropFilter: 'blur(12px)',
                    } : {
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 50%, rgba(240, 240, 255, 0.8) 100%)',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8), inset 0 -1px 0 rgba(0, 0, 0, 0.05)',
                      backdropFilter: 'blur(12px)',
                    }}
                  >
                    <span className="relative z-10 tracking-wider font-mono font-semibold text-xs uppercase">
                      CONNECT EVM
                    </span>
                  </button>
                )}
              </div>
            );
          }}
        </ConnectButton.Custom>
      </div>

      {/* IOTA Connect Modal */}
      <ConnectModal
        open={isIOTAModalOpen}
        onOpenChange={setIsIOTAModalOpen}
      />
    </div>
  );
}
