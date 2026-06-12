'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Users, Lock, ChevronDown, ChevronUp } from 'lucide-react'
import type { ChecklistItem, Profile } from '@/types'
import Image from 'next/image'
import confetti from 'canvas-confetti'

// Paw icon checkbox — outline when unchecked, pink fill when checked
function PawIcon({ checked }: { checked: boolean }) {
  return (
    <svg
      width="26" height="26" viewBox="0 0 26 26" fill="none"
      className={checked ? 'paw-checked' : ''}
    >
      {/* Main paw pad */}
      <ellipse cx="13" cy="15.5" rx="6.2" ry="5.5"
        fill={checked ? '#f9a8d4' : 'none'}
        stroke={checked ? '#f472b6' : 'var(--t2)'}
        strokeWidth="1.8"
      />
      {/* Top-left toe */}
      <ellipse cx="7.2" cy="9.5" rx="2.3" ry="2.8"
        fill={checked ? '#fbcfe8' : 'none'}
        stroke={checked ? '#f472b6' : 'var(--t2)'}
        strokeWidth="1.6"
      />
      {/* Top-center toe */}
      <ellipse cx="11.6" cy="7.5" rx="2.3" ry="2.8"
        fill={checked ? '#fbcfe8' : 'none'}
        stroke={checked ? '#f472b6' : 'var(--t2)'}
        strokeWidth="1.6"
      />
      {/* Top-right-center toe */}
      <ellipse cx="16" cy="7.8" rx="2.3" ry="2.8"
        fill={checked ? '#fbcfe8' : 'none'}
        stroke={checked ? '#f472b6' : 'var(--t2)'}
        strokeWidth="1.6"
      />
      {/* Top-right toe */}
      <ellipse cx="19.8" cy="9.8" rx="2.2" ry="2.6"
        fill={checked ? '#fbcfe8' : 'none'}
        stroke={checked ? '#f472b6' : 'var(--t2)'}
        strokeWidth="1.6"
      />
      {/* Inner glow dot when checked */}
      {checked && <ellipse cx="13" cy="16" rx="2.5" ry="2" fill="#f472b6" opacity="0.35" />}
    </svg>
  )
}

// Packing template categories
const TEMPLATES: { label: string; emoji: string; items: string[] }[] = [
  {
    label: 'เอกสาร', emoji: '📄',
    items: ['หนังสือเดินทาง', 'บัตรประชาชน', 'ตั๋วเครื่องบิน', 'ใบจองโรงแรม', 'ประกันการเดินทาง', 'ใบขับขี่สากล'],
  },
  {
    label: 'อุปกรณ์ไฟฟ้า', emoji: '🔌',
    items: ['โทรศัพท์ + สายชาร์จ', 'Power bank', 'หูฟัง', 'กล้องถ่ายรูป + แบตสำรอง', 'Adapter ปลั๊กไฟ', 'Laptop'],
  },
  {
    label: 'เสื้อผ้า', emoji: '👕',
    items: ['เสื้อยืด', 'กางเกงขายาว', 'กางเกงขาสั้น', 'ชุดชั้นใน', 'ถุงเท้า', 'รองเท้าแตะ', 'รองเท้าเดิน'],
  },
  {
    label: 'ของใช้ส่วนตัว', emoji: '🧴',
    items: ['ยาสีฟัน + แปรงสีฟัน', 'แชมพู + ครีมนวด', 'สบู่ / เจลอาบน้ำ', 'ยากันยุง', 'ครีมกันแดด SPF50+', 'ยาประจำตัว'],
  },
  {
    label: 'ท่องเที่ยว', emoji: '🗺️',
    items: ['ซิมการ์ดต่างประเทศ', 'เงินสดสกุลท้องถิ่น', 'กระเป๋าคาดเอว', 'ล็อคกระเป๋า', 'ขวดน้ำ reusable', 'ร่ม / เสื้อกันฝน'],
  },
]

