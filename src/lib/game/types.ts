
// Branded types for stronger type safety
export type GameId = string & { readonly __brand: 'GameId' };
export type ChapterId = string & { readonly __brand: 'ChapterId' };
export type LocationId = string & { readonly __brand: 'LocationId' };
export type GameObjectId = string & { readonly __brand: 'GameObjectId' };
export type ItemId = string & { readonly __brand: 'ItemId' };
export type NpcId = string & { readonly __brand: 'NpcId' };
export type Flag = string & { readonly __brand: 'Flag' };
export type GameType = 'Escape Game' | 'Limited Open World' | 'Open World' | 'Multi Player';
export type ArchetypeId = string & { readonly __brand: 'ArchetypeId' };

// New World-Building Types
export type WorldId = string & { readonly __brand: 'WorldId' };
export type CellId = string & { readonly __brand: 'CellId' };
export type StructureId = string & { readonly __brand: 'StructureId' };
export type PortalId = string & { readonly __brand: 'PortalId' };

// --- Entity Type Classifications (for Archetypes) ---

export type GameObjectType = 
    | 'Container' | 'Portal' | 'Mechanism' | 'Surface' | 'Furniture' | 'Fixture' 
    | 'Device' | 'Display' | 'Machinery' | 'Prop' | 'Hidden' | 'Signage' 
    | 'LightSource' | 'AudioSource' | 'Appliance' | 'Security' | 'WeaponizedProp'
    | 'Hazard' | 'Anchor' | 'Vehicle' | 'Structure';

export type ItemType =
    | 'Document' | 'Book' | 'Media' | 'Image' | 'Key' | 'Tool' | 'Weapon'
    | 'Consumable' | 'Clothing' | 'Gadget' | 'Evidence' | 'Puzzle' | 'Currency'
    | 'Valuable' | 'Chemical' | 'Component' | 'Personal' | 'Clue' | 'Mystical' | 'Quest';


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

export type CommandResult = {
  newState: PlayerState;
  messages: Message[];
};

// ============================================================================
// NEW ARCHITECTURE: Effect System (Atomic Operations)
// ============================================================================
// All state changes must go through these atomic effects processed by a single reducer

export type Effect =
  // State and flags
  | { type: 'SET_FLAG'; flag: string; value: boolean }
  | { type: 'SET_ENTITY_STATE'; entityId: string; patch: Partial<EntityRuntimeState> }
  | { type: 'SET_STATE_ID'; entityId: string; to: string }
  | { type: 'INC_COUNTER'; key: string; by?: number }

  // Focus system
  | { type: 'SET_FOCUS'; focusId: string; focusType: 'object' | 'item' | 'npc'; transitionMessage?: string }
  | { type: 'CLEAR_FOCUS' }

  // Inventory
  | { type: 'ADD_ITEM'; itemId: string }
  | { type: 'REMOVE_ITEM'; itemId: string }

  // World graph
  | { type: 'REVEAL_ENTITY'; entityId: string }     // shorthand for isVisible:true
  | { type: 'HIDE_ENTITY'; entityId: string }
  | { type: 'LINK_ENABLE'; linkId: string }         // optional for switch/door graphs
  | { type: 'LINK_DISABLE'; linkId: string }

  // Container relationships (NEW)
  | { type: 'SET_PARENT'; entityId: string; parentId: string }
  | { type: 'ADD_TO_CONTAINER'; entityId: string; containerId: string }
  | { type: 'REMOVE_FROM_CONTAINER'; entityId: string; containerId: string }
  | { type: 'REVEAL_FROM_PARENT'; entityId: string; parentId: string }  // Marks revealedBy and parent

  // Movement
  | { type: 'MOVE_TO_LOCATION'; locationId: string }
  | { type: 'TELEPORT'; locationId: string }        // bypass checks
  | { type: 'MOVE_TO_CELL'; cellId: string }
  | { type: 'ENTER_PORTAL'; portalId: string }

  // UI/Media
  | { type: 'SHOW_MESSAGE'; speaker?: 'narrator' | 'agent' | 'system' | string; content: string; imageId?: string; imageUrl?: string; messageType?: Message['type'] }

  // Timers (optional)
  | { type: 'START_TIMER'; timerId: string; ms: number; effect: Effect }
  | { type: 'CANCEL_TIMER'; timerId: string }

  // Conversation/Interaction
  | { type: 'START_CONVERSATION'; npcId: string }
  | { type: 'END_CONVERSATION' }
  | { type: 'START_INTERACTION'; objectId: string }
  | { type: 'END_INTERACTION' }
  | { type: 'DEMOTE_NPC'; npcId: string };


