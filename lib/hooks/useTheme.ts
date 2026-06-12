'use client'
import { useEffect, useState } from 'react'

export type Theme = 'dark-slate' | 'warm-pastel' | 'jeju-sunlight' | 'matcha-latte'

const STORAGE_KEY = 'tripmate-theme'

const THEME_ATTRS: Record<Theme, string | null> = {
  'dark-slate':    null,
  'warm-pastel':   'warm-pastel',
  'jeju-sunlight': 'jeju-sunlight',
  'matcha-latte':  'matcha-latte',
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('dark-slate')

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null
    if (saved && saved in THEME_ATTRS) applyTheme(saved)
  }, [])

  function applyTheme(t: Theme) {
    setThemeState(t)
    localStorage.setItem(STORAGE_KEY, t)
    const attr = THEME_ATTRS[t]
    if (attr) {
      document.documentElement.setAttribute('data-theme', attr)
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }

  return { theme, setTheme: applyTheme }
}
