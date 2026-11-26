import { announcementKey, type Announcement } from "./announcement.ts"
import {
  busDestinations,
  busScheduleLabels,
  type BusRouteSchedule,
  type ScheduleEntry,
  type ScheduleType,
  type Timetable,
} from "./data.ts"

const SCHEDULE_TYPES = Object.keys(busScheduleLabels) as ScheduleType[]
const DIRECTIONS = [
  ["out", "from campus"],
  ["in", "to campus"],
] as const

/** "Kajang KTM/MRT Station (Gate A)" -> "Kajang KTM/MRT Station" */
const shortName = (id: string) => (busDestinations.find((d) => d.id === id)?.name ?? id).split(" (")[0]
const showTime = (time: string) => time || "(no time)"
const sortedTimes = (times: Iterable<string>) => [...times].sort().map(showTime).join(", ")

/** Departures at the same time are compared as a group, so re-ordering rows is not a change. */
function groupByTime(entries: ScheduleEntry[]): Map<string, string> {
  const groups = new Map<string, string[]>()
  for (const { time, serviceType, note, saturdayOnly, sundayOnly } of entries) {
    const signature = JSON.stringify([serviceType, note?.trim() ?? "", !!saturdayOnly, !!sundayOnly])
    groups.set(time, [...(groups.get(time) ?? []), signature])
  }
  return new Map([...groups].map(([time, signatures]) => [time, signatures.sort().join("|")]))
}

function diffDepartures(before: ScheduleEntry[], after: ScheduleEntry[]): string[] {
  const was = groupByTime(before)
  const now = groupByTime(after)
  const added = [...now.keys()].filter((time) => !was.has(time))
  const removed = [...was.keys()].filter((time) => !now.has(time))
  const edited = [...now.keys()].filter((time) => was.has(time) && was.get(time) !== now.get(time))
  return [
    added.length ? `added ${sortedTimes(added)}` : "",
    removed.length ? `removed ${sortedTimes(removed)}` : "",
    edited.length ? `edited ${sortedTimes(edited)}` : "",
  ].filter(Boolean)
}

const noteFor = (notes: BusRouteSchedule["notes"], direction: "out" | "in") =>
  (typeof notes === "string" ? notes : notes[direction]).trim()

/**
 * Human-readable list of what changed between two timetables, one line per route/day/direction, e.g.
 * "Kajang KTM/MRT Station · Friday · from campus: added 19:30; removed 18:45".
 */
export function describeChanges(before: Timetable, after: Timetable): string[] {
  const changes: string[] = []

  for (const { id } of busDestinations) {
    const was = before.bus[id]
    const now = after.bus[id]
    if (!was || !now) continue
    for (const scheduleType of SCHEDULE_TYPES) {
      for (const [direction, label] of DIRECTIONS) {
        const parts = diffDepartures(was[scheduleType][direction], now[scheduleType][direction])
        if (parts.length) changes.push(`${shortName(id)} · ${busScheduleLabels[scheduleType]} · ${label}: ${parts.join("; ")}`)
      }
    }
    for (const [direction, label] of DIRECTIONS) {
      if (noteFor(was.notes, direction) !== noteFor(now.notes, direction)) {
        changes.push(`${shortName(id)} · notes ${label} edited`)
      }
    }
  }

  const wasTimes = new Set(before.buggy.times)
  const nowTimes = new Set(after.buggy.times)
  const wasSkipped = new Set(before.buggy.fridayExceptions)
  const nowSkipped = new Set(after.buggy.fridayExceptions)
  const added = [...nowTimes].filter((time) => !wasTimes.has(time))
  const removed = [...wasTimes].filter((time) => !nowTimes.has(time))
  const nowSkippedOnFriday = [...nowTimes].filter((time) => wasTimes.has(time) && nowSkipped.has(time) && !wasSkipped.has(time))
  const nowRunsOnFriday = [...nowTimes].filter((time) => wasTimes.has(time) && !nowSkipped.has(time) && wasSkipped.has(time))
  const buggyParts = [
    added.length ? `added ${sortedTimes(added)}` : "",
    removed.length ? `removed ${sortedTimes(removed)}` : "",
    nowSkippedOnFriday.length ? `no longer runs on Fridays at ${sortedTimes(nowSkippedOnFriday)}` : "",
    nowRunsOnFriday.length ? `now runs on Fridays at ${sortedTimes(nowRunsOnFriday)}` : "",
  ].filter(Boolean)
  if (buggyParts.length) changes.push(`Buggy: ${buggyParts.join("; ")}`)

  return changes
}

export function describeAnnouncementChange(before: Announcement | null, after: Announcement | null): string[] {
  if (!before && !after) return []
  if (!after) return ["Announcement removed"]
  const headline = after.title || after.message
  const quoted = `"${headline.length > 60 ? `${headline.slice(0, 57).trimEnd()}…` : headline}"`
  if (!before) return [`Announcement posted: ${quoted}`]
  return announcementKey(before) === announcementKey(after) ? [] : [`Announcement edited: ${quoted}`]
}

/** Everything that differs between two versions of the site: the announcement first, then timetable changes. */
export function describeContentChanges(
  before: { timetable: Timetable; announcement: Announcement | null },
  after: { timetable: Timetable; announcement: Announcement | null },
): string[] {
  return [
    ...describeAnnouncementChange(before.announcement, after.announcement),
    ...describeChanges(before.timetable, after.timetable),
  ]
}
