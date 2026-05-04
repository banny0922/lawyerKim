'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CaseDocument } from '@/lib/types'

export default function DocumentSection({ caseId }: { caseId: string }) {
  const supabase = createClient()
  const [documents, setDocuments] = useState<CaseDocument[]>([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ submitted_at: '', document_name: '', submitter: '' })
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('case_documents').select('*').eq('case_id', caseId)
      .order('submitted_at', { ascending: false })
      .then(({ data }) => setDocuments(data ?? []))
  }, [caseId])

  async function handleAdd() {
    if (!form.document_name) return
    setSaving(true)

    let file_url: string | null = null
    if (file) {
      const path = `${caseId}/${Date.now()}_${file.name}`
      const { data: uploaded, error } = await supabase.storage.from('case-files').upload(path, file)
      if (uploaded && !error) {
        const { data: urlData } = supabase.storage.from('case-files').getPublicUrl(path)
        file_url = urlData.publicUrl
      }
    }

    const { data } = await supabase.from('case_documents').insert({
      case_id: caseId,
      submitted_at: form.submitted_at || null,
      document_name: form.document_name,
      submitter: form.submitter || null,
      file_url,
    }).select().single()

    if (data) setDocuments(d => [data, ...d])
    setForm({ submitted_at: '', document_name: '', submitter: '' })
    setFile(null)
    setAdding(false)
    setSaving(false)
  }

  async function handleDelete(id: string, fileUrl: string | null) {
    if (!confirm('삭제하시겠습니까?')) return
    if (fileUrl) {
      const path = fileUrl.split('/case-files/')[1]
      if (path) await supabase.storage.from('case-files').remove([path])
    }
    await supabase.from('case_documents').delete().eq('id', id)
    setDocuments(d => d.filter(x => x.id !== id))
  }

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900">서면 제출 목록</h2>
        <button onClick={() => setAdding(a => !a)}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          + 추가
        </button>
      </div>

      {adding && (
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">제출일</label>
              <input type="date" value={form.submitted_at} onChange={e => setForm(f => ({ ...f, submitted_at: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">제출자</label>
              <input type="text" value={form.submitter} onChange={e => setForm(f => ({ ...f, submitter: e.target.value }))}
                placeholder="원고/피고/검사/피고인" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">서면명 *</label>
            <input type="text" value={form.document_name} onChange={e => setForm(f => ({ ...f, document_name: e.target.value }))}
              placeholder="준비서면, 고소장, 변호인의견서..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">파일 첨부</label>
            <input type="file" accept=".pdf,.doc,.docx,.hwp,.hwpx"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-600 hover:file:bg-gray-200" />
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

      {documents.length === 0 ? (
        <p className="text-sm text-gray-400 py-2">서면이 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {documents.map(d => (
            <div key={d.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-800">{d.document_name}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {d.submitted_at && <span className="text-xs text-gray-400">{d.submitted_at}</span>}
                  {d.submitter && <span className="text-xs text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">{d.submitter}</span>}
                  {d.file_url && (
                    <a href={d.file_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                      파일 보기
                    </a>
                  )}
                </div>
              </div>
              <button onClick={() => handleDelete(d.id, d.file_url)} className="text-xs text-gray-300 hover:text-red-400 flex-shrink-0 transition-colors">
                삭제
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
