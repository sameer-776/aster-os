import { create } from 'zustand';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from './useAuthStore'; 

export const useTaskStore = create((set) => ({
  tasks: [],
  loading: false,

  fetchTasks: async () => {
    set({ loading: true });
    try {
      const user = useAuthStore.getState().user;
      if (!user) return;

      const q = query(collection(db, 'tasks'), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const tasksData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      set({ tasks: tasksData, loading: false });
    } catch (error) {
      console.error("Error fetching tasks:", error);
      set({ loading: false });
    }
  },

  addTask: async (title) => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) return;

      const newTask = {
        title,
        status: 'todo',
        priority: 'medium',
        userId: user.uid,
        createdAt: new Date().toISOString()
      };

      // Push to Firebase
      const docRef = await addDoc(collection(db, 'tasks'), newTask);
      
      // Update the UI instantly
      set((state) => ({ 
        tasks: [...state.tasks, { id: docRef.id, ...newTask }] 
      }));
    } catch (error) {
      console.error("Error adding task:", error);
    }
  },

  deleteTask: async (id) => {
    try {
      await deleteDoc(doc(db, 'tasks', id));
      set((state) => ({
        tasks: state.tasks.filter(task => task.id !== id)
      }));
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  }
}));