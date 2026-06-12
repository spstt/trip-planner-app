'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, StickyNote } from 'lucide-react'
import Image from 'next/image'

interface Memo {
  id: string
  trip_id: string
  user_id: string
  body: string
  color: string
  rotation: number
  created_at: string
  author?: { display_name: string; avatar_url: string | null }
}

interface Props {
  tripId: string
  currentUserId: string | null
}

// Korean-cafe pastel post-it palette
const MEMO_COLORS = [
  '#fef9c3', // soft yellow
  '#fce7f3', // blush pink
  '#dbeafe', // sky blue
  '#d1fae5', // mint
  '#ede9fe', // lavender
  '#ffedd5', // peach
  '#fef2f2', // rose white
  '#ecfdf5', // seafoam
]

function randFrom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function randRot() { return (Math.random() - 0.5) * 9 } // -4.5° to +4.5°

export default function StickyMemoBoard({ tripId, currentUserId }: Props) {
  const supabase = createClient()
  const [memos, setMemos] = useState<Memo[]>([])
  const [showInput, setShowInput] = useState(false)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { load() }, [tripId])

  // Realtime
  useEffect(() => {
    const ch = supabase.channel(`memos:${tripId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'trip_memos',
        filter: `trip_id=eq.${tripId}`,
      }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [tripId])

  useEffect(() => {
    if (showInput) setTimeout(() => inputRef.current?.focus(), 80)
  }, [showInput])

  async function load() {
    const { data } = await supabase
      .from('trip_memos')
      .select('*, author:profiles!user_id(display_name, avatar_url)')
      .eq('trip_id', tripId)
      .order('created_at')
    setMemos((data ?? []) as Memo[])
  }

  async function save() {
    if (!text.trim() || !currentUserId) return
    setSaving(true)
    await supabase.from('trip_memos').insert({
      trip_id: tripId,
      user_id: currentUserId,
      body: text.trim(),
      color: randFrom(MEMO_COLORS),
      rotation: +randRot().toFixed(2),
    })
    setSaving(false)
    setText('')
    setShowInput(false)
  }

  async function remove(id: string) {
    await supabase.from('trip_memos').delete().eq('id', id)
    setMemos(m => m.filter(x => x.id !== id))
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--s0)', border: '1px solid var(--b0)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--b0)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-base"
            style={{ background: 'rgba(250,204,21,0.2)' }}>
            📝
          </div>
          <span className="font-bold text-sm" style={{ color: 'var(--t1)' }}>Sticky Memo</span>
          {memos.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: 'rgba(250,204,21,0.15)', color: '#a16207' }}>
              {memos.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowInput(v => !v)}
          className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{
            background: showInput ? 'rgba(250,204,21,0.2)' : 'var(--s2)',
            color: showInput ? '#a16207' : 'var(--t2)',
          }}
        >
          {showInput ? <X size={14} /> : <Plus size={14} />}
        </button>
      </div>

      {/* Input form */}
      {showInput && (
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--b0)', background: 'rgba(250,204,21,0.04)' }}>
          {/* Preview sticky note */}
          <div className="relative mb-2" style={{
            background: '#fef9c3',
            borderRadius: '4px 14px 14px 14px',
            padding: '10px 12px 12px',
            boxShadow: '3px 4px 14px rgba(0,0,0,0.10), inset 0 -2px 0 rgba(0,0,0,0.04)',
          }}>
            {/* Tape strip at top */}
            <div style={{
              position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
              width: 36, height: 16, borderRadius: 4,
              background: 'rgba(255,255,255,0.7)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.10)',
            }} />
            <textarea
              ref={inputRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save() } }}
              placeholder="เขียนอะไรสักอย่าง... 🌸"
              maxLength={120}
              rows={3}
              className="w-full resize-none outline-none text-sm leading-relaxed"
              style={{
                background: 'transparent',
                color: '#3d2b1f',
                fontFamily: '"Noto Sans Thai", "Sarabun", sans-serif',
                fontSize: 14,
                lineHeight: 1.6,
              }}
            />
            <p className="text-right text-xs mt-0.5" style={{ color: 'rgba(61,43,31,0.35)' }}>
              {text.length}/120
            </p>
          </div>
          <button
            onClick={save}
            disabled={saving || !text.trim()}
            className="w-full py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-40"
            style={{ background: '#fbbf24', color: '#1c1917',
              boxShadow: saving || !text.trim() ? 'none' : '0 3px 12px rgba(251,191,36,0.4)' }}
          >
            {saving ? '⏳ กำลังแปะ...' : '📌 แปะโน้ต'}
          </button>
        </div>
      )}

      {/* Board */}
      <div
        className="px-4 py-4"
        style={{ minHeight: memos.length === 0 ? 100 : 'auto' }}
      >
        {memos.length === 0 ? (
          <div className="flex flex-col items-center py-5 gap-1">
            <span className="text-3xl opacity-30">🗒️</span>
            <p className="text-xs" style={{ color: 'var(--t3)' }}>ยังไม่มีโน้ต กด + แปะข้อความแรก</p>
          </div>
        ) : (
          /* Masonry-like wrap with overlap offsets */
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'flex-start' }}>
            {memos.map((memo, i) => (
              <MemoNote
                key={memo.id}
                memo={memo}
                canDelete={memo.user_id === currentUserId}
                onDelete={() => remove(memo.id)}
                delay={i * 60}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MemoNote({ memo, canDelete, onDelete, delay }: {
  memo: Memo
  canDelete: boolean
  onDelete: () => void
  delay: number
}) {
  // Consistent width variation based on content length
  const wide = memo.body.length > 50

  return (
    <div
      className="memo-stick relative shrink-0 group"
      style={{
        '--rot': `rotate(${memo.rotation}deg)`,
        transform: `rotate(${memo.rotation}deg)`,
        width: wide ? 158 : 134,
        animationDelay: `${delay}ms`,
      } as React.CSSProperties}
    >
      {/* Tape strip */}
      <div style={{
        position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)',
        width: 34, height: 18, borderRadius: 4, zIndex: 2,
        background: 'rgba(255,255,255,0.65)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      }} />

      {/* Note body */}
      <div style={{
        background: memo.color,
        borderRadius: '3px 12px 12px 12px',
        padding: '14px 10px 10px',
        boxShadow: `3px 5px 18px rgba(0,0,0,0.12), 0 1px 0 rgba(255,255,255,0.7) inset`,
        minHeight: 90,
        position: 'relative',
      }}>
        {/* Delete button — shows on hover */}
        {canDelete && (
          <button
            onClick={onDelete}
            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center
              opacity-0 group-hover:opacity-100 active:scale-90 transition-all"
            style={{ background: 'rgba(0,0,0,0.12)', color: 'rgba(0,0,0,0.45)' }}
          >
            <X size={10} />
          </button>
        )}

        {/* Body text */}
        <p style={{
          fontSize: 12.5,
          lineHeight: 1.55,
          color: '#2d1f10',
          fontFamily: '"Noto Sans Thai", "Sarabun", sans-serif',
          wordBreak: 'break-word',
          margin: 0,
        }}>
          {memo.body}
        </p>

        {/* Author */}
        <div className="flex items-center gap-1 mt-2.5">
          <div className="w-4 h-4 rounded-full overflow-hidden shrink-0"
            style={{ background: 'rgba(0,0,0,0.12)' }}>
            {memo.author?.avatar_url ? (
              <Image src={memo.author.avatar_url} alt="" width={16} height={16}
                className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[8px] font-bold"
                style={{ color: 'rgba(0,0,0,0.45)' }}>
                {memo.author?.display_name?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
          </div>
          <p style={{ fontSize: 9, color: 'rgba(0,0,0,0.35)', fontWeight: 600 }}>
            {memo.author?.display_name ?? ''}
          </p>
        </div>
      </div>
    </div>
  )
}
