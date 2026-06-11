'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus } from 'lucide-react'
import { parseISO, isBefore, startOfToday } from 'date-fns'
import { cn } from '@/lib/utils/cn'
import type { Trip, TripMember, Profile } from '@/types'
import CreateTripModal from '@/components/trip/CreateTripModal'
import TripCard from '@/components/trip/TripCard'
import Image from 'next/image'

interface TripWithMembers extends Trip {
  trip_members: (TripMember & { profile: Profile })[]
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'อรุณสวัสดิ์ ☀️'
  if (h < 17) return 'สวัสดีตอนบ่าย 🌤️'
  return 'สวัสดีตอนเย็น 🌙'
}

export default function DashboardPage() {
  const [trips, setTrips] = useState<TripWithMembers[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const [showCreate, setShowCreate] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const supabase = createClient()

  useEffect(() => { loadTrips() }, [])

  async function loadTrips() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: profileData }, { data: memberData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('trip_members').select(`
        trip_id,
        trips (*, trip_members (user_id, role, profile:profiles(id,display_name,avatar_url)))
      `).eq('user_id', user.id),
    ])

    setProfile(profileData)
    const allTrips = memberData?.map((m: any) => m.trips).filter(Boolean) as TripWithMembers[]
    setTrips(allTrips ?? [])
    setLoading(false)
  }

  const today = startOfToday()
  const upcoming = trips.filter(t => !isBefore(parseISO(t.end_date), today))
  const past = trips.filter(t => isBefore(parseISO(t.end_date), today))
  const display = tab === 'upcoming' ? upcoming : past

  return (
    <div className="px-5 pt-5 pb-2">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>{getGreeting()}</p>
          <h1 className="text-2xl font-bold text-white mt-0.5 tracking-tight">
            {profile?.display_name?.split(' ')[0] || 'ทริปของฉัน'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-indigo-500/40 bg-indigo-600 shrink-0">
            {profile?.avatar_url
              ? <Image src={profile.avatar_url} alt="" width={40} height={40} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white">{profile?.display_name?.[0]?.toUpperCase() ?? '?'}</div>
            }
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="pressable w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30"
            style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}
          >
            <Plus size={22} className="text-white" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Stats */}
      {!loading && trips.length > 0 && (
        <div className="flex gap-3 mb-5">
          {[
            { n: upcoming.length, label: 'ทริปที่จะมา', accent: true },
            { n: past.length,     label: 'ทริปที่ผ่านมา', accent: false },
          ].map(({ n, label, accent }) => (
            <div key={label} className={cn('flex-1 rounded-2xl px-4 py-3', accent ? 'bg-indigo-500/10 border border-indigo-500/20' : 'glass')}>
              <p className={cn('text-2xl font-bold', accent ? 'text-indigo-400' : 'text-white')}>{n}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tab */}
      <div className="flex p-1 rounded-2xl mb-5" style={{ background: 'var(--surface-2)' }}>
        {(['upcoming', 'past'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
              tab === t ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500'
            )}
          >
            {t === 'upcoming' ? '🗓 ที่กำลังจะมา' : '📚 ที่ผ่านมา'}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-4">{[1,2].map(i => <div key={i} className="shimmer rounded-3xl h-52" />)}</div>
      ) : display.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 spring-enter">
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl border border-indigo-500/20" style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(168,85,247,0.15))' }}>
            {tab === 'upcoming' ? '🌏' : '📸'}
          </div>
          <div className="text-center">
            <p className="text-white font-semibold text-lg">{tab === 'upcoming' ? 'ยังไม่มีทริปในตำนาน' : 'ยังไม่มีความทรงจำ'}</p>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{tab === 'upcoming' ? 'สร้างทริปแรกแล้วชวนเพื่อนมาเที่ยวกัน!' : 'ทริปที่เสร็จแล้วจะมาแสดงที่นี่'}</p>
          </div>
          {tab === 'upcoming' && (
            <button onClick={() => setShowCreate(true)} className="pressable px-6 py-3 rounded-2xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}>
              ✈️ สร้างทริปแรก
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {display.map((trip, i) => (
            <div key={trip.id} className="fade-up" style={{ animationDelay: `${i * 60}ms` }}>
              <TripCard trip={trip} members={trip.trip_members} />
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateTripModal
          onClose={() => setShowCreate(false)}
          onCreated={(trip) => { setTrips(prev => [trip as TripWithMembers, ...prev]); setShowCreate(false) }}
        />
      )}
    </div>
  )
}
