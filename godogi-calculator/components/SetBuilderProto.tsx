'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pencil, X, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { FIRST_LOGIN_MENU_SAMPLES, SAMPLE_SET_DEFINITIONS } from '@/lib/sampleData'

const FEES_KEY = 'godogi_fees'

interface FeeSettings {
  delivery_platform: number
  delivery_card: number
  hall_card: number
}
const DEFAULT_FEES: FeeSettings = { delivery_platform: 6.8, delivery_card: 1.5, hall_card: 1.5 }

// ── 타입 ────────────────────────────────────────
type BlockCategory = 'main' | 'side' | 'banchan' | 'drink' | 'extra'

interface Block {
  id: string       // React key (temp: menu_id + timestamp, or set_item id from DB)
  menu_id: string  // Supabase menus.id
  name: string
  cost: number
  category: BlockCategory
  emoji: string
}


function calcMenuTotalCost(menu: any): number {
  const ingTotal = (menu.ingredients || []).reduce((sum: number, ing: any) => {
    const qty = ing.qty || 1
    const yld = (ing.yield_ || 100) / 100
    return sum + (ing.price / qty / yld) * (ing.use_amount || 0)
  }, 0)
  const baseCost = ingTotal + (menu.labor || 0) + (menu.overhead || 0)
  const batchRatio = (menu.category === 'banchan' && (menu.batch_yield || 0) > 0 && (menu.serving_size || 0) > 0)
    ? (menu.serving_size || 0) / (menu.batch_yield || 1)
    : 1
  return baseCost * batchRatio
}

const CATEGORY_LABELS: Record<BlockCategory, string> = {
  main: '메인메뉴', side: '사이드메뉴', banchan: '반찬', drink: '음료', extra: '기타 (포장·수수료 등)',
}

function fmt(n: number) { return Math.round(n).toLocaleString('ko-KR') }

// ── 카테고리 스타일 ──────────────────────────────
const CS: Record<BlockCategory, { bg: string; border: string; label: string; barColor: string; shape: string; shadow: string }> = {
  main:    { bg: 'linear-gradient(135deg,#1E2D40,#2A4060)', border: '#4A7FA5', label: '메인',    barColor: '#4A7FA5', shape: '14px',  shadow: '0 6px 20px rgba(74,127,165,0.3)' },
  side:    { bg: 'linear-gradient(135deg,#2D4A2D,#3A6040)', border: '#4A8C6F', label: '사이드',  barColor: '#4A8C6F', shape: '999px', shadow: '0 6px 20px rgba(74,140,111,0.3)' },
  banchan: { bg: 'linear-gradient(135deg,#3A1A1A,#5A2020)', border: '#C44A4A', label: '반찬',    barColor: '#C44A4A', shape: '999px', shadow: '0 6px 20px rgba(196,74,74,0.3)' },
  drink:   { bg: 'linear-gradient(135deg,#4A2D4A,#6A3A6A)', border: '#9B6B9B', label: '음료',    barColor: '#9B6B9B', shape: '999px', shadow: '0 6px 20px rgba(155,107,155,0.3)' },
  extra:   { bg: 'linear-gradient(135deg,#3A2A1A,#5A3A20)', border: '#C8843A', label: '기타',    barColor: '#C8843A', shape: '8px',   shadow: '0 6px 20px rgba(200,132,58,0.3)' },
}

const CATEGORY_ORDER: BlockCategory[] = ['main', 'side', 'banchan', 'drink', 'extra']

// ── 팔레트 블록 ──────────────────────────────────
function PaletteBlock({ block, onAdd }: { block: Block; onAdd: () => void }) {
  const s = CS[block.category]
  const isMain = block.category === 'main'
  return (
    <motion.div
      whileHover={{ scale: 1.04, x: 4 }}
      whileTap={{ scale: 0.96 }}
      onClick={onAdd}
      style={{
        background: s.bg, border: `1.5px solid ${s.border}`, borderRadius: s.shape,
        padding: isMain ? '10px 14px' : '8px 12px',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 6, userSelect: 'none', boxShadow: s.shadow,
      }}
    >
      <span style={{ fontSize: isMain ? '1.4rem' : '1.1rem' }}>{block.emoji}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, fontSize: isMain ? '0.85rem' : '0.78rem', color: 'white' }}>{block.name}</div>
        <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>{fmt(block.cost)}원</div>
      </div>
      <Plus size={13} color="rgba(255,255,255,0.3)" />
    </motion.div>
  )
}

