"use client"

import dynamic from "next/dynamic"
import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin } from "lucide-react"
import { cn } from "@/lib/utils"

const LiveBusMap = dynamic(() => import("./LiveBusMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 text-xs text-muted-foreground">
      Loading map…
    </div>
  ),
})

function isEngineOff(v: { status: number | null }): boolean {
  return v.status === 2 || v.status === 3
}

type VehicleRow = {
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

/** Minimum gap between polls — the next poll fires as soon as the previous
 *  response arrives + this gap, so we track as fast as Eup can respond. */
const MIN_POLL_GAP_MS = 200
const CLIENT_FETCH_MS = 15_000

function stubVehicleRow(plate: string): VehicleRow {
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
    message: "Updating…",
  }
}

export default function LiveBusLocation() {
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)
  const [selectedPlate, setSelectedPlate] = useState<string | null>(null)
  const plateRosterRef = useRef<string[]>([])
  /** Last successful multi-row snapshot — merge target so single-bus polls never shrink the roster. */
  const lastGoodVehiclesRef = useRef<VehicleRow[]>([])
  const showInitialSpinnerRef = useRef(true)
  const inFlightRef = useRef(false)

  const load = useCallback(async () => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    if (showInitialSpinnerRef.current) setLoading(true)
    const ac = new AbortController()
    const timeoutId = window.setTimeout(() => ac.abort(), CLIENT_FETCH_MS)
    try {
      const roster = plateRosterRef.current
      const snapshotOk =
        roster.length > 0 &&
        lastGoodVehiclesRef.current.length > 0 &&
        lastGoodVehiclesRef.current.length === roster.length
      const useSinglePoll =
        snapshotOk &&
        Boolean(selectedPlate) &&
        roster.includes(selectedPlate)

      const url = useSinglePoll
        ? `/api/bus-location?carNumber=${encodeURIComponent(selectedPlate!)}`
        : "/api/bus-location"

      const res = await fetch(url, { cache: "no-store", signal: ac.signal })
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

      if (!json.ok) {
        setData(json)
        return
      }

      if (json.vehicles.length > 1 || (json.vehicles.length === 1 && !useSinglePoll)) {
        plateRosterRef.current = json.vehicles.map((v) => v.carNumber)
        lastGoodVehiclesRef.current = json.vehicles
        setData(json)
        return
      }

      if (json.vehicles.length === 1 && useSinglePoll) {
        const incoming = json.vehicles[0]
        setData((prev) => {
          const plates = plateRosterRef.current
          let baseByPlate = new Map<string, VehicleRow>()
          if (lastGoodVehiclesRef.current.length === plates.length) {
            for (const v of lastGoodVehiclesRef.current) {
              baseByPlate.set(v.carNumber, v)
            }
          } else if (prev?.ok && prev.vehicles.length === plates.length) {
            for (const v of prev.vehicles) {
              baseByPlate.set(v.carNumber, v)
            }
          }

          const merged = plates.map((plate) => {
            const existing = baseByPlate.get(plate) ?? stubVehicleRow(plate)
            return plate === incoming.carNumber ? { ...existing, ...incoming } : existing
          })
          lastGoodVehiclesRef.current = merged
          return { ok: true, vehicles: merged }
        })
        return
      }

      if (json.ok && json.vehicles.length > 0) {
        plateRosterRef.current = json.vehicles.map((v) => v.carNumber)
        lastGoodVehiclesRef.current = json.vehicles
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
      showInitialSpinnerRef.current = false
      setLastFetch(new Date())
      inFlightRef.current = false
    }
  }, [selectedPlate])

  useEffect(() => {
    let mounted = true
    let timer: ReturnType<typeof setTimeout>
    const poll = async () => {
      await load()
      if (mounted) timer = setTimeout(poll, MIN_POLL_GAP_MS)
    }
    poll()
    return () => {
      mounted = false
      clearTimeout(timer)
    }
  }, [load])

  /** After idle/background tabs, timers can lag — refresh when user returns so roster/snapshot stay aligned. */
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void load()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
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
      <Card className="w-full pointer-events-auto overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-primary" aria-hidden />
            Live bus
          </CardTitle>
          <p className="text-xs text-muted-foreground">Locating campus buses…</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Skeleton plate buttons */}
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-8 w-24 animate-pulse rounded-md bg-muted/60"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>

          {/* Animated map skeleton */}
          <div className="relative flex h-[200px] items-center justify-center overflow-hidden rounded-xl bg-muted/30">
            {/* Shimmer sweep */}
            <div
              className="absolute inset-0 -translate-x-full animate-[shimmer_2s_ease-in-out_infinite]"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.04) 40%, hsl(var(--primary) / 0.08) 50%, hsl(var(--primary) / 0.04) 60%, transparent 100%)",
              }}
            />

            {/* Faux map grid lines */}
            <div className="absolute inset-0 opacity-[0.04]">
              {[25, 50, 75].map((p) => (
                <div key={`h${p}`} className="absolute left-0 right-0 border-t border-foreground" style={{ top: `${p}%` }} />
              ))}
              {[25, 50, 75].map((p) => (
                <div key={`v${p}`} className="absolute top-0 bottom-0 border-l border-foreground" style={{ left: `${p}%` }} />
              ))}
            </div>

            {/* Animated bus icon + pulsing GPS ring */}
            <div className="relative flex flex-col items-center gap-3">
              <div className="relative">
                <div className="absolute -inset-3 animate-ping rounded-full bg-primary/10" style={{ animationDuration: "2s" }} />
                <div className="absolute -inset-1.5 animate-pulse rounded-full bg-primary/15" />
                <div className="relative rounded-full bg-primary/10 p-3">
                  <svg
                    viewBox="0 0 48 52"
                    width="32"
                    height="36"
                    className="animate-[busFloat_3s_ease-in-out_infinite] text-primary"
                    aria-hidden="true"
                  >
                    <rect x="5" y="8" width="38" height="32" rx="5" fill="currentColor" opacity="0.85" />
                    <rect x="8" y="11" width="32" height="15" rx="2" fill="white" opacity="0.9" />
                    <rect x="8" y="28" width="32" height="9" rx="1.5" fill="currentColor" opacity="0.65" />
                    <circle cx="17" cy="36" r="2.8" fill="white" opacity="0.5" />
                    <circle cx="31" cy="36" r="2.8" fill="white" opacity="0.5" />
                  </svg>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Connecting to GPS</span>
                <span className="flex gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="inline-block h-1 w-1 rounded-full bg-primary/50 animate-[dotBounce_1.4s_ease-in-out_infinite]"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </span>
              </div>
            </div>
          </div>

          <p className="text-center text-[10px] text-muted-foreground/60">
            First load may take 10–30 s while the GPS server responds
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
          <p className="text-xs">Still trying in the background — or refresh the page.</p>
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
      ? [{ carNumber: selected.carNumber, lat: selected.lat, lng: selected.lng, status: selected.status, speed: selected.logSpeed, heading: selected.direct }]
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
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          Live bus
        </CardTitle>
        <p className="text-xs text-muted-foreground">Choose a bus to track on the map.</p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap gap-2">
          {vehicles.map((v) => {
            const off = isEngineOff(v)
            const active = selectedPlate === v.carNumber
            return (
              <Button
                key={v.carNumber}
                type="button"
                size="sm"
                variant={active ? "default" : "outline"}
                className={cn(
                  "gap-1.5 font-mono text-xs",
                  active && "shadow-sm",
                  off && !active && "opacity-50 border-muted-foreground/30",
                )}
                onClick={() => setSelectedPlate(v.carNumber)}
              >
                <span
                  className={cn(
                    "inline-block h-1.5 w-1.5 shrink-0 rounded-full",
                    off ? "bg-gray-400" : "bg-green-500",
                    !off && "animate-pulse",
                  )}
                />
                {v.carNumber}
              </Button>
            )
          })}
        </div>

        {selectedPlate && (
          <LiveBusMap vehicles={mapSlice} trackKey={selectedPlate} />
        )}

        {selectedPlate && caption && (
          <p className="text-center text-[11px] text-muted-foreground">{caption}</p>
        )}

        {lastFetch && (
          <p className="text-center text-[10px] text-muted-foreground/80">
            Updated {lastFetch.toLocaleTimeString()} · live tracking
          </p>
        )}
      </CardContent>
    </Card>
  )
}
