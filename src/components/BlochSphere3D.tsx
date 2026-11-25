/**
 * BlochSphere3D.tsx
 * High-Precision Vanilla Three.js 3D Bloch Sphere Visualization.
 * 
 * Museum-Grade Quantum Visuals:
 * - Perfectly framed zoomed-out perspective with smooth auto-rotation
 * - Sleek metallic internal coordinate axes and anchored origin core
 * - Pure Dirac bra-ket pole badges with collision-free offset positioning
 * - Solid Cobalt Blue Ideal vector and Rose-Crimson Decohered vector
 * - Orthogonal projection lines to equatorial plane and Z-axis
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { Play, Pause, RotateCcw } from 'lucide-react'

interface Props {
  ideal: { x: number; y: number; z: number }
  noisy: { x: number; y: number; z: number }
  coherenceRadius: number
}

// ─── THREE.JS GEOMETRY HELPERS ──────────────────────────────────────────────

function createVectorArrow(color: number) {
  const group = new THREE.Group()

  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.12,
    metalness: 0.35,
  })

  // Cylinder shaft
  const shaftGeo = new THREE.CylinderGeometry(0.022, 0.022, 1, 24)
  const shaft = new THREE.Mesh(shaftGeo, mat)

  // Cone arrowhead
  const headGeo = new THREE.ConeGeometry(0.06, 0.17, 24)
  const head = new THREE.Mesh(headGeo, mat)

  group.add(shaft, head)
  return { group, shaft, head, mat }
}

function updateVectorArrow(
  arrow: ReturnType<typeof createVectorArrow>,
  target: THREE.Vector3,
) {
  const len = target.length()
  if (len < 0.02) {
    arrow.group.visible = false
    return
  }
  arrow.group.visible = true

  const headLen = Math.min(0.17, len * 0.4)
  const shaftLen = Math.max(0.001, len - headLen)

  arrow.shaft.scale.set(1, shaftLen, 1)
  arrow.shaft.position.set(0, shaftLen / 2, 0)
  arrow.head.position.set(0, shaftLen + headLen / 2, 0)
  arrow.head.scale.set(headLen / 0.17, headLen / 0.17, headLen / 0.17)

  const quat = new THREE.Quaternion()
  quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), target.clone().normalize())
  arrow.group.quaternion.copy(quat)
}

/**
 * Creates sleek brushed-steel internal coordinate axes terminating cleanly at the sphere surface.
 */
function createInternalAxes() {
  const group = new THREE.Group()

  const axisRadius = 0.0075
  const axisLen = 2.06
  const headRadius = 0.024
  const headLen = 0.075

  const axisMat = new THREE.MeshStandardMaterial({
    color: 0x475569, // slate-600 brushed metal
    roughness: 0.2,
    metalness: 0.45,
  })

  const tipMat = new THREE.MeshStandardMaterial({
    color: 0x334155, // slate-700
    roughness: 0.15,
    metalness: 0.55,
  })

  // Z-Axis (Vertical, mapped to Three.js Y)
  const zShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(axisRadius, axisRadius, axisLen, 16),
    axisMat,
  )
  const zHeadPos = new THREE.Mesh(new THREE.ConeGeometry(headRadius, headLen, 16), tipMat)
  zHeadPos.position.set(0, axisLen / 2 + headLen / 2, 0)
  const zHeadNeg = new THREE.Mesh(new THREE.ConeGeometry(headRadius, headLen, 16), tipMat)
  zHeadNeg.position.set(0, -(axisLen / 2 + headLen / 2), 0)
  zHeadNeg.rotation.z = Math.PI
  group.add(zShaft, zHeadPos, zHeadNeg)

  // X-Axis (Front/Back, mapped to Three.js X)
  const xShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(axisRadius, axisRadius, axisLen, 16),
    axisMat,
  )
  xShaft.rotation.z = Math.PI / 2
  const xHeadPos = new THREE.Mesh(new THREE.ConeGeometry(headRadius, headLen, 16), tipMat)
  xHeadPos.position.set(axisLen / 2 + headLen / 2, 0, 0)
  xHeadPos.rotation.z = -Math.PI / 2
  const xHeadNeg = new THREE.Mesh(new THREE.ConeGeometry(headRadius, headLen, 16), tipMat)
  xHeadNeg.position.set(-(axisLen / 2 + headLen / 2), 0, 0)
  xHeadNeg.rotation.z = Math.PI / 2
  group.add(xShaft, xHeadPos, xHeadNeg)

  // Y-Axis (Left/Right, mapped to Three.js Z)
  const yShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(axisRadius, axisRadius, axisLen, 16),
    axisMat,
  )
  yShaft.rotation.x = Math.PI / 2
  const yHeadPos = new THREE.Mesh(new THREE.ConeGeometry(headRadius, headLen, 16), tipMat)
  yHeadPos.position.set(0, 0, axisLen / 2 + headLen / 2)
  yHeadPos.rotation.x = Math.PI / 2
  const yHeadNeg = new THREE.Mesh(new THREE.ConeGeometry(headRadius, headLen, 16), tipMat)
  yHeadNeg.position.set(0, 0, -(axisLen / 2 + headLen / 2))
  yHeadNeg.rotation.x = -Math.PI / 2
  group.add(yShaft, yHeadPos, yHeadNeg)

  // Polished Origin Center Sphere
  const originSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.032, 24, 24),
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.1,
      metalness: 0.75,
    }),
  )
  group.add(originSphere)

  return group
}

