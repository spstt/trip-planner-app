'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MapPin, Plus, ExternalLink, Trash2, X, Loader2 } from 'lucide-react'
import type { EmergencyMeetup } from '@/types'
import { toast } from '@/components/ui/Toast'

interface Props {
  tripId: string
  isHost: boolean
  currentUserId: string | null
}

export default function EmergencyMeetupWidget({ tripId, isHost, currentUserId }: Props) {
  const supabase = createClient()
  const [meetups, setMeetups] = useState<EmergencyMeetup[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ title: '', lat: '', lng: '', description: '' })

  useEffect(() => { load() }, [tripId])

  async function load() {
    const { data } = await supabase
      .from('emergency_meetups')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at')
    setMeetups(data ?? [])
  }

  async function add() {
    if (!form.title.trim() || !form.lat || !form.lng || !currentUserId) return
    setLoading(true)
    const { error } = await supabase.from('emergency_meetups').insert({
      trip_id: tripId,
      title: form.title.trim(),
      lat: parseFloat(form.lat),
      lng: parseFloat(form.lng),
      description: form.description.trim() || null,
      set_by: currentUserId,
    })
    setLoading(false)
    if (error) { toast('เพิ่มไม่สำเร็จ', 'error'); return }
    setForm({ title: '', lat: '', lng: '', description: '' })
    setShowAdd(false)
    toast('เพิ่มจุดนัดพบแล้ว 📍')
    load()
  }

  async function remove(id: string) {
    await supabase.from('emergency_meetups').delete().eq('id', id)
    setMeetups(m => m.filter(x => x.id !== id))
    toast('ลบจุดนัดพบแล้ว')
  }

  // Get coords from current location
  function useMyLocation() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(pos => {
      setForm(f => ({
        ...f,
        lat: pos.coords.latitude.toFixed(6),
        lng: pos.coords.longitude.toFixed(6),
      }))
    })
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--s0)', border: '1px solid var(--b0)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--b0)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(239,68,68,0.15)' }}>
            <MapPin size={14} className="text-red-400" />
          </div>
          <span className="font-semibold text-sm" style={{ color: 'var(--t1)' }}>
            จุดนัดพบฉุกเฉิน
          </span>
        </div>
        {isHost && (
          <button
            onClick={() => setShowAdd(v => !v)}
            className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: showAdd ? 'rgba(239,68,68,0.15)' : 'var(--s2)', color: showAdd ? '#f87171' : 'var(--t2)' }}
          >
            {showAdd ? <X size={14} /> : <Plus size={14} />}
          </button>
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="px-4 py-3 space-y-2 border-b" style={{ borderColor: 'var(--b0)', background: 'rgba(239,68,68,0.04)' }}>
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="ชื่อจุดนัดพบ เช่น ประตูทางเข้าสวนสาธารณะ"
            className="input w-full text-sm"
          />
          <input
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="คำอธิบายเพิ่มเติม (ไม่บังคับ)"
            className="input w-full text-sm"
          />
          <div className="flex gap-2">
            <input
              value={form.lat}
              onChange={e => setForm(f => ({ ...f, lat: e.target.value }))}
              placeholder="Latitude"
              className="input flex-1 text-sm"
            />
            <input
              value={form.lng}
              onChange={e => setForm(f => ({ ...f, lng: e.target.value }))}
              placeholder="Longitude"
              className="input flex-1 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={useMyLocation}
              className="flex-1 py-2 rounded-xl text-xs font-medium transition-all active:scale-95"
              style={{ background: 'var(--s2)', color: 'var(--t2)', border: '1px solid var(--b0)' }}
            >
              📍 ใช้ตำแหน่งปัจจุบัน
            </button>
            <button
              onClick={add}
              disabled={loading || !form.title.trim() || !form.lat || !form.lng}
              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 flex items-center justify-center gap-1 disabled:opacity-50"
              style={{ background: '#ef4444', color: 'white' }}
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : '+ เพิ่มจุดนัดพบ'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="divide-y" style={{ borderColor: 'var(--b0)' }}>
        {meetups.length === 0 ? (
          <div className="px-4 py-5 text-center">
            <p className="text-2xl mb-1">🗺️</p>
            <p className="text-xs" style={{ color: 'var(--t3)' }}>
              {isHost ? 'กด + เพื่อเพิ่มจุดนัดพบฉุกเฉิน' : 'ยังไม่มีจุดนัดพบฉุกเฉิน'}
            </p>
          </div>
        ) : (
          meetups.map(m => (
            <div key={m.id} className="px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(239,68,68,0.1)' }}>
                <MapPin size={16} className="text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--t1)' }}>{m.title}</p>
                {m.description && (
                  <p className="text-xs truncate mt-0.5" style={{ color: 'var(--t3)' }}>{m.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={`https://www.google.com/maps?q=${m.lat},${m.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
                  style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}
                >
                  <ExternalLink size={13} />
                </a>
                {isHost && (
                  <button
                    onClick={() => remove(m.id)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
