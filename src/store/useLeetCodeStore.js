import { create } from 'zustand';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore, isRealUser } from './useAuthStore';

export const useLeetCodeStore = create((set) => ({
  problems: [],
  loading: false,

  fetchProblems: async () => {
    set({ loading: true });
    try {
      const user = useAuthStore.getState().user;
      if (!isRealUser(user)) {
        set({ loading: false });
        return;
      }

      const q = query(collection(db, 'leetcode'), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const problemsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      
      set({ problems: problemsData, loading: false });
    } catch (error) {
      console.error("Error fetching LeetCode problems:", error);
      set({ loading: false });
    }
  },

  addProblem: async (problemData) => {
    try {
      const user = useAuthStore.getState().user;
      const real = isRealUser(user);

      const newProblem = {
        ...problemData,
        userId: real ? user.uid : 'guest',
        createdAt: new Date().toISOString()
      };

      let saved = { id: `local_${Date.now()}`, ...newProblem };

      if (real) {
        const docRef = await addDoc(collection(db, 'leetcode'), newProblem);
        saved = { id: docRef.id, ...newProblem };
      }
      
      set((state) => ({ 
        problems: [saved, ...state.problems]
      }));
    } catch (error) {
      console.error("Error adding problem:", error);
    }
  },

  deleteProblem: async (id) => {
    try {
      const user = useAuthStore.getState().user;
      const real = isRealUser(user);

      if (real && !id.startsWith('local_')) {
        await deleteDoc(doc(db, 'leetcode', id));
      }
      set((state) => ({
        problems: state.problems.filter(p => p.id !== id)
      }));
    } catch (error) {
      console.error("Error deleting problem:", error);
    }
  }
}));