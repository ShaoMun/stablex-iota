import { useRouter } from "next/router";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type Tab = "stake" | "swap" | "migrate" | "unstake";

interface AppLayoutProps {
  children: ReactNode;
  activeTab: Tab;
}

export default function AppLayout({ children, activeTab }: AppLayoutProps) {
  const router = useRouter();
  const tabs: Tab[] = ["stake", "swap", "migrate", "unstake"];

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
        <button
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
          
          <span className="relative z-10 tracking-wider font-mono font-semibold text-xs uppercase">CONNECT WALLET</span>
        </button>
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
    </div>
  );
}

