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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <div style={{ display: 'flex' }}>
      <DashboardSidebar
        user={user}
        onLogout={handleLogout}
        onReceiptUpload={() => {}}
        isOpen={sidebarOpen}
        onOpenChange={setSidebarOpen}
      />
      <Suspense fallback={
        <div style={{ minHeight: '100vh', background: '#0F1923', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(200,216,228,0.5)', fontFamily: "'Noto Sans KR',sans-serif", fontSize: '0.9rem' }}>
          🐟 불러오는 중...
        </div>
      }>
        <SetBuilderProto onOpenSidebar={() => setSidebarOpen(true)} />
      </Suspense>
    </div>
  )
}
