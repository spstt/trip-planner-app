'use client'
import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Search, MapPin, Loader2, Clock, FileText, Navigation } from 'lucide-react'
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
  type: string
  class: string
  address?: {
    country?: string
    city?: string
    town?: string
    village?: string
    road?: string
    suburb?: string
  }
}

// Map OSM class/type to emoji
function placeEmoji(cls: string, type: string): string {
  if (cls === 'amenity') {
    if (['restaurant','food_court','fast_food'].includes(type)) return '🍽️'
    if (['cafe','coffee_shop'].includes(type)) return '☕'
    if (['bar','pub'].includes(type)) return '🍺'
    if (['hospital','clinic'].includes(type)) return '🏥'
    if (['bank','atm'].includes(type)) return '🏦'
    if (['place_of_worship'].includes(type)) return '⛩️'
    return '📍'
  }
  if (cls === 'tourism') {
    if (['hotel','motel','hostel','guest_house'].includes(type)) return '🏨'
    if (['attraction','viewpoint'].includes(type)) return '🗺️'
    if (['museum'].includes(type)) return '🏛️'
    if (['theme_park','zoo'].includes(type)) return '🎡'
    if (['beach'].includes(type)) return '🏖️'
    return '🌟'
  }
  if (cls === 'shop') return '🛍️'
  if (cls === 'leisure') {
    if (['park','garden'].includes(type)) return '🌳'
    if (['beach_resort'].includes(type)) return '🏖️'
    return '🎭'
  }
  if (cls === 'natural') return '🏔️'
  if (cls === 'railway' || cls === 'public_transport') return '🚆'
  if (cls === 'aeroway') return '✈️'
  return '📍'
}

// Shorten display_name to "Place, City, Country"
function shortenName(result: NominatimResult): { name: string; location: string } {
  const parts = result.display_name.split(', ')
  const name = parts.slice(0, 2).join(', ')
  const addr = result.address
  const city  = addr?.city || addr?.town || addr?.village || ''
  const country = addr?.country || ''
  const location = [city, country].filter(Boolean).join(', ')
  return { name, location }
}

