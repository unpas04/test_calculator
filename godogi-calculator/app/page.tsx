'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { createClient } from '../lib/supabase'
import { FIRST_LOGIN_MENU_SAMPLES, SAMPLE_SET_DEFINITIONS, SampleMenu } from '../lib/sampleData'
import ShareButton from '../components/ShareButton'

const FEES_KEY = 'godogi_fees'
const DEFAULT_FEES = { delivery_platform: 6.8, delivery_card: 1.5, hall_card: 1.5 }

type BlockCategory = 'main' | 'side' | 'banchan' | 'drink' | 'extra'

// 기본 카테고리 목록
const DEFAULT_PRODUCT_CATEGORIES = [
  { name: '탕/찌개류', emoji: '🍲' },
  { name: '볶음류', emoji: '🥘' },
  { name: '구이류', emoji: '🍖' },
  { name: '밥류', emoji: '🍚' },
  { name: '면류', emoji: '🍜' },
  { name: '반찬류', emoji: '🥢' },
  { name: '음료', emoji: '🥤' },
  { name: '디저트', emoji: '🍰' },
  { name: '기타', emoji: '🔔' },
]

// 업종 목록
const INDUSTRY_LIST = [
  { name: '한식', emoji: '🍱' },
  { name: '카페/디저트', emoji: '☕' },
  { name: '술집/이자카야', emoji: '🍺' },
  { name: '양식', emoji: '🍝' },
  { name: '일식', emoji: '🍣' },
  { name: '치킨/패스트푸드', emoji: '🍗' },
  { name: '분식', emoji: '🥙' },
  { name: '기타', emoji: '🏪' },
]

// 업종별 카테고리 매핑
const INDUSTRY_CATEGORIES: Record<string, { name: string; emoji: string }[]> = {
  '한식': [
    { name: '탕/찌개류', emoji: '🍲' }, { name: '볶음류', emoji: '🥘' },
    { name: '구이류', emoji: '🍖' }, { name: '밥류', emoji: '🍚' },
    { name: '반찬류', emoji: '🥢' }, { name: '음료', emoji: '🥤' }, { name: '기타', emoji: '🔔' },
  ],
  '카페/디저트': [
    { name: '커피/음료', emoji: '☕' }, { name: '베이커리', emoji: '🥐' },
    { name: '케이크', emoji: '🎂' }, { name: '스무디/쉐이크', emoji: '🥤' }, { name: '기타', emoji: '🔔' },
  ],
  '술집/이자카야': [
    { name: '안주류', emoji: '🍢' }, { name: '구이류', emoji: '🍖' },
    { name: '찜/조림', emoji: '🥘' }, { name: '사이드', emoji: '🥗' },
    { name: '술/음료', emoji: '🍻' }, { name: '기타', emoji: '🔔' },
  ],
  '양식': [
    { name: '메인', emoji: '🍽️' }, { name: '파스타/피자', emoji: '🍝' },
    { name: '스프/샐러드', emoji: '🥗' }, { name: '음료/디저트', emoji: '🥤' }, { name: '기타', emoji: '🔔' },
  ],
  '일식': [
    { name: '초밥/롤', emoji: '🍱' }, { name: '라멘/면류', emoji: '🍜' },
    { name: '덮밥류', emoji: '🍚' }, { name: '사이드', emoji: '🥗' },
    { name: '음료', emoji: '🥤' }, { name: '기타', emoji: '🔔' },
  ],
  '치킨/패스트푸드': [
    { name: '치킨류', emoji: '🍗' }, { name: '세트', emoji: '🍱' },
    { name: '사이드', emoji: '🍟' }, { name: '음료', emoji: '🥤' }, { name: '기타', emoji: '🔔' },
  ],
  '분식': [
    { name: '떡볶이류', emoji: '🌶️' }, { name: '튀김류', emoji: '🍢' },
    { name: '면/만두', emoji: '🍜' }, { name: '밥류', emoji: '🍚' },
    { name: '음료', emoji: '🥤' }, { name: '기타', emoji: '🔔' },
  ],
}

