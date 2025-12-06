import type { Message } from '@/lib/game/types';

/**
 * Helper function to extract UI messages from consolidated log entries
 * Handles both old format (regular messages) and new format (consolidated entries)
 * Extracts uiMessages from consolidated entries (command, validation_error, ai_error, db_error)
 */
export function extractUIMessages(logMessages: any[]): Message[] {
  if (!logMessages || logMessages.length === 0) return [];

  const uiMessages: Message[] = [];
  const seenIds = new Set<string>(); // Track message IDs to prevent duplicates

  // Log entry types that use consolidated format with uiMessages arrays
  const CONSOLIDATED_TYPES = ['command', 'validation_error', 'command_invalid', 'ai_error', 'db_error'];

  for (const entry of logMessages) {
    if (CONSOLIDATED_TYPES.includes(entry.type)) {
      // Consolidated format - extract uiMessages array
      if (entry.uiMessages && Array.isArray(entry.uiMessages)) {
        for (const msg of entry.uiMessages) {
          // Generate ID if missing (for backwards compatibility)
          if (!msg.id) {
            msg.id = `${msg.sender}_${msg.timestamp || Date.now()}_${Math.random()}`;
          }
          // Only add if we haven't seen this ID before
          if (!seenIds.has(msg.id)) {
            seenIds.add(msg.id);
            uiMessages.push(msg);
          }
        }
      }
    } else {
      // Regular message object - add to UI (with deduplication)
      const msg = entry as Message;
      // Generate ID if missing (for backwards compatibility)
      if (!msg.id) {
        msg.id = `${msg.sender}_${msg.timestamp || Date.now()}_${Math.random()}`;
      }
      if (!seenIds.has(msg.id)) {
        seenIds.add(msg.id);
        uiMessages.push(msg);
      }
    }
  }

  return uiMessages;
}
