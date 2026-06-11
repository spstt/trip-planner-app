'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Loader2, RefreshCw } from 'lucide-react'
import type { Trip, TripMember, Profile } from '@/types'
import { cn } from '@/lib/utils/cn'

const CATEGORIES = [
  { id: 'food', label: '🍜 อาหาร' },
  { id: 'transport', label: '🚌 เดินทาง' },
  { id: 'accommodation', label: '🏨 ที่พัก' },
  { id: 'activity', label: '🎡 กิจกรรม' },
  { id: 'shopping', label: '🛍️ ช้อปปิ้ง' },
  { id: 'other', label: '📌 อื่นๆ' },
]

const COMMON_CURRENCIES = ['THB', 'JPY', 'KRW', 'USD', 'EUR', 'SGD', 'MYR', 'HKD', 'CNY']

interface Props {
  tripId: string
  trip: Trip
  members: (TripMember & { profile: Profile })[]
  currentUserId: string
  onClose: () => void
  onAdded: () => void
}

export default function AddExpenseModal({ tripId, trip, members, currentUserId, onClose, onAdded }: Props) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [fetchingRate, setFetchingRate] = useState(false)
  const [form, setForm] = useState({
    title: '',
    category: 'food',
    amount_foreign: '',
    currency: 'THB',
    exchange_rate: '1',
    split_type: 'equal' as 'equal' | 'custom',
    notes: '',
  })
  const [payers, setPayers] = useState<Record<string, string>>({ [currentUserId]: '' })
  const [splitters, setSplitters] = useState<Set<string>>(new Set(members.map(m => m.user_id)))
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({})

  function set(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  // Auto-fetch exchange rate when currency changes
  useEffect(() => {
    if (form.currency === 'THB') {
      set('exchange_rate', '1')
      return
    }
    // Check locked rates first
    const locked = trip.locked_rates?.[form.currency]
    if (locked) {
      set('exchange_rate', locked.toString())
      return
    }
    fetchRate()
  }, [form.currency])

  async function fetchRate() {
    if (form.currency === 'THB') return
    setFetchingRate(true)
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${form.currency}`)
      const data = await res.json()
      const rateToTHB = data.rates?.THB
      if (rateToTHB) set('exchange_rate', rateToTHB.toFixed(4))
    } catch {}
    setFetchingRate(false)
  }

  const amountTHB = parseFloat(form.amount_foreign || '0') * parseFloat(form.exchange_rate || '1')
  const splitterCount = splitters.size

  async function handleAdd() {
    if (!form.title.trim() || !form.amount_foreign) return
    setLoading(true)

    const { data: expense } = await supabase.from('expenses').insert({
      trip_id: tripId,
      title: form.title.trim(),
      category: form.category,
      amount_foreign: parseFloat(form.amount_foreign),
      currency: form.currency,
      exchange_rate: parseFloat(form.exchange_rate),
      amount_thb: amountTHB,
      split_type: form.split_type,
      notes: form.notes || null,
      created_by: currentUserId,
    }).select().single()

    if (!expense) { setLoading(false); return }

    // Insert participants
    const payerEntries = Object.entries(payers)
      .filter(([, amt]) => amt !== '' && parseFloat(amt) > 0)
      .map(([userId, amt]) => ({
        expense_id: expense.id,
        trip_id: tripId,
        user_id: userId,
        role: 'payer' as const,
        amount_thb: parseFloat(amt),
      }))

    const splitAmount = form.split_type === 'equal'
      ? amountTHB / splitterCount
      : 0

    const splitterEntries = [...splitters].map(userId => ({
      expense_id: expense.id,
      trip_id: tripId,
      user_id: userId,
      role: 'splitter' as const,
      amount_thb: form.split_type === 'equal'
        ? splitAmount
        : parseFloat(customSplits[userId] || '0'),
    }))

    await supabase.from('expense_participants').insert([...payerEntries, ...splitterEntries])

    setLoading(false)
    onAdded()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full bottom-sheet spring-enter max-h-[92dvh] overflow-y-auto">
        <div className="sheet-handle" />
        <div className="px-5 pb-8 pt-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">เพิ่มค่าใช้จ่าย</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
              <X size={16} className="text-slate-400" />
            </button>
          </div>

          {/* Category selector */}
          <div>
            <label className="text-xs text-slate-400 font-medium block mb-2">หมวดหมู่</label>
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
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-medium">รายการ *</label>
            <input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="เช่น ข้าวราดแกงร้านดัง"
              className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 text-sm placeholder-slate-600 border border-slate-700 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Amount + Currency */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-medium">จำนวนเงิน *</label>
            <div className="flex gap-2">
              <select
                value={form.currency}
                onChange={e => set('currency', e.target.value)}
                className="bg-slate-800 text-white rounded-xl px-3 py-3 text-sm border border-slate-700 focus:outline-none"
              >
                {COMMON_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input
                type="number"
                value={form.amount_foreign}
                onChange={e => set('amount_foreign', e.target.value)}
                placeholder="0"
                className="flex-1 bg-slate-800 text-white rounded-xl px-4 py-3 text-sm placeholder-slate-600 border border-slate-700 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Exchange rate */}
            {form.currency !== 'THB' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">1 {form.currency} =</span>
                <input
                  type="number"
                  value={form.exchange_rate}
                  onChange={e => set('exchange_rate', e.target.value)}
                  className="w-24 bg-slate-900 text-white rounded-lg px-3 py-1.5 text-xs border border-slate-700 focus:outline-none"
                />
                <span className="text-xs text-slate-500">THB</span>
                {trip.rates_locked_at ? (
                  <span className="text-xs text-amber-400">🔒 ล็อคแล้ว</span>
                ) : (
                  <button onClick={fetchRate} disabled={fetchingRate} className="text-slate-500 active:text-indigo-400">
                    <RefreshCw size={12} className={fetchingRate ? 'animate-spin' : ''} />
                  </button>
                )}
                <span className="text-xs font-semibold text-green-400 ml-auto">
                  ≈ {amountTHB.toFixed(0)} ฿
                </span>
              </div>
            )}
          </div>

          {/* Paid by */}
          <div>
            <label className="text-xs text-slate-400 font-medium block mb-2">ใครจ่าย</label>
            <div className="space-y-2">
              {members.map(m => {
                const isPayer = m.user_id in payers
                return (
                  <div key={m.user_id} className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        if (isPayer) {
                          const p = { ...payers }; delete p[m.user_id]; setPayers(p)
                        } else {
                          setPayers(p => ({ ...p, [m.user_id]: '' }))
                        }
                      }}
                      className={cn(
                        'w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all',
                        isPayer ? 'bg-indigo-600 border-indigo-500' : 'border-slate-600'
                      )}
                    >
                      {isPayer && <span className="text-white text-xs">✓</span>}
                    </button>
                    <span className="text-sm text-slate-300 flex-1">{m.profile?.display_name}</span>
                    {isPayer && (
                      <input
                        type="number"
                        placeholder={`${amountTHB.toFixed(0)} ฿`}
                        value={payers[m.user_id]}
                        onChange={e => setPayers(p => ({ ...p, [m.user_id]: e.target.value }))}
                        className="w-24 bg-slate-900 text-white rounded-lg px-2 py-1.5 text-xs border border-slate-700 focus:outline-none text-right"
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Split with */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-slate-400 font-medium">หารกับใคร</label>
              <div className="flex bg-slate-800 rounded-lg p-0.5">
                {(['equal', 'custom'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => set('split_type', t)}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-xs transition-all',
                      form.split_type === t ? 'bg-indigo-600 text-white' : 'text-slate-500'
                    )}
                  >
                    {t === 'equal' ? 'หารเท่ากัน' : 'กำหนดเอง'}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {members.map(m => {
                const isSplit = splitters.has(m.user_id)
                const equalShare = isSplit && form.split_type === 'equal'
                  ? (amountTHB / splitterCount).toFixed(0)
                  : ''
                return (
                  <div key={m.user_id} className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        const s = new Set(splitters)
                        if (isSplit) s.delete(m.user_id); else s.add(m.user_id)
                        setSplitters(s)
                      }}
                      className={cn(
                        'w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all',
                        isSplit ? 'bg-indigo-600 border-indigo-500' : 'border-slate-600'
                      )}
                    >
                      {isSplit && <span className="text-white text-xs">✓</span>}
                    </button>
                    <span className="text-sm text-slate-300 flex-1">{m.profile?.display_name}</span>
                    {isSplit && (
                      <span className="text-xs text-slate-500">
                        {form.split_type === 'equal' ? `${equalShare} ฿` : (
                          <input
                            type="number"
                            placeholder="฿"
                            value={customSplits[m.user_id] ?? ''}
                            onChange={e => setCustomSplits(p => ({ ...p, [m.user_id]: e.target.value }))}
                            className="w-20 bg-slate-900 text-white rounded-lg px-2 py-1.5 text-xs border border-slate-700 focus:outline-none text-right"
                          />
                        )}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <button
            onClick={handleAdd}
            disabled={loading || !form.title.trim() || !form.amount_foreign}
            className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-2xl active:scale-95 transition-transform disabled:opacity-50"
          >
            {loading ? <Loader2 size={20} className="animate-spin mx-auto" /> : '💰 บันทึกค่าใช้จ่าย'}
          </button>
        </div>
      </div>
    </div>
  )
}
