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
  hasActiveNoise,
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
  t1: 0.35, // 35% Energy Relaxation Rate (1/T₁)
  t2: 0.55, // 55% Phase Dephasing Rate (1/T₂)
  px: 0, // 0% Bit-Flip Noise (pₓ)
  pz: 0, // 0% Phase-Flip Noise (p_z)
  p: 0, // 0% Depolarizing Noise (p)
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
  category: 'Continuous' | 'Pauli' | 'Hardware'
  t1: number
  t2: number
  px: number
  pz: number
  p: number
  detail: string
}

const ALL_SIMULATION_PRESETS: SimulationPresetOption[] = [
  {
    id: 'ideal',
    label: 'Ideal Noise-Free Qubit (All 0%)',
    category: 'Continuous',
    t1: 0.0,
    t2: 0.0,
    px: 0.0,
    pz: 0.0,
    p: 0.0,
    detail: 'Zero decoherence across all channels; persistent pure unitary quantum state.',
  },
  {
    id: 'standard',
    label: 'Standard T₁/T₂ Decoherence (T₁: 35%, T₂: 55%)',
    category: 'Continuous',
    t1: 0.35,
    t2: 0.55,
    px: 0.0,
    pz: 0.0,
    p: 0.0,
    detail: 'Balanced Module 2 energy dissipation (1/T₁) & transverse dephasing (1/T₂), satisfying T₂ ≤ 2T₁.',
  },
  {
    id: 'pure_t2',
    label: 'Pure T₂ Dephasing (T₁: 0%, T₂: 65%)',
    category: 'Continuous',
    t1: 0.0,
    t2: 0.65,
    px: 0.0,
    pz: 0.0,
    p: 0.0,
    detail: 'Zero energy loss; scrambles relative phase in superpositions without affecting computational eigenstates.',
  },
  {
    id: 't1_dominated',
    label: 'T₁-Dominated Decay (T₁: 65%, T₂: 35%)',
    category: 'Continuous',
    t1: 0.65,
    t2: 0.35,
    px: 0.0,
    pz: 0.0,
    p: 0.0,
    detail: '|1⟩ → |0⟩ spontaneous energy decay near the physical T₂ ≤ 2T₁ limit (35% ≥ 0.5 × 65%).',
  },
  {
    id: 'bit_flip',
    label: 'Bit-Flip Channel (pₓ: 25%)',
    category: 'Pauli',
    t1: 0.0,
    t2: 0.0,
    px: 0.25,
    pz: 0.0,
    p: 0.0,
    detail: 'Module 3 Pauli-X noise channel: flips |0⟩ ↔ |1⟩ with probability 25%, scaling r_y & r_z by (1 − 2pₓ).',
  },
  {
    id: 'phase_flip',
    label: 'Phase-Flip Channel (p_z: 25%)',
    category: 'Pauli',
    t1: 0.0,
    t2: 0.0,
    px: 0.0,
    pz: 0.25,
    p: 0.0,
    detail: 'Module 3 Pauli-Z noise channel: inverts relative phase with 25% probability, scaling r_x & r_y by (1 − 2p_z).',
  },
  {
    id: 'depolarizing',
    label: 'Depolarizing Channel (p: 20%)',
    category: 'Pauli',
    t1: 0.0,
    t2: 0.0,
    px: 0.0,
    pz: 0.0,
    p: 0.2,
    detail: 'Module 3 isotropic noise: uniformly contracts Bloch vector (r_x, r_y, r_z) toward origin by 1 − (4/3)p.',
  },
  {
    id: 'combined_noise',
    label: 'Combined Noise (T₁: 25%, T₂: 40%, pₓ: 10%, p: 10%)',
    category: 'Pauli',
    t1: 0.25,
    t2: 0.4,
    px: 0.1,
    pz: 0.0,
    p: 0.1,
    detail: 'Realistic combined regime: simultaneous Lindblad T₁/T₂ decay with discrete Pauli bit-flip & depolarizing gate errors.',
  },
  {
    id: 'superconducting',
    label: 'Superconducting Qubit (T₁: 60%, T₂: 75%)',
    category: 'Hardware',
    t1: 0.6,
    t2: 0.75,
    px: 0.0,
    pz: 0.0,
    p: 0.0,
    detail: 'Transmon superconducting circuit (IBM / Google); T₁ ~ 100 μs, T₂ ~ 80 μs, limited by dielectric & flux noise.',
  },
  {
    id: 'trapped_ion',
    label: 'Trapped Ion (T₁: 5%, T₂: 15%)',
    category: 'Hardware',
    t1: 0.05,
    t2: 0.15,
    px: 0.0,
    pz: 0.0,
    p: 0.0,
    detail: 'Atomic ions in RF Paul trap (IonQ / Quantinuum); T₁ > 10 s, T₂ ~ 1.5 s, ultra-low spontaneous relaxation.',
  },
  {
    id: 'nv_center',
    label: 'NV Center in Diamond (T₁: 25%, T₂: 60%)',
    category: 'Hardware',
    t1: 0.25,
    t2: 0.6,
    px: 0.0,
    pz: 0.0,
    p: 0.0,
    detail: 'Solid-state spin defect with room-temperature optical readout; dephasing driven by ¹³C nuclear spin bath.',
  },
  {
    id: 'photonic',
    label: 'Photonic Qubit (T₁: 0%, T₂: 12%)',
    category: 'Hardware',
    t1: 0.0,
    t2: 0.12,
    px: 0.0,
    pz: 0.0,
    p: 0.0,
    detail: 'Flying photon qubit (PsiQuantum / Xanadu); T₁ = ∞ (zero spontaneous energy decay), minor waveguide phase drift.',
  },
]

