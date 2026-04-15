import { NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// Supabase 클라이언트 (런타임에만 생성)
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )
}

interface ParsedItem {
  name: string
  price: number
  per: number
  unit: string
  confidence: number // 0-1, for UI feedback
}

interface SupplierInfo {
  name?: string
  bizNo?: string // 사업자번호
  phone?: string
  address?: string
}

interface Word {
  text: string
  boundingBox?: { vertices: Array<{ x: number; y: number }> }
}

interface TextRow {
  words: string[]
  y: number // vertical position for grouping
}

// 거래처 정보 파싱
function parseSupplier(text: string): SupplierInfo | null {
  const lines = text.split('\n')
  const info: SupplierInfo = {}

  for (const line of lines) {
    // 사업자번호 패턴: XXX-XX-XXXXX
    const bizNoMatch = line.match(/(\d{3}-\d{2}-\d{5})/)
    if (bizNoMatch) info.bizNo = bizNoMatch[1]

    // 전화번호 패턴
    const phoneMatch = line.match(/(\d{2,3}-\d{3,4}-\d{4})/)
    if (phoneMatch) info.phone = phoneMatch[1]

    // 상호/공급자명: "상호" 또는 "공급자" 패턴 뒤 텍스트
    if (/상호|공급자|업체명|회사명/i.test(line)) {
      const name = line.replace(/상호|공급자|업체명|회사명|:|:|\s{2,}/gi, '').trim()
      if (name.length > 1 && !name.match(/^\d+$/)) info.name = name
    }
  }

  return (info.name || info.bizNo || info.phone) ? info : null
}

// JWT 토큰 생성 (서비스 계정용)
function createJWT(): string {
  const projectId = process.env.GOOGLE_VISION_PROJECT_ID
  const clientEmail = process.env.GOOGLE_VISION_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_VISION_PRIVATE_KEY

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Google Vision service account credentials not configured')
  }

  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url')

  // Private key에서 newline 처리
  const key = privateKey.replace(/\\n/g, '\n')
  const { createSign } = require('crypto')
  const sign = createSign('RSA-SHA256')
  sign.update(`${header}.${payloadStr}`)
  const signature = sign.sign(key, 'base64url')

  return `${header}.${payloadStr}.${signature}`
}

// 액세스 토큰 획득
async function getAccessToken(): Promise<string> {
  const jwt = createJWT()
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  const data: any = await response.json()
  if (!data.access_token) {
    throw new Error(`Failed to get access token: ${data.error}`)
  }

  return data.access_token
}

async function callGoogleVision(base64Image: string): Promise<{ fullText: string; words: Word[] }> {
  const accessToken = await getAccessToken()

  const response = await fetch(
    'https://vision.googleapis.com/v1/images:annotate',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64Image },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
          },
        ],
      }),
    }
  )

  const data: any = await response.json()

  if (!response.ok) {
    console.error('[Google Vision Error]', {
      status: response.status,
      statusText: response.statusText,
      error: data.error,
      errorMessage: data.error?.message,
    })
    throw new Error(`Google Vision API failed: ${data.error?.message || response.statusText}`)
  }

  const fullAnnotation = data.responses?.[0]?.fullTextAnnotation
  const textAnnotations = data.responses?.[0]?.textAnnotations
  const responseError = data.responses?.[0]?.error

  // 디버그 로그
  if (responseError) {
    console.error('[Google Vision Response Error]', {
      code: responseError.code,
      message: responseError.message,
    })
  }

  console.log('[Google Vision Response]', {
    hasFullAnnotation: !!fullAnnotation,
    hasTextAnnotations: !!textAnnotations && textAnnotations.length > 0,
    textLength: textAnnotations?.[0]?.description?.length || 0,
    fullTextLength: fullAnnotation?.text?.length || 0,
    annotationsCount: textAnnotations?.length || 0,
  })

  if (!fullAnnotation && (!textAnnotations || textAnnotations.length === 0)) {
    console.warn('[Google Vision] No text detected in image')
    return { fullText: '', words: [] }
  }

  // 전체 텍스트
  const fullText = fullAnnotation?.text || textAnnotations?.[0]?.description || ''

  // 단어 단위 정보 추출 (테이블 행 재구성용)
  let words: Word[] = []
  if (fullAnnotation?.pages?.[0]?.blocks) {
    const blocks = fullAnnotation.pages[0].blocks
    for (const block of blocks) {
      if (block.paragraphs) {
        for (const para of block.paragraphs) {
          if (para.words) {
            for (const word of para.words) {
              const text = word.symbols?.map((s: any) => s.text).join('') || ''
              if (text) {
                words.push({
                  text,
                  boundingBox: word.boundingBox,
                })
              }
            }
          }
        }
      }
    }
  }

  return { fullText, words }
}

