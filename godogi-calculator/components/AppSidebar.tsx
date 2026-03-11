'use client'
import Fridge from '@/components/Fridge'
import { useState } from 'react'

interface Menu {
  id: string
  name: string
  sale_price: number
  costRate?: number
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
        position: 'fixed', top: 16, left: 16, zIndex: 30,
        background: 'var(--navy)', color: '#fff',
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
        background: 'var(--navy)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0, left: 0,
        zIndex: 20,
        overflow: 'hidden',
        transition: 'transform 0.25s',
      }} className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>

        {/* 헤더 */}
        <div style={{ flexShrink: 0, padding: '24px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.4rem' }}>🐟</span>
              <span style={{ fontFamily: 'Black Han Sans', fontSize: '1rem', color: 'white', letterSpacing: '0.05em' }}>
                고독이의 원가계산기
              </span>
            </div>
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
              fontFamily: 'Black Han Sans', fontSize: '0.78rem',
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
            ) : menus.map(menu => (
              <div key={menu.id} onClick={() => { onSelect(menu.id); setIsOpen(false) }} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 10px', borderRadius: 10, marginBottom: 4,
                background: menu.id === currentId ? 'rgba(74,127,165,0.2)' : 'transparent',
                cursor: 'pointer', transition: 'background 0.15s'
              }}>
                <span>🍽️</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', color: 'white', fontFamily: 'Black Han Sans', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {menu.name || '이름 없는 메뉴'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(200,216,228,0.4)' }}>
                    {menu.sale_price > 0 ? `원가율 ${menu.costRate?.toFixed(1)}%` : '판매가 미입력'}
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); onDelete(menu.id) }} style={{
                  background: 'none', border: 'none',
                  color: 'rgba(200,216,228,0.2)', cursor: 'pointer', fontSize: '0.8rem'
                }}>✕</button>
              </div>
            ))}
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
            fontFamily: 'Black Han Sans', fontSize: '0.85rem',
            cursor: 'pointer', letterSpacing: '0.03em'
          }}>＋ 새 메뉴 추가</button>
          <button onClick={onLogout} style={{
            width: '100%', padding: '8px 0',
            background: 'transparent', color: 'rgba(200,216,228,0.3)',
            border: '1px solid rgba(200,216,228,0.1)', borderRadius: 10,
            fontFamily: 'Gowun Dodum', fontSize: '0.78rem',
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