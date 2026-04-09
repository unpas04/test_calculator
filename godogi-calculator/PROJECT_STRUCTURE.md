# 고독이의 원가계산기 - 전체 프로젝트 구조 분석

## 📁 폴더 및 파일 구조

```
godogi-calculator/
├── app/                          # Next.js 앱 라우터 (페이지 + API)
│   ├── page.tsx                  # 메인 대시보드 페이지 (2,115줄)
│   ├── layout.tsx                # 루트 레이아웃
│   ├── calculator/
│   │   └── page.tsx              # 레시피 원가 계산기 페이지
│   ├── fridge/
│   │   └── page.tsx              # 냉장고 (재료 재고 관리) 페이지
│   ├── proto/
│   │   └── page.tsx              # 메뉴 세트 빌더 페이지
│   ├── api/
│   │   ├── ocr/
│   │   │   └── route.ts          # 영수증 OCR 처리 API
│   │   └── keepalive/
│   │       └── route.ts          # 서버 킵얼라이브 핸들러
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts          # OAuth 콜백 핸들러
│   ├── robots.ts                 # SEO - robots.txt
│   └── sitemap.ts                # SEO - sitemap.xml
│
├── components/                   # 재사용 가능한 React 컴포넌트
│   ├── Tutorial.tsx              # 첫 로그인 시 사용설명서 모달 (6단계)
│   ├── DashboardSidebar.tsx       # 메인 네비게이션 사이드바 (대시보드용)
│   ├── AppSidebar.tsx            # 메뉴 목록 사이드바 (계산기용)
│   ├── Calculator.tsx            # 레시피 편집 폼 컴포넌트
│   ├── Fridge.tsx                # 냉장고 UI 컴포넌트
│   ├── SetBuilderProto.tsx        # 메뉴 세트 구성 빌더 (1,406줄)
│   └── ShareButton.tsx           # 공유하기 버튼
│
├── lib/                          # 유틸리티 및 설정
│   ├── supabase.ts               # Supabase 클라이언트 초기화
│   ├── sampleData.ts             # 기본 샘플 데이터 (업종별 메뉴, 재료)
│   └── ingredientDB.ts           # 재료 데이터베이스 (고정값)
│
├── public/                       # 정적 자산
├── node_modules/                 # 패키지 의존성
├── package.json                  # 프로젝트 설정 및 의존성
├── next.config.ts                # Next.js 설정
├── tailwind.config.ts            # Tailwind CSS 설정
├── tsconfig.json                 # TypeScript 설정
└── .env.local                    # 환경 변수 (Supabase, API 키 등)
```

---

## 🔄 각 파일의 역할과 용도

### **Pages (앱 페이지들)**

#### 1️⃣ `app/page.tsx` (2,115줄) - 메인 대시보드
**역할:**
- 앱의 메인 진입점
- 메뉴 세트 목록 및 레시피 목록 표시
- 사용자 인증 및 초기 설정 화면

**상태 관리:**
- `user`: 현재 로그인한 사용자
- `shopInfo`: 매장명, 업종, 목표 원가율
- `sets`: 메뉴 세트 목록 (Supabase에서 로드)
- `homeTab`: 'sets' | 'menus' | 'recipes' - 현재 탭
- `showTutorial`: 사용설명서 모달 표시 여부

**핵심 기능:**
- SetupModal: 첫 로그인 시 매장명, 업종, 목표 원가율 입력
- 메뉴 세트 카드 표시 (원가율, 판매가, 수익 등)
- TOP 5 원가가 높은 상품 표시
- FAB (Floating Action Button): 메뉴/레시피 추가
- DashboardSidebar: 네비게이션 (대시보드, 메뉴판, 냉장고, 로그아웃)

**주요 유기적 연결:**
```
app/page.tsx
  ├─ 임포트: DashboardSidebar, Calculator, Fridge, Tutorial
  ├─ FAB "＋ 메뉴 추가" (showRecipes=false) → router.push('/proto')
  ├─ FAB "＋ 레시피 추가" (showRecipes=true) → router.push('/calculator?new=1&returnTo=/')
  ├─ 메뉴 세트 클릭 → router.push('/proto?id=${set.id}&source=menu')
  ├─ 메뉴 클릭 → router.push('/calculator?menuId=${menu.id}&returnTo=/?tab=menus')
  └─ DashboardSidebar 네비게이션 → /fridge, 로그아웃, 사용설명서
```

