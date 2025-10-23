

import { GameClient } from '@/components/game/GameClient';
import { getInitialState } from '@/lib/game-state';
import type { PlayerState, Message, ChapterId, Game, GameId } from '@/lib/game/types';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getGameData } from './actions';

const GAME_ID = 'blood-on-brass' as GameId;

async function getInitialData(userId: string | null, game: Game): Promise<{ playerState: PlayerState, messages: Message[] }> {
    const initialGameState = getInitialState(game);
    
    // In test/prod, we always start with a clean slate on the server.
    // The client will fetch the correct state after authentication.
    if (!userId) {
        return { 
            playerState: initialGameState, 
            messages: await createInitialMessages(game, initialGameState)
        };
    }

    // In development, we pre-load the dev user's state on the server.
    const { firestore } = initializeFirebase();
    const gameId = game.id;

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

    let messages: Message[] = [];
    if (logSnap.exists() && logSnap.data()?.messages?.length > 0) {
        messages = logSnap.data()?.messages || [];
    } else {
        // If logs don't exist for the dev user, create them.
        messages = await createInitialMessages(game, playerState);
    }

    return { playerState, messages };
}

async function createInitialMessages(game: Game, playerState: PlayerState): Promise<Message[]> {
    const startChapter = game.chapters[game.startChapterId];
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
  
    // Add initial location description
    const initialLocation = game.locations[playerState.currentLocationId];
    if (initialLocation) {
        const locationMessage: Message = {
            id: crypto.randomUUID(),
            sender: 'narrator' as const,
            senderName: game.narratorName || 'Narrator',
            type: initialLocation.sceneImage ? 'image' : 'text',
            content: initialLocation.sceneDescription,
            timestamp: Date.now() + 2,
        };
        if (initialLocation.sceneImage) {
            locationMessage.image = initialLocation.sceneImage;
        }
        newInitialMessages.push(locationMessage);
    }

    return newInitialMessages;
};


export default async function Home() {
  const game = await getGameData(GAME_ID);
  if (!game) {
      return <div>Error: Could not load game data. Please ensure the database is seeded correctly.</div>
  }

  // In development, we can pre-load the dev user's state on the server.
  // In test/prod, the user ID is determined on the client, so we pass null and let the client handle it.
  const initialUserId = process.env.NEXT_PUBLIC_NODE_ENV === 'development'
      ? process.env.NEXT_PUBLIC_DEV_USER_ID || null
      : null;

  const { playerState, messages } = await getInitialData(initialUserId, game);

  return <GameClient game={game} initialGameState={playerState} initialMessages={messages} />;
}
