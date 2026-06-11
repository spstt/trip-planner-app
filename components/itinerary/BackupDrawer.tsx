'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronUp, Plus, MapPin, Bookmark } from 'lucide-react'
import type { ItineraryDay, ItineraryItem } from '@/types'
import { cn } from '@/lib/utils/cn'

interface Props {
  tripId: string
  days: ItineraryDay[]
}

export default function BackupDrawer({ tripId, days }: Props) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [backups, setBackups] = useState<ItineraryItem[]>([])
  const [newTitle, setNewTitle] = useState('')

  useEffect(() => {
    loadBackups()
  }, [tripId])

  async function loadBackups() {
    const { data } = await supabase
      .from('itinerary_items')
      .select('*')
      .eq('trip_id', tripId)
      .eq('is_backup', true)
      .order('created_at', { ascending: false })
    setBackups(data ?? [])
  }

  async function addBackup() {
    if (!newTitle.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('itinerary_items').insert({
      trip_id: tripId,
      day_id: days[0]?.id,
      title: newTitle.trim(),
      is_backup: true,
      created_by: user.id,
      sort_order: 0,
    }).select().single()
    if (data) setBackups(prev => [data as ItineraryItem, ...prev])
    setNewTitle('')
  }

  async function promoteToMain(item: ItineraryItem, dayId: string) {
    await supabase.from('itinerary_items').update({ is_backup: false, day_id: dayId }).eq('id', item.id)
    setBackups(prev => prev.filter(b => b.id !== item.id))
  }

  return (
    <div className={cn(
      'fixed bottom-[calc(var(--nav-height)+var(--safe-bottom))] left-0 right-0 z-30 transition-transform duration-300',
      open ? 'translate-y-0' : 'translate-y-[calc(100%-44px)]'
    )}>
      {/* Handle */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full bg-slate-800 border-t border-indigo-500/30 px-4 py-2.5 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Bookmark size={16} className="text-indigo-400" />
          <span className="text-sm font-medium text-slate-300">แผนสำรอง / Wishlist</span>
          {backups.length > 0 && (
            <span className="bg-indigo-600 text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">
              {backups.length}
            </span>
          )}
        </div>
        <ChevronUp size={16} className={cn('text-slate-500 transition-transform', open && 'rotate-180')} />
      </button>

      {/* Content */}
      <div className="bg-slate-900 border-t border-slate-800 px-4 py-3 max-h-64 overflow-y-auto hide-scrollbar space-y-3">
        {/* Add input */}
        <div className="flex gap-2">
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addBackup()}
            placeholder="เพิ่มสถานที่สำรอง..."
            className="flex-1 bg-slate-800 text-white text-sm rounded-xl px-3 py-2 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            onClick={addBackup}
            className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center"
          >
            <Plus size={16} className="text-white" />
          </button>
        </div>

        {backups.map(item => (
          <div key={item.id} className="flex items-center gap-3 glass rounded-xl px-3 py-2.5">
            <MapPin size={14} className="text-slate-500 shrink-0" />
            <span className="flex-1 text-sm text-slate-300 truncate">{item.title}</span>
            <select
              onChange={e => e.target.value && promoteToMain(item, e.target.value)}
              defaultValue=""
              className="text-xs bg-slate-800 text-indigo-400 rounded-lg px-2 py-1 focus:outline-none border border-slate-700"
            >
              <option value="" disabled>ย้ายไป...</option>
              {days.map(d => (
                <option key={d.id} value={d.id}>Day {d.day_number}</option>
              ))}
            </select>
          </div>
        ))}

        {backups.length === 0 && (
          <p className="text-xs text-slate-600 text-center py-2">ยังไม่มีสถานที่สำรอง</p>
        )}
      </div>
    </div>
  )
}
