/**
 * Cartridges Index
 *
 * This file exports all game cartridges (chapters).
 * Each cartridge represents a separate chapter with its own game data.
 */

export { game as chapter0 } from './chapter-0';
export { game as chapter1 } from './chapter-1';

// Future chapters - uncomment and create files as needed
// export { game as chapter2 } from './chapter-2';

/**
 * Registry of all available cartridges
 * Add new chapters here as they're created
 */
export const cartridges = {
  'chapter-0': () => import('./chapter-0').then(m => m.game),
  'chapter-1': () => import('./chapter-1').then(m => m.game),
  // 'chapter-2': () => import('./chapter-2').then(m => m.game),
} as const;

export type CartridgeName = keyof typeof cartridges;

/**
 * Dev checkpoint definition
 */
export type DevCheckpoint = {
  id: string;
  label: string;
  description?: string;
};

/**
 * Metadata for each chapter (for UI display)
 */
export const chapterMetadata = {
  'chapter-0': {
    gameId: 'blood-on-brass',
    title: 'Chapter 0: The Metal Box',
    description: 'The case begins at the Midnight Lounge Jazz Club',
    devCheckpoints: [
      { id: 'metal_box_opened', label: 'Opened Metal Box', description: 'Metal box is unlocked and opened' },
      { id: 'sd_card_watched', label: 'Saw SD Card', description: 'Watched video on SD card' },
      { id: 'confidential_file_read', label: 'Read Confidential File', description: 'Read the confidential file' },
      { id: 'recip_saw_found', label: 'Found Recip Saw', description: 'Discovered the reciprocating saw' },
      { id: 'hidden_door_found', label: 'Found Hidden Door', description: 'Found the hidden door' },
      { id: 'hidden_door_opened', label: 'Unlocked Hidden Door', description: 'Unlocked and opened hidden door' },
    ],
  },
  'chapter-1': {
    gameId: 'chapter-1-investigation',
    title: 'Chapter 1: The Investigation',
    description: 'Digging deeper into the cold case',
    devCheckpoints: [
      { id: 'chapter_1_intro_complete', label: 'Intro Complete', description: 'Completed Chapter 1 introduction' },
    ],
  },
} as const;
