
'use client';

import { BookOpen, Box, Compass, ScrollText, Target, User, CheckCircle, Code, RotateCcw, MessageSquareShare, Send, Download, Sparkles } from 'lucide-react';
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
import { sendWhinselfTestMessage, findOrCreateUser, generateStoryForChapter } from '@/app/actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface GameSidebarProps {
  game: Game;
  playerState: PlayerState;
  onCommandSubmit: (command: string) => void;
  onResetGame: () => void;
  setCommandInputValue: (value: string) => void;
  userId: string | null;
  onStateUpdate: (newState: PlayerState) => void;
}

const chapterCompletionFlag = (chapterId: ChapterId) => `chapter_${chapterId}_complete` as Flag;


export const GameSidebar: FC<GameSidebarProps> = ({ game, playerState, onCommandSubmit, onResetGame, setCommandInputValue, userId, onStateUpdate }) => {
  const chapter = game.chapters[game.startChapterId]; // Simplified for now
  const location = game.locations[playerState.currentLocationId];
  const inventoryItems = playerState.inventory.map(id => game.items[id]).filter(Boolean);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [user, setUser] = useState<UserType | null>(null);

  const currentEnv = process.env.NEXT_PUBLIC_NODE_ENV || 'test';
  const isDevEnvironment = currentEnv === 'development';

  const [objectivesVisible, setObjectivesVisible] = useState(isDevEnvironment);
  
  const isChapterComplete = playerState.flags.includes(chapterCompletionFlag(game.startChapterId));
  const hasStory = !!playerState.stories?.[game.startChapterId];


  useEffect(() => {
    if (userId) {
      findOrCreateUser(userId).then(({ user }) => {
        if (user) {
          setUser(user);
        }
      });
    }
  }, [userId]);

  const isObjectiveComplete = (flag: Flag): boolean => {
    return playerState.flags.includes(flag);
  }

  const handleDevCommand = (chapterId: ChapterId) => {
      onCommandSubmit(`dev:complete_${chapterId}`);
  }

  const handleGenerateStory = () => {
    if (!userId) {
      toast({ variant: "destructive", title: "Error", description: "Cannot generate story without a user."});
      return;
    }
    startTransition(async () => {
      try {
        toast({ title: "Crafting Your Story...", description: "The AI is weaving your adventure into a narrative. This may take a moment." });
        const { newState } = await generateStoryForChapter(userId, game.id, game.startChapterId);
        onStateUpdate(newState);
        toast({ title: "Story Complete!", description: "Your personalized story for this chapter has been created." });
      } catch (error) {
        console.error("Generate Story error:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        toast({
          variant: "destructive",
          title: "Story Generation Failed",
          description: errorMessage,
        });
      }
    });
  };


  return (
    <Sidebar>
      <SidebarHeader>
        <h2 className="font-headline text-2xl font-bold text-primary">
          {game.title}
        </h2>
        {user && <p className="text-sm text-muted-foreground">Playing as: {userId}</p>}
      </SidebarHeader>
      <SidebarContent>
        {location && (
            <>
            <SidebarGroup>
                <SidebarGroupLabel className="flex items-center gap-2">
                    <Compass />
                    Location
                </SidebarGroupLabel>
                <p className="px-2 text-sm text-muted-foreground">{location.name}</p>
            </SidebarGroup>

            <SidebarGroup>
                <SidebarGroupLabel className="flex items-center gap-2">
                    <User />
                    NPCs Present
                </SidebarGroupLabel>
                {location.npcs.length > 0 ? (
                    <p className="px-2 text-sm text-muted-foreground">
                        {location.npcs.map(id => game.npcs[id]?.name).filter(Boolean).join(", ")}
                    </p>
                ) : (
                    <p className="px-2 text-sm text-muted-foreground italic">
                        You are alone here.
                    </p>
                )}
            </SidebarGroup>
            </>
        )}
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
                
                {!objectivesVisible && !isDevEnvironment ? (
                  <div className='px-2'>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">Show Objectives</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Excitement often comes from not knowing everything.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => setObjectivesVisible(true)}>
                            Show
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ) : (
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
                )}
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
                            {item.media?.image && (
                                <Image
                                    src={item.media.image.url}
                                    alt={item.media.image.description}
                                    width={24}
                                    height={24}
                                    className="rounded-sm"
                                    data-ai-hint={item.media.image.hint}
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
        
        {isDevEnvironment && (
            <SidebarGroup>
                <SidebarGroupLabel className='flex items-center gap-2'>
                    <Code />
                    Dev Controls
                </SidebarGroupLabel>
                <div className='flex flex-col gap-2 px-2'>
                    <Button variant="destructive" size="sm" onClick={onResetGame}><RotateCcw className='mr-2 h-4 w-4'/>Reset Game</Button>
                    <Button variant="outline" size="sm" onClick={() => onCommandSubmit('look around')}>Look Around</Button>
                    <Button variant="outline" size="sm" onClick={() => onCommandSubmit('examine notebook')}>Examine Notebook</Button>
                    <Button variant="outline" size="sm" onClick={() => onCommandSubmit('password for brown notebook "Justice for Silas Bloom"')}>Unlock Notebook</Button>
                    <Button variant="outline" size="sm" onClick={() => onCommandSubmit('watch video')}>Watch Video</Button>
                    <Button variant="outline" size="sm" onClick={() => onCommandSubmit('read article')}>Read Article</Button>
                    <Button variant="outline" size="sm" onClick={() => onCommandSubmit('talk to barista')}>Talk to Barista</Button>
                    <Button variant="outline" size="sm" onClick={() => onCommandSubmit('ask about man')}>Ask about man</Button>
                    <Button variant="outline" size="sm" onClick={() => onCommandSubmit('ask for name')}>Ask for name</Button>
                    <Button variant="outline" size="sm" onClick={() => handleDevCommand(game.startChapterId)}>Complete Chapter I</Button>
                    <Button variant="outline" disabled>Complete Chapter II</Button>
                </div>
            </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
};