// 단위 정규화 함수 (거래명세서 단위 전종 대응)
function normalizeUnit(unit: string): string {
  const unitMap: Record<string, string> = {
    // 무게
    'K': 'kg', 'k': 'kg', 'KG': 'kg', 'Kg': 'kg', 'kg': 'kg',
    'G': 'g', 'g': 'g',
    // 부피
    'L': 'L', 'l': 'L', 'ℓ': 'L',
    'ML': 'ml', 'ml': 'ml', 'Ml': 'ml', 'cc': 'ml', 'CC': 'ml',
    // 개수 계열
    'EA': '개', 'ea': '개', 'Ea': '개', 'E/A': '개', 'ea.': '개',
    '개': '개', '마리': '개', '마': '개', '입': '개', '컵': '개',
    // 묶음 계열
    'BOX': '박스', 'Box': '박스', 'box': '박스', 'BX': '박스',
    '단': '단', '망': '망', '묶': '묶', '봉': '봉', '팩': '팩', '병': '병', '캔': '개',
  }
  return unitMap[unit.trim()] || unit.trim()
}

// 알려진 단위 목록 (행에서 단독 단어로 인식할 것들)
const KNOWN_UNITS = new Set([
  'K', 'k', 'KG', 'Kg', 'kg',
  'G', 'g',
  'L', 'l', 'ℓ',
  'ML', 'ml', 'Ml', 'cc', 'CC',
  'EA', 'ea', 'Ea', 'E/A',
  'BOX', 'Box', 'box', 'BX',
  '단', '망', '묶', '봉', '팩', '병', '캔', '개', '마리',
])

