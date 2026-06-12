'use client'
import { useEffect, useState } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Map, Plane, Receipt, CheckSquare, Home } from 'lucide-react'
import type { Trip } from '@/types'

const TABS = [
  { key: '',          icon: Home,        label: 'ภาพรวม' },
  { key: 'itinerary', icon: Map,         label: 'แผน' },
  { key: 'bookings',  icon: Plane,       label: 'ตั๋ว' },
  { key: 'expenses',  icon: Receipt,     label: 'บัญชี' },
  { key: 'checklist', icon: CheckSquare, label: 'ของ' },
]

export default function TripLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams<{ id: string }>()
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [trip, setTrip] = useState<Pick<Trip, 'id' | 'name' | 'destination'> | null>(null)

  useEffect(() => {
    supabase
      .from('trips')
      .select('id, name, destination')
      .eq('id', id)
      .single()
      .then(({ data }) => setTrip(data))
  }, [id])

  const segments = pathname.split('/')
  const lastSegment = segments[segments.length - 1]
  const activeTab = TABS.some(t => t.key === lastSegment) ? lastSegment : ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--bg)' }}>

      {/* ── Top header — theme-aware ── */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 12,
          paddingLeft: 16, paddingRight: 16,
          paddingTop: 'calc(var(--safe-top) + 12px)',
          paddingBottom: 10,
          background: 'var(--s0)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          borderBottom: '1px solid var(--b0)',
          boxShadow: '0 1px 0 var(--b0)',
        }}
      >
        {/* Back button */}
        <button
          onClick={() => router.push('/dashboard')}
          className="pressable"
          style={{
            width: 36, height: 36, borderRadius: 12, flexShrink: 0,
            background: 'var(--s2)', border: '1px solid var(--b0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={17} style={{ color: 'var(--t1)' }} />
        </button>

        {/* Trip name + destination */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{
            fontSize: 15, fontWeight: 700,
            color: 'var(--t1)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            lineHeight: 1.3, margin: 0,
          }}>
            {trip?.name ?? '...'}
          </h1>
          {trip?.destination && (
            <p style={{
              fontSize: 11, color: 'var(--t3)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              margin: '1px 0 0',
            }}>
              {trip.destination}
            </p>
          )}
        </div>
      </div>

      {/* ── Tab bar — theme-aware ── */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          paddingLeft: 8, paddingRight: 8,
          background: 'var(--s0)',
          borderBottom: '1px solid var(--b0)',
        }}
      >
        {TABS.map(({ key, icon: Icon, label }) => {
          const href = key ? `/trips/${id}/${key}` : `/trips/${id}`
          const isActive = activeTab === key
          return (
            <Link
              key={key}
              href={href}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 3, paddingTop: 10, paddingBottom: 10, paddingLeft: 4, paddingRight: 4,
                position: 'relative',
                textDecoration: 'none',
                color: isActive ? 'var(--indigo)' : 'var(--t2)',
                transition: 'color 0.18s ease',
              }}
            >
              <Icon
                size={17}
                strokeWidth={isActive ? 2.5 : 1.7}
                style={{ color: isActive ? 'var(--indigo)' : 'var(--t2)', transition: 'color 0.18s ease' }}
              />
              <span style={{
                fontSize: 10, fontWeight: isActive ? 700 : 500,
                lineHeight: 1,
                color: isActive ? 'var(--indigo)' : 'var(--t2)',
                transition: 'color 0.18s ease',
              }}>
                {label}
              </span>
              {/* Active indicator pill */}
              {isActive && (
                <span style={{
                  position: 'absolute', bottom: 0, left: '50%',
                  transform: 'translateX(-50%)',
                  height: 2.5, width: 28, borderRadius: 99,
                  background: 'linear-gradient(90deg, var(--indigo), var(--violet))',
                }} />
              )}
            </Link>
          )
        })}
      </div>

      {/* Page content */}
      <div style={{ flex: 1, overflowY: 'auto' }} className="hide-scrollbar">
        {children}
      </div>
    </div>
  )
}
