'use client'
import { useEffect, useState } from 'react'
import { differenceInSeconds, differenceInDays, parseISO, format } from 'date-fns'
import { th } from 'date-fns/locale'
import { Calendar } from 'lucide-react'

interface Props {
  startDate: string
  endDate: string
}

export default function CountdownTimer({ startDate, endDate }: Props) {
  const [seconds, setSeconds] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const target = parseISO(startDate)
    function update() {
      setSeconds(Math.max(0, differenceInSeconds(target, new Date())))
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [startDate])

  const start = parseISO(startDate)
  const end = parseISO(endDate)
  const tripLength = differenceInDays(end, start) + 1
  const totalDays = differenceInDays(start, new Date()) + 1
  const daysLeft = Math.max(0, Math.ceil(seconds / 86400))
  const progress = totalDays > 0
    ? Math.min(1, Math.max(0, (totalDays - daysLeft) / totalDays))
    : 1

  const days  = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const mins  = Math.floor((seconds % 3600) / 60)
  const secs  = seconds % 60
  const hasStarted = seconds === 0

  if (!mounted) return null

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--s0)', border: '1px solid var(--b0)' }}>

      {/* Date bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--b0)' }}>
        <Calendar size={14} className="text-indigo-400 shrink-0" />
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--t1)' }}>
          {format(start, 'd MMM', { locale: th })} – {format(end, 'd MMM yyyy', { locale: th })}
        </span>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold"
          style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
          {tripLength} วัน
        </span>
      </div>

      {hasStarted ? (
        /* Trip started */
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 font-bold text-sm">ทริปเริ่มแล้ว! 🎉</span>
        </div>
      ) : (
        <>
          {/* Airplane progress track */}
          <div className="px-4 pt-4 pb-2">
            <div className="relative h-8 flex items-center">
              {/* Dashed track */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center px-1">
                <div className="flex-1" style={{
                  height: 2,
                  backgroundImage: 'repeating-linear-gradient(90deg, #6366f133 0px, #6366f133 6px, transparent 6px, transparent 12px)',
                }} />
              </div>

              {/* Start dot */}
              <div className="absolute left-0 w-3 h-3 rounded-full border-2 z-10"
                style={{ background: 'var(--s2)', borderColor: '#6366f1' }} />

              {/* End flag */}
              <div className="absolute right-0 text-base z-10" style={{ lineHeight: 1 }}>🏖️</div>

              {/* Airplane — moves left→right based on progress */}
              <div
                className="absolute z-20 transition-all duration-1000"
                style={{
                  left: `calc(${progress * 100}% - 12px)`,
                  filter: 'drop-shadow(0 2px 6px rgba(99,102,241,0.6))',
                  animation: 'planeBob 2s ease-in-out infinite',
                }}
              >
                <span style={{ fontSize: 22 }}>✈️</span>
              </div>
            </div>

            {/* Label */}
            <div className="flex justify-between mt-1">
              <span style={{ fontSize: 10, color: 'var(--t3)' }}>วันนี้</span>
              <span style={{ fontSize: 10, color: 'var(--t3)' }}>วันเดินทาง</span>
            </div>
          </div>

          {/* Countdown digits */}
          <div className="px-3 pb-4">
            <p className="text-[11px] font-medium px-1 mb-2" style={{ color: 'var(--t3)' }}>
              นับถอยหลังสู่วันเดินทาง
            </p>
            <div className="flex gap-2">
              {[
                { val: days,  label: 'วัน' },
                { val: hours, label: 'ชม.' },
                { val: mins,  label: 'นาที' },
                { val: secs,  label: 'วิ' },
              ].map(({ val, label }) => (
                <div key={label} className="flex-1 rounded-xl py-2.5 text-center"
                  style={{ background: 'var(--s1)' }}>
                  <div className="text-[22px] font-black tabular-nums leading-none"
                    style={{ color: 'var(--t1)' }}>
                    {String(val).padStart(2, '0')}
                  </div>
                  <div className="text-[10px] mt-1 font-medium" style={{ color: 'var(--t3)' }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes planeBob {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25%       { transform: translateY(-4px) rotate(-3deg); }
          75%       { transform: translateY(2px) rotate(2deg); }
        }
      `}</style>
    </div>
  )
}