// 테이블 형식 파싱 (거래명세서 전용 - 수량×단가=합계 관계 이용)
function parseTableFormat(words: Word[]): ParsedItem[] {
  if (words.length === 0) return []

  const items: ParsedItem[] = []
  const seenNames = new Set<string>()

  // 단어들을 Y 좌표로 그룹화 (같은 행)
  const rows: TextRow[] = []
  const yTolerance = 18

  for (const word of words) {
    if (!word.boundingBox?.vertices || word.boundingBox.vertices.length === 0) continue
    const y = word.boundingBox.vertices[0]?.y ?? 0
    let found = false
    for (const row of rows) {
      if (Math.abs(row.y - y) < yTolerance) {
        row.words.push(word.text)
        found = true
        break
      }
    }
    if (!found) rows.push({ words: [word.text], y })
  }

  for (const row of rows) {
    const wordList = row.words.filter(w => w.trim())
    const lineText = wordList.join(' ')

    if (lineText.length < 3) continue
    if (!/[가-힣]/.test(lineText)) continue  // 한글 없으면 스킵
    if (!/\d/.test(lineText)) continue

    // 헤더/합계 행 스킵
    if (/품명|단위|수량|단가|금액|합계|부가세|공급가|소계|VAT|번호|날짜|상호|거래처|주소|합\s*계/i.test(lineText)) continue

    // ── 1. 단위 추출 (단독 단어로 나타나는 단위 우선) ──────────────
    let detectedUnit = '개'
    for (const w of wordList) {
      if (KNOWN_UNITS.has(w.trim())) {
        detectedUnit = normalizeUnit(w.trim())
        break
      }
    }
    // 인라인 단위 패턴도 보조 탐색 (예: "5kg", "2EA")
    const inlineUnitMatch = lineText.match(/([\d.]+)\s*(K|kg|KG|G|g|L|l|ml|ML|EA|ea|BOX|box|단|망|봉|팩|병|개|마리)(?=[\s,\d]|$)/i)
    if (inlineUnitMatch && !KNOWN_UNITS.has(inlineUnitMatch[2].trim() === detectedUnit ? '' : inlineUnitMatch[2])) {
      // 별도 단위가 없으면 인라인 단위 사용
    }

    // ── 2. 모든 숫자 추출 (순서 유지) ───────────────────────────────
    const rawNums: number[] = []
    for (const w of wordList) {
      const cleaned = w.replace(/,/g, '')
      const n = parseFloat(cleaned)
      if (!isNaN(n) && n > 0) rawNums.push(n)
    }
    if (rawNums.length < 2) continue

    // ── 3. 수량 추출 (소수 or 100 미만 정수) ─────────────────────────
    let qty = 1
    let qtyIdx = -1
    for (let i = 0; i < rawNums.length; i++) {
      const n = rawNums[i]
      if (n % 1 !== 0 || (n > 0 && n < 100)) {
        qty = n
        qtyIdx = i
        break
      }
    }

    // ── 4. 단가 추출 (수량×단가 ≈ 합계 관계 이용) ─────────────────────
    const largeNums = rawNums.filter((n, i) => i !== qtyIdx && n >= 100)
    let unitPrice = 0
    let confidence = 0.65

    // 수량과 곱했을 때 다른 숫자 중 하나와 일치하는 것이 단가
    for (const candidate of largeNums) {
      const expectedTotal = Math.round(qty * candidate)
      const matched = largeNums.some(n => Math.abs(n - expectedTotal) <= expectedTotal * 0.02)
      if (matched && candidate !== expectedTotal) {
        unitPrice = candidate
        confidence = 0.9
        break
      }
    }

    // 매칭 실패 시: 첫 번째 큰 숫자를 단가로 (fallback)
    if (unitPrice === 0 && largeNums.length > 0) {
      unitPrice = largeNums[0]
      confidence = 0.6
    }
    if (unitPrice === 0) continue

    // ── 5. 재료명 추출 ───────────────────────────────────────────────
    // 한글 단어들 중 의미 있는 것들 연결 (괄호 안 내용 포함)
    const koreanTokens: string[] = []
    let capturing = false
    for (const w of wordList) {
      if (KNOWN_UNITS.has(w.trim())) break  // 단위 나오면 이름 끝
      if (/[가-힣]/.test(w)) {
        koreanTokens.push(w.replace(/[()（）]/g, ''))
        capturing = true
      } else if (capturing && /[()（）]/.test(w)) {
        // 괄호만 있는 단어는 무시
      } else if (capturing && /^\d+$/.test(w)) {
        break  // 순수 숫자 나오면 이름 끝
      }
    }

    let name = koreanTokens.join('').trim()
    // 너무 짧으면 lineText에서 가장 긴 한글 덩어리 사용
    if (name.length < 2) {
      const matches = lineText.match(/[가-힣]+/g) || []
      name = matches.sort((a, b) => b.length - a.length)[0] || ''
    }
    if (name.length < 2) continue

    const nameLower = name.toLowerCase()
    if (seenNames.has(nameLower)) continue
    seenNames.add(nameLower)

    // ── 6. 단가 합리성 체크 ─────────────────────────────────────────
    if (unitPrice >= 100 && unitPrice <= 10000000) confidence += 0.05
    confidence = Math.min(confidence, 1)

    // 단가 + 수량 그대로 저장 (price=단가/단위, per=1)
    // 예: 양파 K 5.00 1250 → price=1250, per=1, unit=kg
    items.push({ name, price: unitPrice, per: 1, unit: detectedUnit, confidence })
  }

  return items.sort((a, b) => b.confidence - a.confidence)
}

