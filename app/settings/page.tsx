'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ConsultationType } from '@/lib/types'
import * as XLSX from 'xlsx'

function TypeSection({
  title,
  items,
  onAdd,
  onDelete,
}: {
  title: string
  items: { id: string; name: string }[]
  onAdd: (name: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [input, setInput] = useState('')
  const [adding, setAdding] = useState(false)

  async function handleAdd() {
    if (!input.trim()) return
    setAdding(true)
    await onAdd(input.trim())
    setInput('')
    setAdding(false)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <h2 className="font-semibold text-gray-900 mb-4">{title}</h2>
      <ul className="space-y-2 mb-4">
        {items.length === 0 ? (
          <li className="text-sm text-gray-400">항목이 없습니다.</li>
        ) : (
          items.map((item) => (
            <li key={item.id} className="flex items-center justify-between">
              <span className="text-sm text-gray-800">{item.name}</span>
              <button onClick={() => onDelete(item.id)} className="text-xs text-red-500 hover:text-red-700 hover:underline">
                삭제
              </button>
            </li>
          ))
        )}
      </ul>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="새 항목 이름"
          className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white"
        />
        <button onClick={handleAdd} disabled={adding || !input.trim()}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors">
          추가
        </button>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const supabase = createClient()
  const [consultationTypes, setConsultationTypes] = useState<ConsultationType[]>([])
  const [loading, setLoading] = useState(true)
  const [backupYear, setBackupYear] = useState(new Date().getFullYear())
  const [backupLoading, setBackupLoading] = useState(false)

  async function handleBackup() {
    setBackupLoading(true)
    const from = `${backupYear}-01-01`
    const to = `${backupYear}-12-31`

    const [{ data: cases }, { data: consultations }] = await Promise.all([
      supabase.from('cases').select('*').gte('accepted_at', from).lte('accepted_at', to).order('accepted_at'),
      supabase.from('consultations').select('*, cases(client_name, case_name)').in(
        'case_id',
        (await supabase.from('cases').select('id').gte('accepted_at', from).lte('accepted_at', to)).data?.map(c => c.id) ?? []
      ).order('consulted_at'),
    ])

    const caseRows = (cases ?? []).map(c => ({
      사건ID: c.id,
      의뢰인: c.client_name ?? '',
      사건명: c.case_name ?? '',
      관할: c.court ?? '',
      부: c.division ?? '',
      사건번호: c.case_number ?? '',
      수임일: c.accepted_at ?? '',
      기일: c.hearing_at ? c.hearing_at.slice(0, 16).replace('T', ' ') : '',
      다음상담예정: c.next_consultation_at ? c.next_consultation_at.slice(0, 16).replace('T', ' ') : '',
      수임료: c.fee ?? '',
      미납금액: c.unpaid_fee ?? '',
      완납여부: c.fee_paid ? '완납' : '미납',
    }))

    const consultRows = ((consultations ?? []) as any[]).map(c => ({
      사건ID: c.case_id,
      의뢰인: c.cases?.client_name ?? '',
      사건명: c.cases?.case_name ?? '',
      상담일시: c.consulted_at ? c.consulted_at.slice(0, 16).replace('T', ' ') : '',
      상담내용: c.content ?? '',
      의뢰인요청사항: c.client_request ?? '',
      관련법령: c.related_laws ?? '',
      법적의견: c.legal_opinion ?? '',
      권고사항: c.recommendation ?? '',
      진행기록: c.progress_content ?? '',
    }))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(caseRows), '사건목록')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(consultRows), '상담기록')
    XLSX.writeFile(wb, `사건기록_${backupYear}.xlsx`)
    setBackupLoading(false)
  }

  useEffect(() => {
    supabase.from('consultation_types').select('*').order('name').then(({ data }) => {
      setConsultationTypes(data ?? [])
      setLoading(false)
    })
  }, [])

  async function addConsultationType(name: string) {
    const { data } = await supabase.from('consultation_types').insert({ name }).select().single()
    if (data) setConsultationTypes((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
  }

  async function deleteConsultationType(id: string) {
    const { error } = await supabase.from('consultation_types').delete().eq('id', id)
    if (error) {
      alert('사용 중인 상담형태는 삭제할 수 없습니다.')
      return
    }
    setConsultationTypes((prev) => prev.filter((ct) => ct.id !== id))
  }

  if (loading) return <p className="text-gray-400 text-sm text-center py-12">불러오는 중...</p>

  return (
    <div className="w-full max-w-lg">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">설정</h1>

      {/* 데이터 백업 */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">데이터 백업</h2>
        <div className="flex gap-2 items-center">
          <select value={backupYear} onChange={(e) => setBackupYear(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white">
            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(y => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>
          <button onClick={handleBackup} disabled={backupLoading}
            className="px-4 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors">
            {backupLoading ? '준비 중...' : '엑셀 다운로드'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">수임일 기준으로 해당 연도의 사건목록과 상담기록을 받습니다.</p>
      </div>

      <TypeSection
        title="상담형태 관리"
        items={consultationTypes}
        onAdd={addConsultationType}
        onDelete={deleteConsultationType}
      />
    </div>
  )
}
