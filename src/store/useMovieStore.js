import { create } from 'zustand';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from './useAuthStore';

const STORAGE_KEY = 'victoros_movies_backup';

const getLocalBackup = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveLocalBackup = (movies) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(movies));
  } catch (err) {
    console.error('Failed to save movies local backup:', err);
  }
};

export const useMovieStore = create((set, get) => ({
  movies: getLocalBackup(),
  loading: false,

  fetchMovies: async () => {
    set({ loading: true });
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        set({ loading: false });
        return;
      }

      const q = query(
        collection(db, 'movies'),
        where('userId', '==', user.uid)
      );

      const querySnapshot = await getDocs(q);
      const moviesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      set({ movies: moviesData, loading: false });
      saveLocalBackup(moviesData);
    } catch (error) {
      console.error('Error fetching movies from Firebase:', error);
      // Fallback to local cache
      set({ loading: false });
    }
  },

  addMovie: async (movieData) => {
    try {
      const user = useAuthStore.getState().user;
      const userId = user ? user.uid : 'guest';

      const newMovie = {
        title: movieData.title || 'Untitled Movie',
        year: movieData.year || '',
        genre: movieData.genre || '',
        director: movieData.director || '',
        plot: movieData.plot || '',
        imdbRating: movieData.imdbRating || '7.5',
        userRating: movieData.userRating || 0,
        status: movieData.status || 'watchlist', // 'watchlist' or 'watched'
        poster: movieData.poster || '',
        notes: movieData.notes || '',
        userId: userId,
        createdAt: new Date().toISOString()
      };

      let savedMovie = { id: `local_${Date.now()}`, ...newMovie };

      if (user) {
        try {
          const docRef = await addDoc(collection(db, 'movies'), newMovie);
          savedMovie = { id: docRef.id, ...newMovie };
        } catch (fbErr) {
          console.warn('Firebase addDoc failed, storing locally:', fbErr);
        }
      }

      const updated = [savedMovie, ...get().movies];
      set({ movies: updated });
      saveLocalBackup(updated);
      return savedMovie;
    } catch (error) {
      console.error('Error adding movie:', error);
    }
  },

  updateMovie: async (id, updatedFields) => {
    try {
      const updated = get().movies.map(m =>
        m.id === id ? { ...m, ...updatedFields } : m
      );
      set({ movies: updated });
      saveLocalBackup(updated);

      if (!id.startsWith('local_')) {
        const movieRef = doc(db, 'movies', id);
        await updateDoc(movieRef, updatedFields);
      }
    } catch (error) {
      console.error('Error updating movie:', error);
    }
  },

  toggleStatus: async (id) => {
    const movie = get().movies.find(m => m.id === id);
    if (!movie) return;

    const newStatus = movie.status === 'watched' ? 'watchlist' : 'watched';
    await get().updateMovie(id, { status: newStatus });
  },

  deleteMovie: async (id) => {
    try {
      const updated = get().movies.filter(m => m.id !== id);
      set({ movies: updated });
      saveLocalBackup(updated);

      if (!id.startsWith('local_')) {
        await deleteDoc(doc(db, 'movies', id));
      }
    } catch (error) {
      console.error('Error deleting movie:', error);
    }
  }
}));
