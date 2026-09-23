"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Clock3, Pause, Play, RotateCcw, Trophy, X } from "lucide-react"
import * as THREE from "three"

type Phase = "ready" | "playing" | "paused" | "game-over"

type GameApi = {
  start: () => void
  togglePause: () => void
  steer: (direction: -1 | 1) => void
}

type Entity = {
  kind: "clock" | "cone"
  object: THREE.Group
  spin: THREE.Object3D | null
}

const LANES = [-2.55, 0, 2.55] as const
const BUS_Z = 3
const START_SPEED = 13
const MAX_SPEED = 30

function makeTextTexture(
  lines: string[],
  options: { background?: string; color?: string; width?: number; height?: number } = {},
) {
  const canvas = document.createElement("canvas")
  canvas.width = options.width ?? 768
  canvas.height = options.height ?? 256
  const context = canvas.getContext("2d")!
  context.fillStyle = options.background ?? "#10263b"
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = options.color ?? "#ffffff"
  context.textAlign = "center"
  context.textBaseline = "middle"
  lines.forEach((line, index) => {
    context.font = index === 0 ? "700 58px Arial, sans-serif" : "600 36px Arial, sans-serif"
    context.fillText(line, canvas.width / 2, canvas.height * (0.36 + index * 0.34))
  })
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

function addBox(
  parent: THREE.Object3D,
  size: [number, number, number],
  position: [number, number, number],
  color: THREE.ColorRepresentation,
  roughness = 0.72,
) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(...size),
    new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.08 }),
  )
  mesh.position.set(...position)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

function createBus() {
  const bus = new THREE.Group()
  const navy = "#10263b"
  const cream = "#f8fafc"

  addBox(bus, [2.18, 1.45, 4.05], [0, 1.22, 0], cream)
  addBox(bus, [2.22, 0.58, 4.08], [0, 0.62, 0], navy)
  addBox(bus, [2.08, 0.18, 3.74], [0, 2.02, -0.02], navy)
  addBox(bus, [1.82, 0.7, 0.08], [0, 1.52, -2.055], "#8cc8dc", 0.3)
  addBox(bus, [1.82, 0.67, 0.08], [0, 1.5, 2.055], "#173b54", 0.3)
  addBox(bus, [0.42, 0.1, 0.09], [-0.65, 0.73, -2.105], "#fff1a8", 0.3)
  addBox(bus, [0.42, 0.1, 0.09], [0.65, 0.73, -2.105], "#fff1a8", 0.3)
  addBox(bus, [0.28, 0.12, 0.09], [-0.72, 0.72, 2.105], "#ef4444", 0.3)
  addBox(bus, [0.28, 0.12, 0.09], [0.72, 0.72, 2.105], "#ef4444", 0.3)

  const rearBrandTexture = makeTextTexture(["NOTTINGHAM", "CAMPUS SHUTTLE"], {
    width: 512,
    height: 192,
  })
  const rearBrand = new THREE.Mesh(
    new THREE.PlaneGeometry(1.42, 0.48),
    new THREE.MeshBasicMaterial({ map: rearBrandTexture }),
  )
  rearBrand.position.set(0, 0.92, 2.112)
  bus.add(rearBrand)

  for (const side of [-1, 1]) {
    for (const z of [-1.2, -0.35, 0.5, 1.35]) {
      const window = addBox(bus, [0.05, 0.58, 0.67], [side * 1.105, 1.5, z], "#78afc5", 0.25)
      window.material = new THREE.MeshStandardMaterial({ color: "#78afc5", roughness: 0.25, metalness: 0.2 })
    }
  }

  const brandTexture = makeTextTexture(["UNIVERSITY OF NOTTINGHAM", "MALAYSIA • NOTTGO"])
  for (const side of [-1, 1]) {
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(2.25, 0.75),
      new THREE.MeshBasicMaterial({ map: brandTexture, side: THREE.DoubleSide }),
    )
    label.position.set(side * 1.132, 0.96, 0.22)
    label.rotation.y = side * Math.PI / 2
    bus.add(label)
  }

  const wheels: THREE.Mesh[] = []
  for (const x of [-1.13, 1.13]) {
    for (const z of [-1.36, 1.34]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.35, 0.22, 18),
        new THREE.MeshStandardMaterial({ color: "#111827", roughness: 0.8 }),
      )
      wheel.position.set(x, 0.4, z)
      wheel.rotation.z = Math.PI / 2
      wheel.castShadow = true
      bus.add(wheel)
      wheels.push(wheel)
    }
  }

  bus.userData.wheels = wheels
  bus.position.set(0, 0, BUS_Z)
  return bus
}

