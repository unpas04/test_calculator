'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function Tutorial({ isOpen, onClose }: Props) {
  const [step, setStep] = useState(0)

  const steps = [
    {
      title: '영수증 사진 + 레시피 입력',
      subtitle: '= 매장 원가계산 끝!',
      content: (
        <>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.8, color: 'rgba(200,216,228,0.8)', marginBottom: 12 }}>
            🐟 안녕하세요! 저는 고독이예요.
          </p>
          <p style={{ fontSize: '0.9rem', lineHeight: 1.8, color: 'rgba(200,216,228,0.7)' }}>
            음식점 사장님들이 <strong>진짜 남는 돈</strong>을 알 수 있도록 도와주는 앱입니다.
          </p>
          <p style={{ fontSize: '0.9rem', lineHeight: 1.8, color: 'rgba(200,216,228,0.7)', marginTop: 16 }}>
            배달 수수료, 카드 수수료, 인건비까지 모두 포함해서 원가를 계산해줘요.
          </p>
          <div style={{ background: 'rgba(74,127,165,0.15)', borderRadius: 12, padding: 14, marginTop: 20, border: '1px solid rgba(125,184,216,0.3)' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#7DB8D8' }}>지금부터 3단계로 나누어 설명해드릴게요!</p>
          </div>
        </>
      ),
    },
    {
      title: '1. 한눈에 보는 수익성',
      subtitle: '대시보드에서 시작하세요',
      content: (
        <>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.8, color: 'rgba(200,216,228,0.8)', marginBottom: 12 }}>
            🐟 대시보드는 당신의 매장 현황판이에요.
          </p>
          <div style={{ background: 'rgba(74,127,165,0.1)', borderRadius: 12, padding: 14, marginBottom: 12 }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#7DB8D8', marginBottom: 6 }}>✓ 원가율이 높은 상품부터</p>
            <p style={{ fontSize: '0.8rem', color: 'rgba(200,216,228,0.6)' }}>
              가장 이윤 좋은 메뉴 5개를 한눈에 볼 수 있어요
            </p>
          </div>
          <div style={{ background: 'rgba(74,127,165,0.1)', borderRadius: 12, padding: 14, marginBottom: 12 }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#7DB8D8', marginBottom: 6 }}>✓ 매월 변동비 자동 계산</p>
            <p style={{ fontSize: '0.8rem', color: 'rgba(200,216,228,0.6)' }}>
              메뉴판을 구성하면 매달 얼마나 남을지 자동으로 계산돼요
            </p>
          </div>
          <div style={{ background: 'rgba(74,127,165,0.1)', borderRadius: 12, padding: 14 }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#7DB8D8', marginBottom: 6 }}>✓ 세트메뉴 판매가 쉽게</p>
            <p style={{ fontSize: '0.8rem', color: 'rgba(200,216,228,0.6)' }}>
              목표 이윤을 정하면 판매가를 자동으로 제안해줘요
            </p>
          </div>
        </>
      ),
    },
    {
      title: '2. 레시피 관리',
      subtitle: '메뉴의 재료 구성을 등록하세요',
      content: (
        <>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.8, color: 'rgba(200,216,228,0.8)', marginBottom: 16 }}>
            🐟 "떡볶이를 8,000원에 팔고 있는데, 진짜 남는 게 얼마일까요?"
          </p>
          <p style={{ fontSize: '0.9rem', lineHeight: 1.8, color: 'rgba(200,216,228,0.7)', marginBottom: 16 }}>
            이 질문에 답하려면 떡볶이에 들어가는 모든 재료를 정확히 알아야 해요.
          </p>
          <div style={{ background: '#1E2D40', borderRadius: 12, padding: 12, marginBottom: 12 }}>
            <p style={{ fontSize: '0.82rem', color: '#7DB8D8', fontWeight: 700, marginBottom: 8 }}>떡볶이 예시:</p>
            <p style={{ fontSize: '0.78rem', color: 'rgba(200,216,228,0.7)', lineHeight: 1.6 }}>
              • 떡 100g<br />
              • 고추장 2큰술<br />
              • 계란 1개<br />
              • 파 한줌<br />
              • 버터 1큰술
            </p>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'rgba(200,216,228,0.6)' }}>
            🧊 냉장고에서 재료를 선택하고, 사용량을 입력하면 된답니다!
          </p>
        </>
      ),
    },
    {
      title: '3. 냉장고',
      subtitle: '원재료 정보를 체계적으로 관리하세요',
      content: (
        <>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.8, color: 'rgba(200,216,228,0.8)', marginBottom: 16 }}>
            🐟 냉장고는 당신의 원재료 보관소예요.
          </p>
          <div style={{ background: 'rgba(74,127,165,0.1)', borderRadius: 12, padding: 14, marginBottom: 12 }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#7DB8D8', marginBottom: 6 }}>사용하는 모든 재료 등록</p>
            <p style={{ fontSize: '0.8rem', color: 'rgba(200,216,228,0.6)' }}>
              밀가루, 계란, 고추장, 버터, 파 등 모든 원재료를 저장해요
            </p>
          </div>
          <div style={{ background: 'rgba(74,127,165,0.1)', borderRadius: 12, padding: 14, marginBottom: 12 }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#7DB8D8', marginBottom: 6 }}>가격과 중량 기록</p>
            <p style={{ fontSize: '0.8rem', color: 'rgba(200,216,228,0.6)' }}>
              "버터 500g 12,000원" 처럼 상세하게 기록하면<br />
              100g당 원가가 자동으로 계산돼요
            </p>
          </div>
          <div style={{ background: 'rgba(74,127,165,0.1)', borderRadius: 12, padding: 14 }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#7DB8D8', marginBottom: 6 }}>🐟 레시피와 연결</p>
            <p style={{ fontSize: '0.8rem', color: 'rgba(200,216,228,0.6)' }}>
              냉장고의 재료로 레시피를 만들면<br />
              정확한 원가가 자동으로 계산됩니다!
            </p>
          </div>
        </>
      ),
    },
    {
      title: '+ 영수증 촬영 (선택)',
      subtitle: '원재료 정보를 한번에 저장하세요',
      content: (
        <>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.8, color: 'rgba(200,216,228,0.8)', marginBottom: 16 }}>
            🐟 이마트에서 떡 5kg을 15,000원에 샀다면?
          </p>
          <p style={{ fontSize: '0.9rem', lineHeight: 1.8, color: 'rgba(200,216,228,0.7)', marginBottom: 16 }}>
            매번 수기로 입력하기는 너무 번거로워요. 그래서 준비했어요!
          </p>
          <div style={{ background: 'rgba(125,184,216,0.15)', borderRadius: 12, padding: 14, marginBottom: 12, border: '1px solid rgba(125,184,216,0.3)' }}>
            <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#7DB8D8', marginBottom: 8 }}>📸 영수증 사진 찍기</p>
            <p style={{ fontSize: '0.82rem', lineHeight: 1.6, color: 'rgba(200,216,228,0.8)' }}>
              냉장고의 "📸 영수증촬영" 버튼을 누르고 사진을 찍으면
            </p>
          </div>
          <div style={{ background: 'rgba(125,184,216,0.15)', borderRadius: 12, padding: 14, marginBottom: 12, border: '1px solid rgba(125,184,216,0.3)' }}>
            <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#7DB8D8', marginBottom: 8 }}>✨ AI가 자동 인식</p>
            <p style={{ fontSize: '0.82rem', lineHeight: 1.6, color: 'rgba(200,216,228,0.8)' }}>
              영수증의 상품명, 가격, 수량을 AI가 자동으로 읽어줘요
            </p>
          </div>
          <div style={{ background: 'rgba(125,184,216,0.15)', borderRadius: 12, padding: 14, marginBottom: 12, border: '1px solid rgba(125,184,216,0.3)' }}>
            <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#7DB8D8', marginBottom: 8 }}>💾 한번에 저장</p>
            <p style={{ fontSize: '0.82rem', lineHeight: 1.6, color: 'rgba(200,216,228,0.8)' }}>
              확인 후 저장 버튼만 누르면 끝!
            </p>
          </div>
          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#7DB8D8', marginTop: 12 }}>* 직접 수기로 등록도 가능해요.</p>
        </>
      ),
    },
    {
      title: '축하합니다! 🎉',
      subtitle: '이제 시작할 준비가 됐어요',
      content: (
        <>
          <p style={{ fontSize: '1rem', lineHeight: 1.8, color: 'rgba(200,216,228,0.9)', marginBottom: 20 }}>
            🐟 당신은 이제 다음을 할 수 있어요:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>📊</span>
              <div>
                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#7DB8D8', marginBottom: 2 }}>대시보드</p>
                <p style={{ fontSize: '0.75rem', color: 'rgba(200,216,228,0.6)' }}>매장의 수익성을 한눈에 파악</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>🍽️</span>
              <div>
                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#7DB8D8', marginBottom: 2 }}>레시피 관리</p>
                <p style={{ fontSize: '0.75rem', color: 'rgba(200,216,228,0.6)' }}>메뉴별 정확한 원가 계산</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>🧊</span>
              <div>
                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#7DB8D8', marginBottom: 2 }}>냉장고</p>
                <p style={{ fontSize: '0.75rem', color: 'rgba(200,216,228,0.6)' }}>원재료 정보 체계적으로 관리</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>📸</span>
              <div>
                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#7DB8D8', marginBottom: 2 }}>영수증 촬영</p>
                <p style={{ fontSize: '0.75rem', color: 'rgba(200,216,228,0.6)' }}>영수증 한 장으로 재료 정보 저장</p>
              </div>
            </div>
          </div>
          <p style={{ fontSize: '0.9rem', lineHeight: 1.8, color: 'rgba(200,216,228,0.7)', marginTop: 24 }}>
            준비됐으면 대시보드로 가서 메뉴판을 구성해보세요!
          </p>
        </>
      ),
    },
  ]

  const currentStep = steps[step]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.7)',
              zIndex: 9999,
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000,
              pointerEvents: 'none',
            }}
          >
            <div style={{
              position: 'relative',
              width: '90%',
              maxWidth: 480,
              maxHeight: '85vh',
              background: '#1A2840',
              border: '1px solid rgba(74,127,165,0.3)',
              borderRadius: 20,
              padding: '32px 28px',
              fontFamily: "'Noto Sans KR', sans-serif",
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              overflowY: 'auto',
              pointerEvents: 'auto',
            }}
            >
              {/* 닫기 버튼 */}
              <button
                onClick={onClose}
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  background: 'none',
                  border: 'none',
                  color: 'rgba(200,216,228,0.5)',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(200,216,228,0.8)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(200,216,228,0.5)'}
              >
                <X size={24} />
              </button>

              {/* 진행도 */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 24, justifyContent: 'center' }}>
                {steps.map((_, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: idx === step ? '#4A7FA5' : 'rgba(74,127,165,0.3)',
                      transition: 'background 0.2s',
                    }}
                  />
                ))}
              </div>

              {/* 제목 */}
              <h2 style={{ color: 'white', fontSize: '1.3rem', fontWeight: 700, marginBottom: 4, textAlign: 'center' }}>
                {currentStep.title}
              </h2>
              <p style={{ color: 'rgba(200,216,228,0.5)', fontSize: '0.85rem', textAlign: 'center', marginBottom: 24 }}>
                {currentStep.subtitle}
              </p>

              {/* 콘텐츠 */}
              <div style={{ marginBottom: 28 }}>
                {currentStep.content}
              </div>

              {/* 버튼 */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
                <button
                  onClick={() => setStep(Math.max(0, step - 1))}
                  disabled={step === 0}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    background: step === 0 ? 'rgba(74,127,165,0.2)' : 'rgba(74,127,165,0.3)',
                    border: 'none',
                    borderRadius: 10,
                    color: step === 0 ? 'rgba(200,216,228,0.3)' : 'rgba(200,216,228,0.7)',
                    fontFamily: "'Noto Sans KR', sans-serif",
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: step === 0 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <ChevronLeft size={16} /> 이전
                </button>

                {step === steps.length - 1 ? (
                  <button
                    onClick={onClose}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      background: 'linear-gradient(135deg, #4A7FA5 0%, #5A9BC0 100%)',
                      border: 'none',
                      borderRadius: 10,
                      color: 'white',
                      fontFamily: "'Noto Sans KR', sans-serif",
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    시작하기 🐟
                  </button>
                ) : (
                  <button
                    onClick={() => setStep(Math.min(steps.length - 1, step + 1))}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      background: 'linear-gradient(135deg, #4A7FA5 0%, #5A9BC0 100%)',
                      border: 'none',
                      borderRadius: 10,
                      color: 'white',
                      fontFamily: "'Noto Sans KR', sans-serif",
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    다음 <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
