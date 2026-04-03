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

export const FIRST_LOGIN_MENU_SAMPLES: SampleMenu[] = [
  {
    name: '제육볶음', emoji: '🍖', category: 'main',
    overhead: 800, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 9000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '돼지고기 앞다리살', price: 12000, qty: 1000, unit: 'g',  yield_: 90,  use_amount: 150, sort_order: 0 },
      { name: '양파',             price: 2000,  qty: 1000, unit: 'g',  yield_: 85,  use_amount: 80,  sort_order: 1 },
      { name: '대파',             price: 1500,  qty: 200,  unit: 'g',  yield_: 80,  use_amount: 20,  sort_order: 2 },
      { name: '고추장',           price: 5000,  qty: 500,  unit: 'g',  yield_: 100, use_amount: 25,  sort_order: 3 },
      { name: '참기름',           price: 8000,  qty: 500,  unit: 'ml', yield_: 100, use_amount: 5,   sort_order: 4 },
    ],
  },
  {
    name: '된장찌개', emoji: '🍲', category: 'main',
    overhead: 500, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 8000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '된장',   price: 4000, qty: 500,  unit: 'g', yield_: 100, use_amount: 40,  sort_order: 0 },
      { name: '두부',   price: 1500, qty: 300,  unit: 'g', yield_: 100, use_amount: 100, sort_order: 1 },
      { name: '애호박', price: 1500, qty: 300,  unit: 'g', yield_: 85,  use_amount: 80,  sort_order: 2 },
      { name: '팽이버섯', price: 2000, qty: 150, unit: 'g', yield_: 90, use_amount: 30,  sort_order: 3 },
    ],
  },
  {
    name: '순두부찌개', emoji: '🫕', category: 'main',
    overhead: 600, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 9000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '순두부',   price: 1200, qty: 350,   unit: 'g',  yield_: 100, use_amount: 200, sort_order: 0 },
      { name: '고춧가루', price: 8000, qty: 500,   unit: 'g',  yield_: 100, use_amount: 15,  sort_order: 1 },
      { name: '달걀',     price: 3000, qty: 500,   unit: 'g',  yield_: 100, use_amount: 50,  sort_order: 2 },
      { name: '대파',     price: 1500, qty: 200,   unit: 'g',  yield_: 80,  use_amount: 20,  sort_order: 3 },
    ],
  },
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
      { name: '달걀',   price: 3000, qty: 500,  unit: 'g',  yield_: 100, use_amount: 50, sort_order: 0 },
      { name: '식용유', price: 5000, qty: 1800, unit: 'ml', yield_: 100, use_amount: 5,  sort_order: 1 },
    ],
  },
  {
    name: '김치', emoji: '🥬', category: 'banchan',
    overhead: 50, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 0, batch_yield: 800, serving_size: 40,
    ingredients: [
      { name: '배추',     price: 3000, qty: 1500, unit: 'g', yield_: 70,  use_amount: 500, sort_order: 0 },
      { name: '고춧가루', price: 8000, qty: 500,  unit: 'g', yield_: 100, use_amount: 30,  sort_order: 1 },
      { name: '새우젓',   price: 6000, qty: 500,  unit: 'g', yield_: 100, use_amount: 20,  sort_order: 2 },
      { name: '마늘',     price: 3000, qty: 300,  unit: 'g', yield_: 85,  use_amount: 20,  sort_order: 3 },
    ],
  },
  {
    name: '콩나물무침', emoji: '🌱', category: 'banchan',
    overhead: 30, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 0, batch_yield: 250, serving_size: 30,
    ingredients: [
      { name: '콩나물', price: 1500, qty: 300, unit: 'g',  yield_: 90,  use_amount: 100, sort_order: 0 },
      { name: '참기름', price: 8000, qty: 500, unit: 'ml', yield_: 100, use_amount: 3,   sort_order: 1 },
    ],
  },
  {
    name: '콜라', emoji: '🥤', category: 'drink',
    overhead: 200, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 2000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '콜라 (1.5L)', price: 1500, qty: 1500, unit: 'ml', yield_: 100, use_amount: 350, sort_order: 0 },
    ],
  },
  {
    name: '식혜', emoji: '🧃', category: 'drink',
    overhead: 150, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 2500, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '엿기름', price: 2000, qty: 500,  unit: 'g', yield_: 100, use_amount: 50, sort_order: 0 },
      { name: '쌀',     price: 40000, qty: 10000, unit: 'g', yield_: 100, use_amount: 30, sort_order: 1 },
      { name: '설탕',   price: 2000, qty: 1000, unit: 'g', yield_: 100, use_amount: 30, sort_order: 2 },
    ],
  },
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

