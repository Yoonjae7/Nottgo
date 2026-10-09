import assert from "node:assert/strict"
import test from "node:test"
import * as THREE from "three"
import { createCampusScenery } from "../lib/campusScenery.ts"
import { GAME_JOURNEY } from "../lib/gameJourney.ts"

function seededRandom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
}

function model(kind, size, offset = [0, 0, 0]) {
  const object = new THREE.Group()
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshBasicMaterial())
  mesh.position.set(...offset)
  object.add(mesh)
  return { kind, object }
}

function campusModels() {
  return [
    // Trent's broad, forward-projecting landscaped footprint needs special care.
    model("trent", [20.8, 10.74, 23.8], [0, 5.37, 7.9]),
    model("entrance", [9.65, 9.5, 11.25], [0, 4.75, 1.775]),
    ...Array.from({ length: 25 }, (_, index) => index % 3 === 0
      ? model("building", [3.8, 2.8 + index % 3, 3.1], [0, 2, 0])
      : model("tree", [1.56, 2.5, 1.56], [0, 1.25, 0])),
  ]
}

const boundsOf = (entry) => new THREE.Box3().setFromObject(entry.object)
const snapshot = (models) => models.map(({ object }) => [
  object.position.x, object.position.z, object.rotation.y, object.scale.x,
])

function assertSafe(models) {
  const bounds = models.map(boundsOf)
  for (const box of bounds) {
    assert.ok(box.min.x >= 6.2 - 1e-5 || box.max.x <= -6.2 + 1e-5, "entire rotated footprint stays off-road")
    assert.ok(box.min.x >= -34.5 - 1e-5 && box.max.x <= 34.5 + 1e-5, "footprint remains on the campus ground")
  }
  for (let a = 0; a < bounds.length; a++) {
    for (let b = a + 1; b < bounds.length; b++) {
      const left = bounds[a]
      const right = bounds[b]
      const overlaps = left.min.x < right.max.x + 0.8 - 1e-5 &&
        left.max.x + 0.8 - 1e-5 > right.min.x &&
        left.min.z < right.max.z + 0.8 - 1e-5 &&
        left.max.z + 0.8 - 1e-5 > right.min.z
      assert.equal(overlaps, false, `scenery ${a} and ${b} leave each other's footprints clear`)
    }
  }
}

test("initial scenery varies poses, sides, gaps and landmark order while keeping safe footprints", () => {
  const firstKinds = new Set()
  for (const seed of [1, 2, 10, 44, 101, 925, 3001, 88201]) {
    const models = campusModels()
    createCampusScenery(models, { viewportAspect: 1.6, random: seededRandom(seed), stages: [] })
    assertSafe(models)
    const props = models.slice(2)
    assert.ok(props.some(({ object }) => object.position.x < 0))
    assert.ok(props.some(({ object }) => object.position.x > 0))
    assert.ok(new Set(props.map(({ object }) => object.rotation.y.toFixed(2))).size > 10)
    const orderedZ = props.map(({ object }) => object.position.z).sort((a, b) => b - a)
    assert.ok(new Set(orderedZ.slice(1).map((z, index) => (orderedZ[index] - z).toFixed(1))).size > 10)
    firstKinds.add(models.slice(0, 2).sort((a, b) => b.object.position.z - a.object.position.z)[0].kind)
  }
  assert.equal(firstKinds.size, 2, "either campus landmark can appear first")
})

test("portrait view gets a longer landmark approach and reset creates a fresh arrangement", () => {
  const wide = campusModels()
  const portrait = campusModels()
  createCampusScenery(wide, { viewportAspect: 1.6, random: seededRandom(925), stages: [] })
  const scenery = createCampusScenery(portrait, { viewportAspect: 0.4, random: seededRandom(925), stages: [] })
  for (let index = 0; index < 2; index++) {
    assert.ok(portrait[index].object.position.z < wide[index].object.position.z - 25)
  }
  const beforeReset = snapshot(portrait)
  scenery.reset()
  assert.notDeepEqual(snapshot(portrait), beforeReset)
  assertSafe(portrait)
})

test("updates only translate visible scenery and recycle each full footprint beyond the fog", () => {
  const models = campusModels()
  const scenery = createCampusScenery(models, { viewportAspect: 1.6, random: seededRandom(101), stages: [] })
  const first = snapshot(models)
  scenery.update(0)
  assert.deepEqual(snapshot(models), first)
  scenery.update(0.25)
  models.forEach(({ object }, index) => {
    assert.equal(object.position.x, first[index][0])
    assert.equal(object.position.z, first[index][1] + 0.25)
    assert.equal(object.rotation.y, first[index][2])
    assert.equal(object.scale.x, first[index][3])
  })
  let recycled = 0
  const landmarkIntervals = [[], []]
  let travel = 0.25
  const lastLandmarkTravel = [0, 0]
  for (let step = 0; step < 1800; step++) {
    const before = models.map(boundsOf)
    const previousZ = models.map(({ object }) => object.position.z)
    scenery.update(6.5)
    travel += 6.5
    models.forEach((entry, index) => {
      if (entry.object.position.z >= previousZ[index]) return
      recycled++
      assert.ok(before[index].min.z + 6.5 > 26 - 1e-5, "old entire footprint is behind the camera")
      assert.ok(boundsOf(entry).max.z <= -215 + 1e-5, "new entire footprint is hidden by fog")
      if (index < 2) {
        if (lastLandmarkTravel[index] > 0) landmarkIntervals[index].push(travel - lastLandmarkTravel[index])
        lastLandmarkTravel[index] = travel
      }
    })
    if (step % 50 === 0) assertSafe(models)
  }
  assert.ok(recycled > 500)
  landmarkIntervals.forEach((intervals) => {
    assert.ok(intervals.length > 5)
    assert.ok(intervals.every((interval) => interval > 700), "recognizable landmarks avoid the old 196-unit loop")
    assert.ok(new Set(intervals).size > 5, "repeat encounters have independent random delays")
  })
})

