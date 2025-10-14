
'use client';

import { useState, useEffect, useCallback } from 'react';
import { findOrCreateUser } from '@/app/actions';
import type { PlayerState, Message } from '@/lib/game/types';

const USER_ID_STORAGE_KEY = 'airpg_user_id';

export function useUser(initialGameState: PlayerState, initialMessages: Message[]) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [showRegistration, setShowRegistration] = useState(false);

  const currentEnv = process.env.NEXT_PUBLIC_NODE_ENV || 'production';

  const registerUser = useCallback(async (id: string) => {
    const { user, error } = await findOrCreateUser(id);
    if (user) {
      localStorage.setItem(USER_ID_STORAGE_KEY, user.id);
      setUserId(user.id);
      setShowRegistration(false);
      // Potentially reload game state for this new user
      window.location.reload(); // Simple way to fetch new state
      return { success: true, message: 'User registered successfully.' };
    } else {
      return { success: false, message: error || 'An unknown error occurred.' };
    }
  }, []);

  useEffect(() => {
    if (currentEnv === 'development') {
      const devId = process.env.NEXT_PUBLIC_DEV_USER_ID || '36308548589';
      setUserId(devId);
      setIsUserLoading(false);
    } else if (currentEnv === 'test') {
      const storedId = localStorage.getItem(USER_ID_STORAGE_KEY);
      if (storedId) {
        // Verify user exists in DB
        findOrCreateUser(storedId).then(({ user, error }) => {
          if (user) {
            setUserId(user.id);
          } else {
            // Stored ID is invalid, clear it and show registration
            localStorage.removeItem(USER_ID_STORAGE_KEY);
            setShowRegistration(true);
          }
          setIsUserLoading(false);
        });
      } else {
        // No stored ID, show registration
        setShowRegistration(true);
        setIsUserLoading(false);
      }
    } else {
      // Production: relies on WhatsApp to provide user ID, so we do nothing here.
      // The user ID will be passed directly to server actions from the API route.
      // For web UI in prod, you'd need a proper auth flow.
      setIsUserLoading(false);
      setShowRegistration(true); // Or show a "play via WhatsApp" message
    }
  }, [currentEnv]);

  return { userId, isUserLoading, showRegistration, registerUser };
}

    