import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import WhitepaperHeader from "@/components/WhitepaperHeader";
import { cn } from "@/lib/utils";

type SectionId = 
  | "overview"
  | "architecture"
  | "multi-chain"
  | "pool-mechanics"
  | "fee-structure"
  | "swapping"
  | "bridging"
  | "price-feeds"
  | "security"
  | "tokenomics"
  | "roadmap";

interface Section {
  id: SectionId;
  title: string;
  subsections?: string[];
}

const sections: Section[] = [
  { id: "overview", title: "Overview" },
  { 
    id: "architecture", 
    title: "Architecture",
    subsections: ["System Overview", "Component Diagram", "Data Flow"]
  },
  { 
    id: "multi-chain", 
    title: "Multi-Chain Architecture",
    subsections: ["L1 Components", "EVM Components", "Unified Liquidity"]
  },
  { 
    id: "pool-mechanics", 
    title: "Pool Mechanics",
    subsections: ["Unified Basket", "SBX Token", "Asymmetric Withdrawal", "Unified APY"]
  },
  { 
    id: "fee-structure", 
    title: "Fee Structure",
    subsections: ["Three-Tier System", "Fee Calculation", "Dynamic Pricing"]
  },
  { 
    id: "swapping", 
    title: "Swapping Mechanism",
    subsections: ["Direct A→B Swaps", "Rate Calculation", "Infinity Pool"]
  },
  { 
    id: "bridging", 
    title: "Cross-Chain Bridge",
    subsections: ["Bridge Flow", "Lock/Mint", "Burn/Unlock", "Relayer"]
  },
  { 
    id: "price-feeds", 
    title: "Price Feed Architecture",
    subsections: ["API Integration", "Price Format", "Off-Chain Queries"]
  },
  { 
    id: "security", 
    title: "Security & Audits",
    subsections: ["Reentrancy Protection", "Nonce System", "Event Verification"]
  },
  { 
    id: "tokenomics", 
    title: "Tokenomics",
    subsections: ["SBX Token", "Rebasing Mechanism", "Yield Distribution"]
  },
  { 
    id: "roadmap", 
    title: "Roadmap",
    subsections: ["Current Status", "Future Development"]
  },
];

