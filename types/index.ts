export type UserRole = 'user' | 'author';

// 로그인 요청 전용 (password는 여기서만 사용)
export interface LoginRequest {
  email: string;
  password: string;
}

export interface User {
  id: number;
  email: string;
  nickname: string;
  phonenumber: string;
  role: UserRole;
}

export interface Comic {
  id: number;
  authorId: number; // User.id (작가)
  title: string;
  description: string;
  thumbnail: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComicImage {
  url: string;
  order: number;
}

export interface Percomic {
  id: number;
  comicId: number; // Comic.id
  title: string;
  images: ComicImage[];
  episodeNumber: number;
  thumbnail: string;
  createdAt: string;
}
