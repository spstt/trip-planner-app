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

// Soft pastel palettes — no vivid gradients
const PALETTES = [
  { pastel: '#f0effe', accent: '#6366f1', dim: '#c7d2fe', pill: 'rgba(99,102,241,0.10)'  },
  { pastel: '#e8f5fd', accent: '#0891b2', dim: '#bae6fd', pill: 'rgba(8,145,178,0.10)'   },
  { pastel: '#fff7ed', accent: '#ea580c', dim: '#fed7aa', pill: 'rgba(234,88,12,0.10)'    },
  { pastel: '#ecfdf5', accent: '#059669', dim: '#a7f3d0', pill: 'rgba(5,150,105,0.10)'    },
  { pastel: '#fdf2f8', accent: '#db2777', dim: '#fbcfe8', pill: 'rgba(219,39,119,0.10)'   },
]

// Kawaii sketch overlay — strokes in accent color
function CardOverlay({ accent }: { accent: string }) {
  return (
    <svg
      aria-hidden
      style={{ position: 'absolute', right: 0, top: 0, width: 190, height: 188, opacity: 0.18, pointerEvents: 'none' }}
      viewBox="0 0 190 188" fill="none"
    >
      {/* Hot air balloon */}
      <ellipse cx="152" cy="36" rx="19" ry="23" stroke={accent} strokeWidth="1.8"/>
      <line x1="144" y1="57" x2="140" y2="67" stroke={accent} strokeWidth="1.4"/>
      <line x1="160" y1="57" x2="164" y2="67" stroke={accent} strokeWidth="1.4"/>
      <rect x="138" y="67" width="28" height="13" rx="5" stroke={accent} strokeWidth="1.5"/>
      <line x1="152" y1="14" x2="152" y2="59" stroke={accent} strokeWidth="1" opacity="0.55"/>
      <line x1="133" y1="33" x2="171" y2="33" stroke={accent} strokeWidth="1" opacity="0.55"/>

      {/* Dotted travel route */}
      <path d="M 18 168 Q 52 132 88 150 Q 118 164 148 120 Q 158 100 163 78"
        stroke={accent} strokeWidth="2" strokeDasharray="4 6" strokeLinecap="round"/>
      {/* Plane emoji at route end */}
      <text x="154" y="76" fontSize="15" fill={accent} opacity="0.7">✈</text>

      {/* Mountains */}
      <polyline points="88,178 108,152 128,178" stroke={accent} strokeWidth="1.6" strokeLinejoin="round"/>
      <polyline points="114,178 136,146 158,178" stroke={accent} strokeWidth="1.6" strokeLinejoin="round"/>
      <polyline points="103,159 108,152 113,159" stroke={accent} strokeWidth="1.2" strokeLinejoin="round"/>
      <polyline points="131,153 136,146 141,153" stroke={accent} strokeWidth="1.2" strokeLinejoin="round"/>

      {/* Compass */}
      <circle cx="36" cy="136" r="13" stroke={accent} strokeWidth="1.2"/>
      <line x1="36" y1="123" x2="36" y2="149" stroke={accent} strokeWidth="1.2"/>
      <line x1="23" y1="136" x2="49" y2="136" stroke={accent} strokeWidth="1.2"/>
      <polygon points="36,123 33,131 36,129 39,131" fill={accent} opacity="0.8"/>
      <text x="33" y="121" fontSize="7" fill={accent} fontWeight="bold">N</text>

      {/* Fluffy cloud */}
      <ellipse cx="60" cy="30" rx="15" ry="8" stroke={accent} strokeWidth="1.4"/>
      <ellipse cx="49" cy="33" rx="10" ry="7" stroke={accent} strokeWidth="1.4"/>
      <ellipse cx="72" cy="33" rx="10" ry="6" stroke={accent} strokeWidth="1.4"/>

      {/* Sparkle dots */}
      <circle cx="22" cy="76" r="2.5" fill={accent} opacity="0.6"/>
      <circle cx="17" cy="68" r="1.5" fill={accent} opacity="0.4"/>
      <circle cx="30" cy="70" r="1.5" fill={accent} opacity="0.4"/>
      <circle cx="93" cy="106" r="2" fill={accent} opacity="0.5"/>
      <circle cx="166" cy="108" r="1.5" fill={accent} opacity="0.4"/>

      {/* Waypoint dots on route */}
      <circle cx="52" cy="143" r="3.5" fill={accent} opacity="0.65"/>
      <circle cx="88" cy="150" r="3.5" fill={accent} opacity="0.65"/>
      <circle cx="126" cy="128" r="3.5" fill={accent} opacity="0.65"/>
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
  const pal       = PALETTES[trip.id.charCodeAt(0) % PALETTES.length]

  // Clean pastel badges — white bg, accent border + text
  const TypeBadge = () => (
    <span style={{
      display: 'flex', alignItems: 'center', gap: 5,
      background: 'rgba(255,255,255,0.82)',
      backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      color: pal.accent, fontSize: 11, fontWeight: 700,
      padding: '5px 11px', borderRadius: 99,
      border: `1.5px solid ${pal.accent}40`,
      boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
    }}>
      {trip.is_international ? <Globe size={10}/> : <MapPin size={10}/>}
      {trip.is_international ? 'ต่างประเทศ' : 'ในประเทศ'}
    </span>
  )

  const CountdownBadge = () => {
    if (isPast) return (
      <span style={{
        display: 'flex', alignItems: 'center', gap: 5,
        background: 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        color: '#64748b', fontSize: 11, fontWeight: 600,
        padding: '5px 11px', borderRadius: 99,
        border: '1.5px solid rgba(100,116,139,0.25)',
        boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
      }}>
        ✅ เสร็จแล้ว
      </span>
    )
    if (daysUntil === 0) return (
      <span style={{
        display: 'flex', alignItems: 'center', gap: 5,
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        color: '#059669', fontSize: 11, fontWeight: 700,
        padding: '5px 12px', borderRadius: 99,
        border: '1.5px solid rgba(5,150,105,0.30)',
        boxShadow: '0 1px 8px rgba(5,150,105,0.18)',
      }}>
        🎉 วันนี้เลย!
      </span>
    )
    if (daysUntil > 0) return (
      <span style={{
        display: 'flex', alignItems: 'center', gap: 5,
        background: 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        color: pal.accent, fontSize: 11, fontWeight: 700,
        padding: '5px 12px', borderRadius: 99,
        border: `1.5px solid ${pal.accent}40`,
        boxShadow: `0 1px 8px ${pal.accent}22`,
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
          boxShadow: '0 2px 0 var(--b0), 0 6px 24px rgba(0,0,0,0.08)',
          transition: 'transform 0.14s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease',
          fontFamily: '"Noto Sans Thai Looped", "Noto Sans Thai", "SF Pro Rounded", system-ui, sans-serif',
        }}
      >

        {/* ── Pastel Hero ── */}
        <div style={{
          position: 'relative', height: 188,
          background: pal.pastel,
          overflow: 'hidden',
        }}>
          {/* Cover photo — multiply blend over pastel bg, soft look */}
          {trip.cover_image_url && (
            <Image src={trip.cover_image_url} alt={trip.name} fill
              style={{ objectFit: 'cover', opacity: 0.45, mixBlendMode: 'multiply' }} />
          )}

          {/* Soft vignette at bottom for title readability */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(to bottom,
              transparent 45%,
              ${pal.dim}88 80%,
              ${pal.dim}dd 100%)`,
          }} />

          {/* Subtle radial highlight — top left glow */}
          <div style={{
            position: 'absolute', top: -40, left: -20,
            width: 200, height: 160, borderRadius: '50%',
            background: `radial-gradient(circle, rgba(255,255,255,0.45) 0%, transparent 65%)`,
            pointerEvents: 'none',
          }} />

          {/* Kawaii sketch overlay */}
          <CardOverlay accent={pal.accent} />

          {/* Top badges */}
          <div style={{
            position: 'absolute', top: 14, left: 14, right: 14,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <TypeBadge />
            <CountdownBadge />
          </div>

          {/* Trip name — dark text on light hero */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 18px 16px' }}>
            <h3 style={{
              color: '#1e293b',
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: '-0.025em',
              lineHeight: 1.2,
              margin: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontFamily: '"Noto Sans Thai Looped", "Noto Sans Thai", "SF Pro Rounded", system-ui, sans-serif',
            }}>
              {trip.name}
            </h3>
          </div>
        </div>

        {/* ── Ticket scallop divider ── */}
        <div style={{
          height: 14,
          backgroundImage: `radial-gradient(circle at 10px 0px, var(--s0) 6px, transparent 6.5px)`,
          backgroundSize: '20px 14px',
          backgroundRepeat: 'repeat-x',
          backgroundColor: pal.dim,
          position: 'relative', zIndex: 1,
        }} />

        {/* ── Info footer ── */}
        <div style={{
          padding: '10px 16px 15px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--s0)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
              <span style={{ fontSize: 13 }}>📍</span>
              <span style={{
                fontSize: 13, fontWeight: 700, color: 'var(--t1)',
                maxWidth: 165, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {trip.destination}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 500 }}>
                {format(startDate, 'd MMM', { locale: th })} – {format(endDate, 'd MMM yy', { locale: th })}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 700,
                background: pal.pill, color: pal.accent,
                padding: '2px 9px', borderRadius: 99,
                border: `1px solid ${pal.accent}28`,
              }}>
                {tripLen} วัน
              </span>
            </div>
          </div>

          {/* Member avatars */}
          <div style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center' }}>
            {members.length > 5 && (
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: pal.pill, border: '2.5px solid var(--s0)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: pal.accent,
                marginLeft: -9,
              }}>+{members.length - 5}</div>
            )}
            {members.slice(0, 5).reverse().map(m => (
              <div key={m.user_id} style={{
                width: 32, height: 32, borderRadius: '50%',
                background: `${pal.pastel}`,
                border: `2.5px solid var(--s0)`,
                outline: `1.5px solid ${pal.accent}30`,
                overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: pal.accent,
                marginLeft: -9, flexShrink: 0,
                boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
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
