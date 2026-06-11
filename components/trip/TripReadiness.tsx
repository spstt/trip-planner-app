'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  Plane, Map, CheckSquare, Users, Receipt,
  ChevronRight, Sparkles, AlertCircle, CheckCircle2,
} from 'lucide-react'
import { differenceInDays, parseISO, isBefore, isAfter, startOfToday } from 'date-fns'
import type { Trip, TripMember, Profile } from '@/types'

interface Props {
  trip: Trip
  members: (TripMember & { profile: Profile })[]
  currentUserId: string | null
  isHost: boolean
}

interface Stats {
  bookingCount: number
  itineraryCount: number
  checklistTotal: number
  checklistDone: number
  pendingDebtTHB: number
  daysUntil: number
  isPast: boolean
  isActive: boolean
}

// ─── Smart prompt definitions ───────────────────────────────────────────────
function getPrompts(trip: Trip, stats: Stats, members: Props['members'], isHost: boolean) {
  const prompts: { id: string; icon: string; title: string; sub: string; href: string; color: string; urgent: boolean }[] = []
  const { bookingCount, itineraryCount, checklistTotal, checklistDone, pendingDebtTHB, daysUntil, isPast, isActive } = stats

  if (isPast) {
    if (pendingDebtTHB > 0) prompts.push({ id: 'debt', icon: '💸', title: 'ยังมียอดค้างชำระ', sub: `รวม ฿${pendingDebtTHB.toLocaleString()} — กด Settle Up ได้เลย`, href: 'expenses', color: '#f59e0b', urgent: true })
    return prompts
  }

  if (isActive) {
    prompts.push({ id: 'active', icon: '🎉', title: 'ทริปเริ่มแล้ว! สนุกนะ', sub: 'ดูแผนวันนี้หรือแชร์จุดนัดรวมพลให้เพื่อน', href: 'itinerary', color: '#10b981', urgent: false })
    if (pendingDebtTHB > 0) prompts.push({ id: 'debt', icon: '💸', title: 'อย่าลืมบันทึกค่าใช้จ่าย', sub: `มียอดค้างอยู่ ฿${pendingDebtTHB.toLocaleString()}`, href: 'expenses', color: '#f59e0b', urgent: false })
    return prompts
  }

  // Upcoming trip prompts — ordered by urgency
  if (members.length === 1 && isHost)
    prompts.push({ id: 'invite', icon: '👥', title: 'ทริปนี้ยังไม่มีเพื่อน', sub: 'คัดลอกลิงก์เชิญแล้วส่งให้เพื่อนมาร่วมทริป', href: '', color: '#8b5cf6', urgent: daysUntil < 14 })

  if (bookingCount === 0)
    prompts.push({ id: 'booking', icon: '✈️', title: 'ยังไม่มีตั๋วหรือการจอง', sub: 'อัปโหลด E-ticket หรือเลขบุ๊คกิ้งไว้ก่อนเดินทาง', href: 'bookings', color: '#6366f1', urgent: daysUntil < 7 })

  if (itineraryCount === 0)
    prompts.push({ id: 'itinerary', icon: '🗺️', title: 'ยังไม่ได้วางแผนการเดินทาง', sub: 'เพิ่มสถานที่ เวลา และเส้นทางไว้เลย', href: 'itinerary', color: '#06b6d4', urgent: daysUntil < 3 })

  if (checklistTotal === 0)
    prompts.push({ id: 'checklist', icon: '🧳', title: 'ยังไม่มีรายการของที่ต้องเตรียม', sub: 'เพิ่ม checklist เพื่อไม่ลืมของสำคัญ', href: 'checklist', color: '#10b981', urgent: daysUntil < 5 })
  else if (checklistTotal > 0 && checklistDone < checklistTotal)
    prompts.push({ id: 'checklist-prog', icon: '📦', title: `เตรียมของแล้ว ${checklistDone}/${checklistTotal} รายการ`, sub: `ยังขาดอีก ${checklistTotal - checklistDone} รายการ`, href: 'checklist', color: '#10b981', urgent: daysUntil < 2 })

  if (checklistTotal > 0 && checklistDone === checklistTotal && bookingCount > 0 && itineraryCount > 0)
    prompts.push({ id: 'ready', icon: '🚀', title: 'ทุกอย่างพร้อมแล้ว!', sub: 'ตั๋ว แผน และของครบ — ไปสนุกกันได้เลย', href: '', color: '#6366f1', urgent: false })

  // Sort urgent first, max 3
  return prompts.sort((a, b) => Number(b.urgent) - Number(a.urgent)).slice(0, 3)
}

