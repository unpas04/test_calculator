import { Suspense } from 'react'
import SetBuilderProto from '@/components/SetBuilderProto'

export default function ProtoPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#0F1923', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(200,216,228,0.5)', fontFamily: "'Noto Sans KR',sans-serif", fontSize: '0.9rem' }}>
        🐟 불러오는 중...
      </div>
    }>
      <SetBuilderProto />
    </Suspense>
  )
}
