import { create } from 'zustand';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from './useAuthStore';

export const useExpenseStore = create((set) => ({
  expenses: [],
  loading: false,

  fetchExpenses: async () => {
    set({ loading: true });
    try {
      const user = useAuthStore.getState().user;
      if (!user) return;

      const q = query(collection(db, 'expenses'), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const expensesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      
      set({ expenses: expensesData, loading: false });
    } catch (error) {
      console.error("Error fetching expenses:", error);
      set({ loading: false });
    }
  },

  addExpense: async (expenseData) => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) return;

      const newExpense = {
        ...expenseData,
        userId: user.uid,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'expenses'), newExpense);
      
      set((state) => ({ 
        expenses: [{ id: docRef.id, ...newExpense }, ...state.expenses]
      }));
    } catch (error) {
      console.error("Error adding expense:", error);
    }
  },

  deleteExpense: async (id) => {
    try {
      await deleteDoc(doc(db, 'expenses', id));
      set((state) => ({
        expenses: state.expenses.filter(e => e.id !== id)
      }));
    } catch (error) {
      console.error("Error deleting expense:", error);
    }
  }
}));