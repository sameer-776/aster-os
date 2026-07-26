import { create } from 'zustand';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from './useAuthStore';

export const useLeetCodeStore = create((set) => ({
  problems: [],
  loading: false,

  fetchProblems: async () => {
    set({ loading: true });
    try {
      const user = useAuthStore.getState().user;
      if (!user) return;

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
      if (!user) return;

      const newProblem = {
        ...problemData,
        userId: user.uid,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'leetcode'), newProblem);
      
      set((state) => ({ 
        problems: [{ id: docRef.id, ...newProblem }, ...state.problems]
      }));
    } catch (error) {
      console.error("Error adding problem:", error);
    }
  },

  deleteProblem: async (id) => {
    try {
      await deleteDoc(doc(db, 'leetcode', id));
      set((state) => ({
        problems: state.problems.filter(p => p.id !== id)
      }));
    } catch (error) {
      console.error("Error deleting problem:", error);
    }
  }
}));