'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { INGREDIENT_DB } from '@/lib/ingredientDB'
import { toPng } from 'html-to-image'

interface Ingredient {
  id: string
  name: string
  price: number
  qty: number
  unit: string
  yield_: number
  use_amount: number
}

interface Menu {
  id: string
  name: string
  ingredients: Ingredient[]
  packaging: number
  labor: number
  overhead: number
  delivery_fee: number
  card_fee: number
  sale_price: number
}

function calcMenu(menu: Menu) {
  const ingCosts = menu.ingredients.map(ing => {
    const qty = ing.qty || 1
    const yield_ = (ing.yield_ || 100) / 100
    const unitCost = ing.price / qty / yield_
    return unitCost * (ing.use_amount || 0)
  })
  const ingTotal = ingCosts.reduce((a, b) => a + b, 0)
  const baseCost = ingTotal + (menu.packaging || 0) + (menu.labor || 0) + (menu.overhead || 0)
  const feeRate = ((menu.delivery_fee || 0) + (menu.card_fee || 0)) / 100
  const feeAmount = baseCost * feeRate
  const totalCost = baseCost + feeAmount
  const profit = (menu.sale_price || 0) - totalCost
  const costRate = menu.sale_price > 0 ? (totalCost / menu.sale_price) * 100 : 0
  return { ingCosts, ingTotal, totalCost, profit, costRate }
}

function fmt(n: number) { return Math.round(n).toLocaleString('ko-KR') }

function toComma(val: any) {
  const n = parseFloat(String(val).replace(/,/g, ''))
  if (isNaN(n) || val === '' || val === null) return ''
  return n.toLocaleString('ko-KR')
}

function fromComma(val: string) {
  return parseFloat(String(val).replace(/,/g, '')) || 0
}

const UNITS = ['g', 'ml', '개', '팩', 'kg', 'L']

function genId() { return crypto.randomUUID() }

function defaultIngredient(): Ingredient {
  return { id: genId(), name: '', price: 0, qty: 0, unit: 'g', yield_: 100, use_amount: 0 }
}

interface Props {
  menu: Menu
  onChange: (menu: Menu) => void
}

