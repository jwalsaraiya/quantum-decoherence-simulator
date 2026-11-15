/**
 * quantumPhysics.ts
 * High-Precision BQT Quantum Decoherence & Relaxation Engine.
 * 
 * 100% Rigorous Implementation of Syllabus Concepts:
 * - Module 2 Part 2: Relaxation Times T₁ (Longitudinal) & T₂ (Transverse)
 * - Module 2 Part 3: Environmental Decoherence & Phase Scrambling
 * - Module 2 Part 4: Quantum State Fidelity F = (1 + r₀ · r) / 2, Error = 1 - F
 * - Readout Probabilities: P(|0⟩) = (1 + z)/2, P(|1⟩) = (1 - z)/2
 * - Fundamental Physical Law: T₂ ≤ 2T₁ (1/T₂ = 1/(2T₁) + 1/T_phi)
 */

export interface BlochVector {
  x: number
  y: number
  z: number
}

export interface QuantumState {
  ideal: BlochVector
  noisy: BlochVector
  fidelity: number // F ∈ [0.000, 1.000]
  error: number // 1 - F ∈ [0.000, 1.000]
  coherenceRadius: number // |r| = sqrt(x² + y² + z²) ∈ [0.000, 1.000]
  p0: number // P(|0⟩) = (1 + z)/2
  p1: number // P(|1⟩) = (1 - z)/2
  stateString: string // Canonical algebraic representation
}

export interface NoiseParams {
  t1: number // Energy relaxation probability / rate parameter [0.00, 1.00]
  t2: number // Pure dephasing probability / rate parameter [0.00, 1.00]
}

// Canonical exponential decay curvature matching textbook inversion-recovery & Ramsey curves
const EXP_CURVATURE = 3.5

/**
 * Computes exact Bloch vector and density matrix state under Kraus / Lindblad dynamics.
 * 
 * Physics Guarantees:
 * 1. At t1 = 1.0 (100% energy relaxation), excited state |1⟩ decays completely to ground state |0⟩.
 *    Any state relaxes to z = 1.0, with x = 0, y = 0.
 *    Fidelity with an equatorial state (|+⟩, |-⟩, |+i⟩, |-i⟩) is EXACTLY 0.500.
 *    Measurement probabilities: P(|0⟩) = 100.0%, P(|1⟩) = 0.0%.
 * 2. Ground state |0⟩ (z = 1) is completely stable under any relaxation or dephasing: F = 1.000.
 * 3. Pure dephasing (t2 = 1.0, t1 = 0) scrambles equatorial coherences to origin (0, 0, 0),
 *    yielding F = 0.500 and P(|0⟩) = 50.0%, P(|1⟩) = 50.0% without losing energy.
 */
