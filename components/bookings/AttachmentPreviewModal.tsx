'use client'
import { useEffect, useState } from 'react'
import { X, Download, ZoomIn, ZoomOut, RotateCw, Loader2 } from 'lucide-react'
import type { BookingAttachment } from '@/types'

interface Props {
  attachment: BookingAttachment
  signedUrl: string
  onClose: () => void
}

export default function AttachmentPreviewModal({ attachment, signedUrl, onClose }: Props) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [imgLoaded, setImgLoaded] = useState(false)
  const isImage = attachment.file_type.startsWith('image/')
  const isPdf   = attachment.file_type === 'application/pdf'

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function download() {
    const a = document.createElement('a')
    a.href = signedUrl
    a.download = attachment.file_name
    a.click()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(16px)' }}
      onClick={onClose}
    >
      {/* Top toolbar */}
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* File info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{attachment.file_name}</p>
          {attachment.file_size_bytes && (
            <p className="text-[11px] text-white/40 mt-0.5">
              {(attachment.file_size_bytes / 1024).toFixed(0)} KB
            </p>
          )}
        </div>

        {/* Controls — images only */}
        {isImage && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)))}
              className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              <ZoomOut size={16} className="text-white/70" />
            </button>
            <span className="text-xs font-mono text-white/50 w-9 text-center">
              {(zoom * 100).toFixed(0)}%
            </span>
            <button
              onClick={() => setZoom(z => Math.min(4, +(z + 0.25).toFixed(2)))}
              className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              <ZoomIn size={16} className="text-white/70" />
            </button>
            <button
              onClick={() => setRotation(r => (r + 90) % 360)}
              className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              <RotateCw size={16} className="text-white/70" />
            </button>
          </div>
        )}

        {/* Download */}
        <button
          onClick={download}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: 'rgba(99,102,241,0.25)' }}
        >
          <Download size={16} className="text-indigo-300" />
        </button>

        {/* Close */}
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        >
          <X size={18} className="text-white/70" />
        </button>
      </div>

      {/* Content area */}
      <div
        className="flex-1 overflow-auto flex items-center justify-center p-4"
        onClick={e => e.stopPropagation()}
        style={{ minHeight: 0 }}
      >
        {isImage ? (
          <div className="relative">
            {!imgLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 size={28} className="text-white/30 animate-spin" />
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={signedUrl}
              alt={attachment.file_name}
              onLoad={() => setImgLoaded(true)}
              style={{
                maxWidth: '100%',
                maxHeight: 'calc(100vh - 120px)',
                objectFit: 'contain',
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
                transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                borderRadius: 12,
                boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
                opacity: imgLoaded ? 1 : 0,
              }}
            />
          </div>
        ) : isPdf ? (
          <iframe
            src={signedUrl}
            title={attachment.file_name}
            className="w-full rounded-xl"
            style={{
              height: 'calc(100vh - 130px)',
              border: 'none',
              background: 'white',
              borderRadius: 12,
              boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            }}
          />
        ) : (
          /* Unsupported file type */
          <div className="text-center space-y-4">
            <div className="text-6xl">📎</div>
            <p className="text-white/60 text-sm">ไม่สามารถพรีวิวไฟล์ประเภทนี้ได้</p>
            <button
              onClick={download}
              className="px-5 py-2.5 rounded-2xl text-sm font-semibold active:scale-95 transition-transform"
              style={{ background: '#6366f1', color: 'white' }}
            >
              ดาวน์โหลดไฟล์
            </button>
          </div>
        )}
      </div>

      {/* Tap-outside hint */}
      <p className="text-center text-[11px] text-white/20 pb-safe pb-4 shrink-0">
        แตะนอกกรอบเพื่อปิด
      </p>
    </div>
  )
}
