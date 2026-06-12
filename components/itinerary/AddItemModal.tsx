'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Search, MapPin, Loader2 } from 'lucide-react'
import type { ItineraryDay } from '@/types'
import { toast } from '@/components/ui/Toast'

interface Props {
  day: ItineraryDay
  tripId: string
  currentUserId: string
  onClose: () => void
  onAdded?: () => void
}

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

export default function AddItemModal({ day, tripId, currentUserId, onClose, onAdded }: Props) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([])
  const [searching, setSearching] = useState(false)
  const [form, setForm] = useState({
    title: '',
    location_name: '',
    lat: '',
    lng: '',
    start_time: '',
    duration_min: '',
    notes: '',
  })

  function set(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  // Search locations via Nominatim (OpenStreetMap) — free, no API key needed
  async function searchLocations() {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5`,
        { headers: { 'Accept-Language': 'th,en' } }
      )
      const data = await res.json()
      setSearchResults(data)
    } catch {
      setSearchResults([])
    }
    setSearching(false)
  }

  function selectLocation(result: NominatimResult) {
    const name = result.display_name.split(',').slice(0, 2).join(', ')
    setForm(f => ({
      ...f,
      location_name: name,
      lat: result.lat,
      lng: result.lon,
      title: f.title || name,
    }))
    setSearchResults([])
    setSearchQuery('')
  }

  async function handleAdd() {
    if (!form.title.trim()) return
    setLoading(true)

    const payload = {
      trip_id: tripId,
      day_id: day.id,
      title: form.title.trim(),
      location_name: form.location_name || null,
      lat: form.lat ? parseFloat(form.lat) : null,
      lng: form.lng ? parseFloat(form.lng) : null,
      start_time: form.start_time || null,
      duration_min: form.duration_min ? parseInt(form.duration_min) : null,
      notes: form.notes || null,
      created_by: currentUserId,
      sort_order: Math.floor(Date.now() / 1000),
      is_backup: false,
    }

    const { error } = await supabase.from('itinerary_items').insert(payload)

    setLoading(false)
    if (error) {
      toast('เพิ่มไม่สำเร็จ: ' + error.message, 'error')
      return
    }
    toast('เพิ่มสถานที่แล้ว 📍')
    onAdded?.()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full bottom-sheet spring-enter max-h-[90dvh] overflow-y-auto">
        <div className="sheet-handle" />
        <div className="px-5 pb-8 pt-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">เพิ่มสถานที่ — Day {day.day_number}</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
              <X size={16} className="text-slate-400" />
            </button>
          </div>

          {/* Location search */}
          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-medium">ค้นหาสถานที่</label>
            <div className="flex gap-2">
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchLocations()}
                placeholder="ค้นหาด้วย OpenStreetMap..."
                className="flex-1 bg-slate-800 text-white rounded-xl px-4 py-3 text-sm placeholder-slate-600 border border-slate-700 focus:border-indigo-500 focus:outline-none"
              />
              <button
                onClick={searchLocations}
                disabled={searching}
                className="px-3 bg-indigo-600 rounded-xl active:scale-90 transition-transform"
              >
                {searching ? <Loader2 size={16} className="text-white animate-spin" /> : <Search size={16} className="text-white" />}
              </button>
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
                {searchResults.map(r => (
                  <button
                    key={r.place_id}
                    onClick={() => selectLocation(r)}
                    className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 border-b border-slate-700 last:border-0 flex items-start gap-2"
                  >
                    <MapPin size={14} className="text-indigo-400 mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{r.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Field label="ชื่อสถานที่ *" placeholder="เช่น Dotonbori" value={form.title} onChange={v => set('title', v)} />

          {form.location_name && (
            <div className="flex items-center gap-2 text-sm text-indigo-400 -mt-2">
              <MapPin size={14} />
              <span className="truncate">{form.location_name}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="เวลาเริ่ม" type="time" value={form.start_time} onChange={v => set('start_time', v)} />
            <Field label="ระยะเวลา (นาที)" type="number" placeholder="60" value={form.duration_min} onChange={v => set('duration_min', v)} />
          </div>

          <Field label="โน้ตเพิ่มเติม" placeholder="รายละเอียด, ราคา, ข้อแนะนำ..." value={form.notes} onChange={v => set('notes', v)} />

          <button
            onClick={handleAdd}
            disabled={loading || !form.title.trim()}
            className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-2xl active:scale-95 transition-transform disabled:opacity-50"
          >
            {loading ? <Loader2 size={20} className="animate-spin mx-auto" /> : '📍 เพิ่มลงแผน'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, placeholder, value, onChange, type = 'text' }: {
  label: string; placeholder?: string; value: string; onChange: (v: string) => void; type?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-slate-400 font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 text-sm placeholder-slate-600 border border-slate-700 focus:border-indigo-500 focus:outline-none"
      />
    </div>
  )
}
