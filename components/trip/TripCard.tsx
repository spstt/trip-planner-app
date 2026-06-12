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

// Sketch-style travel illustration — right side of card
function CardOverlay() {
  return (
    <svg
      aria-hidden
      style={{ position: 'absolute', right: 0, top: 0, width: 180, height: 188, opacity: 0.22, pointerEvents: 'none' }}
      viewBox="0 0 180 188" fill="none"
    >
      {/* Hot air balloon — top right */}
      <ellipse cx="142" cy="34" rx="18" ry="22" stroke="white" strokeWidth="1.8" strokeDasharray="0"/>
      <line x1="134" y1="54" x2="130" y2="64" stroke="white" strokeWidth="1.4"/>
      <line x1="150" y1="54" x2="154" y2="64" stroke="white" strokeWidth="1.4"/>
      <rect x="128" y="64" width="28" height="14" rx="5" stroke="white" strokeWidth="1.5"/>
      {/* Balloon stripes */}
      <line x1="142" y1="12" x2="142" y2="56" stroke="white" strokeWidth="1" opacity="0.5"/>
      <line x1="127" y1="30" x2="157" y2="30" stroke="white" strokeWidth="1" opacity="0.5"/>

      {/* Winding dotted route */}
      <path
        d="M 20 165 Q 55 130 90 148 Q 120 162 148 118 Q 158 98 162 76"
        stroke="white" strokeWidth="2" strokeDasharray="4 6"
        strokeLinecap="round" fill="none"
      />
      {/* Plane at end of route */}
      <text x="152" y="74" fontSize="16" fill="white">✈️</text>

      {/* Mountains — bottom right */}
      <polyline points="90,175 110,148 130,175" stroke="white" strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
      <polyline points="115,175 138,142 161,175" stroke="white" strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
      {/* Snow caps */}
      <polyline points="105,155 110,148 115,155" stroke="white" strokeWidth="1.2" strokeLinejoin="round" fill="none"/>
      <polyline points="133,150 138,142 143,150" stroke="white" strokeWidth="1.2" strokeLinejoin="round" fill="none"/>

      {/* Compass rose — lower left area */}
      <circle cx="38" cy="135" r="13" stroke="white" strokeWidth="1.2"/>
      <line x1="38" y1="122" x2="38" y2="148" stroke="white" strokeWidth="1.2"/>
      <line x1="25" y1="135" x2="51" y2="135" stroke="white" strokeWidth="1.2"/>
      <polygon points="38,122 35,130 38,128 41,130" fill="white" opacity="0.9"/>
      <text x="35.5" y="120" fontSize="7" fill="white" fontWeight="bold">N</text>

      {/* Clouds */}
      <ellipse cx="65" cy="30" rx="14" ry="8" stroke="white" strokeWidth="1.4" fill="none"/>
      <ellipse cx="55" cy="33" rx="10" ry="7" stroke="white" strokeWidth="1.4" fill="none"/>
      <ellipse cx="76" cy="33" rx="10" ry="6" stroke="white" strokeWidth="1.4" fill="none"/>

      {/* Sparkle stars */}
      <text x="20" y="78" fontSize="12" fill="white">✦</text>
      <text x="95" y="105" fontSize="9" fill="white">✦</text>
      <text x="160" y="105" fontSize="7" fill="white">✦</text>

      {/* Waypoint dots */}
      <circle cx="55" cy="141" r="3.5" fill="white" opacity="0.7"/>
      <circle cx="90" cy="148" r="3.5" fill="white" opacity="0.7"/>
      <circle cx="128" cy="126" r="3.5" fill="white" opacity="0.7"/>
    </svg>
  )
}

