
'use server';

import { initializeFirebase } from '@/firebase';
import { collection, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore';
import type { User, PlayerState, Message, Game, GameId } from '@/lib/game/types';
import { game as gameCartridge } from '@/lib/game/cartridge';

// Since we only have one game cartridge for now, we'll return it directly.
// In the future, this could fetch from a 'games' collection.
export async function getGames(): Promise<Game[]> {
    return [gameCartridge];
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

export async function deleteUser(userId: string): Promise<void> {
    const { firestore } = initializeFirebase();
    const gameId = gameCartridge.id;

    const userRef = doc(firestore, 'users', userId);
    const stateRef = doc(firestore, 'player_states', `${userId}_${gameId}`);
    const logRef = doc(firestore, 'logs', `${userId}_${gameId}`);

    try {
        await Promise.all([
            deleteDoc(userRef),
            deleteDoc(stateRef),
            deleteDoc(logRef)
        ]);
        console.log(`Successfully deleted all data for user: ${userId}`);
    } catch (error) {
        console.error(`Error deleting user ${userId}:`, error);
        throw new Error(`Failed to delete user data. Please try again.`);
    }
}
