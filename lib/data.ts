import { format, addMinutes, parse } from "date-fns"

export const buggySchedule = [
  "09:30",
  "10:00",
  "10:30",
  "11:30",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
]

export const buggyStops = ["Trent Building", "Radius", "F3", "Block H", "Cafeteria", "Sports Complex", "Block I"]

// Times that don't run on Friday due to Friday Prayer
export const fridayExceptionTimes = ["12:30", "13:00", "13:30", "14:00"]

export type ScheduleType = "weekday" | "friday" | "weekend" | "publicHoliday"

export const busScheduleLabels: Record<ScheduleType, string> = {
  weekday: "Weekday (Mon-Thu)",
  friday: "Friday",
  weekend: "Weekend (Sat-Sun)",
  publicHoliday: "Public Holiday",
}

export type ServiceType = "bus" | "van" | "regular"

export interface ScheduleEntry {
  time: string
  serviceType: ServiceType
  note?: string
  saturdayOnly?: boolean
}

type DirectionSchedule = { out: ScheduleEntry[]; in: ScheduleEntry[] }
type BusRouteSchedule = Record<ScheduleType, DirectionSchedule> & {
  notes: string | { out: string; in: string }
}

export const busDestinations = [
  { id: "TBS", name: "TBS (Ter. Bersepadu Selatan, Level LG)" },
  { id: "KajangMRT", name: "Kajang KTM/MRT Station (Gate A)" },
  { id: "TTS", name: "TTS (Taman Tasik Semenyih)" },
  { id: "LOTUS", name: "LOTUS, Semenyih" },
  { id: "MosquePGA", name: "PGA Mosque, Semenyih Pelangi (Friday Only)" },
  { id: "IOICityMall", name: "IOI City Mall, Putrajaya" },
]

