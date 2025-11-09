"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface AnimatedBeamProps {
  containerRef: React.RefObject<HTMLDivElement>;
  fromRef: React.RefObject<HTMLDivElement>;
  toRef: React.RefObject<HTMLDivElement>;
  curvature?: number;
  reverse?: boolean;
  duration?: number;
  delay?: number;
  startYOffset?: number;
  endYOffset?: number;
  pathColor?: string;
  pathWidth?: number;
  pathOpacity?: number;
  gradientStartColor?: string;
  gradientStopColor?: string;
  className?: string;
}

export function AnimatedBeam({
  containerRef,
  fromRef,
  toRef,
  curvature = 0,
  reverse = false,
  duration = 3,
  delay = 0,
  startYOffset = 0,
  endYOffset = 0,
  pathColor = "gray",
  pathWidth = 2,
  pathOpacity = 0.2,
  gradientStartColor = "#ffaa40",
  gradientStopColor = "#9c40ff",
  className,
}: AnimatedBeamProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const [pathD, setPathD] = useState("");
  const [svgDimensions, setSvgDimensions] = useState({ width: 0, height: 0 });
  const gradientIdRef = useRef(`gradient-${Math.random().toString(36).slice(2, 11)}`);

  useEffect(() => {
    const updatePath = () => {
      if (containerRef.current && fromRef.current && toRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const fromRect = fromRef.current.getBoundingClientRect();
        const toRect = toRef.current.getBoundingClientRect();

        const startX = fromRect.left - containerRect.left + fromRect.width / 2;
        const startY =
          fromRect.top - containerRect.top + fromRect.height / 2 + startYOffset;
        const endX = toRect.left - containerRect.left + toRect.width / 2;
        const endY =
          toRect.top - containerRect.top + toRect.height / 2 + endYOffset;

        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;

        const controlY = midY + curvature;

        const d = `M ${startX} ${startY} Q ${midX} ${controlY} ${endX} ${endY}`;
        setPathD(d);

        const svgWidth = Math.max(startX, endX) + 100;
        const svgHeight = Math.max(startY, endY, controlY) + 100;
        setSvgDimensions({ width: svgWidth, height: svgHeight });
      }
    };

    updatePath();

    const resizeObserver = new ResizeObserver(updatePath);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener("resize", updatePath);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updatePath);
    };
  }, [
    containerRef,
    fromRef,
    toRef,
    curvature,
    startYOffset,
    endYOffset,
  ]);

  return (
    <svg
      fill="none"
      width={svgDimensions.width}
      height={svgDimensions.height}
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        "pointer-events-none absolute left-0 top-0 transform-gpu stroke-2",
        className
      )}
    >
      <defs>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id={gradientIdRef.current}
          x1="0%"
          x2="0%"
          y1="0%"
          y2="100%"
        >
          <stop stopColor={gradientStartColor} stopOpacity="0" />
          <stop stopColor={gradientStopColor} stopOpacity="1" />
        </linearGradient>
      </defs>

      {pathD && (
        <>
          <path
            d={pathD}
            stroke={`url(#${gradientIdRef.current})`}
            strokeOpacity="0"
            strokeWidth={pathWidth}
            strokeLinecap="round"
            fill="none"
            ref={pathRef}
          >
            <animate
              attributeName="stroke-opacity"
              values={`0;0;${pathOpacity};${pathOpacity};0;0;0;0`}
              keyTimes="0;0.022;0.033;0.233;0.3;0.333;1;1"
              dur="9s"
              repeatCount="indefinite"
              begin={`${delay}s`}
            />
          </path>
          <circle r="4" fill={gradientStopColor} opacity="0">
            <animateMotion
              dur={`${duration}s`}
              repeatCount="indefinite"
              begin={`${delay}s; ${delay + 9}s`}
              path={pathD}
              keyPoints={reverse ? "1;0" : "0;1"}
              keyTimes="0;1"
              calcMode="linear"
            />
            <animate
              attributeName="opacity"
              values="0;0;1;1;0;0;0;0"
              keyTimes="0;0.022;0.033;0.233;0.3;0.333;1;1"
              dur="9s"
              repeatCount="indefinite"
              begin={`${delay}s`}
            />
          </circle>
        </>
      )}
    </svg>
  );
}

