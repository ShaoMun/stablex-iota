import { useRouter } from "next/router";
import { cn } from "@/lib/utils";
import { ReactNode, useState, useEffect, useRef } from "react";
import { useCurrentAccount, useCurrentWallet, useDisconnectWallet, ConnectModal, useIotaClientContext } from "@iota/dapp-kit";

type Tab = "stake" | "swap" | "migrate" | "unstake";

interface AppLayoutProps {
  children: ReactNode;
  activeTab: Tab;
}

export default function AppLayout({ children, activeTab }: AppLayoutProps) {
  const router = useRouter();
  const tabs: Tab[] = ["stake", "swap", "migrate", "unstake"];
  const currentAccount = useCurrentAccount();
  const currentWallet = useCurrentWallet();
  const iotaClientContext = useIotaClientContext();
  const { mutate: disconnectWallet } = useDisconnectWallet();
  
  // Get network name from context or default to testnet
  const networkName = (iotaClientContext as any)?.activeNetwork || 
                     (iotaClientContext as any)?.currentNetwork || 
                     (iotaClientContext as any)?.network ||
                     "testnet";
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Track initialization to prevent flickering
  useEffect(() => {
    // Check if there's a stored connection in localStorage
    const hasStoredConnection = typeof window !== "undefined" && 
      localStorage.getItem("iota-wallet-connection") !== null;
    
    // If we have a stored connection, wait a bit longer for auto-connect
    // Otherwise, initialize immediately
    const delay = hasStoredConnection ? 300 : 50;
    
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, delay);

    return () => clearTimeout(timer);
  }, []);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsAccountDropdownOpen(false);
      }
    };

    if (isAccountDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isAccountDropdownOpen]);

  const handleTabClick = (tab: Tab) => {
    if (tab === "stake") {
      router.push('/stake');
    } else if (tab === "swap") {
      router.push('/swap');
    } else if (tab === "migrate") {
      router.push('/migrate');
    } else if (tab === "unstake") {
      router.push('/unstake');
    }
  };

  return (
    <div className="min-h-screen relative bg-[#0a0a0a] overflow-hidden" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      {/* Purple Light Overlays - Different Design */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Diagonal Top-Left to Bottom-Right */}
        <div 
          className="absolute top-0 left-0 w-full h-full blur-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(75, 20, 120, 0.15) 0%, transparent 50%, rgba(88, 28, 135, 0.1) 100%)'
          }}
        ></div>
        
        {/* Diagonal Bottom-Left to Top-Right */}
        <div 
          className="absolute top-0 right-0 w-full h-full blur-3xl"
          style={{
            background: 'linear-gradient(225deg, rgba(88, 28, 135, 0.12) 0%, transparent 50%, rgba(75, 20, 120, 0.08) 100%)'
          }}
        ></div>
        
        {/* Circular Center Glow */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(88, 28, 135, 0.08) 0%, rgba(75, 20, 120, 0.04) 40%, transparent 70%)'
          }}
        ></div>
        
        {/* Top Edge Fade */}
        <div className="absolute top-0 left-0 right-0 h-[25%] bg-gradient-to-b from-purple-950/10 to-transparent"></div>
        
        {/* Bottom Edge Fade */}
        <div className="absolute bottom-0 left-0 right-0 h-[25%] bg-gradient-to-t from-purple-900/8 to-transparent"></div>
      </div>

      {/* Cone-shaped Spotlights */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Top Left Spotlight - Cone shape pointing to center */}
        <div 
          className="absolute top-0 left-0 w-[60%] h-[60%] blur-2xl"
          style={{
            background: 'radial-gradient(ellipse 70% 90% at 0% 0%, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.08) 20%, rgba(255, 255, 255, 0.04) 40%, transparent 55%)',
            transform: 'rotate(-15deg)',
            transformOrigin: 'top left',
          }}
        ></div>
        
        {/* Top Right Spotlight - Cone shape pointing to center */}
        <div 
          className="absolute top-0 right-0 w-[60%] h-[60%] blur-2xl"
          style={{
            background: 'radial-gradient(ellipse 70% 90% at 100% 0%, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.08) 20%, rgba(255, 255, 255, 0.04) 40%, transparent 55%)',
            transform: 'rotate(15deg)',
            transformOrigin: 'top right',
          }}
        ></div>
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 px-8 pt-8 flex items-center justify-between">
        <h1
          className="text-lg font-semibold text-white cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => router.push('/')}
        >
          STABLEX
        </h1>
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={() => {
              if (currentAccount) {
                setIsAccountDropdownOpen(!isAccountDropdownOpen);
              } else {
                setIsConnectModalOpen(true);
              }
            }}
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
            {/* Metallic shine overlay */}
            <div 
              className="absolute inset-0 opacity-30 -translate-x-full group-hover:translate-x-full transition-transform duration-[600ms] ease-in-out pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%)',
              }}
            ></div>
            
            {/* Top highlight for metallic effect */}
            <div 
              className="absolute top-0 left-0 right-0 h-[1px] pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
              }}
            ></div>
            
            <span className="relative z-10 tracking-wider font-mono font-semibold text-xs uppercase">
              {isInitializing ? (
                // During initialization, show address if available, otherwise show loading
                currentAccount ? formatAddress(currentAccount.address) : "..."
              ) : (
                // After initialization, show normal state
                currentAccount ? formatAddress(currentAccount.address) : "CONNECT WALLET"
              )}
            </span>
          </button>

          {/* Account Dropdown */}
          {isAccountDropdownOpen && currentAccount && (
            <div
              ref={dropdownRef}
              className="absolute right-0 mt-2 w-96 rounded-xl overflow-hidden backdrop-blur-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(200, 200, 200, 0.1) 50%, rgba(255, 255, 255, 0.15) 100%), rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3), inset 0 -1px 0 rgba(0, 0, 0, 0.2)',
              }}
            >
              <div className="p-5">
                {/* Network Info Section */}
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
                    <p className="text-white font-mono text-sm break-all flex-1">{currentAccount.address}</p>
                    <button
                      onClick={() => copyToClipboard(currentAccount.address, "address")}
                      className="flex-shrink-0 p-2 rounded-lg hover:bg-white/10 transition-colors"
                      title={copiedField === "address" ? "Copied!" : "Copy address"}
                    >
                      {copiedField === "address" ? (
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
                {currentAccount.label && (
                  <div className="mb-4 pb-4 border-b border-white/10">
                    <p className="text-zinc-400 text-xs font-medium mb-2 uppercase tracking-wider">Account Label</p>
                    <p className="text-white font-medium text-sm">{currentAccount.label}</p>
                  </div>
                )}

                {/* Disconnect Button */}
                <button
                  onClick={() => {
                    disconnectWallet();
                    setIsAccountDropdownOpen(false);
                  }}
                  className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 ring-1 ring-inset ring-red-500/20 active:scale-[0.99]"
                >
                  Disconnect Wallet
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content Column */}
      <div className="w-full max-w-[560px] mx-auto px-4 relative z-10 pt-20">
        {/* Tabs Bar - stays in same position across pages */}
        <div className="flex justify-center mb-6">
          <div 
            className="inline-flex rounded-full bg-white/5 backdrop-blur-xl p-1.5 relative"
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
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabClick(tab)}
                className={cn(
                  "px-5 py-2 rounded-full text-sm font-medium capitalize transition-all",
                  activeTab === tab
                    ? "bg-white/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
                    : "text-zinc-400 hover:text-white hover:bg-white/10"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Page Content */}
        {children}
      </div>

      {/* Wallet Connection Modal */}
      <ConnectModal
        trigger={<button style={{ display: 'none' }} />}
        open={isConnectModalOpen}
        onOpenChange={setIsConnectModalOpen}
      />
    </div>
  );
}

