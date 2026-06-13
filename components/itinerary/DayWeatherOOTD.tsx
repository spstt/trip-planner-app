'use client'
/**
 * Required SQL (run once in Supabase SQL Editor):
 *
 * create table if not exists day_outfit_boards (
 *   id          uuid default gen_random_uuid() primary key,
 *   trip_id     uuid references trips(id) on delete cascade not null,
 *   day_id      uuid references itinerary_days(id) on delete cascade not null,
 *   image_url   text not null,
 *   caption     text,
 *   uploaded_by uuid references auth.users(id) not null,
 *   created_at  timestamptz default now()
 * );
 * create unique index if not exists day_outfit_boards_day_idx on day_outfit_boards(day_id);
 * alter table day_outfit_boards enable row level security;
 * create policy "outfit: select" on day_outfit_boards for select using (is_trip_member(trip_id));
 * create policy "outfit: insert" on day_outfit_boards for insert with check (is_trip_host(trip_id));
 * create policy "outfit: update" on day_outfit_boards for update using (is_trip_host(trip_id));
 * create policy "outfit: delete" on day_outfit_boards for delete using (is_trip_host(trip_id));
 * grant select,insert,update,delete on day_outfit_boards to authenticated;
 */

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, X, Loader2, CloudOff, Pencil } from 'lucide-react'
import { fetchWeather } from '@/lib/utils/weather'
import type { ItineraryDay, Trip, WeatherDay } from '@/types'

// ── WMO code → icon + label ───────────────────────────────────────────────
const WMO: Record<number, { icon: string; label: string }> = {
  0: { icon: '☀️', label: 'แดดจัด' },
  1: { icon: '🌤️', label: 'แดดเล็กน้อย' },
  2: { icon: '⛅', label: 'มีเมฆ' },
  3: { icon: '☁️', label: 'ครึ้ม' },
  45: { icon: '🌫️', label: 'หมอก' },
  48: { icon: '🌫️', label: 'หมอก' },
  51: { icon: '🌦️', label: 'ฝนปรอยๆ' },
  53: { icon: '🌦️', label: 'ฝนเบา' },
  61: { icon: '🌧️', label: 'ฝนตก' },
  63: { icon: '🌧️', label: 'ฝนหนัก' },
  65: { icon: '🌧️', label: 'ฝนหนักมาก' },
  71: { icon: '❄️', label: 'หิมะ' },
  73: { icon: '❄️', label: 'หิมะหนัก' },
  75: { icon: '❄️', label: 'หิมะหนักมาก' },
  80: { icon: '🌦️', label: 'ฝนช่วงสั้น' },
  95: { icon: '⛈️', label: 'พายุฝน' },
  96: { icon: '⛈️', label: 'พายุลูกเห็บ' },
}
function wmo(code: number) { return WMO[code] ?? { icon: '🌡️', label: 'ไม่ทราบ' } }

// ── OOTD tier per temperature ─────────────────────────────────────────────
interface OOTDTier {
  emoji: string
  label: string
  title: string
  desc: string
  tip: string
  palette: { hex: string; name: string }[]
  bg: string
  accent: string
}

