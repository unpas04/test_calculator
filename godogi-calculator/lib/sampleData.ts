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
    channel: 'delivery',
    sale_price: 9000,
    menuNames: ['제육볶음', '공깃밥', '김치', '포장용기', '비닐봉투'],
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
    menuNames: ['순두부찌개', '공깃밥', '김치', '포장용기'],
  },
]
