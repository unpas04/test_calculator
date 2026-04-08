'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { createClient } from '../lib/supabase'
import { INDUSTRY_SAMPLES, ALL_SAMPLE_MENUS, SAMPLE_SET_DEFINITIONS, SampleMenu } from '../lib/sampleData'
import ShareButton from '../components/ShareButton'
import Fridge from '../components/Fridge'
import DashboardSidebar from '../components/DashboardSidebar'

const FEES_KEY = 'godogi_fees'
const DEFAULT_FEES = { delivery_platform: 6.8, delivery_card: 1.5, hall_card: 1.5 }

type BlockCategory = 'main' | 'side' | 'banchan' | 'drink' | 'extra'

// 기본 카테고리 목록
const DEFAULT_PRODUCT_CATEGORIES = [
  '탕/찌개류', '볶음류', '구이류', '밥류', '면류', '반찬류', '음료', '디저트', '기타'
]

// 업종 목록
const INDUSTRY_LIST = [
  '한식', '카페/디저트', '중식', '술집/이자카야', '양식', '일식', '치킨/패스트푸드', '분식', '기타'
]

// 업종별 카테고리 매핑
const INDUSTRY_CATEGORIES: Record<string, string[]> = {
  '한식': ['볶음류', '찌개류'],
  '카페/디저트': ['음료류', '베이커리', '디저트'],
  '중식': ['마라류', '면류'],
  '술집/이자카야': ['안주류', '튀김/구이류'],
  '양식': ['파스타류', '피자류', '스테이크/고기류', '샐러드/사이드'],
  '일식': ['초밥/롤', '라멘/우동', '덮밥'],
  '치킨/패스트푸드': ['치킨류', '사이드'],
  '분식': ['핫 스낵', '쌀 요리', '국/스프'],
  '기타': ['파스타', '고기요리', '밥요리', '음료'],
}

// getAllCategoriesForIndustry 함수 제거 (사용하지 않음)

// 모든 카테고리 합치기 (직접 입력한 카테고리도 처리)
const getAllCategoriesForIndustry = (industry: string): string[] => {
  return INDUSTRY_CATEGORIES[industry] || []
}

interface DisplaySet {
  id: string
  name: string
  channel: 'delivery' | 'hall'
  sale_price: number
  totalCost: number
  costRate: number
  blocks: { id: string; menu_id: string; name: string; emoji: string; cost: number; category: BlockCategory; ingredients?: any[] }[]
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
      ingredients: item.menus?.ingredients || [],
    }))
  const baseCost = blocks.reduce((s: number, b: any) => s + b.cost, 0)
  const feeRate = dbSet.channel === 'delivery'
    ? (feeSettings.delivery_platform + feeSettings.delivery_card) / 100
    : feeSettings.hall_card / 100
  const totalCost = Math.round(baseCost * (1 + feeRate))
  const costRate = dbSet.sale_price > 0 ? (totalCost / dbSet.sale_price) * 100 : 0
  return { ...dbSet, blocks, totalCost, costRate, product_category: dbSet.category || '기타' }
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

// SetupModal: 매장명 입력 + 업종 선택
function SetupModal({ show, step, setStep, name, setName, industry, setIndustry, loading, onComplete }: {
  show: boolean
  step: number
  setStep: (n: number) => void
  name: string
  setName: (s: string) => void
  industry: string
  setIndustry: (s: string) => void
  loading: boolean
  onComplete: () => void
}) {
  const INDUSTRIES = ['한식', '카페/디저트', '중식', '술집/이자카야', '양식', '일식', '치킨/패스트푸드', '분식', '기타']
  const INDUSTRY_EMOJIS: Record<string, string> = {
    '한식': '🍲',
    '카페/디저트': '☕',
    '중식': '🥡',
    '술집/이자카야': '🍺',
    '양식': '🍝',
    '일식': '🍣',
    '치킨/패스트푸드': '🍗',
    '분식': '🌶️',
    '기타': '🍽️',
  }

  if (!show) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 300,
      fontFamily: "'Noto Sans KR', sans-serif",
    }}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
        style={{
          background: '#1A2840',
          borderRadius: 24,
          padding: '36px 28px',
          width: '100%',
          maxWidth: 380,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Step indicators */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 32 }}>
          {[0, 1].map(i => (
            <div key={i} style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: step === i ? '#4A7FA5' : 'rgba(255,255,255,0.2)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        {step === 0 ? (
          // Step 0: 매장명 입력
          <>
            <h2 style={{ color: 'white', fontSize: '1.3rem', fontWeight: 600, marginBottom: 8, textAlign: 'center' }}>
              매장명을 알려주세요 🏪
            </h2>
            <p style={{ color: 'rgba(200,216,228,0.6)', fontSize: '0.9rem', textAlign: 'center', marginBottom: 24 }}>
              원가 리포트에 표시돼요
            </p>
            <input
              type="text"
              placeholder="예: 고독이 식당"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && name.trim() && setStep(1)}
              autoFocus
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.06)',
                border: name.trim() ? '1.5px solid #4A7FA5' : '1.5px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                padding: '14px 16px',
                color: 'white',
                fontSize: '0.95rem',
                fontFamily: "'Noto Sans KR', sans-serif",
                outline: 'none',
                marginBottom: 24,
                transition: 'border-color 0.2s',
              }}
            />
            <button
              onClick={() => name.trim() && setStep(1)}
              disabled={!name.trim()}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 12,
                border: 'none',
                background: name.trim() ? 'linear-gradient(135deg, #4A7FA5 0%, #5A9BC0 100%)' : 'rgba(74,127,165,0.4)',
                color: 'white',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: name.trim() ? 'pointer' : 'not-allowed',
                opacity: name.trim() ? 1 : 0.5,
                transition: 'all 0.2s',
              }}
            >
              다음 →
            </button>
          </>
        ) : (
          // Step 1: 업종 선택
          <>
            <h2 style={{ color: 'white', fontSize: '1.3rem', fontWeight: 600, marginBottom: 8, textAlign: 'center' }}>
              업종을 선택해주세요
            </h2>
            <p style={{ color: 'rgba(200,216,228,0.6)', fontSize: '0.9rem', textAlign: 'center', marginBottom: 24 }}>
              업종에 맞는 샘플 메뉴를 넣어드려요
            </p>
            {!loading ? (
              <>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  marginBottom: 24,
                }}>
                  {INDUSTRIES.map(ind => (
                    <button
                      key={ind}
                      onClick={() => setIndustry(ind)}
                      style={{
                        padding: '12px',
                        borderRadius: 10,
                        border: '1.5px solid',
                        borderColor: industry === ind ? '#4A7FA5' : 'rgba(255,255,255,0.1)',
                        background: industry === ind ? 'rgba(74,127,165,0.25)' : 'rgba(255,255,255,0.06)',
                        color: industry === ind ? 'white' : 'rgba(200,216,228,0.8)',
                        fontSize: '0.9rem',
                        fontWeight: industry === ind ? 600 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontFamily: "'Noto Sans KR', sans-serif",
                      }}
                    >
                      {ind} {INDUSTRY_EMOJIS[ind]}
                    </button>
                  ))}
                </div>
                <button
                  onClick={onComplete}
                  disabled={!industry}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: 12,
                    border: 'none',
                    background: industry ? 'linear-gradient(135deg, #4A7FA5 0%, #5A9BC0 100%)' : 'rgba(74,127,165,0.4)',
                    color: 'white',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: industry ? 'pointer' : 'not-allowed',
                    opacity: industry ? 1 : 0.5,
                    transition: 'all 0.2s',
                  }}
                >
                  완료 🐟
                </button>
              </>
            ) : (
              <div style={{
                textAlign: 'center',
                color: 'rgba(200,216,228,0.8)',
                padding: '40px 0',
              }}>
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{ fontSize: '2rem', marginBottom: 16 }}
                >
                  🐟
                </motion.div>
                <p style={{ fontSize: '0.95rem', lineHeight: 1.6 }}>
                  업종에 맞는<br/>샘플 메뉴를 준비하는 중...
                </p>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  )
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

