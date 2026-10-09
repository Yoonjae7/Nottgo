"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Clock3, Pause, Play, RotateCcw, Trophy, X } from "lucide-react"
import * as THREE from "three"
import { isTightNearMiss, lateDodgeTimeToCone, NEAR_MISS_DODGE_WINDOW_SECONDS } from "@/lib/nearMiss"
import { createCampusBus } from "@/lib/campusBus"
import { loadCampusBranding } from "@/lib/campusBranding"
import { createCampusScenery } from "@/lib/campusScenery"
import { GAME_JOURNEY, getJourneyProgress } from "@/lib/gameJourney"
import { createGameSceneryModels } from "@/lib/gameSceneryModels"

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
  lastSecondDodgeAt: number | null
  closestPassGap: number | null
}

const LANES = [-2.55, 0, 2.55] as const
const BUS_Z = 3
const START_SPEED_KMH = 20
const MAX_SPEED_KMH = 100
const ACCELERATION_KMH = 0.9
const START_WORLD_SPEED = 13
const MAX_WORLD_SPEED = 130
const NEAR_MISS_POINTS = 25
const ROAD_MARKER_SPAN = 196

function worldSpeedFor(speedKmh: number): number {
  const progress = (speedKmh - START_SPEED_KMH) / (MAX_SPEED_KMH - START_SPEED_KMH)
  return START_WORLD_SPEED + (MAX_WORLD_SPEED - START_WORLD_SPEED) * Math.pow(THREE.MathUtils.clamp(progress, 0, 1), 1.55)
}

