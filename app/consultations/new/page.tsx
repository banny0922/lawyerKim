'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { CaseType, ConsultationType } from '@/lib/types'

const HOURS = Array.from({ length: 24 }, (_, i) => i)

function formatHourLabel(hour: number) {
  if (hour === 0) return '오전 12시 (자정)'
  if (hour < 12) return `오전 ${hour}시`
  if (hour === 12) return '오후 12시 (정오)'
  return `오후 ${hour - 12}시`
}

export default function NewConsultationPage() {
  const router = useRouter()
  const supabase = createClient()

  const [caseTypes, setCaseTypes] = useState<CaseType[]>([])
  const [consultationTypes, setConsultationTypes] = useState<ConsultationType[]>([])
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState<File[]>([])

  const [form, setForm] = useState({
    client_name: '',
    date: new Date().toISOString().split('T')[0],
    hour: 9,
    case_type_id: '',
    consultation_type_id: '',
    content: '',
    next_appointment: '',
  })

  useEffect(() => {
    async function load() {
      const [{ data: ct }, { data: cot }] = await Promise.all([
        supabase.from('case_types').select('*').order('name'),
        supabase.from('consultation_types').select('*').order('name'),
      ])
      setCaseTypes(ct ?? [])
      setConsultationTypes(cot ?? [])
    }
    load()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.client_name.trim()) return
    setLoading(true)

    const { data: consultation, error } = await supabase
      .from('consultations')
      .insert({
        client_name: form.client_name.trim(),
        date: form.date,
        hour: form.hour,
        case_type_id: form.case_type_id || null,
        consultation_type_id: form.consultation_type_id || null,
        content: form.content || null,
        next_appointment: form.next_appointment || null,
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

    router.push(`/consultations/${consultation.id}`)
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">새 상담 일지</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">상담자명 *</label>
          <input
            type="text"
            required
            value={form.client_name}
            onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
            placeholder="홍길동"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">상담일 *</label>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">시간 *</label>
            <select
              value={form.hour}
              onChange={(e) => setForm((f) => ({ ...f, hour: parseInt(e.target.value) }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>{formatHourLabel(h)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">사건유형</label>
            <select
              value={form.case_type_id}
              onChange={(e) => setForm((f) => ({ ...f, case_type_id: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value="">선택 안함</option>
              {caseTypes.map((ct) => (
                <option key={ct.id} value={ct.id}>{ct.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">상담형태</label>
            <select
              value={form.consultation_type_id}
              onChange={(e) => setForm((f) => ({ ...f, consultation_type_id: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value="">선택 안함</option>
              {consultationTypes.map((ct) => (
                <option key={ct.id} value={ct.id}>{ct.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">상담일지</label>
          <textarea
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            rows={10}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white resize-y"
            placeholder="상담 내용을 입력하세요..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">문서 첨부</label>
          <input
            type="file"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
          />
          {files.length > 0 && (
            <ul className="mt-2 text-xs text-gray-500 space-y-0.5">
              {files.map((f, i) => <li key={i}>📎 {f.name}</li>)}
            </ul>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">다음 약속</label>
          <input
            type="text"
            value={form.next_appointment}
            onChange={(e) => setForm((f) => ({ ...f, next_appointment: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
            placeholder="예: 2026-05-10 오후 2시, 추후 연락 등"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? '저장 중...' : '저장'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 text-gray-600 rounded-md text-sm hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  )
}
