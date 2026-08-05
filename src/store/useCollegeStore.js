import { create } from 'zustand';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore, isRealUser } from './useAuthStore'; 

const getLocalYMD = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const useCollegeStore = create((set, get) => ({
  subjects: [],
  assignments: [],
  exams: [],
  projects: [],
  faculty: [],
  loading: false,

  fetchCollegeData: async () => {
    set({ loading: true });
    try {
      const user = useAuthStore.getState().user;
      if (!isRealUser(user)) {
        set({ loading: false });
        return;
      }

      const fetchCollection = async (colName) => {
        const q = query(collection(db, colName), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      };

      const [subData, assData, exmData, projData, facData] = await Promise.all([
        fetchCollection('college_subjects'),
        fetchCollection('college_assignments'),
        fetchCollection('college_exams'),
        fetchCollection('college_projects'),
        fetchCollection('college_faculty')
      ]);

      set({ 
        subjects: subData, 
        assignments: assData, 
        exams: exmData, 
        projects: projData, 
        faculty: facData, 
        loading: false 
      });
    } catch (error) {
      console.error("Error fetching college data:", error);
      set({ loading: false });
    }
  },

  // --- SUBJECTS CRUD ---
  addSubject: async (subjectData) => {
    try {
      const user = useAuthStore.getState().user;
      const real = isRealUser(user);

      const newSubject = {
        ...subjectData,
        attended: 0,
        total: 0,
        userId: real ? user.uid : 'guest',
        lastLog: null,
        createdAt: new Date().toISOString()
      };

      let saved = { id: `local_${Date.now()}`, ...newSubject };
      if (real) {
        const docRef = await addDoc(collection(db, 'college_subjects'), newSubject);
        saved = { id: docRef.id, ...newSubject };
      }
      set((state) => ({ subjects: [...state.subjects, saved] }));
    } catch (error) {
      console.error("Error adding subject:", error);
    }
  },

  logAttendance: async (id, isPresent, count) => {
    try {
      const subject = get().subjects.find(s => s.id === id);
      if (!subject) return;

      const user = useAuthStore.getState().user;
      const real = isRealUser(user);

      let newAttended = Number(subject.attended || 0);
      let newTotal = Number(subject.total || 0);
      const today = getLocalYMD();

      if (subject.lastLog && subject.lastLog.date === today) {
         if (subject.lastLog.isPresent) newAttended -= subject.lastLog.count;
         newTotal -= subject.lastLog.count;
      }

      if (isPresent) newAttended += count;
      newTotal += count;

      const updatedFields = {
        attended: Math.max(0, newAttended),
        total: Math.max(0, newTotal),
        lastLog: { date: today, isPresent, count }
      };

      if (real && !id.startsWith('local_')) {
        await updateDoc(doc(db, 'college_subjects', id), updatedFields);
      }
      set((state) => ({ subjects: state.subjects.map(s => s.id === id ? { ...s, ...updatedFields } : s) }));
    } catch (error) {
      console.error("Error logging attendance:", error);
    }
  },

  undoAttendance: async (id) => {
    try {
      const subject = get().subjects.find(s => s.id === id);
      if (!subject || !subject.lastLog) return;

      const user = useAuthStore.getState().user;
      const real = isRealUser(user);

      let newAttended = Number(subject.attended || 0);
      let newTotal = Number(subject.total || 0);

      if (subject.lastLog.isPresent) newAttended -= subject.lastLog.count;
      newTotal -= subject.lastLog.count;

      const updatedFields = {
        attended: Math.max(0, newAttended),
        total: Math.max(0, newTotal),
        lastLog: null
      };

      if (real && !id.startsWith('local_')) {
        await updateDoc(doc(db, 'college_subjects', id), updatedFields);
      }
      set((state) => ({ subjects: state.subjects.map(s => s.id === id ? { ...s, ...updatedFields } : s) }));
    } catch (error) {
      console.error("Error undoing attendance:", error);
    }
  },

  deleteSubject: async (id) => {
    try {
      const user = useAuthStore.getState().user;
      const real = isRealUser(user);

      if (real && !id.startsWith('local_')) {
        await deleteDoc(doc(db, 'college_subjects', id));
      }
      set((state) => ({ subjects: state.subjects.filter(s => s.id !== id) }));
    } catch (error) {
      console.error("Error deleting subject:", error);
    }
  },

  // --- ASSIGNMENTS CRUD ---
  addAssignment: async (data) => {
    try {
      const user = useAuthStore.getState().user;
      const real = isRealUser(user);
      
      const newItem = {
        ...data,
        completed: false,
        userId: real ? user.uid : 'guest',
        createdAt: new Date().toISOString()
      };
      
      let saved = { id: `local_${Date.now()}`, ...newItem };
      if (real) {
        const docRef = await addDoc(collection(db, 'college_assignments'), newItem);
        saved = { id: docRef.id, ...newItem };
      }
      set((state) => ({ assignments: [...state.assignments, saved] }));
    } catch (error) {
      console.error("Error adding assignment:", error);
    }
  },

  toggleAssignment: async (id, currentStatus) => {
    try {
      const user = useAuthStore.getState().user;
      const real = isRealUser(user);

      if (real && !id.startsWith('local_')) {
        await updateDoc(doc(db, 'college_assignments', id), { completed: !currentStatus });
      }
      set((state) => ({
        assignments: state.assignments.map(a => a.id === id ? { ...a, completed: !currentStatus } : a)
      }));
    } catch (error) {
      console.error("Error toggling assignment:", error);
    }
  },

  deleteAssignment: async (id) => {
    try {
      const user = useAuthStore.getState().user;
      const real = isRealUser(user);

      if (real && !id.startsWith('local_')) {
        await deleteDoc(doc(db, 'college_assignments', id));
      }
      set((state) => ({ assignments: state.assignments.filter(a => a.id !== id) }));
    } catch (error) {
      console.error("Error deleting assignment:", error);
    }
  },

  // --- EXAMS CRUD ---
  addExam: async (data) => {
    try {
      const user = useAuthStore.getState().user;
      const real = isRealUser(user);
      
      const newItem = {
        ...data,
        userId: real ? user.uid : 'guest',
        createdAt: new Date().toISOString()
      };
      
      let saved = { id: `local_${Date.now()}`, ...newItem };
      if (real) {
        const docRef = await addDoc(collection(db, 'college_exams'), newItem);
        saved = { id: docRef.id, ...newItem };
      }
      set((state) => ({ exams: [...state.exams, saved] }));
    } catch (error) {
      console.error("Error adding exam:", error);
    }
  },

  deleteExam: async (id) => {
    try {
      const user = useAuthStore.getState().user;
      const real = isRealUser(user);

      if (real && !id.startsWith('local_')) {
        await deleteDoc(doc(db, 'college_exams', id));
      }
      set((state) => ({ exams: state.exams.filter(e => e.id !== id) }));
    } catch (error) {
      console.error("Error deleting exam:", error);
    }
  },

  // --- PROJECTS CRUD ---
  addProject: async (data) => {
    try {
      const user = useAuthStore.getState().user;
      const real = isRealUser(user);
      
      const newItem = {
        ...data,
        completed: false,
        userId: real ? user.uid : 'guest',
        createdAt: new Date().toISOString()
      };
      
      let saved = { id: `local_${Date.now()}`, ...newItem };
      if (real) {
        const docRef = await addDoc(collection(db, 'college_projects'), newItem);
        saved = { id: docRef.id, ...newItem };
      }
      set((state) => ({ projects: [...state.projects, saved] }));
    } catch (error) {
      console.error("Error adding project:", error);
    }
  },

  toggleProject: async (id, currentStatus) => {
    try {
      const user = useAuthStore.getState().user;
      const real = isRealUser(user);

      if (real && !id.startsWith('local_')) {
        await updateDoc(doc(db, 'college_projects', id), { completed: !currentStatus });
      }
      set((state) => ({
        projects: state.projects.map(p => p.id === id ? { ...p, completed: !currentStatus } : p)
      }));
    } catch (error) {
      console.error("Error toggling project:", error);
    }
  },

  deleteProject: async (id) => {
    try {
      const user = useAuthStore.getState().user;
      const real = isRealUser(user);

      if (real && !id.startsWith('local_')) {
        await deleteDoc(doc(db, 'college_projects', id));
      }
      set((state) => ({ projects: state.projects.filter(p => p.id !== id) }));
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  },

  // --- FACULTY CRUD ---
  addFaculty: async (data) => {
    try {
      const user = useAuthStore.getState().user;
      const real = isRealUser(user);
      
      const newItem = {
        ...data,
        userId: real ? user.uid : 'guest',
        createdAt: new Date().toISOString()
      };
      
      let saved = { id: `local_${Date.now()}`, ...newItem };
      if (real) {
        const docRef = await addDoc(collection(db, 'college_faculty'), newItem);
        saved = { id: docRef.id, ...newItem };
      }
      set((state) => ({ faculty: [...state.faculty, saved] }));
    } catch (error) {
      console.error("Error adding faculty:", error);
    }
  },

  deleteFaculty: async (id) => {
    try {
      const user = useAuthStore.getState().user;
      const real = isRealUser(user);

      if (real && !id.startsWith('local_')) {
        await deleteDoc(doc(db, 'college_faculty', id));
      }
      set((state) => ({ faculty: state.faculty.filter(f => f.id !== id) }));
    } catch (error) {
      console.error("Error deleting faculty:", error);
    }
  }
}));