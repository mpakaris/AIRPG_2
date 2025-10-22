
'use server';

import { initializeFirebase } from '@/firebase';
import { collection, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore';
import type { User, PlayerState, Message, Game, GameId } from '@/lib/game/types';

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
    const logRef = doc(firestore, 'logs', `${userId}_${gameId}`);
    const logSnap = await getDoc(logRef);
    if (logSnap.exists()) {
        return logSnap.data()?.messages || [];
    }
    return [];
}

export async function deleteUser(userId: string, gameIds: GameId[]): Promise<void> {
    const { firestore } = initializeFirebase();
    
    try {
        const deletePromises: Promise<any>[] = [];
        
        // Delete user document
        deletePromises.push(deleteDoc(doc(firestore, 'users', userId)));

        // Delete player state and logs for each game they have
        gameIds.forEach(gameId => {
            deletePromises.push(deleteDoc(doc(firestore, 'player_states', `${userId}_${gameId}`)));
            deletePromises.push(deleteDoc(doc(firestore, 'logs', `${userId}_${gameId}`)));
        });

        await Promise.all(deletePromises);
        console.log(`Successfully deleted all data for user: ${userId}`);

    } catch (error) {
        console.error(`Error deleting user ${userId}:`, error);
        throw new Error(`Failed to delete user data. Please try again.`);
    }
}
