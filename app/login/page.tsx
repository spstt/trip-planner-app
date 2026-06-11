'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plane } from 'lucide-react'

export default function LoginPage() {
  const [loading, setLoading] = useState<'google' | 'apple' | null>(null)
  const supabase = createClient()

  async function signIn(provider: 'google' | 'apple') {
    setLoading(provider)
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    })
    setLoading(null)
  }

  return (
    <div className="min-h-dvh bg-slate-950 flex flex-col items-center justify-center px-6 py-safe">
      {/* Background gradient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm space-y-8 spring-enter">
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto shadow-2xl shadow-indigo-500/30">
            <Plane size={36} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold gradient-text">TripMate</h1>
            <p className="text-slate-400 mt-1 text-sm">วางแผนเที่ยวกับเพื่อนได้ทุกที่</p>
          </div>
        </div>

        {/* Features preview */}
        <div className="glass rounded-2xl p-4 space-y-2.5">
          {[
            ['🗺️', 'วางแผนทริปร่วมกันแบบ Real-time'],
            ['✈️', 'เก็บตั๋วและดูออฟไลน์ได้'],
            ['💰', 'หารค่าใช้จ่ายอัจฉริยะ'],
            ['📦', 'Checklist ก่อนเดินทาง'],
          ].map(([emoji, text]) => (
            <div key={text} className="flex items-center gap-3">
              <span className="text-xl">{emoji}</span>
              <span className="text-sm text-slate-300">{text}</span>
            </div>
          ))}
        </div>

        {/* Sign-in buttons */}
        <div className="space-y-3">
          <button
            onClick={() => signIn('google')}
            disabled={loading !== null}
            className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 font-semibold py-4 px-6 rounded-2xl active:scale-95 transition-transform disabled:opacity-60"
          >
            {loading === 'google' ? (
              <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
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

          <button
            onClick={() => signIn('apple')}
            disabled={loading !== null}
            className="w-full flex items-center justify-center gap-3 bg-slate-800 text-white font-semibold py-4 px-6 rounded-2xl border border-slate-700 active:scale-95 transition-transform disabled:opacity-60"
          >
            {loading === 'apple' ? (
              <div className="w-5 h-5 border-2 border-slate-600 border-t-white rounded-full animate-spin" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
            )}
            เข้าสู่ระบบด้วย Apple
          </button>
        </div>

        <p className="text-xs text-slate-600 text-center px-4">
          การเข้าสู่ระบบถือว่าคุณยอมรับ Terms of Service และ Privacy Policy
        </p>
      </div>
    </div>
  )
}
