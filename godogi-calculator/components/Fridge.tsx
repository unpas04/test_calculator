'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

interface FridgeItem {
  id: string
  name: string
  price: number
  per: number
  unit: string
  yield_: number
  category: string
}

const CATEGORIES = ['전체', '육류', '채소', '양념/소스', '유제품', '수산물', '기타']
const UNITS = ['g', 'ml', '개', '팩', 'kg', 'L']

interface Props {
  user: any
}

export default function Fridge({ user }: Props) {
  const [items, setItems] = useState<FridgeItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState('전체')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<FridgeItem | null>(null)
  const [form, setForm] = useState({ name: '', price: '', per: '', unit: 'g', yield_: '100', category: '기타' })
  const supabase = createClient()

  useEffect(() => {
    if (!user) return
    loadItems()
  }, [user])

  const loadItems = async () => {
    const { data, error } = await supabase
      .from('fridge')
      .select('*')
      .eq('user_id', user.id)
      .order('category')
    if (!error && data) setItems(data)
  }

  const openAdd = () => {
    setEditItem(null)
    setForm({ name: '', price: '', per: '', unit: 'g', yield_: '100', category: '기타' })
    setShowModal(true)
  }

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

    if (editItem) {
      await supabase.from('fridge').update(payload).eq('id', editItem.id)
    } else {
      await supabase.from('fridge').insert(payload)
    }
    setShowModal(false)
    loadItems()
  }

  const handleDelete = async (id: string) => {
    await supabase.from('fridge').delete().eq('id', id)
    loadItems()
  }

  const filtered = selectedCategory === '전체' ? items : items.filter(i => i.category === selectedCategory)

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(200,216,228,0.15)',
    borderRadius: 8, color: 'white',
    fontFamily: 'Gowun Dodum', fontSize: '0.85rem',
    outline: 'none'
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '0.7rem', color: 'rgba(200,216,228,0.5)',
    fontFamily: 'Black Han Sans', marginBottom: 4, display: 'block'
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
      {/* 카테고리 필터 */}
      <div style={{ display: 'flex', gap: 6, padding: '8px 8px 4px', flexWrap: 'wrap' }}>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setSelectedCategory(cat)} style={{
            padding: '4px 10px', borderRadius: 20,
            background: selectedCategory === cat ? 'var(--blue)' : 'rgba(255,255,255,0.07)',
            border: 'none', color: selectedCategory === cat ? 'white' : 'rgba(200,216,228,0.4)',
            fontFamily: 'Black Han Sans', fontSize: '0.68rem', cursor: 'pointer'
          }}>{cat}</button>
        ))}
      </div>

      {/* 재료 목록 */}
      <div style={{ padding: '4px 8px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(200,216,228,0.3)', fontSize: '0.78rem' }}>
            재료가 없어요<br />추가해보세요 🧊
          </div>
        ) : filtered.map(item => (
          <div key={item.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 10px', borderRadius: 10, marginBottom: 4,
            background: 'rgba(255,255,255,0.05)'
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.82rem', color: 'white', fontFamily: 'Black Han Sans', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.name}
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
            <button onClick={() => handleDelete(item.id)} style={{
              background: 'none', border: 'none', color: 'rgba(200,216,228,0.2)',
              cursor: 'pointer', fontSize: '0.75rem'
            }}>✕</button>
          </div>
        ))}
      </div>

      {/* 추가 버튼 */}
      <div style={{ padding: '8px' }}>
        <button onClick={openAdd} style={{
          width: '100%', padding: '8px 0',
          background: 'rgba(74,127,165,0.15)',
          border: '1.5px dashed rgba(74,127,165,0.4)',
          borderRadius: 10, color: 'var(--blue-light)',
          fontFamily: 'Black Han Sans', fontSize: '0.78rem', cursor: 'pointer'
        }}>＋ 재료 추가</button>
      </div>

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
            <div style={{ fontFamily: 'Black Han Sans', color: 'white', fontSize: '1rem' }}>
              {editItem ? '재료 수정' : '재료 추가'} 🧊
            </div>

            <div>
              <label style={labelStyle}>재료명</label>
              <input style={inputStyle} value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} placeholder="재료명" />
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
                fontFamily: 'Black Han Sans', fontSize: '0.82rem', cursor: 'pointer'
              }}>취소</button>
              <button onClick={handleSave} style={{
                flex: 1, padding: '10px 0', background: 'var(--blue)',
                border: 'none', borderRadius: 10, color: 'white',
                fontFamily: 'Black Han Sans', fontSize: '0.82rem', cursor: 'pointer'
              }}>저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}