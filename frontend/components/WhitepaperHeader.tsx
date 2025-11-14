import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Logo from "@/components/Logo";
import DualWalletButton from "@/components/DualWalletButton";
import { cn } from "@/lib/utils";

interface WhitepaperHeaderProps {
  isDarkMode: boolean;
  onThemeToggle: () => void;
  onSearch: (query: string) => void;
}

const sections = [
  { id: "overview", title: "Overview" },
  { id: "architecture", title: "Architecture" },
  { id: "multi-chain", title: "Multi-Chain Architecture" },
  { id: "pool-mechanics", title: "Pool Mechanics" },
  { id: "fee-structure", title: "Fee Structure" },
  { id: "swapping", title: "Swapping Mechanism" },
  { id: "bridging", title: "Cross-Chain Bridge" },
  { id: "price-feeds", title: "Price Feed Architecture" },
  { id: "security", title: "Security & Audits" },
  { id: "tokenomics", title: "Tokenomics" },
  { id: "roadmap", title: "Roadmap" },
];

export default function WhitepaperHeader({ isDarkMode, onThemeToggle, onSearch }: WhitepaperHeaderProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<typeof sections>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  // Filter sections based on search query
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = sections.filter(section =>
        section.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query);
  };

  const handleSectionClick = (sectionId: string) => {
    setSearchQuery("");
    setSearchResults([]);
    setIsSearchFocused(false);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-30 transition-colors duration-300 h-20",
        isDarkMode
          ? "bg-black/60 backdrop-blur-xl border-b border-white/10"
          : "bg-white/90 backdrop-blur-xl border-b border-gray-200 shadow-sm"
      )}
    >
      <div className="h-full px-8 flex items-center justify-between gap-4">
        {/* Logo */}
        <Logo isDarkMode={isDarkMode} />

        {/* Search Bar */}
        <div ref={searchRef} className="flex-1 max-w-md relative">
          <div className="relative">
            <input
              type="text"
              placeholder="Search sections..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => setIsSearchFocused(true)}
              className={cn(
                "w-full px-4 py-2.5 pl-10 rounded-lg border transition-all",
                isDarkMode
                  ? "bg-white/5 border-white/20 text-white placeholder-zinc-500 focus:border-white/40 focus:bg-white/10"
                  : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:bg-white"
              )}
            />
            <svg
              className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5",
                isDarkMode ? "text-zinc-400" : "text-gray-400"
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Search Results Dropdown */}
          {isSearchFocused && searchResults.length > 0 && (
            <div
              className={cn(
                "absolute top-full left-0 right-0 mt-2 rounded-lg border shadow-lg overflow-hidden z-50",
                isDarkMode
                  ? "bg-black/95 backdrop-blur-xl border-white/20"
                  : "bg-white border-gray-200"
              )}
            >
              {searchResults.map((section) => (
                <button
                  key={section.id}
                  onClick={() => handleSectionClick(section.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 hover:bg-opacity-50 transition-colors",
                    isDarkMode
                      ? "text-white hover:bg-white/10"
                      : "text-gray-900 hover:bg-gray-50"
                  )}
                >
                  {section.title}
                </button>
              ))}
            </div>
          )}

          {/* No Results */}
          {isSearchFocused && searchQuery.trim() && searchResults.length === 0 && (
            <div
              className={cn(
                "absolute top-full left-0 right-0 mt-2 rounded-lg border shadow-lg p-4 z-50",
                isDarkMode
                  ? "bg-black/95 backdrop-blur-xl border-white/20 text-zinc-400"
                  : "bg-white border-gray-200 text-gray-500"
              )}
            >
              No sections found
            </div>
          )}
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          <button
            onClick={onThemeToggle}
            className={cn(
              "p-2.5 rounded-lg border transition-all hover:scale-105",
              isDarkMode
                ? "bg-white/5 border-white/20 text-white hover:bg-white/10"
                : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200"
            )}
            title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
          </button>

          {/* Wallet Button */}
          <DualWalletButton isDarkMode={isDarkMode} />
        </div>
      </div>
    </div>
  );
}

