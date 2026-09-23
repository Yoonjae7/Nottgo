import assert from "node:assert/strict"
import test from "node:test"
import { isTightNearMiss, lateDodgeTimeToCone } from "../lib/nearMiss.ts"

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

test("a close, safe pass after a late dodge earns a near miss", () => {
  assert.equal(isTightNearMiss(1, 1.3, 1.5), true)
})

test("a comfortable lane-width clearance earns no near miss", () => {
  assert.equal(isTightNearMiss(1, 1.3, 2.55), false)
})

test("an ordinary pass without a marked dodge earns no near miss", () => {
  assert.equal(isTightNearMiss(null, 1.3, 1.5), false)
})

test("a late dodge still needs to clear the collision distance", () => {
  assert.equal(isTightNearMiss(1, 1.3, 1.07), false)
})

test("the close-pass reward expires after the dodge window", () => {
  assert.equal(isTightNearMiss(1, 1.71, 1.5), false)
})
