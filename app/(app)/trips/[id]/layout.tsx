'use client'
import { useEffect, useState } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Map, Plane, Receipt, CheckSquare, Home } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
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

  // Determine active tab from pathname
  // e.g. /trips/[id]/itinerary → 'itinerary'
  const segments = pathname.split('/')
  const lastSegment = segments[segments.length - 1]
  const activeTab = TABS.some(t => t.key === lastSegment) ? lastSegment : ''

  return (
    <div className="flex flex-col h-dvh bg-slate-950">
      {/* Top header */}
      <div
        className="shrink-0 flex items-center gap-3 px-4 pt-safe bg-slate-950/90 backdrop-blur-md border-b border-white/5"
        style={{ paddingTop: 'calc(var(--safe-top) + 12px)', paddingBottom: '10px' }}
      >
        <button
          onClick={() => router.push('/dashboard')}
          className="w-9 h-9 rounded-xl glass flex items-center justify-center active:scale-90 transition-transform shrink-0"
        >
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-white truncate leading-tight">
            {trip?.name ?? '...'}
          </h1>
          {trip?.destination && (
            <p className="text-xs text-slate-500 truncate">{trip.destination}</p>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="shrink-0 flex bg-slate-950 border-b border-white/5 px-2">
        {TABS.map(({ key, icon: Icon, label }) => {
          const href = key ? `/trips/${id}/${key}` : `/trips/${id}`
          const isActive = activeTab === key
          return (
            <Link
              key={key}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 relative transition-all',
                isActive ? 'text-indigo-400' : 'text-slate-600 active:text-slate-400'
              )}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-indigo-500" />
              )}
            </Link>
          )
        })}
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {children}
      </div>
    </div>
  )
}