export const SAMPLE_SET_DEFINITIONS: {
  name: string
  channel: 'delivery' | 'hall'
  sale_price: number
  menuNames: string[]
}[] = [
  {
    name: '제육볶음 정식',
    channel: 'hall',
    sale_price: 9000,
    menuNames: ['제육볶음', '공깃밥', '김치'],
  },
  {
    name: '된장찌개 정식',
    channel: 'hall',
    sale_price: 8000,
    menuNames: ['된장찌개', '공깃밥', '콩나물무침', '김치'],
  },
  {
    name: '순두부찌개 배달 세트',
    channel: 'delivery',
    sale_price: 10000,
    menuNames: ['순두부찌개', '공깃밥', '김치', '포장용기', '비닐봉투', '냅킨·수저'],
  },
]

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

// 카페/디저트
const CAFE_MENUS: SampleMenu[] = [
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
    name: '머핀', emoji: '🧁', category: 'side',
    overhead: 200, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 3000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '밀가루', price: 3000, qty: 1000, unit: 'g', yield_: 100, use_amount: 80, sort_order: 0 },
      { name: '버터', price: 7000, qty: 500, unit: 'g', yield_: 100, use_amount: 30, sort_order: 1 },
      { name: '설탕', price: 2000, qty: 1000, unit: 'g', yield_: 100, use_amount: 40, sort_order: 2 },
    ],
  },
  ...SHARED_EXTRAS,
]

const CAFE_SETS = [
  {
    name: '아메리카노 세트',
    channel: 'hall' as const,
    sale_price: 6000,
    menuNames: ['아메리카노', '머핀'],
  },
  {
    name: '라떼 세트',
    channel: 'hall' as const,
    sale_price: 7500,
    menuNames: ['카페라떼', '머핀'],
  },
  {
    name: '모카 배달 세트',
    channel: 'delivery' as const,
    sale_price: 8000,
    menuNames: ['카페모카', '머핀', '포장용기', '비닐봉투'],
  },
]

// 중식
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
  ...SHARED_EXTRAS,
]

const CHINESE_SETS = [
  {
    name: '마라탕 세트',
    channel: 'hall' as const,
    sale_price: 10000,
    menuNames: ['마라탕', '볶음밥'],
  },
  {
    name: '짜장면 정식',
    channel: 'hall' as const,
    sale_price: 8500,
    menuNames: ['짜장면', '볶음밥'],
  },
  {
    name: '마라탕 배달',
    channel: 'delivery' as const,
    sale_price: 9000,
    menuNames: ['마라탕', '포장용기', '비닐봉투', '냅킨·수저'],
  },
]

// 술집/이자카야
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
    name: '생맥주', emoji: '🍺', category: 'drink',
    overhead: 300, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 5000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '생맥주 (케그)', price: 80000, qty: 20000, unit: 'ml', yield_: 100, use_amount: 400, sort_order: 0 },
    ],
  },
  ...SHARED_EXTRAS,
]

const PUB_SETS = [
  {
    name: '닭발 세트',
    channel: 'hall' as const,
    sale_price: 18000,
    menuNames: ['닭발', '생맥주'],
  },
  {
    name: '모듬전 세트',
    channel: 'hall' as const,
    sale_price: 22000,
    menuNames: ['모듬전', '생맥주'],
  },
  {
    name: '닭발 배달',
    channel: 'delivery' as const,
    sale_price: 20000,
    menuNames: ['닭발', '포장용기', '비닐봉투', '냅킨·수저'],
  },
]

// 양식
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
    ],
  },
  ...SHARED_EXTRAS,
]

const WESTERN_SETS = [
  {
    name: '스파게티 점심',
    channel: 'hall' as const,
    sale_price: 13000,
    menuNames: ['스파게티', '감자수프'],
  },
  {
    name: '피자 홀 세트',
    channel: 'hall' as const,
    sale_price: 22000,
    menuNames: ['피자', '감자수프'],
  },
  {
    name: '스파게티 배달',
    channel: 'delivery' as const,
    sale_price: 15000,
    menuNames: ['스파게티', '포장용기', '비닐봉투', '냅킨·수저'],
  },
]

// 일식
const JAPANESE_MENUS: SampleMenu[] = [
  {
    name: '연어초밥', emoji: '🍣', category: 'main',
    overhead: 1000, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 16000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '연어', price: 25000, qty: 500, unit: 'g', yield_: 90, use_amount: 80, sort_order: 0 },
      { name: '초밥용 쌀', price: 40000, qty: 10000, unit: 'g', yield_: 100, use_amount: 120, sort_order: 1 },
      { name: '와사비', price: 6000, qty: 200, unit: 'g', yield_: 100, use_amount: 5, sort_order: 2 },
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
    ],
  },
  {
    name: '미소국', emoji: '🍵', category: 'side',
    overhead: 200, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 0, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '미소된장', price: 4000, qty: 500, unit: 'g', yield_: 100, use_amount: 30, sort_order: 0 },
      { name: '두부', price: 1500, qty: 300, unit: 'g', yield_: 100, use_amount: 50, sort_order: 1 },
    ],
  },
  ...SHARED_EXTRAS,
]

