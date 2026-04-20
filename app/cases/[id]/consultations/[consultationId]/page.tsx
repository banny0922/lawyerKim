'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Consultation, ConsultationFile, ConsultationType } from '@/lib/types'

export default function ConsultationDetailPage({
  params,
}: {
  params: Promise<{ id: string; consultationId: string }>
}) {
  const { id, consultationId } = use(params)
  const caseId = decodeURIComponent(id)
  const router = useRouter()
  const supabase = createClient()

  const [consultation, setConsultation] = useState<Consultation | null>(null)
  const [files, setFiles] = useState<ConsultationFile[]>([])
  const [consultationTypes, setConsultationTypes] = useState<ConsultationType[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)

  const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
    const h = Math.floor(i / 2).toString().padStart(2, '0')
    const m = i % 2 === 0 ? '00' : '30'
    return `${h}:${m}`
  })

  const [form, setForm] = useState({
    consultation_type_id: '',
    consulted_date: '',
    consulted_time: '09:00',
    content: '',
    client_request: '',
    related_laws: '',
    legal_opinion: '',
    recommendation: '',
  })

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    async function load() {
      const [{ data: c }, { data: f }, { data: ct }] = await Promise.all([
        supabase
          .from('consultations')
          .select('*, consultation_types(id, name)')
          .eq('id', consultationId)
          .single(),
        supabase.from('consultation_files').select('*').eq('consultation_id', consultationId).order('created_at'),
        supabase.from('consultation_types').select('*').order('name'),
      ])
      if (c) {
        setConsultation(c as Consultation)
        const dt = c.consulted_at ?? ''
        setForm({
          consultation_type_id: c.consultation_type_id ?? '',
          consulted_date: dt ? dt.slice(0, 10) : '',
          consulted_time: dt ? (dt.slice(11, 16) || '09:00') : '09:00',
          content: c.content ?? '',
          client_request: c.client_request ?? '',
          related_laws: c.related_laws ?? '',
          legal_opinion: c.legal_opinion ?? '',
          recommendation: c.recommendation ?? '',
        })
      }
      setFiles(f ?? [])
      setConsultationTypes(ct ?? [])
      setLoading(false)
    }
    load()
  }, [consultationId])

  async function handleSave() {
    setSaving(true)
    const consulted_at = form.consulted_date ? `${form.consulted_date}T${form.consulted_time}:00` : null
    const { data: updated } = await supabase
      .from('consultations')
      .update({
        consultation_type_id: form.consultation_type_id || null,
        consulted_at,
        content: form.content || null,
        client_request: form.client_request || null,
        related_laws: form.related_laws || null,
        legal_opinion: form.legal_opinion || null,
        recommendation: form.recommendation || null,
      })
      .eq('id', consultationId)
      .select('*, consultation_types(id, name)')
      .single()
    if (updated) setConsultation(updated as Consultation)
    setSaving(false)
    setEditing(false)
  }

  async function handleDelete() {
    if (!confirm('이 상담기록을 삭제하시겠습니까?')) return
    await supabase.from('consultations').delete().eq('id', consultationId)
    router.push(`/cases/${encodeURIComponent(caseId)}`)
  }

  async function handleUploadFiles() {
    if (newFiles.length === 0) return
    setUploadingFiles(true)
    for (const file of newFiles) {
      const filePath = `${consultationId}/${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from('consultation-files').upload(filePath, file)
      if (!error) {
        const { data: inserted } = await supabase
          .from('consultation_files')
          .insert({ consultation_id: consultationId, file_name: file.name, file_url: filePath })
          .select().single()
        if (inserted) setFiles((prev) => [...prev, inserted])
      }
    }
    setNewFiles([])
    setUploadingFiles(false)
  }

  async function handleDeleteFile(fileId: string, filePath: string) {
    if (!confirm('이 파일을 삭제하시겠습니까?')) return
    await supabase.storage.from('consultation-files').remove([filePath])
    await supabase.from('consultation_files').delete().eq('id', fileId)
    setFiles((prev) => prev.filter((f) => f.id !== fileId))
  }

  async function handleDownload(filePath: string, fileName: string) {
    const { data } = await supabase.storage.from('consultation-files').createSignedUrl(filePath, 60)
    if (data?.signedUrl) {
      const a = document.createElement('a')
      a.href = data.signedUrl
      a.download = fileName
      a.click()
    }
  }

  if (loading) return <p className="text-gray-400 text-sm text-center py-12">불러오는 중...</p>
  if (!consultation) return (
    <div className="text-center py-16">
      <p className="text-gray-500">상담기록을 찾을 수 없습니다.</p>
      <Link href={`/cases/${encodeURIComponent(caseId)}`} className="mt-3 inline-block text-sm text-blue-600 hover:underline">사건으로</Link>
    </div>
  )

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <Link href={`/cases/${encodeURIComponent(caseId)}`} className="text-sm text-gray-500 hover:text-gray-700">
          ← 사건으로
        </Link>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button onClick={handleSave} disabled={saving}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {saving ? '저장 중...' : '저장'}
              </button>
              <button onClick={() => setEditing(false)}
                className="px-3 py-1.5 border border-gray-300 text-gray-600 text-sm rounded-md hover:bg-gray-50 transition-colors">
                취소
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition-colors">
                수정
              </button>
              <button onClick={handleDelete}
                className="px-3 py-1.5 border border-red-200 text-red-600 text-sm rounded-md hover:bg-red-50 transition-colors">
                삭제
              </button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">상담일</label>
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
          </div>
          <EditField label="상담내용" value={form.content} onChange={(v) => set('content', v)} rows={6} />
          <EditField label="의뢰인 요청사항" value={form.client_request} onChange={(v) => set('client_request', v)} rows={3} />
          <EditField label="관련 법령" value={form.related_laws} onChange={(v) => set('related_laws', v)} rows={3} />
          <EditField label="법적 의견" value={form.legal_opinion} onChange={(v) => set('legal_opinion', v)} rows={4} />
          <EditField label="조언 및 권고" value={form.recommendation} onChange={(v) => set('recommendation', v)} rows={3} />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <span className="font-medium text-gray-700">{consultation.consulted_at ?? '날짜 미입력'}</span>
            {consultation.consultation_types && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {consultation.consultation_types.name}
              </span>
            )}
          </div>
          <ViewField label="상담내용" value={consultation.content} />
          <ViewField label="의뢰인 요청사항" value={consultation.client_request} />
          <ViewField label="관련 법령" value={consultation.related_laws} />
          <ViewField label="법적 의견" value={consultation.legal_opinion} />
          <ViewField label="조언 및 권고" value={consultation.recommendation} />
        </div>
      )}

      {/* 첨부 파일 */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h2 className="text-sm font-medium text-gray-700 mb-3">첨부 파일</h2>
        {files.length > 0 ? (
          <ul className="space-y-2 mb-4">
            {files.map((f) => (
              <li key={f.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-md px-3 py-2">
                <span className="text-sm text-gray-700 truncate">📎 {f.file_name}</span>
                <div className="flex gap-2 flex-shrink-0 ml-2">
                  <button onClick={() => handleDownload(f.file_url, f.file_name)} className="text-xs text-blue-600 hover:underline">다운로드</button>
                  <button onClick={() => handleDeleteFile(f.id, f.file_url)} className="text-xs text-red-500 hover:underline">삭제</button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400 mb-4">첨부된 파일이 없습니다.</p>
        )}
        <div className="flex gap-3 items-center">
          <input type="file" multiple onChange={(e) => setNewFiles(Array.from(e.target.files ?? []))}
            className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200" />
          {newFiles.length > 0 && (
            <button onClick={handleUploadFiles} disabled={uploadingFiles}
              className="px-3 py-1.5 bg-gray-700 text-white text-sm rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors flex-shrink-0">
              {uploadingFiles ? '업로드 중...' : '업로드'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ViewField({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <h2 className="text-xs font-medium text-gray-400 mb-1">{label}</h2>
      <p className="text-gray-800 whitespace-pre-wrap leading-relaxed bg-white border border-gray-100 rounded-lg p-3 text-sm">
        {value}
      </p>
    </div>
  )
}

function EditField({ label, value, onChange, rows }: { label: string; value: string; onChange: (v: string) => void; rows: number }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white resize-y" />
    </div>
  )
}
