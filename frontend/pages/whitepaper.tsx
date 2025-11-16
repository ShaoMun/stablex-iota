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
    id: "pool-mechanics", 
    title: "Pool Mechanics",
    subsections: ["Unified Basket", "SBX Token", "Asymmetric Withdrawal", "Unified APY"]
  },
  { 
    id: "price-feeds", 
    title: "Price Feed Architecture",
    subsections: ["API Integration", "Price Format", "Off-Chain Queries"]
  },
  { 
    id: "swapping", 
    title: "Swapping Mechanism",
    subsections: ["Direct A→B Swaps", "Rate Calculation", "Infinity Pool"]
  },
  { 
    id: "fee-structure", 
    title: "Fee Structure",
    subsections: ["Three-Tier System", "Fee Calculation", "Dynamic Pricing"]
  },
  { 
    id: "architecture", 
    title: "Architecture",
    subsections: ["System Overview", "Component Diagram", "Data Flow"]
  },
  { 
    id: "bridging", 
    title: "Cross-Chain Bridge",
    subsections: ["Bridge Flow", "Lock/Mint", "Burn/Unlock", "Relayer"]
  },
  { 
    id: "multi-chain", 
    title: "Multi-Chain Architecture",
    subsections: ["L1 Components", "EVM Components", "Unified Liquidity"]
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
    // Set current date and time in CET timezone
    // CET is UTC+1 (CEST is UTC+2 during daylight saving, typically March-October)
    const now = new Date();
    
    // Get date/time in Europe/Berlin timezone (CET/CEST)
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Berlin',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(now);
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    const year = parts.find(p => p.type === 'year')?.value;
    const hour = parts.find(p => p.type === 'hour')?.value;
    const minute = parts.find(p => p.type === 'minute')?.value;
    
    // Determine if DST is active (CEST) by comparing UTC and Berlin time
    // CET is UTC+1, CEST is UTC+2
    const utcHours = now.getUTCHours();
    const berlinHours = parseInt(hour || '0', 10);
    let offsetHours = berlinHours - utcHours;
    // Handle day boundary cases (offset can be negative if crossing midnight)
    if (offsetHours > 12) offsetHours -= 24;
    if (offsetHours < -12) offsetHours += 24;
    const timezone = offsetHours === 2 ? 'CEST' : 'CET';
    
    const dateString = `${month} ${day}, ${year}, ${hour}:${minute} ${timezone}`;
    setCurrentDate(dateString);

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
                Version 1.0 | Last Updated: {currentDate}
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
                    The exchange addresses fragmented liquidity for regional stablecoins by allowing users to deposit USDC or regional stablecoins, 
                    earn unified yield, and receive SBX tokens that can be withdrawn as any currency (with asymmetric withdrawal rules).
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
                  
                  {/* Chart 5: Pool Architecture */}
                  <div className="mb-6">
                    <h4 className={chartTitleClass()}>Chart 5: Pool Architecture</h4>
                    <div className={cn(
                      "rounded-lg p-4 border overflow-x-auto",
                      isDarkMode 
                        ? "bg-black/40 border-white/20"
                        : "bg-gray-50 border-gray-300"
                    )}>
                      <svg viewBox="0 0 900 700" className="w-full h-auto">
                        {/* Central Pool */}
                        <circle cx="450" cy="350" r="120"
                          fill={isDarkMode ? "rgba(75, 20, 120, 0.3)" : "rgba(139, 92, 246, 0.15)"}
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.7)" : "rgba(139, 92, 246, 0.5)"}
                          strokeWidth="3"/>
                        <text x="450" y="330" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="16" fontWeight="bold">Unified Pool</text>
                        <text x="450" y="350" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="12">Unified Basket</text>
                        <text x="450" y="370" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="11">All Currencies</text>
                        <text x="450" y="390" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">USDC + CHFX + TRYB + SEKX</text>
                        
                        {/* Currency Nodes */}
                        {/* USDC */}
                        <circle cx="450" cy="150" r="50"
                          fill={isDarkMode ? "rgba(139, 92, 246, 0.25)" : "rgba(139, 92, 246, 0.12)"}
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.4)"}
                          strokeWidth="2"/>
                        <text x="450" y="155" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="14" fontWeight="bold">USDC</text>
                        
                        {/* CHFX */}
                        <circle cx="200" cy="350" r="50"
                          fill={isDarkMode ? "rgba(139, 92, 246, 0.25)" : "rgba(139, 92, 246, 0.12)"}
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.4)"}
                          strokeWidth="2"/>
                        <text x="200" y="355" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="14" fontWeight="bold">CHFX</text>
                        
                        {/* TRYB */}
                        <circle cx="450" cy="550" r="50"
                          fill={isDarkMode ? "rgba(139, 92, 246, 0.25)" : "rgba(139, 92, 246, 0.12)"}
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.4)"}
                          strokeWidth="2"/>
                        <text x="450" y="555" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="14" fontWeight="bold">TRYB</text>
                        
                        {/* SEKX */}
                        <circle cx="700" cy="350" r="50"
                          fill={isDarkMode ? "rgba(139, 92, 246, 0.25)" : "rgba(139, 92, 246, 0.12)"}
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.4)"}
                          strokeWidth="2"/>
                        <text x="700" y="355" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="14" fontWeight="bold">SEKX</text>
                        
                        {/* SBX Token */}
                        <rect x="380" y="250" width="140" height="60" rx="8"
                          fill={isDarkMode ? "rgba(88, 28, 135, 0.4)" : "rgba(139, 92, 246, 0.2)"}
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.8)" : "rgba(139, 92, 246, 0.6)"}
                          strokeWidth="2.5"/>
                        <text x="450" y="275" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="14" fontWeight="bold">SBX Token</text>
                        <text x="450" y="295" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="11">1 SBX = 1 USD</text>
                        
                        {/* User Deposit */}
                        <rect x="50" y="300" width="100" height="60" rx="8"
                          fill={isDarkMode ? "rgba(139, 92, 246, 0.2)" : "rgba(139, 92, 246, 0.1)"}
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.5)" : "rgba(139, 92, 246, 0.3)"}
                          strokeWidth="2"/>
                        <text x="100" y="325" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="12" fontWeight="bold">User</text>
                        <text x="100" y="345" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">Deposit</text>
                        
                        {/* User Withdrawal */}
                        <rect x="750" y="300" width="100" height="60" rx="8"
                          fill={isDarkMode ? "rgba(139, 92, 246, 0.2)" : "rgba(139, 92, 246, 0.1)"}
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.5)" : "rgba(139, 92, 246, 0.3)"}
                          strokeWidth="2"/>
                        <text x="800" y="325" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="12" fontWeight="bold">User</text>
                        <text x="800" y="345" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">Withdraw</text>
                        
                        {/* Arrows - Deposit Flow */}
                        <path d="M 150 330 L 330 350" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.5)"}
                          strokeWidth="2.5" fill="none" markerEnd="url(#arrowhead)"/>
                        <text x="240" y="335" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">Deposit</text>
                        
                        <path d="M 450 330 L 450 310" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.5)"}
                          strokeWidth="2.5" fill="none" markerEnd="url(#arrowhead)"/>
                        <text x="470" y="315" textAnchor="start"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">Mint SBX</text>
                        
                        {/* Arrows - Withdrawal Flow */}
                        <path d="M 570 350 L 750 330" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.5)"}
                          strokeWidth="2.5" fill="none" markerEnd="url(#arrowhead)"/>
                        <text x="660" y="335" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">Withdraw</text>
                        
                        <path d="M 450 370 L 450 390" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.5)"}
                          strokeWidth="2.5" fill="none" markerEnd="url(#arrowhead)"/>
                        <text x="470" y="385" textAnchor="start"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">Burn SBX</text>
                        
                        {/* Connections from currencies to pool */}
                        <path d="M 450 200 L 450 230" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.4)" : "rgba(139, 92, 246, 0.3)"}
                          strokeWidth="2" fill="none"/>
                        <path d="M 250 350 L 330 350" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.4)" : "rgba(139, 92, 246, 0.3)"}
                          strokeWidth="2" fill="none"/>
                        <path d="M 450 500 L 450 470" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.4)" : "rgba(139, 92, 246, 0.3)"}
                          strokeWidth="2" fill="none"/>
                        <path d="M 650 350 L 570 350" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.4)" : "rgba(139, 92, 246, 0.3)"}
                          strokeWidth="2" fill="none"/>
                        
                        {/* Asymmetric Withdrawal Rules */}
                        <rect x="50" y="600" width="400" height="80" rx="8"
                          fill={isDarkMode ? "rgba(88, 28, 135, 0.2)" : "rgba(139, 92, 246, 0.1)"}
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.5)" : "rgba(139, 92, 246, 0.3)"}
                          strokeWidth="2"/>
                        <text x="250" y="625" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="13" fontWeight="bold">Asymmetric Withdrawal Rules</text>
                        <text x="70" y="650" textAnchor="start"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="11">• Regional depositors: Can withdraw any regional OR USDC</text>
                        <text x="70" y="670" textAnchor="start"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="11">• USDC depositors: Can only withdraw regional stablecoins</text>
                        
                        {/* Unified APY */}
                        <rect x="450" y="600" width="400" height="80" rx="8"
                          fill={isDarkMode ? "rgba(88, 28, 135, 0.2)" : "rgba(139, 92, 246, 0.1)"}
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.5)" : "rgba(139, 92, 246, 0.3)"}
                          strokeWidth="2"/>
                        <text x="650" y="625" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="13" fontWeight="bold">Unified APY</text>
                        <text x="470" y="650" textAnchor="start"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="11">• All depositors earn same APY</text>
                        <text x="470" y="670" textAnchor="start"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="11">• Weighted average of all currency yields</text>
                        
                        {/* Arrow marker */}
                        <defs>
                          <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                            <polygon points="0 0, 10 3, 0 6" 
                              fill={isDarkMode ? "rgba(139, 92, 246, 0.7)" : "rgba(139, 92, 246, 0.5)"}/>
                          </marker>
                        </defs>
                      </svg>
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
                  
                  {/* Chart 9: Price Feed Architecture */}
                  <div className="mb-6">
                    <h4 className={chartTitleClass()}>Chart 9: Price Feed Architecture</h4>
                    <div className={cn(
                      "rounded-lg p-4 border overflow-x-auto",
                      isDarkMode 
                        ? "bg-black/40 border-white/20"
                        : "bg-gray-50 border-gray-300"
                    )}>
                      <svg viewBox="0 0 900 600" className="w-full h-auto">
                        {/* Price API */}
                        <rect x="50" y="50" width="200" height="100" rx="10"
                          fill={isDarkMode ? "rgba(139, 92, 246, 0.25)" : "rgba(139, 92, 246, 0.12)"}
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.7)" : "rgba(139, 92, 246, 0.5)"}
                          strokeWidth="3"/>
                        <text x="150" y="80" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="15" fontWeight="bold">Price Feed API</text>
                        <text x="150" y="105" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="11">Off-Chain Service</text>
                        <text x="150" y="125" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">External Data Source</text>
                        <text x="150" y="140" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Real-time prices</text>
                        
                        {/* Frontend */}
                        <rect x="350" y="50" width="200" height="150" rx="10"
                          fill={isDarkMode ? "rgba(75, 20, 120, 0.3)" : "rgba(139, 92, 246, 0.15)"}
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.7)" : "rgba(139, 92, 246, 0.5)"}
                          strokeWidth="3"/>
                        <text x="450" y="80" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="15" fontWeight="bold">Frontend</text>
                        <text x="450" y="105" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="11">User Interface</text>
                        
                        {/* Price Fetching Box */}
                        <rect x="370" y="120" width="160" height="50" rx="6"
                          fill={isDarkMode ? "rgba(139, 92, 246, 0.2)" : "rgba(139, 92, 246, 0.1)"}
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.5)" : "rgba(139, 92, 246, 0.3)"}
                          strokeWidth="1.5"/>
                        <text x="450" y="140" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="10" fontWeight="bold">Price Fetching</text>
                        <text x="450" y="160" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">HTTP GET request</text>
                        
                        {/* Price Format Box */}
                        <rect x="370" y="180" width="160" height="50" rx="6"
                          fill={isDarkMode ? "rgba(139, 92, 246, 0.2)" : "rgba(139, 92, 246, 0.1)"}
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.5)" : "rgba(139, 92, 246, 0.3)"}
                          strokeWidth="1.5"/>
                        <text x="450" y="200" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="10" fontWeight="bold">Format Conversion</text>
                        <text x="450" y="220" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Convert to micro-USD</text>
                        
                        {/* Smart Contract */}
                        <rect x="650" y="50" width="200" height="150" rx="10"
                          fill={isDarkMode ? "rgba(75, 20, 120, 0.3)" : "rgba(139, 92, 246, 0.15)"}
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.7)" : "rgba(139, 92, 246, 0.5)"}
                          strokeWidth="3"/>
                        <text x="750" y="80" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="15" fontWeight="bold">Smart Contract</text>
                        <text x="750" y="105" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="11">Pool / Bridge</text>
                        
                        {/* Function Parameters Box */}
                        <rect x="670" y="120" width="160" height="50" rx="6"
                          fill={isDarkMode ? "rgba(139, 92, 246, 0.2)" : "rgba(139, 92, 246, 0.1)"}
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.5)" : "rgba(139, 92, 246, 0.3)"}
                          strokeWidth="1.5"/>
                        <text x="750" y="140" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="10" fontWeight="bold">Function Parameters</text>
                        <text x="750" y="160" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Prices as params</text>
                        
                        {/* Flow Steps */}
                        <g id="flow-steps">
                          {/* Step 1 */}
                          <circle cx="150" cy="250" r="15"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.8)" : "rgba(139, 92, 246, 0.6)"}
                            stroke={isDarkMode ? "#fff" : "#1f2937"} strokeWidth="2"/>
                          <text x="150" y="256" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="11" fontWeight="bold">1</text>
                          <text x="150" y="280" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">User initiates</text>
                          <text x="150" y="295" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">transaction</text>
                          
                          {/* Step 2 */}
                          <circle cx="450" cy="250" r="15"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.8)" : "rgba(139, 92, 246, 0.6)"}
                            stroke={isDarkMode ? "#fff" : "#1f2937"} strokeWidth="2"/>
                          <text x="450" y="256" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="11" fontWeight="bold">2</text>
                          <text x="450" y="280" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">Frontend queries</text>
                          <text x="450" y="295" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Price API</text>
                          
                          {/* Step 3 */}
                          <circle cx="750" cy="250" r="15"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.8)" : "rgba(139, 92, 246, 0.6)"}
                            stroke={isDarkMode ? "#fff" : "#1f2937"} strokeWidth="2"/>
                          <text x="750" y="256" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="11" fontWeight="bold">3</text>
                          <text x="750" y="280" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">Submit transaction</text>
                          <text x="750" y="295" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">with prices</text>
                        </g>
                        
                        {/* Arrows */}
                        {/* Step 1 to 2 */}
                        <path d="M 165 250 L 435 250" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.5)"}
                          strokeWidth="2.5" fill="none" markerEnd="url(#arrowhead)"/>
                        <text x="300" y="245" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">User action</text>
                        
                        {/* Step 2: Frontend to API */}
                        <path d="M 350 125 Q 250 200 150 150" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.5)" : "rgba(139, 92, 246, 0.4)"}
                          strokeWidth="2" fill="none" strokeDasharray="4,4" markerEnd="url(#arrowhead)"/>
                        <text x="250" y="130" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">HTTP GET</text>
                        
                        {/* Step 2: API to Frontend */}
                        <path d="M 250 150 Q 300 100 350 125" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.5)" : "rgba(139, 92, 246, 0.4)"}
                          strokeWidth="2" fill="none" strokeDasharray="4,4" markerEnd="url(#arrowhead)"/>
                        <text x="300" y="110" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Price data</text>
                        
                        {/* Step 2 to 3 */}
                        <path d="M 550 250 L 735 250" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.5)"}
                          strokeWidth="2.5" fill="none" markerEnd="url(#arrowhead)"/>
                        <text x="640" y="245" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Transaction</text>
                        
                        {/* Price Format Details */}
                        <rect x="50" y="350" width="400" height="120" rx="8"
                          fill={isDarkMode ? "rgba(88, 28, 135, 0.2)" : "rgba(139, 92, 246, 0.1)"}
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.5)" : "rgba(139, 92, 246, 0.3)"}
                          strokeWidth="2"/>
                        <text x="250" y="375" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="13" fontWeight="bold">Price Format: Micro-USD</text>
                        <text x="70" y="400" textAnchor="start"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="11">• 1 micro-USD = 1,000,000 (1e6)</text>
                        <text x="70" y="420" textAnchor="start"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="11">• $1.00 = 1,000,000 micro-USD</text>
                        <text x="70" y="440" textAnchor="start"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="11">• All prices converted before passing to contract</text>
                        <text x="70" y="460" textAnchor="start"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="11">• No on-chain oracle queries required</text>
                        
                        {/* Benefits */}
                        <rect x="450" y="350" width="400" height="120" rx="8"
                          fill={isDarkMode ? "rgba(88, 28, 135, 0.2)" : "rgba(139, 92, 246, 0.1)"}
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.5)" : "rgba(139, 92, 246, 0.3)"}
                          strokeWidth="2"/>
                        <text x="650" y="375" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="13" fontWeight="bold">Benefits</text>
                        <text x="470" y="400" textAnchor="start"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="11">• Lower gas costs (no on-chain queries)</text>
                        <text x="470" y="420" textAnchor="start"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="11">• Better flexibility (multiple data sources)</text>
                        <text x="470" y="440" textAnchor="start"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="11">• Faster transaction processing</text>
                        <text x="470" y="460" textAnchor="start"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="11">• Reduced dependency on oracle networks</text>
                        
                        {/* Example Transaction */}
                        <rect x="200" y="500" width="500" height="80" rx="8"
                          fill={isDarkMode ? "rgba(0, 0, 0, 0.3)" : "rgba(255, 255, 255, 0.5)"}
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.4)" : "rgba(139, 92, 246, 0.3)"}
                          strokeWidth="1.5"/>
                        <text x="450" y="525" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="12" fontWeight="bold">Example: Swap Transaction</text>
                        <text x="220" y="550" textAnchor="start"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">swap(currencyA, currencyB, amount, priceA, priceB)</text>
                        <text x="220" y="570" textAnchor="start"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">• priceA and priceB are fetched off-chain and passed as parameters</text>
                        
                        {/* Arrow marker */}
                        <defs>
                          <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                            <polygon points="0 0, 10 3, 0 6" 
                              fill={isDarkMode ? "rgba(139, 92, 246, 0.7)" : "rgba(139, 92, 246, 0.5)"}/>
                          </marker>
                        </defs>
                      </svg>
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
                  
                  {/* Chart 7: Direct A→B Swap Flow */}
                  <div className="mb-6">
                    <h4 className={chartTitleClass()}>Chart 7: Direct A→B Swap Flow</h4>
                    <div className={cn(
                      "rounded-lg p-4 border overflow-x-auto",
                      isDarkMode 
                        ? "bg-black/40 border-white/20"
                        : "bg-gray-50 border-gray-300"
                    )}>
                      <svg viewBox="0 0 900 500" className="w-full h-auto">
                        {/* User */}
                        <rect x="50" y="200" width="120" height="60" rx="8"
                          fill={isDarkMode ? "rgba(139, 92, 246, 0.2)" : "rgba(139, 92, 246, 0.1)"}
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.5)" : "rgba(139, 92, 246, 0.3)"}
                          strokeWidth="2"/>
                        <text x="110" y="225" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="12" fontWeight="bold">User</text>
                        <text x="110" y="245" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">Wants to swap</text>
                        
                        {/* Currency A */}
                        <rect x="50" y="50" width="120" height="60" rx="8"
                          fill={isDarkMode ? "rgba(139, 92, 246, 0.25)" : "rgba(139, 92, 246, 0.12)"}
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.4)"}
                          strokeWidth="2"/>
                        <text x="110" y="75" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="13" fontWeight="bold">Currency A</text>
                        <text x="110" y="95" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">e.g., CHFX</text>
                        
                        {/* Price Feed API */}
                        <rect x="750" y="50" width="100" height="60" rx="8"
                          fill={isDarkMode ? "rgba(139, 92, 246, 0.2)" : "rgba(139, 92, 246, 0.1)"}
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.5)" : "rgba(139, 92, 246, 0.3)"}
                          strokeWidth="2"/>
                        <text x="800" y="75" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="12" fontWeight="bold">Price API</text>
                        <text x="800" y="95" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">Off-Chain</text>
                        
                        {/* Pool */}
                        <rect x="350" y="150" width="200" height="180" rx="10"
                          fill={isDarkMode ? "rgba(75, 20, 120, 0.3)" : "rgba(139, 92, 246, 0.15)"}
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.7)" : "rgba(139, 92, 246, 0.5)"}
                          strokeWidth="3"/>
                        <text x="450" y="180" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="14" fontWeight="bold">Unified Pool</text>
                        <text x="450" y="205" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="11">All Currencies</text>
                        <text x="450" y="230" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">USDC + CHFX + TRYB + SEKX</text>
                        
                        {/* Pool Balance Box */}
                        <rect x="370" y="250" width="160" height="60" rx="6"
                          fill={isDarkMode ? "rgba(139, 92, 246, 0.15)" : "rgba(139, 92, 246, 0.08)"}
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.4)" : "rgba(139, 92, 246, 0.25)"}
                          strokeWidth="1.5"/>
                        <text x="450" y="270" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="10" fontWeight="bold">Pool Balance</text>
                        <text x="450" y="290" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Updates after swap</text>
                        <text x="450" y="305" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Fee calculated</text>
                        
                        {/* Currency B */}
                        <rect x="750" y="200" width="120" height="60" rx="8"
                          fill={isDarkMode ? "rgba(139, 92, 246, 0.25)" : "rgba(139, 92, 246, 0.12)"}
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.4)"}
                          strokeWidth="2"/>
                        <text x="810" y="225" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="13" fontWeight="bold">Currency B</text>
                        <text x="810" y="245" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">e.g., TRYB</text>
                        
                        {/* Steps */}
                        <g id="steps">
                          {/* Step 1 */}
                          <circle cx="200" cy="80" r="15"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.8)" : "rgba(139, 92, 246, 0.6)"}
                            stroke={isDarkMode ? "#fff" : "#1f2937"} strokeWidth="2"/>
                          <text x="200" y="86" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="11" fontWeight="bold">1</text>
                          <text x="200" y="110" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">User sends</text>
                          <text x="200" y="125" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">Currency A</text>
                          
                          {/* Step 2 */}
                          <circle cx="200" cy="230" r="15"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.8)" : "rgba(139, 92, 246, 0.6)"}
                            stroke={isDarkMode ? "#fff" : "#1f2937"} strokeWidth="2"/>
                          <text x="200" y="236" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="11" fontWeight="bold">2</text>
                          <text x="200" y="260" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">Query prices</text>
                          
                          {/* Step 3 */}
                          <circle cx="450" cy="100" r="15"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.8)" : "rgba(139, 92, 246, 0.6)"}
                            stroke={isDarkMode ? "#fff" : "#1f2937"} strokeWidth="2"/>
                          <text x="450" y="106" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="11" fontWeight="bold">3</text>
                          <text x="450" y="130" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">Calculate rate</text>
                          <text x="450" y="145" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">rate = price_B / price_A</text>
                          
                          {/* Step 4 */}
                          <circle cx="450" cy="350" r="15"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.8)" : "rgba(139, 92, 246, 0.6)"}
                            stroke={isDarkMode ? "#fff" : "#1f2937"} strokeWidth="2"/>
                          <text x="450" y="356" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="11" fontWeight="bold">4</text>
                          <text x="450" y="380" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">Calculate fee</text>
                          <text x="450" y="395" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Based on pool depth</text>
                          
                          {/* Step 5 */}
                          <circle cx="700" cy="230" r="15"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.8)" : "rgba(139, 92, 246, 0.6)"}
                            stroke={isDarkMode ? "#fff" : "#1f2937"} strokeWidth="2"/>
                          <text x="700" y="236" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="11" fontWeight="bold">5</text>
                          <text x="700" y="260" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">Direct transfer</text>
                          <text x="700" y="275" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">No intermediate</text>
                        </g>
                        
                        {/* Arrows */}
                        {/* Step 1: User sends Currency A */}
                        <path d="M 170 80 L 350 180" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.5)"}
                          strokeWidth="2.5" fill="none" markerEnd="url(#arrowhead)"/>
                        <text x="250" y="120" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Send A</text>
                        
                        {/* Step 2: Query prices */}
                        <path d="M 110 230 Q 400 150 750 80" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.4)" : "rgba(139, 92, 246, 0.3)"}
                          strokeWidth="1.5" fill="none" strokeDasharray="4,4" markerEnd="url(#arrowhead)"/>
                        <text x="430" y="100" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Query prices</text>
                        
                        {/* Step 3: Prices to pool */}
                        <path d="M 800 110 L 600 150" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.4)" : "rgba(139, 92, 246, 0.3)"}
                          strokeWidth="1.5" fill="none" strokeDasharray="4,4" markerEnd="url(#arrowhead)"/>
                        <text x="700" y="125" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Price params</text>
                        
                        {/* Step 4: Pool calculates */}
                        <path d="M 450 330 L 450 300" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.5)" : "rgba(139, 92, 246, 0.4)"}
                          strokeWidth="2" fill="none"/>
                        
                        {/* Step 5: Pool sends Currency B */}
                        <path d="M 550 240 L 750 230" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.5)"}
                          strokeWidth="2.5" fill="none" markerEnd="url(#arrowhead)"/>
                        <text x="650" y="230" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Receive B</text>
                        
                        {/* No Intermediate Label */}
                        <rect x="300" y="400" width="300" height="50" rx="6"
                          fill={isDarkMode ? "rgba(88, 28, 135, 0.3)" : "rgba(139, 92, 246, 0.15)"}
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.4)"}
                          strokeWidth="2"/>
                        <text x="450" y="425" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="13" fontWeight="bold">Direct A→B Swap</text>
                        <text x="450" y="445" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">No intermediate token required</text>
                        
                        {/* Arrow marker */}
                        <defs>
                          <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                            <polygon points="0 0, 10 3, 0 6" 
                              fill={isDarkMode ? "rgba(139, 92, 246, 0.7)" : "rgba(139, 92, 246, 0.5)"}/>
                          </marker>
                        </defs>
                      </svg>
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
                  
                  {/* Chart 6: Three-Tier Fee Curve */}
                  <div className="mb-6">
                    <h4 className={chartTitleClass()}>Chart 6: Three-Tier Fee Curve</h4>
                    <div className={cn(
                      "rounded-lg p-4 border overflow-x-auto",
                      isDarkMode 
                        ? "bg-black/40 border-white/20"
                        : "bg-gray-50 border-gray-300"
                    )}>
                      <svg viewBox="0 0 800 500" className="w-full h-auto">
                        {/* Axes */}
                        {/* Y-axis */}
                        <line x1="80" y1="50" x2="80" y2="420"
                          stroke={isDarkMode ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.3)"}
                          strokeWidth="2"/>
                        {/* X-axis */}
                        <line x1="80" y1="420" x2="750" y2="420"
                          stroke={isDarkMode ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.3)"}
                          strokeWidth="2"/>
                        
                        {/* Y-axis labels - scaled to 1500 bps max */}
                        <text x="40" y="425" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="11">0</text>
                        <text x="40" y="385" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="11">300</text>
                        <text x="40" y="345" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="11">600</text>
                        <text x="40" y="305" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="11">900</text>
                        <text x="40" y="265" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="11">1200</text>
                        <text x="40" y="65" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="11">1500</text>
                        <text x="20" y="240" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="12" fontWeight="bold" transform="rotate(-90, 20, 240)">Fee (bps)</text>
                        
                        {/* X-axis labels */}
                        <text x="80" y="445" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="11">0%</text>
                        <text x="200" y="445" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="11">20%</text>
                        <text x="320" y="445" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="11">40%</text>
                        <text x="440" y="445" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="11">60%</text>
                        <text x="560" y="445" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="11">80%</text>
                        <text x="680" y="445" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="11">100%</text>
                        <text x="415" y="470" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="12" fontWeight="bold">Pool Coverage (%)</text>
                        
                        {/* Threshold lines */}
                        {/* 30% threshold */}
                        <line x1="272" y1="50" x2="272" y2="420"
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.4)" : "rgba(139, 92, 246, 0.3)"}
                          strokeWidth="1.5" strokeDasharray="4,4"/>
                        <text x="272" y="435" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10" fontWeight="bold">30%</text>
                        
                        {/* 80% threshold */}
                        <line x1="584" y1="50" x2="584" y2="420"
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.4)" : "rgba(139, 92, 246, 0.3)"}
                          strokeWidth="1.5" strokeDasharray="4,4"/>
                        <text x="584" y="435" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10" fontWeight="bold">80%</text>
                        
                        {/* Fee Curve - Based on actual calculation mechanism */}
                        {/* Formula: 
                            Tier 1 (≥80%): fee = floor(5) + base(2) = 7 bps (flat)
                            Tier 2 (30-80%): fee = floor + base + k*dev/10000 (linear, 7-32 bps)
                            Tier 3 (<30%): fee = (floor+base)*10 + k*dev^2*5/(threshold*10000) (exponential, no cap)
                        */}
                        {/* Y-axis: 420 = 0 bps, 50 = 1500 bps. Formula: y = 420 - (bps/1500) * 370 */}
                        {/* Key points: 7 bps @ 80% = y ~418, 32 bps @ 30% = y ~412, 77 bps @ 29% = y ~401, 1432 bps @ 1% = y ~66 */}
                        
                        {/* Tier 3: Exponential (<30%) - from 32 bps @ 30% to 1432 bps @ 1% */}
                        {/* Calculated points based on formula: fee = (floor+base)*10 + k*dev^2*5/(threshold*10000) */}
                        {/* Coverage → Fee: 30%→32bps(y=412), 29%→77bps(y=401), 25%→177bps(y=376), 20%→327bps(y=339), 15%→552bps(y=284), 10%→827bps(y=216), 5%→1152bps(y=136), 1%→1432bps(y=66) */}
                        {/* X positions: 30%=272, 29%=274, 25%=248, 20%=214, 15%=181, 10%=147, 5%=114, 1%=87 */}
                        {/* Using smooth cubic bezier curves to connect calculated points */}
                        <path d="M 272 412 
                                  C 273 406, 273 403, 274 401
                                  C 271 398, 265 390, 248 376
                                  C 230 360, 220 350, 214 339
                                  C 205 325, 195 310, 181 284
                                  C 170 265, 160 245, 147 216
                                  C 135 190, 125 165, 114 136
                                  C 105 110, 98 90, 87 66"
                          fill="none"
                          stroke={isDarkMode ? "rgba(239, 68, 68, 0.8)" : "rgba(220, 38, 38, 0.8)"}
                          strokeWidth="3"/>
                        
                        {/* Tier 2: Linear (30-80%) - from 32 bps @ 30% to 7 bps @ 80% */}
                        {/* Linear interpolation: 7 bps @ 80% (y=418), 32 bps @ 30% (y=412) */}
                        <path d="M 272 412 L 584 418"
                          fill="none"
                          stroke={isDarkMode ? "rgba(251, 191, 36, 0.8)" : "rgba(217, 119, 6, 0.8)"}
                          strokeWidth="3"/>
                        
                        {/* Tier 1: Flat (≥80%) - constant 7 bps */}
                        <path d="M 584 418 L 750 418"
                          fill="none"
                          stroke={isDarkMode ? "rgba(34, 197, 94, 0.8)" : "rgba(22, 163, 74, 0.8)"}
                          strokeWidth="3"/>
                        
                        {/* Tier Labels */}
                        <rect x="600" y="60" width="140" height="100" rx="6"
                          fill={isDarkMode ? "rgba(0, 0, 0, 0.4)" : "rgba(255, 255, 255, 0.8)"}
                          stroke={isDarkMode ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)"}
                          strokeWidth="1"/>
                        <text x="670" y="85" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="12" fontWeight="bold">Tiers</text>
                        
                        {/* Tier 1 */}
                        <line x1="610" y1="105" x2="630" y2="105"
                          stroke={isDarkMode ? "rgba(34, 197, 94, 0.8)" : "rgba(22, 163, 74, 0.8)"}
                          strokeWidth="3"/>
                        <text x="640" y="110" textAnchor="start"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">Tier 1: ≥80% (7 bps)</text>
                        
                        {/* Tier 2 */}
                        <line x1="610" y1="125" x2="630" y2="125"
                          stroke={isDarkMode ? "rgba(251, 191, 36, 0.8)" : "rgba(217, 119, 6, 0.8)"}
                          strokeWidth="3"/>
                        <text x="640" y="130" textAnchor="start"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">Tier 2: 30-80% (7-32 bps)</text>
                        
                        {/* Tier 3 */}
                        <line x1="610" y1="145" x2="630" y2="145"
                          stroke={isDarkMode ? "rgba(239, 68, 68, 0.8)" : "rgba(220, 38, 38, 0.8)"}
                          strokeWidth="3"/>
                        <text x="640" y="150" textAnchor="start"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">Tier 3: &lt;30% (exponential)</text>
                        
                        {/* Example points - based on actual calculation values */}
                        {/* 7 bps @ 80%: y = 420 - (7/1500) * 370 ≈ 418 */}
                        <circle cx="584" cy="418" r="4"
                          fill={isDarkMode ? "#fff" : "#1f2937"}
                          stroke={isDarkMode ? "rgba(34, 197, 94, 0.8)" : "rgba(22, 163, 74, 0.8)"}
                          strokeWidth="2"/>
                        <text x="595" y="413" textAnchor="start"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">7 bps @ 80%</text>
                        
                        {/* 32 bps @ 30%: y = 420 - (32/1500) * 370 ≈ 412 */}
                        <circle cx="272" cy="412" r="4"
                          fill={isDarkMode ? "#fff" : "#1f2937"}
                          stroke={isDarkMode ? "rgba(251, 191, 36, 0.8)" : "rgba(217, 119, 6, 0.8)"}
                          strokeWidth="2"/>
                        <text x="285" y="407" textAnchor="start"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">32 bps @ 30%</text>
                        
                        {/* 77 bps @ 29%: y = 420 - (77/1500) * 370 ≈ 401 */}
                        <circle cx="268" cy="401" r="4"
                          fill={isDarkMode ? "#fff" : "#1f2937"}
                          stroke={isDarkMode ? "rgba(239, 68, 68, 0.8)" : "rgba(220, 38, 38, 0.8)"}
                          strokeWidth="2"/>
                        <text x="280" y="396" textAnchor="start"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">77 bps @ 29%</text>
                        
                        {/* 1432 bps @ 1%: y = 420 - (1432/1500) * 370 ≈ 66 */}
                        <circle cx="87" cy="66" r="4"
                          fill={isDarkMode ? "#fff" : "#1f2937"}
                          stroke={isDarkMode ? "rgba(239, 68, 68, 0.8)" : "rgba(220, 38, 38, 0.8)"}
                          strokeWidth="2"/>
                        <text x="100" y="61" textAnchor="start"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">1432 bps @ 1%</text>
                      </svg>
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
                  
                  {/* Chart 1: System Architecture Overview */}
                  <div className="mb-6">
                    <h4 className={chartTitleClass()}>Chart 1: System Architecture Overview</h4>
                    <div className={cn(
                      "rounded-lg p-4 border overflow-x-auto",
                      isDarkMode 
                        ? "bg-black/40 border-white/20"
                        : "bg-gray-50 border-gray-300"
                    )}>
                      <svg viewBox="0 0 800 500" className="w-full h-auto">
                        {/* Background */}
                        <rect width="800" height="500" fill="transparent"/>
                        
                        {/* User Layer */}
                        <g id="users">
                          <rect x="50" y="30" width="120" height="60" rx="8" 
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.2)" : "rgba(139, 92, 246, 0.1)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.5)" : "rgba(139, 92, 246, 0.3)"}
                            strokeWidth="2"/>
                          <text x="110" y="50" textAnchor="middle" 
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="12" fontWeight="bold">Users</text>
                          <text x="110" y="70" textAnchor="middle" 
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">Wallets & Frontend</text>
                        </g>
                        
                        {/* Price Feed API */}
                        <g id="price-feed">
                          <rect x="630" y="30" width="120" height="60" rx="8"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.2)" : "rgba(139, 92, 246, 0.1)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.5)" : "rgba(139, 92, 246, 0.3)"}
                            strokeWidth="2"/>
                          <text x="690" y="50" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="12" fontWeight="bold">Price Feed API</text>
                          <text x="690" y="70" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">Off-Chain Queries</text>
                        </g>
                        
                        {/* IOTA L1 Layer */}
                        <g id="l1-layer">
                          <rect x="50" y="150" width="300" height="140" rx="12"
                            fill={isDarkMode ? "rgba(75, 20, 120, 0.3)" : "rgba(139, 92, 246, 0.1)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.4)"}
                            strokeWidth="2"/>
                          <text x="200" y="175" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="14" fontWeight="bold">IOTA L1 Layer</text>
                          <text x="200" y="195" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="11">Move Contracts</text>
                          
                          {/* L1 Components */}
                          <rect x="70" y="210" width="100" height="50" rx="6"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.15)" : "rgba(139, 92, 246, 0.08)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.4)" : "rgba(139, 92, 246, 0.25)"}
                            strokeWidth="1.5"/>
                          <text x="120" y="230" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="10" fontWeight="600">Pool</text>
                          <text x="120" y="245" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">sbx_pool.move</text>
                          
                          <rect x="190" y="210" width="100" height="50" rx="6"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.15)" : "rgba(139, 92, 246, 0.08)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.4)" : "rgba(139, 92, 246, 0.25)"}
                            strokeWidth="1.5"/>
                          <text x="240" y="230" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="10" fontWeight="600">Bridge</text>
                          <text x="240" y="245" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">bridge_l1.move</text>
                          
                          <rect x="310" y="210" width="20" height="50" rx="6"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.15)" : "rgba(139, 92, 246, 0.08)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.4)" : "rgba(139, 92, 246, 0.25)"}
                            strokeWidth="1.5"/>
                          <text x="320" y="235" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="9" fontWeight="600">Tokens</text>
                        </g>
                        
                        {/* IOTA EVM Layer */}
                        <g id="evm-layer">
                          <rect x="450" y="150" width="300" height="140" rx="12"
                            fill={isDarkMode ? "rgba(75, 20, 120, 0.3)" : "rgba(139, 92, 246, 0.1)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.4)"}
                            strokeWidth="2"/>
                          <text x="600" y="175" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="14" fontWeight="bold">IOTA EVM Layer</text>
                          <text x="600" y="195" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="11">Solidity Contracts</text>
                          
                          {/* EVM Components */}
                          <rect x="470" y="210" width="100" height="50" rx="6"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.15)" : "rgba(139, 92, 246, 0.08)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.4)" : "rgba(139, 92, 246, 0.25)"}
                            strokeWidth="1.5"/>
                          <text x="520" y="230" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="10" fontWeight="600">Pool</text>
                          <text x="520" y="245" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">StableXPool.sol</text>
                          
                          <rect x="590" y="210" width="100" height="50" rx="6"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.15)" : "rgba(139, 92, 246, 0.08)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.4)" : "rgba(139, 92, 246, 0.25)"}
                            strokeWidth="1.5"/>
                          <text x="640" y="230" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="10" fontWeight="600">Bridge</text>
                          <text x="640" y="245" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">EVMBridge.sol</text>
                          
                          <rect x="710" y="210" width="20" height="50" rx="6"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.15)" : "rgba(139, 92, 246, 0.08)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.4)" : "rgba(139, 92, 246, 0.25)"}
                            strokeWidth="1.5"/>
                          <text x="720" y="235" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="9" fontWeight="600">ERC-20</text>
                        </g>
                        
                        {/* Bridge Relayer */}
                        <g id="relayer">
                          <ellipse cx="400" cy="350" rx="80" ry="50"
                            fill={isDarkMode ? "rgba(88, 28, 135, 0.3)" : "rgba(139, 92, 246, 0.15)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.7)" : "rgba(139, 92, 246, 0.5)"}
                            strokeWidth="2"/>
                          <text x="400" y="345" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="12" fontWeight="bold">Bridge</text>
                          <text x="400" y="360" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="12" fontWeight="bold">Relayer</text>
                          <text x="400" y="375" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">Event Watcher</text>
                        </g>
                        
                        {/* Arrows */}
                        {/* User to L1 */}
                        <path d="M 110 90 L 110 150" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.5)" : "rgba(139, 92, 246, 0.4)"}
                          strokeWidth="2" fill="none" markerEnd="url(#arrowhead)"/>
                        
                        {/* User to EVM */}
                        <path d="M 110 90 Q 300 120 520 150" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.5)" : "rgba(139, 92, 246, 0.4)"}
                          strokeWidth="2" fill="none" markerEnd="url(#arrowhead)"/>
                        
                        {/* Price Feed to User */}
                        <path d="M 630 90 L 200 90" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.4)" : "rgba(139, 92, 246, 0.3)"}
                          strokeWidth="1.5" fill="none" strokeDasharray="4,4"/>
                        <text x="415" y="85" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Price Queries</text>
                        
                        {/* L1 to Relayer */}
                        <path d="M 350 290 L 400 330" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.5)"}
                          strokeWidth="2" fill="none" markerEnd="url(#arrowhead)"/>
                        <text x="365" y="310" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Events</text>
                        
                        {/* EVM to Relayer */}
                        <path d="M 450 290 L 400 330" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.5)"}
                          strokeWidth="2" fill="none" markerEnd="url(#arrowhead)"/>
                        
                        {/* Relayer to L1 */}
                        <path d="M 360 350 L 300 290" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.5)"}
                          strokeWidth="2" fill="none" markerEnd="url(#arrowhead)"/>
                        
                        {/* Relayer to EVM */}
                        <path d="M 440 350 L 500 290" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.5)"}
                          strokeWidth="2" fill="none" markerEnd="url(#arrowhead)"/>
                        
                        {/* L1 to EVM (direct connection) */}
                        <path d="M 350 220 L 450 220" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.4)" : "rgba(139, 92, 246, 0.3)"}
                          strokeWidth="1.5" fill="none" strokeDasharray="3,3"/>
                        <text x="400" y="215" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Unified Liquidity</text>
                        
                        {/* Arrow marker definition */}
                        <defs>
                          <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                            <polygon points="0 0, 10 3, 0 6" 
                              fill={isDarkMode ? "rgba(139, 92, 246, 0.7)" : "rgba(139, 92, 246, 0.5)"}/>
                          </marker>
                        </defs>
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className={subHeadingClass()}>Component Diagram</h3>
                  <p className={textClass()}>
                    Detailed breakdown of all system components and their interactions.
                  </p>
                  
                  {/* Chart 2: Component Diagram */}
                  <div className="mb-6">
                    <h4 className={chartTitleClass()}>Chart 2: Component Diagram</h4>
                    <div className={cn(
                      "rounded-lg p-4 border overflow-x-auto",
                      isDarkMode 
                        ? "bg-black/40 border-white/20"
                        : "bg-gray-50 border-gray-300"
                    )}>
                      <svg viewBox="0 0 900 600" className="w-full h-auto">
                        {/* L1 Side */}
                        <g id="l1-components">
                          <text x="200" y="30" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="16" fontWeight="bold">IOTA L1 (Move)</text>
                          
                          {/* Shared Objects */}
                          <rect x="50" y="60" width="300" height="80" rx="8"
                            fill={isDarkMode ? "rgba(75, 20, 120, 0.2)" : "rgba(139, 92, 246, 0.08)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.5)" : "rgba(139, 92, 246, 0.3)"}
                            strokeWidth="2"/>
                          <text x="200" y="85" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="12" fontWeight="bold">Shared Objects</text>
                          <text x="100" y="110" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">Pool Registry</text>
                          <text x="200" y="110" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">Token Registry</text>
                          <text x="300" y="110" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">Bridge Registry</text>
                          
                          {/* Pool Contract */}
                          <rect x="50" y="160" width="140" height="90" rx="6"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.2)" : "rgba(139, 92, 246, 0.1)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.4)"}
                            strokeWidth="2"/>
                          <text x="120" y="185" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="11" fontWeight="bold">sbx_pool.move</text>
                          <text x="70" y="210" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">• stake()</text>
                          <text x="70" y="225" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">• unstake()</text>
                          <text x="70" y="240" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">• swap()</text>
                          
                          {/* Bridge Contract */}
                          <rect x="210" y="160" width="140" height="90" rx="6"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.2)" : "rgba(139, 92, 246, 0.1)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.4)"}
                            strokeWidth="2"/>
                          <text x="280" y="185" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="11" fontWeight="bold">bridge_l1.move</text>
                          <text x="230" y="210" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">• lock_*()</text>
                          <text x="230" y="225" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">• unlock()</text>
                          <text x="230" y="240" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">• emit events</text>
                          
                          {/* Flash Vault */}
                          <rect x="50" y="270" width="140" height="70" rx="6"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.2)" : "rgba(139, 92, 246, 0.1)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.4)"}
                            strokeWidth="2"/>
                          <text x="120" y="295" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="11" fontWeight="bold">flash_vault.move</text>
                          <text x="70" y="320" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">• flash_loan()</text>
                          
                          {/* Tokens */}
                          <rect x="210" y="270" width="140" height="70" rx="6"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.2)" : "rgba(139, 92, 246, 0.1)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.4)"}
                            strokeWidth="2"/>
                          <text x="280" y="295" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="11" fontWeight="bold">Native Tokens</text>
                          <text x="220" y="320" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">USDC, CHFX, TRYB</text>
                          <text x="220" y="335" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">SEKX, SBX</text>
                        </g>
                        
                        {/* EVM Side */}
                        <g id="evm-components">
                          <text x="700" y="30" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="16" fontWeight="bold">IOTA EVM (Solidity)</text>
                          
                          {/* Pool Contract */}
                          <rect x="550" y="60" width="300" height="90" rx="6"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.2)" : "rgba(139, 92, 246, 0.1)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.4)"}
                            strokeWidth="2"/>
                          <text x="700" y="85" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="11" fontWeight="bold">StableXPool.sol</text>
                          <text x="570" y="110" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">• stake()</text>
                          <text x="570" y="125" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">• unstake()</text>
                          <text x="570" y="140" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">• swap()</text>
                          
                          {/* Bridge Contract */}
                          <rect x="550" y="170" width="140" height="90" rx="6"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.2)" : "rgba(139, 92, 246, 0.1)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.4)"}
                            strokeWidth="2"/>
                          <text x="620" y="195" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="11" fontWeight="bold">EVMBridge.sol</text>
                          <text x="570" y="220" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">• mint()</text>
                          <text x="570" y="235" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">• burn()</text>
                          <text x="570" y="250" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">• emit events</text>
                          
                          {/* ERC-20 Tokens */}
                          <rect x="710" y="170" width="140" height="90" rx="6"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.2)" : "rgba(139, 92, 246, 0.1)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.4)"}
                            strokeWidth="2"/>
                          <text x="780" y="195" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="11" fontWeight="bold">ERC-20 Tokens</text>
                          <text x="730" y="220" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">USDC, CHFX, TRYB</text>
                          <text x="730" y="235" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">SEKX, wSBX</text>
                          
                          {/* Token Contracts */}
                          <rect x="550" y="280" width="300" height="80" rx="6"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.15)" : "rgba(139, 92, 246, 0.08)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.5)" : "rgba(139, 92, 246, 0.3)"}
                            strokeWidth="1.5"/>
                          <text x="700" y="305" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="11" fontWeight="bold">Token Contracts</text>
                          <text x="600" y="330" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">CHFX.sol, TRYB.sol, SEKX.sol</text>
                          <text x="600" y="345" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">USDC.sol, wSBX.sol</text>
                        </g>
                        
                        {/* Connections */}
                        {/* Pool to Registry */}
                        <path d="M 120 160 L 120 140" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.4)" : "rgba(139, 92, 246, 0.3)"}
                          strokeWidth="1.5" fill="none" markerEnd="url(#arrowhead-small)"/>
                        
                        {/* Bridge to Registry */}
                        <path d="M 280 160 L 280 140" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.4)" : "rgba(139, 92, 246, 0.3)"}
                          strokeWidth="1.5" fill="none" markerEnd="url(#arrowhead-small)"/>
                        
                        {/* Pool to Tokens */}
                        <path d="M 190 205 L 210 280" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.4)" : "rgba(139, 92, 246, 0.3)"}
                          strokeWidth="1.5" fill="none" markerEnd="url(#arrowhead-small)"/>
                        
                        {/* Bridge to Tokens */}
                        <path d="M 280 250 L 280 270" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.4)" : "rgba(139, 92, 246, 0.3)"}
                          strokeWidth="1.5" fill="none" markerEnd="url(#arrowhead-small)"/>
                        
                        {/* L1 Bridge to EVM Bridge */}
                        <path d="M 350 205 Q 450 205 550 215" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.5)" : "rgba(139, 92, 246, 0.4)"}
                          strokeWidth="2" fill="none" strokeDasharray="4,4" markerEnd="url(#arrowhead)"/>
                        <text x="450" y="200" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Cross-Chain</text>
                        
                        {/* EVM Pool to Bridge */}
                        <path d="M 620 170 L 620 150" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.4)" : "rgba(139, 92, 246, 0.3)"}
                          strokeWidth="1.5" fill="none" markerEnd="url(#arrowhead-small)"/>
                        
                        {/* EVM Bridge to Tokens */}
                        <path d="M 620 260 L 620 280" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.4)" : "rgba(139, 92, 246, 0.3)"}
                          strokeWidth="1.5" fill="none" markerEnd="url(#arrowhead-small)"/>
                        
                        {/* EVM Pool to Tokens */}
                        <path d="M 700 150 L 780 170" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.4)" : "rgba(139, 92, 246, 0.3)"}
                          strokeWidth="1.5" fill="none" markerEnd="url(#arrowhead-small)"/>
                        
                        {/* Flash Vault to Pool */}
                        <path d="M 120 270 L 120 250" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.4)" : "rgba(139, 92, 246, 0.3)"}
                          strokeWidth="1.5" fill="none" markerEnd="url(#arrowhead-small)"/>
                        
                        {/* Legend */}
                        <g id="legend" transform="translate(50, 380)">
                          <rect x="0" y="0" width="800" height="200" rx="8"
                            fill={isDarkMode ? "rgba(0, 0, 0, 0.3)" : "rgba(255, 255, 255, 0.5)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.3)" : "rgba(139, 92, 246, 0.2)"}
                            strokeWidth="1"/>
                          <text x="400" y="25" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="12" fontWeight="bold">Component Relationships</text>
                          
                          <line x1="50" y1="50" x2="100" y2="50"
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.5)" : "rgba(139, 92, 246, 0.4)"}
                            strokeWidth="2" markerEnd="url(#arrowhead)"/>
                          <text x="110" y="55" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">Function calls</text>
                          
                          <line x1="50" y1="80" x2="100" y2="80"
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.4)" : "rgba(139, 92, 246, 0.3)"}
                            strokeWidth="1.5" strokeDasharray="4,4" markerEnd="url(#arrowhead)"/>
                          <text x="110" y="85" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">Data flow</text>
                          
                          <line x1="50" y1="110" x2="100" y2="110"
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.5)" : "rgba(139, 92, 246, 0.4)"}
                            strokeWidth="2" strokeDasharray="4,4" markerEnd="url(#arrowhead)"/>
                          <text x="110" y="115" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">Cross-chain</text>
                          
                          <rect x="300" y="40" width="80" height="30" rx="4"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.2)" : "rgba(139, 92, 246, 0.1)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.4)"}
                            strokeWidth="1.5"/>
                          <text x="340" y="60" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="9">Contract</text>
                          
                          <rect x="400" y="40" width="80" height="30" rx="4"
                            fill={isDarkMode ? "rgba(75, 20, 120, 0.2)" : "rgba(139, 92, 246, 0.08)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.5)" : "rgba(139, 92, 246, 0.3)"}
                            strokeWidth="1.5"/>
                          <text x="440" y="60" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="9">Registry</text>
                        </g>
                        
                        {/* Arrow markers */}
                        <defs>
                          <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                            <polygon points="0 0, 10 3, 0 6" 
                              fill={isDarkMode ? "rgba(139, 92, 246, 0.7)" : "rgba(139, 92, 246, 0.5)"}/>
                          </marker>
                          <marker id="arrowhead-small" markerWidth="8" markerHeight="8" refX="7" refY="2.5" orient="auto">
                            <polygon points="0 0, 8 2.5, 0 5" 
                              fill={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.4)"}/>
                          </marker>
                        </defs>
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className={subHeadingClass()}>Data Flow</h3>
                  <p className={textClass()}>
                    How data and transactions flow through the system for different operations.
                  </p>
                  
                  {/* Chart 3: Data Flow Diagram */}
                  <div className="mb-6">
                    <h4 className={chartTitleClass()}>Chart 3: Data Flow Diagram</h4>
                    <div className={cn(
                      "rounded-lg p-4 border overflow-x-auto",
                      isDarkMode 
                        ? "bg-black/40 border-white/20"
                        : "bg-gray-50 border-gray-300"
                    )}>
                      <svg viewBox="0 0 1000 700" className="w-full h-auto">
                        {/* User */}
                        <rect x="50" y="50" width="100" height="60" rx="8"
                          fill={isDarkMode ? "rgba(139, 92, 246, 0.2)" : "rgba(139, 92, 246, 0.1)"}
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.5)" : "rgba(139, 92, 246, 0.3)"}
                          strokeWidth="2"/>
                        <text x="100" y="75" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="12" fontWeight="bold">User</text>
                        <text x="100" y="95" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">Wallet</text>
                        
                        {/* Price Feed API */}
                        <rect x="850" y="50" width="100" height="60" rx="8"
                          fill={isDarkMode ? "rgba(139, 92, 246, 0.2)" : "rgba(139, 92, 246, 0.1)"}
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.5)" : "rgba(139, 92, 246, 0.3)"}
                          strokeWidth="2"/>
                        <text x="900" y="75" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="12" fontWeight="bold">Price API</text>
                        <text x="900" y="95" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">Off-Chain</text>
                        
                        {/* Pool */}
                        <rect x="400" y="200" width="200" height="100" rx="10"
                          fill={isDarkMode ? "rgba(75, 20, 120, 0.3)" : "rgba(139, 92, 246, 0.15)"}
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.4)"}
                          strokeWidth="2"/>
                        <text x="500" y="230" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="14" fontWeight="bold">Pool Contract</text>
                        <text x="500" y="255" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="11">sbx_pool / StableXPool</text>
                        <text x="500" y="280" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">Unified Basket</text>
                        
                        {/* Bridge L1 */}
                        <rect x="100" y="400" width="150" height="80" rx="8"
                          fill={isDarkMode ? "rgba(139, 92, 246, 0.2)" : "rgba(139, 92, 246, 0.1)"}
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.4)"}
                          strokeWidth="2"/>
                        <text x="175" y="425" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="11" fontWeight="bold">Bridge L1</text>
                        <text x="175" y="450" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">bridge_l1.move</text>
                        <text x="175" y="470" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Lock/Unlock</text>
                        
                        {/* Bridge EVM */}
                        <rect x="750" y="400" width="150" height="80" rx="8"
                          fill={isDarkMode ? "rgba(139, 92, 246, 0.2)" : "rgba(139, 92, 246, 0.1)"}
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.4)"}
                          strokeWidth="2"/>
                        <text x="825" y="425" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="11" fontWeight="bold">Bridge EVM</text>
                        <text x="825" y="450" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">EVMBridge.sol</text>
                        <text x="825" y="470" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Mint/Burn</text>
                        
                        {/* Relayer */}
                        <ellipse cx="500" cy="550" rx="100" ry="50"
                          fill={isDarkMode ? "rgba(88, 28, 135, 0.3)" : "rgba(139, 92, 246, 0.15)"}
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.7)" : "rgba(139, 92, 246, 0.5)"}
                          strokeWidth="2"/>
                        <text x="500" y="545" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="12" fontWeight="bold">Relayer</text>
                        <text x="500" y="565" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="12" fontWeight="bold">Service</text>
                        <text x="500" y="585" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">Event Watcher</text>
                        
                        {/* Flow Labels */}
                        <g id="flow-labels">
                          {/* Staking Flow */}
                          <text x="200" y="180" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="11" fontWeight="bold">1. Staking</text>
                          <text x="200" y="195" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">User → Pool → SBX</text>
                          
                          {/* Swapping Flow */}
                          <text x="500" y="180" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="11" fontWeight="bold">2. Swapping</text>
                          <text x="500" y="195" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Currency A → Pool → Currency B</text>
                          
                          {/* Bridging Flow */}
                          <text x="500" y="380" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="11" fontWeight="bold">3. Bridging</text>
                          <text x="500" y="395" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">L1 ↔ EVM via Relayer</text>
                        </g>
                        
                        {/* Arrows - Staking Flow */}
                        <path d="M 100 110 L 100 200" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.5)"}
                          strokeWidth="2.5" fill="none" markerEnd="url(#arrowhead)"/>
                        <text x="120" y="155" textAnchor="start"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Deposit</text>
                        
                        <path d="M 400 250 L 300 250" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.5)"}
                          strokeWidth="2.5" fill="none" markerEnd="url(#arrowhead)"/>
                        <text x="340" y="245" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Mint SBX</text>
                        
                        {/* Arrows - Swapping Flow */}
                        <path d="M 100 80 Q 250 140 400 200" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.5)"}
                          strokeWidth="2.5" fill="none" markerEnd="url(#arrowhead)"/>
                        <text x="250" y="130" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Swap A→B</text>
                        
                        <path d="M 600 250 L 700 250" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.5)"}
                          strokeWidth="2.5" fill="none" markerEnd="url(#arrowhead)"/>
                        <text x="650" y="245" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Receive B</text>
                        
                        {/* Arrows - Price Feed */}
                        <path d="M 850 110 L 600 110" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.4)" : "rgba(139, 92, 246, 0.3)"}
                          strokeWidth="1.5" fill="none" strokeDasharray="4,4" markerEnd="url(#arrowhead)"/>
                        <text x="725" y="105" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Query Prices</text>
                        
                        <path d="M 500 200 L 500 150" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.4)" : "rgba(139, 92, 246, 0.3)"}
                          strokeWidth="1.5" fill="none" strokeDasharray="4,4" markerEnd="url(#arrowhead)"/>
                        <text x="520" y="170" textAnchor="start"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Price params</text>
                        
                        {/* Arrows - Bridging Flow L1→EVM */}
                        <path d="M 250 440 L 400 300" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.5)"}
                          strokeWidth="2" fill="none" markerEnd="url(#arrowhead)"/>
                        <text x="310" y="365" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Lock Event</text>
                        
                        <path d="M 500 300 L 500 550" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.5)"}
                          strokeWidth="2" fill="none" markerEnd="url(#arrowhead)"/>
                        <text x="520" y="425" textAnchor="start"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Watch Event</text>
                        
                        <path d="M 500 550 L 750 480" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.5)"}
                          strokeWidth="2" fill="none" markerEnd="url(#arrowhead)"/>
                        <text x="625" y="515" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Mint</text>
                        
                        {/* Arrows - Bridging Flow EVM→L1 */}
                        <path d="M 750 440 L 600 300" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.5)"}
                          strokeWidth="2" fill="none" markerEnd="url(#arrowhead)"/>
                        <text x="660" y="365" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Burn Event</text>
                        
                        <path d="M 500 550 L 250 480" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.5)"}
                          strokeWidth="2" fill="none" markerEnd="url(#arrowhead)"/>
                        <text x="375" y="515" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Unlock</text>
                        
                        {/* Sequence Numbers */}
                        <circle cx="80" cy="130" r="12"
                          fill={isDarkMode ? "rgba(139, 92, 246, 0.8)" : "rgba(139, 92, 246, 0.6)"}
                          stroke={isDarkMode ? "#fff" : "#1f2937"} strokeWidth="1.5"/>
                        <text x="80" y="135" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="10" fontWeight="bold">1</text>
                        
                        <circle cx="80" cy="200" r="12"
                          fill={isDarkMode ? "rgba(139, 92, 246, 0.8)" : "rgba(139, 92, 246, 0.6)"}
                          stroke={isDarkMode ? "#fff" : "#1f2937"} strokeWidth="1.5"/>
                        <text x="80" y="205" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="10" fontWeight="bold">2</text>
                        
                        <circle cx="80" cy="270" r="12"
                          fill={isDarkMode ? "rgba(139, 92, 246, 0.8)" : "rgba(139, 92, 246, 0.6)"}
                          stroke={isDarkMode ? "#fff" : "#1f2937"} strokeWidth="1.5"/>
                        <text x="80" y="275" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="10" fontWeight="bold">3</text>
                        
                        {/* Arrow marker */}
                        <defs>
                          <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                            <polygon points="0 0, 10 3, 0 6" 
                              fill={isDarkMode ? "rgba(139, 92, 246, 0.7)" : "rgba(139, 92, 246, 0.5)"}/>
                          </marker>
                        </defs>
                      </svg>
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
                  
                  {/* Chart 8: Cross-Chain Bridge Flow */}
                  <div className="mb-6">
                    <h4 className={chartTitleClass()}>Chart 8: Cross-Chain Bridge Flow</h4>
                    <div className={cn(
                      "rounded-lg p-4 border overflow-x-auto",
                      isDarkMode 
                        ? "bg-black/40 border-white/20"
                        : "bg-gray-50 border-gray-300"
                    )}>
                      <svg viewBox="0 0 1000 700" className="w-full h-auto">
                        {/* L1 Side */}
                        <g id="l1-side">
                          <rect x="50" y="50" width="300" height="280" rx="10"
                            fill={isDarkMode ? "rgba(75, 20, 120, 0.2)" : "rgba(139, 92, 246, 0.08)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.4)"}
                            strokeWidth="2"/>
                          <text x="200" y="80" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="16" fontWeight="bold">IOTA L1</text>
                          
                          {/* Bridge L1 */}
                          <rect x="100" y="110" width="200" height="80" rx="6"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.2)" : "rgba(139, 92, 246, 0.1)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.4)"}
                            strokeWidth="2"/>
                          <text x="200" y="135" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="12" fontWeight="bold">bridge_l1.move</text>
                          <text x="120" y="160" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">• lock_*() - Lock tokens</text>
                          <text x="120" y="175" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">• unlock() - Unlock tokens</text>
                          
                          {/* Escrow */}
                          <rect x="100" y="210" width="200" height="60" rx="6"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.15)" : "rgba(139, 92, 246, 0.08)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.5)" : "rgba(139, 92, 246, 0.3)"}
                            strokeWidth="1.5"/>
                          <text x="200" y="235" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="11" fontWeight="bold">Escrow</text>
                          <text x="200" y="255" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Locked tokens</text>
                          
                          {/* Native Tokens */}
                          <rect x="100" y="290" width="200" height="30" rx="4"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.1)" : "rgba(139, 92, 246, 0.05)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.4)" : "rgba(139, 92, 246, 0.25)"}
                            strokeWidth="1"/>
                          <text x="200" y="310" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Native Tokens (USDC, CHFX, etc.)</text>
                        </g>
                        
                        {/* EVM Side */}
                        <g id="evm-side">
                          <rect x="650" y="50" width="300" height="280" rx="10"
                            fill={isDarkMode ? "rgba(75, 20, 120, 0.2)" : "rgba(139, 92, 246, 0.08)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.4)"}
                            strokeWidth="2"/>
                          <text x="800" y="80" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="16" fontWeight="bold">IOTA EVM</text>
                          
                          {/* Bridge EVM */}
                          <rect x="700" y="110" width="200" height="80" rx="6"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.2)" : "rgba(139, 92, 246, 0.1)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.4)"}
                            strokeWidth="2"/>
                          <text x="800" y="135" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="12" fontWeight="bold">EVMBridge.sol</text>
                          <text x="720" y="160" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">• mint() - Mint wrapped tokens</text>
                          <text x="720" y="175" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">• burn() - Burn wrapped tokens</text>
                          
                          {/* Wrapped Tokens */}
                          <rect x="700" y="210" width="200" height="60" rx="6"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.15)" : "rgba(139, 92, 246, 0.08)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.5)" : "rgba(139, 92, 246, 0.3)"}
                            strokeWidth="1.5"/>
                          <text x="800" y="235" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="11" fontWeight="bold">Wrapped Tokens</text>
                          <text x="800" y="255" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">ERC-20 (wSBX, wUSDC, etc.)</text>
                          
                          {/* ERC-20 Tokens */}
                          <rect x="700" y="290" width="200" height="30" rx="4"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.1)" : "rgba(139, 92, 246, 0.05)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.4)" : "rgba(139, 92, 246, 0.25)"}
                            strokeWidth="1"/>
                          <text x="800" y="310" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">ERC-20 Standard</text>
                        </g>
                        
                        {/* Relayer */}
                        <ellipse cx="500" cy="400" rx="120" ry="60"
                          fill={isDarkMode ? "rgba(88, 28, 135, 0.4)" : "rgba(139, 92, 246, 0.2)"}
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.8)" : "rgba(139, 92, 246, 0.6)"}
                          strokeWidth="3"/>
                        <text x="500" y="390" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="14" fontWeight="bold">Bridge Relayer</text>
                        <text x="500" y="410" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="13" fontWeight="bold">Service</text>
                        <text x="500" y="430" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="11">Event Watcher & Executor</text>
                        <text x="500" y="450" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">Nonce verification</text>
                        
                        {/* L1 → EVM Flow */}
                        <g id="l1-to-evm">
                          <text x="200" y="520" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="13" fontWeight="bold">L1 → EVM Flow</text>
                          
                          {/* Step 1 */}
                          <circle cx="150" cy="560" r="12"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.8)" : "rgba(139, 92, 246, 0.6)"}
                            stroke={isDarkMode ? "#fff" : "#1f2937"} strokeWidth="1.5"/>
                          <text x="150" y="565" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="10" fontWeight="bold">1</text>
                          <text x="150" y="585" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">User calls</text>
                          <text x="150" y="600" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">lock_*()</text>
                          
                          {/* Step 2 */}
                          <circle cx="300" cy="560" r="12"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.8)" : "rgba(139, 92, 246, 0.6)"}
                            stroke={isDarkMode ? "#fff" : "#1f2937"} strokeWidth="1.5"/>
                          <text x="300" y="565" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="10" fontWeight="bold">2</text>
                          <text x="300" y="585" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Lock tokens</text>
                          <text x="300" y="600" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Emit LockEvent</text>
                          
                          {/* Step 3 */}
                          <circle cx="450" cy="560" r="12"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.8)" : "rgba(139, 92, 246, 0.6)"}
                            stroke={isDarkMode ? "#fff" : "#1f2937"} strokeWidth="1.5"/>
                          <text x="450" y="565" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="10" fontWeight="bold">3</text>
                          <text x="450" y="585" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Relayer watches</text>
                          <text x="450" y="600" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Event</text>
                          
                          {/* Step 4 */}
                          <circle cx="600" cy="560" r="12"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.8)" : "rgba(139, 92, 246, 0.6)"}
                            stroke={isDarkMode ? "#fff" : "#1f2937"} strokeWidth="1.5"/>
                          <text x="600" y="565" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="10" fontWeight="bold">4</text>
                          <text x="600" y="585" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Relayer calls</text>
                          <text x="600" y="600" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">mint()</text>
                          
                          {/* Step 5 */}
                          <circle cx="750" cy="560" r="12"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.8)" : "rgba(139, 92, 246, 0.6)"}
                            stroke={isDarkMode ? "#fff" : "#1f2937"} strokeWidth="1.5"/>
                          <text x="750" y="565" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="10" fontWeight="bold">5</text>
                          <text x="750" y="585" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Mint wrapped</text>
                          <text x="750" y="600" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">tokens</text>
                          
                          {/* Arrows L1 → EVM */}
                          <path d="M 162 560 L 288 560" 
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.5)"}
                            strokeWidth="2" fill="none" markerEnd="url(#arrowhead)"/>
                          <path d="M 312 560 L 438 560" 
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.5)"}
                            strokeWidth="2" fill="none" markerEnd="url(#arrowhead)"/>
                          <path d="M 462 560 L 588 560" 
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.5)"}
                            strokeWidth="2" fill="none" markerEnd="url(#arrowhead)"/>
                          <path d="M 612 560 L 738 560" 
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.5)"}
                            strokeWidth="2" fill="none" markerEnd="url(#arrowhead)"/>
                        </g>
                        
                        {/* EVM → L1 Flow */}
                        <g id="evm-to-l1">
                          <text x="800" y="520" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="13" fontWeight="bold">EVM → L1 Flow</text>
                          
                          {/* Step 1 */}
                          <circle cx="850" cy="650" r="12"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.8)" : "rgba(139, 92, 246, 0.6)"}
                            stroke={isDarkMode ? "#fff" : "#1f2937"} strokeWidth="1.5"/>
                          <text x="850" y="655" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="10" fontWeight="bold">1</text>
                          <text x="850" y="675" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">User calls</text>
                          <text x="850" y="690" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">burn()</text>
                          
                          {/* Step 2 */}
                          <circle cx="700" cy="650" r="12"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.8)" : "rgba(139, 92, 246, 0.6)"}
                            stroke={isDarkMode ? "#fff" : "#1f2937"} strokeWidth="1.5"/>
                          <text x="700" y="655" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="10" fontWeight="bold">2</text>
                          <text x="700" y="675" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Burn tokens</text>
                          <text x="700" y="690" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Emit BurnEvent</text>
                          
                          {/* Step 3 */}
                          <circle cx="550" cy="650" r="12"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.8)" : "rgba(139, 92, 246, 0.6)"}
                            stroke={isDarkMode ? "#fff" : "#1f2937"} strokeWidth="1.5"/>
                          <text x="550" y="655" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="10" fontWeight="bold">3</text>
                          <text x="550" y="675" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Relayer watches</text>
                          <text x="550" y="690" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Event</text>
                          
                          {/* Step 4 */}
                          <circle cx="400" cy="650" r="12"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.8)" : "rgba(139, 92, 246, 0.6)"}
                            stroke={isDarkMode ? "#fff" : "#1f2937"} strokeWidth="1.5"/>
                          <text x="400" y="655" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="10" fontWeight="bold">4</text>
                          <text x="400" y="675" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Relayer calls</text>
                          <text x="400" y="690" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">unlock()</text>
                          
                          {/* Step 5 */}
                          <circle cx="250" cy="650" r="12"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.8)" : "rgba(139, 92, 246, 0.6)"}
                            stroke={isDarkMode ? "#fff" : "#1f2937"} strokeWidth="1.5"/>
                          <text x="250" y="655" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="10" fontWeight="bold">5</text>
                          <text x="250" y="675" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Unlock tokens</text>
                          <text x="250" y="690" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">from escrow</text>
                          
                          {/* Arrows EVM → L1 */}
                          <path d="M 838 650 L 712 650" 
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.5)"}
                            strokeWidth="2" fill="none" markerEnd="url(#arrowhead)"/>
                          <path d="M 688 650 L 562 650" 
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.5)"}
                            strokeWidth="2" fill="none" markerEnd="url(#arrowhead)"/>
                          <path d="M 538 650 L 412 650" 
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.5)"}
                            strokeWidth="2" fill="none" markerEnd="url(#arrowhead)"/>
                          <path d="M 388 650 L 262 650" 
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.5)"}
                            strokeWidth="2" fill="none" markerEnd="url(#arrowhead)"/>
                        </g>
                        
                        {/* Connection arrows from bridges to relayer */}
                        <path d="M 200 330 L 450 370" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.5)" : "rgba(139, 92, 246, 0.4)"}
                          strokeWidth="2" fill="none" strokeDasharray="4,4" markerEnd="url(#arrowhead)"/>
                        <text x="300" y="345" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">LockEvent</text>
                        
                        <path d="M 800 330 L 550 370" 
                          stroke={isDarkMode ? "rgba(139, 92, 246, 0.5)" : "rgba(139, 92, 246, 0.4)"}
                          strokeWidth="2" fill="none" strokeDasharray="4,4" markerEnd="url(#arrowhead)"/>
                        <text x="675" y="345" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">BurnEvent</text>
                        
                        {/* Arrow marker */}
                        <defs>
                          <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                            <polygon points="0 0, 10 3, 0 6" 
                              fill={isDarkMode ? "rgba(139, 92, 246, 0.7)" : "rgba(139, 92, 246, 0.5)"}/>
                          </marker>
                        </defs>
                      </svg>
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
                  
                  {/* Chart 4: Multi-Chain Architecture */}
                  <div className="mb-6">
                    <h4 className={chartTitleClass()}>Chart 4: Multi-Chain Architecture</h4>
                    <div className={cn(
                      "rounded-lg p-4 border overflow-x-auto",
                      isDarkMode 
                        ? "bg-black/40 border-white/20"
                        : "bg-gray-50 border-gray-300"
                    )}>
                      <svg viewBox="0 0 900 600" className="w-full h-auto">
                        {/* L1 Layer */}
                        <g id="l1-layer">
                          <rect x="50" y="50" width="350" height="500" rx="12"
                            fill={isDarkMode ? "rgba(75, 20, 120, 0.2)" : "rgba(139, 92, 246, 0.08)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.4)"}
                            strokeWidth="3"/>
                          <text x="225" y="80" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="18" fontWeight="bold">IOTA L1</text>
                          <text x="225" y="100" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="12">Move-based Contracts</text>
                          
                          {/* L1 Pool */}
                          <rect x="100" y="140" width="300" height="100" rx="8"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.2)" : "rgba(139, 92, 246, 0.1)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.4)"}
                            strokeWidth="2"/>
                          <text x="250" y="170" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="13" fontWeight="bold">sbx_pool.move</text>
                          <text x="150" y="200" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">• Unified basket</text>
                          <text x="150" y="220" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">• Shared object</text>
                          
                          {/* L1 Bridge */}
                          <rect x="100" y="260" width="300" height="80" rx="8"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.2)" : "rgba(139, 92, 246, 0.1)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.4)"}
                            strokeWidth="2"/>
                          <text x="250" y="285" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="13" fontWeight="bold">bridge_l1.move</text>
                          <text x="150" y="310" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">• Lock/Unlock tokens</text>
                          <text x="150" y="330" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">• Emit events</text>
                          
                          {/* L1 Tokens */}
                          <rect x="100" y="360" width="300" height="120" rx="8"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.15)" : "rgba(139, 92, 246, 0.08)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.5)" : "rgba(139, 92, 246, 0.3)"}
                            strokeWidth="2"/>
                          <text x="250" y="385" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="13" fontWeight="bold">Native Tokens</text>
                          <text x="150" y="410" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">• USDC</text>
                          <text x="150" y="430" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">• CHFX, TRYB, SEKX</text>
                          <text x="150" y="450" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">• SBX</text>
                          <text x="150" y="470" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">• Flash vault</text>
                        </g>
                        
                        {/* EVM Layer */}
                        <g id="evm-layer">
                          <rect x="500" y="50" width="350" height="500" rx="12"
                            fill={isDarkMode ? "rgba(75, 20, 120, 0.2)" : "rgba(139, 92, 246, 0.08)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.4)"}
                            strokeWidth="3"/>
                          <text x="675" y="80" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="18" fontWeight="bold">IOTA EVM</text>
                          <text x="675" y="100" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="12">Solidity-based Contracts</text>
                          
                          {/* EVM Pool */}
                          <rect x="550" y="140" width="250" height="100" rx="8"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.2)" : "rgba(139, 92, 246, 0.1)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.4)"}
                            strokeWidth="2"/>
                          <text x="675" y="170" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="13" fontWeight="bold">StableXPool.sol</text>
                          <text x="570" y="200" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">• Unified basket</text>
                          <text x="570" y="220" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">• Standard contract</text>
                          
                          {/* EVM Bridge */}
                          <rect x="550" y="260" width="250" height="80" rx="8"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.2)" : "rgba(139, 92, 246, 0.1)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.4)"}
                            strokeWidth="2"/>
                          <text x="675" y="285" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="13" fontWeight="bold">EVMBridge.sol</text>
                          <text x="570" y="310" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">• Mint/Burn wrapped tokens</text>
                          <text x="570" y="330" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">• Emit events</text>
                          
                          {/* EVM Tokens */}
                          <rect x="550" y="360" width="250" height="120" rx="8"
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.15)" : "rgba(139, 92, 246, 0.08)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.5)" : "rgba(139, 92, 246, 0.3)"}
                            strokeWidth="2"/>
                          <text x="675" y="385" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="13" fontWeight="bold">ERC-20 Tokens</text>
                          <text x="570" y="410" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">• USDC</text>
                          <text x="570" y="430" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">• CHFX, TRYB, SEKX</text>
                          <text x="570" y="450" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">• wSBX (wrapped SBX)</text>
                          <text x="570" y="470" textAnchor="start"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="10">• Standard ERC-20</text>
                        </g>
                        
                        {/* Bridge Connection */}
                        <g id="bridge-connection">
                          {/* Bridge Arrow L1 → EVM */}
                          <path d="M 400 300 Q 450 300 500 300" 
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.7)" : "rgba(139, 92, 246, 0.6)"}
                            strokeWidth="4" fill="none" markerEnd="url(#arrowhead-large)"/>
                          <text x="450" y="290" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="12" fontWeight="bold">Bridge</text>
                          
                          {/* Lock → Mint */}
                          <rect x="400" y="320" width="100" height="40" rx="6"
                            fill={isDarkMode ? "rgba(88, 28, 135, 0.3)" : "rgba(139, 92, 246, 0.15)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.4)"}
                            strokeWidth="1.5"/>
                          <text x="450" y="340" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="10" fontWeight="bold">Lock → Mint</text>
                          <text x="450" y="355" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">L1 → EVM</text>
                          
                          {/* Burn → Unlock */}
                          <rect x="400" y="380" width="100" height="40" rx="6"
                            fill={isDarkMode ? "rgba(88, 28, 135, 0.3)" : "rgba(139, 92, 246, 0.15)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.4)"}
                            strokeWidth="1.5"/>
                          <text x="450" y="400" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="10" fontWeight="bold">Burn → Unlock</text>
                          <text x="450" y="415" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">EVM → L1</text>
                          
                          {/* Relayer */}
                          <ellipse cx="450" cy="480" rx="60" ry="35"
                            fill={isDarkMode ? "rgba(88, 28, 135, 0.4)" : "rgba(139, 92, 246, 0.2)"}
                            stroke={isDarkMode ? "rgba(139, 92, 246, 0.8)" : "rgba(139, 92, 246, 0.6)"}
                            strokeWidth="2"/>
                          <text x="450" y="475" textAnchor="middle"
                            fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="11" fontWeight="bold">Relayer</text>
                          <text x="450" y="490" textAnchor="middle"
                            fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="9">Event Watcher</text>
                        </g>
                        
                        {/* Unified Liquidity Label */}
                        <text x="450" y="550" textAnchor="middle"
                          fill={isDarkMode ? "#fff" : "#1f2937"} fontSize="14" fontWeight="bold">Unified Liquidity</text>
                        <text x="450" y="570" textAnchor="middle"
                          fill={isDarkMode ? "#a1a1aa" : "#6b7280"} fontSize="11">Seamless access across both chains</text>
                        
                        {/* Arrow markers */}
                        <defs>
                          <marker id="arrowhead-large" markerWidth="12" markerHeight="12" refX="11" refY="4" orient="auto">
                            <polygon points="0 0, 12 4, 0 8" 
                              fill={isDarkMode ? "rgba(139, 92, 246, 0.8)" : "rgba(139, 92, 246, 0.6)"}/>
                          </marker>
                        </defs>
                      </svg>
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
                  
                  <div className="space-y-6">
                    <div>
                      <h4 className={cn(
                        "text-lg font-semibold mb-3",
                        isDarkMode ? "text-white" : "text-gray-900"
                      )}>1. Additional Regional Stablecoins</h4>
                      <p className={textClass()}>
                        Expand support to more regional currencies to increase global accessibility and liquidity.
                      </p>
                      <ul className={listTextClass()}>
                        <li>• <strong className={strongClass()}>Target Currencies:</strong> JPYX (Japanese Yen), GBPX (British Pound), AUDX (Australian Dollar), CADX (Canadian Dollar), and more</li>
                        <li>• <strong className={strongClass()}>Enhanced Multi-Currency Pools:</strong> Support for 10+ regional stablecoins in unified liquidity pool</li>
                        <li>• <strong className={strongClass()}>Regional Market Features:</strong> Currency-specific features tailored to local market needs</li>
                        <li>• <strong className={strongClass()}>Regulatory Compliance:</strong> Ensure each currency meets regional regulatory requirements</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className={cn(
                        "text-lg font-semibold mb-3",
                        isDarkMode ? "text-white" : "text-gray-900"
                      )}>2. Enhanced Yield Strategies</h4>
                      <p className={textClass()}>
                        Implement automated yield generation across multiple DeFi protocols.
                      </p>
                      <ul className={listTextClass()}>
                        <li>• <strong className={strongClass()}>Automated Yield Farming:</strong> Integrate with lending protocols, DEXs, and yield aggregators</li>
                        <li>• <strong className={strongClass()}>Multi-Strategy Vault:</strong> Allocate funds across multiple strategies based on risk/return profiles</li>
                        <li>• <strong className={strongClass()}>Auto-Compounding:</strong> Automatically reinvest yields to maximize returns</li>
                        <li>• <strong className={strongClass()}>Strategy Performance Tracking:</strong> Real-time APY tracking per strategy with historical analytics</li>
                        <li>• <strong className={strongClass()}>Risk Management:</strong> Slippage controls, impermanent loss protection, and strategy rebalancing</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className={cn(
                        "text-lg font-semibold mb-3",
                        isDarkMode ? "text-white" : "text-gray-900"
                      )}>3. Payment/Offramp Protocol Integration</h4>
                      <p className={textClass()}>
                        Enable real-world usage through partnerships with payment processors and offramp services.
                      </p>
                      <ul className={listTextClass()}>
                        <li>• <strong className={strongClass()}>Merchant Acceptance:</strong> Enable businesses to accept regional stablecoins as payment</li>
                        <li>• <strong className={strongClass()}>Point-of-Sale Integration:</strong> Connect with payment terminals and e-commerce platforms</li>
                        <li>• <strong className={strongClass()}>Fiat Conversion:</strong> Convert SBX and regional stablecoins to local fiat currencies</li>
                        <li>• <strong className={strongClass()}>Bank Transfers:</strong> Direct bank account integration for withdrawals</li>
                        <li>• <strong className={strongClass()}>Card Issuance:</strong> Debit/credit cards linked to SBX balances</li>
                        <li>• <strong className={strongClass()}>Cross-Border Payments:</strong> Low-cost international remittances</li>
                        <li>• <strong className={strongClass()}>Corporate Treasury:</strong> B2B payment solutions for businesses</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className={cn(
                        "text-lg font-semibold mb-3",
                        isDarkMode ? "text-white" : "text-gray-900"
                      )}>4. Additional Enhancements</h4>
                      <ul className={listTextClass()}>
                        <li>• Governance mechanisms</li>
                        <li>• Advanced analytics dashboard</li>
                        <li>• Mobile application</li>
                        <li>• Enhanced security audits and monitoring</li>
                      </ul>
                    </div>
                  </div>
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

