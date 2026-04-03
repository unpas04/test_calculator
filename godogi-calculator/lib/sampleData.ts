interface SampleIngredient {
  name: string
  price: number
  qty: number
  unit: string
  yield_: number
  use_amount: number
  sort_order: number
}

export interface SampleMenu {
  name: string
  emoji: string
  category: string
  overhead: number
  packaging: number
  labor: number
  delivery_fee: number
  card_fee: number
  sale_price: number
  batch_yield: number
  serving_size: number
  ingredients: SampleIngredient[]
}

export interface SampleSet {
  name: string
  category: string  // 세트 카테고리 (예: "파스타류", "음료류")
  channel: 'delivery' | 'hall'
  sale_price: number
  menuNames: string[]
}

// 공통 패키징 아이템
const SHARED_EXTRAS: SampleMenu[] = [
  {
    name: '포장용기', emoji: '📦', category: 'extra',
    overhead: 0, packaging: 80, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 0, batch_yield: 0, serving_size: 0,
    ingredients: [],
  },
  {
    name: '비닐봉투', emoji: '🛍️', category: 'extra',
    overhead: 0, packaging: 30, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 0, batch_yield: 0, serving_size: 0,
    ingredients: [],
  },
  {
    name: '냅킨·수저', emoji: '🥢', category: 'extra',
    overhead: 0, packaging: 25, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 0, batch_yield: 0, serving_size: 0,
    ingredients: [],
  },
  {
    name: '배달비 분담', emoji: '🛵', category: 'extra',
    overhead: 300, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 0, batch_yield: 0, serving_size: 0,
    ingredients: [],
  },
]

// ========== 한식 (12개) ==========
const KOREAN_MENUS: SampleMenu[] = [
  // Main dishes
  {
    name: '제육볶음', emoji: '🍖', category: 'main',
    overhead: 800, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 9000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '돼지고기 앞다리살', price: 12000, qty: 1000, unit: 'g', yield_: 90, use_amount: 150, sort_order: 0 },
      { name: '양파', price: 2000, qty: 1000, unit: 'g', yield_: 85, use_amount: 80, sort_order: 1 },
      { name: '대파', price: 1500, qty: 200, unit: 'g', yield_: 80, use_amount: 20, sort_order: 2 },
      { name: '고추장', price: 5000, qty: 500, unit: 'g', yield_: 100, use_amount: 25, sort_order: 3 },
      { name: '참기름', price: 8000, qty: 500, unit: 'ml', yield_: 100, use_amount: 5, sort_order: 4 },
    ],
  },
  {
    name: '된장찌개', emoji: '🍲', category: 'main',
    overhead: 500, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 8000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '된장', price: 4000, qty: 500, unit: 'g', yield_: 100, use_amount: 40, sort_order: 0 },
      { name: '두부', price: 1500, qty: 300, unit: 'g', yield_: 100, use_amount: 100, sort_order: 1 },
      { name: '애호박', price: 1500, qty: 300, unit: 'g', yield_: 85, use_amount: 80, sort_order: 2 },
      { name: '팽이버섯', price: 2000, qty: 150, unit: 'g', yield_: 90, use_amount: 30, sort_order: 3 },
    ],
  },
  {
    name: '순두부찌개', emoji: '🫕', category: 'main',
    overhead: 600, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 9000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '순두부', price: 1200, qty: 350, unit: 'g', yield_: 100, use_amount: 200, sort_order: 0 },
      { name: '고춧가루', price: 8000, qty: 500, unit: 'g', yield_: 100, use_amount: 15, sort_order: 1 },
      { name: '달걀', price: 3000, qty: 500, unit: 'g', yield_: 100, use_amount: 50, sort_order: 2 },
      { name: '대파', price: 1500, qty: 200, unit: 'g', yield_: 80, use_amount: 20, sort_order: 3 },
    ],
  },
  {
    name: '불고기', emoji: '🥩', category: 'main',
    overhead: 900, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 11000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '소 등심살', price: 18000, qty: 500, unit: 'g', yield_: 88, use_amount: 120, sort_order: 0 },
      { name: '양파', price: 2000, qty: 1000, unit: 'g', yield_: 85, use_amount: 60, sort_order: 1 },
      { name: '간장', price: 3000, qty: 500, unit: 'ml', yield_: 100, use_amount: 30, sort_order: 2 },
      { name: '설탕', price: 2000, qty: 1000, unit: 'g', yield_: 100, use_amount: 15, sort_order: 3 },
      { name: '참기름', price: 8000, qty: 500, unit: 'ml', yield_: 100, use_amount: 8, sort_order: 4 },
    ],
  },
  // Side dishes
  {
    name: '공깃밥', emoji: '🍚', category: 'side',
    overhead: 100, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 1000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '쌀', price: 40000, qty: 10000, unit: 'g', yield_: 100, use_amount: 90, sort_order: 0 },
    ],
  },
  {
    name: '계란후라이', emoji: '🍳', category: 'side',
    overhead: 50, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 1000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '달걀', price: 3000, qty: 500, unit: 'g', yield_: 100, use_amount: 50, sort_order: 0 },
      { name: '식용유', price: 5000, qty: 1800, unit: 'ml', yield_: 100, use_amount: 5, sort_order: 1 },
    ],
  },
  {
    name: '계란말이', emoji: '🍳', category: 'side',
    overhead: 100, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 2000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '달걀', price: 3000, qty: 500, unit: 'g', yield_: 100, use_amount: 80, sort_order: 0 },
      { name: '당근', price: 1500, qty: 300, unit: 'g', yield_: 85, use_amount: 30, sort_order: 1 },
      { name: '식용유', price: 5000, qty: 1800, unit: 'ml', yield_: 100, use_amount: 8, sort_order: 2 },
    ],
  },
  // Banchan
  {
    name: '김치', emoji: '🥬', category: 'banchan',
    overhead: 50, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 0, batch_yield: 800, serving_size: 40,
    ingredients: [
      { name: '배추', price: 3000, qty: 1500, unit: 'g', yield_: 70, use_amount: 500, sort_order: 0 },
      { name: '고춧가루', price: 8000, qty: 500, unit: 'g', yield_: 100, use_amount: 30, sort_order: 1 },
      { name: '새우젓', price: 6000, qty: 500, unit: 'g', yield_: 100, use_amount: 20, sort_order: 2 },
      { name: '마늘', price: 3000, qty: 300, unit: 'g', yield_: 85, use_amount: 20, sort_order: 3 },
    ],
  },
  {
    name: '콩나물무침', emoji: '🌱', category: 'banchan',
    overhead: 30, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 0, batch_yield: 250, serving_size: 30,
    ingredients: [
      { name: '콩나물', price: 1500, qty: 300, unit: 'g', yield_: 90, use_amount: 100, sort_order: 0 },
      { name: '참기름', price: 8000, qty: 500, unit: 'ml', yield_: 100, use_amount: 3, sort_order: 1 },
      { name: '마늘', price: 3000, qty: 300, unit: 'g', yield_: 85, use_amount: 2, sort_order: 2 },
    ],
  },
  // Drinks
  {
    name: '콜라', emoji: '🥤', category: 'drink',
    overhead: 200, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 2000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '콜라 (1.5L)', price: 1500, qty: 1500, unit: 'ml', yield_: 100, use_amount: 350, sort_order: 0 },
    ],
  },
  {
    name: '수정과', emoji: '🧃', category: 'drink',
    overhead: 150, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 2500, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '생강', price: 3000, qty: 200, unit: 'g', yield_: 85, use_amount: 20, sort_order: 0 },
      { name: '계피', price: 5000, qty: 50, unit: 'g', yield_: 100, use_amount: 2, sort_order: 1 },
      { name: '설탕', price: 2000, qty: 1000, unit: 'g', yield_: 100, use_amount: 40, sort_order: 2 },
      { name: '잣', price: 15000, qty: 100, unit: 'g', yield_: 100, use_amount: 5, sort_order: 3 },
    ],
  },
  ...SHARED_EXTRAS,
]

