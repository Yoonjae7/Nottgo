/** Eup / EUPFIN fleet API — server-side only. See OpenAPI: login → session → car_status. */

export const DEFAULT_EUP_BASE_URL = "https://my-slt.eupfin.com/Eup_Servlet_API_SOAP"

export type LoginResponseBody = {
  responseMsg?: string
  responseStatus?: number
  result?: {
    token?: string
    sessionId?: string
  }
  failResult?: unknown
}

export type CarStatusDto = {
  carUnicode?: string
  carNumber?: string
  logGisx?: number
  logGisy?: number
  logDTime?: string
  logSpeed?: number
  direct?: number
  address?: string
  county?: string
  district?: string
  roadName?: string
  status?: number
  statusKeepTime?: string
  turnOffStatus?: string
  driverName?: string
}

export type CarStatusResponseBody = {
  responseMsg?: string
  responseStatus?: number
  result?: CarStatusDto[]
  failResult?: CarStatusDto[]
}

let sessionCache: { sessionId: string; expiresAt: number } | null = null
/** Serialize concurrent logins when many plates are fetched in parallel */
let loginInFlight: Promise<string> | null = null

const SESSION_TTL_MS = 20 * 60 * 1000

function clearSessionCache() {
  sessionCache = null
}

/** Comma-separated plates from env or query (e.g. "ABC1234,XYZ999") */
export function parseEupCarNumbers(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Avoid hanging the API route if Eup is slow or unreachable */
const EUP_FETCH_TIMEOUT_MS = 22_000

function fetchTimeoutSignal() {
  return AbortSignal.timeout(EUP_FETCH_TIMEOUT_MS)
}

export async function eupLogin(baseUrl: string, token: string): Promise<string> {
  const url = `${baseUrl.replace(/\/$/, "")}/login/session?token=${encodeURIComponent(token)}`
  const res = await fetch(url, {
    method: "POST",
    headers: { Accept: "application/json" },
    signal: fetchTimeoutSignal(),
  })
  const data = (await res.json()) as LoginResponseBody
  if (!res.ok) {
    throw new Error(data.responseMsg || `Eup login failed (${res.status})`)
  }
  const sessionId = data.result?.sessionId
  if (!sessionId) {
    throw new Error("Eup login: missing sessionId in response")
  }
  sessionCache = { sessionId, expiresAt: Date.now() + SESSION_TTL_MS }
  return sessionId
}

async function getSessionId(baseUrl: string, token: string): Promise<string> {
  if (sessionCache && sessionCache.expiresAt > Date.now()) {
    return sessionCache.sessionId
  }
  if (loginInFlight) {
    return loginInFlight
  }
  loginInFlight = eupLogin(baseUrl, token).finally(() => {
    loginInFlight = null
  })
  return loginInFlight
}

export async function eupFetchCarStatus(
  baseUrl: string,
  token: string,
  carNumber: string,
): Promise<CarStatusResponseBody> {
  const tryOnce = async (sessionId: string) => {
    const url = `${baseUrl.replace(/\/$/, "")}/car/log_data/car_status?carNumber=${encodeURIComponent(carNumber)}`
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${sessionId}`,
      },
      signal: fetchTimeoutSignal(),
    })
    const data = (await res.json()) as CarStatusResponseBody
    return { res, data }
  }

  let sessionId = await getSessionId(baseUrl, token)
  let { res, data } = await tryOnce(sessionId)

  if (res.status === 401 || res.status === 403) {
    clearSessionCache()
    sessionId = await eupLogin(baseUrl, token)
    ;({ res, data } = await tryOnce(sessionId))
  }

  if (!res.ok) {
    throw new Error(data.responseMsg || `Eup car_status failed (${res.status})`)
  }
  return data
}

/** Convert API integer coords to WGS84 degrees */
export function eupCoordsToLatLng(logGisx?: number, logGisy?: number): { lat: number; lng: number } | null {
  if (logGisx == null || logGisy == null) return null
  return { lng: logGisx / 1_000_000, lat: logGisy / 1_000_000 }
}

const STATUS_LABELS: Record<number, string> = {
  0: "Normal",
  1: "In operation",
  2: "Engine off",
  3: "Inactive",
  4: "Overspeeding",
  5: "No signal",
  6: "Return to factory",
  7: "Departure from factory",
  8: "Standby",
  9: "Path exception",
  10: "Idling",
  11: "Engine on (in factory)",
  12: "Abnormal temperature",
  13: "Geofence",
  14: "None",
  15: "Prohibited road sections",
  16: "Improper stops",
  17: "Abnormal route",
}

export function eupStatusLabel(code?: number): string | undefined {
  if (code == null) return undefined
  return STATUS_LABELS[code] ?? `Status ${code}`
}