const JAPANESE_SETS = [
  {
    name: '연어초밥 세트',
    channel: 'hall' as const,
    sale_price: 18000,
    menuNames: ['연어초밥', '미소국'],
  },
  {
    name: '라멘 단품',
    channel: 'hall' as const,
    sale_price: 12000,
    menuNames: ['라멘'],
  },
  {
    name: '돈카츠 배달',
    channel: 'delivery' as const,
    sale_price: 15000,
    menuNames: ['돈카츠', '포장용기', '비닐봉투', '냅킨·수저'],
  },
]

// 치킨/패스트푸드
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
    name: '감자튀김', emoji: '🍟', category: 'side',
    overhead: 300, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 4000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '냉동감자', price: 6000, qty: 1000, unit: 'g', yield_: 100, use_amount: 150, sort_order: 0 },
      { name: '식용유', price: 5000, qty: 1800, unit: 'ml', yield_: 100, use_amount: 30, sort_order: 1 },
    ],
  },
  ...SHARED_EXTRAS,
]

const CHICKEN_SETS = [
  {
    name: '후라이드 단품',
    channel: 'hall' as const,
    sale_price: 18000,
    menuNames: ['후라이드치킨', '감자튀김'],
  },
  {
    name: '양념치킨 세트',
    channel: 'hall' as const,
    sale_price: 23000,
    menuNames: ['양념치킨', '감자튀김'],
  },
  {
    name: '치킨 배달 세트',
    channel: 'delivery' as const,
    sale_price: 22000,
    menuNames: ['후라이드치킨', '감자튀김', '포장용기', '비닐봉투', '냅킨·수저'],
  },
]

// 분식
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
  ...SHARED_EXTRAS,
]

const SNACK_SETS = [
  {
    name: '분식 세트',
    channel: 'hall' as const,
    sale_price: 8000,
    menuNames: ['떡볶이', '순대'],
  },
  {
    name: '김밥 세트',
    channel: 'hall' as const,
    sale_price: 7000,
    menuNames: ['김밥', '떡볶이'],
  },
  {
    name: '분식 배달',
    channel: 'delivery' as const,
    sale_price: 10000,
    menuNames: ['떡볶이', '김밥', '포장용기', '비닐봉투', '냅킨·수저'],
  },
]

// 기타
const OTHER_MENUS: SampleMenu[] = [
  {
    name: '오늘의 메뉴A', emoji: '🍽️', category: 'main',
    overhead: 600, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 10000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '주재료', price: 8000, qty: 500, unit: 'g', yield_: 85, use_amount: 150, sort_order: 0 },
      { name: '부재료1', price: 2000, qty: 300, unit: 'g', yield_: 100, use_amount: 50, sort_order: 1 },
    ],
  },
  {
    name: '오늘의 메뉴B', emoji: '🥗', category: 'main',
    overhead: 500, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 9000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '주재료', price: 6000, qty: 500, unit: 'g', yield_: 90, use_amount: 120, sort_order: 0 },
      { name: '부재료1', price: 2000, qty: 300, unit: 'g', yield_: 100, use_amount: 40, sort_order: 1 },
    ],
  },
  {
    name: '오늘의 음료', emoji: '🥤', category: 'drink',
    overhead: 200, packaging: 0, labor: 0, delivery_fee: 0, card_fee: 0,
    sale_price: 3000, batch_yield: 0, serving_size: 0,
    ingredients: [
      { name: '음료 (캔)', price: 1500, qty: 355, unit: 'ml', yield_: 100, use_amount: 355, sort_order: 0 },
    ],
  },
  ...SHARED_EXTRAS,
]

const OTHER_SETS = [
  {
    name: '오늘의 세트A',
    channel: 'hall' as const,
    sale_price: 12000,
    menuNames: ['오늘의 메뉴A', '오늘의 음료'],
  },
  {
    name: '오늘의 세트B',
    channel: 'hall' as const,
    sale_price: 11000,
    menuNames: ['오늘의 메뉴B', '오늘의 음료'],
  },
  {
    name: '배달 세트',
    channel: 'delivery' as const,
    sale_price: 13000,
    menuNames: ['오늘의 메뉴A', '포장용기', '비닐봉투', '냅킨·수저'],
  },
]

// INDUSTRY_SAMPLES: 업종별 샘플 데이터
export const INDUSTRY_SAMPLES: Record<string, { menus: SampleMenu[]; sets: typeof SAMPLE_SET_DEFINITIONS }> = {
  '한식': {
    menus: FIRST_LOGIN_MENU_SAMPLES,
    sets: SAMPLE_SET_DEFINITIONS,
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
