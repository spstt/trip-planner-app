'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchWeather } from '@/lib/utils/weather'
import type { WeatherDay } from '@/types'
import { Shirt, ChevronRight, PackageCheck } from 'lucide-react'

interface Props {
  lat: number
  lng: number
  tripId: string
}

interface TipConfig {
  emoji: string
  label: string
  accent: string
  tips: string[]
}

function analyzeTips(days: WeatherDay[]): TipConfig | null {
  if (!days.length) return null
  const avgMax = days.reduce((s, d) => s + d.tempMax, 0) / days.length
  const avgMin = days.reduce((s, d) => s + d.tempMin, 0) / days.length
  const avg = (avgMax + avgMin) / 2
  const umbrella = days.filter(d => d.precipitationSum > 2).length >= 2
    ? ['ร่มพับพกพา (มีฝนบางวัน)']
    : []

  if (avg > 30) return {
    emoji: '🌡️', label: 'ร้อนมาก', accent: '#ef4444',
    tips: [
      'เสื้อผ้าสีอ่อน ผ้าบาง ระบายอากาศดี',
      'หมวกกันแดด + แว่นกันแดด',
      'ครีมกันแดด SPF 50+ (ทาซ้ำทุก 2 ชม.)',
      'ขวดน้ำ + ผ้าเย็น',
      ...umbrella,
    ],
  }
  if (avg >= 25) return {
    emoji: '☀️', label: 'ร้อนอบอุ่น', accent: '#f59e0b',
    tips: [
      'เสื้อแขนสั้น ผ้าระบาย (ลินิน / Cotton)',
      'กางเกงขาสั้น หรือกระโปรงบาง',
      'ครีมกันแดด SPF 50+',
      'รองเท้าแตะ หรือสนีกเกอร์เบาๆ',
      ...umbrella,
    ],
  }
  if (avg >= 15) return {
    emoji: '🌤️', label: 'เย็นสบาย', accent: '#06b6d4',
    tips: [
      'เสื้อแขนยาว หรือเสื้อกันลมบาง',
      'กางเกงขายาว',
      'ผ้าพันคอเบาๆ',
      ...umbrella,
    ],
  }
  return {
    emoji: '🧥', label: 'หนาว', accent: '#818cf8',
    tips: [
      'เสื้อโค้ท หรือแจ็คเก็ตหนา',
      'เลเยอร์เสื้อ 2–3 ชั้น',
      'หมวก ถุงมือ ผ้าพันคอ',
      'รองเท้าบู๊ท หรือรองเท้าหนา',
    ],
  }
}

export default function SmartTravelTips({ lat, lng, tripId }: Props) {
  const [config, setConfig] = useState<TipConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWeather(lat, lng)
      .then(days => setConfig(analyzeTips(days)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [lat, lng])

  if (loading) return <div className="shimmer" style={{ borderRadius: 20, height: 130 }} />
  if (!config) return null

  return (
    <div style={{ borderRadius: 20, padding: '14px 16px', background: 'var(--s0)', border: '1px solid var(--b0)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Shirt size={15} style={{ color: config.accent, flexShrink: 0 }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>แนะนำการแต่งกาย</span>
        <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 99, fontWeight: 600,
          background: `${config.accent}22`, color: config.accent, flexShrink: 0 }}>
          {config.emoji} {config.label}
        </span>
      </div>

      {/* Tips list */}
      <ul style={{ margin: 0, padding: 0, listStyle: 'none',
        display: 'flex', flexDirection: 'column', gap: 6 }}>
        {config.tips.map((tip, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 13, color: 'var(--t2)' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%',
              background: config.accent, flexShrink: 0 }} />
            {tip}
          </li>
        ))}
      </ul>

      {/* CTA → checklist */}
      <Link
        href={`/trips/${tripId}/checklist`}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 14, padding: '10px 14px', borderRadius: 12, textDecoration: 'none',
          background: `${config.accent}15`, border: `1px solid ${config.accent}30`,
          color: config.accent, fontSize: 13, fontWeight: 600 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <PackageCheck size={15} />
          ไปจัดเช็คลิสต์ของที่ต้องเตรียม
        </div>
        <ChevronRight size={15} />
      </Link>
    </div>
  )
}