function Field({
  label, placeholder, value, onChange, type = 'text', required,
}: {
  label: string; placeholder?: string; value: string
  onChange: (v: string) => void; type?: string; required?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t3)' }}>
        {label}{required && <span style={{ color: '#f43f5e', marginLeft: 2 }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', background: 'var(--s1)', color: 'var(--t1)',
          borderRadius: 14, padding: '12px 14px', fontSize: 14,
          border: '1.5px solid var(--b1)', outline: 'none', boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

export default function AddItemModal({ day, tripId, currentUserId, onClose, onAdded }: Props) {
  const supabase = createClient()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState<{ name: string; location: string } | null>(null)
  const [form, setForm] = useState({
    title: '', location_name: '', lat: '', lng: '',
    start_time: '', duration_min: '', notes: '',
  })

  function set(k: keyof typeof form, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  // Auto-search with 600ms debounce — supports Korean / English / Thai
  function handleQueryChange(q: string) {
    setSearchQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q.trim()) { setSearchResults([]); return }
    debounceRef.current = setTimeout(() => doSearch(q), 600)
  }

  async function doSearch(q: string) {
    setSearching(true)
    try {
      const params = new URLSearchParams({
        q, format: 'json', limit: '8',
        addressdetails: '1',
        'accept-language': 'ko,en,th',
      })
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`)
      const data: NominatimResult[] = await res.json()
      setSearchResults(data)
    } catch {
      setSearchResults([])
    }
    setSearching(false)
  }

  function selectLocation(result: NominatimResult) {
    const { name, location } = shortenName(result)
    const fullLocation = location
      ? `${name.split(',')[0].trim()}${location ? `, ${location}` : ''}`
      : name
    setSelectedPlace({ name: name.split(',')[0].trim(), location })
    setForm(f => ({
      ...f,
      location_name: fullLocation,
      lat: result.lat,
      lng: result.lon,
      title: f.title || name.split(',')[0].trim(),
    }))
    setSearchResults([])
    setSearchQuery('')
  }

  function clearPlace() {
    setSelectedPlace(null)
    setForm(f => ({ ...f, location_name: '', lat: '', lng: '' }))
  }

  async function handleAdd() {
    if (!form.title.trim()) return
    setLoading(true)
    const { error } = await supabase.from('itinerary_items').insert({
      trip_id: tripId,
      day_id: day.id,
      title: form.title.trim(),
      location_name: form.location_name || null,
      lat:  form.lat ? parseFloat(form.lat)  : null,
      lng:  form.lng ? parseFloat(form.lng)  : null,
      start_time:   form.start_time   || null,
      duration_min: form.duration_min ? parseInt(form.duration_min) : null,
      notes:        form.notes        || null,
      created_by:   currentUserId,
      sort_order:   Math.floor(Date.now() / 1000),
      is_backup:    false,
    })
    setLoading(false)
    if (error) { toast('เพิ่มไม่สำเร็จ: ' + error.message, 'error'); return }
    toast('เพิ่มสถานที่แล้ว 📍')
    onAdded?.()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} onClick={onClose} />

      <div className="spring-enter" style={{
        position: 'relative', width: '100%',
        background: 'var(--bg)', borderRadius: '28px 28px 0 0',
        maxHeight: '92dvh', overflowY: 'auto',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.22)',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 14, paddingBottom: 4 }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--b1)' }} />
        </div>

        <div style={{ padding: '4px 20px 40px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--t1)', margin: 0, letterSpacing: '-0.02em' }}>
                เพิ่มสถานที่
              </h2>
              <p style={{ fontSize: 12, color: 'var(--t3)', margin: '2px 0 0' }}>
                Day {day.day_number}{day.title ? ` · ${day.title}` : ''}
              </p>
            </div>
            <button onClick={onClose} style={{
              width: 36, height: 36, borderRadius: 12,
              background: 'var(--s2)', border: '1px solid var(--b0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}>
              <X size={16} style={{ color: 'var(--t2)' }} />
            </button>
          </div>

          {/* ── Search box ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t3)' }}>
              🔍 ค้นหาสถานที่ (รองรับภาษาเกาหลี, อังกฤษ, ไทย)
            </label>

            <div style={{ position: 'relative' }}>
              <input
                value={searchQuery}
                onChange={e => handleQueryChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doSearch(searchQuery)}
                placeholder="เช่น Gwangalli Beach, 해운대, 부산역..."
                style={{
                  width: '100%', background: 'var(--s1)', color: 'var(--t1)',
                  borderRadius: 16, padding: '13px 44px 13px 16px',
                  fontSize: 14, border: '1.5px solid var(--b1)',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
              <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}>
                {searching
                  ? <Loader2 size={16} style={{ color: 'var(--t3)', animation: 'spin 0.8s linear infinite' }} />
                  : <Search size={16} style={{ color: 'var(--t3)' }} />
                }
              </div>
            </div>

            {/* ── Search results dropdown ── */}
            {searchResults.length > 0 && (
              <div style={{
                background: 'var(--s0)', borderRadius: 18, overflow: 'hidden',
                border: '1px solid var(--b0)', boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              }}>
                {searchResults.map((r, i) => {
                  const { name, location } = shortenName(r)
                  const emoji = placeEmoji(r.class, r.type)
                  return (
                    <button
                      key={r.place_id}
                      onClick={() => selectLocation(r)}
                      style={{
                        width: '100%', textAlign: 'left', padding: '12px 16px',
                        display: 'flex', alignItems: 'center', gap: 12,
                        background: 'none', border: 'none', cursor: 'pointer',
                        borderBottom: i < searchResults.length - 1 ? '1px solid var(--b0)' : 'none',
                        transition: 'background 0.12s',
                      }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: 12, flexShrink: 0,
                        background: 'var(--s2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18,
                      }}>
                        {emoji}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: 13, fontWeight: 600, color: 'var(--t1)', margin: 0,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {name.split(',')[0].trim()}
                        </p>
                        {location && (
                          <p style={{ fontSize: 11, color: 'var(--t3)', margin: '2px 0 0' }}>
                            {location}
                          </p>
                        )}
                      </div>
                      <Navigation size={13} style={{ color: 'var(--t3)', flexShrink: 0 }} />
                    </button>
                  )
                })}
              </div>
            )}

            {/* ── Selected place chip ── */}
            {selectedPlace && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 14,
                background: 'rgba(99,102,241,0.08)',
                border: '1.5px solid rgba(99,102,241,0.22)',
              }}>
                <MapPin size={16} style={{ color: 'var(--indigo)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', margin: 0 }}>
                    {selectedPlace.name}
                  </p>
                  {selectedPlace.location && (
                    <p style={{ fontSize: 11, color: 'var(--t3)', margin: '1px 0 0' }}>
                      {selectedPlace.location}
                    </p>
                  )}
                </div>
                <button
                  onClick={clearPlace}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--t3)' }}
                >
                  <X size={13} />
                </button>
              </div>
            )}
          </div>

          {/* ── Form fields ── */}
          <Field
            label="ชื่อสถานที่ในแผน *"
            placeholder="เช่น Gwangalli Beach ชมวิวกลางคืน"
            value={form.title}
            onChange={v => set('title', v)}
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="⏰ เวลาเริ่ม" type="time" value={form.start_time} onChange={v => set('start_time', v)} />
            <Field label="⌛ ระยะเวลา (นาที)" type="number" placeholder="60" value={form.duration_min} onChange={v => set('duration_min', v)} />
          </div>

          {/* Notes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t3)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <FileText size={12} /> โน้ต / รายละเอียด
              </span>
            </label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="เช่น ราคาค่าเข้า, ต้องจองล่วงหน้า, ของอร่อยที่ต้องลอง..."
              rows={2}
              style={{
                width: '100%', background: 'var(--s1)', color: 'var(--t1)',
                borderRadius: 14, padding: '12px 14px', fontSize: 14, resize: 'none',
                border: '1.5px solid var(--b1)', outline: 'none',
                boxSizing: 'border-box', fontFamily: 'inherit',
              }}
            />
          </div>

          {/* ── Submit ── */}
          <button
            onClick={handleAdd}
            disabled={loading || !form.title.trim()}
            style={{
              width: '100%', padding: '16px 0', borderRadius: 20, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, var(--indigo), var(--violet))',
              color: 'white', fontSize: 15, fontWeight: 700,
              boxShadow: '0 4px 20px var(--indigo-glow)',
              opacity: (loading || !form.title.trim()) ? 0.5 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'opacity 0.15s',
            }}
          >
            {loading
              ? <><Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> กำลังบันทึก...</>
              : '📍 เพิ่มลงแผน Day ' + day.day_number
            }
          </button>

        </div>
      </div>
    </div>
  )
}
