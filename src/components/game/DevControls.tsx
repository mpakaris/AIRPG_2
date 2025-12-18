'use client';

import { useState, useEffect } from 'react';
import { applyDevCheckpoint } from '@/app/actions';
import type { PlayerState, Message } from '@/lib/game/types';

interface DevControlsProps {
  userId: string | null;
  currentGameId: string;
  onStateUpdate: (state: PlayerState, messages: Message[]) => void;
}

export function DevControls({ userId, currentGameId, onStateUpdate }: DevControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDev, setIsDev] = useState(false);

  // Check if we're in development mode (client-side only to avoid hydration mismatch)
  useEffect(() => {
    setIsDev(process.env.NEXT_PUBLIC_NODE_ENV === 'development');
  }, []);

  // Don't render anything until we've checked the environment
  if (!isDev) {
    return null;
  }

  const applyCheckpoint = async (checkpointId: string) => {
    if (!userId) {
      alert('No user ID - cannot apply checkpoint');
      return;
    }

    setIsLoading(true);
    try {
      console.log('[DevControls] Applying checkpoint:', checkpointId);
      const result = await applyDevCheckpoint(userId, checkpointId);
      console.log('[DevControls] Checkpoint result:', {
        messageCount: result.messages.length,
        lastMessage: result.messages[result.messages.length - 1]
      });
      onStateUpdate(result.newState, result.messages);
      console.log('[DevControls] onStateUpdate called');
    } catch (error) {
      console.error('Failed to apply checkpoint:', error);
      alert('Failed to apply checkpoint: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Organize checkpoints by game/chapter
  const allCheckpoints: Record<string, Array<{ id: string; label: string; desc: string }>> = {
    'chapter-1-investigation': [
      { id: 'opened_trashbag', label: 'Dumpster | Opened Trash Bag', desc: 'Inside dumpster, trash bag torn open, coat/pants/shoes visible' },
    ],
    'blood-on-brass': [
      { id: 'metal_box_opened', label: 'Opened Metal Box', desc: 'Metal box unlocked' },
      { id: 'sd_card_watched', label: 'Saw SD Card', desc: 'Watched video from SD card' },
      { id: 'confidential_file_read', label: 'Read Confidential File', desc: 'Read police file from metal box' },
      { id: 'recip_saw_found', label: 'Found Recip Saw', desc: 'Found reciprocating saw in safe' },
      { id: 'hidden_door_found', label: 'Found Hidden Door', desc: 'Unlocked hidden door behind bookshelf' },
      { id: 'hidden_door_opened', label: 'Unlocked Hidden Door', desc: 'Opened hidden door, ready to meet Lili' },
    ]
  };

  // Filter checkpoints for current game only
  const checkpoints = allCheckpoints[currentGameId] || [];

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="relative">
        <button
          className="px-3 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md flex items-center gap-2 shadow-sm"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span>🧪</span>
          Dev Checkpoints
          <span className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {isOpen && (
          <div className="absolute bottom-full mb-2 right-0 w-80 rounded-lg border border-gray-300 bg-white shadow-lg">
            <div className="flex flex-col space-y-1.5 p-4 pb-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <span>🧪</span>
                Dev Checkpoints
              </h3>
              <p className="text-xs text-gray-600">
                Skip to specific parts of the game for testing
              </p>
            </div>
            <div className="p-4 pt-3 space-y-2">
              {checkpoints.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">No checkpoints available for this chapter</p>
              ) : (
                checkpoints.map((checkpoint) => (
                  <button
                    key={checkpoint.id}
                    onClick={() => applyCheckpoint(checkpoint.id)}
                    disabled={isLoading}
                    className="w-full px-3 py-2 text-left border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex flex-col items-start w-full">
                      <span className="font-medium text-xs text-gray-900">{checkpoint.label}</span>
                      <span className="text-[10px] text-gray-500">{checkpoint.desc}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
