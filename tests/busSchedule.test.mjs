import assert from "node:assert/strict"
import test from "node:test"
import {
  busDestinations,
  busSchedule,
  getBusNextDeparture,
  getBusSchedule,
  getScheduleType,
} from "../lib/data.ts"

// Independently transcribed from the four pages of the 24 October 2026 PDF.
const mondayToThursday = {
  TBS: { out: "18:45", in: "07:45" },
  KajangMRT: {
    out: "09:00 11:15 13:15 13:45 15:15 16:45 17:15 17:45 18:45 20:45 22:30",
    in: "08:00 08:15 08:45 10:00 12:00 14:00 16:00 18:30 20:00 21:30",
  },
  TTS: { out: "10:00 11:20 12:00 14:20 15:00 16:00 17:00 18:30 19:45 22:30", in: "08:20 09:15 10:10 11:30 12:20 14:30 15:10 16:10 17:10 19:20 20:20" },
  LOTUS: { out: "19:00", in: "21:30" },
  IOICityMall: { out: "", in: "" },
}
const weekend = {
  TBS: { out: "", in: "" },
  KajangMRT: { out: "08:20 12:00 14:00 17:00 19:00 21:30", in: "07:20 10:30 13:00 15:00 17:30 18:30 20:30 22:30" },
  TTS: { out: "14:30 16:00 17:00 18:30 21:30 23:00", in: "08:30 10:00 11:00 11:30 12:00 13:45 18:00" },
  LOTUS: { out: "11:30 12:30", in: "15:15 16:15" },
  MosquePGA: { out: "", in: "" },
  IOICityMall: { out: "12:30 14:30 18:45", in: "17:30 20:30 22:15" },
}