export type Story = {
    chapterId: ChapterId;
    title: string;
    content: string;
    usage: TokenUsage;
};

export type GameObjectState = {
    isLocked?: boolean;
    isOpen?: boolean;
    isBroken?: boolean;
    isPoweredOn?: boolean;
    items?: ItemId[];
    currentStateId?: string;
};

export type ItemState = {
    readCount: number;
    currentStateId: string;
}

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

export type LocationState = {
    objects: GameObjectId[];
}

export type User = {
    id: string; // This can be a phone number or a dev ID
    username: string;
    purchasedGames: GameId[];
    createdAt?: number;
};

// ============================================================================
// NEW ARCHITECTURE: EntityRuntimeState
// ============================================================================
// Unified runtime state for all entities (objects, items, NPCs, portals)

export type EntityRuntimeState = {
  // Universal properties
  isVisible?: boolean;
  discovered?: boolean;
  currentStateId?: string;
  stateTags?: string[];

  // Parent-child relationship tracking (NEW)
  parentId?: string;  // Entity that contains this entity
  revealedBy?: string;  // Entity whose action revealed this entity
  containedEntities?: string[];  // Direct children (items or objects inside)
  isAccessible?: boolean;  // Can player interact with this entity and its children?
  accessibilityReason?: 'parent_closed' | 'parent_locked' | 'parent_not_moved' | 'parent_not_broken' | 'not_visible';

  // Object-specific
  isOpen?: boolean;
  isLocked?: boolean;
  isBroken?: boolean;
  isMoved?: boolean;
  isPoweredOn?: boolean;

  // Item-specific
  taken?: boolean;
  readCount?: number;

  // NPC-specific
  stage?: 'active' | 'completed' | 'demoted';
  importance?: 'primary' | 'supporting' | 'ambient';
  trust?: number;
  attitude?: 'friendly' | 'neutral' | 'hostile' | 'suspicious';
  completedTopics?: string[];
  interactionCount?: number;

  // Container/inventory (LEGACY - use containedEntities instead)
  items?: string[];

  // Analytics/counters
  usedCount?: number;
  examinedCount?: number;
};

// ============================================================================
// NEW ARCHITECTURE: PlayerState with unified world state
// ============================================================================

export type PlayerState = {
  currentGameId: GameId;
  currentChapterId: ChapterId;
  currentLocationId: LocationId; // Can be a cell or a location
  inventory: ItemId[];

  // Focus System: Track what the player is currently interacting with ("standing at")
  currentFocusId?: string; // ID of the focused object/item/NPC
  previousFocusId?: string; // Previous focus for transition messages
  focusType?: 'object' | 'item' | 'npc'; // Type of focused entity

  // NEW: Flags as Record<string, boolean> for better performance
  flags: Record<string, boolean>;

  // NEW: Unified world state - authoritative runtime state for every entity
  world: Record<string, EntityRuntimeState>;

  // Optional analytics
  counters?: Record<string, number>;

  // Legacy state structures (for backward compatibility during migration)
  objectStates?: Record<GameObjectId, GameObjectState>;
  locationStates?: Record<LocationId, LocationState>;
  itemStates?: Record<ItemId, Partial<ItemState>>;
  portalStates?: Record<PortalId, PortalState>;
  npcStates?: Record<NpcId, NpcState>;

  stories: Record<ChapterId, Story>;
  activeConversationWith: NpcId | null;
  interactingWithObject: GameObjectId | null;
};

