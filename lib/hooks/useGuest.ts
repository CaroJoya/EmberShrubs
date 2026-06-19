// lib/hooks/useGuest.ts
'use client';

import { useState, useEffect, useMemo } from 'react';
import { getGuestData, setGuestData } from '@/lib/firebase/database';
import { Guest } from '@/types';

// Generate a fingerprint from IP + User-Agent
const getFingerprint = (): string => {
  // Only run on client
  if (typeof window === 'undefined') return '';

  const ua = window.navigator.userAgent;
  const screen = `${window.screen.width}x${window.screen.height}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Simple hash function
  const str = `${ua}|${screen}|${timezone}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `guest_${Math.abs(hash)}`;
};

export const useGuest = () => {
  // Use useMemo to compute fingerprint once (no setState in effect!)
  const fingerprint = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return getFingerprint();
  }, []);

  const [guestData, setGuestDataState] = useState<Guest | null>(null);
  const [loading, setLoading] = useState(true);
  const [remainingTrials, setRemainingTrials] = useState(5);

  // Load guest data - this only runs when fingerprint is available
  useEffect(() => {
    if (!fingerprint) return;

    const loadGuestData = async () => {
      try {
        const data = await getGuestData(fingerprint);
        if (data) {
          setGuestDataState(data);
          setRemainingTrials(data.maxFreeTrials - data.freeTrialsUsed);
        } else {
          // Create new guest
          const newGuest: Guest = {
            freeTrialsUsed: 0,
            maxFreeTrials: 5,
            firstVisit: Date.now(),
            lastVisit: Date.now(),
          };
          await setGuestData(fingerprint, newGuest);
          setGuestDataState(newGuest);
          setRemainingTrials(5);
        }
      } catch (error) {
        console.error('Error loading guest data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadGuestData();
  }, [fingerprint]);

  const refreshGuest = async () => {
    if (!fingerprint) return;
    setLoading(true);
    try {
      const data = await getGuestData(fingerprint);
      if (data) {
        setGuestDataState(data);
        setRemainingTrials(data.maxFreeTrials - data.freeTrialsUsed);
      }
    } catch (error) {
      console.error('Error refreshing guest data:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    fingerprint,
    guestData,
    loading,
    remainingTrials,
    refreshGuest,
    maxTrials: 5,
  };
};