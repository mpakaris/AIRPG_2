'use client';

import { BookOpen, Box, Compass, ScrollText, Target, User, CheckCircle, Code } from 'lucide-react';
import type { FC } from 'react';
import type { Game, PlayerState } from '@/lib/game/types';
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
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface GameSidebarProps {
  game: Game;
  playerState: PlayerState;
  onCommandSubmit: (command: string) => void;
}

export const GameSidebar: FC<GameSidebarProps> = ({ game, playerState, onCommandSubmit }) => {
  const chapter = game.chapters[playerState.currentChapterId];
  const location = chapter.locations[playerState.currentLocationId];
  const inventoryItems = playerState.inventory.map(id => chapter.items[id]).filter(Boolean);

  const isObjectiveComplete = (flag: keyof PlayerState | 'notebookInteractionComplete'): boolean => {
    if (flag === 'notebookInteractionComplete') {
        return playerState.notebookInteractionState === 'complete';
    }
    return !!playerState[flag as keyof PlayerState];
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <h2 className="font-headline text-2xl font-bold text-primary">
          {game.title}
        </h2>
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
                const itemImage = PlaceHolderImages.find(p => p.id === item.image);
                return (
                    <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton tooltip={item.description} size="lg" className="h-auto">
                            {itemImage && (
                                <Image 
                                    src={itemImage.imageUrl} 
                                    alt={itemImage.description} 
                                    width={24} 
                                    height={24}
                                    className="rounded-sm"
                                    data-ai-hint={itemImage.imageHint}
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
        <SidebarGroup>
            <SidebarGroupLabel className='flex items-center gap-2'>
                <Code />
                Dev Controls
            </SidebarGroupLabel>
            <div className='flex flex-col gap-2 px-2'>
                <Button variant="outline" size="sm" onClick={() => onCommandSubmit('CH I complete')}>Complete Chapter I</Button>
                <Button variant="outline" size="sm" disabled>Complete Chapter II</Button>
                <Button variant="outline" size="sm" disabled>Complete Chapter III</Button>
                <Button variant="outline" size="sm" disabled>Complete Chapter IV</Button>
                <Button variant="outline" size="sm" disabled>Complete Chapter V</Button>
            </div>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
