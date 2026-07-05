// contexts/AuthContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChange, signOut as firebaseSignOut } from '@/lib/firebase/auth';
import { getUserData, setUserData } from '@/lib/firebase/database';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  isPremium: boolean;
  remainingTrials: number;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [remainingTrials, setRemainingTrials] = useState(5);

  const fetchUserData = useCallback(async (fbUser: FirebaseUser) => {
    try {
      console.log('Fetching user data for:', fbUser.uid);
      let userData = await getUserData(fbUser.uid);
      
      if (!userData) {
        console.log('User not found in DB, creating...');
        // Create new user if doesn't exist
        const newUser: User = {
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || '',
          photoURL: fbUser.photoURL || '',
          createdAt: Date.now(),
          lastLogin: Date.now(),
          isPremium: false,
          freeTrialsUsed: 0,
          maxFreeTrials: 5,
          totalGenerations: 0,
          apiKey: null,
          apiKeyProvider: null,
        };
        
        const result = await setUserData(fbUser.uid, newUser);
        if (!result.success) {
          console.error('Failed to create user:', result.error);
          throw new Error('Failed to create user account');
        }
        
        console.log('User created successfully');
        // Fetch the user data again after creation
        userData = await getUserData(fbUser.uid);
      }
      
      if (userData) {
        console.log('User data loaded:', userData);
        setUser(userData);
        const trials = userData.isPremium ? Infinity : userData.maxFreeTrials - userData.freeTrialsUsed;
        setRemainingTrials(trials);
      } else {
        console.warn('Still no user data after creation attempt');
        setUser(null);
        setRemainingTrials(0);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setUser(null);
      setRemainingTrials(0);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (firebaseUser) {
      await fetchUserData(firebaseUser);
    }
  }, [firebaseUser, fetchUserData]);

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (fbUser) => {
      console.log('Auth state changed:', fbUser?.uid || 'null');
      setFirebaseUser(fbUser);
      
      if (fbUser) {
        await fetchUserData(fbUser);
      } else {
        setUser(null);
        setRemainingTrials(0);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchUserData]);

  const signOut = useCallback(async () => {
    await firebaseSignOut();
    setUser(null);
    setFirebaseUser(null);
    setRemainingTrials(0);
  }, []);

  const value = {
    user,
    firebaseUser,
    loading,
    isPremium: user?.isPremium || false,
    remainingTrials: remainingTrials === Infinity ? Infinity : remainingTrials,
    signOut,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};