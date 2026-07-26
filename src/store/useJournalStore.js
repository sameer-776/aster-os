import { create } from 'zustand';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from './useAuthStore'; 

const STORAGE_KEY = 'victoros_journal_backup';

const getLocalBackup = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveLocalBackup = (entries) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (err) {
    console.error('Failed to save journal local backup:', err);
  }
};

export const useJournalStore = create((set, get) => ({
  entries: getLocalBackup(),
  loading: false,

  fetchEntries: async () => {
    set({ loading: true });
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        set({ loading: false });
        return;
      }

      const q = query(
        collection(db, 'journal'), 
        where('userId', '==', user.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const entriesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => b.date.localeCompare(a.date));
      
      set({ entries: entriesData, loading: false });
      saveLocalBackup(entriesData);
    } catch (error) {
      console.error("Error fetching journal:", error);
      set({ loading: false });
    }
  },

  addEntry: async (date) => {
    try {
      const user = useAuthStore.getState().user;
      const userId = user ? user.uid : 'guest';

      const newEntry = {
        date,
        mood: '🙂',
        sleepTime: '23:00',
        wakeTime: '07:00',
        sleepHours: '8.0',
        sleepQuality: 'Restful',
        waterGlasses: 4,
        energyLevel: 3,
        productivityLevel: 3,
        habits: {
          meditation: false,
          workout: false,
          reading: false,
          healthyEating: false
        },
        gratitude: '',
        event: '',
        notes: '',
        userId: userId,
        createdAt: new Date().toISOString()
      };

      let savedEntry = { id: `local_${Date.now()}`, ...newEntry };

      if (user) {
        try {
          const docRef = await addDoc(collection(db, 'journal'), newEntry);
          savedEntry = { id: docRef.id, ...newEntry };
        } catch (fbErr) {
          console.warn('Firebase addEntry failed, storing locally:', fbErr);
        }
      }
      
      const updated = [savedEntry, ...get().entries].sort((a, b) => b.date.localeCompare(a.date));
      set({ entries: updated });
      saveLocalBackup(updated);
      return savedEntry;
    } catch (error) {
      console.error("Error adding entry:", error);
    }
  },

  updateEntry: async (id, updatedFields) => {
    try {
      const updated = get().entries.map(entry => 
        entry.id === id ? { ...entry, ...updatedFields } : entry
      );
      set({ entries: updated });
      saveLocalBackup(updated);
      
      if (!id.startsWith('local_')) {
        const entryRef = doc(db, 'journal', id);
        await updateDoc(entryRef, updatedFields);
      }
    } catch (error) {
      console.error("Error updating entry:", error);
    }
  },

  deleteEntry: async (id) => {
    try {
      const updated = get().entries.filter(entry => entry.id !== id);
      set({ entries: updated });
      saveLocalBackup(updated);

      if (!id.startsWith('local_')) {
        await deleteDoc(doc(db, 'journal', id));
      }
    } catch (error) {
      console.error("Error deleting entry:", error);
    }
  }
}));