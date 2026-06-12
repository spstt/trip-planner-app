'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Palette } from 'lucide-react'
import { parseISO, isBefore, startOfToday } from 'date-fns'
import { cn } from '@/lib/utils/cn'
import type { Trip, TripMember, Profile } from '@/types'
import CreateTripModal from '@/components/trip/CreateTripModal'
import { useTheme } from '@/lib/hooks/useTheme'
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
  const [showTheme, setShowTheme] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [greeting, setGreeting] = useState('')
  useEffect(() => { setGreeting(getGreeting()) }, [])
  const supabase = createClient()
  const { theme, setTheme } = useTheme()

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
    <div style={{ minHeight: '100%', position: 'relative' }}>

      {/* Ambient background glow */}
      <div style={{ position: 'fixed', top: '-20%', right: '-10%', width: '70vw', height: '50vh', borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
        background: theme === 'warm-pastel'
          ? 'radial-gradient(circle, rgba(101,163,130,0.12) 0%, transparent 65%)'
          : 'radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 65%)' }} />
      <div style={{ position: 'fixed', bottom: '15%', left: '-15%', width: '50vw', height: '40vh', borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
        background: theme === 'warm-pastel'
          ? 'radial-gradient(circle, rgba(232,165,152,0.10) 0%, transparent 65%)'
          : 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 65%)' }} />

      <div style={{ position: 'relative', zIndex: 1, padding: '20px 20px 8px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--t3)', marginBottom: 2 }}>{greeting}</p>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {profile?.display_name?.split(' ')[0] || 'ทริปของฉัน'}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Avatar */}
            <div style={{
              width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
              border: '2px solid rgba(99,102,241,0.4)',
              background: 'linear-gradient(135deg,#6366f1,#a855f7)',
            }}>
              {profile?.avatar_url
                ? <Image src={profile.avatar_url} alt="" width={40} height={40} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: 'white' }}>{profile?.display_name?.[0]?.toUpperCase() ?? '?'}</div>
              }
            </div>

            {/* Theme switcher button */}
            <button
              onClick={() => setShowTheme(true)}
              className="pressable"
              style={{
                width: 44, height: 44, borderRadius: 14,
                background: 'var(--s1)', border: '1px solid var(--b1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Palette size={20} color="var(--t2)" />
            </button>

            {/* New trip button */}
            <button
              onClick={() => setShowCreate(true)}
              className="pressable"
              style={{
                width: 44, height: 44, borderRadius: 14,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
              }}
            >
              <Plus size={22} color="white" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* ── Stats chips ── */}
        {!loading && trips.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 99, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.22)', fontSize: 13, fontWeight: 700, color: '#818cf8' }}>
              <span style={{ fontSize: 18, fontWeight: 900 }}>{upcoming.length}</span> ทริปที่จะมา
            </span>
            {past.length > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 99, background: 'var(--s0)', border: '1px solid var(--b0)', fontSize: 13, fontWeight: 600, color: 'var(--t3)' }}>
                <span style={{ fontSize: 18, fontWeight: 900 }}>{past.length}</span> ผ่านมาแล้ว
              </span>
            )}
          </div>
        )}

        {/* ── Tab selector ── */}
        <div style={{ display: 'flex', padding: 4, borderRadius: 18, background: 'var(--s0)', marginBottom: 20, border: '1px solid var(--b0)' }}>
          {(['upcoming', 'past'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 13,
                fontWeight: 700, transition: 'all 0.2s ease',
                background: tab === t ? 'var(--indigo)' : 'transparent',
                color: tab === t ? 'white' : 'var(--t3)',
                boxShadow: tab === t ? '0 2px 12px rgba(99,102,241,0.35)' : 'none',
              }}
            >
              {t === 'upcoming' ? '🗓  ที่กำลังจะมา' : '📚  ที่ผ่านมา'}
            </button>
          ))}
        </div>

        {/* ── Trip list ── */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1,2].map(i => <div key={i} className="shimmer" style={{ borderRadius: 24, height: 220 }} />)}
          </div>
        ) : display.length === 0 ? (
          <div className="spring-enter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 16 }}>
            <div style={{
              width: 96, height: 96, borderRadius: 28, fontSize: 44,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.12))',
              border: '1px solid rgba(99,102,241,0.15)',
            }}>
              {tab === 'upcoming' ? '🌏' : '📸'}
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--t1)', marginBottom: 6 }}>
                {tab === 'upcoming' ? 'ยังไม่มีทริปในตำนาน' : 'ยังไม่มีความทรงจำ'}
              </p>
              <p style={{ fontSize: 14, color: 'var(--t3)', lineHeight: 1.5 }}>
                {tab === 'upcoming' ? 'สร้างทริปแรกแล้วชวนเพื่อนมาเที่ยวกัน!' : 'ทริปที่เสร็จแล้วจะมาแสดงที่นี่'}
              </p>
            </div>
            {tab === 'upcoming' && (
              <button onClick={() => setShowCreate(true)} className="pressable btn-primary">
                ✈️  สร้างทริปแรก
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {display.map((trip, i) => (
              <div key={trip.id} className="fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                <TripCard trip={trip} members={trip.trip_members} />
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateTripModal
          onClose={() => setShowCreate(false)}
          onCreated={(trip) => { setTrips(prev => [trip as TripWithMembers, ...prev]); setShowCreate(false) }}
        />
      )}

      {/* ── Theme Switcher Sheet ── */}
      {showTheme && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 100,
            display: 'flex', alignItems: 'flex-end',
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)' }}
          onClick={() => setShowTheme(false)}
        >
          <div
            className="spring-enter"
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', background: 'var(--s1)',
              borderRadius: '28px 28px 0 0', border: '1px solid var(--b1)',
              padding: '0 20px calc(40px + env(safe-area-inset-bottom,0px))' }}
          >
            <div className="sheet-handle" />
            <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--t1)', margin: '4px 0 4px' }}>
              🎨 เลือก Palette
            </p>
            <p style={{ fontSize: 12, color: 'var(--t3)', margin: '0 0 16px' }}>สไตล์คาเฟ่เกาหลี</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {([
                { id: 'dark-slate',    label: 'Dark Slate',    sub: 'โทนเข้มสุดเท่',     bg: '#05080f', swatch: ['#0e1627','#6366f1','#8b5cf6'], textCol: 'white', checkCol: '#818cf8' },
                { id: 'warm-pastel',   label: 'Warm Pastel',   sub: 'ครีมอบอุ่น 🍞',    bg: '#f5f0e8', swatch: ['#ede8df','#65a382','#e8a598'], textCol: '#2d3748', checkCol: '#65a382' },
                { id: 'jeju-sunlight', label: 'Jeju Sunlight', sub: 'ส้มแสงแดด 🍊',    bg: '#fdf6ec', swatch: ['#fdecd6','#e8874a','#e86060'], textCol: '#3d2b1f', checkCol: '#e8874a' },
                { id: 'matcha-latte',  label: 'Matcha Latte',  sub: 'เขียว Sage 🍵',  bg: '#eef2eb', swatch: ['#e4ece0','#5c8c5c','#c084a0'], textCol: '#1e2d1e', checkCol: '#5c8c5c' },
              ] as const).map(t => (
                <button
                  key={t.id}
                  onClick={() => { setTheme(t.id); setShowTheme(false) }}
                  className="pressable"
                  style={{ padding: '14px 12px', borderRadius: 20, cursor: 'pointer', textAlign: 'left',
                    background: t.bg,
                    border: `2.5px solid ${theme === t.id ? t.swatch[1] : 'rgba(128,128,128,0.15)'}`,
                    boxShadow: theme === t.id ? `0 4px 20px ${t.swatch[1]}44` : '0 2px 8px rgba(0,0,0,0.08)',
                    transition: 'all 0.2s ease' }}
                >
                  {/* Swatch row */}
                  <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                    {t.swatch.map((col, i) => (
                      <div key={i} style={{ flex: i === 0 ? 2 : 1, height: 22, borderRadius: 7, background: col,
                        boxShadow: `0 1px 4px ${col}55` }} />
                    ))}
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 800, color: t.textCol, margin: 0, letterSpacing: '-0.01em' }}>{t.label}</p>
                  <p style={{ fontSize: 10, color: t.textCol, opacity: 0.5, margin: '2px 0 0' }}>{t.sub}</p>
                  {theme === t.id && (
                    <p style={{ fontSize: 10, color: t.checkCol, fontWeight: 700, margin: '8px 0 0',
                      display: 'flex', alignItems: 'center', gap: 3 }}>
                      ✦ ใช้งานอยู่
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
