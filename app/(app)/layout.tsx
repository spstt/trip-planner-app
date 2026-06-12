'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Compass, Package, User } from 'lucide-react'
import { ToastContainer } from '@/components/ui/Toast'

const NAV = [
  { href: '/dashboard', icon: Home,    label: 'ทริป' },
  { href: '/explore',   icon: Compass, label: 'สำรวจ' },
  { href: '/packing',   icon: Package, label: 'เตรียมของ' },
  { href: '/profile',   icon: User,    label: 'ฉัน' },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const insideTrip = pathname.includes('/trips/')

  return (
    <div style={{ position: 'relative', height: '100dvh', background: 'var(--bg)' }}>
      <ToastContainer />

      <main className="scroll-container">{children}</main>

      {!insideTrip && (
        <nav className="bottom-nav">
          <div style={{ display: 'flex', alignItems: 'stretch', padding: '0 8px', paddingBottom: 0 }}>
            {NAV.map(({ href, icon: Icon, label }) => {
              const active = pathname === href
              return (
                <Link key={href} href={href} style={{ flex: 1, textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0 10px', gap: 4, position: 'relative' }}>
                  {/* Active pill */}
                  {active && (
                    <div style={{
                      position: 'absolute', top: 6,
                      width: 44, height: 32, borderRadius: 99,
                      background: 'var(--indigo-glow)',
                    }} />
                  )}
                  <Icon
                    size={22}
                    strokeWidth={active ? 2.5 : 2.0}
                    color={active ? 'var(--indigo)' : 'var(--t2)'}
                    style={{ position: 'relative', zIndex: 1, transition: 'all 0.2s ease' }}
                  />
                  <span style={{
                    fontSize: 10, fontWeight: active ? 700 : 500,
                    color: active ? 'var(--indigo)' : 'var(--t2)',
                    letterSpacing: '-0.01em',
                    transition: 'color 0.2s ease',
                  }}>{label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      )}
    </div>
  )
}
