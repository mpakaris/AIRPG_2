

// Branded types for stronger type safety
export type GameId = string & { readonly __brand: 'GameId' };
export type ChapterId = string & { readonly __brand: 'ChapterId' };
export type LocationId = string & { readonly __brand: 'LocationId' };
export type GameObjectId = string & { readonly __brand: 'GameObjectId' };
export type ItemId = string & { readonly __brand: 'ItemId' };
export type NpcId = string & { readonly __brand: 'NpcId' };
export type Flag = string & { readonly __brand: 'Flag' };
export type GameType = 'Escape Game' | 'Limited Open World' | 'Open World' | 'Multi Player';

// New World-Building Types
export type WorldId = string & { readonly __brand: 'WorldId' };
export type CellId = string & { readonly __brand: 'CellId' };
export type StructureId = string & { readonly __brand: 'StructureId' };
export type PortalId = string & { readonly __brand: 'PortalId' };


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
  | { type: 'SHOW_MESSAGE'; sender: Message['sender']; senderName?: string; content: string; messageType?: Message['type']; imageId?: ItemId | NpcId | GameObjectId }
  | { type: 'END_CONVERSATION' }
  | { type: 'START_INTERACTION'; objectId: GameObjectId, interactionStateId?: string }
  | { type: 'END_INTERACTION' }
  | { type: 'SET_INTERACTION_STATE', state: string }
  | { type: 'MOVE_TO_CELL', toCellId: CellId }
  | { type: 'ENTER_PORTAL', portalId: PortalId }
  | { type: 'TELEPORT_PLAYER', toLocationId: LocationId }
  | { type: 'DEMOTE_NPC', npcId: NpcId };


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

export type PortalState = {
    isLocked: boolean;
    isOpen: boolean;
};

export type NpcState = {
    stage: 'active' | 'completed' | 'demoted';
    importance: 'primary' | 'supporting' | 'ambient';
    trust: number;
    attitude: 'friendly' | 'neutral' | 'hostile' | 'suspicious';
    completedTopics: string[];
    interactionCount: number;
}

export type User = {
    id: string; // This can be a phone number or a dev ID
    username: string;
    purchasedGames: GameId[];
    createdAt?: number;
};

export type PlayerState = {
  currentGameId: GameId;
  currentChapterId: ChapterId;
  currentLocationId: LocationId; // Can be a cell or a location
  inventory: ItemId[];
  flags: Flag[];
  objectStates: Record<GameObjectId, GameObjectState>;
  portalStates: Record<PortalId, PortalState>;
  npcStates: Record<NpcId, NpcState>;
  stories: Record<ChapterId, Story>;
  activeConversationWith: NpcId | null;
  interactingWithObject: GameObjectId | null;
};

// --- Standardized Schemas ---

export type Condition = {
  type: 'HAS_ITEM' | 'HAS_FLAG' | 'STATE_MATCH' | 'NO_FLAG';
  targetId: ItemId | Flag | GameObjectId;
  expectedValue?: any; // For state matching
};

export type InteractionResult = {
  message: string;
  actions?: Action[];
  once?: boolean; // If true, this success block can only be triggered once.
};

export type Handler = {
  conditions?: Condition[];
  success: InteractionResult;
  fail: { message: string };
};

