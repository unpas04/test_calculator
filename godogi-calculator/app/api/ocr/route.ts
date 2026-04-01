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

function parseIngredients(text: string): ParsedItem[] {
  if (!text.trim()) return []

  const items: ParsedItem[] = []
  const lines = text.split('\n').map(l => l.trim()).filter(l => l)

  for (const line of lines) {
    // Skip lines that are too short or look like headers
    if (line.length < 3) continue

    // Try to extract: name + quantity(number+unit) + price(number with ₩/원/,)
    // Pattern: Korean text + optional qty + price
    const priceMatch = line.match(/(\d{1,3}(?:[,]\d{3})*|\d+)원?/)
    if (!priceMatch) continue

    const priceStr = priceMatch[1].replace(/,/g, '')
    const price = parseInt(priceStr, 10)
    if (isNaN(price) || price === 0) continue

    // Extract quantity and unit
    // Pattern: number + (g|kg|ml|L|개|팩|병|봉|입|마리)
    const qtyMatch = line.match(/(\d+(?:\.\d+)?)\s*(g|kg|ml|L|개|팩|병|봉|입|마리|cc|ml|컵|스푼)?/)
    let per = 1
    let unit = '개'

    if (qtyMatch) {
      per = parseFloat(qtyMatch[1])
      unit = qtyMatch[2] || '개'
    }

    // Extract name: remove numbers, units, and price info
    let name = line
      .replace(/\d+(?:\.\d+)?/g, '') // Remove numbers
      .replace(/원/g, '')
      .replace(/[,]/g, '')
      .replace(/g|kg|ml|L|개|팩|병|봉|입|마리|cc|컵|스푼/g, '')
      .trim()

    // Clean up leftover symbols
    name = name.replace(/[^\p{L}\p{N}\s]/gu, '').trim()

    if (name.length >= 2) {
      // Confidence based on how complete the match was
      const hasQty = qtyMatch ? 0.8 : 0.6
      const hasSingleLine = line.split(/[,،]/).length === 1 ? 0.9 : 0.7
      const confidence = (hasQty + hasSingleLine) / 2

      items.push({
        name,
        price,
        per,
        unit,
        confidence,
      })
    }
  }

  return items
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

    // Flatten and deduplicate by name (keep highest confidence)
    const itemMap = new Map<string, ParsedItem>()
    for (const result of results) {
      for (const item of result) {
        const key = item.name.toLowerCase()
        const existing = itemMap.get(key)
        if (!existing || item.confidence > existing.confidence) {
          itemMap.set(key, item)
        }
      }
    }

    const items = Array.from(itemMap.values())

    return NextResponse.json({ items, count: items.length })
  } catch (error) {
    console.error('OCR error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'OCR processing failed' },
      { status: 500 }
    )
  }
}