// Times: UNM Shuttle Bus Schedule, effective 10 October 2026 (pages 1-3).
export const busSchedule: Record<string, BusRouteSchedule> = {
  TBS: {
    weekday: {
      out: [{ time: "18:45", serviceType: "bus" }],
      in: [{ time: "07:45", serviceType: "van" }],
    },
    friday: {
      out: [{ time: "18:45", serviceType: "bus" }],
      in: [{ time: "07:45", serviceType: "van" }],
    },
    weekend: { out: [], in: [] },
    publicHoliday: { out: [], in: [] },
    notes: {
      out: "Route A: TBS pick-up and drop-off at Level LG. Pass and stop at MRT Sg. Jernih and Kajang KTM/MRT stations before proceeding to TBS. Monday-Friday only; no service on weekends or public holidays.",
      in: "Route A: Direct van service from TBS (Level LG) to campus. Monday-Friday only; no service on weekends or public holidays.",
    },
  },
  KajangMRT: {
    weekday: {
      out: [
        { time: "09:00", serviceType: "bus" },
        { time: "11:15", serviceType: "bus" },
        { time: "13:15", serviceType: "bus" },
        { time: "13:45", serviceType: "bus" },
        { time: "15:15", serviceType: "bus" },
        { time: "16:45", serviceType: "bus", note: "No MRT Sg. Jernih stop" },
        { time: "17:15", serviceType: "bus", note: "No MRT Sg. Jernih stop" },
        { time: "17:45", serviceType: "bus", note: "No MRT Sg. Jernih stop" },
        { time: "18:45", serviceType: "bus" },
        { time: "20:45", serviceType: "bus" },
        { time: "22:30", serviceType: "bus" },
      ],
      in: [
        { time: "08:00", serviceType: "bus" },
        { time: "08:15", serviceType: "bus" },
        { time: "08:45", serviceType: "bus" },
        { time: "10:00", serviceType: "bus" },
        { time: "12:00", serviceType: "bus" },
        { time: "14:00", serviceType: "bus" },
        { time: "16:00", serviceType: "bus" },
        { time: "18:30", serviceType: "bus" },
        { time: "20:00", serviceType: "bus" },
        { time: "21:30", serviceType: "bus" },
      ],
    },
    friday: {
      out: [
        { time: "09:00", serviceType: "bus" },
        { time: "11:15", serviceType: "bus" },
        { time: "13:15", serviceType: "bus" },
        { time: "13:45", serviceType: "bus" },
        { time: "15:15", serviceType: "bus" },
        { time: "16:45", serviceType: "bus", note: "No MRT Sg. Jernih stop" },
        { time: "17:15", serviceType: "bus", note: "No MRT Sg. Jernih stop" },
        { time: "17:45", serviceType: "bus", note: "No MRT Sg. Jernih stop" },
        { time: "18:45", serviceType: "bus" },
        { time: "20:45", serviceType: "bus" },
        { time: "22:30", serviceType: "bus" },
      ],
      in: [
        { time: "08:00", serviceType: "bus" },
        { time: "08:15", serviceType: "bus" },
        { time: "08:45", serviceType: "bus" },
        { time: "10:00", serviceType: "bus" },
        { time: "12:00", serviceType: "bus" },
        { time: "14:00", serviceType: "bus" },
        { time: "16:00", serviceType: "bus" },
        { time: "18:30", serviceType: "bus" },
        { time: "20:00", serviceType: "bus" },
        { time: "21:30", serviceType: "bus" },
      ],
    },
    weekend: {
      out: [
        { time: "08:45", serviceType: "bus" },
        { time: "12:00", serviceType: "bus" },
        { time: "14:00", serviceType: "bus" },
        { time: "17:00", serviceType: "bus" },
        { time: "19:00", serviceType: "bus" },
        { time: "21:30", serviceType: "bus" },
      ],
      in: [
        { time: "07:45", serviceType: "bus" },
        { time: "10:30", serviceType: "bus" },
        { time: "13:00", serviceType: "bus" },
        { time: "15:00", serviceType: "bus" },
        { time: "17:30", serviceType: "bus" },
        { time: "18:30", serviceType: "bus" },
        { time: "20:30", serviceType: "bus" },
        { time: "22:30", serviceType: "bus" },
      ],
    },
    publicHoliday: {
      out: [
        { time: "08:45", serviceType: "bus" },
        { time: "12:00", serviceType: "bus" },
        { time: "14:00", serviceType: "bus" },
        { time: "17:00", serviceType: "bus" },
        { time: "19:00", serviceType: "bus" },
        { time: "21:30", serviceType: "bus" },
      ],
      in: [
        { time: "07:45", serviceType: "bus" },
        { time: "10:30", serviceType: "bus" },
        { time: "13:00", serviceType: "bus" },
        { time: "15:00", serviceType: "bus" },
        { time: "17:30", serviceType: "bus" },
        { time: "18:30", serviceType: "bus" },
        { time: "20:30", serviceType: "bus" },
        { time: "22:30", serviceType: "bus" },
      ],
    },
    notes: {
      out: "Route B: Pick-up and drop-off at Kajang KTM/MRT Station (Exit Gate A, Jalan Reko). Drop-off only at MRT Sg. Jernih Station (Exit Gate B), except the 16:45, 17:15 and 17:45 Monday-Friday departures, which do not stop there. The weekend timetable also applies on public holidays.",
      in: "Route B: Pick-up at Kajang KTM/MRT Station (Exit Gate A, Jalan Reko) for the return to campus. Times shown are departures from Kajang.",
    },
  },
  TTS: {
    weekday: {
      out: [
        { time: "10:00", serviceType: "van" },
        { time: "11:20", serviceType: "van" },
        { time: "12:00", serviceType: "van" },
        { time: "14:20", serviceType: "van" },
        { time: "15:00", serviceType: "van" },
        { time: "16:00", serviceType: "van" },
        { time: "17:00", serviceType: "van" },
        { time: "18:30", serviceType: "bus" },
        { time: "19:45", serviceType: "bus" },
        { time: "21:30", serviceType: "bus" },
      ],
      in: [
        { time: "08:20", serviceType: "bus", note: "Rest 1, Setia Mayuri" },
        { time: "09:15", serviceType: "van", note: "Rest 1, Setia Mayuri" },
        { time: "10:10", serviceType: "van", note: "Rest 1, Setia Mayuri" },
        { time: "11:30", serviceType: "van", note: "Rest 1, Setia Mayuri" },
        { time: "12:20", serviceType: "bus", note: "Rest 1, Setia Mayuri" },
        { time: "14:30", serviceType: "van", note: "Rest 1, Setia Mayuri" },
        { time: "15:10", serviceType: "van", note: "Rest 1, Setia Mayuri" },
        { time: "16:20", serviceType: "bus", note: "Rest 1, Setia Mayuri" },
        { time: "19:20", serviceType: "bus", note: "Rest 1, Setia Mayuri" },
        { time: "20:20", serviceType: "bus", note: "Rest 1, Setia Mayuri" },
      ],
    },
    friday: {
      out: [
        { time: "10:00", serviceType: "van" },
        { time: "11:20", serviceType: "van" },
        { time: "12:00", serviceType: "van" },
        { time: "14:20", serviceType: "van" },
        { time: "15:00", serviceType: "van" },
        { time: "16:00", serviceType: "van" },
        { time: "17:00", serviceType: "van" },
        { time: "18:30", serviceType: "bus" },
        { time: "19:45", serviceType: "bus" },
        { time: "21:30", serviceType: "bus" },
      ],
      in: [
        { time: "08:20", serviceType: "bus", note: "Rest 1, Setia Mayuri" },
        { time: "09:15", serviceType: "van", note: "Rest 1, Setia Mayuri" },
        { time: "10:10", serviceType: "van", note: "Rest 1, Setia Mayuri" },
        { time: "11:30", serviceType: "van", note: "Rest 1, Setia Mayuri" },
        { time: "12:20", serviceType: "bus", note: "Rest 1, Setia Mayuri" },
        { time: "14:30", serviceType: "van", note: "Rest 1, Setia Mayuri" },
        { time: "15:10", serviceType: "van", note: "Rest 1, Setia Mayuri" },
        { time: "16:20", serviceType: "bus", note: "Rest 1, Setia Mayuri" },
        { time: "19:20", serviceType: "bus", note: "Rest 1, Setia Mayuri" },
        { time: "20:20", serviceType: "bus", note: "Rest 1, Setia Mayuri" },
      ],
    },
    weekend: { out: [], in: [] },
    publicHoliday: { out: [], in: [] },
    notes: {
      out: "Route C: Monday-Friday only. Vans provide pick-up and drop-off; buses provide drop-off at Rest 1 (Setia Mayuri), Tiara East, Tetris and TTS. No dedicated Route C service on weekends or public holidays. Weekend IOI City Mall services (Route F) also serve TTS 1, TTS 2 and TTS 3; no TTS pick-up times are published. Route F does not run on public holidays.",
      in: "Route C: First stop is Rest 1, Setia Mayuri. Vans and buses pick up at Rest 1, Tiara East, Tetris and TTS before proceeding to campus. No dedicated Route C service on weekends or public holidays. Saturday LOTUS services (Route D) and weekend IOI services (Route F) provide drop-off at TTS 1, TTS 2 and TTS 3; no TTS pick-up times are published for these services.",
    },
  },
  LOTUS: {
    weekday: {
      out: [{ time: "19:00", serviceType: "bus" }],
      in: [{ time: "21:30", serviceType: "bus" }],
    },
    friday: {
      out: [
        { time: "18:45", serviceType: "bus" },
        { time: "19:30", serviceType: "bus" },
      ],
      in: [
        { time: "21:15", serviceType: "bus" },
        { time: "22:00", serviceType: "bus" },
      ],
    },
    weekend: {
      out: [
        { time: "11:30", serviceType: "bus", note: "Saturday only", saturdayOnly: true },
        { time: "12:30", serviceType: "bus", note: "Saturday only", saturdayOnly: true },
      ],
      in: [
        { time: "15:15", serviceType: "bus", note: "Saturday only", saturdayOnly: true },
        { time: "16:15", serviceType: "bus", note: "Saturday only", saturdayOnly: true },
      ],
    },
    publicHoliday: { out: [], in: [] },
    notes: {
      out: "Route D: Monday-Friday and Saturday only. Drop-off at LOTUS Semenyih and Ecohill Walk Mall. No service on Sundays or public holidays.",
      in: "Route D: Monday-Friday and Saturday only. Pick-up at LOTUS Semenyih and Ecohill Walk Mall, then drop-off at TTS 1, TTS 2 and TTS 3 before proceeding to campus. No service on Sundays or public holidays.",
    },
  },
  MosquePGA: {
    weekday: { out: [], in: [] },
    friday: {
      out: [{ time: "12:50", serviceType: "bus", note: "3 buses depart together" }],
      in: [{ time: "14:00", serviceType: "bus", note: "3 buses depart together" }],
    },
    weekend: { out: [], in: [] },
    publicHoliday: { out: [], in: [] },
    notes: "Route E: Friday prayer service to PGA Mosque only. Pick-up and drop-off on campus at Islamic Centre (Block M). Three buses depart simultaneously at 12:50 from campus and at 14:00 from the mosque. No service on public holidays.",
  },
  IOICityMall: {
    weekday: { out: [], in: [] },
    friday: { out: [], in: [] },
    weekend: {
      out: [
        { time: "12:30", serviceType: "bus", note: "2 buses depart together" },
        { time: "14:30", serviceType: "bus", note: "2 buses depart together" },
        { time: "18:45", serviceType: "bus" },
      ],
      in: [
        { time: "17:30", serviceType: "bus" },
        { time: "20:30", serviceType: "bus", note: "2 buses depart together" },
        { time: "22:15", serviceType: "bus", note: "2 buses depart together" },
      ],
    },
    publicHoliday: { out: [], in: [] },
    notes: {
      out: "Route F: Weekends only; not available on public holidays. Pick-up at UNM and TTS 1, TTS 2 and TTS 3, then drop-off at IOI City Mall. Two buses depart simultaneously at 12:30 and 14:30.",
      in: "Route F: Weekends only; not available on public holidays. Pick-up at IOI City Mall, then drop-off at TTS 1, TTS 2 and TTS 3 before proceeding to campus. Two buses depart simultaneously at 20:30 and 22:15.",
    },
  },
}

