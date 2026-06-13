'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Map, List } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { format, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'
import type { ItineraryDay, ItineraryItem, Trip } from '@/types'
import DayTimeline from '@/components/itinerary/DayTimeline'
import DayWeatherOOTD from '@/components/itinerary/DayWeatherOOTD'
import MapView from '@/components/map/MapView'
import BackupDrawer from '@/components/itinerary/BackupDrawer'
import { cacheItinerary } from '@/lib/utils/offline'
import { toast } from '@/components/ui/Toast'

export default function ItineraryPage() {
  const { id: tripId } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [days, setDays] = useState<ItineraryDay[]>([])
  const [selectedDay, setSelectedDay] = useState(0)
  const [view, setView] = useState<'timeline' | 'map'>('timeline')
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [trip, setTrip] = useState<Trip | null>(null)
  const [isHost, setIsHost] = useState(false)

  useEffect(() => { loadData() }, [tripId])

  useEffect(() => {
    const channel = supabase
      .channel(`itinerary:${tripId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'itinerary_items',
        filter: `trip_id=eq.${tripId}`,
      }, () => loadData())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [tripId])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUserId(user?.id ?? null)

    const [{ data: tripData }, { data: daysData }, { data: memberData }] = await Promise.all([
      supabase.from('trips').select('*').eq('id', tripId).single(),
      supabase
        .from('itinerary_days')
        .select(`*, items:itinerary_items(*, creator:profiles!itinerary_items_created_by_fkey(id,display_name,avatar_url))`)
        .eq('trip_id', tripId)
        .order('day_number'),
      supabase
        .from('trip_members')
        .select('role')
        .eq('trip_id', tripId)
        .eq('user_id', user?.id ?? '')
        .maybeSingle(),
    ])

    setTrip(tripData)
    setIsHost((memberData as any)?.role === 'host')

    const processed = (daysData ?? []).map(d => ({
      ...d,
      items: (d.items ?? [])
        .filter((i: ItineraryItem) => !i.is_backup)
        .sort((a: ItineraryItem, b: ItineraryItem) => {
          if (a.start_time && b.start_time) return a.start_time.localeCompare(b.start_time)
          return a.sort_order - b.sort_order
        }),
    })) as ItineraryDay[]

    setDays(processed)
    setLoading(false)
    cacheItinerary(tripId, processed).catch(() => {})
  }

  if (loading) {
    return (
      <div className="px-4 pt-4 space-y-3">
        <div className="shimmer rounded-2xl h-10" />
        <div className="shimmer rounded-3xl h-40" />
        <div className="shimmer rounded-3xl h-32" />
      </div>
    )
  }

  const currentDayData = days[selectedDay]

  return (
    <div className="flex flex-col h-full">
      {/* View toggle */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-end shrink-0">
        <div style={{ display: 'flex', background: 'var(--s1)', borderRadius: 14, padding: 3, border: '1px solid var(--b0)' }}>
          {(['timeline', 'map'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 11, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, transition: 'all 0.18s ease',
                background: view === v ? 'linear-gradient(135deg, var(--indigo), var(--violet))' : 'transparent',
                color: view === v ? 'white' : 'var(--t2)',
              }}
            >
              {v === 'timeline' ? <><List size={13} /> รายการ</> : <><Map size={13} /> แผนที่</>}
            </button>
          ))}
        </div>
      </div>

      {/* Day selector */}
      <div className="px-4 pb-2 shrink-0">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {days.map((d, i) => (
            <button
              key={d.id}
              onClick={() => setSelectedDay(i)}
              style={{
                flexShrink: 0, padding: '7px 14px', borderRadius: 14, border: 'none',
                cursor: 'pointer', fontSize: 12, fontWeight: 600,
                whiteSpace: 'nowrap', transition: 'all 0.18s ease',
                background: selectedDay === i
                  ? 'linear-gradient(135deg, var(--indigo), var(--violet))'
                  : 'var(--s2)',
                color: selectedDay === i ? 'white' : 'var(--t2)',
                boxShadow: selectedDay === i ? '0 2px 10px var(--indigo-glow)' : 'none',
              }}
            >
              <span style={{ fontWeight: 700 }}>Day {d.day_number}</span>
              <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.75 }}>
                {format(parseISO(d.date), 'd MMM', { locale: th })}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main content — scrollable */}
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {view === 'timeline' ? (
          <div className="px-4 pb-32">
            {currentDayData && trip ? (
              <>
                <DayWeatherOOTD
                  day={currentDayData}
                  trip={trip}
                  isHost={isHost}
                />
                <DayTimeline
                  day={currentDayData}
                  tripId={tripId}
                  currentUserId={currentUserId}
                  trip={trip}
                  onItemAdded={loadData}
                />
              </>
            ) : (
              <div className="text-center py-16 text-slate-500">ไม่พบข้อมูลวันนี้</div>
            )}
          </div>
        ) : (
          <div className="h-full min-h-[400px]">
            <MapView
              items={currentDayData?.items ?? []}
              tripLat={trip?.destination_lat}
              tripLng={trip?.destination_lng}
            />
          </div>
        )}
      </div>

      {/* Backup Drawer */}
      {view === 'timeline' && (
        <BackupDrawer tripId={tripId} days={days} />
      )}
    </div>
  )
}
