'use client'

import { createClient } from '../../lib/supabase'
import { FIRST_LOGIN_MENU_SAMPLES as FIRST_LOGIN_SAMPLES } from '@/lib/sampleData'
import { useState, useEffect, useRef, Suspense } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import AppSidebar from '../../components/AppSidebar'
import Calculator from '../../components/Calculator'

const FRIDGE_CATEGORIES = ['전체', '육류', '채소', '양념/소스', '유제품', '곡류/면', '과일', '수산물', '기타']
const FRIDGE_UNITS = ['g', 'ml', '개', '팩', 'kg', 'L']

function genId() {
  return crypto.randomUUID()
}

function defaultIngredient() {
  return { id: genId(), name: '', price: 0, qty: 0, unit: 'g', yield_: 100, use_amount: 0 }
}

function defaultMenu() {
  return {
    id: genId(),
    name: '',
    category: 'main',
    emoji: '',
    batch_yield: 0,
    serving_size: 0,
    ingredients: [defaultIngredient()],
    packaging: 0, labor: 0, overhead: 0,
    delivery_fee: 0, card_fee: 0, sale_price: 0, memo: ''
  }
}


function calcCostRate(menu: any) {
  const ingTotal = menu.ingredients.reduce((sum: number, ing: any) => {
    const qty = ing.qty || 1
    const yield_ = (ing.yield_ || 100) / 100
    return sum + (ing.price / qty / yield_) * (ing.use_amount || 0)
  }, 0)
  const totalCost = ingTotal + (menu.labor || 0) + (menu.overhead || 0)
  return menu.sale_price > 0 ? (totalCost / menu.sale_price) * 100 : 0
}

function calcSubLabel(menu: any): string {
  if (menu.category === 'banchan') {
    const ingTotal = (menu.ingredients || []).reduce((sum: number, ing: any) => {
      const qty = ing.qty || 1
      const yield_ = (ing.yield_ || 100) / 100
      return sum + (ing.price / qty / yield_) * (ing.use_amount || 0)
    }, 0)
    const batchCost = ingTotal + (menu.labor || 0) + (menu.overhead || 0)
    const batchYield = menu.batch_yield || 0
    const servingSize = menu.serving_size || 0
    if (batchYield > 0 && servingSize > 0) {
      const perServing = Math.round(batchCost * (servingSize / batchYield))
      return `1인분 ${perServing.toLocaleString()}원`
    }
    return '인분 미설정'
  }
  if (menu.category === 'extra') {
    return (menu.overhead || 0) > 0 ? `단가 ${(menu.overhead).toLocaleString()}원` : '단가 미입력'
  }
  const ingTotal = (menu.ingredients || []).reduce((sum: number, ing: any) => {
    const qty = ing.qty || 1
    const yield_ = (ing.yield_ || 100) / 100
    return sum + (ing.price / qty / yield_) * (ing.use_amount || 0)
  }, 0)
  const totalCost = Math.round(ingTotal + (menu.labor || 0) + (menu.overhead || 0))
  return totalCost > 0 ? `총원가 ${totalCost.toLocaleString()}원` : '원가 미입력'
}

