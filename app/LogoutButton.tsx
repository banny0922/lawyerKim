'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
    >
      로그아웃
    </button>
  )
}