const KOREAN_SETS = [
  {
    name: '불고기 볶음밥 A세트',
    category: '볶음류',
    channel: 'hall' as const,
    sale_price: 9000,
    menuNames: ['제육볶음', '공깃밥', '김치'],
  },
  {
    name: '계란볶음밥 점심세트',
    category: '볶음류',
    channel: 'hall' as const,
    sale_price: 8000,
    menuNames: ['계란볶음밥', '공깃밥', '김치'],
  },
  {
    name: '된장찌개 기본세트',
    category: '찌개류',
    channel: 'hall' as const,
    sale_price: 8000,
    menuNames: ['된장찌개', '공깋밥', '콩나물무침', '김치'],
  },
  {
    name: '순두부찌개 정식',
    category: '찌개류',
    channel: 'hall' as const,
    sale_price: 9000,
    menuNames: ['순두부찌개', '공깃밥', '계란말이', '김치'],
  },
  {
    name: '순두부찌개 배달세트',
    category: '찌개류',
    channel: 'delivery' as const,
    sale_price: 10000,
    menuNames: ['순두부찌개', '공깃밥', '김치', '포장용기', '비닐봉투', '냅킨·수저'],
  },
]

// ========== 카페/디저트 (12개) ==========
const CAFE_MENUS: SampleMenu[] = [
  // Drinks
  {
    name: '아메리카노', emoji: '☕', category: 'drink',
    overhead: 300, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 3500, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '에스프레소 원두', price: 30000, qty: 1000, unit: 'g', yield_: 100, use_amount: 18, sort_order: 0 },
      { name: '정수', price: 500, qty: 2000, unit: 'ml', yield_: 100, use_amount: 200, sort_order: 1 },
    ],
  },
  {
    name: '카페라떼', emoji: '☕', category: 'drink',
    overhead: 400, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 4500, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '에스프레소 원두', price: 30000, qty: 1000, unit: 'g', yield_: 100, use_amount: 18, sort_order: 0 },
      { name: '우유', price: 2500, qty: 1000, unit: 'ml', yield_: 100, use_amount: 200, sort_order: 1 },
    ],
  },
  {
    name: '카페모카', emoji: '☕', category: 'drink',
    overhead: 400, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 5000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '에스프레소 원두', price: 30000, qty: 1000, unit: 'g', yield_: 100, use_amount: 18, sort_order: 0 },
      { name: '우유', price: 2500, qty: 1000, unit: 'ml', yield_: 100, use_amount: 200, sort_order: 1 },
      { name: '초콜릿시럽', price: 8000, qty: 1000, unit: 'ml', yield_: 100, use_amount: 20, sort_order: 2 },
    ],
  },
  {
    name: '아이스아메리카노', emoji: '🧊☕', category: 'drink',
    overhead: 300, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 4000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '에스프레소 원두', price: 30000, qty: 1000, unit: 'g', yield_: 100, use_amount: 18, sort_order: 0 },
      { name: '정수', price: 500, qty: 2000, unit: 'ml', yield_: 100, use_amount: 300, sort_order: 1 },
      { name: '얼음', price: 1000, qty: 2000, unit: 'g', yield_: 100, use_amount: 200, sort_order: 2 },
    ],
  },
  // Pastries & Sides
  {
    name: '머핀', emoji: '🧁', category: 'side',
    overhead: 200, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 3000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '밀가루', price: 3000, qty: 1000, unit: 'g', yield_: 100, use_amount: 80, sort_order: 0 },
      { name: '버터', price: 7000, qty: 500, unit: 'g', yield_: 100, use_amount: 30, sort_order: 1 },
      { name: '설탕', price: 2000, qty: 1000, unit: 'g', yield_: 100, use_amount: 40, sort_order: 2 },
      { name: '달걀', price: 3000, qty: 500, unit: 'g', yield_: 100, use_amount: 40, sort_order: 3 },
    ],
  },
  {
    name: '크로아상', emoji: '🥐', category: 'side',
    overhead: 250, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 4000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '밀가루', price: 3000, qty: 1000, unit: 'g', yield_: 100, use_amount: 100, sort_order: 0 },
      { name: '버터', price: 7000, qty: 500, unit: 'g', yield_: 100, use_amount: 60, sort_order: 1 },
      { name: '우유', price: 2500, qty: 1000, unit: 'ml', yield_: 100, use_amount: 80, sort_order: 2 },
    ],
  },
  {
    name: '치즈케이크', emoji: '🍰', category: 'side',
    overhead: 400, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 6000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '크림치즈', price: 8000, qty: 500, unit: 'g', yield_: 100, use_amount: 200, sort_order: 0 },
      { name: '밀가루', price: 3000, qty: 1000, unit: 'g', yield_: 100, use_amount: 60, sort_order: 1 },
      { name: '달걀', price: 3000, qty: 500, unit: 'g', yield_: 100, use_amount: 100, sort_order: 2 },
      { name: '설탕', price: 2000, qty: 1000, unit: 'g', yield_: 100, use_amount: 80, sort_order: 3 },
    ],
  },
  {
    name: '아이스크림', emoji: '🍦', category: 'side',
    overhead: 150, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 5000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '아이스크림 (바닐라)', price: 8000, qty: 1000, unit: 'g', yield_: 100, use_amount: 150, sort_order: 0 },
    ],
  },
  {
    name: '시나몬롤', emoji: '🥐', category: 'side',
    overhead: 300, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 5000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '밀가루', price: 3000, qty: 1000, unit: 'g', yield_: 100, use_amount: 90, sort_order: 0 },
      { name: '설탕', price: 2000, qty: 1000, unit: 'g', yield_: 100, use_amount: 50, sort_order: 1 },
      { name: '계피', price: 5000, qty: 50, unit: 'g', yield_: 100, use_amount: 5, sort_order: 2 },
      { name: '버터', price: 7000, qty: 500, unit: 'g', yield_: 100, use_amount: 30, sort_order: 3 },
    ],
  },
  ...SHARED_EXTRAS,
]

