'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NewCasePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    id: '',
    client_name: '',
    case_name: '',
    court: '',
    division: '',
    case_number: '',
    accepted_at: '',
    hearing_at: '',
    next_consultation_at: '',
    fee: '',
    unpaid_fee: '',
    fee_paid: false,
  })

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.id.trim()) return
    setLoading(true)

    const { error } = await supabase.from('cases').insert({
      id: form.id.trim(),
      client_name: form.client_name || null,
      case_name: form.case_name || null,
      court: form.court || null,
      division: form.division || null,
      case_number: form.case_number || null,
      accepted_at: form.accepted_at || null,
      hearing_at: form.hearing_at || null,
      next_consultation_at: form.next_consultation_at || null,
      fee: form.fee ? parseFloat(form.fee) : null,
      unpaid_fee: form.unpaid_fee ? parseFloat(form.unpaid_fee) : null,
      fee_paid: form.fee_paid,
    })

    if (error) {
      if (error.code === '23505') alert('이미 존재하는 사건번호입니다.')
      else alert('저장에 실패했습니다.')
      setLoading(false)
      return
    }

    router.push(`/cases/${encodeURIComponent(form.id.trim())}`)
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">새 사건 등록</h1>
      <form onSubmit={handleSubmit} className="space-y-5">

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">사건 ID *</label>
          <input
            type="text"
            required
            value={form.id}
            onChange={(e) => set('id', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white font-mono"
            placeholder="예: 26-나01"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">의뢰인</label>
            <input type="text" value={form.client_name} onChange={(e) => set('client_name', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white" placeholder="홍길동" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">사건명</label>
            <input type="text" value={form.case_name} onChange={(e) => set('case_name', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white" placeholder="손해배상" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">관할</label>
            <input type="text" value={form.court} onChange={(e) => set('court', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white" placeholder="서울중앙지법" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">부</label>
            <input type="text" value={form.division} onChange={(e) => set('division', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white" placeholder="민사3부" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">사건번호</label>
            <input type="text" value={form.case_number} onChange={(e) => set('case_number', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white" placeholder="2026가합12345" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">수임일</label>
            <input type="date" value={form.accepted_at} onChange={(e) => set('accepted_at', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">기일</label>
            <input type="datetime-local" value={form.hearing_at} onChange={(e) => set('hearing_at', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">다음 상담 예정일</label>
          <input type="datetime-local" value={form.next_consultation_at} onChange={(e) => set('next_consultation_at', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white" />
        </div>

        <div className="grid grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">수임료 (원)</label>
            <input type="number" value={form.fee} onChange={(e) => set('fee', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white" placeholder="3000000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">미납금액 (원)</label>
            <input type="number" value={form.unpaid_fee} onChange={(e) => set('unpaid_fee', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white" placeholder="0" />
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer pb-2">
              <input type="checkbox" checked={form.fee_paid} onChange={(e) => set('fee_paid', e.target.checked)} className="w-4 h-4 rounded" />
              <span className="text-sm font-medium text-gray-700">수임료 완납</span>
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? '저장 중...' : '저장'}
          </button>
          <button type="button" onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 text-gray-600 rounded-md text-sm hover:bg-gray-50 transition-colors">
            취소
          </button>
        </div>
      </form>
    </div>
  )
}
