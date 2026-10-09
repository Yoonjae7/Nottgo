import { STOPS } from "./shuttleStops.ts"

export const CAMPUS_LOCATION = { lat: 2.943677, lng: 101.875867 }
// Campus SA Building, UNM assigned stopping points (June 2025):
// https://www.nottingham.edu.my/AboutUs/documents/Shuttle-bus-schedule/2025/Assigned-Stopping-Points-Updated-as-at-June-2025.pdf

export type JourneyTheme = "campus" | "neighbourhood" | "town" | "rail" | "city"
export type JourneyPalette = {
  sky: string
  ground: string
  road: string
  shoulder: string
  trees: string[]
  buildings: string[]
}

export type JourneyStage = {
  id: string
  label: string
  name: string
  theme: JourneyTheme
  scenery: JourneyTheme
  distanceKm: number
  startDistance: number
  length: number
  endDistance: number
  palette: JourneyPalette
}

export type JourneyProgress = {
  distance: number
  stageIndex: number
  stage: JourneyStage
  stageProgress: number
  nextStage: JourneyStage | null
}

export function distanceFromCampusKm(location: { lat: number; lng: number }): number {
  const radians = Math.PI / 180
  const latitudeDelta = (location.lat - CAMPUS_LOCATION.lat) * radians
  const longitudeDelta = (location.lng - CAMPUS_LOCATION.lng) * radians
  const a = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(CAMPUS_LOCATION.lat * radians) * Math.cos(location.lat * radians) * Math.sin(longitudeDelta / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const palettes: Record<JourneyTheme, JourneyPalette> = {
  campus: { sky: "#9dd9ef", ground: "#68a64c", road: "#303944", shoulder: "#d8d3c7", trees: ["#20854a", "#2f9d5b", "#438645", "#337659", "#4b954b"], buildings: ["#e6e0d2", "#d8e0e5", "#f3eee3"] },
  neighbourhood: { sky: "#b3dce8", ground: "#82985a", road: "#45494e", shoulder: "#c8c4b5", trees: ["#39764c", "#67814d", "#3c835d"], buildings: ["#e7cfaa", "#ebd9c3", "#d9b9a4", "#e5e1d4"] },
  town: { sky: "#c2dce7", ground: "#a4a179", road: "#40434a", shoulder: "#d2c9b9", trees: ["#4a7953", "#688355", "#557e5f"], buildings: ["#d2bca5", "#eedbbd", "#cfcfcb", "#d7baa9"] },
  rail: { sky: "#b5d3df", ground: "#979d87", road: "#414650", shoulder: "#c2c5c5", trees: ["#527452", "#567b61", "#74856a"], buildings: ["#a6b0ba", "#d2d6d9", "#bdc8ca", "#c6c0b8"] },
  city: { sky: "#c5d5e2", ground: "#9a9e90", road: "#353d49", shoulder: "#d0d1cd", trees: ["#526d52", "#63825f", "#64775f"], buildings: ["#b5c3d0", "#d5dce0", "#c1c5cc", "#a3b3c1"] },
}

const stopThemes: Record<string, JourneyTheme> = {
  tts: "neighbourhood", pga: "neighbourhood", lotus: "town", ecohill: "town",
  kajang: "rail", ioi: "city", tbs: "city",
}

const stopLabels: Record<string, string> = {
  tts: "TTS", pga: "PGA Mosque", lotus: "Lotus's",
  ecohill: "Ecohill Walk", kajang: "Kajang MRT", ioi: "IOI City Mall", tbs: "TBS",
}

let cursor = 380
// Stop ordering uses distance from campus. Stage lengths are compressed for an
// arcade run; this is scenery progression rather than a navigable shuttle route.
export const GAME_JOURNEY: JourneyStage[] = [
  { id: "campus", label: "Nottingham", name: "University of Nottingham Malaysia", theme: "campus", scenery: "campus", distanceKm: 0, startDistance: 0, length: cursor, endDistance: cursor, palette: palettes.campus },
  ...STOPS.map((stop) => ({ stop, distanceKm: distanceFromCampusKm(stop) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .map(({ stop, distanceKm }, index) => {
      const theme = stopThemes[stop.id]
      const length = index < 4 ? 300 : 380
      const startDistance = cursor
      cursor += length
      return { id: stop.id, label: stopLabels[stop.id], name: stop.name, theme, scenery: theme, distanceKm, startDistance, length, endDistance: cursor, palette: palettes[theme] }
    }),
]

export function getJourneyProgress(distance: number, stages: JourneyStage[] = GAME_JOURNEY): JourneyProgress {
  if (stages.length === 0) throw new Error("A scenery journey needs at least one stage")
  const safeDistance = Number.isFinite(distance) ? Math.max(0, distance) : 0
  let stageIndex = stages.length - 1
  for (let index = 0; index < stages.length; index++) {
    if (safeDistance < stages[index].endDistance) {
      stageIndex = index
      break
    }
  }
  const stage = stages[stageIndex]
  const stageProgress = Math.max(0, Math.min(1, (safeDistance - stage.startDistance) / stage.length))
  return { distance: safeDistance, stageIndex, stage, stageProgress, nextStage: stages[stageIndex + 1] ?? null }
}
