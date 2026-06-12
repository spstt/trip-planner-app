'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Paperclip, Eye, Plane, Hotel, Train, Car, Ticket, Package, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import type { Booking, BookingAttachment } from '@/types'
import { format, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'
import { cacheAttachment, getCachedAttachment } from '@/lib/utils/offline'
import AttachmentPreviewModal from './AttachmentPreviewModal'

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
  const [preview, setPreview] = useState<{ att: BookingAttachment; url: string } | null>(null)
  const [loadingPreview, setLoadingPreview] = useState<string | null>(null)
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
    setLoadingPreview(attachment.id)

    // Try cache first (offline support)
    const cached = await getCachedAttachment(attachment.storage_path)
    if (cached) {
      const url = URL.createObjectURL(cached)
      setLoadingPreview(null)
      setPreview({ att: attachment, url })
      return
    }

    // Fetch signed URL from Supabase
    const { data } = await supabase.storage
      .from('trip-files')
      .createSignedUrl(attachment.storage_path, 3600)

    setLoadingPreview(null)
    if (!data?.signedUrl) return

    // Background cache
    fetch(data.signedUrl)
      .then(r => r.blob())
      .then(blob => cacheAttachment(attachment.storage_path, blob, attachment.file_name))
      .catch(() => {})

    setPreview({ att: attachment, url: data.signedUrl })
  }

  // Category color map for ticket accent
  const CAT_ACCENT: Record<string, { light: string; mid: string; dark: string }> = {
    flight:       { light: '#dbeafe', mid: '#3b82f6', dark: '#1e40af' },
    hotel:        { light: '#fef3c7', mid: '#f59e0b', dark: '#92400e' },
    train:        { light: '#d1fae5', mid: '#10b981', dark: '#065f46' },
    rental:       { light: '#ffedd5', mid: '#f97316', dark: '#9a3412' },
    activity:     { light: '#ede9fe', mid: '#8b5cf6', dark: '#4c1d95' },
    other:        { light: 'var(--s2)', mid: 'var(--t3)', dark: 'var(--t2)' },
  }
  const accent = CAT_ACCENT[booking.category] ?? CAT_ACCENT.other

  return (
    <>
    {/* ── Vintage Ticket Card ── */}
    <div style={{ position: 'relative', marginBottom: 4 }}>

      {/* Serrated top edge */}
      <div style={{
        position: 'absolute', top: -8, left: 0, right: 0, height: 9, zIndex: 1,
        backgroundImage: `radial-gradient(circle at 6px 0px, var(--bg) 5.5px, ${accent.light} 6px)`,
        backgroundSize: '12px 9px',
        backgroundRepeat: 'repeat-x',
      }} />

      {/* Main ticket body */}
      <div style={{
        background: accent.light,
        borderRadius: 4,
        overflow: 'hidden',
        boxShadow: `0 4px 20px rgba(0,0,0,0.10), 0 1px 0 rgba(255,255,255,0.5) inset`,
        border: `1px solid ${accent.mid}22`,
        fontFamily: '"Noto Sans Thai Looped", "Noto Sans Thai", "Sarabun", "SF Pro Rounded", system-ui, sans-serif',
      }}>

        {/* Ticket header strip */}
        <div style={{
          background: `linear-gradient(135deg, ${accent.mid}, ${accent.dark})`,
          padding: '8px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8,
              background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={15} style={{ color: 'white' }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 800, color: 'white',
                letterSpacing: '-0.01em', margin: 0, lineHeight: 1.2 }}>
                {booking.title}
              </p>
              {booking.provider && (
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', margin: '1px 0 0' }}>
                  {booking.provider}
                </p>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {booking.attachments.length > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3,
                fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                <Paperclip size={11} /> {booking.attachments.length}
              </span>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8,
                width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'white' }}
            >
              {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          </div>
        </div>

        {/* Perforation divider */}
        <div style={{
          height: 1,
          backgroundImage: `repeating-linear-gradient(90deg, ${accent.mid}55 0px, ${accent.mid}55 6px, transparent 6px, transparent 12px)`,
          margin: '0 14px',
        }} />

        {/* Ticket body content */}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer',
            padding: '10px 14px 12px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}
        >
          <div style={{ textAlign: 'left' }}>
            {booking.checkin_at && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: accent.dark, opacity: 0.55,
                  textTransform: 'uppercase', letterSpacing: '0.07em' }}>DATE</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: accent.dark }}>
                  {format(parseISO(booking.checkin_at), 'd MMM yyyy, HH:mm', { locale: th })}
                  {booking.checkout_at && (
                    <span style={{ fontWeight: 500, opacity: 0.7 }}>
                      {' → '}{format(parseISO(booking.checkout_at), 'd MMM', { locale: th })}
                    </span>
                  )}
                </span>
              </div>
            )}
            {booking.location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: accent.dark, opacity: 0.55,
                  textTransform: 'uppercase', letterSpacing: '0.07em' }}>WHERE</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: accent.dark, opacity: 0.8 }}>
                  {booking.location}
                </span>
              </div>
            )}
          </div>

          {/* Booking ref barcode-style */}
          {booking.booking_ref && (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontSize: 8, fontWeight: 700, color: accent.dark, opacity: 0.45,
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>REF</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1, marginBottom: 2 }}>
                {booking.booking_ref.split('').slice(0,8).map((_, i) => (
                  <div key={i} style={{
                    width: 2, background: accent.dark, opacity: 0.5,
                    height: [6,10,7,12,8,6,11,9][i % 8],
                    borderRadius: 1,
                  }} />
                ))}
              </div>
              <p style={{ fontSize: 9, fontWeight: 800, color: accent.dark, letterSpacing: '0.05em',
                fontFamily: 'monospace' }}>
                {booking.booking_ref}
              </p>
            </div>
          )}
        </button>
      </div>

      {/* Serrated bottom edge */}
      <div style={{
        position: 'absolute', bottom: -8, left: 0, right: 0, height: 9, zIndex: 1,
        backgroundImage: `radial-gradient(circle at 6px 9px, var(--bg) 5.5px, ${accent.light} 6px)`,
        backgroundSize: '12px 9px',
        backgroundRepeat: 'repeat-x',
      }} />
    </div>

    {/* Expanded detail panel (below the ticket, separated) */}
    {expanded && (
      <div style={{ marginTop: 10, borderRadius: 16, overflow: 'hidden',
        background: 'var(--s0)', border: '1px solid var(--b0)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div className="px-4 py-3 space-y-3">
          {booking.notes && (
            <p className="text-xs pt-1" style={{ color: 'var(--t2)', lineHeight: 1.6 }}>{booking.notes}</p>
          )}

          {/* Attachments */}
          <div className="space-y-2">
            {booking.attachments.map(att => {
              const isLoading = loadingPreview === att.id
              const isImg = att.file_type.startsWith('image/')
              const isPdf = att.file_type === 'application/pdf'
              return (
                <button
                  key={att.id}
                  onClick={() => openAttachment(att)}
                  disabled={isLoading}
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 active:scale-95 transition-all"
                  style={{ background: 'var(--s2)', border: '1px solid var(--b0)' }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: isImg ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.12)' }}>
                    <span className="text-base">{isPdf ? '📄' : '🖼️'}</span>
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--t1)' }}>{att.file_name}</p>
                    {att.file_size_bytes && (
                      <p className="text-[10px]" style={{ color: 'var(--t3)' }}>
                        {(att.file_size_bytes / 1024).toFixed(0)} KB
                      </p>
                    )}
                  </div>
                  {isLoading
                    ? <Loader2 size={14} className="animate-spin shrink-0" style={{ color: 'var(--t3)' }} />
                    : <Eye size={14} className="text-indigo-400 shrink-0" />
                  }
                </button>
              )
            })}
          </div>

          {/* Upload button */}
          <label className="flex items-center justify-center gap-2 border border-dashed rounded-xl py-3 cursor-pointer transition-colors"
            style={{ borderColor: 'var(--b1)' }}>
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
      </div>
    )}

    {/* Attachment preview modal */}
    {preview && (
      <AttachmentPreviewModal
        attachment={preview.att}
        signedUrl={preview.url}
        onClose={() => setPreview(null)}
      />
    )}
    </>
  )
}