function createClock() {
  const group = new THREE.Group()
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.48, 0.12, 12, 28),
    new THREE.MeshStandardMaterial({ color: "#fbbf24", emissive: "#7c4a03", emissiveIntensity: 0.45 }),
  )
  const face = new THREE.Mesh(
    new THREE.CircleGeometry(0.43, 28),
    new THREE.MeshStandardMaterial({ color: "#fff7d6", roughness: 0.5, side: THREE.DoubleSide }),
  )
  face.position.z = -0.01
  const handMaterial = new THREE.MeshBasicMaterial({ color: "#10263b" })
  const hour = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.25, 0.035), handMaterial)
  hour.position.y = 0.1
  hour.position.z = 0.03
  hour.rotation.z = -0.35
  const minute = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.34, 0.035), handMaterial)
  minute.position.y = 0.14
  minute.position.z = 0.035
  minute.rotation.z = 0.75
  group.add(face, rim, hour, minute)
  group.position.y = 1.05
  return group
}

function createCone() {
  const group = new THREE.Group()
  const orange = new THREE.MeshStandardMaterial({ color: "#f97316", roughness: 0.7 })
  const white = new THREE.MeshStandardMaterial({ color: "#fff7ed", roughness: 0.7 })
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.12, 0.86), orange)
  base.position.y = 0.06
  base.castShadow = true
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.05, 18), orange)
  cone.position.y = 0.64
  cone.castShadow = true
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.18, 18), white)
  stripe.position.y = 0.65
  group.add(base, cone, stripe)
  return group
}

function createTree(x: number, z: number) {
  const group = new THREE.Group()
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.18, 1.25, 8),
    new THREE.MeshStandardMaterial({ color: "#7c4a2d", roughness: 1 }),
  )
  trunk.position.y = 0.62
  const crown = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.78, 1),
    new THREE.MeshStandardMaterial({ color: x < 0 ? "#20854a" : "#2f9d5b", roughness: 0.95 }),
  )
  crown.position.y = 1.72
  crown.castShadow = true
  group.add(trunk, crown)
  group.position.set(x, 0, z)
  return group
}

function createBuilding(x: number, z: number, index: number) {
  const group = new THREE.Group()
  const height = 2.8 + (index % 3) * 0.8
  addBox(group, [3.8, height, 3.1], [0, height / 2, 0], index % 2 ? "#e6e0d2" : "#d8e0e5", 0.95)
  const windowMaterial = new THREE.MeshBasicMaterial({ color: "#8fc5dc" })
  for (let row = 0; row < 2; row++) {
    for (let column = -1; column <= 1; column++) {
      const window = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.42), windowMaterial)
      window.position.set(column * 0.9, 1.05 + row * 1.05, 1.556)
      group.add(window)
    }
  }
  group.position.set(x, 0, z)
  return group
}

