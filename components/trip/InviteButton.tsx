'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Link2, Check } from 'lucide-react'

interface Props { tripId: string }

export default function InviteButton({ tripId }: Props) {
  const [copied, setCopied] = useState(false)
  const supabase = createClient()

  async function copyInviteLink() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Reuse existing valid invitation
    const { data: existing } = await supabase
      .from('trip_invitations')
      .select('token')
      .eq('trip_id', tripId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let token = existing?.token

    if (!token) {
      const { data: inv } = await supabase
        .from('trip_invitations')
        .insert({ trip_id: tripId, created_by: user.id })
        .select('token')
        .single()
      token = inv?.token
    }

    if (!token) return

    const link = `${location.origin}/invite/${token}`
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copyInviteLink}
      className="flex items-center gap-1.5 text-xs bg-indigo-600/20 text-indigo-400 px-3 py-1.5 rounded-full border border-indigo-500/30 active:scale-95 transition-transform"
    >
      {copied ? <Check size={12} /> : <Link2 size={12} />}
      {copied ? 'คัดลอกแล้ว!' : 'เชิญเพื่อน'}
    </button>
  )
}