function CalculatorContent() {
  const searchParams = useSearchParams()
  const menuIdParam = searchParams.get('menuId')
  const returnTo = searchParams.get('returnTo')
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [menus, setMenus] = useState<any[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [menusLoading, setMenusLoading] = useState(false)
  const [showFridgeSheet, setShowFridgeSheet] = useState(false)
  const [fridgeItems, setFridgeItems] = useState<any[]>([])
  const [fridgeSearch, setFridgeSearch] = useState('')
  const [fridgeCategory, setFridgeCategory] = useState('전체')
  const [fridgeConfirm, setFridgeConfirm] = useState<any | null>(null)
  const [showFridgeForm, setShowFridgeForm] = useState(false)
  const [fridgeEditItem, setFridgeEditItem] = useState<any | null>(null)
  const [fridgeForm, setFridgeForm] = useState({ name: '', price: '', per: '', unit: 'g', yield_: '100', category: '기타' })
  const [showOcrResults, setShowOcrResults] = useState(false)
  const [ocrProcessing, setOcrProcessing] = useState(false)
  const [ocrResults, setOcrResults] = useState<any[]>([])
  const [ocrSelected, setOcrSelected] = useState<Set<number>>(new Set())
  const supabase = createClient()
  const autoSaveTimer = useRef<any>(null)
  const loadedForUser = useRef<string | null>(null)
  const pendingSave = useRef<any>(null)
  const saveMenuRef = useRef<any>(null)
  const dirtyMenus = useRef<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  // 비로그인 게스트: 샘플 메뉴로 시작
  useEffect(() => {
    if (loading || user) return
    if (menus.length === 0) {
      const sampleMenus = FIRST_LOGIN_SAMPLES.map(s => ({
        ...defaultMenu(),
        id: `guest_menu_${s.name}`,
        name: s.name,
        emoji: s.emoji,
        category: s.category,
        labor: s.labor,
        overhead: s.overhead,
        batch_yield: s.batch_yield,
        serving_size: s.serving_size,
        ingredients: (s.ingredients || []).map((ing: any) => ({ ...ing, id: genId() })),
      }))
      setMenus(sampleMenus)
      const target = menuIdParam ? sampleMenus.find(m => m.id === menuIdParam) : null
      setCurrentId(target ? target.id : sampleMenus[0].id)
    }
  }, [loading, user])

  useEffect(() => {
    if (!user) { loadedForUser.current = null; return }
    if (loadedForUser.current === user.id) return
    loadedForUser.current = user.id

    const loadMenus = async () => {
      setMenusLoading(true)
      const { data: menuList, error } = await supabase
        .from('menus')
        .select('*, ingredients(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      setMenusLoading(false)
      if (error) { console.error(error); return }

      if (menuList && menuList.length > 0) {
        const formatted = menuList.map((m: any) => {
          const sorted = (m.ingredients || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
          // 중복 재료 dedup (이름 기준) — 버그로 생긴 중복 자동 정리
          const seen = new Set<string>()
          const deduped = sorted.filter((ing: any) => {
            if (!ing.name) return false
            if (seen.has(ing.name)) { dirtyMenus.current.add(m.id); return false }
            seen.add(ing.name)
            return true
          })
          return { ...m, delivery_fee: m.delivery_fee, card_fee: m.card_fee, ingredients: deduped }
        })
        setMenus(formatted)
        const target = menuIdParam ? formatted.find((m: any) => m.id === menuIdParam) : null
        setCurrentId(target ? target.id : formatted[0].id)
      }
    }

    loadMenus()
  }, [user])

  // 게스트 메뉴 변경사항 localStorage 자동 저장 (로그인 후 이전용)
  useEffect(() => {
    if (user || menus.length === 0) return
    localStorage.setItem('godogi_guest_menus', JSON.stringify(menus.map(m => ({
      name: m.name, emoji: m.emoji || '', category: m.category,
      batch_yield: m.batch_yield || 0, serving_size: m.serving_size || 0,
      packaging: m.packaging || 0, labor: m.labor || 0, overhead: m.overhead || 0,
      delivery_fee: m.delivery_fee || 0, card_fee: m.card_fee || 0,
      sale_price: m.sale_price || 0, memo: m.memo || '',
      ingredients: (m.ingredients || []).map((ing: any, idx: number) => ({
        name: ing.name, price: ing.price || 0, qty: ing.qty || 0,
        unit: ing.unit || 'g', yield_: ing.yield_ || 100,
        use_amount: ing.use_amount || 0, sort_order: idx,
      })),
    }))))
  }, [menus, user])

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }

  const logout = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('godogi_sets_cache')
    localStorage.removeItem('godogi_backfill_done')
    setUser(null)
    setMenus([])
    setCurrentId(null)
  }

  const currentMenu = menus.find(m => m.id === currentId) ?? null

  const handleChange = (updated: any) => {
    dirtyMenus.current.add(updated.id)
    setMenus(prev => prev.map(m => m.id === updated.id ? updated : m))
  }

  // 냉장고 아이템 로드 (시트 열 때만, INGREDIENT_DB도 이때 dynamic import)
  const loadFridgeItems = async () => {
    if (!user) { setFridgeItems([]); return }
    const [{ data }, { INGREDIENT_DB }] = await Promise.all([
      supabase.from('fridge').select('*').eq('user_id', user.id),
      import('@/lib/ingredientDB'),
    ])
    const userItems = data || []
    const fridgeNames = userItems.map((i: any) => i.name)
    const dbItems = INGREDIENT_DB
      .filter(d => !fridgeNames.includes(d.name))
      .map(d => ({ ...d, id: 'db_' + d.name, isDB: true }))
    setFridgeItems([...userItems, ...dbItems])
  }

  const filteredFridgeItems = () => fridgeItems.filter((i: any) => {
    const matchCat = fridgeCategory === '전체' || i.category === fridgeCategory
    const matchSearch = i.name.includes(fridgeSearch)
    return matchCat && matchSearch
  })

  const handleFridgePick = (item: any) => {
    if (!currentMenu) return
    // 이미 동일 재료가 있으면 추가 안 함
    if (currentMenu.ingredients.some((i: any) => i.name === item.name)) {
      setFridgeConfirm(null)
      setShowFridgeSheet(false)
      setFridgeSearch('')
      return
    }
    const emptyIdx = currentMenu.ingredients.findIndex((i: any) => !i.name)
    const newIng = {
      id: emptyIdx >= 0 ? currentMenu.ingredients[emptyIdx].id : genId(),
      name: item.name,
      price: item.price,
      qty: item.per,
      unit: item.unit,
      yield_: item.yield_,
      use_amount: 0,
    }
    const newIngredients = emptyIdx >= 0
      ? currentMenu.ingredients.map((i: any, idx: number) => idx === emptyIdx ? newIng : i)
      : [...currentMenu.ingredients, newIng]
    handleChange({ ...currentMenu, ingredients: newIngredients })
    setFridgeConfirm(null)
    setShowFridgeSheet(false)
    setFridgeSearch('')
  }

  const openFridgeEdit = (item: any) => {
    setFridgeEditItem(item)
    setFridgeForm({
      name: item.name,
      price: String(item.price),
      per: String(item.per),
      unit: item.unit,
      yield_: String(item.yield_),
      category: item.category,
    })
    setShowFridgeForm(true)
  }

  const openFridgeAdd = () => {
    setFridgeEditItem(null)
    setFridgeForm({ name: '', price: '', per: '', unit: 'g', yield_: '100', category: '기타' })
    setShowFridgeForm(true)
  }

  const handleFridgeSave = async () => {
    if (!fridgeForm.name.trim() || !user) return
    const payload = {
      user_id: user.id,
      name: fridgeForm.name,
      price: parseFloat(fridgeForm.price) || 0,
      per: parseFloat(fridgeForm.per) || 0,
      unit: fridgeForm.unit,
      yield_: parseFloat(fridgeForm.yield_) || 100,
      category: fridgeForm.category,
    }
    if (fridgeEditItem && !fridgeEditItem.isDB) {
      await supabase.from('fridge').update(payload).eq('id', fridgeEditItem.id)
    } else {
      await supabase.from('fridge').insert(payload)
    }
    setShowFridgeForm(false)
    loadFridgeItems()
  }

  const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (!files || files.length === 0) return

    setOcrProcessing(true)
    try {
      const formData = new FormData()
      for (let i = 0; i < files.length; i++) {
        formData.append('images', files[i])
      }

      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('OCR failed')

      const data = await response.json()
      setOcrResults(data.items || [])
      setOcrSelected(new Set())
      setShowOcrResults(true)
    } catch (err) {
      console.error('OCR upload error:', err)
      alert('영수증 처리 실패. 다시 시도해주세요.')
    } finally {
      setOcrProcessing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleOcrAdd = async () => {
    if (!user || ocrSelected.size === 0) return
    try {
      const toAdd = Array.from(ocrSelected).map(idx => ocrResults[idx])
      const payload = toAdd.map(item => ({
        user_id: user.id,
        name: item.name,
        price: item.price,
        per: item.per,
        unit: item.unit,
        yield_: 100,
        category: '기타',
      }))

      await supabase.from('fridge').insert(payload)
      setShowOcrResults(false)
      setOcrResults([])
      setOcrSelected(new Set())
      loadFridgeItems()
    } catch (err) {
      console.error('OCR add error:', err)
      alert('저장 실패')
    }
  }

  const handleNew = () => {
    const m = defaultMenu()
    setMenus(prev => [...prev, m])
    setCurrentId(m.id)
  }

  const handleDelete = async (id: string) => {
    const menu = menus.find(m => m.id === id)
    if (!menu) return

    if (menu.created_at) {
      const { error } = await supabase
        .from('menus')
        .delete()
        .eq('id', id)
      if (error) { console.error(error); return }
    }

    const next = menus.filter(m => m.id !== id)
    setMenus(next)
    setCurrentId(next.length > 0 ? next[0].id : null)
  }

  const saveMenu = async (menu: any) => {
    if (!user || !menu) return
    if (!menu.created_at && !menu.name) return
    try {
      let menuId = menu.id
      if (!menu.created_at) {
        const { data, error } = await supabase.from('menus').insert({
          user_id: user.id,
          name: menu.name,
          category: menu.category || 'main',
          emoji: menu.emoji || '',
          batch_yield: menu.batch_yield || 0,
          serving_size: menu.serving_size || 0,
          packaging: menu.packaging,
          labor: menu.labor,
          overhead: menu.overhead,
          delivery_fee: menu.delivery_fee,
          card_fee: menu.card_fee,
          sale_price: menu.sale_price,
          memo: menu.memo || '',
        }).select().single()
        if (error || !data) return
        menuId = data.id
        setMenus(prev => prev.map(m =>
          m.id === menu.id ? { ...m, id: data.id, created_at: data.created_at } : m
        ))
        setCurrentId(data.id)
      } else {
        await supabase.from('menus').update({
          name: menu.name,
          category: menu.category || 'main',
          emoji: menu.emoji || '',
          batch_yield: menu.batch_yield || 0,
          serving_size: menu.serving_size || 0,
          packaging: menu.packaging,
          labor: menu.labor,
          overhead: menu.overhead,
          delivery_fee: menu.delivery_fee,
          card_fee: menu.card_fee,
          sale_price: menu.sale_price,
          memo: menu.memo || '',
          updated_at: new Date().toISOString()
        }).eq('id', menuId)
      }
      await supabase.from('ingredients').delete().eq('menu_id', menuId)
      const ings = menu.ingredients.map((ing: any, idx: number) => ({
        menu_id: menuId,
        name: ing.name,
        price: ing.price,
        qty: ing.qty,
        unit: ing.unit,
        yield_: ing.yield_,
        use_amount: ing.use_amount,
        sort_order: idx
      }))
      if (ings.length > 0) await supabase.from('ingredients').insert(ings)
    } catch (err) {
      console.error('Auto-save error:', err)
    }
  }

  // saveMenuRef: stale closure 방지용 항상 최신 saveMenu 참조
  saveMenuRef.current = saveMenu

  // 자동저장: 변경사항을 pendingSave에 기록 + 1초 debounce
  useEffect(() => {
    if (!user || !currentMenu) return
    if (!currentMenu.created_at && !currentMenu.name) return
    pendingSave.current = currentMenu
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      const m = pendingSave.current
      pendingSave.current = null
      if (m && dirtyMenus.current.has(m.id)) {
        dirtyMenus.current.delete(m.id)
        saveMenuRef.current(m)
      }
    }, 1000)
    return () => clearTimeout(autoSaveTimer.current)
  }, [currentMenu])

  // 메뉴 전환 시 pending 저장 (timer 취소 후 즉시 저장)
  useEffect(() => {
    return () => {
      if (pendingSave.current) {
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
        const m = pendingSave.current
        pendingSave.current = null
        saveMenuRef.current?.(m)
      }
    }
  }, [currentId])

  if (loading) return (
    <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F0F4F8' }}>
      <p style={{ fontFamily: 'sans-serif', color: '#4A7FA5' }}>🐟 고독이가 헤엄치는 중...</p>
    </main>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <AppSidebar
        menus={menus.map(m => ({ ...m, costRate: calcCostRate(m), subLabel: calcSubLabel(m) }))}
        currentId={currentId}
        onSelect={setCurrentId}
        onNew={handleNew}
        onDelete={handleDelete}
        user={user}
        onLogout={logout}
      />
      <main className="main-content" style={{ marginLeft: 260, flex: 1, padding: '32px 28px 60px', maxWidth: 760 }}>
        {!user && (
          <div style={{ background: 'rgba(74,127,165,0.12)', border: '1px solid rgba(74,127,165,0.25)', borderRadius: 10, padding: '10px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontFamily: "'Noto Sans KR', sans-serif" }}>
            <span style={{ fontSize: '0.78rem', color: '#7DB8D8' }}>🐟 로그인하면 데이터가 저장돼요</span>
            <button onClick={loginWithGoogle} style={{ background: 'white', color: '#1E2D40', border: 'none', borderRadius: 8, padding: '6px 12px', fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', flexShrink: 0 }}>🔑 로그인</button>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, fontSize: '0.78rem', fontFamily: "'Noto Sans KR', sans-serif" }}>
          <a href={returnTo ?? '/proto'} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'rgba(74,127,165,0.15)', border: '1px solid rgba(74,127,165,0.3)',
            color: '#7DB8D8', textDecoration: 'none', fontWeight: 700,
            borderRadius: 8, padding: '5px 12px', fontSize: '0.78rem',
          }}><ArrowLeft size={13} style={{ flexShrink: 0 }} /> 메뉴구성</a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <a href="/" style={{ color: 'var(--text-soft)', textDecoration: 'none', fontWeight: 500 }}>홈</a>
            <span style={{ color: 'var(--text-soft)', opacity: 0.4 }}>›</span>
            <span style={{ color: 'var(--text-mid)', fontWeight: 700 }}>원가 편집기</span>
          </div>
        </div>
        {currentMenu ? (
          <Calculator
            menu={currentMenu}
            onChange={handleChange}
            onOpenFridge={() => { setShowFridgeSheet(true); loadFridgeItems() }}
            onSave={() => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); saveMenu(currentMenu) }}
          />
        ) : menusLoading ? (
          <div style={{ textAlign: 'center', paddingTop: 80, color: 'var(--text-soft)', fontFamily: "'Noto Sans KR',sans-serif" }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 16, animation: 'swim 1.2s ease-in-out infinite alternate' }}>🐟</div>
            <div style={{ fontSize: '0.9rem', color: 'rgba(200,216,228,0.5)', marginBottom: 6 }}>메뉴를 불러오는 중이에요</div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(200,216,228,0.3)' }}>첫 접속 시 잠깐 걸릴 수 있어요</div>
            <style>{`@keyframes swim { from { transform: translateX(-6px); } to { transform: translateX(6px); } }`}</style>
          </div>
        ) : (
          <div style={{ textAlign: 'center', paddingTop: 80, color: 'var(--text-soft)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🐟</div>
            <div style={{ fontFamily: 'Black Han Sans', fontSize: '1rem', marginBottom: 8 }}>메뉴를 선택하거나 새로 만들어봐요</div>
          </div>
        )}
      </main>
      {/* 모바일 냉장고 FAB */}
      <div className="calc-fridge-fab" style={{ position: 'fixed', bottom: 20, left: 20, zIndex: 30, display: 'none' }}>
        <button
          onClick={() => { setShowFridgeSheet(true); loadFridgeItems() }}
          style={{
            background: 'rgba(26,40,64,0.92)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(74,127,165,0.4)', borderRadius: 20,
            color: '#7DB8D8', fontSize: '0.78rem',
            padding: '8px 18px', cursor: 'pointer',
            fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700,
            boxShadow: '0 3px 14px rgba(0,0,0,0.3)',
            display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
          }}
        >🧊 냉장고</button>
      </div>

      {/* 냉장고 바텀시트 */}
      {showFridgeSheet && (
        <>
          <div onClick={() => { setShowFridgeSheet(false); setFridgeSearch(''); setFridgeConfirm(null) }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 40 }} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
            background: '#111B27', borderRadius: '22px 22px 0 0',
            maxHeight: '75svh', display: 'flex', flexDirection: 'column',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
          }}>
            {/* 드래그 핸들 */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
            </div>

            {/* 헤더 */}
            <div style={{ padding: '4px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.88rem', fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, color: 'white' }}>🧊 냉장고</span>
                {user && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => fileInputRef.current?.click()} disabled={ocrProcessing} style={{
                      background: 'rgba(150,100,200,0.2)', border: '1px solid rgba(150,100,200,0.4)',
                      borderRadius: 8, color: '#C8B3F5', fontSize: '0.75rem',
                      padding: '5px 12px', cursor: ocrProcessing ? 'not-allowed' : 'pointer',
                      fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700,
                      opacity: ocrProcessing ? 0.5 : 1,
                    }}>📷 영수증</button>
                    <button onClick={openFridgeAdd} style={{
                      background: 'rgba(74,127,165,0.2)', border: '1px solid rgba(74,127,165,0.4)',
                      borderRadius: 8, color: '#7DB8D8', fontSize: '0.75rem',
                      padding: '5px 12px', cursor: 'pointer',
                      fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700,
                    }}>＋ 추가</button>
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleOcrUpload} style={{ display: 'none' }} />
              <input
                placeholder="재료 검색..."
                value={fridgeSearch}
                onChange={e => setFridgeSearch(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(200,216,228,0.15)',
                  borderRadius: 10, color: 'white',
                  fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 400, fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
            </div>

            {/* 카테고리 */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '10px 16px', flexShrink: 0, scrollbarWidth: 'none' }}>
              {FRIDGE_CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setFridgeCategory(cat)} style={{
                  padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                  background: fridgeCategory === cat ? '#4A7FA5' : 'rgba(255,255,255,0.06)',
                  color: fridgeCategory === cat ? 'white' : 'rgba(200,216,228,0.5)',
                  fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, fontSize: '0.75rem',
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}>{cat}</button>
              ))}
            </div>

            {/* 재료 목록 */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '0 12px 8px' }}>
              {filteredFridgeItems().length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(200,216,228,0.35)', fontSize: '0.82rem', fontFamily: "'Noto Sans KR',sans-serif" }}>
                  검색 결과가 없어요
                </div>
              ) : filteredFridgeItems().map((item: any) => (
                <div key={item.id} style={{
                  width: '100%', padding: '11px 12px', marginBottom: 6,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  fontFamily: "'Noto Sans KR',sans-serif", cursor: 'pointer',
                }} onClick={() => setFridgeConfirm(item)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '0.88rem', color: 'white', fontWeight: 700 }}>{item.name}</span>
                        {item.isDB && <span style={{ fontSize: '0.62rem', color: 'rgba(200,216,228,0.3)', fontWeight: 400 }}>기본</span>}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'rgba(200,216,228,0.4)', marginTop: 2 }}>
                        {(item.price || 0).toLocaleString()}원 / {item.per}{item.unit}
                        {item.yield_ !== 100 && ` · 수율 ${item.yield_}%`}
                      </div>
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); openFridgeEdit(item) }} style={{
                    background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 6,
                    color: 'rgba(200,216,228,0.5)', fontSize: '0.72rem',
                    padding: '4px 10px', cursor: 'pointer',
                    fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, flexShrink: 0,
                  }}>수정</button>
                </div>
              ))}
            </div>
          </div>

          {/* 추가 확인 모달 */}
          {fridgeConfirm && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}
              onClick={() => setFridgeConfirm(null)}>
              <div onClick={e => e.stopPropagation()} style={{
                background: '#1A2840', borderRadius: 20, padding: '24px 22px',
                width: '100%', maxWidth: 300, border: '1px solid rgba(74,127,165,0.25)',
                fontFamily: "'Noto Sans KR',sans-serif",
              }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'white', marginBottom: 6 }}>
                  {fridgeConfirm.name}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(200,216,228,0.45)', marginBottom: 20 }}>
                  {(fridgeConfirm.price || 0).toLocaleString()}원 / {fridgeConfirm.per}{fridgeConfirm.unit}
                  {fridgeConfirm.yield_ !== 100 && ` · 수율 ${fridgeConfirm.yield_}%`}
                  <br />현재 메뉴에 추가할까요?
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setFridgeConfirm(null)} style={{
                    flex: 1, padding: '10px 0', background: 'rgba(255,255,255,0.06)',
                    border: 'none', borderRadius: 10, color: 'rgba(200,216,228,0.5)',
                    fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                  }}>취소</button>
                  <button onClick={() => handleFridgePick(fridgeConfirm)} style={{
                    flex: 1, padding: '10px 0', background: '#4A7FA5',
                    border: 'none', borderRadius: 10, color: 'white',
                    fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                  }}>추가</button>
                </div>
              </div>
            </div>
          )}

          {/* 수정/추가 폼 모달 */}
          {showFridgeForm && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px', background: 'rgba(0,0,0,0.4)' }}
              onClick={() => setShowFridgeForm(false)}>
              <div onClick={e => e.stopPropagation()} style={{
                background: '#1E2D40', borderRadius: 20, padding: 24,
                width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 14,
                fontFamily: "'Noto Sans KR',sans-serif",
              }}>
                <div style={{ fontWeight: 700, color: 'white', fontSize: '1rem' }}>
                  {fridgeEditItem ? (fridgeEditItem.isDB ? '매입가 수정 🧊' : '재료 수정') : '재료 추가 🧊'}
                </div>
                {fridgeEditItem?.isDB && (
                  <div style={{ fontSize: '0.72rem', color: 'rgba(200,216,228,0.4)', background: 'rgba(255,255,255,0.05)', padding: '8px 10px', borderRadius: 8 }}>
                    수정하면 내 냉장고에 저장돼요
                  </div>
                )}
                {[
                  { label: '재료명', key: 'name', disabled: !!fridgeEditItem, placeholder: '재료명' },
                ].map(({ label, key, disabled, placeholder }) => (
                  <div key={key}>
                    <label style={{ fontSize: '0.7rem', color: 'rgba(200,216,228,0.5)', fontWeight: 700, marginBottom: 4, display: 'block' }}>{label}</label>
                    <input style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(200,216,228,0.15)', borderRadius: 8, color: 'white', fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 400, fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' as const }}
                      value={fridgeForm[key as keyof typeof fridgeForm]} placeholder={placeholder}
                      onChange={e => setFridgeForm(f => ({ ...f, [key]: e.target.value }))}
                      disabled={disabled} />
                  </div>
                ))}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[{ label: '구매가 (원)', key: 'price' }, { label: '구매량', key: 'per' }].map(({ label, key }) => (
                    <div key={key}>
                      <label style={{ fontSize: '0.7rem', color: 'rgba(200,216,228,0.5)', fontWeight: 700, marginBottom: 4, display: 'block' }}>{label}</label>
                      <input style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(200,216,228,0.15)', borderRadius: 8, color: 'white', fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 400, fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' as const }}
                        value={fridgeForm[key as keyof typeof fridgeForm]} inputMode="numeric" placeholder="0"
                        onChange={e => setFridgeForm(f => ({ ...f, [key]: e.target.value }))} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'rgba(200,216,228,0.5)', fontWeight: 700, marginBottom: 4, display: 'block' }}>단위</label>
                    <select style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(200,216,228,0.15)', borderRadius: 8, color: 'white', fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 400, fontSize: '0.85rem', outline: 'none' }}
                      value={fridgeForm.unit} onChange={e => setFridgeForm(f => ({ ...f, unit: e.target.value }))}>
                      {FRIDGE_UNITS.map(u => <option key={u} style={{ background: '#1E2D40' }}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'rgba(200,216,228,0.5)', fontWeight: 700, marginBottom: 4, display: 'block' }}>수율 (%)</label>
                    <input style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(200,216,228,0.15)', borderRadius: 8, color: 'white', fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 400, fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' as const }}
                      value={fridgeForm.yield_} inputMode="numeric" placeholder="100"
                      onChange={e => setFridgeForm(f => ({ ...f, yield_: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', color: 'rgba(200,216,228,0.5)', fontWeight: 700, marginBottom: 4, display: 'block' }}>카테고리</label>
                  <select style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(200,216,228,0.15)', borderRadius: 8, color: 'white', fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 400, fontSize: '0.85rem', outline: 'none' }}
                    value={fridgeForm.category} onChange={e => setFridgeForm(f => ({ ...f, category: e.target.value }))}>
                    {FRIDGE_CATEGORIES.filter(c => c !== '전체').map(c => <option key={c} style={{ background: '#1E2D40' }}>{c}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button onClick={() => setShowFridgeForm(false)} style={{ flex: 1, padding: '10px 0', background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 10, color: 'rgba(200,216,228,0.5)', fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>취소</button>
                  <button onClick={handleFridgeSave} style={{ flex: 1, padding: '10px 0', background: '#4A7FA5', border: 'none', borderRadius: 10, color: 'white', fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>저장</button>
                </div>
              </div>
            </div>
          )}

          {/* OCR 결과 리뷰 모달 */}
          {showOcrResults && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 55, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', background: 'rgba(0,0,0,0.5)' }}
              onClick={() => setShowOcrResults(false)}>
              <div onClick={e => e.stopPropagation()} style={{
                background: '#111B27', borderRadius: 20, padding: '20px 16px',
                width: '100%', maxWidth: 360, maxHeight: '70vh', display: 'flex', flexDirection: 'column', gap: 12,
                fontFamily: "'Noto Sans KR',sans-serif", overflowY: 'auto',
              }}>
                <div style={{ fontWeight: 700, color: 'white', fontSize: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>📷 영수증 분석 ({ocrResults.length}개)</span>
                  <button onClick={() => setShowOcrResults(false)} style={{ background: 'none', border: 'none', color: 'rgba(200,216,228,0.5)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
                </div>

                {ocrProcessing ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(200,216,228,0.5)', fontSize: '0.85rem' }}>
                    분석 중...
                  </div>
                ) : ocrResults.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(200,216,228,0.35)', fontSize: '0.85rem' }}>
                    인식된 재료가 없어요. 다시 찍어볼까요?
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 8 }}>
                      <button onClick={() => setOcrSelected(ocrSelected.size === ocrResults.length ? new Set() : new Set(ocrResults.map((_, i) => i)))} style={{
                        background: 'rgba(74,127,165,0.2)', border: '1px solid rgba(74,127,165,0.4)',
                        borderRadius: 6, color: '#7DB8D8', fontSize: '0.7rem',
                        padding: '4px 10px', cursor: 'pointer',
                        fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 600,
                      }}>
                        {ocrSelected.size === ocrResults.length ? '전체 해제' : '전체선택'}
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', maxHeight: '40vh' }}>
                      {ocrResults.map((item, idx) => (
                        <div key={idx} style={{
                          padding: '10px 12px', background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10,
                          display: 'flex', gap: 10, alignItems: 'flex-start',
                          opacity: item.confidence < 0.6 ? 0.6 : 1,
                        }}>
                          <input type="checkbox" checked={ocrSelected.has(idx)} onChange={e => {
                            const ns = new Set(ocrSelected)
                            if (e.target.checked) ns.add(idx)
                            else ns.delete(idx)
                            setOcrSelected(ns)
                          }} style={{ marginTop: 4, cursor: 'pointer', accentColor: '#4A7FA5' }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.88rem', color: 'white', fontWeight: 600 }}>{item.name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'rgba(200,216,228,0.4)', marginTop: 2 }}>
                              {item.price.toLocaleString()}원 / {item.per}{item.unit}
                            </div>
                            {item.confidence < 0.7 && (
                              <div style={{ fontSize: '0.65rem', color: 'rgba(255,150,100,0.6)', marginTop: 2 }}>
                                ⚠ 인식도 {Math.round(item.confidence * 100)}%
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button onClick={() => setShowOcrResults(false)} style={{ flex: 1, padding: '10px 0', background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 10, color: 'rgba(200,216,228,0.5)', fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>취소</button>
                      <button onClick={handleOcrAdd} disabled={ocrSelected.size === 0} style={{ flex: 1, padding: '10px 0', background: ocrSelected.size === 0 ? 'rgba(255,255,255,0.1)' : '#6A9FB5', border: 'none', borderRadius: 10, color: ocrSelected.size === 0 ? 'rgba(200,216,228,0.3)' : 'white', fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, fontSize: '0.82rem', cursor: ocrSelected.size === 0 ? 'not-allowed' : 'pointer' }}>선택 추가 {ocrSelected.size}</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        @media (max-width: 768px) {
          .main-content {
            margin-left: 0 !important;
            padding-top: 64px !important;
            padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 90px) !important;
          }
          .calc-fridge-fab { display: flex !important; }
        }
      `}</style>
    </div>
  )
}

export default function CalculatorPage() {
  return (
    <Suspense fallback={
      <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F0F4F8' }}>
        <p style={{ fontFamily: 'sans-serif', color: '#4A7FA5' }}>🐟 고독이가 헤엄치는 중...</p>
      </main>
    }>
      <CalculatorContent />
    </Suspense>
  )
}
