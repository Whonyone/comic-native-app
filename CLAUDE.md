# Comic Native App - CLAUDE.md

## 프로젝트 개요
웹툰 플랫폼 모바일 앱. 독자는 웹툰을 탐색/열람하고, 작가는 작가룸에서 작품과 회차를 관리한다.

## 기술 스택
- **프레임워크**: Expo SDK 54 + Expo Router v6 (파일 기반 라우팅)
- **언어**: TypeScript (React Native)
- **이미지**: `expo-image` (`Image` 컴포넌트, `contentFit` prop 사용)
- **서버**: Node.js + Express + better-sqlite3 (`server/` 디렉토리)
- **DB**: SQLite (`server/comic.db`)
- **인증**: JWT (Bearer token, 서버 발급)

## 디렉토리 구조
```
comic-native-app/
├── app/
│   ├── _layout.tsx          # 루트 Stack 레이아웃, AuthProvider 감쌈
│   ├── index.tsx            # 진입점 (로그인 여부에 따라 리다이렉트)
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── signup.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx      # 탭 바 (웹툰 탭, 마이페이지 탭)
│   │   ├── index.tsx        # 웹툰 메인 (전체 작품 목록)
│   │   └── mypage.tsx       # 유저 프로필 + 작가룸 진입 버튼
│   └── author-room/
│       ├── _layout.tsx      # Stack (작가룸 → 작품 관리)
│       ├── index.tsx        # 내 작품 2열 그리드 목록
│       └── [comicId].tsx    # 특정 작품 회차 목록 + 수정/추가/삭제
├── context/
│   └── auth.tsx             # AuthContext (user, token, login, signup, logout)
├── lib/
│   └── api.ts               # fetch 래퍼: authApi, comicsApi, episodesApi
├── types/
│   └── index.ts             # User, Comic, Percomic, ComicImage 타입
└── server/
    ├── index.js             # Express 서버 진입점 (포트 3000)
    ├── db.js                # better-sqlite3 연결
    ├── comic.db             # SQLite DB 파일
    └── routes/
        ├── auth.js          # POST /api/auth/login, /api/auth/signup
        ├── comics.js        # CRUD /api/comics
        ├── episodes.js      # CRUD /api/comics/:comicId/episodes
        └── users.js         # /api/users
```

## 핵심 데이터 타입 (`types/index.ts`)
```ts
User      { id, email, nickname, phonenumber, role: 'user' | 'author' }
Comic     { id, authorId, title, description, thumbnail, createdAt, updatedAt }
Percomic  { id, comicId, title, images: ComicImage[], episodeNumber, thumbnail, createdAt }
ComicImage { url, order }
```

## API 엔드포인트 (`lib/api.ts`)
- `authApi.login / signup`
- `comicsApi.getAll / getById / create / update / delete`
- `episodesApi.getAll(comicId) / create / update / delete`

서버 base URL은 `getBaseUrl()`로 동적 결정 (Expo hostUri 기반, 기본 포트 3000).
인증 헤더: `Authorization: Bearer <token>` — `setAuthToken(token)` 호출로 설정.

## 인증 흐름
- `context/auth.tsx`의 `AuthProvider`가 `user`, `token` 상태 보관
- `useAuth()` 훅으로 접근
- 작가 판별: `user.role === 'author'`
- 작가에게만 마이페이지에 "작가룸 들어가기" 버튼 표시

## 라우팅 규칙
- `expo-router` 파일 기반 라우팅 사용
- `router.push('/author-room' as any)` — 타입 캐스팅 필요
- `useLocalSearchParams<{ comicId: string }>()` — 동적 파라미터 접근
- `useNavigation().setOptions({ title: ... })` — 런타임 헤더 타이틀 변경

## UI 컨벤션
- `SafeAreaView` from `react-native-safe-area-context` (edges 명시)
- 색상 팔레트: 주색 `#0a7ea4`, 텍스트 `#11181C`, 보조 텍스트 `#687076`, 구분선 `#F0F0F0`
- 폼 입력은 바텀시트 모달(`Modal` + `animationType="slide"` + `transparent`)로 처리
- `Image`는 항상 `expo-image`의 `Image` 사용 (`contentFit="cover"`)
- 리스트는 `FlatList`, 스크롤 필요 없는 단순 목록은 `ScrollView`

## 서버 실행
```bash
cd server
npm start   # nodemon으로 실행
```

## DB 스키마 (주요 테이블)
- `comics`: id, authorId, title, description, thumbnail, createdAt, updatedAt
- `percomics`: id, comicId, title, episodeNumber, thumbnail, createdAt
- `percomic_images`: id, percomicId, url, image_order
- 작품 삭제 시 연관 percomics, percomic_images 연쇄 삭제 처리됨
