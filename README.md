# Comic Native App

웹툰 플랫폼 모바일 앱. 독자는 웹툰을 탐색/열람하고, 작가는 작가룸에서 작품과 회차를 관리합니다.

## 기술 스택

- **프레임워크**: Expo SDK 54 + Expo Router v6
- **언어**: TypeScript (React Native)
- **서버**: Node.js + Express + better-sqlite3
- **DB**: SQLite (`server/comic.db`)
- **인증**: JWT (Bearer token, 7일 유효)

## 실행 방법

### 앱

```bash
npm install
npx expo start
```

### 서버

```bash
cd server
npm install
npm start   # nodemon, 포트 3000
```

---

# API 문서

Base URL: `http://localhost:3000`

인증이 필요한 엔드포인트는 요청 헤더에 JWT 토큰을 포함해야 합니다.

```
Authorization: Bearer <token>
```

## 목차

- [인증 (Auth)](#인증-auth)
- [작품 (Comics)](#작품-comics)
- [회차 (Episodes)](#회차-episodes)
- [유저 (Users)](#유저-users)
- [파일 서빙](#파일-서빙)

---

## 인증 (Auth)

### POST /api/auth/signup

회원가입. 기본 role은 `user`로 생성됩니다.

**요청 바디** `application/json`

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| email | string | ✓ | 이메일 (중복 불가) |
| password | string | ✓ | 비밀번호 |
| nickname | string | ✓ | 닉네임 |
| phonenumber | string | ✓ | 전화번호 |

**응답**

- `201 Created`
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "nickname": "홍길동",
    "phonenumber": "010-1234-5678",
    "role": "user"
  }
}
```

- `400 Bad Request` — 필드 누락
```json
{ "message": "모든 필드를 입력해주세요." }
```

- `409 Conflict` — 이메일 중복
```json
{ "message": "이미 사용 중인 이메일입니다." }
```

**curl 예시**

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "nickname": "홍길동",
    "phonenumber": "010-1234-5678"
  }'
```

---

### POST /api/auth/login

로그인. 성공 시 7일 유효 JWT 토큰을 반환합니다.

**요청 바디** `application/json`

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| email | string | ✓ | 이메일 |
| password | string | ✓ | 비밀번호 |

**응답**

- `200 OK`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "nickname": "홍길동",
    "phonenumber": "010-1234-5678",
    "role": "user"
  }
}
```

- `400 Bad Request` — 필드 누락
```json
{ "message": "이메일과 비밀번호를 입력해주세요." }
```

- `401 Unauthorized` — 이메일/비밀번호 불일치
```json
{ "message": "이메일 또는 비밀번호가 올바르지 않습니다." }
```

**curl 예시**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

---

## 작품 (Comics)

### GET /api/comics

전체 작품 목록 조회. 최신순 정렬.

**인증**: 불필요

**응답**

- `200 OK`
```json
[
  {
    "id": 1,
    "authorId": 2,
    "title": "나의 웹툰",
    "description": "재미있는 웹툰입니다.",
    "thumbnail": "author@example.com/나의 웹툰/thumbnail.jpg",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

**curl 예시**

```bash
curl http://localhost:3000/api/comics
```

---

### GET /api/comics/:id

특정 작품 단건 조회.

**인증**: 불필요

**경로 파라미터**

| 파라미터 | 설명 |
|----------|------|
| id | 작품 ID |

**응답**

- `200 OK`
```json
{
  "id": 1,
  "authorId": 2,
  "title": "나의 웹툰",
  "description": "재미있는 웹툰입니다.",
  "thumbnail": "author@example.com/나의 웹툰/thumbnail.jpg",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

- `404 Not Found`
```json
{ "message": "만화를 찾을 수 없습니다." }
```

**curl 예시**

```bash
curl http://localhost:3000/api/comics/1
```

---

### POST /api/comics

새 작품 등록.

**인증**: 필요

**요청 바디** `multipart/form-data`

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| authorId | string (number) | ✓ | 작가 유저 ID |
| title | string | ✓ | 작품 제목 |
| description | string | ✓ | 작품 설명 |
| thumbnail | file (image) | ✓ | 썸네일 이미지 파일 |

**응답**

- `201 Created`
```json
{
  "id": 1,
  "authorId": 2,
  "title": "나의 웹툰",
  "description": "재미있는 웹툰입니다.",
  "thumbnail": "author@example.com/나의 웹툰/thumbnail.jpg",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

- `400 Bad Request` — 필수 필드 누락
```json
{ "message": "필수 항목이 누락되었습니다." }
```

- `401 Unauthorized` — 토큰 없음 또는 유효하지 않음
```json
{ "message": "인증이 필요합니다." }
```

**curl 예시**

```bash
curl -X POST http://localhost:3000/api/comics \
  -H "Authorization: Bearer <token>" \
  -F "authorId=2" \
  -F "title=나의 웹툰" \
  -F "description=재미있는 웹툰입니다." \
  -F "thumbnail=@/path/to/thumbnail.jpg"
```

---

### PUT /api/comics/:id

작품 정보 수정. 변경하려는 필드만 전송.

**인증**: 필요

**경로 파라미터**

| 파라미터 | 설명 |
|----------|------|
| id | 작품 ID |

**요청 바디** `multipart/form-data`

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| title | string | - | 새 제목 |
| description | string | - | 새 설명 |
| thumbnail | file (image) | - | 새 썸네일 이미지 파일 |

**응답**

- `200 OK` — 수정된 작품 객체 (구조는 POST 응답과 동일)

- `404 Not Found`
```json
{ "message": "만화를 찾을 수 없습니다." }
```

**curl 예시**

```bash
curl -X PUT http://localhost:3000/api/comics/1 \
  -H "Authorization: Bearer <token>" \
  -F "title=수정된 웹툰 제목" \
  -F "thumbnail=@/path/to/new_thumbnail.jpg"
```

---

### DELETE /api/comics/:id

작품 삭제. 연관된 모든 회차, 회차 이미지, 업로드 파일 폴더도 함께 삭제됩니다.

**인증**: 필요

**경로 파라미터**

| 파라미터 | 설명 |
|----------|------|
| id | 작품 ID |

**응답**

- `200 OK`
```json
{ "message": "삭제되었습니다." }
```

- `404 Not Found`
```json
{ "message": "만화를 찾을 수 없습니다." }
```

**curl 예시**

```bash
curl -X DELETE http://localhost:3000/api/comics/1 \
  -H "Authorization: Bearer <token>"
```

---

## 회차 (Episodes)

### GET /api/comics/:comicId/episodes

특정 작품의 전체 회차 목록 조회. 회차 번호 오름차순 정렬. 각 회차에 `images` 배열 포함.

**인증**: 불필요

**경로 파라미터**

| 파라미터 | 설명 |
|----------|------|
| comicId | 작품 ID |

**응답**

- `200 OK`
```json
[
  {
    "id": 1,
    "comicId": 1,
    "title": "1화 - 시작",
    "episodeNumber": 1,
    "thumbnail": "author@example.com/나의 웹툰/ep_1/thumbnail.jpg",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "images": [
      { "url": "author@example.com/나의 웹툰/ep_1/image_001.jpg", "order": 1 },
      { "url": "author@example.com/나의 웹툰/ep_1/image_002.jpg", "order": 2 }
    ]
  }
]
```

**curl 예시**

```bash
curl http://localhost:3000/api/comics/1/episodes
```

---

### GET /api/comics/:comicId/episodes/:id

특정 회차 단건 조회.

**인증**: 불필요

**경로 파라미터**

| 파라미터 | 설명 |
|----------|------|
| comicId | 작품 ID |
| id | 회차 ID |

**응답**

- `200 OK` — 단건 회차 객체 (구조는 목록 조회의 각 요소와 동일)

- `404 Not Found`
```json
{ "message": "에피소드를 찾을 수 없습니다." }
```

**curl 예시**

```bash
curl http://localhost:3000/api/comics/1/episodes/1
```

---

### POST /api/comics/:comicId/episodes

새 회차 등록.

**인증**: 필요

**경로 파라미터**

| 파라미터 | 설명 |
|----------|------|
| comicId | 작품 ID |

**요청 바디** `multipart/form-data`

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| title | string | ✓ | 회차 제목 |
| episodeNumber | string (number) | ✓ | 회차 번호 |
| thumbnail | file (image) | ✓ | 회차 썸네일 이미지 파일 |
| images | file[] (image) | ✓ | 회차 본문 이미지 파일 (1개 이상) |

**응답**

- `201 Created`
```json
{
  "id": 1,
  "comicId": 1,
  "title": "1화 - 시작",
  "episodeNumber": 1,
  "thumbnail": "author@example.com/나의 웹툰/ep_1/thumbnail.jpg",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "images": [
    { "url": "author@example.com/나의 웹툰/ep_1/image_001.jpg", "order": 1 }
  ]
}
```

- `400 Bad Request` — 필수 필드 누락
```json
{ "message": "제목, 회차 번호, 썸네일, 이미지(1개 이상)가 필요합니다." }
```

- `404 Not Found` — 작품 없음
```json
{ "message": "만화를 찾을 수 없습니다." }
```

**curl 예시**

```bash
curl -X POST http://localhost:3000/api/comics/1/episodes \
  -H "Authorization: Bearer <token>" \
  -F "title=1화 - 시작" \
  -F "episodeNumber=1" \
  -F "thumbnail=@/path/to/ep_thumbnail.jpg" \
  -F "images=@/path/to/page1.jpg" \
  -F "images=@/path/to/page2.jpg"
```

---

### PUT /api/comics/:comicId/episodes/:id

회차 수정. `images`를 새로 업로드하면 기존 이미지 전체가 교체됩니다. 파일 없이 `existingImagePaths`만 전송하면 순서/삭제만 반영됩니다.

**인증**: 필요

**경로 파라미터**

| 파라미터 | 설명 |
|----------|------|
| comicId | 작품 ID |
| id | 회차 ID |

**요청 바디** `multipart/form-data`

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| title | string | - | 새 제목 |
| thumbnail | file (image) | - | 새 썸네일 이미지 파일 |
| images | file[] (image) | - | 새 본문 이미지 파일 (전송 시 기존 이미지 전체 교체) |
| existingImagePaths | string (JSON array) | - | 기존 이미지 경로 배열. `images` 없이 순서/삭제 변경 시 사용 |

**응답**

- `200 OK` — 수정된 회차 객체 (구조는 POST 응답과 동일)

- `404 Not Found`
```json
{ "message": "에피소드를 찾을 수 없습니다." }
```

**curl 예시 — 제목 + 썸네일 수정**

```bash
curl -X PUT http://localhost:3000/api/comics/1/episodes/1 \
  -H "Authorization: Bearer <token>" \
  -F "title=1화 - 수정된 제목" \
  -F "thumbnail=@/path/to/new_thumbnail.jpg"
```

**curl 예시 — 이미지 순서 변경 (파일 재업로드 없이)**

```bash
curl -X PUT http://localhost:3000/api/comics/1/episodes/1 \
  -H "Authorization: Bearer <token>" \
  -F 'existingImagePaths=["author@example.com/나의 웹툰/ep_1/image_002.jpg","author@example.com/나의 웹툰/ep_1/image_001.jpg"]'
```

---

### DELETE /api/comics/:comicId/episodes/:id

회차 삭제. 연관된 이미지 레코드와 회차 업로드 폴더도 함께 삭제됩니다.

**인증**: 필요

**경로 파라미터**

| 파라미터 | 설명 |
|----------|------|
| comicId | 작품 ID |
| id | 회차 ID |

**응답**

- `200 OK`
```json
{ "message": "삭제되었습니다." }
```

- `404 Not Found`
```json
{ "message": "에피소드를 찾을 수 없습니다." }
```

**curl 예시**

```bash
curl -X DELETE http://localhost:3000/api/comics/1/episodes/1 \
  -H "Authorization: Bearer <token>"
```

---

## 유저 (Users)

### GET /api/users/:id

특정 유저 정보 조회 (비밀번호 제외).

**인증**: 불필요

**경로 파라미터**

| 파라미터 | 설명 |
|----------|------|
| id | 유저 ID |

**응답**

- `200 OK`
```json
{
  "id": 1,
  "email": "user@example.com",
  "nickname": "홍길동",
  "phonenumber": "010-1234-5678",
  "role": "user"
}
```

- `404 Not Found`
```json
{ "message": "유저를 찾을 수 없습니다." }
```

**curl 예시**

```bash
curl http://localhost:3000/api/users/1
```

---

## 파일 서빙

업로드된 이미지 파일은 정적 파일로 서빙됩니다.

```
GET /uploads/<path>
```

DB에 저장된 상대 경로를 그대로 사용합니다.

**예시**

```bash
curl http://localhost:3000/uploads/author@example.com/%EB%82%98%EC%9D%98%20%EC%9B%B9%ED%88%B0/thumbnail.jpg
```

클라이언트에서는 `toImageUrl(path)` 함수(`lib/api.ts`)를 통해 전체 URL로 변환하여 사용합니다.
