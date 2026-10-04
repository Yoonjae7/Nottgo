import assert from "node:assert/strict"
import test from "node:test"
import {
  busDestinations,
  busSchedule,
  getBusNextDeparture,
  getBusSchedule,
  getScheduleType,
} from "../lib/data.ts"

// Independently transcribed from the three pages of the 5 October 2026 PDF.
const mondayToFriday = {
  TBS: { out: "18:45", in: "07:45" },
  KajangMRT: {
    out: "09:45 11:15 13:15 13:45 15:15 16:45 17:15 17:45 18:45 20:45 22:30",
    in: "08:00 08:15 08:45 10:15 12:00 15:00 18:30 20:00 21:30",
  },
  TTS: { out: "17:15 18:30", in: "08:45 09:30 12:45 19:15 20:45" },
  LOTUS: { out: "19:00", in: "21:30" },
  IOICityMall: { out: "", in: "" },
}
const weekend = {
  TBS: { out: "", in: "" },
  KajangMRT: { out: "08:30 12:00 15:00 19:00 21:30", in: "07:45 13:30 17:30 20:30 22:30" },
  TTS: { out: "", in: "" },
  LOTUS: { out: "11:30", in: "15:15" },
  MosquePGA: { out: "", in: "" },
  IOICityMall: { out: "12:30 14:30 18:45", in: "17:30 20:30 22:15" },
}

for (const [scheduleType, expected] of Object.entries({
  weekday: { ...mondayToFriday, MosquePGA: { out: "", in: "" } },
  friday: { ...mondayToFriday, MosquePGA: { out: "12:50", in: "14:00" } },
  weekend,
  publicHoliday: { ...weekend, LOTUS: { out: "", in: "" }, IOICityMall: { out: "", in: "" } },
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

test("TTS revised van and bus times preserve their service types", () => {
  for (const day of ["weekday", "friday"]) {
    assert.deepEqual(getBusSchedule("TTS", day, "in"), [
      { time: "08:45", serviceType: "van", note: "Near Qualitas Clinic, Setia Mayuri" },
      { time: "09:30", serviceType: "van", note: "Near Qualitas Clinic, Setia Mayuri" },
      { time: "12:45", serviceType: "bus", note: "Tiara East / Tetris Apartment" },
      { time: "19:15", serviceType: "bus", note: "Tiara East / Tetris Apartment" },
      { time: "20:45", serviceType: "bus", note: "Tiara East / Tetris Apartment" },
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
  assert.equal(getBusNextDeparture("KajangMRT", "friday", "out", new Date(2026, 9, 9, 18, 46)), "20:45")
  assert.equal(getBusNextDeparture("TBS", "friday", "out", new Date(2026, 9, 9, 18, 46)), null)
  assert.equal(getBusNextDeparture("TTS", "weekday", "in", new Date(2026, 9, 1, 8, 31)), "08:45")
  assert.equal(getBusNextDeparture("KajangMRT", "publicHoliday", "out", new Date(2026, 9, 2, 7)), "08:30")
})

test("removed services are unavailable and Friday prayer bus counts are preserved", () => {
  assert.deepEqual(getBusSchedule("MosqueAlItt", "friday", "out"), [])
  for (const direction of ["out", "in"]) {
    assert.equal(getBusSchedule("MosquePGA", "friday", direction)[0].note, "3 buses depart together")
  }
})

test("LOTUS Saturday trips are excluded on Sunday and public holidays", () => {
  const saturday = new Date(2026, 9, 10, 10)
  const sunday = new Date(2026, 9, 11, 10)
  for (const [direction, time] of [["out", "11:30"], ["in", "15:15"]]) {
    assert.deepEqual(getBusSchedule("LOTUS", "weekend", direction, saturday).map(({ time }) => time), [time])
    assert.deepEqual(getBusSchedule("LOTUS", "weekend", direction, sunday), [])
    assert.equal(getBusNextDeparture("LOTUS", "weekend", direction, saturday), time)
    assert.equal(getBusNextDeparture("LOTUS", "weekend", direction, sunday), null)
    assert.deepEqual(getBusSchedule("LOTUS", "publicHoliday", direction, saturday), [])
    assert.equal(getBusNextDeparture("LOTUS", "publicHoliday", direction, saturday), null)
  }
  assert.equal(getBusNextDeparture("LOTUS", "weekend", "out", new Date(2026, 9, 10, 11, 31)), null)
})
