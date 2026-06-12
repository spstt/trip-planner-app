'use client'
import { useEffect, useRef } from 'react'
import type { ItineraryItem } from '@/types'

// Keyword-based marker style detection
function getMarkerStyle(title: string, notes: string | null, location: string | null): { emoji: string; bg: string } {
  const text = `${title} ${notes ?? ''} ${location ?? ''}`.toLowerCase()

  if (/cafe|คาเฟ่|กาแฟ|coffee|ชา|ชาไข่มุก|boba/.test(text))
    return { emoji: '☕', bg: '#a16207' }
  if (/ร้านอาหาร|restaurant|food|อาหาร|ข้าว|ก๋วยเตี๋ยว|ราเมน|ซูชิ|ยากินิกุ|บุฟเฟ่|eat|dinner|lunch|breakfast/.test(text))
    return { emoji: '🍜', bg: '#dc2626' }
  if (/โรงแรม|hotel|ที่พัก|resort|hostel|airbnb|ห้องพัก|guesthouse|inn/.test(text))
    return { emoji: '🏨', bg: '#0369a1' }
  if (/สนามบิน|airport|เครื่องบิน|ขึ้นเครื่อง|flight|terminal/.test(text))
    return { emoji: '✈️', bg: '#0891b2' }
  if (/รถไฟ|train|station|สถานี|shinkansen|subway|bts|mrt|metro/.test(text))
    return { emoji: '🚆', bg: '#16a34a' }
  if (/วัด|temple|shrine|พระ|ศาลเจ้า|church|mosque|มัสยิด/.test(text))
    return { emoji: '⛩️', bg: '#7c3aed' }
  if (/ห้างสรรพสินค้า|mall|shopping|ช้อป|market|ตลาด|department/.test(text))
    return { emoji: '🛍️', bg: '#db2777' }
  if (/สวนสนุก|theme park|อควาเรียม|aquarium|zoo|สวนสัตว์|museum|พิพิธภัณฑ์/.test(text))
    return { emoji: '🎡', bg: '#ea580c' }
  if (/ทะเล|beach|หาด|sea|island|เกาะ|snorkel|ดำน้ำ/.test(text))
    return { emoji: '🏖️', bg: '#0284c7' }
  if (/ภูเขา|mountain|ดอย|hiking|เดินป่า|waterfall|น้ำตก|forest|ป่า/.test(text))
    return { emoji: '🏔️', bg: '#15803d' }
  if (/bar|pub|ผับ|คลับ|club|night|กลางคืน|เบียร์|beer|cocktail/.test(text))
    return { emoji: '🍻', bg: '#92400e' }
  if (/spa|นวด|massage|สปา|wellness/.test(text))
    return { emoji: '💆', bg: '#9d174d' }
  if (/ช้าง|elephant|tiger|เสือ|safari|zoo/.test(text))
    return { emoji: '🐘', bg: '#6b7280' }

  // Default: location pin with indigo gradient
  return { emoji: '📍', bg: 'linear-gradient(135deg,#6366f1,#a855f7)' }
}

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

        const { emoji, bg } = getMarkerStyle(item.title, item.notes, item.location_name)

        const icon = L.divIcon({
          html: `
            <div style="
              position:relative;
              width:40px;height:46px;
              display:flex;flex-direction:column;
              align-items:center;
            ">
              <div style="
                width:40px;height:40px;border-radius:50% 50% 50% 4px;
                transform:rotate(45deg);
                background:${bg};
                border:2.5px solid white;
                box-shadow:0 4px 14px rgba(0,0,0,0.35);
                display:flex;align-items:center;justify-content:center;
              ">
                <span style="transform:rotate(-45deg);font-size:17px;line-height:1">${emoji}</span>
              </div>
              <div style="
                position:absolute;bottom:0;left:50%;transform:translateX(-50%);
                width:18px;height:18px;border-radius:50%;
                background:white;border:2px solid ${bg.includes('gradient') ? '#6366f1' : bg};
                font-size:9px;font-weight:800;color:#333;
                display:flex;align-items:center;justify-content:center;
                box-shadow:0 2px 6px rgba(0,0,0,0.2);
              ">${idx + 1}</div>
            </div>`,
          className: '',
          iconSize: [40, 46],
          iconAnchor: [20, 46],
          popupAnchor: [0, -48],
        })

        L.marker([lat, lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:sans-serif;padding:6px 2px;min-width:160px">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
                <span style="font-size:18px">${emoji}</span>
                <b style="font-size:13px;color:#1e1b4b">${item.title}</b>
              </div>
              ${item.start_time ? `<p style="font-size:11px;color:#6366f1;margin:2px 0">🕐 ${item.start_time.slice(0,5)}</p>` : ''}
              ${item.location_name ? `<p style="font-size:11px;color:#888;margin:2px 0">📍 ${item.location_name}</p>` : ''}
              <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank"
                style="display:inline-block;margin-top:6px;background:#6366f1;color:white;
                  border-radius:8px;padding:4px 10px;font-size:11px;text-decoration:none;font-weight:600">
                นำทาง Google Maps →
              </a>
            </div>
          `, { maxWidth: 220 })
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
