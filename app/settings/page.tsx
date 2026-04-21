'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ConsultationType } from '@/lib/types'

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
      <TypeSection
        title="상담형태 관리"
        items={consultationTypes}
        onAdd={addConsultationType}
        onDelete={deleteConsultationType}
      />
    </div>
  )
}