export function computeQuantumState(
  theta: number,
  phi: number,
  noise: NoiseParams,
  progress = 1,
): QuantumState {
  const t = Math.max(0, Math.min(1, progress))

  // 1. Initial pure state Bloch coordinates: r₀ = (sinθ cosφ, sinθ sinφ, cosθ)
  let x0 = Math.sin(theta) * Math.cos(phi)
  let y0 = Math.sin(theta) * Math.sin(phi)
  let z0 = Math.cos(theta)

  // Clean floating-point artifacts near zero
  if (Math.abs(x0) < 1e-12) x0 = 0
  if (Math.abs(y0) < 1e-12) y0 = 0
  if (Math.abs(z0) < 1e-12) z0 = 0

  // 2. Continuous-time exponential progression matching syllabus curves:
  // Shape increases monotonically from 0 (at t=0) to 1.0 (at t=1)
  const shape =
    t === 0
      ? 0
      : (1.0 - Math.exp(-EXP_CURVATURE * t)) / (1.0 - Math.exp(-EXP_CURVATURE))

  const gamma = Math.min(1, Math.max(0, noise.t1 * shape)) // Longitudinal damping probability
  const lam = Math.min(1, Math.max(0, noise.t2 * shape)) // Pure transverse dephasing probability

  // 3. Longitudinal Dynamics (T₁ Energy Relaxation |1⟩ → |0⟩):
  // Ground state |0⟩ (z0 = 1) has ΔE = 0, thus immune to decay.
  // Excited state |1⟩ (z0 = -1) loses energy ΔE = hf and decays to |0⟩ (z = 1).
  const z = z0 + gamma * (1.0 - z0)

  // 4. Transverse Dynamics (T₂ Coherence & Equator Dephasing):
  // By physical law (Module 2 §2.4, T₂ ≤ 2T₁):
  // Spontaneous emission inherently reduces off-diagonal coherences by √(1 - γ).
  // Pure dephasing (random frequency fluctuations without energy loss) further scales coherences by (1 - λ).
  const transverseFactor = Math.sqrt(Math.max(0, 1.0 - gamma)) * (1.0 - lam)
  const x = x0 * transverseFactor
  const y = y0 * transverseFactor

  // 5. Bloch vector magnitude |r| (Quantum Purity):
  // Pure state |r| = 1; Mixed state |r| < 1; Maximally mixed state |r| = 0.
  const rSquared = x * x + y * y + z * z
  const coherenceRadius = Math.min(1, Math.sqrt(Math.max(0, rSquared)))

  // 6. State Fidelity F = ⟨ψ₀|ρ|ψ₀⟩ = (1 + r₀ · r) / 2 ∈ [0.000, 1.000]
  const dotProduct = x0 * x + y0 * y + z0 * z
  const fidelity = Math.max(0, Math.min(1, (1.0 + dotProduct) / 2.0))
  const error = Math.max(0, Math.min(1, 1.0 - fidelity))

  // 7. Measurement Probabilities in Computational Basis {|0⟩, |1⟩}
  // P(|0⟩) = (1 + z)/2, P(|1⟩) = (1 - z)/2
  const p0 = Math.max(0, Math.min(1, (1.0 + z) / 2.0))
  const p1 = Math.max(0, Math.min(1, 1.0 - p0))

  // 8. Canonical Quantum State Formula String
  const stateString = formatStateFormula(theta, phi)

  return {
    ideal: { x: x0, y: y0, z: z0 },
    noisy: { x, y, z },
    fidelity,
    error,
    coherenceRadius,
    p0,
    p1,
    stateString,
  }
}

/**
 * Formats state string matching standard textbook / syllabus notation:
 * - Bases: |0⟩, |1⟩, (|0⟩ + |1⟩)/√2, (|0⟩ − |1⟩)/√2, (|0⟩ + i|1⟩)/√2, (|0⟩ − i|1⟩)/√2
 * - Custom: α|0⟩ + e^(iφ)β|1⟩
 */
function formatStateFormula(theta: number, phi: number): string {
  const EPS = 1e-3
  // Check cardinal states
  if (Math.abs(theta) < EPS) return '|0⟩'
  if (Math.abs(theta - Math.PI) < EPS) return '|1⟩'
  if (Math.abs(theta - Math.PI / 2) < EPS) {
    const twoPi = 2 * Math.PI
    const normPhi = ((phi % twoPi) + twoPi) % twoPi
    if (Math.abs(normPhi) < EPS || Math.abs(normPhi - twoPi) < EPS) {
      return '(|0⟩ + |1⟩) / √2'
    }
    if (Math.abs(normPhi - Math.PI) < EPS) {
      return '(|0⟩ − |1⟩) / √2'
    }
    if (Math.abs(normPhi - Math.PI / 2) < EPS) {
      return '(|0⟩ + i|1⟩) / √2'
    }
    if (Math.abs(normPhi - (3 * Math.PI) / 2) < EPS) {
      return '(|0⟩ − i|1⟩) / √2'
    }
  }

  const alpha = Math.cos(theta / 2).toFixed(2)
  const beta = Math.sin(theta / 2).toFixed(2)
  const phaseDeg = Math.round((phi * 180) / Math.PI) % 360
  const normPhase = (phaseDeg + 360) % 360

  if (normPhase === 0) return `${alpha}|0⟩ + ${beta}|1⟩`
  if (normPhase === 180) return `${alpha}|0⟩ − ${beta}|1⟩`
  if (normPhase === 90) return `${alpha}|0⟩ + i·${beta}|1⟩`
  if (normPhase === 270) return `${alpha}|0⟩ − i·${beta}|1⟩`
  return `${alpha}|0⟩ + e^(i${normPhase}°)·${beta}|1⟩`
}

