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

const PALETTES = [
  { g: ['#6366f1','#a855f7'], bg: 'rgba(99,102,241,0.10)',  glow: 'rgba(99,102,241,0.30)'  },
  { g: ['#06b6d4','#6366f1'], bg: 'rgba(6,182,212,0.10)',   glow: 'rgba(6,182,212,0.28)'   },
  { g: ['#f59e0b','#ef4444'], bg: 'rgba(245,158,11,0.10)',  glow: 'rgba(245,158,11,0.30)'  },
  { g: ['#10b981','#06b6d4'], bg: 'rgba(16,185,129,0.10)',  glow: 'rgba(16,185,129,0.28)'  },
  { g: ['#ec4899','#8b5cf6'], bg: 'rgba(236,72,153,0.10)',  glow: 'rgba(236,72,153,0.28)'  },
]

// Decorative background overlay — route dots + sticker
function CardOverlay({ g }: { g: string[] }) {
  return (
    <svg
      aria-hidden
      style={{ position: 'absolute', right: 0, bottom: 0, width: 160, height: 130, opacity: 0.18, pointerEvents: 'none' }}
      viewBox="0 0 160 130" fill="none"
    >
      {/* Winding dotted route line */}
      <path
        d="M 10 110 Q 40 70 80 90 Q 110 108 140 60 Q 150 40 155 20"
        stroke="white" strokeWidth="2.5" strokeDasharray="5 7"
        strokeLinecap="round" fill="none"
      />
      {/* Plane sticker at end of route */}
      <text x="134" y="22" fontSize="20" fill="white">✈️</text>
      {/* Cloud sticker */}
      <text x="18" y="52" fontSize="16" fill="white">☁️</text>
      {/* Camera sticker */}
      <text x="88" y="78" fontSize="14" fill="white">📷</text>
      {/* Small dots along the way */}
      <circle cx="40" cy="84" r="3" fill="white" opacity="0.6"/>
      <circle cx="80" cy="90" r="3" fill="white" opacity="0.6"/>
      <circle cx="118" cy="72" r="3" fill="white" opacity="0.6"/>
    </svg>
  )
}