// ─── Readiness score ─────────────────────────────────────────────────────────
function calcScore(stats: Stats, members: Props['members']): number {
  let score = 0
  if (stats.bookingCount > 0)                                     score += 30
  if (stats.itineraryCount > 0)                                   score += 30
  if (stats.checklistTotal > 0 && stats.checklistDone === stats.checklistTotal) score += 20
  else if (stats.checklistDone > 0)                               score += 10
  if (members.length >= 2)                                        score += 20
  return score
}

export default function TripReadiness({ trip, members, currentUserId, isHost }: Props) {
  const supabase = createClient()
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => { loadStats() }, [trip.id])

  async function loadStats() {
    const today = startOfToday()
    const start = parseISO(trip.start_date)
    const end   = parseISO(trip.end_date)

    const [
      { count: bookingCount },
      { count: itineraryCount },
      { data: checklistData },
      { data: expParticipants },
    ] = await Promise.all([
      supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('trip_id', trip.id),
      supabase.from('itinerary_items').select('id', { count: 'exact', head: true }).eq('trip_id', trip.id).eq('is_backup', false),
      supabase.from('checklist_items').select('is_checked').eq('trip_id', trip.id).eq('is_shared', true),
      supabase.from('expense_participants').select('role, amount_thb, user_id').eq('trip_id', trip.id),
    ])

    // Calculate net debt for current user
    let pendingDebtTHB = 0
    if (currentUserId && expParticipants) {
      const paid = expParticipants.filter(p => p.user_id === currentUserId && p.role === 'payer').reduce((s, p) => s + Number(p.amount_thb), 0)
      const owed = expParticipants.filter(p => p.user_id === currentUserId && p.role === 'splitter').reduce((s, p) => s + Number(p.amount_thb), 0)
      pendingDebtTHB = Math.max(0, Math.round(owed - paid))
    }

    setStats({
      bookingCount:    bookingCount ?? 0,
      itineraryCount:  itineraryCount ?? 0,
      checklistTotal:  checklistData?.length ?? 0,
      checklistDone:   checklistData?.filter(c => c.is_checked).length ?? 0,
      pendingDebtTHB,
      daysUntil:       differenceInDays(start, today),
      isPast:          isBefore(end, today),
      isActive:        !isBefore(end, today) && !isAfter(start, today),
    })
  }

  if (!stats) return <ReadinessSkeleton />

  const score    = calcScore(stats, members)
  const prompts  = getPrompts(trip, stats, members, isHost)
  const scoreColor = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#6366f1'
  const scoreLabel = score >= 80 ? 'พร้อมเดินทาง 🚀' : score >= 50 ? 'กำลังดี ⚡' : 'เพิ่งเริ่มต้น ✨'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── Readiness Score Card ── */}
      <div style={{ borderRadius: 20, overflow: 'hidden', background: 'var(--s0)', border: '1px solid var(--b0)' }}>
        <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={15} color={scoreColor} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>ความพร้อมทริป</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor }}>{scoreLabel}</span>
        </div>

        {/* Progress bar */}
        <div style={{ padding: '0 16px 14px' }}>
          <div style={{ height: 6, borderRadius: 99, background: 'var(--s2)', overflow: 'hidden', marginBottom: 10 }}>
            <div style={{
              height: '100%',
              width: `${score}%`,
              borderRadius: 99,
              background: `linear-gradient(90deg, ${scoreColor}, ${score >= 80 ? '#34d399' : score >= 50 ? '#fbbf24' : '#818cf8'})`,
              transition: 'width 0.8s cubic-bezier(0.34,1.56,0.64,1)',
              boxShadow: `0 0 8px ${scoreColor}60`,
            }} />
          </div>

          {/* Checklist items */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
            <ScoreItem icon={<Plane size={12}/>}       label="การจอง"   done={stats.bookingCount > 0}   value={stats.bookingCount > 0 ? `${stats.bookingCount} รายการ` : 'ยังไม่มี'} />
            <ScoreItem icon={<Map size={12}/>}         label="แผนทริป"  done={stats.itineraryCount > 0} value={stats.itineraryCount > 0 ? `${stats.itineraryCount} สถานที่` : 'ยังไม่มี'} />
            <ScoreItem icon={<CheckSquare size={12}/>} label="เตรียมของ" done={stats.checklistTotal > 0 && stats.checklistDone === stats.checklistTotal} value={stats.checklistTotal > 0 ? `${stats.checklistDone}/${stats.checklistTotal}` : 'ยังไม่มี'} />
            <ScoreItem icon={<Users size={12}/>}       label="สมาชิก"   done={members.length >= 2}      value={`${members.length} คน`} />
          </div>
        </div>
      </div>

      {/* ── Smart Prompts ── */}
      {prompts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {prompts.map(p => (
            <SmartPromptCard key={p.id} prompt={p} tripId={trip.id} isHost={isHost} onInvite={() => {}} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function ScoreItem({ icon, label, done, value }: { icon: React.ReactNode; label: string; done: boolean; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 22, height: 22, borderRadius: 7, flexShrink: 0,
        background: done ? 'rgba(16,185,129,0.15)' : 'var(--s2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: done ? '#34d399' : 'var(--t3)',
      }}>{icon}</div>
      <div>
        <p style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1 }}>{label}</p>
        <p style={{ fontSize: 12, fontWeight: 600, color: done ? '#34d399' : 'var(--t2)', lineHeight: 1.3 }}>{value}</p>
      </div>
    </div>
  )
}

function SmartPromptCard({ prompt, tripId, isHost, onInvite }: {
  prompt: ReturnType<typeof getPrompts>[0]
  tripId: string
  isHost: boolean
  onInvite: () => void
}) {
  const isReady = prompt.id === 'ready' || prompt.id === 'active'

  const inner = (
    <div
      className="pressable"
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px',
        borderRadius: 16,
        background: prompt.urgent
          ? `linear-gradient(135deg, rgba(${hexToRgb(prompt.color)},0.12), rgba(${hexToRgb(prompt.color)},0.06))`
          : 'var(--s0)',
        border: `1px solid ${prompt.urgent ? `${prompt.color}30` : 'var(--b0)'}`,
        boxShadow: prompt.urgent ? `0 2px 16px ${prompt.color}20` : 'none',
        textDecoration: 'none',
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
        background: `${prompt.color}18`,
        border: `1px solid ${prompt.color}25`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20,
      }}>{prompt.icon}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', marginBottom: 2, lineHeight: 1.3 }}>{prompt.title}</p>
        <p style={{ fontSize: 11, color: 'var(--t2)', lineHeight: 1.4 }}>{prompt.sub}</p>
      </div>

      {!isReady && (
        <ChevronRight size={16} color="var(--t3)" style={{ flexShrink: 0 }} />
      )}
      {isReady && (
        <CheckCircle2 size={18} color={prompt.color} style={{ flexShrink: 0 }} />
      )}
    </div>
  )

  if (!prompt.href || isReady) return <div>{inner}</div>
  return <Link href={`/trips/${tripId}/${prompt.href}`} style={{ display: 'block', textDecoration: 'none' }}>{inner}</Link>
}

function ReadinessSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="shimmer" style={{ borderRadius: 20, height: 130 }} />
      <div className="shimmer" style={{ borderRadius: 16, height: 64 }} />
      <div className="shimmer" style={{ borderRadius: 16, height: 64 }} />
    </div>
  )
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1,3), 16)
  const g = parseInt(hex.slice(3,5), 16)
  const b = parseInt(hex.slice(5,7), 16)
  return `${r},${g},${b}`
}
