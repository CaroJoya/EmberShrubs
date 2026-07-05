// contexts/AuthContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChange, signOut as firebaseSignOut } from '@/lib/firebase/auth';
import { getUserData, setUserData, getRemainingTrials } from '@/lib/firebase/database';
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
    const userData = await getUserData(fbUser.uid);
    if (userData) {
      setUser(userData);
      const trials = userData.isPremium ? Infinity : userData.maxFreeTrials - userData.freeTrialsUsed;
      setRemainingTrials(trials);
    } else {
      // Create new user if doesn't exist
      const newUser: User = {
        uid: fbUser.uid,
        email: fbUser.email || '',
        displayName: fbUser.displayName || undefined,
        photoURL: fbUser.photoURL || undefined,
        createdAt: Date.now(),
        lastLogin: Date.now(),
        isPremium: false,
        premiumSince: undefined,
        premiumExpiry: undefined,
        freeTrialsUsed: 0,
        maxFreeTrials: 5,
        totalGenerations: 0,
      };
      await setUserData(fbUser.uid, newUser);
      setUser(newUser);
      setRemainingTrials(5);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (firebaseUser) {
      await fetchUserData(firebaseUser);
    }
  }, [firebaseUser, fetchUserData]);

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (fbUser) => {
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