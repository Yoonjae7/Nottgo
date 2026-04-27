import { format } from "date-fns"

/**
 * Timetable slot states (used by bus, buggy, full-schedule views):
 * - **grace** — the slot’s minute is the current wall-clock minute (e.g. any time 12:30:00–12:30:59 for a
 *   12:30 bus). This is the animated border “bus may still be here this minute,” not a specific second.
 * - **passed** — the clock has moved past that minute (from 12:31:00 for a 12:30 bus on bus; buggy uses
 *   the same “same minute = not passed” rule plus its overnight handling).
 * - **next** — next departure/arrival in the data model (solid ring). Checked before **grace** so a slot
 *   that is “next but not this minute” (e.g. 12:30 when it’s 12:29) is correct.
 */

export type ScheduleSlotVisual = "passed" | "next" | "grace" | "default"

export function getBusSlotVisual(
  slotTime: string,
  nextDeparture: string | null,
  now: Date,
): ScheduleSlotVisual {
  const hm = format(now, "HH:mm")
  if (slotTime < hm) return "passed"
  if (nextDeparture && slotTime === nextDeparture) return "next"
  if (slotTime === hm) return "grace"
  return "default"
}

/** Buggy: same wall minute as the slot = not “passed” (whole minute is grace or neutral for that cell). */
export function isBuggySlotPassed(slotTime: string, now: Date): boolean {
  if (slotTime === format(now, "HH:mm")) return false
  const [hours, minutes] = slotTime.split(":").map(Number)
  const t = new Date(now)
  const scheduleTime = new Date(t)
  scheduleTime.setHours(hours, minutes, 0, 0)
  if (hours === 0 || (hours < 6 && t.getHours() >= 20)) {
    scheduleTime.setDate(scheduleTime.getDate() + 1)
  }
  return scheduleTime < t
}

export function getBuggySlotVisual(
  slotTime: string,
  nextArrival: string | null,
  now: Date,
): ScheduleSlotVisual {
  if (isBuggySlotPassed(slotTime, now)) return "passed"
  if (nextArrival && slotTime === nextArrival) return "next"
  if (slotTime === format(now, "HH:mm")) return "grace"
  return "default"
}
