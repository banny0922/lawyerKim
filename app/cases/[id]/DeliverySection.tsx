'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CaseDelivery } from '@/lib/types'

export default function DeliverySection({ caseId }: { caseId: string }) {
  const supabase = createClient()
  const [deliveries, setDeliveries] = useState<CaseDelivery[]>([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ delivered_at: '', document_name: '', sender: '', recipient: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('case_deliveries').select('*').eq('case_id', caseId)
      .order('delivered_at', { ascending: false })
      .then(({ data }) => setDeliveries(data ?? []))
  }, [caseId])

  async function handleAdd() {
    if (!form.document_name) return
    setSaving(true)
    const { data } = await supabase.from('case_deliveries').insert({
      case_id: caseId,
      delivered_at: form.delivered_at || null,
      document_name: form.document_name,
      sender: form.sender || null,
      recipient: form.recipient || null,
    }).select().single()
    if (data) setDeliveries(d => [data, ...d])
    setForm({ delivered_at: '', document_name: '', sender: '', recipient: '' })
    setAdding(false)
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    await supabase.from('case_deliveries').delete().eq('id', id)
    setDeliveries(d => d.filter(x => x.id !== id))
  }

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900">송달 기록</h2>
        <button onClick={() => setAdding(a => !a)}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          + 추가
        </button>
      </div>

      {adding && (
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">송달일</label>
              <input type="date" value={form.delivered_at} onChange={e => setForm(f => ({ ...f, delivered_at: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">서류명 *</label>
            <input type="text" value={form.document_name} onChange={e => setForm(f => ({ ...f, document_name: e.target.value }))}
              placeholder="소장, 결정문, 판결문, 공소장..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">발송인</label>
              <input type="text" value={form.sender} onChange={e => setForm(f => ({ ...f, sender: e.target.value }))}
                placeholder="법원/검찰..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">수신인</label>
              <input type="text" value={form.recipient} onChange={e => setForm(f => ({ ...f, recipient: e.target.value }))}
                placeholder="의뢰인/변호인..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving || !form.document_name}
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

      {deliveries.length === 0 ? (
        <p className="text-sm text-gray-400 py-2">송달 기록이 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {deliveries.map(d => (
            <div key={d.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-800">{d.document_name}</p>
                <div className="flex items-center gap-2 mt-1">
                  {d.delivered_at && <span className="text-xs text-gray-400">{d.delivered_at}</span>}
                  {(d.sender || d.recipient) && (
                    <span className="text-xs text-gray-500">
                      {[d.sender, d.recipient].filter(Boolean).join(' → ')}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => handleDelete(d.id)} className="text-xs text-gray-300 hover:text-red-400 flex-shrink-0 transition-colors">
                삭제
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
