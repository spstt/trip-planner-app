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
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Calendar size={16} className="text-indigo-400" />
        <span className="text-sm font-medium text-slate-300">
          {format(start, 'd MMM', { locale: th })} – {format(end, 'd MMM yyyy', { locale: th })}
          <span className="text-slate-500 ml-1">({tripLength} วัน)</span>
        </span>
      </div>

      {hasStarted ? (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 font-semibold">ทริปเริ่มแล้ว! 🎉</span>
        </div>
      ) : (
        <div>
          <p className="text-xs text-slate-500 mb-2">นับถอยหลังสู่วันเดินทาง</p>
          <div className="flex gap-2">
            {[
              { val: days,  label: 'วัน' },
              { val: hours, label: 'ชั่วโมง' },
              { val: mins,  label: 'นาที' },
              { val: secs,  label: 'วินาที' },
            ].map(({ val, label }) => (
              <div key={label} className="flex-1 bg-slate-900 rounded-xl p-2 text-center">
                <div className="text-2xl font-bold text-white tabular-nums">
                  {String(val).padStart(2, '0')}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
