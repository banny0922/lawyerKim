'use client'

import { use, useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Consultation, ConsultationFile, ConsultationType } from '@/lib/types'

function ConsultationDetail({
  caseId,
  consultationId,
}: {
  caseId: string
  consultationId: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [activeTab, setActiveTab] = useState<'consultation' | 'progress'>(
    searchParams.get('tab') === 'progress' ? 'progress' : 'consultation'
  )
  const [consultation, setConsultation] = useState<Consultation | null>(null)
  const [files, setFiles] = useState<ConsultationFile[]>([])
  const [consultationTypes, setConsultationTypes] = useState<ConsultationType[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [progressEditing, setProgressEditing] = useState(false)
  const [progressDirty, setProgressDirty] = useState(false)
  const [savingProgress, setSavingProgress] = useState(false)
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)


  const [form, setForm] = useState({
    consultation_type_id: '',
    consulted_date: '',
    consulted_time: '09:00',
    content: '',
    client_request: '',
    related_laws: '',
    legal_opinion: '',
    recommendation: '',
    progress_content: '',
    progress_client_request: '',
    progress_related_laws: '',
    progress_legal_opinion: '',
    progress_recommendation: '',
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
          progress_content: c.progress_content ?? '',
          progress_client_request: c.progress_client_request ?? '',
          progress_related_laws: c.progress_related_laws ?? '',
          progress_legal_opinion: c.progress_legal_opinion ?? '',
          progress_recommendation: c.progress_recommendation ?? '',
        })
      }
      setFiles(f ?? [])
      setConsultationTypes(ct ?? [])
      if (!c?.progress_content) setProgressEditing(true)
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
        progress_content: form.progress_content || null,
        progress_client_request: form.progress_client_request || null,
        progress_related_laws: form.progress_related_laws || null,
        progress_legal_opinion: form.progress_legal_opinion || null,
        progress_recommendation: form.progress_recommendation || null,
      })
      .eq('id', consultationId)
      .select('*, consultation_types(id, name)')
      .single()
    if (updated) setConsultation(updated as Consultation)
    setSaving(false)
    setEditing(false)
  }

  async function handleSaveProgress() {
    setSavingProgress(true)
    const { data: updated, error } = await supabase
      .from('consultations')
      .update({
        progress_content: form.progress_content || null,
        progress_client_request: form.progress_client_request || null,
        progress_related_laws: form.progress_related_laws || null,
        progress_legal_opinion: form.progress_legal_opinion || null,
        progress_recommendation: form.progress_recommendation || null,
      })
      .eq('id', consultationId)
      .select('*, consultation_types(id, name)')
      .single()
    setSavingProgress(false)
    if (error) { alert('저장에 실패했습니다: ' + error.message); return }
    if (updated) setConsultation(updated as Consultation)
    setProgressEditing(false)
    setProgressDirty(false)
  }

  async function handleDelete() {
    if (!confirm('이 기록을 삭제하시겠습니까?')) return
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
      <p className="text-gray-500">기록을 찾을 수 없습니다.</p>
      <Link href={`/cases/${encodeURIComponent(caseId)}`} className="mt-3 inline-block text-sm text-blue-600 hover:underline">사건으로</Link>
    </div>
  )

  return (
    <div className="w-full max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={async () => {
            if (progressDirty) {
              if (confirm('저장하지 않은 내용이 있습니다. 저장하고 이동할까요?')) {
                await handleSaveProgress()
              } else {
                alert('저장되지 않습니다.')
              }
            } else if (editing) {
              if (confirm('저장하지 않은 내용이 있습니다. 저장하고 이동할까요?')) {
                await handleSave()
              } else {
                alert('저장되지 않습니다.')
              }
            }
            router.push(`/cases/${encodeURIComponent(caseId)}`)
          }}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← 사건으로
        </button>
        <div className="flex gap-2">
          {activeTab === 'consultation' ? (
            editing ? (
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
                  {consultation.content || consultation.client_request || consultation.legal_opinion ? '수정' : '등록'}
                </button>
                <button onClick={handleDelete}
                  className="px-3 py-1.5 border border-red-200 text-red-600 text-sm rounded-md hover:bg-red-50 transition-colors">
                  삭제
                </button>
              </>
            )
          ) : progressEditing ? (
            <>
              <button onClick={handleSaveProgress} disabled={savingProgress}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {savingProgress ? '저장 중...' : '저장'}
              </button>
              <button onClick={() => { setProgressEditing(false); set('progress_content', consultation.progress_content ?? '') }}
                className="px-3 py-1.5 border border-gray-300 text-gray-600 text-sm rounded-md hover:bg-gray-50 transition-colors">
                취소
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setProgressEditing(true)}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition-colors">
                {consultation.progress_content ? '수정' : '등록'}
              </button>
              <button onClick={handleDelete}
                className="px-3 py-1.5 border border-red-200 text-red-600 text-sm rounded-md hover:bg-red-50 transition-colors">
                삭제
              </button>
            </>
          )}
        </div>
      </div>

      {/* 탭 */}
      <div className="flex border border-gray-200 rounded-lg overflow-hidden mb-4 w-fit">
        <button
          onClick={async () => {
            if (progressDirty) {
              if (confirm('저장하지 않은 내용이 있습니다. 저장하고 이동할까요?')) {
                await handleSaveProgress()
              } else {
                alert('저장되지 않습니다.')
              }
            } else if (editing) {
              if (confirm('저장하지 않은 내용이 있습니다. 저장하고 이동할까요?')) {
                await handleSave()
              } else {
                alert('저장되지 않습니다.')
              }
            }
            setActiveTab('consultation'); setEditing(false); setProgressDirty(false)
          }}
          className={`px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === 'consultation' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
        >
          상담기록
        </button>
        <button
          onClick={async () => {
            if (progressDirty) {
              if (confirm('저장하지 않은 내용이 있습니다. 저장하고 이동할까요?')) {
                await handleSaveProgress()
              } else {
                alert('저장되지 않습니다.')
              }
            } else if (editing) {
              if (confirm('저장하지 않은 내용이 있습니다. 저장하고 이동할까요?')) {
                await handleSave()
              } else {
                alert('저장되지 않습니다.')
              }
            }
            setActiveTab('progress'); setProgressEditing(!consultation.progress_content); setProgressDirty(false)
          }}
          className={`px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === 'progress' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
        >
          진행기록
        </button>
      </div>

      {/* 탭 내용 */}
      {activeTab === 'consultation' ? (
        editing ? (
          <div className="space-y-4">
            {/* 상담내용 블록 */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 space-y-4">
              <h3 className="text-base font-bold text-indigo-800 border-b border-indigo-200 pb-2">상담내용</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">날짜</label>
                  <input type="date" value={form.consulted_date} onChange={(e) => set('consulted_date', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">시간</label>
                  <div className="flex gap-1">
                    <select value={form.consulted_time.split(':')[0]} onChange={(e) => set('consulted_time', `${e.target.value}:${form.consulted_time.split(':')[1]}`)}
                      className="flex-1 border border-gray-300 rounded-md px-2 py-2 text-sm bg-white">
                      {Array.from({length: 24}, (_, i) => String(i).padStart(2,'0')).map(h => <option key={h} value={h}>{h}시</option>)}
                    </select>
                    <select value={form.consulted_time.split(':')[1]} onChange={(e) => set('consulted_time', `${form.consulted_time.split(':')[0]}:${e.target.value}`)}
                      className="flex-1 border border-gray-300 rounded-md px-2 py-2 text-sm bg-white">
                      <option value="00">00분</option>
                      <option value="30">30분</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">상담형태</label>
                  <select value={form.consultation_type_id} onChange={(e) => set('consultation_type_id', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white">
                    <option value="">선택 안함</option>
                    {consultationTypes.map((ct) => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
                  </select>
                </div>
              </div>
              <EditField label="상담내용" value={form.content} onChange={(v) => set('content', v)} rows={10} />
              <EditField label="의뢰인 요청사항" value={form.client_request} onChange={(v) => set('client_request', v)} rows={5} />
            </div>
            {/* 법률검토 블록 */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 space-y-4">
              <h3 className="text-base font-bold text-indigo-800 border-b border-indigo-200 pb-2">법률검토</h3>
              <EditField label="관련 법령" value={form.related_laws} onChange={(v) => set('related_laws', v)} rows={4} />
              <EditField label="법적 의견" value={form.legal_opinion} onChange={(v) => set('legal_opinion', v)} rows={6} />
            </div>
            {/* 향후조치 블록 */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 space-y-4">
              <h3 className="text-base font-bold text-indigo-800 border-b border-indigo-200 pb-2">향후조치</h3>
              <EditField label="권고사항" value={form.recommendation} onChange={(v) => set('recommendation', v)} rows={5} />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 상담내용 블록 */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 space-y-4">
              <h3 className="text-base font-bold text-indigo-800 border-b border-indigo-200 pb-2">상담내용</h3>
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-700 text-sm">
                  {consultation.consulted_at ? consultation.consulted_at.slice(0, 16).replace('T', ' ') : '날짜 미입력'}
                </span>
                {consultation.consultation_types && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {consultation.consultation_types.name}
                  </span>
                )}
              </div>
              <ViewField label="상담내용" value={consultation.content} />
              <ViewField label="의뢰인 요청사항" value={consultation.client_request} />
            </div>
            {/* 법률검토 블록 */}
            {(consultation.related_laws || consultation.legal_opinion) && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                <h3 className="text-sm font-semibold text-indigo-700 border-b border-indigo-100 pb-2">법률검토</h3>
                <ViewField label="관련 법령" value={consultation.related_laws} />
                <ViewField label="법적 의견" value={consultation.legal_opinion} />
              </div>
            )}
            {/* 향후조치 블록 */}
            {consultation.recommendation && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                <h3 className="text-sm font-semibold text-indigo-700 border-b border-indigo-100 pb-2">향후조치</h3>
                <ViewField label="권고사항" value={consultation.recommendation} />
              </div>
            )}
            {!consultation.content && !consultation.client_request && !consultation.legal_opinion && (
              <p className="text-sm text-gray-400">내용이 없습니다.</p>
            )}
          </div>
        )
      ) : progressEditing ? (
        <textarea
          value={form.progress_content}
          onChange={(e) => { set('progress_content', e.target.value); setProgressDirty(true) }}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white resize-y min-h-[400px]"
          placeholder="상담진행사항을 입력하세요..."
        />
      ) : (
        <p className="text-gray-800 whitespace-pre-wrap leading-relaxed bg-white border border-gray-100 rounded-lg p-4 text-sm min-h-[100px]">
          {consultation.progress_content}
        </p>
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

export default function ConsultationDetailPage({
  params,
}: {
  params: Promise<{ id: string; consultationId: string }>
}) {
  const { id, consultationId } = use(params)
  const caseId = decodeURIComponent(id)
  return (
    <Suspense>
      <ConsultationDetail caseId={caseId} consultationId={consultationId} />
    </Suspense>
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
      <textarea value={value} onChange={(e) => onChange(e.target.value)}
        rows={rows}
        style={{ minHeight: `${rows * 30}px` }}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white resize-y" />
    </div>
  )
}