export default function TripCard({ trip, members }: Props) {
  const today     = startOfToday()
  const startDate = parseISO(trip.start_date)
  const endDate   = parseISO(trip.end_date)
  const isPast    = isBefore(endDate, today)
  const daysUntil = differenceInDays(startDate, today)
  const tripLen   = differenceInDays(endDate, startDate) + 1
  const { g, bg, glow } = PALETTES[trip.id.charCodeAt(0) % PALETTES.length]

  // ── Glassmorphism Countdown Badge ──
  const CountdownBadge = () => {
    if (isPast) return (
      <span style={{
        display: 'flex', alignItems: 'center', gap: 5,
        background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        color: 'rgba(255,255,255,0.80)', fontSize: 11, fontWeight: 600,
        padding: '5px 11px', borderRadius: 99,
        border: '1px solid rgba(255,255,255,0.22)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
      }}>
        ✅ เสร็จแล้ว
      </span>
    )
    if (daysUntil === 0) return (
      <span style={{
        display: 'flex', alignItems: 'center', gap: 5,
        background: 'linear-gradient(135deg,rgba(34,197,94,0.88),rgba(16,185,129,0.88))',
        backdropFilter: 'blur(16px)',
        color: 'white', fontSize: 11, fontWeight: 700,
        padding: '5px 12px', borderRadius: 99,
        border: '1px solid rgba(255,255,255,0.28)',
        boxShadow: '0 3px 16px rgba(34,197,94,0.50), 0 1px 0 rgba(255,255,255,0.18) inset',
      }}>
        🎉 วันนี้เลย!
      </span>
    )
    if (daysUntil > 0) return (
      <span style={{
        display: 'flex', alignItems: 'center', gap: 5,
        background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        color: 'white', fontSize: 11, fontWeight: 700,
        padding: '5px 12px', borderRadius: 99,
        border: '1px solid rgba(255,255,255,0.28)',
        boxShadow: `0 3px 14px ${glow}, 0 1px 0 rgba(255,255,255,0.14) inset`,
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
          boxShadow: `0 2px 0 var(--b0), 0 8px 32px rgba(0,0,0,0.18), 0 0 0 0.5px rgba(255,255,255,0.03) inset`,
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

          {/* Bottom fade — deeper for legibility */}
          <div style={{ position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.08) 35%, rgba(0,0,0,0.68) 100%)' }} />

          {/* Subtle grain */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.045,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }} />

          {/* Sketch travel illustration (right side) */}
          <CardOverlay />

          {/* Top badges */}
          <div style={{ position: 'absolute', top: 14, left: 14, right: 14,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Soft glass domestic/international badge */}
            <span style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              color: 'rgba(255,255,255,0.92)', fontSize: 11, fontWeight: 600,
              padding: '5px 11px', borderRadius: 99,
              border: '1px solid rgba(255,255,255,0.30)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}>
              {trip.is_international ? <Globe size={10}/> : <MapPin size={10}/>}
              {trip.is_international ? 'ต่างประเทศ' : 'ในประเทศ'}
            </span>

            <CountdownBadge />
          </div>

          {/* Trip name — bottom of hero */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 18px 16px' }}>
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

        {/* ── Ticket torn-paper divider ── */}
        <div style={{
          height: 14,
          background: `radial-gradient(circle at 10px 0px, var(--s0) 6px, transparent 6.5px),
                       radial-gradient(circle at 10px 0px, var(--s0) 6px, transparent 6.5px)`,
          backgroundSize: '20px 14px',
          backgroundRepeat: 'repeat-x',
          backgroundPosition: 'top left',
          backgroundColor: `${g[1]}`,
          marginTop: 0,
          position: 'relative',
          zIndex: 1,
        }} />

        {/* ── Info footer ── */}
        <div style={{ padding: '10px 16px 15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--s0)' }}>
          <div>
            {/* Destination with pin icon */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
              <span style={{ fontSize: 13 }}>📍</span>
              <span style={{
                fontSize: 13, fontWeight: 700, color: 'var(--t1)',
                maxWidth: 165, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontFamily: '"Noto Sans Thai Looped", "Noto Sans Thai", "SF Pro Rounded", system-ui, sans-serif',
              }}>
                {trip.destination}
              </span>
            </div>
            {/* Date + trip-length pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 500 }}>
                {format(startDate, 'd MMM', { locale: th })} – {format(endDate, 'd MMM yy', { locale: th })}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 700,
                background: bg, color: g[0],
                padding: '2px 9px', borderRadius: 99,
                border: `1px solid ${g[0]}30`,
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
