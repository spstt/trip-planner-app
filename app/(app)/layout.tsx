'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Compass, Package, User } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { ToastContainer } from '@/components/ui/Toast'

const NAV_ITEMS = [
  { href: '/dashboard', icon: Home,    label: 'ทริป' },
  { href: '/explore',   icon: Compass, label: 'สำรวจ' },
  { href: '/packing',   icon: Package, label: 'เตรียมของ' },
  { href: '/profile',   icon: User,    label: 'ฉัน' },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isInsideTrip = pathname.includes('/trips/')

  return (
    <div className="relative h-dvh" style={{ background: 'var(--surface)' }}>
      <ToastContainer />
      <main className="scroll-container">
        {children}
      </main>

      {/* Hide bottom nav when inside a trip (trip layout has its own nav) */}
      {!isInsideTrip && (
        <nav className="bottom-nav">
          <div className="flex items-center justify-around px-6 py-1.5">
            {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
              const isActive = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex flex-col items-center gap-1 min-w-[56px] py-1.5 relative"
                >
                  {/* Pill background for active */}
                  <div className={cn(
                    'w-12 h-8 rounded-2xl flex items-center justify-center transition-all duration-300',
                    isActive
                      ? 'bg-indigo-500/20'
                      : 'bg-transparent'
                  )}>
                    <Icon
                      size={21}
                      strokeWidth={isActive ? 2.5 : 1.7}
                      className={cn(
                        'transition-all duration-200',
                        isActive ? 'text-indigo-400' : 'text-slate-500'
                      )}
                    />
                  </div>
                  <span className={cn(
                    'text-[10px] font-medium transition-colors duration-200 leading-none',
                    isActive ? 'text-indigo-400' : 'text-slate-600'
                  )}>
                    {label}
                  </span>
                </Link>
              )
            })}
          </div>
        </nav>
      )}
    </div>
  )
}
