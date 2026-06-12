'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { MapPin, Users, Globe, Lock, Trash2, ExternalLink, Camera, Loader2 } from 'lucide-react'
import { toast } from '@/components/ui/Toast'
import { parseISO, differenceInDays, format } from 'date-fns'
import { th } from 'date-fns/locale'
import type { Trip, TripMember, Profile } from '@/types'
import WeatherWidget from '@/components/trip/WeatherWidget'
import SmartTravelTips from '@/components/trip/SmartTravelTips'
import CountdownTimer from '@/components/trip/CountdownTimer'
import InviteButton from '@/components/trip/InviteButton'
import TripReadiness from '@/components/trip/TripReadiness'
import EmergencyMeetupWidget from '@/components/trip/EmergencyMeetup'
import StickyMemoBoard from '@/components/trip/StickyMemoBoard'
import { fetchDestinationInfo, type DestinationInfo } from '@/lib/utils/destination'

interface TripData extends Trip {
  trip_members: (TripMember & { profile: Profile })[]
}

const GRADIENTS = [
  ['#6366f1','#a855f7'], ['#ec4899','#f97316'],
  ['#06b6d4','#3b82f6'], ['#10b981','#06b6d4'],
  ['#f59e0b','#ef4444'],
]

export default function TripOverviewPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [trip, setTrip] = useState<TripData | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [destInfo, setDestInfo] = useState<DestinationInfo | null>(null)
  const [imgError, setImgError] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadTrip()

    // Real-time: re-fetch when someone joins or leaves this trip
    const channel = supabase
      .channel(`trip-members-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trip_members', filter: `trip_id=eq.${id}` },
        () => { loadTrip() },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  async function loadTrip() {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUserId(user?.id ?? null)
    const { data } = await supabase
      .from('trips')
      .select('*, trip_members(user_id,role,joined_at,profile:profiles(id,display_name,avatar_url,bank_account,promptpay))')
      .eq('id', id).single()
    setTrip(data as TripData)
    setLoading(false)

    // Fetch destination photo in background
    if (data?.destination) {
      fetchDestinationInfo(data.destination).then(setDestInfo).catch(() => {})
    }
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${id}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('trip-covers')
      .upload(path, file, { upsert: true })
    if (upErr) {
      toast('อัปโหลดรูปไม่สำเร็จ: ' + upErr.message, 'error')
      setUploading(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('trip-covers').getPublicUrl(path)
    const { error: dbErr } = await supabase.from('trips').update({ cover_image_url: publicUrl }).eq('id', id)
    if (dbErr) {
      toast('บันทึกรูปปกไม่สำเร็จ', 'error')
      setUploading(false)
      return
    }
    setTrip(prev => prev ? { ...prev, cover_image_url: publicUrl } : prev)
    setImgError(false)
    toast('อัปเดตรูปปกทริปแล้ว ✓')
    setUploading(false)
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleDelete() {
    setDeleting(true)
    const { error } = await supabase.from('trips').delete().eq('id', id)
    setDeleting(false)
    setConfirmDelete(false)
    if (error) { toast('ลบไม่สำเร็จ: ' + error.message, 'error'); return }
    toast('ลบทริปแล้ว')
    router.push('/dashboard')
  }

  if (loading) return (
    <div>
      <div className="shimmer" style={{ height: 260, width: '100%' }} />
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="shimmer" style={{ borderRadius: 20, height: 110 }} />
        <div className="shimmer" style={{ borderRadius: 20, height: 80 }} />
      </div>
    </div>
  )

  if (!trip) return <div style={{ padding: 32, textAlign: 'center', color: 'var(--t3)' }}>ไม่พบทริปนี้</div>

  const isHost = trip.trip_members.some(m => m.user_id === currentUserId && m.role === 'host')
  const startDate = parseISO(trip.start_date)
  const endDate   = parseISO(trip.end_date)
  const tripDays  = differenceInDays(endDate, startDate) + 1
  const [c1, c2]  = GRADIENTS[trip.id.charCodeAt(0) % GRADIENTS.length]

  // Destination photo: use original (high quality) not thumbnail
  const heroImg = !imgError ? (trip.cover_image_url ?? destInfo?.imageUrl ?? destInfo?.imageThumb) : null

  return (
    <div style={{ paddingBottom: 24 }}>

      {/* ══════════════════════════════════════
          HERO — destination photo OR gradient
          ══════════════════════════════════════ */}
      <div style={{ position: 'relative', height: 280, overflow: 'hidden',
        background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)` }}>

        {/* Destination photo */}
        {heroImg && (
          <Image
            src={heroImg}
            alt={trip.destination}
            fill
            sizes="100vw"
            style={{ objectFit: 'cover', objectPosition: 'center 40%' }}
            onError={() => setImgError(true)}
            priority
          />
        )}

        {/* Gradient overlays — top fade + bottom fade for readability */}
        <div style={{ position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.7) 80%, rgba(5,8,15,1) 100%)' }} />

        {/* Top-right actions: cover upload (host) + Wikipedia badge */}
        <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', gap: 6, alignItems: 'center' }}>
          {isHost && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="pressable"
              style={{ display: 'flex', alignItems: 'center', gap: 4,
                background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)',
                padding: '5px 10px', borderRadius: 99, fontSize: 10,
                color: 'rgba(255,255,255,0.8)',
                border: '1px solid rgba(255,255,255,0.18)',
                cursor: uploading ? 'not-allowed' : 'pointer' }}
            >
              {uploading
                ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />
                : <Camera size={10} />}
              {uploading ? 'กำลังอัปโหลด...' : 'เปลี่ยนรูปปก'}
            </button>
          )}
          {heroImg && destInfo?.wikiUrl && (
            <a href={destInfo.wikiUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 4,
                background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
                padding: '4px 8px', borderRadius: 99, textDecoration: 'none',
                fontSize: 10, color: 'rgba(255,255,255,0.6)',
                border: '1px solid rgba(255,255,255,0.1)' }}>
              <Globe size={9} /> Wikipedia <ExternalLink size={9} />
            </a>
          )}
        </div>
        {/* Hidden file input for cover image */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleCoverUpload}
        />

        {/* ── Trip info at bottom of hero ── */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 20px 20px' }}>
          {/* Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4,
              background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)',
              padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.85)',
              border: '1px solid rgba(255,255,255,0.15)' }}>
              {trip.is_international ? <><Globe size={10}/> ต่างประเทศ</> : <><MapPin size={10}/> ในประเทศ</>}
            </span>
            <span style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)',
              padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.85)',
              border: '1px solid rgba(255,255,255,0.15)' }}>
              {tripDays} วัน
            </span>
            {trip.rates_locked_at && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4,
                background: 'rgba(245,158,11,0.2)', padding: '4px 10px', borderRadius: 99,
                fontSize: 11, fontWeight: 600, color: '#fcd34d' }}>
                <Lock size={10}/> ล็อคเรท
              </span>
            )}
          </div>

          {/* Trip name */}
          <h1 style={{ fontSize: 28, fontWeight: 900, color: 'white', letterSpacing: '-0.03em',
            lineHeight: 1.1, margin: 0, textShadow: '0 2px 16px rgba(0,0,0,0.5)' }}>
            {trip.name}
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 5,
            display: 'flex', alignItems: 'center', gap: 5 }}>
            <MapPin size={12}/>
            {trip.destination}
            <span style={{ opacity: 0.4 }}>·</span>
            {format(startDate, 'd MMM', { locale: th })} – {format(endDate, 'd MMM yy', { locale: th })}
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════
          CONTENT
          ══════════════════════════════════════ */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Countdown */}
        <CountdownTimer startDate={trip.start_date} endDate={trip.end_date} />

        {/* Members + Invite */}
        <div style={{ borderRadius: 20, padding: '14px 16px', background: 'var(--s0)', border: '1px solid var(--b0)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={15} color="#818cf8" />
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>{trip.trip_members.length} คนในทริป</span>
            </div>
            {isHost && <InviteButton tripId={trip.id} />}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {trip.trip_members.map(m => (
              <div key={m.user_id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 48, height: 48, borderRadius: 16, overflow: 'hidden',
                  background: `linear-gradient(135deg,${c1},${c2})`,
                  border: '2px solid var(--s2)', flexShrink: 0 }}>
                  {m.profile?.avatar_url
                    ? <Image src={m.profile.avatar_url} alt="" width={48} height={48} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: 'white' }}>{m.profile?.display_name?.[0]?.toUpperCase()}</div>
                  }
                </div>
                <span style={{ fontSize: 10, color: 'var(--t3)', maxWidth: 52, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>
                  {m.profile?.display_name}
                </span>
                {m.role === 'host' && <span style={{ fontSize: 9, fontWeight: 700, color: '#818cf8', marginTop: -2 }}>Host</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Trip Readiness */}
        <TripReadiness trip={trip} members={trip.trip_members} currentUserId={currentUserId} isHost={isHost} />

        {/* Wikipedia description */}
        {destInfo?.extract && (
          <div style={{ borderRadius: 20, padding: '14px 16px', background: 'var(--s0)', border: '1px solid var(--b0)' }}>
            <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--t2)', margin: 0 }}>
              {destInfo.extract}
            </p>
          </div>
        )}

        {/* Weather */}
        {trip.destination_lat && trip.destination_lng && (
          <WeatherWidget lat={trip.destination_lat} lng={trip.destination_lng} destination={trip.destination} />
        )}

        {/* Smart packing tips derived from weather forecast */}
        {trip.destination_lat && trip.destination_lng && (
          <SmartTravelTips lat={trip.destination_lat} lng={trip.destination_lng} tripId={id} />
        )}

        {/* Sticky Memo Board */}
        <StickyMemoBoard tripId={id} currentUserId={currentUserId} />

        {/* Emergency Meetup */}
        <EmergencyMeetupWidget tripId={id} isHost={isHost} currentUserId={currentUserId} />

        {/* Delete trip — host only, at bottom */}
        {isHost && (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: '13px', borderRadius: 16, border: '1px solid rgba(239,68,68,0.2)',
              background: 'rgba(239,68,68,0.06)', color: '#f87171',
              fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 8 }}
            className="pressable"
          >
            <Trash2 size={15} /> ลบทริปนี้
          </button>
        )}
      </div>

      {/* ══════════════════════════════════════
          CONFIRM DELETE DIALOG
          ══════════════════════════════════════ */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px',
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}
          onClick={() => setConfirmDelete(false)}
        >
          <div
            className="spring-enter"
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 360, borderRadius: 28, padding: 24,
              background: 'var(--s1)', border: '1px solid var(--b1)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}
          >
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>🗑️</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--t1)', margin: '0 0 8px' }}>
                ลบทริปนี้?
              </h3>
              <p style={{ fontSize: 14, color: 'var(--t2)', lineHeight: 1.5, margin: 0 }}>
                ข้อมูลทั้งหมดใน <strong style={{ color: 'var(--t1)' }}>{trip.name}</strong> จะถูกลบถาวร ไม่สามารถกู้คืนได้
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{ flex: 1, padding: '13px', borderRadius: 16, border: '1px solid var(--b0)',
                  background: 'var(--s2)', color: 'var(--t2)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="pressable"
                style={{ flex: 1, padding: '13px', borderRadius: 16, border: 'none',
                  background: deleting ? 'rgba(239,68,68,0.4)' : 'linear-gradient(135deg,#ef4444,#dc2626)',
                  color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(239,68,68,0.35)' }}
              >
                {deleting ? 'กำลังลบ...' : 'ลบทริป'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