function Speedometer({ speedKmh }: { speedKmh: number }) {
  const fraction = Math.min((speedKmh - START_SPEED_KMH) / (MAX_SPEED_KMH - START_SPEED_KMH), 1)

  return (
    <div
      className="w-[98px] rounded-xl border border-white/20 bg-[#10263b]/90 px-2 py-1.5 text-center shadow-lg backdrop-blur-sm sm:w-[108px]"
      role="meter"
      aria-label="Bus speed"
      aria-valuemin={START_SPEED_KMH}
      aria-valuemax={MAX_SPEED_KMH}
      aria-valuenow={Number(speedKmh.toFixed(1))}
      aria-valuetext={`${speedKmh.toFixed(1)} kilometers per hour`}
    >
      <p className="font-mono text-lg font-black tabular-nums leading-tight text-white sm:text-xl">
        {speedKmh.toFixed(1)} <span className="text-[9px] font-semibold text-white/65">km/h</span>
      </p>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/20" aria-hidden="true">
        <div className="h-full rounded-full bg-emerald-300 transition-[width] duration-100" style={{ width: `${fraction * 100}%` }} />
      </div>
    </div>
  )
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

export default function SecretBusGame({ onClose }: { onClose: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<GameApi | null>(null)
  const closeRef = useRef(onClose)
  const [phase, setPhase] = useState<Phase>("ready")
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const [collected, setCollected] = useState(0)
  const [displaySpeedKmh, setDisplaySpeedKmh] = useState(START_SPEED_KMH)
  const [nearMissCount, setNearMissCount] = useState(0)
  const [showNearMiss, setShowNearMiss] = useState(false)
  const [journey, setJourney] = useState(() => getJourneyProgress(0))

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
    scene.fog = new THREE.Fog("#9dd9ef", 42, 205)

    const camera = new THREE.PerspectiveCamera(54, 1, 0.1, 260)
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

    const roadMarkers: THREE.Object3D[] = []
    const dashMaterial = new THREE.MeshBasicMaterial({ color: "#f8fafc" })
    for (const x of [-1.45, 1.45]) {
      for (let index = 0; index < 28; index++) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 3.3), dashMaterial)
        dash.rotation.x = -Math.PI / 2
        dash.position.set(x, 0.035, 15 - index * 7)
        scene.add(dash)
        roadMarkers.push(dash)
      }
    }

    // Close roadside markers make the extra pace visible as they pass the camera.
    const markerMaterial = new THREE.MeshBasicMaterial({ color: "#f8e7aa" })
    for (const x of [-4.7, 4.7]) {
      for (let index = 0; index < 28; index += 2) {
        const marker = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 1.8), markerMaterial)
        marker.rotation.x = -Math.PI / 2
        marker.position.set(x, 0.038, 15 - index * 7)
        scene.add(marker)
        roadMarkers.push(marker)
      }
    }

    const initialRoadZ = roadMarkers.map((object) => object.position.z)
    const branding = loadCampusBranding()
    const sceneryModels = createGameSceneryModels(branding)
    sceneryModels.forEach(({ object }) => scene.add(object))
    const scenery = createCampusScenery(sceneryModels, {
      viewportAspect: mount.clientWidth / mount.clientHeight,
      stages: GAME_JOURNEY,
    })

    const environmentPalettes = GAME_JOURNEY.map(({ palette }) => ({
      sky: new THREE.Color(palette.sky), ground: new THREE.Color(palette.ground),
      road: new THREE.Color(palette.road), shoulder: new THREE.Color(palette.shoulder),
    }))
    const updateEnvironment = () => {
      const progress = scenery.getProgress()
      const current = environmentPalettes[progress.stageIndex]
      const next = environmentPalettes[Math.min(progress.stageIndex + 1, environmentPalettes.length - 1)]
      const blend = THREE.MathUtils.smoothstep(progress.stageProgress, 0.65, 1)
      ;(scene.background as THREE.Color).copy(current.sky).lerp(next.sky, blend)
      ;(scene.fog as THREE.Fog).color.copy(scene.background as THREE.Color)
      ground.material.color.copy(current.ground).lerp(next.ground, blend)
      road.material.color.copy(current.road).lerp(next.road, blend)
      shoulderMaterial.color.copy(current.shoulder).lerp(next.shoulder, blend)
      return progress
    }

    const bus = createCampusBus(branding)
    bus.position.z = BUS_Z
    scene.add(bus)

    const entities: Entity[] = []
    let laneIndex = 1
    let targetX = LANES[laneIndex]
    let distance = 0
    let clocks = 0
    let bonusPoints = 0
    let nearMisses = 0
    let speedKmh = START_SPEED_KMH
    let worldSpeed = worldSpeedFor(speedKmh)
    let drivingSeconds = 0
    let spawnTimer = 0.7
    let nearMissTimeout: number | undefined
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

    const reset = (rerollScenery: boolean) => {
      clearEntities()
      roadMarkers.forEach((object, index) => {
        object.position.z = initialRoadZ[index]
      })
      if (rerollScenery) scenery.reset()
      setJourney(updateEnvironment())
      laneIndex = 1
      targetX = LANES[laneIndex]
      distance = 0
      clocks = 0
      bonusPoints = 0
      nearMisses = 0
      speedKmh = START_SPEED_KMH
      worldSpeed = worldSpeedFor(speedKmh)
      drivingSeconds = 0
      spawnTimer = 0.65
      window.clearTimeout(nearMissTimeout)
      setShowNearMiss(false)
      bus.position.x = 0
      bus.position.y = 0
      bus.rotation.set(0, 0, 0)
      setScore(0)
      setCollected(0)
      setNearMissCount(0)
      setDisplaySpeedKmh(START_SPEED_KMH)
    }

    const start = () => {
      if (phaseValue === "ready" || phaseValue === "game-over") reset(phaseValue === "game-over")
      changePhase("playing")
    }

    const togglePause = () => {
      if (phaseValue === "playing") changePhase("paused")
      else if (phaseValue === "paused") changePhase("playing")
    }

    const steer = (direction: -1 | 1) => {
      if (phaseValue !== "playing") return
      const nextLaneIndex = THREE.MathUtils.clamp(laneIndex + direction, 0, LANES.length - 1)
      if (nextLaneIndex === laneIndex) return

      // A near miss must be a late dodge from a lane that would have hit the cone.
      // Mark only the closest threatened cone, not every cone beside the bus.
      let dodgedCone: Entity | null = null
      let nearestTimeToCone = NEAR_MISS_DODGE_WINDOW_SECONDS
      for (const entity of entities) {
        if (entity.kind !== "cone") continue
        const timeToCone = lateDodgeTimeToCone({
          coneX: entity.object.position.x,
          coneZ: entity.object.position.z,
          busX: bus.position.x,
          busZ: BUS_Z,
          currentLaneX: targetX,
          nextLaneX: LANES[nextLaneIndex],
          worldSpeed,
        })
        if (timeToCone !== null && timeToCone <= nearestTimeToCone) {
          dodgedCone = entity
          nearestTimeToCone = timeToCone
        }
      }
      if (dodgedCone) dodgedCone.lastSecondDodgeAt = drivingSeconds

      laneIndex = nextLaneIndex
      targetX = LANES[laneIndex]
    }

    apiRef.current = { start, togglePause, steer }

    const spawn = () => {
      const currentScore = Math.floor(distance) + clocks * 50 + bonusPoints
      const coneChance = Math.min(0.82, 0.62 + currentScore * 0.0001)
      const isClock = Math.random() > coneChance
      const object = isClock ? createClock() : createCone()
      const randomLane = Math.floor(Math.random() * LANES.length)
      object.position.x = LANES[randomLane]
      object.position.z = -Math.max(62, worldSpeed * 2.25)
      scene.add(object)
      entities.push({
        kind: isClock ? "clock" : "cone",
        object,
        spin: isClock ? object : null,
        lastSecondDodgeAt: null,
        closestPassGap: null,
      })
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
        speedKmh = Math.min(MAX_SPEED_KMH, START_SPEED_KMH + drivingSeconds * ACCELERATION_KMH)
        worldSpeed = worldSpeedFor(speedKmh)
        distance += worldSpeed * delta * 0.62
        spawnTimer -= delta
        if (spawnTimer <= 0) {
          spawn()
          const currentScore = Math.floor(distance) + clocks * 50 + bonusPoints
          spawnTimer = Math.max(0.42, 1.16 - worldSpeed * 0.009 - currentScore * 0.00028) + Math.random() * 0.25
        }

        const xDelta = targetX - bus.position.x
        bus.position.x += xDelta * Math.min(1, delta * 8.2)
        bus.rotation.z = THREE.MathUtils.lerp(bus.rotation.z, -xDelta * 0.095, delta * 8)
        bus.rotation.y = THREE.MathUtils.lerp(bus.rotation.y, xDelta * 0.025, delta * 8)
        bus.position.y = Math.sin(now * 0.008) * 0.025
        wheelMeshes.forEach((wheel) => {
          wheel.rotation.x -= worldSpeed * delta * 0.75
        })

        roadMarkers.forEach((object) => {
          object.position.z += worldSpeed * delta
          if (object.position.z > 18) object.position.z -= ROAD_MARKER_SPAN
        })
        scenery.update(worldSpeed * delta)
        const journeyProgress = updateEnvironment()

        for (let index = entities.length - 1; index >= 0; index--) {
          const entity = entities[index]
          const previousZ = entity.object.position.z
          entity.object.position.z += worldSpeed * delta
          if (entity.spin) {
            entity.spin.rotation.y += delta * 2.7
            entity.spin.position.y = 1.05 + Math.sin(now * 0.006 + index) * 0.12
          }

          const crossedBus = previousZ <= BUS_Z + 1.55 && entity.object.position.z >= BUS_Z - 1.55
          const lateralDistance = Math.abs(entity.object.position.x - bus.position.x)
          if (crossedBus && entity.kind === "cone") {
            entity.closestPassGap = Math.min(entity.closestPassGap ?? Infinity, lateralDistance)
          }
          if (crossedBus && lateralDistance < 1.08) {
            entities.splice(index, 1)
            if (entity.kind === "clock") {
              clocks += 1
              setCollected(clocks)
              removeEntity(entity)
            } else {
              const finalScore = Math.floor(distance) + clocks * 50 + bonusPoints
              bus.rotation.z = entity.object.position.x > bus.position.x ? -0.28 : 0.28
              removeEntity(entity)
              changePhase("game-over")
              setScore(finalScore)
              updateBest(finalScore)
              break
            }
          } else if (
            entity.kind === "cone" &&
            isTightNearMiss(entity.lastSecondDodgeAt, drivingSeconds, entity.closestPassGap) &&
            previousZ <= BUS_Z + 1.55 &&
            entity.object.position.z > BUS_Z + 1.55 &&
            lateralDistance >= 1.08
          ) {
            entities.splice(index, 1)
            removeEntity(entity)
            bonusPoints += NEAR_MISS_POINTS
            nearMisses += 1
            setNearMissCount(nearMisses)
            setScore(Math.floor(distance) + clocks * 50 + bonusPoints)
            setShowNearMiss(true)
            window.clearTimeout(nearMissTimeout)
            nearMissTimeout = window.setTimeout(() => setShowNearMiss(false), 900)
          } else if (entity.object.position.z > 13) {
            entities.splice(index, 1)
            removeEntity(entity)
          }
        }

        elapsedSinceUi += delta
        if (elapsedSinceUi > 0.1) {
          setScore(Math.floor(distance) + clocks * 50 + bonusPoints)
          setDisplaySpeedKmh(speedKmh)
          setJourney(journeyProgress)
          elapsedSinceUi = 0
        }
      } else if (phaseValue === "ready") {
        bus.position.y = Math.sin(now * 0.0025) * 0.035
        bus.rotation.y = Math.sin(now * 0.0012) * 0.025
      }

      const speedFraction = THREE.MathUtils.clamp((speedKmh - START_SPEED_KMH) / (MAX_SPEED_KMH - START_SPEED_KMH), 0, 1)
      camera.fov = THREE.MathUtils.lerp(camera.fov, 54 + speedFraction * 28, Math.min(1, delta * 2.5))
      camera.updateProjectionMatrix()
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, bus.position.x * 0.28, delta * 2.5)
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, 6.15 - speedFraction * 0.45, delta * 2.5)
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, 12.5 - speedFraction * 0.8, delta * 2.5)
      camera.lookAt(bus.position.x * 0.15, 1.0, -8)
      renderer.render(scene, camera)
    }
    frameId = window.requestAnimationFrame(animate)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("visibilitychange", onVisibilityChange)
      window.clearTimeout(nearMissTimeout)
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

      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-3 p-4 sm:p-6">
        <div className="min-w-0">
          <h2 className="text-xl font-black tracking-tight drop-shadow-md sm:text-3xl">NottGo: Campus Run</h2>
          <p className="mt-1 truncate text-[10px] font-semibold text-white/90 sm:text-xs" role="status" title={journey.stage.name}>
            {journey.stage.label}
            <span className="ml-2 font-normal text-white/60">
              {journey.nextStage ? `→ ${journey.nextStage.label}` : "• Final stop"}
            </span>
          </p>
          <div
            className="mt-1 h-0.5 max-w-[230px] overflow-hidden rounded-full bg-white/20"
            role="progressbar"
            aria-label={journey.nextStage ? `Journey to ${journey.nextStage.name}` : "Final destination reached"}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(journey.stageProgress * 100)}
          >
            <div className="h-full bg-emerald-300 transition-[width] duration-150" style={{ width: `${journey.stageProgress * 100}%` }} />
          </div>
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

      <div className="pointer-events-none absolute left-4 right-4 top-[5.2rem] z-10 grid grid-cols-[1fr_auto_1fr] items-start gap-1 sm:left-6 sm:right-6 sm:top-24">
        <div className="flex flex-col items-start gap-2 justify-self-start">
          <div className="rounded-xl border border-white/15 bg-[#10263b]/78 px-3 py-2 shadow-lg backdrop-blur-sm">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/55">Score</p>
            <p className="font-mono text-lg font-black tabular-nums sm:text-2xl">{score.toString().padStart(4, "0")}</p>
          </div>
          {showNearMiss && phase === "playing" && (
            <div
              key={nearMissCount}
              role="status"
              className="whitespace-nowrap rounded-lg border border-emerald-200/40 bg-[#10263b]/90 px-2 py-1 text-[10px] font-black text-emerald-200 shadow-lg animate-[nearMissPop_900ms_ease-out_both] motion-reduce:animate-none sm:text-xs"
            >
              NEAR MISS <span className="ml-1 text-white">+{NEAR_MISS_POINTS}</span>
            </div>
          )}
        </div>
        <div className="justify-self-center">
          {phase === "playing" && <Speedometer speedKmh={displaySpeedKmh} />}
        </div>
        <div className="flex justify-self-end gap-1 sm:gap-2">
          <div className="rounded-xl border border-white/15 bg-[#10263b]/78 px-2 py-2 text-center shadow-lg backdrop-blur-sm sm:px-3">
            <Clock3 className="mx-auto h-4 w-4 text-amber-300" />
            <p className="mt-0.5 font-mono text-sm font-black">{collected}</p>
          </div>
          <div className="rounded-xl border border-white/15 bg-[#10263b]/78 px-2 py-2 text-center shadow-lg backdrop-blur-sm sm:px-3">
            <Trophy className="mx-auto h-4 w-4 text-emerald-300" />
            <p className="mt-0.5 font-mono text-sm font-black">{best}</p>
          </div>
        </div>
      </div>

      {phase !== "playing" && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-[#08131f]/55 px-5">
          <div className="w-full max-w-sm text-center drop-shadow-lg">
            <h3 className="text-3xl font-black tracking-tight sm:text-4xl">
              {phase === "game-over" ? `Score ${score}` : phase === "paused" ? "Paused" : "Ready to drive?"}
            </h3>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-white/90">
              {phase === "ready"
                ? "Drive from Nottingham through the shuttle stops. Clocks +50, last-second dodges +25. Don't crash."
                : phase === "paused"
                  ? "Your route is waiting."
                  : nearMissCount > 0
                    ? `${nearMissCount} near misses earned ${nearMissCount * NEAR_MISS_POINTS} bonus points.`
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
        <div className="absolute inset-x-0 bottom-5 z-20 flex items-end justify-between px-5 sm:bottom-7 sm:px-8">
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
