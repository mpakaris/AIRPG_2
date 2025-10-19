
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

const USER_ID_STORAGE_KEY = 'textcraft-user-id';

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

  const loadUser = useCallback(async (id: string) => {
    setUserId(id);
    const loadedUserState = await fetchUserData(id);
    if (loadedUserState) {
        setUserState(loadedUserState);
    } else {
        // If data is missing from DB, force a re-registration to re-seed it.
        localStorage.removeItem(USER_ID_STORAGE_KEY);
        setUserId(null);
        setShowRegistration(true);
    }
  }, []);


  const registerUser = useCallback(async (id: string): Promise<{ success: boolean; message: string }> => {
    const { user, error, isNew } = await findOrCreateUser(id);
    if (user) {
      localStorage.setItem(USER_ID_STORAGE_KEY, user.id);
      await loadUser(user.id);
      setShowRegistration(false);
      return { success: true, message: 'User session started.' };
    } else {
      return { success: false, message: error || 'An unknown error occurred.' };
    }
  }, [loadUser]);


  useEffect(() => {
    const identifyUser = async () => {
        if (currentEnv === 'development') {
            const devId = process.env.NEXT_PUBLIC_DEV_USER_ID;
            if (devId) {
                await registerUser(devId); // Use registerUser to ensure dev user exists
            } else {
                console.error("NEXT_PUBLIC_DEV_USER_ID is not set in your .env file for development.");
            }
        } else { // Handles 'test', 'production', and any other case
            const storedUserId = localStorage.getItem(USER_ID_STORAGE_KEY);
            if (storedUserId) {
                await loadUser(storedUserId);
            } else {
                setShowRegistration(true);
            }
        }
        setIsUserLoading(false);
    };

    identifyUser();
  }, [currentEnv, registerUser, loadUser]);

  return { userId, isUserLoading, showRegistration, registerUser, userState };
}