function getOOTD(tempMax: number, isRainy: boolean): OOTDTier {
  const rain = isRainy ? '  ☂️ อย่าลืมพกร่ม' : ''
  if (tempMax >= 30) return {
    emoji: '🌞', label: 'ร้อนมาก',
    title: 'เสื้อแขนสั้น ผ้าเบา' + rain,
    desc: 'ลินิน Cotton หรือผ้าระบาย เย็นสบาย',
    tip: 'แมทช์โทนสดใสเด่นในรูปกลุ่ม ✨',
    palette: [
      { hex: '#FBBF24', name: 'Amber' },
      { hex: '#F87171', name: 'Coral' },
      { hex: '#34D399', name: 'Mint' },
      { hex: '#60A5FA', name: 'Sky' },
      { hex: '#F9A8D4', name: 'Pink' },
    ],
    bg: 'rgba(251,191,36,0.08)', accent: '#F59E0B',
  }
  if (tempMax >= 20) return {
    emoji: '🌤️', label: 'อบอุ่น',
    title: 'เสื้อเชิ้ต เดรส เลเยอร์เบา' + rain,
    desc: 'อากาศดี เหมาะถ่ายรูปกลางแจ้งมาก',
    tip: 'โทนพาสเทลนุ่มนวล คุมโทนกลุ่มได้สวย 🌸',
    palette: [
      { hex: '#C4B5FD', name: 'Lavender' },
      { hex: '#FCA5A5', name: 'Rose' },
      { hex: '#6EE7B7', name: 'Emerald' },
      { hex: '#FDE68A', name: 'Lemon' },
      { hex: '#FBCFE8', name: 'Blush' },
    ],
    bg: 'rgba(196,181,253,0.10)', accent: '#8B5CF6',
  }
  if (tempMax >= 15) return {
    emoji: '🧥', label: 'เย็นสบาย',
    title: 'แจ็คเก็ต สเวตเตอร์ เลเยอร์ได้' + rain,
    desc: 'สบายตัว ใส่ชั้นเลเยอร์เพิ่มลดได้',
    tip: 'โทนเอิร์ธโทน ดิน ถ่ายรูปดูดี 🍂',
    palette: [
      { hex: '#D4A574', name: 'Caramel' },
      { hex: '#A3B18A', name: 'Sage' },
      { hex: '#B7BEA5', name: 'Moss' },
      { hex: '#C9B99A', name: 'Beige' },
      { hex: '#9CA3AF', name: 'Stone' },
    ],
    bg: 'rgba(163,177,138,0.10)', accent: '#6B7280',
  }
  return {
    emoji: '❄️', label: 'หนาวมาก',
    title: 'โค้ตหนา เสื้อถักขนสัตว์ ผ้าพันคอ' + rain,
    desc: 'ซ้อนชั้นเลเยอร์หนา ระวังหิมะ/ลมแรง',
    tip: 'โทนเข้มอบอุ่น Navy, Plum — ดูดีมาก 🖤',
    palette: [
      { hex: '#1E3A5F', name: 'Navy' },
      { hex: '#4A1942', name: 'Plum' },
      { hex: '#2D4A3E', name: 'Forest' },
      { hex: '#6B4C41', name: 'Brick' },
      { hex: '#374151', name: 'Charcoal' },
    ],
    bg: 'rgba(30,58,95,0.10)', accent: '#6366F1',
  }
}

interface OutfitBoard { id: string; image_url: string; caption: string | null }

interface Props {
  day: ItineraryDay
  trip: Trip
  isHost: boolean
}

