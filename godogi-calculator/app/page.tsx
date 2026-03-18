'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '../lib/supabase'
import { FIRST_LOGIN_MENU_SAMPLES, SAMPLE_SET_DEFINITIONS, SampleMenu } from '../lib/sampleData'

const FEES_KEY = 'godogi_fees'
const DEFAULT_FEES = { delivery_platform: 6.8, delivery_card: 1.5, hall_card: 1.5 }

type BlockCategory = 'main' | 'side' | 'banchan' | 'drink' | 'extra'

interface DisplaySet {
  id: string
  name: string
  channel: 'delivery' | 'hall'
  sale_price: number
  totalCost: number
  costRate: number
  blocks: { id: string; menu_id: string; name: string; emoji: string; cost: number; category: BlockCategory }[]
  created_at: string
}

function calcMenuTotalCost(menu: any): number {
  const ingTotal = (menu.ingredients || []).reduce((sum: number, ing: any) => {
    const qty = ing.qty || 1
    const yld = (ing.yield_ || 100) / 100
    return sum + (ing.price / qty / yld) * (ing.use_amount || 0)
  }, 0)
  const baseCost = ingTotal + (menu.labor || 0) + (menu.overhead || 0)
  const batchRatio = (menu.category === 'banchan' && (menu.batch_yield || 0) > 0 && (menu.serving_size || 0) > 0)
    ? (menu.serving_size / menu.batch_yield) : 1
  return baseCost * batchRatio
}

function computeSetDisplay(dbSet: any, feeSettings: typeof DEFAULT_FEES): DisplaySet {
  const blocks = (dbSet.set_items || [])
    .sort((a: any, b: any) => a.sort_order - b.sort_order)
    .map((item: any) => ({
      id: item.id,
      menu_id: item.menu_id,
      name: item.menus?.name || '삭제된 메뉴',
      emoji: item.menus?.emoji || '🍽️',
      cost: Math.round(calcMenuTotalCost(item.menus || {})),
      category: (item.menus?.category || 'main') as BlockCategory,
    }))
  const baseCost = blocks.reduce((s: number, b: any) => s + b.cost, 0)
  const feeRate = dbSet.channel === 'delivery'
    ? (feeSettings.delivery_platform + feeSettings.delivery_card) / 100
    : feeSettings.hall_card / 100
  const totalCost = Math.round(baseCost * (1 + feeRate))
  const costRate = dbSet.sale_price > 0 ? (totalCost / dbSet.sale_price) * 100 : 0
  return { ...dbSet, blocks, totalCost, costRate }
}

function rateInfo(rate: number) {
  if (rate <= 0)  return { label: '판매가 미입력', color: 'rgba(200,216,228,0.3)' }
  if (rate < 10)  return { label: '🤯 미친 마진', color: '#7EC8A0' }
  if (rate < 30)  return { label: '🎉 엄청 좋아요', color: '#7EC8A0' }
  if (rate < 50)  return { label: '👍 잘 관리 중', color: '#F4A460' }
  if (rate < 80)  return { label: '😬 위험해요', color: '#F08080' }
  return { label: '🚨 적자 위험', color: '#D95F52' }
}

