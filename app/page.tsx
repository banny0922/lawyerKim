'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Case } from '@/lib/types'

export default function HomePage() {
  const supabase = createClient()
  const [cases, setCases] = useState<Case[]>([])
  const [search, setSearch] = useState('')
  const [filterFeePaid, setFilterFeePaid] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('cases')
        .select('*')
        .order('created_at', { ascending: false })
      setCases(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = cases.filter((c) => {
    if (search && !`${c.client_name ?? ''}${c.case_name ?? ''}${c.id}`.includes(search)) return false
    if (filterFeePaid === 'paid' && !c.fee_paid) return false
    if (filterFeePaid === 'unpaid' && c.fee_paid) return false
    return true
  })

  return (
    <div className="w-full">
      <div className="flex gap-2 mb-5">
        <div className="relative flex-1 min-w-0">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="의뢰인, 사건명, 사건번호 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm bg-white"
          />
        </div>
        <select
          value={filterFeePaid}
          onChange={(e) => setFilterFeePaid(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white text-gray-600"
        >
          <option value="">전체</option>
          <option value="paid">완납</option>
          <option value="unpaid">미납</option>
        </select>
      </div>

      {!loading && cases.length > 0 && (
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          사건 {filtered.length}건{filterFeePaid || search ? ` / 전체 ${cases.length}건` : ''}
        </p>
      )}

      {loading ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-sm">불러오는 중...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm font-medium">사건이 없습니다</p>
          {!search && !filterFeePaid && (
            <Link href="/cases/new" className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-700">
              첫 사건 등록하기 →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((c) => (
            <Link
              key={c.id}
              href={`/cases/${c.id}`}
              className="block bg-white border border-gray-100 rounded-xl p-4 hover:border-blue-200 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      c.fee_paid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                    }`}>
                      {c.fee_paid ? '완납' : '미납'}
                    </span>
                    <span className="text-xs font-mono text-gray-300">{c.id}</span>
                  </div>
                  <h2 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {c.client_name ?? '—'}
                    {c.case_name ? <span className="text-gray-400 font-normal"> · {c.case_name}</span> : ''}
                  </h2>
                  {(c.court || c.division || c.case_number) && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {[c.court, c.division, c.case_number].filter(Boolean).join(' ')}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0 space-y-1">
                  {c.hearing_at && (
                    <p className="text-xs text-gray-500">기일 {c.hearing_at.slice(0, 10)}</p>
                  )}
                  {c.next_consultation_at && (
                    <p className="text-xs text-amber-600">상담예정 {c.next_consultation_at.slice(0, 10)}</p>
                  )}
                  {c.fee != null && (
                    <p className="text-xs text-gray-500">{c.fee.toLocaleString()}원</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
