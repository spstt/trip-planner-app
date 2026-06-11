'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Map, List, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { format, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'
import type { ItineraryDay, ItineraryItem, Trip } from '@/types'
import DayTimeline from '@/components/itinerary/DayTimeline'
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

    const [{ data: tripData }, { data: daysData }] = await Promise.all([
      supabase.from('trips').select('*').eq('id', tripId).single(),
      supabase
        .from('itinerary_days')
        .select(`*, items:itinerary_items(*, creator:profiles!itinerary_items_created_by_fkey(id,display_name,avatar_url))`)
        .eq('trip_id', tripId)
        .order('day_number'),
    ])

    setTrip(tripData)

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
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} className="w-8 h-8 rounded-xl glass flex items-center justify-center active:scale-90">
            <ArrowLeft size={16} className="text-white" />
          </button>
          <h2 className="text-lg font-bold text-white">แผนการเดินทาง</h2>
        </div>
        <div className="flex bg-slate-900 rounded-xl p-1">
          <button
            onClick={() => setView('timeline')}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              view === 'timeline' ? 'bg-indigo-600 text-white' : 'text-slate-500')}
          >
            <List size={13} /> รายการ
          </button>
          <button
            onClick={() => setView('map')}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              view === 'map' ? 'bg-indigo-600 text-white' : 'text-slate-500')}
          >
            <Map size={13} /> แผนที่
          </button>
        </div>
      </div>

      {/* Day selector */}
      <div className="px-4 pb-2 shrink-0">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {days.map((d, i) => (
            <button
              key={d.id}
              onClick={() => setSelectedDay(i)}
              className={cn(
                'flex-none px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap',
                selectedDay === i ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400'
              )}
            >
              <span className="font-bold">Day {d.day_number}</span>
              <span className="ml-1 text-[10px] opacity-70">
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
            {currentDayData ? (
              <DayTimeline
                day={currentDayData}
                tripId={tripId}
                currentUserId={currentUserId}
                trip={trip}
              />
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
