import { useState, useEffect, useRef } from "react";
import { ConnectModal, useDisconnectWallet, useCurrentAccount, useIotaClientContext } from "@iota/dapp-kit";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useDisconnect } from "wagmi";

export default function DualWalletButton() {
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
              className="relative px-6 py-2.5 text-sm font-medium text-white rounded-lg overflow-hidden group transition-all duration-300 ease-out hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(200, 200, 255, 0.1) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.2)',
                backdropFilter: 'blur(12px)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.08) 50%, rgba(200, 200, 255, 0.15) 100%)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3), inset 0 -1px 0 rgba(0, 0, 0, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(200, 200, 255, 0.1) 100%)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.2)';
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
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(200, 200, 200, 0.1) 50%, rgba(255, 255, 255, 0.15) 100%), rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3), inset 0 -1px 0 rgba(0, 0, 0, 0.2)',
                }}
              >
                <div className="p-5">
                  {/* Network Info */}
                  <div className="mb-4 pb-4 border-b border-white/10">
                    <p className="text-zinc-400 text-xs font-medium mb-2 uppercase tracking-wider">Network</p>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/60 to-white/20 ring-1 ring-inset ring-white/40 flex items-center justify-center flex-shrink-0">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/80">
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
                        <p className="text-white font-medium text-sm truncate capitalize">
                          {networkName}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                          <p className="text-zinc-400 text-xs truncate">Connected</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Account Address */}
                  <div className="mb-4 pb-4 border-b border-white/10">
                    <p className="text-zinc-400 text-xs font-medium mb-2 uppercase tracking-wider">Account Address</p>
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-white font-mono text-sm break-all flex-1">{iotaAccount.address}</p>
                      <button
                        onClick={() => copyToClipboard(iotaAccount.address, "iota-address")}
                        className="flex-shrink-0 p-2 rounded-lg hover:bg-white/10 transition-colors"
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
                            className="text-zinc-400 hover:text-white"
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
                    <div className="mb-4 pb-4 border-b border-white/10">
                      <p className="text-zinc-400 text-xs font-medium mb-2 uppercase tracking-wider">Account Label</p>
                      <p className="text-white font-medium text-sm">{iotaAccount.label}</p>
                    </div>
                  )}

                  {/* Disconnect Button */}
                  <button
                    onClick={() => {
                      disconnectWallet();
                      setIsIOTADropdownOpen(false);
                    }}
                    className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 ring-1 ring-inset ring-red-500/20 active:scale-[0.99]"
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
            className="relative px-6 py-2.5 text-sm font-medium text-white rounded-lg overflow-hidden group transition-all duration-300 ease-out hover:scale-[1.02]"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(200, 200, 255, 0.1) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.2)',
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
                      className="relative px-6 py-2.5 text-sm font-medium text-white rounded-lg overflow-hidden group transition-all duration-300 ease-out hover:scale-[1.02]"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(200, 200, 255, 0.1) 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.2)',
                        backdropFilter: 'blur(12px)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.08) 50%, rgba(200, 200, 255, 0.15) 100%)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3), inset 0 -1px 0 rgba(0, 0, 0, 0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(200, 200, 255, 0.1) 100%)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.2)';
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
                        style={{
                          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(200, 200, 200, 0.1) 50%, rgba(255, 255, 255, 0.15) 100%), rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.4)',
                          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3), inset 0 -1px 0 rgba(0, 0, 0, 0.2)',
                        }}
                      >
                        <div className="p-5">
                          {/* Network Info */}
                          <div className="mb-4 pb-4 border-b border-white/10">
                            <p className="text-zinc-400 text-xs font-medium mb-2 uppercase tracking-wider">Network</p>
                            <div className="flex items-center gap-2">
                              {chain.hasIcon && (
                                <div
                                  className="w-8 h-8 rounded-full bg-gradient-to-br from-white/60 to-white/20 ring-1 ring-inset ring-white/40 flex items-center justify-center flex-shrink-0"
                                  style={{
                                    background: chain.iconBackground,
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
                                <p className="text-white font-medium text-sm truncate">
                                  {chain.name}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                                  <p className="text-zinc-400 text-xs truncate">Chain ID: {chain.id}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Account Address */}
                          <div className="mb-4 pb-4 border-b border-white/10">
                            <p className="text-zinc-400 text-xs font-medium mb-2 uppercase tracking-wider">Account Address</p>
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-white font-mono text-sm break-all flex-1">{account.address}</p>
                              <button
                                onClick={() => copyToClipboard(account.address, "evm-address")}
                                className="flex-shrink-0 p-2 rounded-lg hover:bg-white/10 transition-colors"
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
                                    className="text-zinc-400 hover:text-white"
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
                            <div className="mb-4 pb-4 border-b border-white/10">
                              <p className="text-zinc-400 text-xs font-medium mb-2 uppercase tracking-wider">ENS Name</p>
                              <p className="text-white font-medium text-sm">{account.ensName}</p>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="mb-4 pb-4 border-b border-white/10 space-y-2">
                            <button
                              onClick={() => {
                                openChainModal();
                                setIsEVMDropdownOpen(false);
                              }}
                              className="w-full py-2 px-3 rounded-lg font-medium text-white text-sm transition-all bg-white/5 hover:bg-white/10 border border-white/10"
                            >
                              Switch Network
                            </button>
                            <button
                              onClick={openAccountModal}
                              className="w-full py-2 px-3 rounded-lg font-medium text-white text-sm transition-all bg-white/5 hover:bg-white/10 border border-white/10"
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
                            className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 ring-1 ring-inset ring-red-500/20 active:scale-[0.99]"
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
                    className="relative px-6 py-2.5 text-sm font-medium text-white rounded-lg overflow-hidden group transition-all duration-300 ease-out hover:scale-[1.02]"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(200, 200, 255, 0.1) 100%)',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.2)',
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