export default function TripCard({ trip, members }: Props) {
  const today    = startOfToday()
  const startDate = parseISO(trip.start_date)
  const endDate   = parseISO(trip.end_date)
  const isPast    = isBefore(endDate, today)
  const daysUntil = differenceInDays(startDate, today)
  const tripLen   = differenceInDays(endDate, startDate) + 1
  const { g, bg, glow } = PALETTES[trip.id.charCodeAt(0) % PALETTES.length]

  // ── Glassmorphism Countdown Badge (ข้อ 2) ──
  const CountdownBadge = () => {
    if (isPast) return (
      <span style={{
        display: 'flex', alignItems: 'center', gap: 5,
        background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 600,
        padding: '5px 11px', borderRadius: 99,
        border: '1px solid rgba(255,255,255,0.14)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}>
        ✅ เสร็จแล้ว
      </span>
    )
    if (daysUntil === 0) return (
      <span style={{
        display: 'flex', alignItems: 'center', gap: 5,
        background: 'linear-gradient(135deg,rgba(34,197,94,0.9),rgba(16,185,129,0.9))',
        backdropFilter: 'blur(16px)',
        color: 'white', fontSize: 11, fontWeight: 700,
        padding: '5px 12px', borderRadius: 99,
        border: '1px solid rgba(255,255,255,0.25)',
        boxShadow: '0 3px 16px rgba(34,197,94,0.50), 0 1px 0 rgba(255,255,255,0.15) inset',
      }}>
        🎉 วันนี้เลย!
      </span>
    )
    if (daysUntil > 0) return (
      <span style={{
        display: 'flex', alignItems: 'center', gap: 5,
        background: 'rgba(0,0,0,0.30)', backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        color: 'white', fontSize: 11, fontWeight: 700,
        padding: '5px 12px', borderRadius: 99,
        border: '1px solid rgba(255,255,255,0.22)',
        boxShadow: `0 3px 14px ${glow}, 0 1px 0 rgba(255,255,255,0.10) inset`,
        letterSpacing: '-0.01em',
      }}>
        ✈️ อีก {daysUntil} วัน
      </span>
    )
    return null
  }

  return (
    <Link href={`/trips/${trip.id}`} style={{ display: 'block', textDecoration: 'none' }}>
      <div
        className="pressable"
        style={{
          borderRadius: 28,
          overflow: 'hidden',
          background: 'var(--s0)',
          border: '1px solid var(--b0)',
          boxShadow: `0 2px 0 var(--b0), 0 8px 32px rgba(0,0,0,0.22), 0 0 0 0.5px rgba(255,255,255,0.03) inset`,
          transition: 'transform 0.14s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease',
          fontFamily: '"Noto Sans Thai Looped", "Noto Sans Thai", "SF Pro Rounded", system-ui, sans-serif',
        }}
      >

        {/* ── Cover Hero ── */}
        <div style={{
          position: 'relative', height: 188,
          background: `linear-gradient(145deg, ${g[0]} 0%, ${g[1]} 100%)`,
          overflow: 'hidden',
        }}>
          {/* Cover photo */}
          {trip.cover_image_url && (
            <Image src={trip.cover_image_url} alt={trip.name} fill
              style={{ objectFit: 'cover', opacity: 0.38, mixBlendMode: 'overlay' }} />
          )}

          {/* Bottom fade */}
          <div style={{ position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.12) 40%, rgba(0,0,0,0.62) 100%)' }} />

          {/* Subtle grain */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.055,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }} />

          {/* Decorative route overlay (ข้อ 1) */}
          <CardOverlay g={g} />

          {/* Top badges */}
          <div style={{ position: 'absolute', top: 14, left: 14, right: 14,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              color: 'rgba(255,255,255,0.80)', fontSize: 11, fontWeight: 600,
              padding: '5px 11px', borderRadius: 99,
              border: '1px solid rgba(255,255,255,0.14)',
            }}>
              {trip.is_international ? <Globe size={10}/> : <MapPin size={10}/>}
              {trip.is_international ? 'ต่างประเทศ' : 'ในประเทศ'}
            </span>

            {/* Glassmorphism countdown badge (ข้อ 2) */}
            <CountdownBadge />
          </div>

          {/* Trip name — rounded font, bottom of hero */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 18px 15px' }}>
            <h3 style={{
              color: 'white',
              fontSize: 23,
              fontWeight: 800,
              letterSpacing: '-0.025em',
              lineHeight: 1.18,
              textShadow: '0 2px 14px rgba(0,0,0,0.45)',
              margin: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontFamily: '"Noto Sans Thai Looped", "Noto Sans Thai", "SF Pro Rounded", system-ui, sans-serif',
            }}>
              {trip.name}
            </h3>
          </div>
        </div>

        {/* ── Info footer ── */}
        <div style={{ padding: '13px 16px 15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            {/* Destination with pin icon (ข้อ 1) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <span style={{ fontSize: 13 }}>📍</span>
              <span style={{
                fontSize: 13, fontWeight: 700, color: 'var(--t1)',
                maxWidth: 165, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontFamily: '"Noto Sans Thai Looped", "Noto Sans Thai", "SF Pro Rounded", system-ui, sans-serif',
              }}>
                {trip.destination}
              </span>
            </div>
            {/* Date + length */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 500 }}>
                {format(startDate, 'd MMM', { locale: th })} – {format(endDate, 'd MMM yy', { locale: th })}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 700,
                background: bg, color: g[0],
                padding: '2px 9px', borderRadius: 99,
                border: `1px solid ${g[0]}28`,
              }}>
                {tripLen} วัน
              </span>
            </div>
          </div>

          {/* Member avatars — stacked */}
          <div style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center' }}>
            {members.length > 5 && (
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'var(--s2)', border: '2.5px solid var(--s0)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: 'var(--t2)',
                marginLeft: -9,
              }}>+{members.length - 5}</div>
            )}
            {members.slice(0, 5).reverse().map(m => (
              <div key={m.user_id} style={{
                width: 32, height: 32, borderRadius: '50%',
                background: `linear-gradient(135deg, ${g[0]}, ${g[1]})`,
                border: '2.5px solid var(--s0)',
                overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: 'white',
                marginLeft: -9, flexShrink: 0,
                boxShadow: `0 2px 6px rgba(0,0,0,0.18)`,
              }}>
                {m.profile?.avatar_url
                  ? <Image src={m.profile.avatar_url} alt="" width={32} height={32}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