const CAFE_SETS = [
  {
    name: '아메리카노 싱글',
    category: '음료류',
    channel: 'hall' as const,
    sale_price: 3500,
    menuNames: ['아메리카노'],
  },
  {
    name: '카페라떼 싱글',
    category: '음료류',
    channel: 'hall' as const,
    sale_price: 4500,
    menuNames: ['카페라떼'],
  },
  {
    name: '핸드드립 프리미엄',
    category: '음료류',
    channel: 'hall' as const,
    sale_price: 6500,
    menuNames: ['핸드드립 커피'],
  },
  {
    name: '버터머핀 세트',
    category: '베이커리',
    channel: 'hall' as const,
    sale_price: 6000,
    menuNames: ['머핀'],
  },
  {
    name: '버터크로아상',
    category: '베이커리',
    channel: 'hall' as const,
    sale_price: 5500,
    menuNames: ['크로아상'],
  },
  {
    name: '브라우니 플레이트',
    category: '베이커리',
    channel: 'hall' as const,
    sale_price: 6500,
    menuNames: ['초콜릿 브라우니'],
  },
  {
    name: '뉴욕 치즈케이크 슬라이스',
    category: '디저트',
    channel: 'hall' as const,
    sale_price: 7000,
    menuNames: ['치즈케이크'],
  },
  {
    name: '바닐라 아이스크림',
    category: '디저트',
    channel: 'hall' as const,
    sale_price: 5500,
    menuNames: ['아이스크림 (바닐라)'],
  },
  {
    name: '시나몬롤 플러스',
    category: '디저트',
    channel: 'delivery' as const,
    sale_price: 7000,
    menuNames: ['시나몬롤', '포장용기', '비닐봉투', '냅킨·수저'],
  },
]

// ========== 중식 (7개) ==========
const CHINESE_MENUS: SampleMenu[] = [
  {
    name: '마라탕', emoji: '🥡', category: 'main',
    overhead: 600, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 8000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '마라소스', price: 6000, qty: 500, unit: 'g', yield_: 100, use_amount: 50, sort_order: 0 },
      { name: '소면', price: 3000, qty: 500, unit: 'g', yield_: 100, use_amount: 80, sort_order: 1 },
      { name: '야채(미송)', price: 5000, qty: 1000, unit: 'g', yield_: 80, use_amount: 200, sort_order: 2 },
      { name: '두부', price: 1500, qty: 300, unit: 'g', yield_: 100, use_amount: 80, sort_order: 3 },
    ],
  },
  {
    name: '볶음밥', emoji: '🍚', category: 'main',
    overhead: 500, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 7000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '쌀', price: 40000, qty: 10000, unit: 'g', yield_: 100, use_amount: 150, sort_order: 0 },
      { name: '계란', price: 3000, qty: 500, unit: 'g', yield_: 100, use_amount: 50, sort_order: 1 },
      { name: '식용유', price: 5000, qty: 1800, unit: 'ml', yield_: 100, use_amount: 20, sort_order: 2 },
      { name: '야채믹스', price: 4000, qty: 500, unit: 'g', yield_: 100, use_amount: 80, sort_order: 3 },
    ],
  },
  {
    name: '짜장면', emoji: '🥢', category: 'main',
    overhead: 500, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 6500, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '중화면', price: 2000, qty: 500, unit: 'g', yield_: 100, use_amount: 120, sort_order: 0 },
      { name: '짜장소스', price: 4000, qty: 500, unit: 'g', yield_: 100, use_amount: 60, sort_order: 1 },
      { name: '야채(양파,당근)', price: 3000, qty: 500, unit: 'g', yield_: 85, use_amount: 100, sort_order: 2 },
      { name: '돼지고기', price: 12000, qty: 1000, unit: 'g', yield_: 90, use_amount: 50, sort_order: 3 },
    ],
  },
  {
    name: '짬뽕', emoji: '🍜', category: 'main',
    overhead: 600, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 7500, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '중화면', price: 2000, qty: 500, unit: 'g', yield_: 100, use_amount: 120, sort_order: 0 },
      { name: '고춧가루', price: 8000, qty: 500, unit: 'g', yield_: 100, use_amount: 20, sort_order: 1 },
      { name: '해산물 믹스', price: 8000, qty: 500, unit: 'g', yield_: 100, use_amount: 80, sort_order: 2 },
      { name: '야채', price: 3000, qty: 500, unit: 'g', yield_: 85, use_amount: 100, sort_order: 3 },
    ],
  },
  {
    name: '춘권', emoji: '🥟', category: 'side',
    overhead: 300, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 4000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '춘권 피', price: 2000, qty: 300, unit: 'g', yield_: 100, use_amount: 80, sort_order: 0 },
      { name: '야채믹스', price: 4000, qty: 500, unit: 'g', yield_: 100, use_amount: 60, sort_order: 1 },
      { name: '식용유', price: 5000, qty: 1800, unit: 'ml', yield_: 100, use_amount: 15, sort_order: 2 },
    ],
  },
  {
    name: '교자', emoji: '🥡', category: 'side',
    overhead: 250, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 3500, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '교자 피', price: 2000, qty: 300, unit: 'g', yield_: 100, use_amount: 100, sort_order: 0 },
      { name: '돼지고기', price: 12000, qty: 1000, unit: 'g', yield_: 90, use_amount: 40, sort_order: 1 },
      { name: '부추', price: 2000, qty: 200, unit: 'g', yield_: 90, use_amount: 50, sort_order: 2 },
    ],
  },
  ...SHARED_EXTRAS,
]

const CHINESE_SETS = [
  {
    name: '마라탕 특선',
    category: '마라류',
    channel: 'hall' as const,
    sale_price: 10000,
    menuNames: ['마라탕', '볶음밥'],
  },
  {
    name: '마라샹궈 프리미엄',
    category: '마라류',
    channel: 'hall' as const,
    sale_price: 12000,
    menuNames: ['마라탕', '계란볶음밥'],
  },
  {
    name: '짜장면 정식',
    category: '면류',
    channel: 'hall' as const,
    sale_price: 8500,
    menuNames: ['짜장면', '볶음밥'],
  },
  {
    name: '짬뽕 정식',
    category: '면류',
    channel: 'hall' as const,
    sale_price: 9000,
    menuNames: ['짬뽕', '볶음밥', '춘권'],
  },
  {
    name: '톤코츠 라면',
    category: '면류',
    channel: 'hall' as const,
    sale_price: 9500,
    menuNames: ['톤코츠 라면', '교자'],
  },
  {
    name: '마라탕 배달',
    category: '마라류',
    channel: 'delivery' as const,
    sale_price: 9000,
    menuNames: ['마라탕', '포장용기', '비닐봉투', '냅킨·수저'],
  },
]

