import { create } from 'zustand';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore, isRealUser } from './useAuthStore';

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
      if (isRealUser(user)) {
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
    const user = useAuthStore.getState().user;
    if (isRealUser(user)) saveLocalBackup(HANDLES_STORAGE_KEY, updated);
    get().refreshPlatformStats();
  },

  refreshPlatformStats: async () => {
    const { github, leetcode, codeforces } = get().handles;
    const stats = { ...get().profileStats };

    // 1. Fetch GitHub Stats, Public Repos & PushEvents Daily Commit Frequency
    if (github && github.trim()) {
      const ghUsername = github.trim();
      try {
        const res = await fetch(`https://api.github.com/users/${ghUsername}`);
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
        const reposRes = await fetch(`https://api.github.com/users/${ghUsername}/repos?sort=updated&per_page=6`);
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

        // Fetch GitHub Events to compute daily PushEvent commit frequencies
        const eventsRes = await fetch(`https://api.github.com/users/${ghUsername}/events?per_page=100`);
        if (eventsRes.ok) {
          const eventsData = await eventsRes.json();
          if (Array.isArray(eventsData)) {
            // Group commit counts by date over last 14 days
            const dayMap = {};
            const now = new Date();
            for (let i = 13; i >= 0; i--) {
              const d = new Date(now);
              d.setDate(d.getDate() - i);
              const dateStr = d.toISOString().split('T')[0];
              dayMap[dateStr] = 0;
            }

            eventsData.forEach(event => {
              if (event.type === 'PushEvent' && event.created_at) {
                const dateStr = event.created_at.split('T')[0];
                if (dayMap[dateStr] !== undefined) {
                  const count = event.payload?.commits?.length || 1;
                  dayMap[dateStr] += count;
                }
              }
            });

            const commitCounts = Object.values(dayMap);
            const maxCommits = Math.max(...commitCounts, 1);
            // Normalize into [0.0, 1.0] for WaveChartPainter coordinates
            const waveCoordinates = commitCounts.map(count => Number((count / maxCommits).toFixed(2)));

            stats.githubCommits = {
              dailyFrequencies: dayMap,
              countsArray: commitCounts,
              waveCoordinates: waveCoordinates,
              totalRecentCommits: commitCounts.reduce((a, b) => a + b, 0)
            };
          }
        }
      } catch (err) {
        console.warn('Failed to fetch GitHub stats & events:', err);
      }
    }

    // 2. Fetch LeetCode Stats via GraphQL API (with fallback)
    if (leetcode && leetcode.trim()) {
      const lcUsername = leetcode.trim();
      let fetchedGraphQL = false;

      // Attempt Direct LeetCode GraphQL POST
      try {
        const graphqlQuery = {
          query: `
            query getUserProfile($username: String!) {
              matchedUser(username: $username) {
                username
                submitStatsGlobal {
                  acSubmissionNum {
                    difficulty
                    count
                  }
                }
                userCalendar {
                  streak
                  totalActiveDays
                }
              }
              recentSubmissionList(username: $username, limit: 5) {
                title
                titleSlug
                timestamp
                statusDisplay
                lang
              }
            }
          `,
          variables: { username: lcUsername }
        };

        const res = await fetch('https://leetcode.com/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(graphqlQuery)
        });

        if (res.ok) {
          const json = await res.json();
          if (json.data?.matchedUser) {
            const mu = json.data.matchedUser;
            const statsNum = mu.submitStatsGlobal?.acSubmissionNum || [];
            const getCount = (diff) => statsNum.find(s => s.difficulty === diff)?.count || 0;

            stats.leetcode = {
              totalSolved: getCount('All'),
              easySolved: getCount('Easy'),
              mediumSolved: getCount('Medium'),
              hardSolved: getCount('Hard'),
              streak: mu.userCalendar?.streak || 0,
              totalActiveDays: mu.userCalendar?.totalActiveDays || 0,
              recentSubmissions: (json.data.recentSubmissionList || []).map(s => ({
                title: s.title,
                status: s.statusDisplay,
                lang: s.lang,
                date: new Date(Number(s.timestamp) * 1000).toLocaleDateString()
              }))
            };
            fetchedGraphQL = true;
          }
        }
      } catch (err) {
        console.warn('LeetCode direct GraphQL blocked or failed, using API fallback:', err);
      }

      // Fallback if GraphQL CORS blocked
      if (!fetchedGraphQL) {
        try {
          const res = await fetch(`https://leetcode-stats-api.herokuapp.com/${lcUsername}`);
          if (res.ok) {
            const data = await res.json();
            if (data.status === 'success') {
              stats.leetcode = {
                totalSolved: data.totalSolved || 0,
                easySolved: data.easySolved || 0,
                mediumSolved: data.mediumSolved || 0,
                hardSolved: data.hardSolved || 0,
                acceptanceRate: data.acceptanceRate || 0,
                ranking: data.ranking || 0,
                streak: 5,
                recentSubmissions: []
              };
            }
          }
        } catch (err) {
          console.warn('Failed to fetch LeetCode fallback stats:', err);
        }
      }
    }

    // 3. Fetch Codeforces Stats
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
      const real = isRealUser(user);
      const userId = real ? user.uid : 'guest';

      const newProblem = {
        title: problemData.title || 'Untitled Problem',
        platform: problemData.platform || 'LeetCode',
        difficulty: problemData.difficulty || 'Medium',
        notes: problemData.notes || '',
        userId: userId,
        createdAt: new Date().toISOString()
      };

      let saved = { id: `local_${Date.now()}`, ...newProblem };

      if (real) {
        try {
          const docRef = await addDoc(collection(db, 'coding_problems'), newProblem);
          saved = { id: docRef.id, ...newProblem };
        } catch (fbErr) {
          console.warn('Firebase addProblem failed, storing locally:', fbErr);
        }
      }

      const updated = [saved, ...get().problems];
      set({ problems: updated });
      if (real) saveLocalBackup(STORAGE_KEY, updated);
      return saved;
    } catch (err) {
      console.error('Error adding coding problem:', err);
    }
  },

  deleteProblem: async (id) => {
    try {
      const user = useAuthStore.getState().user;
      const real = isRealUser(user);

      const updated = get().problems.filter(p => p.id !== id);
      set({ problems: updated });
      if (real) saveLocalBackup(STORAGE_KEY, updated);

      if (real && !id.startsWith('local_')) {
        await deleteDoc(doc(db, 'coding_problems', id));
      }
    } catch (err) {
      console.error('Error deleting coding problem:', err);
    }
  }
}));

export const useLeetCodeStore = useCodingStore;
