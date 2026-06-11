'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Globe, MapPin } from 'lucide-react'
import { format, differenceInDays, parseISO, isBefore, startOfToday } from 'date-fns'
import { th } from 'date-fns/locale'
import { cn } from '@/lib/utils/cn'
import type { Trip, TripMember, Profile } from '@/types'
import CreateTripModal from '@/components/trip/CreateTripModal'
import TripCard from '@/components/trip/TripCard'

interface TripWithMembers extends Trip {
  trip_members: (TripMember & { profile: Profile })[]
}

export default function DashboardPage() {
  const [trips, setTrips] = useState<TripWithMembers[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const [showCreate, setShowCreate] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadTrips()
  }, [])

  async function loadTrips() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('trip_members')
      .select(`
        trip_id,
        trips (
          *,
          trip_members (
            user_id, role,
            profile:profiles (id, display_name, avatar_url)
          )
        )
      `)
      .eq('user_id', user.id)

    const allTrips = data
      ?.map(m => (m as any).trips)
      .filter(Boolean) as TripWithMembers[]

    setTrips(allTrips ?? [])
    setLoading(false)
  }

  const today = startOfToday()
  const upcoming = trips.filter(t => !isBefore(parseISO(t.end_date), today))
  const past = trips.filter(t => isBefore(parseISO(t.end_date), today))
  const display = tab === 'upcoming' ? upcoming : past

  return (
    <div className="px-4 pt-4 pb-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">ทริปของฉัน</h1>
          <p className="text-slate-500 text-sm mt-0.5">{upcoming.length} ทริปที่กำลังจะมา</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 active:scale-90 transition-transform"
        >
          <Plus size={24} className="text-white" />
        </button>
      </div>

      {/* Tab selector */}
      <div className="flex bg-slate-900 rounded-2xl p-1 mb-5">
        {(['upcoming', 'past'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
              tab === t
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-500 active:bg-slate-800'
            )}
          >
            {t === 'upcoming' ? '🗓️ ที่กำลังจะมา' : '📚 ที่ผ่านมา'}
          </button>
        ))}
      </div>

      {/* Trip list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="shimmer rounded-3xl h-48" />
          ))}
        </div>
      ) : display.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="text-5xl">{tab === 'upcoming' ? '🌏' : '📸'}</div>
          <p className="text-slate-400 text-base">
            {tab === 'upcoming' ? 'ยังไม่มีทริปที่วางแผนไว้' : 'ยังไม่มีทริปที่ผ่านมา'}
          </p>
          {tab === 'upcoming' && (
            <button
              onClick={() => setShowCreate(true)}
              className="mt-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-medium active:scale-95 transition-transform"
            >
              สร้างทริปแรก +
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {display.map(trip => (
            <TripCard key={trip.id} trip={trip} members={trip.trip_members} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateTripModal
          onClose={() => setShowCreate(false)}
          onCreated={(trip) => {
            setTrips(prev => [trip as TripWithMembers, ...prev])
            setShowCreate(false)
          }}
        />
      )}
    </div>
  )
}
