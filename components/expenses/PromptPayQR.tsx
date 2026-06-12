'use client'
import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import generatePayload from 'promptpay-qr'
import { X, Download } from 'lucide-react'
import type { Profile } from '@/types'
import { formatCurrency } from '@/lib/utils/debt'

interface Props {
  toProfile: Profile
  amount: number
  onClose: () => void
}

export default function PromptPayQR({ toProfile, amount, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!toProfile.promptpay) { setError('ผู้รับไม่ได้กรอกเลขพร้อมเพย์'); return }

    try {
      const payload = generatePayload(toProfile.promptpay, { amount })
      QRCode.toCanvas(canvasRef.current!, payload, {
        width: 280,
        margin: 2,
        color: { dark: '#1e293b', light: '#f8fafc' },
      })
    } catch {
      setError('สร้าง QR ไม่สำเร็จ')
    }
  }, [toProfile.promptpay, amount])

  function saveQR() {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `promptpay-${toProfile.display_name}-${amount}thb.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full bottom-sheet spring-enter">
        <div className="sheet-handle" />
        <div className="px-5 pb-8 pt-2 space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--t1)' }}>
                โอนพร้อมเพย์
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--t3)' }}>
                ให้ {toProfile.display_name} · {formatCurrency(amount)}
              </p>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'var(--s2)' }}>
              <X size={16} style={{ color: 'var(--t2)' }} />
            </button>
          </div>

          {error ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-2">😢</p>
              <p className="text-sm" style={{ color: 'var(--t3)' }}>{error}</p>
            </div>
          ) : (
            <>
              {/* QR */}
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-2xl overflow-hidden p-3 shadow-xl"
                  style={{ background: '#f8fafc' }}>
                  <canvas ref={canvasRef} />
                </div>

                <div className="text-center">
                  <p className="text-xs" style={{ color: 'var(--t3)' }}>พร้อมเพย์</p>
                  <p className="font-semibold text-sm mt-0.5" style={{ color: 'var(--t1)' }}>
                    {toProfile.promptpay}
                  </p>
                </div>

                {/* Amount badge */}
                <div className="px-4 py-2 rounded-full"
                  style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
                  <p className="text-lg font-black" style={{ color: 'var(--indigo)' }}>
                    {formatCurrency(amount)}
                  </p>
                </div>
              </div>

              {/* Save button */}
              <button
                onClick={saveQR}
                className="btn-primary pressable w-full flex items-center justify-center gap-2">
                <Download size={16} />
                บันทึกรูป QR Code
              </button>

              <p className="text-center text-xs" style={{ color: 'var(--t3)' }}>
                เปิดแอปธนาคาร → สแกน QR → ยอดเงินจะกรอกอัตโนมัติ
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