// ============================================================================
// NEW ARCHITECTURE: Condition System
// ============================================================================

export type Condition =
  | { type: 'FLAG'; flag: string; value: boolean }
  | { type: 'STATE'; entityId: string; key: string; equals: any }
  | { type: 'HAS_ITEM'; itemId?: string; tag?: string }
  | { type: 'LOCATION_IS'; locationId: string }
  | { type: 'CHAPTER_IS'; chapterId: string }
  | { type: 'RANDOM_CHANCE'; p: number }
  // Legacy support
  | { type: 'HAS_FLAG'; flag: string }
  | { type: 'NO_FLAG'; flag: string }
  | { type: 'STATE_MATCH'; entityId: string; key: string; expectedValue: any };

// ============================================================================
// NEW ARCHITECTURE: DSL Handler System
// ============================================================================

export type MediaSet = {
  imageKey?: string;
  soundKey?: string;
  videoUrl?: string;
};

export type Outcome = {
  message?: string;
  speaker?: 'narrator' | 'agent' | 'system';
  media?: MediaSet;
  effects?: Effect[];
};

export type Rule = {
  conditions?: Condition[];
  success?: Outcome;
  fail?: Outcome;
  fallback?: string; // optional short message if neither applies
};

export type OnUseWith = {
  itemId?: string;
  itemTag?: string;
  conditions?: Condition[];
  success?: Outcome;
  fail?: Outcome;
};

/**
 * Handler Taxonomy - See HANDLER_TAXONOMY.md for full documentation
 *
 * CORE HANDLERS (Use these):
 * - onExamine: Visual inspection (outer appearance)
 * - onOpen: Open lids/drawers/covers
 * - onMove: Push/slide aside (reveals what's behind)
 * - onRead: Read text content
 * - onUse: Use item on object (via OnUseWith array)
 * - onTake: Pick up item
 * - onTalk: Start conversation with NPC
 * - onUnlock: Validate password/code
 *
 * DEPRECATED (Don't use):
 * - onBreak → Use onUse instead
 * - onRemove → Use onMove instead
 * - onSearch → Use onExamine instead
 */
export type Handlers = {
  // Core handlers
  onExamine?: Rule;
  onMove?: Rule;
  onOpen?: Rule;
  onClose?: Rule;
  onUnlock?: Rule & { unlocksWith?: { itemId?: string; code?: string; phrase?: string; tag?: string } };
  onUse?: Rule | OnUseWith[];
  onRead?: Rule;
  onTake?: Rule;
  onTalk?: Rule;

  // Legacy/specialized handlers (rarely used)
  onBreak?: Rule & { requiredItemTag?: string; requiredItemId?: string }; // DEPRECATED: Use onUse instead
  onSearch?: Rule; // DEPRECATED: Use onExamine instead
  onInput?: Rule;
  onEnter?: Rule;
  onExit?: Rule;
};

export type StateOverrides = {
  description?: string;
  media?: {
    images?: Record<string, ImageDetails>;
    sounds?: Record<string, string>;
  };
  overrides?: Partial<Handlers>;
};

// ============================================================================
// Legacy Handler Types (for backward compatibility)
// ============================================================================

export type InteractionResult = {
  message: string;
  effects?: Effect[];
  once?: boolean; // If true, this success block can only be triggered once.
};

export type Handler = {
  conditions?: Condition[];
  success: Outcome;  // NEW: Use Outcome to support media property
  fail?: Outcome;     // NEW: Use Outcome to support media property
  fallback?: string;  // Fallback message if no success/fail matched
};

export type ItemHandler = {
  itemId: ItemId;
  conditions?: Condition[];
  success: Outcome;  // NEW: Use Outcome to support media property
  fail?: Outcome;    // NEW: Use Outcome to support media property
};

type HandlerOverrides = Partial<{
    onExamine: Handler;
    onRead: Handler;
    onUse: Handler;
    onOpen: Handler;
    onUnlock: Handler;
}>

// ============================================================================
// NEW ARCHITECTURE: Capabilities
// ============================================================================

