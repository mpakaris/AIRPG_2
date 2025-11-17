
'use client';

import { useState, useEffect, useCallback } from 'react';
import { findOrCreateUser } from '@/app/actions';
import { extractUIMessages } from '@/lib/utils/extract-ui-messages';
import type { PlayerState, Message, GameId } from '@/lib/game/types';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface UserState {
    playerState: PlayerState;
    messages: Message[];
}

const USER_ID_STORAGE_KEY = 'textcraft-user-id';
const GAME_ID = 'blood-on-brass' as GameId;

// This function is client-side only.
async function fetchUserData(userId: string): Promise<UserState | null> {
    const { firestore } = initializeFirebase();

    const stateRef = doc(firestore, 'player_states', `${userId}_${GAME_ID}`);
    const logRef = doc(firestore, 'logs', `${userId}_${GAME_ID}`);

    try {
        const [stateSnap, logSnap] = await Promise.all([getDoc(stateRef), getDoc(logRef)]);

        if (stateSnap.exists() && logSnap.exists()) {
            // Extract UI messages from consolidated log entries
            const rawMessages = logSnap.data()?.messages || [];
            const uiMessages = extractUIMessages(rawMessages);

            return {
                playerState: stateSnap.data() as PlayerState,
                messages: uiMessages
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
        // If data is missing from DB for a user that should exist,
        // force a re-registration to re-seed their data.
        localStorage.removeItem(USER_ID_STORAGE_KEY);
        setUserId(null);
        setShowRegistration(true);
    }
  }, []);


  const registerUser = useCallback(async (id: string): Promise<{ success: boolean; message: string }> => {
    // `findOrCreateUser` checks the DB. If user exists, it returns it. If not, it creates it.
    const { user, error } = await findOrCreateUser(id);
    
    if (user) {
      // Whether new or existing, we save the ID to local storage for future sessions.
      localStorage.setItem(USER_ID_STORAGE_KEY, user.id);
      // We load the user data from the database, which is the source of truth.
      await loadUser(user.id);
      setShowRegistration(false);
      return { success: true, message: 'User session started.' };
    } else {
      return { success: false, message: error || 'An unknown error occurred.' };
    }
  }, [loadUser]);


  useEffect(() => {
    const identifyUser = async () => {
        setIsUserLoading(true);
        // For non-dev environments, always check local storage first.
        if (currentEnv !== 'development') {
            const storedUserId = localStorage.getItem(USER_ID_STORAGE_KEY);
            if (storedUserId) {
                await loadUser(storedUserId);
                setIsUserLoading(false);
                return;
            }
        }
        
        // For dev environment, or if no user in local storage for prod/test
        if (currentEnv === 'development') {
            const devId = process.env.NEXT_PUBLIC_DEV_USER_ID;
            if (devId) {
                // Use registerUser to ensure the dev user exists and their state is loaded.
                await registerUser(devId);
            } else {
                console.error("NEXT_PUBLIC_DEV_USER_ID is not set in your .env file for development.");
            }
        } else { // Handles 'test', 'production' if local storage was empty
            setShowRegistration(true);
        }
        setIsUserLoading(false);
    };

    identifyUser();
  }, [currentEnv, registerUser, loadUser]);

  return { userId, isUserLoading, showRegistration, registerUser, userState };
}
