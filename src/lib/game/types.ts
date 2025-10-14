

// Branded types for stronger type safety
export type GameId = string & { readonly __brand: 'GameId' };
export type ChapterId = string & { readonly __brand: 'ChapterId' };
export type LocationId = string & { readonly __brand: 'LocationId' };
export type GameObjectId = string & { readonly __brand: 'GameObjectId' };
export type ItemId = string & { readonly __brand: 'ItemId' };
export type NpcId = string & { readonly __brand: 'NpcId' };
export type Flag = string & { readonly __brand: 'Flag' };
export type GameType = 'Escape Game' | 'Limited Open World' | 'Open World' | 'Multi Player';

export type ImageDetails = {
    url: string;
    description: string;
    hint: string;
};

export type Message = {
  id: string;
  sender: 'narrator' | 'player' | 'system' | 'agent' | NpcId;
  senderName: string;
  type: 'text' | 'image' | 'video' | 'article' | 'document' | 'audio';
  content: string;
  image?: ImageDetails;
  timestamp: number;
};

// --- Action System ---
export type Action =
  | { type: 'ADD_ITEM'; itemId: ItemId }
  | { type: 'SET_FLAG'; flag: Flag }
  | { type: 'SHOW_MESSAGE'; sender: Message['sender']; senderName?: string; content: string; messageType?: Message['type']; imageId?: ItemId | NpcId | GameObjectId } // item, npc, or game object ID
  | { type: 'END_CONVERSATION' }
  | { type: 'START_INTERACTION'; objectId: GameObjectId, interactionStateId?: string }
  | { type: 'END_INTERACTION' }
  | { type: 'SET_INTERACTION_STATE', state: string };


export type GameObjectState = {
  isLocked?: boolean;
  items?: ItemId[];
  currentInteractionStateId?: string;
};

export type User = {
    id: string; // This can be a phone number or a dev ID
    username: string;
    purchasedGames: GameId[];
    createdAt?: number;
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
};

type InteractionResult = {
    message: string;
    actions?: Action[];
};

export type Item = {
  id: ItemId;
  name: string;
  description: string;
  image?: ImageDetails;
  isTakable?: boolean;
  onTake?: {
      successMessage: string;
      failMessage: string;
      successActions?: Action[];
  }
};

export type GameObjectContent = {
    id: string;
    name: string;
    type: 'video' | 'article';
    url: string;
};

export type ObjectInteractionState = {
    id: string;
    description: string;
    commands: Record<string, Action[]>;
}

export type GameObject = {
  id: GameObjectId;
  name:string;
  description: string; // General description
  items: ItemId[];
  
  onExamine?: {
      default?: InteractionResult;
      locked?: InteractionResult;
      unlocked?: InteractionResult;
  };
  
  isOpenable?: boolean;
  isLocked?: boolean;

  unlocksWith?: ItemId;
  unlocksWithPhrase?: string;
  onUnlock?: {
      successMessage: string;
      failMessage: string;
      actions?: Action[];
  };

  // For handling non-standard verbs like "break", "destroy", "climb", etc.
  onFailure?: {
    default: string; // Generic fallback for any unhandled verb
    [verb: string]: string; // Specific message for a given verb
  };
  
  // For complex, multi-step interactions
  interactionStates?: Record<string, ObjectInteractionState>;
  defaultInteractionStateId?: string;

  // Visuals
  image?: ImageDetails;
  unlockedImage?: ImageDetails;
};

export type CannedResponse = {
    topic: string; // greeting, mystery, etc. No longer a strict type.
    response: string;
    actions?: Action[];
}

export type NPC = {
  id: NpcId;
  name: string;
  description: string;
  welcomeMessage: string;
  goodbyeMessage: string;
  image?: ImageDetails;
  cannedResponses?: CannedResponse[];
  startConversationActions?: Action[];
};

export type Location = {
  id: LocationId;
  name:string;
  description: string;
  gridPosition: { x: number; y: number };
  objects: GameObjectId[];
  npcs: NpcId[];
};

export type ChapterObjective = {
    flag: Flag;
    label: string;
};

export type NextChapterInfo = {
    id: ChapterId;
    title: string;
    transitionCommand: string;
};

export type Chapter = {
  id: ChapterId;
  title: string;
  goal: string;
  objectives?: ChapterObjective[];
  startLocationId: LocationId;
  locations: Record<LocationId, Location>;
  gameObjects: Record<GameObjectId, GameObject>;
  items: Record<ItemId, Item>;
  npcs: Record<NpcId, NPC>;
  introductionVideo?: string;
  postChapterMessage?: string;
  completionVideo?: string;
  nextChapter?: NextChapterInfo;
};

export type Game = {
  id: GameId;
  title: string;
  description: string;
  gameType: GameType;
  chapters: Record<ChapterId, Chapter>;
  startChapterId: ChapterId;
  narratorName?: string;
  promptContext?: string;
};
