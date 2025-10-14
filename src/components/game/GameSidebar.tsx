
'use client';

import { BookOpen, Box, Compass, ScrollText, Target, User, CheckCircle, Code, RotateCcw, MessageSquareShare, Send, Download } from 'lucide-react';
import { FC, useState, useTransition, useEffect } from 'react';
import type { Game, PlayerState, Flag, ChapterId, User as UserType } from '@/lib/game/types';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { sendWhinselfTestMessage, findOrCreateUser } from '@/app/actions';

interface GameSidebarProps {
  game: Game;
  playerState: PlayerState;
  onCommandSubmit: (command: string) => void;
  onResetGame: () => void;
  setCommandInputValue: (value: string) => void;
  userId: string | null;
}

export const GameSidebar: FC<GameSidebarProps> = ({ game, playerState, onCommandSubmit, onResetGame, setCommandInputValue, userId }) => {
  const chapter = game.chapters[playerState.currentChapterId];
  const location = chapter.locations[playerState.currentLocationId];
  const inventoryItems = playerState.inventory.map(id => chapter.items[id]).filter(Boolean);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [whinselfMessage, setWhinselfMessage] = useState('');
  const [user, setUser] = useState<UserType | null>(null);

  useEffect(() => {
    if (userId) {
      findOrCreateUser(userId).then(({ user }) => {
        if (user) {
          setUser(user);
        }
      });
    }
  }, [userId]);


  const currentEnv = process.env.NEXT_PUBLIC_NODE_ENV;
  const isDevEnvironment = currentEnv === 'development';
  const showDevControls = currentEnv === 'development' || currentEnv === 'test';

  const isObjectiveComplete = (flag: Flag): boolean => {
    return playerState.flags.includes(flag);
  }

  const handleDevCommand = (chapterId: ChapterId) => {
      onCommandSubmit(`dev:complete_${chapterId}`);
  }
  
  const handleSendWhinself = () => {
    if (!userId) {
        toast({ variant: 'destructive', title: 'Error', description: 'User ID not set.' });
        return;
    }
    if (!whinselfMessage.trim()) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Message cannot be empty.',
        });
        return;
    }
    startTransition(async () => {
        try {
            await sendWhinselfTestMessage(userId, whinselfMessage);
            toast({
                title: 'Message Sent',
                description: `Sent "${whinselfMessage}" to ${userId}.`,
            });
            setWhinselfMessage('');
        } catch (error) {
            console.error('Send Whinself message error:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
            toast({
                variant: 'destructive',
                title: 'Send Error',
                description: errorMessage,
            });
        }
    });
  };

    const handleGetLastMessage = async () => {
        toast({
            title: 'Fetching last message...',
            description: 'Calling the interceptor to get the last message.',
        });
        try {
            const interceptorUrl = 'https://carroll-orangy-maladroitly.ngrok-free.dev/last';

            const response = await fetch(interceptorUrl, {
                method: 'GET',
                mode: 'cors',
                headers: {
                    'ngrok-skip-browser-warning': 'true'
                },
                cache: 'no-store'
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Request failed with status ${response.status}. Response: ${errorText}`);
            }
            
            const data = await response.json();
            console.log('Received data:', data);

            // Correctly access the nested text property
            const messageText = data?.payload?.event?.Message?.conversation;

            if (messageText) {
                setCommandInputValue(messageText);
                toast({
                    title: 'Message Loaded!',
                    description: `Input field populated with: "${messageText}"`,
                });
            } else if (data.error === 'No messages') {
                toast({
                    variant: 'destructive',
                    title: 'No Messages Found',
                    description: 'The interceptor has no messages saved.',
                });
            } else {
                throw new Error('Payload received, but it has an unexpected format.');
            }

        } catch (error) {
            console.error('Get Last Message error:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
            toast({
                variant: 'destructive',
                title: 'Fetch Error',
                description: errorMessage,
            });
        }
    };


  const handleFetchWhinself = async () => {
    toast({
        title: 'Fetching message...',
        description: 'Calling the interceptor to get the last message.',
    });
    try {
      const interceptorUrl = 'https://carroll-orangy-maladroitly.ngrok-free.dev/last';

      const response = await fetch(interceptorUrl, {
        method: 'GET',
        mode: 'cors',
        headers: {
            'ngrok-skip-browser-warning': 'true'
        },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Request failed with status ${response.status}. Response: ${errorText}`);
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
          const data = await response.json();
          const playerInput = data?.payload?.event?.Message?.conversation;

          if (playerInput) {
            toast({
              title: 'Message Received!',
              description: `Processing: "${playerInput}"`,
            });
            onCommandSubmit(playerInput);
          } else {
             throw new Error('Payload received, but message content was empty or in the wrong format.');
          }
      } else {
          const errorText = await response.text();
          throw new Error(`Expected JSON response, but received content-type: ${contentType}. Response: ${errorText}`);
      }
      
    } catch (error) {
        console.error('Interceptor fetch error:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        toast({
            variant: 'destructive',
            title: 'Interceptor Error',
            description: errorMessage,
        });
    }
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <h2 className="font-headline text-2xl font-bold text-primary">
          {game.title}
        </h2>
        {user && <p className="text-sm text-muted-foreground">Playing as: {user.username}</p>}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Compass />
            Location
          </SidebarGroupLabel>
          <p className="px-2 text-sm text-muted-foreground">{location.name}</p>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Target />
            Overall Objective
          </SidebarGroupLabel>
          <p className="px-2 text-sm text-muted-foreground">{chapter.goal}</p>
        </SidebarGroup>

        {chapter.objectives && chapter.objectives.length > 0 && (
            <SidebarGroup>
                <SidebarGroupLabel className='flex items-center gap-2'>
                    <ScrollText />
                    Chapter Objectives
                </SidebarGroupLabel>
                <div className='flex flex-col gap-2 px-2 text-sm text-muted-foreground'>
                    {chapter.objectives.map((obj) => (
                        <div key={obj.flag} className='flex items-center gap-2'>
                            <CheckCircle className={cn('h-4 w-4 text-muted', isObjectiveComplete(obj.flag) && 'text-green-500')} />
                            <span className={cn(isObjectiveComplete(obj.flag) && 'line-through')}>
                                {obj.label}
                            </span>
                        </div>
                    ))}
                </div>
            </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Box />
            Inventory
          </SidebarGroupLabel>
          <SidebarMenu>
            {inventoryItems.length > 0 ? (
              inventoryItems.map((item) => {
                return (
                    <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton tooltip={item.description} size="lg" className="h-auto">
                            {item.image && (
                                <Image
                                    src={item.image.url}
                                    alt={item.image.description}
                                    width={24}
                                    height={24}
                                    className="rounded-sm"
                                    data-ai-hint={item.image.hint}
                                />
                            )}
                            <div className="flex flex-col items-start">
                                <span className="font-semibold">{item.name}</span>
                                <span className="text-xs text-muted-foreground">{item.description}</span>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                );
              })
            ) : (
              <p className="px-2 text-sm text-muted-foreground italic">
                Your inventory is empty.
              </p>
            )}
          </SidebarMenu>
        </SidebarGroup>
         <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <User />
            NPCs Present
          </SidebarGroupLabel>
           {location.npcs.length > 0 ? (
            <p className="px-2 text-sm text-muted-foreground">
                {location.npcs.map(id => chapter.npcs[id]?.name).filter(Boolean).join(", ")}
            </p>
           ) : (
            <p className="px-2 text-sm text-muted-foreground italic">
                You are alone here.
            </p>
           )}
        </SidebarGroup>
        {(showDevControls) && (
            <SidebarGroup>
                <SidebarGroupLabel className='flex items-center gap-2'>
                    <Code />
                    Dev Controls
                </SidebarGroupLabel>
                <div className='flex flex-col gap-2 px-2'>
                    <Button variant="destructive" size="sm" onClick={onResetGame}><RotateCcw className='mr-2 h-4 w-4'/>Reset Game</Button>
                    {isDevEnvironment && (
                      <>
                        <Button variant="secondary" size="sm" onClick={handleFetchWhinself}><MessageSquareShare className='mr-2 h-4 w-4'/>Fetch & Submit Msg</Button>
                        <Button variant="outline" size="sm" onClick={() => onCommandSubmit('look around')}>Look Around</Button>
                        <Button variant="outline" size="sm" onClick={() => onCommandSubmit('examine notebook')}>Examine Notebook</Button>
                        <Button variant="outline" size="sm" onClick={() => onCommandSubmit('password for brown notebook "Justice for Silas Bloom"')}>Unlock Notebook</Button>
                        <Button variant="outline" size="sm" onClick={() => onCommandSubmit('watch video')}>Watch Video</Button>
                        <Button variant="outline" size="sm" onClick={() => onCommandSubmit('read article')}>Read Article</Button>
                        <Button variant="outline" size="sm" onClick={() => onCommandSubmit('talk to barista')}>Talk to Barista</Button>
                        <Button variant="outline" size="sm" onClick={() => onCommandSubmit('ask about man')}>Ask about man</Button>
                        <Button variant="outline" size="sm" onClick={() => onCommandSubmit('ask for name')}>Ask for name</Button>
                        <Button variant="outline" size="sm" onClick={() => handleDevCommand(game.startChapterId)}>Complete Chapter I</Button>
                        <Button variant="outline" size="sm" disabled>Complete Chapter II</Button>
                      </>
                    )}
                </div>
            </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
};
