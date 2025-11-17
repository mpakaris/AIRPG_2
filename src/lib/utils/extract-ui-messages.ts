import type { Message } from '@/lib/game/types';

/**
 * Helper function to extract UI messages from consolidated log entries
 * Handles both old format (regular messages) and new format (consolidated entries)
 */
export function extractUIMessages(logMessages: any[]): Message[] {
  if (!logMessages || logMessages.length === 0) return [];

  const uiMessages: Message[] = [];

  for (const entry of logMessages) {
    if (entry.type === 'command') {
      // New consolidated format - extract uiMessages
      if (entry.uiMessages && Array.isArray(entry.uiMessages)) {
        uiMessages.push(...entry.uiMessages);
      }
    } else {
      // Old format - regular message object
      uiMessages.push(entry as Message);
    }
  }

  return uiMessages;
}
