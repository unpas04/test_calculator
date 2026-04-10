'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  user: any
  isGuest?: boolean
  onLogout: () => void
  onReceiptUpload: (result: any) => void
  receiptLoading?: boolean
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  onNavigateMenu?: (target: 'sets' | 'menus') => void
  onShowRecipes?: (show: boolean) => void
  onShowTutorial?: () => void
}

export default function DashboardSidebar({ user, isGuest = false, onLogout, onReceiptUpload, receiptLoading = false, isOpen: externalIsOpen = false, onOpenChange, onNavigateMenu, onShowRecipes, onShowTutorial }: Props) {
  const [isOpen, setIsOpen] = useState(externalIsOpen)

  // 외부에서 제어되는 경우 동기화
  useEffect(() => {
    console.log('[DashboardSidebar] externalIsOpen changed:', externalIsOpen)
    setIsOpen(externalIsOpen)
  }, [externalIsOpen])

  useEffect(() => {
    console.log('[DashboardSidebar] user:', user)
  }, [user])

  const router = useRouter()
  const receiptInputRef = useRef<HTMLInputElement>(null)

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (!files || files.length === 0 || !user) return

    try {
      const formData = new FormData()
      for (let i = 0; i < files.length; i++) formData.append('images', files[i])
      formData.append('userId', user.id)

      const response = await fetch('/api/ocr', { method: 'POST', body: formData })
      if (!response.ok) throw new Error(`OCR failed: ${response.status}`)
      const data = await response.json()

      onReceiptUpload(data)
    } catch (err) {
      alert('영수증 처리 실패: ' + (err instanceof Error ? err.message : '알 수 없는 오류'))
    } finally {
      if (receiptInputRef.current) receiptInputRef.current.value = ''
    }
  }

  const handleNavigate = (target: string) => {
    onOpenChange?.(false)

    if (target === 'dashboard') {
      onNavigateMenu?.('sets')
      onShowRecipes?.(false)
    } else if (target === 'menu-panel') {
      onNavigateMenu?.('sets')
      onShowRecipes?.(false)
    } else if (target === 'recipes') {
      onNavigateMenu?.('sets')
      onShowRecipes?.(true)
    } else if (target === 'fridge') {
      router.push('/fridge')
    } else if (target === 'suppliers' || target === 'employees') {
      // 준비 중 토스트 (향후 구현)
      alert(`${target === 'suppliers' ? '거래처' : '인건비'}관리는 준비 중이에요 🐟`)
    }
  }

  const dashboardItem = { id: 'dashboard', label: '대시보드', target: 'dashboard' }

  const managementItems = [
    { id: 'menu-panel', label: '메뉴판 관리', target: 'menu-panel', dividerAfter: false },
    {
      id: 'recipes', label: '레시피 관리', target: 'recipes', dividerAfter: false, children: [
        { id: 'fridge', label: '냉장고', target: 'fridge' },
      ]
    },
  ]

  const businessItems = [
    { id: 'suppliers', label: '거래처 관리', target: 'suppliers', dividerAfter: false },
    { id: 'employees', label: '인건비 관리', target: 'employees', dividerAfter: false },
  ]

  return (
    <>
      {/* 오버레이 (모바일) */}
      {isOpen && (
        <div onClick={() => onOpenChange?.(false)} style={{
          position: 'fixed', inset: 0, zIndex: 15,
          background: 'rgba(0,0,0,0.4)',
          display: 'none'
        }} className="dashboard-sidebar-overlay" />
      )}

      {/* 사이드바 */}
      <aside style={{
        width: 240,
        height: '100vh',
        background: '#1A2840',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0, left: 0,
        zIndex: 50,
        overflow: 'hidden',
        transition: 'transform 0.25s',
      }} className={`dashboard-sidebar ${isOpen ? 'dashboard-sidebar-open' : ''}`}>

        {/* 헤더 */}
        <div style={{
          flexShrink: 0,
          padding: '24px 16px',
          background: 'linear-gradient(135deg, rgba(74,127,165,0.1), rgba(91,158,201,0.05))',
          borderBottom: '1px solid rgba(74,127,165,0.2)',
          borderRadius: '0 0 16px 0'
        }}>
          {/* 로고 + 제목 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <ellipse cx="50" cy="55" rx="32" ry="22" fill="#4A7FA5" />
              <ellipse cx="50" cy="53" rx="30" ry="20" fill="#5B9EC9" />
              <polygon points="82,55 100,40 100,70" fill="#4A7FA5" />
              <ellipse cx="46" cy="58" rx="18" ry="12" fill="#C8E6F5" />
              <circle cx="35" cy="48" r="5" fill="white" />
              <circle cx="35" cy="48" r="3" fill="#1E2D40" />
              <circle cx="36" cy="47" r="1" fill="white" />
              <path d="M 28 56 Q 32 60 36 56" stroke="#1E2D40" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              <ellipse cx="50" cy="33" rx="10" ry="6" fill="#4A7FA5" transform="rotate(-10 50 33)" />
              <ellipse cx="30" cy="52" rx="4" ry="2.5" fill="#F4A0A0" opacity="0.6" />
            </svg>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'white', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                고독이의
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#7DB8D8', lineHeight: 1.2 }}>
                원가계산기
              </div>
            </div>
            {/* 닫기 버튼 (모바일) */}
            <button onClick={() => setIsOpen(false)} style={{
              background: 'rgba(255,255,255,0.1)', border: 'none', color: 'rgba(200,216,228,0.6)',
              cursor: 'pointer', fontSize: '1.2rem', display: 'none', flexShrink: 0,
              width: 32, height: 32, borderRadius: 8, transition: '0.2s'
            }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'white' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(200,216,228,0.6)' }}
              className="dashboard-sidebar-close">✕</button>
          </div>

          {/* 이메일 */}
          {user?.email && (
            <div style={{
              padding: '10px 12px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(74,127,165,0.2)',
              borderRadius: 8,
              fontSize: '0.75rem',
              color: 'rgba(200,216,228,0.6)',
              wordBreak: 'break-all',
              lineHeight: 1.4,
              fontWeight: 500
            }}>
              {user.email}
            </div>
          )}
        </div>

        {/* 메뉴 */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
          {/* 대시보드 */}
          <div style={{ padding: '8px 12px' }}>
            <button
              onClick={() => handleNavigate(dashboardItem.target)}
              style={{
                width: '100%', textAlign: 'left', padding: '12px 16px',
                background: 'transparent',
                border: 'none',
                borderRadius: 12, color: 'rgba(200,216,228,0.8)',
                fontSize: '0.9rem', fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,127,165,0.08)'
                  ; (e.currentTarget as HTMLButtonElement).style.color = 'white'
                  ; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(74,127,165,0.2)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                  ; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(200,216,228,0.8)'
                  ; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              {dashboardItem.label}
            </button>
          </div>

          {/* 구분선 */}
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '8px 0' }} />

          {/* 관리 섹션 (메뉴판, 레시피) */}
          <div style={{ padding: '8px 12px' }}>
            {managementItems.map(item => (
              <div key={item.id}>
                <button
                  onClick={() => handleNavigate(item.target)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '12px 16px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 12, color: 'rgba(200,216,228,0.8)',
                    fontSize: '0.9rem', fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 500,
                    cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    marginBottom: '8px',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,127,165,0.08)'
                      ; (e.currentTarget as HTMLButtonElement).style.color = 'white'
                      ; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(74,127,165,0.2)'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                      ; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(200,216,228,0.8)'
                      ; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                >
                  {item.label}
                </button>
                {/* 서브메뉴 */}
                {item.children && (
                  <div style={{ marginTop: '4px', paddingLeft: '12px' }}>
                    {item.children.map(child => (
                      <button
                        key={child.id}
                        onClick={() => handleNavigate(child.target)}
                        style={{
                          width: '100%', textAlign: 'left', padding: '10px 12px',
                          background: 'transparent', border: 'none',
                          borderRadius: 8, color: 'rgba(200,216,228,0.6)',
                          fontSize: '0.85rem', fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 400,
                          cursor: 'pointer', transition: 'all 0.15s',
                          display: 'flex', alignItems: 'center', gap: '8px'
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,127,165,0.12)'
                            ; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(200,216,228,0.9)'
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                            ; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(200,216,228,0.6)'
                        }}
                      >
                        <span style={{ fontSize: '0.75rem', marginRight: '2px' }}>└</span>
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 구분선 */}
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '8px 0' }} />

          {/* 비즈니스 섹션 (거래처, 인건비) */}
          <div style={{ padding: '8px 12px' }}>
            {businessItems.map(item => (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.target)}
                style={{
                  width: '100%', textAlign: 'left', padding: '12px 16px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 12, color: 'rgba(200,216,228,0.8)',
                  fontSize: '0.9rem', fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  marginBottom: '8px',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,127,165,0.08)'
                    ; (e.currentTarget as HTMLButtonElement).style.color = 'white'
                    ; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(74,127,165,0.2)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                    ; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(200,216,228,0.8)'
                    ; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        {/* 영수증 촬영 섹션 */}
        <div style={{ flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.1)', padding: '16px' }}>
          <button
            onClick={() => {
              if (isGuest) {
                onReceiptUpload({ showLoginModal: true })
                return
              }
              receiptInputRef.current?.click()
            }}
            disabled={receiptLoading}
            style={{
              width: '100%', padding: '12px 16px',
              background: 'rgba(74,127,165,0.15)', border: '1px solid rgba(74,127,165,0.3)',
              borderRadius: 6, color: receiptLoading ? 'rgba(200,216,228,0.3)' : 'white',
              fontSize: '0.9rem', fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 500,
              cursor: receiptLoading ? 'not-allowed' : 'pointer', opacity: receiptLoading ? 0.5 : 1,
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
            onMouseEnter={e => {
              if (!receiptLoading) {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,127,165,0.25)'
                  ; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(74,127,165,0.5)'
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,127,165,0.15)'
                ; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(74,127,165,0.3)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" fill="currentColor" />
              <path d="M20 4H16.82C16.4 2.84 15.3 2 14 2H10C8.7 2 7.6 2.84 7.18 4H4C2.9 4 2 4.9 2 6V20C2 21.1 2.9 22 4 22H20C21.1 22 22 21.1 22 20V6C22 4.9 21.1 4 20 4ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17Z" fill="currentColor" />
            </svg>
            {receiptLoading ? '처리 중...' : '영수증 촬영'}
          </button>
          <div style={{ marginTop: '10px', fontSize: '0.75rem', color: 'rgba(200,216,228,0.5)', lineHeight: 1.5 }}>
            영수증을 촬영하면 재료 정보를 자동으로 인식해 냉장고에 추가할 수 있어요.<br />거래처 정보도 함께 관리됩니다.
          </div>
        </div>

        {/* 하단 버튼들 */}
        <div style={{ flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.1)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* 사용설명서 버튼 */}
          <button
            onClick={() => {
              onShowTutorial?.()
              setIsOpen(false)
            }}
            style={{
              width: '100%', padding: '12px 16px',
              background: 'rgba(74,127,165,0.2)', border: '1px solid rgba(74,127,165,0.3)',
              borderRadius: 6, color: '#7DB8D8',
              fontSize: '0.9rem', fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,127,165,0.3)'
                ; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(74,127,165,0.5)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,127,165,0.2)'
                ; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(74,127,165,0.3)'
            }}
          >
            📖 사용설명서
          </button>

          {/* 로그아웃 버튼 */}
          <button
            onClick={onLogout}
            style={{
              width: '100%', padding: '12px 16px',
              background: '#C44A4A', border: 'none',
              borderRadius: 6, color: 'white',
              fontSize: '0.9rem', fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = '#D35A5A'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = '#C44A4A'
            }}
          >
            로그아웃
          </button>
        </div>
      </aside>

      {/* 숨겨진 파일 입력 */}
      <input
        ref={receiptInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleReceiptUpload}
        style={{ display: 'none' }}
      />

      <style>{`
        @media (max-width: 768px) {
          .dashboard-sidebar-toggle { display: block !important; }
          .dashboard-sidebar-overlay { display: block !important; }
          .dashboard-sidebar-close { display: block !important; }
          .dashboard-sidebar { transform: translateX(-100%); }
          .dashboard-sidebar-open { transform: translateX(0) !important; }
        }
      `}</style>
    </>
  )
}
