import React, { createContext, useContext, useState } from 'react';
import { authApi } from '@/lib/api';
import { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, nickname: string, phonenumber: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, token: null });

  const login = async (email: string, password: string) => {
    const { token, user } = await authApi.login({ email, password });
    setState({ token, user });
  };

  const signup = async (
    email: string,
    password: string,
    nickname: string,
    phonenumber: string
  ) => {
    await authApi.signup({ email, password, nickname, phonenumber });
  };

  const logout = () => {
    setState({ user: null, token: null });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
