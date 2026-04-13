"use client"

import { useEffect, useMemo, useRef } from "react"
import { MapContainer, Marker, TileLayer, useMap, ZoomControl } from "react-leaflet"
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

/** First view fits bus; later polls only pan — user zoom is preserved */
function FollowSelectedBus({ position }: { position: [number, number] }) {
  const map = useMap()
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      map.setView(position, 15, { animate: false })
      first.current = false
      return
    }
    map.panTo(position, { animate: true, duration: 0.5 })
  }, [map, position[0], position[1]])

  return null
}

type Props = {
  /** Single bus to show and track (empty = no marker) */
  vehicles: Point[]
  /** Remount map when switching bus so initial framing resets */
  trackKey: string
}

export default function LiveBusMap({ vehicles, trackKey }: Props) {
  const marker = useMemo(() => {
    if (vehicles.length !== 1) return null
    const v = vehicles[0]
    return {
      key: v.carNumber,
      position: [v.lat, v.lng] as [number, number],
      icon: createBusMarkerIcon(v.carNumber),
    }
  }, [vehicles])

  const center: [number, number] =
    vehicles.length === 1 ? [vehicles[0].lat, vehicles[0].lng] : [2.95, 101.85]

  if (vehicles.length === 0) {
    return (
      <p className="text-xs text-muted-foreground rounded-lg border border-dashed border-border/80 bg-muted/30 px-3 py-8 text-center">
        No GPS fix for this bus right now. It may be offline or not reporting.
      </p>
    )
  }

  return (
    <div className="relative z-0 h-[min(360px,58vh)] w-full overflow-hidden rounded-xl border border-border/60 shadow-sm">
      <MapContainer
        key={trackKey}
        center={center}
        zoom={15}
        className="h-full w-full [&_.leaflet-control-attribution]:text-[10px] [&_.leaflet-top.leaflet-right]:mt-2"
        scrollWheelZoom
        doubleClickZoom
        dragging
        touchZoom
        boxZoom
        keyboard
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="topright" />
        <FollowSelectedBus position={marker.position} />
        <Marker position={marker.position} icon={marker.icon} />
      </MapContainer>
    </div>
  )
}