// user_id별로 캐시 분리
const getSetsCacheKey = (userId: string) => `godogi_sets_cache_${userId}`

export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showFridge, setShowFridge] = useState(false)
  const [setsLoading, setSetsLoading] = useState(false)
  const [isGuest, setIsGuest] = useState(false)
  const [sets, setSets] = useState<DisplaySet[]>([])
  const [menuStats, setMenuStats] = useState<{ total: number; avgRate: number | null; warnCount: number } | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState(0)

  // Setup modal 상태
  const [showSetup, setShowSetup] = useState(false)
  const [setupStep, setSetupStep] = useState(0)
  const [setupName, setSetupName] = useState('')
  const [setupIndustry, setSetupIndustry] = useState('')
  const [setupLoading, setSetupLoading] = useState(false)

  // 사이드바 상태
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [receiptResult, setReceiptResult] = useState<any>(null)
  const [receiptOcrLoading, setReceiptOcrLoading] = useState(false)
  const [receiptSelected, setReceiptSelected] = useState<Set<number>>(new Set())
  const [receipSupplierToBeSaved, setReceiptSupplierToBeSaved] = useState<any>(null)

  // 홈화면 탭 UI 상태
  const [homeTab, setHomeTab] = useState<'sets' | 'menus' | 'recipes'>('sets')
  const [showRecipes, setShowRecipes] = useState(false)
  const [setSearch, setSetSearch] = useState('')
  const [setFilter, setSetFilter] = useState<string>('전체')
  const [sortBy, setSortBy] = useState<'newest' | 'costRate'>('newest')
  const [channelFilter, setChannelFilter] = useState<'all' | 'hall' | 'delivery'>('all')
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
  const [selectedSetModal, setSelectedSetModal] = useState<DisplaySet | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  useEffect(() => {
    if (searchParams.get('tab') === 'menus') setHomeTab('menus')
  }, [searchParams])
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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        sessionStorage.removeItem('godogi_guest')
        setIsGuest(false)

        // 매장 정보 Supabase에서 로드
        const { data: shopData } = await supabase
          .from('shop_profiles')
          .select('shop_name, industry, target_rate')
          .eq('user_id', u.id)
          .single()

        if (shopData) {
          const shop: ShopInfo = {
            name: shopData.shop_name,
            industry: shopData.industry,
            targetRate: shopData.target_rate
          }
          setShopInfo(shop)
          setShopDraft(shop)
        }
      } else {
        const guest = typeof window !== 'undefined' && !!sessionStorage.getItem('godogi_guest')
        setIsGuest(guest)
      }
      setLoading(false) // auth 확인 즉시 로딩 해제
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
    ALL_SAMPLE_MENUS.forEach(m => { menuMap[m.name] = m })
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

    // 신규 사용자 감지: shopInfo.name이 없고 godogi_onboarded가 없으면 SetupModal 표시
    const savedShop = localStorage.getItem('godogi_shop_info')
    let hasShopName = false
    try {
      hasShopName = savedShop ? !!JSON.parse(savedShop).name : false
    } catch {
      hasShopName = false
    }
    const isAlreadyOnboarded = !!localStorage.getItem('godogi_onboarded')

    if (!hasShopName && !isAlreadyOnboarded) {
      setShowSetup(true)
      // loadSets()를 지연 - handleSetupComplete에서 호출
    } else {
      loadSets()
      if (!isAlreadyOnboarded) setShowOnboarding(true)
    }
  }, [user])

  // 세트 로드 후 메뉴 목록 추출
  useEffect(() => {
    const menuMap = new Map<string, any>()
    for (const set of sets) {
      for (const block of set.blocks) {
        if (!menuMap.has(block.menu_id)) {
          // 재료명 배열로 변환
          const ingredientNames = block.ingredients && Array.isArray(block.ingredients)
            ? block.ingredients.map((ing: any) => typeof ing === 'string' ? ing : ing.name).filter(Boolean)
            : []
          menuMap.set(block.menu_id, {
            id: block.menu_id,
            name: block.name,
            emoji: block.emoji,
            category: block.category,
            cost: block.cost,
            ingredients: ingredientNames,
          })
        }
      }
    }
    setAllMenus(Array.from(menuMap.values()).sort((a, b) => a.name.localeCompare(b.name)))
  }, [sets])

  const saveShopInfo = async (info: ShopInfo) => {
    setShopInfo(info)

    // Supabase에 저장
    if (user) {
      const { error } = await supabase
        .from('shop_profiles')
        .upsert({
          user_id: user.id,
          shop_name: info.name,
          industry: info.industry,
          target_rate: info.targetRate
        }, { onConflict: 'user_id' })

      if (error) {
        console.error('Shop info save error:', error)
        alert('매장 정보 저장 실패')
      }
    }
  }

  // 로그아웃
  const logout = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('godogi_sets_cache')
    localStorage.removeItem('godogi_backfill_done')
    // SHOP_INFO_KEY는 삭제하지 않음 - 로그인 후에도 매장 정보 유지
    localStorage.removeItem('godogi_onboarded')
    setUser(null)
    setSets([])
    setMenuStats(null)
    // setShopInfo는 업데이트하지 않음 - localStorage의 정보 유지
  }

  // 영수증 OCR 결과 처리
  const handleReceiptResult = async (data: any) => {
    setReceiptOcrLoading(false)
    setReceiptResult(data)
    setReceiptSelected(new Set())
    setReceiptSupplierToBeSaved(data.supplier)
  }

  // 영수증 재료 냉장고에 추가
  const handleReceiptAddToFridge = async () => {
    if (!user || receiptSelected.size === 0) return

    try {
      const toAdd = Array.from(receiptSelected).map(idx => receiptResult.items[idx])
      await supabase.from('fridge').insert(toAdd.map(item => ({
        user_id: user.id, name: item.name, price: item.price,
        per: item.per, unit: item.unit, yield_: 100, category: '기타',
      })))

      // 거래처가 있고 새로운 것이면 저장
      if (receipSupplierToBeSaved && !receiptResult.savedSupplier) {
        const { biz_no, ...supplierData } = receipSupplierToBeSaved
        await supabase.from('suppliers').insert({
          user_id: user.id,
          biz_no,
          ...supplierData,
        })
      }

      // 성공 메시지 및 모달 닫기
      alert(`${toAdd.length}개 재료가 냉장고에 추가되었습니다!`)
      setReceiptResult(null)
    } catch (err) {
      alert('저장 실패: ' + (err instanceof Error ? err.message : '알 수 없는 오류'))
    }
  }

  // Setup modal 완료 핸들러
  const handleSetupComplete = async () => {
    if (!setupName.trim() || !setupIndustry) return
    setSetupLoading(true)

    // 1. 매장 정보 저장 (Supabase)
    const newShopInfo: ShopInfo = { name: setupName.trim(), industry: setupIndustry, targetRate: 35 }
    await saveShopInfo(newShopInfo)

    // 2. 업종별 샘플 데이터 삽입
    if (user) {
      await insertSampleData(user.id, setupIndustry)
    }

    // 3. 온보딩 완료 표시
    localStorage.setItem('godogi_onboarded', '1')

    setSetupLoading(false)
    setShowSetup(false)

    // 4. 대시보드 데이터 로드
    if (user) {
      loadSets(setupIndustry)
    }
  }

  const loadSets = async (industry?: string) => {
    const feeSettings = JSON.parse(localStorage.getItem(FEES_KEY) || JSON.stringify(DEFAULT_FEES))

    // 캐시 있으면 즉시 표시 (user_id별 캐시)
    if (user) {
      const cacheKey = getSetsCacheKey(user.id)
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        try {
          const { sets: cachedSets, stats } = JSON.parse(cached)
          setSets(cachedSets)
          setMenuStats(stats)
        } catch {}
      } else {
        setSetsLoading(true)
      }
    } else {
      setSetsLoading(true)
    }

    // 쿼리 1번으로 통합: 결과가 없으면 첫 로그인으로 처리
    const { data, error } = await supabase
      .from('sets')
      .select(`
        id, name, sale_price, channel, category, created_at,
        set_items(
          id, sort_order, menu_id,
          menus(id, name, category, emoji, labor, overhead, batch_yield, serving_size,
            ingredients(id, name, price, qty, unit, yield_, use_amount)
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) { console.error(error); setSetsLoading(false); return }

    if (!data || data.length === 0) {
      await insertSampleData(user.id, industry)
      // 삽입 후 재로드
      const { data: data2 } = await supabase
        .from('sets')
        .select(`id, name, sale_price, channel, category, created_at, set_items(id, sort_order, menu_id, menus(id, name, category, emoji, labor, overhead, batch_yield, serving_size, ingredients(id, price, qty, unit, yield_, use_amount)))`)
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
      // 캐시 저장 (user_id별)
      const cacheKey = getSetsCacheKey(user.id)
      localStorage.setItem(cacheKey, JSON.stringify({ sets: computed, stats }))
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
      const sample = ALL_SAMPLE_MENUS.find(s => s.name === m.name)
      if (sample?.ingredients?.length) {
        sample.ingredients.forEach(ing => ingredientInserts.push({ menu_id: m.id, ...ing }))
      }
    }
    if (ingredientInserts.length > 0) {
      await supabase.from('ingredients').insert(ingredientInserts)
    }
  }

  const insertSampleData = async (userId: string, industry?: string) => {
    // 게스트가 수정한 메뉴가 있으면 그걸 우선 사용
    const savedGuestRaw = localStorage.getItem('godogi_guest_menus')
    const guestMenus: any[] | null = savedGuestRaw ? JSON.parse(savedGuestRaw) : null
    const fallbackKey = industry && INDUSTRY_SAMPLES[industry] ? industry : '한식'
    const { menus: industryMenus, sets: industrySets } = INDUSTRY_SAMPLES[fallbackKey] ?? INDUSTRY_SAMPLES['한식']
    const menusSource = guestMenus || industryMenus

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
    for (const def of industrySets) {
      const menuIds = def.menuNames.map(n => menuByName[n]).filter(Boolean)
      if (menuIds.length === 0) continue
      const { data: newSet } = await supabase.from('sets').insert({
        user_id: userId, name: def.name, channel: def.channel, sale_price: def.sale_price, category: def.category,
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

  const handleDelete = async (id: string, e: React.MouseEvent | null = null) => {
    if (e) e.stopPropagation()

    // 메뉴 삭제 vs 세트 삭제 판단
    const isMenu = allMenus.some(m => m.id === id)

    if (isMenu) {
      // 메뉴 삭제
      await supabase.from('menus').delete().eq('id', id)
      const next = allMenus.filter(m => m.id !== id)
      setAllMenus(next)
    } else {
      // 세트 삭제
      await supabase.from('sets').delete().eq('id', id)
      const next = sets.filter(s => s.id !== id)
      setSets(next)
      const rates = next.filter(s => s.costRate > 0).map(s => s.costRate)
      const avgRate = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : null
      setMenuStats(next.length > 0 ? { total: next.length, avgRate, warnCount: rates.filter(r => r > 60).length } : null)
    }
  }

  if (loading) return (
    <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0F1923' }}>
      <p style={{ fontFamily: "'Noto Sans KR',sans-serif", color: '#4A7FA5' }}>🐟 고독이가 헤엄치는 중...</p>
      <SetupModal
        show={showSetup}
        step={setupStep}
        setStep={setSetupStep}
        name={setupName}
        setName={setSetupName}
        industry={setupIndustry}
        setIndustry={setSetupIndustry}
        loading={setupLoading}
        onComplete={handleSetupComplete}
      />
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
    <div style={{ minHeight: '100vh', background: '#0F1923', color: 'white', fontFamily: "'Noto Sans KR', sans-serif", display: 'flex' }}>
      {/* 사이드바 */}
      {user && (
        <DashboardSidebar
          user={user}
          onLogout={logout}
          onReceiptUpload={handleReceiptResult}
          receiptLoading={receiptOcrLoading}
          isOpen={sidebarOpen}
          onOpenChange={setSidebarOpen}
          onNavigateMenu={(target) => {
            setHomeTab(target)
            setSidebarOpen(false)
            // 메뉴판관리('sets')로 갈 때만 스크롤 (대시보드 제외)
            if (target === 'menus') {
              setTimeout(() => {
                const tabBar = document.querySelector('[data-tab-bar="true"]')
                if (tabBar) {
                  tabBar.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              }, 50)
            }
          }}
          onShowRecipes={setShowRecipes}
        />
      )}

      {/* 메인 콘텐츠 */}
      <main style={{ flex: 1, marginLeft: user ? 240 : 0, transition: 'margin-left 0.25s' }} className="dashboard-main">
      <SetupModal
        show={showSetup}
        step={setupStep}
        setStep={setSetupStep}
        name={setupName}
        setName={setSetupName}
        industry={setupIndustry}
        setIndustry={setSetupIndustry}
        loading={setupLoading}
        onComplete={handleSetupComplete}
      />

      {/* 영수증 OCR 결과 모달 */}
      {receiptResult && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 300, padding: 16,
        }}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              background: '#1A2840', borderRadius: 24, padding: '28px 24px',
              width: '100%', maxWidth: 420, fontFamily: "'Noto Sans KR', sans-serif",
              maxHeight: '80vh', overflowY: 'auto',
            }}
          >
            <div style={{ fontSize: '1.4rem', marginBottom: 16, textAlign: 'center' }}>📸 인식된 재료</div>

            {/* 재료 목록 */}
            {receiptResult.items && receiptResult.items.length > 0 ? (
              <div style={{ marginBottom: 20 }}>
                {receiptResult.items.map((item: any, idx: number) => (
                  <label key={idx} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px', marginBottom: 8, borderRadius: 10,
                    background: 'rgba(74,127,165,0.1)', cursor: 'pointer',
                  }}>
                    <input
                      type="checkbox"
                      checked={receiptSelected.has(idx)}
                      onChange={e => {
                        const newSet = new Set(receiptSelected)
                        if (e.target.checked) newSet.add(idx)
                        else newSet.delete(idx)
                        setReceiptSelected(newSet)
                      }}
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: 'white', fontSize: '0.9rem', fontWeight: 500 }}>{item.name}</div>
                      <div style={{ color: 'rgba(200,216,228,0.5)', fontSize: '0.8rem' }}>
                        {item.price.toLocaleString()}원 / {item.per}{item.unit}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div style={{ color: 'rgba(200,216,228,0.5)', textAlign: 'center', padding: '20px 0' }}>
                인식된 재료가 없어요
              </div>
            )}

            {/* 거래처 정보 */}
            {receipSupplierToBeSaved && (
              <div style={{
                background: 'rgba(74,127,165,0.15)', borderRadius: 12, padding: 16,
                marginBottom: 20, border: '1px solid rgba(74,127,165,0.3)',
              }}>
                <div style={{ fontSize: '0.9rem', color: 'rgba(200,216,228,0.7)', marginBottom: 8 }}>🏪 거래처</div>
                <div style={{ color: 'white', fontWeight: 600, fontSize: '0.95rem', marginBottom: 4 }}>
                  {receipSupplierToBeSaved.name}
                </div>
                {receipSupplierToBeSaved.phone && (
                  <div style={{ color: 'rgba(200,216,228,0.6)', fontSize: '0.85rem' }}>
                    {receipSupplierToBeSaved.phone}
                  </div>
                )}
              </div>
            )}

            {/* 버튼 */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setReceiptResult(null)}
                style={{
                  flex: 1, padding: '12px', borderRadius: 10,
                  background: 'transparent', border: '1px solid rgba(200,216,228,0.2)',
                  color: 'rgba(200,216,228,0.6)', fontSize: '0.9rem', fontFamily: "'Noto Sans KR', sans-serif",
                  fontWeight: 600, cursor: 'pointer',
                }}
              >
                닫기
              </button>
              <button
                onClick={handleReceiptAddToFridge}
                disabled={receiptSelected.size === 0}
                style={{
                  flex: 1, padding: '12px', borderRadius: 10,
                  background: receiptSelected.size > 0 ? 'linear-gradient(135deg, #4A7FA5 0%, #5A9BC0 100%)' : 'rgba(74,127,165,0.3)',
                  border: 'none', color: 'white', fontSize: '0.9rem', fontFamily: "'Noto Sans KR', sans-serif",
                  fontWeight: 600, cursor: receiptSelected.size > 0 ? 'pointer' : 'not-allowed',
                  opacity: receiptSelected.size > 0 ? 1 : 0.5,
                }}
              >
                🧊 냉장고에 추가 ({receiptSelected.size})
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 헤더 (고정) */}
      <header style={{ position: 'sticky', top: 0, zIndex: 10, padding: '16px 12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: '#0F1923' }}>
        {/* 왼쪽: 햄버거 버튼 (모바일 사이드바) */}
        <button className="dashboard-sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            display: 'block', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '1.2rem', color: 'white', padding: '8px', marginLeft: '-8px',
            flexShrink: 0,
          }}>☰</button>

        {/* 중앙: 로고 + 타이틀 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
          <motion.div style={{ flexShrink: 0 }}
            animate={{ rotate: [0, -8, 8, -4, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 5 }}
          >
            <svg width="32" height="32" viewBox="0 0 100 100" fill="none">
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

        {/* 오른쪽: 로그인 + 공유 */}
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
      </header>
      <style>{`
        @media (max-width: 480px) {
          .home-subtitle { display: none !important; }
        }
        /* 모바일: 통합 바 표시, PC floating 숨김 */
        .home-bottom-mobile { display: flex !important; }
        .home-bottom-pc { display: none !important; }
        .home-main { padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 100px) !important; max-width: 100% !important; }
        @media (min-width: 641px) {
          .home-bottom-mobile { display: none !important; }
          .home-bottom-pc { display: block !important; }
          .home-main { padding-bottom: 220px !important; max-width: 680px !important; }
        }

        /* 대시보드 사이드바 반응형 */
        @media (max-width: 768px) {
          .dashboard-sidebar-toggle { display: block !important; }
          .dashboard-sidebar-overlay { display: block !important; }
          .dashboard-sidebar-close { display: block !important; }
          .dashboard-sidebar { transform: translateX(-100%); }
          .dashboard-sidebar-open { transform: translateX(0) !important; }
          .dashboard-main { margin-left: 0 !important; }
        }
        @media (min-width: 769px) {
          .dashboard-sidebar-toggle { display: none !important; }
        }

        /* TOP 5 카드 반응형 */
        @media (max-width: 768px) {
          .top5-cards {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            width: 100% !important;
          }
        }
      `}</style>

      {/* 필터링 로직 */}
      {(() => {
        // 업종 기반 카테고리 동적 선택
        const activeCategories = shopInfo.industry && INDUSTRY_CATEGORIES[shopInfo.industry]
          ? INDUSTRY_CATEGORIES[shopInfo.industry]
          : DEFAULT_PRODUCT_CATEGORIES

        // 카테고리 필터: 'all' 선택 시 전체, 아니면 setFilter 카테고리명 매칭
        // product_category는 이미 computeSetDisplay에서 설정됨 (dbSet.category)
        const setsWithCategory = sets

        const filteredSets = setsWithCategory
          .filter(s => setFilter === '전체' || s.product_category === setFilter)
          .filter(s => channelFilter === 'all' || s.channel === channelFilter)
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

        // 카테고리 순서대로 정렬 (activeCategories만 사용)
        const orderedCategories = activeCategories.filter(c => groupedBySets[c])

        const filteredMenus = allMenus
          .filter(m => menuCategory === 'all' || m.category === menuCategory)
          .filter(m => m.name.toLowerCase().includes(menuSearch.toLowerCase()))

        // TOP 5 수익성 좋은 상품 (costRate 낮은 순)
        const top5Sets = [...filteredSets].sort((a, b) => a.costRate - b.costRate).slice(0, 5)

        // 원가율 높은 상품 (60% 이상, 경고)
        const highCostSets = filteredSets.filter(s => s.costRate >= 60).sort((a, b) => b.costRate - a.costRate)

        return (
      <>
      <main className="home-main" style={{ maxWidth: 680, margin: '0 auto', padding: '0 12px 100px', display: 'flex', flexDirection: 'column' }}>
        {/* 대시보드 통계 - 메뉴판 보기에서만 표시 */}
        {!showRecipes && (
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
                            {shopInfo.industry}
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
                    ⚙️
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
                      <button key={ind}
                        onClick={() => setShopDraft(d => ({ ...d, industry: ind }))}
                        style={{
                          padding: '5px 10px', borderRadius: 16, border: 'none', cursor: 'pointer',
                          background: shopDraft.industry === ind ? '#4A7FA5' : 'rgba(255,255,255,0.07)',
                          color: shopDraft.industry === ind ? 'white' : 'rgba(200,216,228,0.5)',
                          fontSize: '0.72rem', fontWeight: 700, fontFamily: "'Noto Sans KR',sans-serif",
                        }}>
                        {ind}
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
                      💡 {shopDraft.industry}로 전환: {INDUSTRY_CATEGORIES[shopDraft.industry]?.join(' · ')}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setEditingShop(false)}
                      style={{ flex: 1, padding: '8px', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, color: 'rgba(200,216,228,0.5)', cursor: 'pointer', fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700 }}>
                      취소
                    </button>
                    <button onClick={async () => { await saveShopInfo(shopDraft); setEditingShop(false) }}
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
              {/* 메뉴 개수 */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(74,127,165,0.15), rgba(91,158,201,0.1))',
                border: '1px solid rgba(74,127,165,0.2)',
                borderRadius: 12, padding: '14px 12px', textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.6rem', color: 'rgba(200,216,228,0.4)', marginBottom: 4, fontWeight: 600 }}>📋 메뉴</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#4A7FA5' }}>{filteredSets.length}개</div>
              </div>
              {/* 평균 원가율 */}
              <div style={{
                background: menuStats?.avgRate != null && menuStats.avgRate > 60
                  ? 'linear-gradient(135deg, rgba(240,128,128,0.12), rgba(196,74,74,0.08))'
                  : 'linear-gradient(135deg, rgba(126,200,160,0.12), rgba(100,180,130,0.08))',
                border: `1px solid ${menuStats?.avgRate != null && menuStats.avgRate > 60 ? 'rgba(240,128,128,0.25)' : 'rgba(126,200,160,0.25)'}`,
                borderRadius: 12, padding: '14px 12px', textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.6rem', color: 'rgba(200,216,228,0.4)', marginBottom: 4, fontWeight: 600 }}>📊 평균원가율</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: menuStats?.avgRate != null && menuStats.avgRate > 60 ? '#F08080' : '#7EC8A0' }}>
                  {menuStats?.avgRate != null ? `${Math.round(menuStats.avgRate)}%` : '—'}
                </div>
              </div>
              {/* 주의 상품 */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(240,128,128,0.1), rgba(196,74,74,0.06))',
                border: '1px solid rgba(240,128,128,0.2)',
                borderRadius: 12, padding: '14px 12px', textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.6rem', color: 'rgba(200,216,228,0.4)', marginBottom: 4, fontWeight: 600 }}>⚠️ 주의</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: menuStats?.warnCount ? '#F08080' : 'rgba(200,216,228,0.3)' }}>
                  {menuStats?.warnCount ?? 0}개
                </div>
              </div>
            </motion.div>

            {/* TOP 5 수익성 좋은 상품 + 원가율 높은 상품 (반응형) */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ width: 'calc(100% + 24px)', marginLeft: '-12px', marginRight: '-12px', paddingLeft: '12px', paddingRight: '12px', marginTop: 12 }}>
              {/* 제목들: 카드 위 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'white' }}>
                  TOP 5 수익성 좋은 상품
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'white' }}>
                  원가율 높은 상품
                </div>
              </div>

              {/* 카드들 */}
              <div className="top5-cards" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14, alignItems: 'start', width: '100%', minWidth: 0 }}>

                {/* 왼쪽: TOP 5 수익성 좋은 상품 */}
                <div style={{ background: 'rgba(126,200,160,0.08)', border: '1px solid rgba(126,200,160,0.2)', borderRadius: 12, padding: '10px 8px', height: 185, display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0 }}>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(200,216,228,0.65)', flex: 1, overflowY: 'auto', paddingRight: 4 }}>
                    {top5Sets.length > 0 ? (
                      top5Sets.map((s, i) => {
                        const medals = ['🥇', '🥈', '🥉']
                        return (
                          <div
                            key={s.id}
                            onClick={() => setSelectedSetModal(s)}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              paddingBottom: 8,
                              marginBottom: 8,
                              borderBottom: i < top5Sets.length - 1 ? '1px solid rgba(126,200,160,0.15)' : 'none',
                              cursor: 'pointer',
                              transition: 'opacity 0.2s',
                            }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '0.7' }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '1' }}
                          >
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ flexShrink: 0 }}>{medals[i] || `${i + 1}`}</span>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{s.name}</span>
                            </span>
                            <span style={{ color: '#7EC8A0', fontWeight: 700, flexShrink: 0, marginLeft: 6 }}>{Math.round(s.costRate)}%</span>
                          </div>
                        )
                      })
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 80, color: 'rgba(200,216,228,0.4)', fontSize: '0.8rem' }}>
                        상품이 없어요
                      </div>
                    )}
                  </div>
                </div>

                {/* 오른쪽: 원가율 높은 상품 */}
                <div style={{ background: 'rgba(240,128,128,0.08)', border: '1px solid rgba(240,128,128,0.2)', borderRadius: 12, padding: '10px 8px', height: 185, display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0 }}>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(200,216,228,0.65)', flex: 1, overflowY: 'auto', paddingRight: 4 }}>
                    {highCostSets.length > 0 ? (
                      highCostSets.slice(0, 5).map((s, i) => (
                        <div
                          key={s.id}
                          onClick={() => setSelectedSetModal(s)}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingBottom: 8,
                            marginBottom: 8,
                            borderBottom: i < 4 ? '1px solid rgba(240,128,128,0.15)' : 'none',
                            cursor: 'pointer',
                            transition: 'opacity 0.2s',
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '0.7' }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '1' }}
                        >
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ flexShrink: 0 }}>⚠️</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{s.name}</span>
                          </span>
                          <span style={{ color: '#F08080', fontWeight: 700, flexShrink: 0, marginLeft: 6 }}>{Math.round(s.costRate)}%</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 80, color: 'rgba(200,216,228,0.4)', fontSize: '0.8rem' }}>
                        상품이 없어요
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}

        {/* 타이틀 + 레시피관리 버튼 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, marginTop: 16, flexShrink: 0 }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'white', margin: 0 }}>내 메뉴판</h2>
          <button
            onClick={() => setShowRecipes(!showRecipes)}
            style={{
              padding: '6px 12px', background: showRecipes ? '#4A7FA5' : 'rgba(255,255,255,0.06)',
              border: 'none', borderRadius: 6, color: showRecipes ? 'white' : 'rgba(200,216,228,0.6)',
              fontSize: '0.75rem', fontWeight: 600, fontFamily: "'Noto Sans KR',sans-serif",
              cursor: 'pointer', transition: '0.2s',
            }}
          >
            {showRecipes ? '메뉴판 보기' : '레시피관리'}
          </button>
        </div>

        {/* 검색창 + 홀/배달 토글 (메뉴판 보기) */}
        {!showRecipes && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 12, alignItems: 'center', flexShrink: 0, minWidth: 0 }}>
            <input
              type="text"
              placeholder="상품 검색..."
              value={setSearch}
              onChange={(e) => setSetSearch(e.target.value)}
              style={{
                flex: 1, padding: '6px 8px', fontSize: '13px', boxSizing: 'border-box', minWidth: 0,
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(200,216,228,0.15)',
                borderRadius: 8, color: 'white', fontFamily: "'Noto Sans KR',sans-serif", outline: 'none'
              }}
            />
            <div style={{ display: 'flex', gap: 2, padding: '4px 5px', borderRadius: 7, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(200,216,228,0.15)', flexShrink: 0, alignItems: 'center' }}>
              {[
                { key: 'all', label: '전체' },
                { key: 'hall', label: '홀' },
                { key: 'delivery', label: '배달' }
              ].map(ch => (
                <motion.button key={ch.key} whileTap={{ scale: 0.95 }}
                  onClick={() => setChannelFilter(ch.key as any)}
                  style={{
                    padding: '2px 6px', borderRadius: 4, border: 'none', cursor: 'pointer',
                    background: channelFilter === ch.key ? '#4A7FA5' : 'transparent',
                    color: channelFilter === ch.key ? 'white' : 'rgba(200,216,228,0.6)',
                    fontSize: '0.6rem', fontWeight: 600, fontFamily: "'Noto Sans KR',sans-serif",
                    whiteSpace: 'nowrap', transition: 'all 0.2s',
                  }}
                >
                  {ch.label}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* 검색창 (레시피 보기) */}
        {showRecipes && (
          <div style={{ padding: '0 0 10px 0', flexShrink: 0 }}>
            <input
              type="text"
              placeholder="레시피 검색..."
              value={menuSearch}
              onChange={(e) => setMenuSearch(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', fontSize: '16px', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(200,216,228,0.15)',
                borderRadius: 10, color: 'white', fontFamily: "'Noto Sans KR',sans-serif", outline: 'none'
              }}
            />
          </div>
        )}

        {!showRecipes ? (
          <>

            {/* 카테고리 필터 (메뉴판) */}
            <div style={{ display: 'flex', gap: 4, overflowX: 'auto', marginBottom: 12, scrollbarWidth: 'none', msOverflowStyle: 'none', width: '100%' }}>
              {['전체', ...activeCategories].map((cat) => (
                  <button key={cat} onClick={() => setSetFilter(cat as any)}
                    style={{
                      padding: '8px 16px', borderRadius: 20, border: '1px solid rgba(74,127,165,0.3)', cursor: 'pointer',
                      background: setFilter === cat
                        ? 'linear-gradient(135deg, #4A7FA5, #3A6F95)'
                        : 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))',
                      color: setFilter === cat ? 'white' : 'rgba(200,216,228,0.65)',
                      fontSize: '0.68rem', fontWeight: 600, fontFamily: "'Noto Sans KR',sans-serif", whiteSpace: 'nowrap', flexShrink: 0,
                      transition: '0.2s',
                      boxShadow: setFilter === cat
                        ? '0 4px 16px rgba(74,127,165,0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
                        : '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
                    }}
                    onMouseEnter={(e) => {
                      if (setFilter !== cat) {
                        (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.08))'
                        ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(74,127,165,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
                        ;(e.currentTarget as HTMLButtonElement).style.color = 'white'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (setFilter !== cat) {
                        (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))'
                        ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)'
                        ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(200,216,228,0.65)'
                      }
                    }}
                  >
                    {cat}
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

                                    {/* 스택바 차트 */}
                                    {set.sale_price > 0 && (
                                      <div style={{ marginBottom: 12 }}>
                                        {(() => {
                                          const CATEGORY_COLORS: Record<string, string> = {
                                            main: '#4A7FA5',
                                            side: '#4A8C6F',
                                            banchan: '#C44A4A',
                                            drink: '#9B6B9B',
                                            extra: '#C8843A',
                                          }
                                          const CATEGORY_LABELS: Record<string, string> = {
                                            main: '메인',
                                            side: '사이드',
                                            banchan: '반찬',
                                            drink: '음료',
                                            extra: '기타',
                                          }
                                          const base = Math.max(set.sale_price, set.totalCost)
                                          const costSegments = (['main', 'side', 'banchan', 'drink', 'extra'] as const).map(cat => {
                                            const sum = set.blocks.filter((b: any) => b.category === cat).reduce((a, b) => a + b.cost, 0)
                                            return { cat, sum, pct: (sum / base) * 100 }
                                          }).filter(s => s.sum > 0)
                                          const profit = set.sale_price > set.totalCost ? set.sale_price - set.totalCost : 0

                                          return (
                                            <>
                                              <div style={{
                                                height: 16, borderRadius: 12, display: 'flex', overflow: 'hidden', background: 'rgba(255,255,255,0.05)',
                                              }}>
                                                {costSegments.map(({ cat, pct }) => (
                                                  <div key={cat} style={{
                                                    width: `${pct}%`, background: CATEGORY_COLORS[cat], height: '100%', minWidth: pct > 0.5 ? 3 : 0,
                                                  }} />
                                                ))}
                                                {profit > 0 && (
                                                  <div style={{
                                                    width: `${(profit / base) * 100}%`, background: 'rgba(126,200,160,0.7)', height: '100%',
                                                  }} />
                                                )}
                                              </div>
                                              <div style={{ display: 'flex', gap: 8, marginTop: 8, fontSize: '0.7rem', flexWrap: 'wrap' }}>
                                                {costSegments.map(({ cat, sum, pct }) => (
                                                  <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                                                    <div style={{ width: 6, height: 6, borderRadius: 1, background: CATEGORY_COLORS[cat] }} />
                                                    <span style={{ color: 'rgba(200,216,228,0.6)', whiteSpace: 'nowrap' }}>{CATEGORY_LABELS[cat]} {pct.toFixed(0)}%</span>
                                                  </div>
                                                ))}
                                                {profit > 0 && (
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                                                    <div style={{ width: 6, height: 6, borderRadius: 1, background: 'rgba(126,200,160,0.7)' }} />
                                                    <span style={{ color: 'rgba(126,200,160,0.7)', whiteSpace: 'nowrap' }}>이익 {((profit / set.sale_price) * 100).toFixed(0)}%</span>
                                                  </div>
                                                )}
                                              </div>
                                            </>
                                          )
                                        })()}
                                      </div>
                                    )}

                                    {/* 판매가 · 총원가 · 순이익 */}
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 20, marginBottom: 14, fontSize: '0.8rem' }}>
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
                                    {(() => {
                                      let comment = ''
                                      if (set.sale_price <= 0) {
                                        comment = '판매가를 입력하면 원가율을 알 수 있어요'
                                      } else if (set.costRate < 10) {
                                        comment = `원가율 ${set.costRate.toFixed(1)}%... 이건 미친 마진이에요!`
                                      } else if (set.costRate < 30) {
                                        comment = `원가율 ${set.costRate.toFixed(1)}%. 엄청 좋아요! 고독이도 박수치고 있어요`
                                      } else if (set.costRate < 50) {
                                        comment = `원가율 ${set.costRate.toFixed(1)}%. 잘 관리하고 있어요! 고독이도 흐뭇해요 🐟`
                                      } else if (set.costRate < 80) {
                                        comment = `원가율 ${set.costRate.toFixed(1)}%... 위험해요. 가격을 올리거나 원가를 줄여봐요`
                                      } else {
                                        comment = `원가율 ${set.costRate.toFixed(1)}%!! 거의 남는 게 없어요. 고독이가 걱정돼요`
                                      }
                                      return (
                                        <div style={{ background: 'rgba(74,127,165,0.15)', borderRadius: 8, padding: '8px 10px', marginBottom: 12, borderLeft: `3px solid ${ri.color}` }}>
                                          <div style={{ fontSize: '0.72rem', color: ri.color, fontWeight: 600 }}>
                                            🐟 {comment}
                                          </div>
                                        </div>
                                      )
                                    })()}

                                    {/* 수정/삭제 버튼 (한 줄) */}
                                    <div style={{ display: 'flex', gap: 8 }}>
                                      {/* 수정 버튼 */}
                                      <button onClick={e => { e.stopPropagation(); router.push(`/proto?id=${set.id}&source=menu`) }}
                                        style={{
                                          flex: 1, padding: '8px 0', background: 'rgba(74,127,165,0.2)',
                                          border: '1px solid rgba(74,127,165,0.3)', borderRadius: 8,
                                          color: '#7DB8D8', fontSize: '0.78rem', fontWeight: 600,
                                          fontFamily: "'Noto Sans KR',sans-serif", cursor: 'pointer',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                        }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                        </svg>
                                        수정하기
                                      </button>

                                      {/* 삭제 버튼 */}
                                      <button
                                        onClick={e => { e.stopPropagation(); setDeleteConfirmId(set.id) }}
                                        style={{
                                          flex: 1, padding: '8px 0', background: 'rgba(196,74,74,0.15)',
                                          border: '1px solid rgba(196,74,74,0.3)', borderRadius: 8,
                                          color: '#F08080', fontSize: '0.78rem', fontWeight: 600,
                                          fontFamily: "'Noto Sans KR',sans-serif", cursor: 'pointer',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                        }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <polyline points="3 6 5 6 21 6"/>
                                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                          <path d="M10 11v6M14 11v6"/>
                                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                                        </svg>
                                        삭제하기
                                      </button>
                                    </div>
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
            {/* 레시피 카테고리 필터 */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 14, scrollbarWidth: 'none', msOverflowStyle: 'none', width: '100%' }}>
              {['all', 'main', 'side', 'banchan', 'drink', 'dessert', 'extra'].map(cat => (
                <button key={cat} onClick={() => setMenuCategory(cat)}
                  style={{
                    padding: '6px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    background: menuCategory === cat ? '#4A7FA5' : 'rgba(255,255,255,0.06)',
                    color: menuCategory === cat ? 'white' : 'rgba(200,216,228,0.5)',
                    fontSize: '0.72rem', fontWeight: 700, fontFamily: "'Noto Sans KR',sans-serif", whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  {cat === 'all' ? '전체' : cat === 'main' ? '메인' : cat === 'side' ? '사이드' : cat === 'banchan' ? '반찬' : cat === 'drink' ? '음료' : cat === 'dessert' ? '디저트' : '기타'}
                </button>
              ))}
            </div>

            {/* 레시피 목록: 카테고리별 섹션 + 2열 그리드 */}
            {filteredMenus.length === 0 ? (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                style={{ textAlign: 'center', paddingTop: 80, color: 'rgba(200,216,228,0.3)' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🐟</div>
                <p style={{ fontSize: '0.95rem', marginBottom: 6 }}>레시피가 없어요</p>
                <p style={{ fontSize: '0.78rem', opacity: 0.6 }}>레시피 추가 버튼으로 첫 레시피를 만들어봐요</p>
              </motion.div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {['main', 'side', 'banchan', 'drink', 'dessert', 'extra'].map(cat => {
                  const items = filteredMenus.filter(m => m.category === cat)
                  if (items.length === 0) return null
                  const catLabel = { main: '메인', side: '사이드', banchan: '반찬', drink: '음료', dessert: '디저트', extra: '기타' }[cat] || cat
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
                            style={{
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: 12, padding: '12px 14px',
                              cursor: 'pointer', transition: '0.2s', position: 'relative',
                            }}
                            whileHover={{ background: 'rgba(255,255,255,0.07)' }}
                            whileTap={{ scale: 0.96 }}
                          >
                            {/* 삭제 버튼 (우상단 X) */}
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(menu.id) }}
                              style={{
                                position: 'absolute', top: 8, right: 8,
                                background: 'none', border: 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: 'rgba(200,216,228,0.15)', fontSize: '0.9rem',
                                transition: '0.2s', padding: 0, lineHeight: 1,
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(200,216,228,0.5)')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(200,216,228,0.15)')}
                            >
                              ✕
                            </button>

                            <div onClick={() => router.push(`/calculator?menuId=${menu.id}&returnTo=/?tab=menus`)}>
                              <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>{menu.emoji}</div>
                              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'white', marginBottom: 6 }}>{menu.name}</div>
                              {menu.ingredients && menu.ingredients.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                  {menu.ingredients.slice(0, 3).map((ing: string, idx: number) => (
                                    <span key={idx} style={{
                                      fontSize: '0.62rem', padding: '2px 7px',
                                      background: 'rgba(74,127,165,0.18)',
                                      border: '1px solid rgba(74,127,165,0.25)',
                                      borderRadius: 20, color: '#7DB8D8', fontWeight: 600,
                                      whiteSpace: 'nowrap',
                                    }}>{ing}</span>
                                  ))}
                                  {menu.ingredients.length > 3 && (
                                    <span style={{
                                      fontSize: '0.62rem', padding: '2px 7px',
                                      background: 'rgba(255,255,255,0.06)',
                                      border: '1px solid rgba(255,255,255,0.1)',
                                      borderRadius: 20, color: 'rgba(200,216,228,0.4)', fontWeight: 600,
                                    }}>+{menu.ingredients.length - 3}</span>
                                  )}
                                </div>
                              )}
                            </div>
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


      {/* ── FAB: 메뉴 추가 (메뉴판 보기) ── */}
      {!showRecipes && (
        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          onClick={() => router.push('/proto')}
          style={{
            position: 'fixed', bottom: 28, right: 24, zIndex: 20,
            background: 'linear-gradient(135deg, #3A6FA5, #2A5080)',
            border: 'none', borderRadius: 18, color: 'white', fontSize: '0.9rem',
            padding: '14px 22px', cursor: 'pointer',
            boxShadow: '0 8px 28px rgba(58,111,165,0.4)',
            fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700,
          }}
        >＋ 메뉴 추가</motion.button>
      )}

      {/* ── FAB: 레시피 추가 (레시피 보기) ── */}
      {showRecipes && (
        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          onClick={() => router.push('/calculator?new=1&returnTo=/')}
          style={{
            position: 'fixed', bottom: 28, right: 24, zIndex: 20,
            background: 'linear-gradient(135deg, #3A6FA5, #2A5080)',
            border: 'none', borderRadius: 18, color: 'white', fontSize: '0.9rem',
            padding: '14px 22px', cursor: 'pointer',
            boxShadow: '0 8px 28px rgba(58,111,165,0.4)',
            fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700,
          }}
        >＋ 레시피 추가</motion.button>
      )}

      {/* ── 냉장고 Bottom Sheet ── */}
      <AnimatePresence>
        {showFridge && (
          <>
            {/* 딤 배경 */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowFridge(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50 }}
            />
            {/* 시트 */}
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 51,
                height: '67vh',
                background: '#111B27',
                borderRadius: '22px 22px 0 0',
                overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
              }}
            >
              {/* 핸들 + 헤더 */}
              <div style={{ padding: '12px 20px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto 12px' }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: 'white' }}>🧊 냉장고</span>
                  <button onClick={() => setShowFridge(false)} style={{ background: 'none', border: 'none', color: 'rgba(200,216,228,0.5)', fontSize: '1.2rem', cursor: 'pointer', padding: 4 }}>✕</button>
                </div>
              </div>
              {/* 내용 */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                <Fridge user={user} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 온보딩 모달 */}
      <OnboardingModal
        show={showOnboarding}
        step={onboardingStep}
        setStep={setOnboardingStep}
        onClose={() => { localStorage.setItem('godogi_onboarded', '1'); setShowOnboarding(false); setOnboardingStep(0) }}
      />

      {/* 상품 상세 모달 */}
      <AnimatePresence>
        {selectedSetModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedSetModal(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.55)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            }}
          >
            <motion.div
              initial={{ scale: 0.93 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.93 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#1A2840',
                borderRadius: 18,
                padding: '28px 24px',
                width: '100%',
                maxWidth: 400,
                fontFamily: "'Noto Sans KR', sans-serif",
              }}
            >
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white', marginBottom: 16 }}>
                {selectedSetModal.name}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24, fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <span style={{ color: 'rgba(200,216,228,0.6)' }}>판매가</span>
                  <span style={{ color: 'white', fontWeight: 700 }}>₩{selectedSetModal.sale_price.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <span style={{ color: 'rgba(200,216,228,0.6)' }}>원가</span>
                  <span style={{ color: 'white', fontWeight: 700 }}>₩{selectedSetModal.totalCost.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'rgba(200,216,228,0.6)' }}>원가율</span>
                  <span style={{
                    color: selectedSetModal.costRate < 30 ? '#7EC8A0' : selectedSetModal.costRate < 50 ? '#F4A460' : '#F08080',
                    fontWeight: 700
                  }}>
                    {Math.round(selectedSetModal.costRate)}%
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedSetModal(null)}
                style={{
                  width: '100%',
                  background: 'rgba(74,127,165,0.2)',
                  border: 'none',
                  borderRadius: 10,
                  color: '#7DB8D8',
                  padding: '11px',
                  fontFamily: "'Noto Sans KR', sans-serif",
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                닫기
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              <div style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem', marginBottom: 8 }}>
                {allMenus.some(m => m.id === deleteConfirmId) ? '레시피를 삭제할까요?' : '메뉴 구성을 삭제할까요?'}
              </div>
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
      </main>
    </div>
  )
}
