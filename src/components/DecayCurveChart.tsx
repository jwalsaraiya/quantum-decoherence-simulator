/**
 * DecayCurveChart.tsx
 * High-Precision Swiss Scientific SVG Chart.
 * 
 * Generously spaced, responsive, and publication-ready:
 * - Exponential decay curves tracking Lindblad relaxation F(t)
 * - Exact SVG matrix-transformed hover crosshair (t, Fidelity, Error)
 * - Clear 0.00 to 1.00 ticks on both axes with generous spacing
 * - Real-time animated simulation progress tracker
 */
import { useRef, useState, useCallback, useEffect } from 'react'

interface DataPoint {
  t: number
  fidelity: number
  purity: number
}

interface Props {
  curve: DataPoint[]
  progress: number // Simulation time [0, 1]
  hasActiveNoise?: boolean
}

const VIEW_W = 600
const VIEW_H = 220
const PADDING = { top: 20, right: 32, bottom: 42, left: 54 }

export default function DecayCurveChart({
  curve,
  progress,
  hasActiveNoise = false,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoveredPoint, setHoveredPoint] = useState<{
    svgX: number
    svgY: number
    t: number
    f: number
    err: number
  } | null>(null)

  const plotW = VIEW_W - PADDING.left - PADDING.right
  const plotH = VIEW_H - PADDING.top - PADDING.bottom

  const getSvgX = (t: number) => PADDING.left + t * plotW
  const getSvgY = (f: number) => PADDING.top + (1 - f) * plotH

  // Interpolate exact fidelity at current progress time
  const currentFidelity = (() => {
    if (curve.length === 0) return 1
    if (progress <= 0) return curve[0].fidelity
    if (progress >= 1) return curve[curve.length - 1].fidelity

    for (let i = 0; i < curve.length - 1; i++) {
      const p0 = curve[i]
      const p1 = curve[i + 1]
      if (progress >= p0.t && progress <= p1.t) {
        const span = p1.t - p0.t
        const ratio = span > 0 ? (progress - p0.t) / span : 0
        return p0.fidelity + ratio * (p1.fidelity - p0.fidelity)
      }
    }
    return curve[curve.length - 1].fidelity
  })()

  // Sliced progressive points list up to progress
  const pointsToDraw = (() => {
    if (curve.length === 0 || progress <= 0.002) return []

    // Collect sampled points strictly before progress
    const pts = curve.filter((pt) => pt.t < progress).map((pt) => ({
      t: pt.t,
      fidelity: pt.fidelity,
    }))

    // Append exact tip at current progress
    pts.push({
      t: progress,
      fidelity: currentFidelity,
    })

    return pts
  })()

  // Build SVG path for progressive Fidelity curve
  const pathD =
    pointsToDraw.length < 2
      ? ''
      : pointsToDraw
          .map(
            (pt, i) =>
              `${i === 0 ? 'M' : 'L'} ${getSvgX(pt.t).toFixed(1)} ${getSvgY(pt.fidelity).toFixed(1)}`,
          )
          .join(' ')

  // Shaded area strictly underneath the progressively drawn curve
  const areaD =
    pathD && progress > 0.002
      ? `${pathD} L ${getSvgX(progress).toFixed(1)} ${getSvgY(0).toFixed(1)} L ${getSvgX(0).toFixed(1)} ${getSvgY(0).toFixed(1)} Z`
      : ''

  // Current simulation progress dot position (at leading tip)
  const dotX = getSvgX(progress)
  const dotY = getSvgY(currentFidelity)

  // 100% accurate SVG Matrix Mouse Detection
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current
      if (!svg || curve.length === 0 || progress <= 0.01) return

      const pt = svg.createSVGPoint()
      pt.x = e.clientX
      pt.y = e.clientY

      const ctm = svg.getScreenCTM()
      if (!ctm) return

      const svgP = pt.matrixTransform(ctm.inverse())

      // Check if mouse is within plot bounds horizontally
      const relX = svgP.x - PADDING.left
      const tNorm = Math.max(0, Math.min(1, relX / plotW))

      // Only allow inspecting time that has already been simulated
      if (tNorm > progress + 0.02) {
        setHoveredPoint(null)
        return
      }

      const idx = Math.min(
        curve.length - 1,
        Math.round(tNorm * (curve.length - 1)),
      )
      const dataPt = curve[idx]
      if (!dataPt) return

      setHoveredPoint({
        svgX: getSvgX(dataPt.t),
        svgY: getSvgY(dataPt.fidelity),
        t: dataPt.t,
        f: dataPt.fidelity,
        err: Math.max(0, 1 - dataPt.fidelity),
      })
    },
    [curve, plotW, progress],
  )

  useEffect(() => {
    setHoveredPoint(null)
  }, [curve])

  const yTicks = [0.0, 0.25, 0.5, 0.75, 1.0]
  const xTicks = [0.0, 0.25, 0.5, 0.75, 1.0]

  const isFlatCoherent = curve.length > 0 && Math.abs(curve[curve.length - 1].fidelity - 1.0) < 0.001

  return (
    <div className="relative w-full h-full min-h-0 flex flex-col justify-center">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full h-full cursor-crosshair select-none"
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredPoint(null)}
      >
        <defs>
          <linearGradient id="decayAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#DC2626" stopOpacity="0.18" />
            <stop offset="60%" stopColor="#DC2626" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#DC2626" stopOpacity="0.0" />
          </linearGradient>

          <clipPath id="plotBounds">
            <rect
              x={PADDING.left}
              y={PADDING.top}
              width={plotW}
              height={plotH}
            />
          </clipPath>
        </defs>

        {/* Subtle Horizontal Grid lines & Y Ticks */}
        {yTicks.map((val) => {
          const y = getSvgY(val)
          return (
            <g key={val}>
              <line
                x1={PADDING.left}
                y1={y}
                x2={VIEW_W - PADDING.right}
                y2={y}
                stroke="#E2E8F0"
                strokeWidth="1"
                strokeDasharray={val === 0 || val === 1 ? 'none' : '3,3'}
              />
              <text
                x={PADDING.left - 9}
                y={y + 3.5}
                textAnchor="end"
                className="font-mono text-[11px] fill-[#334155] font-semibold select-none"
              >
                {val.toFixed(2)}
              </text>
            </g>
          )
        })}

        {/* Vertical Grid lines & X Ticks */}
        {xTicks.map((val) => {
          const x = getSvgX(val)
          return (
            <g key={val}>
              <line
                x1={x}
                y1={PADDING.top}
                x2={x}
                y2={VIEW_H - PADDING.bottom}
                stroke="#E2E8F0"
                strokeWidth="1"
                strokeDasharray={val === 0 || val === 1 ? 'none' : '3,3'}
              />
              <line
                x1={x}
                y1={VIEW_H - PADDING.bottom}
                x2={x}
                y2={VIEW_H - PADDING.bottom + 5}
                stroke="#334155"
                strokeWidth="1.2"
              />
              <text
                x={x}
                y={VIEW_H - PADDING.bottom + 18}
                textAnchor="middle"
                className="font-mono text-[11px] fill-[#334155] font-semibold select-none"
              >
                {val.toFixed(2)}
              </text>
            </g>
          )
        })}

        {/* L-Shaped Coordinate Axes */}
        <polyline
          points={`${PADDING.left},${PADDING.top} ${PADDING.left},${VIEW_H - PADDING.bottom} ${VIEW_W - PADDING.right},${VIEW_H - PADDING.bottom}`}
          fill="none"
          stroke="#11151C"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Ideal State Reference Line at F = 1.0 (Dashed Cobalt Blue) */}
        <line
          x1={PADDING.left}
          y1={getSvgY(1.0)}
          x2={VIEW_W - PADDING.right}
          y2={getSvgY(1.0)}
          stroke="#2563EB"
          strokeWidth="1.75"
          strokeDasharray="6,4"
        />

        {/* Gradient Area Fill under Decay Curve */}
        {areaD && (
          <path d={areaD} fill="url(#decayAreaGrad)" clipPath="url(#plotBounds)" />
        )}

        {/* Crimson Red Decoherence Decay Curve */}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="#DC2626"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            clipPath="url(#plotBounds)"
          />
        )}

        {/* Zero Noise / Invariant Eigenstate Helper Hint in Center of Plot */}
        {isFlatCoherent && (
          <text
            x={(PADDING.left + VIEW_W - PADDING.right) / 2}
            y={PADDING.top + plotH / 2}
            textAnchor="middle"
            className="text-[11.5px] fill-[#475569] font-medium select-none pointer-events-none"
          >
            {hasActiveNoise
              ? 'Invariant Eigenstate (F = 1.000)'
              : 'No active noise — adjust channels to view decay'}
          </text>
        )}

        {/* Simulation Progress Dot at the leading tip of the progressive curve */}
        {progress > 0.005 && (
          <g>
            <circle
              cx={dotX}
              cy={dotY}
              r="7"
              fill="#DC2626"
              opacity="0.25"
            />
            <circle
              cx={dotX}
              cy={dotY}
              r="4"
              fill="#DC2626"
              stroke="#FFFFFF"
              strokeWidth="2"
            />
          </g>
        )}

        {/* Interactive Hover Crosshair */}
        {hoveredPoint && (
          <g>
            <line
              x1={hoveredPoint.svgX}
              y1={PADDING.top}
              x2={hoveredPoint.svgX}
              y2={VIEW_H - PADDING.bottom}
              stroke="#64748B"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
            <line
              x1={PADDING.left}
              y1={hoveredPoint.svgY}
              x2={VIEW_W - PADDING.right}
              y2={hoveredPoint.svgY}
              stroke="#64748B"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
            <circle
              cx={hoveredPoint.svgX}
              cy={hoveredPoint.svgY}
              r="4.5"
              fill="#FFFFFF"
              stroke="#DC2626"
              strokeWidth="2"
            />
          </g>
        )}

        {/* Y Axis Label */}
        <text
          x={0}
          y={0}
          transform={`rotate(-90) translate(-${(PADDING.top + VIEW_H - PADDING.bottom) / 2}, 16)`}
          textAnchor="middle"
          className="font-mono text-[11px] fill-[#334155] font-semibold select-none tracking-tight"
        >
          Fidelity F(t)
        </text>

        {/* X Axis Label */}
        <text
          x={(PADDING.left + VIEW_W - PADDING.right) / 2}
          y={VIEW_H - 6}
          textAnchor="middle"
          className="font-mono text-[11px] fill-[#334155] font-semibold select-none tracking-tight"
        >
          Normalized Evolution Time (t / τ)
        </text>
      </svg>

      {/* Floating Hover Tooltip */}
      {hoveredPoint && (
        <div
          className="absolute pointer-events-none z-20 bg-slate-900 text-white rounded-md shadow-lg px-2.5 py-1 text-[11px] font-mono border border-slate-700 transition-opacity duration-75"
          style={{
            left: `${((hoveredPoint.svgX - PADDING.left) / plotW) * 78 + 12}%`,
            top: `${(hoveredPoint.svgY / VIEW_H) * 80 + 5}%`,
            transform: 'translate(-50%, -120%)',
          }}
        >
          <div className="flex items-center gap-2 tabular-nums">
            <span>t: {hoveredPoint.t.toFixed(2)}</span>
            <span className="text-slate-600">|</span>
            <span className="text-blue-300 font-semibold">
              F: {hoveredPoint.f.toFixed(3)}
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-rose-300 font-semibold">
              Err: {hoveredPoint.err.toFixed(3)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
