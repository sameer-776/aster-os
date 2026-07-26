import { create } from 'zustand';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from './useAuthStore';

const ITEMS_STORAGE_KEY = 'victoros_wardrobe_items_backup';
const OUTFITS_STORAGE_KEY = 'victoros_wardrobe_outfits_backup';

const getLocalBackup = (key) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveLocalBackup = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save wardrobe local backup:', err);
  }
};

export const useWardrobeStore = create((set, get) => ({
  items: getLocalBackup(ITEMS_STORAGE_KEY),
  outfits: getLocalBackup(OUTFITS_STORAGE_KEY),
  loading: false,

  fetchWardrobe: async () => {
    set({ loading: true });
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        set({ loading: false });
        return;
      }

      // Fetch Items
      const itemsQ = query(
        collection(db, 'wardrobe_items'),
        where('userId', '==', user.uid)
      );
      const itemsSnapshot = await getDocs(itemsQ);
      const itemsData = itemsSnapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      // Fetch Outfits
      const outfitsQ = query(
        collection(db, 'wardrobe_outfits'),
        where('userId', '==', user.uid)
      );
      const outfitsSnapshot = await getDocs(outfitsQ);
      const outfitsData = outfitsSnapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      set({ items: itemsData, outfits: outfitsData, loading: false });
      saveLocalBackup(ITEMS_STORAGE_KEY, itemsData);
      saveLocalBackup(OUTFITS_STORAGE_KEY, outfitsData);
    } catch (error) {
      console.error('Error fetching wardrobe from Firebase:', error);
      set({ loading: false });
    }
  },

  addItem: async (itemData) => {
    try {
      const user = useAuthStore.getState().user;
      const userId = user ? user.uid : 'guest';

      const newItem = {
        name: itemData.name || 'Unnamed Item',
        type: itemData.type || 'Tops', // Tops, Bottoms, Shoes, Outerwear, Accessories
        season: itemData.season || 'All Seasons', // Spring, Summer, Fall, Winter, All Seasons
        color: itemData.color || '#2563EB',
        imageUrl: itemData.imageUrl || '',
        isFavorite: Boolean(itemData.isFavorite),
        wearCount: Number(itemData.wearCount || 0),
        notes: itemData.notes || '',
        userId: userId,
        createdAt: new Date().toISOString()
      };

      let savedItem = { id: `local_${Date.now()}`, ...newItem };

      if (user) {
        try {
          const docRef = await addDoc(collection(db, 'wardrobe_items'), newItem);
          savedItem = { id: docRef.id, ...newItem };
        } catch (fbErr) {
          console.warn('Firebase addItem failed, storing locally:', fbErr);
        }
      }

      const updated = [savedItem, ...get().items];
      set({ items: updated });
      saveLocalBackup(ITEMS_STORAGE_KEY, updated);
      return savedItem;
    } catch (error) {
      console.error('Error adding wardrobe item:', error);
    }
  },

  updateItem: async (id, updatedFields) => {
    try {
      const updated = get().items.map(item =>
        item.id === id ? { ...item, ...updatedFields } : item
      );
      set({ items: updated });
      saveLocalBackup(ITEMS_STORAGE_KEY, updated);

      if (!id.startsWith('local_')) {
        const itemRef = doc(db, 'wardrobe_items', id);
        await updateDoc(itemRef, updatedFields);
      }
    } catch (error) {
      console.error('Error updating wardrobe item:', error);
    }
  },

  incrementWear: async (id) => {
    const item = get().items.find(i => i.id === id);
    if (!item) return;

    const newWearCount = (item.wearCount || 0) + 1;
    await get().updateItem(id, { wearCount: newWearCount });
  },

  toggleFavorite: async (id) => {
    const item = get().items.find(i => i.id === id);
    if (!item) return;

    await get().updateItem(id, { isFavorite: !item.isFavorite });
  },

  deleteItem: async (id) => {
    try {
      const updated = get().items.filter(item => item.id !== id);
      set({ items: updated });
      saveLocalBackup(ITEMS_STORAGE_KEY, updated);

      if (!id.startsWith('local_')) {
        await deleteDoc(doc(db, 'wardrobe_items', id));
      }
    } catch (error) {
      console.error('Error deleting wardrobe item:', error);
    }
  },

  addOutfit: async (outfitData) => {
    try {
      const user = useAuthStore.getState().user;
      const userId = user ? user.uid : 'guest';

      const newOutfit = {
        name: outfitData.name || 'Unnamed Outfit',
        occasion: outfitData.occasion || 'Casual',
        season: outfitData.season || 'All Seasons',
        topId: outfitData.topId || '',
        bottomId: outfitData.bottomId || '',
        shoesId: outfitData.shoesId || '',
        outerwearId: outfitData.outerwearId || '',
        accessoryId: outfitData.accessoryId || '',
        wearCount: Number(outfitData.wearCount || 0),
        notes: outfitData.notes || '',
        userId: userId,
        createdAt: new Date().toISOString()
      };

      let savedOutfit = { id: `local_outfit_${Date.now()}`, ...newOutfit };

      if (user) {
        try {
          const docRef = await addDoc(collection(db, 'wardrobe_outfits'), newOutfit);
          savedOutfit = { id: docRef.id, ...newOutfit };
        } catch (fbErr) {
          console.warn('Firebase addOutfit failed, storing locally:', fbErr);
        }
      }

      const updated = [savedOutfit, ...get().outfits];
      set({ outfits: updated });
      saveLocalBackup(OUTFITS_STORAGE_KEY, updated);
      return savedOutfit;
    } catch (error) {
      console.error('Error adding outfit:', error);
    }
  },

  wearOutfit: async (outfitId) => {
    const outfit = get().outfits.find(o => o.id === outfitId);
    if (!outfit) return;

    // Increment outfit wear count
    const updatedOutfits = get().outfits.map(o =>
      o.id === outfitId ? { ...o, wearCount: (o.wearCount || 0) + 1 } : o
    );
    set({ outfits: updatedOutfits });
    saveLocalBackup(OUTFITS_STORAGE_KEY, updatedOutfits);

    if (!outfitId.startsWith('local_')) {
      try {
        const outfitRef = doc(db, 'wardrobe_outfits', outfitId);
        await updateDoc(outfitRef, { wearCount: (outfit.wearCount || 0) + 1 });
      } catch (err) {
        console.error('Error updating outfit wear count:', err);
      }
    }

    // Also increment constituent items wear counts!
    const itemIds = [outfit.topId, outfit.bottomId, outfit.shoesId, outfit.outerwearId, outfit.accessoryId].filter(Boolean);
    for (const itemId of itemIds) {
      await get().incrementWear(itemId);
    }
  },

  deleteOutfit: async (id) => {
    try {
      const updated = get().outfits.filter(o => o.id !== id);
      set({ outfits: updated });
      saveLocalBackup(OUTFITS_STORAGE_KEY, updated);

      if (!id.startsWith('local_')) {
        await deleteDoc(doc(db, 'wardrobe_outfits', id));
      }
    } catch (error) {
      console.error('Error deleting outfit:', error);
    }
  }
}));
