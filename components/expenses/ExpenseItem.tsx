'use client'
import type { Expense, ExpenseParticipant, TripMember, Profile } from '@/types'
import { formatCurrency } from '@/lib/utils/debt'
import { format, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'

const CATEGORY_ICONS: Record<string, string> = {
  food: '🍜', transport: '🚌', accommodation: '🏨',
  activity: '🎡', shopping: '🛍️', other: '📌',
}

interface Props {
  expense: Expense
  participants: ExpenseParticipant[]
  currentUserId: string | null
  members: (TripMember & { profile: Profile })[]
}

export default function ExpenseItem({ expense, participants, currentUserId, members }: Props) {
  const payers = participants.filter(p => p.role === 'payer')
  const myShare = participants.find(p => p.user_id === currentUserId && p.role === 'splitter')
  const payerNames = payers.map(p =>
    members.find(m => m.user_id === p.user_id)?.profile?.display_name ?? '?'
  ).join(', ')

  return (
    <div className="glass rounded-2xl px-4 py-3 border border-white/5 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{CATEGORY_ICONS[expense.category]}</span>
          <div>
            <h4 className="font-medium text-white text-sm">{expense.title}</h4>
            <p className="text-xs text-slate-500">
              จ่ายโดย {payerNames} · {format(parseISO(expense.paid_at), 'd MMM', { locale: th })}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-semibold text-white text-sm">{formatCurrency(expense.amount_thb)}</p>
          {expense.currency !== 'THB' && (
            <p className="text-xs text-slate-500">
              {expense.amount_foreign.toLocaleString()} {expense.currency}
            </p>
          )}
        </div>
      </div>

      {myShare && (
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-3 py-1.5">
          <p className="text-xs text-indigo-400">
            ส่วนแบ่งของฉัน: <span className="font-semibold">{formatCurrency(myShare.amount_thb)}</span>
          </p>
        </div>
      )}
    </div>
  )
}
