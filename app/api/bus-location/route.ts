import { NextResponse } from "next/server"
import {
  DEFAULT_EUP_BASE_URL,
  eupCoordsToLatLng,
  eupFetchCarStatus,
  eupStatusLabel,
  parseEupCarNumbers,
} from "@/lib/eup"

export const dynamic = "force-dynamic"

export type VehicleLocationPayload = {
  carNumber: string
  lat: number | null
  lng: number | null
  logDTime: string | null
  logSpeed: number | null
  direct: number | null
  address: string | null
  roadName: string | null
  status: number | null
  statusLabel?: string
  turnOffStatus: string | null
  driverName: string | null
  empty?: boolean
  message?: string
  error?: string
}

/**
 * GET /api/bus-location
 * ?carNumber=PLATE1,PLATE2 optional override (comma-separated)
 * Otherwise uses EUP_CAR_NUMBER (comma-separated for multiple buses)
 */
export async function GET(request: Request) {
  const token = process.env.EUP_TOKEN
  const baseUrl = process.env.EUP_BASE_URL?.trim() || DEFAULT_EUP_BASE_URL
  const { searchParams } = new URL(request.url)
  const queryPlates = searchParams.get("carNumber")
  const fromQuery = parseEupCarNumbers(queryPlates ?? undefined)
  const plates =
    fromQuery.length > 0 ? fromQuery : parseEupCarNumbers(process.env.EUP_CAR_NUMBER)

  if (!token) {
    return NextResponse.json(
      { ok: false as const, error: "Missing EUP_TOKEN (set in .env.local)" },
      { status: 503 },
    )
  }
  const authToken = token
  if (plates.length === 0) {
    return NextResponse.json(
      {
        ok: false as const,
        error:
          "Missing car number(s): set EUP_CAR_NUMBER to one or more plates separated by commas, or use ?carNumber=",
      },
      { status: 400 },
    )
  }

  async function fetchOne(plate: string): Promise<VehicleLocationPayload> {
    try {
      const data = await eupFetchCarStatus(baseUrl, authToken, plate)
      const row = data.result?.[0]
      if (!row) {
        return {
          carNumber: plate,
          lat: null,
          lng: null,
          logDTime: null,
          logSpeed: null,
          direct: null,
          address: null,
          roadName: null,
          status: null,
          turnOffStatus: null,
          driverName: null,
          empty: true,
          message: "No position for this plate (offline, wrong plate, or no access).",
        }
      }
      const latLng = eupCoordsToLatLng(row.logGisx, row.logGisy)
      return {
        carNumber: row.carNumber ?? plate,
        lat: latLng?.lat ?? null,
        lng: latLng?.lng ?? null,
        logDTime: row.logDTime ?? null,
        logSpeed: row.logSpeed ?? null,
        direct: row.direct ?? null,
        address: row.address ?? null,
        roadName: row.roadName ?? null,
        status: row.status ?? null,
        statusLabel: eupStatusLabel(row.status),
        turnOffStatus: row.turnOffStatus ?? null,
        driverName: row.driverName ?? null,
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error"
      return {
        carNumber: plate,
        lat: null,
        lng: null,
        logDTime: null,
        logSpeed: null,
        direct: null,
        address: null,
        roadName: null,
        status: null,
        turnOffStatus: null,
        driverName: null,
        empty: true,
        error: msg,
      }
    }
  }

  try {
    const vehicles = await Promise.all(plates.map((p) => fetchOne(p)))
    vehicles.sort((a, b) => a.carNumber.localeCompare(b.carNumber))
    return NextResponse.json({ ok: true as const, vehicles })
  } catch (e) {
    const aborted =
      e instanceof Error && (e.name === "AbortError" || /abort|timeout/i.test(e.message))
    if (aborted) {
      return NextResponse.json(
        {
          ok: false as const,
          error: "Eup API timed out — their server may be slow or blocking requests from this network.",
        },
        { status: 504 },
      )
    }
    const message = e instanceof Error ? e.message : "Unknown error"
    return NextResponse.json({ ok: false as const, error: message }, { status: 502 })
  }
}
