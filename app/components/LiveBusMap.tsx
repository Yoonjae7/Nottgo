"use client"

import { useEffect, useMemo, useRef } from "react"
import { MapContainer, TileLayer, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

type Point = { carNumber: string; lat: number; lng: number }

const SLIDE_MS = 900

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

/**
 * Imperatively managed marker that smoothly glides between GPS positions
 * via requestAnimationFrame interpolation (60 fps) instead of snapping.
 * Also pans the map to follow the bus with matching animation duration.
 */
function SlidingMarker({ lat, lng, icon }: { lat: number; lng: number; icon: L.DivIcon }) {
  const map = useMap()
  const markerRef = useRef<L.Marker | null>(null)
  const rafRef = useRef(0)

  useEffect(() => {
    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lng], { icon }).addTo(map)
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
  }, [map, lat, lng, icon])

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current)
      markerRef.current?.remove()
    },
    [],
  )

  return null
}

type Props = {
  vehicles: Point[]
  trackKey: string
}

export default function LiveBusMap({ vehicles, trackKey }: Props) {
  const v = vehicles.length === 1 ? vehicles[0] : null
  const icon = useMemo(() => (v ? createBusMarkerIcon(v.carNumber) : null), [v?.carNumber])

  if (!v || !icon) {
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
          url="https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          subdomains={["0", "1", "2", "3"]}
          maxZoom={21}
        />
        <SlidingMarker lat={v.lat} lng={v.lng} icon={icon} />
      </MapContainer>
    </div>
  )
}
