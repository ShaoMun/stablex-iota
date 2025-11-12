"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import { AnimatePresence, motion, MotionProps } from "motion/react"

import { cn } from "@/lib/utils"

type CharacterSet = string[] | readonly string[]

interface HyperTextProps extends MotionProps {
  /** The text content to be animated */
  children: string
  /** Optional className for styling */
  className?: string
  /** Duration of the animation in milliseconds */
  duration?: number
  /** Delay before animation starts in milliseconds */
  delay?: number
  /** Component to render as - defaults to div */
  as?: React.ElementType
  /** Whether to start animation when element comes into view */
  startOnView?: boolean
  /** Whether to trigger animation on hover */
  animateOnHover?: boolean
  /** Custom character set for scramble effect. Defaults to uppercase alphabet */
  characterSet?: CharacterSet
}

const DEFAULT_CHARACTER_SET = Object.freeze(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
) as readonly string[]

const getRandomInt = (max: number): number => Math.floor(Math.random() * max)

export function HyperText({
  children,
  className,
  duration = 800,
  delay = 0,
  as: Component = "div",
  startOnView = false,
  animateOnHover = true,
  characterSet = DEFAULT_CHARACTER_SET,
  ...props
}: HyperTextProps) {
  const MotionComponent = motion.create(Component, {
    forwardMotionProps: true,
  })

  // Split text into words while preserving spaces and punctuation
  const words = useMemo(() => 
    children.split(/(\s+|[.,!?—])/).filter(w => w.length > 0),
    [children]
  )
  
  const [isMounted, setIsMounted] = useState(false)
  const [displayText, setDisplayText] = useState<string[]>(() =>
    // Start with empty/scrambled state that's deterministic
    words.map((word) => {
      if (word.match(/[\s.,!?—]/)) {
        return word // Keep spaces and punctuation as-is
      }
      // Use a deterministic pattern instead of random for initial state
      return word.split("").map(() => characterSet[0]).join("")
    })
  )
  const [isAnimating, setIsAnimating] = useState(false)
  const iterationCount = useRef(0)
  const elementRef = useRef<HTMLElement>(null)

  // Set mounted flag and initialize scrambled text on client only
  useEffect(() => {
    setIsMounted(true)
    // Initialize with random scrambled text only on client
    setDisplayText(
      words.map((word) => {
        if (word.match(/[\s.,!?—]/)) {
          return word
        }
        return word.split("").map(() => 
          characterSet[getRandomInt(characterSet.length)]
        ).join("")
      })
    )
  }, [words, characterSet])

  const handleAnimationTrigger = () => {
    if (animateOnHover && !isAnimating) {
      iterationCount.current = 0
      setIsAnimating(true)
    }
  }

  // Handle animation start based on view or delay (only after mount)
  useEffect(() => {
    if (!isMounted) return

    if (!startOnView) {
      const startTimeout = setTimeout(() => {
        setIsAnimating(true)
      }, delay)

      return () => clearTimeout(startTimeout)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            setIsAnimating(true)
          }, delay)
          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: "-30% 0px -30% 0px" }
    )

    if (elementRef.current) {
      observer.observe(elementRef.current)
    }

    return () => observer.disconnect()
  }, [delay, startOnView, isMounted])

  // Handle scramble animation - word by word
  useEffect(() => {
    if (!isAnimating) return

    const maxIterations = words.length
    const startTime = performance.now()
    let animationFrameId: number

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      iterationCount.current = Math.floor(progress * maxIterations)

      setDisplayText((currentText) =>
        words.map((word, index) => {
          if (index <= iterationCount.current) {
            // Word is fully revealed
            return word
          } else {
            // Word is still scrambling - generate random characters matching word length
            return word.split("").map(() => 
              word.match(/[\s.,!?—]/) 
                ? word 
                : characterSet[getRandomInt(characterSet.length)]
            ).join("")
          }
        })
      )

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate)
      } else {
        // Ensure all words are revealed at the end
        setDisplayText(words)
        setIsAnimating(false)
      }
    }

    animationFrameId = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(animationFrameId)
  }, [words, duration, isAnimating, characterSet])

  return (
    <MotionComponent
      ref={elementRef}
      className={cn("overflow-hidden py-2 text-4xl font-bold", className)}
      onMouseEnter={handleAnimationTrigger}
      {...props}
    >
      <AnimatePresence>
        {displayText.map((word, index) => (
          <motion.span
            key={index}
            className={cn("font-mono inline-block", word.match(/^\s+$/) ? "w-3" : "")}
            initial={false}
            animate={false}
            exit={false}
            style={{ transform: 'none' }}
          >
            {word.toUpperCase()}
          </motion.span>
        ))}
      </AnimatePresence>
    </MotionComponent>
  )
}