function parseIngredients(text: string): ParsedItem[] {
  if (!text.trim()) return []

  const items: ParsedItem[] = []
  const lines = text.split('\n').map(l => l.trim()).filter(l => l)
  const seenNames = new Set<string>()

  for (const line of lines) {
    // Skip 짧은 줄, 헤더 같은 줄
    if (line.length < 3) continue
    if (/^[가-힣\s]+$/.test(line) && line.length > 20) continue
    if (/할인|금액|합계|소계|부가세|총|VAT|번호|날짜|상호|결제/i.test(line)) continue

    // 1. 가격 추출 - 여러 패턴 지원
    // 패턴1: "... 4,500원"
    // 패턴2: "... 4500"
    let priceMatch = line.match(/(\d{1,3}(?:[,]\d{3})*|\d+)원\s*$/)
    if (!priceMatch) {
      // 원 없이 끝의 숫자도 체크
      priceMatch = line.match(/\s(\d{1,3}(?:[,]\d{3})*)\s*$/)
    }
    if (!priceMatch) continue

    const priceStr = priceMatch[1].replace(/,/g, '')
    const price = parseInt(priceStr, 10)
    if (isNaN(price) || price < 100 || price > 10000000) continue

    // 2. 수량+단위 추출 (개/EA/BOX 같은 표준 단위를 우선)
    let per = 1
    let unit = '개'
    let confidence = 0.65

    // 1순위: 표준 수량 단위 (개, EA, BOX, 팩, 병 등)
    const stdUnitPattern = /(\d+(?:\.\d+)?)\s*(개|EA|ea|e\.a\.|마리|팩|병|봉|입|박스|BOX|box)/i
    let qtyMatch = line.match(stdUnitPattern)

    if (qtyMatch) {
      per = parseFloat(qtyMatch[1])
      const rawUnit = qtyMatch[2]
      unit = normalizeUnit(rawUnit)
      confidence = 0.85
    } else {
      // 2순위: 부피 단위 (ml, L 등) - 패키지 크기로 간주, 수량은 1로 처리
      const volumePattern = /(\d+(?:\.\d+)?)\s*(kg|k|g|G|L|l|ml|cc|컵|스푼)/i
      qtyMatch = line.match(volumePattern)

      if (qtyMatch) {
        const rawUnit = qtyMatch[2].trim()
        unit = normalizeUnit(rawUnit)
        const rawPer = parseFloat(qtyMatch[1])
        // kg→g, L→ml 변환
        if (rawUnit.toLowerCase() === 'kg' || rawUnit === 'K' || rawUnit === 'k') {
          per = rawPer * 1000; unit = 'g'
        } else if (rawUnit === 'L' || rawUnit === 'l') {
          per = rawPer * 1000; unit = 'ml'
        } else {
          per = rawPer
        }
        confidence = 0.60
      }
    }

    // 3. 재료명 추출 - 더 관대한 방식
    let name = line
      .replace(priceMatch[0], '')
      .replace(qtyMatch ? qtyMatch[0] : '', '')
      .trim()

    // 한글만 추출
    const koreanMatches = name.match(/[\p{L}]+/gu) || []
    name = ''
    for (const match of koreanMatches) {
      if (match.length >= 2 && match.length <= 30) {
        if (match.length > name.length) name = match
      }
    }

    if (name.length < 2) continue

    const nameLower = name.toLowerCase()
    if (seenNames.has(nameLower)) continue
    seenNames.add(nameLower)

    // 신뢰도 조정
    if (qtyMatch) confidence += 0.1
    if (price >= 1000 && price <= 500000) confidence += 0.1
    if (name.length >= 2 && name.length <= 8) confidence += 0.05

    confidence = Math.min(confidence, 1)

    items.push({ name, price, per, unit, confidence })
  }

  return items.sort((a, b) => b.confidence - a.confidence)
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('images') as File[]
    const userId = formData.get('userId') as string

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 })
    }

    // Process all images in parallel
    let visionResponse: any = null
    let supplier: SupplierInfo | null = null
    let savedSupplier: any = null
    const results = await Promise.all(
      files.map(async (file) => {
        try {
          const buffer = await file.arrayBuffer()
          const base64 = Buffer.from(buffer).toString('base64')

          console.log(`[Processing] File: ${file.name}, Size: ${base64.length}`)

          const { fullText, words } = await callGoogleVision(base64)

          // 첫 번째 이미지의 Vision 응답 저장 (디버그용) + 거래처 정보 파싱
          if (!visionResponse) {
            visionResponse = {
              success: true,
              textExtracted: fullText.length > 0,
              textLength: fullText.length,
              wordsCount: words.length,
              textPreview: fullText.substring(0, 300),
            }
            console.log('[Vision Success]', visionResponse)

            // 거래처 정보 파싱
            supplier = parseSupplier(fullText)
            if (supplier) {
              console.log('[Supplier Info]', supplier)
            }
          }

          // 두 가지 방식으로 파싱: 일반 텍스트 + 테이블 형식
          const lineItems = parseIngredients(fullText)
          const tableItems = parseTableFormat(words)

          // 두 결과를 병합 (신뢰도 기준)
          const merged = new Map<string, ParsedItem>()
          for (const item of [...lineItems, ...tableItems]) {
            const key = item.name.toLowerCase()
            const existing = merged.get(key)
            if (!existing || item.confidence > existing.confidence) {
              merged.set(key, item)
            }
          }

          return Array.from(merged.values())
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err)
          console.error(`[Error processing image ${file.name}]:`, errorMsg)

          if (!visionResponse) {
            visionResponse = {
              success: false,
              error: errorMsg,
            }
          }
          return []
        }
      })
    )

    // Flatten and smart deduplicate
    // 같은 재료가 여러 번 인식되면 높은 신뢰도 버전 선택
    const itemMap = new Map<string, ParsedItem>()
    for (const result of results) {
      for (const item of result) {
        const key = item.name.toLowerCase().trim()
        const existing = itemMap.get(key)

        if (!existing) {
          itemMap.set(key, item)
        } else if (item.confidence > existing.confidence) {
          // 신뢰도가 높으면 교체
          itemMap.set(key, item)
        } else if (item.confidence === existing.confidence && item.price > 0) {
          // 신뢰도 같으면 가격이 있는 쪽 선택
          if (existing.price === 0) {
            itemMap.set(key, item)
          }
        }
      }
    }

    // 신뢰도 낮은 것도 포함 (디버깅용: 신뢰도 30% 이상)
    const allItems = Array.from(itemMap.values())
      .sort((a, b) => b.confidence - a.confidence)

    const items = allItems.filter(item => item.confidence >= 0.5)
    const lowConfidenceItems = allItems.filter(item => item.confidence < 0.5 && item.confidence >= 0.3)

    // DEBUG 정보
    const debug = {
      filesCount: files.length,
      totalExtracted: allItems.length,
      highConfidence: items.length,
      lowConfidence: lowConfidenceItems.length,
      allItems: allItems.map(i => ({ name: i.name, conf: Math.round(i.confidence * 100) })),
    }

    console.log('[OCR Debug]', debug)

    // 거래처 정보 저장 (suppliers 테이블)
    if (supplier && userId && (supplier as any)?.bizNo) {
      try {
        const s = supplier as any
        const supabaseClient = getSupabaseClient()
        const { data, error } = await supabaseClient
          .from('suppliers')
          .upsert(
            {
              user_id: userId,
              name: s.name || null,
              biz_no: s.bizNo,
              phone: s.phone || null,
              address: s.address || null,
            },
            { onConflict: 'user_id, biz_no' }
          )
          .select()

        if (error) {
          console.error('[Supplier Save Error]', error)
        } else {
          console.log('[Supplier Saved]', data)
          savedSupplier = data?.[0] || null
        }
      } catch (err) {
        console.error('[Supplier Save Exception]', err)
      }
    }

    return NextResponse.json({
      items,
      count: items.length,
      debug,
      visionResponse, // Google Vision이 뭘 추출했는지
      supplier, // 거래처 정보 (있으면)
      savedSupplier, // DB 저장된 거래처 정보
    })
  } catch (error) {
    console.error('OCR error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'OCR processing failed' },
      { status: 500 }
    )
  }
}
