
'use client';

import { useState, useEffect, useCallback } from 'react';
import { findOrCreateUser, resetGame } from '@/app/actions';
import type { PlayerState, Message, User as UserType, Game, GameId } from '@/lib/game/types';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getInitialState } from '@/lib/game-state';
import { game as gameCartridge } from '@/lib/game/cartridge';

const USER_ID_STORAGE_KEY = 'airpg_user_id';

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


export function useUser(initialGameState: PlayerState, initialMessages: Message[]) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [showRegistration, setShowRegistration] = useState(false);
  const [userState, setUserState] = useState<UserState | null>(null);

  const currentEnv = process.env.NEXT_PUBLIC_NODE_ENV || 'production';

  const registerUser = useCallback(async (id: string): Promise<{ success: boolean; message: string }> => {
    // findOrCreateUser now handles saving the initial state to DB
    const { user, error, isNew } = await findOrCreateUser(id);
    if (user) {
      localStorage.setItem(USER_ID_STORAGE_KEY, user.id);
      setUserId(user.id);
      setShowRegistration(false);
      
      // Fetch the newly created state to sync the client
      const freshUserState = await fetchUserData(user.id);
      if (freshUserState) {
          setUserState(freshUserState);
      }
      
      return { success: true, message: 'User registered successfully.' };
    } else {
      return { success: false, message: error || 'An unknown error occurred.' };
    }
  }, []);

  useEffect(() => {
    const identifyUser = async () => {
        if (currentEnv === 'development') {
            const devId = process.env.NEXT_PUBLIC_DEV_USER_ID;
            if (devId) {
                setUserId(devId);
                // In dev, the initial state is pre-loaded on the server, so we can use it.
                setUserState({ playerState: initialGameState, messages: initialMessages });
            } else {
                // Handle case where dev ID is not set
                console.error("NEXT_PUBLIC_DEV_USER_ID is not set in your .env file for development.");
            }
        } else if (currentEnv === 'test') {
            const storedId = localStorage.getItem(USER_ID_STORAGE_KEY);
            if (storedId) {
                const existingUserState = await fetchUserData(storedId);
                if (existingUserState) {
                    setUserId(storedId);
                    setUserState(existingUserState);
                } else {
                    // Stored ID is invalid or DB state is missing, force re-registration
                    localStorage.removeItem(USER_ID_STORAGE_KEY);
                    setShowRegistration(true);
                }
            } else {
                setShowRegistration(true);
            }
        } else {
             // Production environment (or any other)
             setShowRegistration(true);
        }
        setIsUserLoading(false);
    };

    identifyUser();
  }, [currentEnv, initialGameState, initialMessages]);

  return { userId, isUserLoading, showRegistration, registerUser, userState };
}
