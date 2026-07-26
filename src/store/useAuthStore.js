import { create } from 'zustand';
import { onAuthStateChanged, signOut, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,

  // This is the missing function! It listens for Firebase login changes.
  init: () => {
    onAuthStateChanged(auth, (user) => {
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
      await signOut(auth);
      // Ensure the state clears out completely on logout
      set({ user: null }); 
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }
}));