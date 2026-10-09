import assert from "node:assert/strict"
import test from "node:test"
import { CAMPUS_LOCATION, GAME_JOURNEY, distanceFromCampusKm, getJourneyProgress } from "../lib/gameJourney.ts"
import { STOPS, DESTINATION_STOP_IDS } from "../lib/shuttleStops.ts"

test("journey includes the shared shuttle map stops in increasing distance from campus", () => {
  assert.deepEqual(CAMPUS_LOCATION, { lat: 2.943677, lng: 101.875867 })
  assert.deepEqual(GAME_JOURNEY.map(({ id }) => id), ["campus", "tts", "pga", "lotus", "ecohill", "kajang", "ioi", "tbs"])
  assert.equal(new Set(GAME_JOURNEY.map(({ id }) => id)).size, STOPS.length + 1)
  const mappedStopIds = new Set(Object.values(DESTINATION_STOP_IDS).flat())
  assert.deepEqual(new Set(STOPS.map(({ id }) => id)), mappedStopIds)
  GAME_JOURNEY.slice(1).forEach((stage, index) => {
    const stop = STOPS.find(({ id }) => id === stage.id)
    assert.equal(stage.name, stop.name)
    assert.equal(stage.distanceKm, distanceFromCampusKm(stop))
    assert.ok(stage.distanceKm > GAME_JOURNEY[index].distanceKm)
  })
  assert.ok(Math.abs(GAME_JOURNEY.find(({ id }) => id === "kajang").distanceKm - 10.48) < 0.01)
})

test("compressed stages join continuously and reach Kajang without wrapping to campus", () => {
  GAME_JOURNEY.forEach((stage, index) => {
    assert.equal(stage.startDistance, index ? GAME_JOURNEY[index - 1].endDistance : 0)
    assert.equal(stage.endDistance, stage.startDistance + stage.length)
    assert.ok(stage.length >= 300 && stage.length <= 450)
    const beforeBoundary = getJourneyProgress(stage.endDistance - 0.001)
    assert.equal(beforeBoundary.stage.id, stage.id)
    assert.ok(beforeBoundary.stageProgress > 0.99)
    const atBoundary = getJourneyProgress(stage.endDistance)
    assert.equal(atBoundary.stage.id, GAME_JOURNEY[index + 1]?.id ?? stage.id)
  })
  const kajang = GAME_JOURNEY.find(({ id }) => id === "kajang")
  assert.ok(kajang.startDistance < 2000)
  const far = getJourneyProgress(1e8)
  assert.equal(far.stage.id, "tbs")
  assert.equal(far.stageProgress, 1)
  assert.equal(far.nextStage, null)
})

test("progress clamps invalid input and exposes the next destination", () => {
  for (const distance of [-10, NaN, Infinity]) {
    const progress = getJourneyProgress(distance)
    assert.equal(progress.distance, 0)
    assert.equal(progress.stage.id, "campus")
    assert.equal(progress.stageProgress, 0)
    assert.equal(progress.nextStage.id, "tts")
  }
  const stage = GAME_JOURNEY[3]
  const midpoint = getJourneyProgress(stage.startDistance + stage.length / 2)
  assert.equal(midpoint.stage.id, "lotus")
  assert.equal(midpoint.stageProgress, 0.5)
  assert.equal(midpoint.nextStage.id, "ecohill")
  assert.throws(() => getJourneyProgress(0, []), /at least one stage/)
})
