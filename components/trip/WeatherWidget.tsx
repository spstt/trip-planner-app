'use client'
import { useEffect, useState } from 'react'
import { fetchWeather, getWeatherIcon } from '@/lib/utils/weather'
import type { WeatherDay } from '@/types'
import { format, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'
import { CloudSun } from 'lucide-react'

interface Props {
  lat: number
  lng: number
  destination: string
}

export default function WeatherWidget({ lat, lng, destination }: Props) {
  const [weather, setWeather] = useState<WeatherDay[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWeather(lat, lng)
      .then(setWeather)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [lat, lng])

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <CloudSun size={16} className="text-amber-400" />
        <span className="text-sm font-medium text-slate-300">อากาศที่ {destination}</span>
        <span className="text-xs text-slate-600 ml-auto">7 วัน</span>
      </div>

      {loading ? (
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="shimmer flex-none w-14 h-20 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {weather.map(day => {
            const { icon } = getWeatherIcon(day.weatherCode)
            return (
              <div
                key={day.date}
                className="flex-none w-14 bg-slate-900/60 rounded-xl p-2 text-center space-y-1"
              >
                <p className="text-[10px] text-slate-500">
                  {format(parseISO(day.date), 'EEE', { locale: th })}
                </p>
                <span className="text-2xl">{icon}</span>
                <p className="text-xs font-semibold text-white">{day.tempMax}°</p>
                <p className="text-[10px] text-slate-500">{day.tempMin}°</p>
                {day.precipitationSum > 1 && (
                  <p className="text-[10px] text-blue-400">{day.precipitationSum.toFixed(0)}mm</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
