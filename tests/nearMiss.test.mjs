import assert from "node:assert/strict"
import test from "node:test"
import { lateDodgeTimeToCone } from "../lib/nearMiss.ts"

const threat = {
  coneX: 0,
  coneZ: -2,
  busX: 0,
  busZ: 3,
  currentLaneX: 0,
  nextLaneX: 2.55,
  worldSpeed: 13,
}

test("a late dodge from the cone's lane qualifies", () => {
  assert.ok(lateDodgeTimeToCone(threat) !== null)
})

test("passing a cone already in the next lane does not qualify", () => {
  assert.equal(lateDodgeTimeToCone({ ...threat, coneX: 2.55 }), null)
})

test("dodging before the last-second window does not qualify", () => {
  assert.equal(lateDodgeTimeToCone({ ...threat, coneZ: -10 }), null)
})

test("a second steer while already leaving the cone's lane does not qualify", () => {
  assert.equal(lateDodgeTimeToCone({ ...threat, busX: 0.8 }), null)
})

test("steering inside the cone's collision window is too late", () => {
  assert.equal(lateDodgeTimeToCone({ ...threat, coneZ: 2 }), null)
})
