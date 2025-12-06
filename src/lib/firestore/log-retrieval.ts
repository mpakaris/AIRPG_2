/**
 * Utility functions for retrieving logs from Firestore
 * Handles both legacy (monolithic array) and new (subcollection) formats
 */

import { getDoc, getDocs, collection, query, orderBy, limit as firestoreLimit, doc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { GameId, Message } from '../game/types';

/**
 * Normalizes Firestore Timestamps to plain numbers
 * Firestore returns Timestamp objects with toJSON methods that React can't serialize
 * This function recursively converts them to millisecond timestamps
 */
function normalizeTimestamps(obj: any): any {
    if (obj === null || obj === undefined) {
        return obj;
    }

    // Check if this is a Firestore Timestamp object
    if (obj?.seconds !== undefined && obj?.nanoseconds !== undefined) {
        // Convert to milliseconds
        return obj.seconds * 1000 + Math.floor(obj.nanoseconds / 1000000);
    }

    // Handle Date objects
    if (obj instanceof Date) {
        return obj.getTime();
    }

    // Recursively process arrays
    if (Array.isArray(obj)) {
        return obj.map(item => normalizeTimestamps(item));
    }

    // Recursively process objects
    if (typeof obj === 'object') {
        const normalized: any = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                normalized[key] = normalizeTimestamps(obj[key]);
            }
        }
        return normalized;
    }

    return obj;
}

/**
 * Retrieve all logs for a user's game session
 * Handles backward compatibility:
 * - Old format: logs/{userId}_{gameId}.messages[]
 * - New format: logs/{userId}_{gameId}/turns/{turnNumber}
 *
 * @returns Array of messages in chronological order (with normalized timestamps)
 */
export async function getAllLogs(
  firestore: Firestore,
  userId: string,
  gameId: GameId
): Promise<Message[]> {
  const logRef = doc(firestore, 'logs', `${userId}_${gameId}`);
  const logSnap = await getDoc(logRef);

  // Check if old format exists (monolithic array)
  if (logSnap.exists() && logSnap.data()?.messages) {
    console.log(`📖 [Logs] Loading legacy format for ${userId}`);
    const messages = logSnap.data()!.messages as Message[];
    return normalizeTimestamps(messages);
  }

  // Otherwise, load from new subcollection format
  console.log(`📖 [Logs] Loading subcollection format for ${userId}`);
  try {
    const turnsRef = collection(firestore, `logs/${userId}_${gameId}/turns`);
    const turnsQuery = query(turnsRef, orderBy('timestamp', 'asc'));
    const turnsSnap = await getDocs(turnsQuery);

    // Combine all messages from all turns
    const allMessages: Message[] = [];
    turnsSnap.forEach(turnDoc => {
      const turnData = turnDoc.data();
      if (turnData.messages && Array.isArray(turnData.messages)) {
        allMessages.push(...turnData.messages);
      }
    });

    // Normalize timestamps before returning
    return normalizeTimestamps(allMessages);
  } catch (error) {
    console.error('[Logs] Error loading subcollection:', error);
    return [];
  }
}

/**
 * Retrieve recent N logs (optimized query)
 *
 * @param limit - Number of recent turns to retrieve
 * @returns Array of messages from recent turns (with normalized timestamps)
 */
export async function getRecentLogs(
  firestore: Firestore,
  userId: string,
  gameId: GameId,
  limitCount: number = 50
): Promise<Message[]> {
  const logRef = doc(firestore, 'logs', `${userId}_${gameId}`);
  const logSnap = await getDoc(logRef);

  // Check if old format exists (return all messages, slicing locally)
  if (logSnap.exists() && logSnap.data()?.messages) {
    const messages = logSnap.data()!.messages as Message[];
    return normalizeTimestamps(messages.slice(-limitCount)); // Last N messages
  }

  // Load from subcollection (limit query to recent turns)
  try {
    const turnsRef = collection(firestore, `logs/${userId}_${gameId}/turns`);
    const turnsQuery = query(
      turnsRef,
      orderBy('timestamp', 'desc'),
      firestoreLimit(limitCount)
    );
    const turnsSnap = await getDocs(turnsQuery);

    const allMessages: Message[] = [];
    // Reverse to get chronological order
    turnsSnap.docs.reverse().forEach(turnDoc => {
      const turnData = turnDoc.data();
      if (turnData.messages && Array.isArray(turnData.messages)) {
        allMessages.push(...turnData.messages);
      }
    });

    // Normalize timestamps before returning
    return normalizeTimestamps(allMessages);
  } catch (error) {
    console.error('[Logs] Error loading recent logs:', error);
    return [];
  }
}

/**
 * Check if logs exist and are valid
 */
export async function logsExist(
  firestore: Firestore,
  userId: string,
  gameId: GameId
): Promise<boolean> {
  const logRef = doc(firestore, 'logs', `${userId}_${gameId}`);
  const logSnap = await getDoc(logRef);

  // Check old format
  if (logSnap.exists() && logSnap.data()?.messages?.length > 0) {
    return true;
  }

  // Check new format (at least one turn exists)
  try {
    const turnsRef = collection(firestore, `logs/${userId}_${gameId}/turns`);
    const turnsQuery = query(turnsRef, firestoreLimit(1));
    const turnsSnap = await getDocs(turnsQuery);
    return !turnsSnap.empty;
  } catch (error) {
    return false;
  }
}
