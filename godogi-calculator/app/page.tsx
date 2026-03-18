'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '../lib/supabase'
import { FIRST_LOGIN_MENU_SAMPLES, SAMPLE_SET_DEFINITIONS } from '../lib/sampleData'

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
  blocks: { id: string; name: string; emoji: string; cost: number; category: BlockCategory }[]
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

export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sets, setSets] = useState<DisplaySet[]>([])
  const [menuStats, setMenuStats] = useState<{ total: number; avgRate: number | null; warnCount: number } | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const loadedForUser = useRef<string | null>(null)

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

  // Load sets
  useEffect(() => {
    if (!user) { loadedForUser.current = null; return }
    if (loadedForUser.current === user.id) return
    loadedForUser.current = user.id
    loadSets()
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
    </main>
  )

  if (!user) return (
    <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0F1923', gap: 24 }}>
      <motion.div animate={{ rotate: [0, -8, 8, -4, 0] }} transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 4 }}>
        <svg width="56" height="56" viewBox="0 0 100 100" fill="none">
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
      <div style={{ textAlign: 'center', color: 'white' }}>
        <h1 style={{ fontFamily: "'Noto Sans KR',sans-serif", fontSize: '1.3rem', fontWeight: 700, margin: '0 0 6px' }}>고독이의 원가계산기</h1>
        <p style={{ fontSize: '0.78rem', color: 'rgba(200,216,228,0.4)', margin: 0 }}>소상공인을 위한 메뉴 원가 계산기</p>
      </div>
      <button onClick={loginWithGoogle} style={{
        background: 'white', color: '#1E2D40', border: 'none',
        borderRadius: 12, padding: '12px 28px',
        fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
      }}>🔑 Google로 시작하기</button>
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
              <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(200,216,228,0.4)', marginTop: 2 }}>내 메뉴를 구성하고 원가를 한눈에</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/calculator')}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
              color: 'rgba(200,216,228,0.45)', borderRadius: 8, padding: '7px 13px',
              fontSize: '0.72rem', cursor: 'pointer', fontFamily: "'Noto Sans KR', sans-serif",
            }}
          >원가 편집기 →</button>
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
                              <span key={b.id} style={{
                                fontSize: '0.73rem',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.07)',
                                borderRadius: 6, padding: '2px 8px',
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
                        onClick={e => handleDelete(set.id, e)}
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
    </div>
  )
}
