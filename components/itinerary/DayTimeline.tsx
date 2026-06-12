'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Clock, MapPin, MessageCircle, Trash2, ExternalLink } from 'lucide-react'
import { toast } from '@/components/ui/Toast'
import type { ItineraryDay, ItineraryItem, Trip } from '@/types'
import { useTripStore } from '@/lib/stores/trip-store'
import ItemComments from './ItemComments'
import AddItemModal from './AddItemModal'
import { cn } from '@/lib/utils/cn'

interface Props {
  day: ItineraryDay
  tripId: string
  currentUserId: string | null
  trip: Trip | null
  onItemAdded?: () => void
}

export default function DayTimeline({ day, tripId, currentUserId, trip, onItemAdded }: Props) {
  const supabase = createClient()
  const { removeItem } = useTripStore()
  const [openComments, setOpenComments] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  async function deleteItem(item: ItineraryItem) {
    removeItem(item.id) // optimistic
    const { error } = await supabase.from('itinerary_items').delete().eq('id', item.id)
    if (error) {
      toast('ลบไม่สำเร็จ', 'error')
    } else {
      toast('ลบสถานที่แล้ว')
    }
  }

  const items = day.items ?? []

  return (
    <div className="pb-4">
      {/* Day header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">Day {day.day_number}</h3>
          {day.title && <p className="text-sm text-slate-400">{day.title}</p>}
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 px-3 py-1.5 rounded-xl text-sm active:scale-95 transition-transform"
        >
          <Plus size={14} /> เพิ่มสถานที่
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <div className="text-4xl">📍</div>
          <p className="text-slate-500 text-sm">ยังไม่มีแผนวันนี้</p>
          <button
            onClick={() => setShowAdd(true)}
            className="text-indigo-400 text-sm underline"
          >
            เพิ่มสถานที่แรก
          </button>
        </div>
      ) : (
        <div className="relative space-y-3">
          {/* Timeline line */}
          <div className="timeline-line" style={{ height: `calc(100% - 40px)` }} />

          {items.map((item, idx) => (
            <div key={item.id} className="relative pl-12 spring-enter">
              {/* Dot */}
              <div className="absolute left-4 top-4 w-6 h-6 rounded-full bg-indigo-600 border-2 border-slate-950 flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">{idx + 1}</span>
              </div>

              {/* Travel time between items */}
              {idx > 0 && item.start_time && items[idx-1].start_time && (
                <div className="absolute left-6 -top-4 text-[10px] text-slate-600">
                  🚗 ~{estimateTravelMin(items[idx-1], item)} นาที
                </div>
              )}

              <div className="glass rounded-2xl p-3.5 border border-white/5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white text-sm leading-tight">{item.title}</h4>

                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                      {item.start_time && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock size={11} />
                          {item.start_time.slice(0, 5)}
                          {item.duration_min && ` (${item.duration_min} นาที)`}
                        </span>
                      )}
                      {item.location_name && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <MapPin size={11} />
                          <span className="truncate max-w-[140px]">{item.location_name}</span>
                        </span>
                      )}
                    </div>

                    {item.notes && (
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{item.notes}</p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {item.lat && item.lng && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-500 active:scale-90 transition-transform"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                    {item.created_by === currentUserId && (
                      <button
                        onClick={() => deleteItem(item)}
                        className="text-slate-600 active:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Comment toggle */}
                <button
                  onClick={() => setOpenComments(openComments === item.id ? null : item.id)}
                  className="flex items-center gap-1.5 mt-2.5 text-xs text-slate-500 active:text-indigo-400 transition-colors"
                >
                  <MessageCircle size={12} />
                  คอมเมนต์
                </button>

                {openComments === item.id && (
                  <ItemComments
                    itemId={item.id}
                    tripId={tripId}
                    currentUserId={currentUserId}
                  />
                )}
              </div>
            </div>
          ))}
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

function estimateTravelMin(from: ItineraryItem, to: ItineraryItem): number {
  if (!from.lat || !from.lng || !to.lat || !to.lng) return 15
  // Haversine approximation
  const R = 6371
  const dLat = (to.lat - from.lat) * Math.PI / 180
  const dLon = (to.lng - from.lng) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(from.lat*Math.PI/180) * Math.cos(to.lat*Math.PI/180) * Math.sin(dLon/2)**2
  const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return Math.max(5, Math.round(km * 3)) // ~20km/h average
}
