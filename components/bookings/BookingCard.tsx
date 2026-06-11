'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Paperclip, Download, Eye, Plane, Hotel, Train, Car, Ticket, Package, ChevronDown, ChevronUp } from 'lucide-react'
import type { Booking, BookingAttachment } from '@/types'
import { format, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'
import { cacheAttachment, getCachedAttachment } from '@/lib/utils/offline'

const ICONS = { flight: Plane, hotel: Hotel, train: Train, rental: Car, activity: Ticket, other: Package }
const COLORS = { flight: 'text-blue-400', hotel: 'text-amber-400', train: 'text-green-400', rental: 'text-orange-400', activity: 'text-purple-400', other: 'text-slate-400' }

interface Props {
  booking: Booking & { attachments: BookingAttachment[] }
  tripId: string
  currentUserId: string | null
  onRefresh: () => void
}

export default function BookingCard({ booking, tripId, currentUserId, onRefresh }: Props) {
  const supabase = createClient()
  const [expanded, setExpanded] = useState(false)
  const [uploading, setUploading] = useState(false)
  const Icon = ICONS[booking.category] ?? Package

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !currentUserId) return
    setUploading(true)

    const ext = file.name.split('.').pop()
    const path = `${tripId}/${booking.id}/${Date.now()}.${ext}`

    const { error } = await supabase.storage
      .from('trip-files')
      .upload(path, file, { contentType: file.type })

    if (!error) {
      await supabase.from('booking_attachments').insert({
        booking_id: booking.id,
        trip_id: tripId,
        file_name: file.name,
        file_type: file.type,
        storage_path: path,
        file_size_bytes: file.size,
        uploaded_by: currentUserId,
      })

      // Cache the file in IndexedDB for offline access
      cacheAttachment(path, file, file.name).catch(() => {})
      onRefresh()
    }
    setUploading(false)
  }

  async function openAttachment(attachment: BookingAttachment) {
    // Try cache first (offline support)
    const cached = await getCachedAttachment(attachment.storage_path)
    if (cached) {
      const url = URL.createObjectURL(cached)
      window.open(url, '_blank')
      return
    }

    // Fetch signed URL from Supabase
    const { data } = await supabase.storage
      .from('trip-files')
      .createSignedUrl(attachment.storage_path, 3600)

    if (!data?.signedUrl) return

    // Download and cache for future offline use
    try {
      const res = await fetch(data.signedUrl)
      const blob = await res.blob()
      await cacheAttachment(attachment.storage_path, blob, attachment.file_name)
    } catch {}

    window.open(data.signedUrl, '_blank')
  }

  return (
    <div className="glass rounded-2xl border border-white/5 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-4 flex items-start gap-3 active:bg-white/5"
      >
        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
          <Icon size={18} className={COLORS[booking.category] ?? 'text-slate-400'} />
        </div>
        <div className="flex-1 text-left">
          <h4 className="font-semibold text-white text-sm">{booking.title}</h4>
          {booking.provider && (
            <p className="text-xs text-slate-400 mt-0.5">{booking.provider}</p>
          )}
          {booking.checkin_at && (
            <p className="text-xs text-slate-500 mt-1">
              {format(parseISO(booking.checkin_at), 'd MMM HH:mm', { locale: th })}
              {booking.checkout_at && ` → ${format(parseISO(booking.checkout_at), 'd MMM', { locale: th })}`}
            </p>
          )}
          {booking.booking_ref && (
            <p className="text-xs text-indigo-400 mt-0.5 font-mono">{booking.booking_ref}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {booking.attachments.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Paperclip size={12} />
              {booking.attachments.length}
            </span>
          )}
          {expanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5">
          {booking.notes && (
            <p className="text-xs text-slate-400 pt-2">{booking.notes}</p>
          )}

          {/* Attachments */}
          <div className="space-y-2">
            {booking.attachments.map(att => (
              <button
                key={att.id}
                onClick={() => openAttachment(att)}
                className="w-full flex items-center gap-3 bg-slate-900 rounded-xl px-3 py-2.5 active:scale-95 transition-transform"
              >
                <span className="text-xl">
                  {att.file_type.includes('pdf') ? '📄' : '🖼️'}
                </span>
                <span className="flex-1 text-sm text-slate-300 text-left truncate">{att.file_name}</span>
                <Eye size={14} className="text-indigo-400 shrink-0" />
              </button>
            ))}
          </div>

          {/* Upload button */}
          <label className="flex items-center justify-center gap-2 border border-dashed border-slate-600 rounded-xl py-3 cursor-pointer active:bg-slate-900/50 transition-colors">
            {uploading ? (
              <span className="text-sm text-slate-400">กำลังอัปโหลด...</span>
            ) : (
              <>
                <Paperclip size={16} className="text-slate-500" />
                <span className="text-sm text-slate-500">แนบตั๋วหรือรูป</span>
              </>
            )}
            <input
              type="file"
              className="hidden"
              accept="image/*,.pdf"
              onChange={uploadFile}
              disabled={uploading}
            />
          </label>
        </div>
      )}
    </div>
  )
}
