import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import Header from './Header'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

export const metadata: Metadata = {
  title: '사건 관리',
  description: '변호사 사건 및 상담 관리',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${geist.variable} antialiased`}>
      <body className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
        <Header />
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 flex flex-col">{children}</main>
      </body>
    </html>
  )
}
