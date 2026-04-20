'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface CalendarEvent {
  date: string // YYYY-MM-DD
  time?: string // HH:MM
  label: string
  type: 'hearing' | 'consultation' | 'next_consultation'
  href: string
}

const TYPE_STYLE = {
  hearing: 'bg-red-100 text-red-700 border-red-200',
  consultation: 'bg-blue-100 text-blue-700 border-blue-200',
  next_consultation: 'bg-orange-100 text-orange-700 border-orange-200',
}

const TYPE_DOT = {
  hearing: 'bg-red-400',
  consultation: 'bg-blue-400',
  next_consultation: 'bg-orange-400',
}

const TYPE_LABEL = {
  hearing: '기일',
  consultation: '상담',
  next_consultation: '상담예정',
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

export default function CalendarPage() {
  const supabase = createClient()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  useEffect(() => {
    async function load() {
      const [{ data: cases }, { data: consultations }] = await Promise.all([
        supabase.from('cases').select('id, client_name, case_name, hearing_at, next_consultation_at'),
        supabase
          .from('consultations')
          .select('id, case_id, consulted_at, consultation_types(name)')
          .not('consulted_at', 'is', null),
      ])

      const ev: CalendarEvent[] = []

      for (const c of cases ?? []) {
        const label = c.client_name ?? c.id
        if (c.hearing_at) {
          ev.push({
            date: c.hearing_at.slice(0, 10),
            time: c.hearing_at.slice(11, 16),
            label: `${label} 기일`,
            type: 'hearing',
            href: `/cases/${encodeURIComponent(c.id)}`,
          })
        }
        if (c.next_consultation_at) {
          ev.push({
            date: c.next_consultation_at.slice(0, 10),
            time: c.next_consultation_at.slice(11, 16),
            label: `${label} 상담예정`,
            type: 'next_consultation',
            href: `/cases/${encodeURIComponent(c.id)}`,
          })
        }
      }

      for (const c of ((consultations ?? []) as unknown as { id: string; case_id: string; consulted_at: string; consultation_types: { name: string } | null }[])) {
        if (c.consulted_at) {
          ev.push({
            date: c.consulted_at.slice(0, 10),
            time: c.consulted_at.slice(11, 16),
            label: `상담 (${c.consultation_types?.name ?? ''})`,
            type: 'consultation',
            href: `/cases/${encodeURIComponent(c.case_id)}/consultations/${c.id}`,
          })
        }
      }

      setEvents(ev)
    }
    load()
  }, [])

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
    setSelectedDay(null)
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
    setSelectedDay(null)
  }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const DAYS = ['일', '월', '화', '수', '목', '금', '토']

  function eventsForDay(day: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter(e => e.date === dateStr).sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))
  }

  const selectedEvents = selectedDay ? eventsForDay(selectedDay) : []

  return (
    <div className="w-full max-w-3xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-900">
          {year}년 {month + 1}월
        </h1>
        <div className="flex gap-1.5">
          <button onClick={prevMonth} className="px-2.5 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50">‹</button>
          <button
            onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelectedDay(today.getDate()) }}
            className="px-2.5 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
          >
            오늘
          </button>
          <button onClick={nextMonth} className="px-2.5 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50">›</button>
        </div>
      </div>

      {/* 범례 */}
      <div className="flex gap-3 mb-3 text-xs">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />기일</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />상담</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />상담예정</span>
      </div>

      {/* 달력 */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-200">
          {DAYS.map((d, i) => (
            <div key={d} className={`text-center text-xs font-medium py-2 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'}`}>
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="border-b border-r border-gray-100 min-h-10 sm:min-h-16 p-0.5 sm:p-1" />
          ))}

          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dayEvents = eventsForDay(day)
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
            const isSelected = day === selectedDay
            const dayOfWeek = (firstDay + day - 1) % 7

            return (
              <div
                key={day}
                onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                className={`border-b border-r border-gray-100 min-h-10 sm:min-h-16 p-0.5 sm:p-1 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
              >
                <div className={`text-xs font-medium w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full mb-0.5 sm:mb-1 ${
                  isToday ? 'bg-blue-600 text-white' :
                  dayOfWeek === 0 ? 'text-red-500' :
                  dayOfWeek === 6 ? 'text-blue-500' :
                  'text-gray-700'
                }`}>
                  {day}
                </div>

                {/* 모바일: 점만 표시 */}
                <div className="flex flex-wrap gap-0.5 sm:hidden">
                  {dayEvents.slice(0, 3).map((ev, i) => (
                    <span key={i} className={`w-1.5 h-1.5 rounded-full ${TYPE_DOT[ev.type]}`} />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                  )}
                </div>

                {/* 데스크톱: 레이블 표시 */}
                <div className="hidden sm:block space-y-0.5">
                  {dayEvents.slice(0, 2).map((ev, i) => (
                    <div key={i} className={`text-xs px-1 py-0.5 rounded truncate border ${TYPE_STYLE[ev.type]}`}>
                      {ev.time && <span className="font-mono mr-1">{ev.time}</span>}
                      {ev.label}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-xs text-gray-400 px-1">+{dayEvents.length - 2}개</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 선택된 날 이벤트 */}
      {selectedDay && (
        <div className="mt-3 bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            {month + 1}월 {selectedDay}일 일정
          </h2>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-gray-400">일정이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {selectedEvents.map((ev, i) => (
                <li key={i}>
                  <Link href={ev.href} className={`flex items-center gap-2 sm:gap-3 px-3 py-2 rounded-md border text-sm hover:opacity-80 transition-opacity ${TYPE_STYLE[ev.type]}`}>
                    <span className="font-mono text-xs flex-shrink-0">{ev.time ?? '--:--'}</span>
                    <span className="font-medium text-xs flex-shrink-0">[{TYPE_LABEL[ev.type]}]</span>
                    <span className="truncate text-xs sm:text-sm">{ev.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
