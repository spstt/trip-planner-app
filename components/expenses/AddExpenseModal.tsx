'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Loader2, RefreshCw, ChevronDown, CalendarRange, Repeat2 } from 'lucide-react'
import type { Trip, TripMember, Profile } from '@/types'

const CATEGORIES = [
  { id: 'food',          label: '🍜 อาหาร' },
  { id: 'transport',     label: '🚌 เดินทาง' },
  { id: 'accommodation', label: '🏨 ที่พัก' },
  { id: 'activity',      label: '🎡 กิจกรรม' },
  { id: 'shopping',      label: '🛍️ ช้อปปิ้ง' },
  { id: 'other',         label: '📌 อื่นๆ' },
]

const COMMON_CURRENCIES = [
  { code: 'THB', flag: '🇹🇭', name: 'บาทไทย' },
  { code: 'KRW', flag: '🇰🇷', name: 'วอนเกาหลี' },
  { code: 'JPY', flag: '🇯🇵', name: 'เยนญี่ปุ่น' },
  { code: 'USD', flag: '🇺🇸', name: 'ดอลลาร์' },
  { code: 'EUR', flag: '🇪🇺', name: 'ยูโร' },
  { code: 'SGD', flag: '🇸🇬', name: 'ดอลลาร์สิงคโปร์' },
  { code: 'MYR', flag: '🇲🇾', name: 'ริงกิต' },
  { code: 'HKD', flag: '🇭🇰', name: 'ดอลลาร์ฮ่องกง' },
  { code: 'CNY', flag: '🇨🇳', name: 'หยวน' },
  { code: 'TWD', flag: '🇹🇼', name: 'ดอลลาร์ไต้หวัน' },
  { code: 'GBP', flag: '🇬🇧', name: 'ปอนด์' },
  { code: 'AUD', flag: '🇦🇺', name: 'ดอลลาร์ออสเตรเลีย' },
]

