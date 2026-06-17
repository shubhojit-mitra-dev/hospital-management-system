import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  hospitalId?: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (user: User, accessToken: string) => void;
  logout: () => void;
  refresh: (accessToken: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  login: (user, accessToken) =>
    set({
      user,
      accessToken,
      isAuthenticated: true,
    }),
  logout: () =>
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
    }),
  refresh: (accessToken) =>
    set({
      accessToken,
      isAuthenticated: true,
    }),
}));