/**
 * Builds high-resolution 100-point smooth Fidelity decay curve across t ∈ [0, 1].
 */
export function buildDecayCurve(
  theta: number,
  phi: number,
  noise: NoiseParams,
): Array<{ t: number; fidelity: number; purity: number }> {
  const SAMPLES = 100
  return Array.from({ length: SAMPLES }, (_, i) => {
    const t = i / (SAMPLES - 1)
    const state = computeQuantumState(theta, phi, noise, t)
    return {
      t,
      fidelity: state.fidelity,
      purity: state.coherenceRadius,
    }
  })
}

/**
 * Canonical Quantum States:
 * - Z Basis (Computational): |0⟩ (Ground), |1⟩ (Excited)
 * - X Basis (Hadamard): |+⟩ (Superposition), |−⟩ (Phase π)
 * - Y Basis (Imaginary): |+i⟩ (Phase +90°), |−i⟩ (Phase −90°)
 */
export const PRESETS = {
  plus: { theta: Math.PI / 2, phi: 0, label: '|+⟩', desc: 'Superposition' },
  zero: { theta: 0, phi: 0, label: '|0⟩', desc: 'Ground State' },
  one: { theta: Math.PI, phi: 0, label: '|1⟩', desc: 'Excited State' },
  minus: { theta: Math.PI / 2, phi: Math.PI, label: '|−⟩', desc: 'Phase π' },
  plusI: { theta: Math.PI / 2, phi: Math.PI / 2, label: '|+i⟩', desc: 'Phase +90°' },
  minusI: { theta: Math.PI / 2, phi: (3 * Math.PI) / 2, label: '|−i⟩', desc: 'Phase −90°' },
} as const

export type PresetKey = keyof typeof PRESETS | 'custom'

/**
 * Real Physical Hardware Qubit Presets (Module 2 §1.1 - §1.5)
 */
export interface HardwarePreset {
  id: string
  name: string
  platform: string
  t1: number
  t2: number
  t1Physical: string
  t2Physical: string
  mechanism: string
}

export const HARDWARE_PRESETS: HardwarePreset[] = [
  {
    id: 'transmon',
    name: 'Superconducting Transmon',
    platform: 'IBM Quantum / Google Sycamore',
    t1: 0.45,
    t2: 0.65,
    t1Physical: '~80 – 120 μs',
    t2Physical: '~50 – 80 μs',
    mechanism: 'Josephson junction non-linear LC oscillator; limited by dielectric surface loss & flux noise.',
  },
  {
    id: 'trapped_ion',
    name: 'Trapped Ion (Yb⁺ / Ca⁺)',
    platform: 'IonQ / Quantinuum',
    t1: 0.05,
    t2: 0.15,
    t1Physical: '> 10 – 1000 s',
    t2Physical: '~1 – 5 s',
    mechanism: 'Ultra-isolated atomic ions in RF Paul trap; exceptional coherence, limited by laser phase jitter.',
  },
  {
    id: 'nv_center',
    name: 'NV Center in Diamond',
    platform: 'Solid-State Spin',
    t1: 0.25,
    t2: 0.6,
    t1Physical: '~1 ms – 1 s',
    t2Physical: '~0.5 – 2 ms',
    mechanism: 'Room-temperature optical readout; dephasing driven by ¹³C nuclear spin bath fluctuations.',
  },
  {
    id: 'photonic',
    name: 'Photonic Qubit',
    platform: 'PsiQuantum / Xanadu',
    t1: 0.0,
    t2: 0.12,
    t1Physical: 'Infinite (No relaxation)',
    t2Physical: 'Path / Phase Drift',
    mechanism: 'Flying photons exhibit zero spontaneous energy decay; decoherence is optical waveguide loss.',
  },
]
