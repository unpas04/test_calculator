'use client'
import { Suspense, useState, useEffect } from 'react'
import SetBuilderProto from '@/components/SetBuilderProto'
import DashboardSidebar from '@/components/DashboardSidebar'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ProtoPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isMobile, setIsMobile] = useState(false)

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

  return (
    <>
      <style>{`
        @media (min-width: 769px) {
          .hamburger-btn { display: none !important; }
        }
      `}</style>
      {isMobile && (
        <DashboardSidebar
          user={user}
          onLogout={handleLogout}
          onReceiptUpload={() => {}}
          isOpen={sidebarOpen}
          onOpenChange={setSidebarOpen}
        />
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
