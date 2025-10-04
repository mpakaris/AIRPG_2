import type { ImagePlaceholder } from '@/lib/placeholder-images';

// Branded types for stronger type safety
export type GameId = string & { readonly __brand: 'GameId' };
export type ChapterId = string & { readonly __brand: 'ChapterId' };
export type LocationId = string & { readonly __brand: 'LocationId' };
export type GameObjectId = string & { readonly __brand: 'GameObjectId' };
export type ItemId = string & { readonly __brand: 'ItemId' };
export type NpcId = string & { readonly __brand: 'NpcId' };
export type Flag = string & { readonly __brand: 'Flag' };

export type Message = {
  id: string;
  sender: 'narrator' | 'player' | 'system' | 'agent' | NpcId;
  senderName: string;
  type: 'text' | 'image' | 'video' | 'article';
  content: string;
  image?: ImagePlaceholder;
  timestamp: number;
};

export type GameObjectState = {
  isLocked?: boolean;
  items?: ItemId[];
};

export type PlayerState = {
  currentGameId: GameId;
  currentChapterId: ChapterId;
  currentLocationId: LocationId;
  inventory: ItemId[];
  flags: Flag[];
  objectStates: Record<GameObjectId, GameObjectState>;
  activeConversationWith: NpcId | null;
  interactingWithObject: GameObjectId | null;
  notebookInteractionState: 'start' | 'video_watched' | 'article_read' | 'complete';
  // Chapter 1 Flags
  hasTalkedToBarista: boolean;
  hasReceivedBusinessCard: boolean;
  hasSeenNotebookUrl: boolean;
  hasUnlockedNotebook: boolean;
};

export type Item = {
  id: ItemId;
  name: string;
  description: string;
  image?: ImagePlaceholder['id'];
};

export type GameObjectContent = {
    id: string;
    name: string;
    type: 'video' | 'article';
    url: string;
};

export type GameObject = {
  id: GameObjectId;
  name: string;
  description: string;
  unlockedDescription?: string;
  items: ItemId[];
  content?: GameObjectContent[];
  isOpenable?: boolean;
  isLocked?: boolean;
  unlocksWith?: ItemId;
  unlocksWithPhrase?: string;
  unlocksWithUrl?: string;
};

export type CannedResponse = {
    topic: 'greeting' | 'mystery' | 'saxophonist' | 'clue' | 'insult' | 'default';
    response: string;
}

export type NPC = {
  id: NpcId;
  name: string;
  description: string;
  welcomeMessage: string;
  mainMessage?: string; // Kept for backwards compatibility or other NPCs
  finalMessage?: string; // Kept for backwards compatibility or other NPCs
  goodbyeMessage: string;
  image?: ImagePlaceholder['id'];
  cannedResponses?: CannedResponse[];
};

export type Location = {
  id: LocationId;
  name:string;
  description: string;
  gridPosition: { x: number; y: number };
  objects: GameObjectId[];
  npcs: NpcId[];
};

export type Chapter = {
  id: ChapterId;
  title: string;
  goal: string;
  startLocationId: LocationId;
  locations: Record<LocationId, Location>;
  gameObjects: Record<GameObjectId, GameObject>;
  items: Record<ItemId, Item>;
  npcs: Record<NpcId, NPC>;
};

export type Game = {
  id: GameId;
  title: string;
  description: string;
  chapters: Record<ChapterId, Chapter>;
  startChapterId: ChapterId;
};
