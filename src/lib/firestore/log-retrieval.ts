/**
 * Utility functions for retrieving logs from Firestore
 * Handles both legacy (monolithic array) and new (subcollection) formats
 */

import { getDoc, getDocs, collection, query, orderBy, limit as firestoreLimit, doc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { GameId, Message } from '../game/types';

/**
 * Retrieve all logs for a user's game session
 * Handles backward compatibility:
 * - Old format: logs/{userId}_{gameId}.messages[]
 * - New format: logs/{userId}_{gameId}/turns/{turnNumber}
 *
 * @returns Array of messages in chronological order
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
    return logSnap.data()!.messages as Message[];
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

    return allMessages;
  } catch (error) {
    console.error('[Logs] Error loading subcollection:', error);
    return [];
  }
}

/**
 * Retrieve recent N logs (optimized query)
 *
 * @param limit - Number of recent turns to retrieve
 * @returns Array of messages from recent turns
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
    return messages.slice(-limitCount); // Last N messages
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

    return allMessages;
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
