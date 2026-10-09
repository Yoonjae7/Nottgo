import * as THREE from "three"
import { GAME_JOURNEY, getJourneyProgress, type JourneyStage } from "./gameJourney.ts"

export type SceneryModel = {
  kind: "tree" | "building" | "trent" | "entrance" | "landmark"
  object: THREE.Group
  stageId?: string
  /** Switch an existing fixed set of prop variants during hidden placement. */
  onStageChange?: (stage: JourneyStage) => void
}

type Footprint = { minX: number; maxX: number; minZ: number; maxZ: number }
type Placement = Footprint & { x: number; z: number; yaw: number; scale: number }
type SceneryEntry = SceneryModel & { local: Footprint; placement: Placement; active: boolean }

const ROAD_CLEARANCE = 6.2
const OUTER_EDGE = 34.5
const HIDDEN_FRONT_Z = -215
const RETIRE_REAR_Z = 26
const PROP_MARGIN = 0.8
const LANDMARK_MARGIN = 1.5
const LANDMARK_APPROACH = 75

const isLandmark = (kind: SceneryModel["kind"]) => kind === "trent" || kind === "entrance" || kind === "landmark"

// A rotated bounding rectangle is conservative for both the building and its
// asymmetric landscaped approach. Keep the entire footprint off the road.
function transformedFootprint(local: Footprint, yaw: number, scale: number): Footprint {
  const cosine = Math.cos(yaw) * scale
  const sine = Math.sin(yaw) * scale
  const result = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity }
  for (const x of [local.minX, local.maxX]) {
    for (const z of [local.minZ, local.maxZ]) {
      const nextX = x * cosine + z * sine
      const nextZ = z * cosine - x * sine
      result.minX = Math.min(result.minX, nextX)
      result.maxX = Math.max(result.maxX, nextX)
      result.minZ = Math.min(result.minZ, nextZ)
      result.maxZ = Math.max(result.maxZ, nextZ)
    }
  }
  return result
}

function overlaps(a: Placement, b: Placement, margin: number): boolean {
  return a.x + a.minX < b.x + b.maxX + margin &&
    a.x + a.maxX + margin > b.x + b.minX &&
    a.z + a.minZ < b.z + b.maxZ + margin &&
    a.z + a.maxZ + margin > b.z + b.minZ
}

function blocksApproach(a: Placement, aKind: SceneryModel["kind"], b: Placement, bKind: SceneryModel["kind"]): boolean {
  const building = aKind === "building" && isLandmark(bKind) ? a
    : bKind === "building" && isLandmark(aKind) ? b : null
  const landmark = aKind === "building" && isLandmark(bKind) ? b
    : bKind === "building" && isLandmark(aKind) ? a : null
  if (!building || !landmark || Math.sign(building.x) !== Math.sign(landmark.x)) return false
  // Taller roadside props can hide a station even when their footprints do not
  // overlap. Leave a short approach on its side of the road open to the view.
  const approachStart = landmark.z + landmark.maxZ
  return building.z + building.minZ < approachStart + LANDMARK_APPROACH &&
    building.z + building.maxZ > approachStart
}

