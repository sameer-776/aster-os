import { create } from 'zustand';
import { collection, addDoc, getDocs, deleteDoc, updateDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore, isRealUser } from './useAuthStore';

// Helper to get local date format YYYY-MM-DD
const getLocalYMD = (dateObj = new Date()) => {
  return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
};

// Initial sample workouts for demo/guest experience
const INITIAL_SAMPLE_WORKOUTS = [
  {
    id: 'sample_1',
    date: getLocalYMD(new Date()),
    split: 'Push',
    duration: 55,
    calories: 420,
    exercises: [
      { name: 'Bench Press', sets: 4, reps: 10, weight: 80, notes: 'Felt strong on set 3' },
      { name: 'Incline Dumbbell Press', sets: 3, reps: 12, weight: 28, notes: 'Controlled tempo' },
      { name: 'Cable Flyes', sets: 3, reps: 15, weight: 18, notes: 'Great chest pump' },
      { name: 'Tricep Rope Pushdown', sets: 4, reps: 12, weight: 32, notes: 'Focus on peak squeeze' }
    ],
    totalVolume: 7428,
    isPR: true,
    prDetails: { exercise: 'Bench Press', weight: 80, prevWeight: 75, diff: 5 },
    createdAt: new Date().toISOString()
  },
  {
    id: 'sample_2',
    date: getLocalYMD(new Date(Date.now() - 86400000 * 1)),
    split: 'Pull',
    duration: 60,
    calories: 480,
    exercises: [
      { name: 'Barbell Row', sets: 4, reps: 8, weight: 75, notes: 'Strict form' },
      { name: 'Lat Pulldown', sets: 3, reps: 10, weight: 65, notes: 'Wide grip' },
      { name: 'Face Pulls', sets: 4, reps: 15, weight: 22, notes: 'Rear delt isolation' },
      { name: 'Barbell Bicep Curl', sets: 3, reps: 10, weight: 35, notes: 'Strict, no swinging' }
    ],
    totalVolume: 6185,
    isPR: false,
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString()
  },
  {
    id: 'sample_3',
    date: getLocalYMD(new Date(Date.now() - 86400000 * 3)),
    split: 'Legs',
    duration: 65,
    calories: 540,
    exercises: [
      { name: 'Barbell Squat', sets: 4, reps: 8, weight: 105, notes: 'Deep depth, felt easy' },
      { name: 'Romanian Deadlift', sets: 3, reps: 10, weight: 85, notes: 'Hamstrings on fire' },
      { name: 'Leg Extension', sets: 4, reps: 12, weight: 60, notes: 'Burnout set at end' }
    ],
    totalVolume: 8790,
    isPR: true,
    prDetails: { exercise: 'Barbell Squat', weight: 105, prevWeight: 100, diff: 5 },
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: 'sample_4',
    date: getLocalYMD(new Date(Date.now() - 86400000 * 5)),
    split: 'Upper',
    duration: 50,
    calories: 390,
    exercises: [
      { name: 'Overhead Press', sets: 4, reps: 6, weight: 55, notes: 'Core engaged' },
      { name: 'Pull Ups', sets: 4, reps: 8, weight: 0, notes: 'Bodyweight controlled' }
    ],
    totalVolume: 2250,
    isPR: false,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
  }
];

const INITIAL_BODY_WEIGHT = [
  { date: getLocalYMD(new Date(Date.now() - 86400000 * 28)), weight: 79.5 },
  { date: getLocalYMD(new Date(Date.now() - 86400000 * 21)), weight: 78.8 },
  { date: getLocalYMD(new Date(Date.now() - 86400000 * 14)), weight: 78.2 },
  { date: getLocalYMD(new Date(Date.now() - 86400000 * 7)), weight: 77.6 },
  { date: getLocalYMD(new Date()), weight: 77.0 }
];

