'use client'
import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Loader2, Upload, Lock, Users, FileText, ImageIcon, Trash2 } from 'lucide-react'

// ─── Category definitions ───────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'flight',   emoji: '✈️', label: 'เที่ยวบิน' },
  { id: 'hotel',    emoji: '🏨', label: 'โรงแรม'   },
  { id: 'train',    emoji: '🚆', label: 'รถ/ราง'   },
  { id: 'rental',   emoji: '🚗', label: 'เช่ารถ'   },
  { id: 'activity', emoji: '🎡', label: 'บัตร'     },
  { id: 'other',    emoji: '📌', label: 'อื่นๆ'    },
] as const

type Category = typeof CATEGORIES[number]['id']

// ─── Uploaded file state ────────────────────────────────────────────────────
interface UploadedFile {
  id: string
  file: File
  path: string
  previewUrl: string
  uploading: boolean
  error?: string
}

// ─── Props ───────────────────────────────────────────────────────────────────
interface Props {
  tripId: string
  currentUserId: string
  onClose: () => void
  onAdded: () => void
}

// ─── Field component — theme-aware ──────────────────────────────────────────
function Field({
  label, placeholder, value, onChange, type = 'text', required,
}: {
  label: string; placeholder?: string; value: string
  onChange: (v: string) => void; type?: string; required?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t3)' }}>
        {label}{required && <span style={{ color: '#f43f5e', marginLeft: 2 }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', background: 'var(--s1)', color: 'var(--t1)',
          borderRadius: 14, padding: '12px 14px', fontSize: 14,
          border: '1.5px solid var(--b1)', outline: 'none', boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

// ─── Two-column row helper ────────────────────────────────────────────────────
function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{children}</div>
}

// ─── Main modal ──────────────────────────────────────────────────────────────
export default function AddBookingModal({ tripId, currentUserId, onClose, onAdded }: Props) {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [saving, setSaving] = useState(false)
  const [isPrivate, setIsPrivate] = useState(false)
  const [uploads, setUploads] = useState<UploadedFile[]>([])
  const [form, setForm] = useState({
    category: 'flight' as Category,
    // common
    title: '', booking_ref: '', provider: '', notes: '',
    checkin_at: '', checkout_at: '', location: '',
    // flight-specific (stored in metadata)
    flight_no: '', from_airport: '', to_airport: '',
    // hotel-specific
    hotel_address: '',
  })

  function set(k: keyof typeof form, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  // ── File upload ─────────────────────────────────────────────────────────────
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    if (!selected.length) return
    // Reset input so same file can be re-selected
    e.target.value = ''

    for (const file of selected) {
      const uid = `${Date.now()}_${Math.random().toString(36).slice(2)}`
      const path = `bookings/${tripId}/${uid}_${file.name.replace(/\s+/g, '_')}`
      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : ''

      setUploads(prev => [...prev, { id: uid, file, path, previewUrl, uploading: true }])

      const { error } = await supabase.storage.from('trip-files').upload(path, file, { upsert: false })

      setUploads(prev => prev.map(u =>
        u.id === uid ? { ...u, uploading: false, error: error?.message } : u
      ))
    }
  }

  function removeUpload(uid: string) {
    const u = uploads.find(x => x.id === uid)
    if (u) {
      supabase.storage.from('trip-files').remove([u.path]).catch(() => {})
      if (u.previewUrl) URL.revokeObjectURL(u.previewUrl)
    }
    setUploads(prev => prev.filter(x => x.id !== uid))
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!form.title.trim()) return
    setSaving(true)

    // Build metadata JSONB based on category
    const metadata: Record<string, string> = {}
    if (form.category === 'flight') {
      if (form.flight_no)    metadata.flight_no    = form.flight_no
      if (form.from_airport) metadata.from_airport = form.from_airport
      if (form.to_airport)   metadata.to_airport   = form.to_airport
    }
    if (form.category === 'hotel' && form.hotel_address) {
      metadata.hotel_address = form.hotel_address
    }

    const locationValue =
      form.category === 'flight'
        ? [form.from_airport, form.to_airport].filter(Boolean).join(' → ') || null
        : form.location || null

    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        trip_id:     tripId,
        category:    form.category,
        title:       form.title.trim(),
        booking_ref: form.booking_ref  || null,
        provider:    form.provider     || null,
        checkin_at:  form.checkin_at   || null,
        checkout_at: form.checkout_at  || null,
        location:    locationValue,
        notes:       form.notes        || null,
        is_private:  isPrivate,
        metadata:    Object.keys(metadata).length ? metadata : null,
        created_by:  currentUserId,
      })
      .select('id')
      .single()

    if (booking && !error) {
      // Save attachment records for successful uploads
      const doneUploads = uploads.filter(u => !u.uploading && !u.error)
      if (doneUploads.length) {
        await supabase.from('booking_attachments').insert(
          doneUploads.map(u => ({
            booking_id:      booking.id,
            trip_id:         tripId,
            file_name:       u.file.name,
            file_type:       u.file.type,
            storage_path:    u.path,
            file_size_bytes: u.file.size,
            uploaded_by:     currentUserId,
          }))
        )
      }
    }

    setSaving(false)
    onAdded()
  }

  const cat = form.category

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end' }}>
      {/* Backdrop */}
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="spring-enter"
        style={{
          position: 'relative', width: '100%',
          background: 'var(--bg)',
          borderRadius: '28px 28px 0 0',
          maxHeight: '92dvh', overflowY: 'auto',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.22)',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 14, paddingBottom: 4 }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--b1)' }} />
        </div>

        <div style={{ padding: '4px 20px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--t1)', margin: 0, letterSpacing: '-0.02em' }}>
                เพิ่มการจอง
              </h2>
              <p style={{ fontSize: 12, color: 'var(--t3)', margin: '2px 0 0' }}>
                บันทึกตั๋ว ที่พัก และการจองต่างๆ
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 36, height: 36, borderRadius: 12,
                background: 'var(--s2)', border: '1px solid var(--b0)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}
            >
              <X size={16} style={{ color: 'var(--t2)' }} />
            </button>
          </div>

          {/* Category tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {CATEGORIES.map(c => {
              const active = cat === c.id
              return (
                <button
                  key={c.id}
                  onClick={() => set('category', c.id)}
                  style={{
                    padding: '10px 6px', borderRadius: 16, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 700, transition: 'all 0.15s ease',
                    background: active ? 'linear-gradient(135deg, var(--indigo), var(--violet))' : 'var(--s1)',
                    color: active ? 'white' : 'var(--t2)',
                    boxShadow: active ? '0 3px 14px var(--indigo-glow)' : 'none',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  }}
                >
                  <span style={{ fontSize: 20 }}>{c.emoji}</span>
                  {c.label}
                </button>
              )
            })}
          </div>

          {/* ── FLIGHT fields ── */}
          {cat === 'flight' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Row>
                <Field label="ชื่อสายการบิน / เที่ยวบิน" placeholder="เช่น Thai Airways TG608" value={form.title} onChange={v => set('title', v)} required />
                <Field label="หมายเลขเที่ยวบิน" placeholder="TG608" value={form.flight_no} onChange={v => set('flight_no', v)} />
              </Row>
              <Row>
                <Field label="สนามบินต้นทาง" placeholder="BKK / Suvarnabhumi" value={form.from_airport} onChange={v => set('from_airport', v)} />
                <Field label="สนามบินปลายทาง" placeholder="NRT / Narita" value={form.to_airport} onChange={v => set('to_airport', v)} />
              </Row>
              <Row>
                <Field label="🛫 เวลาออกเดินทาง" type="datetime-local" value={form.checkin_at} onChange={v => set('checkin_at', v)} />
                <Field label="🛬 เวลาถึง" type="datetime-local" value={form.checkout_at} onChange={v => set('checkout_at', v)} />
              </Row>
              <Row>
                <Field label="หมายเลขบุ๊คกิ้ง" placeholder="ABC123" value={form.booking_ref} onChange={v => set('booking_ref', v)} />
                <Field label="ผู้ให้บริการ / OTA" placeholder="Thai Airways" value={form.provider} onChange={v => set('provider', v)} />
              </Row>
            </div>
          )}

          {/* ── HOTEL fields ── */}
          {cat === 'hotel' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="ชื่อที่พัก" placeholder="เช่น Mercure Bangkok Siam" value={form.title} onChange={v => set('title', v)} required />
              <Field label="ที่อยู่ / สถานที่" placeholder="927 Rama 1 Rd, Bangkok" value={form.hotel_address} onChange={v => set('hotel_address', v)} />
              <Row>
                <Field label="📅 Check-in" type="datetime-local" value={form.checkin_at} onChange={v => set('checkin_at', v)} />
                <Field label="📅 Check-out" type="datetime-local" value={form.checkout_at} onChange={v => set('checkout_at', v)} />
              </Row>
              <Row>
                <Field label="หมายเลขการจอง" placeholder="HTL-XXXXXX" value={form.booking_ref} onChange={v => set('booking_ref', v)} />
                <Field label="แพลตฟอร์มจอง" placeholder="Agoda / Booking.com" value={form.provider} onChange={v => set('provider', v)} />
              </Row>
            </div>
          )}

          {/* ── TRAIN / RENTAL / ACTIVITY / OTHER fields ── */}
          {(cat === 'train' || cat === 'rental' || cat === 'activity' || cat === 'other') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field
                label={
                  cat === 'train'    ? 'ชื่อขบวน / เส้นทาง' :
                  cat === 'rental'   ? 'บริษัทเช่ารถ / รุ่นรถ' :
                  cat === 'activity' ? 'ชื่อกิจกรรม / บัตร'  :
                                      'ชื่อรายการ'
                }
                placeholder={
                  cat === 'train'    ? 'เช่น Shinkansen N700 Tokyo→Osaka' :
                  cat === 'rental'   ? 'เช่น Toyota Vios – Budget Car Rental' :
                  cat === 'activity' ? 'เช่น Universal Studios Japan' :
                                      'ระบุรายการ...'
                }
                value={form.title}
                onChange={v => set('title', v)}
                required
              />
              <Row>
                <Field
                  label={cat === 'train' ? '🕐 เวลาออก' : cat === 'rental' ? '🗓 วันรับรถ' : '📅 วันเริ่มต้น'}
                  type="datetime-local" value={form.checkin_at} onChange={v => set('checkin_at', v)}
                />
                <Field
                  label={cat === 'train' ? '🕐 เวลาถึง' : cat === 'rental' ? '🗓 วันคืนรถ' : '📅 วันสิ้นสุด'}
                  type="datetime-local" value={form.checkout_at} onChange={v => set('checkout_at', v)}
                />
              </Row>
              <Row>
                <Field label="หมายเลขการจอง" placeholder="REF-XXXXXX" value={form.booking_ref} onChange={v => set('booking_ref', v)} />
                <Field label="ผู้ให้บริการ" placeholder="ชื่อบริษัท" value={form.provider} onChange={v => set('provider', v)} />
              </Row>
              <Field label="สถานที่ / ที่อยู่" placeholder="ระบุสถานที่..." value={form.location} onChange={v => set('location', v)} />
            </div>
          )}

          {/* Notes — shared across all categories */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t3)' }}>หมายเหตุ</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="ข้อมูลเพิ่มเติม เช่น น้ำหนักกระเป๋า, gate, ชั้นที่พัก..."
              rows={2}
              style={{
                width: '100%', background: 'var(--s1)', color: 'var(--t1)',
                borderRadius: 14, padding: '12px 14px', fontSize: 14, resize: 'none',
                border: '1.5px solid var(--b1)', outline: 'none', boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* ── File upload area ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t3)' }}>
                📎 แนบเอกสาร (ตั๋ว, QR, PDF)
              </label>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: 'var(--s2)', color: 'var(--t2)', fontSize: 12, fontWeight: 600,
                }}
              >
                <Upload size={13} /> เลือกไฟล์
              </button>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />

            {/* Upload drop zone — shown when empty */}
            {uploads.length === 0 && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                style={{
                  width: '100%', padding: '20px 0', borderRadius: 16, cursor: 'pointer',
                  background: 'var(--s1)',
                  border: '2px dashed var(--b1)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  boxSizing: 'border-box',
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 14,
                  background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.20)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Upload size={20} style={{ color: 'var(--indigo)' }} />
                </div>
                <p style={{ fontSize: 13, color: 'var(--t3)', margin: 0 }}>
                  แตะเพื่ออัปโหลดไฟล์ตั๋ว, รูป QR หรือ PDF
                </p>
                <p style={{ fontSize: 11, color: 'var(--t3)', opacity: 0.6, margin: 0 }}>
                  รองรับ JPG, PNG, PDF — ขนาดสูงสุด 10MB
                </p>
              </button>
            )}

            {/* File preview list */}
            {uploads.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {uploads.map(u => (
                  <div key={u.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 14,
                    background: 'var(--s1)', border: '1px solid var(--b0)',
                  }}>
                    {/* Thumbnail or icon */}
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0, overflow: 'hidden',
                      background: 'var(--s2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {u.previewUrl
                        ? <img src={u.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <FileText size={18} style={{ color: 'var(--t3)' }} />
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.file.name}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--t3)', margin: '2px 0 0' }}>
                        {u.uploading
                          ? '⏳ กำลังอัปโหลด...'
                          : u.error
                            ? `❌ ${u.error}`
                            : `✅ อัปโหลดแล้ว · ${(u.file.size / 1024).toFixed(0)} KB`
                        }
                      </p>
                    </div>
                    <button
                      onClick={() => removeUpload(u.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--t3)' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}

                {/* Add more */}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  style={{
                    padding: '9px 0', borderRadius: 12, border: '1.5px dashed var(--b1)',
                    background: 'transparent', color: 'var(--t3)', fontSize: 12,
                    fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: 6,
                  }}
                >
                  <Upload size={13} /> เพิ่มไฟล์อีก
                </button>
              </div>
            )}
          </div>

          {/* ── Privacy toggle ── */}
          <button
            type="button"
            onClick={() => setIsPrivate(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px', borderRadius: 18,
              background: isPrivate ? 'rgba(99,102,241,0.08)' : 'var(--s1)',
              border: `1.5px solid ${isPrivate ? 'rgba(99,102,241,0.28)' : 'var(--b0)'}`,
              cursor: 'pointer', transition: 'all 0.18s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 12, flexShrink: 0,
                background: isPrivate ? 'rgba(99,102,241,0.15)' : 'var(--s2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {isPrivate
                  ? <Lock size={16} style={{ color: 'var(--indigo)' }} />
                  : <Users size={16} style={{ color: 'var(--t2)' }} />
                }
              </div>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', margin: 0 }}>
                  {isPrivate ? '🔒 เอกสารส่วนตัว' : '👥 เอกสารส่วนรวม'}
                </p>
                <p style={{ fontSize: 11, color: 'var(--t3)', margin: '2px 0 0' }}>
                  {isPrivate
                    ? 'เห็นเฉพาะคุณเท่านั้น'
                    : 'เพื่อนทุกคนในทริปมองเห็นได้'}
                </p>
              </div>
            </div>
            {/* Pill toggle */}
            <div style={{
              width: 46, height: 26, borderRadius: 99,
              background: isPrivate ? 'var(--indigo)' : 'var(--s2)',
              border: `1.5px solid ${isPrivate ? 'var(--indigo)' : 'var(--b1)'}`,
              position: 'relative', transition: 'background 0.2s ease, border-color 0.2s ease',
              flexShrink: 0,
            }}>
              <div style={{
                position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%',
                background: 'white',
                boxShadow: '0 1px 4px rgba(0,0,0,0.20)',
                transition: 'left 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                left: isPrivate ? 22 : 3,
              }} />
            </div>
          </button>

          {/* ── Submit ── */}
          <button
            onClick={handleSubmit}
            disabled={saving || !form.title.trim() || uploads.some(u => u.uploading)}
            style={{
              width: '100%', padding: '16px 0', borderRadius: 20, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, var(--indigo), var(--violet))',
              color: 'white', fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em',
              boxShadow: '0 4px 20px var(--indigo-glow)',
              opacity: (saving || !form.title.trim() || uploads.some(u => u.uploading)) ? 0.55 : 1,
              transition: 'opacity 0.15s, transform 0.12s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {saving
              ? <><Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> กำลังบันทึก...</>
              : '🎫 บันทึกการจอง'
            }
          </button>

        </div>
      </div>
    </div>
  )
}
