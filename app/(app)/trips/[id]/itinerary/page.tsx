'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Map, List } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { ItineraryDay, ItineraryItem, Profile, Trip } from '@/types'
import { useTripStore } from '@/lib/stores/trip-store'
import DayTimeline from '@/components/itinerary/DayTimeline'
import MapView from '@/components/map/MapView'
import BackupDrawer from '@/components/itinerary/BackupDrawer'
import { cacheItinerary } from '@/lib/utils/offline'

export default function ItineraryPage() {
  const { id: tripId } = useParams<{ id: string }>()
  const supabase = createClient()
  const { days, setDays, currentTrip } = useTripStore()
  const [selectedDay, setSelectedDay] = useState(0)
  const [view, setView] = useState<'timeline' | 'map'>('timeline')
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [trip, setTrip] = useState<Trip | null>(null)

  useEffect(() => {
    loadData()
  }, [tripId])

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`itinerary:${tripId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'itinerary_items',
        filter: `trip_id=eq.${tripId}`,
      }, () => loadData())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [tripId])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUserId(user?.id ?? null)

    const [{ data: tripData }, { data: daysData }] = await Promise.all([
      supabase.from('trips').select('*').eq('id', tripId).single(),
      supabase
        .from('itinerary_days')
        .select(`
          *,
          items:itinerary_items (
            *,
            creator:profiles!itinerary_items_created_by_fkey (id, display_name, avatar_url)
          )
        `)
        .eq('trip_id', tripId)
        .order('day_number'),
    ])

    setTrip(tripData)

    const processedDays = (daysData ?? []).map(d => ({
      ...d,
      items: (d.items ?? [])
        .filter((i: ItineraryItem) => !i.is_backup)
        .sort((a: ItineraryItem, b: ItineraryItem) => {
          if (a.start_time && b.start_time) return a.start_time.localeCompare(b.start_time)
          return a.sort_order - b.sort_order
        }),
    })) as ItineraryDay[]

    setDays(processedDays)
    setLoading(false)

    // Cache for offline
    cacheItinerary(tripId, processedDays).catch(() => {})
  }

  if (loading) {
    return (
      <div className="px-4 pt-4 space-y-3">
        <div className="shimmer rounded-2xl h-12" />
        <div className="shimmer rounded-3xl h-40" />
        <div className="shimmer rounded-3xl h-40" />
      </div>
    )
  }

  const currentDayData = days[selectedDay]
  const allItems = days.flatMap(d => d.items ?? []).filter(i => i.lat && i.lng)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">แผนการเดินทาง</h2>
        {/* View toggle */}
        <div className="flex bg-slate-900 rounded-xl p-1">
          <button
            onClick={() => setView('timeline')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              view === 'timeline' ? 'bg-indigo-600 text-white' : 'text-slate-500'
            )}
          >
            <List size={14} /> รายการ
          </button>
          <button
            onClick={() => setView('map')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              view === 'map' ? 'bg-indigo-600 text-white' : 'text-slate-500'
            )}
          >
            <Map size={14} /> แผนที่
          </button>
        </div>
      </div>

      {/* Day selector */}
      <div className="px-4 pb-3">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {days.map((d, i) => (
            <button
              key={d.id}
              onClick={() => setSelectedDay(i)}
              className={cn(
                'flex-none px-4 py-2 rounded-xl text-sm font-medium transition-all',
                selectedDay === i
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900 text-slate-400 active:bg-slate-800'
              )}
            >
              Day {d.day_number}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {view === 'timeline' ? (
          <div className="h-full overflow-y-auto hide-scrollbar px-4">
            {currentDayData && (
              <DayTimeline
                day={currentDayData}
                tripId={tripId}
                currentUserId={currentUserId}
                trip={trip}
              />
            )}
          </div>
        ) : (
          <MapView
            items={currentDayData?.items ?? []}
            tripLat={trip?.destination_lat}
            tripLng={trip?.destination_lng}
          />
        )}
      </div>

      {/* Backup plan drawer */}
      <BackupDrawer tripId={tripId} days={days} />
    </div>
  )
}
