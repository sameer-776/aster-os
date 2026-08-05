import { create } from 'zustand';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore, isRealUser } from './useAuthStore';

export const useCalendarStore = create((set) => ({
  events: [],
  loading: false,

  fetchEvents: async () => {
    set({ loading: true });
    try {
      const user = useAuthStore.getState().user;
      if (!isRealUser(user)) {
        set({ loading: false });
        return;
      }

      const q = query(collection(db, 'calendar_events'), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const eventsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      set({ events: eventsData, loading: false });
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      set({ loading: false });
    }
  },

  addEvent: async (eventData) => {
    try {
      const user = useAuthStore.getState().user;
      const real = isRealUser(user);

      const newEvent = {
        ...eventData,
        userId: real ? user.uid : 'guest',
        createdAt: new Date().toISOString()
      };

      let savedEvent = { id: `local_${Date.now()}`, ...newEvent };

      if (real) {
        const docRef = await addDoc(collection(db, 'calendar_events'), newEvent);
        savedEvent = { id: docRef.id, ...newEvent };
      }
      
      set((state) => ({ 
        events: [...state.events, savedEvent]
      }));

      return savedEvent;
    } catch (error) {
      console.error("Error adding calendar event:", error);
    }
  },

  deleteEvent: async (id) => {
    try {
      const user = useAuthStore.getState().user;
      const real = isRealUser(user);

      if (real && !id.startsWith('local_')) {
        await deleteDoc(doc(db, 'calendar_events', id));
      }
      set((state) => ({
        events: state.events.filter(e => e.id !== id)
      }));
    } catch (error) {
      console.error("Error deleting calendar event:", error);
    }
  }
}));
