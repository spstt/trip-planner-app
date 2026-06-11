'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const CATEGORIES = [
  { id: 'flight',   label: '✈️ เที่ยวบิน' },
  { id: 'hotel',    label: '🏨 โรงแรม' },
  { id: 'train',    label: '🚂 รถ/ราง' },
  { id: 'rental',   label: '🚗 เช่ารถ' },
  { id: 'activity', label: '🎡 บัตรกิจกรรม' },
  { id: 'other',    label: '📌 อื่นๆ' },
]

interface Props {
  tripId: string
  currentUserId: string
  onClose: () => void
  onAdded: () => void
}

export default function AddBookingModal({ tripId, currentUserId, onClose, onAdded }: Props) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    category: 'flight',
    title: '',
    booking_ref: '',
    provider: '',
    checkin_at: '',
    checkout_at: '',
    location: '',
    notes: '',
  })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleAdd() {
    if (!form.title.trim()) return
    setLoading(true)

    await supabase.from('bookings').insert({
      trip_id: tripId,
      ...form,
      checkin_at: form.checkin_at || null,
      checkout_at: form.checkout_at || null,
      booking_ref: form.booking_ref || null,
      provider: form.provider || null,
      location: form.location || null,
      notes: form.notes || null,
      created_by: currentUserId,
    })

    setLoading(false)
    onAdded()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full bottom-sheet spring-enter max-h-[90dvh] overflow-y-auto">
        <div className="sheet-handle" />
        <div className="px-5 pb-8 pt-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">เพิ่มการจอง</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
              <X size={16} className="text-slate-400" />
            </button>
          </div>

          {/* Category */}
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => set('category', cat.id)}
                className={cn(
                  'py-2.5 rounded-xl text-xs font-medium transition-all',
                  form.category === cat.id ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <Field label="ชื่อการจอง *" placeholder="เช่น Thai Airways TG608" value={form.title} onChange={v => set('title', v)} />
          <Field label="หมายเลขบุ๊คกิ้ง" placeholder="เช่น TG608-XXX" value={form.booking_ref} onChange={v => set('booking_ref', v)} />
          <Field label="ผู้ให้บริการ" placeholder="เช่น Thai Airways" value={form.provider} onChange={v => set('provider', v)} />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Check-in/เดินทาง" type="datetime-local" value={form.checkin_at} onChange={v => set('checkin_at', v)} />
            <Field label="Check-out/ถึง" type="datetime-local" value={form.checkout_at} onChange={v => set('checkout_at', v)} />
          </div>

          <Field label="สถานที่/สนามบิน" placeholder="เช่น Suvarnabhumi BKK" value={form.location} onChange={v => set('location', v)} />
          <Field label="หมายเหตุ" placeholder="ข้อมูลเพิ่มเติม..." value={form.notes} onChange={v => set('notes', v)} />

          <button
            onClick={handleAdd}
            disabled={loading || !form.title.trim()}
            className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-2xl active:scale-95 transition-transform disabled:opacity-50"
          >
            {loading ? <Loader2 size={20} className="animate-spin mx-auto" /> : '🎫 บันทึกการจอง'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, placeholder, value, onChange, type = 'text' }: {
  label: string; placeholder?: string; value: string; onChange: (v: string) => void; type?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-slate-400 font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 text-sm placeholder-slate-600 border border-slate-700 focus:border-indigo-500 focus:outline-none"
      />
    </div>
  )
}
