'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft, MapPin, Users, Copy, Check, Navigation,
  Map, Receipt, CheckSquare, Plane, Globe, Lock, Trash2
} from 'lucide-react'
import { format, differenceInDays, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'
import type { Trip, TripMember, Profile } from '@/types'
import WeatherWidget from '@/components/trip/WeatherWidget'
import CountdownTimer from '@/components/trip/CountdownTimer'
import InviteButton from '@/components/trip/InviteButton'

interface TripData extends Trip {
  trip_members: (TripMember & { profile: Profile })[]
}

const NAV_TABS = [
  { href: 'itinerary', icon: Map,         label: 'แผน' },
  { href: 'bookings',  icon: Plane,        label: 'ตั๋ว' },
  { href: 'expenses',  icon: Receipt,      label: 'บัญชี' },
  { href: 'checklist', icon: CheckSquare,  label: 'ของ' },
]

export default function TripOverviewPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [trip, setTrip] = useState<TripData | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTrip()
  }, [id])

  async function loadTrip() {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUserId(user?.id ?? null)

    const { data } = await supabase
      .from('trips')
      .select(`
        *,
        trip_members (
          user_id, role, joined_at,
          profile:profiles (id, display_name, avatar_url, bank_account, promptpay)
        )
      `)
      .eq('id', id)
      .single()

    setTrip(data as TripData)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="px-4 pt-4 space-y-4">
        <div className="shimmer rounded-3xl h-56" />
        <div className="shimmer rounded-2xl h-32" />
      </div>
    )
  }

  if (!trip) return <div className="p-8 text-center text-slate-500">ไม่พบทริปนี้</div>

  const isHost = trip.trip_members.some(m => m.user_id === currentUserId && m.role === 'host')
  const startDate = parseISO(trip.start_date)
  const endDate = parseISO(trip.end_date)
  const tripDays = differenceInDays(endDate, startDate) + 1

  return (
    <div className="pb-4">
      {/* Hero cover */}
      <div className="relative h-64">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-700">
          {trip.cover_image_url && (
            <Image src={trip.cover_image_url} alt={trip.name} fill className="object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-black/20 to-transparent" />
        </div>

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute top-safe left-4 mt-4 w-10 h-10 rounded-2xl glass flex items-center justify-center active:scale-90"
        >
          <ArrowLeft size={20} className="text-white" />
        </button>

        {/* Delete button (host only) */}
        {isHost && (
          <button
            onClick={async () => {
              if (!confirm('ลบทริปนี้? ข้อมูลทั้งหมดจะหายถาวร')) return
              const supabase = createClient()
              const { error } = await supabase.from('trips').delete().eq('id', id)
              if (error) { alert('ลบไม่สำเร็จ: ' + error.message); return }
              router.push('/dashboard')
            }}
            className="absolute top-safe right-4 mt-4 w-10 h-10 rounded-2xl glass flex items-center justify-center active:scale-90 border border-red-500/30"
          >
            <Trash2 size={18} className="text-red-400" />
          </button>
        )}

        {/* Trip info overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
          <div className="flex items-end justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {trip.is_international ? (
                  <span className="glass px-2 py-0.5 rounded-full text-xs text-white/70 flex items-center gap-1">
                    <Globe size={10} /> ต่างประเทศ
                  </span>
                ) : (
                  <span className="glass px-2 py-0.5 rounded-full text-xs text-white/70 flex items-center gap-1">
                    <MapPin size={10} /> ในประเทศ
                  </span>
                )}
                {trip.rates_locked_at && (
                  <span className="glass px-2 py-0.5 rounded-full text-xs text-amber-300 flex items-center gap-1">
                    <Lock size={10} /> ล็อคเรท
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-white truncate">{trip.name}</h1>
              <p className="text-slate-300 text-sm flex items-center gap-1 mt-0.5">
                <MapPin size={12} /> {trip.destination}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4 mt-4">
        {/* Countdown + dates */}
        <CountdownTimer startDate={trip.start_date} endDate={trip.end_date} />

        {/* Member avatars */}
        <div className="glass rounded-2xl px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-indigo-400" />
              <span className="text-sm font-medium text-slate-300">
                {trip.trip_members.length} คนในทริป
              </span>
            </div>
            {isHost && <InviteButton tripId={trip.id} />}
          </div>
          <div className="flex flex-wrap gap-2">
            {trip.trip_members.map(m => (
              <div key={m.user_id} className="flex flex-col items-center gap-1">
                <div className="w-11 h-11 rounded-full bg-indigo-600 overflow-hidden border-2 border-slate-800">
                  {m.profile?.avatar_url ? (
                    <Image src={m.profile.avatar_url} alt="" width={44} height={44} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg font-bold text-white">
                      {m.profile?.display_name?.[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="text-xs text-slate-400 max-w-[48px] truncate text-center">
                  {m.profile?.display_name}
                </span>
                {m.role === 'host' && (
                  <span className="text-[9px] text-indigo-400 -mt-1">Host</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Weather widget */}
        {trip.destination_lat && trip.destination_lng && (
          <WeatherWidget
            lat={trip.destination_lat}
            lng={trip.destination_lng}
            destination={trip.destination}
          />
        )}

        {/* Quick nav cards */}
        <div className="grid grid-cols-2 gap-3">
          {NAV_TABS.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={`/trips/${id}/${href}`}
              className="glass rounded-2xl p-4 flex flex-col gap-2 active:scale-95 transition-transform border border-white/5"
            >
              <Icon size={22} className="text-indigo-400" />
              <span className="text-sm font-medium text-slate-200">{label}</span>
              <span className="text-xs text-slate-500">กด เพื่อดูรายละเอียด →</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
