import assert from "node:assert/strict"
import test from "node:test"
import {
  busDestinations,
  busSchedule,
  getBusNextDeparture,
  getBusSchedule,
  getScheduleType,
} from "../lib/data.ts"

// Independently transcribed from the three pages of the 1 October 2026 PDF.
const mondayToFriday = {
  TBS: { out: "18:15", in: "07:45" },
  KajangMRT: {
    out: "09:45 11:15 13:15 13:45 15:15 16:45 17:15 17:45 18:15 22:30",
    in: "08:00 08:15 08:45 13:00 16:00 18:30 20:00 21:30",
  },
  TTS: { out: "17:15", in: "08:30 08:45 08:45" },
  LOTUS: { out: "18:30", in: "21:00" },
  IOICityMall: { out: "", in: "" },
}
const weekend = {
  TBS: { out: "", in: "" },
  KajangMRT: { out: "08:30 12:00 15:00 19:00 21:30", in: "07:45 13:30 17:30 20:30 22:30" },
  TTS: { out: "", in: "" },
  LOTUS: { out: "", in: "" },
  MosquePGA: { out: "", in: "" },
  IOICityMall: { out: "12:30 14:30 18:45", in: "17:30 20:30 22:15" },
}

for (const [scheduleType, expected] of Object.entries({
  weekday: { ...mondayToFriday, MosquePGA: { out: "", in: "" } },
  friday: { ...mondayToFriday, MosquePGA: { out: "12:50", in: "14:00" } },
  weekend,
  publicHoliday: { ...weekend, IOICityMall: { out: "", in: "" } },
})) {
  test(`${scheduleType}: every route and direction matches the October timetable`, () => {
    assert.deepEqual(busDestinations.map(({ id }) => id).sort(), Object.keys(expected).sort())
    for (const [destination, directions] of Object.entries(expected)) {
      for (const [direction, times] of Object.entries(directions)) {
        assert.equal(
          getBusSchedule(destination, scheduleType, direction).map(({ time }) => time).join(" "),
          times,
          `${destination} ${direction}`,
        )
      }
    }
  })
}

test("TTS preserves simultaneous services and their different pick-up points", () => {
  for (const day of ["weekday", "friday"]) {
    assert.deepEqual(getBusSchedule("TTS", day, "in"), [
      { time: "08:30", serviceType: "bus", note: "Tiara East / Tetris Apartment" },
      { time: "08:45", serviceType: "van", note: "Near Qualitas Clinic, Setia Mayuri" },
      { time: "08:45", serviceType: "bus", note: "Tiara East / Tetris Apartment" },
    ])
    assert.equal(getBusSchedule("TBS", day, "in")[0].serviceType, "van")
    assert.equal(getBusSchedule("TTS", day, "out")[0].serviceType, "van")
  }
})

test("every schedule stays in departure order and has a unique rendered service key", () => {
  for (const route of Object.values(busSchedule)) {
    for (const day of ["weekday", "friday", "weekend", "publicHoliday"]) {
      for (const entries of Object.values(route[day])) {
        assert.deepEqual(entries.map(({ time }) => time), entries.map(({ time }) => time).sort())
        assert.equal(new Set(entries.map(({ time, serviceType }) => `${time}-${serviceType}`)).size, entries.length)
        assert.ok(entries.every(({ time, serviceType }) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time) && ["bus", "van"].includes(serviceType)))
      }
    }
  }
})

test("public holidays override both Friday prayers and weekend IOI services", () => {
  assert.equal(getScheduleType(new Date(2026, 9, 2, 9)), "friday")
  assert.equal(getScheduleType(new Date(2026, 9, 3, 9)), "weekend")
  assert.equal(getScheduleType(new Date(2026, 9, 1, 9)), "weekday")
  for (const day of [1, 2, 3]) {
    assert.equal(getScheduleType(new Date(2026, 9, day, 9), true), "publicHoliday")
  }
  for (const destination of ["TBS", "TTS", "LOTUS", "MosquePGA", "IOICityMall"]) {
    assert.equal(getBusNextDeparture(destination, "publicHoliday", "out", new Date(2026, 9, 2, 7)), null)
  }
})

test("next departure uses the revised times, including the last trip", () => {
  assert.equal(getBusNextDeparture("KajangMRT", "weekday", "out", new Date(2026, 9, 1, 9)), "09:45")
  assert.equal(getBusNextDeparture("KajangMRT", "friday", "out", new Date(2026, 9, 2, 18, 16)), "22:30")
  assert.equal(getBusNextDeparture("TBS", "friday", "out", new Date(2026, 9, 2, 18, 16)), null)
  assert.equal(getBusNextDeparture("TTS", "weekday", "in", new Date(2026, 9, 1, 8, 31)), "08:45")
  assert.equal(getBusNextDeparture("KajangMRT", "publicHoliday", "out", new Date(2026, 9, 2, 7)), "08:30")
})

test("removed services are unavailable and Friday prayer bus counts are preserved", () => {
  assert.deepEqual(getBusSchedule("MosqueAlItt", "friday", "out"), [])
  for (const direction of ["out", "in"]) {
    assert.equal(getBusSchedule("MosquePGA", "friday", direction)[0].note, "3 buses depart together")
  }
})
