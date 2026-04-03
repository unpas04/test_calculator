'use client'

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { createClient } from '@/lib/supabase'
import { INGREDIENT_DB } from '@/lib/ingredientDB'

interface FridgeItem {
  id: string
  name: string
  price: number
  per: number
  unit: string
  yield_: number
  category: string
  isDB?: boolean
}

const CATEGORIES = ['전체', '육류', '채소', '양념/소스', '유제품', '곡류/면', '과일', '수산물', '기타']
const UNITS = ['g', 'ml', '개', '팩', 'kg', 'L']

interface Props {
  user: any
}

export interface FridgeHandle { openAdd: () => void }

export default forwardRef<FridgeHandle, Props>(function Fridge({ user }, ref) {
  const [items, setItems] = useState<FridgeItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState('전체')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<FridgeItem | null>(null)
  const [form, setForm] = useState({ name: '', price: '', per: '', unit: 'g', yield_: '100', category: '기타' })
  const [search, setSearch] = useState('')
  const [ocrProcessing, setOcrProcessing] = useState(false)
  const [ocrResults, setOcrResults] = useState<any[]>([])
  const [ocrSelected, setOcrSelected] = useState<Set<number>>(new Set())
  const [showOcrResults, setShowOcrResults] = useState(false)
  const ocrInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!user) return
    loadItems()
    // syncToFridge debounce(800ms) 이후 반영 위해 1.2초 후 한 번 더 로드
    const timer = setTimeout(loadItems, 1200)
    return () => clearTimeout(timer)
  }, [user])

  const loadItems = async () => {
    const { data, error } = await supabase
      .from('fridge')
      .select('*')
      .eq('user_id', user.id)
      .order('category')
    if (!error && data) setItems(data)
  }
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('fridge_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'fridge',
        filter: `user_id=eq.${user.id}`
      }, () => {
        loadItems()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  // 냉장고 + DB 합치기 (냉장고 우선)
  const mergedItems = (): FridgeItem[] => {
    const fridgeNames = items.map(i => i.name)
    const dbItems = INGREDIENT_DB
      .filter(d => !fridgeNames.includes(d.name))
      .map(d => ({ ...d, id: 'db_' + d.name, per: d.per, isDB: true }))
    return [...items, ...dbItems]
  }

  const filtered = () => {
    const all = mergedItems()
    return all.filter(i => {
      const matchCat = selectedCategory === '전체' || i.category === selectedCategory
      const matchSearch = i.name.includes(search)
      return matchCat && matchSearch
    })
  }

  const openAdd = () => {
    setEditItem(null)
    setForm({ name: '', price: '', per: '', unit: 'g', yield_: '100', category: '기타' })
    setShowModal(true)
  }

  useImperativeHandle(ref, () => ({ openAdd }))

  const openEdit = (item: FridgeItem) => {
    setEditItem(item)
    setForm({
      name: item.name,
      price: String(item.price),
      per: String(item.per),
      unit: item.unit,
      yield_: String(item.yield_),
      category: item.category
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    const payload = {
      user_id: user.id,
      name: form.name,
      price: parseFloat(form.price) || 0,
      per: parseFloat(form.per) || 0,
      unit: form.unit,
      yield_: parseFloat(form.yield_) || 100,
      category: form.category,
    }

    if (editItem && !editItem.isDB) {
      await supabase.from('fridge').update(payload).eq('id', editItem.id)
    } else {
      // DB 재료 편집 or 새 재료 → insert
      await supabase.from('fridge').insert(payload)
    }
    setShowModal(false)
    loadItems()
  }

  const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (!files || files.length === 0) return
    setOcrProcessing(true)
    try {
      const formData = new FormData()
      for (let i = 0; i < files.length; i++) formData.append('images', files[i])
      if (user) formData.append('userId', user.id)
      const response = await fetch('/api/ocr', { method: 'POST', body: formData })
      if (!response.ok) throw new Error(`OCR failed: ${response.status}`)
      const data = await response.json()
      setOcrResults(data.items || [])
      setOcrSelected(new Set())
      setShowOcrResults(true)
    } catch (err) {
      alert('영수증 처리 실패: ' + (err instanceof Error ? err.message : '알 수 없는 오류'))
    } finally {
      setOcrProcessing(false)
      if (ocrInputRef.current) ocrInputRef.current.value = ''
    }
  }

  const handleOcrAdd = async () => {
    if (!user || ocrSelected.size === 0) return
    const toAdd = Array.from(ocrSelected).map(idx => ocrResults[idx])
    await supabase.from('fridge').insert(toAdd.map(item => ({
      user_id: user.id, name: item.name, price: item.price,
      per: item.per, unit: item.unit, yield_: 100, category: '기타',
    })))
    setShowOcrResults(false)
    setOcrResults([])
    setOcrSelected(new Set())
    loadItems()
  }

  const handleDelete = async (item: FridgeItem) => {
    if (item.isDB) return // DB 재료는 삭제 불가
    await supabase.from('fridge').delete().eq('id', item.id)
    loadItems()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(200,216,228,0.15)',
    borderRadius: 8, color: 'white',
    fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 400, fontSize: '0.85rem',
    outline: 'none'
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '0.7rem', color: 'rgba(200,216,228,0.5)',
    fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700,
    marginBottom: 4, display: 'block'
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{`
        .fridge-scroll::-webkit-scrollbar { width: 4px; }
        .fridge-scroll::-webkit-scrollbar-track { background: transparent; }
        .fridge-scroll::-webkit-scrollbar-thumb { background: rgba(74,127,165,0.35); border-radius: 2px; }
        .fridge-scroll { scrollbar-width: thin; scrollbar-color: rgba(74,127,165,0.35) transparent; }
      `}</style>

      {/* hidden OCR input */}
      <input ref={ocrInputRef} type="file" accept="image/*" multiple onChange={handleOcrUpload} style={{ display: 'none' }} />

      {/* 검색창 + 카테고리 — 고정 */}
      <div style={{ flexShrink: 0, padding: '8px 8px 0', display: 'flex', gap: 8 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 재료 검색..."
          style={{
            flex: 1, padding: '8px 12px',
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(200,216,228,0.15)',
            borderRadius: 10, color: 'white',
            fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 400, fontSize: '0.82rem',
            outline: 'none', boxSizing: 'border-box' as const
          }}
        />
        <button
          onClick={() => ocrInputRef.current?.click()}
          disabled={ocrProcessing}
          style={{
            flexShrink: 0, padding: '8px 12px',
            background: 'rgba(74,127,165,0.2)', border: '1px solid rgba(74,127,165,0.3)',
            borderRadius: 10, color: '#7DB8D8', fontSize: '0.8rem',
            cursor: ocrProcessing ? 'not-allowed' : 'pointer', opacity: ocrProcessing ? 0.5 : 1,
            fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, whiteSpace: 'nowrap',
          }}
        >{ocrProcessing ? '처리중...' : '📷 영수증'}</button>
      </div>
      <div style={{
        flexShrink: 0, display: 'flex', gap: 6, padding: '8px 8px 4px',
        overflowX: 'auto', flexWrap: 'nowrap', scrollbarWidth: 'none'
      }}>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setSelectedCategory(cat)} style={{
            padding: '4px 12px', borderRadius: 20, flexShrink: 0,
            background: selectedCategory === cat ? 'var(--blue)' : 'rgba(255,255,255,0.07)',
            border: 'none', color: selectedCategory === cat ? 'white' : 'rgba(200,216,228,0.5)',
            fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}>{cat}</button>
        ))}
      </div>

      {/* 재료 목록 — 스크롤 */}
      <div className="fridge-scroll" style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
        {filtered().map(item => (
          <div key={item.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 10px', borderRadius: 10, marginBottom: 4,
            background: item.isDB ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.07)',
            border: item.isDB ? '1px solid rgba(255,255,255,0.04)' : 'none'
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: '0.82rem', color: item.isDB ? 'rgba(200,216,228,0.5)' : 'white', fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.name}
                </span>
                {item.isDB && <span style={{ fontSize: '0.55rem', color: 'rgba(200,216,228,0.25)', background: 'rgba(255,255,255,0.05)', padding: '1px 5px', borderRadius: 4 }}>기본</span>}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(200,216,228,0.4)' }}>
                {item.price.toLocaleString()}원 / {item.per}{item.unit}
                {item.yield_ !== 100 && ` · 수율 ${item.yield_}%`}
              </div>
            </div>
            <button onClick={() => openEdit(item)} style={{
              background: 'none', border: 'none', color: 'rgba(200,216,228,0.3)',
              cursor: 'pointer', fontSize: '0.75rem'
            }}>✏️</button>
            {!item.isDB && (
              <button onClick={() => handleDelete(item)} style={{
                background: 'none', border: 'none', color: 'rgba(200,216,228,0.2)',
                cursor: 'pointer', fontSize: '0.75rem'
              }}>✕</button>
            )}
          </div>
        ))}
      </div>


      {/* OCR 결과 모달 */}
      {showOcrResults && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#1E2D40', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, maxHeight: '70vh', display: 'flex', flexDirection: 'column', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem' }}>📷 영수증 분석 ({ocrResults.length}개)</span>
              <button onClick={() => setShowOcrResults(false)} style={{ background: 'none', border: 'none', color: 'rgba(200,216,228,0.5)', fontSize: '1.1rem', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12 }}>
              {ocrResults.map((item, idx) => (
                <div key={idx} onClick={() => {
                  const ns = new Set(ocrSelected)
                  ns.has(idx) ? ns.delete(idx) : ns.add(idx)
                  setOcrSelected(ns)
                }} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  borderRadius: 10, marginBottom: 6, cursor: 'pointer',
                  background: ocrSelected.has(idx) ? 'rgba(74,127,165,0.25)' : 'rgba(255,255,255,0.05)',
                  border: ocrSelected.has(idx) ? '1px solid rgba(74,127,165,0.4)' : '1px solid transparent',
                }}>
                  <input type="checkbox" checked={ocrSelected.has(idx)} onChange={() => {}} style={{ accentColor: '#4A7FA5' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'white', fontSize: '0.85rem', fontWeight: 600 }}>{item.name}</div>
                    <div style={{ color: 'rgba(200,216,228,0.5)', fontSize: '0.72rem' }}>{item.price?.toLocaleString()}원 / {item.per}{item.unit}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setOcrSelected(ocrSelected.size === ocrResults.length ? new Set() : new Set(ocrResults.map((_, i) => i)))}
                style={{ flex: 1, padding: '10px 0', background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 10, color: 'rgba(200,216,228,0.6)', fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
                {ocrSelected.size === ocrResults.length ? '전체 해제' : '전체 선택'}
              </button>
              <button onClick={handleOcrAdd} disabled={ocrSelected.size === 0}
                style={{ flex: 2, padding: '10px 0', background: ocrSelected.size === 0 ? 'rgba(255,255,255,0.1)' : '#4A7FA5', border: 'none', borderRadius: 10, color: ocrSelected.size === 0 ? 'rgba(200,216,228,0.3)' : 'white', fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, fontSize: '0.82rem', cursor: ocrSelected.size === 0 ? 'not-allowed' : 'pointer' }}>
                선택 추가 ({ocrSelected.size})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 모달 */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#1E2D40', borderRadius: 20, padding: 24,
            width: 300, display: 'flex', flexDirection: 'column', gap: 14
          }}>
            <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, color: 'white', fontSize: '1rem' }}>
              {editItem ? (editItem.isDB ? '매입가 수정 🧊' : '재료 수정') : '재료 추가 🧊'}
            </div>
            {editItem?.isDB && (
              <div style={{ fontSize: '0.72rem', color: 'rgba(200,216,228,0.4)', background: 'rgba(255,255,255,0.05)', padding: '8px 10px', borderRadius: 8 }}>
                수정하면 내 냉장고에 저장돼요
              </div>
            )}

            <div>
              <label style={labelStyle}>재료명</label>
              <input style={inputStyle} value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="재료명" disabled={!!editItem} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>구매가 (원)</label>
                <input style={inputStyle} value={form.price} inputMode="numeric"
                  onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0" />
              </div>
              <div>
                <label style={labelStyle}>구매량</label>
                <input style={inputStyle} value={form.per} inputMode="numeric"
                  onChange={e => setForm({ ...form, per: e.target.value })} placeholder="0" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>단위</label>
                <select style={inputStyle} value={form.unit}
                  onChange={e => setForm({ ...form, unit: e.target.value })}>
                  {UNITS.map(u => <option key={u} style={{ background: '#1E2D40' }}>{u}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>수율 (%)</label>
                <input style={inputStyle} value={form.yield_} inputMode="numeric"
                  onChange={e => setForm({ ...form, yield_: e.target.value })} placeholder="100" />
              </div>
            </div>

            <div>
              <label style={labelStyle}>카테고리</label>
              <select style={inputStyle} value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.filter(c => c !== '전체').map(c => (
                  <option key={c} style={{ background: '#1E2D40' }}>{c}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button onClick={() => setShowModal(false)} style={{
                flex: 1, padding: '10px 0', background: 'rgba(255,255,255,0.07)',
                border: 'none', borderRadius: 10, color: 'rgba(200,216,228,0.5)',
                fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer'
              }}>취소</button>
              <button onClick={handleSave} style={{
                flex: 1, padding: '10px 0', background: 'var(--blue)',
                border: 'none', borderRadius: 10, color: 'white',
                fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer'
              }}>저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})