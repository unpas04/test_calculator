'use client'
import Fridge from '@/components/Fridge'
import { useState } from 'react'
import Link from 'next/link'

interface Menu {
  id: string
  name: string
  category?: string
  emoji?: string
  sale_price: number
  costRate?: number
  subLabel?: string
}

const CAT_ORDER = ['main', 'side', 'banchan', 'drink', 'extra'] as const
const CAT_LABEL: Record<string, string> = {
  main: '메인메뉴', side: '사이드메뉴', banchan: '반찬', drink: '음료', extra: '기타',
}
const CAT_COLOR: Record<string, string> = {
  main: '#4A7FA5', side: '#4A8C6F', banchan: '#C44A4A', drink: '#9B6B9B', extra: '#C8843A',
}

interface Props {
  menus: Menu[]
  currentId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  user: any
  onLogout: () => void
}

export default function Sidebar({ menus, currentId, onSelect, onNew, onDelete, user, onLogout }: Props) {
  const [tab, setTab] = useState<'menu' | 'fridge'>('menu')
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* 모바일 토글 버튼 */}
      <button onClick={() => setIsOpen(!isOpen)} style={{
        position: 'fixed', top: 12, left: 12, zIndex: 30,
        background: '#1A2840', color: '#fff',
        border: 'none', borderRadius: 10,
        padding: '8px 12px', fontSize: '1.1rem', cursor: 'pointer',
        display: 'none'
      }} className="sidebar-toggle">☰</button>

      {/* 오버레이 (모바일) */}
      {isOpen && (
        <div onClick={() => setIsOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 15,
          background: 'rgba(0,0,0,0.4)',
          display: 'none'
        }} className="sidebar-overlay" />
      )}

      <aside style={{
        width: 260,
        height: '100vh',
        background: '#1A2840',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0, left: 0,
        zIndex: 20,
        overflow: 'hidden',
        transition: 'transform 0.25s',
      }} className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>

        {/* 헤더 */}
        <div style={{ flexShrink: 0, padding: '48px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', cursor: 'pointer' }}>
              <svg width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
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
              <span style={{ fontFamily: 'var(--font-geist-sans)', fontWeight: 700, fontSize: '1rem', color: 'white', letterSpacing: '-0.01em' }}>
                고독이의 원가계산기
              </span>
            </Link>
            {/* 닫기 버튼 (모바일) */}
            <button onClick={() => setIsOpen(false)} style={{
              background: 'none', border: 'none', color: 'rgba(200,216,228,0.4)',
              cursor: 'pointer', fontSize: '1.1rem', display: 'none'
            }} className="sidebar-close">✕</button>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(200,216,228,0.4)', paddingLeft: 2, marginTop: 4 }}>
            {user?.email}
          </div>
        </div>

        {/* 탭 */}
        <div style={{ flexShrink: 0, display: 'flex', padding: '10px 10px 0', gap: 6 }}>
          {(['menu', 'fridge'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '7px 0',
              background: tab === t ? 'rgba(74,127,165,0.25)' : 'transparent',
              border: 'none', borderRadius: 8,
              color: tab === t ? 'var(--blue-light)' : 'rgba(200,216,228,0.35)',
              fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: '0.78rem',
              cursor: 'pointer', letterSpacing: '0.04em'
            }}>
              {t === 'menu' ? '🍽️ 메뉴' : '🧊 냉장고'}
            </button>
          ))}
        </div>

        {/* 메뉴 패널 */}
        {tab === 'menu' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px 0' }}>
            {menus.length === 0 ? (
              <div style={{ padding: '20px 12px', textAlign: 'center', color: 'rgba(200,216,228,0.3)', fontSize: '0.78rem' }}>
                저장된 메뉴가 없어요<br />새 메뉴를 추가해보세요
              </div>
            ) : CAT_ORDER.map(cat => {
              const items = menus.filter(m => (m.category || 'main') === cat)
              if (items.length === 0) return null
              return (
                <div key={cat}>
                  <div style={{
                    fontSize: '0.6rem', fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700,
                    color: CAT_COLOR[cat], letterSpacing: '0.08em',
                    padding: '10px 10px 4px',
                  }}>{CAT_LABEL[cat]}</div>
                  {items.map(menu => (
                    <div key={menu.id} onClick={() => { onSelect(menu.id); setIsOpen(false) }} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px', borderRadius: 10, marginBottom: 2,
                      background: menu.id === currentId ? 'rgba(74,127,165,0.2)' : 'transparent',
                      cursor: 'pointer', transition: 'background 0.15s'
                    }}>
                      <span style={{ fontSize: '1rem', width: 22, textAlign: 'center', flexShrink: 0 }}>{menu.emoji || '🍽️'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.83rem', color: 'white', fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {menu.name || '이름 없는 메뉴'}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'rgba(200,216,228,0.4)' }}>
                          {menu.subLabel ?? (menu.sale_price > 0 ? `원가율 ${menu.costRate?.toFixed(1)}%` : '판매가 미입력')}
                        </div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); onDelete(menu.id) }} style={{
                        background: 'none', border: 'none',
                        color: 'rgba(200,216,228,0.2)', cursor: 'pointer', fontSize: '0.8rem'
                      }}>✕</button>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}

        {/* 냉장고 패널 */}
        {tab === 'fridge' && <Fridge user={user} />}

        {/* 하단 버튼 */}
        <div style={{ flexShrink: 0, padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={onNew} style={{
            width: '100%', padding: '10px 0',
            background: 'var(--blue)', color: 'white',
            border: 'none', borderRadius: 10,
            fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: '0.85rem',
            cursor: 'pointer', letterSpacing: '0.03em'
          }}>＋ 추가</button>
          <button onClick={onLogout} style={{
            width: '100%', padding: '8px 0',
            background: 'transparent', color: 'rgba(200,216,228,0.3)',
            border: '1px solid rgba(200,216,228,0.1)', borderRadius: 10,
            fontFamily: "'Noto Sans KR', sans-serif", fontSize: '0.78rem',
            cursor: 'pointer'
          }}>로그아웃</button>
        </div>
      </aside>

      <style>{`
        @media (max-width: 768px) {
          .sidebar-toggle { display: block !important; }
          .sidebar-overlay { display: block !important; }
          .sidebar-close { display: block !important; }
          .sidebar { transform: translateX(-100%); }
          .sidebar-open { transform: translateX(0) !important; }
        }
      `}</style>
    </>
  )
}