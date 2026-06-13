'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Clock, MapPin, MessageCircle, Trash2, ExternalLink, ChevronDown } from 'lucide-react'
import { toast } from '@/components/ui/Toast'
import type { ItineraryDay, ItineraryItem, Trip } from '@/types'
import { useTripStore } from '@/lib/stores/trip-store'
import ItemComments from './ItemComments'
import AddItemModal from './AddItemModal'

interface Props {
  day: ItineraryDay
  tripId: string
  currentUserId: string | null
  trip: Trip | null
  onItemAdded?: () => void
}

// Map place keywords → emoji for the timeline dot
function itemEmoji(item: ItineraryItem): string {
  const t = (item.title + ' ' + (item.location_name ?? '') + ' ' + (item.notes ?? '')).toLowerCase()
  if (/ร้านอาหาร|restaurant|food|먹|식당|ご飯|กิน|eat/.test(t)) return '🍽️'
  if (/cafe|coffee|카페|คาเฟ่|コーヒー/.test(t)) return '☕'
  if (/hotel|โรงแรม|ที่พัก|호텔|숙소/.test(t)) return '🏨'
  if (/beach|ชายหาด|해변|바다|海|อ่าว/.test(t)) return '🏖️'
  if (/museum|พิพิธ|박물관|美術|美术/.test(t)) return '🏛️'
  if (/temple|วัด|神社|寺|성당/.test(t)) return '⛩️'
  if (/market|ตลาด|마켓|시장|マーケット/.test(t)) return '🛍️'
  if (/park|สวน|공원|公園/.test(t)) return '🌳'
  if (/station|สถานี|역|駅|รถไฟ/.test(t)) return '🚆'
  if (/airport|สนามบิน|공항|空港/.test(t)) return '✈️'
  if (/bar|pub|술/.test(t)) return '🍺'
  return '📍'
}

// Color per emoji for dot background
function dotColor(emoji: string): string {
  const map: Record<string, string> = {
    '🍽️': 'rgba(249,115,22,0.15)',  '☕': 'rgba(180,130,90,0.15)',
    '🏨': 'rgba(99,102,241,0.15)',   '🏖️': 'rgba(6,182,212,0.15)',
    '🏛️': 'rgba(168,85,247,0.15)',   '⛩️': 'rgba(239,68,68,0.15)',
    '🛍️': 'rgba(236,72,153,0.15)',   '🌳': 'rgba(16,185,129,0.15)',
    '🚆': 'rgba(59,130,246,0.15)',    '✈️': 'rgba(14,165,233,0.15)',
    '🍺': 'rgba(234,179,8,0.15)',     '📍': 'rgba(99,102,241,0.10)',
  }
  return map[emoji] ?? 'rgba(99,102,241,0.10)'
}

// Haversine travel time estimate
function estimateTravelMin(from: ItineraryItem, to: ItineraryItem): number {
  if (!from.lat || !from.lng || !to.lat || !to.lng) return 0
  const R = 6371
  const dLat = (to.lat - from.lat) * Math.PI / 180
  const dLon = (to.lng - from.lng) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(from.lat*Math.PI/180)*Math.cos(to.lat*Math.PI/180)*Math.sin(dLon/2)**2
  const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return Math.max(5, Math.round(km * 3))
}