// ========== 술집/이자카야 (8개) ==========
const PUB_MENUS: SampleMenu[] = [
  {
    name: '닭발', emoji: '🍗', category: 'main',
    overhead: 800, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 15000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '닭발', price: 8000, qty: 500, unit: 'g', yield_: 85, use_amount: 200, sort_order: 0 },
      { name: '고추장', price: 5000, qty: 500, unit: 'g', yield_: 100, use_amount: 30, sort_order: 1 },
      { name: '대파', price: 1500, qty: 200, unit: 'g', yield_: 80, use_amount: 20, sort_order: 2 },
      { name: '마늘', price: 3000, qty: 300, unit: 'g', yield_: 85, use_amount: 15, sort_order: 3 },
    ],
  },
  {
    name: '모듬전', emoji: '🥘', category: 'main',
    overhead: 1000, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 18000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '부침가루', price: 3000, qty: 500, unit: 'g', yield_: 100, use_amount: 100, sort_order: 0 },
      { name: '김치', price: 5000, qty: 500, unit: 'g', yield_: 100, use_amount: 80, sort_order: 1 },
      { name: '식용유', price: 5000, qty: 1800, unit: 'ml', yield_: 100, use_amount: 20, sort_order: 2 },
      { name: '달걀', price: 3000, qty: 500, unit: 'g', yield_: 100, use_amount: 60, sort_order: 3 },
    ],
  },
  {
    name: '소시지구이', emoji: '🌭', category: 'main',
    overhead: 600, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 12000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '소시지', price: 6000, qty: 500, unit: 'g', yield_: 100, use_amount: 200, sort_order: 0 },
      { name: '고추장', price: 5000, qty: 500, unit: 'g', yield_: 100, use_amount: 15, sort_order: 1 },
      { name: '매실청', price: 4000, qty: 500, unit: 'ml', yield_: 100, use_amount: 20, sort_order: 2 },
    ],
  },
  {
    name: '새우튀김', emoji: '🍤', category: 'main',
    overhead: 800, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 14000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '새우', price: 10000, qty: 400, unit: 'g', yield_: 85, use_amount: 150, sort_order: 0 },
      { name: '튀김가루', price: 3000, qty: 500, unit: 'g', yield_: 100, use_amount: 60, sort_order: 1 },
      { name: '식용유', price: 5000, qty: 1800, unit: 'ml', yield_: 100, use_amount: 25, sort_order: 2 },
    ],
  },
  {
    name: '생맥주', emoji: '🍺', category: 'drink',
    overhead: 300, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 5000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '생맥주 (케그)', price: 80000, qty: 20000, unit: 'ml', yield_: 100, use_amount: 400, sort_order: 0 },
    ],
  },
  {
    name: '막걸리', emoji: '🍶', category: 'drink',
    overhead: 300, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 4000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '막걸리 (병)', price: 3000, qty: 750, unit: 'ml', yield_: 100, use_amount: 300, sort_order: 0 },
    ],
  },
  {
    name: '하이볼', emoji: '🥃', category: 'drink',
    overhead: 400, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 6000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '위스키', price: 25000, qty: 700, unit: 'ml', yield_: 100, use_amount: 40, sort_order: 0 },
      { name: '소다수', price: 1500, qty: 1000, unit: 'ml', yield_: 100, use_amount: 120, sort_order: 1 },
    ],
  },
  ...SHARED_EXTRAS,
]

const PUB_SETS = [
  {
    name: '닭발 매운맛 세트',
    category: '안주류',
    channel: 'hall' as const,
    sale_price: 18000,
    menuNames: ['닭발', '생맥주'],
  },
  {
    name: '모듬전 플래터',
    category: '튀김/구이류',
    channel: 'hall' as const,
    sale_price: 22000,
    menuNames: ['모듬전', '생맥주'],
  },
  {
    name: '소시지 구이 세트',
    category: '튀김/구이류',
    channel: 'hall' as const,
    sale_price: 16000,
    menuNames: ['소시지구이', '막걸리'],
  },
  {
    name: '새우튀김 대량',
    category: '튀김/구이류',
    channel: 'hall' as const,
    sale_price: 20000,
    menuNames: ['새우튀김', '생맥주'],
  },
  {
    name: '버터새우 프리미엄',
    category: '튀김/구이류',
    channel: 'hall' as const,
    sale_price: 24000,
    menuNames: ['버터새우', '하이볼'],
  },
  {
    name: '닭발 배달',
    category: '안주류',
    channel: 'delivery' as const,
    sale_price: 20000,
    menuNames: ['닭발', '포장용기', '비닐봉투', '냅킨·수저'],
  },
]

