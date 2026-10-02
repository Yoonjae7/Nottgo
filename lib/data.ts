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

// Source: Shuttle Bus Schedule, effective 1 October 2026 (pages 1-3).
export const busSchedule: Record<string, BusRouteSchedule> = {
  TBS: {
    weekday: {
      out: [{ time: "18:15", serviceType: "bus" }],
      in: [{ time: "07:45", serviceType: "van" }],
    },
    friday: {
      out: [{ time: "18:15", serviceType: "bus" }],
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
        { time: "09:45", serviceType: "bus" },
        { time: "11:15", serviceType: "bus" },
        { time: "13:15", serviceType: "bus" },
        { time: "13:45", serviceType: "bus" },
        { time: "15:15", serviceType: "bus" },
        { time: "16:45", serviceType: "bus" },
        { time: "17:15", serviceType: "bus" },
        { time: "17:45", serviceType: "bus" },
        { time: "18:15", serviceType: "bus" },
        { time: "22:30", serviceType: "bus" },
      ],
      in: [
        { time: "08:00", serviceType: "bus", note: "Stops at TTS" },
        { time: "08:15", serviceType: "bus", note: "Stops at TTS" },
        { time: "08:45", serviceType: "bus" },
        { time: "13:00", serviceType: "bus" },
        { time: "16:00", serviceType: "bus" },
        { time: "18:30", serviceType: "bus" },
        { time: "20:00", serviceType: "bus" },
        { time: "21:30", serviceType: "bus" },
      ],
    },
    friday: {
      out: [
        { time: "09:45", serviceType: "bus" },
        { time: "11:15", serviceType: "bus" },
        { time: "13:15", serviceType: "bus" },
        { time: "13:45", serviceType: "bus" },
        { time: "15:15", serviceType: "bus" },
        { time: "16:45", serviceType: "bus" },
        { time: "17:15", serviceType: "bus" },
        { time: "17:45", serviceType: "bus" },
        { time: "18:15", serviceType: "bus" },
        { time: "22:30", serviceType: "bus" },
      ],
      in: [
        { time: "08:00", serviceType: "bus", note: "Stops at TTS" },
        { time: "08:15", serviceType: "bus", note: "Stops at TTS" },
        { time: "08:45", serviceType: "bus" },
        { time: "13:00", serviceType: "bus" },
        { time: "16:00", serviceType: "bus" },
        { time: "18:30", serviceType: "bus" },
        { time: "20:00", serviceType: "bus" },
        { time: "21:30", serviceType: "bus" },
      ],
    },
    weekend: {
      out: [
        { time: "08:30", serviceType: "bus" },
        { time: "12:00", serviceType: "bus" },
        { time: "15:00", serviceType: "bus" },
        { time: "19:00", serviceType: "bus" },
        { time: "21:30", serviceType: "bus" },
      ],
      in: [
        { time: "07:45", serviceType: "bus", note: "Stops at TTS" },
        { time: "13:30", serviceType: "bus", note: "Stops at TTS" },
        { time: "17:30", serviceType: "bus", note: "Stops at TTS" },
        { time: "20:30", serviceType: "bus", note: "Stops at TTS" },
        { time: "22:30", serviceType: "bus", note: "Stops at TTS" },
      ],
    },
    publicHoliday: {
      out: [
        { time: "08:30", serviceType: "bus" },
        { time: "12:00", serviceType: "bus" },
        { time: "15:00", serviceType: "bus" },
        { time: "19:00", serviceType: "bus" },
        { time: "21:30", serviceType: "bus" },
      ],
      in: [
        { time: "07:45", serviceType: "bus", note: "Stops at TTS" },
        { time: "13:30", serviceType: "bus", note: "Stops at TTS" },
        { time: "17:30", serviceType: "bus", note: "Stops at TTS" },
        { time: "20:30", serviceType: "bus", note: "Stops at TTS" },
        { time: "22:30", serviceType: "bus", note: "Stops at TTS" },
      ],
    },
    notes: {
      out: "Route B: MRT Sg. Jernih Station (Exit Gate B) and Kajang KTM/MRT Station (Exit Gate A, Jalan Reko). Pass and stop at MRT Sg. Jernih before proceeding to Kajang KTM/MRT. The weekend timetable also applies on public holidays.",
      in: "Route B: The 08:00 and 08:15 Monday-Friday departures stop at TTS before proceeding to campus. All weekend and public-holiday departures stop at TTS before proceeding to campus. Times shown are departures from Kajang, not TTS pick-up times.",
    },
  },
  TTS: {
    weekday: {
      out: [{ time: "17:15", serviceType: "van" }],
      in: [
        { time: "08:30", serviceType: "bus", note: "Tiara East / Tetris Apartment" },
        { time: "08:45", serviceType: "van", note: "Near Qualitas Clinic, Setia Mayuri" },
        { time: "08:45", serviceType: "bus", note: "Tiara East / Tetris Apartment" },
      ],
    },
    friday: {
      out: [{ time: "17:15", serviceType: "van" }],
      in: [
        { time: "08:30", serviceType: "bus", note: "Tiara East / Tetris Apartment" },
        { time: "08:45", serviceType: "van", note: "Near Qualitas Clinic, Setia Mayuri" },
        { time: "08:45", serviceType: "bus", note: "Tiara East / Tetris Apartment" },
      ],
    },
    weekend: { out: [], in: [] },
    publicHoliday: { out: [], in: [] },
    notes: {
      out: "Route C: Monday-Friday van service. Pass and stop at Tiara East and Tetris Apartment. No dedicated Route C service on weekends or public holidays. Weekend IOI City Mall buses (Route F) stop at TTS on the way to IOI; no TTS pick-up times are published. Route F does not run on public holidays.",
      in: "Route C: The 08:45 van passes the roadside near Qualitas Clinic, Setia Mayuri. The 08:30 and 08:45 buses stop at Tiara East and Tetris Apartment. No dedicated Route C service on weekends or public holidays; Kajang buses (Route B) stop at TTS en route to campus. Weekend IOI buses (Route F) also stop at TTS en route to campus, except on public holidays. Connecting services do not publish TTS pick-up times.",
    },
  },
  LOTUS: {
    weekday: {
      out: [{ time: "18:30", serviceType: "bus" }],
      in: [{ time: "21:00", serviceType: "bus" }],
    },
    friday: {
      out: [{ time: "18:30", serviceType: "bus" }],
      in: [{ time: "21:00", serviceType: "bus" }],
    },
    weekend: { out: [], in: [] },
    publicHoliday: { out: [], in: [] },
    notes: {
      out: "Route D: Monday-Friday only. Pass and stop at Ecohill Walk Mall after LOTUS Semenyih. No service on weekends or public holidays.",
      in: "Route D: Monday-Friday only. Pass and stop at Ecohill Walk Mall before proceeding to campus. No service on weekends or public holidays.",
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
    notes: "Route E: Friday prayer service to PGA Mosque only. Three buses depart simultaneously at 12:50 from campus and at 14:00 from the mosque. No service on public holidays.",
  },
  IOICityMall: {
    weekday: { out: [], in: [] },
    friday: { out: [], in: [] },
    weekend: {
      out: [
        { time: "12:30", serviceType: "bus" },
        { time: "14:30", serviceType: "bus" },
        { time: "18:45", serviceType: "bus" },
      ],
      in: [
        { time: "17:30", serviceType: "bus" },
        { time: "20:30", serviceType: "bus" },
        { time: "22:15", serviceType: "bus" },
      ],
    },
    publicHoliday: { out: [], in: [] },
    notes: {
      out: "Route F: Weekends only; not available on public holidays. Pass and stop at TTS before proceeding to IOI City Mall.",
      in: "Route F: Weekends only; not available on public holidays. Pass and stop at TTS before proceeding to campus.",
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
): ScheduleEntry[] {
  return busSchedule[destination]?.[scheduleType]?.[direction] || []
}

export function getBusNextDeparture(
  destination: string,
  scheduleType: ScheduleType,
  direction: "out" | "in",
  currentTime: Date,
): string | null {
  const scheduleEntries = getBusSchedule(destination, scheduleType, direction)
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
