"use client"

import { useEffect, useMemo } from "react"
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

type Point = { carNumber: string; lat: number; lng: number }

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) return
    if (points.length === 1) {
      map.setView(points[0], 14)
      return
    }
    const bounds = L.latLngBounds(points)
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 15 })
  }, [map, points])
  return null
}

/** Fix default marker assets when Leaflet is bundled (Next/webpack) */
function useFixLeafletIcons() {
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Leaflet default icon bundling fix
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    })
  }, [])
}

export default function LiveBusMap({ vehicles }: { vehicles: Point[] }) {
  useFixLeafletIcons()

  const { points, center } = useMemo(() => {
    const pts: [number, number][] = []
    for (const v of vehicles) {
      pts.push([v.lat, v.lng])
    }
    const c: [number, number] =
      pts.length > 0
        ? [
            pts.reduce((s, p) => s + p[0], 0) / pts.length,
            pts.reduce((s, p) => s + p[1], 0) / pts.length,
          ]
        : [2.95, 101.85]
    return { points: pts, center: c }
  }, [vehicles])

  if (vehicles.length === 0) {
    return (
      <p className="text-xs text-muted-foreground rounded-lg border border-dashed border-border/80 bg-muted/30 px-3 py-6 text-center">
        No GPS coordinates yet for any bus (offline or no fix). List below may still show status.
      </p>
    )
  }

  return (
    <div className="relative z-0 h-[min(280px,50vh)] w-full overflow-hidden rounded-xl border border-border/60 shadow-sm">
      <MapContainer
        center={center}
        zoom={13}
        className="h-full w-full [&_.leaflet-control-attribution]:text-[10px]"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        {vehicles.map((v) => (
          <Marker key={v.carNumber} position={[v.lat, v.lng]}>
            <Popup>
              <span className="font-semibold">{v.carNumber}</span>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