/** Reuses a fixed model pool, changing scenery only after it has left the view. */
export function createCampusScenery(
  models: SceneryModel[],
  options: { viewportAspect: number; random?: () => number; stages?: JourneyStage[] },
) {
  const stages = options.stages ?? GAME_JOURNEY
  const staged = stages.length > 0
  let travel = 0
  const random = options.random ?? Math.random
  const sample = () => Math.max(0, Math.min(1 - Number.EPSILON, random()))
  const range = (minimum: number, maximum: number) => minimum + sample() * (maximum - minimum)
  const entries: SceneryEntry[] = models.map((model) => {
    const bounds = new THREE.Box3().setFromObject(model.object)
    const local = bounds.isEmpty()
      ? { minX: 0, maxX: 0, minZ: 0, maxZ: 0 }
      : { minX: bounds.min.x, maxX: bounds.max.x, minZ: bounds.min.z, maxZ: bounds.max.z }
    return { ...model, local, active: false, placement: { ...local, x: 0, z: 0, yaw: 0, scale: 1 } }
  })

  const shuffle = <T,>(items: T[]) => {
    const shuffled = [...items]
    for (let index = shuffled.length - 1; index > 0; index--) {
      const swap = Math.floor(sample() * (index + 1))
      ;[shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]]
    }
    return shuffled
  }

  const applyStage = (entry: SceneryEntry, worldDistance: number) => {
    if (!staged) return
    const stage = getJourneyProgress(worldDistance, stages).stage
    entry.onStageChange?.(stage)
    entry.object.userData.journeyStageId = stage.id
    // The bus can pass a prop unchanged. Its colors and fixed geometry variant
    // only change at reset or during its next placement beyond the far fog.
    const candidate = entry.onStageChange ? null : entry.kind === "tree" ? entry.object.children[1] ?? entry.object.children[0]
      : entry.kind === "building" ? entry.object.children[0] : null
    if (candidate instanceof THREE.Mesh && !Array.isArray(candidate.material) && "color" in candidate.material) {
      const colors = entry.kind === "tree" ? stage.palette.trees : stage.palette.buildings
      ;(candidate.material as THREE.MeshStandardMaterial).color.set(colors[Math.floor(sample() * colors.length)])
    }
  }

  const makePose = (entry: SceneryEntry): Placement => {
    const side = sample() < 0.5 ? -1 : 1
    const landmark = isLandmark(entry.kind)
    // Facades retain their forward-facing signs while leaning toward the road.
    const yaw = entry.kind === "tree" ? range(-0.8, 0.8) : -side * range(0.035, landmark ? 0.24 : 0.42)
    let scale = entry.kind === "trent" ? range(0.7, 0.82)
      : entry.kind === "entrance" ? range(0.9, 1.05)
        : entry.kind === "tree" ? range(0.8, 1.5) : range(0.8, 1.2)
    let footprint = transformedFootprint(entry.local, yaw, scale)
    const availableWidth = OUTER_EDGE - ROAD_CLEARANCE
    if (footprint.maxX - footprint.minX > availableWidth) {
      scale *= availableWidth / (footprint.maxX - footprint.minX)
      footprint = transformedFootprint(entry.local, yaw, scale)
    }
    const width = footprint.maxX - footprint.minX
    const setbackLimit = Math.max(0, Math.min(landmark ? 4.2 : 11, availableWidth - width))
    const innerEdge = ROAD_CLEARANCE + range(0, setbackLimit)
    const x = side === 1 ? innerEdge - footprint.minX : -innerEdge - footprint.maxX
    return { ...footprint, x, z: 0, yaw, scale }
  }

  const place = (entry: SceneryEntry, desiredZ: number, occupied: SceneryEntry[], hidden = false) => {
    const conflicts = (candidate: Placement, other: SceneryEntry) => other.active && other !== entry && (
      overlaps(candidate, other.placement, isLandmark(entry.kind) || isLandmark(other.kind) ? LANDMARK_MARGIN : PROP_MARGIN) ||
      blocksApproach(candidate, entry.kind, other.placement, other.kind)
    )
    let candidate = makePose(entry)
    candidate.z = hidden ? Math.min(desiredZ, HIDDEN_FRONT_Z - candidate.maxZ) : desiredZ
    // Only a bounded number of side/pose retries are needed. Moving farther back
    // afterwards always finds space without growing the model pool or the route.
    for (let attempt = 0; attempt < 8; attempt++) {
      const collision = occupied.some((other) => conflicts(candidate, other))
      if (!collision) break
      candidate = makePose(entry)
      candidate.z = (hidden ? Math.min(desiredZ, HIDDEN_FRONT_Z - candidate.maxZ) : desiredZ) - range(4, 14) * (attempt + 1)
    }
    for (;;) {
      const collision = occupied.find((other) => conflicts(candidate, other))
      if (!collision) break
      const margin = isLandmark(entry.kind) || isLandmark(collision.kind) ? LANDMARK_MARGIN : PROP_MARGIN
      const approach = isLandmark(entry.kind) && collision.kind === "building" && Math.sign(candidate.x) === Math.sign(collision.placement.x)
        ? LANDMARK_APPROACH : 0
      candidate.z = collision.placement.z + collision.placement.minZ - candidate.maxZ - approach - margin - range(1, 8)
    }
    entry.placement = candidate
    entry.object.position.set(candidate.x, 0, candidate.z)
    entry.object.rotation.set(0, candidate.yaw, 0)
    entry.object.scale.setScalar(candidate.scale)
    entry.active = true
    entry.object.visible = !staged || candidate.z + candidate.maxZ >= HIDDEN_FRONT_Z
    if (!isLandmark(entry.kind)) applyStage(entry, travel - candidate.z)
  }

  const reset = () => {
    travel = 0
    entries.forEach((entry) => {
      entry.active = false
      entry.object.visible = false
    })
    const occupied: SceneryEntry[] = []
    const landmarks = shuffle(entries.filter((entry) => isLandmark(entry.kind) &&
      (!staged || (entry.stageId ?? (entry.kind === "landmark" ? undefined : "campus")) === stages[0].id)))
    let landmarkZ = 0
    landmarks.forEach((entry, index) => {
      if (index === 0) {
        const aspect = Math.max(0.2, options.viewportAspect)
        const portraitZ = entry.kind === "trent" ? -Math.min(150, 48 / aspect) : -Math.min(135, 42 / aspect)
        landmarkZ = aspect < 0.65 ? portraitZ : entry.kind === "trent" ? -70 : -48
        landmarkZ -= range(0, 16)
      } else landmarkZ -= range(65, 125)
      place(entry, landmarkZ, occupied)
      landmarkZ = entry.placement.z
      occupied.push(entry)
    })
    if (staged) {
      for (const stage of stages.slice(1)) {
        let landmarkDistance = stage.startDistance + stage.length * range(0.36, 0.52)
        for (const entry of shuffle(entries.filter((candidate) => isLandmark(candidate.kind) && candidate.stageId === stage.id))) {
          place(entry, -landmarkDistance, occupied, true)
          entry.object.userData.journeyStageId = stage.id
          occupied.push(entry)
          landmarkDistance = -entry.placement.z + range(60, 90)
        }
      }
    }
    let propZ = range(8, 16)
    for (const entry of shuffle(entries.filter((entry) => !isLandmark(entry.kind)))) {
      place(entry, propZ, occupied)
      propZ -= range(7, 15)
      occupied.push(entry)
    }
  }

  const update = (travelDelta: number) => {
    if (!Number.isFinite(travelDelta) || travelDelta <= 0) return
    travel += travelDelta
    for (const entry of entries) {
      if (!entry.active) continue
      entry.placement.z += travelDelta
      entry.object.position.z = entry.placement.z
      if (staged) entry.object.visible = entry.placement.z + entry.placement.maxZ >= HIDDEN_FRONT_Z
    }
    for (const entry of entries) {
      if (!entry.active) continue
      // The stored bounds are recomputed for each new pose, including scale and
      // yaw. A long lake/bridge cannot be recycled while still beside the bus.
      if (entry.placement.z + entry.placement.minZ <= RETIRE_REAR_Z) continue
      if (staged && isLandmark(entry.kind)) {
        entry.active = false
        entry.object.visible = false
        continue
      }
      const poseFrontOffset = entry.placement.maxZ
      const desiredZ = isLandmark(entry.kind)
        ? -range(700, 1100) - poseFrontOffset
        : HIDDEN_FRONT_Z - poseFrontOffset - range(0, 85)
      place(entry, desiredZ, entries, true)
    }
  }

  reset()
  return { update, reset, getProgress: () => getJourneyProgress(travel, staged ? stages : GAME_JOURNEY) }
}
