"use client"

import { useEffect, useMemo, useRef } from "react"
import { MapContainer, TileLayer, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

type Point = {
  carNumber: string
  lat: number
  lng: number
  status: number | null
}

const SLIDE_MS = 900

/* ---------- SVG marker (green = running, grey = engine off) ---------- */

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
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

function createBusIcon(plate: string, off: boolean): L.Icon {
  const url = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(buildBusIconSvg(plate, off))}`
  return L.icon({
    iconUrl: url,
    iconSize: [64, 80],
    iconAnchor: [32, 70],
    popupAnchor: [0, -70],
  })
}

function isEngineOff(status: number | null): boolean {
  return status === 2 || status === 3
}

/* ---------- Animated marker (rAF interpolation at 60 fps) ---------- */

function SlidingMarker({ lat, lng, icon }: { lat: number; lng: number; icon: L.Icon }) {
  const map = useMap()
  const markerRef = useRef<L.Marker | null>(null)
  const rafRef = useRef(0)
  const iconRef = useRef(icon)
  iconRef.current = icon

  useEffect(() => {
    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lng], { icon: iconRef.current }).addTo(map)
      map.setView([lat, lng], 16, { animate: false })
      return
    }

    cancelAnimationFrame(rafRef.current)
    const marker = markerRef.current
    const from = marker.getLatLng()
    const to = L.latLng(lat, lng)
    if (from.equals(to)) return

    const t0 = performance.now()
    const step = (now: number) => {
      const p = Math.min((now - t0) / SLIDE_MS, 1)
      marker.setLatLng([
        from.lat + (to.lat - from.lat) * p,
        from.lng + (to.lng - from.lng) * p,
      ])
      if (p < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)

    map.panTo(to, { animate: true, duration: SLIDE_MS / 1000 })
  }, [map, lat, lng])

  useEffect(() => {
    markerRef.current?.setIcon(icon)
  }, [icon])

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current)
      markerRef.current?.remove()
    },
    [],
  )

  return null
}

/* ---------- Main component ---------- */

type Props = {
  vehicles: Point[]
  trackKey: string
}

export default function LiveBusMap({ vehicles, trackKey }: Props) {
  const v = vehicles.length === 1 ? vehicles[0] : null
  const off = v ? isEngineOff(v.status) : false
  const icon = useMemo(() => (v ? createBusIcon(v.carNumber, off) : null), [v?.carNumber, off])

  if (!v || !icon) {
    return (
      <p className="rounded-lg border border-dashed border-border/80 bg-muted/30 px-3 py-8 text-center text-xs text-muted-foreground">
        No GPS fix for this bus right now. It may be offline or not reporting.
      </p>
    )
  }

  return (
    <div className="relative z-0 h-[min(360px,58vh)] w-full overflow-hidden rounded-xl border border-border/60 shadow-sm">
      <MapContainer
        key={trackKey}
        center={[v.lat, v.lng]}
        zoom={16}
        zoomControl={false}
        className="h-full w-full [&_.leaflet-control-attribution]:text-[10px]"
        scrollWheelZoom
        doubleClickZoom
        dragging
        touchZoom
        boxZoom
        keyboard
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
          subdomains="abcd"
          maxZoom={20}
        />
        <SlidingMarker lat={v.lat} lng={v.lng} icon={icon} />
      </MapContainer>
    </div>
  )
}

export { isEngineOff }
