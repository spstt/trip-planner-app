'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plane, Loader2 } from 'lucide-react'

export default function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [status, setStatus] = useState<'loading' | 'joining' | 'success' | 'error' | 'login'>('loading')
  const [tripName, setTripName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    handleInvite()
  }, [token])

  async function handleInvite() {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // Store token and redirect to login
      sessionStorage.setItem('pending_invite', token)
      setStatus('login')
      return
    }

    setStatus('joining')

    const { data, error } = await supabase.rpc('join_trip_by_token', { p_token: token })

    if (data?.error) {
      setErrorMsg(data.error)
      setStatus('error')
      return
    }

    if (data?.trip_id) {
      // Fetch trip name
      const { data: trip } = await supabase.from('trips').select('name').eq('id', data.trip_id).single()
      setTripName(trip?.name ?? 'ทริปใหม่')
      setStatus('success')

      setTimeout(() => router.push(`/trips/${data.trip_id}`), 2000)
    }
  }

  async function loginAndJoin(provider: 'google' | 'apple') {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/invite/${token}` },
    })
  }

  return (
    <div className="min-h-dvh bg-slate-950 flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto">
          <Plane size={36} className="text-white" />
        </div>

        {status === 'loading' || status === 'joining' ? (
          <>
            <Loader2 size={32} className="animate-spin mx-auto text-indigo-400" />
            <p className="text-slate-400">กำลังเข้าร่วมทริป...</p>
          </>
        ) : status === 'success' ? (
          <>
            <div className="text-5xl">🎉</div>
            <div>
              <h2 className="text-xl font-bold text-white">เข้าร่วมสำเร็จ!</h2>
              <p className="text-slate-400 mt-1">ยินดีต้อนรับสู่ทริป "{tripName}"</p>
            </div>
            <p className="text-sm text-slate-500">กำลังพาคุณไปหน้าทริป...</p>
          </>
        ) : status === 'error' ? (
          <>
            <div className="text-5xl">😕</div>
            <div>
              <h2 className="text-xl font-bold text-white">ไม่สามารถเข้าร่วมได้</h2>
              <p className="text-slate-400 mt-1">{errorMsg}</p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-medium"
            >
              กลับหน้าแรก
            </button>
          </>
        ) : (
          // Not logged in
          <>
            <div>
              <h2 className="text-xl font-bold text-white">คุณได้รับเชิญเข้าทริป!</h2>
              <p className="text-slate-400 mt-1">เข้าสู่ระบบเพื่อยืนยันการเข้าร่วม</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => loginAndJoin('google')}
                className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 font-semibold py-4 px-6 rounded-2xl active:scale-95"
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                เข้าสู่ระบบด้วย Google
              </button>
              <button
                onClick={() => loginAndJoin('apple')}
                className="w-full flex items-center justify-center gap-3 bg-slate-800 text-white font-semibold py-4 px-6 rounded-2xl border border-slate-700 active:scale-95"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                เข้าสู่ระบบด้วย Apple
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
