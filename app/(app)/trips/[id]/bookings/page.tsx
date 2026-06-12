'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Plane, Hotel, Train, Car, Ticket, Package } from 'lucide-react'
import type { Booking, BookingAttachment } from '@/types'
import BookingCard from '@/components/bookings/BookingCard'
import AddBookingModal from '@/components/bookings/AddBookingModal'

const CATEGORIES = [
  { id: 'all',      label: 'ทั้งหมด', icon: Package },
  { id: 'flight',   label: 'เที่ยวบิน', icon: Plane },
  { id: 'hotel',    label: 'โรงแรม', icon: Hotel },
  { id: 'train',    label: 'รถ/ราง', icon: Train },
  { id: 'activity', label: 'บัตร', icon: Ticket },
]

export default function BookingsPage() {
  const { id: tripId } = useParams<{ id: string }>()
  const supabase = createClient()
  const [bookings, setBookings] = useState<(Booking & { attachments: BookingAttachment[] })[]>([])
  const [filter, setFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    loadBookings()
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id ?? null))
  }, [tripId])

  async function loadBookings() {
    const { data } = await supabase
      .from('bookings')
      .select('*, attachments:booking_attachments(*)')
      .eq('trip_id', tripId)
      .order('checkin_at', { ascending: true, nullsFirst: false })
    setBookings((data ?? []) as any)
  }

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.category === filter)

  return (
    <div style={{ padding: '16px 16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--t1)', margin: 0, letterSpacing: '-0.02em' }}>
            ตั๋วและการจอง
          </h2>
          <p style={{ fontSize: 13, color: 'var(--t3)', marginTop: 2 }}>
            {bookings.length} รายการ
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="pressable"
          style={{
            width: 48, height: 48, borderRadius: 16, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, var(--indigo), var(--violet))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px var(--indigo-glow), 0 0 0 1px rgba(255,255,255,0.10) inset',
          }}
        >
          <Plus size={22} style={{ color: 'white' }} />
        </button>
      </div>

      {/* ── Category filter chips ── */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }} className="hide-scrollbar">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon
          const isActive = filter === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              style={{
                flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 20, cursor: 'pointer', border: 'none',
                fontSize: 13, fontWeight: isActive ? 700 : 500,
                transition: 'all 0.18s ease',
                background: isActive
                  ? 'linear-gradient(135deg, var(--indigo), var(--violet))'
                  : 'var(--s2)',
                color: isActive ? 'white' : 'var(--t2)',
                boxShadow: isActive ? '0 3px 12px var(--indigo-glow)' : 'none',
              }}
            >
              <Icon size={14} style={{ color: isActive ? 'white' : 'var(--t2)' }} />
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* ── Offline hint ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', borderRadius: 14,
        background: 'var(--s1)',
        border: '1px solid var(--b1)',
      }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>📶</span>
        <p style={{ fontSize: 12, color: 'var(--t2)', margin: 0, lineHeight: 1.5 }}>
          ตั๋วที่เปิดดูแล้วจะถูกบันทึกไว้ในเครื่อง เปิดดูออฟไลน์ได้เลย
        </p>
      </div>

      {/* ── Booking list ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 8 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🎫</div>
            <p style={{ fontSize: 14, color: 'var(--t3)' }}>ยังไม่มีการจองในหมวดนี้</p>
          </div>
        ) : (
          filtered.map(booking => (
            <BookingCard
              key={booking.id}
              booking={booking}
              tripId={tripId}
              currentUserId={currentUserId}
              onRefresh={loadBookings}
            />
          ))
        )}
      </div>

      {showAdd && (
        <AddBookingModal
          tripId={tripId}
          currentUserId={currentUserId!}
          onClose={() => setShowAdd(false)}
          onAdded={() => { setShowAdd(false); loadBookings() }}
        />
      )}
    </div>
  )
}
