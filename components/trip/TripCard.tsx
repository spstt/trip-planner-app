'use client'
import Link from 'next/link'
import Image from 'next/image'
import { differenceInDays, parseISO, format, isBefore, startOfToday } from 'date-fns'
import { th } from 'date-fns/locale'
import { MapPin, Globe } from 'lucide-react'
import type { Trip, TripMember, Profile } from '@/types'

interface Props {
  trip: Trip
  members: (TripMember & { profile: Profile })[]
}

// Carefully chosen gradient pairs — each feels unique
const PALETTES = [
  { g: ['#6366f1','#a855f7'],  bg: 'rgba(99,102,241,0.08)'  },
  { g: ['#06b6d4','#6366f1'],  bg: 'rgba(6,182,212,0.08)'   },
  { g: ['#f59e0b','#ef4444'],  bg: 'rgba(245,158,11,0.08)'  },
  { g: ['#10b981','#06b6d4'],  bg: 'rgba(16,185,129,0.08)'  },
  { g: ['#ec4899','#8b5cf6'],  bg: 'rgba(236,72,153,0.08)'  },
]

export default function TripCard({ trip, members }: Props) {
  const today = startOfToday()
  const startDate = parseISO(trip.start_date)
  const endDate   = parseISO(trip.end_date)
  const isPast    = isBefore(endDate, today)
  const daysUntil = differenceInDays(startDate, today)
  const tripLen   = differenceInDays(endDate, startDate) + 1
  const { g, bg } = PALETTES[trip.id.charCodeAt(0) % PALETTES.length]

  const CountdownBadge = () => {
    if (isPast) return (
      <span style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 99 }}>
        เสร็จแล้ว
      </span>
    )
    if (daysUntil === 0) return (
      <span style={{ background: 'rgba(34,197,94,0.85)', color: 'white', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 99, boxShadow: '0 2px 12px rgba(34,197,94,0.4)' }}>
        🎉 วันนี้เลย!
      </span>
    )
    if (daysUntil > 0) return (
      <span style={{ background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(12px)', color: 'white', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 99 }}>
        อีก {daysUntil} วัน
      </span>
    )
    return null
  }

  return (
    <Link href={`/trips/${trip.id}`} style={{ display: 'block', textDecoration: 'none' }}>
      <div className="pressable" style={{
        borderRadius: 24,
        overflow: 'hidden',
        background: 'var(--s0)',
        border: '1px solid var(--b0)',
        boxShadow: `0 2px 0 var(--b0), 0 8px 32px rgba(0,0,0,0.25)`,
        transition: 'transform 0.14s cubic-bezier(0.34,1.56,0.64,1)',
      }}>

        {/* ── Cover Hero ── */}
        <div style={{
          position: 'relative', height: 180,
          background: `linear-gradient(135deg, ${g[0]} 0%, ${g[1]} 100%)`,
          overflow: 'hidden',
        }}>
          {trip.cover_image_url && (
            <Image src={trip.cover_image_url} alt={trip.name} fill style={{ objectFit: 'cover', opacity: 0.35, mixBlendMode: 'overlay' }} />
          )}

          {/* Layered depth overlays */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.55) 100%)' }} />
          {/* Subtle grain for depth */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.06,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }} />

          {/* Top badges */}
          <div style={{ position: 'absolute', top: 14, left: 14, right: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(12px)',
              color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: 600,
              padding: '4px 10px', borderRadius: 99,
              border: '1px solid rgba(255,255,255,0.12)',
            }}>
              {trip.is_international ? <Globe size={10}/> : <MapPin size={10}/>}
              {trip.is_international ? 'ต่างประเทศ' : 'ในประเทศ'}
            </span>
            <CountdownBadge />
          </div>

          {/* Trip name */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 18px 16px' }}>
            <h3 style={{
              color: 'white', fontSize: 22, fontWeight: 800,
              letterSpacing: '-0.03em', lineHeight: 1.2,
              textShadow: '0 2px 12px rgba(0,0,0,0.4)',
              margin: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{trip.name}</h3>
          </div>
        </div>

        {/* ── Info footer ── */}
        <div style={{ padding: '12px 16px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            {/* Destination */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
              <MapPin size={11} color="var(--t2)" />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t2)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {trip.destination}
              </span>
            </div>
            {/* Date + length */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--t3)' }}>
                {format(startDate, 'd MMM', { locale: th })} – {format(endDate, 'd MMM yy', { locale: th })}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 700,
                background: bg,
                color: g[0],
                padding: '2px 8px', borderRadius: 99,
              }}>{tripLen} วัน</span>
            </div>
          </div>

          {/* Member avatars */}
          <div style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center' }}>
            {members.length > 5 && (
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'var(--s2)', border: '2px solid var(--s0)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: 'var(--t2)',
                marginLeft: -8,
              }}>+{members.length - 5}</div>
            )}
            {members.slice(0, 5).reverse().map(m => (
              <div key={m.user_id} style={{
                width: 30, height: 30, borderRadius: '50%',
                background: `linear-gradient(135deg, ${g[0]}, ${g[1]})`,
                border: '2px solid var(--s0)',
                overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: 'white',
                marginLeft: -8, flexShrink: 0,
              }}>
                {m.profile?.avatar_url
                  ? <Image src={m.profile.avatar_url} alt="" width={30} height={30} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : m.profile?.display_name?.[0]?.toUpperCase() ?? '?'
                }
              </div>
            ))}
          </div>
        </div>
      </div>
    </Link>
  )
}
