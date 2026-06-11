'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Plane, Hotel, Train, Car, Ticket, Package } from 'lucide-react'
import type { Booking, BookingAttachment } from '@/types'
import BookingCard from '@/components/bookings/BookingCard'
import AddBookingModal from '@/components/bookings/AddBookingModal'
import { cn } from '@/lib/utils/cn'

const CATEGORIES = [
  { id: 'all',          label: 'ทั้งหมด', icon: Package },
  { id: 'flight',       label: 'เที่ยวบิน', icon: Plane },
  { id: 'hotel',        label: 'โรงแรม', icon: Hotel },
  { id: 'train',        label: 'รถ/ราง', icon: Train },
  { id: 'activity',     label: 'บัตร', icon: Ticket },
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
    <div className="px-4 pt-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">ตั๋วและการจอง</h2>
          <p className="text-slate-500 text-sm">{bookings.length} รายการ</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 active:scale-90"
        >
          <Plus size={22} className="text-white" />
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon
          return (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={cn(
                'flex-none flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-medium transition-all',
                filter === cat.id ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400'
              )}
            >
              <Icon size={14} />
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* Offline hint */}
      <div className="glass rounded-xl px-3 py-2.5 flex items-center gap-2">
        <span className="text-lg">📶</span>
        <p className="text-xs text-slate-400">
          ตั๋วที่เปิดดูแล้วจะถูกบันทึกไว้ในเครื่อง เปิดดูออฟไลน์ได้เลย
        </p>
      </div>

      {/* Booking list */}
      <div className="space-y-3 pb-4">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-2">🎫</div>
            <p className="text-slate-500 text-sm">ยังไม่มีการจองในหมวดนี้</p>
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
