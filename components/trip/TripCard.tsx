'use client'
import Link from 'next/link'
import Image from 'next/image'
import { differenceInDays, parseISO, format, isBefore, startOfToday, differenceInDays as diffDays } from 'date-fns'
import { th } from 'date-fns/locale'
import { Globe, MapPin } from 'lucide-react'
import type { Trip, TripMember, Profile } from '@/types'

interface Props {
  trip: Trip
  members: (TripMember & { profile: Profile })[]
}

// Rich gradient palettes per trip
const GRADIENTS = [
  ['#6366f1','#a855f7'],
  ['#ec4899','#f97316'],
  ['#06b6d4','#3b82f6'],
  ['#10b981','#06b6d4'],
  ['#f59e0b','#ef4444'],
]

export default function TripCard({ trip, members }: Props) {
  const today = startOfToday()
  const startDate = parseISO(trip.start_date)
  const endDate = parseISO(trip.end_date)
  const isPast = isBefore(endDate, today)
  const daysUntil = differenceInDays(startDate, today)
  const tripLen = diffDays(endDate, startDate) + 1
  const [c1, c2] = GRADIENTS[trip.id.charCodeAt(0) % GRADIENTS.length]

  return (
    <Link href={`/trips/${trip.id}`} className="block pressable card-glow">
      <div className="rounded-3xl overflow-hidden border" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>

        {/* Cover hero */}
        <div className="relative h-44 overflow-hidden" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
          {trip.cover_image_url && (
            <Image src={trip.cover_image_url} alt={trip.name} fill className="object-cover mix-blend-overlay opacity-60" />
          )}
          {/* Noise texture overlay */}
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'1\'/%3E%3C/svg%3E")',
          }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

          {/* Top badges */}
          <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
            <span className="glass-strong px-2.5 py-1 rounded-full text-[11px] flex items-center gap-1 text-white/80 font-medium">
              {trip.is_international ? <Globe size={11} /> : <MapPin size={11} />}
              {trip.is_international ? 'ต่างประเทศ' : 'ในประเทศ'}
            </span>

            {isPast ? (
              <span className="glass-strong px-2.5 py-1 rounded-full text-[11px] text-white/60">เสร็จแล้ว</span>
            ) : daysUntil === 0 ? (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold text-white animate-pulse" style={{ background: 'rgba(34,197,94,0.85)' }}>วันนี้! 🎉</span>
            ) : daysUntil > 0 ? (
              <span className="glass-strong px-2.5 py-1 rounded-full text-[11px] font-semibold text-white">
                อีก {daysUntil} วัน
              </span>
            ) : null}
          </div>

          {/* Bottom trip name */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
            <h3 className="text-white font-bold text-xl leading-tight tracking-tight drop-shadow">{trip.name}</h3>
          </div>
        </div>

        {/* Info footer */}
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
              <MapPin size={11} />
              <span className="truncate max-w-[150px]">{trip.destination}</span>
            </div>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {format(startDate, 'd MMM', { locale: th })} – {format(endDate, 'd MMM yy', { locale: th })}
              <span className="ml-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium" style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>
                {tripLen} วัน
              </span>
            </p>
          </div>

          {/* Member stack */}
          <div className="flex -space-x-2 shrink-0">
            {members.slice(0, 5).map(m => (
              <div key={m.user_id}
                className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ border: '2px solid var(--surface-2)', background: `linear-gradient(135deg, ${c1}, ${c2})` }}
              >
                {m.profile?.avatar_url
                  ? <Image src={m.profile.avatar_url} alt="" width={28} height={28} className="w-full h-full object-cover" />
                  : m.profile?.display_name?.[0]?.toUpperCase() ?? '?'
                }
              </div>
            ))}
            {members.length > 5 && (
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-slate-400"
                style={{ border: '2px solid var(--surface-2)', background: 'var(--surface-3)' }}>
                +{members.length - 5}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
