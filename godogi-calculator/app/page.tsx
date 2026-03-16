'use client'

import { createClient } from '../lib/supabase'
import { useState, useEffect, useRef } from 'react'
import AppSidebar from '../components/AppSidebar'
import Calculator from '../components/Calculator'

function genId() {
  return crypto.randomUUID()
}

function defaultIngredient() {
  return { id: genId(), name: '', price: 0, qty: 0, unit: 'g', yield_: 100, use_amount: 0 }
}

function defaultMenu() {
  return {
    id: genId(),
    name: '새 메뉴',
    ingredients: [defaultIngredient()],
    packaging: 0, labor: 0, overhead: 0,
    delivery_fee: 0, card_fee: 0, sale_price: 0
  }
}

function calcCostRate(menu: any) {
  const ingTotal = menu.ingredients.reduce((sum: number, ing: any) => {
    const qty = ing.qty || 1
    const yield_ = (ing.yield_ || 100) / 100
    return sum + (ing.price / qty / yield_) * (ing.use_amount || 0)
  }, 0)
  const baseCost = ingTotal + menu.packaging + menu.labor + menu.overhead
  const feeRate = (menu.delivery_fee + menu.card_fee) / 100
  const totalCost = baseCost * (1 + feeRate)
  return menu.sale_price > 0 ? (totalCost / menu.sale_price) * 100 : 0
}

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [menus, setMenus] = useState<any[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)
  const supabase = createClient()
  const autoSaveTimer = useRef<any>(null)

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

  // 로그인 되면 로컬 샘플 메뉴로 시작 (추후 Supabase에서 불러오기)
    useEffect(() => {
      if (!user) return

      const loadMenus = async () => {
        const { data: menuList, error } = await supabase
          .from('menus')
          .select('*, ingredients(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })

        if (error) { console.error(error); return }

        if (menuList && menuList.length > 0) {
          // DB에서 불러온 메뉴
          const formatted = menuList.map((m: any) => ({
            ...m,
            delivery_fee: m.delivery_fee,
            card_fee: m.card_fee,
            ingredients: (m.ingredients || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
          }))
          setMenus(formatted)
          setCurrentId(formatted[0].id)
        } else {
          // 첫 로그인 — 샘플 메뉴
          const sample = {
            id: genId(),
            name: '제육볶음',
            ingredients: [
              { id: genId(), name: '돼지고기', price: 12000, qty: 1000, unit: 'g', yield_: 90, use_amount: 200 },
              { id: genId(), name: '양파', price: 1500, qty: 1000, unit: 'g', yield_: 88, use_amount: 100 },
            ],
            packaging: 300, labor: 800, overhead: 500,
            delivery_fee: 7, card_fee: 1.5, sale_price: 12000
          }
          setMenus([sample])
          setCurrentId(sample.id)
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

    // DB에 저장된 메뉴면 삭제
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


  // 메뉴 변경 시 자동 저장 (1초 debounce, 새 메뉴는 이름 있을 때 최초 저장)
  useEffect(() => {
    if (!user || !currentMenu) return
    if (!currentMenu.created_at && (!currentMenu.name || currentMenu.name === '새 메뉴')) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(async () => {
      try {
        let menuId = currentMenu.id

        if (!currentMenu.created_at) {
          // 새 메뉴 최초 저장
          const { data, error } = await supabase.from('menus').insert({
            user_id: user.id,
            name: currentMenu.name,
            packaging: currentMenu.packaging,
            labor: currentMenu.labor,
            overhead: currentMenu.overhead,
            delivery_fee: currentMenu.delivery_fee,
            card_fee: currentMenu.card_fee,
            sale_price: currentMenu.sale_price,
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
            packaging: currentMenu.packaging,
            labor: currentMenu.labor,
            overhead: currentMenu.overhead,
            delivery_fee: currentMenu.delivery_fee,
            card_fee: currentMenu.card_fee,
            sale_price: currentMenu.sale_price,
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
        menus={menus.map(m => ({ ...m, costRate: calcCostRate(m) }))}
        currentId={currentId}
        onSelect={setCurrentId}
        onNew={handleNew}
        onDelete={handleDelete}
        user={user}
        onLogout={logout}
      />
      <main className="main-content" style={{ marginLeft: 260, flex: 1, padding: '32px 28px 60px', maxWidth: 760 }}>
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