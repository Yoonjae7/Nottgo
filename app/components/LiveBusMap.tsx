"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api"

type Point = {
  carNumber: string
  lat: number
  lng: number
  status: number | null
}

const SLIDE_MS = 900
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""

/* ---------- SVG marker icon (green = running, grey = engine off) ---------- */

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function isEngineOff(status: number | null): boolean {
  return status === 2 || status === 3
}

function buildBusIconSvg(plate: string, off: boolean): string {
  const safe = escapeXml(plate)
  const body = off ? "#9ca3af" : "#16a34a"
  const bodyStroke = off ? "#6b7280" : "#15803d"
  const panel = off ? "#6b7280" : "#166534"
  const textFill = off ? "#6b7280" : "#166534"
  const wheel = off ? "#d1d5db" : "#fef08a"
  const wheelStroke = off ? "#9ca3af" : "#854d0e"
  const dot = off ? "#9ca3af" : "#ef4444"
  const labelBorder = off ? "#d1d5db" : "#86efac"
  const labelBg = off ? "#f3f4f6" : "#ffffff"

  return `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="100" viewBox="0 0 80 100">
<defs><filter id="ds"><feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.18"/></filter></defs>
<g filter="url(#ds)">
  <rect x="6" y="1" width="68" height="18" rx="5" fill="${labelBg}" stroke="${labelBorder}" stroke-width="1.2"/>
  <text x="40" y="14" text-anchor="middle" font-size="10.5" font-family="ui-monospace,SFMono-Regular,monospace" font-weight="700" fill="${textFill}">${safe}</text>
  <polygon points="34,19 46,19 40,25" fill="${labelBg}"/>
  <line x1="34" y1="19" x2="40" y2="25" stroke="${labelBorder}" stroke-width="0.7"/>
  <line x1="46" y1="19" x2="40" y2="25" stroke="${labelBorder}" stroke-width="0.7"/>
  <rect x="14" y="27" width="52" height="44" rx="7" fill="${body}" stroke="${bodyStroke}" stroke-width="1.2"/>
  <rect x="18" y="31" width="44" height="18" rx="3" fill="#fff" opacity="0.95"/>
  <rect x="18" y="51" width="44" height="14" rx="2.5" fill="${panel}"/>
  <circle cx="27" cy="66" r="3.5" fill="${wheel}" stroke="${wheelStroke}" stroke-width="0.5"/>
  <circle cx="53" cy="66" r="3.5" fill="${wheel}" stroke="${wheelStroke}" stroke-width="0.5"/>
  <rect x="34" y="31" width="12" height="3.5" rx="1" fill="${bodyStroke}" opacity="0.7"/>
</g>
<circle cx="40" cy="88" r="6" fill="${dot}" stroke="#fff" stroke-width="2.5"/>
</svg>`
}

function busIconDataUrl(plate: string, off: boolean): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(buildBusIconSvg(plate, off))}`
}

function makeGIcon(url: string): google.maps.Icon {
  return {
    url,
    scaledSize: new google.maps.Size(64, 80),
    anchor: new google.maps.Point(32, 70),
  }
}

/* ---------- Animated marker (rAF interpolation at 60 fps) ---------- */

function SlidingBusMarker({
  map,
  lat,
  lng,
  plate,
  off,
}: {
  map: google.maps.Map
  lat: number
  lng: number
  plate: string
  off: boolean
}) {
  const markerRef = useRef<google.maps.Marker | null>(null)
  const rafRef = useRef(0)
  const iconUrl = useMemo(() => busIconDataUrl(plate, off), [plate, off])
  const iconUrlRef = useRef(iconUrl)
  iconUrlRef.current = iconUrl

  useEffect(() => {
    if (!markerRef.current) {
      markerRef.current = new google.maps.Marker({
        map,
        position: { lat, lng },
        icon: makeGIcon(iconUrlRef.current),
        optimized: false,
      })
      map.setCenter({ lat, lng })
      map.setZoom(16)
      return
    }

    cancelAnimationFrame(rafRef.current)
    const marker = markerRef.current
    const pos = marker.getPosition()
    if (!pos) return
    const fLat = pos.lat()
    const fLng = pos.lng()
    if (fLat === lat && fLng === lng) return

    const t0 = performance.now()
    const step = (now: number) => {
      const p = Math.min((now - t0) / SLIDE_MS, 1)
      marker.setPosition({
        lat: fLat + (lat - fLat) * p,
        lng: fLng + (lng - fLng) * p,
      })
      if (p < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)

    map.panTo({ lat, lng })
  }, [map, lat, lng])

  useEffect(() => {
    markerRef.current?.setIcon(makeGIcon(iconUrl))
  }, [iconUrl])

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current)
      markerRef.current?.setMap(null)
    },
    [],
  )

  return null
}

/* ---------- Main map component ---------- */

type Props = {
  vehicles: Point[]
  trackKey: string
}

export default function LiveBusMap({ vehicles, trackKey }: Props) {
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: API_KEY })
  const [map, setMap] = useState<google.maps.Map | null>(null)

  const v = vehicles.length === 1 ? vehicles[0] : null
  const off = v ? isEngineOff(v.status) : false

  const onLoad = useCallback((m: google.maps.Map) => setMap(m), [])
  const onUnmount = useCallback(() => setMap(null), [])
  const [defaultCenter] = useState({ lat: 2.95, lng: 101.85 })

  if (!API_KEY) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 text-center text-xs text-muted-foreground">
        <p>
          Add{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
            NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
          </code>{" "}
          to <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">.env.local</code> to
          enable the map.
        </p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-red-200 bg-red-50/50 px-4 text-center text-xs text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
        Failed to load Google Maps — check your API key and billing.
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 text-xs text-muted-foreground">
        Loading map…
      </div>
    )
  }

  if (!v) {
    return (
      <p className="rounded-lg border border-dashed border-border/80 bg-muted/30 px-3 py-8 text-center text-xs text-muted-foreground">
        No GPS fix for this bus right now. It may be offline or not reporting.
      </p>
    )
  }

  return (
    <div className="relative z-0 h-[min(360px,58vh)] w-full overflow-hidden rounded-xl shadow-sm">
      <GoogleMap
        mapContainerStyle={{ height: "100%", width: "100%" }}
        center={defaultCenter}
        zoom={16}
        options={{
          disableDefaultUI: true,
          gestureHandling: "greedy",
          clickableIcons: false,
          styles: [
            { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
            { featureType: "transit", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
          ],
        }}
        onLoad={onLoad}
        onUnmount={onUnmount}
      >
        {map && (
          <SlidingBusMarker key={trackKey} map={map} lat={v.lat} lng={v.lng} plate={v.carNumber} off={off} />
        )}
      </GoogleMap>
    </div>
  )
}

export { isEngineOff }
