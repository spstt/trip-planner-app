'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Users, Lock } from 'lucide-react'
import type { ChecklistItem, Profile } from '@/types'
import { cn } from '@/lib/utils/cn'
import Image from 'next/image'

export default function ChecklistPage() {
  const { id: tripId } = useParams<{ id: string }>()
  const supabase = createClient()
  const [tab, setTab] = useState<'shared' | 'personal'>('shared')
  const [items, setItems] = useState<(ChecklistItem & { checker?: Profile })[]>([])
  const [newItem, setNewItem] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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
      .select('*, checker:profiles!checklist_items_checked_by_fkey(id, display_name, avatar_url)')
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
      sort_order: Date.now(),
    }).select().single()
    if (data) setItems(prev => [...prev, data as any])
    setNewItem('')
  }

  async function toggleItem(item: ChecklistItem) {
    const newChecked = !item.is_checked
    // Optimistic
    setItems(prev => prev.map(i =>
      i.id === item.id
        ? { ...i, is_checked: newChecked, checked_by: newChecked ? currentUserId! : null }
        : i
    ))
    await supabase.from('checklist_items').update({
      is_checked: newChecked,
      checked_by: newChecked ? currentUserId : null,
      checked_at: newChecked ? new Date().toISOString() : null,
    }).eq('id', item.id)
  }

  async function deleteItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    await supabase.from('checklist_items').delete().eq('id', id)
  }

  const checkedCount = items.filter(i => i.is_checked).length

  return (
    <div className="px-4 pt-4 space-y-4 pb-6">
      <div>
        <h2 className="text-xl font-bold text-white">รายการของต้องเตรียม</h2>
        <p className="text-slate-500 text-sm mt-0.5">
          {checkedCount}/{items.length} รายการ
        </p>
      </div>

      {/* Progress bar */}
      {items.length > 0 && (
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500"
            style={{ width: `${(checkedCount / items.length) * 100}%` }}
          />
        </div>
      )}

      {/* Tab */}
      <div className="flex bg-slate-900 rounded-2xl p-1">
        <button
          onClick={() => setTab('shared')}
          className={cn(
            'flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition-all',
            tab === 'shared' ? 'bg-indigo-600 text-white' : 'text-slate-500'
          )}
        >
          <Users size={14} /> ของกลุ่ม
        </button>
        <button
          onClick={() => setTab('personal')}
          className={cn(
            'flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition-all',
            tab === 'personal' ? 'bg-indigo-600 text-white' : 'text-slate-500'
          )}
        >
          <Lock size={14} /> ของฉัน (ส่วนตัว)
        </button>
      </div>

      {/* Add item */}
      <div className="flex gap-2">
        <input
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()}
          placeholder={tab === 'shared' ? 'เพิ่มของที่ต้องเตรียมกลุ่ม...' : 'เพิ่มของส่วนตัวของฉัน...'}
          className="flex-1 bg-slate-900 text-white rounded-xl px-4 py-3 text-sm placeholder-slate-600 border border-slate-800 focus:border-indigo-500 focus:outline-none"
        />
        <button
          onClick={addItem}
          disabled={!newItem.trim()}
          className="w-11 h-11 bg-indigo-600 rounded-xl flex items-center justify-center active:scale-90 transition-transform disabled:opacity-40"
        >
          <Plus size={18} className="text-white" />
        </button>
      </div>

      {/* Items */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="shimmer rounded-xl h-14" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-2">{tab === 'shared' ? '🧳' : '🔒'}</div>
          <p className="text-slate-500 text-sm">ยังไม่มีรายการ</p>
        </div>
      ) : (
        <div className="space-y-2 pb-4">
          {/* Unchecked first */}
          {[false, true].map(checked => (
            items.filter(i => i.is_checked === checked).map(item => (
              <div
                key={item.id}
                className={cn(
                  'glass rounded-2xl px-4 py-3.5 flex items-center gap-3 transition-all border border-white/5',
                  item.is_checked && 'opacity-60'
                )}
              >
                <button
                  onClick={() => toggleItem(item)}
                  className={cn(
                    'w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all',
                    item.is_checked
                      ? 'bg-green-500 border-green-400'
                      : 'border-slate-600'
                  )}
                >
                  {item.is_checked && <span className="text-white text-xs font-bold">✓</span>}
                </button>

                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-medium text-white',
                    item.is_checked && 'line-through text-slate-500'
                  )}>
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
                  className="text-slate-700 active:text-red-400 transition-colors shrink-0 text-xs"
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
