import { create } from 'zustand';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from './useAuthStore';

const STORAGE_KEY = 'victoros_coding_problems_backup';
const HANDLES_STORAGE_KEY = 'victoros_coding_handles_backup';

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

export const useCodingStore = create((set, get) => ({
  problems: getLocalBackup(STORAGE_KEY, []),
  handles: getLocalBackup(HANDLES_STORAGE_KEY, {
    github: '',
    leetcode: '',
    hackerrank: '',
    codeforces: ''
  }),
  profileStats: {
    github: null,
    githubRepos: [],
    leetcode: null,
    codeforces: null
  },
  loading: false,

  fetchCodingData: async () => {
    set({ loading: true });
    try {
      const user = useAuthStore.getState().user;
      if (user) {
        const q = query(
          collection(db, 'coding_problems'),
          where('userId', '==', user.uid)
        );
        const querySnapshot = await getDocs(q);
        const problemsData = querySnapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        })).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        set({ problems: problemsData });
        saveLocalBackup(STORAGE_KEY, problemsData);
      }
    } catch (err) {
      console.error('Error fetching coding problems:', err);
    } finally {
      set({ loading: false });
    }

    // Refresh platform stats if handles exist
    get().refreshPlatformStats();
  },

  updateHandles: (newHandles) => {
    const updated = { ...get().handles, ...newHandles };
    set({ handles: updated });
    saveLocalBackup(HANDLES_STORAGE_KEY, updated);
    get().refreshPlatformStats();
  },

  refreshPlatformStats: async () => {
    const { github, leetcode, codeforces } = get().handles;

    const stats = { ...get().profileStats };

    // Fetch GitHub Stats & Public Repos
    if (github && github.trim()) {
      try {
        const res = await fetch(`https://api.github.com/users/${github.trim()}`);
        if (res.ok) {
          const data = await res.json();
          stats.github = {
            publicRepos: data.public_repos || 0,
            followers: data.followers || 0,
            following: data.following || 0,
            avatar: data.avatar_url,
            name: data.name || data.login,
            bio: data.bio || '',
            url: data.html_url
          };
        }

        // Fetch top recent repos
        const reposRes = await fetch(`https://api.github.com/users/${github.trim()}/repos?sort=updated&per_page=6`);
        if (reposRes.ok) {
          const reposData = await reposRes.json();
          if (Array.isArray(reposData)) {
            stats.githubRepos = reposData.map(r => ({
              name: r.name,
              description: r.description || 'No description provided.',
              stars: r.stargazers_count,
              language: r.language || 'Code',
              url: r.html_url
            }));
          }
        }
      } catch (err) {
        console.warn('Failed to fetch GitHub stats:', err);
      }
    }

    // Fetch LeetCode Stats
    if (leetcode && leetcode.trim()) {
      try {
        const res = await fetch(`https://leetcode-stats-api.herokuapp.com/${leetcode.trim()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'success') {
            stats.leetcode = {
              totalSolved: data.totalSolved || 0,
              easySolved: data.easySolved || 0,
              mediumSolved: data.mediumSolved || 0,
              hardSolved: data.hardSolved || 0,
              acceptanceRate: data.acceptanceRate || 0,
              ranking: data.ranking || 0
            };
          }
        }
      } catch (err) {
        console.warn('Failed to fetch LeetCode stats:', err);
      }
    }

    // Fetch Codeforces Stats
    if (codeforces && codeforces.trim()) {
      try {
        const res = await fetch(`https://codeforces.com/api/user.info?handles=${codeforces.trim()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'OK' && data.result.length > 0) {
            const cfUser = data.result[0];
            stats.codeforces = {
              rating: cfUser.rating || 0,
              maxRating: cfUser.maxRating || 0,
              rank: cfUser.rank || 'Unrated',
              avatar: cfUser.titlePhoto
            };
          }
        }
      } catch (err) {
        console.warn('Failed to fetch Codeforces stats:', err);
      }
    }

    set({ profileStats: stats });
  },

  addProblem: async (problemData) => {
    try {
      const user = useAuthStore.getState().user;
      const userId = user ? user.uid : 'guest';

      const newProblem = {
        title: problemData.title || 'Untitled Problem',
        platform: problemData.platform || 'LeetCode',
        difficulty: problemData.difficulty || 'Medium',
        notes: problemData.notes || '',
        userId: userId,
        createdAt: new Date().toISOString()
      };

      let saved = { id: `local_${Date.now()}`, ...newProblem };

      if (user) {
        try {
          const docRef = await addDoc(collection(db, 'coding_problems'), newProblem);
          saved = { id: docRef.id, ...newProblem };
        } catch (fbErr) {
          console.warn('Firebase addProblem failed, storing locally:', fbErr);
        }
      }

      const updated = [saved, ...get().problems];
      set({ problems: updated });
      saveLocalBackup(STORAGE_KEY, updated);
      return saved;
    } catch (err) {
      console.error('Error adding coding problem:', err);
    }
  },

  deleteProblem: async (id) => {
    try {
      const updated = get().problems.filter(p => p.id !== id);
      set({ problems: updated });
      saveLocalBackup(STORAGE_KEY, updated);

      if (!id.startsWith('local_')) {
        await deleteDoc(doc(db, 'coding_problems', id));
      }
    } catch (err) {
      console.error('Error deleting coding problem:', err);
    }
  }
}));

export const useLeetCodeStore = useCodingStore;
