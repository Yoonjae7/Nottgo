"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, RefreshCw } from "lucide-react"

type VehicleRow = {
  carNumber: string
  lat: number | null
  lng: number | null
  logDTime: string | null
  logSpeed: number | null
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

type OkPayload = {
  ok: true
  vehicles: VehicleRow[]
}

type ErrPayload = {
  ok: false
  error?: string
  message?: string
}

type Payload = OkPayload | ErrPayload

const POLL_MS = 45_000
/** Multiple parallel Eup calls — allow extra time */
const CLIENT_FETCH_MS = 55_000

export default function LiveBusLocation() {
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const ac = new AbortController()
    const timeoutId = window.setTimeout(() => ac.abort(), CLIENT_FETCH_MS)
    try {
      const res = await fetch("/api/bus-location", { cache: "no-store", signal: ac.signal })
      const text = await res.text()
      let json: Payload
      try {
        json = text ? (JSON.parse(text) as Payload) : { ok: false, error: "Empty response from server" }
      } catch {
        setData({
          ok: false,
          error: `Server returned non-JSON (${res.status}). Try restarting dev: pnpm dev:clean`,
        })
        return
      }
      setData(json)
    } catch (e) {
      const aborted = e instanceof Error && e.name === "AbortError"
      setData({
        ok: false,
        error: aborted
          ? "Request timed out. If this keeps happening, the Eup server may be blocking or very slow (try another network/VPN)."
          : "Network error",
      })
    } finally {
      window.clearTimeout(timeoutId)
      setLoading(false)
      setLastFetch(new Date())
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, POLL_MS)
    return () => clearInterval(id)
  }, [load])

  if (loading && data === null) {
    return (
      <Card className="w-full border-dashed pointer-events-auto">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" aria-hidden />
            Live bus positions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-sm text-muted-foreground">Contacting live bus service…</p>
          <p className="text-xs text-muted-foreground/90">
            Set <code className="rounded bg-muted px-1">EUP_TOKEN</code> and{" "}
            <code className="rounded bg-muted px-1">EUP_CAR_NUMBER</code> (comma-separated plates) in{" "}
            <code className="rounded bg-muted px-1">.env.local</code> or Vercel.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (data && !data.ok) {
    const msg = "error" in data && data.error ? data.error : "message" in data ? data.message : "Unknown error"
    return (
      <Card className="w-full border-amber-200/80 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" aria-hidden />
            Live bus positions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>{msg}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => load()} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const { vehicles } = data as OkPayload

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            Live bus positions
          </CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 gap-1 text-xs"
            onClick={() => load()}
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{vehicles.length} vehicle(s)</p>
      </CardHeader>
      <CardContent className="space-y-0 text-sm">
        {vehicles.map((v, i) => (
          <div
            key={v.carNumber}
            className={
              i > 0 ? "border-t border-border/60 pt-3 mt-3 space-y-2" : "space-y-2 pb-1"
            }
          >
            <p className="font-semibold text-foreground">{v.carNumber}</p>
            {v.error ? (
              <p className="text-xs text-destructive/90">{v.error}</p>
            ) : v.empty ? (
              <p className="text-xs text-muted-foreground">
                {v.message ?? "No live data right now."}
              </p>
            ) : (
              <>
                {v.lat != null && v.lng != null && (
                  <p className="text-xs">
                    <span className="text-muted-foreground">Coords: </span>
                    {v.lat.toFixed(5)}, {v.lng.toFixed(5)}
                  </p>
                )}
                {v.address && (
                  <p className="text-xs">
                    <span className="text-muted-foreground">Address: </span>
                    {v.address}
                  </p>
                )}
                {v.roadName && !v.address && (
                  <p className="text-xs">
                    <span className="text-muted-foreground">Road: </span>
                    {v.roadName}
                  </p>
                )}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                  {v.logDTime && <span>Last fix: {v.logDTime}</span>}
                  {v.logSpeed != null && <span>{v.logSpeed} km/h</span>}
                  {v.statusLabel && <span>{v.statusLabel}</span>}
                </div>
                {v.lat != null && v.lng != null && (
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${v.lat}&mlon=${v.lng}#map=16/${v.lat}/${v.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex text-xs font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Open on map
                  </a>
                )}
              </>
            )}
          </div>
        ))}
        {lastFetch && (
          <p className="mt-3 text-[10px] text-muted-foreground/80 border-t border-border/40 pt-2">
            Updated {lastFetch.toLocaleTimeString()} · auto-refresh every {POLL_MS / 1000}s
          </p>
        )}
      </CardContent>
    </Card>
  )
}
