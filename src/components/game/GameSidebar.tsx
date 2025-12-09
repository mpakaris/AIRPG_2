

'use client';

import { Box, Code, RotateCcw } from 'lucide-react';
import { FC, useState, useTransition, useEffect } from 'react';
import type { SerializableGame, PlayerState, Flag, ChapterId, User as UserType } from '@/lib/game/types';
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
import { sendWhinselfTestMessage, findOrCreateUser, generateStoryForChapter, applyDevCheckpoint } from '@/app/actions';
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
  game: SerializableGame;
  playerState: PlayerState;
  onCommandSubmit: (command: string) => void;
  onResetGame: () => void;
  setCommandInputValue: (value: string) => void;
  userId: string | null;
  onStateUpdate: (newState: PlayerState) => void;
}

const chapterCompletionFlag = (chapterId: ChapterId) => `chapter_${chapterId}_complete` as Flag;


export const GameSidebar: FC<GameSidebarProps> = ({ game, playerState, onCommandSubmit, onResetGame, setCommandInputValue, userId, onStateUpdate }) => {
  const { toast } = useToast();
  const [showCheckpoints, setShowCheckpoints] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [user, setUser] = useState<UserType | null>(null);

  const currentEnv = process.env.NEXT_PUBLIC_NODE_ENV || 'test';
  const isDevEnvironment = currentEnv === 'development';

  const [objectivesVisible, setObjectivesVisible] = useState(isDevEnvironment);

  // Safety checks for incomplete state
  const chapter = game.chapters[game.startChapterId];
  const location = playerState?.currentLocationId ? game.locations[playerState.currentLocationId] : null;
  const inventoryItems = (playerState?.inventory || []).map(id => game.items[id]).filter(Boolean);

  // NEW: flags is now Record<string, boolean> instead of array
  const isChapterComplete = !!playerState?.flags?.[chapterCompletionFlag(game.startChapterId)];
  const hasStory = !!playerState?.stories?.[game.startChapterId];


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
    // NEW: flags is now Record<string, boolean> instead of array
    return !!playerState.flags?.[flag];
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
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={onResetGame}
                    >
                      <RotateCcw className='mr-2 h-4 w-4'/>
                      Reset Game
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowCheckpoints(!showCheckpoints)}
                    >
                      <span className='mr-2'>🧪</span>
                      Dev Checkpoints
                    </Button>
                    {showCheckpoints && (
                      <div className='flex flex-col gap-1 mt-2 p-2 border border-gray-300 rounded-md bg-gray-50'>
                        <p className='text-xs text-gray-600 mb-2'>Skip to specific parts of the game:</p>
                        {[
                          { id: 'metal_box_opened', label: 'Opened Metal Box' },
                          { id: 'sd_card_watched', label: 'Saw SD Card' },
                          { id: 'confidential_file_read', label: 'Read Confidential File' },
                          { id: 'recip_saw_found', label: 'Found Recip Saw' },
                          { id: 'hidden_door_found', label: 'Found Hidden Door' },
                          { id: 'hidden_door_opened', label: 'Unlocked Hidden Door' },
                        ].map((checkpoint) => (
                          <Button
                            key={checkpoint.id}
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (!userId) {
                                toast({ title: 'Error', description: 'No user ID', variant: 'destructive' });
                                return;
                              }
                              startTransition(async () => {
                                try {
                                  const result = await applyDevCheckpoint(userId, checkpoint.id);
                                  onStateUpdate(result.newState);
                                  toast({ title: 'Checkpoint Applied', description: checkpoint.label });
                                } catch (error) {
                                  toast({
                                    title: 'Error',
                                    description: error instanceof Error ? error.message : 'Failed to apply checkpoint',
                                    variant: 'destructive'
                                  });
                                }
                              });
                            }}
                            disabled={isPending}
                            className='text-xs justify-start'
                          >
                            {checkpoint.label}
                          </Button>
                        ))}
                      </div>
                    )}
                </div>
            </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
};
