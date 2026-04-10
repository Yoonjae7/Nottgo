import { NextResponse } from "next/server"
import {
  DEFAULT_EUP_BASE_URL,
  eupCoordsToLatLng,
  eupFetchCarStatus,
  eupStatusLabel,
} from "@/lib/eup"

export const dynamic = "force-dynamic"

/**
 * GET /api/bus-location?carNumber=ABC123
 * Uses EUP_TOKEN + optional EUP_BASE_URL from env; carNumber query overrides EUP_CAR_NUMBER default.
 */
export async function GET(request: Request) {
  const token = process.env.EUP_TOKEN
  const baseUrl = process.env.EUP_BASE_URL?.trim() || DEFAULT_EUP_BASE_URL
  const { searchParams } = new URL(request.url)
  const carNumber = searchParams.get("carNumber")?.trim() || process.env.EUP_CAR_NUMBER?.trim()

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Missing EUP_TOKEN (set in .env.local)" },
      { status: 503 },
    )
  }
  if (!carNumber) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing car number: set EUP_CAR_NUMBER or pass ?carNumber= from transport office",
      },
      { status: 400 },
    )
  }

  try {
    const data = await eupFetchCarStatus(baseUrl, token, carNumber)
    const row = data.result?.[0]
    if (!row) {
      return NextResponse.json({
        ok: true,
        carNumber,
        responseMsg: data.responseMsg,
        responseStatus: data.responseStatus,
        empty: true,
        message: "No position returned for this plate (offline, wrong plate, or no access).",
      })
    }

    const latLng = eupCoordsToLatLng(row.logGisx, row.logGisy)

    return NextResponse.json({
      ok: true,
      carNumber: row.carNumber ?? carNumber,
      lat: latLng?.lat ?? null,
      lng: latLng?.lng ?? null,
      logDTime: row.logDTime ?? null,
      logSpeed: row.logSpeed ?? null,
      address: row.address ?? null,
      roadName: row.roadName ?? null,
      status: row.status ?? null,
      statusLabel: eupStatusLabel(row.status),
      turnOffStatus: row.turnOffStatus ?? null,
      driverName: row.driverName ?? null,
      rawLogGisx: row.logGisx,
      rawLogGisy: row.logGisy,
    })
  } catch (e) {
    const aborted =
      e instanceof Error &&
      (e.name === "AbortError" || /abort|timeout/i.test(e.message))
    if (aborted) {
      return NextResponse.json(
        { ok: false, error: "Eup API timed out — their server may be slow or blocking requests from this network." },
        { status: 504 },
      )
    }
    const message = e instanceof Error ? e.message : "Unknown error"
    return NextResponse.json({ ok: false, error: message }, { status: 502 })
  }
}
