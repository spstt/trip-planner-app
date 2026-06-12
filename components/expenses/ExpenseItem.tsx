'use client'
import { useState } from 'react'
import type { Expense, ExpenseParticipant, TripMember, Profile, Trip } from '@/types'
import { formatCurrency } from '@/lib/utils/debt'
import { format, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'
import { Pencil } from 'lucide-react'
import EditExpenseModal from './EditExpenseModal'

const CATEGORY_ICONS: Record<string, string> = {
  food: '🍜', transport: '🚌', accommodation: '🏨',
  activity: '🎡', shopping: '🛍️', other: '📌',
}

interface Props {
  expense: Expense
  trip: Trip
  participants: ExpenseParticipant[]
  currentUserId: string | null
  members: (TripMember & { profile: Profile })[]
  onUpdated: () => void
}

export default function ExpenseItem({ expense, trip, participants, currentUserId, members, onUpdated }: Props) {
  const [showEdit, setShowEdit] = useState(false)
  const payers = participants.filter(p => p.role === 'payer')
  const myShare = participants.find(p => p.user_id === currentUserId && p.role === 'splitter')
  const isOwner = expense.created_by === currentUserId
  const payerNames = payers.map(p =>
    members.find(m => m.user_id === p.user_id)?.profile?.display_name ?? '?'
  ).join(', ')

  return (
    <>
      <div className="glass rounded-2xl px-4 py-3 border border-white/5 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{CATEGORY_ICONS[expense.category]}</span>
            <div>
              <h4 className="font-medium text-sm" style={{ color: 'var(--t1)' }}>{expense.title}</h4>
              <p className="text-xs" style={{ color: 'var(--t3)' }}>
                จ่ายโดย {payerNames} · {format(parseISO(expense.paid_at), 'd MMM', { locale: th })}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div className="text-right shrink-0">
              <p className="font-semibold text-sm" style={{ color: 'var(--t1)' }}>
                {formatCurrency(expense.amount_thb)}
              </p>
              {expense.currency !== 'THB' && (
                <p className="text-xs" style={{ color: 'var(--t3)' }}>
                  {expense.amount_foreign.toLocaleString()} {expense.currency}
                </p>
              )}
            </div>

            {/* ปุ่มแก้ไข — เห็นเฉพาะคนที่สร้าง */}
            {isOwner && (
              <button
                onClick={() => setShowEdit(true)}
                className="pressable"
                style={{ marginTop: 2, padding: 6, borderRadius: 10,
                  background: 'var(--s2)', border: '1px solid var(--b0)',
                  color: 'var(--t3)', cursor: 'pointer' }}
              >
                <Pencil size={13} />
              </button>
            )}
          </div>
        </div>

        {myShare && (
          <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: 12, padding: '6px 12px' }}>
            <p style={{ fontSize: 12, color: 'var(--indigo)' }}>
              ส่วนแบ่งของฉัน:{' '}
              <span style={{ fontWeight: 700 }}>{formatCurrency(myShare.amount_thb)}</span>
            </p>
          </div>
        )}
      </div>

      {showEdit && (
        <EditExpenseModal
          expense={expense}
          trip={trip}
          onClose={() => setShowEdit(false)}
          onUpdated={onUpdated}
        />
      )}
    </>
  )
}
