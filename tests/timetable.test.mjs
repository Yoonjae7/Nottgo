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
import { parseAnnouncement, parseTimetable } from "../lib/timetable.ts"
import { describeChanges, describeContentChanges } from "../lib/timetableDiff.ts"

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

test("announcements are validated, trimmed and only allow web links", () => {
  assert.deepEqual(parseAnnouncement(null), { ok: true, announcement: null })
  assert.deepEqual(
    parseAnnouncement({ tone: "warning", title: "  ", message: "  Buses delayed  ", linkUrl: "", linkLabel: "Ignored" }),
    { ok: true, announcement: { tone: "warning", message: "Buses delayed" } },
  )
  assert.deepEqual(
    parseAnnouncement({ tone: "info", message: "See", linkUrl: "https://nottingham.edu.my", linkLabel: "Details" }),
    { ok: true, announcement: { tone: "info", message: "See", linkUrl: "https://nottingham.edu.my", linkLabel: "Details" } },
  )
  assert.equal(parseAnnouncement({ tone: "info", message: "x", linkUrl: "javascript:alert(1)" }).ok, false)
  assert.equal(parseAnnouncement({ tone: "info", message: "   " }).ok, false)
  assert.equal(parseAnnouncement({ tone: "party", message: "x" }).ok, false)
  assert.equal(parseAnnouncement({ tone: "info", message: "x".repeat(281) }).ok, false)
})

test("the change log describes timetable and announcement edits in plain words", () => {
  const after = clone()
  after.bus.KajangMRT.friday.out = [
    ...after.bus.KajangMRT.friday.out.filter(({ time }) => time !== "18:45"),
    { time: "19:30", serviceType: "bus" },
  ]
  after.bus.TBS.weekday.in[0].serviceType = "bus"
  after.bus.LOTUS.notes.out = "New note"
  after.buggy = { times: [...after.buggy.times.filter((t) => t !== "17:00"), "17:30"], fridayExceptions: ["12:30", "13:00", "13:30"] }

  assert.deepEqual(describeChanges(defaultTimetable, after), [
    "TBS · Weekday (Mon-Thu) · to campus: edited 07:45",
    "Kajang KTM/MRT Station · Friday · from campus: added 19:30; removed 18:45",
    "LOTUS, Semenyih · notes from campus edited",
    "Buggy: added 17:30; removed 17:00; now runs on Fridays at 14:00",
  ])
  assert.deepEqual(describeChanges(defaultTimetable, clone()), [])

  const reordered = clone()
  reordered.bus.KajangMRT.weekday.out.reverse()
  assert.deepEqual(describeChanges(defaultTimetable, reordered), [])

  const before = { timetable: defaultTimetable, announcement: null }
  const posted = { timetable: defaultTimetable, announcement: { tone: "info", title: "Holiday", message: "No buses" } }
  assert.deepEqual(describeContentChanges(before, posted), ['Announcement posted: "Holiday"'])
  assert.deepEqual(describeContentChanges(posted, { ...posted, announcement: { ...posted.announcement, tone: "alert" } }), [
    'Announcement edited: "Holiday"',
  ])
  assert.deepEqual(describeContentChanges(posted, before), ["Announcement removed"])
})

test("the store publishes versions, keeps history, refuses stale edits and restores old versions", async () => {
  for (const name of ["KV_REST_API_URL", "KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"]) {
    delete process.env[name]
  }
  const originalCwd = process.cwd()
  const dir = await mkdtemp(path.join(tmpdir(), "nottgo-timetable-"))
  process.chdir(dir)
  try {
    const store = await import("../lib/timetableStore.ts")
    const original = { timetable: defaultTimetable, announcement: null, version: 0, custom: false, updatedAt: null }
    assert.deepEqual(await store.readLiveState(), original)
    assert.deepEqual(await store.readHistory(), [])

    // v1: only an announcement. The built-in timetable stays in charge (custom: false).
    const announcement = { tone: "warning", message: "Delays today" }
    const v1 = await store.publishContent({ timetable: clone(), announcement }, "Delay notice", 0)
    assert.equal(v1.state.version, 1)
    assert.equal(v1.state.custom, false)
    assert.deepEqual(v1.state.announcement, announcement)
    assert.deepEqual(v1.history.map(({ version, kind, message, changes }) => ({ version, kind, message, changes })), [
      { version: 1, kind: "publish", message: "Delay notice", changes: ['Announcement posted: "Delays today"'] },
    ])

    // v2: a timetable edit.
    const edited = clone()
    edited.buggy = { times: ["10:00"], fridayExceptions: [] }
    const v2 = await store.publishContent({ timetable: edited, announcement }, "", 1)
    assert.equal(v2.state.custom, true)
    assert.deepEqual((await store.readLiveState()).timetable.buggy, edited.buggy)

    // Someone still looking at v1 can't overwrite v2, and publishing nothing new is refused.
    await assert.rejects(store.publishContent({ timetable: clone(), announcement: null }, "", 1), { status: 409 })
    await assert.rejects(store.publishContent({ timetable: edited, announcement }, "", 2), { status: 400 })

    // Restoring v1 brings back the built-in timetable with v1's announcement, as a new version.
    const v3 = await store.restoreVersion(1, 2)
    assert.equal(v3.state.version, 3)
    assert.equal(v3.state.custom, false)
    assert.deepEqual(v3.state.announcement, announcement)
    assert.deepEqual(v3.history[0].kind, "restore")
    assert.deepEqual(v3.history[0].restoredFrom, 1)
    await assert.rejects(store.restoreVersion(1, 3), { status: 400 })

    // Version 0 is the original content.
    const v4 = await store.restoreVersion(0, 3)
    assert.deepEqual({ ...v4.state, updatedAt: null }, { ...original, version: 4 })
    assert.deepEqual((await store.readHistory()).map(({ version }) => version), [4, 3, 2, 1])
    await assert.rejects(store.restoreVersion(99, 4), { status: 404 })
  } finally {
    process.chdir(originalCwd)
    await rm(dir, { recursive: true, force: true })
  }
})

test("only the last MAX_VERSIONS versions are kept", async () => {
  const originalCwd = process.cwd()
  const dir = await mkdtemp(path.join(tmpdir(), "nottgo-timetable-"))
  process.chdir(dir)
  try {
    const store = await import("../lib/timetableStore.ts")
    let version = 0
    for (let i = 0; i < store.MAX_VERSIONS + 2; i++) {
      const announcement = { tone: "info", message: `Update ${i}` }
      version = (await store.publishContent({ timetable: clone(), announcement }, "", version)).state.version
    }
    const history = await store.readHistory()
    assert.equal(history.length, store.MAX_VERSIONS)
    assert.equal(history.at(-1).version, 3)
    await assert.rejects(store.restoreVersion(2, version), { status: 404 })
    assert.equal((await store.restoreVersion(3, version)).state.announcement.message, "Update 2")
  } finally {
    process.chdir(originalCwd)
    await rm(dir, { recursive: true, force: true })
  }
})
