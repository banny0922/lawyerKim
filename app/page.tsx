'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Consultation, CaseType, ConsultationType } from '@/lib/types'

function formatHour(hour: number) {
  if (hour === 0) return '오전 12시'
  if (hour < 12) return `오전 ${hour}시`
  if (hour === 12) return '오후 12시'
  return `오후 ${hour - 12}시`
}

export default function HomePage() {
  const supabase = createClient()
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [caseTypes, setCaseTypes] = useState<CaseType[]>([])
  const [consultationTypes, setConsultationTypes] = useState<ConsultationType[]>([])
  const [search, setSearch] = useState('')
  const [filterCaseType, setFilterCaseType] = useState('')
  const [filterConsultationType, setFilterConsultationType] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: c }, { data: ct }, { data: cot }] = await Promise.all([
        supabase
          .from('consultations')
          .select('*, case_types(id, name), consultation_types(id, name)')
          .order('date', { ascending: false })
          .order('hour', { ascending: false }),
        supabase.from('case_types').select('*').order('name'),
        supabase.from('consultation_types').select('*').order('name'),
      ])
      setConsultations((c as Consultation[]) ?? [])
      setCaseTypes(ct ?? [])
      setConsultationTypes(cot ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = consultations.filter((c) => {
    if (search && !c.client_name.includes(search)) return false
    if (filterCaseType && c.case_type_id !== filterCaseType) return false
    if (filterConsultationType && c.consultation_type_id !== filterConsultationType) return false
    return true
  })

  return (
    <div>
      <div className="flex gap-3 mb-6 flex-wrap">
        <input
          type="text"
          placeholder="상담자 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm flex-1 min-w-40 bg-white"
        />
        <select
          value={filterCaseType}
          onChange={(e) => setFilterCaseType(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
        >
          <option value="">전체 사건유형</option>
          {caseTypes.map((ct) => (
            <option key={ct.id} value={ct.id}>{ct.name}</option>
          ))}
        </select>
        <select
          value={filterConsultationType}
          onChange={(e) => setFilterConsultationType(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
        >
          <option value="">전체 상담형태</option>
          {consultationTypes.map((ct) => (
            <option key={ct.id} value={ct.id}>{ct.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm text-center py-12">불러오는 중...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-sm">상담 일지가 없습니다.</p>
          <Link href="/consultations/new" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
            첫 상담 일지 작성하기
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <Link
              key={c.id}
              href={`/consultations/${c.id}`}
              className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-gray-900">{c.client_name}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {c.date} · {formatHour(c.hour)}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                  {c.case_types && (
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
                      {c.case_types.name}
                    </span>
                  )}
                  {c.consultation_types && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {c.consultation_types.name}
                    </span>
                  )}
                </div>
              </div>
              {c.content && (
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{c.content}</p>
              )}
              {c.next_appointment && (
                <p className="text-xs text-orange-600 mt-2 font-medium">
                  다음 약속: {c.next_appointment}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
