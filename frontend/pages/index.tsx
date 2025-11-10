import { useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/router";
import Script from "next/script";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'spline-viewer': {
        url: string;
        style?: React.CSSProperties;
      };
    }
  }
}

export default function Home() {
  const router = useRouter();
  const splineRef = useRef<HTMLElement>(null);

  // Generate particles once - only on left and right sides
  const particles = useMemo(() => {
    return Array.from({ length: 100 }).map((_, i) => {
      const size = Math.random() * 4 + 2; // Slightly larger: 2-6px
      // Only place particles on left (0-30%) or right (70-100%) sides
      const side = Math.random() < 0.5 ? 'left' : 'right';
      const left = side === 'left' ? Math.random() * 30 : 70 + Math.random() * 30;
      const top = Math.random() * 100; // Random vertical position
      const animationDuration = Math.random() * 10 + 6;
      const animationDelay = Math.random() * 5;
      const opacity = Math.random() * 0.15 + 0.15; // Lower opacity: 0.15-0.3
      const animationType = i % 2 === 0 ? 'float-left' : 'float-right';
      
      return {
        id: i,
        size,
        left,
        top,
        animationDuration,
        animationDelay,
        opacity,
        animationType,
      };
    });
  }, []);

  useEffect(() => {
    if (splineRef.current) {
      const viewer = document.createElement('spline-viewer');
      viewer.setAttribute('url', 'https://prod.spline.design/x4tN1pIdl8dXJSXr/scene.splinecode');
      viewer.style.width = '100%';
      viewer.style.height = '100vh';
      viewer.style.position = 'absolute';
      viewer.style.top = '0';
      viewer.style.left = '0';
      splineRef.current.appendChild(viewer);
    }
  }, []);

  return (
    <>
      <Script
        type="module"
        src="https://unpkg.com/@splinetool/viewer@1.10.99/build/spline-viewer.js"
      />
      
      <div className="min-h-screen relative bg-[#0a0a0a] overflow-hidden">
        {/* Spline Viewer Container */}
        <div ref={splineRef as React.RefObject<HTMLDivElement>} className="absolute inset-0" />

        {/* Light Overlays - Above Spline, Below Content */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          {/* Top Left Corner Light */}
          <div 
            className="absolute top-0 left-0 w-[600px] h-[500px] blur-3xl"
            style={{
              background: 'radial-gradient(circle at top left, rgba(75, 20, 120, 0.25) 0%, rgba(88, 28, 135, 0.15) 40%, transparent 60%)'
            }}
          ></div>
          
          {/* Top Right Corner Light */}
          <div 
            className="absolute top-0 right-0 w-[600px] h-[500px] blur-3xl"
            style={{
              background: 'radial-gradient(circle at top right, rgba(88, 28, 135, 0.25) 0%, rgba(75, 20, 120, 0.15) 40%, transparent 60%)'
            }}
          ></div>
          
          {/* Bottom Left Corner Light - Lighter */}
          <div 
            className="absolute bottom-0 left-0 w-[600px] h-[500px] blur-3xl"
            style={{
              background: 'radial-gradient(circle at bottom left, rgba(88, 28, 135, 0.15) 0%, rgba(75, 20, 120, 0.08) 40%, transparent 60%)'
            }}
          ></div>
          
          {/* Bottom Right Corner Light - Lighter */}
          <div 
            className="absolute bottom-0 right-0 w-[600px] h-[500px] blur-3xl"
            style={{
              background: 'radial-gradient(circle at bottom right, rgba(88, 28, 135, 0.12) 0%, rgba(75, 20, 120, 0.08) 40%, transparent 60%)'
            }}
          ></div>
          
          {/* Top Edge Gradient Overlay */}
          <div className="absolute top-0 left-0 right-0 h-[30%] bg-gradient-to-b from-purple-950/15 via-purple-900/10 to-transparent"></div>
          
          {/* Bottom Edge Gradient Overlay - Lighter */}
          <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-t from-purple-900/10 via-purple-800/6 to-transparent"></div>
          
          {/* Left Edge Gradient Overlay */}
          <div className="absolute top-0 left-0 bottom-0 w-[30%] bg-gradient-to-r from-purple-950/15 via-purple-900/10 to-transparent"></div>
          
          {/* Right Edge Gradient Overlay */}
          <div className="absolute top-0 right-0 bottom-0 w-[30%] bg-gradient-to-l from-purple-950/15 via-purple-900/10 to-transparent"></div>
        </div>

        {/* Particle Layer - Above Purple Mask, Below Content */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 11 }}>
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="absolute rounded-full"
              style={{
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                left: `${particle.left}%`,
                top: `${particle.top}%`,
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                opacity: particle.opacity,
                animation: `${particle.animationType} ${particle.animationDuration}s ease-in-out infinite`,
                animationDelay: `${particle.animationDelay}s`,
                boxShadow: '0 0 6px rgba(255, 255, 255, 0.6)',
              }}
            />
          ))}
        </div>

        {/* Left Bottom Text */}
        <div className="absolute bottom-8 left-8 z-20">
          <div className="flex flex-col gap-2">
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight">
              7 Continents
            </h2>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-white/90 leading-tight">
              Multiple Currencies
            </h2>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium text-white/80 leading-tight">
              Unified Liquidity
            </h2>
          </div>
        </div>

        {/* Middle Right Description */}
        <div className="absolute top-1/2 right-8 -translate-y-1/2 z-20 max-w-xs">
          <p className="text-sm text-zinc-400 leading-relaxed">
          A stablecoin-focused exchange on IOTA. Swap directly between regional stablecoins with no intermediate—lower fees, faster execution. Deposit any stablecoin, earn unified yield, able to unlock your liquidity when you need it.
          </p>
        </div>

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-6 md:p-8">
          <h1
            className="text-lg font-semibold text-white cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => router.push('/')}
          >
            STABLEX
          </h1>
          
          <button
            onClick={() => router.push('/stake')}
            className="relative px-6 py-2.5 md:px-8 md:py-3 text-sm md:text-base font-medium text-white rounded-lg overflow-hidden group transition-all duration-300 ease-out hover:scale-[1.02]"
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
            
            <span className="relative z-10 tracking-wider font-mono font-semibold text-xs md:text-sm uppercase">LAUNCH APP</span>
          </button>
        </div>

        {/* Centered Glassmorphism Tab Bar */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20">
          <div className="inline-flex rounded-full bg-white/5 backdrop-blur-xl border border-white/10 p-2 shadow-[0_8px_30px_rgba(0,0,0,0.35)] ring-1 ring-white/10 gap-2">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-full text-white hover:bg-white/10 transition-all duration-300 ease-out flex items-center justify-center group"
              title="GitHub"
            >
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="currentColor"
                className="transition-all duration-300 ease-out group-hover:scale-125 group-hover:rotate-3"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
            <a
              href="#"
              className="p-2.5 rounded-full text-white hover:bg-white/10 transition-all duration-300 ease-out flex items-center justify-center group"
              title="Documentation"
            >
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className="transition-all duration-300 ease-out group-hover:scale-125 group-hover:rotate-3"
              >
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-full text-white hover:bg-white/10 transition-all duration-300 ease-out flex items-center justify-center group"
              title="X"
            >
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="currentColor"
                className="transition-all duration-300 ease-out group-hover:scale-125 group-hover:rotate-3"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
