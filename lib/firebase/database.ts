// lib/firebase/database.ts
import { database } from './config';
import { ref, get, set, update, increment } from 'firebase/database';
import { User, Guest, Generation } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Determine if we're on the server or client
const isServer = typeof window === 'undefined';

// ✅ Lazy load admin database only on server
const getAdminDatabase = async () => {
  if (!isServer) return null;
  const { adminDatabase } = await import('./admin');
  return adminDatabase;
};

// === User Functions ===

// Get user data (works on both client and server)
export const getUserData = async (uid: string): Promise<User | null> => {
  try {
    let snapshot;
    
    if (isServer) {
      // ✅ Use Admin SDK on server (bypasses security rules)
      const adminDb = await getAdminDatabase();
      if (!adminDb) {
        throw new Error('Admin database not available');
      }
      const userRef = adminDb.ref(`users/${uid}`);
      snapshot = await userRef.get();
    } else {
      // Use Client SDK in browser
      const userRef = ref(database, `users/${uid}`);
      snapshot = await get(userRef);
    }
    
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
};

// Create or update user
export const setUserData = async (uid: string, data: Partial<User>) => {
  try {
    if (isServer) {
      // ✅ Use Admin SDK on server
      const adminDb = await getAdminDatabase();
      if (!adminDb) {
        throw new Error('Admin database not available');
      }
      const userRef = adminDb.ref(`users/${uid}`);
      await userRef.set(data);
    } else {
      // Use Client SDK in browser
      const userRef = ref(database, `users/${uid}`);
      await set(userRef, data);
    }
    return { success: true };
  } catch (error) {
    console.error('Error setting user data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
};

// Update user fields
export const updateUserData = async (uid: string, data: Partial<User>) => {
  try {
    if (isServer) {
      const adminDb = await getAdminDatabase();
      if (!adminDb) {
        throw new Error('Admin database not available');
      }
      const userRef = adminDb.ref(`users/${uid}`);
      await userRef.update(data);
    } else {
      const userRef = ref(database, `users/${uid}`);
      await update(userRef, data);
    }
    return { success: true };
  } catch (error) {
    console.error('Error updating user data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
};

// Increment user trial count
export const incrementUserTrial = async (uid: string) => {
  try {
    if (isServer) {
      const adminDb = await getAdminDatabase();
      if (!adminDb) {
        throw new Error('Admin database not available');
      }
      const userRef = adminDb.ref(`users/${uid}/freeTrialsUsed`);
      await userRef.transaction((current: number) => (current || 0) + 1);
    } else {
      const userRef = ref(database, `users/${uid}/freeTrialsUsed`);
      await set(userRef, increment(1));
    }
    return { success: true };
  } catch (error) {
    console.error('Error incrementing trial:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
};

// Get remaining trials
export const getRemainingTrials = async (uid: string): Promise<number> => {
  try {
    const userData = await getUserData(uid);
    if (!userData) return 0;
    if (userData.isPremium) return Infinity;
    return userData.maxFreeTrials - userData.freeTrialsUsed;
  } catch (error) {
    console.error('Error getting remaining trials:', error);
    return 0;
  }
};

// Reset user trials
export const resetUserTrials = async (uid: string) => {
  try {
    if (isServer) {
      const adminDb = await getAdminDatabase();
      if (!adminDb) {
        throw new Error('Admin database not available');
      }
      const userRef = adminDb.ref(`users/${uid}/freeTrialsUsed`);
      await userRef.set(0);
    } else {
      const userRef = ref(database, `users/${uid}/freeTrialsUsed`);
      await set(userRef, 0);
    }
    return { success: true };
  } catch (error) {
    console.error('Error resetting trials:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
};

// === Guest Functions ===

export const getGuestData = async (fingerprint: string): Promise<Guest | null> => {
  try {
    let snapshot;
    
    if (isServer) {
      const adminDb = await getAdminDatabase();
      if (!adminDb) {
        throw new Error('Admin database not available');
      }
      const guestRef = adminDb.ref(`guests/${fingerprint}`);
      snapshot = await guestRef.get();
    } else {
      const guestRef = ref(database, `guests/${fingerprint}`);
      snapshot = await get(guestRef);
    }
    
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error('Error fetching guest data:', error);
    return null;
  }
};

export const setGuestData = async (fingerprint: string, data: Partial<Guest>) => {
  try {
    if (isServer) {
      const adminDb = await getAdminDatabase();
      if (!adminDb) {
        throw new Error('Admin database not available');
      }
      const guestRef = adminDb.ref(`guests/${fingerprint}`);
      await guestRef.set(data);
    } else {
      const guestRef = ref(database, `guests/${fingerprint}`);
      await set(guestRef, data);
    }
    return { success: true };
  } catch (error) {
    console.error('Error setting guest data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
};

export const incrementGuestTrial = async (fingerprint: string) => {
  try {
    if (isServer) {
      const adminDb = await getAdminDatabase();
      if (!adminDb) {
        throw new Error('Admin database not available');
      }
      const guestRef = adminDb.ref(`guests/${fingerprint}/freeTrialsUsed`);
      await guestRef.transaction((current: number) => (current || 0) + 1);
    } else {
      const guestRef = ref(database, `guests/${fingerprint}/freeTrialsUsed`);
      await set(guestRef, increment(1));
    }
    return { success: true };
  } catch (error) {
    console.error('Error incrementing guest trial:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
};

// Reset guest trials
export const resetGuestTrials = async (fingerprint: string) => {
  try {
    if (isServer) {
      const adminDb = await getAdminDatabase();
      if (!adminDb) {
        throw new Error('Admin database not available');
      }
      const guestRef = adminDb.ref(`guests/${fingerprint}/freeTrialsUsed`);
      await guestRef.set(0);
    } else {
      const guestRef = ref(database, `guests/${fingerprint}/freeTrialsUsed`);
      await set(guestRef, 0);
    }
    return { success: true };
  } catch (error) {
    console.error('Error resetting guest trials:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
};

// === Generation Functions ===

export const saveGeneration = async (uid: string, data: Omit<Generation, 'id' | 'createdAt'>) => {
  try {
    const generationId = uuidv4();
    const generationData: Generation = {
      ...data,
      id: generationId,
      createdAt: Date.now(),
    };
    
    if (isServer) {
      const adminDb = await getAdminDatabase();
      if (!adminDb) {
        throw new Error('Admin database not available');
      }
      const generationRef = adminDb.ref(`generations/${uid}/${generationId}`);
      await generationRef.set(generationData);
    } else {
      const generationRef = ref(database, `generations/${uid}/${generationId}`);
      await set(generationRef, generationData);
    }
    return { success: true, id: generationId };
  } catch (error) {
    console.error('Error saving generation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
};

// Get user generations
export const getUserGenerations = async (uid: string): Promise<Generation[]> => {
  try {
    let snapshot;
    
    if (isServer) {
      const adminDb = await getAdminDatabase();
      if (!adminDb) {
        throw new Error('Admin database not available');
      }
      const generationsRef = adminDb.ref(`generations/${uid}`);
      snapshot = await generationsRef.get();
    } else {
      const generationsRef = ref(database, `generations/${uid}`);
      snapshot = await get(generationsRef);
    }
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.values(data) as Generation[];
    }
    return [];
  } catch (error) {
    console.error('Error fetching generations:', error);
    return [];
  }
};

// === Analytics Functions ===

export const updateAnalytics = async (date: string, data: {
  totalGenerations?: number;
  uniqueUsers?: number;
  premiumGenerations?: number;
  guestGenerations?: number;
  apiKeyGenerations?: number;
}) => {
  try {
    if (isServer) {
      const adminDb = await getAdminDatabase();
      if (!adminDb) {
        throw new Error('Admin database not available');
      }
      const analyticsRef = adminDb.ref(`analytics/daily/${date}`);
      await analyticsRef.update(data);
    } else {
      const analyticsRef = ref(database, `analytics/daily/${date}`);
      await update(analyticsRef, data);
    }
    return { success: true };
  } catch (error) {
    console.error('Error updating analytics:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
};

// === Utility Functions ===

export const hasTrialsLeft = async (uid: string): Promise<boolean> => {
  try {
    const userData = await getUserData(uid);
    if (!userData) return false;
    if (userData.isPremium) return true;
    return (userData.maxFreeTrials - userData.freeTrialsUsed) > 0;
  } catch (error) {
    console.error('Error checking trials:', error);
    return false;
  }
};