import { create } from 'zustand';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore, isRealUser } from './useAuthStore';

const STORAGE_KEY = 'victoros_goals_backup';
const CATEGORIES_STORAGE_KEY = 'victoros_goal_categories_backup';

const DEFAULT_CATEGORIES = ['Short Term', 'Long Term', 'Career', 'Health', 'Personal', 'Finance'];

const getLocalBackup = (key, defaultVal) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultVal;
  } catch {
    return defaultVal;
  }
};

const saveLocalBackup = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Failed to save local backup for ${key}:`, err);
  }
};

export const useGoalStore = create((set, get) => ({
  goals: getLocalBackup(STORAGE_KEY, []),
  categories: getLocalBackup(CATEGORIES_STORAGE_KEY, DEFAULT_CATEGORIES),
  loading: false,

  fetchGoals: async () => {
    set({ loading: true });
    try {
      const user = useAuthStore.getState().user;
      if (!isRealUser(user)) {
        set({ loading: false });
        return;
      }

      const q = query(
        collection(db, 'goals'),
        where('userId', '==', user.uid)
      );

      const querySnapshot = await getDocs(q);
      const goalsData = querySnapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      set({ goals: goalsData, loading: false });
      saveLocalBackup(STORAGE_KEY, goalsData);
    } catch (error) {
      console.error('Error fetching goals from Firebase:', error);
      set({ loading: false });
    }
  },

  addCategory: (newCatName) => {
    if (!newCatName || !newCatName.trim()) return;
    const cleanCat = newCatName.trim();
    if (get().categories.includes(cleanCat)) return;

    const updatedCategories = [...get().categories, cleanCat];
    set({ categories: updatedCategories });
    const user = useAuthStore.getState().user;
    if (isRealUser(user)) saveLocalBackup(CATEGORIES_STORAGE_KEY, updatedCategories);
  },

  addGoal: async (goalData) => {
    try {
      const user = useAuthStore.getState().user;
      const real = isRealUser(user);
      const userId = real ? user.uid : 'guest';

      const milestones = (goalData.milestones || []).map((m, idx) =>
        typeof m === 'string' ? { id: `m_${idx}_${Date.now()}`, title: m, completed: false } : m
      );

      const category = goalData.category || 'Short Term';
      if (!get().categories.includes(category)) {
        get().addCategory(category);
      }

      const newGoal = {
        title: goalData.title || 'Untitled Goal',
        description: goalData.description || '',
        category: category,
        targetDate: goalData.targetDate || '',
        status: goalData.status || 'in_progress',
        progress: Number(goalData.progress || 0),
        milestones: milestones,
        userId: userId,
        createdAt: new Date().toISOString()
      };

      let savedGoal = { id: `local_${Date.now()}`, ...newGoal };

      if (real) {
        try {
          const docRef = await addDoc(collection(db, 'goals'), newGoal);
          savedGoal = { id: docRef.id, ...newGoal };
        } catch (fbErr) {
          console.warn('Firebase addGoal failed, storing locally:', fbErr);
        }
      }

      const updated = [savedGoal, ...get().goals];
      set({ goals: updated });
      if (real) saveLocalBackup(STORAGE_KEY, updated);
      return savedGoal;
    } catch (error) {
      console.error('Error adding goal:', error);
    }
  },

  updateGoal: async (id, updatedFields) => {
    try {
      const user = useAuthStore.getState().user;
      const real = isRealUser(user);

      const updated = get().goals.map(g =>
        g.id === id ? { ...g, ...updatedFields } : g
      );
      set({ goals: updated });
      if (real) saveLocalBackup(STORAGE_KEY, updated);

      if (real && !id.startsWith('local_')) {
        const goalRef = doc(db, 'goals', id);
        await updateDoc(goalRef, updatedFields);
      }
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  },

  toggleGoalStatus: async (id) => {
    const goal = get().goals.find(g => g.id === id);
    if (!goal) return;

    const newStatus = goal.status === 'completed' ? 'in_progress' : 'completed';
    const newProgress = newStatus === 'completed' ? 100 : (goal.progress === 100 ? 0 : goal.progress);
    await get().updateGoal(id, { status: newStatus, progress: newProgress });
  },

  toggleMilestone: async (goalId, milestoneId) => {
    const goal = get().goals.find(g => g.id === goalId);
    if (!goal || !goal.milestones) return;

    const updatedMilestones = goal.milestones.map(m =>
      m.id === milestoneId ? { ...m, completed: !m.completed } : m
    );

    const completedCount = updatedMilestones.filter(m => m.completed).length;
    const totalCount = updatedMilestones.length;
    const newProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : goal.progress;
    const newStatus = newProgress === 100 ? 'completed' : 'in_progress';

    await get().updateGoal(goalId, {
      milestones: updatedMilestones,
      progress: newProgress,
      status: newStatus
    });
  },

  deleteGoal: async (id) => {
    try {
      const user = useAuthStore.getState().user;
      const real = isRealUser(user);

      const updated = get().goals.filter(g => g.id !== id);
      set({ goals: updated });
      if (real) saveLocalBackup(STORAGE_KEY, updated);

      if (real && !id.startsWith('local_')) {
        await deleteDoc(doc(db, 'goals', id));
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  }
}));
