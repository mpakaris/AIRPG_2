
'use server';

import { initializeFirebase } from '@/firebase';
import { collection, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore';
import type { User, PlayerState, Message, Game, GameId } from '@/lib/game/types';
import { getAllLogs } from '@/lib/firestore/log-retrieval';

// Now we fetch games from the database.
export async function getGames(): Promise<Game[]> {
    const { firestore } = initializeFirebase();
    const gamesCol = collection(firestore, 'games');
    const gameSnapshot = await getDocs(gamesCol);
    const gameList = gameSnapshot.docs.map(doc => doc.data() as Game);
    return gameList;
}

export async function getUsers(): Promise<User[]> {
    const { firestore } = initializeFirebase();
    const usersCol = collection(firestore, 'users');
    const userSnapshot = await getDocs(usersCol);
    const userList = userSnapshot.docs.map(doc => doc.data() as User);
    return userList;
}

export async function getPlayerState(userId: string, gameId: GameId): Promise<PlayerState | null> {
    const { firestore } = initializeFirebase();
    const stateRef = doc(firestore, 'player_states', `${userId}_${gameId}`);
    const stateSnap = await getDoc(stateRef);
    if (stateSnap.exists()) {
        return stateSnap.data() as PlayerState;
    }
    return null;
}

export async function getPlayerLogs(userId: string, gameId: GameId): Promise<Message[]> {
    const { firestore } = initializeFirebase();
    console.log(`[Admin Action] Getting logs for userId: ${userId}, gameId: ${gameId}`);
    // Use new getAllLogs helper that handles both old and new formats
    const logs = await getAllLogs(firestore, userId, gameId);
    console.log(`[Admin Action] Retrieved ${logs.length} logs`);
    return logs;
}

export async function deleteUser(userId: string, gameIds: GameId[]): Promise<void> {
    const { firestore } = initializeFirebase();

    try {
        const deletePromises: Promise<any>[] = [];

        // Delete user document
        deletePromises.push(deleteDoc(doc(firestore, 'users', userId)));

        // Delete player state and logs for each game they have
        for (const gameId of gameIds) {
            // Delete player state
            deletePromises.push(deleteDoc(doc(firestore, 'player_states', `${userId}_${gameId}`)));

            // Delete log summary document
            deletePromises.push(deleteDoc(doc(firestore, 'logs', `${userId}_${gameId}`)));

            // Delete turns subcollection (all turn documents)
            // Note: Firestore doesn't support recursive deletes, so we need to fetch and delete each turn
            try {
                const turnsCol = collection(firestore, `logs/${userId}_${gameId}/turns`);
                const turnsSnapshot = await getDocs(turnsCol);
                turnsSnapshot.docs.forEach(turnDoc => {
                    deletePromises.push(deleteDoc(turnDoc.ref));
                });
            } catch (error) {
                // If turns subcollection doesn't exist (old format), continue
                console.log(`No turns subcollection found for ${userId}_${gameId} (old format)`);
            }
        }

        await Promise.all(deletePromises);
        console.log(`Successfully deleted all data for user: ${userId}`);

    } catch (error) {
        console.error(`Error deleting user ${userId}:`, error);
        throw new Error(`Failed to delete user data. Please try again.`);
    }
}
