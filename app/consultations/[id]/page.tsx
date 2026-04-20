'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Consultation, ConsultationFile, CaseType, ConsultationType } from '@/lib/types'

const HOURS = Array.from({ length: 24 }, (_, i) => i)

function formatHourLabel(hour: number) {
  if (hour === 0) return '오전 12시 (자정)'
  if (hour < 12) return `오전 ${hour}시`
  if (hour === 12) return '오후 12시 (정오)'
  return `오후 ${hour - 12}시`
}

function formatHour(hour: number) {
  if (hour === 0) return '오전 12시'
  if (hour < 12) return `오전 ${hour}시`
  if (hour === 12) return '오후 12시'
  return `오후 ${hour - 12}시`
}

export default function ConsultationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = createClient()

  const [consultation, setConsultation] = useState<Consultation | null>(null)
  const [files, setFiles] = useState<ConsultationFile[]>([])
  const [caseTypes, setCaseTypes] = useState<CaseType[]>([])
  const [consultationTypes, setConsultationTypes] = useState<ConsultationType[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)

  const [form, setForm] = useState({
    client_name: '',
    date: '',
    hour: 9,
    case_type_id: '',
    consultation_type_id: '',
    content: '',
    next_appointment: '',
  })

  useEffect(() => {
    async function load() {
      const [{ data: c }, { data: f }, { data: ct }, { data: cot }] = await Promise.all([
        supabase
          .from('consultations')
          .select('*, case_types(id, name), consultation_types(id, name)')
          .eq('id', id)
          .single(),
        supabase.from('consultation_files').select('*').eq('consultation_id', id).order('created_at'),
        supabase.from('case_types').select('*').order('name'),
        supabase.from('consultation_types').select('*').order('name'),
      ])
      if (c) {
        setConsultation(c as Consultation)
        setForm({
          client_name: c.client_name,
          date: c.date,
          hour: c.hour,
          case_type_id: c.case_type_id ?? '',
          consultation_type_id: c.consultation_type_id ?? '',
          content: c.content ?? '',
          next_appointment: c.next_appointment ?? '',
        })
      }
      setFiles(f ?? [])
      setCaseTypes(ct ?? [])
      setConsultationTypes(cot ?? [])
      setLoading(false)
    }
    load()
  }, [id])

  async function handleSave() {
    setSaving(true)
    const { data: updated, error } = await supabase
      .from('consultations')
      .update({
        client_name: form.client_name.trim(),
        date: form.date,
        hour: form.hour,
        case_type_id: form.case_type_id || null,
        consultation_type_id: form.consultation_type_id || null,
        content: form.content || null,
        next_appointment: form.next_appointment || null,
      })
      .eq('id', id)
      .select('*, case_types(id, name), consultation_types(id, name)')
      .single()

    if (!error && updated) {
      setConsultation(updated as Consultation)
    }
    setSaving(false)
    setEditing(false)
  }

  async function handleDelete() {
    if (!confirm('이 상담 일지를 삭제하시겠습니까?')) return
    await supabase.from('consultations').delete().eq('id', id)
    router.push('/')
  }

  async function handleUploadFiles() {
    if (newFiles.length === 0) return
    setUploadingFiles(true)
    for (const file of newFiles) {
      const filePath = `${id}/${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from('consultation-files').upload(filePath, file)
      if (!error) {
        const { data: inserted } = await supabase
          .from('consultation_files')
          .insert({ consultation_id: id, file_name: file.name, file_url: filePath })
          .select()
          .single()
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

  async function handleDownloadFile(filePath: string, fileName: string) {
    const { data } = await supabase.storage
      .from('consultation-files')
      .createSignedUrl(filePath, 60)
    if (data?.signedUrl) {
      const a = document.createElement('a')
      a.href = data.signedUrl
      a.download = fileName
      a.click()
    }
  }

  if (loading) {
    return <p className="text-gray-400 text-sm text-center py-12">불러오는 중...</p>
  }

  if (!consultation) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">상담 일지를 찾을 수 없습니다.</p>
        <Link href="/" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
          목록으로
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
          ← 목록
        </Link>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
              <button
                onClick={() => {
                  setEditing(false)
                  setForm({
                    client_name: consultation.client_name,
                    date: consultation.date,
                    hour: consultation.hour,
                    case_type_id: consultation.case_type_id ?? '',
                    consultation_type_id: consultation.consultation_type_id ?? '',
                    content: consultation.content ?? '',
                    next_appointment: consultation.next_appointment ?? '',
                  })
                }}
                className="px-3 py-1.5 border border-gray-300 text-gray-600 text-sm rounded-md hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition-colors"
              >
                수정
              </button>
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 border border-red-200 text-red-600 text-sm rounded-md hover:bg-red-50 transition-colors"
              >
                삭제
              </button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">상담자명 *</label>
            <input
              type="text"
              required
              value={form.client_name}
              onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
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
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">다음 약속</label>
            <input
              type="text"
              value={form.next_appointment}
              onChange={(e) => setForm((f) => ({ ...f, next_appointment: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{consultation.client_name}</h1>
            <p className="text-gray-500 mt-1">
              {consultation.date} · {formatHour(consultation.hour)}
            </p>
            <div className="flex gap-2 mt-2">
              {consultation.case_types && (
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
                  {consultation.case_types.name}
                </span>
              )}
              {consultation.consultation_types && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {consultation.consultation_types.name}
                </span>
              )}
            </div>
          </div>

          {consultation.content && (
            <div>
              <h2 className="text-sm font-medium text-gray-500 mb-2">상담 내용</h2>
              <p className="text-gray-800 whitespace-pre-wrap leading-relaxed bg-white border border-gray-100 rounded-lg p-4">
                {consultation.content}
              </p>
            </div>
          )}

          {consultation.next_appointment && (
            <div>
              <h2 className="text-sm font-medium text-gray-500 mb-1">다음 약속</h2>
              <p className="text-orange-600 font-medium">{consultation.next_appointment}</p>
            </div>
          )}
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
                  <button
                    onClick={() => handleDownloadFile(f.file_url, f.file_name)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    다운로드
                  </button>
                  <button
                    onClick={() => handleDeleteFile(f.id, f.file_url)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400 mb-4">첨부된 파일이 없습니다.</p>
        )}

        <div className="flex gap-3 items-start">
          <input
            type="file"
            multiple
            onChange={(e) => setNewFiles(Array.from(e.target.files ?? []))}
            className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
          />
          {newFiles.length > 0 && (
            <button
              onClick={handleUploadFiles}
              disabled={uploadingFiles}
              className="px-3 py-1.5 bg-gray-700 text-white text-sm rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors flex-shrink-0"
            >
              {uploadingFiles ? '업로드 중...' : '업로드'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
