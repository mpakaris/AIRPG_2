
'use server';

import { game as gameCartridge } from '@/lib/game/cartridge';
import type { Game } from '@/lib/game/types';

/**
 * Loads the entire game cartridge data from the source file.
 * In the future, this could be expanded to load multiple cartridges
 * or write changes back to the file.
 */
export async function getGameData(): Promise<Game> {
    // For now, we are just returning the statically imported game object.
    // This server action exists to provide a clear API boundary for the
    // client components and to allow for future enhancements (like writing to files).
    return gameCartridge;
}
