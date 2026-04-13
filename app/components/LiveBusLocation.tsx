"use client"

import dynamic from "next/dynamic"
import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

const LiveBusMap = dynamic(() => import("./LiveBusMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 text-xs text-muted-foreground">
      Loading map…
    </div>
  ),
})

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
const CLIENT_FETCH_MS = 55_000

export default function LiveBusLocation() {
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)
  const [selectedPlate, setSelectedPlate] = useState<string | null>(null)

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

  useEffect(() => {
    if (!data || !data.ok) return
    const ids = data.vehicles.map((v) => v.carNumber)
    setSelectedPlate((prev) => {
      if (prev && ids.includes(prev)) return prev
      return ids[0] ?? null
    })
  }, [data])

  if (loading && data === null) {
    return (
      <Card className="w-full border-dashed pointer-events-auto">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" aria-hidden />
            Live bus
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-sm text-muted-foreground">Loading buses from Eup…</p>
          <p className="text-xs text-muted-foreground/90">
            Several plates can take 20–40s. Check Network → <code className="rounded bg-muted px-1">/api/bus-location</code> if this hangs.
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
            Live bus
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
  const selected = vehicles.find((v) => v.carNumber === selectedPlate)
  const mapSlice =
    selected &&
    selected.lat != null &&
    selected.lng != null &&
    !selected.error &&
    !selected.empty
      ? [{ carNumber: selected.carNumber, lat: selected.lat, lng: selected.lng }]
      : []

  let caption: string | null = null
  if (selected) {
    if (selected.error) caption = selected.error
    else if (selected.empty || selected.lat == null)
      caption = selected.message ?? "No GPS for this bus right now."
    else
      caption =
        [
          selected.logDTime && `Last fix ${selected.logDTime}`,
          selected.logSpeed != null && `${selected.logSpeed} km/h`,
          selected.statusLabel,
        ]
          .filter(Boolean)
          .join(" · ") || null
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            Live bus
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
        <p className="text-xs text-muted-foreground">Choose a bus to track on the map.</p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap gap-2">
          {vehicles.map((v) => (
            <Button
              key={v.carNumber}
              type="button"
              size="sm"
              variant={selectedPlate === v.carNumber ? "default" : "outline"}
              className={cn("font-mono text-xs", selectedPlate === v.carNumber && "shadow-sm")}
              onClick={() => setSelectedPlate(v.carNumber)}
            >
              {v.carNumber}
            </Button>
          ))}
        </div>

        {selectedPlate && (
          <LiveBusMap vehicles={mapSlice} trackKey={selectedPlate} />
        )}

        {selectedPlate && caption && (
          <p className="text-center text-[11px] text-muted-foreground">{caption}</p>
        )}

        {lastFetch && (
          <p className="text-center text-[10px] text-muted-foreground/80">
            Updated {lastFetch.toLocaleTimeString()} · refresh every {POLL_MS / 1000}s
          </p>
        )}
      </CardContent>
    </Card>
  )
}
