'use client'

import { useState, useEffect } from 'react'

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

function genId() { return Math.random().toString(36).slice(2, 9) }

function defaultIngredient(): Ingredient {
  return { id: genId(), name: '', price: 0, qty: 0, unit: 'g', yield_: 100, use_amount: 0 }
}

interface Props {
  menu: Menu
  onChange: (menu: Menu) => void
  onSave: () => void
}

export default function Calculator({ menu, onChange, onSave }: Props) {
  const calc = calcMenu(menu)
  const [openRows, setOpenRows] = useState<Set<string>>(new Set())

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
      fontFamily: 'Black Han Sans', fontSize: '0.85rem',
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

  return (
    <div>
      {/* 상단 바 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <input
          value={menu.name}
          onChange={e => onChange({ ...menu, name: e.target.value })}
          placeholder="메뉴 이름 입력"
          style={{
            flex: 1, fontFamily: 'Black Han Sans', fontSize: '1.5rem',
            color: 'var(--navy)', background: 'none', border: 'none',
            borderBottom: '2px solid transparent', outline: 'none', padding: '4px 0'
          }}
        />
        <button onClick={onSave} style={{
          background: 'var(--green)', color: 'white', border: 'none',
          borderRadius: 12, padding: '10px 18px',
          fontFamily: 'Black Han Sans', fontSize: '0.85rem', cursor: 'pointer'
        }}>💾 저장</button>
      </div>

      {/* 재료 카드 */}
      {card(<>
        {cardTitle('재료 원가')}
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              {['재료명', '사용량', '단위', '원가', ''].map((h, i) => (
                <th key={i} style={{
                  fontFamily: 'Black Han Sans', fontSize: '0.68rem',
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
                            <td style={{ padding: '5px 3px', width: '38%' }}>
                            <input
                                style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }}
                                value={ing.name} placeholder="재료명"
                                onChange={e => updateIng(ing.id, 'name', e.target.value)}
                            />
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
                            <td style={{ padding: '5px 3px', width: '20%', textAlign: 'right', fontFamily: 'Black Han Sans', fontSize: '0.82rem', color: 'var(--blue)' }}>
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
                                <div style={{
                                background: 'var(--silver-light)', borderRadius: 12,
                                padding: '11px 12px', display: 'grid',
                                gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, alignItems: 'end'
                                }}>
                                {[
                                    { label: '구매가(원)', field: 'price' as keyof Ingredient },
                                    { label: '구매량', field: 'qty' as keyof Ingredient },
                                    { label: '수율(%)', field: 'yield_' as keyof Ingredient },
                                ].map(({ label, field }) => (
                                    <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <span style={{ fontFamily: 'Black Han Sans', fontSize: '0.62rem', color: 'var(--text-soft)' }}>{label}</span>
                                    <input
                                        style={{ ...inputStyle, background: 'white', border: '1.5px solid var(--border)' }}
                                        value={toComma(ing[field])} inputMode="numeric"
                                        onChange={e => updateIng(ing.id, field, fromComma(e.target.value))}
                                    />
                                    </div>
                                ))}
                                <button onClick={() => deleteIng(ing.id)} style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: 'var(--red)', fontFamily: 'Black Han Sans',
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
          fontFamily: 'Black Han Sans', fontSize: '0.82rem', cursor: 'pointer'
        }}>＋ 재료 추가</button>
      </>)}

      {/* 추가 비용 */}
      {card(<>
        {cardTitle('추가 비용')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {[
            { label: '📦 포장비 (원)', field: 'packaging' },
            { label: '👩‍🍳 인건비 (원)', field: 'labor' },
            { label: '🏠 간접비 (원)', field: 'overhead' },
          ].map(({ label, field }) => (
            <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-mid)', fontFamily: 'Black Han Sans' }}>{label}</label>
              <input style={{ ...inputStyle, textAlign: 'left', padding: '9px 12px' }}
                value={toComma((menu as any)[field])} inputMode="numeric"
                onChange={e => onChange({ ...menu, [field]: fromComma(e.target.value) })}
              />
            </div>
          ))}
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
              <label style={{ fontSize: '0.72rem', color: 'var(--text-mid)', fontFamily: 'Black Han Sans' }}>{label}</label>
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
        <input
          style={{
            ...inputStyle, textAlign: 'left', padding: '11px 16px',
            fontFamily: 'Black Han Sans', fontSize: '1.1rem',
            background: 'white', border: '2px solid var(--blue-light)',
            borderRadius: 12, maxWidth: 240
          }}
          value={toComma(menu.sale_price)} placeholder="판매 가격 입력 (원)"
          inputMode="numeric"
          onChange={e => onChange({ ...menu, sale_price: fromComma(e.target.value) })}
        />
      </>)}

      {/* 결과 */}
      <div style={{
        background: 'var(--navy)', borderRadius: 20,
        padding: '24px 22px', marginTop: 16
      }}>
        <div style={{ fontFamily: 'Black Han Sans', fontSize: '0.8rem', color: 'rgba(200,216,228,0.5)', marginBottom: 16 }}>
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
              <div style={{ fontFamily: 'Black Han Sans', fontSize: '1.3rem', color }}>{value}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'rgba(74,127,165,0.12)', borderRadius: 12 }}>
          <span>🐟</span>
          <span style={{ fontSize: '0.8rem', color: 'rgba(200,216,228,0.7)' }}>{godogiComment()}</span>
        </div>
      </div>
    </div>
  )
}