export type ItemHandler = {
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

  state: {
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
    hint?: string; // A generic hint, can be a URL or text
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

  fallbackMessages?: {
    default?: string;
    notOpenable?: string;
    locked?: string;
    notMovable?: string;
    notContainer?: string;
    noEffect?: string;
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
    onTake?: Handler;
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

export type Topic = {
  topicId: string;
  label: string;
  keywords: string[];
  conditions?: {
      requiredFlagsAll?: Flag[];
      forbiddenFlagsAny?: Flag[];
      minTrust?: number;
  };
  once?: boolean;
  response: InteractionResult;
};

export type AskAboutHandler = {
  topicId: string;
  keywords: string[];
  conditions?: Condition[];
  once?: boolean;
  success: InteractionResult;
  fail: { message: string };
};

export type NPC = {
  id: NpcId;
  name: string;
  description: string;
  image?: ImageDetails;

  importance: 'primary' | 'supporting' | 'ambient';
  initialState: {
    stage: 'active' | 'completed' | 'demoted';
    trust: number;
    attitude: 'friendly' | 'neutral' | 'hostile' | 'suspicious';
  };
  
  dialogueType: 'scripted' | 'freeform' | 'tree';
  persona?: string;
  welcomeMessage: string;
  goodbyeMessage: string;
  startConversationActions?: Action[];

  limits?: {
    maxInteractions?: number;
    cooldownSec?: number;
    interactionLimitResponse?: string;
  };

  demoteRules?: {
    onFlagsAll?: Flag[];
    onGiveItemsAny?: ItemId[];
    onTopicCompletedAll?: string[];
    then: {
      setStage: 'demoted';
      setImportance: 'ambient';
      setFlags?: Flag[];
      actions?: Action[];
    };
  };

  postCompletionProfile?: {
    welcomeMessage: string;
    goodbyeMessage: string;
    defaultResponse: string;
    topics?: Topic[];
  };

  handlers?: {
    onStartConversation?: Handler;
    onEndConversation?: Handler;
    onGive?: ItemHandler[];
    onAskAbout?: AskAboutHandler[];
    onAccuse?: Handler;
    onBribe?: Handler;
  };

  topics?: Topic[];

  knowledge?: {
    clueId: string;
    revealsFlag: Flag;
    viaTopicId: string;
    once?: boolean;
  }[];

  fallbacks?: {
    default: string;
    offTopic?: string;
    noMoreHelp?: string;
    rateLimited?: string;
  };

  version: {
    schema: string;
    content: string;
  };
};


// NEW WORLD-BUILDING SCHEMAS

export type Cell = {
    cellId: CellId;
    coord: { x: number; y: number; z: number; };
    type: 'street' | 'alley' | 'rooftop' | 'courtyard' | 'stairwell' | 'interior';
    isPassable: boolean;
    visibility?: { discovered: boolean; fogOfWar: boolean; };
    terrain?: { obstacle?: string; lighting?: string; weather?: string; };
    structureId?: StructureId;
    portalIds?: PortalId[];
    onEnterCell?: Handler;
    onExitCell?: Handler;
};

export type NavEdge = {
    fromCellId: CellId;
    toCellId: CellId;
    direction: 'north' | 'south' | 'east' | 'west' | 'up' | 'down';
    conditions?: Condition[];
    cost?: number;
};

export type World = {
    worldId: WorldId;
    name: string;
    cells: Record<CellId, Cell>;
    navEdges?: NavEdge[];
    fastTravel?: { enabled: boolean; nodes: { cellId: CellId; label: string; conditions?: Condition[]; }[]; };
};

export type Floor = {
    z: number;
    label: string;
    locationIds: LocationId[];
};

export type Structure = {
    structureId: StructureId;
    name: string;
    kind: 'house' | 'cafe' | 'office' | 'warehouse' | 'generic';
    footprint: CellId[];
    floors: Floor[];
    serviceEntrances?: PortalId[];
    securityLevel?: 'low' | 'medium' | 'high';
    onBreach?: Handler;
};

export type Location = {
  locationId: LocationId;
  name:string;
  sceneDescription: string;
  overworldDescription?: string;
  coord?: { x: number; y: number; z: number };
  mapIcon?: string;
  entryPortals?: PortalId[];
  exitPortals?: PortalId[];
  objects: GameObjectId[];
  npcs: NpcId[];
  onEnterLocation?: Handler;
  onExitLocation?: Handler;
};

export type Portal = {
    portalId: PortalId;
    name: string;
    kind: 'door' | 'gate' | 'window' | 'ladder' | 'elevator' | 'hatch';
    tags?: ('front' | 'back' | 'roof' | 'staff-only' | 'quiet')[];
    from: { scope: 'cell' | 'location'; id: CellId | LocationId; };
    to: { scope: 'cell' | 'location'; id: CellId | LocationId; };
    capabilities: { lockable: boolean; climbable: boolean; vertical: boolean; };
    state: { isLocked: boolean; isOpen: boolean; };
    unlockCondition?: { keyItemId?: ItemId; code?: string; phrase?: string; flag?: Flag; };
    stealthProfile?: { noise: 'low' | 'medium' | 'high'; visibility: 'low' | 'medium' | 'high'; risk: 'low' | 'medium' | 'high'; };
    entryEffects?: { setFlags?: Flag[]; affectReputation?: string; branchTag?: string; };
    handlers: {
        onExamine: Handler;
        onUnlock?: Handler;
        onEnter?: Handler;
        onExit?: Handler;
    };
};


export type Chapter = {
  id: ChapterId;
  title: string;
  goal: string;
  objectives?: { flag: Flag, label: string }[];
  startLocationId: LocationId; // Can be a cell or a location
  introductionVideo?: string;
  completionVideo?: string;
  postChapterMessage?: string;
  nextChapter?: { id: ChapterId, title: string, transitionCommand: string };
  storyGenerationDetails?: string;

  // These will be deprecated in favor of the world model
  locations: Record<LocationId, Location>;
  gameObjects: Record<GameObjectId, GameObject>;
  items: Record<ItemId, Item>;
  npcs: Record<NpcId, NPC>;
};


export type Game = {
  id: GameId;
  title: string;
  description: string;
  setting?: string;
  gameType: GameType;
  narratorName?: string;
  promptContext?: string;
  objectInteractionPromptContext?: string;
  storyStyleGuide?: string;
  
  // New World Model
  world: World;
  structures: Record<StructureId, Structure>;
  locations: Record<LocationId, Location>;
  portals: Record<PortalId, Portal>;
  gameObjects: Record<GameObjectId, GameObject>;
  items: Record<ItemId, Item>;
  npcs: Record<NpcId, NPC>;

  // Legacy Chapter model (for gradual migration)
  chapters: Record<ChapterId, Chapter>;
  startChapterId: ChapterId;
};