test("retirement uses the current rotated/scaled bounds and keeps a fixed object pool", () => {
  const entry = model("trent", [20.8, 10.74, 23.8], [0, 5.37, 7.9])
  const scene = new THREE.Scene()
  scene.add(entry.object)
  const scenery = createCampusScenery([entry], { viewportAspect: 1.6, random: seededRandom(44), stages: [] })
  const uuid = entry.object.uuid
  for (let cycle = 0; cycle < 120; cycle++) {
    const bounds = boundsOf(entry)
    const untilRearPasses = 26 - bounds.min.z
    const oldX = entry.object.position.x
    const oldYaw = entry.object.rotation.y
    const oldScale = entry.object.scale.x
    scenery.update(untilRearPasses - 0.001)
    assert.equal(entry.object.position.x, oldX)
    assert.equal(entry.object.rotation.y, oldYaw)
    assert.equal(entry.object.scale.x, oldScale)
    assert.ok(boundsOf(entry).min.z <= 26 + 1e-5)
    scenery.update(0.002)
    assert.ok(boundsOf(entry).max.z < -215)
    assert.equal(entry.object.uuid, uuid)
    assert.equal(scene.children.length, 1)
    assertSafe([entry])
  }
})

test("long runs change landmark encounter order and move models between roadside positions", () => {
  const models = campusModels()
  const scenery = createCampusScenery(models, { viewportAspect: 1.6, random: seededRandom(88201), stages: [] })
  const sideHistory = models.map(() => new Set())
  const encounterKinds = []
  let recycleCount = 0
  for (let step = 0; step < 5000; step++) {
    const previousZ = models.map(({ object }) => object.position.z)
    scenery.update(6.5)
    models.forEach((entry, index) => {
      sideHistory[index].add(Math.sign(entry.object.position.x))
      if (entry.object.position.z < previousZ[index]) {
        recycleCount++
        if (index < 2) encounterKinds.push(entry.kind)
      }
    })
  }
  assert.ok(recycleCount > 1500)
  assert.ok(sideHistory.every((sides) => sides.size === 2))
  assert.ok(encounterKinds.some((kind, index) => index > 0 && kind === encounterKinds[index - 1]), "independent encounters do not force strict alternation")
  assert.equal(models.length, 27)
  assertSafe(models)
})

function journeyModels() {
  return [
    ...campusModels(),
    ...GAME_JOURNEY.slice(1).map((stage) => ({ ...model("landmark", [8, 7, 12], [0, 3.5, 0]), stageId: stage.id })),
  ]
}

test("journey landmarks appear once in their own zone and campus does not repeat", () => {
  const models = journeyModels()
  const scenery = createCampusScenery(models, { viewportAspect: 1.6, random: seededRandom(3001) })
  const landmarks = models.filter(({ kind }) => ["trent", "entrance", "landmark"].includes(kind))
  const seen = new Set()
  const retired = new Set()
  const initialAnchors = landmarks.map(({ object }) => -object.position.z)
  landmarks.slice(2).forEach((entry, index) => {
    const stage = GAME_JOURNEY.find(({ id }) => id === entry.stageId)
    assert.equal(entry.object.visible, false)
    assert.ok(initialAnchors[index + 2] >= stage.startDistance && initialAnchors[index + 2] < stage.endDistance)
  })
  for (let step = 0; step < 1200; step++) {
    const previous = landmarks.map(({ object }) => ({ z: object.position.z, visible: object.visible }))
    scenery.update(6.5)
    landmarks.forEach((entry, index) => {
      if (entry.object.visible) {
        assert.equal(retired.has(entry.object.uuid), false, "a passed landmark never reappears")
        seen.add(entry.object.uuid)
        assert.equal(entry.object.position.z, previous[index].z + 6.5, "no landmark is relocated during the run")
        if (!previous[index].visible) {
          assert.ok(boundsOf(entry).max.z <= -208.5 + 1e-5, "a future landmark first appears inside the far fog")
        }
      } else if (previous[index].visible) {
        retired.add(entry.object.uuid)
        assert.ok(boundsOf(entry).min.z > 26 - 1e-5, "the whole landmark has passed before it hides")
      }
    })
    if (step % 35 === 0) assertSafe(models.filter(({ object }) => object.visible))
  }
  assert.equal(seen.size, landmarks.length)
  assert.equal(retired.size, landmarks.length)
  assert.equal(scenery.getProgress().stage.id, "tbs")
  assert.equal(scenery.getProgress().nextStage, null)
})