// ========== 양식 (7개) ==========
const WESTERN_MENUS: SampleMenu[] = [
  {
    name: '스파게티', emoji: '🍝', category: 'main',
    overhead: 800, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 13000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '파스타면', price: 5000, qty: 500, unit: 'g', yield_: 100, use_amount: 120, sort_order: 0 },
      { name: '토마토소스', price: 4000, qty: 500, unit: 'g', yield_: 100, use_amount: 80, sort_order: 1 },
      { name: '올리브유', price: 12000, qty: 500, unit: 'ml', yield_: 100, use_amount: 10, sort_order: 2 },
      { name: '파마산치즈', price: 8000, qty: 200, unit: 'g', yield_: 100, use_amount: 10, sort_order: 3 },
    ],
  },
  {
    name: '감자수프', emoji: '🍵', category: 'main',
    overhead: 500, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 8000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '감자', price: 3000, qty: 1000, unit: 'g', yield_: 80, use_amount: 200, sort_order: 0 },
      { name: '생크림', price: 4500, qty: 500, unit: 'ml', yield_: 100, use_amount: 80, sort_order: 1 },
      { name: '버터', price: 7000, qty: 500, unit: 'g', yield_: 100, use_amount: 15, sort_order: 2 },
      { name: '양파', price: 2000, qty: 1000, unit: 'g', yield_: 85, use_amount: 50, sort_order: 3 },
    ],
  },
  {
    name: '피자', emoji: '🍕', category: 'main',
    overhead: 1200, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 18000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '피자도우', price: 3000, qty: 300, unit: 'g', yield_: 100, use_amount: 200, sort_order: 0 },
      { name: '토마토소스', price: 4000, qty: 500, unit: 'g', yield_: 100, use_amount: 60, sort_order: 1 },
      { name: '모짜렐라치즈', price: 9000, qty: 500, unit: 'g', yield_: 100, use_amount: 100, sort_order: 2 },
      { name: '페페로니', price: 10000, qty: 300, unit: 'g', yield_: 100, use_amount: 40, sort_order: 3 },
    ],
  },
  {
    name: '스테이크', emoji: '🥩', category: 'main',
    overhead: 1500, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 22000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '소 등심', price: 20000, qty: 500, unit: 'g', yield_: 85, use_amount: 150, sort_order: 0 },
      { name: '버터', price: 7000, qty: 500, unit: 'g', yield_: 100, use_amount: 20, sort_order: 1 },
      { name: '마늘', price: 3000, qty: 300, unit: 'g', yield_: 85, use_amount: 10, sort_order: 2 },
      { name: '올리브유', price: 12000, qty: 500, unit: 'ml', yield_: 100, use_amount: 15, sort_order: 3 },
    ],
  },
  {
    name: '시저샐러드', emoji: '🥗', category: 'side',
    overhead: 400, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 8000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '로메인 상추', price: 3000, qty: 200, unit: 'g', yield_: 80, use_amount: 120, sort_order: 0 },
      { name: '파마산치즈', price: 8000, qty: 200, unit: 'g', yield_: 100, use_amount: 20, sort_order: 1 },
      { name: '크루통', price: 3000, qty: 200, unit: 'g', yield_: 100, use_amount: 30, sort_order: 2 },
      { name: '시저드레싱', price: 6000, qty: 500, unit: 'ml', yield_: 100, use_amount: 40, sort_order: 3 },
    ],
  },
  {
    name: '가릭브레드', emoji: '🍞', category: 'side',
    overhead: 300, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 5000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '바게뜨', price: 3000, qty: 300, unit: 'g', yield_: 100, use_amount: 150, sort_order: 0 },
      { name: '버터', price: 7000, qty: 500, unit: 'g', yield_: 100, use_amount: 30, sort_order: 1 },
      { name: '마늘', price: 3000, qty: 300, unit: 'g', yield_: 85, use_amount: 15, sort_order: 2 },
      { name: '파슬리', price: 2000, qty: 50, unit: 'g', yield_: 85, use_amount: 5, sort_order: 3 },
    ],
  },
  ...SHARED_EXTRAS,
]

const WESTERN_SETS = [
  {
    name: '미트볼 스파게티 점심',
    category: '파스타류',
    channel: 'hall' as const,
    sale_price: 13000,
    menuNames: ['스파게티', '감자수프'],
  },
  {
    name: '크림 알프레도 스파게티',
    category: '파스타류',
    channel: 'hall' as const,
    sale_price: 14000,
    menuNames: ['스파게티', '시저샐러드'],
  },
  {
    name: '페퍼로니 피자 A세트',
    category: '피자류',
    channel: 'hall' as const,
    sale_price: 22000,
    menuNames: ['피자', '감자수프'],
  },
  {
    name: '마르게리타 피자 세트',
    category: '피자류',
    channel: 'hall' as const,
    sale_price: 20000,
    menuNames: ['피자', '시저샐러드'],
  },
  {
    name: '프라임 립 스테이크 점심',
    category: '스테이크/고기류',
    channel: 'hall' as const,
    sale_price: 26000,
    menuNames: ['스테이크', '시저샐러드', '가릭브레드'],
  },
  {
    name: '립아이 스테이크 디너',
    category: '스테이크/고기류',
    channel: 'hall' as const,
    sale_price: 32000,
    menuNames: ['스테이크', '감자수프', '가릭브레드'],
  },
  {
    name: '시저샐러드 점심',
    category: '샐러드/사이드',
    channel: 'hall' as const,
    sale_price: 10000,
    menuNames: ['시저샐러드', '가릭브레드'],
  },
  {
    name: '스파게티 배달',
    category: '파스타류',
    channel: 'delivery' as const,
    sale_price: 15000,
    menuNames: ['스파게티', '포장용기', '비닐봉투', '냅킨·수저'],
  },
]

// ========== 일식 (9개) ==========
const JAPANESE_MENUS: SampleMenu[] = [
  {
    name: '연어초밥', emoji: '🍣', category: 'main',
    overhead: 1000, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 16000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '연어', price: 25000, qty: 500, unit: 'g', yield_: 90, use_amount: 80, sort_order: 0 },
      { name: '초밥용 쌀', price: 40000, qty: 10000, unit: 'g', yield_: 100, use_amount: 120, sort_order: 1 },
      { name: '와사비', price: 6000, qty: 200, unit: 'g', yield_: 100, use_amount: 5, sort_order: 2 },
      { name: '초밥김', price: 5000, qty: 50, unit: 'g', yield_: 100, use_amount: 10, sort_order: 3 },
    ],
  },
  {
    name: '라멘', emoji: '🍜', category: 'main',
    overhead: 700, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 11000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '라멘 면', price: 3000, qty: 300, unit: 'g', yield_: 100, use_amount: 120, sort_order: 0 },
      { name: '돈코츠 육수', price: 5000, qty: 1000, unit: 'ml', yield_: 100, use_amount: 400, sort_order: 1 },
      { name: '차슈', price: 12000, qty: 500, unit: 'g', yield_: 85, use_amount: 60, sort_order: 2 },
      { name: '반숙달걀', price: 3000, qty: 500, unit: 'g', yield_: 100, use_amount: 50, sort_order: 3 },
    ],
  },
  {
    name: '돈카츠', emoji: '🍱', category: 'main',
    overhead: 800, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 13000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '돼지등심', price: 10000, qty: 500, unit: 'g', yield_: 90, use_amount: 150, sort_order: 0 },
      { name: '빵가루', price: 2000, qty: 500, unit: 'g', yield_: 100, use_amount: 50, sort_order: 1 },
      { name: '식용유', price: 5000, qty: 1800, unit: 'ml', yield_: 100, use_amount: 30, sort_order: 2 },
      { name: '계란', price: 3000, qty: 500, unit: 'g', yield_: 100, use_amount: 50, sort_order: 3 },
    ],
  },
  {
    name: '규동', emoji: '🍱', category: 'main',
    overhead: 700, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 12000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '소 양지', price: 14000, qty: 500, unit: 'g', yield_: 85, use_amount: 120, sort_order: 0 },
      { name: '양파', price: 2000, qty: 1000, unit: 'g', yield_: 85, use_amount: 60, sort_order: 1 },
      { name: '쌀', price: 40000, qty: 10000, unit: 'g', yield_: 100, use_amount: 100, sort_order: 2 },
      { name: '간장 양념', price: 3000, qty: 500, unit: 'ml', yield_: 100, use_amount: 30, sort_order: 3 },
    ],
  },
  {
    name: '우동', emoji: '🍜', category: 'main',
    overhead: 600, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 8500, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '우동 면', price: 2500, qty: 400, unit: 'g', yield_: 100, use_amount: 150, sort_order: 0 },
      { name: '멸치 육수', price: 4000, qty: 1000, unit: 'ml', yield_: 100, use_amount: 400, sort_order: 1 },
      { name: '파', price: 1500, qty: 200, unit: 'g', yield_: 85, use_amount: 30, sort_order: 2 },
    ],
  },
  {
    name: '미소국', emoji: '🍵', category: 'side',
    overhead: 200, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 0, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '미소된장', price: 4000, qty: 500, unit: 'g', yield_: 100, use_amount: 30, sort_order: 0 },
      { name: '두부', price: 1500, qty: 300, unit: 'g', yield_: 100, use_amount: 50, sort_order: 1 },
      { name: '미역', price: 3000, qty: 100, unit: 'g', yield_: 100, use_amount: 5, sort_order: 2 },
    ],
  },
  {
    name: '튀김우동', emoji: '🍜', category: 'main',
    overhead: 700, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 10000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '우동 면', price: 2500, qty: 400, unit: 'g', yield_: 100, use_amount: 150, sort_order: 0 },
      { name: '야채튀김', price: 5000, qty: 300, unit: 'g', yield_: 100, use_amount: 80, sort_order: 1 },
      { name: '멸치 육수', price: 4000, qty: 1000, unit: 'ml', yield_: 100, use_amount: 400, sort_order: 2 },
    ],
  },
  {
    name: '오니기리', emoji: '🍙', category: 'side',
    overhead: 150, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 2500, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '쌀', price: 40000, qty: 10000, unit: 'g', yield_: 100, use_amount: 80, sort_order: 0 },
      { name: '김', price: 5000, qty: 50, unit: 'g', yield_: 100, use_amount: 3, sort_order: 1 },
      { name: '우메 절임', price: 4000, qty: 200, unit: 'g', yield_: 100, use_amount: 15, sort_order: 2 },
    ],
  },
  ...SHARED_EXTRAS,
]