export const useGymStore = create((set, get) => ({
  workouts: INITIAL_SAMPLE_WORKOUTS,
  bodyWeightLogs: INITIAL_BODY_WEIGHT,
  loading: false,
  
  // Live Workout Session State
  activeWorkout: null, // { split, exercises, currentExerciseIndex, currentSet, reps, weight, startTime, restTimer }
  
  // PR Celebration Modal Trigger
  prCelebration: null, // { exercise, weight, diff }

  // Target goals
  workoutGoalDuration: 60,
  weeklyGoalCount: 4,

  // Fetch Workouts from Firestore
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
      
      if (workoutsData.length > 0) {
        set({ workouts: workoutsData, loading: false });
      } else {
        set({ loading: false });
      }
    } catch (error) {
      console.error("Error fetching workouts:", error);
      set({ loading: false });
    }
  },

  // Add / Log New Workout Entry
  addWorkout: async (workoutData) => {
    try {
      const user = useAuthStore.getState().user;
      const real = isRealUser(user);

      // Compute total volume
      let totalVolume = 0;
      if (workoutData.exercises && Array.isArray(workoutData.exercises)) {
        totalVolume = workoutData.exercises.reduce((sum, ex) => {
          const sets = Number(ex.sets) || 1;
          const reps = Number(ex.reps) || 1;
          const weight = Number(ex.weight) || 0;
          return sum + (sets * reps * weight);
        }, 0);
      }

      // Check for PR
      const currentPRs = get().getPersonalRecords();
      let isPR = false;
      let prDetails = null;

      if (workoutData.exercises && Array.isArray(workoutData.exercises)) {
        for (const ex of workoutData.exercises) {
          const name = ex.name?.trim();
          const weight = Number(ex.weight) || 0;
          if (name && weight > 0) {
            const prevMax = currentPRs[name] || 0;
            if (weight > prevMax && prevMax > 0) {
              isPR = true;
              prDetails = {
                exercise: name,
                weight: weight,
                prevWeight: prevMax,
                diff: weight - prevMax
              };
              break;
            }
          }
        }
      }

      const newWorkout = {
        date: workoutData.date || getLocalYMD(),
        split: workoutData.split || 'Full Body',
        duration: Number(workoutData.duration) || 45,
        calories: Number(workoutData.calories) || Math.round((Number(workoutData.duration) || 45) * 7.5),
        exercises: workoutData.exercises || [],
        notes: workoutData.notes || '',
        totalVolume,
        isPR,
        prDetails,
        userId: real ? user.uid : 'guest',
        createdAt: new Date().toISOString()
      };

      let savedWorkout = { id: `local_${Date.now()}`, ...newWorkout };

      if (real) {
        const docRef = await addDoc(collection(db, 'gym_workouts'), newWorkout);
        savedWorkout = { id: docRef.id, ...newWorkout };
      }
      
      set((state) => ({ 
        workouts: [savedWorkout, ...state.workouts].sort((a, b) => b.date.localeCompare(a.date)),
        prCelebration: prDetails ? prDetails : state.prCelebration
      }));
      
      return savedWorkout;
    } catch (error) {
      console.error("Error adding workout:", error);
    }
  },

  // Update / Edit Existing Workout Entry
  updateWorkout: async (id, updatedWorkoutData) => {
    try {
      const user = useAuthStore.getState().user;
      const real = isRealUser(user);

      // Re-calculate total volume
      let totalVolume = 0;
      if (updatedWorkoutData.exercises && Array.isArray(updatedWorkoutData.exercises)) {
        totalVolume = updatedWorkoutData.exercises.reduce((sum, ex) => {
          const sets = Number(ex.sets) || 1;
          const reps = Number(ex.reps) || 1;
          const weight = Number(ex.weight) || 0;
          return sum + (sets * reps * weight);
        }, 0);
      }

      const updatedFields = {
        ...updatedWorkoutData,
        duration: Number(updatedWorkoutData.duration) || 45,
        calories: Number(updatedWorkoutData.calories) || Math.round((Number(updatedWorkoutData.duration) || 45) * 7.5),
        totalVolume,
        updatedAt: new Date().toISOString()
      };

      if (real && !id.startsWith('local_') && !id.startsWith('sample_')) {
        await updateDoc(doc(db, 'gym_workouts', id), updatedFields);
      }

      set((state) => ({
        workouts: state.workouts.map(w => w.id === id ? { ...w, ...updatedFields } : w)
          .sort((a, b) => b.date.localeCompare(a.date))
      }));
    } catch (error) {
      console.error("Error updating workout:", error);
    }
  },

  // Delete Workout
  deleteWorkout: async (id) => {
    try {
      const user = useAuthStore.getState().user;
      const real = isRealUser(user);

      if (real && !id.startsWith('local_') && !id.startsWith('sample_')) {
        await deleteDoc(doc(db, 'gym_workouts', id));
      }
      set((state) => ({
        workouts: state.workouts.filter(w => w.id !== id)
      }));
    } catch (error) {
      console.error("Error deleting workout:", error);
    }
  },

  // Body weight tracking
  logBodyWeight: (weight) => {
    const today = getLocalYMD();
    const newLog = { date: today, weight: Number(weight) };
    set((state) => ({
      bodyWeightLogs: [...state.bodyWeightLogs.filter(l => l.date !== today), newLog].sort((a, b) => a.date.localeCompare(b.date))
    }));
  },

  // Live Workout Controls
  startLiveWorkout: (splitName = 'Push') => {
    const defaultExercisesForSplit = {
      'Push': [
        { name: 'Bench Press', weight: 80, sets: 4, reps: 10, notes: '' },
        { name: 'Incline Dumbbell Press', weight: 28, sets: 3, reps: 12, notes: '' },
        { name: 'Overhead Shoulder Press', weight: 50, sets: 3, reps: 10, notes: '' },
        { name: 'Tricep Pushdowns', weight: 30, sets: 4, reps: 12, notes: '' }
      ],
      'Pull': [
        { name: 'Barbell Deadlift', weight: 120, sets: 3, reps: 5, notes: '' },
        { name: 'Lat Pulldown', weight: 65, sets: 4, reps: 10, notes: '' },
        { name: 'Barbell Row', weight: 70, sets: 4, reps: 8, notes: '' },
        { name: 'Hammer Curls', weight: 16, sets: 3, reps: 12, notes: '' }
      ],
      'Legs': [
        { name: 'Barbell Squat', weight: 100, sets: 4, reps: 8, notes: '' },
        { name: 'Romanian Deadlift', weight: 80, sets: 3, reps: 10, notes: '' },
        { name: 'Leg Press', weight: 180, sets: 4, reps: 12, notes: '' },
        { name: 'Calf Raises', weight: 70, sets: 4, reps: 15, notes: '' }
      ]
    };

    const initialExercises = defaultExercisesForSplit[splitName] || [
      { name: 'Bench Press', weight: 80, sets: 4, reps: 10, notes: '' },
      { name: 'Incline Dumbbell Press', weight: 26, sets: 3, reps: 12, notes: '' },
      { name: 'Tricep Extension', weight: 25, sets: 3, reps: 12, notes: '' }
    ];

    set({
      activeWorkout: {
        split: splitName,
        exercises: initialExercises,
        currentExerciseIndex: 0,
        currentSet: 1,
        startTime: Date.now(),
        elapsedSeconds: 0,
        completedSetsCount: 0
      }
    });
  },

  updateLiveWorkout: (updates) => {
    set((state) => ({
      activeWorkout: state.activeWorkout ? { ...state.activeWorkout, ...updates } : null
    }));
  },

  finishLiveWorkout: async () => {
    const state = get();
    if (!state.activeWorkout) return;

    const { split, exercises, startTime } = state.activeWorkout;
    const durationMins = Math.max(1, Math.round((Date.now() - startTime) / 60000));

    const workoutRecord = {
      date: getLocalYMD(),
      split: split || 'Push',
      duration: durationMins,
      calories: Math.round(durationMins * 8),
      exercises: exercises.map(ex => ({
        name: ex.name,
        sets: Number(ex.sets) || 3,
        reps: Number(ex.reps) || 10,
        weight: Number(ex.weight) || 0,
        notes: ex.notes || ''
      })),
      notes: `Live workout completed in ${durationMins} mins`
    };

    set({ activeWorkout: null });
    return await state.addWorkout(workoutRecord);
  },

  cancelLiveWorkout: () => {
    set({ activeWorkout: null });
  },

  clearPRCelebration: () => {
    set({ prCelebration: null });
  },

  // Helper Computations
  getPersonalRecords: () => {
    const workouts = get().workouts;
    const prs = {};
    workouts.forEach(w => {
      if (w.exercises && Array.isArray(w.exercises)) {
        w.exercises.forEach(ex => {
          const name = ex.name?.trim();
          const weight = Number(ex.weight) || 0;
          if (name && weight > 0) {
            if (!prs[name] || weight > prs[name]) {
              prs[name] = weight;
            }
          }
        });
      }
    });
    return prs;
  },

  getWorkoutStreak: () => {
    const workouts = get().workouts;
    if (!workouts || workouts.length === 0) return 0;

    const dates = [...new Set(workouts.map(w => w.date))].sort().reverse();
    const today = getLocalYMD();
    const yesterday = getLocalYMD(new Date(Date.now() - 86400000));

    let streak = 0;
    let checkDate = dates.includes(today) ? today : (dates.includes(yesterday) ? yesterday : null);

    if (!checkDate) return 0;

    let curr = new Date(checkDate);
    while (true) {
      const formatted = getLocalYMD(curr);
      if (dates.includes(formatted)) {
        streak++;
        curr.setDate(curr.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }
}));