/**
 * Creates the equatorial plane disc and wireframe circles.
 */
function createEquatorAndRings() {
  const group = new THREE.Group()

  // Translucent Equatorial Disc (XZ plane in Three.js)
  const discGeo = new THREE.CircleGeometry(1.0, 64)
  const discMat = new THREE.MeshBasicMaterial({
    color: 0x3b82f6,
    transparent: true,
    opacity: 0.05,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const disc = new THREE.Mesh(discGeo, discMat)
  disc.rotation.x = Math.PI / 2
  group.add(disc)

  // Highlighted Equator Circle (XZ plane)
  const eqMat = new THREE.LineBasicMaterial({
    color: 0x2563eb, // Cobalt Blue
    transparent: true,
    opacity: 0.75,
  })
  const eqPts: THREE.Vector3[] = []
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI * 2
    eqPts.push(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)))
  }
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(eqPts), eqMat))

  // Prime Meridian (YZ plane)
  const meridianMat = new THREE.LineBasicMaterial({
    color: 0x94a3b8,
    transparent: true,
    opacity: 0.35,
  })
  const pmPts: THREE.Vector3[] = []
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI * 2
    pmPts.push(new THREE.Vector3(0, Math.cos(a), Math.sin(a)))
  }
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pmPts), meridianMat))

  // Front Meridian (XY plane)
  const fmPts: THREE.Vector3[] = []
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI * 2
    fmPts.push(new THREE.Vector3(Math.cos(a), Math.sin(a), 0))
  }
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(fmPts), meridianMat))

  // Subtle Latitude helper rings (±45°)
  const latMat = new THREE.LineBasicMaterial({
    color: 0xcbd5e1,
    transparent: true,
    opacity: 0.25,
  })
  const latLevels = [-0.707, 0.707]
  latLevels.forEach((y) => {
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2
      pts.push(new THREE.Vector3(r * Math.cos(a), y, r * Math.sin(a)))
    }
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), latMat))
  })

  return group
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export default function BlochSphere3D({ ideal, noisy, coherenceRadius }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-rotation ON by default
  const [autoRotate, setAutoRotate] = useState(true)
  const autoRotateRef = useRef(autoRotate)
  autoRotateRef.current = autoRotate

  const threeRef = useRef<{
    renderer: THREE.WebGLRenderer
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    pivot: THREE.Group
    idealArrow: ReturnType<typeof createVectorArrow>
    noisyArrow: ReturnType<typeof createVectorArrow>
    puritySphere: THREE.Mesh
    projectionLineZ: THREE.Line
    projectionLineEq: THREE.Line
    raf: number
    isDragging: boolean
    lastX: number
    lastY: number
    rotX: number
    rotY: number
    velX: number
    velY: number
    zoom: number
  } | null>(null)

  // Label refs for all 6 cardinal Dirac states
  const label0Ref = useRef<HTMLDivElement>(null)
  const label1Ref = useRef<HTMLDivElement>(null)
  const labelPlusRef = useRef<HTMLDivElement>(null)
  const labelMinusRef = useRef<HTMLDivElement>(null)
  const labelPlusIRef = useRef<HTMLDivElement>(null)
  const labelMinusIRef = useRef<HTMLDivElement>(null)

  const projectLabel = useCallback(
    (pos: THREE.Vector3, el: HTMLDivElement | null) => {
      if (!threeRef.current || !el || !containerRef.current) return
      const { camera, renderer, pivot } = threeRef.current

      // Calculate world position of label point
      const worldPos = pos.clone().applyMatrix4(pivot.matrixWorld)
      const projected = worldPos.clone().project(camera)

      const rect = renderer.domElement.getBoundingClientRect()
      const x = ((projected.x + 1) / 2) * rect.width
      const y = ((-projected.y + 1) / 2) * rect.height

      // Check if behind camera clip plane
      if (projected.z > 1) {
        el.style.opacity = '0'
        el.style.pointerEvents = 'none'
        return
      }

      // Exact 3D ray-sphere occlusion check:
      // Line of sight ray from camera position to worldPos
      const camPos = camera.position
      const ray = worldPos.clone().sub(camPos)
      const distToLabel = ray.length()
      const rayDir = ray.normalize()

      // Sphere is centered at origin (0, 0, 0)
      const toCenter = camPos.clone().negate()
      const tProj = toCenter.dot(rayDir)

      let opacity = 1.0

      if (tProj > 0) {
        // Perpendicular distance squared from sphere center to ray
        const dPerpSq = Math.max(0, toCenter.lengthSq() - tProj * tProj)
        const dPerp = Math.sqrt(dPerpSq)
        const sphereRadius = 1.00 // unit sphere radius

        // If line of sight passes through the sphere silhouette
        if (dPerp < sphereRadius) {
          const tEnter = tProj - Math.sqrt(sphereRadius * sphereRadius - dPerpSq)
          // If the label is further along the ray than where the ray enters the sphere,
          // then the front surface of the sphere is between the camera and the label
          if (distToLabel > tEnter) {
            const edgeMargin = 0.10
            if (dPerp <= sphereRadius - edgeMargin) {
              opacity = 0.0 // Completely behind the sphere
            } else {
              opacity = (dPerp - (sphereRadius - edgeMargin)) / edgeMargin
            }
          }
        }
      }

      if (opacity <= 0.01) {
        el.style.opacity = '0'
        el.style.pointerEvents = 'none'
      } else {
        el.style.opacity = `${opacity}`
        el.style.pointerEvents = opacity > 0.5 ? 'auto' : 'none'
        el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`
      }
    },
    [],
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'

    // Zoomed out perspective camera (distance 4.7 for comfortable framing)
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100)
    camera.position.set(0, 0.18, 4.7)

    const scene = new THREE.Scene()
    scene.add(new THREE.AmbientLight(0xffffff, 1.4))

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.3)
    keyLight.position.set(5, 7, 5)
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0x94a3b8, 0.6)
    fillLight.position.set(-5, -3, -4)
    scene.add(fillLight)

    const pivot = new THREE.Group()
    scene.add(pivot)

    // Outer Translucent Glass Sphere Shell
    const sphereMat = new THREE.MeshPhysicalMaterial({
      color: 0xf8fafc,
      transparent: true,
      opacity: 0.1,
      roughness: 0.06,
      transmission: 0.94,
      thickness: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    const sphereMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 48), sphereMat)
    pivot.add(sphereMesh)

    // Solid Refined Internal 3D Axes & Origin
    pivot.add(createInternalAxes())

    // Equator Plane & Rings
    pivot.add(createEquatorAndRings())

    // State Vector Arrows
    const idealArrow = createVectorArrow(0x2563eb) // Cobalt Blue #2563EB
    const noisyArrow = createVectorArrow(0xe11d48) // Rose-Crimson #E11D48
    pivot.add(idealArrow.group)
    pivot.add(noisyArrow.group)

    // Dashed projection lines from noisy state tip to Z-axis and equatorial plane
    const projMat = new THREE.LineDashedMaterial({
      color: 0xe11d48,
      dashSize: 0.04,
      gapSize: 0.03,
      transparent: true,
      opacity: 0.65,
    })
    const projectionLineZ = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)]),
      projMat,
    )
    const projectionLineEq = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)]),
      projMat,
    )
    pivot.add(projectionLineZ, projectionLineEq)

    // Purity Shell (Shrinking crimson sphere)
    const puritySphere = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 32),
      new THREE.MeshStandardMaterial({
        color: 0xe11d48,
        transparent: true,
        opacity: 0.035,
        roughness: 0.4,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    )
    pivot.add(puritySphere)

    const state = {
      renderer,
      scene,
      camera,
      pivot,
      idealArrow,
      noisyArrow,
      puritySphere,
      projectionLineZ,
      projectionLineEq,
      raf: 0,
      isDragging: false,
      lastX: 0,
      lastY: 0,
      rotX: 0.22,
      rotY: -0.42,
      velX: 0,
      velY: 0,
      zoom: 4.7,
    }
    threeRef.current = state

    pivot.rotation.x = state.rotX
    pivot.rotation.y = state.rotY

    const resize = () => {
      const rect = container.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      renderer.setSize(rect.width, rect.height, false)
      camera.aspect = rect.width / rect.height
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(container)
    resize()

    // Render loop
    function render() {
      state.raf = requestAnimationFrame(render)

      if (!state.isDragging) {
        if (autoRotateRef.current) {
          state.rotY += 0.0016
        }
        state.velX *= 0.92
        state.velY *= 0.92
        state.rotX += state.velX
        state.rotY += state.velY
      }

      state.rotX = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, state.rotX))
      pivot.rotation.x = state.rotX
      pivot.rotation.y = state.rotY
      camera.position.z = state.zoom

      // Project labels with collision-free offset (distance 1.28)
      projectLabel(new THREE.Vector3(0, 1.28, 0), label0Ref.current)
      projectLabel(new THREE.Vector3(0, -1.28, 0), label1Ref.current)
      projectLabel(new THREE.Vector3(1.28, 0, 0), labelPlusRef.current)
      projectLabel(new THREE.Vector3(-1.28, 0, 0), labelMinusRef.current)
      projectLabel(new THREE.Vector3(0, 0, 1.28), labelPlusIRef.current)
      projectLabel(new THREE.Vector3(0, 0, -1.28), labelMinusIRef.current)

      renderer.render(scene, camera)
    }
    render()

    // Pointer events for smooth drag rotation
    const el = renderer.domElement

    function handlePointerDown(e: PointerEvent) {
      state.isDragging = true
      state.lastX = e.clientX
      state.lastY = e.clientY
      state.velX = 0
      state.velY = 0
      el.setPointerCapture(e.pointerId)
    }

    function handlePointerMove(e: PointerEvent) {
      if (!state.isDragging) return
      const dx = e.clientX - state.lastX
      const dy = e.clientY - state.lastY
      state.velY = dx * 0.0065
      state.velX = dy * 0.0065
      state.rotY += state.velY
      state.rotX += state.velX
      state.lastX = e.clientX
      state.lastY = e.clientY
    }

    function handlePointerUp() {
      state.isDragging = false
    }

    function handleWheel(e: WheelEvent) {
      e.preventDefault()
      state.zoom = Math.max(3.2, Math.min(6.2, state.zoom + e.deltaY * 0.003))
    }

    el.addEventListener('pointerdown', handlePointerDown)
    el.addEventListener('pointermove', handlePointerMove)
    el.addEventListener('pointerup', handlePointerUp)
    el.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      cancelAnimationFrame(state.raf)
      ro.disconnect()
      el.removeEventListener('pointerdown', handlePointerDown)
      el.removeEventListener('pointermove', handlePointerMove)
      el.removeEventListener('pointerup', handlePointerUp)
      el.removeEventListener('wheel', handleWheel)
      renderer.dispose()
      if (el.parentNode === container) {
        container.removeChild(el)
      }
      threeRef.current = null
    }
  }, [projectLabel])

  // Update vectors on state changes
  useEffect(() => {
    if (!threeRef.current) return
    const { idealArrow, noisyArrow, puritySphere, projectionLineZ, projectionLineEq } = threeRef.current

    // Quantum physics to Three.js coordinates:
    // Bloch X -> Three.js X
    // Bloch Z -> Three.js Y (North/South pole)
    // Bloch Y -> Three.js Z
    const idealVec = new THREE.Vector3(ideal.x, ideal.z, ideal.y)
    const noisyVec = new THREE.Vector3(noisy.x, noisy.z, noisy.y)

    updateVectorArrow(idealArrow, idealVec)

    // Hide redundant noisy arrow when state is pure / coherent (distance < 0.02)
    const dist = idealVec.distanceTo(noisyVec)
    if (dist < 0.02) {
      noisyArrow.group.visible = false
      projectionLineZ.visible = false
      projectionLineEq.visible = false
    } else {
      updateVectorArrow(noisyArrow, noisyVec)
      projectionLineZ.visible = true
      projectionLineEq.visible = true

      // Projection to Z-axis
      const ptsZ = [noisyVec.clone(), new THREE.Vector3(0, noisyVec.y, 0)]
      projectionLineZ.geometry.setFromPoints(ptsZ)
      projectionLineZ.computeLineDistances()

      // Projection to Equatorial plane
      const ptsEq = [noisyVec.clone(), new THREE.Vector3(noisyVec.x, 0, noisyVec.z)]
      projectionLineEq.geometry.setFromPoints(ptsEq)
      projectionLineEq.computeLineDistances()
    }

    const r = Math.max(0.01, Math.min(1, coherenceRadius))
    puritySphere.scale.setScalar(r)
  }, [ideal, noisy, coherenceRadius])

  const resetRotation = () => {
    if (!threeRef.current) return
    threeRef.current.rotX = 0.22
    threeRef.current.rotY = -0.42
    threeRef.current.velX = 0
    threeRef.current.velY = 0
    threeRef.current.zoom = 4.7
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full cursor-grab active:cursor-grabbing select-none overflow-hidden"
    >
      {/* 6 Crisp Poster-Framed Dirac Coordinate Tags */}
      {/* Z Basis: |0⟩ and |1⟩ */}
      <div
        ref={label0Ref}
        className="absolute top-0 left-0 pointer-events-none transition-opacity duration-150"
      >
        <span className="font-mono text-[11px] font-semibold text-[#11151C] bg-white px-2 py-0.5 rounded border border-[#11151C] shadow-[1.5px_1.5px_0px_#11151C]">
          |0⟩
        </span>
      </div>

      <div
        ref={label1Ref}
        className="absolute top-0 left-0 pointer-events-none transition-opacity duration-150"
      >
        <span className="font-mono text-[11px] font-semibold text-[#11151C] bg-white px-2 py-0.5 rounded border border-[#11151C] shadow-[1.5px_1.5px_0px_#11151C]">
          |1⟩
        </span>
      </div>

      {/* X Basis: |+⟩ and |-⟩ */}
      <div
        ref={labelPlusRef}
        className="absolute top-0 left-0 pointer-events-none transition-opacity duration-150"
      >
        <span className="font-mono text-[11px] font-semibold text-[#1D4ED8] bg-white px-2 py-0.5 rounded border border-[#2563EB] shadow-[1.5px_1.5px_0px_#2563EB]">
          |+⟩
        </span>
      </div>

      <div
        ref={labelMinusRef}
        className="absolute top-0 left-0 pointer-events-none transition-opacity duration-150"
      >
        <span className="font-mono text-[11px] font-semibold text-[#11151C] bg-[#FAF7F0] px-2 py-0.5 rounded border border-[#11151C] shadow-[1.5px_1.5px_0px_#11151C]">
          |−⟩
        </span>
      </div>

      {/* Y Basis: |+i⟩ and |-i⟩ */}
      <div
        ref={labelPlusIRef}
        className="absolute top-0 left-0 pointer-events-none transition-opacity duration-150"
      >
        <span className="font-mono text-[11px] font-semibold text-[#11151C] bg-white px-2 py-0.5 rounded border border-[#11151C] shadow-[1.5px_1.5px_0px_#11151C]">
          |+i⟩
        </span>
      </div>

      <div
        ref={labelMinusIRef}
        className="absolute top-0 left-0 pointer-events-none transition-opacity duration-150"
      >
        <span className="font-mono text-[11px] font-semibold text-[#11151C] bg-[#FAF7F0] px-2 py-0.5 rounded border border-[#11151C] shadow-[1.5px_1.5px_0px_#11151C]">
          |−i⟩
        </span>
      </div>

      {/* Floating Toolbar: Start/Pause Rotation & Reset View */}
      <div className="absolute bottom-2.5 left-2.5 flex items-center gap-2 pointer-events-auto z-10">
        <button
          type="button"
          onClick={() => setAutoRotate((prev) => !prev)}
          className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-[#11151C] shadow-[1.5px_1.5px_0px_#11151C] transition-all cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
            autoRotate
              ? 'bg-[#D4F74A] text-[#11151C] hover:bg-[#C6EA3B]'
              : 'bg-white text-[#11151C] hover:bg-[#F3EFE6]'
          }`}
        >
          {autoRotate ? (
            <Pause size={11} className="text-[#11151C]" />
          ) : (
            <Play size={11} className="text-blue-600" />
          )}
          <span>{autoRotate ? 'Pause Orbit' : 'Auto-Orbit'}</span>
        </button>

        <button
          type="button"
          onClick={resetRotation}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-[#11151C] bg-white hover:bg-[#F3EFE6] px-2.5 py-1 rounded-md border border-[#11151C] shadow-[1.5px_1.5px_0px_#11151C] transition-all cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
        >
          <RotateCcw size={11} className="text-[#11151C]" />
          <span>Reset View</span>
        </button>
      </div>
    </div>
  )
}
