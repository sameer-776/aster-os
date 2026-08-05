import { create } from 'zustand';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore, isRealUser } from './useAuthStore'; 

export const useGymStore = create((set) => ({
  workouts: [],
  loading: false,

  fetchWorkouts: async () => {
    set({ loading: true });
    try {
      const user = useAuthStore.getState().user;
      if (!isRealUser(user)) {
        set({ loading: false });
        return;
      }

      const q = query(
        collection(db, 'gym_workouts'), 
        where('userId', '==', user.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const workoutsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => b.date.localeCompare(a.date)); // Newest first
      
      set({ workouts: workoutsData, loading: false });
    } catch (error) {
      console.error("Error fetching workouts:", error);
      set({ loading: false });
    }
  },

  addWorkout: async (workoutData) => {
    try {
      const user = useAuthStore.getState().user;
      const real = isRealUser(user);

      const newWorkout = {
        ...workoutData,
        userId: real ? user.uid : 'guest',
        createdAt: new Date().toISOString()
      };

      let savedWorkout = { id: `local_${Date.now()}`, ...newWorkout };

      if (real) {
        const docRef = await addDoc(collection(db, 'gym_workouts'), newWorkout);
        savedWorkout = { id: docRef.id, ...newWorkout };
      }
      
      set((state) => ({ 
        workouts: [savedWorkout, ...state.workouts].sort((a, b) => b.date.localeCompare(a.date))
      }));
      
      return savedWorkout;
    } catch (error) {
      console.error("Error adding workout:", error);
    }
  },

  deleteWorkout: async (id) => {
    try {
      const user = useAuthStore.getState().user;
      const real = isRealUser(user);

      if (real && !id.startsWith('local_')) {
        await deleteDoc(doc(db, 'gym_workouts', id));
      }
      set((state) => ({
        workouts: state.workouts.filter(w => w.id !== id)
      }));
    } catch (error) {
      console.error("Error deleting workout:", error);
    }
  }
}));