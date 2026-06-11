'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { MapPin, ExternalLink, Globe } from 'lucide-react'
import { fetchDestinationInfo, type DestinationInfo } from '@/lib/utils/destination'

interface Props {
  destination: string
  tripName: string
}

const FALLBACK_GRADIENTS = [
  ['#6366f1', '#a855f7'],
  ['#06b6d4', '#3b82f6'],
  ['#10b981', '#06b6d4'],
  ['#f59e0b', '#ef4444'],
  ['#ec4899', '#8b5cf6'],
]

export default function DestinationWidget({ destination, tripName }: Props) {
  const [info, setInfo] = useState<DestinationInfo | null | 'loading'>('loading')
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    setInfo('loading')
    setImgError(false)
    fetchDestinationInfo(destination)
      .then(data => setInfo(data))
      .catch(() => setInfo(null))
  }, [destination])

  const [g1, g2] = FALLBACK_GRADIENTS[destination.charCodeAt(0) % FALLBACK_GRADIENTS.length]

  if (info === 'loading') return <DestinationSkeleton />

  const hasImage = info?.imageThumb && !imgError

  return (
    <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid var(--b0)', position: 'relative' }}>

      {/* ── Photo / Gradient Hero ── */}
      <div style={{ position: 'relative', height: 200, overflow: 'hidden' }}>

        {/* Background: photo or gradient */}
        {hasImage ? (
          <>
            <Image
              src={info!.imageThumb!}
              alt={destination}
              fill
              sizes="(max-width: 768px) 100vw, 600px"
              style={{ objectFit: 'cover', objectPosition: 'center' }}
              onError={() => setImgError(true)}
              priority={false}
            />
            {/* Dark overlay for text readability */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.65) 60%, rgba(0,0,0,0.85) 100%)',
            }} />
          </>
        ) : (
          <>
            <div style={{
              position: 'absolute', inset: 0,
              background: `linear-gradient(135deg, ${g1} 0%, ${g2} 100%)`,
            }} />
            <div style={{
              position: 'absolute', inset: 0, opacity: 0.08,
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E")`,
            }} />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.5) 100%)',
            }} />
          </>
        )}

        {/* Photo credit badge */}
        {hasImage && (
          <div style={{
            position: 'absolute', top: 10, right: 10,
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
            padding: '3px 8px', borderRadius: 99,
            fontSize: 10, color: 'rgba(255,255,255,0.6)',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <Globe size={9} /> Wikipedia
          </div>
        )}

        {/* Destination name overlay */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 16px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                <MapPin size={12} color="rgba(255,255,255,0.7)" />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
                  ปลายทาง
                </span>
              </div>
              <h3 style={{
                fontSize: 22, fontWeight: 800, color: 'white',
                letterSpacing: '-0.03em', lineHeight: 1.1,
                textShadow: '0 2px 12px rgba(0,0,0,0.4)',
                margin: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {info?.title ?? destination}
              </h3>
            </div>

            {/* Link to Wikipedia */}
            {info?.wikiUrl && (
              <a
                href={info.wikiUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  width: 36, height: 36, borderRadius: 12, flexShrink: 0, marginLeft: 10,
                  background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  textDecoration: 'none',
                }}
              >
                <ExternalLink size={14} color="white" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Description ── */}
      {info?.extract && (
        <div style={{
          padding: '12px 16px 14px',
          background: 'var(--s0)',
          borderTop: '1px solid var(--b0)',
        }}>
          <p style={{
            fontSize: 13, lineHeight: 1.6, color: 'var(--t2)',
            margin: 0,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {info.extract}
          </p>
        </div>
      )}

      {/* No info fallback */}
      {!info && (
        <div style={{
          padding: '12px 16px',
          background: 'var(--s0)',
          borderTop: '1px solid var(--b0)',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 12, color: 'var(--t3)', margin: 0 }}>
            ไม่พบข้อมูลสถานที่
          </p>
        </div>
      )}
    </div>
  )
}

function DestinationSkeleton() {
  return (
    <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid var(--b0)' }}>
      <div className="shimmer" style={{ height: 200 }} />
      <div style={{ padding: '12px 16px 14px', background: 'var(--s0)', borderTop: '1px solid var(--b0)' }}>
        <div className="shimmer" style={{ height: 13, borderRadius: 6, marginBottom: 6, width: '90%' }} />
        <div className="shimmer" style={{ height: 13, borderRadius: 6, width: '70%' }} />
      </div>
    </div>
  )
}