**버그/개선 사항:**
- ✅ 현재 상태: 정상 작동 (SetupModal 중복 표시 해결됨)
- 📍 Supabase 연동: shopInfo, sets, menus 모두 Supabase에서 로드

---

#### 2️⃣ `app/proto/page.tsx` - 메뉴 세트 빌더
**역할:**
- 메뉴 세트 구성하기 (여러 메뉴를 조합해서 세트 생성/편집)
- SetBuilderProto 컴포넌트 래핑

**상태:**
- 메뉴 세트의 이름, 판매가, 포함된 메뉴 목록 관리
- 쿼리 파라미터로 기존 세트 ID 받음: `?id=${setId}`

**주요 유기적 연결:**
```
app/proto/page.tsx
  ├─ 렌더링: DashboardSidebar + SetBuilderProto
  └─ SetBuilderProto 내부:
      ├─ "메뉴 추가" 버튼 → router.push('/calculator')
      ├─ 메뉴 편집 → router.push('/calculator?menuId=${id}&source=menu&returnTo=/proto?id=${setId}')
      └─ 돌아가기 → /
```

**버그/개선 사항:**
- ✅ 현재 상태: 정상 작동

---

#### 3️⃣ `app/calculator/page.tsx` - 레시피 원가 계산기
**역할:**
- 개별 메뉴의 재료와 비용 입력 및 계산
- 두 가지 모드:
  - **메뉴판 관리 모드** (`fromRecipes=false`): AppSidebar로 메뉴 목록 표시
  - **레시피 관리 모드** (`fromRecipes=true`): DashboardSidebar로 모바일 드로어

**쿼리 파라미터:**
- `menuId`: 편집할 메뉴 ID
- `fromRecipes`: 레시피 탭에서 온 경우 true
- `source`: 출처 식별 ('menu' 등)
- `returnTo`: 돌아갈 경로
- `new`: 새 메뉴 생성 여부

**상태:**
- `menu`: 현재 편집 중인 메뉴 정보
- `ingredients`: 메뉴에 포함된 재료 목록
- 냉장고에서 추가된 재료들 표시

**주요 기능:**
- Calculator 컴포넌트로 재료 입력/편집
- "🧊 냉장고에서 추가" 버튼 → Fridge 모달 열기
- 재료 정보는 읽기 전용 (냉장고에서만 관리)

**주요 유기적 연결:**
```
app/calculator/page.tsx
  ├─ 렌더링: 조건부 사이드바
  │   ├─ AppSidebar (메뉴판 관리 모드)
  │   └─ DashboardSidebar (레시피 관리 모드)
  ├─ Calculator 컴포넌트
  │   └─ "냉장고에서 추가" → Fridge 모달
  └─ 돌아가기 → returnTo 파라미터
```

**버그/개선 사항:**
- ✅ 현재 상태: 정상 작동
- 재료명, 단위 읽기 전용으로 변경됨 ✅

---

#### 4️⃣ `app/fridge/page.tsx` - 냉장고 (재료 재고)
**역할:**
- 구매한 재료 입력 및 관리
- 영수증 촬영으로 자동 입력

**상태:**
- `ingredients`: 냉장고에 저장된 재료 목록
- `fridgeCategory`: 카테고리 필터

**주요 기능:**
- 재료 검색 및 필터링
- 영수증 촬영 → OCR → 재료 자동 추가
- 재료 수정/삭제

**주요 유기적 연결:**
```
app/fridge/page.tsx
  ├─ DashboardSidebar 네비게이션으로 접근
  ├─ 렌더링: Fridge 컴포넌트
  └─ OCR 결과 모달로 재료 추가
```

**버그/개선 사항:**
- ✅ 현재 상태: 정상 작동

---

### **Components (재사용 컴포넌트들)**

#### 🎨 `components/DashboardSidebar.tsx` (408줄)
**역할:**
- 메인 네비게이션 사이드바
- 모든 주요 페이지에서 사용
- 모바일 드로어 기능 포함

