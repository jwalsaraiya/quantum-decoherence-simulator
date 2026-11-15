/**
 * App.tsx — Quantum Decoherence & Noise Simulator
 * High-Precision Human-Crafted Scientific UI (Antislop compliant).
 * 
 * BQT SLA IT-2 (Roll No. 13 to 16)
 * - Naitik Vadhavana (Roll 13)
 * - Rani Vithalani (Roll 14)
 * - Naman Jain (Roll 15)
 * - Jwal Saraiya (Roll 16)
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import type { Variants } from 'framer-motion'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  RotateCcw,
  Users,
  ChevronDown,
  Activity,
  Sliders,
  Compass,
  LineChart,
  Zap,
  ShieldCheck,
  Cpu,
} from 'lucide-react'

import BlochSphere3D from './components/BlochSphere3D'
import DecayCurveChart from './components/DecayCurveChart'
import SmartInfoTooltip from './components/SmartInfoTooltip'
import {
  computeQuantumState,
  buildDecayCurve,
  PRESETS,
  type NoiseParams,
  type PresetKey,
} from './utils/quantumPhysics'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

const cardVariant: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE } },
}

const expandVariant: Variants = {
  hidden: { opacity: 0, height: 0, overflow: 'hidden' },
  show: {
    opacity: 1,
    height: 'auto',
    overflow: 'hidden',
    transition: { duration: 0.22, ease: EASE },
  },
  exit: {
    opacity: 0,
    height: 0,
    overflow: 'hidden',
    transition: { duration: 0.16, ease: EASE },
  },
}

// Active realistic defaults
const ACTIVE_DEFAULTS: NoiseParams = {
  t1: 0.35, // 35% Energy Relaxation
  t2: 0.55, // 55% Phase Dephasing
}

const SIMULATION_DURATION = 3000 // ms

const CONTRIBUTORS = [
  { roll: 13, name: 'Naitik Vadhavana' },
  { roll: 14, name: 'Rani Vithalani' },
  { roll: 15, name: 'Naman Jain' },
  { roll: 16, name: 'Jwal Saraiya' },
]

interface SimulationPresetOption {
  id: string
  label: string
  category: 'Regimes' | 'Hardware'
  t1: number
  t2: number
  detail: string
}

const ALL_SIMULATION_PRESETS: SimulationPresetOption[] = [
  {
    id: 'standard',
    label: 'Standard Noise (T₁: 35%, T₂: 55%)',
    category: 'Regimes',
    t1: 0.35,
    t2: 0.55,
    detail: 'Balanced energy dissipation & transverse dephasing.',
  },
  {
    id: 'pure_t2',
    label: 'Pure T₂ Dephasing (T₁: 0%, T₂: 65%)',
    category: 'Regimes',
    t1: 0.0,
    t2: 0.65,
    detail: 'Zero energy loss; scrambles relative phase in superpositions without affecting pure Z eigenstates.',
  },
  {
    id: 'pure_t1',
    label: 'T₁ Energy Decay (T₁: 65%, T₂: 20%)',
    category: 'Regimes',
    t1: 0.65,
    t2: 0.2,
    detail: '|1⟩ → |0⟩ spontaneous decay dominates; dissipates energy ΔE = hf into environment.',
  },
  {
    id: 'ideal',
    label: 'Ideal State (0% Noise / Pure Coherent)',
    category: 'Regimes',
    t1: 0.0,
    t2: 0.0,
    detail: 'Zero decoherence; persistent unitary quantum coherence.',
  },
  {
    id: 'transmon',
    label: 'Superconducting Transmon',
    category: 'Hardware',
    t1: 0.45,
    t2: 0.65,
    detail: 'T₁ ~ 100 μs, T₂ ~ 80 μs · Josephson junction LC circuit (IBM / Google), limited by dielectric loss & flux noise.',
  },
  {
    id: 'trapped_ion',
    label: 'Trapped Ion',
    category: 'Hardware',
    t1: 0.05,
    t2: 0.15,
    detail: 'T₁ > 10 s, T₂ ~ 1.5 s · Atomic ions in RF Paul trap (IonQ / Quantinuum) with Raman laser transitions.',
  },
  {
    id: 'nv_center',
    label: 'NV Center in Diamond',
    category: 'Hardware',
    t1: 0.25,
    t2: 0.6,
    detail: 'T₁ ~ 1 ms, T₂ ~ 0.5 ms · Solid-state spin defect, room temperature capability.',
  },
  {
    id: 'photonic',
    label: 'Photonic Qubit',
    category: 'Hardware',
    t1: 0.0,
    t2: 0.12,
    detail: 'T₁ = ∞ (No spontaneous energy decay) · Limited by optical waveguide loss & phase drift (PsiQuantum / Xanadu).',
  },
]

export default function App() {
  // Qubit initial state (defaults to |+⟩: θ = 90°, φ = 0° for active decoherence demonstration)
  const [presetKey, setPresetKey] = useState<PresetKey>('plus')
  const [theta, setTheta] = useState(Math.PI / 2)
  const [phi, setPhi] = useState(0)

  // Relaxation channels (T1 and T2 relaxation)
  const [noise, setNoise] = useState<NoiseParams>(ACTIVE_DEFAULTS)

  // Selected preset label for drop-up display
  const [selectedPresetLabel, setSelectedPresetLabel] = useState<string>(
    'Standard Noise (T₁: 35%, T₂: 55%)',
  )
  const [showPresetMenu, setShowPresetMenu] = useState(false)

  // Simulation time progress t ∈ [0, 1]
  const [progress, setProgress] = useState(1)
  const [playing, setPlaying] = useState(false)

  // Team contributor popover
  const [showContrib, setShowContrib] = useState(false)

  const rafRef = useRef<number>(0)
  const startTs = useRef<number>(0)
  const startProgress = useRef<number>(0)
  const presetDropdownRef = useRef<HTMLDivElement>(null)

  // Determine active initial angles
  const effectiveTheta =
    presetKey === 'custom'
      ? theta
      : PRESETS[presetKey].theta

  const effectivePhi =
    presetKey === 'custom'
      ? phi
      : PRESETS[presetKey].phi

  // Compute live state & decay curve based on exact exponential Lindblad physics
  const qState = computeQuantumState(
    effectiveTheta,
    effectivePhi,
    noise,
    progress,
  )
  const curve = buildDecayCurve(effectiveTheta, effectivePhi, noise)

  // ── Simulation Handlers ───────────────────────────────────────────────────
  const stopSim = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    setPlaying(false)
  }, [])

  const startSim = useCallback(() => {
    if (playing) {
      stopSim()
      return
    }

    const beginP = progress >= 0.99 ? 0 : progress
    setProgress(beginP)
    setPlaying(true)
    startTs.current = 0
    startProgress.current = beginP

    function step(ts: number) {
      if (!startTs.current) startTs.current = ts
      const elapsed = ts - startTs.current
      const p = Math.min(
        1,
        startProgress.current + (elapsed / SIMULATION_DURATION) * (1 - startProgress.current),
      )
      setProgress(p)

      if (p < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        setPlaying(false)
      }
    }

    rafRef.current = requestAnimationFrame(step)
  }, [playing, progress, stopSim])

  // Reset button takes all sliders to 0 and state to |+⟩
  const handleReset = useCallback(() => {
    stopSim()
    setPresetKey('plus')
    setTheta(Math.PI / 2)
    setPhi(0)
    setNoise({ t1: 0, t2: 0 })
    setSelectedPresetLabel('Ideal State (0% Noise / Pure Coherent)')
    setProgress(1)
  }, [stopSim])

  // Helper to enforce physical bound T2 <= 2T1 (when T1 is small)
  const enforceBound = useCallback(() => {
    if (noise.t2 > 2 * noise.t1 && noise.t1 > 0) {
      setNoise((prev) => ({ ...prev, t2: Math.min(1, 2 * prev.t1) }))
      setSelectedPresetLabel('Custom Configuration')
    }
  }, [noise.t1, noise.t2])

  // Preset Selection Handler
  const handleSelectPreset = (p: SimulationPresetOption) => {
    setNoise({ t1: p.t1, t2: p.t2 })
    setSelectedPresetLabel(p.label)
    setShowPresetMenu(false)
  }

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // Close drop-ups on outside click
  useEffect(() => {
    const listener = (e: MouseEvent) => {
      if (
        presetDropdownRef.current &&
        !presetDropdownRef.current.contains(e.target as Node)
      ) {
        setShowPresetMenu(false)
      }
      if (showContrib) {
        setShowContrib(false)
      }
    }
    window.addEventListener('click', listener)
    return () => window.removeEventListener('click', listener)
  }, [showContrib])

  const getFidelityStatus = (f: number) => {
    if (f >= 0.99) return { label: 'Pure Coherent', color: 'text-blue-700 bg-blue-50 border-blue-200' }
    if (f >= 0.7) return { label: 'High Coherence', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' }
    if (f >= 0.35) return { label: 'Decohered', color: 'text-amber-700 bg-amber-50 border-amber-200' }
    return { label: 'Orthogonal State', color: 'text-rose-700 bg-rose-50 border-rose-200' }
  }

  const fidStatus = getFidelityStatus(qState.fidelity)

  return (
    // Single-Screen Viewport Lock
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#F8FAFC] text-[#0F172A] select-none font-sans">
      {/* ── TOP HEADER BAR (Clean, Bold, Zero Clutter) ────────────────────── */}
      <header className="shrink-0 h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between relative z-30 shadow-xs">
        {/* Left Branding with Prominent Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Activity size={18} />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight uppercase">
              QUANTUM DECOHERENCE &amp; NOISE SIMULATOR
            </h1>
          </div>
        </div>

        {/* Right: Team Dropdown (BQT SLA IT-2 Roll No. 13 to 16) */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowContrib((s) => !s)
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-white hover:border-slate-400 transition-colors text-xs text-slate-700 font-medium cursor-pointer shadow-xs"
          >
            <Users size={14} className="text-blue-600" />
            <span className="font-semibold text-slate-800">BQT SLA IT-2</span>
            <span className="text-slate-500 text-[11px]">(Roll No. 13 to 16)</span>
            <ChevronDown
              size={13}
              className={`transition-transform duration-200 text-slate-400 ${
                showContrib ? 'rotate-180' : ''
              }`}
            />
          </button>

          <AnimatePresence>
            {showContrib && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 p-3 z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2 flex justify-between items-center">
                  <span>Project Contributors</span>
                  <span className="text-blue-600 font-mono text-[10px]">IT-2</span>
                </div>
                <div className="space-y-1">
                  {CONTRIBUTORS.map((c) => (
                    <div
                      key={c.roll}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-xs transition-colors"
                    >
                      <span className="font-semibold text-slate-800">{c.name}</span>
                      <span className="font-mono text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-100 text-[11px]">
                        Roll {c.roll}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* ── MAIN CONTENT GRID (5 Cols Left, 7 Cols Right) ──────────────────── */}
      <main className="flex-1 min-h-0 p-3.5 grid grid-cols-12 gap-3.5 overflow-hidden">
        {/* ── LEFT PANEL: CONTROLS (5 Cols) ────────────────────────────────── */}
        <div className="col-span-5 flex flex-col gap-3 min-h-0 overflow-y-auto pr-0.5">
          {/* Card 1: Initial Qubit State |ψ₀⟩ */}
          <motion.div
            variants={cardVariant}
            initial="hidden"
            animate="show"
            className="bg-white rounded-xl border border-slate-300 shadow-[0_1px_3px_rgba(15,23,42,0.03)] p-3.5 shrink-0"
          >
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <Compass size={14} className="text-blue-600" />
                Initial Qubit State |ψ₀⟩
              </h2>
            </div>

            {/* Custom State Option (Positioned ABOVE the 6 Initial States) */}
            <div className="mb-2">
              <button
                type="button"
                onClick={() => setPresetKey('custom')}
                className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold font-mono transition-all border cursor-pointer flex items-center justify-between ${
                  presetKey === 'custom'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>|ψ(θ, φ)⟩ Custom Qubit State</span>
                <span className="text-[10px] font-sans font-normal opacity-80">
                  {presetKey === 'custom' ? 'Configuring Angles' : 'Click to customize θ & φ'}
                </span>
              </button>

              {/* Custom Angle Sliders (Expands directly underneath Custom State button) */}
              <AnimatePresence>
                {presetKey === 'custom' && (
                  <motion.div
                    variants={expandVariant}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    className="space-y-2.5 pt-2.5 pb-1 border-t border-slate-100 mt-2"
                  >
                    <div>
                      <div className="flex justify-between items-center mb-1 text-xs">
                        <span className="font-semibold text-slate-700">
                          Polar Angle θ (0° to 180°)
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          {((theta / Math.PI) * 180).toFixed(0)}°
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={180}
                        value={Math.round((theta / Math.PI) * 180)}
                        onChange={(e) =>
                          setTheta((Number(e.target.value) / 180) * Math.PI)
                        }
                        style={{
                          background: `linear-gradient(to right, #2563EB 0%, #2563EB ${Math.round((theta / Math.PI) * 100)}%, #E2E8F0 ${Math.round((theta / Math.PI) * 100)}%, #E2E8F0 100%)`,
                        }}
                        className="quantum-slider"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1 text-xs">
                        <span className="font-semibold text-slate-700">
                          Azimuthal Phase φ (0° to 360°)
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          {((phi / (2 * Math.PI)) * 360).toFixed(0)}°
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={360}
                        value={Math.round((phi / (2 * Math.PI)) * 360)}
                        onChange={(e) =>
                          setPhi((Number(e.target.value) / 360) * 2 * Math.PI)
                        }
                        style={{
                          background: `linear-gradient(to right, #2563EB 0%, #2563EB ${Math.round((phi / (2 * Math.PI)) * 100)}%, #E2E8F0 ${Math.round((phi / (2 * Math.PI)) * 100)}%, #E2E8F0 100%)`,
                        }}
                        className="quantum-slider"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Symmetric 3x2 Grid for 6 Cardinal Quantum States */}
            <div className="grid grid-cols-3 gap-1.5 mb-2.5">
              <button
                type="button"
                onClick={() => setPresetKey('plus')}
                className={`px-2 py-2 rounded-lg text-xs font-bold font-mono transition-all border cursor-pointer ${
                  presetKey === 'plus'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                |+⟩
                <span className="block text-[9px] font-sans font-normal opacity-80">Superposition</span>
              </button>

              <button
                type="button"
                onClick={() => setPresetKey('zero')}
                className={`px-2 py-2 rounded-lg text-xs font-bold font-mono transition-all border cursor-pointer ${
                  presetKey === 'zero'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                |0⟩
                <span className="block text-[9px] font-sans font-normal opacity-80">Ground</span>
              </button>

              <button
                type="button"
                onClick={() => setPresetKey('one')}
                className={`px-2 py-2 rounded-lg text-xs font-bold font-mono transition-all border cursor-pointer ${
                  presetKey === 'one'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                |1⟩
                <span className="block text-[9px] font-sans font-normal opacity-80">Excited</span>
              </button>

              <button
                type="button"
                onClick={() => setPresetKey('minus')}
                className={`px-2 py-2 rounded-lg text-xs font-bold font-mono transition-all border cursor-pointer ${
                  presetKey === 'minus'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                |−⟩
                <span className="block text-[9px] font-sans font-normal opacity-80">Phase π</span>
              </button>

              <button
                type="button"
                onClick={() => setPresetKey('plusI')}
                className={`px-2 py-2 rounded-lg text-xs font-bold font-mono transition-all border cursor-pointer ${
                  presetKey === 'plusI'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                |+i⟩
                <span className="block text-[9px] font-sans font-normal opacity-80">Phase +90°</span>
              </button>

              <button
                type="button"
                onClick={() => setPresetKey('minusI')}
                className={`px-2 py-2 rounded-lg text-xs font-bold font-mono transition-all border cursor-pointer ${
                  presetKey === 'minusI'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                |−i⟩
                <span className="block text-[9px] font-sans font-normal opacity-80">Phase −90°</span>
              </button>
            </div>

            {/* Live Algebraic State Formula */}
            <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
              <span className="font-mono text-slate-600 text-[11px]">
                |ψ⟩ = cos(θ/2)|0⟩ + e^(iφ)sin(θ/2)|1⟩
              </span>
              <span className="font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                {qState.stateString}
              </span>
            </div>
          </motion.div>

          {/* Card 2: Decoherence Relaxation Channels */}
          <motion.div
            variants={cardVariant}
            initial="hidden"
            animate="show"
            className="flex-1 bg-white rounded-xl border border-slate-300 shadow-[0_1px_3px_rgba(15,23,42,0.03)] p-3.5 flex flex-col justify-between min-h-0 relative"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  <Sliders size={14} className="text-blue-600" />
                  Decoherence Noise Channels
                </h2>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={enforceBound}
                    className="flex items-center gap-1 text-[11px] font-mono text-slate-600 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 px-2 py-0.5 rounded border border-slate-200 transition-colors cursor-pointer"
                  >
                    <ShieldCheck size={13} className="text-emerald-600" />
                    <span>T₂ ≤ 2T₁ Bound</span>
                  </button>
                  <SmartInfoTooltip
                    width={260}
                    content={
                      <div className="space-y-1">
                        <div className="font-bold text-emerald-300">Physical Coherence Bound</div>
                        <p className="text-slate-300 text-[10px] leading-relaxed">
                          Phase coherence time T₂ can never exceed 2× energy relaxation time T₁. Spontaneous energy decay |1⟩ → |0⟩ intrinsically destroys quantum superposition.
                        </p>
                        <div className="font-mono text-[10px] bg-slate-800/90 text-emerald-200 px-2 py-1 rounded border border-slate-700">
                          1/T₂ = 1/(2T₁) + 1/T_φ
                        </div>
                      </div>
                    }
                  />
                </div>
              </div>

              <div className="space-y-4">
                {/* Channel 1: Energy Relaxation T1 with SmartInfoTooltip */}
                <div className="relative">
                  <div className="flex justify-between items-center mb-1 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-800">
                        Energy Relaxation (T₁)
                      </span>
                      
                      <SmartInfoTooltip
                        width={275}
                        content={
                          <div className="space-y-1.5">
                            <div className="font-bold text-blue-300">Energy Relaxation (T₁)</div>
                            <p className="text-slate-300 text-[10px] leading-relaxed">
                              Longitudinal decay (|1⟩ → |0⟩): Spontaneous energy loss ΔE = hf into the cold environment.
                            </p>
                            <div className="font-mono text-[10px] bg-slate-800/90 text-blue-200 px-2 py-1 rounded border border-slate-700">
                              P₁(t) = P₁(0) · e^(-t / T₁)
                            </div>
                            <div className="text-[9px] text-amber-200/90 bg-amber-950/40 p-1.5 rounded border border-amber-800/50 leading-tight">
                              <strong>Why %?</strong> Represents normalized damping probability γ = 1 − e^(-t/T₁): 0% = no decay, 63% = t = T₁, 100% = complete relaxation to |0⟩.
                            </div>
                          </div>
                        }
                      />
                    </div>

                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                      {(noise.t1 * 100).toFixed(0)}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(noise.t1 * 100)}
                    onChange={(e) => {
                      const val = Number(e.target.value) / 100
                      setNoise((prev) => ({ ...prev, t1: val }))
                      setSelectedPresetLabel('Custom Configuration')
                    }}
                    style={{
                      background: `linear-gradient(to right, #2563EB 0%, #2563EB ${Math.round(noise.t1 * 100)}%, #E2E8F0 ${Math.round(noise.t1 * 100)}%, #E2E8F0 100%)`,
                    }}
                    className="quantum-slider"
                  />
                </div>

                {/* Channel 2: Phase Dephasing T2 with SmartInfoTooltip */}
                <div className="relative">
                  <div className="flex justify-between items-center mb-1 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-800">
                        Phase Dephasing (T₂)
                      </span>
                      
                      <SmartInfoTooltip
                        width={275}
                        content={
                          <div className="space-y-1.5">
                            <div className="font-bold text-blue-300">Phase Dephasing (T₂)</div>
                            <p className="text-slate-300 text-[10px] leading-relaxed">
                              Transverse coherence loss: Field fluctuations scramble relative phase without energy loss.
                            </p>
                            <div className="font-mono text-[10px] bg-slate-800/90 text-blue-200 px-2 py-1 rounded border border-slate-700">
                              ρ₀₁(t) = ρ₀₁(0) · e^(-t / T₂)
                            </div>
                            <div className="text-[9px] text-amber-200/90 bg-amber-950/40 p-1.5 rounded border border-amber-800/50 leading-tight">
                              <strong>Why %?</strong> Represents phase scrambling severity λ = 1 − e^(-t/T₂): 0% = full phase coherence, 100% = completely randomized phase.
                            </div>
                          </div>
                        }
                      />
                    </div>

                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                      {(noise.t2 * 100).toFixed(0)}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(noise.t2 * 100)}
                    onChange={(e) => {
                      const val = Number(e.target.value) / 100
                      setNoise((prev) => ({ ...prev, t2: val }))
                      setSelectedPresetLabel('Custom Configuration')
                    }}
                    style={{
                      background: `linear-gradient(to right, #2563EB 0%, #2563EB ${Math.round(noise.t2 * 100)}%, #E2E8F0 ${Math.round(noise.t2 * 100)}%, #E2E8F0 100%)`,
                    }}
                    className="quantum-slider"
                  />
                </div>

                {/* ── SIMULATION PRESETS AS SLEEK DROP-UP MENU ─────────────── */}
                <div className="pt-2 relative" ref={presetDropdownRef}>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Simulation Preset
                  </label>
                  
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowPresetMenu((prev) => !prev)
                    }}
                    className="w-full py-2 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center justify-between cursor-pointer shadow-xs transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <Zap size={14} className="text-blue-600 shrink-0" />
                      <span className="truncate">{selectedPresetLabel}</span>
                    </div>
                    <ChevronDown
                      size={14}
                      className={`text-slate-400 shrink-0 transition-transform duration-200 ${
                        showPresetMenu ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Drop-Up Menu with SmartInfoTooltips (Never Clipped, Portal-Rendered) */}
                  <AnimatePresence>
                    {showPresetMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-full mb-1.5 left-0 right-0 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-40 max-h-64 overflow-y-auto space-y-2 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Group 1: Noise Regimes */}
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 flex items-center gap-1">
                            <Zap size={11} className="text-blue-600" />
                            <span>Noise Regimes</span>
                          </div>
                          <div className="space-y-0.5">
                            {ALL_SIMULATION_PRESETS.filter((p) => p.category === 'Regimes').map((p) => (
                              <div
                                key={p.id}
                                onClick={() => handleSelectPreset(p)}
                                className={`w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between group ${
                                  selectedPresetLabel === p.label ? 'bg-blue-50/70 border border-blue-200' : ''
                                }`}
                              >
                                <span className="font-bold text-slate-800 text-[11px] truncate pr-2">
                                  {p.label}
                                </span>
                                <div onClick={(e) => e.stopPropagation()}>
                                  <SmartInfoTooltip
                                    width={220}
                                    content={
                                      <div className="text-[10px] font-sans text-slate-200 leading-normal">
                                        {p.detail}
                                      </div>
                                    }
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Group 2: Hardware Platforms (No "Module 2") */}
                        <div className="pt-1 border-t border-slate-100">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 flex items-center gap-1">
                            <Cpu size={11} className="text-indigo-600" />
                            <span>Hardware Platforms</span>
                          </div>
                          <div className="space-y-0.5">
                            {ALL_SIMULATION_PRESETS.filter((p) => p.category === 'Hardware').map((p) => (
                              <div
                                key={p.id}
                                onClick={() => handleSelectPreset(p)}
                                className={`w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between group ${
                                  selectedPresetLabel === p.label ? 'bg-blue-50/70 border border-blue-200' : ''
                                }`}
                              >
                                <span className="font-bold text-slate-800 text-[11px] truncate pr-2">
                                  {p.label}
                                </span>
                                <div onClick={(e) => e.stopPropagation()}>
                                  <SmartInfoTooltip
                                    width={240}
                                    content={
                                      <div className="text-[10px] font-sans text-slate-200 leading-normal">
                                        {p.detail}
                                      </div>
                                    }
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Simulation Action Buttons & Live Progress Indicator */}
            <div className="pt-2.5 border-t border-slate-100">
              {playing && (
                <div className="mb-2">
                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mb-1">
                    <span>Evolution Time: {(progress * 100).toFixed(0)}%</span>
                    <span>t / τ: {progress.toFixed(2)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-75"
                      style={{ width: `${Math.round(progress * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={startSim}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] text-xs"
                >
                  {playing ? (
                    <>
                      <Pause size={14} />
                      <span>Pause Simulation</span>
                    </>
                  ) : (
                    <>
                      <Play size={14} fill="currentColor" />
                      <span>Run Simulation</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-semibold py-2 px-4 rounded-lg border border-slate-300 shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] text-xs"
                >
                  <RotateCcw size={13} />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── RIGHT PANEL: 3D BLOCH SPHERE & ANALYTICS (7 Cols) ────────────── */}
        <div className="col-span-7 flex flex-col gap-3 min-h-0">
          {/* Top HUD: Real-Time Metrics Strip */}
          <motion.div
            variants={cardVariant}
            initial="hidden"
            animate="show"
            className="grid grid-cols-3 gap-3 bg-white rounded-xl border border-slate-300 shadow-[0_1px_3px_rgba(15,23,42,0.03)] p-3 shrink-0"
          >
            {/* Metric 1: Fidelity F */}
            <div className="flex flex-col justify-between border-r border-slate-100 pr-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    State Fidelity F
                  </span>
                  <SmartInfoTooltip
                    width={260}
                    content={
                      <div className="space-y-1">
                        <div className="font-bold text-blue-300">Quantum State Fidelity</div>
                        <p className="text-slate-300 text-[10px] leading-relaxed">
                          Overlap probability between ideal pure state |ψ₀⟩ and decohered mixed state ρ(t).
                        </p>
                        <div className="font-mono text-[10px] bg-slate-800/90 text-blue-200 px-2 py-1 rounded border border-slate-700">
                          F = ⟨ψ₀|ρ|ψ₀⟩ = Tr(ρ₀ · ρ)
                        </div>
                        <p className="text-slate-400 text-[9px]">
                          Evaluated via Bloch vectors: F = (1 + r₀ · r) / 2
                        </p>
                      </div>
                    }
                  />
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${fidStatus.color}`}
                >
                  {fidStatus.label}
                </span>
              </div>
              <div className="font-mono text-2xl font-black text-slate-900 tracking-tight tabular-nums">
                {qState.fidelity.toFixed(3)}
              </div>
              <span className="text-[10px] text-slate-500 font-mono mt-0.5 font-medium">
                F = ⟨ψ₀|ρ|ψ₀⟩, ρ₀ = |ψ₀⟩⟨ψ₀|
              </span>
            </div>

            {/* Metric 2: Decoherence Error */}
            <div className="flex flex-col justify-between border-r border-slate-100 pr-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Decoherence Error
                </span>
                <span className="text-[10px] font-mono text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                  1 − F
                </span>
              </div>
              <div className="font-mono text-2xl font-black text-rose-600 tracking-tight tabular-nums">
                {qState.error.toFixed(3)}
              </div>
              <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                Error = 1 − Fidelity
              </span>
            </div>

            {/* Metric 3: Measurement Probabilities P(|0⟩) & P(|1⟩) */}
            <div className="flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Readout Probabilities
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  P(0) + P(1) = 100%
                </span>
              </div>

              <div className="flex items-center justify-between font-mono text-xs font-bold text-slate-800 mb-1">
                <span className="text-blue-700">P(|0⟩): {(qState.p0 * 100).toFixed(1)}%</span>
                <span className="text-indigo-700">P(|1⟩): {(qState.p1 * 100).toFixed(1)}%</span>
              </div>

              {/* Visual Split Probability Bar */}
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                <div
                  className="bg-blue-600 transition-all duration-150"
                  style={{ width: `${Math.round(qState.p0 * 100)}%` }}
                />
                <div
                  className="bg-indigo-600 transition-all duration-150"
                  style={{ width: `${Math.round(qState.p1 * 100)}%` }}
                />
              </div>
            </div>
          </motion.div>

          {/* Middle: 3D Bloch Sphere Card */}
          <motion.div
            variants={cardVariant}
            initial="hidden"
            animate="show"
            className="flex-1 bg-white rounded-xl border border-slate-300 shadow-[0_1px_3px_rgba(15,23,42,0.03)] p-3 relative min-h-[270px] flex flex-col"
          >
            <div className="flex items-center justify-between mb-1 px-1">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <Compass size={14} className="text-blue-600" />
                Bloch Sphere Representation
              </h2>

              {/* Legend: Ideal |ψ₀⟩ vs Decohered ρ(t) on top right of the sphere card */}
              <div className="flex items-center gap-3 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 text-xs shadow-2xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600 shadow-xs"></span>
                  <span className="font-semibold text-slate-700 text-[11px]">Ideal |ψ₀⟩</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-600 shadow-xs"></span>
                  <span className="font-semibold text-slate-700 text-[11px]">Decohered ρ(t)</span>
                </div>
              </div>
            </div>

            <div className="flex-1 w-full h-full relative min-h-0">
              <BlochSphere3D
                ideal={qState.ideal}
                noisy={qState.noisy}
                coherenceRadius={qState.coherenceRadius}
              />
            </div>
          </motion.div>

          {/* Bottom Card: Coherence Decay Curve F(t) (Generous 240px Height) */}
          <motion.div
            variants={cardVariant}
            initial="hidden"
            animate="show"
            className="h-60 bg-white rounded-xl border border-slate-300 shadow-[0_1px_3px_rgba(15,23,42,0.03)] p-3 flex flex-col shrink-0"
          >
            <div className="flex items-center justify-between mb-1 px-1">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <LineChart size={14} className="text-blue-600" />
                Coherence Decay Curve F(t)
              </h2>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-blue-600 font-mono font-semibold">--- Ideal (1.00)</span>
                <span className="text-rose-600 font-mono font-semibold">― Decoherence F(t)</span>
              </div>
            </div>

            <div className="flex-1 w-full h-full min-h-0">
              <DecayCurveChart curve={curve} progress={progress} />
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
