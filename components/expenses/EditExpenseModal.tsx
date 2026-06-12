'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Loader2, RefreshCw } from 'lucide-react'
import { toast } from '@/components/ui/Toast'
import type { Expense, Trip } from '@/types'

const CATEGORIES = [
  { id: 'food',          label: '🍜 อาหาร' },
  { id: 'transport',     label: '🚌 เดินทาง' },
  { id: 'accommodation', label: '🏨 ที่พัก' },
  { id: 'activity',      label: '🎡 กิจกรรม' },
  { id: 'shopping',      label: '🛍️ ช้อปปิ้ง' },
  { id: 'other',         label: '📌 อื่นๆ' },
]
const COMMON_CURRENCIES = ['THB', 'JPY', 'KRW', 'USD', 'EUR', 'SGD', 'MYR', 'HKD', 'CNY']

interface Props {
  expense: Expense
  trip: Trip
  onClose: () => void
  onUpdated: () => void
}

export default function EditExpenseModal({ expense, trip, onClose, onUpdated }: Props) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [fetchingRate, setFetchingRate] = useState(false)
  const [form, setForm] = useState({
    title:           expense.title,
    category:        expense.category,
    amount_foreign:  expense.amount_foreign.toString(),
    currency:        expense.currency,
    exchange_rate:   expense.exchange_rate.toString(),
    notes:           expense.notes ?? '',
  })

  function set(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  const amountTHB = parseFloat(form.amount_foreign || '0') * parseFloat(form.exchange_rate || '1')

  async function fetchRate() {
    if (form.currency === 'THB') return
    // ใช้ locked rate ก่อน ถ้าไม่มีค่อยดึง live
    const locked = trip.locked_rates?.[form.currency]
    if (locked) { set('exchange_rate', locked.toString()); return }
    setFetchingRate(true)
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${form.currency}`)
      const data = await res.json()
      if (data.rates?.THB) set('exchange_rate', data.rates.THB.toFixed(4))
    } catch {}
    setFetchingRate(false)
  }

  async function handleSave() {
    if (!form.title.trim() || !form.amount_foreign) return
    setLoading(true)

    const { error } = await supabase
      .from('expenses')
      .update({
        title:          form.title.trim(),
        category:       form.category,
        amount_foreign: parseFloat(form.amount_foreign),
        currency:       form.currency,
        exchange_rate:  parseFloat(form.exchange_rate),
        amount_thb:     amountTHB,
        notes:          form.notes || null,
      })
      .eq('id', expense.id)

    setLoading(false)
    if (error) {
      toast('แก้ไขไม่สำเร็จ: ' + error.message, 'error')
      return
    }
    toast('แก้ไขรายการแล้ว ✓')
    onUpdated()
    onClose()
  }

  async function handleDelete() {
    if (!confirm(`ลบ "${expense.title}" ออกจากบัญชีกลุ่ม?`)) return
    setLoading(true)
    // ลบ participants ก่อน (FK constraint)
    await supabase.from('expense_participants').delete().eq('expense_id', expense.id)
    const { error } = await supabase.from('expenses').delete().eq('id', expense.id)
    setLoading(false)
    if (error) { toast('ลบไม่สำเร็จ', 'error'); return }
    toast('ลบรายการแล้ว')
    onUpdated()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full bottom-sheet spring-enter max-h-[88dvh] overflow-y-auto">
        <div className="sheet-handle" />
        <div className="px-5 pb-8 pt-2 space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold" style={{ color: 'var(--t1)' }}>แก้ไขค่าใช้จ่าย</h2>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'var(--s2)' }}>
              <X size={16} style={{ color: 'var(--t2)' }} />
            </button>
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-medium block mb-2" style={{ color: 'var(--t3)' }}>หมวดหมู่</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => set('category', cat.id)}
                  style={{
                    padding: '10px 0', borderRadius: 12, fontSize: 12, fontWeight: 600,
                    background: form.category === cat.id ? 'var(--indigo)' : 'var(--s2)',
                    color: form.category === cat.id ? 'white' : 'var(--t2)',
                    border: 'none', cursor: 'pointer',
                  }}>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--t3)' }}>รายการ *</label>
            <input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              className="input"
              placeholder="ชื่อรายการ"
            />
          </div>

          {/* Amount + Currency */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--t3)' }}>จำนวนเงิน *</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={form.currency} onChange={e => { set('currency', e.target.value); fetchRate() }}
                style={{ background: 'var(--s1)', color: 'var(--t1)', border: '1px solid var(--b0)',
                  borderRadius: 12, padding: '12px 10px', fontSize: 14 }}>
                {COMMON_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="number" value={form.amount_foreign}
                onChange={e => set('amount_foreign', e.target.value)}
                placeholder="0" className="input" style={{ flex: 1 }} />
            </div>

            {form.currency !== 'THB' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--t3)' }}>1 {form.currency} =</span>
                <input type="number" value={form.exchange_rate}
                  onChange={e => set('exchange_rate', e.target.value)}
                  style={{ width: 80, background: 'var(--s1)', color: 'var(--t1)',
                    border: '1px solid var(--b0)', borderRadius: 10,
                    padding: '6px 10px', fontSize: 12 }} />
                <span style={{ fontSize: 12, color: 'var(--t3)' }}>THB</span>
                {trip.rates_locked_at ? (
                  <span style={{ fontSize: 11, color: '#f59e0b' }}>🔒 ล็อคแล้ว</span>
                ) : (
                  <button onClick={fetchRate} disabled={fetchingRate}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)' }}>
                    <RefreshCw size={12} style={fetchingRate ? { animation: 'spin 1s linear infinite' } : {}} />
                  </button>
                )}
                <span style={{ fontSize: 12, fontWeight: 700, color: '#4ade80', marginLeft: 'auto' }}>
                  ≈ {amountTHB.toFixed(0)} ฿
                </span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--t3)' }}>โน้ต</label>
            <input value={form.notes} onChange={e => set('notes', e.target.value)}
              className="input" placeholder="รายละเอียดเพิ่มเติม..." />
          </div>

          {/* Buttons */}
          <button onClick={handleSave}
            disabled={loading || !form.title.trim() || !form.amount_foreign}
            className="btn-primary pressable"
            style={{ width: '100%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', opacity: loading ? 0.5 : 1 }}>
            {loading
              ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
              : '💾 บันทึกการแก้ไข'}
          </button>

          <button onClick={handleDelete} disabled={loading}
            style={{ width: '100%', padding: '12px', borderRadius: 16,
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              color: '#f87171', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            className="pressable">
            🗑 ลบรายการนี้
          </button>

        </div>
      </div>
    </div>
  )
}
