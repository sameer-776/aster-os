import { create } from 'zustand';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore, isRealUser } from './useAuthStore'; 

export const useTaskStore = create((set) => ({
  tasks: [],
  loading: false,

  fetchTasks: async () => {
    set({ loading: true });
    try {
      const user = useAuthStore.getState().user;
      if (!isRealUser(user)) {
        set({ loading: false });
        return;
      }

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
      const real = isRealUser(user);

      const newTask = {
        title,
        status: 'todo',
        priority: 'medium',
        userId: real ? user.uid : 'guest',
        createdAt: new Date().toISOString()
      };

      let savedTask = { id: `local_${Date.now()}`, ...newTask };

      if (real) {
        const docRef = await addDoc(collection(db, 'tasks'), newTask);
        savedTask = { id: docRef.id, ...newTask };
      }
      
      // Update the UI instantly
      set((state) => ({ 
        tasks: [...state.tasks, savedTask] 
      }));
    } catch (error) {
      console.error("Error adding task:", error);
    }
  },

  deleteTask: async (id) => {
    try {
      const user = useAuthStore.getState().user;
      const real = isRealUser(user);

      if (real && !id.startsWith('local_')) {
        await deleteDoc(doc(db, 'tasks', id));
      }
      set((state) => ({
        tasks: state.tasks.filter(task => task.id !== id)
      }));
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  }
}));