export default function DayWeatherOOTD({ day, trip, isHost }: Props) {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [weather, setWeather] = useState<WeatherDay | null>(null)
  const [wxLoading, setWxLoading] = useState(true)
  const [wxOffline, setWxOffline] = useState(false)

  const [board, setBoard] = useState<OutfitBoard | null>(null)
  const [boardLoading, setBoardLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editCaption, setEditCaption] = useState(false)
  const [captionDraft, setCaptionDraft] = useState('')

  // Fetch weather
  useEffect(() => {
    if (!trip.destination_lat || !trip.destination_lng) {
      setWxLoading(false)
      return
    }
    fetchWeather(trip.destination_lat, trip.destination_lng)
      .then(days => {
        const match = days.find(d => d.date === day.date.slice(0, 10))
        setWeather(match ?? null)
        setWxOffline(false)
      })
      .catch(() => setWxOffline(true))
      .finally(() => setWxLoading(false))
  }, [day.id])

  // Load outfit board
  useEffect(() => { loadBoard() }, [day.id])

  async function loadBoard() {
    setBoardLoading(true)
    const { data } = await supabase
      .from('day_outfit_boards')
      .select('id, image_url, caption')
      .eq('day_id', day.id)
      .maybeSingle()
    setBoard(data ?? null)
    setCaptionDraft(data?.caption ?? '')
    setBoardLoading(false)
  }

  async function handleUpload(file: File) {
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `outfit/${trip.id}/${day.id}_${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('trip-files')
      .upload(path, file, { upsert: true })
    if (upErr) { setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage
      .from('trip-files')
      .getPublicUrl(path)

    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      trip_id: trip.id,
      day_id: day.id,
      image_url: publicUrl,
      caption: captionDraft || null,
      uploaded_by: user!.id,
    }

    if (board) {
      const { data } = await supabase
        .from('day_outfit_boards')
        .update({ image_url: publicUrl })
        .eq('id', board.id)
        .select('id, image_url, caption').single()
      setBoard(data)
    } else {
      const { data } = await supabase
        .from('day_outfit_boards')
        .insert(payload)
        .select('id, image_url, caption').single()
      setBoard(data)
    }
    setUploading(false)
  }

  async function saveCaption() {
    if (!board) return
    const { data } = await supabase
      .from('day_outfit_boards')
      .update({ caption: captionDraft || null })
      .eq('id', board.id)
      .select('id, image_url, caption').single()
    setBoard(data)
    setEditCaption(false)
  }

  async function deleteBoard() {
    if (!board) return
    await supabase.from('day_outfit_boards').delete().eq('id', board.id)
    setBoard(null)
    setCaptionDraft('')
  }

  // ── Derived ─────────────────────────────────────────────────────────────
  const wx = weather ? wmo(weather.weatherCode) : null
  const isRainy = weather ? (weather.precipitationSum ?? 0) > 1 : false
  const ootd = weather ? getOOTD(weather.tempMax, isRainy) : null

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* ── Weather card ── */}
      <div style={{
        borderRadius: 22, overflow: 'hidden',
        background: 'var(--s0)', border: '1px solid var(--b0)',
        boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
      }}>
        {/* Top gradient bar */}
        <div style={{
          height: 4,
          background: wxLoading || !weather
            ? 'var(--b0)'
            : isRainy
              ? 'linear-gradient(90deg, #60a5fa, #818cf8)'
              : weather.tempMax >= 28
                ? 'linear-gradient(90deg, #fbbf24, #f97316)'
                : weather.tempMax >= 20
                  ? 'linear-gradient(90deg, #34d399, #60a5fa)'
                  : 'linear-gradient(90deg, #818cf8, #a78bfa)',
        }} />

        <div style={{ padding: '14px 16px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.06em', marginBottom: 10 }}>
            🌡️ พยากรณ์อากาศวันนี้
          </p>

          {wxLoading ? (
            <div style={{ display: 'flex', gap: 8 }}>
              {[80, 60, 90].map((w, i) => (
                <div key={i} className="shimmer" style={{ height: 20, width: w, borderRadius: 8 }} />
              ))}
            </div>
          ) : wxOffline ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CloudOff size={16} style={{ color: 'var(--t3)' }} />
              <span style={{ fontSize: 13, color: 'var(--t3)' }}>ไม่มีการเชื่อมต่อ</span>
            </div>
          ) : !weather ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>🔭</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--t2)', margin: 0 }}>ยังไม่มีพยากรณ์</p>
                <p style={{ fontSize: 11, color: 'var(--t3)', margin: '2px 0 0' }}>เกินระยะเวลาพยากรณ์ (16 วัน)</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {/* Icon + temp */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 36, lineHeight: 1 }}>{wx!.icon}</span>
                <div>
                  <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--t1)', margin: 0, lineHeight: 1, letterSpacing: '-0.03em' }}>
                    {weather.tempMax}°
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--t3)', marginLeft: 4 }}>
                      / {weather.tempMin}°C
                    </span>
                  </p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)', margin: '2px 0 0' }}>
                    {wx!.label}
                  </p>
                </div>
              </div>

              {/* Chips */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginLeft: 'auto' }}>
                {isRainy && (
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 99,
                    background: 'rgba(96,165,250,0.14)', color: '#60a5fa',
                    border: '1px solid rgba(96,165,250,0.25)',
                  }}>
                    🌧 {weather.precipitationSum?.toFixed(1)} mm
                  </span>
                )}
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 99,
                  background: weather.tempMax >= 30
                    ? 'rgba(251,191,36,0.14)' : weather.tempMax >= 20
                      ? 'rgba(52,211,153,0.12)' : weather.tempMax >= 15
                        ? 'rgba(156,163,175,0.14)' : 'rgba(99,102,241,0.12)',
                  color: weather.tempMax >= 30
                    ? '#F59E0B' : weather.tempMax >= 20
                      ? '#10B981' : weather.tempMax >= 15
                        ? '#9CA3AF' : '#818CF8',
                  border: '1px solid transparent',
                }}>
                  {weather.tempMax >= 30 ? '🔥 ร้อน'
                    : weather.tempMax >= 20 ? '✅ สบาย'
                      : weather.tempMax >= 15 ? '🌬️ เย็น'
                        : '🥶 หนาว'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── OOTD + Moodboard card ── */}
      {(ootd || board || isHost) && (
        <div style={{
          borderRadius: 22, overflow: 'hidden',
          background: ootd ? ootd.bg : 'var(--s0)',
          border: `1px solid ${ootd ? ootd.accent + '28' : 'var(--b0)'}`,
          boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
        }}>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* OOTD recommendation */}
            {ootd && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.06em', marginBottom: 10 }}>
                  👗 แนะนำการแต่งตัว
                </p>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {/* Big emoji */}
                  <div style={{
                    width: 52, height: 52, borderRadius: 16, flexShrink: 0,
                    background: 'var(--s0)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 26, boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    border: '1px solid var(--b0)',
                  }}>
                    {ootd.emoji}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 99,
                        background: `${ootd.accent}20`, color: ootd.accent,
                        border: `1px solid ${ootd.accent}30`,
                      }}>
                        {ootd.label}
                      </span>
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', margin: '0 0 3px' }}>
                      {ootd.title}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--t2)', margin: 0, lineHeight: 1.5 }}>
                      {ootd.desc}
                    </p>
                  </div>
                </div>

                {/* Color palette */}
                <div style={{
                  marginTop: 12, padding: '10px 14px', borderRadius: 16,
                  background: 'var(--s0)', border: '1px solid var(--b0)',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {ootd.palette.map((p, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: p.hex,
                          boxShadow: `0 2px 8px ${p.hex}55`,
                          border: '2px solid var(--bg)',
                          flexShrink: 0,
                        }} />
                        <span style={{ fontSize: 9, color: 'var(--t3)', whiteSpace: 'nowrap' }}>{p.name}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginLeft: 'auto', maxWidth: 120 }}>
                    <p style={{ fontSize: 11, color: ootd.accent, fontWeight: 600, margin: 0, lineHeight: 1.4, textAlign: 'right' }}>
                      {ootd.tip}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Divider when both sections visible */}
            {ootd && (board || isHost) && (
              <div style={{ height: 1, background: 'var(--b0)' }} />
            )}

            {/* Moodboard section */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.06em', margin: 0 }}>
                  🎨 Dress Code มู้ดบอร์ด
                </p>
                {isHost && board && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => fileRef.current?.click()}
                      style={{
                        fontSize: 11, fontWeight: 600, color: 'var(--indigo)',
                        background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.20)',
                        borderRadius: 99, padding: '3px 10px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      <Pencil size={10} /> เปลี่ยนรูป
                    </button>
                    <button
                      onClick={deleteBoard}
                      style={{
                        fontSize: 11, fontWeight: 600, color: '#f43f5e',
                        background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.18)',
                        borderRadius: 99, padding: '3px 10px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      <X size={10} /> ลบ
                    </button>
                  </div>
                )}
              </div>

              {boardLoading ? (
                <div className="shimmer" style={{ height: 180, borderRadius: 16 }} />
              ) : board ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Image */}
                  <div style={{ borderRadius: 18, overflow: 'hidden', position: 'relative' }}>
                    <img
                      src={board.image_url}
                      alt="Dress Code Moodboard"
                      style={{ width: '100%', display: 'block', maxHeight: 280, objectFit: 'cover' }}
                    />
                  </div>

                  {/* Caption */}
                  {editCaption ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        value={captionDraft}
                        onChange={e => setCaptionDraft(e.target.value)}
                        placeholder="เขียนคำอธิบาย Dress Code..."
                        autoFocus
                        style={{
                          flex: 1, background: 'var(--s1)', color: 'var(--t1)',
                          borderRadius: 12, padding: '8px 12px', fontSize: 13,
                          border: '1.5px solid var(--indigo)', outline: 'none',
                        }}
                      />
                      <button
                        onClick={saveCaption}
                        style={{
                          padding: '8px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
                          background: 'var(--indigo)', color: 'white', fontSize: 13, fontWeight: 600,
                        }}
                      >
                        บันทึก
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {board.caption ? (
                        <p style={{ fontSize: 13, color: 'var(--t2)', margin: 0, flex: 1, lineHeight: 1.5 }}>
                          {board.caption}
                        </p>
                      ) : isHost ? (
                        <p style={{ fontSize: 12, color: 'var(--t3)', margin: 0, fontStyle: 'italic', flex: 1 }}>
                          เพิ่มคำอธิบาย Dress Code...
                        </p>
                      ) : null}
                      {isHost && (
                        <button
                          onClick={() => setEditCaption(true)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', padding: 4 }}
                        >
                          <Pencil size={13} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : isHost ? (
                /* Upload prompt */
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  style={{
                    width: '100%', padding: '24px 0', borderRadius: 18,
                    border: '2px dashed var(--b1)', background: 'var(--s1)',
                    cursor: 'pointer', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 10, transition: 'all 0.18s',
                  }}
                >
                  {uploading ? (
                    <>
                      <Loader2 size={28} style={{ color: 'var(--indigo)', animation: 'spin 0.8s linear infinite' }} />
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--t2)', margin: 0 }}>กำลังอัปโหลด...</p>
                    </>
                  ) : (
                    <>
                      <div style={{
                        width: 52, height: 52, borderRadius: 16,
                        background: 'rgba(139,92,246,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Upload size={22} style={{ color: '#8B5CF6' }} />
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', margin: 0 }}>
                          อัปโหลด Dress Code
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--t3)', margin: '4px 0 0' }}>
                          แชร์มู้ดบอร์ดการแต่งตัวให้ทุกคนเตรียมชุดให้ตรงกัน
                        </p>
                      </div>
                    </>
                  )}
                </button>
              ) : (
                /* Member view — no board uploaded yet */
                <div style={{
                  padding: '16px', borderRadius: 16, background: 'var(--s1)',
                  border: '1px solid var(--b0)', textAlign: 'center',
                }}>
                  <p style={{ fontSize: 13, color: 'var(--t3)', margin: 0 }}>
                    🎨 Host ยังไม่ได้อัปโหลด Dress Code
                  </p>
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) handleUpload(file)
                  e.target.value = ''
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