test("prop variants change only at hidden placement and anticipate the destination ahead", () => {
  const models = journeyModels()
  const changes = []
  const prop = models.find(({ kind }) => kind === "building")
  prop.onStageChange = (stage) => changes.push({ stageId: stage.id, z: prop.object.position.z })
  const scenery = createCampusScenery(models, { viewportAspect: 1.6, random: seededRandom(101) })
  const countAfterReset = changes.length
  const visitedThemes = new Set()
  let lastZ = prop.object.position.z
  for (let step = 0; step < 900; step++) {
    const oldChangeCount = changes.length
    const oldBounds = boundsOf(prop)
    scenery.update(6.5)
    if (changes.length > oldChangeCount) {
      assert.ok(oldBounds.min.z + 6.5 > 26 - 1e-5)
      assert.ok(boundsOf(prop).max.z <= -215 + 1e-5)
      const worldDistance = scenery.getProgress().distance - prop.object.position.z
      const placementStage = GAME_JOURNEY.find((stage) => worldDistance < stage.endDistance) ?? GAME_JOURNEY.at(-1)
      assert.equal(changes.at(-1).stageId, placementStage.id)
      visitedThemes.add(placementStage.theme)
    } else {
      assert.equal(prop.object.position.z, lastZ + 6.5)
    }
    lastZ = prop.object.position.z
  }
  assert.ok(changes.length > countAfterReset + 10)
  assert.ok(visitedThemes.has("neighbourhood") && visitedThemes.has("town") && visitedThemes.has("rail") && visitedThemes.has("city"))
})

test("journey reset returns to campus, restores each landmark and rerolls safe placements", () => {
  const models = journeyModels()
  const scene = new THREE.Scene()
  models.forEach(({ object }) => scene.add(object))
  const uuids = scene.children.map(({ uuid }) => uuid)
  const scenery = createCampusScenery(models, { viewportAspect: 0.45, random: seededRandom(925) })
  const first = snapshot(models)
  scenery.update(5000)
  assert.equal(scenery.getProgress().stage.id, "tbs")
  scenery.reset()
  assert.equal(scenery.getProgress().stage.id, "campus")
  assert.equal(scenery.getProgress().distance, 0)
  assert.notDeepEqual(snapshot(models), first)
  assert.ok(models.slice(0, 2).some(({ object }) => object.visible))
  assert.ok(models.slice(27).every(({ object }) => !object.visible))
  assert.deepEqual(scene.children.map(({ uuid }) => uuid), uuids)
  assertSafe(models)
  const resetSnapshot = snapshot(models)
  for (const delta of [0, -1, Infinity, NaN]) scenery.update(delta)
  assert.deepEqual(snapshot(models), resetSnapshot)
  assert.equal(scenery.getProgress().distance, 0)
})

test("landmark approaches stay clear of same-side tall buildings across randomized placements", () => {
  let treesAlongApproaches = 0
  let buildingsOnOppositeApproaches = 0
  for (const seed of [1, 44, 101, 925, 3001, 88201]) {
    const models = journeyModels()
    for (const entry of models.filter(({ kind }) => kind === "building")) {
      entry.object.clear()
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(7, 11, 8), new THREE.MeshBasicMaterial())
      mesh.position.y = 5.5
      entry.object.add(mesh)
    }
    const scenery = createCampusScenery(models, { viewportAspect: 1.6, random: seededRandom(seed) })
    for (let step = 0; step < 450; step++) {
      const landmarks = models.filter(({ kind, object }) =>
        ["trent", "entrance", "landmark"].includes(kind) && new THREE.Box3().setFromObject(object).min.z <= 26)
      for (const landmark of landmarks) {
        const landmarkBounds = boundsOf(landmark)
        for (const prop of models.filter(({ kind }) => kind === "building" || kind === "tree")) {
          const bounds = boundsOf(prop)
          const inApproach = bounds.min.z < landmarkBounds.max.z + 75 - 1e-5 &&
            bounds.max.z > landmarkBounds.max.z + 1e-5
          if (!inApproach) continue
          const sameSide = Math.sign(prop.object.position.x) === Math.sign(landmark.object.position.x)
          if (prop.kind === "building") {
            assert.equal(sameSide, false, "a taller building cannot block the landmark's viewing approach")
            buildingsOnOppositeApproaches++
          } else if (sameSide) treesAlongApproaches++
        }
      }
      if (step % 30 === 0) assertSafe(models.filter(({ object }) => object.visible))
      scenery.update(6.5)
    }
  }
  assert.ok(treesAlongApproaches > 0, "trees can remain along a landmark's approach")
  assert.ok(buildingsOnOppositeApproaches > 0, "buildings still populate the opposite roadside")
})
