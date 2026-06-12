'use client'
import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell } from 'recharts'
import type { Expense } from '@/types'
import { formatCurrency } from '@/lib/utils/debt'

const CATEGORY_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  food:          { label: 'อาหาร',    emoji: '🍜', color: '#f97316' },
  transport:     { label: 'เดินทาง',  emoji: '🚌', color: '#6366f1' },
  accommodation: { label: 'ที่พัก',   emoji: '🏨', color: '#0ea5e9' },
  activity:      { label: 'กิจกรรม', emoji: '🎡', color: '#a855f7' },
  shopping:      { label: 'ช้อปปิ้ง', emoji: '🛍️', color: '#ec4899' },
  other:         { label: 'อื่นๆ',    emoji: '📌', color: '#64748b' },
}

interface Props {
  expenses: Expense[]
}


export default function ExpensePieChart({ expenses }: Props) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null)

  const data = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const e of expenses) {
      totals[e.category] = (totals[e.category] ?? 0) + Number(e.amount_thb)
    }
    return Object.entries(totals)
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, total]) => ({
        cat,
        total,
        ...CATEGORY_CONFIG[cat],
      }))
  }, [expenses])

  const grandTotal = data.reduce((s, d) => s + d.total, 0)
  const active = activeIdx !== null ? data[activeIdx] : null

  if (data.length === 0) return null

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--s0)', border: '1px solid var(--b0)' }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-2">
        <span className="text-base">📊</span>
        <span className="font-bold text-sm" style={{ color: 'var(--t1)' }}>สัดส่วนค่าใช้จ่าย</span>
      </div>

      <div className="flex items-center gap-2 px-3 pb-4">
        {/* Donut */}
        <div className="relative shrink-0" style={{ width: 160, height: 160 }}>
          <PieChart width={160} height={160}>
            <Pie
              data={data}
              cx={80}
              cy={80}
              innerRadius={48}
              outerRadius={70}
              paddingAngle={2}
              dataKey="total"
              onMouseEnter={(_: unknown, idx: number) => setActiveIdx(idx)}
              onMouseLeave={() => setActiveIdx(null)}
              onClick={(_: unknown, idx: number) => setActiveIdx(activeIdx === idx ? null : idx)}
            >
              {data.map((entry) => (
                <Cell key={entry.cat} fill={entry.color}
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }} />
              ))}
            </Pie>
          </PieChart>

          {/* Centre label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {active ? (
              <>
                <span className="text-xl leading-none">{active.emoji}</span>
                <span className="text-[10px] mt-0.5 font-semibold" style={{ color: 'var(--t2)' }}>{active.label}</span>
                <span className="text-xs font-bold mt-0.5" style={{ color: active.color }}>
                  {((active.total / grandTotal) * 100).toFixed(0)}%
                </span>
              </>
            ) : (
              <>
                <span className="text-[11px]" style={{ color: 'var(--t3)' }}>รวม</span>
                <span className="text-sm font-black" style={{ color: 'var(--t1)' }}>
                  {formatCurrency(grandTotal)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-1.5">
          {data.map((d, i) => {
            const pct = ((d.total / grandTotal) * 100).toFixed(0)
            const isActive = activeIdx === i
            return (
              <button
                key={d.cat}
                onClick={() => setActiveIdx(isActive ? null : i)}
                className="w-full flex items-center gap-2 rounded-xl px-2 py-1.5 transition-all active:scale-95"
                style={{
                  background: isActive ? `${d.color}18` : 'transparent',
                  border: `1px solid ${isActive ? d.color + '44' : 'transparent'}`,
                }}
              >
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                <span className="text-xs flex-1 text-left" style={{ color: isActive ? d.color : 'var(--t2)' }}>
                  {d.emoji} {d.label}
                </span>
                <div className="text-right">
                  <span className="text-xs font-bold" style={{ color: isActive ? d.color : 'var(--t1)' }}>
                    {pct}%
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Bar breakdown */}
      <div className="px-4 pb-4 space-y-1.5">
        {data.map((d, i) => {
          const pct = (d.total / grandTotal) * 100
          return (
            <div key={d.cat}>
              <div className="flex justify-between text-xs mb-0.5">
                <span style={{ color: 'var(--t3)' }}>{d.emoji} {d.label}</span>
                <span className="font-semibold" style={{ color: 'var(--t2)' }}>{formatCurrency(d.total)}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--s2)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background: d.color,
                    boxShadow: `0 0 6px ${d.color}88`,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