function OnboardingModal({ show, step, setStep, onClose }: {
  show: boolean
  step: number
  setStep: (s: number | ((prev: number) => number)) => void
  onClose: () => void
}) {
  const steps = [
    {
      icon: '✏️',
      title: '원가 편집기에서 재료 입력',
      desc: '왼쪽 사이드바에서 메뉴를 선택해요.\n재료 이름·가격·구매량·사용량을 입력하면\n1인분 원가가 자동으로 계산돼요.',
    },
    {
      icon: '🧩',
      title: '메뉴를 묶어 세트 구성',
      desc: '하단 "＋ 새 메뉴 구성 만들기"를 눌러요.\n팔레트에서 메뉴 블록을 캔버스에 추가하면\n배달·홀 수수료 포함 원가율이 바로 나와요.',
    },
    {
      icon: '📊',
      title: '홈에서 수익 한눈에 확인',
      desc: '홈에서 세트별 총원가와 원가율을 비교해요.\n원가율이 낮을수록 남는 장사예요!\n수익이 위험한 메뉴는 빨간색으로 표시돼요.',
    },
  ]
  const isLast = step === steps.length - 1
  const cur = steps[step]

  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            style={{ background: '#1A2840', borderRadius: 24, padding: '36px 28px', width: '100%', maxWidth: 360, fontFamily: "'Noto Sans KR', sans-serif", textAlign: 'center' }}>

            {/* 로고 */}
            <svg width="48" height="48" viewBox="0 0 100 100" fill="none" style={{ marginBottom: 14 }}>
              <ellipse cx="50" cy="55" rx="32" ry="22" fill="#4A7FA5"/>
              <ellipse cx="50" cy="53" rx="30" ry="20" fill="#5B9EC9"/>
              <polygon points="82,55 100,40 100,70" fill="#4A7FA5"/>
              <ellipse cx="46" cy="58" rx="18" ry="12" fill="#C8E6F5"/>
              <circle cx="35" cy="48" r="5" fill="white"/>
              <circle cx="35" cy="48" r="3" fill="#1E2D40"/>
              <circle cx="36" cy="47" r="1" fill="white"/>
              <path d="M 28 56 Q 32 60 36 56" stroke="#1E2D40" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              <ellipse cx="50" cy="33" rx="10" ry="6" fill="#4A7FA5" transform="rotate(-10 50 33)"/>
              <ellipse cx="30" cy="52" rx="4" ry="2.5" fill="#F4A0A0" opacity="0.6"/>
            </svg>

            {step === 0 && (
              <>
                <div style={{ color: 'white', fontWeight: 700, fontSize: '1.1rem', marginBottom: 6 }}>고독이의 원가계산기 사용법</div>
                <div style={{ color: 'rgba(200,216,228,0.45)', fontSize: '0.78rem', marginBottom: 22 }}>3단계면 충분해요 🐟</div>
              </>
            )}

            {/* 스텝 인디케이터 */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 22 }}>
              {steps.map((_, i) => (
                <div key={i} style={{ width: i === step ? 20 : 6, height: 6, borderRadius: 3, background: i === step ? '#4A7FA5' : 'rgba(255,255,255,0.15)', transition: 'all 0.3s' }} />
              ))}
            </div>

            {/* 스텝 내용 */}
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: '22px 18px', marginBottom: 22 }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>{cur.icon}</div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem', marginBottom: 10 }}>STEP {step + 1}. {cur.title}</div>
              <div style={{ color: 'rgba(200,216,228,0.6)', fontSize: '0.8rem', lineHeight: 1.75, whiteSpace: 'pre-line' }}>{cur.desc}</div>
            </div>

            {/* 버튼 */}
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => {
              if (isLast) { onClose() } else { setStep(s => s + 1) }
            }} style={{
              width: '100%', background: 'linear-gradient(135deg, #3A6FA5, #2A5080)',
              color: 'white', border: 'none', borderRadius: 12, padding: '13px',
              fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
            }}>{isLast ? '시작하기 🐟' : '다음 →'}</motion.button>

            {step === 0 && (
              <button onClick={onClose}
                style={{ background: 'none', border: 'none', color: 'rgba(200,216,228,0.3)', fontSize: '0.72rem', marginTop: 12, cursor: 'pointer', fontFamily: "'Noto Sans KR', sans-serif" }}>
                건너뛰기
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(false)
  const [sets, setSets] = useState<DisplaySet[]>([])
  const [menuStats, setMenuStats] = useState<{ total: number; avgRate: number | null; warnCount: number } | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState(0)
  const router = useRouter()
  const supabase = createClient()
  const loadedForUser = useRef<string | null>(null)

  // 게스트 플래그 초기화
  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('godogi_guest')) {
      setIsGuest(true)
    }
  }, [])

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // 게스트 온보딩 + 샘플 세트
  useEffect(() => {
    if (!isGuest) return

    if (typeof window !== 'undefined' && !localStorage.getItem('godogi_onboarded')) setShowOnboarding(true)

    const menuMap: Record<string, SampleMenu> = {}
    FIRST_LOGIN_MENU_SAMPLES.forEach(m => { menuMap[m.name] = m })
    const DEFAULT_FEES = { delivery_platform: 6.8, delivery_card: 1.5, hall_card: 1.5 }

    const guestSets: DisplaySet[] = SAMPLE_SET_DEFINITIONS.map((def, i) => {
      const blocks = def.menuNames.map((name, j) => {
        const m = menuMap[name]
        if (!m) return null
        const ingTotal = (m.ingredients || []).reduce((sum: number, ing: any) => {
          const qty = ing.qty || 1
          const yld = (ing.yield_ || 100) / 100
          return sum + (ing.price / qty / yld) * (ing.use_amount || 0)
        }, 0)
        const batchRatio = m.category === 'banchan' && (m.batch_yield || 0) > 0 && (m.serving_size || 0) > 0
          ? m.serving_size / m.batch_yield : 1
        return {
          id: `guest_${i}_${j}`,
          menu_id: `guest_menu_${name}`,
          name: m.name, emoji: m.emoji,
          cost: Math.round((ingTotal + (m.labor || 0) + (m.overhead || 0)) * batchRatio),
          category: m.category as BlockCategory,
        }
      }).filter(Boolean) as DisplaySet['blocks']

      const baseCost = blocks.reduce((s, b) => s + b.cost, 0)
      const feeRate = def.channel === 'delivery'
        ? (DEFAULT_FEES.delivery_platform + DEFAULT_FEES.delivery_card) / 100
        : DEFAULT_FEES.hall_card / 100
      const totalCost = Math.round(baseCost * (1 + feeRate))
      return {
        id: `guest_set_${i}`,
        name: def.name,
        channel: def.channel as 'delivery' | 'hall',
        sale_price: def.sale_price,
        totalCost,
        costRate: def.sale_price > 0 ? (totalCost / def.sale_price) * 100 : 0,
        blocks,
        created_at: new Date().toISOString(),
      }
    })
    setSets(guestSets)
  }, [isGuest])

  // Load sets
  useEffect(() => {
    if (!user) { loadedForUser.current = null; return }
    if (loadedForUser.current === user.id) return
    loadedForUser.current = user.id
    loadSets()
    if (!localStorage.getItem('godogi_onboarded')) setShowOnboarding(true)
  }, [user])

  const loadSets = async () => {
    const feeSettings = JSON.parse(localStorage.getItem(FEES_KEY) || JSON.stringify(DEFAULT_FEES))

    // 첫 로그인 체크
    const { data: existingSets } = await supabase.from('sets').select('id').eq('user_id', user.id)
    if (existingSets?.length === 0) {
      await insertSampleData(user.id)
    } else {
      // 메뉴는 있는데 재료가 없는 경우 backfill
      await backfillIngredients(user.id)
    }

    const { data, error } = await supabase
      .from('sets')
      .select(`
        id, name, sale_price, channel, created_at,
        set_items(
          id, sort_order, menu_id,
          menus(id, name, category, emoji, labor, overhead, batch_yield, serving_size,
            ingredients(id, price, qty, unit, yield_, use_amount)
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) { console.error(error); return }

    const computed = (data || []).map(s => computeSetDisplay(s, feeSettings))
    setSets(computed)

    const rates = computed.filter(s => s.costRate > 0).map(s => s.costRate)
    const avgRate = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : null
    setMenuStats({ total: computed.length, avgRate, warnCount: rates.filter(r => r > 60).length })
  }

  const backfillIngredients = async (userId: string) => {
    const { data: existingMenus } = await supabase.from('menus').select('id, name').eq('user_id', userId)
    if (!existingMenus || existingMenus.length === 0) return
    const { data: existingIngredients } = await supabase
      .from('ingredients').select('menu_id').in('menu_id', existingMenus.map((m: any) => m.id))
    const menuIdsWithIngredients = new Set((existingIngredients || []).map((i: any) => i.menu_id))
    const ingredientInserts: any[] = []
    for (const m of existingMenus) {
      if (menuIdsWithIngredients.has(m.id)) continue
      const sample = FIRST_LOGIN_MENU_SAMPLES.find(s => s.name === m.name)
      if (sample?.ingredients?.length) {
        sample.ingredients.forEach(ing => ingredientInserts.push({ menu_id: m.id, ...ing }))
      }
    }
    if (ingredientInserts.length > 0) {
      await supabase.from('ingredients').insert(ingredientInserts)
    }
  }

  const insertSampleData = async (userId: string) => {
    // 메뉴 확인/삽입
    const { data: existingMenus } = await supabase.from('menus').select('id, name').eq('user_id', userId)
    let menuByName: Record<string, string> = {}

    if (!existingMenus || existingMenus.length === 0) {
      const { data: insertedMenus } = await supabase.from('menus').insert(
        FIRST_LOGIN_MENU_SAMPLES.map(({ ingredients: _ing, ...s }) => ({ user_id: userId, ...s }))
      ).select()
      if (insertedMenus) {
        menuByName = Object.fromEntries(insertedMenus.map((m: any) => [m.name, m.id]))
        // 재료 삽입
        const ingredientInserts: any[] = []
        for (const [menuName, menuId] of Object.entries(menuByName)) {
          const sample = FIRST_LOGIN_MENU_SAMPLES.find(m => m.name === menuName)
          if (sample?.ingredients?.length) {
            sample.ingredients.forEach(ing => {
              ingredientInserts.push({ menu_id: menuId, ...ing })
            })
          }
        }
        if (ingredientInserts.length > 0) {
          await supabase.from('ingredients').insert(ingredientInserts)
        }
      }
    } else {
      menuByName = Object.fromEntries(existingMenus.map((m: any) => [m.name, m.id]))
    }

    // 샘플 세트 삽입
    for (const def of SAMPLE_SET_DEFINITIONS) {
      const menuIds = def.menuNames.map(n => menuByName[n]).filter(Boolean)
      if (menuIds.length === 0) continue
      const { data: newSet } = await supabase.from('sets').insert({
        user_id: userId, name: def.name, channel: def.channel, sale_price: def.sale_price,
      }).select().single()
      if (newSet) {
        await supabase.from('set_items').insert(
          menuIds.map((menuId, i) => ({ set_id: newSet.id, menu_id: menuId, sort_order: i }))
        )
      }
    }
  }

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await supabase.from('sets').delete().eq('id', id)
    const next = sets.filter(s => s.id !== id)
    setSets(next)
    const rates = next.filter(s => s.costRate > 0).map(s => s.costRate)
    const avgRate = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : null
    setMenuStats(next.length > 0 ? { total: next.length, avgRate, warnCount: rates.filter(r => r > 60).length } : null)
  }

  if (loading) return (
    <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0F1923' }}>
      <p style={{ fontFamily: "'Noto Sans KR',sans-serif", color: '#4A7FA5' }}>🐟 고독이가 헤엄치는 중...</p>
      <OnboardingModal show={showOnboarding} step={onboardingStep} setStep={setOnboardingStep} onClose={() => { localStorage.setItem('godogi_onboarded', '1'); setShowOnboarding(false); setOnboardingStep(0) }} />
    </main>
  )

  if (!user && !isGuest) return (
    <main style={{ minHeight: '100vh', background: '#0F1923', color: 'white', fontFamily: "'Noto Sans KR', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <motion.div animate={{ rotate: [0, -8, 8, -4, 0] }} transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 4 }} style={{ marginBottom: 20 }}>
        <svg width="64" height="64" viewBox="0 0 100 100" fill="none">
          <ellipse cx="50" cy="55" rx="32" ry="22" fill="#4A7FA5"/>
          <ellipse cx="50" cy="53" rx="30" ry="20" fill="#5B9EC9"/>
          <polygon points="82,55 100,40 100,70" fill="#4A7FA5"/>
          <ellipse cx="46" cy="58" rx="18" ry="12" fill="#C8E6F5"/>
          <circle cx="35" cy="48" r="5" fill="white"/>
          <circle cx="35" cy="48" r="3" fill="#1E2D40"/>
          <circle cx="36" cy="47" r="1" fill="white"/>
          <path d="M 28 56 Q 32 60 36 56" stroke="#1E2D40" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          <ellipse cx="50" cy="33" rx="10" ry="6" fill="#4A7FA5" transform="rotate(-10 50 33)"/>
          <ellipse cx="30" cy="52" rx="4" ry="2.5" fill="#F4A0A0" opacity="0.6"/>
        </svg>
      </motion.div>

      <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: '0 0 8px', textAlign: 'center' }}>고독이의 원가계산기</h1>
      <p style={{ fontSize: '0.9rem', color: 'rgba(200,216,228,0.5)', margin: '0 0 36px', textAlign: 'center' }}>우리 메뉴, 진짜로 남는 장사일까요?</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 40, width: '100%', maxWidth: 320 }}>
        {[
          { icon: '🧮', text: '재료비 · 인건비 · 간접비 자동 계산' },
          { icon: '🛵', text: '배달·카드 수수료 포함 실수익 계산' },
          { icon: '📊', text: '세트 메뉴 원가율 한눈에 비교' },
        ].map(({ icon, text }) => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '12px 16px' }}>
            <span style={{ fontSize: '1.2rem' }}>{icon}</span>
            <span style={{ fontSize: '0.82rem', color: 'rgba(200,216,228,0.75)' }}>{text}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 320 }}>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => { sessionStorage.setItem('godogi_guest', '1'); setIsGuest(true) }} style={{
          background: 'linear-gradient(135deg, #3A6FA5, #2A5080)', color: 'white', border: 'none',
          borderRadius: 14, padding: '14px', fontFamily: "'Noto Sans KR', sans-serif",
          fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
        }}>✏️ 로그인 없이 바로 써보기</motion.button>
        <motion.button whileTap={{ scale: 0.97 }} onClick={loginWithGoogle} style={{
          background: 'white', color: '#1E2D40', border: 'none',
          borderRadius: 14, padding: '14px', fontFamily: "'Noto Sans KR', sans-serif",
          fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
        }}>🔑 Google로 로그인하기</motion.button>
        <p style={{ textAlign: 'center', fontSize: '0.68rem', color: '#7DB8D8', margin: 0 }}>로그인하면 데이터가 저장돼요</p>
      </div>
    </main>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0F1923', color: 'white', fontFamily: "'Noto Sans KR', sans-serif" }}>

      {/* 헤더 */}
      <header style={{ padding: '24px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <motion.div
              animate={{ rotate: [0, -8, 8, -4, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 5 }}
            >
              <svg width="44" height="44" viewBox="0 0 100 100" fill="none">
                <ellipse cx="50" cy="55" rx="32" ry="22" fill="#4A7FA5"/>
                <ellipse cx="50" cy="53" rx="30" ry="20" fill="#5B9EC9"/>
                <polygon points="82,55 100,40 100,70" fill="#4A7FA5"/>
                <ellipse cx="46" cy="58" rx="18" ry="12" fill="#C8E6F5"/>
                <circle cx="35" cy="48" r="5" fill="white"/>
                <circle cx="35" cy="48" r="3" fill="#1E2D40"/>
                <circle cx="36" cy="47" r="1" fill="white"/>
                <path d="M 28 56 Q 32 60 36 56" stroke="#1E2D40" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                <ellipse cx="50" cy="33" rx="10" ry="6" fill="#4A7FA5" transform="rotate(-10 50 33)"/>
                <ellipse cx="30" cy="52" rx="4" ry="2.5" fill="#F4A0A0" opacity="0.6"/>
              </svg>
            </motion.div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.01em' }}>고독이의 원가계산기</h1>
              <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(200,216,228,0.4)', marginTop: 2 }}>우리 메뉴, 진짜로 남는 장사일까요?</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {!user && (
              <button onClick={loginWithGoogle} style={{
                background: 'white', color: '#1E2D40', border: 'none',
                borderRadius: 8, padding: '7px 13px',
                fontSize: '0.72rem', cursor: 'pointer', fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700,
              }}>🔑 로그인</button>
            )}
            <button onClick={() => router.push('/calculator')} style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
              color: 'rgba(200,216,228,0.45)', borderRadius: 8, padding: '7px 13px',
              fontSize: '0.72rem', cursor: 'pointer', fontFamily: "'Noto Sans KR', sans-serif",
            }}>원가 편집기 →</button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main style={{ maxWidth: 680, margin: '0 auto', padding: `28px 24px ${menuStats ? 300 : 120}px` }}>
        {sets.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{ textAlign: 'center', paddingTop: 80, color: 'rgba(200,216,228,0.3)' }}
          >
            <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🐟</div>
            <p style={{ fontSize: '0.95rem', marginBottom: 6 }}>아직 만든 메뉴 구성이 없어요</p>
            <p style={{ fontSize: '0.78rem', opacity: 0.6 }}>아래 버튼을 눌러 첫 메뉴 구성을 만들어봐요</p>
          </motion.div>
        ) : (
          <div>
            <div style={{ fontSize: '0.68rem', color: 'rgba(200,216,228,0.25)', marginBottom: 14, letterSpacing: '0.06em' }}>
              메뉴 구성 {sets.length}개
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <AnimatePresence>
                {sets.map((set, i) => {
                  const ri = rateInfo(set.costRate)
                  return (
                    <motion.div
                      key={set.id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ delay: i * 0.04 }}
                      whileHover={{ scale: 1.01 }}
                      onClick={() => router.push(`/proto?id=${set.id}`)}
                      style={{
                        background: 'linear-gradient(135deg, #162030, #1C2D40)',
                        border: '1px solid rgba(74,127,165,0.18)',
                        borderRadius: 16, padding: '16px 18px',
                        cursor: 'pointer', position: 'relative',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        {/* 왼쪽 */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.98rem', fontWeight: 700, marginBottom: 8 }}>{set.name}</div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {set.blocks.slice(0, 5).map(b => (
                              <span key={b.id}
                                onClick={e => { e.stopPropagation(); router.push(`/calculator?menuId=${b.menu_id}&returnTo=/`) }}
                                style={{
                                  fontSize: '0.73rem',
                                  background: 'rgba(255,255,255,0.05)',
                                  border: '1px solid rgba(255,255,255,0.07)',
                                  borderRadius: 6, padding: '2px 8px',
                                  cursor: 'pointer',
                                }}>
                                {b.emoji} {b.name}
                              </span>
                            ))}
                            {set.blocks.length > 5 && (
                              <span style={{ fontSize: '0.73rem', color: 'rgba(200,216,228,0.3)', padding: '2px 4px' }}>
                                +{set.blocks.length - 5}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* 오른쪽 */}
                        <div style={{ textAlign: 'right', flexShrink: 0, paddingRight: 20 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5, marginBottom: 6 }}>
                            <span style={{
                              fontSize: '0.62rem', padding: '2px 8px', borderRadius: 20,
                              background: set.channel === 'delivery' ? 'rgba(74,127,165,0.2)' : 'rgba(74,140,111,0.2)',
                              color: set.channel === 'delivery' ? '#5B9EC9' : '#4A8C6F',
                              border: `1px solid ${set.channel === 'delivery' ? 'rgba(74,127,165,0.3)' : 'rgba(74,140,111,0.3)'}`,
                              fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700,
                            }}>
                              {set.channel === 'delivery' ? '🛵 배달' : '🏠 홀'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.6rem', color: 'rgba(200,216,228,0.3)', marginBottom: 3 }}>총 원가</div>
                          <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                            ₩{set.totalCost.toLocaleString('ko-KR')}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: ri.color, marginTop: 4 }}>
                            {ri.label}
                            {set.costRate > 0 && <span style={{ opacity: 0.6, marginLeft: 4 }}>({Math.round(set.costRate)}%)</span>}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteConfirmId(set.id) }}
                        style={{
                          position: 'absolute', top: 10, right: 10,
                          background: 'transparent', border: 'none',
                          color: 'rgba(200,216,228,0.18)', cursor: 'pointer',
                          fontSize: '0.78rem', padding: '4px 6px', lineHeight: 1,
                        }}
                      >✕</button>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>

      {/* 하단 인사이트 카드 */}
      {menuStats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{ position: 'fixed', bottom: 80, left: 0, right: 0, zIndex: 20, padding: '0 16px', pointerEvents: 'none' }}
        >
          <div style={{ maxWidth: 680, margin: '0 auto', pointerEvents: 'auto' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(15,25,35,0.94)', backdropFilter: 'blur(14px)',
              borderRadius: 16, padding: '10px 14px',
              border: '1px solid rgba(74,127,165,0.15)',
            }}>
              {[
                { label: '구성', value: `${menuStats.total}개` },
                { label: '평균 원가율', value: menuStats.avgRate !== null ? `${menuStats.avgRate.toFixed(1)}%` : '—', color: menuStats.avgRate === null ? undefined : menuStats.avgRate < 40 ? '#7EC8A0' : menuStats.avgRate < 60 ? '#F4A460' : '#F08080' },
                { label: '주의', value: `${menuStats.warnCount}개`, color: menuStats.warnCount > 0 ? '#F08080' : 'rgba(200,216,228,0.5)' },
              ].map(({ label, value, color }, i) => (
                <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 4, ...(i > 0 ? { borderLeft: '1px solid rgba(255,255,255,0.07)', paddingLeft: 10 } : {}) }}>
                  <span style={{ fontSize: '0.62rem', color: 'rgba(200,216,228,0.35)' }}>{label}</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: color || 'white' }}>{value}</span>
                </div>
              ))}
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: '0.72rem', color: 'rgba(200,216,228,0.35)' }}>
                🐟 {menuStats.avgRate === null ? '판매가 미입력'
                  : menuStats.warnCount > 0 ? `${menuStats.warnCount}개 점검 필요`
                  : menuStats.avgRate < 40 ? '흐뭇해요 🎉' : '조금 더 줄여봐요'}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* FAB */}
      <motion.button
        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
        onClick={() => router.push('/proto')}
        style={{
          position: 'fixed', bottom: 28, right: 24,
          background: 'linear-gradient(135deg, #3A6FA5, #2A5080)',
          border: 'none', borderRadius: 18, color: 'white', fontSize: '0.9rem',
          padding: '14px 22px', cursor: 'pointer',
          boxShadow: '0 8px 28px rgba(58,111,165,0.4)',
          fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700,
        }}
      >＋ 새 메뉴 구성 만들기</motion.button>

      {/* 온보딩 모달 */}
      <OnboardingModal
        show={showOnboarding}
        step={onboardingStep}
        setStep={setOnboardingStep}
        onClose={() => { localStorage.setItem('godogi_onboarded', '1'); setShowOnboarding(false); setOnboardingStep(0) }}
      />

      {/* 삭제 확인 모달 */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setDeleteConfirmId(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <motion.div initial={{ scale: 0.93 }} animate={{ scale: 1 }} exit={{ scale: 0.93 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#1A2840', borderRadius: 18, padding: '28px 24px', width: '100%', maxWidth: 320, fontFamily: "'Noto Sans KR', sans-serif", textAlign: 'center' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: 12 }}>🗑️</div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem', marginBottom: 8 }}>메뉴 구성을 삭제할까요?</div>
              <div style={{ color: 'rgba(200,216,228,0.45)', fontSize: '0.75rem', marginBottom: 24 }}>삭제하면 되돌릴 수 없어요</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setDeleteConfirmId(null)} style={{
                  flex: 1, background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 10,
                  color: 'rgba(200,216,228,0.6)', padding: '11px', fontFamily: "'Noto Sans KR', sans-serif",
                  fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                }}>취소</button>
                <button onClick={async e => {
                  await handleDelete(deleteConfirmId, e as any)
                  setDeleteConfirmId(null)
                }} style={{
                  flex: 1, background: '#C44A4A', border: 'none', borderRadius: 10,
                  color: 'white', padding: '11px', fontFamily: "'Noto Sans KR', sans-serif",
                  fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                }}>삭제</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
