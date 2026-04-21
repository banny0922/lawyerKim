'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Case } from '@/lib/types'

export default function SettlementsPage() {
  const supabase = createClient()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [cases, setCases] = useState<Case[]>([])
  const [carryOver, setCarryOver] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const from = `${year}-${String(month).padStart(2, '0')}-01`
      const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`

      const [{ data: thisMonth }, { data: prev }] = await Promise.all([
        supabase
          .from('cases')
          .select('*')
          .gte('accepted_at', from)
          .lt('accepted_at', nextMonth)
          .order('accepted_at', { ascending: true }),
        supabase
          .from('cases')
          .select('unpaid_fee')
          .lt('accepted_at', from)
          .gt('unpaid_fee', 0),
      ])

      setCases(thisMonth ?? [])
      setCarryOver((prev ?? []).reduce((sum, c) => sum + (c.unpaid_fee ?? 0), 0))
      setLoading(false)
    }
    load()
  }, [year, month])

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const totalFee = cases.reduce((sum, c) => sum + (c.fee ?? 0), 0)
  const totalUnpaid = cases.reduce((sum, c) => sum + (c.unpaid_fee ?? 0), 0)
  const totalPaid = totalFee - totalUnpaid

  return (
    <div className="w-full max-w-3xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">정산기록</h1>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="px-2.5 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50">‹</button>
          <span className="text-sm font-medium text-gray-700 w-20 text-center">{year}년 {month}월</span>
          <button onClick={nextMonth} className="px-2.5 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50">›</button>
        </div>
      </div>

      {/* 요약 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">총 수임료</p>
          <p className="text-base font-bold text-gray-900">{totalFee.toLocaleString()}원</p>
        </div>
        <div className="bg-white border border-green-100 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">수납금액</p>
          <p className="text-base font-bold text-green-600">{totalPaid.toLocaleString()}원</p>
        </div>
        <div className="bg-white border border-red-100 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">미납금액</p>
          <p className="text-base font-bold text-red-500">{totalUnpaid.toLocaleString()}원</p>
        </div>
        <div className="bg-white border border-orange-100 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">이월금액</p>
          <p className="text-base font-bold text-orange-500">{carryOver.toLocaleString()}원</p>
        </div>
      </div>

      {/* 사건 목록 */}
      {loading ? (
        <p className="text-sm text-gray-400 text-center py-8">불러오는 중...</p>
      ) : cases.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">이 달에 수임한 사건이 없습니다.</p>
      ) : (
        {/* 데스크톱: 테이블 */}
        <div className="hidden sm:block bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">수임일</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">의뢰인</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">사건명</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">수임료</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">미납</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">완납</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cases.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500">{c.accepted_at ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    <Link href={`/cases/${encodeURIComponent(c.id)}`} className="hover:text-blue-600 hover:underline">
                      {c.client_name ?? '—'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.case_name ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-800">
                    {c.fee != null ? `${c.fee.toLocaleString()}원` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.unpaid_fee && c.unpaid_fee > 0
                      ? <span className="text-red-500 font-medium">{c.unpaid_fee.toLocaleString()}원</span>
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.fee_paid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-500'}`}>
                      {c.fee_paid ? '완납' : '미납'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* 모바일: 카드 */}
        <div className="sm:hidden space-y-2">
          {cases.map((c) => (
            <Link key={c.id} href={`/cases/${encodeURIComponent(c.id)}`}
              className="block bg-white border border-gray-200 rounded-lg px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-gray-900">{c.client_name ?? '—'}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${c.fee_paid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-500'}`}>
                  {c.fee_paid ? '완납' : '미납'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-2">{c.case_name ?? '—'} · {c.accepted_at ?? '—'}</p>
              <div className="flex gap-4 text-sm">
                <span className="text-gray-600">수임료 <span className="font-medium text-gray-900">{c.fee != null ? `${c.fee.toLocaleString()}원` : '—'}</span></span>
                {c.unpaid_fee && c.unpaid_fee > 0 && (
                  <span className="text-red-500">미납 <span className="font-medium">{c.unpaid_fee.toLocaleString()}원</span></span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
