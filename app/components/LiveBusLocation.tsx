"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, RefreshCw } from "lucide-react"

type OkPayload = {
  ok: true
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
}

type ErrPayload = {
  ok: false
  error?: string
  message?: string
}

type Payload = OkPayload | ErrPayload

const POLL_MS = 45_000
/** If the API route or Eup hangs, don't wait forever (browser fetch has no default timeout) */
const CLIENT_FETCH_MS = 35_000

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
            Live bus position
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-sm text-muted-foreground">Contacting live bus service…</p>
          <p className="text-xs text-muted-foreground/90">
            First load can take up to ~20s. This is not caused by missing Vercel env vars — add{" "}
            <code className="rounded bg-muted px-1">EUP_TOKEN</code> and{" "}
            <code className="rounded bg-muted px-1">EUP_CAR_NUMBER</code> in{" "}
            <code className="rounded bg-muted px-1">.env.local</code> for local dev.
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
            Live bus position
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

  const d = data as OkPayload
  const mapsUrl =
    d.lat != null && d.lng != null
      ? `https://www.openstreetmap.org/?mlat=${d.lat}&mlon=${d.lng}#map=16/${d.lat}/${d.lng}`
      : null

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            Live bus position
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
        <p className="text-xs text-muted-foreground">Plate: {d.carNumber}</p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {d.empty ? (
          <p className="text-muted-foreground">{d.message ?? "No live data right now."}</p>
        ) : (
          <>
            {d.lat != null && d.lng != null && (
              <p>
                <span className="text-muted-foreground">Coordinates: </span>
                {d.lat.toFixed(5)}, {d.lng.toFixed(5)}
              </p>
            )}
            {d.address && (
              <p>
                <span className="text-muted-foreground">Address: </span>
                {d.address}
              </p>
            )}
            {d.roadName && !d.address && (
              <p>
                <span className="text-muted-foreground">Road: </span>
                {d.roadName}
              </p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {d.logDTime && <span>Last fix: {d.logDTime}</span>}
              {d.logSpeed != null && <span>Speed: {d.logSpeed} km/h</span>}
              {d.statusLabel && <span>Status: {d.statusLabel}</span>}
            </div>
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Open location on map
              </a>
            )}
          </>
        )}
        {lastFetch && (
          <p className="text-[10px] text-muted-foreground/80">
            Updated {lastFetch.toLocaleTimeString()} · auto-refresh every {POLL_MS / 1000}s
          </p>
        )}
      </CardContent>
    </Card>
  )
}
