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
  category?: string
  emoji?: string
  batch_yield?: number
  serving_size?: number
  ingredients: Ingredient[]
  packaging: number
  labor: number
  overhead: number
  delivery_fee: number
  card_fee: number
  sale_price: number
  memo?: string
  created_at?: string
}

function calcMenu(menu: Menu) {
  const ingCosts = menu.ingredients.map(ing => {
    const qty = ing.qty || 1
    const yield_ = (ing.yield_ || 100) / 100
    const unitCost = ing.price / qty / yield_
    return unitCost * (ing.use_amount || 0)
  })
  const ingTotal = ingCosts.reduce((a, b) => a + b, 0)
  const baseCost = ingTotal + (menu.labor || 0) + (menu.overhead || 0)
  const isBatch = menu.category === 'banchan' && (menu.batch_yield || 0) > 0 && (menu.serving_size || 0) > 0
  const batchRatio = isBatch
    ? (menu.serving_size || 0) / (menu.batch_yield || 1)
    : 1
  const totalCost = baseCost * batchRatio
  const profit = (menu.sale_price || 0) - totalCost
  const costRate = menu.sale_price > 0 ? (totalCost / menu.sale_price) * 100 : 0
  return { ingCosts, ingTotal, totalCost, batchCost: baseCost, batchRatio, profit, costRate }
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

const EMOJI_OPTIONS: Record<string, string[]> = {
  main:    ['🍖', '🍗', '🥩', '🍲', '🫕', '🍜', '🍝', '🍛', '🍱', '🍣', '🥘', '🌮', '🫔', '🥗', '🍤', '🫙'],
  side:    ['🍚', '🍳', '🥚', '🥞', '🫔', '🌯', '🥙', '🫓', '🍱', '🧆', '🥗', '🍘'],
  banchan: ['🥬', '🥦', '🥕', '🌱', '🫑', '🥒', '🧅', '🫘', '🍄', '🫒', '🧄', '🌿', '🥜', '🍠', '🧂', '🥗'],
  drink:   ['🥤', '🧃', '🍵', '☕', '🧋', '🍺', '🍶', '🥛', '🍹', '🧊', '🫖', '🍊'],
  extra:   ['📦', '🛍️', '🥢', '🛵', '🧾', '🏷️', '💳', '🔖', '🪣', '📫', '🎁', '🗂️'],
}

function genId() { return crypto.randomUUID() }

function defaultIngredient(): Ingredient {
  return { id: genId(), name: '', price: 0, qty: 0, unit: 'g', yield_: 100, use_amount: 0 }
}

interface Props {
  menu: Menu
  onChange: (menu: Menu) => void
}

export default function Calculator({ menu, onChange }: Props) {
  const supabase = createClient()
  const exportRef = useRef<HTMLDivElement>(null)

  const handleExport = async () => {
    if (!exportRef.current) return
    try {
      const el = exportRef.current
      // 캡처 전 뷰포트 안으로, 화면 최상단에 표시 (zIndex 최상위)
      el.style.position = 'fixed'
      el.style.left = '0'
      el.style.top = '0'
      el.style.zIndex = '99999'
      el.style.opacity = '1'
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      const dataUrl = await toPng(el, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      })
      // 캡처 후 다시 숨김
      el.style.left = '-9999px'
      el.style.zIndex = '-1'
      el.style.opacity = '0'
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
  const [showSaved, setShowSaved] = useState(false)
  const [showOverheadModal, setShowOverheadModal] = useState(false)
  const [overheadForm, setOverheadForm] = useState({ fixed: '', days: '', count: '' })
  const [showLaborModal, setShowLaborModal] = useState(false)
  const [laborForm, setLaborForm] = useState({ labor: '', days: '', count: '' })
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [drinkSimple, setDrinkSimple] = useState(
    () => menu.category !== 'drink' || !menu.ingredients.some(i => i.name)
  )

  const autoYield = Math.round(menu.ingredients.reduce((sum, ing) => {
    const useAmt = ing.use_amount || 0
    const yld = (ing.yield_ || 100) / 100
    if (ing.unit === 'g')  return sum + useAmt * yld
    if (ing.unit === 'kg') return sum + useAmt * yld * 1000
    if (ing.unit === 'ml') return sum + useAmt * yld
    if (ing.unit === 'L')  return sum + useAmt * yld * 1000
    return sum
  }, 0))

  const isBatchMode = menu.category === 'banchan'
  const menuForCalc = (isBatchMode && (menu.batch_yield || 0) === 0 && autoYield > 0)
    ? { ...menu, batch_yield: autoYield }
    : menu
  const calc = calcMenu(menuForCalc)

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
    if (menu.category === 'banchan') {
      if ((menu.batch_yield || 0) === 0 || (menu.serving_size || 0) === 0) return '완성 총중량과 1인분 양을 입력하면 인분 계산이 돼요 🐟'
      const servings = Math.round((menuForCalc.batch_yield || 1) / (menu.serving_size || 1))
      return `한 번 만들면 약 ${servings}인분! 1인분 원가 ${fmt(calc.totalCost)}원이에요 🐟`
    }
    if (menu.category === 'extra') {
      return menu.overhead > 0 ? `단가 ${fmt(menu.overhead)}원짜리 부가 항목이에요 🐟` : '단가를 입력해줘요 🐟'
    }
    return `총 원가 ${fmt(calc.totalCost)}원이에요. 메뉴구성에서 세트로 묶으면 원가율을 확인할 수 있어요 🐟`
  }

  const card = (children: React.ReactNode) => (
    <div style={{
      background: '#162030', borderRadius: 18, padding: '20px 18px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
      border: '1px solid rgba(74,127,165,0.15)', marginBottom: 16
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
    padding: '8px 6px', fontFamily: "'Noto Sans KR', sans-serif",
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
          placeholder={{
            main:    '예: 제육볶음',
            side:    '예: 공깃밥',
            banchan: '예: 깍두기',
            drink:   '예: 아메리카노',
            extra:   '예: 원형 포장용기(소)',
          }[menu.category || 'main'] ?? '메뉴 이름 입력'}
          style={{
            flex: 1, fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: '1.1rem',
            color: 'var(--navy)', background: 'none',
            border: 'none', borderBottom: '2px solid var(--border)',
            outline: 'none', padding: '4px 0',
            cursor: 'text', maxWidth: '100%', width: '100%'
          }}
        />
        <button onClick={() => { setShowSaved(true); setTimeout(() => setShowSaved(false), 1800) }} style={{
          background: showSaved ? 'var(--green)' : 'var(--silver-light)',
          color: showSaved ? 'white' : 'var(--text-mid)',
          border: 'none', borderRadius: 12, padding: '10px 16px',
          fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: '0.82rem',
          cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap'
        }}>{showSaved ? '✓ 저장됨' : '💾 저장'}</button>
      </div>

      {/* 카테고리 + 이모지 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowEmojiPicker(p => !p)}
            style={{
              width: 44, height: 38, background: 'var(--silver-light)',
              border: '1.5px solid var(--border)', borderRadius: 8,
              fontSize: '1.3rem', cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >{menu.emoji || '🍽️'}</button>
          {showEmojiPicker && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowEmojiPicker(false)} />
              <div style={{
                position: 'absolute', top: '100%', left: 0, zIndex: 100,
                background: '#1A2840', border: '1.5px solid rgba(74,127,165,0.25)', borderRadius: 12,
                padding: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4, marginTop: 4,
                minWidth: 260,
              }}>
                {(EMOJI_OPTIONS[menu.category || 'main'] || EMOJI_OPTIONS.main).map(e => (
                  <button key={e}
                    onClick={() => { onChange({ ...menu, emoji: e }); setShowEmojiPicker(false) }}
                    style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', padding: '4px', borderRadius: 6 }}
                  >{e}</button>
                ))}
              </div>
            </>
          )}
        </div>
        {([
          { value: 'main',    label: '메인',   color: '#4A7FA5' },
          { value: 'side',    label: '사이드',  color: '#4A8C6F' },
          { value: 'banchan', label: '반찬',   color: '#C44A4A' },
          { value: 'drink',   label: '음료',   color: '#9B6B9B' },
          { value: 'extra',   label: '기타',   color: '#C8843A' },
        ] as const).map(({ value, label, color }) => {
          const selected = (menu.category || 'main') === value
          return (
            <button key={value} onClick={() => { onChange({ ...menu, category: value }); setShowEmojiPicker(false) }} style={{
              background: selected ? color : 'transparent',
              color: selected ? 'white' : color,
              border: `1.5px solid ${color}`,
              borderRadius: 20, padding: '4px 12px',
              fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700,
              fontSize: '0.72rem', cursor: 'pointer',
            }}>{label}</button>
          )
        })}
      </div>

      {/* 음료 모드 토글 */}
      {menu.category === 'drink' && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--silver-light)', borderRadius: 12, padding: 4 }}>
          {[{ v: true, l: '🥤 기성품' }, { v: false, l: '☕ 직접제조' }].map(({ v, l }) => (
            <button key={String(v)} onClick={() => setDrinkSimple(v)} style={{
              flex: 1, padding: '7px 0', borderRadius: 9, border: 'none',
              background: drinkSimple === v ? 'rgba(74,127,165,0.35)' : 'transparent',
              color: 'var(--navy)', fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700,
              fontSize: '0.8rem', cursor: 'pointer',
              boxShadow: drinkSimple === v ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
            }}>{l}</button>
          ))}
        </div>
      )}

      {(menu.category === 'extra' || (menu.category === 'drink' && drinkSimple)) ? card(<>
        {cardTitle(menu.category === 'drink' ? '구매 단가' : '원가 직접 입력')}
        {menu.category === 'extra' && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-soft)', marginBottom: 12, background: 'rgba(200,132,58,0.07)', borderRadius: 8, padding: '8px 12px', border: '1px solid rgba(200,132,58,0.15)' }}>
            📦 세트 구성 시 원가에 더해지는 부가 항목이에요. 포장용기, 소모품, 배달비 분담 등에 활용해보세요.
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            style={{ ...inputStyle, textAlign: 'right', padding: '11px 16px', fontSize: '1.1rem', fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700 }}
            value={toComma(menu.overhead)}
            inputMode="numeric"
            placeholder="0"
            onChange={e => onChange({ ...menu, overhead: fromComma(e.target.value) })}
          />
          <span style={{ color: 'var(--text-soft)', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>원</span>
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-soft)', marginTop: 6 }}>
          {menu.category === 'drink' ? '기성품 음료의 개당 구매 단가를 입력해주세요' : '이 항목의 단가를 입력해주세요'}
        </div>
        {menu.category === 'extra' && (
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-mid)', fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, display: 'block', marginBottom: 5 }}>
              📝 메모 (선택)
            </label>
            <input
              style={{ ...inputStyle, textAlign: 'left', padding: '9px 12px' }}
              value={menu.memo || ''}
              placeholder="예: 배달 주문 시 필수 추가"
              onChange={e => onChange({ ...menu, memo: e.target.value })}
            />
          </div>
        )}
      </>) : (<>

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
                              background: '#1A2840', border: '1.5px solid rgba(74,127,165,0.25)',
                              borderRadius: 10, zIndex: 50,
                              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
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
                                  style={{ ...inputStyle, background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(74,127,165,0.2)' }}
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
                                    style={{ ...inputStyle, background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(74,127,165,0.2)', flex: 1 }}
                                    value={toComma(ing.qty)} inputMode="numeric"
                                    onChange={e => {
                                      const val = fromComma(e.target.value)
                                      updateIng(ing.id, 'qty', val)
                                      debouncedSync(ing.id)
                                    }}

                                  />
                                  <select
                                    style={{ ...inputStyle, background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(74,127,165,0.2)', width: 48, padding: '8px 2px' }}
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
                                  style={{ ...inputStyle, background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(74,127,165,0.2)' }}
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

      {/* 배치 수율 (반찬 / 음료 직접제조) */}
      {isBatchMode && card(<>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ width: 3, height: 14, background: 'var(--blue)', borderRadius: 3, display: 'inline-block', flexShrink: 0 }} />
          <span style={{ fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-mid)', letterSpacing: '0.05em' }}>배치 수율</span>
          {helpBtn(() => setShowBatchModal(true))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-mid)', fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700 }}>
              🍳 완성 총중량 ({menu.category === 'drink' ? 'ml' : 'g'})
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input style={{ ...inputStyle, textAlign: 'left', padding: '9px 12px', flex: 1 }}
                value={toComma(menu.batch_yield || 0)} inputMode="numeric"
                placeholder={autoYield > 0 ? `${autoYield}` : (menu.category === 'drink' ? '예: 500' : '예: 1800')}
                onChange={e => onChange({ ...menu, batch_yield: fromComma(e.target.value) })}
              />
              {autoYield > 0 && (menu.batch_yield || 0) === 0 && (
                <button onClick={() => onChange({ ...menu, batch_yield: autoYield })}
                  style={{ padding: '0 10px', borderRadius: 8, border: '1px solid var(--blue)', background: 'transparent', color: 'var(--blue)', fontSize: '0.72rem', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700 }}>
                  ← 자동
                </button>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-mid)', fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700 }}>
              {menu.category === 'drink' ? '🥤 1잔 제공량 (ml)' : '🥬 1인분 제공량 (g)'}
            </label>
            <input style={{ ...inputStyle, textAlign: 'left', padding: '9px 12px' }}
              value={toComma(menu.serving_size || 0)} inputMode="numeric"
              placeholder={menu.category === 'drink' ? '예: 350' : '예: 60'}
              onChange={e => onChange({ ...menu, serving_size: fromComma(e.target.value) })}
            />
          </div>
        </div>
        {(menuForCalc.batch_yield || 0) > 0 && (menu.serving_size || 0) > 0 && (
          <div style={{ marginTop: 10, fontSize: '0.78rem', color: 'var(--text-soft)', background: 'var(--silver-light)', borderRadius: 8, padding: '8px 12px' }}>
            약 <strong>{Math.round((menuForCalc.batch_yield || 1) / (menu.serving_size || 1))}{menu.category === 'drink' ? '잔' : '인분'}</strong> 기준 →
            1{menu.category === 'drink' ? '잔' : '인분'} 원가 = 배치 원가 × ({menu.serving_size}{menu.category === 'drink' ? 'ml' : 'g'} ÷ {menuForCalc.batch_yield}{menu.category === 'drink' ? 'ml' : 'g'})
          </div>
        )}
      </>)}

      {/* 추가 비용 */}
      {card(<>
        {cardTitle('추가 비용')}
        <div style={{ fontSize: '0.68rem', color: 'var(--text-soft)', marginBottom: 10, opacity: 0.7 }}>
          배달·카드 수수료는 메뉴 구성에서 채널별로 설정해요
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* 인건비 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-mid)', fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              👩‍🍳 인건비 (원)
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
              🏠 간접비 (원)
              {helpBtn(() => setShowOverheadModal(true))}
            </label>
            <input style={{ ...inputStyle, textAlign: 'left', padding: '9px 12px' }}
              value={toComma(menu.overhead)} inputMode="numeric"
              onChange={e => onChange({ ...menu, overhead: fromComma(e.target.value) })}
            />
          </div>
        </div>
      </>)}
      </>)}


      {/* 결과 — 반찬 */}
      {menu.category === 'banchan' && (
        <div style={{ background: '#1A2840', borderRadius: 20, padding: '24px 22px', marginTop: 16 }}>
          <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: '0.8rem', color: 'rgba(200,216,228,0.5)', marginBottom: 16 }}>📊 계산 결과</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: '14px 16px' }}>
              <div style={{ fontSize: '0.72rem', color: 'rgba(200,216,228,0.5)', marginBottom: 6 }}>🍳 배치 전체 원가</div>
              <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: '1.3rem', color: 'var(--blue-light)' }}>{fmt(calc.batchCost)}원</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: '14px 16px' }}>
              <div style={{ fontSize: '0.72rem', color: 'rgba(200,216,228,0.5)', marginBottom: 6 }}>👥 총 인분</div>
              <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: '1.3rem', color: 'white' }}>
                {(menuForCalc.batch_yield || 0) > 0 && (menu.serving_size || 0) > 0
                  ? `약 ${Math.round((menuForCalc.batch_yield || 1) / (menu.serving_size || 1))}인분`
                  : '—'}
              </div>
            </div>
          </div>
          <div style={{ background: 'rgba(196,74,74,0.15)', borderRadius: 14, padding: '16px', marginBottom: 12, border: '1px solid rgba(196,74,74,0.25)' }}>
            <div style={{ fontSize: '0.72rem', color: 'rgba(200,216,228,0.5)', marginBottom: 6 }}>🥬 1인분 원가</div>
            <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: '1.8rem', color: '#F08080' }}>
              {calc.batchRatio < 1 ? `${fmt(calc.totalCost)}원` : '인분 설정 필요'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'rgba(74,127,165,0.12)', borderRadius: 12 }}>
            <span>🐟</span>
            <span style={{ fontSize: '0.8rem', color: 'rgba(200,216,228,0.7)' }}>{godogiComment()}</span>
          </div>
        </div>
      )}

      {/* 결과 — 기타 */}
      {menu.category === 'extra' && (
        <div style={{ background: '#1A2840', borderRadius: 20, padding: '24px 22px', marginTop: 16 }}>
          <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: '0.8rem', color: 'rgba(200,216,228,0.5)', marginBottom: 16 }}>📊 계산 결과</div>
          <div style={{ background: 'rgba(200,132,58,0.15)', borderRadius: 14, padding: '16px', marginBottom: 12, border: '1px solid rgba(200,132,58,0.25)' }}>
            <div style={{ fontSize: '0.72rem', color: 'rgba(200,216,228,0.5)', marginBottom: 6 }}>📦 단가</div>
            <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: '1.8rem', color: '#F4A460' }}>
              {menu.overhead > 0 ? `${fmt(menu.overhead)}원` : '—'}
            </div>
          </div>
          {menu.memo && (
            <div style={{ fontSize: '0.78rem', color: 'rgba(200,216,228,0.45)', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, marginBottom: 12 }}>
              📝 {menu.memo}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'rgba(74,127,165,0.12)', borderRadius: 12 }}>
            <span>🐟</span>
            <span style={{ fontSize: '0.8rem', color: 'rgba(200,216,228,0.7)' }}>{godogiComment()}</span>
          </div>
        </div>
      )}

      {/* 결과 — 메인/사이드/음료 */}
      {!['banchan', 'extra'].includes(menu.category || 'main') && (
        <div style={{ background: '#1A2840', borderRadius: 20, padding: '24px 22px', marginTop: 16 }}>
          <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: '0.8rem', color: 'rgba(200,216,228,0.5)', marginBottom: 16 }}>📊 계산 결과</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {[
              { label: '🥬 총 재료 원가', value: fmt(calc.ingTotal) + '원', color: 'var(--blue-light)' },
              { label: '💰 총 원가', value: fmt(calc.totalCost) + '원', color: 'white' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: '14px 16px' }}>
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
      )}

      {/* 우하단 플로팅 내보내기 버튼 */}
      <button onClick={handleExport} style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 50,
        width: 48, height: 48, borderRadius: '50%',
        background: '#4A7FA5', color: 'white',
        border: 'none', fontSize: '1.2rem',
        cursor: 'pointer', boxShadow: '0 4px 14px rgba(30,45,64,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }} title="이미지로 내보내기">📷</button>

      {/* ── 인건비 계산 모달 ── */}
      {showLaborModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 20px'
        }}>
          <div style={{
            background: '#1A2840', borderRadius: 20, padding: 24,
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
                background: 'rgba(74,127,165,0.2)', borderRadius: 14, padding: '14px 16px',
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
            background: '#1A2840', borderRadius: 20, padding: 24,
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
                background: 'rgba(74,127,165,0.2)', borderRadius: 14, padding: '14px 16px',
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

      {/* ── 배치 수율 설명 모달 ── */}
      {showBatchModal && (
        <div onClick={() => setShowBatchModal(false)} style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 20px'
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#1A2840', borderRadius: 20, padding: 24,
            width: '100%', maxWidth: 340,
            display: 'flex', flexDirection: 'column', gap: 14
          }}>
            <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: '1rem', color: 'var(--navy)' }}>
              🍳 배치 수율이란?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.82rem', color: 'var(--text-mid)', lineHeight: 1.6 }}>
              <p style={{ margin: 0 }}>
                한 번에 <strong>대량으로 만든 뒤</strong> 나눠서 제공하는 방식의 원가 계산이에요.
              </p>
              <div style={{ background: 'var(--silver-light)', borderRadius: 10, padding: '10px 14px', fontSize: '0.78rem', color: 'var(--text-soft)' }}>
                <div style={{ marginBottom: 4 }}>💡 예시</div>
                <div>김치를 한 번에 2kg 담그는 데 재료비 8,000원이 들고,</div>
                <div>1인분에 50g씩 준다면</div>
                <div style={{ marginTop: 6, fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, color: 'var(--navy)' }}>
                  → 1인분 원가 = 8,000원 × (50g ÷ 2,000g) = <span style={{ color: 'var(--blue)' }}>200원</span>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-soft)' }}>
                완성 총중량을 비워두면 재료의 사용량 합계로 자동 계산돼요.
              </p>
            </div>
            <button onClick={() => setShowBatchModal(false)} style={{
              padding: '10px 0', background: '#4A7FA5', border: 'none',
              borderRadius: 10, color: 'white',
              fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer'
            }}>확인</button>
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
        position: 'fixed', left: '-9999px', top: 0, zIndex: -1, opacity: 0,
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
            { label: '🥬 총 재료 원가', value: fmt(calc.ingTotal) + '원', color: 'rgba(200,216,228,0.6)' },
            { label: '💰 총 원가', value: fmt(calc.totalCost) + '원', color: 'rgba(200,216,228,0.8)' },
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