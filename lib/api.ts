import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { LoginRequest, User } from '@/types';

// Expo 개발서버 호스트에서 IP를 추출해 서버 URL 구성
// 실기기(QR) 환경에서도 올바른 LAN IP를 자동으로 사용
function getBaseUrl() {
  const hostUri = Constants.expoConfig?.hostUri; // e.g. "192.168.0.5:8081"
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:3000`;
  }
  // 에뮬레이터 폴백
  return Platform.OS === 'android' ? 'http://192.168.0.111:3000' : 'http://localhost:3000';
}

const BASE_URL = getBaseUrl();

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

async function request<T>(path: string, options: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? '요청에 실패했습니다.');
  }

  return data as T;
}

export const authApi = {
  login: (body: LoginRequest) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  signup: (body: SignupRequest) =>
    request<SignupResponse>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
