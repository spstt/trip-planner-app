'use client'
import { useEffect, useState } from 'react'

export type Theme = 'dark-slate' | 'warm-pastel'

const STORAGE_KEY = 'tripmate-theme'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('dark-slate')

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null
    if (saved === 'warm-pastel') applyTheme('warm-pastel')
  }, [])

  function applyTheme(t: Theme) {
    setThemeState(t)
    localStorage.setItem(STORAGE_KEY, t)
    if (t === 'warm-pastel') {
      document.documentElement.setAttribute('data-theme', 'warm-pastel')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }

  return { theme, setTheme: applyTheme }
}
