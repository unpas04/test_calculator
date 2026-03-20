import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = '고독이의 원가계산기 — 우리 메뉴, 진짜로 남는 장사일까요?'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0D1826 0%, #1A2840 55%, #1E3550 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* 배경 장식 원 */}
        <div style={{
          position: 'absolute', width: 500, height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(74,127,165,0.12) 0%, transparent 70%)',
          top: -100, right: -80, display: 'flex',
        }} />
        <div style={{
          position: 'absolute', width: 400, height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(74,127,165,0.08) 0%, transparent 70%)',
          bottom: -60, left: -60, display: 'flex',
        }} />

        {/* 물고기 로고 SVG */}
        <svg width="96" height="96" viewBox="0 0 100 100" fill="none" style={{ marginBottom: 28 }}>
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

        {/* 제목 */}
        <div style={{
          color: 'white', fontSize: 64, fontWeight: 700,
          letterSpacing: '-0.02em', marginBottom: 18,
        }}>
          고독이의 원가계산기
        </div>

        {/* 부제목 */}
        <div style={{
          color: 'rgba(200,216,228,0.75)', fontSize: 30,
          marginBottom: 48, fontWeight: 500,
          letterSpacing: '-0.01em',
        }}>
          우리 메뉴, 진짜로 남는 장사일까요?
        </div>

        {/* 태그 3개 */}
        <div style={{ display: 'flex', gap: 16 }}>
          {['🧾 메뉴 원가 자동계산', '🚗 배달 수수료 반영', '📊 원가율 한눈에'].map(tag => (
            <div key={tag} style={{
              background: 'rgba(74,127,165,0.25)',
              border: '1px solid rgba(74,127,165,0.45)',
              borderRadius: 40, padding: '10px 22px',
              color: '#7DB8D8', fontSize: 22, fontWeight: 600,
              display: 'flex',
            }}>{tag}</div>
          ))}
        </div>

        {/* 하단 URL */}
        <div style={{
          position: 'absolute', bottom: 36,
          color: 'rgba(200,216,228,0.3)', fontSize: 20,
          display: 'flex',
        }}>
          godogicalculator.vercel.app
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
