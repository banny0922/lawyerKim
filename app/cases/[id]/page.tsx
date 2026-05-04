'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Case, Consultation, Todo } from '@/lib/types'
import HearingSection from './HearingSection'
import DocumentSection from './DocumentSection'
import DeliverySection from './DeliverySection'

function formatDT(dt: string | null) {
  if (!dt) return '—'
  return dt.replace('T', ' ').slice(0, 16)
}

export default function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = createClient()

  const [caseData, setCaseData] = useState<Case | null>(null)
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [editTodos, setEditTodos] = useState<{ id?: string; due_date: string; title: string }[]>([])

  const [courts, setCourts] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab] = useState<'consultation' | 'progress'>('consultation')

  const [form, setForm] = useState({
    client_name: '',
    case_name: '',
    court: '',
    division: '',
    case_number: '',
    accepted_at: '',
    hearing_date: '',
    hearing_time: '09:00',
    next_consultation_date: '',
    next_consultation_time: '09:00',
    fee: '',
    unpaid_fee: '',
    fee_paid: false,
  })

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    async function load() {
      const decodedId = decodeURIComponent(id)
      supabase.from('courts').select('id, name').order('name').then(({ data }) => setCourts(data ?? []))
      const [{ data: c }, { data: cons }, { data: td }] = await Promise.all([
        supabase.from('cases').select('*').eq('id', decodedId).single(),
        supabase
          .from('consultations')
          .select('*, consultation_types(id, name)')
          .eq('case_id', decodedId)
          .order('consulted_at', { ascending: false }),
        supabase.from('todos').select('*').eq('case_id', decodedId).order('due_date', { ascending: true }),
      ])
      if (c) {
        setCaseData(c)
        setForm({
          client_name: c.client_name ?? '',
          case_name: c.case_name ?? '',
          court: c.court ?? '',
          division: c.division ?? '',
          case_number: c.case_number ?? '',
          accepted_at: c.accepted_at ?? '',
          hearing_date: c.hearing_at ? c.hearing_at.slice(0, 10) : '',
          hearing_time: c.hearing_at ? (c.hearing_at.slice(11, 16) || '09:00') : '09:00',
          next_consultation_date: c.next_consultation_at ? c.next_consultation_at.slice(0, 10) : '',
          next_consultation_time: c.next_consultation_at ? (c.next_consultation_at.slice(11, 16) || '09:00') : '09:00',
          fee: c.fee != null ? String(c.fee) : '',
          unpaid_fee: c.unpaid_fee != null ? String(c.unpaid_fee) : '',
          fee_paid: c.fee_paid,
        })
      }
      setConsultations((cons as Consultation[]) ?? [])
      setTodos(td ?? [])
      setEditTodos((td ?? []).map(t => ({ id: t.id, due_date: t.due_date ?? '', title: t.title ?? '' })))
      setLoading(false)
    }
    load()
  }, [id])

  async function handleSave() {
    if (!caseData) return
    setSaving(true)
    const { data: updated } = await supabase
      .from('cases')
      .update({
        client_name: form.client_name || null,
        case_name: form.case_name || null,
        court: form.court || null,
        division: form.division || null,
        case_number: form.case_number || null,
        accepted_at: form.accepted_at || null,
        hearing_at: form.hearing_date ? `${form.hearing_date}T${form.hearing_time}:00` : null,
        next_consultation_at: form.next_consultation_date ? `${form.next_consultation_date}T${form.next_consultation_time}:00` : null,
        fee: form.fee ? parseFloat(form.fee) : null,
        unpaid_fee: form.unpaid_fee ? parseFloat(form.unpaid_fee) : null,
        fee_paid: form.fee_paid,
      })
      .eq('id', caseData.id)
      .select()
      .single()
    if (updated) setCaseData(updated)

    await supabase.from('todos').delete().eq('case_id', caseData.id)
    const validTodos = editTodos.filter(t => t.title.trim())
    if (validTodos.length > 0) {
      const { data: newTodos } = await supabase.from('todos').insert(
        validTodos.map(t => ({ case_id: caseData.id, title: t.title.trim(), due_date: t.due_date || null }))
      ).select()
      setTodos(newTodos ?? [])
      setEditTodos((newTodos ?? []).map(t => ({ id: t.id, due_date: t.due_date ?? '', title: t.title ?? '' })))
    } else {
      setTodos([])
      setEditTodos([])
    }

    setSaving(false)
    setEditing(false)
  }

  async function handleDelete() {
    if (!confirm('이 사건을 삭제하시겠습니까? 관련 상담기록도 모두 삭제됩니다.')) return
    await supabase.from('cases').delete().eq('id', caseData!.id)
    router.push('/')
  }

  if (loading) return <p className="text-gray-400 text-sm text-center py-16">불러오는 중...</p>
  if (!caseData) return (
    <div className="text-center py-16">
      <p className="text-gray-500">사건을 찾을 수 없습니다.</p>
      <Link href="/" className="mt-3 inline-block text-sm text-blue-600 hover:underline">목록으로</Link>
    </div>
  )

  return (
    <div className="w-full max-w-2xl">
      {/* 상단 네비 */}
      <div className="flex items-center justify-between mb-5">
        <Link href="/" className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          목록
        </Link>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {saving ? '저장 중...' : '저장'}
              </button>
              <button onClick={() => setEditing(false)}
                className="px-4 py-1.5 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors">
                취소
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => { setEditing(true); setEditTodos(todos.map(t => ({ id: t.id, due_date: t.due_date ?? '', title: t.title ?? '' }))) }}
                className="px-4 py-1.5 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
                수정
              </button>
              <button onClick={handleDelete}
                className="px-4 py-1.5 border border-red-100 text-red-500 text-sm rounded-lg hover:bg-red-50 transition-colors">
                삭제
              </button>
            </>
          )}
        </div>
      </div>

      {/* 사건 정보 카드 */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-5 shadow-sm">
        {editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">의뢰인</label>
                <input type="text" value={form.client_name} onChange={(e) => set('client_name', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">사건명</label>
                <input type="text" value={form.case_name} onChange={(e) => set('case_name', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">관할</label>
                <select value={form.court} onChange={(e) => set('court', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-700">
                  <option value="">선택</option>
                  {courts.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">부</label>
                <input type="text" value={form.division} onChange={(e) => set('division', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">사건번호</label>
                <input type="text" value={form.case_number} onChange={(e) => set('case_number', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">수임일</label>
                <input type="date" value={form.accepted_at} onChange={(e) => set('accepted_at', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">수임료 (원)</label>
                <input type="number" value={form.fee} onChange={(e) => set('fee', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">미납금액 (원)</label>
                <input type="number" value={form.unpaid_fee} onChange={(e) => set('unpaid_fee', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer pb-1.5">
                <input type="checkbox" checked={form.fee_paid} onChange={(e) => set('fee_paid', e.target.checked)} className="w-4 h-4 accent-blue-600" />
                <span className="text-sm text-gray-700">완납</span>
              </label>
            </div>
            {/* 해야할일 */}
            <div className="border border-gray-100 rounded-xl p-3 space-y-2 bg-gray-50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">해야할일</span>
                <button type="button" onClick={() => setEditTodos(t => [...t, { due_date: '', title: '' }])}
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
              {editTodos.map((todo, i) => (
                <div key={i} className="flex gap-1.5 items-center">
                  <input type="date" value={todo.due_date}
                    onChange={(e) => setEditTodos(t => t.map((x, j) => j === i ? { ...x, due_date: e.target.value } : x))}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white" />
                  <input type="text" value={todo.title} placeholder="할일 내용"
                    onChange={(e) => setEditTodos(t => t.map((x, j) => j === i ? { ...x, title: e.target.value } : x))}
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white" />
                  <button type="button" onClick={() => setEditTodos(t => t.filter((_, j) => j !== i))}
                    className="text-gray-300 hover:text-red-400 text-base px-1 leading-none transition-colors">✕</button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {caseData.client_name ?? '—'}
                  {caseData.case_name && <span className="text-gray-400 font-normal text-lg"> · {caseData.case_name}</span>}
                </h1>
                {(caseData.court || caseData.division || caseData.case_number) && (
                  <p className="text-sm text-gray-400 mt-0.5">
                    {[caseData.court, caseData.division, caseData.case_number].filter(Boolean).join(' ')}
                  </p>
                )}
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${
                caseData.fee_paid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
              }`}>
                {caseData.fee_paid ? '수임료 완납' : '수임료 미납'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-1 border-t border-gray-50">
              <Row label="수임일" value={caseData.accepted_at} />
              <Row label="수임료" value={caseData.fee != null ? `${caseData.fee.toLocaleString()}원` : null} />
              <Row label="기일" value={formatDT(caseData.hearing_at)} />
              <Row label="미납금액" value={caseData.unpaid_fee != null ? `${caseData.unpaid_fee.toLocaleString()}원` : null} highlight />
              <Row label="다음 상담" value={formatDT(caseData.next_consultation_at)} highlight />
            </div>

            {todos.length > 0 && (
              <div className="pt-3 border-t border-gray-50">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">해야할일</p>
                <div className="space-y-1.5">
                  {todos.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 text-sm">
                      <span className="text-gray-300 text-xs flex-shrink-0 w-20">{t.due_date ?? ''}</span>
                      <span className="text-gray-700">{t.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <HearingSection caseId={caseData.id} />
      <DocumentSection caseId={caseData.id} />
      <DeliverySection caseId={caseData.id} />

      {/* 상담기록 */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">상담기록</h2>
          <Link
            href={`/cases/${encodeURIComponent(caseData.id)}/consultations/new`}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            + 추가
          </Link>
        </div>

        {consultations.length === 0 ? (
          <p className="text-sm text-gray-400 py-3">기록이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {consultations.map((c) => (
              <div key={c.id} className="bg-white border border-gray-100 rounded-xl p-4 hover:border-blue-100 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {c.consulted_at ? c.consulted_at.slice(0, 16).replace('T', ' ') : '날짜 미입력'}
                    </p>
                    {c.consultation_types && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full mt-1 inline-block">
                        {c.consultation_types.name}
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/cases/${encodeURIComponent(caseData.id)}/consultations/${c.id}?tab=${activeTab}`}
                    className="px-3 py-1.5 bg-gray-50 text-gray-600 text-xs rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0 border border-gray-100"
                  >
                    상세보기
                  </Link>
                </div>
                {c.content && <p className="text-sm text-gray-400 mt-2 line-clamp-2">{c.content}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, highlight }: { label: string; value: string | null | undefined; highlight?: boolean }) {
  return (
    <div>
      <span className="text-xs font-medium text-gray-400">{label}</span>
      <p className={`text-sm font-medium mt-0.5 ${highlight ? 'text-amber-600' : 'text-gray-800'}`}>{value ?? '—'}</p>
    </div>
  )
}
