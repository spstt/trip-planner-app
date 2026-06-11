'use client'
import Link from 'next/link'
import Image from 'next/image'
import { differenceInDays, parseISO, format, isBefore, startOfToday } from 'date-fns'
import { th } from 'date-fns/locale'
import { Globe, MapPin, ChevronRight } from 'lucide-react'
import type { Trip, TripMember, Profile } from '@/types'
import { cn } from '@/lib/utils/cn'

interface Props {
  trip: Trip
  members: (TripMember & { profile: Profile })[]
}

const GRADIENT_COVERS = [
  'from-indigo-600 to-purple-600',
  'from-rose-500 to-orange-500',
  'from-cyan-500 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
]

export default function TripCard({ trip, members }: Props) {
  const today = startOfToday()
  const startDate = parseISO(trip.start_date)
  const endDate = parseISO(trip.end_date)
  const isPast = isBefore(endDate, today)
  const daysUntil = differenceInDays(startDate, today)
  const colorIdx = trip.id.charCodeAt(0) % GRADIENT_COVERS.length

  return (
    <Link href={`/trips/${trip.id}`} className="block active:scale-[0.98] transition-transform">
      <div className="rounded-3xl overflow-hidden glass border border-white/10 shadow-xl">
        {/* Cover */}
        <div className={cn('relative h-36 bg-gradient-to-br', GRADIENT_COVERS[colorIdx])}>
          {trip.cover_image_url && (
            <Image
              src={trip.cover_image_url}
              alt={trip.name}
              fill
              className="object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

          {/* Countdown badge */}
          <div className="absolute top-3 right-3">
            {isPast ? (
              <span className="glass px-3 py-1 rounded-full text-xs text-slate-300">ผ่านมาแล้ว</span>
            ) : daysUntil === 0 ? (
              <span className="bg-green-500 px-3 py-1 rounded-full text-xs font-bold text-white animate-pulse">วันนี้!</span>
            ) : daysUntil > 0 ? (
              <span className="glass px-3 py-1 rounded-full text-xs font-semibold text-white">
                อีก {daysUntil} วัน
              </span>
            ) : null}
          </div>

          {/* Trip type badge */}
          <div className="absolute top-3 left-3">
            <span className="glass px-2 py-1 rounded-full text-xs flex items-center gap-1 text-white/80">
              {trip.is_international ? <Globe size={12} /> : <MapPin size={12} />}
              {trip.is_international ? 'ต่างประเทศ' : 'ในประเทศ'}
            </span>
          </div>

          {/* Trip name on cover */}
          <div className="absolute bottom-3 left-4 right-4">
            <h3 className="text-white font-bold text-lg leading-tight truncate">{trip.name}</h3>
          </div>
        </div>

        {/* Info row */}
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs">
              <MapPin size={12} />
              <span className="truncate max-w-[160px]">{trip.destination}</span>
            </div>
            <p className="text-slate-500 text-xs">
              {format(startDate, 'd MMM', { locale: th })} – {format(endDate, 'd MMM yyyy', { locale: th })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Member avatars */}
            <div className="flex -space-x-2">
              {members.slice(0, 4).map(m => (
                <div
                  key={m.user_id}
                  className="w-7 h-7 rounded-full border-2 border-slate-900 bg-indigo-600 flex items-center justify-center text-xs font-bold text-white overflow-hidden"
                >
                  {m.profile?.avatar_url ? (
                    <Image src={m.profile.avatar_url} alt="" width={28} height={28} className="w-full h-full object-cover" />
                  ) : (
                    m.profile?.display_name?.[0]?.toUpperCase() ?? '?'
                  )}
                </div>
              ))}
              {members.length > 4 && (
                <div className="w-7 h-7 rounded-full border-2 border-slate-900 bg-slate-700 flex items-center justify-center text-xs text-slate-300">
                  +{members.length - 4}
                </div>
              )}
            </div>
            <ChevronRight size={16} className="text-slate-600" />
          </div>
        </div>
      </div>
    </Link>
  )
}
