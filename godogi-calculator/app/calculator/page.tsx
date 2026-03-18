'use client'

import { createClient } from '../../lib/supabase'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import AppSidebar from '../../components/AppSidebar'
import Calculator from '../../components/Calculator'

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
  const supabase = createClient()
  const autoSaveTimer = useRef<any>(null)
  const loadedForUser = useRef<string | null>(null)

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

  useEffect(() => {
    if (!user) { loadedForUser.current = null; return }
    if (loadedForUser.current === user.id) return
    loadedForUser.current = user.id

    const loadMenus = async () => {
      const { data: menuList, error } = await supabase
        .from('menus')
        .select('*, ingredients(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (error) { console.error(error); return }

      if (menuList && menuList.length > 0) {
        const formatted = menuList.map((m: any) => ({
          ...m,
          delivery_fee: m.delivery_fee,
          card_fee: m.card_fee,
          ingredients: (m.ingredients || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
        }))
        setMenus(formatted)
        const target = menuIdParam ? formatted.find((m: any) => m.id === menuIdParam) : null
        setCurrentId(target ? target.id : formatted[0].id)
      }
    }

    loadMenus()
  }, [user])

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setMenus([])
    setCurrentId(null)
  }

  const currentMenu = menus.find(m => m.id === currentId) ?? null

  const handleChange = (updated: any) => {
    setMenus(prev => prev.map(m => m.id === updated.id ? updated : m))
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

  useEffect(() => {
    if (!user || !currentMenu) return
    if (!currentMenu.created_at && !currentMenu.name) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(async () => {
      try {
        let menuId = currentMenu.id

        if (!currentMenu.created_at) {
          const { data, error } = await supabase.from('menus').insert({
            user_id: user.id,
            name: currentMenu.name,
            category: currentMenu.category || 'main',
            emoji: currentMenu.emoji || '',
            batch_yield: currentMenu.batch_yield || 0,
            serving_size: currentMenu.serving_size || 0,
            packaging: currentMenu.packaging,
            labor: currentMenu.labor,
            overhead: currentMenu.overhead,
            delivery_fee: currentMenu.delivery_fee,
            card_fee: currentMenu.card_fee,
            sale_price: currentMenu.sale_price,
            memo: currentMenu.memo || '',
          }).select().single()
          if (error || !data) return
          menuId = data.id
          setMenus(prev => prev.map(m =>
            m.id === currentMenu.id ? { ...m, id: data.id, created_at: data.created_at } : m
          ))
          setCurrentId(data.id)
        } else {
          await supabase.from('menus').update({
            name: currentMenu.name,
            category: currentMenu.category || 'main',
            emoji: currentMenu.emoji || '',
            batch_yield: currentMenu.batch_yield || 0,
            serving_size: currentMenu.serving_size || 0,
            packaging: currentMenu.packaging,
            labor: currentMenu.labor,
            overhead: currentMenu.overhead,
            delivery_fee: currentMenu.delivery_fee,
            card_fee: currentMenu.card_fee,
            sale_price: currentMenu.sale_price,
            memo: currentMenu.memo || '',
            updated_at: new Date().toISOString()
          }).eq('id', menuId)
        }

        await supabase.from('ingredients').delete().eq('menu_id', menuId)
        const ings = currentMenu.ingredients.map((ing: any, idx: number) => ({
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
    }, 1000)
    return () => clearTimeout(autoSaveTimer.current)
  }, [currentMenu])

  if (loading) return (
    <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F0F4F8' }}>
      <p style={{ fontFamily: 'sans-serif', color: '#4A7FA5' }}>🐟 고독이가 헤엄치는 중...</p>
    </main>
  )

  if (!user) return (
    <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#1E2D40', gap: 24 }}>
      <div style={{ textAlign: 'center', color: 'white' }}>
        <div style={{ fontSize: '2rem', marginBottom: 8 }}>🐟</div>
        <h1 style={{ fontFamily: 'sans-serif', fontSize: '1.4rem', marginBottom: 4 }}>고독이의 원가계산기</h1>
        <p style={{ fontSize: '0.85rem', opacity: 0.5 }}>소상공인을 위한 메뉴 원가 계산기</p>
      </div>
      <button onClick={loginWithGoogle} style={{
        background: 'white', color: '#1E2D40', border: 'none',
        borderRadius: 12, padding: '12px 28px',
        fontFamily: 'sans-serif', fontSize: '0.95rem',
        cursor: 'pointer'
      }}>
        🔑 Google로 시작하기
      </button>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: '0.78rem', fontFamily: "'Noto Sans KR', sans-serif" }}>
          {returnTo ? (
            <a href={returnTo} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'rgba(74,127,165,0.15)', border: '1px solid rgba(74,127,165,0.3)',
              color: '#7DB8D8', textDecoration: 'none', fontWeight: 700,
              borderRadius: 8, padding: '5px 12px', fontSize: '0.78rem',
            }}>← 메뉴구성으로 돌아가기</a>
          ) : (
            <>
              <a href="/" style={{ color: 'var(--text-soft)', textDecoration: 'none', fontWeight: 500 }}>홈</a>
              <span style={{ color: 'var(--text-soft)', opacity: 0.4 }}>›</span>
              <span style={{ color: 'var(--text-mid)', fontWeight: 700 }}>원가 편집기</span>
              <a href="/proto" style={{
                marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'rgba(74,127,165,0.12)', border: '1px solid rgba(74,127,165,0.25)',
                color: '#7DB8D8', textDecoration: 'none', fontWeight: 600,
                borderRadius: 8, padding: '4px 10px', fontSize: '0.75rem',
              }}>메뉴 구성 →</a>
            </>
          )}
        </div>
        {currentMenu ? (
          <Calculator
            menu={currentMenu}
            onChange={handleChange}
          />
        ) : (
          <div style={{ textAlign: 'center', paddingTop: 80, color: 'var(--text-soft)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🐟</div>
            <div style={{ fontFamily: 'Black Han Sans', fontSize: '1rem', marginBottom: 8 }}>메뉴를 선택하거나 새로 만들어봐요</div>
          </div>
        )}
      </main>
      <style>{`
        @media (max-width: 768px) {
          .main-content {
            margin-left: 0 !important;
            padding-top: 64px !important;
          }
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