export function getScheduleType(date: Date, isPublicHoliday = false): ScheduleType {
  if (isPublicHoliday) return "publicHoliday"
  const day = date.getDay()
  if (day === 0 || day === 6) return "weekend" // Sunday (0) or Saturday (6)
  if (day === 5) return "friday" // Friday (5)
  return "weekday" // Monday (1) through Thursday (4)
}

export function getBusSchedule(
  destination: string,
  scheduleType: ScheduleType,
  direction: "out" | "in",
  date?: Date,
): ScheduleEntry[] {
  const entries = busSchedule[destination]?.[scheduleType]?.[direction] || []
  // Without a date, return all slots for the full timetable, including Saturday-only trips.
  return date ? entries.filter((entry) => !entry.saturdayOnly || date.getDay() === 6) : entries
}

export function getBusNextDeparture(
  destination: string,
  scheduleType: ScheduleType,
  direction: "out" | "in",
  currentTime: Date,
): string | null {
  const scheduleEntries = getBusSchedule(destination, scheduleType, direction, currentTime)
  const currentTimeString = format(currentTime, "HH:mm")
  const nextEntry = scheduleEntries.find((entry) => entry.time > currentTimeString)
  return nextEntry ? nextEntry.time : null
}

export function getBuggyArrivalTimes(stopIndex: number, isFriday: boolean): string[] {
  if (stopIndex === -1) return []

  return buggySchedule
    .map((time) => {
      // Skip times that don't run on Friday
      if (isFriday && fridayExceptionTimes.includes(time)) {
        return null
      }

      const date = parse(time, "HH:mm", new Date())
      const adjustedDate = addMinutes(date, 3 * stopIndex) // 3 minutes per stop
      return format(adjustedDate, "HH:mm")
    })
    .filter((time): time is string => time !== null)
}

export function getBuggyNextArrival(stopIndex: number, currentTime: Date, isFriday: boolean): string | null {
  if (stopIndex === -1) return null

  const currentTimeString = format(currentTime, "HH:mm")
  const adjustedTimes = getBuggyArrivalTimes(stopIndex, isFriday)

  return adjustedTimes.find((time) => time > currentTimeString) || null
}
