import { useEffect } from "react";
import { AnimatedBeamDemo } from "@/components/ui/animated-beam-demo";

export default function Home() {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
      
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      @keyframes borderFlow {
        0% {
          background-position: 0% 50%;
        }
        50% {
          background-position: 100% 50%;
        }
        100% {
          background-position: 0% 50%;
        }
      }
      
      @keyframes shimmer {
        0% {
          background-position: -200% center;
        }
        100% {
          background-position: 200% center;
        }
      }
      
      * {
        font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Light source direction (from top at 180 degrees)
  const lightAngle = '180deg'; // From top
  const lightGradient = `linear-gradient(${lightAngle}, #ffffff 0%, #e0e0e0 25%, #a0a0a0 50%, #505050 75%, #000000 100%)`;

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at top, #1a1a1a 0%, #0a0a0a 50%, #000000 100%)',
      }}
    >
      {/* Subtle gradient overlays for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.03) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(200, 200, 200, 0.02) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(100, 100, 100, 0.01) 0%, transparent 70%)
          `,
        }}
      />
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-6 md:p-8">
        {/* Title - Top Left */}
        <h1
          className="text-2xl md:text-4xl font-bold text-transparent bg-clip-text"
          style={{
            backgroundImage: lightGradient,
            letterSpacing: '-0.02em',
          }}
        >
          STABLEX
        </h1>

        {/* Launch App Button - Top Right */}
        <button
          className="relative px-8 py-3.5 md:px-12 md:py-4 text-base md:text-lg font-semibold text-white overflow-hidden group"
          style={{
            background: 'linear-gradient(180deg, #505050 0%, #303030 100%)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          }}
        >
          <span
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 2s infinite',
            }}
          />
          <span className="relative z-10">Launch App</span>
        </button>
      </div>

      {/* Main Content - Centered */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-8 md:p-16">
        
        {/* Main Heading */}
        <h2
          className="text-3xl md:text-5xl lg:text-6xl font-bold mb-6 text-transparent bg-clip-text text-center"
          style={{
            backgroundImage: lightGradient,
            animation: 'fadeIn 1s ease-out',
            letterSpacing: '-0.02em',
            lineHeight: '1.2',
          }}
        >
          Stable · Global · Connected
        </h2>

        {/* Subtitle */}
        <p
          className="text-xl md:text-2xl lg:text-3xl mb-16 text-transparent bg-clip-text text-center"
          style={{
            backgroundImage: `linear-gradient(${lightAngle}, #e0e0e0 0%, #a0a0a0 50%, #707070 100%)`,
            animation: 'fadeIn 1.2s ease-out',
            fontWeight: 300,
            letterSpacing: '0.05em',
            maxWidth: 'fit-content',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          Unifying Stability Worldwide
        </p>

        {/* Animated Beam Graphic */}
        <div
          className="w-full max-w-4xl mb-8 flex items-center justify-center"
          style={{
            animation: 'fadeIn 1.4s ease-out',
          }}
        >
          <AnimatedBeamDemo />
        </div>

        {/* Continents Text */}
        <p
          className="text-base md:text-lg lg:text-xl text-transparent bg-clip-text text-center max-w-2xl"
          style={{
            backgroundImage: `linear-gradient(${lightAngle}, #e0e0e0 0%, #a0a0a0 50%, #707070 100%)`,
            animation: 'fadeIn 1.6s ease-out',
            fontWeight: 300,
            letterSpacing: '0.05em',
          }}
        >
          7 Continents, Multiple Currencies, Unified Liquidity
        </p>
      </div>
    </div>
  );
}
