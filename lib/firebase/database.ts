// lib/firebase/database.ts
import { database } from './config';
import { ref, get, set, update, increment } from 'firebase/database';
import { User, Guest, Generation } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// === User Functions ===

// Get user data
export const getUserData = async (uid: string): Promise<User | null> => {
  try {
    const userRef = ref(database, `users/${uid}`);
    const snapshot = await get(userRef);
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
    const userRef = ref(database, `users/${uid}`);
    await set(userRef, data);
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
    const userRef = ref(database, `users/${uid}`);
    await update(userRef, data);
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
    const userRef = ref(database, `users/${uid}/freeTrialsUsed`);
    await set(userRef, increment(1));
    return { success: true };
  } catch (error) {
    console.error('Error incrementing trial:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
};

// Reset user trials (for testing or admin)
export const resetUserTrials = async (uid: string) => {
  try {
    const userRef = ref(database, `users/${uid}/freeTrialsUsed`);
    await set(userRef, 0);
    return { success: true };
  } catch (error) {
    console.error('Error resetting trials:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
};

// === Guest Functions ===

// Get guest data by fingerprint
export const getGuestData = async (fingerprint: string): Promise<Guest | null> => {
  try {
    const guestRef = ref(database, `guests/${fingerprint}`);
    const snapshot = await get(guestRef);
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error('Error fetching guest data:', error);
    return null;
  }
};

// Create or update guest
export const setGuestData = async (fingerprint: string, data: Partial<Guest>) => {
  try {
    const guestRef = ref(database, `guests/${fingerprint}`);
    await set(guestRef, data);
    return { success: true };
  } catch (error) {
    console.error('Error setting guest data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
};

// Increment guest trial count
export const incrementGuestTrial = async (fingerprint: string) => {
  try {
    const guestRef = ref(database, `guests/${fingerprint}/freeTrialsUsed`);
    await set(guestRef, increment(1));
    return { success: true };
  } catch (error) {
    console.error('Error incrementing guest trial:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
};

// Reset guest trials (for testing)
export const resetGuestTrials = async (fingerprint: string) => {
  try {
    const guestRef = ref(database, `guests/${fingerprint}/freeTrialsUsed`);
    await set(guestRef, 0);
    return { success: true };
  } catch (error) {
    console.error('Error resetting guest trials:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
};

// === Generation Functions ===

// Save generation history
export const saveGeneration = async (uid: string, data: Omit<Generation, 'id' | 'createdAt'>) => {
  try {
    const generationId = uuidv4();
    const generationRef = ref(database, `generations/${uid}/${generationId}`);
    const generationData: Generation = {
      ...data,
      id: generationId,
      createdAt: Date.now(),
    };
    await set(generationRef, generationData);
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
    const generationsRef = ref(database, `generations/${uid}`);
    const snapshot = await get(generationsRef);
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

// === Analytics (v2) ===

// Update analytics
export const updateAnalytics = async (date: string, data: {
  totalGenerations?: number;
  uniqueUsers?: number;
  premiumGenerations?: number;
  guestGenerations?: number;
  apiKeyGenerations?: number;
}) => {
  try {
    const analyticsRef = ref(database, `analytics/daily/${date}`);
    await update(analyticsRef, data);
    return { success: true };
  } catch (error) {
    console.error('Error updating analytics:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
};

// === Utility Functions ===

// Check if user has trials left
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

// Get remaining trials for user
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