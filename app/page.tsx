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
    <div>
      <div className="flex gap-3 mb-6 flex-wrap">
        <input
          type="text"
          placeholder="의뢰인, 사건명, 사건번호 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm flex-1 min-w-48 bg-white"
        />
        <select
          value={filterFeePaid}
          onChange={(e) => setFilterFeePaid(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
        >
          <option value="">전체</option>
          <option value="paid">수임료 완납</option>
          <option value="unpaid">수임료 미납</option>
        </select>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm text-center py-12">불러오는 중...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-sm">사건이 없습니다.</p>
          <Link href="/cases/new" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
            첫 사건 등록하기
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <Link
              key={c.id}
              href={`/cases/${c.id}`}
              className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-400">{c.id}</span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full ${
                        c.fee_paid
                          ? 'bg-green-50 text-green-700 border border-green-100'
                          : 'bg-red-50 text-red-600 border border-red-100'
                      }`}
                    >
                      {c.fee_paid ? '완납' : '미납'}
                    </span>
                  </div>
                  <h2 className="font-semibold text-gray-900 mt-1">
                    {c.client_name ?? '—'}{c.case_name ? ` · ${c.case_name}` : ''}
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {[c.court, c.division, c.case_number].filter(Boolean).join(' ')}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 text-xs text-gray-400 space-y-1">
                  {c.hearing_at && (
                    <p>기일 {c.hearing_at.slice(0, 10)}</p>
                  )}
                  {c.next_consultation_at && (
                    <p className="text-orange-500">상담예정 {c.next_consultation_at.slice(0, 10)}</p>
                  )}
                  {c.fee != null && (
                    <p>{c.fee.toLocaleString()}원</p>
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
