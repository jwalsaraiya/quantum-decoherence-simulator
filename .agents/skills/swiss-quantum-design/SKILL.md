---
name: swiss-quantum-design
description: Enforces Swiss Scientific Minimalism UI, single-screen locked grid, vanilla Three.js 3D Bloch sphere standards, and Framer Motion micro-interactions.
---
# Design & Engineering Rules
1. **Viewport Lock:** Desktop layout must use `h-screen w-screen overflow-hidden flex flex-col bg-[#F8FAFC] text-[#0F172A]` so the entire application fits on one single screen without scrollbars.
2. **Swiss Scientific Palette:**
   - Canvas background: `#F8FAFC`
   - Card surface: `#FFFFFF` with `1px solid #E2E8F0` border, `rounded-xl`, and ultra-subtle `shadow-[0_1px_3px_rgba(15,23,42,0.03)]`.
   - Primary accent (Ideal State): Cobalt Blue `#2563EB`
   - Secondary accent (Noisy / Decohered State): Crimson Red `#DC2626`
   - Typography: Clean geometric sans (`Inter`) for headings/labels, and strict tabular monospace (`JetBrains Mono` / `font-mono tabular-nums`) for all numbers, percentages, and live readouts.
3. **Three.js 3D Bloch Sphere:**
   - Render using vanilla `THREE.WebGLRenderer({ antialias: true, alpha: true })` with `window.devicePixelRatio` scaling and `ResizeObserver` responsiveness.
   - Include smooth mouse-drag orbit rotation (damped inertia), subtle auto-rotation when idle, wireframe latitude/longitude rings, crisp HTML/CSS projected pole labels (`|0⟩` top, `|1⟩` bottom, `|+⟩` front), a solid `#2563EB` 3D arrow for the Ideal vector, and a `#DC2626` 3D arrow + glowing trail/ghost sphere for the Noisy vector.
4. **Animations:**
   - Use `framer-motion` for staggered card entrance (`opacity: 0, y: 12` to `opacity: 1, y: 0`), `AnimatePresence` for smooth in/out transitions when toggling custom `|ψ⟩` controls or simulation status badges, and spring-interpolated number transitions.
