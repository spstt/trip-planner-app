'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, MapPin, Receipt, CheckSquare, User } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const NAV_ITEMS = [
  { href: '/dashboard', icon: Home,        label: 'หน้าแรก' },
  { href: '/explore',  icon: MapPin,       label: 'สำรวจ' },
  { href: '/expenses', icon: Receipt,      label: 'บัญชี' },
  { href: '/packing',  icon: CheckSquare,  label: 'เตรียมของ' },
  { href: '/profile',  icon: User,         label: 'ฉัน' },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="relative h-dvh bg-slate-950">
      <main className="scroll-container">
        {children}
      </main>

      {/* iOS-style Bottom Navigation */}
      <nav className="bottom-nav">
        <div className="flex items-center justify-around px-2 py-2">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-2xl transition-all duration-200 min-w-[56px]',
                  isActive
                    ? 'text-indigo-400'
                    : 'text-slate-500 active:scale-90'
                )}
              >
                <div className={cn(
                  'relative flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200',
                  isActive && 'bg-indigo-500/20'
                )}>
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.5 : 1.8}
                    className={isActive ? 'text-indigo-400' : 'text-slate-500'}
                  />
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400" />
                  )}
                </div>
                <span className={cn(
                  'text-[10px] font-medium',
                  isActive ? 'text-indigo-400' : 'text-slate-600'
                )}>
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
