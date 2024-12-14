import { format, addMinutes, parse } from 'date-fns';

export const buggySchedule = [
  "08:30", "09:00", "09:30", "10:30", "11:00", "11:30",
  "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "17:00"
];

export const buggyStops = [
  "Trent Building",
  "Car Park Between Block D and Block E",
  "J Block",
  "F3 Building",
  "Walkway of H Block",
  "Cafeteria",
  "Sports Complex",
  "I Block"
];

export const busDestinations = [
  { id: "TBS", name: "TBS (Ter. Bersepadu Selatan)" },
  { id: "KajangMRT", name: "Kajang MRT Station" },
  { id: "TTS", name: "TTS (Taman Tasik Semenyih)" },
  { id: "LOTUS", name: "LOTUS, Semenyih" },
  { id: "Mosque", name: "Al-Ittihad Mosque, TTS / PGA Semenyih Pelangi Mosque" },
  { id: "KLTC", name: "KLTC (KL Teaching Centre)" },
  { id: "IOICityMall", name: "IOI City Mall, Putrajaya" },
];

export const busSchedule = {
  TBS: {
    weekday: {
      out: ["18:15"],
      in: ["07:45"]
    },
    weekend: {
      out: [],
      in: []
    },
    notes: "This service will only pass and stop at MRT Sg Jernih station. No service on public holiday or weekend."
  },
  KajangMRT: {
    weekday: {
      out: ["09:00", "11:15", "13:15", "13:45", "14:45", "15:15", "15:45", "16:15", "16:45", "17:15", "17:45", "18:15", "18:45", "19:15", "20:45", "22:30"],
      in: ["08:00", "08:15", "08:30", "10:15", "12:15", "14:15", "14:30", "16:30", "17:00", "18:00", "19:00", "20:00", "21:30"]
    },
    weekend: {
      out: ["07:30", "09:30", "11:30", "12:30", "14:30", "15:30", "16:30", "17:30", "18:30", "20:30", "22:30"],
      in: ["08:15", "10:30", "11:30", "12:30", "14:30", "15:15", "16:30", "17:15", "18:30", "19:30", "21:30", "23:30"]
    },
    notes: "This service will pass and stop at MRT Sg Jernih station before proceeding to Kajang KTM station."
  },
  TTS: {
    weekday: {
      out: ["09:30", "10:30", "11:30", "12:00", "12:30", "14:30", "15:00", "16:00", "17:00", "18:00", "18:30", "19:00", "20:00", "21:30", "22:45", "00:00"],
      in: ["08:00", "08:30", "09:40", "10:40", "11:40", "12:10", "12:40", "14:40", "15:10", "16:10", "17:10", "18:10", "18:40", "19:10", "20:10", "21:40", "22:40"]
    },
    weekend: {
      out: ["12:30", "14:30", "18:45", "21:30", "23:00"],
      in: ["09:30", "10:30", "14:30", "18:15", "21:15", "23:00"]
    },
    notes: "Weekday services use a mix of vans and buses. Weekend services have special routes."
  },
  LOTUS: {
    weekday: {
      out: ["18:30"],
      in: ["21:00"]
    },
    weekend: {
      out: ["11:30", "12:30"],
      in: ["15:15", "16:15"]
    },
    notes: "This service will stop by at Ecohill Walk Mall before arriving at LOTUS and before proceeding to Campus on return trips."
  },
  Mosque: {
    weekday: {
      out: ["12:45", "13:00", "13:15"],
      in: ["14:00"]
    },
    weekend: {
      out: [],
      in: []
    },
    notes: "Service available on Fridays only."
  },
  KLTC: {
    weekday: {
      out: ["08:00"],
      in: ["18:45"]
    },
    weekend: {
      out: ["08:00"],
      in: ["18:45"]
    },
    notes: "Service available every day, including public holidays."
  },
  IOICityMall: {
    weekday: {
      out: [],
      in: []
    },
    weekend: {
      out: ["12:30", "14:30", "18:45"],
      in: ["17:30", "20:30", "22:15"]
    },
    notes: "Service available on weekends only. This service will pass and stop at TTS first before proceeding to IOI City Mall. This service will pass and stop at TTS first before proceeding to campus."
  }
};

export function getBusSchedule(destination: string, day: 'weekday' | 'weekend', direction: 'out' | 'in'): string[] {
  return busSchedule[destination]?.[day]?.[direction] || [];
}

export function getBusNextDeparture(destination: string, day: 'weekday' | 'weekend', direction: 'out' | 'in', currentTime: Date): string | null {
  const times = getBusSchedule(destination, day, direction);
  const currentTimeString = format(currentTime, "HH:mm");
  return times.find(time => time > currentTimeString) || null;
}

export function getBuggyArrivalTimes(stop: string, day: string): string[] {
  const stopIndex = buggyStops.indexOf(stop);
  if (stopIndex === -1) return [];

  return buggySchedule.map(time => {
    const date = parse(time, 'HH:mm', new Date());
    const adjustedDate = addMinutes(date, 2 * stopIndex);
    return format(adjustedDate, 'HH:mm');
  });
}

export function getBuggyNextArrival(stop: string, currentTime: Date, day: string): string | null {
  const stopIndex = buggyStops.indexOf(stop);
  if (stopIndex === -1) return null;

  const currentTimeString = format(currentTime, "HH:mm");
  const adjustedTimes = buggySchedule.map(time => {
    const date = parse(time, 'HH:mm', new Date());
    const adjustedDate = addMinutes(date, 2 * stopIndex);
    return format(adjustedDate, 'HH:mm');
  });

  return adjustedTimes.find(time => time > currentTimeString) || null;
}

