import { GameClient } from '@/components/game/GameClient';
import { game as gameCartridge } from '@/lib/game/cartridge';
import { getInitialState } from '@/lib/game-state';
import type { PlayerState, Message, ChapterId } from '@/lib/game/types';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

const DEV_USER_ID = '36308548589';

async function getInitialData(): Promise<{ playerState: PlayerState, messages: Message[] }> {
    const { firestore } = initializeFirebase();
    const gameId = gameCartridge.id;

    const stateRef = doc(firestore, 'player_states', `${DEV_USER_ID}_${gameId}`);
    const logRef = doc(firestore, 'logs', `${DEV_USER_ID}_${gameId}`);

    const stateSnap = await getDoc(stateRef);
    const logSnap = await getDoc(logRef);

    let playerState: PlayerState;
    if (stateSnap.exists()) {
        playerState = stateSnap.data() as PlayerState;
        // Data migration: Correct old chapter ID if it exists in the saved state
        if (playerState.currentChapterId === ('ch1' as ChapterId)) {
            console.log("Migrating old chapter ID 'ch1' to 'ch1-the-cafe'");
            playerState.currentChapterId = 'ch1-the-cafe' as ChapterId;
        }

    } else {
        playerState = getInitialState(gameCartridge);
    }

    // Defensive check: If chapter is still invalid, reset to initial state.
    if (!gameCartridge.chapters[playerState.currentChapterId]) {
        console.warn(`Invalid chapter ID '${playerState.currentChapterId}' found in state. Resetting to initial state.`);
        playerState = getInitialState(gameCartridge);
    }


    let messages: Message[] = [];
    if (logSnap.exists()) {
        messages = logSnap.data()?.messages || [];
    } else {
        // If no logs, create initial messages
        const startChapter = gameCartridge.chapters[playerState.currentChapterId];
        messages.push({
            id: 'start',
            sender: 'narrator',
            senderName: gameCartridge.narratorName || 'Narrator',
            type: 'text',
            content: `Welcome to ${gameCartridge.title}. Your journey begins.`,
            timestamp: Date.now(),
        });
        if (startChapter.introductionVideo) {
            messages.push({
                id: 'intro-video',
                sender: 'narrator',
                senderName: gameCartridge.narratorName || 'Narrator',
                type: 'video',
                content: startChapter.introductionVideo,
                timestamp: Date.now() + 1,
            });
        }
    }


    return { playerState, messages };
}


export default async function Home() {
  const { playerState, messages } = await getInitialData();

  return <GameClient game={gameCartridge} initialGameState={playerState} initialMessages={messages} />;
}
