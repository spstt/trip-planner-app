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
          <h2 className="text-xl font-bold text-white">บัญชีกลุ่ม</h2>
          <p className="text-slate-500 text-sm mt-0.5">รวม {formatCurrency(totalTHB)}</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 active:scale-90"
        >
          <Plus size={22} className="text-white" />
        </button>
      </div>

      {/* My balance card */}
      <div className="glass rounded-2xl p-4 space-y-1">
        <p className="text-xs text-slate-500">ส่วนแบ่งของฉัน</p>
        <p className="text-2xl font-bold text-white">{formatCurrency(myShare)}</p>
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
            <p className="text-sm font-medium text-slate-300">
              {trip.rates_locked_at ? '🔒 ล็อคอัตราแลกเปลี่ยนแล้ว' : 'อัตราแลกเปลี่ยน (ใช้เรทสด)'}
            </p>
            {trip.rates_locked_at && (
              <p className="text-xs text-slate-500 mt-0.5">
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
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            )}
          >
            {trip.rates_locked_at ? <Lock size={12} /> : <Unlock size={12} />}
            {trip.rates_locked_at ? 'ปลดล็อค' : 'ล็อคเรท'}
          </button>
        </div>
      )}

      {/* Tab */}
      <div className="flex bg-slate-900 rounded-2xl p-1">
        {(['list', 'settle'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-sm font-medium transition-all',
              tab === t ? 'bg-indigo-600 text-white' : 'text-slate-500'
            )}
          >
            {t === 'list' ? '📋 รายการ' : '💸 Settle Up'}
          </button>
        ))}
      </div>

      {tab === 'list' ? (
        <div className="space-y-3 pb-4">
          {expenses.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-2">💰</div>
              <p className="text-slate-500 text-sm">ยังไม่มีรายการค่าใช้จ่าย</p>
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
