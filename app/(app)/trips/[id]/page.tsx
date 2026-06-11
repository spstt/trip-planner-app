'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { MapPin, Users, Globe, Lock, Trash2, MoreHorizontal } from 'lucide-react'
import { toast } from '@/components/ui/Toast'
import { parseISO, differenceInDays, format } from 'date-fns'
import { th } from 'date-fns/locale'
import type { Trip, TripMember, Profile } from '@/types'
import WeatherWidget from '@/components/trip/WeatherWidget'
import CountdownTimer from '@/components/trip/CountdownTimer'
import InviteButton from '@/components/trip/InviteButton'

interface TripData extends Trip {
  trip_members: (TripMember & { profile: Profile })[]
}

const GRADIENTS = [
  ['#6366f1','#a855f7'],
  ['#ec4899','#f97316'],
  ['#06b6d4','#3b82f6'],
  ['#10b981','#06b6d4'],
  ['#f59e0b','#ef4444'],
]

export default function TripOverviewPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [trip, setTrip] = useState<TripData | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => { loadTrip() }, [id])

  async function loadTrip() {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUserId(user?.id ?? null)
    const { data } = await supabase
      .from('trips')
      .select('*, trip_members(user_id,role,joined_at,profile:profiles(id,display_name,avatar_url,bank_account,promptpay))')
      .eq('id', id).single()
    setTrip(data as TripData)
    setLoading(false)
  }

  async function deleteTrip() {
    setShowMenu(false)
    if (!confirm('ลบทริปนี้? ข้อมูลทั้งหมดจะหายถาวร')) return
    const { error } = await supabase.from('trips').delete().eq('id', id)
    if (error) { toast('ลบไม่สำเร็จ: ' + error.message, 'error'); return }
    router.push('/dashboard')
  }

  if (loading) return (
    <div className="space-y-0">
      <div className="shimmer h-56 w-full" />
      <div className="px-4 pt-4 space-y-3">
        <div className="shimmer rounded-2xl h-28" />
        <div className="shimmer rounded-2xl h-20" />
      </div>
    </div>
  )

  if (!trip) return <div className="p-8 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>ไม่พบทริปนี้</div>

  const isHost = trip.trip_members.some(m => m.user_id === currentUserId && m.role === 'host')
  const startDate = parseISO(trip.start_date)
  const endDate = parseISO(trip.end_date)
  const tripDays = differenceInDays(endDate, startDate) + 1
  const [c1, c2] = GRADIENTS[trip.id.charCodeAt(0) % GRADIENTS.length]

  return (
    <div className="pb-6">

      {/* ── Hero Cover ── */}
      <div className="relative h-56 overflow-hidden" style={{ background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)` }}>
        {trip.cover_image_url && (
          <Image src={trip.cover_image_url} alt={trip.name} fill className="object-cover opacity-40 mix-blend-overlay" />
        )}
        {/* Layered overlays for depth */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.6) 100%)' }} />

        {/* ⋯ Menu button — top right */}
        {isHost && (
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="pressable w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(12px)' }}
            >
              <MoreHorizontal size={18} className="text-white" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-11 rounded-2xl overflow-hidden shadow-2xl z-20 w-40"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <button onClick={deleteTrip}
                  className="w-full px-4 py-3 flex items-center gap-2.5 text-sm text-red-400 active:bg-red-500/10">
                  <Trash2 size={15} /> ลบทริป
                </button>
              </div>
            )}
          </div>
        )}

        {/* Trip info — bottom of hero */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
          {/* Tags row */}
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium flex items-center gap-1"
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', color: 'rgba(255,255,255,0.8)' }}>
              {trip.is_international ? <><Globe size={10} /> ต่างประเทศ</> : <><MapPin size={10} /> ในประเทศ</>}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium"
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', color: 'rgba(255,255,255,0.7)' }}>
              {tripDays} วัน
            </span>
            {trip.rates_locked_at && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium flex items-center gap-1"
                style={{ background: 'rgba(245,158,11,0.25)', color: '#fcd34d' }}>
                <Lock size={10} /> ล็อคเรท
              </span>
            )}
          </div>

          {/* Trip name */}
          <h1 className="text-[26px] font-black text-white leading-tight tracking-tight drop-shadow-lg">
            {trip.name}
          </h1>
          <p className="text-sm mt-1 flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
            <MapPin size={12} />
            {trip.destination}
            <span className="mx-1 opacity-40">·</span>
            {format(startDate, 'd MMM', { locale: th })} – {format(endDate, 'd MMM yy', { locale: th })}
          </p>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-4 space-y-3 mt-4">

        {/* Countdown */}
        <CountdownTimer startDate={trip.start_date} endDate={trip.end_date} />

        {/* Members */}
        <div className="rounded-2xl px-4 py-3.5 space-y-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={15} className="text-indigo-400" />
              <span className="text-sm font-semibold text-white">{trip.trip_members.length} คนในทริป</span>
            </div>
            {isHost && <InviteButton tripId={trip.id} />}
          </div>
          <div className="flex flex-wrap gap-3">
            {trip.trip_members.map(m => (
              <div key={m.user_id} className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 rounded-2xl overflow-hidden"
                  style={{ background: `linear-gradient(135deg,${c1},${c2})`, border: '2px solid var(--surface-3)' }}>
                  {m.profile?.avatar_url
                    ? <Image src={m.profile.avatar_url} alt="" width={48} height={48} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-lg font-bold text-white">{m.profile?.display_name?.[0]?.toUpperCase()}</div>
                  }
                </div>
                <span className="text-[10px] max-w-[48px] truncate text-center" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {m.profile?.display_name}
                </span>
                {m.role === 'host' && (
                  <span className="text-[9px] font-semibold -mt-1" style={{ color: '#818cf8' }}>Host</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Weather */}
        {trip.destination_lat && trip.destination_lng && (
          <WeatherWidget lat={trip.destination_lat} lng={trip.destination_lng} destination={trip.destination} />
        )}
      </div>

      {/* Backdrop for menu */}
      {showMenu && <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />}
    </div>
  )
}