**Props:**
```typescript
interface Props {
  user: User
  onLogout: () => void
  onReceiptUpload: (result: any) => void
  receiptLoading: boolean
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onNavigateMenu: (target: string) => void
  onShowRecipes: (show: boolean) => void
  onShowTutorial: () => void
}
```

**메뉴 항목:**
- 🐟 고독이의 원가계산기 (헤더)
- 📊 대시보드
- 📋 내 메뉴판
- 🍽️ 레시피관리
- 🧊 냉장고
- 📸 영수증촬영
- 🚪 로그아웃
- 📖 사용설명서

**특징:**
- PC: 고정 사이드바 (240px)
- 모바일: 드로어 + 오버레이
- 영수증 촬영 기능 내장

---

#### 📋 `components/Calculator.tsx` (1,004줄)
**역할:**
- 레시피 편집 폼
- 재료 입력/수정

**Props:**
```typescript
interface Props {
  menu: any
  onSave: (menu: any) => void
  onCancel: () => void
  onOpenFridge?: () => void
  allIngredients: any[]
}
```

**상태:**
- 메뉴 이름 (읽기 전용)
- 재료 목록
- 인건비, 간접비

**주요 기능:**
- 재료 추가 → "🧊 냉장고에서 추가" 버튼
- 재료명, 단위 읽기 전용
- 사용량만 수정 가능
- 원가 자동 계산

---

#### 🧊 `components/Fridge.tsx` (404줄)
**역할:**
- 냉장고 UI 표시
- 재료 목록 관리

**Props:**
```typescript
interface Props {
  ingredients: any[]
  onEdit: (ing: any) => void
  onDelete: (id: string) => void
  onAdd: (ing: any) => void
  category?: string
  searchQuery?: string
}
```

**특징:**
- 카테고리별 필터링
- 검색 기능
- 영수증 OCR 결과 모달

---

#### 🏗️ `components/SetBuilderProto.tsx` (1,406줄)
**역할:**
- 메뉴 세트 구성 인터페이스
- 여러 메뉴를 조합해서 세트 생성

**상태:**
- 세트 이름
- 판매 채널 (배달/홀)
- 판매가
- 포함 메뉴 목록

**주요 기능:**
- 메뉴 추가/삭제
- 드래그 드롭으로 순서 변경
- 원가율 실시간 계산
- 세트 저장/수정/삭제

---

#### 🎓 `components/Tutorial.tsx` (380줄)
**역할:**
- 첫 로그인 시 사용설명서 모달
- 6단계 스토리텔링 방식

**단계:**
1. 앱 소개 (영수증+레시피 = 원가 계산)
2. 대시보드 소개
3. 레시피 관리
4. 영수증 촬영
5. 냉장고
6. 완료 (시작하기 🐟)

**특징:**
- Framer Motion 애니메이션
- 이전/다음 네비게이션
- 진행도 표시

---

#### 🔗 `components/AppSidebar.tsx` (196줄)
**역할:**
- 메뉴 목록 표시 사이드바
- calculator 페이지에서 메뉴판 관리 모드일 때만 사용

**특징:**
- PC 고정 사이드바
- 메뉴 클릭 → 편집

---

#### 🔘 `components/ShareButton.tsx` (155줄)
**역할:**
- 현재 화면 공유하기

---

### **Library Files (유틸리티)**

#### 📚 `lib/sampleData.ts`
**역할:**
- 기본 샘플 데이터 제공
- 업종별 메뉴 (한식, 카페, 중식 등)
- 기본 재료 정보

**활용:**
- 게스트 모드에서 사용
- 신규 사용자 온보딩

---

#### 🥘 `lib/ingredientDB.ts`
**역할:**
- 재료 기본 데이터베이스
- 카테고리, 단위, 기본가격 등

---

#### 🔐 `lib/supabase.ts`
**역할:**
- Supabase 클라이언트 초기화
- 환경 변수로 인증 설정

---

### **API Routes**

#### 🤖 `app/api/ocr/route.ts`
**역할:**
- 영수증 이미지 → AI OCR 처리
- 재료 정보 추출
- 거래처 정보 추출

**입력:**
- FormData: 이미지 파일

