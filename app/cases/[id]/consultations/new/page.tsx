'use client'

import { use, useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ConsultationType } from '@/lib/types'

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, '0')
  const m = i % 2 === 0 ? '00' : '30'
  return `${h}:${m}`
})

function NewConsultationForm({ caseId }: { caseId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const recordType = searchParams.get('type') === 'progress' ? 'progress' : 'consultation'
  const supabase = createClient()

  const [consultationTypes, setConsultationTypes] = useState<ConsultationType[]>([])
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState<File[]>([])

  const now = new Date()
  const [form, setForm] = useState({
    consultation_type_id: '',
    consulted_date: now.toISOString().split('T')[0],
    consulted_time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes() < 30 ? '00' : '30'}`,
    content: '',
    client_request: '',
    related_laws: '',
    legal_opinion: '',
    recommendation: '',
  })

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    supabase.from('consultation_types').select('*').order('name').then(({ data }) => {
      setConsultationTypes(data ?? [])
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const consulted_at = form.consulted_date ? `${form.consulted_date}T${form.consulted_time}:00` : null

    const { data: consultation, error } = await supabase
      .from('consultations')
      .insert({
        case_id: caseId,
        consultation_type_id: form.consultation_type_id || null,
        consulted_at,
        content: form.content || null,
        client_request: form.client_request || null,
        related_laws: form.related_laws || null,
        legal_opinion: form.legal_opinion || null,
        recommendation: form.recommendation || null,
        record_type: recordType,
      })
      .select()
      .single()

    if (error || !consultation) {
      alert('저장에 실패했습니다.')
      setLoading(false)
      return
    }

    for (const file of files) {
      const filePath = `${consultation.id}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('consultation-files')
        .upload(filePath, file)
      if (!uploadError) {
        await supabase.from('consultation_files').insert({
          consultation_id: consultation.id,
          file_name: file.name,
          file_url: filePath,
        })
      }
    }

    router.push(`/cases/${encodeURIComponent(caseId)}/consultations/${consultation.id}`)
  }

  const pageTitle = recordType === 'progress' ? '진행기록 추가' : '상담기록 추가'

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700">← 뒤로</button>
        <h1 className="text-xl font-semibold text-gray-900">{pageTitle}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">날짜</label>
            <input type="date" value={form.consulted_date} onChange={(e) => set('consulted_date', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">시간</label>
            <select value={form.consulted_time} onChange={(e) => set('consulted_time', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white">
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">상담형태</label>
          <select value={form.consultation_type_id} onChange={(e) => set('consultation_type_id', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white">
            <option value="">선택 안함</option>
            {consultationTypes.map((ct) => (
              <option key={ct.id} value={ct.id}>{ct.name}</option>
            ))}
          </select>
        </div>

        <Field label="내용" value={form.content} onChange={(v) => set('content', v)} rows={6} />
        <Field label="의뢰인 요청사항" value={form.client_request} onChange={(v) => set('client_request', v)} rows={3} />
        <Field label="관련 법령" value={form.related_laws} onChange={(v) => set('related_laws', v)} rows={3} />
        <Field label="법적 의견" value={form.legal_opinion} onChange={(v) => set('legal_opinion', v)} rows={4} />
        <Field label="조언 및 권고" value={form.recommendation} onChange={(v) => set('recommendation', v)} rows={3} />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">문서 첨부</label>
          <input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200" />
          {files.length > 0 && (
            <ul className="mt-2 text-xs text-gray-500 space-y-0.5">
              {files.map((f, i) => <li key={i}>📎 {f.name}</li>)}
            </ul>
          )}
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

export default function NewConsultationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const caseId = decodeURIComponent(id)
  return (
    <Suspense>
      <NewConsultationForm caseId={caseId} />
    </Suspense>
  )
}

function Field({ label, value, onChange, rows }: { label: string; value: string; onChange: (v: string) => void; rows: number }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white resize-y"
        placeholder={`${label}을 입력하세요...`} />
    </div>
  )
}
