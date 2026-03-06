import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { LoginRequest, User, Comic, Percomic } from '@/types';

function getBaseUrl() {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:3000`;
  }
  return Platform.OS === 'android' ? 'http://192.168.0.111:3000' : 'http://localhost:3000';
}

export const BASE_URL = getBaseUrl();

let _token: string | null = null;

export function setAuthToken(token: string | null) {
  _token = token;
}

// DB에 저장된 상대 경로 → 표시용 전체 URL 변환
// 기존 http:// URL은 그대로 반환 (하위 호환)
export function toImageUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return '';
  if (pathOrUrl.startsWith('http')) return pathOrUrl;
  return `${BASE_URL}/uploads/${pathOrUrl}`;
}

interface SignupRequest {
  email: string;
  password: string;
  nickname: string;
  phonenumber: string;
}

interface AuthResponse {
  token: string;
  user: User;
}

interface SignupResponse {
  user: User;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  // FormData일 때는 Content-Type을 설정하지 않음 (브라우저/RN이 boundary 자동 설정)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (_token) headers['Authorization'] = `Bearer ${_token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) throw new Error(data.message ?? '요청에 실패했습니다.');
  return data as T;
}

export const authApi = {
  login: (body: LoginRequest) =>
    request<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  signup: (body: SignupRequest) =>
    request<SignupResponse>('/api/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
};

export const comicsApi = {
  getAll: () => request<Comic[]>('/api/comics'),

  getById: (id: number) => request<Comic>(`/api/comics/${id}`),

  // FormData: authorId, title, description, thumbnail(file)
  create: (formData: FormData) =>
    request<Comic>('/api/comics', { method: 'POST', body: formData }),

  // FormData: title?, description?, thumbnail(file)?
  update: (id: number, formData: FormData) =>
    request<Comic>(`/api/comics/${id}`, { method: 'PUT', body: formData }),

  delete: (id: number) =>
    request<{ message: string }>(`/api/comics/${id}`, { method: 'DELETE' }),
};

export const episodesApi = {
  getAll: (comicId: number) =>
    request<Percomic[]>(`/api/comics/${comicId}/episodes`),

  // FormData: title, episodeNumber, thumbnail(file), images(files[])
  create: (comicId: number, formData: FormData) =>
    request<Percomic>(`/api/comics/${comicId}/episodes`, { method: 'POST', body: formData }),

  // FormData: title?, thumbnail(file)?, images(files[])?
  update: (comicId: number, id: number, formData: FormData) =>
    request<Percomic>(`/api/comics/${comicId}/episodes/${id}`, { method: 'PUT', body: formData }),

  delete: (comicId: number, id: number) =>
    request<{ message: string }>(`/api/comics/${comicId}/episodes/${id}`, { method: 'DELETE' }),
};