**출력:**
```typescript
{
  items: [
    { name, price, per, unit }
  ],
  supplier: {
    name,
    bizNo,
    phone
  }
}
```

---

#### 💗 `app/api/keepalive/route.ts`
**역할:**
- Vercel 서버 킵얼라이브
- 무료 플랜에서 콜드 스타트 방지

---

#### 🔑 `app/auth/callback/route.ts`
**역할:**
- OAuth (Google) 콜백 처리
- 로그인 완료 후 리다이렉트

---

## 🔗 전체 데이터 흐름

```
┌─────────────────────────────────────────────────────────────┐
│                     USER JOURNEY                              │
└─────────────────────────────────────────────────────────────┘

[로그인]
  ↓
[SetupModal: 매장명, 업종, 목표 원가율 입력]
  → Supabase shop_profiles 저장
  ↓
[첫 로그인: Tutorial 모달 자동 표시]
  ↓
[Home (app/page.tsx)]
  │
  ├─ [메뉴판 관리]
  │   ├─ FAB "＋ 메뉴 추가" → /proto
  │   │   └─ SetBuilderProto로 세트 구성
  │   │       ├─ "메뉴 추가" → /calculator (새 메뉴)
  │   │       │   └─ Calculator로 재료 입력
  │   │       │       └─ "냉장고에서 추가" → Fridge 모달
  │   │       │           └─ Supabase fridge 테이블에서 선택
  │   │       └─ 메뉴 편집 → /calculator (기존 메뉴)
  │   └─ 세트 클릭 → /proto?id=${id}
  │       └─ 메뉴 편집
  │
  ├─ [레시피 관리]
  │   ├─ FAB "＋ 레시피 추가" → /calculator?new=1
  │   └─ 메뉴 클릭 → /calculator?menuId=${id}
  │       └─ Calculator로 편집
  │
  └─ [냉장고 관리]
      ├─ Sidebar "냉장고" → /fridge
      ├─ 영수증 촬영 → OCR API
      │   ├─ 재료 인식 → Fridge 모달
      │   └─ 선택해서 저장 → Supabase fridge
      └─ 직접 추가/편집/삭제

┌────────────────────────────────────────────┐
│        SUPABASE DATABASE TABLES             │
├────────────────────────────────────────────┤
│ • users (Supabase Auth)                    │
│ • shop_profiles (매장정보)                  │
│ • menus (메뉴/레시피)                      │
│ • menu_sets (세트)                         │
│ • set_items (세트에 포함된 메뉴)            │
│ • fridge (냉장고 재료)                     │
│ • suppliers (거래처)                       │
│ • employees (직원/인건비) [미사용]         │
└────────────────────────────────────────────┘
```

---

## ⚙️ 상태 관리 흐름

### **app/page.tsx의 주요 상태**

```
user (Auth)
  ↓
shopInfo (Supabase shop_profiles)
  ↓
showSetup (신규 사용자) → SetupModal
  ↓
showTutorial (첫 로그인) → Tutorial 모달
  ↓
sets (Supabase select * from menu_sets)
  ├─ set.set_items → Calculator에서 사용
  ├─ set.sale_price, set.channel
  └─ 원가율, 수익 계산
  ↓
menus (sets에서 추출)
  ├─ menu.ingredients → fridge에서 선택
  ├─ menu.labor, menu.overhead
  └─ 원가 계산
  ↓
fridge (app/fridge/page.tsx에서 로드)
  └─ 영수증 OCR → API → DB 저장
```

---

## 📊 불필요하거나 문제 가능성 있는 부분

### **✅ 현재 상태: 모든 페이지/컴포넌트 적극 활용 중**

- SetBuilderProto.tsx: proto/page.tsx에서 사용 ✅
- AppSidebar.tsx: calculator/page.tsx에서 조건부 사용 ✅
- proto/page.tsx: 메뉴 세트 빌더 페이지로 적극 활용 ✅
- Tutorial.tsx: 첫 로그인 시 자동 표시 ✅

### **⚠️ 주의 필요한 부분**

1. **app/page.tsx 파일 크기**
   - 2,115줄로 매우 큼
   - 개선 권장: 대시보드 로직을 더 작은 컴포넌트로 분리 가능
   - 현재 기능: 모두 필요함