// ── 캔버스 블록 ──────────────────────────────────
function SetBlock({ block, onRemove, onMoveLeft, onMoveRight, onEdit }: {
  block: Block; onRemove: () => void; onMoveLeft?: () => void; onMoveRight?: () => void; onEdit?: () => void
}) {
  const s = CS[block.category]
  const isMain = block.category === 'main'
  return (
    <motion.div
      layout
      className="sb-set-block"
      initial={{ scale: 0.4, opacity: 0, y: 16 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.3, opacity: 0, y: -8 }}
      transition={{ type: 'spring', stiffness: 480, damping: 26 }}
      whileHover={{ scale: 1.04, y: -3 }}
      onClick={() => onEdit?.()}
      style={{
        background: s.bg, border: `2px solid ${s.border}`, borderRadius: s.shape,
        padding: isMain ? '18px 16px' : '12px 14px',
        position: 'relative', boxShadow: s.shadow,
        minWidth: isMain ? 120 : 90, textAlign: 'center', userSelect: 'none',
        cursor: onEdit ? 'pointer' : 'default',
      }}
    >
      {/* 데스크탑 카드 레이아웃 */}
      <div className="sb-block-card-body">
        <div className="sb-block-emoji" style={{ fontSize: isMain ? '2rem' : '1.5rem', marginBottom: 5 }}>{block.emoji}</div>
        <div style={{ fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, fontSize: isMain ? '0.85rem' : '0.75rem', color: 'white', marginBottom: 3 }}>{block.name}</div>
        <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.55)' }}>{fmt(block.cost)}원</div>
      </div>
      {/* 모바일 row 레이아웃 */}
      <div className="sb-block-row-body">
        <div style={{ fontSize: '1.6rem', flexShrink: 0 }}>{block.emoji}</div>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, fontSize: '0.88rem', color: 'white' }}>{block.name}</div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>{fmt(block.cost)}원</div>
        </div>
        {onEdit && (
          <motion.button
            onClick={e => { e.stopPropagation(); onEdit() }}
            whileTap={{ scale: 0.9 }}
            style={{
              flexShrink: 0, background: 'rgba(74,127,165,0.25)', border: '1px solid rgba(74,127,165,0.5)',
              borderRadius: 20, padding: '2px 10px', color: '#7DB8D8',
              fontSize: '0.62rem', cursor: 'pointer', fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700,
            }}
          >수정</motion.button>
        )}
      </div>
      {/* ✏️ 수정 버튼 (데스크탑: hover 시 표시) */}
      {onEdit && (
        <motion.button
          className="sb-edit-btn"
          onClick={e => { e.stopPropagation(); onEdit() }}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          style={{
            position: 'absolute', top: -8, left: -8,
            width: 20, height: 20, borderRadius: '50%',
            background: '#4A7FA5', border: 'none', color: 'white',
            fontSize: '0.6rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(74,127,165,0.5)',
          }}
        ><Pencil size={10} /></motion.button>
      )}
      {/* × 삭제 버튼 */}
      <motion.button
        className="sb-remove-btn"
        onClick={e => { e.stopPropagation(); onRemove() }}
        whileHover={{ scale: 1.2 }}
        whileTap={{ scale: 0.9 }}
        style={{
          position: 'absolute', top: -8, right: -8,
          width: 20, height: 20, borderRadius: '50%',
          background: '#D95F52', border: 'none', color: 'white',
          fontSize: '0.6rem', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(217,95,82,0.5)',
        }}
      ><X size={10} /></motion.button>
      {/* ← → 순서 이동 버튼 */}
      <div className="sb-move-btns" style={{
        position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 3,
      }}>
        {onMoveLeft && (
          <motion.button onClick={e => { e.stopPropagation(); onMoveLeft() }} whileTap={{ scale: 0.85 }} style={{
            width: 18, height: 18, borderRadius: '50%', border: 'none',
            background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)',
            fontSize: '0.55rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="sb-move-h"><ChevronLeft size={9} /></span>
            <span className="sb-move-v"><ChevronUp size={9} /></span>
          </motion.button>
        )}
        {onMoveRight && (
          <motion.button onClick={e => { e.stopPropagation(); onMoveRight() }} whileTap={{ scale: 0.85 }} style={{
            width: 18, height: 18, borderRadius: '50%', border: 'none',
            background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)',
            fontSize: '0.55rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="sb-move-h"><ChevronRight size={9} /></span>
            <span className="sb-move-v"><ChevronDown size={9} /></span>
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}

// ── 연결 점선 ────────────────────────────────────
function Connector() {
  return (
    <div className="sb-connector" style={{ display: 'flex', gap: 3, alignItems: 'center', padding: '0 4px' }}>
      {[0, 1, 2].map(d => (
        <motion.div key={d}
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: d * 0.22 }}
          style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(74,127,165,0.7)', flexShrink: 0 }}
        />
      ))}
    </div>
  )
}

// ── 일자형 스택 바 차트 ──────────────────────────
function StackedBar({ blocks, totalCost, salePrice }: { blocks: Block[]; totalCost: number; salePrice: number }) {
  if (totalCost === 0) return null

  const base = salePrice > 0 ? Math.max(salePrice, totalCost) : totalCost
  const profit = salePrice > totalCost ? salePrice - totalCost : 0
  const overrun = totalCost > salePrice && salePrice > 0 ? totalCost - salePrice : 0

  const costSegments = CATEGORY_ORDER.map(cat => {
    const sum = blocks.filter(b => b.category === cat).reduce((a, b) => a + b.cost, 0)
    return { cat, sum, pct: (sum / base) * 100 }
  }).filter(s => s.sum > 0)

  return (
    <div style={{ marginBottom: 16 }}>
      {/* 바 */}
      <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', background: 'rgba(255,255,255,0.05)', marginBottom: 8 }}>
        {costSegments.map(({ cat, pct }) => (
          <motion.div key={cat}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
            style={{ background: CS[cat].barColor, height: '100%', minWidth: pct > 0.5 ? 3 : 0 }}
          />
        ))}
        {/* 이익 구간 */}
        {profit > 0 && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(profit / base) * 100}%` }}
            transition={{ type: 'spring', stiffness: 180, damping: 22, delay: 0.1 }}
            style={{ background: 'rgba(126,200,160,0.45)', height: '100%', borderLeft: '1.5px solid rgba(126,200,160,0.7)' }}
          />
        )}
        {/* 적자 강조 */}
        {overrun > 0 && (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity }}
            style={{ background: 'rgba(217,95,82,0.6)', height: '100%', width: `${(overrun / base) * 100}%` }}
          />
        )}
      </div>
      {/* 레전드 */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'nowrap', alignItems: 'center', overflowX: 'auto' }}>
        {costSegments.map(({ cat, sum, pct }) => (
          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: CS[cat].barColor, flexShrink: 0 }} />
            <span style={{ fontSize: '0.7rem', color: 'rgba(200,216,228,0.55)', whiteSpace: 'nowrap' }}>
              {CS[cat].label}
            </span>
            <span className="sb-legend-amount" style={{ fontSize: '0.7rem', color: 'rgba(200,216,228,0.55)', whiteSpace: 'nowrap' }}>
              {fmt(sum)}원
            </span>
            <span style={{ fontSize: '0.65rem', color: 'rgba(200,216,228,0.3)', whiteSpace: 'nowrap' }}>
              {salePrice > 0 ? `${((sum / salePrice) * 100).toFixed(0)}%` : `${pct.toFixed(0)}%`}
            </span>
          </div>
        ))}
        {profit > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(126,200,160,0.7)', flexShrink: 0 }} />
            <span style={{ fontSize: '0.7rem', color: 'rgba(126,200,160,0.7)', whiteSpace: 'nowrap' }}>이익</span>
            <span className="sb-legend-amount" style={{ fontSize: '0.7rem', color: 'rgba(126,200,160,0.7)', whiteSpace: 'nowrap' }}>
              {fmt(profit)}원
            </span>
            <span style={{ fontSize: '0.65rem', color: 'rgba(126,200,160,0.4)', whiteSpace: 'nowrap' }}>
              {((profit / salePrice) * 100).toFixed(0)}%
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ────────────────────────────────
export default function SetBuilderProto() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('id')
  const [setName, setSetName] = useState('')
  const [blocks, setBlocks] = useState<Block[]>([])
  const [salePrice, setSalePrice] = useState('')
  const [showPalette, setShowPalette] = useState(false)
  const [saved, setSaved] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [isGuestMode, setIsGuestMode] = useState(false)
  const [paletteBlocks, setPaletteBlocks] = useState<Block[]>([])
  const [channel, setChannel] = useState<'delivery' | 'hall'>('delivery')
  const [feeSettings, setFeeSettings] = useState<FeeSettings>(DEFAULT_FEES)
  const [showFeeModal, setShowFeeModal] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [feeForm, setFeeForm] = useState<FeeSettings>(DEFAULT_FEES)
  const [showLeaveWarning, setShowLeaveWarning] = useState(false)
  const [pendingRoute, setPendingRoute] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [paletteSearch, setPaletteSearch] = useState('')
  const [paletteCategory, setPaletteCategory] = useState<'all' | BlockCategory>('all')
  const [setCategory, setSetCategory] = useState<string>('')
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [customCategoryInput, setCustomCategoryInput] = useState('')
  const [categorySearch, setCategorySearch] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem(FEES_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      setFeeSettings(parsed)
      setFeeForm(parsed)
    }

  }, [])

  useEffect(() => {
    if (!editId) return

    // 게스트 샘플 세트 로드
    if (editId.startsWith('guest_set_')) {
      const idx = parseInt(editId.replace('guest_set_', ''))
      const def = SAMPLE_SET_DEFINITIONS[idx]
      if (!def) return
      const menuMap: Record<string, typeof FIRST_LOGIN_MENU_SAMPLES[0]> = {}
      FIRST_LOGIN_MENU_SAMPLES.forEach(m => { menuMap[m.name] = m })
      setSetName(def.name)
      setSalePrice(def.sale_price > 0 ? def.sale_price.toLocaleString('ko-KR') : '')
      setChannel(def.channel)
      const guestBlocks: Block[] = def.menuNames.map((name, j) => {
        const m = menuMap[name]
        if (!m) return null
        const ingTotal = (m.ingredients || []).reduce((sum: number, ing: any) => {
          const qty = ing.qty || 1
          const yld = (ing.yield_ || 100) / 100
          return sum + (ing.price / qty / yld) * (ing.use_amount || 0)
        }, 0)
        const batchRatio = m.category === 'banchan' && (m.batch_yield || 0) > 0 && (m.serving_size || 0) > 0
          ? m.serving_size / m.batch_yield : 1
        const cost = Math.round((ingTotal + (m.labor || 0) + (m.overhead || 0)) * batchRatio)
        return { id: `guest_block_${j}`, menu_id: `guest_menu_${name}`, name: m.name, emoji: m.emoji || '🍽️', cost, category: m.category as BlockCategory }
      }).filter(Boolean) as Block[]
      setBlocks(guestBlocks)
      setIsDirty(false)
      return
    }

    if (!userId) return
    const loadSet = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('sets')
        .select(`
          id, name, sale_price, channel, category,
          set_items(
            id, sort_order, menu_id,
            menus(id, name, category, emoji, labor, overhead, batch_yield, serving_size,
              ingredients(id, price, qty, unit, yield_, use_amount)
            )
          )
        `)
        .eq('id', editId)
        .single()
      if (!data) return
      setSetName(data.name)
      setSalePrice(data.sale_price > 0 ? data.sale_price.toLocaleString('ko-KR') : '')
      if (data.channel) setChannel(data.channel as 'delivery' | 'hall')
      if (data.category) setSetCategory(data.category)
      const loadedBlocks = (data.set_items || [])
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((item: any) => ({
          id: item.id,
          menu_id: item.menu_id,
          name: item.menus?.name || '삭제된 메뉴',
          cost: Math.round(calcMenuTotalCost(item.menus || {})),
          category: (item.menus?.category || 'main') as BlockCategory,
          emoji: item.menus?.emoji || '🍽️',
        }))
      setBlocks(loadedBlocks)
      setIsDirty(false)
    }
    loadSet()
  }, [editId, userId])

  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setPaletteBlocks(FIRST_LOGIN_MENU_SAMPLES.map(m => {
          const ingTotal = (m.ingredients || []).reduce((sum: number, ing: any) => {
            const qty = ing.qty || 1
            const yld = (ing.yield_ || 100) / 100
            return sum + (ing.price / qty / yld) * (ing.use_amount || 0)
          }, 0)
          const batchRatio = m.category === 'banchan' && (m.batch_yield || 0) > 0 && (m.serving_size || 0) > 0
            ? m.serving_size / m.batch_yield : 1
          return {
            id: `guest_menu_${m.name}`,
            menu_id: `guest_menu_${m.name}`,
            name: m.name,
            cost: Math.round((ingTotal + (m.labor || 0) + (m.overhead || 0)) * batchRatio),
            category: m.category as BlockCategory,
            emoji: m.emoji || '🍽️',
          }
        }))
        setIsGuestMode(true)
        setAuthLoading(false)
        return
      }
      setUserId(session.user.id)

      // 캐시 있으면 즉시 표시
      const MENU_CACHE_KEY = `godogi_menus_${session.user.id}`
      const cached = localStorage.getItem(MENU_CACHE_KEY)
      if (cached) {
        try { setPaletteBlocks(JSON.parse(cached)); setAuthLoading(false) } catch {}
      }

      const { data } = await supabase
        .from('menus')
        .select('*, ingredients(*)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true })
      if (data) {
        const blocks = data.map((m: any) => {
          // 중복 재료 dedup
          const seen = new Set<string>()
          const deduped = (m.ingredients || []).filter((ing: any) => {
            if (!ing.name || seen.has(ing.name)) return false
            seen.add(ing.name); return true
          })
          return {
            id: m.id, menu_id: m.id, name: m.name,
            cost: Math.round(calcMenuTotalCost({ ...m, ingredients: deduped })),
            category: (['main', 'side', 'banchan', 'drink', 'extra'].includes(m.category) ? m.category : 'main') as BlockCategory,
            emoji: m.emoji || '🍽️',
          }
        })
        setPaletteBlocks(blocks)
        localStorage.setItem(MENU_CACHE_KEY, JSON.stringify(blocks))
      }
      setAuthLoading(false)
    }
    loadData()
  }, [])

  const totalCost = blocks.reduce((s, b) => s + b.cost, 0)
  const salePriceNum = parseFloat(salePrice.replace(/,/g, '')) || 0

  const feeRate = channel === 'delivery'
    ? (feeSettings.delivery_platform + feeSettings.delivery_card) / 100
    : feeSettings.hall_card / 100
  const totalCostWithFee = totalCost * (1 + feeRate)
  const costRate = salePriceNum > 0 ? (totalCostWithFee / salePriceNum) * 100 : null
  const profit = salePriceNum > 0 ? salePriceNum - totalCostWithFee : null

  const costRateColor = costRate === null ? 'white'
    : costRate < 30 ? '#7EC8A0' : costRate < 50 ? '#F4A460' : '#F08080'

  const comment = (() => {
    if (blocks.length === 0) return null
    if (!salePriceNum) return { emoji: '🐟', text: '판매가를 입력하면 원가율을 알 수 있어요', color: 'rgba(200,216,228,0.4)' }
    if (costRate === null) return null
    if (costRate < 10)  return { emoji: '🤯', text: `원가율 ${costRate.toFixed(1)}%... 이건 미친 마진이에요!`, color: '#7EC8A0' }
    if (costRate < 30)  return { emoji: '🎉', text: `원가율 ${costRate.toFixed(1)}%. 엄청 좋아요! 고독이도 박수치고 있어요`, color: '#7EC8A0' }
    if (costRate < 50)  return { emoji: '👍', text: `원가율 ${costRate.toFixed(1)}%. 잘 관리하고 있어요! 고독이도 흐뭇해요 🐟`, color: '#F4A460' }
    if (costRate < 80)  return { emoji: '😬', text: `원가율 ${costRate.toFixed(1)}%... 위험해요. 가격을 올리거나 원가를 줄여봐요`, color: '#F08080' }
    return { emoji: '🚨', text: `원가율 ${costRate.toFixed(1)}%!! 거의 남는 게 없어요. 고독이가 걱정돼요`, color: '#D95F52' }
  })()

  const tryNavigate = (route: string) => {
    if (isDirty && !saved) {
      setPendingRoute(route)
      setShowLeaveWarning(true)
    } else {
      router.push(route)
    }
  }

  const addBlock = (b: Block) => {
    setBlocks(prev => {
      const next = [...prev, { ...b, menu_id: b.id, id: b.id + '_' + Date.now() }]
      return next.sort((a, z) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(z.category))
    })
    setIsDirty(true)
    setShowPalette(false)
  }

  const removeBlock = (id: string) => {
    setBlocks(p => p.filter(x => x.id !== id))
    setIsDirty(true)
  }

  const moveBlock = (index: number, dir: -1 | 1) => {
    setBlocks(prev => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
    setIsDirty(true)
  }

  const loginWithGoogle = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  const handleSave = async () => {
    if (blocks.length === 0) return
    if (!setCategory) { alert('카테고리를 선택해주세요'); return }
    if (!userId) { setShowLoginModal(true); return }
    const supabase = createClient()
    try {
      let setId = editId
      if (editId) {
        await supabase.from('sets').update({
          name: setName || '메뉴 구성',
          sale_price: salePriceNum,
          channel,
          category: setCategory,
          updated_at: new Date().toISOString(),
        }).eq('id', editId)
      } else {
        const { data, error } = await supabase.from('sets').insert({
          user_id: userId,
          name: setName || '메뉴 구성',
          sale_price: salePriceNum,
          channel,
          category: setCategory,
        }).select().single()
        if (error || !data) { console.error(error); return }
        setId = data.id
      }
      await supabase.from('set_items').delete().eq('set_id', setId)
      if (blocks.length > 0) {
        await supabase.from('set_items').insert(
          blocks.map((b, i) => ({ set_id: setId, menu_id: b.menu_id, sort_order: i }))
        )
      }
      setSaved(true)
      setIsDirty(false)
      setTimeout(() => router.push('/'), 600)
    } catch (err) {
      console.error('Save error:', err)
    }
  }

  const filteredPalette = paletteBlocks.filter(b => {
    const matchCat = paletteCategory === 'all' || b.category === paletteCategory
    const matchSearch = b.name.toLowerCase().includes(paletteSearch.toLowerCase())
    return matchCat && matchSearch
  })

  const CATEGORY_CHIPS: { key: 'all' | BlockCategory; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'main', label: '메인' },
    { key: 'side', label: '사이드' },
    { key: 'banchan', label: '반찬' },
    { key: 'drink', label: '음료' },
    { key: 'extra', label: '기타' },
  ]

  const PalettePanel = () => (
    <div style={{ padding: '16px 14px', overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
        <svg width="28" height="28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
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
        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'rgba(200,216,228,0.7)', letterSpacing: '-0.01em' }}>고독이의 원가계산기</span>
      </div>

      {/* 검색 */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'rgba(200,216,228,0.3)', pointerEvents: 'none' }}>🔍</span>
        <input
          value={paletteSearch}
          onChange={e => setPaletteSearch(e.target.value)}
          placeholder="메뉴 검색"
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '7px 10px 7px 28px',
            color: 'white', fontSize: '0.78rem', fontFamily: "'Noto Sans KR',sans-serif",
            outline: 'none',
          }}
        />
      </div>

      {/* 카테고리 필터 */}
      <div className="sb-cat-scroll" style={{ display: 'flex', gap: 4, marginBottom: 12, overflowX: 'auto', paddingBottom: 4 }}>
        {CATEGORY_CHIPS.filter(c => c.key === 'all' || paletteBlocks.some(b => b.category === c.key)).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setPaletteCategory(key)}
            style={{
              background: paletteCategory === key ? '#4A7FA5' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${paletteCategory === key ? '#4A7FA5' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 20, padding: '3px 10px',
              color: paletteCategory === key ? 'white' : 'rgba(200,216,228,0.5)',
              fontSize: '0.68rem', cursor: 'pointer', fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700,
              transition: 'all 0.15s', flexShrink: 0,
            }}
          >{label}</button>
        ))}
      </div>

      {/* 메뉴 목록 */}
      {filteredPalette.length === 0 ? (
        <div style={{ color: 'rgba(200,216,228,0.3)', fontSize: '0.78rem', textAlign: 'center', paddingTop: 40 }}>
          {paletteBlocks.length === 0 ? '아직 등록된 메뉴가 없어요 🐟' : '검색 결과가 없어요'}
        </div>
      ) : (
        paletteCategory === 'all' && !paletteSearch
          ? CATEGORY_ORDER.map(cat => {
              const items = filteredPalette.filter(b => b.category === cat)
              if (items.length === 0) return null
              return (
                <div key={cat}>
                  <div style={{ fontSize: '0.62rem', color: 'rgba(200,216,228,0.28)', letterSpacing: '0.1em', margin: '10px 0 8px' }}>{CATEGORY_LABELS[cat]}</div>
                  {items.map(b => <PaletteBlock key={b.id} block={b} onAdd={() => addBlock(b)} />)}
                </div>
              )
            })
          : filteredPalette.map(b => <PaletteBlock key={b.id} block={b} onAdd={() => addBlock(b)} />)
      )}
      {/* 원가 편집기 이동 버튼 */}
      <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={() => tryNavigate('/calculator')}
          style={{
            width: '100%', padding: '10px 0',
            background: 'rgba(74,127,165,0.15)', border: '1.5px dashed rgba(74,127,165,0.4)',
            borderRadius: 10, color: 'var(--blue-light)',
            fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, fontSize: '0.78rem',
            cursor: 'pointer', letterSpacing: '0.02em',
          }}
        >＋ 추가</button>
      </div>
    </div>
  )

  if (authLoading) return (
    <div style={{ minHeight: '100vh', background: '#0F1923', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(200,216,228,0.5)', fontFamily: "'Noto Sans KR',sans-serif", fontSize: '0.9rem' }}>
      🐟 불러오는 중...
    </div>
  )

  if (!userId && !isGuestMode) return (
    <div style={{ minHeight: '100vh', background: '#0F1923', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: "'Noto Sans KR',sans-serif" }}>
      <div style={{ fontSize: '2.5rem' }}>🐟</div>
      <p style={{ color: 'rgba(200,216,228,0.6)', fontSize: '0.9rem', margin: 0 }}>메뉴를 불러오려면 로그인이 필요해요</p>
      <button onClick={() => router.push('/calculator')} style={{ background: '#4A7FA5', border: 'none', borderRadius: 12, color: 'white', padding: '10px 24px', cursor: 'pointer', fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, fontSize: '0.9rem' }}>
        로그인하러 가기
      </button>
    </div>
  )

  return (
    <>
      <style>{`
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
        .sb-summary-row { scrollbar-width: none; }
        .sb-summary-row::-webkit-scrollbar { display: none; }
        .sb-sum-value { white-space: nowrap; }
        @media (max-width: 768px) {
          .sb-summary-row { gap: 12px !important; justify-content: space-between !important; }
          .sb-summary-row > * { flex: 1; align-items: center !important; }
          .sb-summary-row input { width: 58px !important; font-size: 0.92rem !important; padding: 0 2px !important; }
          .sb-sum-label { font-size: 0.56rem !important; }
          .sb-sum-value { font-size: 0.92rem !important; }
          .sb-fee-sub { display: none !important; }
        }
        .sb-cat-scroll::-webkit-scrollbar { height: 3px; }
        .sb-cat-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.04); border-radius: 3px; }
        .sb-cat-scroll::-webkit-scrollbar-thumb { background: rgba(74,127,165,0.4); border-radius: 3px; }
        .sb-cat-scroll::-webkit-scrollbar-thumb:hover { background: rgba(74,127,165,0.7); }
        .sb-cat-scroll { scrollbar-width: thin; scrollbar-color: rgba(74,127,165,0.4) rgba(255,255,255,0.04); }
        /* 데스크탑: card body ON, row body OFF */
        .sb-block-card-body { display: block; }
        .sb-block-row-body  { display: none; }
        /* 데스크탑: × 버튼 기본 숨김, hover 시 표시 */
        .sb-remove-btn { opacity: 0; transition: opacity 0.15s; }
        .sb-set-block:hover .sb-remove-btn { opacity: 1 !important; }
        .sb-edit-btn { opacity: 0; transition: opacity 0.15s; }
        .sb-set-block:hover .sb-edit-btn { opacity: 1 !important; }
        /* 이동 버튼 */
        .sb-move-btns { opacity: 0; transition: opacity 0.15s; }
        .sb-set-block:hover .sb-move-btns { opacity: 1 !important; }
        .sb-move-v { display: none; }

        @media (max-width: 768px) {
          .sb-palette  { display: none !important; }
          .sb-add-fab  { display: flex !important; }
          .sb-add-btn  { display: flex !important; align-items: center; padding: 8px 10px !important; }
          .sb-add-text { display: none !important; }
          .sb-save-text { display: none !important; }
          .sb-save-btn { padding: 8px 10px !important; }
          .sb-wrap     { padding: 16px 14px calc(env(safe-area-inset-bottom, 0px) + 100px) !important; min-width: 0; overflow-x: hidden; box-sizing: border-box; width: 100%; }
          /* 레전드: 모바일에서 금액 숨김 */
          .sb-legend-amount { display: none !important; }
          /* 화살표: 모바일에서 세로 방향으로 */
          .sb-move-h { display: none !important; }
          .sb-move-v { display: flex !important; }

          /* 캔버스: 세로 스택 */
          .sb-canvas {
            flex-direction: column !important;
            align-items: stretch !important;
            flex-wrap: nowrap !important;
            gap: 0 !important;
            padding: 20px 14px !important;
          }

          /* 각 아이템(커넥터+블록): 세로 배치 */
          .sb-block-item {
            flex-direction: column !important;
            align-items: stretch !important;
            width: 100% !important;
          }

          /* 연결 점선: 가로 → 세로 */
          .sb-connector {
            flex-direction: column !important;
            padding: 4px 0 !important;
            align-items: center !important;
            gap: 3px !important;
          }

          /* 블록: 카드 → 가로 row */
          .sb-set-block {
            min-width: 0 !important;
            width: 100% !important;
            text-align: left !important;
            padding: 12px 14px !important;
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            gap: 10px !important;
          }
          /* 카드 바디 OFF, row 바디 ON */
          .sb-block-card-body { display: none !important; }
          .sb-block-row-body  { display: flex !important; align-items: center; gap: 10px; width: 100%; }
          /* 상단 뱃지 숨김 (row 바디 안에 인라인 뱃지로 대체) */
          .sb-block-label { display: none !important; }
          /* × 버튼: 모바일에서 항상 표시 (tap 가능하게) */
          .sb-remove-btn {
            opacity: 0.55 !important;
            position: relative !important;
            top: 0 !important;
            right: 0 !important;
            left: 0 !important;
            flex-shrink: 0 !important;
          }
          /* ✏️ 편집 버튼: 모바일에서 숨김 (원가 편집기 FAB으로 대체) */
          .sb-edit-btn {
            display: none !important;
          }
          /* 이동 버튼: 모바일에서 항상 표시 */
          .sb-move-btns {
            opacity: 1 !important;
            position: relative !important;
            bottom: 0 !important;
            left: 0 !important;
            transform: none !important;
            flex-shrink: 0 !important;
          }
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#0F1923', display: 'flex', fontFamily: "'Noto Sans KR',sans-serif", overflowX: 'hidden', maxWidth: '100vw' }}>

        {/* 왼쪽 팔레트 (데스크탑) */}
        <div className="sb-palette" style={{
          width: 210, background: '#111B27', borderRight: '1px solid rgba(255,255,255,0.05)',
          flexShrink: 0, overflowY: 'auto',
        }}>
          <PalettePanel />
        </div>

        {/* 메인 영역 */}
        <div className="sb-wrap" style={{ flex: 1, padding: '28px 36px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* 헤더: 뒤로가기 + 세트 이름 + 버튼들 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* 1행: 햄버거 버튼 - 사이드바 토글 */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                // 커스텀 이벤트 발생
                window.dispatchEvent(new Event('godogi-toggle-sidebar'))
              }}
              style={{
                background: 'none', border: 'none', color: '#C8D4E0',
                fontSize: '1.4rem', cursor: 'pointer', padding: '4px 8px',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 'fit-content',
              }}
            >☰</motion.button>

            {/* 메뉴판 경로: 3행 레이아웃 */}
            {editId && (
              <>
                {/* 2행: 뒤로가기 + 수정중 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <motion.button
                    whileTap={{ scale: 0.93 }}
                    onClick={() => {
                      tryNavigate('/')
                      setTimeout(() => {
                        const menuPanel = document.querySelector('[data-tab-bar="true"]')
                        if (menuPanel) menuPanel.scrollIntoView({ behavior: 'smooth' })
                      }, 100)
                    }}
                    style={{
                      background: 'rgba(74,127,165,0.15)', border: '1px solid rgba(74,127,165,0.3)',
                      color: '#7DB8D8', borderRadius: 8, padding: '5px 12px',
                      fontFamily: "'Noto Sans KR',sans-serif", fontSize: '0.78rem', cursor: 'pointer',
                      flexShrink: 0, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5,
                    }}
                  >← 메뉴판</motion.button>
                  {/* 수정 중 표시 */}
                  {editId && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F4A460', animation: 'pulse 1.5s infinite' }} />
                      <span style={{ fontSize: '0.68rem', color: 'rgba(200,216,228,0.4)', fontFamily: "'Noto Sans KR',sans-serif" }}>수정 중</span>
                    </div>
                  )}
                </div>

                {/* 3행: 메뉴명 + 카테고리 + 저장 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    value={setName}
                    onChange={e => { setSetName(e.target.value); setIsDirty(true) }}
                    placeholder="예: 스파게티"
                    style={{
                      flex: 1, background: 'none', border: 'none',
                      borderBottom: '2px solid rgba(74,127,165,0.35)',
                      color: 'white', fontSize: '1.1rem',
                      fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700,
                      outline: 'none', paddingBottom: 4, minWidth: 0,
                    }}
                  />
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowCategoryDropdown(v => !v)}
                      style={{
                        padding: '4px 8px', borderRadius: 8, border: `1px solid ${setCategory ? '#4A7FA5' : '#E74C3C'}`,
                        background: 'rgba(74,127,165,0.15)', color: setCategory ? 'white' : 'rgba(200,216,228,0.5)',
                        fontSize: '0.7rem', fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 600,
                        cursor: 'pointer', outline: 'none', transition: 'all 0.2s', minWidth: 100, maxWidth: 110,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}
                    >
                      {setCategory ? (setCategory.length > 8 ? setCategory.slice(0, 8) + '...' : setCategory) : '카테고리'} ▼
                    </motion.button>
                    {showCategoryDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        onClick={e => e.stopPropagation()}
                        style={{
                          position: 'fixed', zIndex: 100,
                          background: '#0F1923', border: '1px solid rgba(74,127,165,0.3)', borderRadius: 10,
                          overflow: 'hidden', width: 200, boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                          bottom: 'auto', top: '50px', right: 20,
                          display: 'flex', flexDirection: 'column',
                        }}
                      >
                        {/* 검색 입력 */}
                        <input
                          type="text"
                          placeholder="검색..."
                          value={categorySearch}
                          onChange={e => setCategorySearch(e.target.value)}
                          onClick={e => e.stopPropagation()}
                          style={{
                            padding: '8px 10px', border: 'none', background: 'rgba(74,127,165,0.1)',
                            color: 'white', fontSize: '0.72rem', fontFamily: "'Noto Sans KR',sans-serif",
                            outline: 'none', borderBottom: '1px solid rgba(74,127,165,0.2)',
                          }}
                        />
                        {/* 카테고리 목록 */}
                        <div style={{ maxHeight: 250, overflowY: 'auto', flex: 1 }}>
                          {['탕/찌개류', '볶음류', '구이류', '밥류', '반찬류', '음료', '디저트', '면류', '분식', '기타', '파스타류', '피자류', '스테이크/고기류', '샐러드/사이드', '마라류', '튀김/구이류', '안주류', '초밥/롤', '라멘/우동', '덮밥', '치킨류', '사이드', '핫 스낵', '쌀 요리', '국/스프', '음료류', '베이커리', '파스타', '고기요리', '밥요리'].filter(cat => cat.toLowerCase().includes(categorySearch.toLowerCase())).map(cat => (
                            <motion.button
                              key={cat}
                              whileHover={{ background: 'rgba(74,127,165,0.2)' }}
                              whileTap={{ background: 'rgba(74,127,165,0.3)' }}
                              onClick={() => { setSetCategory(cat); setShowCategoryDropdown(false); setCategorySearch(''); setIsDirty(true) }}
                              style={{
                                width: '100%', padding: '8px 10px', border: 'none', background: setCategory === cat ? 'rgba(74,127,165,0.3)' : 'transparent',
                                color: setCategory === cat ? '#7DB8D8' : 'rgba(200,216,228,0.7)', fontSize: '0.73rem',
                                fontFamily: "'Noto Sans KR',sans-serif", cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                              }}
                            >
                              {cat}
                            </motion.button>
                          ))}
                        </div>
                        {/* 직접 입력 */}
                        <div style={{ borderTop: '1px solid rgba(74,127,165,0.2)', padding: '2px' }}>
                          <motion.button
                            whileHover={{ background: 'rgba(200,216,228,0.08)' }}
                            whileTap={{ background: 'rgba(200,216,228,0.12)' }}
                            onClick={() => { setShowCategoryDropdown(false); setShowCategoryModal(true); setCategorySearch('') }}
                            style={{
                              width: '100%', padding: '6px 10px', border: 'none', background: 'transparent',
                              color: 'rgba(200,216,228,0.6)', fontSize: '0.7rem', fontFamily: "'Noto Sans KR',sans-serif",
                              cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                            }}
                          >
                            + 직접 입력
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                  <motion.button
                    className="sb-save-btn"
                    whileTap={{ scale: 0.93 }}
                    onClick={handleSave}
                    animate={saved ? { scale: [1, 1.08, 1] } : {}}
                    style={{
                      background: saved ? '#4A8C6F' : blocks.length > 0 && setCategory ? 'linear-gradient(135deg, #3A6FA5, #2A5080)' : 'rgba(255,255,255,0.06)',
                      border: 'none', borderRadius: 10, padding: '8px 14px',
                      color: blocks.length > 0 && setCategory ? 'white' : 'rgba(200,216,228,0.3)',
                      fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, fontSize: '0.82rem',
                      cursor: blocks.length > 0 && setCategory ? 'pointer' : 'default',
                      flexShrink: 0, transition: 'background 0.2s',
                    }}
                  >{saved ? '✓' : '저장'}<span className="sb-save-text">{saved ? ' 저장됨' : ''}</span></motion.button>
                </div>
              </>
            )}
          </div>

          {/* 블록 캔버스 */}
          <div className="sb-canvas" style={{
            background: 'rgba(255,255,255,0.02)', border: '1.5px dashed rgba(74,127,165,0.18)',
            borderRadius: 22, padding: '28px 20px',
            display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8,
            minHeight: 180, position: 'relative',
          }}>
            <AnimatePresence mode="popLayout">
              {blocks.length === 0 ? (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(200,216,228,0.18)', pointerEvents: 'none' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 10 }}>🧩</div>
                  <div style={{ fontSize: '0.82rem' }}>아래 버튼으로 블록을 추가해보세요</div>
                </motion.div>
              ) : (
                blocks.map((b, i) => (
                  <div key={b.id} className="sb-block-item" style={{ display: 'flex', alignItems: 'center' }}>
                    {i > 0 && <Connector />}
                    <SetBlock
                      block={b}
                      onRemove={() => removeBlock(b.id)}
                      onMoveLeft={i > 0 ? () => moveBlock(i, -1) : undefined}
                      onMoveRight={i < blocks.length - 1 ? () => moveBlock(i, 1) : undefined}
                      onEdit={() => tryNavigate(`/calculator?menuId=${b.menu_id}&source=menu${editId ? `&returnTo=/proto?id=${editId}` : '&returnTo=/proto'}`)}
                    />
                  </div>
                ))
              )}
            </AnimatePresence>
          </div>

          {/* 결과 카드 */}
          <AnimatePresence>
            {blocks.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                transition={{ type: 'spring', stiffness: 280, damping: 25 }}
                style={{ background: '#1A2840', borderRadius: 20, padding: '20px 22px', border: '1px solid rgba(74,127,165,0.15)' }}
              >
                {/* 채널 선택 + 수수료 설정 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                  {(['delivery', 'hall'] as const).map(ch => (
                    <button key={ch} onClick={() => { setChannel(ch); setIsDirty(true) }} style={{
                      padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                      fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, fontSize: '0.75rem',
                      background: channel === ch ? (ch === 'delivery' ? '#4A7FA5' : '#4A8C6F') : 'rgba(255,255,255,0.07)',
                      color: channel === ch ? 'white' : 'rgba(200,216,228,0.4)',
                      transition: 'all 0.15s',
                    }}>
                      {ch === 'delivery' ? '🛵 배달' : '🏠 홀'}
                    </button>
                  ))}
                  <div style={{ fontSize: '0.68rem', color: 'rgba(200,216,228,0.35)', flex: 1 }}>
                    수수료 {channel === 'delivery'
                      ? `${feeSettings.delivery_platform + feeSettings.delivery_card}%`
                      : `${feeSettings.hall_card}%`} 적용
                  </div>
                </div>

                {/* 스택 바 차트 */}
                <StackedBar blocks={blocks} totalCost={totalCostWithFee} salePrice={salePriceNum} />

                {/* 숫자 요약 행 — 판매가(입력) · 총원가 · 순이익 · 원가율 */}
                <div className="sb-summary-row" style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'nowrap', gap: 16, overflowX: 'auto', paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  {/* 판매가 입력 */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                    <div className="sb-sum-label" style={{ fontSize: '0.65rem', color: 'rgba(200,216,228,0.35)' }}>🏷️ 판매가</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <input
                        value={salePrice}
                        onChange={e => {
                          const raw = e.target.value.replace(/,/g, '')
                          if (/^\d*$/.test(raw)) { setSalePrice(raw ? parseInt(raw).toLocaleString('ko-KR') : ''); setIsDirty(true) }
                        }}
                        placeholder="0"
                        inputMode="numeric"
                        style={{
                          width: 90, padding: '0 2px',
                          background: 'transparent',
                          border: 'none', borderBottom: '1.5px solid rgba(74,127,165,0.5)',
                          borderRadius: 0, color: 'white',
                          fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700,
                          fontSize: '1.2rem', outline: 'none', textAlign: 'right',
                        }}
                      />
                      <span style={{ fontSize: '0.8rem', color: 'rgba(200,216,228,0.4)' }}>원</span>
                    </div>
                  </div>

                  {/* 총 원가 (수수료 포함) */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                    <div className="sb-sum-label" style={{ fontSize: '0.65rem', color: 'rgba(200,216,228,0.35)' }}>💰 총 원가</div>
                    <motion.div key={totalCostWithFee}
                      initial={{ scale: 1.12, color: '#7EC8A0' }} animate={{ scale: 1, color: 'white' }}
                      transition={{ type: 'spring', stiffness: 400 }}
                      className="sb-sum-value" style={{ fontSize: '1.2rem', fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700 }}>
                      {fmt(totalCostWithFee)}원
                    </motion.div>
                    {feeRate > 0 && (
                      <div className="sb-fee-sub" style={{ fontSize: '0.62rem', color: 'rgba(200,216,228,0.3)' }}>
                        (제조 {fmt(totalCost)}원 + 수수료)
                      </div>
                    )}
                  </div>

                  {/* 순이익 + 원가율 — 판매가 입력 시 등장 */}
                  <AnimatePresence>
                    {costRate !== null && (
                      <>
                        <motion.div
                          style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}
                          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 300, delay: 0.04 }}>
                          <div className="sb-sum-label" style={{ fontSize: '0.65rem', color: 'rgba(200,216,228,0.35)' }}>✨ 순이익</div>
                          <div className="sb-sum-value" style={{ fontSize: '1.2rem', fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, color: profit! >= 0 ? '#7EC8A0' : '#F08080' }}>
                            {profit! >= 0 ? '+' : ''}{fmt(profit!)}원
                          </div>
                        </motion.div>
                        <motion.div
                          style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}
                          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 300, delay: 0.09 }}>
                          <div className="sb-sum-label" style={{ fontSize: '0.65rem', color: 'rgba(200,216,228,0.35)' }}>📈 원가율</div>
                          <motion.div key={costRate.toFixed(1)}
                            initial={{ scale: 1.2 }} animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 400 }}
                            className="sb-sum-value" style={{ fontSize: '1.2rem', fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, color: costRateColor }}>
                            {costRate.toFixed(1)}%
                          </motion.div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* 고독이 코멘트 */}
                <AnimatePresence mode="wait">
                  {comment && (
                    <motion.div key={comment.text}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 12 }}>
                      <span style={{ fontSize: '1rem' }}>{comment.emoji}</span>
                      <span style={{ fontSize: '0.78rem', color: comment.color, fontFamily: "'Noto Sans KR',sans-serif" }}>{comment.text}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 모바일 전용 구성추가 FAB */}
        <div
          className="sb-add-fab"
          style={{
            position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
            zIndex: 30, display: 'none',
          }}
        >
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowPalette(true)}
            style={{
              background: 'rgba(74,127,165,0.85)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(74,127,165,0.5)', borderRadius: 20,
              color: 'white', fontSize: '0.78rem',
              padding: '8px 20px', cursor: 'pointer',
              fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700,
              boxShadow: '0 3px 14px rgba(74,127,165,0.35)',
              display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
            }}
          ><span style={{ fontSize: '1rem', lineHeight: 1 }}>＋</span> 구성 추가</motion.button>
        </div>

        {/* 카테고리 직접 입력 모달 */}
        <AnimatePresence>
          {showCategoryModal && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => { setShowCategoryModal(false); setCustomCategoryInput('') }}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }} />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                style={{ position: 'fixed', top: '35%', left: 0, right: 0, marginLeft: 'auto', marginRight: 'auto', transform: 'translateY(-50%)', zIndex: 201, width: '90%', maxWidth: 320, boxSizing: 'border-box' }}>
                <div style={{ background: '#111B27', border: '1px solid rgba(74,127,165,0.3)', borderRadius: 16, padding: 16 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'white', marginBottom: 12, fontFamily: "'Noto Sans KR',sans-serif" }}>
                    새 카테고리
                  </div>
                  <input
                    autoFocus
                    type="text"
                    placeholder="카테고리명 입력..."
                    value={customCategoryInput}
                    onChange={e => setCustomCategoryInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && customCategoryInput.trim()) {
                        setSetCategory(customCategoryInput.trim());
                        setShowCategoryModal(false);
                        setCustomCategoryInput('');
                        setIsDirty(true);
                      }
                    }}
                    style={{
                      width: '100%', padding: '10px 12px', marginBottom: 14, boxSizing: 'border-box',
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(74,127,165,0.3)',
                      borderRadius: 10, color: 'white', fontSize: '0.85rem', fontFamily: "'Noto Sans KR',sans-serif",
                      outline: 'none', transition: 'all 0.2s',
                    }}
                    onFocus={e => e.target.style.borderColor = '#4A7FA5'}
                    onBlur={e => e.target.style.borderColor = 'rgba(74,127,165,0.3)'}
                  />
                  <div style={{ display: 'flex', gap: 10 }}>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { setShowCategoryModal(false); setCustomCategoryInput('') }}
                      style={{
                        flex: 1, padding: '8px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 10, color: 'rgba(200,216,228,0.6)', fontSize: '0.78rem', fontFamily: "'Noto Sans KR',sans-serif",
                        fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    >
                      취소
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (customCategoryInput.trim()) {
                          setSetCategory(customCategoryInput.trim());
                          setShowCategoryModal(false);
                          setCustomCategoryInput('');
                          setIsDirty(true);
                        }
                      }}
                      style={{
                        flex: 1, padding: '8px 12px', background: customCategoryInput.trim() ? '#4A7FA5' : 'rgba(74,127,165,0.2)',
                        border: 'none', borderRadius: 10, color: customCategoryInput.trim() ? 'white' : 'rgba(200,216,228,0.3)',
                        fontSize: '0.78rem', fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 600,
                        cursor: customCategoryInput.trim() ? 'pointer' : 'default', transition: 'all 0.2s',
                      }}
                    >
                      추가
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* 이탈 경고 모달 */}
        <AnimatePresence>
          {showLeaveWarning && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setShowLeaveWarning(false)}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 60,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }}
                  onClick={e => e.stopPropagation()}
                  style={{ background: '#1A2840', borderRadius: 20, padding: '24px 22px',
                    width: '100%', maxWidth: 320, border: '1px solid rgba(217,95,82,0.25)' }}
                >
                  <div style={{ fontSize: '1.4rem', marginBottom: 10 }}>🐟</div>
                  <div style={{ fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, fontSize: '0.95rem', color: 'white', marginBottom: 8 }}>
                    저장하지 않고 이동할까요?
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'rgba(200,216,228,0.45)', marginBottom: 20 }}>
                    현재 구성 중인 내용이 저장되지 않아요.
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setShowLeaveWarning(false)} style={{
                      flex: 1, padding: '10px 0', background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
                      color: 'rgba(200,216,228,0.5)', fontFamily: "'Noto Sans KR',sans-serif",
                      fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                    }}>계속 편집</button>
                    <button onClick={() => { setShowLeaveWarning(false); router.push(pendingRoute ?? '/') }} style={{
                      flex: 1, padding: '10px 0', background: 'rgba(217,95,82,0.2)',
                      border: '1px solid rgba(217,95,82,0.3)', borderRadius: 10,
                      color: '#F08080', fontFamily: "'Noto Sans KR',sans-serif",
                      fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                    }}>이동하기</button>
                  </div>
                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* 로그인 모달 */}
        <AnimatePresence>
          {showLoginModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowLoginModal(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
              <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                style={{ background: '#1A2840', borderRadius: 20, padding: '32px 28px', width: '100%', maxWidth: 340, textAlign: 'center', fontFamily: "'Noto Sans KR', sans-serif" }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🐟</div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: '1rem', marginBottom: 8 }}>저장하려면 로그인이 필요해요</div>
                <div style={{ color: 'rgba(200,216,228,0.5)', fontSize: '0.78rem', marginBottom: 24 }}>로그인하면 메뉴 구성이 저장되고<br/>언제든 다시 볼 수 있어요</div>
                <button onClick={loginWithGoogle} style={{
                  width: '100%', background: 'white', color: '#1E2D40', border: 'none',
                  borderRadius: 12, padding: '12px', fontFamily: "'Noto Sans KR', sans-serif",
                  fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', marginBottom: 10,
                }}>🔑 Google로 로그인하기</button>
                <button onClick={() => setShowLoginModal(false)} style={{
                  width: '100%', background: 'transparent', color: 'rgba(200,216,228,0.35)', border: 'none',
                  fontFamily: "'Noto Sans KR', sans-serif", fontSize: '0.78rem', cursor: 'pointer',
                }}>나중에 할게요</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 수수료 설정 모달 */}
        <AnimatePresence>
          {showFeeModal && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setShowFeeModal(false)}
                style={{
                  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 60,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 24px',
                }}
              >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 340, damping: 26 }}
                onClick={e => e.stopPropagation()}
                style={{
                  zIndex: 70, background: '#1A2840', borderRadius: 20, padding: '24px 22px',
                  width: '100%', maxWidth: 360,
                  border: '1px solid rgba(74,127,165,0.2)',
                }}
              >
                <div style={{ fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, fontSize: '0.95rem', color: 'white', marginBottom: 20 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Settings size={15} /> 수수료 설정</span>
                </div>

                {/* 배달 채널 */}
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: '0.72rem', color: '#4A7FA5', fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, marginBottom: 10, letterSpacing: '0.04em' }}>🛵 배달 채널</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { label: '플랫폼 수수료 (%)', key: 'delivery_platform', placeholder: '예: 6.8' },
                      { label: '카드 수수료 (%)', key: 'delivery_card', placeholder: '예: 1.5' },
                    ].map(({ label, key, placeholder }) => (
                      <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <label style={{ fontSize: '0.65rem', color: 'rgba(200,216,228,0.5)', fontFamily: "'Noto Sans KR',sans-serif" }}>{label}</label>
                        <input
                          value={(feeForm as any)[key] || ''}
                          inputMode="decimal"
                          placeholder={placeholder}
                          onChange={e => setFeeForm(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                          style={{
                            background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(74,127,165,0.3)',
                            borderRadius: 9, color: 'white', fontFamily: "'Noto Sans KR',sans-serif",
                            fontWeight: 700, fontSize: '0.9rem', padding: '8px 12px', outline: 'none', width: '100%',
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(200,216,228,0.3)', marginTop: 7 }}>
                    합계 수수료: {(feeForm.delivery_platform + feeForm.delivery_card).toFixed(1)}%
                  </div>
                </div>

                {/* 홀 채널 */}
                <div style={{ marginBottom: 22 }}>
                  <div style={{ fontSize: '0.72rem', color: '#4A8C6F', fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, marginBottom: 10, letterSpacing: '0.04em' }}>🏠 홀 채널</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxWidth: 160 }}>
                    <label style={{ fontSize: '0.65rem', color: 'rgba(200,216,228,0.5)', fontFamily: "'Noto Sans KR',sans-serif" }}>카드 수수료 (%)</label>
                    <input
                      value={feeForm.hall_card || ''}
                      inputMode="decimal"
                      placeholder="예: 1.5"
                      onChange={e => setFeeForm(prev => ({ ...prev, hall_card: parseFloat(e.target.value) || 0 }))}
                      style={{
                        background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(74,140,111,0.3)',
                        borderRadius: 9, color: 'white', fontFamily: "'Noto Sans KR',sans-serif",
                        fontWeight: 700, fontSize: '0.9rem', padding: '8px 12px', outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowFeeModal(false)} style={{
                    flex: 1, padding: '10px 0', background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
                    color: 'rgba(200,216,228,0.4)', fontFamily: "'Noto Sans KR',sans-serif",
                    fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                  }}>취소</button>
                  <button onClick={() => {
                    setFeeSettings(feeForm)
                    localStorage.setItem(FEES_KEY, JSON.stringify(feeForm))
                    setShowFeeModal(false)
                  }} style={{
                    flex: 1, padding: '10px 0', background: 'linear-gradient(135deg, #3A6FA5, #2A5080)',
                    border: 'none', borderRadius: 10, color: 'white',
                    fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                  }}>저장 ✓</button>
                </div>
              </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* 모바일 바텀시트 */}
        <AnimatePresence>
          {showPalette && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setShowPalette(false)}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 40 }} />
              <motion.div
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: '#111B27', borderRadius: '22px 22px 0 0', maxHeight: '72vh', overflowY: 'auto', paddingBottom: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
                  <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
                </div>
                <PalettePanel />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