export default function SecretBusGame({ onClose }: { onClose: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<GameApi | null>(null)
  const closeRef = useRef(onClose)
  const [phase, setPhase] = useState<Phase>("ready")
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const [collected, setCollected] = useState(0)
  const [pace, setPace] = useState("1.0")

  closeRef.current = onClose

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    setBest(Number(window.localStorage.getItem("nottgo-campus-run-best") ?? 0))
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#9dd9ef")
    scene.fog = new THREE.Fog("#9dd9ef", 32, 92)

    const camera = new THREE.PerspectiveCamera(54, 1, 0.1, 160)
    camera.position.set(0, 6.15, 12.5)
    camera.lookAt(0, 1.1, -8)

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.domElement.className = "h-full w-full touch-none"
    renderer.domElement.setAttribute("aria-label", "3D University of Nottingham bus driving game")
    mount.appendChild(renderer.domElement)

    const hemisphere = new THREE.HemisphereLight("#e6f7ff", "#49662d", 2.2)
    scene.add(hemisphere)
    const sun = new THREE.DirectionalLight("#fff5df", 3.2)
    sun.position.set(-10, 18, 8)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.camera.left = -14
    sun.shadow.camera.right = 14
    sun.shadow.camera.top = 18
    sun.shadow.camera.bottom = -8
    scene.add(sun)

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(70, 230),
      new THREE.MeshStandardMaterial({ color: "#68a64c", roughness: 1 }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.z = -85
    ground.receiveShadow = true
    scene.add(ground)

    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 230),
      new THREE.MeshStandardMaterial({ color: "#303944", roughness: 0.94 }),
    )
    road.rotation.x = -Math.PI / 2
    road.position.set(0, 0.015, -85)
    road.receiveShadow = true
    scene.add(road)

    const shoulderMaterial = new THREE.MeshStandardMaterial({ color: "#d8d3c7", roughness: 1 })
    for (const x of [-5.15, 5.15]) {
      const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 230), shoulderMaterial)
      shoulder.position.set(x, 0.06, -85)
      shoulder.receiveShadow = true
      scene.add(shoulder)
    }

    const movingWorld: THREE.Object3D[] = []
    const dashMaterial = new THREE.MeshBasicMaterial({ color: "#f8fafc" })
    for (const x of [-1.45, 1.45]) {
      for (let index = 0; index < 20; index++) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 3.3), dashMaterial)
        dash.rotation.x = -Math.PI / 2
        dash.position.set(x, 0.035, 15 - index * 7)
        scene.add(dash)
        movingWorld.push(dash)
      }
    }

    for (let index = 0; index < 18; index++) {
      const z = 8 - index * 7.2
      const side = index % 2 === 0 ? -1 : 1
      const object = index % 3 === 0
        ? createBuilding(side * (8.5 + (index % 2) * 1.4), z, index)
        : createTree(side * (6.8 + (index % 3)), z)
      scene.add(object)
      movingWorld.push(object)
    }

    const bus = createBus()
    scene.add(bus)

    const entities: Entity[] = []
    let laneIndex = 1
    let targetX = LANES[laneIndex]
    let distance = 0
    let clocks = 0
    let speed = START_SPEED
    let drivingSeconds = 0
    let spawnTimer = 0.7
    let phaseValue: Phase = "ready"
    let elapsedSinceUi = 0
    let lastTime = performance.now()
    let frameId = 0

    const changePhase = (next: Phase) => {
      phaseValue = next
      setPhase(next)
    }

    const removeEntity = (entity: Entity) => {
      scene.remove(entity.object)
      entity.object.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return
        child.geometry.dispose()
        const materials = Array.isArray(child.material) ? child.material : [child.material]
        materials.forEach((material) => material.dispose())
      })
    }

    const clearEntities = () => {
      entities.splice(0).forEach(removeEntity)
    }

    const updateBest = (nextScore: number) => {
      const stored = Number(window.localStorage.getItem("nottgo-campus-run-best") ?? 0)
      if (nextScore <= stored) return
      window.localStorage.setItem("nottgo-campus-run-best", String(nextScore))
      setBest(nextScore)
    }

    const reset = () => {
      clearEntities()
      laneIndex = 1
      targetX = LANES[laneIndex]
      distance = 0
      clocks = 0
      speed = START_SPEED
      drivingSeconds = 0
      spawnTimer = 0.65
      bus.position.x = 0
      bus.position.y = 0
      bus.rotation.set(0, 0, 0)
      setScore(0)
      setCollected(0)
      setPace("1.0")
    }

    const start = () => {
      if (phaseValue === "ready" || phaseValue === "game-over") reset()
      changePhase("playing")
    }

    const togglePause = () => {
      if (phaseValue === "playing") changePhase("paused")
      else if (phaseValue === "paused") changePhase("playing")
    }

    const steer = (direction: -1 | 1) => {
      if (phaseValue !== "playing") return
      laneIndex = THREE.MathUtils.clamp(laneIndex + direction, 0, LANES.length - 1)
      targetX = LANES[laneIndex]
    }

    apiRef.current = { start, togglePause, steer }

    const spawn = () => {
      const isClock = Math.random() < 0.38
      const object = isClock ? createClock() : createCone()
      const randomLane = Math.floor(Math.random() * LANES.length)
      object.position.x = LANES[randomLane]
      object.position.z = -62
      scene.add(object)
      entities.push({ kind: isClock ? "clock" : "cone", object, spin: isClock ? object : null })
    }

    const resize = () => {
      const width = mount.clientWidth
      const height = mount.clientHeight
      if (!width || !height) return
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(mount)
    resize()

    const onKeyDown = (event: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", " "].includes(event.key)) event.preventDefault()
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") steer(-1)
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") steer(1)
      if (event.key === " " || event.key === "Enter") start()
      if (event.key.toLowerCase() === "p") togglePause()
      if (event.key === "Escape") closeRef.current()
    }
    window.addEventListener("keydown", onKeyDown)

    const onVisibilityChange = () => {
      if (document.hidden && phaseValue === "playing") changePhase("paused")
    }
    document.addEventListener("visibilitychange", onVisibilityChange)

    const animate = (now: number) => {
      frameId = window.requestAnimationFrame(animate)
      const delta = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now

      const wheelMeshes = bus.userData.wheels as THREE.Mesh[]
      if (phaseValue === "playing") {
        drivingSeconds += delta
        speed = Math.min(MAX_SPEED, START_SPEED + drivingSeconds * 0.8)
        distance += speed * delta * 0.62
        spawnTimer -= delta
        if (spawnTimer <= 0) {
          spawn()
          spawnTimer = Math.max(0.62, 1.18 - speed * 0.018) + Math.random() * 0.32
        }

        const xDelta = targetX - bus.position.x
        bus.position.x += xDelta * Math.min(1, delta * 8.2)
        bus.rotation.z = THREE.MathUtils.lerp(bus.rotation.z, -xDelta * 0.095, delta * 8)
        bus.rotation.y = THREE.MathUtils.lerp(bus.rotation.y, xDelta * 0.025, delta * 8)
        bus.position.y = Math.sin(now * 0.008) * 0.025
        wheelMeshes.forEach((wheel) => {
          wheel.rotation.x -= speed * delta * 0.75
        })

        movingWorld.forEach((object) => {
          object.position.z += speed * delta
          if (object.position.z > 18) object.position.z -= 140
        })

        for (let index = entities.length - 1; index >= 0; index--) {
          const entity = entities[index]
          entity.object.position.z += speed * delta
          if (entity.spin) {
            entity.spin.rotation.y += delta * 2.7
            entity.spin.position.y = 1.05 + Math.sin(now * 0.006 + index) * 0.12
          }

          const closeOnZ = Math.abs(entity.object.position.z - BUS_Z) < 1.55
          const closeOnX = Math.abs(entity.object.position.x - bus.position.x) < 1.08
          if (closeOnZ && closeOnX) {
            entities.splice(index, 1)
            if (entity.kind === "clock") {
              clocks += 1
              setCollected(clocks)
              removeEntity(entity)
            } else {
              const finalScore = Math.floor(distance) + clocks * 50
              bus.rotation.z = entity.object.position.x > bus.position.x ? -0.28 : 0.28
              removeEntity(entity)
              changePhase("game-over")
              setScore(finalScore)
              updateBest(finalScore)
            }
          } else if (entity.object.position.z > 13) {
            entities.splice(index, 1)
            removeEntity(entity)
          }
        }

        elapsedSinceUi += delta
        if (elapsedSinceUi > 0.1) {
          setScore(Math.floor(distance) + clocks * 50)
          setPace((speed / START_SPEED).toFixed(1))
          elapsedSinceUi = 0
        }
      } else if (phaseValue === "ready") {
        bus.position.y = Math.sin(now * 0.0025) * 0.035
        bus.rotation.y = Math.sin(now * 0.0012) * 0.025
      }

      camera.position.x = THREE.MathUtils.lerp(camera.position.x, bus.position.x * 0.28, delta * 2.5)
      camera.lookAt(bus.position.x * 0.15, 1.0, -8)
      renderer.render(scene, camera)
    }
    frameId = window.requestAnimationFrame(animate)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("visibilitychange", onVisibilityChange)
      resizeObserver.disconnect()
      clearEntities()
      scene.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return
        child.geometry.dispose()
        const materials = Array.isArray(child.material) ? child.material : [child.material]
        materials.forEach((material) => {
          if ("map" in material && material.map instanceof THREE.Texture) material.map.dispose()
          material.dispose()
        })
      })
      renderer.dispose()
      renderer.domElement.remove()
      apiRef.current = null
    }
  }, [])

  const start = useCallback(() => apiRef.current?.start(), [])
  const togglePause = useCallback(() => apiRef.current?.togglePause(), [])
  const steerLeft = useCallback(() => apiRef.current?.steer(-1), [])
  const steerRight = useCallback(() => apiRef.current?.steer(1), [])

  return (
    <div
      className="fixed inset-0 z-[5000] overflow-hidden bg-[#08131f] text-white"
      role="dialog"
      aria-modal="true"
      aria-label="NottGo Campus Run game"
    >
      <div ref={mountRef} className="absolute inset-0" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#08131f]/80 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#08131f]/85 to-transparent"
        aria-hidden
      />

      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4 sm:p-6">
        <div className="min-w-0">
          <h2 className="text-xl font-black tracking-tight drop-shadow-md sm:text-3xl">NottGo: Campus Run</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="pointer-events-auto grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/20 bg-[#10263b]/85 text-white shadow-lg backdrop-blur-md transition hover:scale-105 hover:bg-[#183a58] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          aria-label="Close game"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="pointer-events-none absolute left-4 right-4 top-[5.4rem] flex justify-between gap-2 sm:left-6 sm:right-6 sm:top-24">
        <div className="rounded-2xl border border-white/15 bg-[#10263b]/78 px-4 py-2 shadow-xl backdrop-blur-md">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/55">Score</p>
          <p className="font-mono text-xl font-black tabular-nums sm:text-2xl">{score.toString().padStart(4, "0")}</p>
          <p className="mt-0.5 font-mono text-[10px] font-semibold text-emerald-300">PACE {pace}x</p>
        </div>
        <div className="flex gap-2">
          <div className="rounded-2xl border border-white/15 bg-[#10263b]/78 px-3 py-2 text-center shadow-xl backdrop-blur-md">
            <Clock3 className="mx-auto h-4 w-4 text-amber-300" />
            <p className="mt-0.5 font-mono text-sm font-black">{collected}</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-[#10263b]/78 px-3 py-2 text-center shadow-xl backdrop-blur-md">
            <Trophy className="mx-auto h-4 w-4 text-emerald-300" />
            <p className="mt-0.5 font-mono text-sm font-black">{best}</p>
          </div>
        </div>
      </div>

      {phase !== "playing" && (
        <div className="absolute inset-0 grid place-items-center bg-[#08131f]/55 px-5">
          <div className="w-full max-w-sm text-center drop-shadow-lg">
            <h3 className="text-3xl font-black tracking-tight sm:text-4xl">
              {phase === "game-over" ? `Score ${score}` : phase === "paused" ? "Paused" : "Ready to drive?"}
            </h3>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-white/90">
              {phase === "ready"
                ? "Change lanes to collect clocks for 50 points. Avoid the cones."
                : phase === "paused"
                  ? "Your route is waiting."
                  : "Watch for the cones on your next run."}
            </p>
            <button
              type="button"
              onClick={start}
              className="mt-6 inline-flex min-h-12 min-w-44 items-center justify-center gap-2 rounded-full bg-emerald-400 px-6 py-3 text-sm font-black text-[#10263b] shadow-lg transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {phase === "game-over" ? <RotateCcw className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              {phase === "game-over" ? "Drive again" : phase === "paused" ? "Resume route" : "Start route"}
            </button>
            <p className="mt-4 text-[11px] font-medium text-white/70">← → or A / D to steer. P to pause.</p>
          </div>
        </div>
      )}

      {phase === "playing" && (
        <div className="absolute inset-x-0 bottom-5 flex items-end justify-between px-5 sm:bottom-7 sm:px-8">
          <button
            type="button"
            onPointerDown={steerLeft}
            className="grid h-16 w-20 place-items-center rounded-2xl border border-white/25 bg-[#10263b]/80 shadow-xl backdrop-blur-md transition active:scale-95 active:bg-emerald-400 active:text-[#10263b] sm:h-20 sm:w-24"
            aria-label="Steer left"
          >
            <ChevronLeft className="h-9 w-9" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={togglePause}
            className="mb-1 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-[#10263b]/75 shadow-lg backdrop-blur-md transition active:scale-95"
            aria-label="Pause game"
          >
            <Pause className="h-5 w-5" />
          </button>
          <button
            type="button"
            onPointerDown={steerRight}
            className="grid h-16 w-20 place-items-center rounded-2xl border border-white/25 bg-[#10263b]/80 shadow-xl backdrop-blur-md transition active:scale-95 active:bg-emerald-400 active:text-[#10263b] sm:h-20 sm:w-24"
            aria-label="Steer right"
          >
            <ChevronRight className="h-9 w-9" strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  )
}