for (const [scheduleType, expected] of Object.entries({
  weekday: { ...mondayToThursday, MosquePGA: { out: "", in: "" } },
  friday: { ...mondayToThursday, LOTUS: { out: "18:45 19:30", in: "21:15 22:00" }, MosquePGA: { out: "12:50", in: "14:00" } },
  weekend,
  publicHoliday: {
    ...weekend,
    TTS: { out: "14:30 16:00 17:00 18:30 21:30 23:00", in: "08:30 10:00 11:00 12:00 13:45 18:00" },
  },
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

test("TTS van and bus times match their separate service lists", () => {
  for (const day of ["weekday", "friday"]) {
    for (const [direction, serviceType, times] of [
      ["out", "van", "10:00 11:20 12:00 14:20 15:00 16:00 17:00"],
      ["out", "bus", "18:30 19:45 22:30"],
      ["in", "van", "09:15 10:10 11:30 14:30 15:10 16:10 17:10"],
      ["in", "bus", "08:20 12:20 19:20 20:20"],
    ]) {
      assert.equal(getBusSchedule("TTS", day, direction)
        .filter((entry) => entry.serviceType === serviceType)
        .map(({ time }) => time).join(" "), times)
    }
    assert.ok(getBusSchedule("TTS", day, "in").every(({ note }) => note === "Midlands"))
    assert.equal(getBusSchedule("TBS", day, "in")[0].serviceType, "van")
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

test("public holidays override Friday prayers and run the Saturday-style Route C, D and F services", () => {
  assert.equal(getScheduleType(new Date(2026, 9, 2, 9)), "friday")
  assert.equal(getScheduleType(new Date(2026, 9, 3, 9)), "weekend")
  assert.equal(getScheduleType(new Date(2026, 9, 1, 9)), "weekday")
  for (const day of [1, 2, 3]) {
    assert.equal(getScheduleType(new Date(2026, 9, day, 9), true), "publicHoliday")
  }
  for (const destination of ["TBS", "MosquePGA"]) {
    assert.equal(getBusNextDeparture(destination, "publicHoliday", "out", new Date(2026, 9, 2, 7)), null)
  }
  for (const [destination, first] of [["TTS", "14:30"], ["LOTUS", "11:30"], ["IOICityMall", "12:30"]]) {
    assert.equal(getBusNextDeparture(destination, "publicHoliday", "out", new Date(2026, 9, 2, 7)), first)
  }
})

test("next departure uses the revised times, including the last trip", () => {
  assert.equal(getBusNextDeparture("KajangMRT", "weekday", "out", new Date(2026, 9, 12, 8, 59)), "09:00")
  assert.equal(getBusNextDeparture("KajangMRT", "friday", "out", new Date(2026, 9, 9, 18, 46)), "20:45")
  assert.equal(getBusNextDeparture("TBS", "friday", "out", new Date(2026, 9, 9, 18, 46)), null)
  assert.equal(getBusNextDeparture("TTS", "weekday", "in", new Date(2026, 9, 12, 8, 21)), "09:15")
  assert.equal(getBusNextDeparture("KajangMRT", "publicHoliday", "out", new Date(2026, 9, 10, 7)), "08:20")
})

test("removed services are unavailable and Friday prayer bus counts are preserved", () => {
  assert.deepEqual(getBusSchedule("MosqueAlItt", "friday", "out"), [])
  for (const direction of ["out", "in"]) {
    assert.equal(getBusSchedule("MosquePGA", "friday", direction)[0].note, "3 buses depart together")
  }
})

test("LOTUS Saturday trips are excluded on Sunday but run on public holidays", () => {
  const saturday = new Date(2026, 9, 10, 10)
  const sunday = new Date(2026, 9, 11, 10)
  for (const [direction, times] of [["out", ["11:30", "12:30"]], ["in", ["15:15", "16:15"]]]) {
    assert.deepEqual(getBusSchedule("LOTUS", "weekend", direction, saturday).map(({ time }) => time), times)
    assert.deepEqual(getBusSchedule("LOTUS", "weekend", direction, sunday), [])
    assert.equal(getBusNextDeparture("LOTUS", "weekend", direction, saturday), times[0])
    assert.equal(getBusNextDeparture("LOTUS", "weekend", direction, sunday), null)
    assert.deepEqual(getBusSchedule("LOTUS", "publicHoliday", direction, sunday).map(({ time }) => time), times)
    assert.equal(getBusNextDeparture("LOTUS", "publicHoliday", direction, sunday), times[0])
  }
  assert.equal(getBusNextDeparture("LOTUS", "weekend", "out", new Date(2026, 9, 10, 12, 31)), null)
})


test("TTS weekend trips are filtered into Saturday and Sunday timetables", () => {
  const saturday = new Date(2026, 9, 24, 7)
  const sunday = new Date(2026, 9, 25, 7)
  const times = (date, direction) => getBusSchedule("TTS", "weekend", direction, date).map(({ time }) => time).join(" ")
  assert.equal(times(saturday, "out"), "14:30 16:00 17:00 18:30 21:30 23:00")
  assert.equal(times(sunday, "out"), "18:30 21:30 23:00")
  assert.equal(times(saturday, "in"), "08:30 10:00 11:00 12:00 13:45 18:00")
  assert.equal(times(sunday, "in"), "11:30 13:45 18:00")
  assert.equal(getBusNextDeparture("TTS", "weekend", "out", sunday), "18:30")
  assert.equal(getBusNextDeparture("TTS", "weekend", "in", sunday), "11:30")
})

test("Friday LOTUS has distinct times from Mon-Thu", () => {
  const friday = new Date(2026, 9, 16, 18, 46)
  assert.equal(getScheduleType(friday), "friday")
  assert.equal(getBusNextDeparture("LOTUS", "friday", "out", friday), "19:30")
  assert.equal(getBusNextDeparture("LOTUS", "weekday", "out", friday), "19:00")
  assert.equal(getBusNextDeparture("LOTUS", "friday", "in", new Date(2026, 9, 16, 21, 16)), "22:00")
  assert.equal(getBusNextDeparture("LOTUS", "weekend", "out", new Date(2026, 9, 10, 11, 31)), "12:30")
})

test("Kajang stop exceptions and IOI simultaneous bus counts match the 24 October PDF", () => {
  for (const day of ["weekday", "friday"]) {
    assert.deepEqual(getBusSchedule("KajangMRT", day, "out").filter(({ note }) => note)
      .map(({ time }) => time), ["16:45", "17:15", "17:45"])
    assert.ok(getBusSchedule("KajangMRT", day, "in").every(({ note }) => !note))
  }
  for (const day of ["weekend", "publicHoliday"]) {
    for (const direction of ["out", "in"]) {
      assert.ok(getBusSchedule("IOICityMall", day, direction).every(({ note }) => note === "2 buses depart together"))
    }
  }
})
