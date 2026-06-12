'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, TrendingUp, ArrowRightLeft, Lock, Unlock } from 'lucide-react'
import type { Trip, Expense, ExpenseParticipant, Profile, TripMember } from '@/types'
import { calculateDebts, formatCurrency } from '@/lib/utils/debt'
import ExpenseItem from '@/components/expenses/ExpenseItem'
import AddExpenseModal from '@/components/expenses/AddExpenseModal'
import SettleUpSheet from '@/components/expenses/SettleUpSheet'
import ExpensePieChart from '@/components/expenses/ExpensePieChart'
import { cn } from '@/lib/utils/cn'

export default function ExpensesPage() {
  const { id: tripId } = useParams<{ id: string }>()
  const supabase = createClient()
  const [tab, setTab] = useState<'list' | 'settle'>('list')
  const [showAdd, setShowAdd] = useState(false)
  const [trip, setTrip] = useState<Trip | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [participants, setParticipants] = useState<ExpenseParticipant[]>([])
  const [members, setMembers] = useState<(TripMember & { profile: Profile })[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [liveRate, setLiveRate] = useState<Record<string, number>>({})

  useEffect(() => {
    loadAll()
  }, [tripId])

  // Real-time for expenses
  useEffect(() => {
    const channel = supabase
      .channel(`expenses:${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `trip_id=eq.${tripId}` }, () => loadExpenses())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expense_participants', filter: `trip_id=eq.${tripId}` }, () => loadExpenses())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [tripId])

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUserId(user?.id ?? null)

    const [{ data: tripData }, { data: membersData }] = await Promise.all([
      supabase.from('trips').select('*').eq('id', tripId).single(),
      supabase.from('trip_members').select('*, profile:profiles(*)').eq('trip_id', tripId),
    ])
    setTrip(tripData)
    setMembers((membersData ?? []) as any)
    setIsHost(membersData?.some((m: any) => m.user_id === user?.id && m.role === 'host') ?? false)

    await loadExpenses()
  }

  async function loadExpenses() {
    const [{ data: expData }, { data: partData }] = await Promise.all([
      supabase.from('expenses').select('*').eq('trip_id', tripId).order('paid_at', { ascending: false }),
      supabase.from('expense_participants').select('*, profile:profiles(id,display_name,avatar_url)').eq('trip_id', tripId),
    ])
    setExpenses(expData ?? [])
    setParticipants((partData ?? []) as any)
  }

  async function lockRates() {
    if (!trip) return
    // Fetch current rates for currencies used in this trip
    const currencies = [...new Set(expenses.map(e => e.currency).filter(c => c !== 'THB'))]
    if (currencies.length === 0) return

    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/THB`)
      const data = await res.json()
      const rates: Record<string, number> = {}
      for (const cur of currencies) {
        if (data.rates[cur]) {
          rates[cur] = 1 / data.rates[cur] // THB per 1 foreign unit
        }
      }
      await supabase.from('trips').update({
        locked_rates: rates,
        rates_locked_at: new Date().toISOString(),
      }).eq('id', tripId)
      setTrip(t => t ? { ...t, locked_rates: rates, rates_locked_at: new Date().toISOString() } : t)
    } catch {
      alert('ไม่สามารถดึงอัตราแลกเปลี่ยนได้')
    }
  }

  async function unlockRates() {
    await supabase.from('trips').update({ locked_rates: {}, rates_locked_at: null }).eq('id', tripId)
    setTrip(t => t ? { ...t, locked_rates: {}, rates_locked_at: null } : t)
  }

  const totalTHB = expenses.reduce((s, e) => s + Number(e.amount_thb), 0)
  const myShare = participants
    .filter(p => p.user_id === currentUserId && p.role === 'splitter')
    .reduce((s, p) => s + Number(p.amount_thb), 0)

  const debts = calculateDebts(expenses, participants)
  const myDebts = debts.filter(d => d.from === currentUserId || d.to === currentUserId)

  return (
    <div className="px-4 pt-4 space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--t1)', margin: 0, letterSpacing: '-0.02em' }}>บัญชีกลุ่ม</h2>
          <p style={{ fontSize: 13, color: 'var(--t3)', marginTop: 2 }}>รวม {formatCurrency(totalTHB)}</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="pressable"
          style={{
            width: 48, height: 48, borderRadius: 16, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, var(--indigo), var(--violet))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px var(--indigo-glow)',
          }}
        >
          <Plus size={22} style={{ color: 'white' }} />
        </button>
      </div>

      {/* My balance card */}
      <div className="glass rounded-2xl p-4 space-y-1">
        <p className="text-xs" style={{ color: 'var(--t3)' }}>ส่วนแบ่งของฉัน</p>
        <p className="text-2xl font-bold" style={{ color: 'var(--t1)' }}>{formatCurrency(myShare)}</p>
        {myDebts.length > 0 && (
          <div className="mt-2 space-y-1">
            {myDebts.slice(0, 2).map((d, i) => {
              const isOwing = d.from === currentUserId
              const other = members.find(m => m.user_id === (isOwing ? d.to : d.from))
              return (
                <p key={i} className={cn('text-xs', isOwing ? 'text-rose-400' : 'text-emerald-400')}>
                  {isOwing ? `ติดหนี้ ${other?.profile?.display_name}` : `${other?.profile?.display_name} ต้องคืน`}
                  {' '}{formatCurrency(d.amount)}
                </p>
              )
            })}
          </div>
        )}
      </div>

      {/* Rate lock (host only, international trips) */}
      {isHost && trip?.is_international && (
        <div className="glass rounded-2xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--t1)' }}>
              {trip.rates_locked_at ? '🔒 ล็อคอัตราแลกเปลี่ยนแล้ว' : 'อัตราแลกเปลี่ยน (ใช้เรทสด)'}
            </p>
            {trip.rates_locked_at && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--t3)' }}>
                ล็อคเมื่อ {new Date(trip.rates_locked_at).toLocaleDateString('th-TH')}
              </p>
            )}
          </div>
          <button
            onClick={trip.rates_locked_at ? unlockRates : lockRates}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-90',
              trip.rates_locked_at
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'border'
            )}
            style={!trip.rates_locked_at ? { background: 'var(--s2)', color: 'var(--t2)', borderColor: 'var(--b1)' } : undefined}
          >
            {trip.rates_locked_at ? <Lock size={12} /> : <Unlock size={12} />}
            {trip.rates_locked_at ? 'ปลดล็อค' : 'ล็อคเรท'}
          </button>
        </div>
      )}

      {/* Tab */}
      <div style={{ display: 'flex', background: 'var(--s1)', borderRadius: 20, padding: 4, border: '1px solid var(--b0)' }}>
        {(['list', 'settle'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 16, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, transition: 'all 0.18s ease',
              background: tab === t ? 'linear-gradient(135deg, var(--indigo), var(--violet))' : 'transparent',
              color: tab === t ? 'white' : 'var(--t2)',
              boxShadow: tab === t ? '0 2px 10px var(--indigo-glow)' : 'none',
            }}
          >
            {t === 'list' ? '📋 รายการ' : '💸 Settle Up'}
          </button>
        ))}
      </div>

      {tab === 'list' ? (
        <div className="space-y-3 pb-4">
          {/* Pie chart — show when >= 2 categories */}
          {expenses.length > 0 && (
            <ExpensePieChart expenses={expenses} />
          )}

          {expenses.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-2">💰</div>
              <p style={{ fontSize: 14, color: 'var(--t3)' }}>ยังไม่มีรายการค่าใช้จ่าย</p>
            </div>
          ) : (
            trip && expenses.map(exp => (
              <ExpenseItem
                key={exp.id}
                expense={exp}
                trip={trip}
                participants={participants.filter(p => p.expense_id === exp.id)}
                currentUserId={currentUserId}
                members={members}
                onUpdated={loadExpenses}
              />
            ))
          )}
        </div>
      ) : (
        <SettleUpSheet
          debts={debts}
          members={members}
          currentUserId={currentUserId}
        />
      )}

      {showAdd && trip && (
        <AddExpenseModal
          tripId={tripId}
          trip={trip}
          members={members}
          currentUserId={currentUserId!}
          onClose={() => setShowAdd(false)}
          onAdded={() => { setShowAdd(false); loadExpenses() }}
        />
      )}
    </div>
  )
}
