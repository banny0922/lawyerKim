'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Case, Consultation } from '@/lib/types'

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
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    client_name: '',
    case_name: '',
    court: '',
    division: '',
    case_number: '',
    accepted_at: '',
    hearing_at: '',
    next_consultation_at: '',
    fee: '',
    fee_paid: false,
  })

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    async function load() {
      const decodedId = decodeURIComponent(id)
      const [{ data: c }, { data: cons }] = await Promise.all([
        supabase.from('cases').select('*').eq('id', decodedId).single(),
        supabase
          .from('consultations')
          .select('*, consultation_types(id, name)')
          .eq('case_id', decodedId)
          .order('consulted_at', { ascending: false }),
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
          hearing_at: c.hearing_at ? c.hearing_at.slice(0, 16) : '',
          next_consultation_at: c.next_consultation_at ? c.next_consultation_at.slice(0, 16) : '',
          fee: c.fee != null ? String(c.fee) : '',
          fee_paid: c.fee_paid,
        })
      }
      setConsultations((cons as Consultation[]) ?? [])
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
        hearing_at: form.hearing_at || null,
        next_consultation_at: form.next_consultation_at || null,
        fee: form.fee ? parseFloat(form.fee) : null,
        fee_paid: form.fee_paid,
      })
      .eq('id', caseData.id)
      .select()
      .single()
    if (updated) setCaseData(updated)
    setSaving(false)
    setEditing(false)
  }

  async function handleDelete() {
    if (!confirm('이 사건을 삭제하시겠습니까? 관련 상담기록도 모두 삭제됩니다.')) return
    await supabase.from('cases').delete().eq('id', caseData!.id)
    router.push('/')
  }

  if (loading) return <p className="text-gray-400 text-sm text-center py-12">불러오는 중...</p>
  if (!caseData) return (
    <div className="text-center py-16">
      <p className="text-gray-500">사건을 찾을 수 없습니다.</p>
      <Link href="/" className="mt-3 inline-block text-sm text-blue-600 hover:underline">목록으로</Link>
    </div>
  )

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">← 목록</Link>
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

      {/* 사건 정보 */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
        {editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">의뢰인</label>
                <input type="text" value={form.client_name} onChange={(e) => set('client_name', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">사건명</label>
                <input type="text" value={form.case_name} onChange={(e) => set('case_name', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">법원</label>
                <input type="text" value={form.court} onChange={(e) => set('court', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">부</label>
                <input type="text" value={form.division} onChange={(e) => set('division', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">사건번호</label>
                <input type="text" value={form.case_number} onChange={(e) => set('case_number', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">수임일</label>
                <input type="date" value={form.accepted_at} onChange={(e) => set('accepted_at', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">기일</label>
                <input type="datetime-local" value={form.hearing_at} onChange={(e) => set('hearing_at', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">다음 상담 예정일</label>
              <input type="datetime-local" value={form.next_consultation_at} onChange={(e) => set('next_consultation_at', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white" />
            </div>
            <div className="grid grid-cols-2 gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">수임료 (원)</label>
                <input type="number" value={form.fee} onChange={(e) => set('fee', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.fee_paid} onChange={(e) => set('fee_paid', e.target.checked)} className="w-4 h-4" />
                <span className="text-sm text-gray-700">수임료 완납</span>
              </label>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-gray-400">{caseData.id}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${caseData.fee_paid ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                {caseData.fee_paid ? '수임료 완납' : '수임료 미납'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              {caseData.client_name ?? '—'}{caseData.case_name ? ` · ${caseData.case_name}` : ''}
            </h1>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mt-3">
              <Row label="법원" value={[caseData.court, caseData.division, caseData.case_number].filter(Boolean).join(' ') || null} />
              <Row label="수임일" value={caseData.accepted_at} />
              <Row label="기일" value={formatDT(caseData.hearing_at)} />
              <Row label="다음 상담" value={formatDT(caseData.next_consultation_at)} highlight />
              <Row label="수임료" value={caseData.fee != null ? `${caseData.fee.toLocaleString()}원` : null} />
            </div>
          </div>
        )}
      </div>

      {/* 상담기록 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">상담기록</h2>
          <Link href={`/cases/${encodeURIComponent(caseData.id)}/consultations/new`}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors">
            + 상담 추가
          </Link>
        </div>

        {consultations.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">상담기록이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {consultations.map((c) => (
              <div key={c.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-200 transition-all">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {c.consulted_at ? c.consulted_at.slice(0, 16).replace('T', ' ') : '날짜 미입력'}
                    </p>
                    {c.consultation_types && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full mt-1 inline-block">
                        {c.consultation_types.name}
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/cases/${encodeURIComponent(caseData.id)}/consultations/${c.id}`}
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs rounded-md hover:bg-blue-100 transition-colors flex-shrink-0 border border-blue-100"
                  >
                    상세보기
                  </Link>
                </div>
                {c.content && <p className="text-sm text-gray-500 mt-2 line-clamp-2">{c.content}</p>}
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
      <span className="text-gray-400 text-xs">{label}</span>
      <p className={`font-medium ${highlight ? 'text-orange-600' : 'text-gray-800'}`}>{value ?? '—'}</p>
    </div>
  )
}
