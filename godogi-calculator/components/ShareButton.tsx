'use client'

import { useState } from 'react'

const BASE_URL = 'https://godogicalculator.vercel.app'

interface ShareButtonProps {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  style?: React.CSSProperties
}

declare global {
  interface Window {
    Kakao?: any
  }
}

function buildShareUrl(params: { utm_source: string; utm_medium: string; utm_campaign: string }) {
  const url = new URL(BASE_URL)
  url.searchParams.set('utm_source', params.utm_source)
  url.searchParams.set('utm_medium', params.utm_medium)
  url.searchParams.set('utm_campaign', params.utm_campaign)
  return url.toString()
}

function trackShare(method: string) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    ;(window as any).gtag('event', 'share', {
      method,
      content_type: 'app',
      item_id: 'godogi_calculator',
    })
  }
}

export default function ShareButton({
  utm_source = 'kakao',
  utm_medium = 'social',
  utm_campaign = 'share',
  style,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)

  const shareUrl = buildShareUrl({ utm_source, utm_medium, utm_campaign })

  const shareToKakao = () => {
    const kakao = window.Kakao
    if (!kakao?.isInitialized()) {
      // SDK 없으면 링크 복사로 fallback
      copyLink()
      return
    }

    kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: '고독이의 원가계산기 🐟',
        description: '배달 수수료·인건비 포함 실원가를 한 번에 계산해보세요!',
        imageUrl: `${BASE_URL}/opengraph-image`,
        imageWidth: 1200,
        imageHeight: 630,
        link: {
          mobileWebUrl: shareUrl,
          webUrl: shareUrl,
        },
      },
      buttons: [
        {
          title: '원가 계산하러 가기',
          link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
        },
      ],
    })
    trackShare('kakao')
    setOpen(false)
  }

  const copyLink = async () => {
    const copyUrl = buildShareUrl({ utm_source: 'copy', utm_medium: 'referral', utm_campaign: 'share' })
    try {
      await navigator.clipboard.writeText(copyUrl)
    } catch {
      // clipboard API 실패 시 직접 선택
      const el = document.createElement('textarea')
      el.value = copyUrl
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    trackShare('copy_link')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(74,127,165,0.15)',
          border: '1px solid rgba(74,127,165,0.3)',
          borderRadius: 8, padding: '6px 12px',
          color: '#7DB8D8', fontFamily: "'Noto Sans KR', sans-serif",
          fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
          ...style,
        }}
      >
        {copied ? '✓ 복사됨' : '공유 ↗'}
      </button>

      {open && (
        <>
          {/* 외부 클릭 닫기 */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 49 }}
          />
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0,
            background: '#1A2840', border: '1px solid rgba(74,127,165,0.25)',
            borderRadius: 12, padding: 8, zIndex: 50,
            display: 'flex', flexDirection: 'column', gap: 4,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            minWidth: 160,
          }}>
            <button onClick={shareToKakao} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#FEE500', border: 'none', borderRadius: 8,
              padding: '9px 14px', cursor: 'pointer',
              fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700,
              fontSize: '0.82rem', color: '#3C1E1E', whiteSpace: 'nowrap',
            }}>
              <span style={{ fontSize: '1rem' }}>💬</span> 카카오톡으로 공유
            </button>
            <button onClick={copyLink} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 8,
              padding: '9px 14px', cursor: 'pointer',
              fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700,
              fontSize: '0.82rem', color: 'rgba(200,216,228,0.7)', whiteSpace: 'nowrap',
            }}>
              <span style={{ fontSize: '1rem' }}>🔗</span> 링크 복사
            </button>
          </div>
        </>
      )}
    </div>
  )
}
