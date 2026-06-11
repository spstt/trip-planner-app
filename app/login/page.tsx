'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [loading, setLoading] = useState<'google' | 'apple' | null>(null)
  const supabase = createClient()

  async function signIn(provider: 'google' | 'apple') {
    setLoading(provider)
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
    setLoading(null)
  }

  return (
    <div className="min-h-dvh flex flex-col relative overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* Ambient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div style={{
          position: 'absolute', top: '-15%', left: '50%', transform: 'translateX(-50%)',
          width: '120vw', height: '60vh',
          background: 'radial-gradient(ellipse, rgba(99,102,241,0.20) 0%, rgba(139,92,246,0.10) 40%, transparent 70%)',
          borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', right: '-20%',
          width: '70vw', height: '40vh',
          background: 'radial-gradient(circle, rgba(236,72,153,0.10) 0%, transparent 65%)',
          borderRadius: '50%',
        }} />
      </div>

      {/* Top — Logo hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 pt-16 pb-8 relative z-10">

        {/* App icon */}
        <div className="relative mb-6">
          <div style={{
            width: 88, height: 88,
            borderRadius: 24,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
            boxShadow: '0 20px 60px rgba(99,102,241,0.50), 0 0 0 1px rgba(255,255,255,0.08) inset',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 42 }}>✈️</span>
          </div>
          {/* Glow ring */}
          <div style={{
            position: 'absolute', inset: -8,
            borderRadius: 32,
            background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)',
            animation: 'pulse 3s ease-in-out infinite',
          }} />
        </div>

        <h1 style={{
          fontSize: 34, fontWeight: 800,
          background: 'linear-gradient(135deg, #ffffff 0%, #c7d2fe 60%, #a78bfa 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.03em', lineHeight: 1.1,
          marginBottom: 10, textAlign: 'center',
        }}>
          TripMate
        </h1>
        <p style={{ color: 'var(--t2)', fontSize: 16, textAlign: 'center', lineHeight: 1.5, maxWidth: 260 }}>
          วางแผนเที่ยวกับเพื่อนได้ทุกที่ แบบ Real-time
        </p>

        {/* Features */}
        <div style={{
          marginTop: 36, width: '100%', maxWidth: 320,
          background: 'var(--s0)', borderRadius: 20, border: '1px solid var(--b0)',
          padding: '4px 0',
        }}>
          {[
            { icon: '🗺️', title: 'วางแผนทริปร่วมกัน', sub: 'Real-time sync ทุกอุปกรณ์' },
            { icon: '✈️', title: 'เก็บตั๋ว ดูออฟไลน์ได้', sub: 'ไม่มีเน็ตก็เปิดดูได้' },
            { icon: '💰', title: 'หารค่าใช้จ่ายอัตโนมัติ', sub: 'คำนวณหนี้ให้ทันที' },
          ].map(({ icon, title, sub }, i, arr) => (
            <div key={title} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 18px',
              borderBottom: i < arr.length - 1 ? '1px solid var(--b0)' : 'none',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: 'var(--s1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20,
              }}>{icon}</div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', lineHeight: 1.3 }}>{title}</p>
                <p style={{ fontSize: 12, color: 'var(--t3)', marginTop: 1 }}>{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom — Sign in buttons */}
      <div style={{ padding: '0 24px', paddingBottom: 'calc(var(--safe-bottom) + 32px)', position: 'relative', zIndex: 10 }}>

        {/* Google */}
        <button
          onClick={() => signIn('google')}
          disabled={loading !== null}
          className="pressable"
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: '#ffffff', color: '#111827',
            fontWeight: 700, fontSize: 15,
            borderRadius: 16, padding: '15px 24px',
            border: 'none', marginBottom: 12,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            opacity: loading !== null ? 0.6 : 1,
          }}
        >
          {loading === 'google' ? (
            <Spinner dark />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          เข้าสู่ระบบด้วย Google
        </button>

        {/* Apple */}
        <button
          onClick={() => signIn('apple')}
          disabled={loading !== null}
          className="pressable"
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: 'var(--s1)', color: 'var(--t1)',
            fontWeight: 700, fontSize: 15,
            borderRadius: 16, padding: '15px 24px',
            border: '1px solid var(--b1)', marginBottom: 20,
            opacity: loading !== null ? 0.6 : 1,
          }}
        >
          {loading === 'apple' ? (
            <Spinner />
          ) : (
            <svg width="18" height="20" viewBox="0 0 814 1000" fill="white">
              <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105-42.3-150.3-110.7C179.1 748.7 128 622.5 128 512c0-170.8 111.5-261.2 223-261.2 59.5 0 109 38.8 147.6 38.8 36.8 0 94.5-40.8 163.2-40.8 26.5 0 108.2 2.6 168.1 80.1z"/>
              <path d="M554.1 88.4c-33.7 43.3-77.6 71.3-120.2 71.3-5.3 0-10.6-.3-16-.9 0-51.2 22.7-104 62.3-139.3C521.7 2.6 577.6-16 620.1-16c3.9 49.8-16 100.2-66 104.4z"/>
            </svg>
          )}
          เข้าสู่ระบบด้วย Apple
        </button>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--t3)' }}>
          เข้าสู่ระบบถือว่ายอมรับ Terms & Privacy Policy
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.05); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

function Spinner({ dark }: { dark?: boolean }) {
  return (
    <div style={{
      width: 18, height: 18, borderRadius: '50%',
      border: `2px solid ${dark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'}`,
      borderTopColor: dark ? '#111' : '#fff',
      animation: 'spin 0.7s linear infinite',
    }} />
  )
}
