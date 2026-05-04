'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LogoutButton from './LogoutButton'

export default function Header() {
  const pathname = usePathname()
  if (pathname === '/login' || pathname === '/signup') return null

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
          </div>
          <span className="font-bold text-gray-900 text-base">사건 관리</span>
        </Link>
        <nav className="flex items-center gap-1">
          <NavLink href="/calendar" active={pathname.startsWith('/calendar')}>캘린더</NavLink>
          <NavLink href="/settlements" active={pathname.startsWith('/settlements')}>정산</NavLink>
          <NavLink href="/settings" active={pathname.startsWith('/settings')}>설정</NavLink>
          <div className="w-px h-4 bg-gray-200 mx-1" />
          <Link
            href="/cases/new"
            className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            + 새 사건
          </Link>
          <LogoutButton />
        </nav>
      </div>
    </header>
  )
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
        active
          ? 'bg-gray-100 text-gray-900 font-medium'
          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      {children}
    </Link>
  )
}
