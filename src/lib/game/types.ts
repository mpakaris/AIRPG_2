

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

export type TokenUsage = {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
};

export type Message = {
  id: string;
  sender: 'narrator' | 'player' | 'system' | 'agent' | NpcId;
  senderName: string;
  type: 'text' | 'image' | 'video' | 'article' | 'document' | 'audio';
  content: string;
  image?: ImageDetails;
  timestamp: number;
  usage?: TokenUsage;
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

export type Story = {
    chapterId: ChapterId;
    title: string;
    content: string;
    usage: TokenUsage;
};

export type GameObjectState = {
    isLocked: boolean;
    isOpen: boolean;
    isBroken: boolean;
    isPoweredOn: boolean;
    items?: ItemId[];
    currentStateId: string;
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
  stories: Record<ChapterId, Story>;
  activeConversationWith: NpcId | null;
  interactingWithObject: GameObjectId | null;
  conversationCounts: Record<NpcId, number>;
};

// --- Standardized Game Object Schema ---

type Condition = {
  type: 'HAS_ITEM' | 'HAS_FLAG' | 'STATE_MATCH';
  targetId: ItemId | Flag | GameObjectId;
  expectedValue?: any; // For state matching
};

type InteractionResult = {
  message: string;
  actions?: Action[];
  once?: boolean; // If true, this success block can only be triggered once.
};

type Handler = {
  conditions?: Condition[];
  success: InteractionResult;
  fail: { message: string };
};

type ItemHandler = {
  itemId: ItemId;
  conditions?: Condition[];
  success: InteractionResult;
  fail: { message: string };
};

export type GameObject = {
  id: GameObjectId;
  name: string;
  description: string;

  capabilities: {
    openable: boolean;
    lockable: boolean;
    breakable: boolean;
    movable: boolean;
    powerable: boolean;
    container: boolean;
    readable: boolean;
    inputtable: boolean;
  };

  initialState: {
    isOpen: boolean;
    isLocked: boolean;
    isBroken: boolean;
    isPoweredOn: boolean;
    currentStateId: string;
  };

  inventory?: {
    items: ItemId[];
    capacity: number | null;
    allowTags?: string[];
    denyTags?: string[];
  };
  
  links?: {
      type: 'controls' | 'reveals' | 'blocks';
      targetId: GameObjectId | LocationId;
      params?: any;
  }[];

  media: {
    images?: {
      default?: ImageDetails;
      unlocked?: ImageDetails;
      open?: ImageDetails;
      broken?: ImageDetails;
      [key: string]: ImageDetails | undefined; // For stateMap overrides
    };
    sounds?: {
      onOpen?: string;
      onUnlock?: string;
      onBreak?: string;
      [key: string]: string | undefined;
    };
  };

  input?: {
    type: 'code' | 'phrase' | 'pattern' | 'sequence';
    validation: string; // The correct code/phrase, or a regex for patterns
    attempts: number | null;
    lockout: number | null; // Lockout duration in seconds, or for N turns
  };

  handlers: {
    onExamine?: Handler & { alternateMessage?: string };
    onSearch?: Handler;
    onOpen?: Handler;
    onClose?: Handler;
    onUnlock?: Handler;
    onInput?: Handler;
    onUse?: ItemHandler[]; // Can react to multiple items
    onInsert?: ItemHandler[];
    onRemove?: ItemHandler[];
    onMove?: Handler;
    onBreak?: Handler;
    onReset?: Handler;
    onActivate?: Handler;
    onDeactivate?: Handler;
  };

  stateMap?: Record<string, {
    description?: string;
    media?: {
        images?: Record<string, ImageDetails>;
        sounds?: Record<string, string>;
    },
    overrideHandlers?: Partial<GameObject['handlers']>;
  }>;

  fallbackMessages: {
    default: string; // Generic "that doesn't work"
    notOpenable?: string;
    locked?: string;
    notMovable?: string;
    notContainer?: string;
    noEffect?: string; // For 'use' when there's no matching item handler
    [key: string]: string | undefined;
  };

  design: {
    tags?: string[];
    authorNotes?: string;
    i18nKey?: string;
  };

  version: {
    schema: string;
    content: string;
  };
};

export type Item = {
  id: ItemId;
  name: string;
  type: "item";
  description: string;
  alternateDescription?: string;
  i18nKey?: string;
  
  capabilities: {
    isTakable: boolean;
    isReadable: boolean;
    isUsable: boolean;
    isCombinable: boolean;
    isConsumable: boolean;
    isScannable: boolean;
    isAnalyzable: boolean;
    isPhotographable: boolean;
  };
  
  state?: {
    currentStateId: string;
    usesRemaining: number | null;
    stateTags: string[];
  };

  logic?: {
    revealConditions?: Condition[];
    grantsClues?: Flag[];
    affectsFlags?: Flag[];
    intendedUseTargets?: (GameObjectId | string)[]; // Can be object ID or a tag
    blockedByFlags?: Flag[];
  };

  placement?: {
    locationId?: LocationId; // If placed directly in a location
    ownerObjectId?: GameObjectId; // If inside another object
    ownerNpcId?: NpcId; // If given by an NPC
  };

  ui?: {
    group?: string;
    sortOrder?: number;
    hotbar?: boolean;
    iconVariant?: string;
  };

  media?: {
    image?: ImageDetails;
    sounds?: {
      onUse?: string;
      onCombine?: string;
      onRead?: string;
    };
  };

  handlers: {
    onTake?: { success: InteractionResult; fail: { message: string } };
    onUse?: Handler;
    onRead?: Handler;
    onScan?: Handler;
    onAnalyze?: Handler;
    onPhotograph?: Handler;
    onCombine?: ItemHandler[];
    defaultFailMessage?: string;
  };

  stacking?: {
    stackable: boolean;
    maxStack: number | null;
  };

  limits?: {
    usesPerTurn: number | null;
    cooldownTime: number | null; // in seconds
  };
  
  design: {
    tags?: string[];
    authorNotes?: string;
  };

  analytics?: { // Engine-filled
    seen: boolean;
    used: number;
    combined: number;
  };

  version: {
    schema: string;
    content: string;
  };
};


export type CannedResponse = {
    topic: string;
    keywords?: string; // comma-separated
    response: string;
    actions?: Action[];
}

export type NPC = {
  id: NpcId;
  name: string;
  description: string;
  dialogueType: 'scripted' | 'freeform';
  welcomeMessage: string;
  goodbyeMessage: string;
  image?: ImageDetails;
  
  // For 'scripted' NPCs
  cannedResponses?: CannedResponse[];
  startConversationActions?: Action[];
  completionFlag?: Flag; // Flag that indicates the NPC's purpose is complete
  finalResponse?: string; // Message to give after completionFlag is set

  // For 'freeform' NPCs
  persona?: string;
  maxInteractions?: number;
  interactionLimitResponse?: string;
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
  storyGenerationDetails?: string;
};

export type Game = {
  id: GameId;
  title: string;
  description: string;
  setting?: string;
  gameType: GameType;
  chapters: Record<ChapterId, Chapter>;
  startChapterId: ChapterId;
  narratorName?: string;
  promptContext?: string;
  objectInteractionPromptContext?: string;
  storyStyleGuide?: string;
};