const JAPANESE_SETS = [
  {
    name: '연어 특상 세트',
    category: '초밥/롤',
    channel: 'hall' as const,
    sale_price: 18000,
    menuNames: ['연어초밥', '미소국'],
  },
  {
    name: '성게알 프리미엄',
    category: '초밥/롤',
    channel: 'hall' as const,
    sale_price: 22000,
    menuNames: ['유니', '미소국'],
  },
  {
    name: '연어롤 세트',
    category: '초밥/롤',
    channel: 'hall' as const,
    sale_price: 16000,
    menuNames: ['연어/아보카도 롤', '오니기리'],
  },
  {
    name: '돈코츠 라멘 기본',
    category: '라멘/우동',
    channel: 'hall' as const,
    sale_price: 13000,
    menuNames: ['라멘', '오니기리'],
  },
  {
    name: '우동 정식',
    category: '라멘/우동',
    channel: 'hall' as const,
    sale_price: 12000,
    menuNames: ['우동', '오니기리'],
  },
  {
    name: '돈카츠 커틀릿 정식',
    category: '덮밥',
    channel: 'hall' as const,
    sale_price: 15000,
    menuNames: ['돈카츠', '미소국', '오니기리'],
  },
  {
    name: '소고기 규동 세트',
    category: '덮밥',
    channel: 'hall' as const,
    sale_price: 14000,
    menuNames: ['규동', '미소국'],
  },
  {
    name: '돈카츠 배달',
    category: '덮밥',
    channel: 'delivery' as const,
    sale_price: 15000,
    menuNames: ['돈카츠', '포장용기', '비닐봉투', '냅킨·수저'],
  },
]

// ========== 치킨/패스트푸드 (8개) ==========
const CHICKEN_MENUS: SampleMenu[] = [
  {
    name: '후라이드치킨', emoji: '🍗', category: 'main',
    overhead: 1000, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 18000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '닭(1마리)', price: 8000, qty: 900, unit: 'g', yield_: 80, use_amount: 450, sort_order: 0 },
      { name: '튀김가루', price: 3000, qty: 500, unit: 'g', yield_: 100, use_amount: 80, sort_order: 1 },
      { name: '식용유', price: 5000, qty: 1800, unit: 'ml', yield_: 100, use_amount: 50, sort_order: 2 },
    ],
  },
  {
    name: '양념치킨', emoji: '🍗', category: 'main',
    overhead: 1200, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 20000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '닭(1마리)', price: 8000, qty: 900, unit: 'g', yield_: 80, use_amount: 450, sort_order: 0 },
      { name: '튀김가루', price: 3000, qty: 500, unit: 'g', yield_: 100, use_amount: 80, sort_order: 1 },
      { name: '양념소스', price: 6000, qty: 500, unit: 'g', yield_: 100, use_amount: 60, sort_order: 2 },
    ],
  },
  {
    name: '간장치킨', emoji: '🍗', category: 'main',
    overhead: 1100, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 19000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '닭(1마리)', price: 8000, qty: 900, unit: 'g', yield_: 80, use_amount: 450, sort_order: 0 },
      { name: '튀김가루', price: 3000, qty: 500, unit: 'g', yield_: 100, use_amount: 80, sort_order: 1 },
      { name: '간장소스', price: 5000, qty: 500, unit: 'ml', yield_: 100, use_amount: 50, sort_order: 2 },
    ],
  },
  {
    name: '핫윙', emoji: '🔥🍗', category: 'main',
    overhead: 900, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 16000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '닭 날개', price: 7000, qty: 500, unit: 'g', yield_: 85, use_amount: 250, sort_order: 0 },
      { name: '핫소스', price: 7000, qty: 500, unit: 'g', yield_: 100, use_amount: 40, sort_order: 1 },
      { name: '식용유', price: 5000, qty: 1800, unit: 'ml', yield_: 100, use_amount: 40, sort_order: 2 },
    ],
  },
  {
    name: '감자튀김', emoji: '🍟', category: 'side',
    overhead: 300, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 4000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '냉동감자', price: 6000, qty: 1000, unit: 'g', yield_: 100, use_amount: 150, sort_order: 0 },
      { name: '식용유', price: 5000, qty: 1800, unit: 'ml', yield_: 100, use_amount: 30, sort_order: 1 },
    ],
  },
  {
    name: '치즈볼', emoji: '🧀', category: 'side',
    overhead: 250, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 4500, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '치즈 필링', price: 8000, qty: 300, unit: 'g', yield_: 100, use_amount: 80, sort_order: 0 },
      { name: '밀가루 반죽', price: 2000, qty: 500, unit: 'g', yield_: 100, use_amount: 60, sort_order: 1 },
      { name: '식용유', price: 5000, qty: 1800, unit: 'ml', yield_: 100, use_amount: 25, sort_order: 2 },
    ],
  },
  {
    name: '양파링', emoji: '🧅', category: 'side',
    overhead: 300, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 4000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '양파', price: 2000, qty: 1000, unit: 'g', yield_: 85, use_amount: 150, sort_order: 0 },
      { name: '튀김가루', price: 3000, qty: 500, unit: 'g', yield_: 100, use_amount: 50, sort_order: 1 },
      { name: '식용유', price: 5000, qty: 1800, unit: 'ml', yield_: 100, use_amount: 30, sort_order: 2 },
    ],
  },
  ...SHARED_EXTRAS,
]

