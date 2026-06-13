'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { differenceInDays, parseISO, format, isBefore, startOfToday } from 'date-fns'
import { th } from 'date-fns/locale'
import { MapPin, Globe, Calendar } from 'lucide-react'
import type { Trip, TripMember, Profile } from '@/types'

interface Props {
  trip: Trip
  members: (TripMember & { profile: Profile })[]
}

// Soft accent palette — used only for subtle pill/avatar tints, NOT for card bg
const PALETTES = [
  { pastel: '#f0effe', accent: '#6366f1', dim: '#c7d2fe', pill: 'rgba(99,102,241,0.10)'  },
  { pastel: '#e8f5fd', accent: '#0891b2', dim: '#bae6fd', pill: 'rgba(8,145,178,0.10)'   },
  { pastel: '#fff7ed', accent: '#ea580c', dim: '#fed7aa', pill: 'rgba(234,88,12,0.10)'    },
  { pastel: '#ecfdf5', accent: '#059669', dim: '#a7f3d0', pill: 'rgba(5,150,105,0.10)'    },
  { pastel: '#fdf2f8', accent: '#db2777', dim: '#fbcfe8', pill: 'rgba(219,39,119,0.10)'   },
]

export default function TripCard({ trip, members }: Props) {
  const [hovered, setHovered] = useState(false)

  const today     = startOfToday()
  const startDate = parseISO(trip.start_date)
  const endDate   = parseISO(trip.end_date)
  const isPast    = isBefore(endDate, today)
  const daysUntil = differenceInDays(startDate, today)
  const tripLen   = differenceInDays(endDate, startDate) + 1
  const pal       = PALETTES[trip.id.charCodeAt(0) % PALETTES.length]
  const hasCover  = !!trip.cover_image_url

  // ── Badge styles — glassmorphism on hero, semantic on light bg ───────────
  const heroBadge = (opts: { bg: string; color: string; border: string }): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: 11, fontWeight: 600,
    padding: '4px 10px', borderRadius: 99,
    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
    background: opts.bg, color: opts.color, border: `1px solid ${opts.border}`,
    letterSpacing: '0.01em',
  })

  const TypeBadge = () => (
    <span style={heroBadge(
      trip.is_international
        ? { bg: 'rgba(99,102,241,0.22)', color: '#c7d2fe', border: 'rgba(99,102,241,0.38)' }
        : { bg: 'rgba(16,185,129,0.22)', color: '#a7f3d0', border: 'rgba(16,185,129,0.38)' }
    )}>
      {trip.is_international ? <Globe size={10}/> : <MapPin size={10}/>}
      {trip.is_international ? 'ต่างประเทศ' : 'ในประเทศ'}
    </span>
  )

  const CountdownBadge = () => {
    if (isPast) return (
      <span style={heroBadge({ bg: 'rgba(71,85,105,0.30)', color: '#cbd5e1', border: 'rgba(71,85,105,0.40)' })}>
        ✅ เสร็จแล้ว
      </span>
    )
    if (daysUntil === 0) return (
      <span style={heroBadge({ bg: 'rgba(16,185,129,0.28)', color: '#6ee7b7', border: 'rgba(16,185,129,0.45)' })}>
        🎉 วันนี้เลย!
      </span>
    )
    if (daysUntil > 0) return (
      <span style={heroBadge({ bg: 'rgba(245,158,11,0.22)', color: '#fcd34d', border: 'rgba(245,158,11,0.35)' })}>
        ✈️ อีก {daysUntil} วัน
      </span>
    )
    return null
  }

  return (
    <Link href={`/trips/${trip.id}`} style={{ display: 'block', textDecoration: 'none' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          borderRadius: 20,
          overflow: 'hidden',
          background: 'var(--s0)',
          border: '1px solid var(--b0)',
          boxShadow: hovered
            ? '0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)'
            : '0 1px 3px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.06)',
          transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
          transition: 'transform 0.22s cubic-bezier(0.16,1,0.3,1), box-shadow 0.22s ease',
          cursor: 'pointer',
        }}
      >

        {/* ── Hero ── */}
        <div style={{
          position: 'relative', height: 180,
          background: hasCover ? 'var(--s2)' : pal.pastel,
          overflow: 'hidden',
        }}>
          {hasCover ? (
            <>
              <Image
                src={trip.cover_image_url!}
                alt={trip.name}
                fill
                style={{ objectFit: 'cover', transition: 'transform 0.4s ease', transform: hovered ? 'scale(1.03)' : 'scale(1)' }}
              />
              {/* Dark gradient overlay for text legibility */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.20) 50%, rgba(0,0,0,0.68) 100%)',
              }} />
            </>
          ) : (
            /* No-cover placeholder — subtle pastel + large centered icon */
            <>
              <div style={{
                position: 'absolute', inset: 0,
                background: `linear-gradient(145deg, ${pal.pastel} 0%, ${pal.dim} 100%)`,
              }} />
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 72, opacity: 0.18, pointerEvents: 'none',
                filter: 'saturate(0.6)',
              }}>
                ✈
              </div>
              {/* Darken bottom for readability of trip name */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to bottom, transparent 35%, rgba(0,0,0,0.32) 100%)',
              }} />
            </>
          )}

          {/* Top badges row */}
          <div style={{
            position: 'absolute', top: 12, left: 12, right: 12,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <TypeBadge />
            <CountdownBadge />
          </div>

          {/* Trip name — bottom of hero */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '0 16px 14px',
          }}>
            <h3 style={{
              color: 'white',
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: '-0.03em',
              lineHeight: 1.25,
              margin: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              textShadow: '0 1px 10px rgba(0,0,0,0.40)',
            }}>
              {trip.name}
            </h3>
          </div>
        </div>

        {/* ── Divider ── */}
        <div style={{ height: 1, background: 'var(--b0)' }} />

        {/* ── Info footer ── */}
        <div style={{
          padding: '14px 16px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--s0)',
        }}>
          <div style={{ minWidth: 0 }}>
            {/* Destination */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
              <MapPin size={12} style={{ color: 'var(--t3)', flexShrink: 0 }} />
              <span style={{
                fontSize: 13, fontWeight: 600, color: 'var(--t1)',
                letterSpacing: '-0.02em',
                maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {trip.destination}
              </span>
            </div>

            {/* Dates + duration pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Calendar size={11} style={{ color: 'var(--t3)', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                {format(startDate, 'd MMM', { locale: th })} – {format(endDate, 'd MMM yy', { locale: th })}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 700,
                background: pal.pill, color: pal.accent,
                padding: '2px 8px', borderRadius: 99,
                border: `1px solid ${pal.accent}25`,
                flexShrink: 0,
              }}>
                {tripLen} วัน
              </span>
            </div>
          </div>

          {/* Member avatars */}
          <div style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', flexShrink: 0 }}>
            {members.length > 5 && (
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'var(--s2)', border: '2px solid var(--s0)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: 'var(--t3)',
                marginLeft: -9,
              }}>
                +{members.length - 5}
              </div>
            )}
            {members.slice(0, 5).reverse().map(m => (
              <div key={m.user_id} style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'var(--s2)',
                border: '2px solid var(--s0)',
                overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: 'var(--t2)',
                marginLeft: -9, flexShrink: 0,
                boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
              }}>
                {m.profile?.avatar_url
                  ? <Image src={m.profile.avatar_url} alt="" width={30} height={30}
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
