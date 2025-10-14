
'use client';

import { useState, useEffect, useCallback } from 'react';
import { findOrCreateUser } from '@/app/actions';
import type { PlayerState, Message } from '@/lib/game/types';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { game as gameCartridge } from '@/lib/game/cartridge';

interface UserState {
    playerState: PlayerState;
    messages: Message[];
}

// This function is client-side only.
async function fetchUserData(userId: string): Promise<UserState | null> {
    const { firestore } = initializeFirebase();
    const gameId = gameCartridge.id;

    const stateRef = doc(firestore, 'player_states', `${userId}_${gameId}`);
    const logRef = doc(firestore, 'logs', `${userId}_${gameId}`);

    try {
        const [stateSnap, logSnap] = await Promise.all([getDoc(stateRef), getDoc(logRef)]);

        if (stateSnap.exists() && logSnap.exists()) {
            return {
                playerState: stateSnap.data() as PlayerState,
                messages: logSnap.data()?.messages || []
            };
        }
        return null; // Data not found, implies a new user or inconsistent state
    } catch (error) {
        console.error("Error fetching user data:", error);
        return null;
    }
}

export function useUser() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [showRegistration, setShowRegistration] = useState(false);
  const [userState, setUserState] = useState<UserState | null>(null);

  const currentEnv = process.env.NEXT_PUBLIC_NODE_ENV || 'test';

  const registerUser = useCallback(async (id: string): Promise<{ success: boolean; message: string }> => {
    const { user, error } = await findOrCreateUser(id);
    if (user) {
      // Don't set localStorage anymore, just load the state.
      setUserId(user.id);
      setShowRegistration(false);
      
      const freshUserState = await fetchUserData(user.id);
      if (freshUserState) {
          setUserState(freshUserState);
      }
      
      return { success: true, message: 'User session started.' };
    } else {
      return { success: false, message: error || 'An unknown error occurred.' };
    }
  }, []);

  useEffect(() => {
    const identifyUser = async () => {
        if (currentEnv === 'development') {
            const devId = process.env.NEXT_PUBLIC_DEV_USER_ID;
            if (devId) {
                const devUserState = await fetchUserData(devId);
                if (devUserState) {
                    setUserId(devId);
                    setUserState(devUserState);
                } else {
                    // If dev user doesn't exist in DB, create it.
                    await registerUser(devId);
                }
            } else {
                console.error("NEXT_PUBLIC_DEV_USER_ID is not set in your .env file for development.");
            }
        } else { // Handles 'test', 'production', and any other case
            setShowRegistration(true);
        }
        setIsUserLoading(false);
    };

    identifyUser();
  }, [currentEnv, registerUser]);

  return { userId, isUserLoading, showRegistration, registerUser, userState };
}