export default function DayTimeline({ day, tripId, currentUserId, trip, onItemAdded }: Props) {
  const supabase = createClient()
  const { removeItem } = useTripStore()
  const [openComments, setOpenComments] = useState<string | null>(null)
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())
  const [showAdd, setShowAdd] = useState(false)

  async function deleteItem(item: ItineraryItem) {
    removeItem(item.id)
    const { error } = await supabase.from('itinerary_items').delete().eq('id', item.id)
    if (error) toast('ลบไม่สำเร็จ', 'error')
    else toast('ลบสถานที่แล้ว')
  }

  function toggleNotes(id: string) {
    setExpandedNotes(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  const items = day.items ?? []

  return (
    <div style={{ paddingBottom: 16 }}>

      {/* Day header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--t1)', margin: 0, letterSpacing: '-0.02em' }}>
            Day {day.day_number}
          </h3>
          {day.title && (
            <p style={{ fontSize: 12, color: 'var(--t3)', margin: '2px 0 0' }}>{day.title}</p>
          )}
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 14, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, var(--indigo), var(--violet))',
            color: 'white', fontSize: 12, fontWeight: 700,
            boxShadow: '0 3px 12px var(--indigo-glow)',
          }}
        >
          <Plus size={13} /> เพิ่มสถานที่
        </button>
      </div>

      {/* Empty state */}
      {items.length === 0 ? (
        <button
          onClick={() => setShowAdd(true)}
          style={{
            width: '100%', padding: '32px 0', borderRadius: 24,
            background: 'var(--s1)', border: '2px dashed var(--b1)',
            cursor: 'pointer', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 10,
          }}
        >
          <span style={{ fontSize: 36 }}>🗺️</span>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--t2)', margin: 0 }}>
            ยังไม่มีสถานที่ในวันนี้
          </p>
          <p style={{ fontSize: 12, color: 'var(--t3)', margin: 0 }}>
            แตะเพื่อเพิ่มสถานที่แรก
          </p>
        </button>
      ) : (
        <div style={{ position: 'relative' }}>

          {/* Dashed vertical timeline line */}
          <div style={{
            position: 'absolute',
            left: 19, top: 36, bottom: 36,
            width: 2,
            borderLeft: '2px dashed var(--b1)',
            zIndex: 0,
          }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {items.map((item, idx) => {
              const emoji = itemEmoji(item)
              const bg = dotColor(emoji)
              const travelMin = idx > 0 ? estimateTravelMin(items[idx - 1], item) : 0
              const hasNotes = !!item.notes
              const notesExpanded = expandedNotes.has(item.id)

              return (
                <div key={item.id} style={{ position: 'relative' }}>

                  {/* Travel time chip between items */}
                  {idx > 0 && travelMin > 0 && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      paddingLeft: 52, marginBottom: 2, marginTop: 2,
                    }}>
                      <span style={{
                        fontSize: 10, fontWeight: 600, color: 'var(--t3)',
                        background: 'var(--s1)', padding: '2px 10px',
                        borderRadius: 99, border: '1px solid var(--b0)',
                      }}>
                        🚶 ~{travelMin} นาที
                      </span>
                    </div>
                  )}

                  <div
                    className="spring-enter"
                    style={{ display: 'flex', gap: 14, alignItems: 'flex-start', paddingBottom: 12 }}
                  >
                    {/* Timeline dot */}
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                      background: bg, border: '2px solid var(--bg)',
                      outline: `2px solid ${bg}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 17, position: 'relative', zIndex: 1,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                    }}>
                      {emoji}
                    </div>

                    {/* Item card */}
                    <div style={{
                      flex: 1, background: 'var(--s0)',
                      borderRadius: 20, overflow: 'hidden',
                      border: '1px solid var(--b0)',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                    }}>
                      {/* Card top strip — accent bar */}
                      <div style={{ height: 3, background: bg.replace('0.15', '0.45').replace('0.10', '0.35') }} />

                      <div style={{ padding: '12px 14px' }}>
                        {/* Title row */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Index + title */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                              <span style={{
                                fontSize: 10, fontWeight: 800, color: 'var(--t3)',
                                background: 'var(--s2)', padding: '2px 7px', borderRadius: 99,
                                letterSpacing: '0.04em',
                              }}>
                                {String(idx + 1).padStart(2, '0')}
                              </span>
                              <h4 style={{
                                fontSize: 14, fontWeight: 700, color: 'var(--t1)', margin: 0,
                                lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                {item.title}
                              </h4>
                            </div>

                            {/* Meta chips */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {item.start_time && (
                                <span style={{
                                  display: 'flex', alignItems: 'center', gap: 4,
                                  fontSize: 11, fontWeight: 600, color: 'var(--indigo)',
                                  background: 'rgba(99,102,241,0.08)',
                                  padding: '3px 9px', borderRadius: 99,
                                  border: '1px solid rgba(99,102,241,0.18)',
                                }}>
                                  <Clock size={10} />
                                  {item.start_time.slice(0, 5)}
                                  {item.duration_min && (
                                    <span style={{ color: 'var(--t3)', fontWeight: 500 }}>
                                      · {item.duration_min} นาที
                                    </span>
                                  )}
                                </span>
                              )}
                              {item.location_name && (
                                <span style={{
                                  display: 'flex', alignItems: 'center', gap: 4,
                                  fontSize: 11, fontWeight: 500, color: 'var(--t2)',
                                  maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                  <MapPin size={10} style={{ flexShrink: 0 }} />
                                  {item.location_name.split(',')[0]}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                            {item.lat && item.lng && (
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`}
                                target="_blank" rel="noopener noreferrer"
                                style={{ color: 'var(--t3)', display: 'flex' }}
                              >
                                <ExternalLink size={14} />
                              </a>
                            )}
                            {item.created_by === currentUserId && (
                              <button
                                onClick={() => deleteItem(item)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--t3)' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Notes — expandable */}
                        {hasNotes && (
                          <div style={{ marginTop: 8 }}>
                            <button
                              onClick={() => toggleNotes(item.id)}
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                                display: 'flex', alignItems: 'center', gap: 4,
                                fontSize: 11, fontWeight: 600, color: 'var(--t3)',
                              }}
                            >
                              <ChevronDown
                                size={12}
                                style={{ transition: 'transform 0.18s', transform: notesExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                              />
                              {notesExpanded ? 'ซ่อนโน้ต' : 'ดูโน้ต'}
                            </button>
                            {notesExpanded && (
                              <p style={{
                                fontSize: 12, color: 'var(--t2)', lineHeight: 1.6,
                                margin: '6px 0 0', padding: '8px 12px', borderRadius: 10,
                                background: 'var(--s1)', border: '1px solid var(--b0)',
                              }}>
                                {item.notes}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Comment toggle */}
                        <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--b0)' }}>
                          <button
                            onClick={() => setOpenComments(openComments === item.id ? null : item.id)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                              display: 'flex', alignItems: 'center', gap: 5,
                              fontSize: 11, fontWeight: 600,
                              color: openComments === item.id ? 'var(--indigo)' : 'var(--t3)',
                              transition: 'color 0.15s',
                            }}
                          >
                            <MessageCircle size={12} />
                            {openComments === item.id ? 'ปิดคอมเมนต์' : 'คอมเมนต์'}
                          </button>

                          {openComments === item.id && (
                            <div style={{ marginTop: 10 }}>
                              <ItemComments itemId={item.id} tripId={tripId} currentUserId={currentUserId} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Add another button at bottom */}
          <button
            onClick={() => setShowAdd(true)}
            style={{
              width: '100%', padding: '12px 0', marginTop: 4,
              borderRadius: 16, border: '1.5px dashed var(--b1)',
              background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              fontSize: 13, fontWeight: 600, color: 'var(--t3)',
              transition: 'all 0.15s',
            }}
          >
            <Plus size={14} /> เพิ่มสถานที่ถัดไป
          </button>
        </div>
      )}

      {showAdd && (
        <AddItemModal
          day={day}
          tripId={tripId}
          currentUserId={currentUserId!}
          onClose={() => setShowAdd(false)}
          onAdded={() => { setShowAdd(false); onItemAdded?.() }}
        />
      )}
    </div>
  )
}
