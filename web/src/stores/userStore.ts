import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  plan: 'free' | 'premium' | 'family';
  isAdmin: boolean;
  createdAt: string;
}

export interface UserState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useUserStore = create<UserState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        isLoading: false,
        error: null,

        setUser: (user: User) => set({ user, error: null }),
        
        clearUser: () => set({ user: null, error: null }),
        
        setLoading: (isLoading: boolean) => set({ isLoading }),
        
        setError: (error: string | null) => set({ error }),
        
        updateUser: (updates: Partial<User>) =>
          set((state) => ({
            user: state.user ? { ...state.user, ...updates } : null,
          })),
      }),
      {
        name: 'user-storage',
      },
    ),
  ),
);