function renderPresetLabel(text: string) {
  if (!text.includes('p_z')) return text
  const parts = text.split('p_z')
  return (
    <>
      {parts.map((part, idx) => (
        <span key={idx}>
          {part}
          {idx < parts.length - 1 && (
            <>
              p<sub>z</sub>
            </>
          )}
        </span>
      ))}
    </>
  )
}

export default function App() {
  // Qubit initial state (defaults to |+⟩: θ = 90°, φ = 0° for active decoherence demonstration)
  const [presetKey, setPresetKey] = useState<PresetKey>('plus')
  const [theta, setTheta] = useState(Math.PI / 2)
  const [phi, setPhi] = useState(0)

  // Combined Continuous (T1, T2) + Discrete Pauli (px, pz, p) channels
  const [noise, setNoise] = useState<NoiseParams>(ACTIVE_DEFAULTS)

  // Selected preset label for drop-up display
  const [selectedPresetLabel, setSelectedPresetLabel] = useState<string>(
    'Standard T₁/T₂ Decoherence (T₁: 35%, T₂: 55%)',
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

  // Reset button takes all 5 noise sliders to 0 and state to |+⟩
  const handleReset = useCallback(() => {
    stopSim()
    setPresetKey('plus')
    setTheta(Math.PI / 2)
    setPhi(0)
    setNoise({ t1: 0, t2: 0, px: 0, pz: 0, p: 0 })
    setSelectedPresetLabel('Ideal Noise-Free Qubit (All 0%)')
    setProgress(1)
  }, [stopSim])

  // Helper to enforce physical bound T2 <= 2T1 -> Rate (1/T2) >= 0.5 * Rate (1/T1)
  const enforceBound = useCallback(() => {
    const t1Pct = Math.round(noise.t1 * 100)
    const minT2Pct = Math.ceil(0.5 * t1Pct)
    const t2Pct = Math.round(noise.t2 * 100)
    if (t2Pct < minT2Pct) {
      setNoise((prev) => ({ ...prev, t2: minT2Pct / 100 }))
      setSelectedPresetLabel('Custom Configuration')
    }
  }, [noise.t1, noise.t2])

  // Preset Selection Handler (auto-sets all 5 channels simultaneously)
  const handleSelectPreset = (p: SimulationPresetOption) => {
    setNoise({ t1: p.t1, t2: p.t2, px: p.px, pz: p.pz, p: p.p })
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
    if (f >= 0.99) return { label: 'Pure Coherent', color: 'text-[#1D4ED8] bg-[#EFF6FF] border-[#2563EB]', dot: 'bg-[#2563EB]' }
    if (f >= 0.7) return { label: 'High Coherence', color: 'text-[#11151C] bg-[#D4F74A] border-[#11151C]', dot: 'bg-[#11151C]' }
    if (f >= 0.35) return { label: 'Decohered', color: 'text-[#92400E] bg-[#FEF3C7] border-[#D97706]', dot: 'bg-[#D97706]' }
    return { label: 'Orthogonal', color: 'text-[#B91C1C] bg-[#FEF2F2] border-[#DC2626]', dot: 'bg-[#DC2626]' }
  }

  const fidStatus = getFidelityStatus(qState.fidelity)

  return (
    // Responsive Layout: Single-Screen Lock on Desktop (lg:), Smooth Scrollable Stack on Tablet/Mobile
    <div className="min-h-screen lg:h-screen w-full overflow-x-hidden lg:overflow-hidden flex flex-col bg-[#F3EFE6] text-[#11151C] select-none font-sans">
      {/* ── TOP HEADER BAR ────────────────────────────────────────────────── */}
      <header className="shrink-0 h-12 bg-[#11151C] border-b-2 border-[#11151C] text-[#F3EFE6] px-4 sm:px-6 flex items-center justify-between gap-3 relative z-30">
        {/* Left: Compact Circular Bloch Seal + Clean Small Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-7 h-7 rounded-full bg-[#2563EB] border border-[#D4F74A] flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="6.5" stroke="#BFDBFE" strokeWidth="1.25" />
              <ellipse cx="9" cy="9" rx="6.5" ry="2.2" stroke="#D4F74A" strokeWidth="1" strokeDasharray="1.8 1.5" />
              <line x1="9" y1="9" x2="13.8" y2="4.2" stroke="#FFFFFF" strokeWidth="1.9" strokeLinecap="round" />
              <circle cx="9" cy="9" r="1.4" fill="#FFFFFF" />
            </svg>
          </div>
          <h1 className="text-xs sm:text-sm font-bold text-[#FFFFFF] tracking-tight truncate">
            Quantum Decoherence and Noise Simulator
          </h1>
        </div>

        {/* Right: Team Roster Dropdown (BQT SLA IT-2 Roll No. 13 to 16) */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setShowContrib((s) => !s)
            }}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 rounded-md border border-[#334155] bg-[#1E2430] hover:bg-[#273040] transition-colors text-xs text-[#F3EFE6] cursor-pointer active:scale-[0.97]"
          >
            <Users size={13} className="text-[#D4F74A] shrink-0" />
            <span className="font-semibold text-[#FFFFFF]">BQT SLA IT-2</span>
            <span className="hidden sm:inline font-mono text-[#CBD5E1] text-[11px]">
              (Roll No. 13 to 16)
            </span>
            <ChevronDown
              size={13}
              className={`transition-transform duration-150 text-[#CBD5E1] ${
                showContrib ? 'rotate-180' : ''
              }`}
            />
          </button>

          <AnimatePresence initial={false}>
            {showContrib && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 3, scale: 0.98 }}
                transition={{ duration: 0.14 }}
                className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-[3px_3px_0px_#11151C] border-2 border-[#11151C] p-2.5 z-50 text-[#11151C]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-[11px] font-bold text-[#11151C] uppercase tracking-wider mb-1.5 px-2 flex justify-between items-center border-b border-[#E5E0D5] pb-1.5">
                  <span>Project Contributors</span>
                  <span className="font-mono bg-[#D4F74A] text-[#11151C] border border-[#11151C] px-1.5 py-0.5 rounded text-[10px]">
                    IT-2
                  </span>
                </div>
                <div className="space-y-0.5">
                  {CONTRIBUTORS.map((c) => (
                    <div
                      key={c.roll}
                      className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-[#F8F5EE] text-xs transition-colors"
                    >
                      <span className="font-medium text-[#11151C]">{c.name}</span>
                      <span className="font-mono text-[#1D4ED8] bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#93C5FD] text-[11px] tabular-nums">
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

      {/* ── MAIN WORKSPACE GRID (Responsive 1-Col Mobile -> 12-Col Desktop) ──── */}
      <main className="flex-1 min-h-0 p-3 sm:p-3.5 grid grid-cols-1 lg:grid-cols-12 gap-3.5 lg:overflow-hidden">
        {/* ── LEFT PANEL: CONTROLS (5 Cols on Desktop) ──────────────────────── */}
        <div className="col-span-1 lg:col-span-5 flex flex-col gap-3 min-h-0 lg:overflow-y-auto lg:pr-1 pb-1">
          {/* Card 1: Initial Qubit State |ψ₀⟩ */}
          <motion.div
            variants={cardVariant}
            initial="hidden"
            animate="show"
            className="poster-card rounded-xl p-3.5 shrink-0"
          >
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <h2 className="text-[13.5px] font-bold text-[#11151C] tracking-tight truncate">
                Initial Qubit State |ψ₀⟩
              </h2>
              <span className="font-mono font-semibold text-[#1D4ED8] bg-[#EFF6FF] px-2.5 py-0.5 rounded-md border border-[#11151C] text-[11px] shrink-0">
                {qState.stateString}
              </span>
            </div>

            {/* 3x2 State Selector Grid */}
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {[
                { key: 'plus' as const, ket: '|+⟩', sub: 'Superposition' },
                { key: 'zero' as const, ket: '|0⟩', sub: 'Ground' },
                { key: 'one' as const, ket: '|1⟩', sub: 'Excited' },
                { key: 'minus' as const, ket: '|−⟩', sub: 'Phase π' },
                { key: 'plusI' as const, ket: '|+i⟩', sub: 'Phase +90°' },
                { key: 'minusI' as const, ket: '|−i⟩', sub: 'Phase −90°' },
              ].map((st) => {
                const active = presetKey === st.key
                return (
                  <button
                    key={st.key}
                    type="button"
                    onClick={() => setPresetKey(st.key)}
                    className={`px-2 py-2 rounded-lg text-xs transition-all cursor-pointer active:scale-[0.98] ${
                      active
                        ? 'bg-[#2563EB] text-white border-[1.5px] border-[#11151C] shadow-[2px_2px_0px_#11151C] font-semibold'
                        : 'bg-[#F8F5EE] text-[#11151C] border border-[#CBD5E1] hover:bg-[#F3EFE6] hover:border-[#11151C] font-medium'
                    }`}
                  >
                    <span className="font-mono block text-[12.5px] font-semibold">{st.ket}</span>
                    <span
                      className={`block text-[10.5px] mt-0.5 ${
                        active ? 'text-[#EFF6FF]' : 'text-[#475569]'
                      }`}
                    >
                      {st.sub}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Custom Angles Pill Toggle & Expandable Sliders */}
            <div>
              <button
                type="button"
                onClick={() => setPresetKey(presetKey === 'custom' ? 'plus' : 'custom')}
                className={`w-full py-1.5 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-between active:scale-[0.99] ${
                  presetKey === 'custom'
                    ? 'bg-[#2563EB] text-white border-[1.5px] border-[#11151C] shadow-[2px_2px_0px_#11151C]'
                    : 'bg-[#F8F5EE] text-[#11151C] border border-[#CBD5E1] hover:border-[#11151C]'
                }`}
              >
                <span className="font-mono font-semibold text-[11.5px]">|ψ(θ, φ)⟩ Custom Angles</span>
                <span className={`text-[11px] font-medium ${presetKey === 'custom' ? 'text-[#EFF6FF]' : 'text-[#475569]'}`}>
                  {presetKey === 'custom' ? 'Configuring θ & φ' : 'Customize θ & φ'}
                </span>
              </button>

              <AnimatePresence initial={false}>
                {presetKey === 'custom' && (
                  <motion.div
                    variants={expandVariant}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2.5 pb-0.5 border-t border-[#E5E0D5] mt-2"
                  >
                    <div>
                      <div className="flex justify-between items-baseline mb-1.5 text-xs">
                        <span className="text-[#11151C] font-medium">Polar Angle θ</span>
                        <span className="font-mono font-semibold text-[#2563EB] tabular-nums">
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
                          background: `linear-gradient(to right, #2563EB 0%, #2563EB ${Math.round((theta / Math.PI) * 100)}%, #DFDBD0 ${Math.round((theta / Math.PI) * 100)}%, #DFDBD0 100%)`,
                        }}
                        className="quantum-slider"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-baseline mb-1.5 text-xs">
                        <span className="text-[#11151C] font-medium">Azimuthal Phase φ</span>
                        <span className="font-mono font-semibold text-[#2563EB] tabular-nums">
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
                          background: `linear-gradient(to right, #2563EB 0%, #2563EB ${Math.round((phi / (2 * Math.PI)) * 100)}%, #DFDBD0 ${Math.round((phi / (2 * Math.PI)) * 100)}%, #DFDBD0 100%)`,
                        }}
                        className="quantum-slider"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Card 2: Decoherence Noise Channels (All 5 Sliders Simultaneous) */}
          <motion.div
            variants={cardVariant}
            initial="hidden"
            animate="show"
            className="flex-auto shrink-0 poster-card rounded-xl p-3.5 flex flex-col justify-between gap-3 relative"
          >
            <div>
              {/* Card Header + T2 <= 2T1 Bound */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="text-[13.5px] font-bold text-[#11151C] tracking-tight">
                  Decoherence Noise Channels
                </h2>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={enforceBound}
                    className="flex items-center gap-1 text-[11px] font-mono font-semibold text-[#11151C] bg-[#D4F74A] hover:bg-[#C6EA3D] px-2 py-0.5 rounded-md border-[1.5px] border-[#11151C] shadow-[1.5px_1.5px_0px_#11151C] transition-colors cursor-pointer whitespace-nowrap active:scale-[0.97]"
                  >
                    <ShieldCheck size={12} className="text-[#11151C]" />
                    <span>T₂ ≤ 2T₁ Bound</span>
                  </button>
                  <SmartInfoTooltip
                    width={265}
                    content={
                      <div className="space-y-1">
                        <div className="font-semibold text-[#D4F74A]">Physical Coherence Bound</div>
                        <p className="text-[#CBD5E1] text-[10px] leading-relaxed">
                          Phase coherence time T₂ can never exceed 2× energy relaxation time T₁, so Phase Dephasing (1/T₂) is enforced ≥ 0.5 × Energy Relaxation (1/T₁).
                        </p>
                        <div className="font-mono text-[10px] bg-[#1E293B] text-[#D4F74A] px-2 py-1 rounded border border-[#334155]">
                          1/T₂ = 1/(2T₁) + 1/T_φ
                        </div>
                      </div>
                    }
                  />
                </div>
              </div>

              {/* Row 1: Continuous Decay (2 Columns, 0%–100%) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <div className="flex justify-between items-baseline mb-1.5 gap-1">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="font-semibold text-[#11151C] text-xs truncate">
                        Energy Relaxation (1/T₁)
                      </span>
                      <SmartInfoTooltip
                        width={265}
                        content={
                          <div className="space-y-1.5">
                            <div className="font-semibold text-[#93C5FD]">Energy Relaxation (1/T₁)</div>
                            <p className="text-[#CBD5E1] text-[10px] leading-relaxed">
                              Longitudinal decay (|1⟩ → |0⟩): Spontaneous energy loss ΔE = hf into the cold environment.
                            </p>
                            <div className="font-mono text-[10px] bg-[#1E293B] text-[#BFDBFE] px-2 py-1 rounded border border-[#334155]">
                              P₁(t) = P₁(0) · e^(-t / T₁)
                            </div>
                          </div>
                        }
                      />
                    </div>
                    <span className="font-mono font-bold text-[#2563EB] text-xs shrink-0 tabular-nums">
                      {Math.round(noise.t1 * 100)}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(noise.t1 * 100)}
                    onChange={(e) => {
                      const t1Pct = Number(e.target.value)
                      const minT2Pct = Math.ceil(0.5 * t1Pct)
                      setNoise((prev) => ({
                        ...prev,
                        t1: t1Pct / 100,
                        t2: Math.max(prev.t2, minT2Pct / 100),
                      }))
                      setSelectedPresetLabel('Custom Configuration')
                    }}
                    style={{
                      background: `linear-gradient(to right, #2563EB 0%, #2563EB ${Math.round(noise.t1 * 100)}%, #DFDBD0 ${Math.round(noise.t1 * 100)}%, #DFDBD0 100%)`,
                    }}
                    className="quantum-slider"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-baseline mb-1.5 gap-1">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="font-semibold text-[#11151C] text-xs truncate">
                        Phase Dephasing (1/T₂)
                      </span>
                      <SmartInfoTooltip
                        width={265}
                        content={
                          <div className="space-y-1.5">
                            <div className="font-semibold text-[#93C5FD]">Phase Dephasing (1/T₂)</div>
                            <p className="text-[#CBD5E1] text-[10px] leading-relaxed">
                              Transverse coherence loss: Field fluctuations scramble relative phase; enforced ≥ 0.5 · (1/T₁).
                            </p>
                            <div className="font-mono text-[10px] bg-[#1E293B] text-[#BFDBFE] px-2 py-1 rounded border border-[#334155]">
                              ρ₀₁(t) = ρ₀₁(0) · e^(-t / T₂)
                            </div>
                          </div>
                        }
                      />
                    </div>
                    <span className="font-mono font-bold text-[#2563EB] text-xs shrink-0 tabular-nums">
                      {Math.round(noise.t2 * 100)}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(noise.t2 * 100)}
                    onChange={(e) => {
                      const rawPct = Number(e.target.value)
                      const minT2Pct = Math.ceil(0.5 * Math.round(noise.t1 * 100))
                      const clampedPct = Math.max(rawPct, minT2Pct)
                      setNoise((prev) => ({ ...prev, t2: clampedPct / 100 }))
                      setSelectedPresetLabel('Custom Configuration')
                    }}
                    style={{
                      background: `linear-gradient(to right, #2563EB 0%, #2563EB ${Math.round(noise.t2 * 100)}%, #DFDBD0 ${Math.round(noise.t2 * 100)}%, #DFDBD0 100%)`,
                    }}
                    className="quantum-slider"
                  />
                </div>
              </div>

              {/* Divider + "DISCRETE GATE ERRORS" with Single (?) Tooltip */}
              <div className="mt-3 pt-2.5 border-t-2 border-[#11151C]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#11151C]">
                      Discrete Gate Errors
                    </span>
                    <SmartInfoTooltip
                      width={275}
                      content={
                        <div className="space-y-1.5">
                          <div className="font-semibold text-[#93C5FD]">Why Max 50% Cap?</div>
                          <p className="text-[#CBD5E1] text-[10px] leading-relaxed">
                            At <strong>50%</strong>, bit-flip and phase-flip noise reach maximum randomness (zero Bloch vector length). Values <strong>&gt; 50%</strong> invert the state deterministically past the origin instead of adding noise.
                          </p>
                          <div className="font-mono text-[9.5px] bg-[#1E293B] text-[#BFDBFE] px-2 py-1 rounded border border-[#334155]">
                            X/Z scale: (1 − 2p) · Depol: 1 − (4/3)p
                          </div>
                        </div>
                      }
                    >
                      <div className="w-4 h-4 rounded-full bg-[#F8F5EE] hover:bg-[#D4F74A] text-[#11151C] flex items-center justify-center transition-colors font-mono text-[10px] font-bold border border-[#11151C]">
                        ?
                      </div>
                    </SmartInfoTooltip>
                  </div>
                  <span className="font-mono text-[11px] font-semibold text-[#475569]">0% – 50%</span>
                </div>

                {/* Row 2: 3 Compact Pauli Columns */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="flex justify-between items-baseline mb-1.5 gap-1">
                      <span className="font-semibold text-[#11151C] text-xs truncate">
                        Bit-Flip (pₓ)
                      </span>
                      <span className="font-mono font-bold text-[#2563EB] text-[11px] shrink-0 tabular-nums">
                        {Math.round(noise.px * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={50}
                      value={Math.round(noise.px * 100)}
                      onChange={(e) => {
                        const val = Number(e.target.value) / 100
                        setNoise((prev) => ({ ...prev, px: val }))
                        setSelectedPresetLabel('Custom Configuration')
                      }}
                      style={{
                        background: `linear-gradient(to right, #2563EB 0%, #2563EB ${Math.round((noise.px / 0.5) * 100)}%, #DFDBD0 ${Math.round((noise.px / 0.5) * 100)}%, #DFDBD0 100%)`,
                      }}
                      className="quantum-slider"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-baseline mb-1.5 gap-1">
                      <span className="font-semibold text-[#11151C] text-xs truncate">
                        Phase-Flip (p<sub>z</sub>)
                      </span>
                      <span className="font-mono font-bold text-[#2563EB] text-[11px] shrink-0 tabular-nums">
                        {Math.round(noise.pz * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={50}
                      value={Math.round(noise.pz * 100)}
                      onChange={(e) => {
                        const val = Number(e.target.value) / 100
                        setNoise((prev) => ({ ...prev, pz: val }))
                        setSelectedPresetLabel('Custom Configuration')
                      }}
                      style={{
                        background: `linear-gradient(to right, #2563EB 0%, #2563EB ${Math.round((noise.pz / 0.5) * 100)}%, #DFDBD0 ${Math.round((noise.pz / 0.5) * 100)}%, #DFDBD0 100%)`,
                      }}
                      className="quantum-slider"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-baseline mb-1.5 gap-1">
                      <span className="font-semibold text-[#11151C] text-xs truncate">
                        Depolarizing (p)
                      </span>
                      <span className="font-mono font-bold text-[#2563EB] text-[11px] shrink-0 tabular-nums">
                        {Math.round(noise.p * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={50}
                      value={Math.round(noise.p * 100)}
                      onChange={(e) => {
                        const val = Number(e.target.value) / 100
                        setNoise((prev) => ({ ...prev, p: val }))
                        setSelectedPresetLabel('Custom Configuration')
                      }}
                      style={{
                        background: `linear-gradient(to right, #2563EB 0%, #2563EB ${Math.round((noise.p / 0.5) * 100)}%, #DFDBD0 ${Math.round((noise.p / 0.5) * 100)}%, #DFDBD0 100%)`,
                      }}
                      className="quantum-slider"
                    />
                  </div>
                </div>
              </div>

              {/* Simulation Preset Selector */}
              <div className="mt-3 relative" ref={presetDropdownRef}>
                <label className="text-[11px] font-semibold text-[#334155] block mb-1">
                  Simulation Preset
                </label>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowPresetMenu((prev) => !prev)
                  }}
                  className="w-full py-2 px-3 rounded-lg border-[1.5px] border-[#11151C] bg-[#F8F5EE] hover:bg-white text-[#11151C] text-xs font-medium flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <Zap size={13} className="text-[#2563EB] shrink-0" />
                    <span className="truncate">{renderPresetLabel(selectedPresetLabel)}</span>
                  </div>
                  <ChevronDown
                    size={14}
                    className={`text-[#11151C] shrink-0 transition-transform duration-150 ${
                      showPresetMenu ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {showPresetMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 5, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 3, scale: 0.98 }}
                      transition={{ duration: 0.14 }}
                      className="absolute bottom-full mb-2 left-0 right-0 bg-white rounded-xl shadow-[3px_3px_0px_#11151C] border-2 border-[#11151C] p-2 z-40 max-h-64 overflow-y-auto space-y-2 text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Group 1: Continuous Regimes */}
                      <div>
                        <div className="text-[10px] font-bold text-[#475569] uppercase tracking-wider px-2 py-1 flex items-center gap-1.5">
                          <Zap size={11} className="text-[#2563EB]" />
                          <span>Continuous Regimes (T₁ / T₂)</span>
                        </div>
                        <div className="space-y-0.5">
                          {ALL_SIMULATION_PRESETS.filter((p) => p.category === 'Continuous').map((p) => (
                            <div
                              key={p.id}
                              onClick={() => handleSelectPreset(p)}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#F8F5EE] transition-colors cursor-pointer flex items-center justify-between ${
                                selectedPresetLabel === p.label ? 'bg-[#EFF6FF] border border-[#2563EB] font-semibold' : 'border border-transparent'
                              }`}
                            >
                              <span className="text-[#11151C] text-[11.5px] truncate pr-2">
                                {renderPresetLabel(p.label)}
                              </span>
                              <div onClick={(e) => e.stopPropagation()}>
                                <SmartInfoTooltip
                                  width={235}
                                  content={
                                    <div className="text-[10px] font-sans text-[#E2E8F0] leading-normal">
                                      {p.detail}
                                    </div>
                                  }
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Group 2: Discrete Pauli Channels */}
                      <div className="pt-1 border-t border-[#E5E0D5]">
                        <div className="text-[10px] font-bold text-[#475569] uppercase tracking-wider px-2 py-1 flex items-center gap-1.5">
                          <Activity size={11} className="text-[#2563EB]" />
                          <span>Discrete Pauli Channels</span>
                        </div>
                        <div className="space-y-0.5">
                          {ALL_SIMULATION_PRESETS.filter((p) => p.category === 'Pauli').map((p) => (
                            <div
                              key={p.id}
                              onClick={() => handleSelectPreset(p)}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#F8F5EE] transition-colors cursor-pointer flex items-center justify-between ${
                                selectedPresetLabel === p.label ? 'bg-[#EFF6FF] border border-[#2563EB] font-semibold' : 'border border-transparent'
                              }`}
                            >
                              <span className="text-[#11151C] text-[11.5px] truncate pr-2">
                                {renderPresetLabel(p.label)}
                              </span>
                              <div onClick={(e) => e.stopPropagation()}>
                                <SmartInfoTooltip
                                  width={240}
                                  content={
                                    <div className="text-[10px] font-sans text-[#E2E8F0] leading-normal">
                                      {p.detail}
                                    </div>
                                  }
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Group 3: Hardware Platforms */}
                      <div className="pt-1 border-t border-[#E5E0D5]">
                        <div className="text-[10px] font-bold text-[#475569] uppercase tracking-wider px-2 py-1 flex items-center gap-1.5">
                          <Cpu size={11} className="text-[#11151C]" />
                          <span>Hardware Platforms</span>
                        </div>
                        <div className="space-y-0.5">
                          {ALL_SIMULATION_PRESETS.filter((p) => p.category === 'Hardware').map((p) => (
                            <div
                              key={p.id}
                              onClick={() => handleSelectPreset(p)}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#F8F5EE] transition-colors cursor-pointer flex items-center justify-between ${
                                selectedPresetLabel === p.label ? 'bg-[#EFF6FF] border border-[#2563EB] font-semibold' : 'border border-transparent'
                              }`}
                            >
                              <span className="text-[#11151C] text-[11.5px] truncate pr-2">
                                {renderPresetLabel(p.label)}
                              </span>
                              <div onClick={(e) => e.stopPropagation()}>
                                <SmartInfoTooltip
                                  width={245}
                                  content={
                                    <div className="text-[10px] font-sans text-[#E2E8F0] leading-normal">
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

            {/* Simulation Transport Action Buttons & Evolution Progress */}
            <div className="pt-2.5 border-t-2 border-[#11151C]">
              {playing && (
                <div className="mb-2">
                  <div className="flex justify-between items-center text-[11px] font-mono text-[#475569] mb-1 tabular-nums">
                    <span>Evolution Time: {(progress * 100).toFixed(0)}%</span>
                    <span>t / τ = {progress.toFixed(2)}</span>
                  </div>
                  <div className="w-full h-2 bg-[#DFDBD0] border border-[#11151C] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#2563EB] transition-all duration-75"
                      style={{ width: `${Math.round(progress * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={startSim}
                  className="flex-1 btn-quantum-action text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 cursor-pointer text-xs"
                >
                  {playing ? (
                    <>
                      <Pause size={13} />
                      <span>Pause Simulation</span>
                    </>
                  ) : (
                    <>
                      <Play size={13} fill="currentColor" />
                      <span>Run Simulation</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="bg-white hover:bg-[#F8F5EE] active:translate-x-[1px] active:translate-y-[1px] text-[#11151C] font-semibold py-2 px-4 rounded-lg border-[1.5px] border-[#11151C] shadow-[2px_2px_0px_#11151C] transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                >
                  <RotateCcw size={13} />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── RIGHT PANEL: TELEMETRY, 3D BLOCH SPHERE & DECAY CURVE (7 Cols) ─── */}
        <div className="col-span-1 lg:col-span-7 flex flex-col gap-3 min-h-0">
          {/* Top Telemetry Strip */}
          <motion.div
            variants={cardVariant}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#11151C] poster-card rounded-xl p-3 shrink-0 gap-3 sm:gap-0"
          >
            {/* Metric 1: Fidelity F */}
            <div className="flex flex-col justify-between sm:pr-3.5 pb-2.5 sm:pb-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-[#334155]">
                    State Fidelity F
                  </span>
                  <SmartInfoTooltip
                    width={260}
                    content={
                      <div className="space-y-1">
                        <div className="font-semibold text-[#93C5FD]">Quantum State Fidelity</div>
                        <p className="text-[#CBD5E1] text-[10px] leading-relaxed">
                          Overlap probability between ideal pure state |ψ₀⟩ and decohered mixed state ρ(t).
                        </p>
                        <div className="font-mono text-[10px] bg-[#1E293B] text-[#BFDBFE] px-2 py-1 rounded border border-[#334155]">
                          F = ⟨ψ₀|ρ|ψ₀⟩ = Tr(ρ₀ · ρ)
                        </div>
                        <p className="text-[#94A3B8] text-[9px]">
                          Evaluated via Bloch vectors: F = (1 + r₀ · r) / 2
                        </p>
                      </div>
                    }
                  />
                </div>
                <span
                  className={`inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-md border ${fidStatus.color}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${fidStatus.dot}`} />
                  {fidStatus.label}
                </span>
              </div>
              <div className="font-display text-[32px] font-extrabold text-[#11151C] tracking-tight tabular-nums leading-none mt-1">
                {qState.fidelity.toFixed(3)}
              </div>
              <span className="text-[11px] text-[#475569] font-mono font-medium mt-1">
                F = ⟨ψ₀|ρ|ψ₀⟩
              </span>
            </div>

            {/* Metric 2: Decoherence Error */}
            <div className="flex flex-col justify-between sm:px-3.5 pb-2.5 sm:pb-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-[#334155]">
                  Decoherence Error
                </span>
                <span className="text-[10.5px] font-mono font-bold text-[#DC2626] bg-[#FEF2F2] px-1.5 py-0.5 rounded border border-[#DC2626]">
                  1 − F
                </span>
              </div>
              <div className="font-display text-[32px] font-extrabold text-[#DC2626] tracking-tight tabular-nums leading-none mt-1">
                {qState.error.toFixed(3)}
              </div>
              <span className="text-[11px] text-[#475569] font-mono font-medium mt-1">
                Error = 1 − F
              </span>
            </div>

            {/* Metric 3: Measurement Readout P(|0⟩) & P(|1⟩) */}
            <div className="flex flex-col justify-between sm:pl-3.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-[#334155]">
                  Z-Basis Readout
                </span>
              </div>

              <div className="flex items-baseline justify-between font-mono text-xs font-bold mb-1.5 tabular-nums">
                <span className="text-[#2563EB]">P(|0⟩) {(qState.p0 * 100).toFixed(1)}%</span>
                <span className="text-[#334155]">P(|1⟩) {(qState.p1 * 100).toFixed(1)}%</span>
              </div>

              {/* Precision Split Probability Bar */}
              <div className="w-full h-2.5 bg-[#E2E8F0] rounded-full overflow-hidden flex border border-[#11151C]">
                <div
                  className="bg-[#2563EB] transition-all duration-150"
                  style={{ width: `${Math.round(qState.p0 * 100)}%` }}
                />
                <div
                  className="bg-[#94A3B8] transition-all duration-150"
                  style={{ width: `${Math.round(qState.p1 * 100)}%` }}
                />
              </div>
            </div>
          </motion.div>

          {/* 3D Bloch Sphere Viewport */}
          <motion.div
            variants={cardVariant}
            initial="hidden"
            animate="show"
            className="h-[340px] lg:h-auto lg:flex-1 poster-card rounded-xl p-3.5 relative lg:min-h-[260px] flex flex-col"
          >
            <div className="flex items-center justify-between mb-1 px-0.5">
              <h2 className="text-[13.5px] font-bold text-[#11151C] tracking-tight">
                Bloch Sphere Representation
              </h2>

              <div className="flex items-center gap-3 bg-[#F8F5EE] px-2.5 py-1 rounded-md border border-[#11151C] text-[11px] font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#2563EB]"></span>
                  <span className="text-[#11151C] font-mono">Ideal |ψ₀⟩</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#DC2626]"></span>
                  <span className="text-[#11151C] font-mono">Decohered ρ(t)</span>
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

          {/* Coherence Decay Curve F(t) */}
          <motion.div
            variants={cardVariant}
            initial="hidden"
            animate="show"
            className="h-60 poster-card rounded-xl p-3.5 flex flex-col shrink-0"
          >
            <div className="flex items-center justify-between mb-1 px-0.5">
              <h2 className="text-[13.5px] font-bold text-[#11151C] tracking-tight">
                Coherence Decay Curve F(t)
              </h2>
              <div className="flex items-center gap-3 text-[11px] font-mono">
                <span className="text-[#2563EB] font-semibold">--- Ideal (1.00)</span>
                <span className="text-[#DC2626] font-semibold">― Decoherence F(t)</span>
              </div>
            </div>

            <div className="flex-1 w-full h-full min-h-0">
              <DecayCurveChart
                curve={curve}
                progress={progress}
                hasActiveNoise={hasActiveNoise(noise)}
              />
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
