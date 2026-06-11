'use client'
import { useEffect, useRef } from 'react'
import type { ItineraryItem } from '@/types'

interface Props {
  items: ItineraryItem[]
  tripLat?: number | null
  tripLng?: number | null
}

// Dynamic import to avoid SSR issues with Leaflet
export default function MapView({ items, tripLat, tripLng }: Props) {
  const mapRef = useRef<any>(null)
  const mapInstanceRef = useRef<any>(null)

  const centerLat = items.find(i => i.lat)?.lat ?? tripLat ?? 13.75
  const centerLng = items.find(i => i.lng)?.lng ?? tripLng ?? 100.5

  useEffect(() => {
    if (typeof window === 'undefined') return

    async function initMap() {
      // Dynamically import Leaflet on client
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
      }

      const map = L.map(mapRef.current!, {
        center: [centerLat, centerLng],
        zoom: 13,
        zoomControl: false,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)

      // Add zoom control top-right
      L.control.zoom({ position: 'topright' }).addTo(map)

      // Plot markers and polyline
      const coords: [number, number][] = []
      const withCoords = items.filter(i => i.lat && i.lng)

      withCoords.forEach((item, idx) => {
        const lat = item.lat!
        const lng = item.lng!
        coords.push([lat, lng])

        // Custom numbered marker
        const icon = L.divIcon({
          html: `<div style="
            width:28px;height:28px;border-radius:50%;
            background:linear-gradient(135deg,#6366f1,#a855f7);
            color:white;font-size:11px;font-weight:700;
            display:flex;align-items:center;justify-content:center;
            border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);
          ">${idx + 1}</div>`,
          className: '',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        })

        L.marker([lat, lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:sans-serif;padding:4px">
              <b style="font-size:13px">${item.title}</b>
              ${item.start_time ? `<br><small>${item.start_time.slice(0,5)}</small>` : ''}
              ${item.location_name ? `<br><small style="color:#888">${item.location_name}</small>` : ''}
              <br><a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank"
                style="color:#6366f1;font-size:11px;text-decoration:none">
                นำทางด้วย Google Maps →
              </a>
            </div>
          `, { maxWidth: 200 })
      })

      // Draw route polyline
      if (coords.length > 1) {
        L.polyline(coords, {
          color: '#6366f1',
          weight: 3,
          opacity: 0.7,
          dashArray: '8 6',
        }).addTo(map)
      }

      // Fit bounds if we have markers
      if (coords.length > 0) {
        map.fitBounds(L.latLngBounds(coords), { padding: [40, 40] })
      }

      mapInstanceRef.current = map
    }

    initMap()

    return () => {
      mapInstanceRef.current?.remove()
      mapInstanceRef.current = null
    }
  }, [items, centerLat, centerLng])

  return (
    <div className="relative h-full">
      <div ref={mapRef} className="w-full h-full" />
      {items.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="glass rounded-2xl px-4 py-3 text-center">
            <p className="text-sm text-slate-400">ยังไม่มีสถานที่ที่มีพิกัด</p>
          </div>
        </div>
      )}
    </div>
  )
}
