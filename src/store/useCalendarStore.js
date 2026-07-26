import { create } from 'zustand';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from './useAuthStore';

export const useCalendarStore = create((set) => ({
  events: [],
  loading: false,

  fetchEvents: async () => {
    set({ loading: true });
    try {
      const user = useAuthStore.getState().user;
      if (!user) return;

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
      if (!user) return;

      const newEvent = {
        ...eventData,
        userId: user.uid,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'calendar_events'), newEvent);
      const savedEvent = { id: docRef.id, ...newEvent };
      
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
      await deleteDoc(doc(db, 'calendar_events', id));
      set((state) => ({
        events: state.events.filter(e => e.id !== id)
      }));
    } catch (error) {
      console.error("Error deleting calendar event:", error);
    }
  }
}));
