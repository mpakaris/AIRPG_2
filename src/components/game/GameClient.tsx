
'use client';

import { useState, useTransition, type FC, useEffect } from 'react';
import { processCommand, logAndSave } from '@/app/actions';
import type { Game, Message, PlayerState } from '@/lib/game/types';
import { SidebarProvider } from '@/components/ui/sidebar';
import { GameSidebar } from './GameSidebar';
import { GameScreen } from './GameScreen';
import { useToast } from '@/hooks/use-toast';
import { getInitialState } from '@/lib/game-state';

interface GameClientProps {
  game: Game;
  initialGameState: PlayerState;
}

// Hardcoded for dev environment
const DEV_USER_ID = "0036308548589";

export const GameClient: FC<GameClientProps> = ({ game, initialGameState }) => {
  const [playerState, setPlayerState] = useState<PlayerState>(initialGameState);
  const [messages, setMessages] = useState<Message[]>(() => {
    const startChapter = game.chapters[initialGameState.currentChapterId];
    const initialMessages: Message[] = [];
  
    const welcomeMessage = {
      id: 'start',
      sender: 'narrator' as const,
      senderName: game.narratorName || 'Narrator',
      type: 'text' as const,
      content: `Welcome to ${game.title}. Your journey begins.`,
      timestamp: Date.now(),
    };
    initialMessages.push(welcomeMessage);
    
    if (startChapter.introductionVideo) {
      initialMessages.push({
        id: 'intro-video',
        sender: 'narrator' as const,
        senderName: game.narratorName || 'Narrator',
        type: 'video' as const,
        content: startChapter.introductionVideo,
        timestamp: Date.now() + 1,
      });
    }
  
    return initialMessages;
  });

  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleCommandSubmit = (command: string) => {
    const isDevCommand = command.startsWith('dev:');

    if (!isDevCommand) {
        const playerMessage: Message = {
            id: crypto.randomUUID(),
            sender: 'player',
            senderName: 'You',
            type: 'text',
            content: command,
            timestamp: Date.now(),
        };
        setMessages(prev => [...prev, playerMessage]);
    }

    startTransition(async () => {
      try {
        const result = await processCommand(playerState, command);
        setPlayerState(result.newState);
        
        const allNewMessages = [...messages, ...result.messages];
        setMessages(allNewMessages);

        // Don't save dev commands to the log
        if (!isDevCommand) {
            await logAndSave(DEV_USER_ID, result.newState, allNewMessages);
        }

      } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to process command.';
        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorMessage,
        });
      }
    });
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className='relative min-h-screen'>
        <GameSidebar game={game} playerState={playerState} onCommandSubmit={handleCommandSubmit} />
        <main className="transition-all duration-300 ease-in-out md:pl-[20rem] group-data-[state=collapsed]/sidebar-wrapper:md:pl-0">
            <GameScreen
            messages={messages}
            onCommandSubmit={handleCommandSubmit}
            isLoading={isPending}
            game={game}
            playerState={playerState}
            />
        </main>
      </div>
    </SidebarProvider>
  );
};