// Format number with locale separators
function fmt(n: number, decimals = 0) {
  return n.toLocaleString('th-TH', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

// Count calendar days between two ISO date strings (inclusive)
function daysBetween(start: string, end: string): number {
  if (!start || !end) return 1
  const a = new Date(start), b = new Date(end)
  if (isNaN(a.getTime()) || isNaN(b.getTime()) || b < a) return 1
  return Math.round((b.getTime() - a.getTime()) / 86400000) + 1
}

// Generate array of ISO date strings for each day in range
function dateRange(start: string, end: string): string[] {
  const days: string[] = []
  const a = new Date(start), b = new Date(end)
  if (isNaN(a.getTime()) || isNaN(b.getTime()) || b < a) return [start]
  const cur = new Date(a)
  while (cur <= b) {
    days.push(cur.toISOString().slice(0, 10))
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

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
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false)
  const currencyRef = useRef<HTMLDivElement>(null)

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
  const [isCash, setIsCash] = useState(false)

  // Multi-day spread
  const [spreadEnabled, setSpreadEnabled] = useState(false)
  const [spreadStart, setSpreadStart] = useState(trip.start_date?.slice(0, 10) ?? '')
  const [spreadEnd, setSpreadEnd]   = useState(trip.start_date?.slice(0, 10) ?? '')

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  const selectedCurrency = COMMON_CURRENCIES.find(c => c.code === form.currency) ?? { code: form.currency, flag: '💱', name: '' }

  // Auto-fetch rate when currency changes
  useEffect(() => {
    if (form.currency === 'THB') { set('exchange_rate', '1'); return }
    const locked = trip.locked_rates?.[form.currency]
    if (locked) { set('exchange_rate', locked.toString()); return }
    fetchRate()
  }, [form.currency])

  // Close currency picker on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (currencyRef.current && !currencyRef.current.contains(e.target as Node))
        setShowCurrencyPicker(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function fetchRate() {
    if (form.currency === 'THB') return
    setFetchingRate(true)
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${form.currency}`)
      const data = await res.json()
      if (data.rates?.THB) set('exchange_rate', data.rates.THB.toFixed(4))
    } catch {}
    setFetchingRate(false)
  }

  const amountForeign = parseFloat(form.amount_foreign || '0')
  const rate = parseFloat(form.exchange_rate || '1')
  const amountTHB = amountForeign * rate

  // Spread calculations
  const numDays = spreadEnabled ? daysBetween(spreadStart, spreadEnd) : 1
  const perDayTHB = numDays > 1 ? amountTHB / numDays : amountTHB
  const perDayForeign = numDays > 1 ? amountForeign / numDays : amountForeign
  const splitterCount = splitters.size

  async function handleAdd() {
    if (!form.title.trim() || !form.amount_foreign) return
    setLoading(true)

    try {
      if (spreadEnabled && numDays > 1) {
        // Insert one expense per day
        const days = dateRange(spreadStart, spreadEnd)
        for (const date of days) {
          const { data: expense } = await supabase.from('expenses').insert({
            trip_id: tripId,
            title: form.title.trim(),
            category: form.category,
            amount_foreign: Math.round(perDayForeign * 100) / 100,
            currency: form.currency,
            exchange_rate: rate,
            amount_thb: Math.round(perDayTHB * 100) / 100,
            split_type: form.split_type,
            notes: form.notes || null,
            created_by: currentUserId,
            is_cash: isCash,
            paid_at: new Date(date).toISOString(),
          }).select().single()

          if (!expense || isCash) continue
          await insertParticipants(expense.id, perDayTHB)
        }
      } else {
        // Single expense
        const { data: expense } = await supabase.from('expenses').insert({
          trip_id: tripId,
          title: form.title.trim(),
          category: form.category,
          amount_foreign: amountForeign,
          currency: form.currency,
          exchange_rate: rate,
          amount_thb: amountTHB,
          split_type: form.split_type,
          notes: form.notes || null,
          created_by: currentUserId,
          is_cash: isCash,
        }).select().single()

        if (expense && !isCash) await insertParticipants(expense.id, amountTHB)
      }
    } finally {
      setLoading(false)
    }

    onAdded()
  }

  async function insertParticipants(expenseId: string, totalTHB: number) {
    const payerEntries = Object.entries(payers).map(([userId, amt]) => ({
      expense_id: expenseId,
      trip_id: tripId,
      user_id: userId,
      role: 'payer' as const,
      amount_thb: amt !== '' && parseFloat(amt) > 0 ? parseFloat(amt) : totalTHB,
    }))
    const splitAmt = form.split_type === 'equal' ? totalTHB / splitterCount : 0
    const splitterEntries = [...splitters].map(userId => ({
      expense_id: expenseId,
      trip_id: tripId,
      user_id: userId,
      role: 'splitter' as const,
      amount_thb: form.split_type === 'equal' ? splitAmt : parseFloat(customSplits[userId] || '0'),
    }))
    await supabase.from('expense_participants').insert([...payerEntries, ...splitterEntries])
  }

  // ── Styles helpers
  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--s1)', color: 'var(--t1)',
    borderRadius: 14, padding: '12px 14px', fontSize: 14, border: '1.5px solid var(--b1)',
    outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--t3)', marginBottom: 6, display: 'block' }
  const checkboxStyle = (active: boolean): React.CSSProperties => ({
    width: 22, height: 22, borderRadius: 8, border: 'none', cursor: 'pointer', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: active ? 'linear-gradient(135deg, var(--indigo), var(--violet))' : 'var(--s2)',
    outline: active ? 'none' : '1.5px solid var(--b1)',
    fontSize: 11, color: 'white', fontWeight: 800,
  })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose} />

      <div className="spring-enter" style={{
        position: 'relative', width: '100%',
        background: 'var(--bg)', borderRadius: '28px 28px 0 0',
        maxHeight: '94dvh', overflowY: 'auto',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.22)',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 14, paddingBottom: 4 }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--b1)' }} />
        </div>

        <div style={{ padding: '4px 20px 44px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--t1)', margin: 0, letterSpacing: '-0.02em' }}>เพิ่มค่าใช้จ่าย</h2>
              <p style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>บันทึกและหารบิลกันในกลุ่ม</p>
            </div>
            <button onClick={onClose} style={{
              width: 36, height: 36, borderRadius: 12, background: 'var(--s2)',
              border: '1px solid var(--b0)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}>
              <X size={16} style={{ color: 'var(--t2)' }} />
            </button>
          </div>

          {/* Category */}
          <div>
            <label style={labelStyle}>หมวดหมู่</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => set('category', cat.id)} style={{
                  padding: '10px 6px', borderRadius: 14, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                  background: form.category === cat.id
                    ? 'linear-gradient(135deg, var(--indigo), var(--violet))'
                    : 'var(--s1)',
                  color: form.category === cat.id ? 'white' : 'var(--t2)',
                  boxShadow: form.category === cat.id ? '0 2px 10px var(--indigo-glow)' : 'none',
                }}>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label style={labelStyle}>รายการ <span style={{ color: '#f43f5e' }}>*</span></label>
            <input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="เช่น ข้าวหมูแดง, Airbnb กังนัม"
              style={inputStyle}
            />
          </div>

          {/* ── Currency Converter ── */}
          <div>
            <label style={labelStyle}>จำนวนเงิน <span style={{ color: '#f43f5e' }}>*</span></label>

            {/* Amount row */}
            <div style={{ display: 'flex', gap: 8 }}>
              {/* Currency picker button */}
              <div ref={currencyRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowCurrencyPicker(v => !v)}
                  style={{
                    height: '100%', minWidth: 90, padding: '12px 10px',
                    background: 'var(--s1)', border: '1.5px solid var(--b1)',
                    borderRadius: 14, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: 14, fontWeight: 700, color: 'var(--t1)',
                  }}
                >
                  <span>{selectedCurrency.flag}</span>
                  <span>{selectedCurrency.code}</span>
                  <ChevronDown size={12} style={{ color: 'var(--t3)', marginLeft: 2 }} />
                </button>

                {/* Dropdown */}
                {showCurrencyPicker && (
                  <div style={{
                    position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, zIndex: 100,
                    background: 'var(--bg)', borderRadius: 20, overflow: 'hidden',
                    border: '1px solid var(--b0)', boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
                    minWidth: 200,
                  }}>
                    {COMMON_CURRENCIES.map((c, i) => (
                      <button
                        key={c.code}
                        onClick={() => { set('currency', c.code); setShowCurrencyPicker(false) }}
                        style={{
                          width: '100%', textAlign: 'left', padding: '10px 16px',
                          display: 'flex', alignItems: 'center', gap: 10,
                          background: form.currency === c.code ? 'rgba(99,102,241,0.10)' : 'none',
                          border: 'none', cursor: 'pointer',
                          borderBottom: i < COMMON_CURRENCIES.length - 1 ? '1px solid var(--b0)' : 'none',
                        }}
                      >
                        <span style={{ fontSize: 20 }}>{c.flag}</span>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', margin: 0 }}>{c.code}</p>
                          <p style={{ fontSize: 11, color: 'var(--t3)', margin: 0 }}>{c.name}</p>
                        </div>
                        {form.currency === c.code && (
                          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--indigo)', fontWeight: 700 }}>✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <input
                type="number"
                value={form.amount_foreign}
                onChange={e => set('amount_foreign', e.target.value)}
                placeholder="0"
                style={{ ...inputStyle, flex: 1 }}
              />
            </div>

            {/* Exchange rate row — non-THB */}
            {form.currency !== 'THB' && (
              <div style={{
                marginTop: 10, padding: '10px 14px', borderRadius: 14,
                background: 'var(--s1)', border: '1px solid var(--b0)',
                display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
              }}>
                {/* Rate input */}
                <span style={{ fontSize: 12, color: 'var(--t3)', whiteSpace: 'nowrap' }}>
                  1 {form.currency} =
                </span>
                <input
                  type="number"
                  value={form.exchange_rate}
                  onChange={e => set('exchange_rate', e.target.value)}
                  style={{
                    width: 80, background: 'var(--s2)', color: 'var(--t1)',
                    borderRadius: 10, padding: '5px 10px', fontSize: 13,
                    border: '1px solid var(--b1)', outline: 'none',
                  }}
                />
                <span style={{ fontSize: 12, color: 'var(--t3)' }}>THB</span>

                {trip.rates_locked_at ? (
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: '#f59e0b',
                    background: 'rgba(245,158,11,0.12)', padding: '3px 8px', borderRadius: 99,
                  }}>🔒 ล็อคแล้ว</span>
                ) : (
                  <button onClick={fetchRate} disabled={fetchingRate} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--t3)',
                  }}>
                    <RefreshCw size={12} style={{ animation: fetchingRate ? 'spin 0.8s linear infinite' : 'none' }} />
                  </button>
                )}

                {/* Live THB preview */}
                {amountForeign > 0 && (
                  <div style={{
                    marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
                    background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.25)',
                    borderRadius: 10, padding: '4px 10px',
                  }}>
                    <span style={{ fontSize: 11, color: 'var(--t3)' }}>≈</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#10b981', letterSpacing: '-0.01em' }}>
                      {fmt(amountTHB)} ฿
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Spread preview tag while spread is on */}
            {spreadEnabled && numDays > 1 && amountForeign > 0 && (
              <div style={{
                marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
              }}>
                <span style={{
                  fontSize: 12, fontWeight: 600, color: '#8b5cf6',
                  background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.22)',
                  borderRadius: 99, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <Repeat2 size={11} />
                  แบ่ง {numDays} วัน
                </span>
                <span style={{ fontSize: 12, color: 'var(--t3)' }}>วันละ</span>
                <span style={{
                  fontSize: 13, fontWeight: 700, color: 'var(--t1)',
                  background: 'var(--s1)', borderRadius: 10, padding: '3px 10px',
                }}>
                  {form.currency !== 'THB' && `${fmt(perDayForeign, 0)} ${form.currency} · `}
                  {fmt(perDayTHB)} ฿
                </span>
              </div>
            )}
          </div>

          {/* ── Multi-day Spread ── */}
          <div style={{
            borderRadius: 18,
            background: spreadEnabled ? 'rgba(139,92,246,0.07)' : 'var(--s1)',
            border: `1.5px solid ${spreadEnabled ? 'rgba(139,92,246,0.28)' : 'var(--b0)'}`,
            overflow: 'hidden',
            transition: 'all 0.2s',
          }}>
            {/* Toggle row */}
            <button
              onClick={() => setSpreadEnabled(v => !v)}
              style={{
                width: '100%', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 12, flexShrink: 0,
                background: spreadEnabled ? 'rgba(139,92,246,0.15)' : 'var(--s2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CalendarRange size={16} style={{ color: spreadEnabled ? '#8b5cf6' : 'var(--t3)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: spreadEnabled ? '#8b5cf6' : 'var(--t1)', margin: 0 }}>
                  เฉลี่ยค่าใช้จ่ายรายวัน
                </p>
                <p style={{ fontSize: 11, color: 'var(--t3)', margin: '2px 0 0' }}>
                  สำหรับค่าที่พัก / เช่ารถ ที่ครอบคลุมหลายวัน
                </p>
              </div>
              {/* Pill toggle */}
              <div style={{
                width: 44, height: 24, borderRadius: 99, padding: '2px 3px', flexShrink: 0,
                background: spreadEnabled ? '#8b5cf6' : 'var(--s2)',
                display: 'flex', alignItems: 'center', transition: 'background 0.2s',
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', background: 'white',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                  transform: spreadEnabled ? 'translateX(20px)' : 'translateX(0)',
                  transition: 'transform 0.2s',
                }} />
              </div>
            </button>

            {/* Date range picker — visible when enabled */}
            {spreadEnabled && (
              <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ height: 1, background: 'var(--b0)', marginBottom: 4 }} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: 4 }}>วันเริ่มต้น</label>
                    <input
                      type="date"
                      value={spreadStart}
                      min={trip.start_date?.slice(0, 10)}
                      max={trip.end_date?.slice(0, 10)}
                      onChange={e => {
                        setSpreadStart(e.target.value)
                        if (spreadEnd < e.target.value) setSpreadEnd(e.target.value)
                      }}
                      style={{
                        ...inputStyle, padding: '10px 12px', fontSize: 13,
                        colorScheme: 'dark',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: 4 }}>วันสิ้นสุด</label>
                    <input
                      type="date"
                      value={spreadEnd}
                      min={spreadStart || trip.start_date?.slice(0, 10)}
                      max={trip.end_date?.slice(0, 10)}
                      onChange={e => setSpreadEnd(e.target.value)}
                      style={{
                        ...inputStyle, padding: '10px 12px', fontSize: 13,
                        colorScheme: 'dark',
                      }}
                    />
                  </div>
                </div>

                {numDays > 1 && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 14,
                    background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.18)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Repeat2 size={14} style={{ color: '#8b5cf6' }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#8b5cf6' }}>
                        สร้าง {numDays} รายการ
                      </span>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--t2)', fontWeight: 600 }}>
                      วันละ {fmt(perDayTHB)} ฿
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Paid by */}
          <div>
            <label style={labelStyle}>ใครจ่าย</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {members.map(m => {
                const isPayer = m.user_id in payers
                return (
                  <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      onClick={() => {
                        if (isPayer) {
                          const p = { ...payers }; delete p[m.user_id]; setPayers(p)
                        } else {
                          setPayers(p => ({ ...p, [m.user_id]: '' }))
                        }
                      }}
                      style={checkboxStyle(isPayer)}
                    >
                      {isPayer && '✓'}
                    </button>
                    <span style={{ fontSize: 14, color: 'var(--t2)', flex: 1 }}>{m.profile?.display_name}</span>
                    {isPayer && (
                      <input
                        type="number"
                        placeholder={`${fmt(spreadEnabled && numDays > 1 ? perDayTHB : amountTHB)} ฿`}
                        value={payers[m.user_id]}
                        onChange={e => setPayers(p => ({ ...p, [m.user_id]: e.target.value }))}
                        style={{
                          width: 100, background: 'var(--s2)', color: 'var(--t1)',
                          borderRadius: 10, padding: '6px 10px', fontSize: 12,
                          border: '1px solid var(--b1)', outline: 'none', textAlign: 'right',
                        }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Split with */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t3)' }}>หารกับใคร</label>
              <div style={{ display: 'flex', background: 'var(--s1)', borderRadius: 12, padding: 3, border: '1px solid var(--b0)' }}>
                {(['equal', 'custom'] as const).map(t => (
                  <button key={t} onClick={() => set('split_type', t)} style={{
                    padding: '5px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    fontSize: 11, fontWeight: 600, transition: 'all 0.15s',
                    background: form.split_type === t
                      ? 'linear-gradient(135deg, var(--indigo), var(--violet))'
                      : 'transparent',
                    color: form.split_type === t ? 'white' : 'var(--t3)',
                  }}>
                    {t === 'equal' ? 'หารเท่ากัน' : 'กำหนดเอง'}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {members.map(m => {
                const isSplit = splitters.has(m.user_id)
                const refAmt = spreadEnabled && numDays > 1 ? perDayTHB : amountTHB
                const equalShare = isSplit && form.split_type === 'equal' && splitterCount > 0
                  ? fmt(refAmt / splitterCount)
                  : ''
                return (
                  <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      onClick={() => {
                        const s = new Set(splitters)
                        if (isSplit) s.delete(m.user_id); else s.add(m.user_id)
                        setSplitters(s)
                      }}
                      style={checkboxStyle(isSplit)}
                    >
                      {isSplit && '✓'}
                    </button>
                    <span style={{ fontSize: 14, color: 'var(--t2)', flex: 1 }}>{m.profile?.display_name}</span>
                    {isSplit && (
                      form.split_type === 'equal'
                        ? <span style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 600 }}>{equalShare} ฿</span>
                        : <input
                            type="number"
                            placeholder="฿"
                            value={customSplits[m.user_id] ?? ''}
                            onChange={e => setCustomSplits(p => ({ ...p, [m.user_id]: e.target.value }))}
                            style={{
                              width: 90, background: 'var(--s2)', color: 'var(--t1)',
                              borderRadius: 10, padding: '6px 10px', fontSize: 12,
                              border: '1px solid var(--b1)', outline: 'none', textAlign: 'right',
                            }}
                          />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Cash toggle */}
          <button
            onClick={() => setIsCash(v => !v)}
            style={{
              width: '100%', padding: '14px 16px', borderRadius: 18, border: 'none', cursor: 'pointer',
              background: isCash ? 'rgba(16,185,129,0.10)' : 'var(--s1)',
              outline: `1.5px solid ${isCash ? 'rgba(16,185,129,0.30)' : 'var(--b0)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: isCash ? '#34d399' : 'var(--t1)', margin: 0 }}>
                💵 จ่ายเงินสดแล้ว
              </p>
              <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>
                {isCash ? 'ไม่นำยอดนี้ไปคิดใน Settle Up' : 'นำยอดนี้ไปคิดใน Settle Up'}
              </p>
            </div>
            <div style={{
              width: 44, height: 24, borderRadius: 99, padding: '2px 3px',
              background: isCash ? '#10b981' : 'var(--s2)',
              display: 'flex', alignItems: 'center', transition: 'background 0.2s',
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: '50%', background: 'white',
                boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                transform: isCash ? 'translateX(20px)' : 'translateX(0)',
                transition: 'transform 0.2s',
              }} />
            </div>
          </button>

          {/* Submit */}
          <button
            onClick={handleAdd}
            disabled={loading || !form.title.trim() || !form.amount_foreign}
            style={{
              width: '100%', padding: '16px 0', borderRadius: 20, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, var(--indigo), var(--violet))',
              color: 'white', fontSize: 15, fontWeight: 700,
              boxShadow: '0 4px 20px var(--indigo-glow)',
              opacity: (loading || !form.title.trim() || !form.amount_foreign) ? 0.45 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'opacity 0.15s',
            }}
          >
            {loading
              ? <><Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> กำลังบันทึก...</>
              : spreadEnabled && numDays > 1
                ? `📅 บันทึก ${numDays} วัน · ${fmt(amountTHB)} ฿`
                : `💰 บันทึกค่าใช้จ่าย`
            }
          </button>

        </div>
      </div>
    </div>
  )
}