2. **SetBuilderProto.tsx 파일 크기**
   - 1,406줄로 매우 큼
   - 개선 권장: 메뉴 선택 UI, 드래그 드롭 로직 등을 분리 가능
   - 현재 기능: 모두 필요함

3. **직접 입력 가능 필드 정리**
   - 재료명, 단위: 읽기 전용으로 변경 완료 ✅
   - 메뉴명: 읽기 전용으로 변경 완료 ✅

4. **쿼리 파라미터 복잡성**
   - calculator/page.tsx가 많은 쿼리 파라미터 사용
   - 현재 작동: 정상 ✅
   - 개선 권장: 컨텍스트나 useRouter state 사용 검토

---

## 🐛 잠재적 버그/개선 사항

### **1. SetupModal과 Tutorial 동시 표시**
- **상태**: 해결됨 ✅
- **원인**: shopData가 없을 때 둘 다 true 설정
- **해결**: 신규 사용자 감지시 모두 true로 설정

### **2. 다중 계정 캐시 충돌**
- **상태**: 해결됨 ✅
- **해결**: getSetsCacheKey(userId) 함수로 user-specific 캐시

### **3. 모달 z-index/포지셔닝**
- **상태**: 해결됨 ✅
- **해결**: Tutorial을 flexbox로 중앙 정렬, z-index 10000

### **4. 재료 정보 읽기 전용**
- **상태**: 해결됨 ✅
- **현황**: Calculator에서 재료명, 단위 div로 표시

### **5. 냉장고에서 추가 기능**
- **상태**: 구현 중 ✅
- **위치**: Calculator에서 "🧊 냉장고에서 추가" 버튼
- **동작**: Fridge 모달 열기 → 선택 → 자동 입력

---

## 📱 레이아웃 및 반응형

**PC (≥769px):**
- DashboardSidebar: 고정 240px (왼쪽)
- 메인 콘텐츠: flex: 1

**모바일 (<769px):**
- DashboardSidebar: 고정 위치 드로어
- 햄버거 버튼: 좌상단 고정
- 오버레이: 드로어 오픈 시 표시

---

## 🎯 핵심 개선 제안 (미실행)

### **1단기 (성능/안정성)**
- [ ] app/page.tsx를 더 작은 컴포넌트로 분리
  - `DashboardHeader.tsx` (헤더)
  - `MenuPanelTabs.tsx` (탭 + 메뉴판 표시)
  - `RecipeList.tsx` (레시피 목록)
  - `SetModalDetail.tsx` (세트 상세 모달)

- [ ] SetBuilderProto.tsx를 더 작은 컴포넌트로 분리
  - `MenuSelector.tsx` (메뉴 선택 UI)
  - `DragDropList.tsx` (드래그 드롭 구성)
  - `SetDetails.tsx` (세트 정보 입력)

### **2단기 (UX/기능)**
- [ ] 쿼리 파라미터 대신 context API 검토
- [ ] 영수receipt OCR 결과 저장 후 자동 냉장고 추가
- [ ] 다크모드 설정
- [ ] 오프라인 모드 (PWA)

### **3단기 (비즈니스)**
- [ ] 거래처 관리 페이지 구현 (현재 준비중)
- [ ] 직원/인건비 관리 페이지 구현
- [ ] 월별 분석 리포트
- [ ] 세트 메뉴 추천 AI

---

## 📌 결론

**현재 상태:**
- ✅ 모든 페이지/컴포넌트 적극 활용
- ✅ 불필요한 레거시 코드 없음
- ✅ 핵심 기능 구현 완료
- ✅ 다중 계정/캐시 문제 해결
- ✅ UI/UX 개선 (읽기 전용 필드, 모달 센터링)

**개선 가능 영역:**
- ⚠️ 큰 컴포넌트 분리 (선택적)
- ⚠️ 상태 관리 최적화 (선택적)
- ⚠️ 아직 미구현 기능 (거래처, 직원 관리)

**추천:**
- 현재 구조는 안정적이고 기능적입니다.
- 필요에 따라 점진적으로 리팩토링하세요.
- 새로운 기능 추가 시 컴포넌트 분리를 고려하세요.
