import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { LoginRequest, User, Comic } from '@/types';

function getBaseUrl() {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:3000`;
  }
  return Platform.OS === 'android' ? 'http://192.168.0.111:3000' : 'http://localhost:3000';
}

const BASE_URL = getBaseUrl();

let _token: string | null = null;

export function setAuthToken(token: string | null) {
  _token = token;
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
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
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

  create: (body: { authorId: number; title: string; description: string; thumbnail: string }) =>
    request<Comic>('/api/comics', { method: 'POST', body: JSON.stringify(body) }),

  update: (id: number, body: Partial<Pick<Comic, 'title' | 'description' | 'thumbnail'>>) =>
    request<Comic>(`/api/comics/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  delete: (id: number) =>
    request<{ message: string }>(`/api/comics/${id}`, { method: 'DELETE' }),
};
