/**
 * SmartInfoTooltip.tsx
 * Ultra-High-Precision Collision-Aware Portal Tooltip.
 * 
 * Features:
 * - Rendered directly into document.body via createPortal (NEVER clipped by card/dropdown overflow).
 * - Dynamically measures DOM bounding box to flip UP or DOWN based on available viewport space.
 * - Viewport edge clamping: Tooltip is guaranteed to stay within [8px, window.innerHeight - 8px].
 * - Zero native HTML `title` attributes (completely eliminates ugly overlapping OS/browser alt-text).
 * - Smooth Framer Motion enter/exit micro-animations.
 * - Interactive support: handles hover (with 150ms grace timeout) and click/tap toggling.
 */
import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Info } from 'lucide-react'

interface Props {
  content: React.ReactNode
  children?: React.ReactNode
  width?: number
  className?: string
  iconSize?: number
}

export default function SmartInfoTooltip({
  content,
  children,
  width = 260,
  className = '',
  iconSize = 11,
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [coords, setCoords] = useState<{
    x: number
    y: number
    placeAbove: boolean
    arrowLeft: number
  } | null>(null)

  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const leaveTimerRef = useRef<number | null>(null)

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()

    // Measure or estimate tooltip height
    const tooltipHeight = tooltipRef.current
      ? tooltipRef.current.offsetHeight
      : 110 // realistic estimate for typical content

    const spaceAbove = rect.top
    const spaceBelow = window.innerHeight - rect.bottom

    // Determine vertical placement:
    // If space below is sufficient for height + margins (16px), place below.
    // If space below is cramped (< height + 16px) and space above has more room, place above.
    const placeAbove = spaceBelow < tooltipHeight + 16 && spaceAbove > spaceBelow

    // Ideal X centered on trigger, clamped within screen margins
    const triggerCenterX = rect.left + rect.width / 2
    const idealX = triggerCenterX - width / 2
    const clampedX = Math.max(12, Math.min(window.innerWidth - width - 12, idealX))

    // Arrow relative X position pointing directly to the trigger icon
    const arrowLeft = Math.max(14, Math.min(width - 14, triggerCenterX - clampedX))

    // Vertical Y coordinate clamped to viewport
    let targetY: number
    if (placeAbove) {
      targetY = rect.top - tooltipHeight - 8
    } else {
      targetY = rect.bottom + 8
    }

    // Clamp Y to stay entirely inside the screen
    const clampedY = Math.max(8, Math.min(window.innerHeight - tooltipHeight - 8, targetY))

    setCoords({
      x: clampedX,
      y: clampedY,
      placeAbove,
      arrowLeft,
    })
  }, [width])

  // Recalculate accurately once tooltip element is mounted in DOM
  useLayoutEffect(() => {
    if (isOpen) {
      calculatePosition()
    }
  }, [isOpen, calculatePosition])

  const clearTimer = () => {
    if (leaveTimerRef.current !== null) {
      window.clearTimeout(leaveTimerRef.current)
      leaveTimerRef.current = null
    }
  }

  const handleMouseEnter = () => {
    clearTimer()
    calculatePosition()
    setIsOpen(true)
  }

  const handleMouseLeave = () => {
    clearTimer()
    leaveTimerRef.current = window.setTimeout(() => {
      setIsOpen(false)
    }, 120)
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    clearTimer()
    if (isOpen) {
      setIsOpen(false)
    } else {
      calculatePosition()
      setIsOpen(true)
    }
  }

  // Update position on window scroll or resize
  useEffect(() => {
    if (!isOpen) return
    const listener = () => calculatePosition()
    window.addEventListener('resize', listener)
    window.addEventListener('scroll', listener, true)
    return () => {
      window.removeEventListener('resize', listener)
      window.removeEventListener('scroll', listener, true)
    }
  }, [isOpen, calculatePosition])

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return
    const listener = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    window.addEventListener('click', listener)
    return () => window.removeEventListener('click', listener)
  }, [isOpen])

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleToggle}
        className={`inline-flex items-center justify-center cursor-pointer select-none ${className}`}
      >
        {children || (
          <div className="w-4 h-4 rounded-full bg-slate-100 hover:bg-blue-100 text-slate-400 hover:text-blue-600 flex items-center justify-center transition-colors">
            <Info size={iconSize} />
          </div>
        )}
      </div>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && coords && (
              <motion.div
                ref={tooltipRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                initial={{
                  opacity: 0,
                  y: coords.placeAbove ? 4 : -4,
                  scale: 0.97,
                }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{
                  opacity: 0,
                  y: coords.placeAbove ? 2 : -2,
                  scale: 0.97,
                }}
                transition={{ duration: 0.12 }}
                style={{
                  position: 'fixed',
                  top: coords.y,
                  left: coords.x,
                  width,
                  zIndex: 99999,
                }}
                className="bg-slate-900 text-white p-2.5 rounded-xl shadow-2xl border border-slate-700 text-xs font-sans leading-relaxed select-none"
              >
                {/* Pointer Arrow */}
                <div
                  className={`absolute w-2 h-2 bg-slate-900 border-slate-700 rotate-45 ${
                    coords.placeAbove
                      ? 'bottom-[-5px] border-b border-r'
                      : 'top-[-5px] border-t border-l'
                  }`}
                  style={{ left: coords.arrowLeft - 4 }}
                />

                <div className="relative z-10">{content}</div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  )
}
