'use client'
import { Suspense, useState, useEffect } from 'react'
import SetBuilderProto from '@/components/SetBuilderProto'
import DashboardSidebar from '@/components/DashboardSidebar'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

export default function ProtoPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [isGuest, setIsGuest] = useState(false)
  const [showReceiptLoginModal, setShowReceiptLoginModal] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('godogi_guest')) {
      setIsGuest(true)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    // 인증 상태 변경 감시
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription?.unsubscribe()
  }, [])

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 769)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  const handleReceiptResult = (data: any) => {
    if (data?.showLoginModal) {
      setShowReceiptLoginModal(true)
      return
    }
  }

  return (
    <>
      <style>{`
        @media (min-width: 769px) {
          .hamburger-btn { display: none !important; }
          .dashboard-sidebar { display: none !important; }
        }
      `}</style>
      <DashboardSidebar
        user={user}
        isGuest={isGuest}
        onLogout={handleLogout}
        onReceiptUpload={handleReceiptResult}
        isOpen={sidebarOpen}
        onOpenChange={setSidebarOpen}
      />

      {/* 영수증 로그인 모달 */}
      {showReceiptLoginModal && (
        <>
          <div onClick={() => setShowReceiptLoginModal(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 40, backdropFilter: 'blur(4px)' }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            background: 'linear-gradient(135deg, #1A2840 0%, #0F1923 100%)',
            borderRadius: 20, padding: '32px 28px', zIndex: 50,
            width: '80%', maxWidth: 420, boxSizing: 'border-box',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 1px rgba(74,127,165,0.3)',
            border: '1px solid rgba(74,127,165,0.15)',
          }}>
            <button onClick={() => setShowReceiptLoginModal(false)} style={{
              position: 'absolute', top: 12, right: 12,
              background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
              color: 'rgba(200,216,228,0.5)', cursor: 'pointer', fontSize: '1.2rem',
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>✕</button>

            <div style={{ textAlign: 'center', paddingTop: 8 }}>
              <div style={{ fontSize: '3.5rem', marginBottom: 20 }}>🐟</div>
              <h2 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', fontWeight: 700, color: 'white', fontFamily: "'Noto Sans KR',sans-serif" }}>로그인이 필요해요</h2>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(200,216,228,0.65)', fontFamily: "'Noto Sans KR',sans-serif", lineHeight: 1.7, marginBottom: 28 }}>
                영수증을 촬영하면<br />
                재료가 자동으로 인식돼요.<br />
                <span style={{ color: 'rgba(200,216,228,0.5)', fontSize: '0.85rem' }}>로그인해서 쉽게 저장하세요!</span>
              </p>
            </div>

            <button onClick={loginWithGoogle} style={{
              width: '100%', padding: '14px 0',
              background: 'linear-gradient(135deg, #4A7FA5 0%, #2D5A7B 100%)',
              border: '1px solid rgba(74,127,165,0.5)',
              borderRadius: 12, color: 'white', fontSize: '0.95rem', fontWeight: 700,
              cursor: 'pointer', fontFamily: "'Noto Sans KR',sans-serif",
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 15px rgba(74,127,165,0.2)',
            }} onMouseOver={(e) => {
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(74,127,165,0.3)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }} onMouseOut={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(74,127,165,0.2)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}>
              <span>🔐</span>
              Google로 로그인
            </button>

            <button onClick={() => setShowReceiptLoginModal(false)} style={{
              width: '100%', padding: '12px 0', marginTop: 10,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(200,216,228,0.15)',
              borderRadius: 12, color: 'rgba(200,216,228,0.6)', fontSize: '0.9rem', fontWeight: 600,
              cursor: 'pointer', fontFamily: "'Noto Sans KR',sans-serif",
              transition: 'all 0.2s ease',
            }} onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
              e.currentTarget.style.color = 'rgba(200,216,228,0.8)'
            }} onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
              e.currentTarget.style.color = 'rgba(200,216,228,0.6)'
            }}>
              닫기
            </button>
          </div>
        </>
      )}
      <main style={{ flex: 1, overflow: 'auto' }}>
        <Suspense fallback={
          <div style={{ minHeight: '100vh', background: '#0F1923', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(200,216,228,0.5)', fontFamily: "'Noto Sans KR',sans-serif", fontSize: '0.9rem' }}>
            🐟 불러오는 중...
          </div>
        }>
          <SetBuilderProto onOpenSidebar={() => setSidebarOpen(true)} />
        </Suspense>
      </main>
    </>
  )
}
