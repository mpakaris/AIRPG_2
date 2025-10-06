
import { GameClient } from '@/components/game/GameClient';
import { game as gameCartridge } from '@/lib/game/cartridge';
import { getInitialState } from '@/lib/game-state';
import type { PlayerState, Message } from '@/lib/game/types';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

// This function now always returns a fresh state for testing, ignoring Firestore on load.
function getInitialData() {
    const playerState = getInitialState(gameCartridge);
    // Always start with an empty message log for a clean slate on reload.
    const messages: Message[] = [];
    return { playerState, messages };
}


export default function Home() {
  const { playerState, messages } = getInitialData();

  return <GameClient game={gameCartridge} initialGameState={playerState} initialMessages={messages} />;
}
