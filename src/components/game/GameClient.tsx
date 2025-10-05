
'use client';

import { useState, useTransition, type FC } from 'react';
import { processCommand } from '@/app/actions';
import type { Game, Message, PlayerState } from '@/lib/game/types';
import { SidebarProvider } from '@/components/ui/sidebar';
import { GameSidebar } from './GameSidebar';
import { GameScreen } from './GameScreen';
import { useToast } from '@/hooks/use-toast';

interface GameClientProps {
  game: Game;
  initialGameState: PlayerState;
}

export const GameClient: FC<GameClientProps> = ({ game, initialGameState }) => {
  const [playerState, setPlayerState] = useState<PlayerState>(initialGameState);
  const [messages, setMessages] = useState<Message[]>(() => {
    const startChapter = game.chapters[initialGameState.currentChapterId];
    const initialMessages: Message[] = [
      {
        id: 'start',
        sender: 'narrator',
        senderName: 'Narrator',
        type: 'text',
        content: `Welcome to ${game.title}. Your journey begins.`,
        timestamp: Date.now(),
      },
    ];

    if (startChapter.introductionVideo) {
      initialMessages.push({
        id: 'intro-video',
        sender: 'narrator',
        senderName: 'Narrator',
        type: 'video',
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
        setMessages(prev => [...prev, ...result.messages]);
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to process command.',
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
