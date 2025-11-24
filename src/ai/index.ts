
// This file is the single entrypoint for all AI-related functions.
// It re-exports functions from the individual flow files.
// This allows us to decouple the Next.js build process from the Genkit flow definitions.

export * from './flows/guide-player-with-narrator';
export * from './flows/select-npc-response';
export * from './flows/generate-story-from-logs';
export * from './flows/generate-npc-chatter';

// Export hybrid command interpreter (supports both local and API LLM)
export {
  interpretPlayerCommandHybrid as interpretPlayerCommand,
  getLLMStatus,
} from './flows/interpret-player-commands-hybrid';

// Re-export types from the original interpret-player-commands
export type {
  InterpretPlayerCommandInput,
  InterpretPlayerCommandOutput
} from './flows/interpret-player-commands';

// Export Hybrid C narrative expansion (zero-cost local LLM for varied responses)
export {
  expandNarration,
  clearNarrationCache,
  getNarrationCacheStats
} from './expand-narration';

export type {
  ExpandNarrationOptions
} from './expand-narration';

// Export NPC dialogue expansion
export {
  expandNPCDialogue,
  clearNPCDialogueCache,
  getNPCDialogueCacheStats
} from './expand-npc-dialogue';

export type {
  ExpandNPCDialogueOptions,
  NPCDialogueResult
} from './expand-npc-dialogue';
