'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Globe, MapPin, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { Trip } from '@/types'
import { addDays, format } from 'date-fns'

interface Props {
  onClose: () => void
  onCreated: (trip: Trip) => void
}

export default function CreateTripModal({ onClose, onCreated }: Props) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    destination: '',
    start_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    end_date: format(addDays(new Date(), 10), 'yyyy-MM-dd'),
    is_international: false,
  })

  function set(k: string, v: unknown) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleCreate() {
    if (!form.name.trim() || !form.destination.trim()) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: trip, error } = await supabase
      .from('trips')
      .insert({
        name: form.name.trim(),
        destination: form.destination.trim(),
        start_date: form.start_date,
        end_date: form.end_date,
        is_international: form.is_international,
        created_by: user.id,
      })
      .select()
      .single()

    if (error || !trip) { setLoading(false); return }

    // Add creator as host
    await supabase.from('trip_members').insert({
      trip_id: trip.id,
      user_id: user.id,
      role: 'host',
    })

    // Auto-create itinerary days
    const start = new Date(form.start_date)
    const end = new Date(form.end_date)
    const days = []
    let current = start
    let dayNum = 1
    while (current <= end) {
      days.push({
        trip_id: trip.id,
        day_number: dayNum++,
        date: format(current, 'yyyy-MM-dd'),
      })
      current = addDays(current, 1)
    }
    await supabase.from('itinerary_days').insert(days)

    setLoading(false)
    onCreated(trip)
  }

  return (
    <div className="fixed inset-x-0 top-0 bottom-0 z-50 flex items-end" style={{ paddingBottom: 'calc(var(--nav-height) + var(--safe-bottom))' }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full bottom-sheet spring-enter max-h-[85vh] flex flex-col">
        <div className="sheet-handle shrink-0" />

        {/* Scrollable content */}
        <div className="px-5 pt-2 space-y-4 overflow-y-auto flex-1 pb-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">สร้างทริปใหม่</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
              <X size={16} className="text-slate-400" />
            </button>
          </div>

          {/* Trip type toggle */}
          <div className="flex bg-slate-800 rounded-2xl p-1">
            {[
              { val: false, icon: MapPin, label: '🇹🇭 ในประเทศ' },
              { val: true, icon: Globe, label: '🌏 ต่างประเทศ' },
            ].map(({ val, label }) => (
              <button
                key={String(val)}
                onClick={() => set('is_international', val)}
                className={cn(
                  'flex-1 py-2.5 rounded-xl text-sm font-medium transition-all',
                  form.is_international === val
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-500'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <Field
              label="ชื่อทริป"
              placeholder="เช่น โอซาก้า ฤดูใบไม้ร่วง 🍂"
              value={form.name}
              onChange={v => set('name', v)}
            />
            <Field
              label="ปลายทาง"
              placeholder="เช่น โอซาก้า, ญี่ปุ่น"
              value={form.destination}
              onChange={v => set('destination', v)}
            />

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="วันเดินทาง"
                type="date"
                value={form.start_date}
                onChange={v => set('start_date', v)}
              />
              <Field
                label="วันกลับ"
                type="date"
                value={form.end_date}
                onChange={v => set('end_date', v)}
              />
            </div>
          </div>
        </div>

        {/* Fixed bottom button — always visible */}
        <div className="px-5 pb-4 pt-2 shrink-0 border-t border-white/5">
          <button
            onClick={handleCreate}
            disabled={loading || !form.name.trim() || !form.destination.trim()}
            className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : '✈️ สร้างทริป'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({
  label, placeholder, value, onChange, type = 'text'
}: {
  label: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-slate-400 font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 text-sm placeholder-slate-600 border border-slate-700 focus:border-indigo-500 focus:outline-none transition-colors"
      />
    </div>
  )
}
