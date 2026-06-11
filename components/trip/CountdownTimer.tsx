'use client'
import { useEffect, useState } from 'react'
import { differenceInSeconds, parseISO, format, differenceInDays } from 'date-fns'
import { th } from 'date-fns/locale'
import { Calendar } from 'lucide-react'

interface Props {
  startDate: string
  endDate: string
}

export default function CountdownTimer({ startDate, endDate }: Props) {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const target = parseISO(startDate)
    function update() {
      const diff = differenceInSeconds(target, new Date())
      setSeconds(Math.max(0, diff))
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [startDate])

  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  const start = parseISO(startDate)
  const end = parseISO(endDate)
  const tripLength = differenceInDays(end, start) + 1
  const hasStarted = seconds === 0

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
      {/* Date bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <Calendar size={14} className="text-indigo-400 shrink-0" />
        <span className="text-sm font-medium text-white">
          {format(start, 'd MMM', { locale: th })} – {format(end, 'd MMM yyyy', { locale: th })}
        </span>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold"
          style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
          {tripLength} วัน
        </span>
      </div>

      {/* Countdown */}
      {hasStarted ? (
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 font-bold">ทริปเริ่มแล้ว! 🎉</span>
        </div>
      ) : (
        <div className="px-3 py-3">
          <p className="text-[11px] font-medium px-1 mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
            นับถอยหลังสู่วันเดินทาง
          </p>
          <div className="flex gap-2">
            {[
              { val: days,  label: 'วัน' },
              { val: hours, label: 'ชั่วโมง' },
              { val: mins,  label: 'นาที' },
              { val: secs,  label: 'วินาที' },
            ].map(({ val, label }) => (
              <div key={label} className="flex-1 rounded-xl py-2.5 text-center"
                style={{ background: 'var(--surface-3)' }}>
                <div className="text-[22px] font-black text-white tabular-nums leading-none">
                  {String(val).padStart(2, '0')}
                </div>
                <div className="text-[10px] mt-1 font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
