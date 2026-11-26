import assert from "node:assert/strict"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"
import {
  defaultTimetable,
  describeFridayGap,
  getBuggyArrivalTimes,
  getBuggyNextArrival,
  getBusNextDeparture,
  getBusSchedule,
} from "../lib/data.ts"
import { parseTimetable } from "../lib/timetable.ts"

const clone = () => structuredClone(defaultTimetable)

test("the built-in timetable passes validation unchanged", () => {
  const result = parseTimetable(clone())
  assert.ok(result.ok)
  assert.deepEqual(result.timetable, defaultTimetable)
})

test("saved departures are sorted, notes trimmed and day limits kept only on weekends", () => {
  const input = clone()
  input.bus.KajangMRT.weekday.out = [
    { time: "21:00", serviceType: "bus", note: "  Last bus  " },
    { time: "07:30", serviceType: "van", note: "   ", saturdayOnly: true },
  ]
  input.bus.TTS.weekend.in = [{ time: "09:00", serviceType: "bus", sundayOnly: true }]
  input.bus.MosquePGA.notes = "  Friday only  "

  const result = parseTimetable(input)
  assert.ok(result.ok)
  assert.deepEqual(result.timetable.bus.KajangMRT.weekday.out, [
    { time: "07:30", serviceType: "van" },
    { time: "21:00", serviceType: "bus", note: "Last bus" },
  ])
  assert.deepEqual(result.timetable.bus.TTS.weekend.in, [{ time: "09:00", serviceType: "bus", sundayOnly: true }])
  assert.equal(result.timetable.bus.MosquePGA.notes, "Friday only")
})

test("bad input is rejected with a message that says where the problem is", () => {
  const blank = clone()
  blank.bus.KajangMRT.friday.in[2].time = ""
  assert.deepEqual(parseTimetable(blank), {
    ok: false,
    error: "Kajang KTM/MRT Station (Gate A) · Friday · To campus · row 3: Enter a time in 24-hour HH:MM format",
  })

  const duplicate = clone()
  duplicate.bus.TBS.weekday.out.push({ time: "18:45", serviceType: "bus" })
  assert.equal(parseTimetable(duplicate).ok, false)
  assert.match(parseTimetable(duplicate).error, /18:45 \(bus\) is listed twice/)

  const bothDays = clone()
  bothDays.bus.LOTUS.weekend.out[0].sundayOnly = true
  assert.equal(parseTimetable(bothDays).ok, false)

  const badBuggy = clone()
  badBuggy.buggy.times.push("25:00")
  assert.match(parseTimetable(badBuggy).error, /^Buggy · row 12:/)

  assert.equal(parseTimetable(null).ok, false)
  assert.equal(parseTimetable({ bus: {}, buggy: { times: [], fridayExceptions: [] }, extra: 1 }).ok, true)
})

test("unknown routes are dropped and missing routes fall back to the built-in timetable", () => {
  const input = clone()
  delete input.bus.LOTUS
  input.bus.Nowhere = input.bus.TBS
  const result = parseTimetable(input)
  assert.ok(result.ok)
  assert.equal(result.timetable.bus.Nowhere, undefined)
  assert.deepEqual(result.timetable.bus.LOTUS, defaultTimetable.bus.LOTUS)
})

test("buggy times are de-duplicated and Friday exceptions must be real departures", () => {
  const result = parseTimetable({
    bus: clone().bus,
    buggy: { times: ["15:00", "09:30", "15:00"], fridayExceptions: ["15:00", "12:30"] },
  })
  assert.ok(result.ok)
  assert.deepEqual(result.timetable.buggy, { times: ["09:30", "15:00"], fridayExceptions: ["15:00"] })
})

test("schedule lookups use an edited timetable when one is passed in", () => {
  const edited = clone()
  edited.bus.KajangMRT.weekday.out = [{ time: "10:05", serviceType: "van" }]
  const at = new Date(2026, 9, 12, 8, 59)
  assert.deepEqual(getBusSchedule("KajangMRT", "weekday", "out", at, edited.bus), [{ time: "10:05", serviceType: "van" }])
  assert.equal(getBusNextDeparture("KajangMRT", "weekday", "out", at, edited.bus), "10:05")
  assert.equal(getBusNextDeparture("KajangMRT", "weekday", "out", at), "09:00")

  const buggy = { times: ["08:00", "12:00", "16:00"], fridayExceptions: ["12:00"] }
  assert.deepEqual(getBuggyArrivalTimes(1, true, buggy), ["08:03", "16:03"])
  assert.equal(getBuggyNextArrival(0, new Date(2026, 9, 12, 9), false, buggy), "12:00")
})

test("the Friday buggy notice follows the configured exceptions", () => {
  assert.equal(describeFridayGap(defaultTimetable.buggy), "between 12:30 PM – 2:00 PM")
  assert.equal(describeFridayGap(defaultTimetable.buggy, "-"), "between 12:30 PM - 2:00 PM")
  assert.equal(describeFridayGap({ times: ["09:30", "10:00", "11:30"], fridayExceptions: ["09:30", "11:30"] }), "at 9:30 AM, 11:30 AM")
  assert.equal(describeFridayGap({ times: ["09:30"], fridayExceptions: [] }), null)
})

test("the local file store saves, reloads and resets the timetable", async () => {
  for (const name of ["KV_REST_API_URL", "KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"]) {
    delete process.env[name]
  }
  const originalCwd = process.cwd()
  const dir = await mkdtemp(path.join(tmpdir(), "nottgo-timetable-"))
  process.chdir(dir)
  try {
    const store = await import(`../lib/timetableStore.ts?cwd=${encodeURIComponent(dir)}`)
    assert.deepEqual(await store.readTimetableState(), { timetable: defaultTimetable, custom: false, updatedAt: null })

    const edited = clone()
    edited.buggy = { times: ["10:00"], fridayExceptions: [] }
    const saved = await store.saveTimetable(edited)
    assert.equal(saved.custom, true)
    assert.deepEqual(await store.readTimetableState(), saved)

    assert.deepEqual(await store.resetTimetable(), { timetable: defaultTimetable, custom: false, updatedAt: null })
    assert.equal((await store.readTimetableState()).custom, false)
  } finally {
    process.chdir(originalCwd)
    await rm(dir, { recursive: true, force: true })
  }
})
