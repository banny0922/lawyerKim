'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NewCasePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [todos, setTodos] = useState<{ due_date: string; title: string }[]>([])
  const [courts, setCourts] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    supabase.from('courts').select('id, name').order('name').then(({ data }) => setCourts(data ?? []))
  }, [])

  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    id: '',
    client_name: '',
    case_name: '',
    court: '',
    division: '',
    case_number: '',
    accepted_at: today,
    hearing_date: '',
    hearing_time: '09:00',
    next_consultation_date: '',
    next_consultation_time: '09:00',
    fee: '',
    unpaid_fee: '',
    fee_paid: false,
  })

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.id.trim()) return
    setLoading(true)

    const hearing_at = form.hearing_date ? `${form.hearing_date}T${form.hearing_time}:00` : null
    const next_consultation_at = form.next_consultation_date ? `${form.next_consultation_date}T${form.next_consultation_time}:00` : null

    const { error } = await supabase.from('cases').insert({
      id: form.id.trim(),
      client_name: form.client_name || null,
      case_name: form.case_name || null,
      court: form.court || null,
      division: form.division || null,
      case_number: form.case_number || null,
      accepted_at: form.accepted_at || null,
      hearing_at,
      next_consultation_at,
      fee: form.fee ? parseFloat(form.fee) : null,
      unpaid_fee: form.unpaid_fee ? parseFloat(form.unpaid_fee) : null,
      fee_paid: form.fee_paid,
    })

    if (error) {
      if (error.code === '23505') alert('이미 존재하는 사건 ID입니다.')
      else alert('저장에 실패했습니다.')
      setLoading(false)
      return
    }

    const caseId = form.id.trim()
    const validTodos = todos.filter(t => t.title.trim())
    if (validTodos.length > 0) {
      await supabase.from('todos').insert(
        validTodos.map(t => ({ case_id: caseId, title: t.title.trim(), due_date: t.due_date || null }))
      )
    }

    router.push(`/cases/${encodeURIComponent(caseId)}`)
  }

  return (
    <div className="w-full max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900 mb-6">새 사건 등록</h1>
      <form onSubmit={handleSubmit} className="space-y-4">

        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">기본 정보</p>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
              사건 ID <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={form.id}
              onChange={(e) => set('id', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white font-mono"
              placeholder="예: 26-나01"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">의뢰인</label>
              <input type="text" value={form.client_name} onChange={(e) => set('client_name', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white" placeholder="홍길동" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">사건명</label>
              <input type="text" value={form.case_name} onChange={(e) => set('case_name', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white" placeholder="손해배상" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">관할</label>
              <select value={form.court} onChange={(e) => set('court', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white text-gray-700">
                <option value="">선택</option>
                {courts.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">부</label>
              <input type="text" value={form.division} onChange={(e) => set('division', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white" placeholder="민사3부" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">사건번호</label>
              <input type="text" value={form.case_number} onChange={(e) => set('case_number', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white" placeholder="2026가합12345" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">수임일</label>
              <input type="date" value={form.accepted_at} onChange={(e) => set('accepted_at', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">수임료</p>
          <div className="grid grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">수임료 (원)</label>
              <input type="number" value={form.fee} onChange={(e) => set('fee', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white" placeholder="3000000" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">미납금액 (원)</label>
              <input type="number" value={form.unpaid_fee} onChange={(e) => set('unpaid_fee', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white" placeholder="0" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer pb-2">
              <input type="checkbox" checked={form.fee_paid} onChange={(e) => set('fee_paid', e.target.checked)} className="w-4 h-4 accent-blue-600" />
              <span className="text-sm text-gray-700">완납</span>
            </label>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">해야할일</p>
            <button type="button"
              onClick={() => setTodos(t => [...t, { due_date: '', title: '' }])}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ 추가</button>
          </div>
          <div className="flex gap-1.5 items-center">
            <span className="text-xs text-gray-400 w-16 flex-shrink-0">기일</span>
            <input type="date" value={form.hearing_date} onChange={(e) => set('hearing_date', e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white" />
            <select value={form.hearing_time.split(':')[0]} onChange={(e) => set('hearing_time', `${e.target.value}:${form.hearing_time.split(':')[1]}`)}
              className="w-16 border border-gray-200 rounded-lg px-1 py-1.5 text-sm bg-white">
              {Array.from({length: 24}, (_, i) => String(i).padStart(2,'0')).map(h => <option key={h} value={h}>{h}시</option>)}
            </select>
            <select value={form.hearing_time.split(':')[1]} onChange={(e) => set('hearing_time', `${form.hearing_time.split(':')[0]}:${e.target.value}`)}
              className="w-16 border border-gray-200 rounded-lg px-1 py-1.5 text-sm bg-white">
              <option value="00">00분</option>
              <option value="30">30분</option>
            </select>
          </div>
          <div className="flex gap-1.5 items-center">
            <span className="text-xs text-gray-400 w-16 flex-shrink-0">다음상담</span>
            <input type="date" value={form.next_consultation_date} onChange={(e) => set('next_consultation_date', e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white" />
            <select value={form.next_consultation_time.split(':')[0]} onChange={(e) => set('next_consultation_time', `${e.target.value}:${form.next_consultation_time.split(':')[1]}`)}
              className="w-16 border border-gray-200 rounded-lg px-1 py-1.5 text-sm bg-white">
              {Array.from({length: 24}, (_, i) => String(i).padStart(2,'0')).map(h => <option key={h} value={h}>{h}시</option>)}
            </select>
            <select value={form.next_consultation_time.split(':')[1]} onChange={(e) => set('next_consultation_time', `${form.next_consultation_time.split(':')[0]}:${e.target.value}`)}
              className="w-16 border border-gray-200 rounded-lg px-1 py-1.5 text-sm bg-white">
              <option value="00">00분</option>
              <option value="30">30분</option>
            </select>
          </div>
          {todos.map((todo, i) => (
            <div key={i} className="flex gap-1.5 items-center">
              <span className="text-xs text-gray-400 w-16 flex-shrink-0">기타</span>
              <input type="date" value={todo.due_date}
                onChange={(e) => setTodos(t => t.map((x, j) => j === i ? { ...x, due_date: e.target.value } : x))}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white" />
              <input type="text" value={todo.title} placeholder="할일 내용"
                onChange={(e) => setTodos(t => t.map((x, j) => j === i ? { ...x, title: e.target.value } : x))}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white" />
              <button type="button" onClick={() => setTodos(t => t.filter((_, j) => j !== i))}
                className="text-gray-300 hover:text-red-400 text-base px-1 leading-none transition-colors">✕</button>
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={loading}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? '저장 중...' : '저장'}
          </button>
          <button type="button" onClick={() => router.back()}
            className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors">
            취소
          </button>
        </div>
      </form>
    </div>
  )
}