const CHICKEN_SETS = [
  {
    name: '크리스피 후라이드 박스',
    category: '치킨류',
    channel: 'hall' as const,
    sale_price: 21000,
    menuNames: ['후라이드치킨', '감자튀김', '콜라'],
  },
  {
    name: '매콤 양념 치킨',
    category: '치킨류',
    channel: 'hall' as const,
    sale_price: 23000,
    menuNames: ['양념치킨', '감자튀김'],
  },
  {
    name: '간장 불닭 스페셜',
    category: '치킨류',
    channel: 'hall' as const,
    sale_price: 24000,
    menuNames: ['간장 불닭', '감자튀김'],
  },
  {
    name: '핫윙 플레이트',
    category: '치킨류',
    channel: 'hall' as const,
    sale_price: 19000,
    menuNames: ['핫윙', '양파튀김', '감자튀김'],
  },
  {
    name: '치즈볼 세트',
    category: '사이드',
    channel: 'hall' as const,
    sale_price: 7000,
    menuNames: ['치즈볼', '콜라'],
  },
  {
    name: '옥수수 무침',
    category: '사이드',
    channel: 'hall' as const,
    sale_price: 6000,
    menuNames: ['옥수수 무침'],
  },
  {
    name: '치킨 배달 세트',
    category: '치킨류',
    channel: 'delivery' as const,
    sale_price: 22000,
    menuNames: ['후라이드치킨', '감자튀김', '포장용기', '비닐봉투', '냅킨·수저'],
  },
]

// ========== 분식 (7개) ==========
const SNACK_MENUS: SampleMenu[] = [
  {
    name: '떡볶이', emoji: '🌶️', category: 'main',
    overhead: 400, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 5000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '가래떡', price: 4000, qty: 500, unit: 'g', yield_: 100, use_amount: 200, sort_order: 0 },
      { name: '고추장', price: 5000, qty: 500, unit: 'g', yield_: 100, use_amount: 30, sort_order: 1 },
      { name: '어묵', price: 3000, qty: 300, unit: 'g', yield_: 100, use_amount: 80, sort_order: 2 },
      { name: '대파', price: 1500, qty: 200, unit: 'g', yield_: 80, use_amount: 15, sort_order: 3 },
    ],
  },
  {
    name: '순대', emoji: '🫘', category: 'main',
    overhead: 300, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 5000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '순대', price: 7000, qty: 500, unit: 'g', yield_: 100, use_amount: 200, sort_order: 0 },
      { name: '소금', price: 1000, qty: 1000, unit: 'g', yield_: 100, use_amount: 3, sort_order: 1 },
      { name: '양념간장', price: 3000, qty: 500, unit: 'ml', yield_: 100, use_amount: 30, sort_order: 2 },
    ],
  },
  {
    name: '김밥', emoji: '🍙', category: 'main',
    overhead: 300, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 3500, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '쌀', price: 40000, qty: 10000, unit: 'g', yield_: 100, use_amount: 100, sort_order: 0 },
      { name: '김', price: 5000, qty: 50, unit: 'g', yield_: 100, use_amount: 5, sort_order: 1 },
      { name: '단무지', price: 2000, qty: 300, unit: 'g', yield_: 100, use_amount: 30, sort_order: 2 },
      { name: '시금치', price: 2500, qty: 200, unit: 'g', yield_: 85, use_amount: 40, sort_order: 3 },
    ],
  },
  {
    name: '야채튀김', emoji: '🌶️', category: 'main',
    overhead: 350, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 4500, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '호박', price: 2000, qty: 300, unit: 'g', yield_: 85, use_amount: 100, sort_order: 0 },
      { name: '고구마', price: 3000, qty: 500, unit: 'g', yield_: 85, use_amount: 120, sort_order: 1 },
      { name: '튀김가루', price: 3000, qty: 500, unit: 'g', yield_: 100, use_amount: 60, sort_order: 2 },
      { name: '식용유', price: 5000, qty: 1800, unit: 'ml', yield_: 100, use_amount: 25, sort_order: 3 },
    ],
  },
  {
    name: '주먹밥', emoji: '🍙', category: 'side',
    overhead: 200, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 2500, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '쌀', price: 40000, qty: 10000, unit: 'g', yield_: 100, use_amount: 80, sort_order: 0 },
      { name: '계란', price: 3000, qty: 500, unit: 'g', yield_: 100, use_amount: 40, sort_order: 1 },
      { name: '김가루', price: 4000, qty: 100, unit: 'g', yield_: 100, use_amount: 10, sort_order: 2 },
    ],
  },
  {
    name: '오뎅탕', emoji: '🍲', category: 'side',
    overhead: 250, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 3000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '오뎅 튀김', price: 3000, qty: 300, unit: 'g', yield_: 100, use_amount: 150, sort_order: 0 },
      { name: '멸치 국물', price: 2000, qty: 1000, unit: 'ml', yield_: 100, use_amount: 400, sort_order: 1 },
      { name: '대파', price: 1500, qty: 200, unit: 'g', yield_: 80, use_amount: 20, sort_order: 2 },
    ],
  },
  ...SHARED_EXTRAS,
]

const SNACK_SETS = [
  {
    name: '떡볶이 스페셜',
    category: '핫 스낵',
    channel: 'hall' as const,
    sale_price: 7000,
    menuNames: ['떡볶이', '순대'],
  },
  {
    name: '떡튀순 콤보',
    category: '핫 스낵',
    channel: 'hall' as const,
    sale_price: 8500,
    menuNames: ['떡볶이', '야채튀김', '순대'],
  },
  {
    name: '김밥 정식',
    category: '쌀 요리',
    channel: 'hall' as const,
    sale_price: 7000,
    menuNames: ['김밥', '떡볶이'],
  },
  {
    name: '주먹밥 도시락',
    category: '쌀 요리',
    channel: 'hall' as const,
    sale_price: 6000,
    menuNames: ['주먹밥'],
  },
  {
    name: '야채튀김 세트',
    category: '핫 스낵',
    channel: 'hall' as const,
    sale_price: 7500,
    menuNames: ['야채튀김', '주먹밥', '오뎅탕'],
  },
  {
    name: '오뎅탕 따뜻함',
    category: '국/스프',
    channel: 'hall' as const,
    sale_price: 5000,
    menuNames: ['오뎅탕'],
  },
  {
    name: '분식 배달',
    category: '핫 스낵',
    channel: 'delivery' as const,
    sale_price: 10000,
    menuNames: ['떡볶이', '김밥', '포장용기', '비닐봉투', '냅킨·수저'],
  },
]

