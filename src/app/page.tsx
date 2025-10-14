
import { GameClient } from '@/components/game/GameClient';
import { game as gameCartridge } from '@/lib/game/cartridge';
import { getInitialState } from '@/lib/game-state';
import type { PlayerState, Message, ChapterId } from '@/lib/game/types';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

async function getInitialData(userId: string | null): Promise<{ playerState: PlayerState, messages: Message[] }> {
    const initialGameState = getInitialState(gameCartridge);
    
    // In test/prod, we always start with a clean slate on the server.
    // The client will fetch the correct state after authentication.
    if (!userId) {
        return { 
            playerState: initialGameState, 
            messages: createInitialMessages()
        };
    }

    // In development, we pre-load the dev user's state on the server.
    const { firestore } = initializeFirebase();
    const gameId = gameCartridge.id;

    const stateRef = doc(firestore, 'player_states', `${userId}_${gameId}`);
    const logRef = doc(firestore, 'logs', `${userId}_${gameId}`);

    const stateSnap = await getDoc(stateRef);
    const logSnap = await getDoc(logRef);

    let playerState: PlayerState;
    if (stateSnap.exists()) {
        playerState = stateSnap.data() as PlayerState;
    } else {
        playerState = initialGameState;
    }

    if (!gameCartridge.chapters[playerState.currentChapterId]) {
        console.warn(`Invalid chapter ID '${playerState.currentChapterId}' found in state. Resetting.`);
        playerState = initialGameState;
    }

    let messages: Message[] = [];
    if (logSnap.exists()) {
        messages = logSnap.data()?.messages || [];
    } else {
        // If logs don't exist for the dev user, create them.
        messages = createInitialMessages(playerState);
    }

    return { playerState, messages };
}

function createInitialMessages(playerState?: PlayerState): Message[] {
    const game = gameCartridge;
    const state = playerState || getInitialState(game);
    const startChapter = game.chapters[state.currentChapterId];
    const newInitialMessages: Message[] = [];
  
    const welcomeMessage = {
      id: crypto.randomUUID(),
      sender: 'narrator' as const,
      senderName: game.narratorName || 'Narrator',
      type: 'text' as const,
      content: `Welcome to ${game.title}. Your journey begins.`,
      timestamp: Date.now(),
    };
    newInitialMessages.push(welcomeMessage);

    if (startChapter.introductionVideo) {
      newInitialMessages.push({
        id: crypto.randomUUID(),
        sender: 'narrator' as const,
        senderName: game.narratorName || 'Narrator',
        type: 'video' as const,
        content: startChapter.introductionVideo,
        timestamp: Date.now() + 1,
      });
    }
  
    return newInitialMessages;
};


export default async function Home() {
  // In development, we can pre-load the dev user's state on the server.
  // In test/prod, the user ID is determined on the client, so we pass null and let the client handle it.
  const initialUserId = process.env.NEXT_PUBLIC_NODE_ENV === 'development'
      ? process.env.NEXT_PUBLIC_DEV_USER_ID || null
      : null;

  const { playerState, messages } = await getInitialData(initialUserId);

  return <GameClient game={gameCartridge} initialGameState={playerState} initialMessages={messages} />;
}
