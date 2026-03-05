import { Comic, ComicImage, Percomic, User } from '../types';

// Android 에뮬레이터: 10.0.2.2 / iOS 시뮬레이터: localhost
const BASE_URL = 'http://192.168.0.111:3000/api';

let authToken: string | null = null;

export function setToken(token: string) {
  authToken = token;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...options.headers,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? '요청 실패');
  return data as T;
}

// ── Auth ─────────────────────────────────────────────────
export const authApi = {
  signup: (body: { email: string; password: string; nickname: string; phonenumber: string }) =>
    request<{ user: User }>('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
};

// ── Users ─────────────────────────────────────────────────
export const usersApi = {
  getById: (id: number) =>
    request<User>(`/users/${id}`),
};

// ── Comics ────────────────────────────────────────────────
export const comicsApi = {
  getAll: () =>
    request<Comic[]>('/comics'),

  getById: (id: number) =>
    request<Comic>(`/comics/${id}`),

  create: (body: { authorId: number; title: string; description: string; thumbnail: string }) =>
    request<Comic>('/comics', { method: 'POST', body: JSON.stringify(body) }),

  update: (id: number, body: Partial<Pick<Comic, 'title' | 'description' | 'thumbnail'>>) =>
    request<Comic>(`/comics/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
};

// ── Episodes (Percomic) ───────────────────────────────────
export const episodesApi = {
  getAll: (comicId: number) =>
    request<Percomic[]>(`/comics/${comicId}/episodes`),

  getById: (comicId: number, id: number) =>
    request<Percomic>(`/comics/${comicId}/episodes/${id}`),

  create: (comicId: number, body: { title: string; images: ComicImage[]; episodeNumber: number; thumbnail: string }) =>
    request<Percomic>(`/comics/${comicId}/episodes`, { method: 'POST', body: JSON.stringify(body) }),
};