interface DisplaySet {
  id: string
  name: string
  channel: 'delivery' | 'hall'
  sale_price: number
  totalCost: number
  costRate: number
  blocks: { id: string; menu_id: string; name: string; emoji: string; cost: number; category: BlockCategory }[]
  created_at: string
  product_category?: string
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

// 목표 원가율 기준 색상 (목표 원가율에 따라 동적 판정)
function getRateColor(avg: number, target: number) {
  if (avg < target * 0.9) return '#7EC8A0'      // 초록: 목표 대비 90% 이하
  if (avg < target * 1.2) return '#F4A460'      // 주황: 목표 대비 120% 이하
  return '#F08080'                               // 빨강: 초과
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
      desc: '하단 "＋ 새 원가 계산 만들기"를 눌러요.\n팔레트에서 메뉴 블록을 캔버스에 추가하면\n배달·홀 수수료 포함 원가율이 바로 나와요.',
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

const SETS_CACHE_KEY = 'godogi_sets_cache'

export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [setsLoading, setSetsLoading] = useState(false)
  const [isGuest, setIsGuest] = useState(false)
  const [sets, setSets] = useState<DisplaySet[]>([])
  const [menuStats, setMenuStats] = useState<{ total: number; avgRate: number | null; warnCount: number } | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState(0)

  // 홈화면 탭 UI 상태
  const [homeTab, setHomeTab] = useState<'sets' | 'menus'>('sets')
  const [setSearch, setSetSearch] = useState('')
  const [setFilter, setSetFilter] = useState<'all' | 'delivery' | 'hall'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'costRate'>('newest')
  const [expandedSetId, setExpandedSetId] = useState<string | null>(null)
  const [menuCategory, setMenuCategory] = useState('all')
  const [menuSearch, setMenuSearch] = useState('')
  const [allMenus, setAllMenus] = useState<any[]>([])

  // 매장 정보 상태
  interface ShopInfo {
    name: string
    industry: string
    targetRate: number
  }
  const SHOP_INFO_KEY = 'godogi_shop_info'
  const [shopInfo, setShopInfo] = useState<ShopInfo>({ name: '', industry: '', targetRate: 35 })
  const [editingShop, setEditingShop] = useState(false)
  const [shopDraft, setShopDraft] = useState<ShopInfo>({ name: '', industry: '', targetRate: 35 })

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
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        sessionStorage.removeItem('godogi_guest')
        setIsGuest(false)
      } else {
        const guest = typeof window !== 'undefined' && !!sessionStorage.getItem('godogi_guest')
        setIsGuest(guest)
      }
      // 매장 정보 localStorage 로드
      const savedShop = typeof window !== 'undefined' ? localStorage.getItem(SHOP_INFO_KEY) : null
      if (savedShop) {
        try {
          setShopInfo(JSON.parse(savedShop))
          setShopDraft(JSON.parse(savedShop))
        } catch { }
      }
      setLoading(false) // auth 확인 즉시 로딩 해제 (DB 대기 없음)
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
    const rates = guestSets.filter(s => s.costRate > 0).map(s => s.costRate)
    const avgRate = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : null
    setMenuStats({ total: guestSets.length, avgRate, warnCount: rates.filter(r => r > 60).length })
  }, [isGuest])

  // Load sets
  useEffect(() => {
    if (!user) { loadedForUser.current = null; return }
    if (loadedForUser.current === user.id) return
    loadedForUser.current = user.id
    loadSets()
    if (!localStorage.getItem('godogi_onboarded')) setShowOnboarding(true)
  }, [user])

  // 세트 로드 후 메뉴 목록 추출
  useEffect(() => {
    const menuMap = new Map<string, any>()
    for (const set of sets) {
      for (const block of set.blocks) {
        if (!menuMap.has(block.menu_id)) {
          menuMap.set(block.menu_id, {
            id: block.menu_id,
            name: block.name,
            emoji: block.emoji,
            category: block.category,
            cost: block.cost,
          })
        }
      }
    }
    setAllMenus(Array.from(menuMap.values()).sort((a, b) => a.name.localeCompare(b.name)))
  }, [sets])

  const saveShopInfo = (info: ShopInfo) => {
    setShopInfo(info)
    localStorage.setItem(SHOP_INFO_KEY, JSON.stringify(info))
  }

  const loadSets = async () => {
    const feeSettings = JSON.parse(localStorage.getItem(FEES_KEY) || JSON.stringify(DEFAULT_FEES))

    // 캐시 있으면 즉시 표시
    const cached = localStorage.getItem(SETS_CACHE_KEY)
    if (cached) {
      try {
        const { sets: cachedSets, stats } = JSON.parse(cached)
        setSets(cachedSets)
        setMenuStats(stats)
      } catch {}
    } else {
      setSetsLoading(true)
    }

    // 쿼리 1번으로 통합: 결과가 없으면 첫 로그인으로 처리
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

    if (error) { console.error(error); setSetsLoading(false); return }

    if (!data || data.length === 0) {
      await insertSampleData(user.id)
      // 삽입 후 재로드
      const { data: data2 } = await supabase
        .from('sets')
        .select(`id, name, sale_price, channel, created_at, set_items(id, sort_order, menu_id, menus(id, name, category, emoji, labor, overhead, batch_yield, serving_size, ingredients(id, price, qty, unit, yield_, use_amount)))`)
        .eq('user_id', user.id).order('created_at', { ascending: false })
      const computed2 = (data2 || []).map(s => computeSetDisplay(s, feeSettings))
      setSets(computed2)
      const rates2 = computed2.filter(s => s.costRate > 0).map(s => s.costRate)
      setMenuStats({ total: computed2.length, avgRate: rates2.length > 0 ? rates2.reduce((a, b) => a + b, 0) / rates2.length : null, warnCount: rates2.filter(r => r > 60).length })
    } else {
      const computed = data.map(s => computeSetDisplay(s, feeSettings))
      const rates = computed.filter(s => s.costRate > 0).map(s => s.costRate)
      const stats = { total: computed.length, avgRate: rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : null, warnCount: rates.filter(r => r > 60).length }
      setSets(computed)
      setMenuStats(stats)
      // 캐시 저장
      localStorage.setItem(SETS_CACHE_KEY, JSON.stringify({ sets: computed, stats }))
      // backfill: 최초 1회만
      if (!localStorage.getItem('godogi_backfill_done')) {
        backfillIngredients(user.id).then(() => localStorage.setItem('godogi_backfill_done', '1'))
      }
    }
    setSetsLoading(false)
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
    // 게스트가 수정한 메뉴가 있으면 그걸 우선 사용
    const savedGuestRaw = localStorage.getItem('godogi_guest_menus')
    const guestMenus: any[] | null = savedGuestRaw ? JSON.parse(savedGuestRaw) : null
    const menusSource = guestMenus || FIRST_LOGIN_MENU_SAMPLES

    // 메뉴 확인/삽입
    const { data: existingMenus } = await supabase.from('menus').select('id, name').eq('user_id', userId)
    let menuByName: Record<string, string> = {}

    if (!existingMenus || existingMenus.length === 0) {
      const { data: insertedMenus } = await supabase.from('menus').insert(
        menusSource.map(({ ingredients: _ing, ...s }: any) => ({ user_id: userId, ...s }))
      ).select()
      if (insertedMenus) {
        menuByName = Object.fromEntries(insertedMenus.map((m: any) => [m.name, m.id]))
        const ingredientInserts: any[] = []
        for (const [menuName, menuId] of Object.entries(menuByName)) {
          const source = menusSource.find((m: any) => m.name === menuName)
          if (source?.ingredients?.length) {
            source.ingredients.forEach((ing: any) => {
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

    // 게스트 데이터 정리
    if (guestMenus) {
      localStorage.removeItem('godogi_guest_menus')
      sessionStorage.removeItem('godogi_guest')
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
      <header style={{ padding: '16px 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <motion.div style={{ flexShrink: 0 }}
              animate={{ rotate: [0, -8, 8, -4, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 5 }}
            >
              <svg width="36" height="36" viewBox="0 0 100 100" fill="none">
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
            <div style={{ minWidth: 0 }}>
              <h1 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, letterSpacing: '0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'rgba(200,216,228,0.6)' }}>고독이의 원가계산기</h1>
              <p className="home-subtitle" style={{ margin: 0, fontSize: '0.65rem', color: 'rgba(200,216,228,0.3)', marginTop: 1 }}>우리 메뉴, 진짜로 남는 장사일까요?</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
            {!user && (
              <button onClick={loginWithGoogle} style={{
                background: 'white', color: '#1E2D40', border: 'none',
                borderRadius: 8, padding: '7px 12px',
                fontSize: '0.72rem', cursor: 'pointer', fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, whiteSpace: 'nowrap',
              }}>🔑 로그인</button>
            )}
            <ShareButton
              utm_source="kakao"
              utm_medium="social"
              utm_campaign="home_header"
            />
          </div>
        </div>
      </header>
      <style>{`
        @media (max-width: 480px) {
          .home-subtitle { display: none !important; }
        }
        /* 모바일: 통합 바 표시, PC floating 숨김 */
        .home-bottom-mobile { display: flex !important; }
        .home-bottom-pc { display: none !important; }
        .home-main { padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 100px) !important; }
        @media (min-width: 641px) {
          .home-bottom-mobile { display: none !important; }
          .home-bottom-pc { display: block !important; }
          .home-main { padding-bottom: 220px !important; }
        }
      `}</style>

      {/* 필터링 로직 */}
      {(() => {
        // 업종 기반 카테고리 동적 선택
        const activeCategories = shopInfo.industry && INDUSTRY_CATEGORIES[shopInfo.industry]
          ? INDUSTRY_CATEGORIES[shopInfo.industry]
          : DEFAULT_PRODUCT_CATEGORIES

        // 카테고리 필터: 'all' 선택 시 전체, 아니면 setFilter 카테고리명 매칭
        const setsWithCategory = sets.map((s, idx) => ({
          ...s,
          product_category: s.product_category || activeCategories[idx % activeCategories.length].name
        }))

        const filteredSets = setsWithCategory
          .filter(s => setFilter === '전체' || s.product_category === setFilter)
          .filter(s => s.name.includes(setSearch) || s.blocks.some(b => b.name.includes(setSearch)))
          .sort((a, b) =>
            sortBy === 'newest'
              ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              : a.costRate - b.costRate
          )

        // 카테고리별 그룹화
        const groupedBySets: Record<string, typeof filteredSets> = {}
        filteredSets.forEach(set => {
          const cat = set.product_category || '기타'
          if (!groupedBySets[cat]) groupedBySets[cat] = []
          groupedBySets[cat].push(set)
        })

        // 카테고리 순서대로 정렬
        const orderedCategories = activeCategories.map(c => c.name).filter(c => groupedBySets[c])

        const filteredMenus = allMenus
          .filter(m => menuCategory === 'all' || m.category === menuCategory)
          .filter(m => m.name.toLowerCase().includes(menuSearch.toLowerCase()))

        const CATEGORY_LABELS: Record<string, string> = {
          main: '메인', side: '사이드', banchan: '반찬', drink: '음료', extra: '기타'
        }

        // TOP 5 수익성 좋은 상품 (costRate 낮은 순)
        const top5Sets = [...filteredSets].sort((a, b) => a.costRate - b.costRate).slice(0, 5)

        // 원가율 높은 상품 (60% 이상, 경고)
        const highCostSets = filteredSets.filter(s => s.costRate >= 60).sort((a, b) => b.costRate - a.costRate)

        return (
      <>
      <main className="home-main" style={{ maxWidth: 680, margin: '0 auto', padding: '0 24px 100px', display: 'flex', flexDirection: 'column' }}>
        {/* 대시보드 통계 - 메뉴판 탭에서만 표시 */}
        {homeTab === 'sets' && (
          <>
            {/* 매장 정보 카드 */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.02 }}
              style={{
                background: 'linear-gradient(135deg, rgba(74,127,165,0.12), rgba(91,158,201,0.07))',
                border: '1px solid rgba(74,127,165,0.2)',
                borderRadius: 16, padding: '14px 16px',
                marginBottom: 14,
              }}>
              {!editingShop ? (
                /* 보기 모드 */
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'white', marginBottom: 4 }}>
                      {shopInfo.name || '🏪 매장 이름을 입력하세요'}
                    </div>
                    {(shopInfo.industry || shopInfo.targetRate > 0) && (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        {shopInfo.industry && (
                          <span style={{ fontSize: '0.72rem', color: '#7DB8D8', background: 'rgba(74,127,165,0.2)', padding: '2px 8px', borderRadius: 10, whiteSpace: 'nowrap' }}>
                            {INDUSTRY_LIST.find(i => i.name === shopInfo.industry)?.emoji} {shopInfo.industry}
                          </span>
                        )}
                        {shopInfo.targetRate > 0 && (
                          <span style={{ fontSize: '0.72rem', color: 'rgba(200,216,228,0.5)', whiteSpace: 'nowrap' }}>
                            목표 원가율 {shopInfo.targetRate}%
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <button onClick={() => { setShopDraft(shopInfo); setEditingShop(true) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(200,216,228,0.35)', fontSize: '0.9rem', fontWeight: 700, flexShrink: 0, marginLeft: 10 }}>
                    ✏️
                  </button>
                </div>
              ) : (
                /* 수정 모드 */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input placeholder="매장 이름"
                    value={shopDraft.name}
                    onChange={e => setShopDraft(d => ({ ...d, name: e.target.value }))}
                    style={{
                      width: '100%', padding: '10px 12px', fontSize: '14px', boxSizing: 'border-box',
                      background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(200,216,228,0.15)',
                      borderRadius: 10, color: 'white', fontFamily: "'Noto Sans KR',sans-serif", outline: 'none'
                    }} />

                  {/* 업종 선택 칩 */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {INDUSTRY_LIST.map(ind => (
                      <button key={ind.name}
                        onClick={() => setShopDraft(d => ({ ...d, industry: ind.name }))}
                        style={{
                          padding: '5px 10px', borderRadius: 16, border: 'none', cursor: 'pointer',
                          background: shopDraft.industry === ind.name ? '#4A7FA5' : 'rgba(255,255,255,0.07)',
                          color: shopDraft.industry === ind.name ? 'white' : 'rgba(200,216,228,0.5)',
                          fontSize: '0.72rem', fontWeight: 700, fontFamily: "'Noto Sans KR',sans-serif",
                        }}>
                        {ind.emoji} {ind.name}
                      </button>
                    ))}
                  </div>

                  {/* 목표 원가율 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '0.72rem', color: 'rgba(200,216,228,0.5)', whiteSpace: 'nowrap' }}>목표 원가율</span>
                    <input type="range" min={10} max={80} value={shopDraft.targetRate}
                      onChange={e => setShopDraft(d => ({ ...d, targetRate: +e.target.value }))}
                      style={{ flex: 1, height: 5, cursor: 'pointer' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: shopDraft.targetRate < 40 ? '#7EC8A0' : shopDraft.targetRate < 60 ? '#F4A460' : '#F08080', minWidth: 36, textAlign: 'right' }}>
                      {shopDraft.targetRate}%
                    </span>
                  </div>

                  {/* 업종 변경 시 카테고리 안내 */}
                  {shopDraft.industry && shopDraft.industry !== shopInfo.industry && (
                    <div style={{ fontSize: '0.7rem', color: 'rgba(200,216,228,0.4)', background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '6px 10px' }}>
                      💡 {shopDraft.industry}로 전환: {INDUSTRY_CATEGORIES[shopDraft.industry]?.map(c => c.emoji + c.name).join(' · ')}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setEditingShop(false)}
                      style={{ flex: 1, padding: '8px', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, color: 'rgba(200,216,228,0.5)', cursor: 'pointer', fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700 }}>
                      취소
                    </button>
                    <button onClick={() => { saveShopInfo(shopDraft); setEditingShop(false) }}
                      style={{ flex: 2, padding: '8px', background: '#4A7FA5', border: 'none', borderRadius: 8, color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: "'Noto Sans KR',sans-serif" }}>
                      저장
                    </button>
                  </div>
                </div>
              )}
            </motion.div>

            {/* 상단 핵심 통계 카드 */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
              {/* 상품 개수 */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(74,127,165,0.15), rgba(91,158,201,0.1))',
                border: '1px solid rgba(74,127,165,0.2)',
                borderRadius: 12,
                padding: '14px 12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.6rem', color: 'rgba(200,216,228,0.4)', marginBottom: 4, fontWeight: 600 }}>📋 상품</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#4A7FA5' }}>
                  {filteredSets.length}개
                </div>
              </div>

              {/* 평균 원가율 */}
              {menuStats && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(126,200,160,0.15), rgba(139,201,169,0.1))',
                  border: '1px solid rgba(126,200,160,0.2)',
                  borderRadius: 12,
                  padding: '14px 12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.6rem', color: 'rgba(200,216,228,0.4)', marginBottom: 4, fontWeight: 600 }}>평균 원가율</div>
                  <div style={{
                    fontSize: '1.3rem',
                    fontWeight: 800,
                    color: menuStats.avgRate === null ? 'rgba(200,216,228,0.3)' : getRateColor(menuStats.avgRate, shopInfo.targetRate)
                  }}>
                    {menuStats.avgRate === null ? '—' : `${menuStats.avgRate.toFixed(1)}%`}
                  </div>
                </div>
              )}

              {/* 주의 필요 */}
              {menuStats && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(240,128,128,0.15), rgba(240,128,128,0.1))',
                  border: '1px solid rgba(240,128,128,0.2)',
                  borderRadius: 12,
                  padding: '14px 12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.6rem', color: 'rgba(200,216,228,0.4)', marginBottom: 4, fontWeight: 600 }}>⚠️ 주의 필요</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: menuStats.warnCount > 0 ? '#F08080' : 'rgba(200,216,228,0.3)' }}>
                    {menuStats.warnCount}개
                  </div>
                </div>
              )}
            </motion.div>

            {/* TOP 5 수익성 좋은 상품 */}
            {top5Sets.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                style={{ marginBottom: 14 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'rgba(200,216,228,0.5)', marginBottom: 8 }}>
                  📊 TOP 5 수익성 좋은 상품
                </div>
                <div style={{ background: 'rgba(126,200,160,0.08)', border: '1px solid rgba(126,200,160,0.2)', borderRadius: 12, padding: '10px 12px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(200,216,228,0.6)', lineHeight: 1.6 }}>
                    {top5Sets.map((s, i) => (
                      <div key={s.id} style={{ marginBottom: i < top5Sets.length - 1 ? 4 : 0 }}>
                        {i + 1}️⃣ {s.name} · <span style={{ color: '#7EC8A0', fontWeight: 600 }}>{Math.round(s.costRate)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 경고: 원가율 높은 상품 */}
            {highCostSets.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                style={{ marginBottom: 14 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'rgba(200,216,228,0.5)', marginBottom: 8 }}>
                  ⚠️ 원가율 높은 상품 (60% 이상)
                </div>
                <div style={{ background: 'rgba(240,128,128,0.08)', border: '1px solid rgba(240,128,128,0.2)', borderRadius: 12, padding: '10px 12px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(200,216,228,0.6)', lineHeight: 1.6 }}>
                    {highCostSets.map((s, i) => (
                      <div key={s.id} style={{ marginBottom: i < highCostSets.length - 1 ? 4 : 0 }}>
                        {s.name} · <span style={{ color: '#F08080', fontWeight: 600 }}>{Math.round(s.costRate)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* 탭 바 */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, marginBottom: 14 }}>
          {['sets', 'menus'].map((tab) => (
            <button
              key={tab}
              onClick={() => { setHomeTab(tab as any); setSetSearch(''); setMenuSearch(''); setExpandedSetId(null) }}
              style={{
                flex: 1, padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer',
                color: homeTab === tab ? '#4A7FA5' : 'rgba(200,216,228,0.35)',
                fontSize: '0.82rem', fontWeight: 600, fontFamily: "'Noto Sans KR',sans-serif",
                borderBottom: homeTab === tab ? '2px solid #4A7FA5' : '2px solid transparent',
                transition: '0.2s',
              }}
            >
              {tab === 'sets' ? '🍽️ 내 메뉴판' : '📖 레시피관리'}
            </button>
          ))}
        </div>

        {/* 검색창 */}
        <div style={{ padding: '0 0 10px 0', flexShrink: 0 }}>
          <input
            type="text"
            placeholder={homeTab === 'sets' ? '상품 검색...' : '레시피 검색...'}
            value={homeTab === 'sets' ? setSearch : menuSearch}
            onChange={(e) => homeTab === 'sets' ? setSetSearch(e.target.value) : setMenuSearch(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px', fontSize: '16px', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(200,216,228,0.15)',
              borderRadius: 10, color: 'white', fontFamily: "'Noto Sans KR',sans-serif", outline: 'none'
            }}
          />
        </div>

        {homeTab === 'sets' ? (
          <>
            {/* 세트 탭: 카테고리 필터 + 정렬 (사용 중인 카테고리만 표시) */}
            <div style={{ display: 'flex', gap: 6, padding: '8px 0', overflowX: 'auto', flexShrink: 0, marginBottom: 14, scrollbarWidth: 'none' }}>
              {['전체', ...orderedCategories].map((cat) => (
                <button key={cat} onClick={() => setSetFilter(cat as any)}
                  style={{
                    padding: '6px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    background: setFilter === cat ? '#4A7FA5' : 'rgba(255,255,255,0.06)',
                    color: setFilter === cat ? 'white' : 'rgba(200,216,228,0.5)',
                    fontSize: '0.72rem', fontWeight: 700, fontFamily: "'Noto Sans KR',sans-serif", whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  {activeCategories.find(c => c.name === cat)?.emoji} {cat}
                </button>
              ))}
              <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', margin: '0 4px', flexShrink: 0 }} />
              {['newest', 'costRate'].map(s => (
                <button key={s} onClick={() => setSortBy(s as any)}
                  style={{
                    padding: '6px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    background: sortBy === s ? 'rgba(74,127,165,0.3)' : 'rgba(255,255,255,0.04)',
                    color: 'rgba(200,216,228,0.5)', fontSize: '0.72rem', fontWeight: 700,
                    fontFamily: "'Noto Sans KR',sans-serif", whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  {s === 'newest' ? '최신순' : '원가율↑'}
                </button>
              ))}
            </div>

            {/* 세트 목록 - 카테고리별 그룹화 */}
            {setsLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 8 }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{
                    background: 'linear-gradient(135deg, #162030, #1C2D40)',
                    border: '1px solid rgba(74,127,165,0.1)',
                    borderRadius: 16, padding: '16px 18px', height: 110,
                    opacity: 0.5 + i * 0.1,
                  }} />
                ))}
              </div>
            ) : filteredSets.length === 0 ? (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                style={{ textAlign: 'center', paddingTop: 80, color: 'rgba(200,216,228,0.3)' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🐟</div>
                <p style={{ fontSize: '0.95rem', marginBottom: 6 }}>아직 만든 메뉴 구성이 없어요</p>
                <p style={{ fontSize: '0.78rem', opacity: 0.6 }}>아래 버튼을 눌러 첫 메뉴 구성을 만들어봐요</p>
              </motion.div>
            ) : (
              <div>
                {orderedCategories.map((categoryName, catIdx) => (
                  <section key={categoryName} style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, paddingLeft: 4 }}>
                      <span style={{ fontSize: '1.2rem' }}>
                        {activeCategories.find(c => c.name === categoryName)?.emoji}
                      </span>
                      <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'rgba(200,216,228,0.8)' }}>
                        {categoryName}
                      </h3>
                      <span style={{ fontSize: '0.68rem', color: 'rgba(200,216,228,0.3)', fontWeight: 600 }}>
                        {groupedBySets[categoryName]?.length || 0}개
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <AnimatePresence>
                        {(groupedBySets[categoryName] || []).map((set, i) => {
                          const ri = rateInfo(set.costRate)
                          const isExpanded = expandedSetId === set.id
                          return (
                            <motion.div
                              key={set.id}
                              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.96 }}
                              transition={{ delay: (catIdx * 5 + i) * 0.04 }}
                              style={{
                                background: 'linear-gradient(135deg, #162030, #1C2D40)',
                                border: '1px solid rgba(74,127,165,0.18)',
                                borderRadius: 16, padding: '14px 16px',
                                cursor: 'pointer', position: 'relative',
                                transition: '0.2s',
                              }}
                            >
                              {/* 헤더: 채널뱃지 + 이름 + 원가율% + 펼치기 버튼 */}
                              <div
                                onClick={() => setExpandedSetId(isExpanded ? null : set.id)}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 }}>
                                  <span style={{
                                    fontSize: '0.6rem', padding: '2px 7px', borderRadius: 20, flexShrink: 0,
                                    background: set.channel === 'delivery' ? 'rgba(74,127,165,0.25)' : 'rgba(74,140,111,0.25)',
                                    color: set.channel === 'delivery' ? '#5B9EC9' : '#5AAD82',
                                    border: `1px solid ${set.channel === 'delivery' ? 'rgba(74,127,165,0.4)' : 'rgba(74,140,111,0.4)'}`,
                                    fontWeight: 700,
                                  }}>
                                    {set.channel === 'delivery' ? '🛵 배달' : '🏠 홀'}
                                  </span>
                                  <span style={{ fontSize: '0.95rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{set.name}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                                  <div style={{ textAlign: 'right' }}>
                                    {set.costRate > 0 ? (
                                      <>
                                        <div style={{ fontSize: '0.58rem', color: 'rgba(200,216,228,0.35)', marginBottom: 2 }}>원가율</div>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: ri.color, lineHeight: 1 }}>
                                          {Math.round(set.costRate)}%
                                        </div>
                                      </>
                                    ) : (
                                      <div style={{ fontSize: '0.65rem', color: 'rgba(200,216,228,0.25)' }}>미입력</div>
                                    )}
                                  </div>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, transform: isExpanded ? 'rotate(180deg)' : 'none', transition: '0.2s' }}>
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                  </svg>
                                </div>
                              </div>

                              {/* 펼친 상태: 상세 정보 */}
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                                    style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12, marginTop: 12, overflow: 'hidden' }}>
                                    {/* 메뉴 칩 */}
                                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
                                      {set.blocks.map(b => (
                                        <span key={b.id} style={{
                                          fontSize: '0.72rem',
                                          background: 'rgba(255,255,255,0.06)',
                                          border: '1px solid rgba(255,255,255,0.09)',
                                          borderRadius: 6, padding: '3px 7px',
                                          color: 'rgba(200,216,228,0.75)',
                                        }}>
                                          {b.emoji} {b.name}
                                        </span>
                                      ))}
                                    </div>

                                    {/* 판매가 · 총원가 · 순이익 */}
                                    <div style={{ display: 'flex', gap: 12, marginBottom: 14, fontSize: '0.8rem' }}>
                                      <div>
                                        <div style={{ fontSize: '0.58rem', color: 'rgba(200,216,228,0.35)', marginBottom: 2 }}>판매가</div>
                                        <div style={{ fontWeight: 600, color: 'rgba(200,216,228,0.6)' }}>
                                          {set.sale_price > 0 ? `${set.sale_price.toLocaleString()}원` : '—'}
                                        </div>
                                      </div>
                                      <div>
                                        <div style={{ fontSize: '0.58rem', color: 'rgba(200,216,228,0.35)', marginBottom: 2 }}>총원가</div>
                                        <div style={{ fontWeight: 700, color: 'rgba(200,216,228,0.7)' }}>
                                          {set.totalCost.toLocaleString()}원
                                        </div>
                                      </div>
                                      <div>
                                        <div style={{ fontSize: '0.58rem', color: 'rgba(200,216,228,0.35)', marginBottom: 2 }}>순이익</div>
                                        <div style={{ fontWeight: 700, color: set.sale_price > set.totalCost ? '#7EC8A0' : '#F08080' }}>
                                          {set.sale_price > 0 ? `${(set.sale_price - set.totalCost).toLocaleString()}원` : '—'}
                                        </div>
                                      </div>
                                    </div>

                                    {/* 고독이의 한마디 */}
                                    <div style={{ background: 'rgba(74,127,165,0.15)', borderRadius: 8, padding: '8px 10px', marginBottom: 12, borderLeft: `3px solid ${ri.color}` }}>
                                      <div style={{ fontSize: '0.72rem', color: ri.color, fontWeight: 600 }}>
                                        🐟 {ri.label}
                                      </div>
                                    </div>

                                    {/* 수정 버튼 */}
                                    <button onClick={e => { e.stopPropagation(); router.push(`/proto?id=${set.id}`) }}
                                      style={{
                                        width: '100%', padding: '8px 0', background: 'rgba(74,127,165,0.2)',
                                        border: '1px solid rgba(74,127,165,0.3)', borderRadius: 8,
                                        color: '#7DB8D8', fontSize: '0.78rem', fontWeight: 600,
                                        fontFamily: "'Noto Sans KR',sans-serif", cursor: 'pointer', marginBottom: 8,
                                      }}>
                                      ✏️ 수정하기
                                    </button>

                                    {/* 삭제 버튼 */}
                                    <button
                                      onClick={e => { e.stopPropagation(); setDeleteConfirmId(set.id) }}
                                      style={{
                                        width: '100%', padding: '8px 0', background: 'rgba(196,74,74,0.15)',
                                        border: '1px solid rgba(196,74,74,0.3)', borderRadius: 8,
                                        color: '#F08080', fontSize: '0.78rem', fontWeight: 600,
                                        fontFamily: "'Noto Sans KR',sans-serif", cursor: 'pointer',
                                      }}>
                                      🗑️ 삭제하기
                                    </button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          )
                        })}
                      </AnimatePresence>
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* 메뉴 탭: 카테고리 필터 */}
            <div style={{ display: 'flex', gap: 6, padding: '8px 0', overflowX: 'auto', flexShrink: 0, marginBottom: 14, scrollbarWidth: 'none' }}>
              {['all', 'main', 'side', 'banchan', 'drink', 'extra'].map(cat => (
                <button key={cat} onClick={() => setMenuCategory(cat)}
                  style={{
                    padding: '6px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    background: menuCategory === cat ? '#4A7FA5' : 'rgba(255,255,255,0.06)',
                    color: menuCategory === cat ? 'white' : 'rgba(200,216,228,0.5)',
                    fontSize: '0.72rem', fontWeight: 700, fontFamily: "'Noto Sans KR',sans-serif", whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  {cat === 'all' ? '전체' : cat === 'main' ? '메인' : cat === 'side' ? '사이드' : cat === 'banchan' ? '반찬' : cat === 'drink' ? '음료' : '기타'}
                </button>
              ))}
            </div>

            {/* 메뉴 목록: 카테고리별 섹션 */}
            {filteredMenus.length === 0 ? (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                style={{ textAlign: 'center', paddingTop: 80, color: 'rgba(200,216,228,0.3)' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🐟</div>
                <p style={{ fontSize: '0.95rem', marginBottom: 6 }}>검색 결과가 없어요</p>
                <p style={{ fontSize: '0.78rem', opacity: 0.6 }}>다른 검색어를 시도해봐요</p>
              </motion.div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {['main', 'side', 'banchan', 'drink', 'extra'].map(cat => {
                  const items = filteredMenus.filter(m => m.category === cat)
                  if (items.length === 0) return null
                  const catLabel = { main: '메인', side: '사이드', banchan: '반찬', drink: '음료', extra: '기타' }[cat] || cat
                  return (
                    <div key={cat}>
                      <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'rgba(200,216,228,0.5)', marginBottom: 10, margin: '0 0 10px 0' }}>
                        {catLabel}
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {items.map((menu, i) => (
                          <motion.div
                            key={menu.id}
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            onClick={() => router.push(`/calculator?menuId=${menu.id}&returnTo=/`)}
                            style={{
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: 12, padding: '12px 14px',
                              cursor: 'pointer', transition: '0.2s',
                            }}
                            whileHover={{ background: 'rgba(255,255,255,0.07)' }}
                            whileTap={{ scale: 0.96 }}
                          >
                            <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>{menu.emoji}</div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'white', marginBottom: 3 }}>{menu.name}</div>
                            {menu.cost > 0 && (
                              <div style={{ fontSize: '0.65rem', color: 'rgba(200,216,228,0.4)' }}>
                                원가 {menu.cost.toLocaleString()}원
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* ── 모바일: +상품 추가 버튼 (메뉴판 탭에서만) ── */}
      {homeTab === 'sets' && (
        <motion.div
          className="home-bottom-mobile"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 20,
            background: 'rgba(10,18,28,0.96)', backdropFilter: 'blur(16px)',
            borderTop: '1px solid rgba(74,127,165,0.12)',
            padding: '14px 20px',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)',
          }}
        >
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
              onClick={() => router.push('/proto')}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #3A6FA5, #2A5080)',
                border: 'none', borderRadius: 14, color: 'white', fontSize: '0.82rem',
                padding: '12px 18px', cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(58,111,165,0.35)',
                fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700,
              }}
            >＋ 상품 추가</motion.button>
          </div>
        </motion.div>
      )}

      {/* ── PC: FAB (floating, 메뉴판 탭에서만) ── */}
      {homeTab === 'sets' && (
        <motion.button
          className="home-bottom-pc"
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
        >＋ 상품 추가</motion.button>
      )}

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
      </>
        )
      })()}
    </div>
  )
}
