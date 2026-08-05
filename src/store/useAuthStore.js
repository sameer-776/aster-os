import { create } from 'zustand';
import { onAuthStateChanged, signOut, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

export const isRealUser = (user) => {
  return Boolean(user && !user.isGuest && user.uid !== 'guest_user');
};

export const useAuthStore = create((set, get) => ({
  user: null,
  loading: true,

  init: () => {
    onAuthStateChanged(auth, (user) => {
      const currentUser = get().user;
      if (currentUser?.isGuest && !user) {
        return;
      }
      set({ user, loading: false });
    });
  },

  loginWithGoogle: async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  },

  logout: async () => {
    try {
      const currentUser = get().user;
      if (currentUser?.isGuest) {
        set({ user: null });
        return;
      }
      await signOut(auth);
      set({ user: null }); 
    } catch (error) {
      console.error("Logout failed:", error);
      set({ user: null });
    }
  }
}));