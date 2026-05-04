'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CaseHearing } from '@/lib/types'

const HEARING_TYPES = ['변론기일', '선고기일', '증거조사기일', '심문기일', '준비기일', '조정기일', '공판기일', '구속영장실질심사', '기타']

export default function HearingSection({ caseId }: { caseId: string }) {
  const supabase = createClient()
  const [hearings, setHearings] = useState<CaseHearing[]>([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ hearing_date: '', hearing_time: '', hearing_type: '변론기일', description: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('case_hearings').select('*').eq('case_id', caseId)
      .order('hearing_date', { ascending: true })
      .then(({ data }) => setHearings(data ?? []))
  }, [caseId])

  async function handleAdd() {
    if (!form.hearing_date) return
    setSaving(true)
    const { data } = await supabase.from('case_hearings').insert({
      case_id: caseId,
      hearing_date: form.hearing_date,
      hearing_time: form.hearing_time || null,
      hearing_type: form.hearing_type || null,
      description: form.description || null,
    }).select().single()
    if (data) setHearings(h => [...h, data].sort((a, b) => a.hearing_date.localeCompare(b.hearing_date)))
    setForm({ hearing_date: '', hearing_time: '', hearing_type: '변론기일', description: '' })
    setAdding(false)
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    await supabase.from('case_hearings').delete().eq('id', id)
    setHearings(h => h.filter(x => x.id !== id))
  }

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900">기일 목록</h2>
        <button onClick={() => setAdding(a => !a)}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          + 추가
        </button>
      </div>

      {adding && (
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">날짜 *</label>
              <input type="date" value={form.hearing_date} onChange={e => setForm(f => ({ ...f, hearing_date: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">시간</label>
              <input type="time" value={form.hearing_time} onChange={e => setForm(f => ({ ...f, hearing_time: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">기일 종류</label>
            <select value={form.hearing_type} onChange={e => setForm(f => ({ ...f, hearing_type: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
              {HEARING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">메모</label>
            <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="메모 (선택)" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving || !form.hearing_date}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? '저장 중...' : '저장'}
            </button>
            <button onClick={() => setAdding(false)}
              className="px-4 py-1.5 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors">
              취소
            </button>
          </div>
        </div>
      )}

      {hearings.length === 0 ? (
        <p className="text-sm text-gray-400 py-2">기일이 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {hearings.map(h => (
            <div key={h.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {h.hearing_date}{h.hearing_time ? ` ${h.hearing_time}` : ''}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {h.hearing_type && (
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{h.hearing_type}</span>
                  )}
                  {h.description && <span className="text-xs text-gray-400">{h.description}</span>}
                </div>
              </div>
              <button onClick={() => handleDelete(h.id)} className="text-xs text-gray-300 hover:text-red-400 flex-shrink-0 transition-colors">
                삭제
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
