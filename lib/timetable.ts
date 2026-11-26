import { z } from "zod"
import { ANNOUNCEMENT_LIMITS, type Announcement } from "./announcement.ts"
import {
  busDestinations,
  busScheduleLabels,
  defaultTimetable,
  type BusRouteSchedule,
  type ScheduleEntry,
  type ScheduleType,
  type Timetable,
} from "./data.ts"

const SCHEDULE_TYPES: ScheduleType[] = ["weekday", "friday", "weekend", "publicHoliday"]

const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Enter a time in 24-hour HH:MM format")

const entrySchema = z
  .object({
    time,
    serviceType: z.enum(["bus", "van"]),
    note: z.string().max(200).optional(),
    saturdayOnly: z.boolean().optional(),
    sundayOnly: z.boolean().optional(),
  })
  .refine((entry) => !(entry.saturdayOnly && entry.sundayOnly), "A departure can't be both Saturday-only and Sunday-only")

const directionSchema = z.object({ out: z.array(entrySchema).max(100), in: z.array(entrySchema).max(100) })

const routeSchema = z.object({
  weekday: directionSchema,
  friday: directionSchema,
  weekend: directionSchema,
  publicHoliday: directionSchema,
  notes: z.union([z.string().max(2000), z.object({ out: z.string().max(2000), in: z.string().max(2000) })]),
})

const timetableSchema = z.object({
  bus: z.record(z.string(), routeSchema),
  buggy: z.object({ times: z.array(time).max(100), fridayExceptions: z.array(time).max(100) }),
})

export type ParseResult = { ok: true; timetable: Timetable } | { ok: false; error: string }

/** Turns a zod path like bus.KajangMRT.weekday.out.2.time into "Kajang KTM/MRT Station · Weekday · From campus · row 3". */
function describePath(path: (string | number)[]): string {
  if (path[0] === "buggy") return typeof path[2] === "number" ? `Buggy · row ${path[2] + 1}` : "Buggy"
  const [, destination, scheduleType, direction, row] = path
  const parts = [busDestinations.find(({ id }) => id === destination)?.name ?? String(destination ?? "Bus")]
  if (typeof scheduleType === "string" && scheduleType in busScheduleLabels) {
    parts.push(busScheduleLabels[scheduleType as ScheduleType])
  }
  if (direction === "out" || direction === "in") parts.push(direction === "out" ? "From campus" : "To campus")
  if (typeof row === "number") parts.push(`row ${row + 1}`)
  return parts.join(" · ")
}

function cleanEntries(entries: ScheduleEntry[], allowDayLimits: boolean): ScheduleEntry[] {
  return [...entries]
    .sort((a, b) => a.time.localeCompare(b.time))
    .map(({ time, serviceType, note, saturdayOnly, sundayOnly }) => {
      const trimmedNote = note?.trim()
      return {
        time,
        serviceType,
        ...(trimmedNote ? { note: trimmedNote } : {}),
        // Saturday/Sunday-only flags only make sense on the weekend timetable.
        ...(allowDayLimits && saturdayOnly ? { saturdayOnly: true } : {}),
        ...(allowDayLimits && sundayOnly ? { sundayOnly: true } : {}),
      }
    })
}

function findDuplicate(entries: ScheduleEntry[]): ScheduleEntry | undefined {
  const seen = new Set<string>()
  return entries.find(({ time, serviceType }) => {
    const key = `${time}-${serviceType}`
    if (seen.has(key)) return true
    seen.add(key)
    return false
  })
}

/**
 * Validates an admin-submitted timetable and normalises it: departures are sorted (next-departure
 * lookups depend on it), notes trimmed, unknown routes dropped and missing routes filled from the defaults.
 */
export function parseTimetable(input: unknown): ParseResult {
  const result = timetableSchema.safeParse(input)
  if (!result.success) {
    const issue = result.error.issues[0]
    return { ok: false, error: `${describePath(issue.path)}: ${issue.message}` }
  }

  const bus: Record<string, BusRouteSchedule> = {}
  for (const { id } of busDestinations) {
    const route = result.data.bus[id] ?? defaultTimetable.bus[id]
    const cleaned = {} as BusRouteSchedule
    for (const scheduleType of SCHEDULE_TYPES) {
      cleaned[scheduleType] = {
        out: cleanEntries(route[scheduleType].out, scheduleType === "weekend"),
        in: cleanEntries(route[scheduleType].in, scheduleType === "weekend"),
      }
      for (const direction of ["out", "in"] as const) {
        const duplicate = findDuplicate(cleaned[scheduleType][direction])
        if (duplicate) {
          return {
            ok: false,
            error: `${describePath(["bus", id, scheduleType, direction])}: ${duplicate.time} (${duplicate.serviceType}) is listed twice`,
          }
        }
      }
    }
    cleaned.notes =
      typeof route.notes === "string" ? route.notes.trim() : { out: route.notes.out.trim(), in: route.notes.in.trim() }
    bus[id] = cleaned
  }

  const times = [...new Set(result.data.buggy.times)].sort()
  const fridayExceptions = [...new Set(result.data.buggy.fridayExceptions)].filter((t) => times.includes(t)).sort()

  return { ok: true, timetable: { bus, buggy: { times, fridayExceptions } } }
}

const announcementSchema = z.object({
  tone: z.enum(["info", "warning", "alert", "success"]),
  title: z
    .string()
    .trim()
    .max(ANNOUNCEMENT_LIMITS.title, `Keep the title under ${ANNOUNCEMENT_LIMITS.title} characters`)
    .optional(),
  message: z
    .string()
    .trim()
    .min(1, "Write a message")
    .max(ANNOUNCEMENT_LIMITS.message, `Keep the message under ${ANNOUNCEMENT_LIMITS.message} characters`),
  linkUrl: z
    .string()
    .trim()
    .max(ANNOUNCEMENT_LIMITS.linkUrl)
    // Only web links: anything else (e.g. javascript:) could run code for every visitor.
    .refine((url) => url === "" || /^https?:\/\/\S+$/i.test(url), "Links must start with http:// or https://")
    .optional(),
  linkLabel: z.string().trim().max(ANNOUNCEMENT_LIMITS.linkLabel, "Keep the link text short").optional(),
})

export type AnnouncementResult = { ok: true; announcement: Announcement | null } | { ok: false; error: string }

/** Validates the announcement banner; null/undefined means no banner. Blank optional fields are dropped. */
export function parseAnnouncement(input: unknown): AnnouncementResult {
  if (input === null || input === undefined) return { ok: true, announcement: null }
  const result = announcementSchema.safeParse(input)
  if (!result.success) return { ok: false, error: `Announcement: ${result.error.issues[0].message}` }
  const { tone, title, message, linkUrl, linkLabel } = result.data
  return {
    ok: true,
    announcement: {
      tone,
      ...(title ? { title } : {}),
      message,
      ...(linkUrl ? { linkUrl, ...(linkLabel ? { linkLabel } : {}) } : {}),
    },
  }
}
