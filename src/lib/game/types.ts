import type { ImagePlaceholder } from '@/lib/placeholder-images';

// Branded types for stronger type safety
export type GameId = string & { readonly __brand: 'GameId' };
export type ChapterId = string & { readonly __brand: 'ChapterId' };
export type LocationId = string & { readonly __brand: 'LocationId' };
export type GameObjectId = string & { readonly __brand: 'GameObjectId' };
export type ItemId = string & { readonly __brand: 'ItemId' };
export type NpcId = string & { readonly __brand: 'NpcId' };
export type Flag = string & { readonly __brand: 'Flag' };
export type MediaAssetId = string & { readonly __brand: 'MediaAssetId' };

export type MediaAsset = {
  id: MediaAssetId;
  type: 'audio' | 'image' | 'video';
  url: string;
  description: string;
};

export type Message = {
  id: string;
  sender: 'narrator' | 'player' | 'system' | NpcId;
  senderName: string;
  type: 'text' | 'image';
  content: string;
  image?: ImagePlaceholder;
  timestamp: number;
};

export type PlayerState = {
  currentGameId: GameId;
  currentChapterId: ChapterId;
  currentLocationId: LocationId;
  inventory: ItemId[];
  flags: Flag[];
};

export type Item = {
  id: ItemId;
  name: string;
  description: string;
  image?: ImagePlaceholder['id'];
};

export type GameObject = {
  id: GameObjectId;
  name: string;
  description: string;
  items: ItemId[];
  isOpenable?: boolean;
  isLocked?: boolean;
  unlocksWith?: ItemId;
  unlocksWithPhrase?: string;
};

export type NPC = {
  id: NpcId;
  name: string;
  description: string;
  mainMessage: string;
};

export type Location = {
  id: LocationId;
  name: string;
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
