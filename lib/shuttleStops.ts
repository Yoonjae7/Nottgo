export type ShuttleStop = {
  id: string
  label: string
  name: string
  lat: number
  lng: number
}

// UNM assigned shuttle stopping points (June 2025). IOI uses the mapped mall
// location because the university stopping-point document omits its coordinate.
export const STOPS: ShuttleStop[] = [
  { id: "tbs", label: "TBS", name: "Terminal Bersepadu Selatan", lat: 3.07829, lng: 101.7111 },
  { id: "kajang", label: "KJG", name: "Kajang KTM/MRT - Gate A", lat: 2.98292, lng: 101.79007 },
  { id: "tts", label: "TTS", name: "Taman Tasik Semenyih", lat: 2.949533, lng: 101.872852 },
  { id: "lotus", label: "LOT", name: "Lotus's Semenyih", lat: 2.92892, lng: 101.85602 },
  { id: "ecohill", label: "ECO", name: "Ecohill Walk Mall", lat: 2.92548, lng: 101.85747 },
  { id: "pga", label: "PGA", name: "PGA Semenyih Pelangi Mosque", lat: 2.95468, lng: 101.87299 },
  { id: "ioi", label: "IOI", name: "IOI City Mall, Putrajaya", lat: 2.96946, lng: 101.71421 },
]

export const DESTINATION_STOP_IDS: Record<string, string[]> = {
  TBS: ["tbs"],
  KajangMRT: ["kajang"],
  TTS: ["tts"],
  LOTUS: ["lotus", "ecohill"],
  MosquePGA: ["pga"],
  IOICityMall: ["ioi"],
}
