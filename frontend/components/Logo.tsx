import Image from "next/image";
import { useRouter } from "next/router";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  iconSize?: number;
  textSize?: "sm" | "md" | "lg" | "xl";
  isDarkMode?: boolean;
}

export default function Logo({ className = "", iconSize = 48, textSize = "xl", isDarkMode = true }: LogoProps) {
  const router = useRouter();

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-xl",
    xl: "text-2xl",
  };

  return (
      <div
      className={`flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity ${className}`}
      onClick={() => router.push('/')}
    >
      <Image
        src="/icon.png"
        alt="StableX Logo"
        width={iconSize}
        height={iconSize}
        className="flex-shrink-0"
        priority
      />
      <span className={cn(
        `font-semibold ${textSizeClasses[textSize]}`,
        isDarkMode ? "text-white" : "text-gray-900"
      )}>
        <span 
          style={{ 
            fontFamily: 'var(--font-montserrat), sans-serif',
            letterSpacing: '0.05em',
            fontWeight: 600
          }}
        >
          Stable
        </span>
        <span 
          style={{ 
            fontFamily: 'var(--font-great-vibes), cursive',
            fontSize: '1.25em',
            marginLeft: '3px',
            display: 'inline-block'
          }}
        >
          X
        </span>
      </span>
    </div>
  );
}

