import type { Message } from '@/lib/game/types';

/**
 * Helper function to extract UI messages from consolidated log entries
 * Handles both old format (regular messages) and new format (consolidated entries)
 * Extracts uiMessages from consolidated entries (command, validation_error)
 */
export function extractUIMessages(logMessages: any[]): Message[] {
  if (!logMessages || logMessages.length === 0) return [];

  const uiMessages: Message[] = [];

  // Log entry types that use consolidated format with uiMessages arrays
  const CONSOLIDATED_TYPES = ['command', 'validation_error'];

  for (const entry of logMessages) {
    if (CONSOLIDATED_TYPES.includes(entry.type)) {
      // Consolidated format - extract uiMessages array
      if (entry.uiMessages && Array.isArray(entry.uiMessages)) {
        uiMessages.push(...entry.uiMessages);
      }
    } else {
      // Regular message object - add to UI
      uiMessages.push(entry as Message);
    }
  }

  return uiMessages;
}
