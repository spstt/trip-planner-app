'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  User, CreditCard, LogOut, Trash2,
  Save, Loader2, ChevronRight, Shield, Camera
} from 'lucide-react'
import type { Profile } from '@/types'
import { toast } from '@/components/ui/Toast'
import { useRef } from 'react'

const CURRENCIES = ['THB', 'USD', 'JPY', 'KRW', 'EUR', 'SGD', 'MYR', 'HKD']

export default function ProfilePage() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    display_name: '',
    default_currency: 'THB',
    bank_account: '',
    promptpay: '',
  })

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (data) {
      setProfile(data)
      setForm({
        display_name: data.display_name ?? '',
        default_currency: data.default_currency ?? 'THB',
        bank_account: data.bank_account ?? '',
        promptpay: data.promptpay ?? '',
      })
    }
    setLoading(false)
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    // Validate: image only, max 2MB
    if (!file.type.startsWith('image/')) { toast('รองรับเฉพาะไฟล์รูปภาพ', 'error'); return }
    if (file.size > 2 * 1024 * 1024) { toast('ไฟล์ต้องไม่เกิน 2MB', 'error'); return }

    setUploadingAvatar(true)
    const ext = file.name.split('.').pop()
    const path = `${profile.id}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      toast('อัปโหลดไม่สำเร็จ: ' + uploadError.message, 'error')
      setUploadingAvatar(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    // Add cache-busting so Next.js Image reloads
    const avatarUrl = `${publicUrl}?t=${Date.now()}`

    await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', profile.id)
    setProfile(p => p ? { ...p, avatar_url: avatarUrl } : p)
    setUploadingAvatar(false)
    toast('เปลี่ยนรูปโปรไฟล์แล้ว ✅')
  }

  async function saveProfile() {
    if (!profile) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: form.display_name.trim(),
        default_currency: form.default_currency,
        bank_account: form.bank_account.trim() || null,
        promptpay: form.promptpay.trim() || null,
      })
      .eq('id', profile.id)

    setSaving(false)
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      setProfile(p => p ? { ...p, ...form } : p)
      toast('บันทึกข้อมูลแล้ว ✅')
    } else {
      toast('บันทึกไม่สำเร็จ: ' + error.message, 'error')
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function deleteAccount() {
    const confirmed = confirm(
      'ลบบัญชีถาวร?\n\nข้อมูลทั้งหมดของคุณจะถูกลบออกจากระบบและไม่สามารถกู้คืนได้'
    )
    if (!confirmed) return
    const confirmed2 = confirm('ยืนยันอีกครั้ง — ลบบัญชีจริงๆ ใช่ไหม?')
    if (!confirmed2) return

    const { error } = await supabase.rpc('delete_user_account')
    if (!error) {
      await supabase.auth.signOut()
      router.push('/login')
    } else {
      toast('เกิดข้อผิดพลาด: ' + error.message, 'error')
    }
  }

  if (loading) {
    return (
      <div className="px-4 pt-6 space-y-4">
        <div className="shimmer rounded-full w-20 h-20 mx-auto" />
        <div className="shimmer rounded-2xl h-12" />
        <div className="shimmer rounded-2xl h-12" />
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-6 space-y-6">
      {/* Avatar + name header */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 overflow-hidden border-4 border-slate-800 shadow-xl">
            {profile?.avatar_url ? (
              <Image src={profile.avatar_url} alt="" width={80} height={80} className="w-full h-full object-cover" unoptimized />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white">
                {form.display_name?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
          </div>
          {/* Upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-indigo-600 border-2 border-slate-900 flex items-center justify-center active:scale-90 transition-transform"
          >
            {uploadingAvatar
              ? <Loader2 size={13} className="text-white animate-spin" />
              : <Camera size={13} className="text-white" />}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold text-white">{form.display_name || 'ไม่มีชื่อ'}</h1>
          <p className="text-xs text-slate-500 mt-0.5">สกุลเงิน: {form.default_currency}</p>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4">
        {/* ข้อมูลส่วนตัว */}
        <SectionLabel icon={User} label="ข้อมูลส่วนตัว" />
        <div className="glass rounded-2xl overflow-hidden divide-y divide-white/5">
          <InputRow
            label="ชื่อเล่นในแอป"
            value={form.display_name}
            placeholder="เช่น นิว, บอส, แนน"
            onChange={v => setForm(f => ({ ...f, display_name: v }))}
          />
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-slate-400">สกุลเงินหลัก</span>
            <select
              value={form.default_currency}
              onChange={e => setForm(f => ({ ...f, default_currency: e.target.value }))}
              className="bg-transparent text-white text-sm text-right focus:outline-none"
            >
              {CURRENCIES.map(c => <option key={c} value={c} className="bg-slate-800">{c}</option>)}
            </select>
          </div>
        </div>

        {/* ข้อมูลรับเงิน */}
        <SectionLabel icon={CreditCard} label="ข้อมูลรับเงิน (สำหรับ Settle Up)" />
        <div className="glass rounded-2xl overflow-hidden divide-y divide-white/5">
          <InputRow
            label="เลขบัญชีธนาคาร"
            value={form.bank_account}
            placeholder="เช่น กสิกร 123-4-56789-0"
            onChange={v => setForm(f => ({ ...f, bank_account: v }))}
          />
          <InputRow
            label="พร้อมเพย์"
            value={form.promptpay}
            placeholder="เบอร์โทรหรือเลขบัตรประชาชน"
            onChange={v => setForm(f => ({ ...f, promptpay: v }))}
          />
        </div>
        <p className="text-xs text-slate-600 px-1">
          ข้อมูลนี้จะแสดงให้เพื่อนในทริปเห็น เพื่อคัดลอกโอนเงินคืนกันได้ง่าย
        </p>

        {/* Save button */}
        <button
          onClick={saveProfile}
          disabled={saving}
          className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-60"
        >
          {saving ? (
            <Loader2 size={18} className="animate-spin" />
          ) : saved ? (
            <><span className="text-lg">✅</span> บันทึกแล้ว!</>
          ) : (
            <><Save size={18} /> บันทึกข้อมูล</>
          )}
        </button>
      </div>

      {/* Account actions */}
      <div className="space-y-3">
        <SectionLabel icon={Shield} label="บัญชี" />
        <div className="glass rounded-2xl overflow-hidden divide-y divide-white/5">
          <button
            onClick={signOut}
            className="w-full px-4 py-4 flex items-center gap-3 active:bg-white/5 transition-colors"
          >
            <LogOut size={18} className="text-slate-400" />
            <span className="text-sm text-slate-300 flex-1 text-left">ออกจากระบบ</span>
            <ChevronRight size={16} className="text-slate-600" />
          </button>
          <button
            onClick={deleteAccount}
            className="w-full px-4 py-4 flex items-center gap-3 active:bg-red-500/10 transition-colors"
          >
            <Trash2 size={18} className="text-red-400" />
            <span className="text-sm text-red-400 flex-1 text-left">ลบบัญชีถาวร</span>
            <ChevronRight size={16} className="text-red-600" />
          </button>
        </div>
        <p className="text-xs text-slate-600 px-1 text-center">
          TripMate v1.0 • Zero-Budget PWA
        </p>
      </div>
    </div>
  )
}

function SectionLabel({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-2 px-1">
      <Icon size={14} className="text-indigo-400" />
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
    </div>
  )
}

function InputRow({ label, value, placeholder, onChange }: {
  label: string; value: string; placeholder?: string; onChange: (v: string) => void
}) {
  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <span className="text-sm text-slate-400 w-32 shrink-0">{label}</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-white text-sm placeholder-slate-600 focus:outline-none text-right"
      />
    </div>
  )
}
