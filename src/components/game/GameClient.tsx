'use client';

import { useState, useTransition, type FC, useEffect } from 'react';
import { processCommand, logAndSave } from '@/app/actions';
import type { Game, Message, PlayerState } from '@/lib/game/types';
import { SidebarProvider } from '@/components/ui/sidebar';
import { GameSidebar } from './GameSidebar';
import { GameScreen } from './GameScreen';
import { useToast } from '@/hooks/use-toast';
import { getInitialState } from '@/lib/game-state';
import { dispatchMessage } from '@/lib/whinself-service';

interface GameClientProps {
  game: Game;
  initialGameState: PlayerState;
  initialMessages: Message[];
}

// Hardcoded for dev environment
const DEV_USER_ID = "36308548589";

export const GameClient: FC<GameClientProps> = ({ game, initialGameState, initialMessages }) => {
  const [playerState, setPlayerState] = useState<PlayerState>(initialGameState);
  const [commandInputValue, setCommandInputValue] = useState('');
  
  const createInitialMessages = () => {
    // This function creates the very first messages when a new game starts.
    const startChapter = game.chapters[initialGameState.currentChapterId];
    const newInitialMessages: Message[] = [];
  
    const welcomeMessage = {
      id: 'start',
      sender: 'narrator' as const,
      senderName: game.narratorName || 'Narrator',
      type: 'text' as const,
      content: `Welcome to ${game.title}. Your journey begins.`,
      timestamp: Date.now(),
    };
    newInitialMessages.push(welcomeMessage);
    
    if (startChapter.introductionVideo) {
      newInitialMessages.push({
        id: 'intro-video',
        sender: 'narrator' as const,
        senderName: game.narratorName || 'Narrator',
        type: 'video' as const,
        content: startChapter.introductionVideo,
        timestamp: Date.now() + 1,
      });
    }
  
    return newInitialMessages;
  };
  
  // Initialize messages. If initialMessages are provided (e.g. from DB), use them. Otherwise, create fresh ones.
  const [messages, setMessages] = useState<Message[]>(initialMessages.length > 0 ? initialMessages : createInitialMessages());

  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleResetGame = () => {
    startTransition(async () => {
        const freshState = getInitialState(game);
        const freshMessages = createInitialMessages(); // Create the initial welcome messages
        
        // Update the client state immediately
        setPlayerState(freshState);
        setMessages(freshMessages);
        
        // Wipe the database state and logs for the dev user.
        await logAndSave(DEV_USER_ID, game.id, freshState, freshMessages);
        
        // --- Dispatch initial messages to interceptor in dev mode ---
        if (process.env.NODE_ENV === 'development') {
            for (const message of freshMessages) {
                // We don't wait for the promise to resolve to prevent blocking the game loop
                dispatchMessage(DEV_USER_ID, message);
            }
        }

        toast({
          title: "Game Reset",
          description: "The game state and logs have been reset.",
        });
    });
  };

  const handleCommandSubmit = (command: string) => {
    if (!command.trim()) return;
    setCommandInputValue(''); // Clear input after submission

    const isDevCommand = command.startsWith('dev:');
    let allNewMessages = [...messages];

    if (!isDevCommand) {
        const playerMessage: Message = {
            id: crypto.randomUUID(),
            sender: 'player',
            senderName: 'You',
            type: 'text',
            content: command,
            timestamp: Date.now(),
        };
        allNewMessages = [...allNewMessages, playerMessage];
        setMessages(allNewMessages);
    }

    startTransition(async () => {
      try {
        // We use the DEV_USER_ID when submitting commands from the web UI.
        const result = await processCommand(DEV_USER_ID, command);
        
        if (result.newState) {
            setPlayerState(result.newState);
        }

        const finalMessages = [...allNewMessages, ...result.messages];
        setMessages(finalMessages);

        if (result.newState) {
            await logAndSave(DEV_USER_ID, game.id, result.newState, finalMessages);
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
        <GameSidebar 
            game={game} 
            playerState={playerState} 
            onCommandSubmit={handleCommandSubmit}
            onResetGame={handleResetGame}
            setCommandInputValue={setCommandInputValue}
        />
        <main className="transition-all duration-300 ease-in-out md:pl-[20rem] group-data-[state=collapsed]/sidebar-wrapper:md:pl-0">
            <GameScreen
            messages={messages}
            onCommandSubmit={handleCommandSubmit}
            isLoading={isPending}
            game={game}
            playerState={playerState}
            commandInputValue={commandInputValue}
            setCommandInputValue={setCommandInputValue}
            />
        </main>
      </div>
    </SidebarProvider>
  );
};
