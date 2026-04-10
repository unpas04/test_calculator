'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Fridge from '@/components/Fridge'

export default function FridgePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [isGuest, setIsGuest] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // 게스트 모드 확인
    const guest = typeof window !== 'undefined' && sessionStorage.getItem('godogi_guest')
    console.log('[FridgePage] guest:', guest, 'isGuest:', !!guest)
    setIsGuest(!!guest)
    if (guest) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading && !isGuest) {
    return (
      <main style={{ minHeight: '100vh', background: '#0F1923', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(200,216,228,0.5)', fontFamily: "'Noto Sans KR',sans-serif", fontSize: '0.9rem' }}>
        🐟 불러오는 중...
      </main>
    )
  }

  if (!user && !isGuest) {
    return (
      <main style={{ minHeight: '100vh', background: '#0F1923', color: 'white', fontFamily: "'Noto Sans KR', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>🐟</div>
        <p style={{ fontSize: '0.9rem', marginBottom: 24, textAlign: 'center', color: 'rgba(200,216,228,0.6)' }}>냉장고를 사용하려면 로그인이 필요해요</p>
        <button onClick={() => router.push('/')}
          style={{
            background: '#4A7FA5', border: 'none',
            borderRadius: 14, padding: '12px 24px', color: 'white', fontSize: '0.9rem',
            cursor: 'pointer', fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700,
          }}
        >
          홈으로 돌아가기
        </button>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0F1923', color: 'white', fontFamily: "'Noto Sans KR', sans-serif", padding: '16px' }}>
      {/* 헤더 */}
      <div style={{ maxWidth: 680, margin: '0 auto', paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', color: '#7DB8D8',
            fontSize: '1.2rem', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32,
          }}
        >
          ←
        </button>
        <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, flex: 1 }}>🧊 냉장고</h1>
      </div>

      {/* 냉장고 컴포넌트 */}
      <div style={{ maxWidth: 680, margin: '0 auto', paddingTop: 16 }}>
        <Fridge user={user ?? undefined} />
      </div>
    </main>
  )
}