export default function ChecklistPage() {
  const { id: tripId } = useParams<{ id: string }>()
  const supabase = createClient()
  const [tab, setTab] = useState<'shared' | 'personal'>('shared')
  const [items, setItems] = useState<(ChecklistItem & { checker?: Profile })[]>([])
  const [newItem, setNewItem] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showTemplates, setShowTemplates] = useState(false)
  const [insertingTemplate, setInsertingTemplate] = useState<string | null>(null)

  useEffect(() => {
    init()
  }, [tripId])

  useEffect(() => {
    loadItems()
  }, [tab, currentUserId])

  // Real-time sync
  useEffect(() => {
    const channel = supabase
      .channel(`checklist:${tripId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'checklist_items',
        filter: `trip_id=eq.${tripId}`,
      }, () => loadItems())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [tripId, tab])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUserId(user?.id ?? null)
  }

  async function loadItems() {
    if (!currentUserId) return
    const query = supabase
      .from('checklist_items')
      .select('*, checker:profiles!checked_by(id, display_name, avatar_url)')
      .eq('trip_id', tripId)
      .order('sort_order')

    if (tab === 'shared') {
      query.eq('is_shared', true)
    } else {
      query.eq('is_shared', false).eq('owner_id', currentUserId)
    }

    const { data } = await query
    setItems((data ?? []) as any)
    setLoading(false)
  }

  async function addItem() {
    if (!newItem.trim() || !currentUserId) return
    const { data } = await supabase.from('checklist_items').insert({
      trip_id: tripId,
      title: newItem.trim(),
      is_shared: tab === 'shared',
      owner_id: tab === 'personal' ? currentUserId : null,
      created_by: currentUserId,
      sort_order: Math.floor(Date.now() / 1000),
    }).select().single()
    if (data) setItems(prev => [...prev, data as any])
    setNewItem('')
  }

  async function toggleItem(item: ChecklistItem) {
    const newChecked = !item.is_checked
    setItems(prev => prev.map(i =>
      i.id === item.id
        ? { ...i, is_checked: newChecked, checked_by: newChecked ? currentUserId! : null }
        : i
    ))
    if (newChecked) {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 }, colors: ['#6366f1','#a855f7','#ec4899','#10b981'] })
    }
    await supabase.from('checklist_items').update({
      is_checked: newChecked,
      checked_by: newChecked ? currentUserId : null,
      checked_at: newChecked ? new Date().toISOString() : null,
    }).eq('id', item.id)
  }

  async function insertTemplate(tmpl: typeof TEMPLATES[0]) {
    if (!currentUserId) return
    setInsertingTemplate(tmpl.label)
    const base = Math.floor(Date.now() / 1000)
    const rows = tmpl.items.map((title, i) => ({
      trip_id: tripId,
      title,
      is_shared: tab === 'shared',
      owner_id: tab === 'personal' ? currentUserId : null,
      created_by: currentUserId,
      sort_order: base + i,
    }))
    await supabase.from('checklist_items').insert(rows)
    setInsertingTemplate(null)
    setShowTemplates(false)
    loadItems()
  }

  async function deleteItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    await supabase.from('checklist_items').delete().eq('id', id)
  }

  const checkedCount = items.filter(i => i.is_checked).length

  return (
    <div className="px-4 pt-4 space-y-4 pb-6">
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--t1)', margin: 0, letterSpacing: '-0.02em' }}>รายการของต้องเตรียม</h2>
        <p style={{ fontSize: 13, color: 'var(--t3)', marginTop: 2 }}>
          {checkedCount}/{items.length} รายการ
        </p>
      </div>

      {/* Progress bar */}
      {items.length > 0 && (
        <div style={{ height: 8, background: 'var(--s2)', borderRadius: 99, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, var(--indigo), var(--violet))',
              transition: 'width 0.5s ease',
              width: `${(checkedCount / items.length) * 100}%`,
            }}
          />
        </div>
      )}

      {/* Tab */}
      <div style={{ display: 'flex', background: 'var(--s1)', borderRadius: 20, padding: 4, border: '1px solid var(--b0)' }}>
        {(['shared', 'personal'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 16, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, transition: 'all 0.18s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: tab === t ? 'linear-gradient(135deg, var(--indigo), var(--violet))' : 'transparent',
              color: tab === t ? 'white' : 'var(--t2)',
              boxShadow: tab === t ? '0 2px 10px var(--indigo-glow)' : 'none',
            }}
          >
            {t === 'shared' ? <><Users size={14} /> ของกลุ่ม</> : <><Lock size={14} /> ของฉัน (ส่วนตัว)</>}
          </button>
        ))}
      </div>

      {/* Add item */}
      <div className="flex gap-2">
        <input
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()}
          placeholder={tab === 'shared' ? 'เพิ่มของที่ต้องเตรียมกลุ่ม...' : 'เพิ่มของส่วนตัวของฉัน...'}
          style={{
            flex: 1, background: 'var(--s1)', color: 'var(--t1)',
            borderRadius: 14, padding: '12px 16px', fontSize: 14,
            border: '1px solid var(--b1)', outline: 'none',
          }}
        />
        <button
          onClick={addItem}
          disabled={!newItem.trim()}
          style={{
            width: 44, height: 44, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--indigo), var(--violet))',
            borderRadius: 14, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: newItem.trim() ? 1 : 0.4, transition: 'opacity 0.15s',
          }}
        >
          <Plus size={18} style={{ color: 'white' }} />
        </button>
      </div>

      {/* Packing Templates */}
      <div>
        <button
          onClick={() => setShowTemplates(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-medium transition-all"
          style={{ background: 'var(--s0)', border: '1px solid var(--b0)', color: 'var(--t2)' }}
        >
          <span className="flex items-center gap-2">🧳 เทมเพลตจัดกระเป๋า</span>
          {showTemplates ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
        {showTemplates && (
          <div className="mt-2 grid grid-cols-1 gap-2">
            {TEMPLATES.map(tmpl => (
              <button
                key={tmpl.label}
                onClick={() => insertTemplate(tmpl)}
                disabled={insertingTemplate === tmpl.label}
                className="flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all active:scale-95 disabled:opacity-50 text-left"
                style={{ background: 'var(--s1)', border: '1px solid var(--b0)', color: 'var(--t1)' }}
              >
                <span className="flex items-center gap-2">
                  <span>{tmpl.emoji}</span>
                  <span className="font-medium">{tmpl.label}</span>
                  <span className="text-xs" style={{ color: 'var(--t3)' }}>{tmpl.items.length} รายการ</span>
                </span>
                <span className="text-xs font-semibold" style={{ color: '#818cf8' }}>
                  {insertingTemplate === tmpl.label ? 'กำลังเพิ่ม...' : '+ เพิ่ม'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Items */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="shimmer rounded-xl h-14" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-2">{tab === 'shared' ? '🧳' : '🔒'}</div>
          <p style={{ fontSize: 14, color: 'var(--t3)' }}>ยังไม่มีรายการ</p>
        </div>
      ) : (
        <div className="space-y-2 pb-4">
          {/* Unchecked first */}
          {[false, true].map(checked => (
            items.filter(i => i.is_checked === checked).map(item => (
              <div
                key={item.id}
                className="glass rounded-2xl flex items-center gap-3 transition-all"
                style={{ padding: '14px 16px', opacity: item.is_checked ? 0.6 : 1, border: '1px solid var(--b0)' }}
              >
                <button
                  onClick={() => toggleItem(item)}
                  className="shrink-0 active:scale-90 transition-transform"
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  <PawIcon checked={item.is_checked} />
                </button>

                <div className="flex-1 min-w-0">
                  <p style={{
                    fontSize: 14, fontWeight: 500, margin: 0,
                    color: item.is_checked ? 'var(--t3)' : 'var(--t1)',
                    textDecoration: item.is_checked ? 'line-through' : 'none',
                  }}>
                    {item.title}
                  </p>

                  {/* Shared: show who checked */}
                  {tab === 'shared' && item.is_checked && item.checker && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-4 h-4 rounded-full bg-green-600 overflow-hidden">
                        {item.checker.avatar_url ? (
                          <Image src={item.checker.avatar_url} alt="" width={16} height={16} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-white">
                            {item.checker.display_name?.[0]}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-green-400">
                        เตรียมโดย {item.checker.display_name}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => deleteItem(item.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', fontSize: 12, flexShrink: 0, padding: 4 }}
                >
                  ✕
                </button>
              </div>
            ))
          ))}
        </div>
      )}
    </div>
  )
}
