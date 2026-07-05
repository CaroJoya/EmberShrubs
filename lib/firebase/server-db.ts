// lib/firebase/server-db.ts
import 'server-only';

import { adminDatabase } from './admin';
import { User, Guest, Generation } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// === Server-only Database Functions ===

// Get user data
export const getUserData = async (uid: string): Promise<User | null> => {
  try {
    const userRef = adminDatabase.ref(`users/${uid}`);
    const snapshot = await userRef.get();
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
    const userRef = adminDatabase.ref(`users/${uid}`);
    await userRef.set(data);
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
    const userRef = adminDatabase.ref(`users/${uid}`);
    await userRef.update(data);
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
    const userRef = adminDatabase.ref(`users/${uid}/freeTrialsUsed`);
    await userRef.transaction((current: number) => (current || 0) + 1);
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
    const userRef = adminDatabase.ref(`users/${uid}/freeTrialsUsed`);
    await userRef.set(0);
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
    const guestRef = adminDatabase.ref(`guests/${fingerprint}`);
    const snapshot = await guestRef.get();
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
    const guestRef = adminDatabase.ref(`guests/${fingerprint}`);
    await guestRef.set(data);
    return { success: true };
  } catch (error) {
    console.error('Error setting guest data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
};

export const incrementGuestTrial = async (fingerprint: string) => {
  try {
    const guestRef = adminDatabase.ref(`guests/${fingerprint}/freeTrialsUsed`);
    await guestRef.transaction((current: number) => (current || 0) + 1);
    return { success: true };
  } catch (error) {
    console.error('Error incrementing guest trial:', error);
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
    
    const generationRef = adminDatabase.ref(`generations/${uid}/${generationId}`);
    await generationRef.set(generationData);
    return { success: true, id: generationId };
  } catch (error) {
    console.error('Error saving generation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
};