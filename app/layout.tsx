import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TripMate — วางแผนเที่ยวกับเพื่อน',
  description: 'วางแผนท่องเที่ยวกลุ่มแบบ Real-time ดูตั๋วออฟไลน์ได้',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico',       sizes: 'any' },
      { url: '/favicon.svg',       type: 'image/svg+xml' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TripMate',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#6366f1',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        {/* iOS PWA — full-screen standalone mode */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="TripMate" />

        {/* Apple touch icon — home screen */}
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

        {/* Standard favicons */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
        <link rel="shortcut icon" href="/favicon.ico" />

        {/* Web app manifest */}
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${inter.className} antialiased`} style={{ background: 'var(--bg)', color: 'var(--t1)' }}>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js'))}`,
          }}
        />
      </body>
    </html>
  )
}
