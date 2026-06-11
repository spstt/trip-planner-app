'use client'
import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  type: ToastType
  message: string
}

// Global toast queue
let listeners: ((toasts: ToastItem[]) => void)[] = []
let toasts: ToastItem[] = []

export function toast(message: string, type: ToastType = 'success') {
  const item: ToastItem = { id: Math.random().toString(36).slice(2), type, message }
  toasts = [item, ...toasts].slice(0, 3)
  listeners.forEach(l => l([...toasts]))
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== item.id)
    listeners.forEach(l => l([...toasts]))
  }, 3000)
}

const ICONS = {
  success: CheckCircle,
  error:   XCircle,
  info:    AlertCircle,
}
const COLORS = {
  success: 'border-green-500/40 bg-green-500/10 text-green-400',
  error:   'border-red-500/40 bg-red-500/10 text-red-400',
  info:    'border-indigo-500/40 bg-indigo-500/10 text-indigo-400',
}

export function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    listeners.push(setItems)
    return () => { listeners = listeners.filter(l => l !== setItems) }
  }, [])

  if (!items.length) return null

  return (
    <div className="fixed top-safe left-4 right-4 z-[100] flex flex-col gap-2 pt-4 pointer-events-none">
      {items.map(item => {
        const Icon = ICONS[item.type]
        return (
          <div
            key={item.id}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-2xl border glass shadow-xl pointer-events-auto spring-enter',
              COLORS[item.type]
            )}
          >
            <Icon size={18} className="shrink-0" />
            <p className="text-sm font-medium flex-1">{item.message}</p>
          </div>
        )
      })}
    </div>
  )
}
