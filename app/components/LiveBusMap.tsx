"use client"

import { useEffect, useMemo } from "react"
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

type Point = { carNumber: string; lat: number; lng: number }

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** Front-facing bus SVG + plate label + GPS dot (similar to Eup fleet UI) */
function createBusMarkerIcon(plate: string): L.DivIcon {
  const safe = escapeHtml(plate)
  const html = `
<div class="leaflet-bus-map-marker">
  <div class="leaflet-bus-map-plate">${safe}</div>
  <div class="leaflet-bus-map-caret" aria-hidden="true"></div>
  <div class="leaflet-bus-map-icon-wrap">
    <svg viewBox="0 0 48 52" width="42" height="46" aria-hidden="true" focusable="false">
      <rect x="5" y="8" width="38" height="32" rx="5" fill="#15803d" stroke="#14532d" stroke-width="0.75"/>
      <rect x="8" y="11" width="32" height="15" rx="2" fill="#ffffff" opacity="0.98"/>
      <rect x="8" y="28" width="32" height="9" rx="1.5" fill="#166534"/>
      <circle cx="17" cy="36" r="2.8" fill="#fef08a" stroke="#854d0e" stroke-width="0.3"/>
      <circle cx="31" cy="36" r="2.8" fill="#fef08a" stroke="#854d0e" stroke-width="0.3"/>
      <rect x="20" y="11" width="8" height="3" rx="0.5" fill="#14532d" opacity="0.9"/>
    </svg>
    <div class="leaflet-bus-map-dot" title="GPS position"></div>
  </div>
</div>`

  return L.divIcon({
    html,
    className: "leaflet-bus-map-icon",
    iconSize: [80, 102],
    iconAnchor: [40, 102],
    popupAnchor: [0, -92],
  })
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) return
    if (points.length === 1) {
      map.setView(points[0], 15)
      return
    }
    const bounds = L.latLngBounds(points)
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16 })
  }, [map, points])
  return null
}

export default function LiveBusMap({ vehicles }: { vehicles: Point[] }) {
  const { points, center, markers } = useMemo(() => {
    const pts: [number, number][] = []
    const mk: { key: string; position: [number, number]; icon: L.DivIcon }[] = []
    for (const v of vehicles) {
      pts.push([v.lat, v.lng])
      mk.push({
        key: v.carNumber,
        position: [v.lat, v.lng],
        icon: createBusMarkerIcon(v.carNumber),
      })
    }
    const c: [number, number] =
      pts.length > 0
        ? [
            pts.reduce((s, p) => s + p[0], 0) / pts.length,
            pts.reduce((s, p) => s + p[1], 0) / pts.length,
          ]
        : [2.95, 101.85]
    return { points: pts, center: c, markers: mk }
  }, [vehicles])

  if (vehicles.length === 0) {
    return (
      <p className="text-xs text-muted-foreground rounded-lg border border-dashed border-border/80 bg-muted/30 px-3 py-6 text-center">
        No GPS coordinates yet for any bus (offline or no fix). List below may still show status.
      </p>
    )
  }

  return (
    <div className="relative z-0 h-[min(340px,55vh)] w-full overflow-hidden rounded-xl border border-border/60 shadow-sm">
      <MapContainer
        center={center}
        zoom={14}
        className="h-full w-full [&_.leaflet-control-attribution]:text-[10px]"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        {markers.map((m) => (
          <Marker key={m.key} position={m.position} icon={m.icon} />
        ))}
      </MapContainer>
    </div>
  )
}