export default function Calculator({ menu, onChange }: Props) {
  const calc = calcMenu(menu)
  const supabase = createClient()
  const exportRef = useRef<HTMLDivElement>(null)

  const handleExport = async () => {
    if (!exportRef.current) return
    try {
      const dataUrl = await toPng(exportRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      })
      const link = document.createElement('a')
      link.download = `${menu.name || '메뉴'}_원가계산서.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('PNG export error:', err)
    }
  }
  const [fridgeItems, setFridgeItems] = useState<any[]>([])
  const [suggestions, setSuggestions] = useState<{ [key: string]: any[] }>({})
  const [showSugg, setShowSugg] = useState<{ [key: string]: boolean }>({})
  const [openRows, setOpenRows] = useState<Set<string>>(new Set())
  const [showOverheadModal, setShowOverheadModal] = useState(false)
  const [overheadForm, setOverheadForm] = useState({ fixed: '', days: '', count: '' })
  const [showLaborModal, setShowLaborModal] = useState(false)
  const [laborForm, setLaborForm] = useState({ labor: '', days: '', count: '' })

  useEffect(() => {
    const loadFridge = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase.from('fridge').select('*').eq('user_id', session.user.id)
      if (data) setFridgeItems(data)
    }
    loadFridge()
  }, [])

  const handleNameInput = (id: string, val: string) => {
    updateIng(id, 'name', val)
    if (val.length < 1) {
      setSuggestions(prev => ({ ...prev, [id]: [] }))
      return
    }
    const fromFridge = fridgeItems.filter(f => f.name.includes(val))
    const fromDB = INGREDIENT_DB
      .filter(d => d.name.includes(val) && !fromFridge.find(f => f.name === d.name))
      .map(d => ({ ...d, per: d.per, id: 'db_' + d.name }))
    const merged = [...fromFridge, ...fromDB].slice(0, 8)
    setSuggestions(prev => ({ ...prev, [id]: merged }))
    setShowSugg(prev => ({ ...prev, [id]: true }))
  }

  const selectSuggestion = (ingId: string, item: any) => {
    onChange({
      ...menu,
      ingredients: menu.ingredients.map(ing =>
        ing.id === ingId ? {
          ...ing,
          name: item.name,
          price: item.price,
          qty: item.per,
          unit: item.unit,
          yield_: item.yield_,
        } : ing
      )
    })
    setShowSugg(prev => ({ ...prev, [ingId]: false }))
  }

  const toggleRow = (id: string) => {
    setOpenRows(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const updateIng = (id: string, field: keyof Ingredient, val: any) => {
    onChange({
      ...menu,
      ingredients: menu.ingredients.map(ing =>
        ing.id === id ? { ...ing, [field]: val } : ing
      )
    })
  }
  const syncTimers = useRef<{ [id: string]: any }>({})
  const latestIngredients = useRef(menu.ingredients)
  latestIngredients.current = menu.ingredients

  const debouncedSync = (id: string) => {
    if (syncTimers.current[id]) clearTimeout(syncTimers.current[id])
    syncTimers.current[id] = setTimeout(() => {
      const ing = latestIngredients.current.find(i => i.id === id)
      if (ing) syncToFridge(ing)
    }, 800)
  }
  const syncToFridge = async (ing: any) => {
    if (!ing.name || !ing.price || !ing.qty) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data } = await supabase
      .from('fridge')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('name', ing.name)
      .maybeSingle()

    if (data) {
      await supabase.from('fridge').update({
        price: ing.price, per: ing.qty, unit: ing.unit, yield_: ing.yield_
      }).eq('id', data.id)
    } else {
      await supabase.from('fridge').insert({
        user_id: session.user.id,
        name: ing.name,
        price: ing.price,
        per: ing.qty,
        unit: ing.unit,
        yield_: ing.yield_,
        category: '기타'
      })
    }
  }

  const addIng = () => {
    onChange({ ...menu, ingredients: [...menu.ingredients, defaultIngredient()] })
  }

  const deleteIng = (id: string) => {
    if (menu.ingredients.length <= 1) return
    onChange({ ...menu, ingredients: menu.ingredients.filter(i => i.id !== id) })
  }

  const godogiComment = () => {
    const { profit, costRate } = calc
    if (menu.sale_price <= 0) return '판매가를 입력해줘야 고독이도 계산할 수 있어요... 🐟'
    if (profit < 0) return '적자예요... 🐟 가격을 올리거나 원가를 줄여봐요.'
    if (costRate > 80) return `원가율이 ${costRate.toFixed(1)}%네요. 고독이가 걱정돼요 🐟`
    if (costRate > 60) return `원가율 ${costRate.toFixed(1)}%. 조금 더 줄일 수 있을 것 같아요 🐟`
    if (costRate > 40) return `원가율 ${costRate.toFixed(1)}%. 괜찮아요! 고독이도 흡족해요 🐟`
    return `원가율 ${costRate.toFixed(1)}%! 훌륭해요 🐟 고독이가 자랑스러워해요!`
  }

  const card = (children: React.ReactNode) => (
    <div style={{
      background: 'white', borderRadius: 18, padding: '20px 18px',
      boxShadow: '0 2px 12px rgba(30,45,64,0.07)',
      border: '1px solid var(--border)', marginBottom: 16
    }}>{children}</div>
  )

  const cardTitle = (title: string) => (
    <div style={{
      fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: '0.85rem',
      color: 'var(--text-mid)', letterSpacing: '0.05em',
      marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8
    }}>
      <span style={{ width: 3, height: 14, background: 'var(--blue)', borderRadius: 3, display: 'inline-block' }} />
      {title}
    </div>
  )

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--silver-light)',
    border: '1.5px solid transparent', borderRadius: 9,
    padding: '8px 6px', fontFamily: 'Gowun Dodum',
    fontSize: '0.83rem', color: 'var(--text)',
    textAlign: 'center', outline: 'none'
  }

  const helpBtn = (onClick: () => void) => (
    <button onClick={onClick} style={{
      background: 'var(--blue)', color: 'white', border: 'none',
      borderRadius: '50%', width: 15, height: 15, fontSize: '0.55rem',
      cursor: 'pointer', lineHeight: 1,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0
    }}>?</button>
  )

  const overheadResult = overheadForm.fixed && overheadForm.days && overheadForm.count
    ? Math.round(fromComma(overheadForm.fixed) / (parseFloat(overheadForm.days) * parseFloat(overheadForm.count)))
    : null

  const laborResult = laborForm.labor && laborForm.days && laborForm.count
    ? Math.round(fromComma(laborForm.labor) / (parseFloat(laborForm.days) * parseFloat(laborForm.count)))
    : null

  return (
    <div>
      {/* 상단 바 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
        <input
          value={menu.name}
          onChange={e => onChange({ ...menu, name: e.target.value })}
          placeholder="메뉴 이름 입력"
          style={{
            flex: 1, fontFamily: 'Black Han Sans', fontSize: '1.5rem',
            color: 'var(--navy)', background: 'none',
            border: 'none', borderBottom: '2px solid var(--border)',
            outline: 'none', padding: '4px 0',
            cursor: 'text', maxWidth: '100%', width: '100%'
          }}
        />
        <button onClick={handleExport} className="save-btn" style={{
          background: 'var(--blue)', color: 'white', border: 'none',
          borderRadius: 12, padding: '10px 18px',
          fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer'
        }}>📷 저장</button>
      </div>

      {/* 재료 카드 */}
      {card(<>
        {cardTitle('재료 원가')}
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              {['재료명', '사용량', '단위', '원가', ''].map((h, i) => (
                <th key={i} style={{
                  fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: '0.68rem',
                  color: 'var(--text-soft)', padding: '0 3px 10px',
                  textAlign: i === 3 ? 'right' : i === 0 ? 'left' : 'center',
                  width: ['38%', '18%', '16%', '20%', '8%'][i]
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {menu.ingredients.map((ing, idx) => (
              <tr key={ing.id}>
                <td colSpan={5} style={{ padding: 0 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr style={{ borderBottom: openRows.has(ing.id) ? 'none' : '1px solid var(--silver-light)' }}>
                        <td style={{ padding: '5px 3px', width: '38%', position: 'relative' }}>
                          <input
                            style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }}
                            value={ing.name} placeholder="재료명"
                            onChange={e => handleNameInput(ing.id, e.target.value)}
                            onFocus={() => {
                              if (ing.name.length > 0) setShowSugg(prev => ({ ...prev, [ing.id]: true }))
                            }}
                            onBlur={() => setTimeout(() => setShowSugg(prev => ({ ...prev, [ing.id]: false })), 150)}
                          />
                          {showSugg[ing.id] && suggestions[ing.id]?.length > 0 && (
                            <div style={{
                              position: 'absolute', top: '100%', left: 0, right: 0,
                              background: 'white', border: '1.5px solid var(--border)',
                              borderRadius: 10, zIndex: 50,
                              boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                              maxHeight: 180, overflowY: 'auto'
                            }}>
                              {suggestions[ing.id].map(item => (
                                <div key={item.id} onMouseDown={() => selectSuggestion(ing.id, item)} style={{
                                  padding: '8px 12px', cursor: 'pointer',
                                  borderBottom: '1px solid var(--silver-light)',
                                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                  <span style={{ fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: '0.82rem', color: 'var(--text)' }}>
                                    {item.name}
                                  </span>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-soft)' }}>
                                    {item.price.toLocaleString()}원/{item.per}{item.unit}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '5px 3px', width: '18%' }}>
                          <input style={inputStyle} value={toComma(ing.use_amount)} placeholder="0"
                            inputMode="numeric"
                            onChange={e => updateIng(ing.id, 'use_amount', fromComma(e.target.value))}
                          />
                        </td>
                        <td style={{ padding: '5px 3px', width: '16%' }}>
                          <select style={inputStyle} value={ing.unit}
                            onChange={e => updateIng(ing.id, 'unit', e.target.value)}>
                            {UNITS.map(u => <option key={u}>{u}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '5px 3px', width: '20%', textAlign: 'right', fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: '0.82rem', color: 'var(--blue)' }}>
                          {calc.ingCosts[idx] > 0 ? fmt(calc.ingCosts[idx]) + '원' : '—'}
                        </td>
                        <td style={{ padding: '5px 3px', width: '8%', textAlign: 'center' }}>
                          <button onClick={() => toggleRow(ing.id)} style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--text-soft)', fontSize: '0.65rem',
                            display: 'inline-block',
                            transform: openRows.has(ing.id) ? 'rotate(180deg)' : 'none',
                            transition: 'transform 0.2s'
                          }}>▼</button>
                        </td>
                      </tr>
                      {openRows.has(ing.id) && (
                        <tr>
                          <td colSpan={5} style={{ padding: '0 2px 10px' }}>
                            <div className="ing-detail-grid" style={{
                              background: 'var(--silver-light)', borderRadius: 12,
                              padding: '11px 12px', display: 'grid',
                              gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, alignItems: 'end'
                            }}>
                              {/* 구매가 */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: '0.62rem', color: 'var(--text-soft)' }}>구매가(원)</span>
                                <input
                                  name="price"
                                  style={{ ...inputStyle, background: 'white', border: '1.5px solid var(--border)' }}
                                  value={toComma(ing.price)} inputMode="numeric"
                                  onChange={e => {
                                    const val = fromComma(e.target.value)
                                    updateIng(ing.id, 'price', val)
                                    debouncedSync(ing.id)
                                  }}
                                />
                              </div>

                              {/* 구매량 + 단위 */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: '0.62rem', color: 'var(--text-soft)' }}>구매량</span>
                                <div style={{ display: 'flex', gap: 4 }}>
                                  <input
                                    name="qty"
                                    style={{ ...inputStyle, background: 'white', border: '1.5px solid var(--border)', flex: 1 }}
                                    value={toComma(ing.qty)} inputMode="numeric"
                                    onChange={e => {
                                      const val = fromComma(e.target.value)
                                      updateIng(ing.id, 'qty', val)
                                      debouncedSync(ing.id)
                                    }}

                                  />
                                  <select
                                    style={{ ...inputStyle, background: 'white', border: '1.5px solid var(--border)', width: 48, padding: '8px 2px' }}
                                    value={ing.unit}
                                    onChange={e => {
                                      updateIng(ing.id, 'unit', e.target.value)
                                      syncToFridge({ ...ing, unit: e.target.value })
                                    }}
                                  >
                                    {UNITS.map(u => <option key={u}>{u}</option>)}
                                  </select>
                                </div>
                              </div>

                              {/* 수율 */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: '0.62rem', color: 'var(--text-soft)' }}>수율(%)</span>
                                <input
                                  name="yield_"
                                  style={{ ...inputStyle, background: 'white', border: '1.5px solid var(--border)' }}
                                  value={toComma(ing.yield_)} inputMode="numeric"
                                  onChange={e => {
                                    const val = fromComma(e.target.value)
                                    updateIng(ing.id, 'yield_', val)
                                    debouncedSync(ing.id)
                                  }}
                                />
                              </div>
                              <button onClick={() => deleteIng(ing.id)} style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: 'var(--red)', fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700,
                                fontSize: '0.72rem', padding: '7px 8px',
                                borderRadius: 8, alignSelf: 'end'
                              }}>✕ 삭제</button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={addIng} style={{
          marginTop: 12, background: 'none',
          border: '1.5px dashed var(--blue-light)', color: 'var(--blue)',
          borderRadius: 10, padding: '8px 18px',
          fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer'
        }}>＋ 재료 추가</button>
      </>)}

      {/* 추가 비용 */}
      {card(<>
        {cardTitle('추가 비용')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {/* 포장비 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-mid)', fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700 }}>
              📦 포장비 (원)
            </label>
            <input style={{ ...inputStyle, textAlign: 'left', padding: '9px 12px' }}
              value={toComma(menu.packaging)} inputMode="numeric"
              onChange={e => onChange({ ...menu, packaging: fromComma(e.target.value) })}
            />
          </div>
          {/* 인건비 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-mid)', fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              👩‍🍳 인건비
              {helpBtn(() => setShowLaborModal(true))}
            </label>
            <input style={{ ...inputStyle, textAlign: 'left', padding: '9px 12px' }}
              value={toComma(menu.labor)} inputMode="numeric"
              onChange={e => onChange({ ...menu, labor: fromComma(e.target.value) })}
            />
          </div>
          {/* 간접비 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-mid)', fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              🏠 간접비
              {helpBtn(() => setShowOverheadModal(true))}
            </label>
            <input style={{ ...inputStyle, textAlign: 'left', padding: '9px 12px' }}
              value={toComma(menu.overhead)} inputMode="numeric"
              onChange={e => onChange({ ...menu, overhead: fromComma(e.target.value) })}
            />
          </div>
        </div>
      </>)}

      {/* 수수료 */}
      {card(<>
        {cardTitle('수수료')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: '🛵 배달 수수료 (%)', field: 'delivery_fee' },
            { label: '💳 카드 수수료 (%)', field: 'card_fee' },
          ].map(({ label, field }) => (
            <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-mid)', fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700 }}>{label}</label>
              <input style={{ ...inputStyle, textAlign: 'left', padding: '9px 12px' }}
                value={(menu as any)[field] || ''} inputMode="decimal"
                onChange={e => onChange({ ...menu, [field]: parseFloat(e.target.value) || 0 })}
              />
            </div>
          ))}
        </div>
      </>)}

      {/* 판매가 */}
      {card(<>
        {cardTitle('판매가')}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: 280 }}>
          <input
            style={{
              ...inputStyle, textAlign: 'left', padding: '11px 16px',
              fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: '1.1rem',
              background: 'white', border: '2px solid var(--blue-light)',
              borderRadius: 12, flex: 1
            }}
            value={toComma(menu.sale_price)} placeholder="판매 가격 입력"
            inputMode="numeric"
            onChange={e => onChange({ ...menu, sale_price: fromComma(e.target.value) })}
          />
          <span style={{ fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: '1rem', color: 'var(--text-mid)', whiteSpace: 'nowrap' }}>원</span>
        </div>
      </>)}

      {/* 결과 */}
      <div style={{
        background: 'var(--navy)', borderRadius: 20,
        padding: '24px 22px', marginTop: 16
      }}>
        <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: '0.8rem', color: 'rgba(200,216,228,0.5)', marginBottom: 16 }}>
          📊 계산 결과
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {[
            { label: '🥬 총 재료 원가', value: fmt(calc.ingTotal) + '원', color: 'var(--blue-light)' },
            { label: '💰 총 원가', value: fmt(calc.totalCost) + '원', color: 'white' },
            { label: '✨ 순이익', value: menu.sale_price > 0 ? (calc.profit >= 0 ? '+' : '') + fmt(calc.profit) + '원' : '—', color: calc.profit < 0 ? '#F08080' : '#7EC8A0' },
            { label: '📈 원가율', value: menu.sale_price > 0 ? calc.costRate.toFixed(1) + '%' : '—', color: '#F4A460' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: '14px 16px'
            }}>
              <div style={{ fontSize: '0.72rem', color: 'rgba(200,216,228,0.5)', marginBottom: 6 }}>{label}</div>
              <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: '1.3rem', color }}>{value}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'rgba(74,127,165,0.12)', borderRadius: 12 }}>
          <span>🐟</span>
          <span style={{ fontSize: '0.8rem', color: 'rgba(200,216,228,0.7)' }}>{godogiComment()}</span>
        </div>
      </div>

      {/* ── 인건비 계산 모달 ── */}
      {showLaborModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 20px'
        }}>
          <div style={{
            background: 'white', borderRadius: 20, padding: 24,
            width: '100%', maxWidth: 340,
            display: 'flex', flexDirection: 'column', gap: 16
          }}>
            <div>
              <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: '1rem', color: 'var(--navy)', marginBottom: 4 }}>
                👩‍🍳 인건비 계산기
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-soft)' }}>
                월 인건비 총합을 입력하면 메뉴 1개당 인건비를 계산해줘요
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-mid)', fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700 }}>💰 월 인건비 합계 (원)</label>
                <input style={{ ...inputStyle, textAlign: 'left', padding: '9px 12px', background: 'var(--silver-light)' }}
                  value={toComma(laborForm.labor)} inputMode="numeric" placeholder="예) 2,000,000"
                  onChange={e => setLaborForm({ ...laborForm, labor: e.target.value })}
                />
                <span style={{ fontSize: '0.65rem', color: 'var(--text-soft)' }}>알바비 + 내 인건비 등 합산</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-mid)', fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700 }}>📅 월 영업일수 (일)</label>
                <input style={{ ...inputStyle, textAlign: 'left', padding: '9px 12px', background: 'var(--silver-light)' }}
                  value={laborForm.days} inputMode="numeric" placeholder="예) 25"
                  onChange={e => setLaborForm({ ...laborForm, days: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-mid)', fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700 }}>🍽️ 하루 전체 판매량 (개)</label>
                <input style={{ ...inputStyle, textAlign: 'left', padding: '9px 12px', background: 'var(--silver-light)' }}
                  value={laborForm.count} inputMode="numeric" placeholder="예) 100"
                  onChange={e => setLaborForm({ ...laborForm, count: e.target.value })}
                />
                <span style={{ fontSize: '0.65rem', color: 'var(--text-soft)' }}>모든 메뉴 합산 판매량이에요</span>
              </div>
            </div>
            {laborResult !== null && !isNaN(laborResult) && (
              <div style={{
                background: 'var(--navy)', borderRadius: 14, padding: '14px 16px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span style={{ fontSize: '0.78rem', color: 'rgba(200,216,228,0.7)' }}>메뉴 1개당 인건비</span>
                <span style={{ fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: '1.2rem', color: 'white' }}>
                  {laborResult.toLocaleString()}원
                </span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowLaborModal(false)} style={{
                flex: 1, padding: '10px 0', background: 'var(--silver-light)', border: 'none',
                borderRadius: 10, color: 'var(--text-soft)',
                fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer'
              }}>취소</button>
              <button onClick={() => {
                if (laborResult !== null && !isNaN(laborResult)) {
                  onChange({ ...menu, labor: laborResult })
                  setShowLaborModal(false)
                }
              }} style={{
                flex: 1, padding: '10px 0', background: 'var(--green)', border: 'none',
                borderRadius: 10, color: 'white',
                fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer'
              }}>적용하기 ✓</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 간접비 계산 모달 ── */}
      {showOverheadModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 20px'
        }}>
          <div style={{
            background: 'white', borderRadius: 20, padding: 24,
            width: '100%', maxWidth: 340,
            display: 'flex', flexDirection: 'column', gap: 16
          }}>
            <div>
              <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: '1rem', color: 'var(--navy)', marginBottom: 4 }}>
                🏠 간접비 계산기
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-soft)' }}>
                전기/가스/임대료 등 월 고정비를 입력하면 메뉴 1개당 간접비를 계산해줘요
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-mid)', fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700 }}>💰 월 고정비 합계 (원)</label>
                <input style={{ ...inputStyle, textAlign: 'left', padding: '9px 12px', background: 'var(--silver-light)' }}
                  value={toComma(overheadForm.fixed)} inputMode="numeric" placeholder="예) 1,500,000"
                  onChange={e => setOverheadForm({ ...overheadForm, fixed: e.target.value })}
                />
                <span style={{ fontSize: '0.65rem', color: 'var(--text-soft)' }}>전기세 + 가스비 + 임대료 + 기타</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-mid)', fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700 }}>📅 월 영업일수 (일)</label>
                <input style={{ ...inputStyle, textAlign: 'left', padding: '9px 12px', background: 'var(--silver-light)' }}
                  value={overheadForm.days} inputMode="numeric" placeholder="예) 25"
                  onChange={e => setOverheadForm({ ...overheadForm, days: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-mid)', fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700 }}>🍽️ 하루 전체 판매량 (개)</label>
                <input style={{ ...inputStyle, textAlign: 'left', padding: '9px 12px', background: 'var(--silver-light)' }}
                  value={overheadForm.count} inputMode="numeric" placeholder="예) 100"
                  onChange={e => setOverheadForm({ ...overheadForm, count: e.target.value })}
                />
                <span style={{ fontSize: '0.65rem', color: 'var(--text-soft)' }}>모든 메뉴 합산 판매량이에요</span>
              </div>
            </div>
            {overheadResult !== null && !isNaN(overheadResult) && (
              <div style={{
                background: 'var(--navy)', borderRadius: 14, padding: '14px 16px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span style={{ fontSize: '0.78rem', color: 'rgba(200,216,228,0.7)' }}>메뉴 1개당 간접비</span>
                <span style={{ fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: '1.2rem', color: 'white' }}>
                  {overheadResult.toLocaleString()}원
                </span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowOverheadModal(false)} style={{
                flex: 1, padding: '10px 0', background: 'var(--silver-light)', border: 'none',
                borderRadius: 10, color: 'var(--text-soft)',
                fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer'
              }}>취소</button>
              <button onClick={() => {
                if (overheadResult !== null && !isNaN(overheadResult)) {
                  onChange({ ...menu, overhead: overheadResult })
                  setShowOverheadModal(false)
                }
              }} style={{
                flex: 1, padding: '10px 0', background: 'var(--green)', border: 'none',
                borderRadius: 10, color: 'white',
                fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer'
              }}>적용하기 ✓</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .ing-detail-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      {/* ── 숨겨진 원가계산서 (PNG 내보내기용) ── */}
      <div ref={exportRef} style={{
        position: 'fixed', left: '-9999px', top: 0, zIndex: -1,
        width: 440, background: 'white', padding: '36px 32px',
        fontFamily: "'Noto Sans KR', sans-serif",
      }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.3rem' }}>🐟</span>
            <span style={{ fontFamily: 'Black Han Sans', fontSize: '0.9rem', color: '#4A7FA5' }}>고독이의 원가계산기</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#8FA3B5' }}>
            {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>

        {/* 메뉴명 */}
        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1E2D40', marginBottom: 6, fontFamily: 'Black Han Sans' }}>
          {menu.name || '(메뉴명 없음)'}
        </div>
        <div style={{ height: 2, background: '#EEF4F8', marginBottom: 20 }} />

        {/* 재료 원가 */}
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8FA3B5', letterSpacing: '0.08em', marginBottom: 10 }}>재료 원가</div>
        {menu.ingredients.map((ing: any, idx: number) => ({ ing, idx }))
          .filter(({ ing }) => ing.name && ing.use_amount > 0)
          .map(({ ing, idx }) => (
            <div key={ing.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #F4F8FB' }}>
              <span style={{ fontSize: '0.88rem', color: '#2C3E50', fontWeight: 500 }}>{ing.name}</span>
              <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: '#8FA3B5' }}>{ing.use_amount.toLocaleString()}{ing.unit}</span>
                <span style={{ fontSize: '0.88rem', color: '#4A7FA5', fontWeight: 700, minWidth: 60, textAlign: 'right' }}>
                  {calc.ingCosts[idx] > 0 ? fmt(calc.ingCosts[idx]) + '원' : '—'}
                </span>
              </div>
            </div>
          ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 18px', borderBottom: '1px solid #EEF4F8' }}>
          <span style={{ fontSize: '0.78rem', color: '#8FA3B5' }}>재료 소계</span>
          <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1E2D40' }}>{fmt(calc.ingTotal)}원</span>
        </div>

        {/* 추가 비용 */}
        {(menu.packaging > 0 || menu.labor > 0 || menu.overhead > 0) && (<>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8FA3B5', letterSpacing: '0.08em', margin: '16px 0 8px' }}>추가 비용</div>
          {menu.packaging > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.85rem', color: '#5A6E82' }}><span>📦 포장비</span><span>{fmt(menu.packaging)}원</span></div>}
          {menu.labor > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.85rem', color: '#5A6E82' }}><span>👩‍🍳 인건비</span><span>{fmt(menu.labor)}원</span></div>}
          {menu.overhead > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.85rem', color: '#5A6E82' }}><span>🏠 간접비</span><span>{fmt(menu.overhead)}원</span></div>}
        </>)}

        {/* 수수료 */}
        {(menu.delivery_fee > 0 || menu.card_fee > 0) && (<>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8FA3B5', letterSpacing: '0.08em', margin: '16px 0 8px' }}>수수료</div>
          {menu.delivery_fee > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.85rem', color: '#5A6E82' }}><span>🛵 배달 수수료</span><span>{menu.delivery_fee}%</span></div>}
          {menu.card_fee > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.85rem', color: '#5A6E82' }}><span>💳 카드 수수료</span><span>{menu.card_fee}%</span></div>}
        </>)}

        {/* 결과 박스 */}
        <div style={{ background: '#1E2D40', borderRadius: 16, padding: '20px 22px', marginTop: 20 }}>
          {[
            { label: '💰 총 원가', value: fmt(calc.totalCost) + '원', color: 'rgba(200,216,228,0.8)' },
            { label: '🏷️ 판매가', value: menu.sale_price > 0 ? fmt(menu.sale_price) + '원' : '—', color: 'white' },
            { label: '✨ 순이익', value: menu.sale_price > 0 ? (calc.profit >= 0 ? '+' : '') + fmt(calc.profit) + '원' : '—', color: calc.profit < 0 ? '#F08080' : '#7EC8A0' },
            { label: '📈 원가율', value: menu.sale_price > 0 ? calc.costRate.toFixed(1) + '%' : '—', color: '#F4A460' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '0.8rem', color: 'rgba(200,216,228,0.5)' }}>{label}</span>
              <span style={{ fontSize: '1.05rem', fontWeight: 700, color }}>{value}</span>
            </div>
          ))}
        </div>

        {/* 고독이 코멘트 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, padding: '10px 14px', background: '#F4F8FB', borderRadius: 10 }}>
          <span style={{ fontSize: '1rem' }}>🐟</span>
          <span style={{ fontSize: '0.78rem', color: '#5A6E82' }}>{godogiComment()}</span>
        </div>
      </div>
    </div>
  )
}