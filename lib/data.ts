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

export type ScheduleType = "weekday" | "friday" | "weekend"

// Define service types for buses and vans
export type ServiceType = "bus" | "van" | "regular"

// Define a schedule entry with time and service type
export interface ScheduleEntry {
  time: string
  serviceType: ServiceType
}

export const busDestinations = [
  { id: "TBS", name: "TBS (Ter. Bersepadu Selatan)" },
  { id: "KajangMRT", name: "Kajang MRT Station" },
  { id: "TTS", name: "TTS (Taman Tasik Semenyih)" },
  { id: "LOTUS", name: "LOTUS, Semenyih" },
  { id: "MosqueAlItt", name: "Al-Itt'd Mosque, TTS (Friday Only)" },
  { id: "MosquePGA", name: "PGA Mosque, Semenyih Pelangi (Friday Only)" },
  { id: "IOICityMall", name: "IOI City Mall, Putrajaya" },
]

// Updated bus schedule with service types
export const busSchedule = {
  TBS: {
    weekday: {
      out: [{ time: "18:45", serviceType: "regular" }],
      in: [{ time: "07:45", serviceType: "regular" }],
    },
    friday: {
      out: [{ time: "18:45", serviceType: "regular" }],
      in: [{ time: "07:45", serviceType: "regular" }],
    },
    weekend: {
      out: [],
      in: [],
    },
    notes: "This service will only pass and stop at MRT Sg Jernih station. No service on public holiday or weekend.",
  },
  KajangMRT: {
    weekday: {
      out: [
        { time: "09:00", serviceType: "regular" },
        { time: "11:15", serviceType: "regular" },
        { time: "13:15", serviceType: "regular" },
        { time: "13:45", serviceType: "regular" },
        { time: "15:15", serviceType: "regular" },
        { time: "15:45", serviceType: "regular" },
        { time: "17:15", serviceType: "regular" },
        { time: "17:45", serviceType: "regular" },
        { time: "18:45", serviceType: "regular" },
        { time: "19:15", serviceType: "regular" },
        { time: "20:45", serviceType: "regular" },
        { time: "22:30", serviceType: "regular" },
      ],
      in: [
        { time: "08:00", serviceType: "regular" },
        { time: "08:15", serviceType: "regular" },
        { time: "08:30", serviceType: "regular" },
        { time: "10:15", serviceType: "regular" },
        { time: "12:15", serviceType: "regular" },
        { time: "14:15", serviceType: "regular" },
        { time: "14:30", serviceType: "regular" },
        { time: "16:30", serviceType: "regular" },
        { time: "17:00", serviceType: "regular" },
        { time: "18:30", serviceType: "regular" },
        { time: "19:00", serviceType: "regular" },
        { time: "20:00", serviceType: "regular" },
        { time: "21:30", serviceType: "regular" },
      ],
    },
    friday: {
      out: [
        { time: "09:00", serviceType: "regular" },
        { time: "11:15", serviceType: "regular" },
        { time: "13:15", serviceType: "regular" },
        { time: "13:45", serviceType: "regular" },
        { time: "14:45", serviceType: "regular" },
        { time: "15:15", serviceType: "regular" },
        { time: "15:45", serviceType: "regular" },
        { time: "16:15", serviceType: "regular" },
        { time: "16:45", serviceType: "regular" },
        { time: "17:15", serviceType: "regular" },
        { time: "17:45", serviceType: "regular" },
        { time: "18:45", serviceType: "regular" },
        { time: "19:15", serviceType: "regular" },
        { time: "20:45", serviceType: "regular" },
        { time: "22:30", serviceType: "regular" },
      ],
      in: [
        { time: "08:00", serviceType: "regular" },
        { time: "08:15", serviceType: "regular" },
        { time: "08:30", serviceType: "regular" },
        { time: "10:15", serviceType: "regular" },
        { time: "12:15", serviceType: "regular" },
        { time: "14:15", serviceType: "regular" },
        { time: "14:30", serviceType: "regular" },
        { time: "16:30", serviceType: "regular" },
        { time: "17:00", serviceType: "regular" },
        { time: "18:30", serviceType: "regular" },
        { time: "19:00", serviceType: "regular" },
        { time: "20:00", serviceType: "regular" },
        { time: "21:30", serviceType: "regular" },
      ],
    },
    weekend: {
      out: [
        { time: "07:30", serviceType: "regular" },
        { time: "09:30", serviceType: "regular" },
        { time: "11:30", serviceType: "regular" },
        { time: "12:30", serviceType: "regular" },
        { time: "14:30", serviceType: "regular" },
        { time: "15:30", serviceType: "regular" },
        { time: "16:30", serviceType: "regular" },
        { time: "17:30", serviceType: "regular" },
        { time: "18:30", serviceType: "regular" },
        { time: "20:30", serviceType: "regular" },
        { time: "22:30", serviceType: "regular" },
      ],
      in: [
        { time: "08:15", serviceType: "regular" },
        { time: "10:30", serviceType: "regular" },
        { time: "11:30", serviceType: "regular" },
        { time: "12:30", serviceType: "regular" },
        { time: "14:30", serviceType: "regular" },
        { time: "15:15", serviceType: "regular" },
        { time: "16:30", serviceType: "regular" },
        { time: "17:15", serviceType: "regular" },
        { time: "18:30", serviceType: "regular" },
        { time: "19:30", serviceType: "regular" },
        { time: "21:30", serviceType: "regular" },
        { time: "23:30", serviceType: "regular" },
      ],
    },
    notes: "Outbound - This service will pass and stop at MRT Sg Jernih station before proceeding to Kajang KTM station. Inbound - Bus pick up point is Gate A.",
  },
  TTS: {
    weekday: {
      out: [
        { time: "09:30", serviceType: "van" },
        { time: "10:30", serviceType: "van" },
        { time: "11:30", serviceType: "van" },
        { time: "12:00", serviceType: "bus" },
        { time: "12:30", serviceType: "bus" },
        { time: "14:30", serviceType: "bus" },
        { time: "15:00", serviceType: "bus" },
        { time: "16:00", serviceType: "bus" },
        { time: "17:00", serviceType: "bus" },
        { time: "18:00", serviceType: "bus" },
        { time: "18:30", serviceType: "bus" },
        { time: "19:00", serviceType: "bus" },
        { time: "20:00", serviceType: "bus" },
        { time: "21:30", serviceType: "bus" },
        { time: "22:45", serviceType: "bus" },
        { time: "00:00", serviceType: "bus" },
      ],
      in: [
        { time: "08:00", serviceType: "regular" },
        { time: "08:30", serviceType: "regular" },
        { time: "09:40", serviceType: "van" },
        { time: "10:40", serviceType: "van" },
        { time: "11:40", serviceType: "van" },
        { time: "12:10", serviceType: "bus" },
        { time: "12:40", serviceType: "bus" },
        { time: "14:40", serviceType: "bus" },
        { time: "15:10", serviceType: "bus" },
        { time: "16:10", serviceType: "bus" },
        { time: "17:10", serviceType: "bus" },
        { time: "18:10", serviceType: "bus" },
        { time: "18:40", serviceType: "bus" },
        { time: "19:10", serviceType: "bus" },
        { time: "20:10", serviceType: "bus" },
        { time: "21:40", serviceType: "bus" },
        { time: "22:40", serviceType: "bus" },
      ],
    },
    friday: {
      out: [
        { time: "09:30", serviceType: "van" },
        { time: "10:30", serviceType: "van" },
        { time: "11:30", serviceType: "van" },
        { time: "12:00", serviceType: "bus" },
        { time: "14:30", serviceType: "bus" },
        { time: "15:00", serviceType: "bus" },
        { time: "16:00", serviceType: "bus" },
        { time: "17:00", serviceType: "bus" },
        { time: "18:00", serviceType: "bus" },
        { time: "18:30", serviceType: "bus" },
        { time: "19:00", serviceType: "bus" },
        { time: "20:00", serviceType: "bus" },
        { time: "21:30", serviceType: "bus" },
        { time: "22:45", serviceType: "bus" },
        { time: "00:00", serviceType: "bus" },
      ],
      in: [
        { time: "08:00", serviceType: "regular" },
        { time: "08:30", serviceType: "regular" },
        { time: "09:40", serviceType: "van" },
        { time: "10:40", serviceType: "van" },
        { time: "11:40", serviceType: "van" },
        { time: "12:10", serviceType: "bus" },
        { time: "14:40", serviceType: "bus" },
        { time: "15:10", serviceType: "bus" },
        { time: "16:10", serviceType: "bus" },
        { time: "17:10", serviceType: "bus" },
        { time: "18:10", serviceType: "bus" },
        { time: "18:40", serviceType: "bus" },
        { time: "19:10", serviceType: "bus" },
        { time: "20:10", serviceType: "bus" },
        { time: "21:40", serviceType: "bus" },
        { time: "22:40", serviceType: "bus" },
      ],
    },
    weekend: {
      out: [
        { time: "12:30", serviceType: "regular" },
        { time: "14:30", serviceType: "regular" },
        { time: "18:45", serviceType: "regular" },
        { time: "21:30", serviceType: "regular" },
        { time: "23:00", serviceType: "regular" },
      ],
      in: [
        { time: "09:30", serviceType: "regular" },
        { time: "10:30", serviceType: "regular" },
        { time: "14:30", serviceType: "regular" },
        { time: "18:15", serviceType: "regular" },
        { time: "21:15", serviceType: "regular" },
        { time: "23:00", serviceType: "regular" },
      ],
    },
    notes:
      "Route #C1 & C2: Weekday and Friday services use a mix of vans (morning) and buses (afternoon/evening). Morning one-way service from TTS to UNM campus at 8:00 and 8:30. Weekend services have special routes.",
  },
  LOTUS: {
    weekday: {
      out: [{ time: "18:30", serviceType: "regular" }],
      in: [{ time: "21:00", serviceType: "regular" }],
    },
    friday: {
      out: [{ time: "18:30", serviceType: "regular" }],
      in: [{ time: "21:00", serviceType: "regular" }],
    },
    weekend: {
      out: [
        { time: "11:30", serviceType: "regular" },
        { time: "18:30", serviceType: "regular" },
      ],
      in: [
        { time: "15:15", serviceType: "regular" },
        { time: "16:15", serviceType: "regular" },
      ],
    },
    notes:
      "Route #D: Outbound - This service will pass and stop at Ecohill Walk Mall after LOTUS Semenyih. Inbound - This service will pass and stop at Ecohill Walk Mall before proceeding to campus.",
  },
  MosqueAlItt: {
    weekday: {
      out: [],
      in: [],
    },
    friday: {
      out: [
        { time: "12:45", serviceType: "regular" },
        { time: "13:00", serviceType: "regular" },
        { time: "13:15", serviceType: "regular" },
      ],
      in: [{ time: "14:00", serviceType: "regular" }],
    },
    weekend: {
      out: [],
      in: [],
    },
    notes: "Service available on Fridays only for Friday Prayer.",
  },
  MosquePGA: {
    weekday: {
      out: [],
      in: [],
    },
    friday: {
      out: [
        { time: "12:45", serviceType: "regular" },
        { time: "13:00", serviceType: "regular" },
        { time: "13:15", serviceType: "regular" },
      ],
      in: [{ time: "14:00", serviceType: "regular" }],
    },
    weekend: {
      out: [],
      in: [],
    },
    notes: "Service available on Fridays only for Friday Prayer.",
  },
  IOICityMall: {
    weekday: {
      out: [],
      in: [],
    },
    friday: {
      out: [],
      in: [],
    },
    weekend: {
      out: [
        { time: "12:30", serviceType: "regular" },
        { time: "14:30", serviceType: "regular" },
        { time: "18:45", serviceType: "regular" },
      ],
      in: [
        { time: "17:30", serviceType: "regular" },
        { time: "20:30", serviceType: "regular" },
        { time: "22:15", serviceType: "regular" },
      ],
    },
    notes:
      "Service available on weekends only. This service will pass and stop at TTS first before proceeding to IOI City Mall. This service will pass and stop at TTS first before proceeding to campus.",
  },
}

export function getScheduleType(date: Date): ScheduleType {
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
