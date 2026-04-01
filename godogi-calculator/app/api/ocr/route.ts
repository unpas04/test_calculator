import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

interface ParsedItem {
  name: string
  price: number
  per: number
  unit: string
  confidence: number // 0-1, for UI feedback
}

async function callGoogleVision(base64Image: string): Promise<string> {
  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

  if (!response.ok) {
    throw new Error(`Google Vision API failed: ${response.statusText}`)
  }

  const data: any = await response.json()
  const annotations = data.responses?.[0]?.textAnnotations
  if (!annotations || annotations.length === 0) return ''

  // First annotation is the full text
  return annotations[0].description || ''
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

function parseIngredients(text: string): ParsedItem[] {
  if (!text.trim()) return []

  const items: ParsedItem[] = []
  const lines = text.split('\n').map(l => l.trim()).filter(l => l)
  const seenNames = new Set<string>()

  for (const line of lines) {
    // Skip 짧은 줄, 헤더 같은 줄
    if (line.length < 3) continue
    if (/^[가-힣\s]+$/.test(line) && line.length > 20) continue // 카테고리/헤더 스킵
    if (/할인|금액|합계|소계|부가세|총|VAT/i.test(line)) continue

    // 1. 가격 추출 (맨 뒤의 숫자+원 형태)
    // 패턴: "달걀 30개 4,500원" → 4500
    const priceMatch = line.match(/(\d{1,3}(?:[,]\d{3})*|\d+)원\s*$/)
    if (!priceMatch) continue

    const priceStr = priceMatch[1].replace(/,/g, '')
    const price = parseInt(priceStr, 10)
    if (isNaN(price) || price < 100 || price > 1000000) continue // 합리적인 가격 범위

    // 2. 수량+단위 추출 (가장 오른쪽에서 찾기)
    // 패턴: "30개", "1kg", "500ml" 등
    let per = 1
    let unit = '개'
    let confidence = 0.7

    // 오른쪽에서부터 찾기 (가격 바로 앞)
    const qtyPattern = /(\d+(?:\.\d+)?)\s*(kg|g|L|ml|cc|개|마리|팩|병|봉|입|컵|스푼|K|G)/i
    const qtyMatch = line.match(qtyPattern)

    if (qtyMatch) {
      per = parseFloat(qtyMatch[1])
      const rawUnit = qtyMatch[2]
      unit = normalizeUnit(rawUnit)

      // 단위 변환 (kg→g, L→ml)
      const converted = convertQuantity(per, rawUnit)
      per = converted.per
      unit = converted.unit
      confidence = 0.85
    }

    // 3. 재료명 추출
    // 가격과 수량 정보 제거 후 남은 텍스트
    let name = line
      .replace(priceMatch[0], '') // 가격 제거
      .replace(qtyMatch ? qtyMatch[0] : '', '') // 수량+단위 제거
      .trim()

    // 특수문자/숫자 정리
    name = name.replace(/[^\p{L}\p{N}\s]/gu, '').trim()

    // 너무 짧거나 긴 이름 스킵
    if (name.length < 2 || name.length > 30) continue

    // 중복 제거
    const nameLower = name.toLowerCase()
    if (seenNames.has(nameLower)) continue
    seenNames.add(nameLower)

    // 신뢰도 조정
    // - 수량 정보 있으면 +0.15
    // - 가격이 합리적이면 +0.05
    // - 재료명이 짧고 명확하면 +0.05
    if (qtyMatch) confidence += 0.1
    if (price > 500 && price < 100000) confidence += 0.05
    if (name.length >= 2 && name.length <= 8) confidence += 0.05

    confidence = Math.min(confidence, 1)

    items.push({
      name,
      price,
      per,
      unit,
      confidence,
    })
  }

  // 신뢰도 순으로 정렬 (높은 것 먼저)
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
    const allItems: ParsedItem[] = []

    const results = await Promise.all(
      files.map(async (file) => {
        try {
          const buffer = await file.arrayBuffer()
          const base64 = Buffer.from(buffer).toString('base64')
          const text = await callGoogleVision(base64)
          return parseIngredients(text)
        } catch (err) {
          console.error(`Error processing image ${file.name}:`, err)
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

    const items = Array.from(itemMap.values())
      .filter(item => item.confidence >= 0.5) // 신뢰도 50% 이상만
      .sort((a, b) => b.confidence - a.confidence) // 신뢰도 순 정렬

    return NextResponse.json({ items, count: items.length })
  } catch (error) {
    console.error('OCR error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'OCR processing failed' },
      { status: 500 }
    )
  }
}
