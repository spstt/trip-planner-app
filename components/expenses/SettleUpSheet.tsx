'use client'
import { useState } from 'react'
import type { DebtEntry, TripMember, Profile } from '@/types'
import { formatCurrency } from '@/lib/utils/debt'
import Image from 'next/image'
import { Copy, Check } from 'lucide-react'

interface Props {
  debts: DebtEntry[]
  members: (TripMember & { profile: Profile })[]
  currentUserId: string | null
}

export default function SettleUpSheet({ debts, members, currentUserId }: Props) {
  const [copied, setCopied] = useState<string | null>(null)

  function getProfile(userId: string) {
    return members.find(m => m.user_id === userId)?.profile
  }

  async function copyPaymentInfo(userId: string) {
    const profile = getProfile(userId)
    const info = [
      profile?.bank_account && `เลขบัญชี: ${profile.bank_account}`,
      profile?.promptpay && `พร้อมเพย์: ${profile.promptpay}`,
    ].filter(Boolean).join('\n')

    if (!info) { alert('ผู้รับไม่ได้กรอกข้อมูลบัญชี'); return }
    await navigator.clipboard.writeText(info)
    setCopied(userId)
    setTimeout(() => setCopied(null), 2000)
  }

  if (debts.length === 0) {
    return (
      <div className="text-center py-12 space-y-2">
        <div className="text-5xl">🎉</div>
        <p className="text-white font-semibold">ไม่มียอดค้างชำระ!</p>
        <p className="text-slate-500 text-sm">ทุกคนเคลียร์หนี้กันแล้ว</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 pb-4">
      <p className="text-xs text-slate-500">ระบบได้คำนวณยอดสุทธิเพื่อให้โอนเงินจำนวนครั้งน้อยที่สุด</p>

      {debts.map((debt, i) => {
        const fromProfile = getProfile(debt.from)
        const toProfile = getProfile(debt.to)
        const isMe = debt.from === currentUserId

        return (
          <div
            key={i}
            className={`glass rounded-2xl px-4 py-4 border ${
              isMe ? 'border-rose-500/30 bg-rose-500/5' : 'border-white/5'
            }`}
          >
            <div className="flex items-center gap-3">
              <Avatar profile={fromProfile} />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">
                  {isMe ? 'ฉัน' : fromProfile?.display_name}
                  <span className="text-slate-400 font-normal"> ต้องโอน </span>
                  {toProfile?.display_name}
                </p>
                <p className={`text-lg font-bold ${isMe ? 'text-rose-400' : 'text-white'}`}>
                  {formatCurrency(debt.amount)}
                </p>
              </div>
              <Avatar profile={toProfile} />
            </div>

            {/* One-click copy payment info */}
            {isMe && (
              <button
                onClick={() => copyPaymentInfo(debt.to)}
                className="mt-3 w-full flex items-center justify-center gap-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 py-2.5 rounded-xl text-sm active:scale-95 transition-transform"
              >
                {copied === debt.to ? <Check size={14} /> : <Copy size={14} />}
                {copied === debt.to ? 'คัดลอกแล้ว!' : `คัดลอกบัญชี ${toProfile?.display_name}`}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Avatar({ profile }: { profile?: Profile | null }) {
  return (
    <div className="w-10 h-10 rounded-full bg-indigo-600 overflow-hidden shrink-0">
      {profile?.avatar_url ? (
        <Image src={profile.avatar_url} alt="" width={40} height={40} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white">
          {profile?.display_name?.[0]}
        </div>
      )}
    </div>
  )
}