export default function Whitepaper() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<SectionId>("overview");
  const [expandedSections, setExpandedSections] = useState<Set<SectionId>>(new Set(["overview"]));
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentDate, setCurrentDate] = useState<string>("");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const hash = router.asPath.split("#")[1];
    if (hash) {
      setActiveSection(hash as SectionId);
      setExpandedSections(prev => new Set([...prev, hash as SectionId]));
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
    }
  }, [router.asPath]);

  useEffect(() => {
    // Set date only on client to avoid hydration mismatch
    // Use ISO format for consistency across locales
    const date = new Date();
    setCurrentDate(date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }));

    // Load theme preference from localStorage
    const savedTheme = localStorage.getItem('whitepaper-theme');
    if (savedTheme === 'light') {
      setIsDarkMode(false);
    }
  }, []);

  // Scroll detection to update active section
  useEffect(() => {
    let observer: IntersectionObserver | null = null;
    let updateActiveSectionOnScroll: (() => void) | null = null;
    
    // Wait a bit for all sections to render
    const timeoutId = setTimeout(() => {
      const observerOptions = {
        root: null,
        rootMargin: '-20% 0px -60% 0px', // Trigger when section is in upper 40% of viewport
        threshold: [0, 0.1, 0.5, 1.0], // Multiple thresholds for better detection
      };

      const observerCallback = (entries: IntersectionObserverEntry[]) => {
        // Find all intersecting entries
        const intersectingEntries = entries.filter(entry => entry.isIntersecting);
        
        if (intersectingEntries.length > 0) {
          // Sort by position (topmost first), then by intersection ratio
          intersectingEntries.sort((a, b) => {
            const aTop = a.boundingClientRect.top;
            const bTop = b.boundingClientRect.top;
            
            // If both are in the upper portion of viewport, prefer the one closer to top
            if (aTop >= 0 && bTop >= 0 && aTop < window.innerHeight * 0.4 && bTop < window.innerHeight * 0.4) {
              return aTop - bTop;
            }
            
            // Otherwise, prefer the one with higher intersection ratio
            if (b.intersectionRatio !== a.intersectionRatio) {
              return b.intersectionRatio - a.intersectionRatio;
            }
            
            // Fallback to position
            return aTop - bTop;
          });

          const topEntry = intersectingEntries[0];
          const sectionId = topEntry.target.id as SectionId;
          
          // Only update if it's a valid section ID
          if (sectionId && sections.some(s => s.id === sectionId)) {
            setActiveSection(sectionId);
            // Expand the section in sidebar if it has subsections
            setExpandedSections(prev => new Set([...prev, sectionId]));
          }
        }
      };

      observer = new IntersectionObserver(observerCallback, observerOptions);

      // Observe all section elements
      sections.forEach((section) => {
        const element = document.getElementById(section.id);
        if (element) {
          observer!.observe(element);
        }
      });

      // Set initial active section based on scroll position
      updateActiveSectionOnScroll = () => {
        const scrollPosition = window.scrollY + window.innerHeight * 0.2; // 20% from top
        
        for (let i = sections.length - 1; i >= 0; i--) {
          const section = sections[i];
          const element = document.getElementById(section.id);
          if (element) {
            const elementTop = element.offsetTop;
            const elementBottom = elementTop + element.offsetHeight;
            
            if (scrollPosition >= elementTop && scrollPosition < elementBottom) {
              setActiveSection(section.id);
              setExpandedSections(prev => new Set([...prev, section.id]));
              break;
            }
          }
        }
      };

      // Initial check
      updateActiveSectionOnScroll();

      // Also listen to scroll events as fallback
      window.addEventListener('scroll', updateActiveSectionOnScroll, { passive: true });
    }, 100); // Small delay to ensure DOM is ready

    return () => {
      clearTimeout(timeoutId);
      if (observer) {
        observer.disconnect();
      }
      if (updateActiveSectionOnScroll) {
        window.removeEventListener('scroll', updateActiveSectionOnScroll);
      }
    };
  }, []); // Run once on mount

  const handleThemeToggle = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem('whitepaper-theme', newTheme ? 'dark' : 'light');
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // If search matches a section, highlight it
    if (query.trim()) {
      const matchedSection = sections.find(s => 
        s.title.toLowerCase().includes(query.toLowerCase())
      );
      if (matchedSection) {
        setActiveSection(matchedSection.id);
      }
    }
  };

  // Theme helper functions
  const sectionCardClass = () => cn(
    "backdrop-blur-xl rounded-2xl p-8 border",
    isDarkMode 
      ? "bg-white/5 border-white/10"
      : "bg-white border-gray-200 shadow-sm"
  );

  const headingClass = () => cn(
    "text-3xl font-bold mb-6",
    isDarkMode ? "text-white" : "text-gray-900"
  );

  const subHeadingClass = () => cn(
    "text-xl font-semibold mb-4",
    isDarkMode ? "text-white" : "text-gray-900"
  );

  const textClass = () => cn(
    "leading-relaxed mb-6",
    isDarkMode ? "text-zinc-300" : "text-gray-700"
  );

  const listTextClass = () => cn(
    "space-y-2 mb-6",
    isDarkMode ? "text-zinc-300" : "text-gray-700"
  );

  const strongClass = () => isDarkMode ? "text-white" : "text-gray-900";

  const chartPlaceholderClass = () => cn(
    "rounded-lg p-8 border-2 border-dashed mb-6",
    isDarkMode 
      ? "bg-black/40 border-white/20"
      : "bg-gray-100 border-gray-300"
  );

  const chartTitleClass = () => cn(
    "text-lg font-semibold mb-2",
    isDarkMode ? "text-white" : "text-gray-900"
  );

  const chartDescClass = () => cn(
    "text-sm mb-4",
    isDarkMode ? "text-zinc-400" : "text-gray-600"
  );

  const chartListClass = () => cn(
    "text-sm text-left max-w-md mx-auto space-y-1",
    isDarkMode ? "text-zinc-500" : "text-gray-500"
  );

  const toggleSection = (sectionId: SectionId) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const scrollToSection = (sectionId: SectionId) => {
    setActiveSection(sectionId);
    setExpandedSections(prev => new Set([...prev, sectionId]));
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div 
      className={cn(
        "min-h-screen relative overflow-hidden transition-colors duration-300",
        isDarkMode ? "bg-[#0a0a0a]" : "bg-gray-50"
      )}
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {isDarkMode ? (
          <>
            <div 
              className="absolute top-0 left-0 w-full h-full blur-3xl"
              style={{
                background: 'linear-gradient(135deg, rgba(75, 20, 120, 0.15) 0%, transparent 50%, rgba(88, 28, 135, 0.1) 100%)'
              }}
            ></div>
            <div 
              className="absolute top-0 right-0 w-full h-full blur-3xl"
              style={{
                background: 'linear-gradient(225deg, rgba(88, 28, 135, 0.12) 0%, transparent 50%, rgba(75, 20, 120, 0.08) 100%)'
              }}
            ></div>
          </>
        ) : (
          <>
            <div 
              className="absolute top-0 left-0 w-full h-full blur-3xl opacity-30"
              style={{
                background: 'linear-gradient(135deg, rgba(75, 20, 120, 0.05) 0%, transparent 50%, rgba(88, 28, 135, 0.03) 100%)'
              }}
            ></div>
            <div 
              className="absolute top-0 right-0 w-full h-full blur-3xl opacity-30"
              style={{
                background: 'linear-gradient(225deg, rgba(88, 28, 135, 0.04) 0%, transparent 50%, rgba(75, 20, 120, 0.02) 100%)'
              }}
            ></div>
          </>
        )}
      </div>

      {/* Fixed Header */}
      <WhitepaperHeader 
        isDarkMode={isDarkMode}
        onThemeToggle={handleThemeToggle}
        onSearch={handleSearch}
      />

      <div className="flex relative z-10 pt-20">
        {/* Sidebar Navigation */}
        <aside 
          className={cn(
            "fixed left-0 top-20 bottom-0 w-80 backdrop-blur-xl border-r overflow-y-auto transition-all duration-300 z-20",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
            isDarkMode
              ? "bg-black/40 border-white/10"
              : "bg-white/80 border-gray-200 shadow-sm"
          )}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className={cn(
                "text-xl font-bold",
                isDarkMode ? "text-white" : "text-gray-900"
              )}>Table of Contents</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "lg:hidden",
                  isDarkMode ? "text-zinc-400 hover:text-white" : "text-gray-500 hover:text-gray-900"
                )}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <nav className="space-y-2">
              {sections.map((section) => (
                <div key={section.id}>
                  <button
                    onClick={() => {
                      scrollToSection(section.id);
                      if (section.subsections) {
                        toggleSection(section.id);
                      }
                    }}
                    className={cn(
                      "w-full text-left px-4 py-2.5 rounded-lg transition-all flex items-center justify-between group",
                      activeSection === section.id
                        ? isDarkMode
                          ? "bg-white/20 text-white"
                          : "bg-purple-100 text-purple-900"
                        : isDarkMode
                          ? "text-zinc-400 hover:text-white hover:bg-white/10"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    )}
                  >
                    <span className="font-medium text-sm">{section.title}</span>
                    {section.subsections && (
                      <svg
                        className={cn(
                          "w-4 h-4 transition-transform",
                          expandedSections.has(section.id) ? "rotate-90" : ""
                        )}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </button>
                  
                  {section.subsections && expandedSections.has(section.id) && (
                    <div className="ml-4 mt-1 space-y-1">
                      {section.subsections.map((subsection, idx) => (
                        <button
                          key={idx}
                          onClick={() => scrollToSection(section.id)}
                          className={cn(
                            "w-full text-left px-4 py-1.5 rounded text-xs",
                            isDarkMode
                              ? "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                          )}
                        >
                          {subsection}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </div>
        </aside>

        {/* Sidebar Toggle Button (Mobile) */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className={cn(
              "fixed left-4 top-24 z-30 lg:hidden p-2 backdrop-blur-xl rounded-lg border",
              isDarkMode
                ? "bg-black/60 border-white/10 text-white"
                : "bg-white/90 border-gray-200 text-gray-900 shadow-md"
            )}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
        )}

        {/* Main Content */}
        <main className={cn(
          "flex-1 transition-all duration-300",
          sidebarOpen ? "lg:ml-80" : "lg:ml-0"
        )}>
          <div className="max-w-4xl mx-auto px-8 pb-20">
            {/* Title */}
            <div className="mb-12">
              <h1 className={cn(
                "text-5xl font-bold mb-4",
                isDarkMode ? "text-white" : "text-gray-900"
              )}>StableX Whitepaper</h1>
              <p className={cn(
                "text-xl",
                isDarkMode ? "text-zinc-400" : "text-gray-600"
              )}>
                Cross-Chain Stablecoin Exchange on IOTA
              </p>
              <div className={cn(
                "mt-4 text-sm",
                isDarkMode ? "text-zinc-500" : "text-gray-500"
              )}>
                Version 1.0 | Last Updated: {currentDate || "Loading..."}
              </div>
            </div>

            {/* Overview Section */}
            <section id="overview" className="mb-16 scroll-mt-28">
              <div className={cn(
                "backdrop-blur-xl rounded-2xl p-8 border",
                isDarkMode 
                  ? "bg-white/5 border-white/10"
                  : "bg-white border-gray-200 shadow-sm"
              )}>
                <h2 className={cn(
                  "text-3xl font-bold mb-6",
                  isDarkMode ? "text-white" : "text-gray-900"
                )}>Overview</h2>
                <div className="prose max-w-none">
                  <p className={cn(
                    "leading-relaxed mb-4",
                    isDarkMode ? "text-zinc-300" : "text-gray-700"
                  )}>
                    StableX is a cross-chain stablecoin exchange platform built on IOTA, supporting both IOTA L1 (Move) and IOTA EVM (Solidity). 
                    Inspired by Sanctum's infinity pool concept, the exchange addresses fragmented liquidity for regional stablecoins by allowing 
                    users to deposit USDC or regional stablecoins, earn unified yield, and receive SBX tokens that can be withdrawn as any currency 
                    (with asymmetric withdrawal rules).
                  </p>
                  
                  <div className="grid md:grid-cols-2 gap-6 mt-6">
                    <div className={cn(
                      "rounded-lg p-6 border",
                      isDarkMode 
                        ? "bg-white/5 border-white/10"
                        : "bg-gray-50 border-gray-200"
                    )}>
                      <h3 className={cn(
                        "text-lg font-semibold mb-2",
                        isDarkMode ? "text-white" : "text-gray-900"
                      )}>Unified Basket</h3>
                      <p className={cn(
                        "text-sm",
                        isDarkMode ? "text-zinc-400" : "text-gray-600"
                      )}>
                        All currencies (USDC + CHFX + TRYB + SEKX) in one pool, providing deep liquidity across all pairs.
                      </p>
                    </div>
                    <div className={cn(
                      "rounded-lg p-6 border",
                      isDarkMode 
                        ? "bg-white/5 border-white/10"
                        : "bg-gray-50 border-gray-200"
                    )}>
                      <h3 className={cn(
                        "text-lg font-semibold mb-2",
                        isDarkMode ? "text-white" : "text-gray-900"
                      )}>SBX Token</h3>
                      <p className={cn(
                        "text-sm",
                        isDarkMode ? "text-zinc-400" : "text-gray-600"
                      )}>
                        Single fungible token (1 SBX = 1 USD) with rebasing mechanism representing your share of the pool.
                      </p>
                    </div>
                    <div className={cn(
                      "rounded-lg p-6 border",
                      isDarkMode 
                        ? "bg-white/5 border-white/10"
                        : "bg-gray-50 border-gray-200"
                    )}>
                      <h3 className={cn(
                        "text-lg font-semibold mb-2",
                        isDarkMode ? "text-white" : "text-gray-900"
                      )}>Unified APY</h3>
                      <p className={cn(
                        "text-sm",
                        isDarkMode ? "text-zinc-400" : "text-gray-600"
                      )}>
                        All depositors earn the same APY (higher than USDC alone) regardless of which currency they deposit.
                      </p>
                    </div>
                    <div className={cn(
                      "rounded-lg p-6 border",
                      isDarkMode 
                        ? "bg-white/5 border-white/10"
                        : "bg-gray-50 border-gray-200"
                    )}>
                      <h3 className={cn(
                        "text-lg font-semibold mb-2",
                        isDarkMode ? "text-white" : "text-gray-900"
                      )}>Asymmetric Withdrawal</h3>
                      <p className={cn(
                        "text-sm",
                        isDarkMode ? "text-zinc-400" : "text-gray-600"
                      )}>
                        Regional depositors can withdraw USDC or regionals; USDC depositors can only withdraw regionals.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Architecture Section */}
            <section id="architecture" className="mb-16 scroll-mt-28">
              <div className={sectionCardClass()}>
                <h2 className={headingClass()}>System Architecture</h2>
                
                <div className="mb-8">
                  <h3 className={subHeadingClass()}>System Overview</h3>
                  <p className={textClass()}>
                    StableX operates on a dual-chain architecture, leveraging both IOTA L1 (Move-based) and IOTA EVM (Solidity-based) 
                    to provide unified liquidity across chains. The system consists of pool contracts, bridge contracts, token contracts, 
                    and a relayer service that facilitates cross-chain transfers.
                  </p>
                  
                  {/* Chart Placeholder 1: System Architecture Overview */}
                  <div className={chartPlaceholderClass()}>
                    <div className="text-center">
                      <div className="text-6xl mb-4">📊</div>
                      <h4 className={chartTitleClass()}>Chart 1: System Architecture Overview</h4>
                      <p className={chartDescClass()}>
                        High-level diagram showing the relationship between L1 and EVM components, including:
                      </p>
                      <ul className={chartListClass()}>
                        <li>• IOTA L1 layer (Move contracts)</li>
                        <li>• IOTA EVM layer (Solidity contracts)</li>
                        <li>• Bridge relayer service</li>
                        <li>• User interactions (wallets, frontend)</li>
                        <li>• Price feed API integration</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className={subHeadingClass()}>Component Diagram</h3>
                  <p className={textClass()}>
                    Detailed breakdown of all system components and their interactions.
                  </p>
                  
                  {/* Chart Placeholder 2: Component Diagram */}
                  <div className={chartPlaceholderClass()}>
                    <div className="text-center">
                      <div className="text-6xl mb-4">🔧</div>
                      <h4 className={chartTitleClass()}>Chart 2: Component Diagram</h4>
                      <p className={chartDescClass()}>
                        Detailed component diagram showing:
                      </p>
                      <ul className={chartListClass()}>
                        <li>• Pool contracts (sbx_pool.move, StableXPool.sol)</li>
                        <li>• Bridge contracts (bridge_l1.move, EVMBridge.sol)</li>
                        <li>• Token contracts (all currencies on both chains)</li>
                        <li>• Flash vault (flash_vault.move)</li>
                        <li>• Registry/Shared objects</li>
                        <li>• Data flow between components</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className={subHeadingClass()}>Data Flow</h3>
                  <p className={textClass()}>
                    How data and transactions flow through the system for different operations.
                  </p>
                  
                  {/* Chart Placeholder 3: Data Flow Diagram */}
                  <div className={chartPlaceholderClass()}>
                    <div className="text-center">
                      <div className="text-6xl mb-4">🔄</div>
                      <h4 className={chartTitleClass()}>Chart 3: Data Flow Diagram</h4>
                      <p className={chartDescClass()}>
                        Data flow diagram illustrating:
                      </p>
                      <ul className={chartListClass()}>
                        <li>• Staking flow (user → pool → SBX mint)</li>
                        <li>• Swapping flow (A → pool → B)</li>
                        <li>• Bridging flow (L1 → EVM and vice versa)</li>
                        <li>• Price feed integration</li>
                        <li>• Event emission and relayer processing</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Multi-Chain Architecture Section */}
            <section id="multi-chain" className="mb-16 scroll-mt-28">
              <div className={sectionCardClass()}>
                <h2 className={headingClass()}>Multi-Chain Architecture</h2>
                
                <div className="mb-8">
                  <h3 className={subHeadingClass()}>L1 Components (Move-based)</h3>
                  <ul className={listTextClass()}>
                    <li>• <strong className={strongClass()}>Native tokens:</strong> CHFX, TRYB, SEKX, USDC, SBX</li>
                    <li>• <strong className={strongClass()}>Pool contract:</strong> sbx_pool.move</li>
                    <li>• <strong className={strongClass()}>Bridge contract:</strong> bridge_l1.move (locks/unlocks tokens)</li>
                    <li>• <strong className={strongClass()}>Flash vault:</strong> flash_vault.move</li>
                    <li>• <strong className={strongClass()}>Shared objects:</strong> Pool and Registry created as shared objects</li>
                  </ul>
                </div>

                <div className="mb-8">
                  <h3 className={subHeadingClass()}>EVM Components (Solidity-based)</h3>
                  <ul className={listTextClass()}>
                    <li>• <strong className={strongClass()}>ERC-20 tokens:</strong> CHFX, TRYB, SEKX, USDC, wSBX (wrapped SBX)</li>
                    <li>• <strong className={strongClass()}>Pool contract:</strong> StableXPool.sol</li>
                    <li>• <strong className={strongClass()}>Bridge contract:</strong> EVMBridge.sol (mints/burns wrapped tokens)</li>
                    <li>• <strong className={strongClass()}>Standard ERC-20:</strong> All tokens follow ERC-20 standard</li>
                  </ul>
                </div>

                <div className="mb-8">
                  <h3 className={subHeadingClass()}>Unified Liquidity</h3>
                  <p className={textClass()}>
                    While pools exist separately on L1 and EVM, they are bridged via cross-chain transfers, 
                    allowing users to access liquidity from either chain seamlessly.
                  </p>
                  
                  {/* Chart Placeholder 4: Multi-Chain Architecture */}
                  <div className={chartPlaceholderClass()}>
                    <div className="text-center">
                      <div className="text-6xl mb-4">🌐</div>
                      <h4 className={chartTitleClass()}>Chart 4: Multi-Chain Architecture</h4>
                      <p className={chartDescClass()}>
                        Diagram showing the dual-chain setup:
                      </p>
                      <ul className={chartListClass()}>
                        <li>• IOTA L1 layer with Move contracts</li>
                        <li>• IOTA EVM layer with Solidity contracts</li>
                        <li>• Bridge connection between chains</li>
                        <li>• Token wrapping/unwrapping mechanism</li>
                        <li>• Unified liquidity concept</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Pool Mechanics Section */}
            <section id="pool-mechanics" className="mb-16 scroll-mt-28">
              <div className={sectionCardClass()}>
                <h2 className={headingClass()}>Pool Mechanics</h2>
                
                <div className="mb-8">
                  <h3 className={subHeadingClass()}>Unified Basket</h3>
                  <p className={textClass()}>
                    All currencies (USDC + CHFX + TRYB + SEKX) exist in one unified pool. This creates deep liquidity 
                    for all trading pairs and allows for direct swaps between any two currencies without intermediate steps.
                  </p>
                </div>

                <div className="mb-8">
                  <h3 className={subHeadingClass()}>SBX Token</h3>
                  <p className={textClass()}>
                    When users deposit into the pool, they receive SBX tokens at a 1:1 ratio with USD value. 
                    SBX tokens represent a share of the entire pool and can be withdrawn as any supported currency 
                    (subject to asymmetric withdrawal rules).
                  </p>
                </div>

                <div className="mb-8">
                  <h3 className={subHeadingClass()}>Asymmetric Withdrawal</h3>
                  <p className={textClass()}>
                    To maintain pool balance and incentivize regional stablecoin deposits:
                  </p>
                  <ul className={listTextClass()}>
                    <li>• <strong className={strongClass()}>Regional depositors:</strong> Can withdraw any regional stablecoin OR USDC</li>
                    <li>• <strong className={strongClass()}>USDC depositors:</strong> Can only withdraw regional stablecoins (cannot withdraw USDC)</li>
                  </ul>
                </div>

                <div className="mb-8">
                  <h3 className={subHeadingClass()}>Unified APY</h3>
                  <p className={textClass()}>
                    All depositors earn the same APY regardless of which currency they deposit. This APY is typically 
                    higher than what USDC alone would provide, as it represents a weighted average of yields from all 
                    currencies in the pool.
                  </p>
                  
                  {/* Chart Placeholder 5: Pool Architecture */}
                  <div className={chartPlaceholderClass()}>
                    <div className="text-center">
                      <div className="text-6xl mb-4">🏊</div>
                      <h4 className={chartTitleClass()}>Chart 5: Pool Architecture</h4>
                      <p className={chartDescClass()}>
                        Diagram showing the unified pool structure:
                      </p>
                      <ul className={chartListClass()}>
                        <li>• Unified basket with all currencies</li>
                        <li>• SBX token minting/burning</li>
                        <li>• Deposit/withdrawal flows</li>
                        <li>• Asymmetric withdrawal rules</li>
                        <li>• Yield distribution mechanism</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Fee Structure Section */}
            <section id="fee-structure" className="mb-16 scroll-mt-28">
              <div className={sectionCardClass()}>
                <h2 className={headingClass()}>Fee Structure</h2>
                
                <div className="mb-8">
                  <h3 className={subHeadingClass()}>Three-Tier Fee System (80%/30% Thresholds)</h3>
                  
                  <div className="space-y-6 mb-6">
                    <div className={cn(
                      "rounded-lg p-6 border",
                      isDarkMode 
                        ? "bg-white/5 border-white/10"
                        : "bg-gray-50 border-gray-200"
                    )}>
                      <h4 className={chartTitleClass()}>Tier 1: ≥80% Coverage</h4>
                      <p className={cn(
                        "text-sm mb-2",
                        isDarkMode ? "text-zinc-300" : "text-gray-700"
                      )}>
                        Fixed cheap rate for stablecoins when pool has sufficient depth.
                      </p>
                      <p className={cn(
                        "text-xs",
                        isDarkMode ? "text-zinc-400" : "text-gray-600"
                      )}>
                        Fee = floor + base (no deviation penalty)<br/>
                        Example: 7 bps (0.07%) - optimal for healthy pools
                      </p>
                    </div>

                    <div className={cn(
                      "rounded-lg p-6 border",
                      isDarkMode 
                        ? "bg-white/5 border-white/10"
                        : "bg-gray-50 border-gray-200"
                    )}>
                      <h4 className={chartTitleClass()}>Tier 2: 30-80% Coverage</h4>
                      <p className={cn(
                        "text-sm mb-2",
                        isDarkMode ? "text-zinc-300" : "text-gray-700"
                      )}>
                        Linear/pricewise fee that scales with deviation from target.
                      </p>
                      <p className={cn(
                        "text-xs",
                        isDarkMode ? "text-zinc-400" : "text-gray-600"
                      )}>
                        Fee = floor + base + k * deviation<br/>
                        Example: 7-32 bps range
                      </p>
                    </div>

                    <div className={cn(
                      "rounded-lg p-6 border",
                      isDarkMode 
                        ? "bg-white/5 border-white/10"
                        : "bg-gray-50 border-gray-200"
                    )}>
                      <h4 className={chartTitleClass()}>Tier 3: &lt;30% Coverage</h4>
                      <p className={cn(
                        "text-sm mb-2",
                        isDarkMode ? "text-zinc-300" : "text-gray-700"
                      )}>
                        Sudden jump - dramatic fee increase to discourage draining.
                      </p>
                      <p className={cn(
                        "text-xs",
                        isDarkMode ? "text-zinc-400" : "text-gray-600"
                      )}>
                        Fee = (floor + base) * 10x + exponential term<br/>
                        No cap - fees can exceed 14%+ to discourage draining<br/>
                        Example: 77 bps at 29%, up to 1432 bps at 1%
                      </p>
                    </div>
                  </div>
                  
                  {/* Chart Placeholder 6: Fee Curve */}
                  <div className={chartPlaceholderClass()}>
                    <div className="text-center">
                      <div className="text-6xl mb-4">📈</div>
                      <h4 className={chartTitleClass()}>Chart 6: Three-Tier Fee Curve</h4>
                      <p className={chartDescClass()}>
                        Graph showing fee structure:
                      </p>
                      <ul className={chartListClass()}>
                        <li>• X-axis: Pool coverage percentage (0-100%)</li>
                        <li>• Y-axis: Fee in basis points</li>
                        <li>• Three distinct tiers with thresholds at 30% and 80%</li>
                        <li>• Tier 1: Flat low fee (≥80%)</li>
                        <li>• Tier 2: Linear increase (30-80%)</li>
                        <li>• Tier 3: Exponential increase (&lt;30%)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Swapping Mechanism Section */}
            <section id="swapping" className="mb-16 scroll-mt-28">
              <div className={sectionCardClass()}>
                <h2 className={headingClass()}>Swapping Mechanism</h2>
                
                <div className="mb-8">
                  <h3 className={subHeadingClass()}>Direct A→B Swaps (Infinity Pool Core)</h3>
                  <p className={textClass()}>
                    Unlike traditional DEXs that require routing through intermediate tokens, StableX enables direct swaps 
                    between any two regional stablecoins. This is the core of the infinity pool concept.
                  </p>
                  <ul className={listTextClass()}>
                    <li>• <strong className={strongClass()}>No USD intermediate</strong> - direct exchange between regional stablecoins</li>
                    <li>• <strong className={strongClass()}>Rate calculation:</strong> rate_A_to_B = price_B / price_A (both in USD/[CURRENCY] format)</li>
                    <li>• <strong className={strongClass()}>Single fee applied</strong> based on target asset depth</li>
                    <li>• <strong className={strongClass()}>True infinity pool mechanics</strong> - all assets in one unified pool</li>
                    <li>• <strong className={strongClass()}>Prices passed as parameters</strong> - queried from API off-chain before transaction</li>
                  </ul>
                  
                  {/* Chart Placeholder 7: Swap Flow */}
                  <div className={chartPlaceholderClass()}>
                    <div className="text-center">
                      <div className="text-6xl mb-4">🔄</div>
                      <h4 className={chartTitleClass()}>Chart 7: Direct A→B Swap Flow</h4>
                      <p className={chartDescClass()}>
                        Diagram showing swap process:
                      </p>
                      <ul className={chartListClass()}>
                        <li>• User initiates swap (Currency A → Currency B)</li>
                        <li>• Price feed provides exchange rate</li>
                        <li>• Fee calculation based on pool depth</li>
                        <li>• Direct transfer from pool (no intermediate)</li>
                        <li>• Pool balance updates</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Cross-Chain Bridge Section */}
            <section id="bridging" className="mb-16 scroll-mt-28">
              <div className={sectionCardClass()}>
                <h2 className={headingClass()}>Cross-Chain Bridge</h2>
                
                <div className="mb-8">
                  <h3 className={subHeadingClass()}>Bridge Flow</h3>
                  <p className={textClass()}>
                    The bridge enables seamless token transfers between IOTA L1 and IOTA EVM, maintaining unified 
                    liquidity across both chains.
                  </p>
                </div>

                <div className="mb-8">
                  <h3 className={subHeadingClass()}>L1 → EVM (Lock → Mint)</h3>
                  <ol className={cn(
                    "space-y-2 mb-6 list-decimal list-inside",
                    isDarkMode ? "text-zinc-300" : "text-gray-700"
                  )}>
                    <li>User calls <code className={cn(
                      "px-2 py-1 rounded",
                      isDarkMode ? "bg-black/40" : "bg-gray-200"
                    )}>bridge_l1::lock_*()</code> on L1 with token coin and recipient EVM address</li>
                    <li>L1 bridge locks tokens in escrow and emits <code className="bg-black/40 px-2 py-1 rounded">LockEvent</code></li>
                    <li>Relayer watches L1 events and calls <code className="bg-black/40 px-2 py-1 rounded">EVMBridge::mint()</code> on EVM</li>
                    <li>EVM bridge mints wrapped tokens to recipient</li>
                  </ol>
                </div>

                <div className="mb-8">
                  <h3 className={subHeadingClass()}>EVM → L1 (Burn → Unlock)</h3>
                  <ol className={cn(
                    "space-y-2 mb-6 list-decimal list-inside",
                    isDarkMode ? "text-zinc-300" : "text-gray-700"
                  )}>
                    <li>User calls <code className={cn(
                      "px-2 py-1 rounded",
                      isDarkMode ? "bg-black/40" : "bg-gray-200"
                    )}>EVMBridge::burn()</code> on EVM with token type, amount, and recipient L1 address</li>
                    <li>EVM bridge burns wrapped tokens and emits <code className="bg-black/40 px-2 py-1 rounded">BurnEvent</code></li>
                    <li>Relayer watches EVM events and calls <code className="bg-black/40 px-2 py-1 rounded">bridge_l1::unlock()</code> on L1</li>
                    <li>L1 bridge unlocks tokens from escrow and transfers to recipient</li>
                  </ol>
                  
                  {/* Chart Placeholder 8: Bridge Flow */}
                  <div className={chartPlaceholderClass()}>
                    <div className="text-center">
                      <div className="text-6xl mb-4">🌉</div>
                      <h4 className={chartTitleClass()}>Chart 8: Cross-Chain Bridge Flow</h4>
                      <p className={chartDescClass()}>
                        Diagram showing bridge operations:
                      </p>
                      <ul className={chartListClass()}>
                        <li>• L1 → EVM: Lock → Event → Relayer → Mint</li>
                        <li>• EVM → L1: Burn → Event → Relayer → Unlock</li>
                        <li>• Nonce system for replay protection</li>
                        <li>• Event verification mechanism</li>
                        <li>• Token wrapping/unwrapping</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Price Feed Architecture Section */}
            <section id="price-feeds" className="mb-16 scroll-mt-28">
              <div className={sectionCardClass()}>
                <h2 className={headingClass()}>Price Feed Architecture</h2>
                
                <div className="mb-8">
                  <h3 className={subHeadingClass()}>API-Based Price Feeds</h3>
                  <p className={textClass()}>
                    Prices are queried off-chain via API and passed as parameters to contract functions. This approach 
                    provides better flexibility and lower gas costs compared to on-chain oracle queries.
                  </p>
                  <ul className={listTextClass()}>
                    <li>• <strong className={strongClass()}>No Onchain Queries:</strong> Removed dependency on Pyth Network onchain queries</li>
                    <li>• <strong className={strongClass()}>Price Format:</strong> All prices in micro-USD (1e6 = $1.00)</li>
                    <li>• <strong className={strongClass()}>Off-Chain Queries:</strong> Frontend queries API before submitting transactions</li>
                    <li>• <strong className={strongClass()}>Parameter Passing:</strong> Prices passed as function parameters</li>
                  </ul>
                  
                  {/* Chart Placeholder 9: Price Feed Architecture */}
                  <div className={chartPlaceholderClass()}>
                    <div className="text-center">
                      <div className="text-6xl mb-4">💹</div>
                      <h4 className={chartTitleClass()}>Chart 9: Price Feed Architecture</h4>
                      <p className={chartDescClass()}>
                        Diagram showing price feed integration:
                      </p>
                      <ul className={chartListClass()}>
                        <li>• API endpoint for price queries</li>
                        <li>• Frontend price fetching</li>
                        <li>• Price parameter passing to contracts</li>
                        <li>• Price format conversion (micro-USD)</li>
                        <li>• Transaction flow with prices</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Security Section */}
            <section id="security" className="mb-16 scroll-mt-28">
              <div className={sectionCardClass()}>
                <h2 className={headingClass()}>Security & Audits</h2>
                
                <div className="mb-8">
                  <h3 className={subHeadingClass()}>Reentrancy Protection</h3>
                  <p className={textClass()}>
                    All contracts implement reentrancy guards to prevent recursive calls and ensure atomic operations.
                  </p>
                </div>

                <div className="mb-8">
                  <h3 className={subHeadingClass()}>Nonce System</h3>
                  <p className={textClass()}>
                    Bridge contracts use a nonce system to prevent replay attacks and ensure each bridge operation 
                    can only be executed once.
                  </p>
                </div>

                <div className="mb-8">
                  <h3 className={subHeadingClass()}>Event Verification</h3>
                  <p className={textClass()}>
                    The relayer verifies events from both chains before executing cross-chain operations, ensuring 
                    the integrity of bridge transfers.
                  </p>
                </div>
              </div>
            </section>

            {/* Tokenomics Section */}
            <section id="tokenomics" className="mb-16 scroll-mt-28">
              <div className={sectionCardClass()}>
                <h2 className={headingClass()}>Tokenomics</h2>
                
                <div className="mb-8">
                  <h3 className={subHeadingClass()}>SBX Token</h3>
                  <p className={textClass()}>
                    SBX is the unified token representing shares in the pool. It maintains a 1:1 peg with USD and 
                    uses a rebasing mechanism to reflect yield accrual.
                  </p>
                </div>

                <div className="mb-8">
                  <h3 className={subHeadingClass()}>Rebasing Mechanism</h3>
                  <p className={textClass()}>
                    SBX tokens automatically rebase to reflect earned yield, maintaining the 1:1 USD peg while allowing 
                    holders to see their balance grow over time.
                  </p>
                </div>

                <div className="mb-8">
                  <h3 className={subHeadingClass()}>Yield Distribution</h3>
                  <p className={textClass()}>
                    All yield generated from the pool is distributed proportionally to all SBX holders, regardless of 
                    which currency they originally deposited.
                  </p>
                </div>
              </div>
            </section>

            {/* Roadmap Section */}
            <section id="roadmap" className="mb-16 scroll-mt-28">
              <div className={sectionCardClass()}>
                <h2 className={headingClass()}>Roadmap</h2>
                
                <div className="mb-8">
                  <h3 className={subHeadingClass()}>Current Status</h3>
                  <p className={textClass()}>
                    ✅ <strong className="text-white">Production Ready - Multi-Chain Support</strong>
                  </p>
                  <ul className={listTextClass()}>
                    <li>✅ Multi-currency staking on both L1 and EVM</li>
                    <li>✅ Direct A→B swaps on both chains</li>
                    <li>✅ Cross-chain token transfers</li>
                    <li>✅ Multi-wallet support (IOTA L1 and EVM)</li>
                    <li>✅ Unified basket architecture</li>
                    <li>✅ Shared objects (L1)</li>
                    <li>✅ Asymmetric withdrawal rules</li>
                    <li>✅ Unified APY</li>
                    <li>✅ Flash loan vault (L1)</li>
                    <li>✅ Complete frontend dApp</li>
                  </ul>
                </div>

                <div>
                  <h3 className={subHeadingClass()}>Future Development</h3>
                  <ul className="text-zinc-300 space-y-2">
                    <li>• Additional regional stablecoins</li>
                    <li>• Enhanced yield strategies</li>
                    <li>• Governance mechanisms</li>
                    <li>• Advanced analytics dashboard</li>
                    <li>• Mobile application</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Footer */}
            <div className={cn(
              "mt-16 pt-8 border-t text-center text-sm",
              isDarkMode 
                ? "border-white/10 text-zinc-500"
                : "border-gray-200 text-gray-500"
            )}>
              <p>StableX Whitepaper v1.0 | Built on IOTA</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

