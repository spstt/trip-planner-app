import type { WeatherDay } from '@/types'

// WMO Weather interpretation codes → icon + label
const WEATHER_CODES: Record<number, { icon: string; label: string }> = {
  0: { icon: '☀️', label: 'แดดจัด' },
  1: { icon: '🌤️', label: 'แดดเล็กน้อย' },
  2: { icon: '⛅', label: 'มีเมฆ' },
  3: { icon: '☁️', label: 'ครึ้ม' },
  45: { icon: '🌫️', label: 'หมอก' },
  48: { icon: '🌫️', label: 'หมอกเกาะน้ำแข็ง' },
  51: { icon: '🌦️', label: 'ฝนปรอยๆ' },
  61: { icon: '🌧️', label: 'ฝนตก' },
  63: { icon: '🌧️', label: 'ฝนตกหนัก' },
  65: { icon: '🌧️', label: 'ฝนตกหนักมาก' },
  71: { icon: '❄️', label: 'หิมะตก' },
  80: { icon: '🌦️', label: 'ฝนช่วงสั้น' },
  95: { icon: '⛈️', label: 'พายุฝนฟ้าคะนอง' },
  96: { icon: '⛈️', label: 'พายุลูกเห็บ' },
}

export function getWeatherIcon(code: number) {
  return WEATHER_CODES[code] ?? { icon: '🌡️', label: 'ไม่ทราบ' }
}

export async function fetchWeather(lat: number, lng: number): Promise<WeatherDay[]> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', lat.toString())
  url.searchParams.set('longitude', lng.toString())
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum')
  url.searchParams.set('timezone', 'auto')
  url.searchParams.set('forecast_days', '7')

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } })
  if (!res.ok) throw new Error('Weather fetch failed')

  const data = await res.json()
  const { time, temperature_2m_max, temperature_2m_min, weathercode, precipitation_sum } = data.daily

  return time.map((date: string, i: number) => ({
    date,
    tempMax: Math.round(temperature_2m_max[i]),
    tempMin: Math.round(temperature_2m_min[i]),
    weatherCode: weathercode[i],
    precipitationSum: precipitation_sum[i],
  }))
}