export type Capabilities = {
  // Containers/portals/devices/readables
  openable?: boolean;
  lockable?: boolean;
  breakable?: boolean;
  container?: boolean;
  movable?: boolean;
  searchable?: boolean;
  inputtable?: boolean;
  powerable?: boolean;
  readable?: boolean;
  usable?: boolean;
  combinable?: boolean;
  passage?: boolean;
  takable?: boolean;
};

// ============================================================================
// NEW ARCHITECTURE: Archetype System
// ============================================================================

export type Archetype = {
  id: string;
  name: string;
  capabilities: Capabilities;
  stateDefaults: EntityRuntimeState;
  handlers?: Handlers;
  media?: {
    images?: Record<string, ImageDetails>;
    sounds?: Record<string, string>;
  };
};

// ============================================================================
// NEW ARCHITECTURE: Entity Base (for Cartridge)
// ============================================================================

export type EntityBase = {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  capabilities?: Capabilities;
  stateDefaults?: EntityRuntimeState;
  handlers?: Handlers;
  stateMap?: Record<string, StateOverrides>;
  media?: {
    images?: Record<string, ImageDetails>;
    sounds?: Record<string, string>;
  };
  children?: {
    objects?: string[];
    items?: string[];
  };
  links?: {
    type: 'controls' | 'reveals' | 'blocks';
    targetId: string;
    params?: any;
  }[];
  version?: {
    schema: string;
    content: string;
  };
};

// ============================================================================
// Legacy GameObject Type (preserved for backward compatibility)
// ============================================================================

export type GameObject = {
  id: GameObjectId;
  name: string;
  description: string;
  archetype: GameObjectType;

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
    // Core handlers (see HANDLER_TAXONOMY.md)
    onExamine?: Handler & { alternateMessage?: string };
    onOpen?: Handler;
    onClose?: Handler;
    onMove?: Handler;
    onUnlock?: Handler;
    onUse?: ItemHandler[]; // Can react to multiple items

    // Deprecated/specialized handlers
    onSearch?: Handler; // DEPRECATED: Use onExamine instead
    onRemove?: ItemHandler[]; // DEPRECATED: Use onMove instead
    onBreak?: Handler; // DEPRECATED: Use onUse instead
    onInput?: Handler;
    onInsert?: ItemHandler[];
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
    overrides?: HandlerOverrides;
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

  children?: {
    objects?: string[];
    items?: string[];
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
  archetype: ItemType;
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
    readCount: number;
    currentStateId: string;
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
    image?: ImageDetails; // Legacy: single image
    images?: Record<string, ImageDetails>; // NEW: state-based images (e.g., default, opened)
    sounds?: {
      onUse?: string;
      onCombine?: string;
      onRead?: string;
    };
  };

  handlers: {
    onTake?: Handler;
    onUse?: Handler | ItemHandler[];
    onRead?: Handler;
    onScan?: Handler;
    onAnalyze?: Handler;
    onPhotograph?: Handler;
    onCombine?: ItemHandler[];
    defaultFailMessage?: string;
  };

  stateMap?: Record<string, {
      description: string;
      overrides?: HandlerOverrides;
  }>;

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
  startConversationEffects?: Effect[];

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
      effects?: Effect[];
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
  sceneImage?: ImageDetails;
  overworldDescription?: string;
  coord?: { x: number; y: number; z: number };
  mapIcon?: string;
  entryPortals?: PortalId[];
  exitPortals?: PortalId[];
  objects: GameObjectId[];
  npcs: NpcId[];
  onEnterLocation?: Handler;
  onExitLocation?: Handler;
  zones?: { title: string, objectIds: GameObjectId[] }[];
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

export type Hint = {
  flag: Flag;
  text: string;
};

export type Chapter = {
  id: ChapterId;
  title: string;
  goal: string;
  objectives?: { flag: Flag, label: string }[];
  hints?: Hint[];
  startLocationId: LocationId; // Can be a cell or a location
  startingFocus?: {
    entityId: string;  // ID of the object/item/NPC to focus on initially
    entityType: 'object' | 'item' | 'npc';
  };
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