// ========== 기타 (7개) ==========
const OTHER_MENUS: SampleMenu[] = [
  {
    name: '토마토파스타', emoji: '🍝', category: 'main',
    overhead: 700, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 12000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '파스타면', price: 5000, qty: 500, unit: 'g', yield_: 100, use_amount: 120, sort_order: 0 },
      { name: '토마토', price: 3000, qty: 500, unit: 'g', yield_: 85, use_amount: 200, sort_order: 1 },
      { name: '바질', price: 4000, qty: 100, unit: 'g', yield_: 90, use_amount: 10, sort_order: 2 },
      { name: '마늘', price: 3000, qty: 300, unit: 'g', yield_: 85, use_amount: 10, sort_order: 3 },
    ],
  },
  {
    name: '버터구이', emoji: '🥘', category: 'main',
    overhead: 600, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 10000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '주재료', price: 8000, qty: 500, unit: 'g', yield_: 85, use_amount: 150, sort_order: 0 },
      { name: '버터', price: 7000, qty: 500, unit: 'g', yield_: 100, use_amount: 25, sort_order: 1 },
      { name: '마늘', price: 3000, qty: 300, unit: 'g', yield_: 85, use_amount: 15, sort_order: 2 },
      { name: '소금·향신료', price: 2000, qty: 200, unit: 'g', yield_: 100, use_amount: 5, sort_order: 3 },
    ],
  },
  {
    name: '현지식스튜', emoji: '🍲', category: 'main',
    overhead: 800, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 11000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '쇠고기', price: 12000, qty: 500, unit: 'g', yield_: 90, use_amount: 120, sort_order: 0 },
      { name: '감자', price: 3000, qty: 1000, unit: 'g', yield_: 80, use_amount: 150, sort_order: 1 },
      { name: '당근', price: 1500, qty: 300, unit: 'g', yield_: 85, use_amount: 80, sort_order: 2 },
      { name: '생크림', price: 4500, qty: 500, unit: 'ml', yield_: 100, use_amount: 100, sort_order: 3 },
    ],
  },
  {
    name: '시즈닝라이스', emoji: '🍚', category: 'main',
    overhead: 500, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 8000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '쌀', price: 40000, qty: 10000, unit: 'g', yield_: 100, use_amount: 130, sort_order: 0 },
      { name: '시즈닝', price: 5000, qty: 300, unit: 'g', yield_: 100, use_amount: 40, sort_order: 1 },
      { name: '버터', price: 7000, qty: 500, unit: 'g', yield_: 100, use_amount: 20, sort_order: 2 },
    ],
  },
  {
    name: '아이스초콜릿', emoji: '🍫', category: 'drink',
    overhead: 300, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 5000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '초콜릿시럽', price: 8000, qty: 1000, unit: 'ml', yield_: 100, use_amount: 30, sort_order: 0 },
      { name: '우유', price: 2500, qty: 1000, unit: 'ml', yield_: 100, use_amount: 200, sort_order: 1 },
      { name: '얼음', price: 1000, qty: 2000, unit: 'g', yield_: 100, use_amount: 150, sort_order: 2 },
    ],
  },
  {
    name: '에이드', emoji: '🧃', category: 'drink',
    overhead: 250, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 4500, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '과일 시럽', price: 6000, qty: 500, unit: 'ml', yield_: 100, use_amount: 30, sort_order: 0 },
      { name: '소다수', price: 1500, qty: 1000, unit: 'ml', yield_: 100, use_amount: 200, sort_order: 1 },
      { name: '상큼한 과일', price: 2000, qty: 200, unit: 'g', yield_: 80, use_amount: 50, sort_order: 2 },
    ],
  },
  ...SHARED_EXTRAS,
]

const OTHER_SETS = [
  {
    name: '토마토파스타 점심',
    category: '파스타',
    channel: 'hall' as const,
    sale_price: 14000,
    menuNames: ['토마토파스타', '에이드'],
  },
  {
    name: '버터구이 스테이크',
    category: '고기요리',
    channel: 'hall' as const,
    sale_price: 12000,
    menuNames: ['버터구이', '아이스초콜릿'],
  },
  {
    name: '현지식 스튜 정식',
    category: '고기요리',
    channel: 'hall' as const,
    sale_price: 13000,
    menuNames: ['현지식스튜', '시즈닝라이스'],
  },
  {
    name: '시즈닝 라이스',
    category: '밥요리',
    channel: 'hall' as const,
    sale_price: 8000,
    menuNames: ['시즈닝라이스'],
  },
  {
    name: '아이스 초콜릿',
    category: '음료',
    channel: 'hall' as const,
    sale_price: 5000,
    menuNames: ['아이스초콜릿'],
  },
  {
    name: '상큼한 에이드',
    category: '음료',
    channel: 'hall' as const,
    sale_price: 4500,
    menuNames: ['에이드'],
  },
  {
    name: '기타 배달 세트',
    category: '파스타',
    channel: 'delivery' as const,
    sale_price: 13000,
    menuNames: ['토마토파스타', '포장용기', '비닐봉투', '냅킨·수저'],
  },
]

// FIRST_LOGIN_MENU_SAMPLES 호환성 유지
export const FIRST_LOGIN_MENU_SAMPLES: SampleMenu[] = KOREAN_MENUS

// SAMPLE_SET_DEFINITIONS 호환성 유지
export const SAMPLE_SET_DEFINITIONS = KOREAN_SETS

// INDUSTRY_SAMPLES: 업종별 샘플 데이터
export const INDUSTRY_SAMPLES: Record<string, { menus: SampleMenu[]; sets: typeof SAMPLE_SET_DEFINITIONS }> = {
  '한식': {
    menus: KOREAN_MENUS,
    sets: KOREAN_SETS,
  },
  '카페/디저트': {
    menus: CAFE_MENUS,
    sets: CAFE_SETS,
  },
  '중식': {
    menus: CHINESE_MENUS,
    sets: CHINESE_SETS,
  },
  '술집/이자카야': {
    menus: PUB_MENUS,
    sets: PUB_SETS,
  },
  '양식': {
    menus: WESTERN_MENUS,
    sets: WESTERN_SETS,
  },
  '일식': {
    menus: JAPANESE_MENUS,
    sets: JAPANESE_SETS,
  },
  '치킨/패스트푸드': {
    menus: CHICKEN_MENUS,
    sets: CHICKEN_SETS,
  },
  '분식': {
    menus: SNACK_MENUS,
    sets: SNACK_SETS,
  },
  '기타': {
    menus: OTHER_MENUS,
    sets: OTHER_SETS,
  },
}

// ALL_SAMPLE_MENUS: 모든 업종의 메뉴를 한 배열로 (backfillIngredients 호환용)
export const ALL_SAMPLE_MENUS = Object.values(INDUSTRY_SAMPLES).flatMap(s => s.menus)
