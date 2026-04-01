import { NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'

export const runtime = 'nodejs'

interface ParsedItem {
  name: string
  price: number
  per: number
  unit: string
  confidence: number // 0-1, for UI feedback
}

interface Word {
  text: string
  boundingBox?: { vertices: Array<{ x: number; y: number }> }
}

interface TextRow {
  words: string[]
  y: number // vertical position for grouping
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

// 단위 정규화 함수
function normalizeUnit(unit: string): string {
  const unitMap: { [key: string]: string } = {
    'kg': 'g', 'K': 'g', 'Kg': 'g', 'KG': 'g',
    'L': 'ml', 'l': 'ml',
    '개': '개', '마리': '개', '마': '개',
    'g': 'g', 'G': 'g',
    'ml': 'ml', 'Ml': 'ml', 'ML': 'ml',
    'cc': 'ml',
    '팩': '팩', '병': '팩', '봉': '팩', '입': '개', '컵': '개', '스푼': '개',
  }
  return unitMap[unit] || unit
}

// 단위별 수량 변환 (kg → g, L → ml)
function convertQuantity(per: number, unit: string): { per: number; unit: string } {
  if (unit === 'kg') return { per: per * 1000, unit: 'g' }
  if (unit === 'L' || unit === 'l') return { per: per * 1000, unit: 'ml' }
  return { per, unit }
}

// 테이블 형식 파싱 (거래명세서, 구조화된 표)
function parseTableFormat(words: Word[]): ParsedItem[] {
  if (words.length === 0) return []

  const items: ParsedItem[] = []
  const seenNames = new Set<string>()

  // 단어들을 Y 좌표로 그룹화 (같은 행)
  const rows: TextRow[] = []
  const yTolerance = 20 // 20px 이내는 같은 행 (tolerance 증가)

  for (const word of words) {
    if (!word.boundingBox?.vertices || word.boundingBox.vertices.length === 0) continue

    const y = word.boundingBox.vertices[0]?.y ?? 0
    let found = false

    // 기존 행에 추가
    for (const row of rows) {
      if (Math.abs(row.y - y) < yTolerance) {
        row.words.push(word.text)
        found = true
        break
      }
    }

    // 새 행 생성
    if (!found) {
      rows.push({ words: [word.text], y })
    }
  }

  // 각 행 파싱
  for (const row of rows) {
    const lineText = row.words.join(' ')
    if (lineText.length < 3) continue

    // 한글 포함 확인
    if (!/[\p{L}]/u.test(lineText)) continue

    // 숫자 포함 확인
    if (!/\d/.test(lineText)) continue

    // 헤더/카테고리 행 스킵
    if (/^[가-힣\s]+$/.test(lineText) && lineText.length > 20) continue
    if (/할인|금액|합계|소계|부가세|총|VAT|번호|날짜|상호/i.test(lineText)) continue

    // 가격 추출: 가장 오른쪽의 4~6자리 숫자
    let price = 0
    const allNumbers = lineText.match(/(\d{1,3}(?:[,]\d{3})*|\d+)/g) || []

    // 오른쪽에서부터 확인
    for (let i = allNumbers.length - 1; i >= 0; i--) {
      const num = parseInt(allNumbers[i].replace(/,/g, ''), 10)
      // 합리적인 가격 범위: 100원 ~ 1000만원
      if (num >= 100 && num <= 10000000) {
        price = num
        break
      }
    }
    if (price === 0) continue

    // 수량+단위 추출
    let per = 1
    let unit = '개'
    let confidence = 0.7

    const qtyPattern = /(\d+(?:\.\d+)?)\s*(kg|k|g|G|L|l|ml|cc|개|마리|팩|병|봉|입|컵|스푼)/i
    const qtyMatch = lineText.match(qtyPattern)

    if (qtyMatch) {
      per = parseFloat(qtyMatch[1])
      const rawUnit = qtyMatch[2]
      unit = normalizeUnit(rawUnit)
      const converted = convertQuantity(per, rawUnit)
      per = converted.per
      unit = converted.unit
      confidence = 0.85
    }

    // 재료명: 연속된 한글 추출 (가장 긴 것)
    const koreanMatches = lineText.match(/[\p{L}]+/gu) || []
    let name = ''
    for (const match of koreanMatches) {
      if (match.length >= 2 && match.length <= 30) {
        if (match.length > name.length) name = match
      }
    }

    if (name.length < 2) continue

    const nameLower = name.toLowerCase()
    if (seenNames.has(nameLower)) continue
    seenNames.add(nameLower)

    if (qtyMatch) confidence += 0.1
    if (price >= 1000 && price <= 500000) confidence += 0.1 // 가격이 합리적이면 신뢰도 UP
    confidence = Math.min(confidence, 1)

    items.push({ name, price, per, unit, confidence })
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
        const rawUnit = qtyMatch[2]
        unit = normalizeUnit(rawUnit)
        const converted = convertQuantity(parseFloat(qtyMatch[1]), rawUnit)
        per = converted.per
        unit = converted.unit
        // 부피 단위는 신뢰도 낮춤 (실제 수량이 아니라 패키지 크기)
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

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 })
    }

    // Process all images in parallel
    let visionResponse: any = null
    const results = await Promise.all(
      files.map(async (file) => {
        try {
          const buffer = await file.arrayBuffer()
          const base64 = Buffer.from(buffer).toString('base64')

          console.log(`[Processing] File: ${file.name}, Size: ${base64.length}`)

          const { fullText, words } = await callGoogleVision(base64)

          // 첫 번째 이미지의 Vision 응답 저장 (디버그용)
          if (!visionResponse) {
            visionResponse = {
              success: true,
              textExtracted: fullText.length > 0,
              textLength: fullText.length,
              wordsCount: words.length,
              textPreview: fullText.substring(0, 300),
            }
            console.log('[Vision Success]', visionResponse)
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

    return NextResponse.json({
      items,
      count: items.length,
      debug,
      visionResponse, // Google Vision이 뭘 추출했는지
    })
  } catch (error) {
    console.error('OCR error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'OCR processing failed' },
      { status: 500 }
    )
  }
}
