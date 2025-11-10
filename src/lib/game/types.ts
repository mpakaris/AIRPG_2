
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
  type: 'text' | 'image' | 'video' | 'article' | 'document' | 'audio' | 'pdf';
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
  | { type: 'ADD_ITEM'; itemId: ItemId }
  | { type: 'REMOVE_ITEM'; itemId: ItemId } // From inventory
  | { type: 'REMOVE_ITEM_FROM_CONTAINER', itemId: ItemId, containerId: GameObjectId }
  | { type: 'DESTROY_ITEM'; itemId: ItemId } // From world
  | { type: 'SET_FLAG'; flag: Flag; value?: boolean } // Added value parameter for explicit true/false
  | { type: 'REVEAL_OBJECT'; objectId: GameObjectId }
  | { type: 'SHOW_MESSAGE'; speaker: Message['sender']; senderName?: string; content: string; messageType?: Message['type']; imageId?: ItemId | NpcId | GameObjectId; imageEntityType?: 'item' | 'object' | 'npc'; imageUrl?: string; imageDescription?: string; imageHint?: string; usage?: TokenUsage }
  | { type: 'START_CONVERSATION'; npcId: NpcId }
  | { type: 'END_CONVERSATION' }
  | { type: 'START_INTERACTION'; objectId: string }
  | { type: 'END_INTERACTION' }
  | { type: 'SET_STATE'; targetId: GameObjectId | ItemId, to: string }
  | { type: 'SET_OBJECT_STATE', objectId: GameObjectId, state: Partial<GameObjectState> }
  | { type: 'SET_ENTITY_STATE'; entityId: string; patch: Partial<EntityRuntimeState> } // NEW: Universal state setter
  | { type: 'REVEAL_ENTITY'; entityId: string } // NEW: Make entity visible (sets isVisible: true)
  | { type: 'HIDE_ENTITY'; entityId: string } // NEW: Make entity invisible (sets isVisible: false)
  | { type: 'ADD_TO_CONTAINER'; entityId: string; containerId: string } // NEW: Add entity to container (sets parent/child)
  | { type: 'REMOVE_FROM_CONTAINER'; entityId: string; containerId: string } // NEW: Remove entity from container
  | { type: 'REVEAL_FROM_PARENT'; entityId: string; parentId: string } // NEW: Reveal entity and establish parent relationship
  | { type: 'SET_PARENT'; entityId: string; parentId: string } // NEW: Set parent of entity
  | { type: 'SET_STATE_ID'; entityId: string; to: string } // NEW: Set currentStateId
  | { type: 'INC_COUNTER'; key: string; by?: number } // NEW: Increment counter
  | { type: 'LINK_ENABLE'; linkId: string } // NEW: Enable link
  | { type: 'LINK_DISABLE'; linkId: string } // NEW: Disable link
  | { type: 'START_TIMER'; timerId: string; duration: number } // NEW: Start timer
  | { type: 'CANCEL_TIMER'; timerId: string } // NEW: Cancel timer
  | { type: 'SET_FOCUS'; focusId: string; focusType: 'object' | 'item' | 'npc'; transitionMessage?: string } // NEW: Set player focus
  | { type: 'CLEAR_FOCUS' } // NEW: Clear player focus
  | { type: 'SET_DEVICE_FOCUS'; deviceId: GameObjectId | ItemId } // NEW: Enter device mode (phone, laptop, etc.)
  | { type: 'CLEAR_DEVICE_FOCUS' } // NEW: Exit device mode
  | { type: 'MOVE_TO_CELL', toCellId: CellId }
  | { type: 'MOVE_TO_LOCATION'; toLocationId: LocationId } // NEW: Move player to location
  | { type: 'TELEPORT'; toLocationId: LocationId } // NEW: Teleport player
  | { type: 'ENTER_PORTAL', portalId: PortalId }
  | { type: 'TELEPORT_PLAYER', toLocationId: LocationId }
  | { type: 'DEMOTE_NPC', npcId: NpcId }
  | { type: 'INCREMENT_ITEM_READ_COUNT', itemId: ItemId }
  | { type: 'INCREMENT_NPC_INTERACTION', npcId: NpcId }
  | { type: 'COMPLETE_NPC_TOPIC', npcId: NpcId, topicId: string }
  | { type: 'SET_STORY', story: Story };


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
    currentStateId?: string;
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

  stories: Record<ChapterId, Story>;
  activeConversationWith: NpcId | null;
  activeDeviceFocus: GameObjectId | ItemId | null; // Device focus mode (phone, laptop, etc.)
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

/**
 * Outcome - Result of an action (success or fail)
 * Used in the 12-verb interaction system
 */
export type Outcome = {
  message?: string;
  speaker?: 'narrator' | 'agent' | 'system';
  media?: {
    url?: string;           // Image or video URL
    description?: string;   // Alt text / screen reader description
    hint?: string;          // Optional hint about what this image shows
  };
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

export type OnCallHandler = {
  phoneNumber?: string;  // Phone number to match (e.g., "555-444-2025"). Use "*" for fallback/default.
  conditions?: Condition[];
  success?: Outcome;
  fail?: Outcome;
};

/**
 * Handlers - The 12-Verb Interaction System
 * See /src/documentation/verb-system.md for full documentation
 *
 * CORE VERBS (12 - these are the ONLY verbs players can use):
 * 1. onExamine - Visual inspection, study, look at
 * 2. onTake - Pick up, grab, collect (items only)
 * 3. onDrop - Drop, discard, leave (items only)
 * 4. onUse - Use item (standalone or on object), apply, operate, activate
 * 5. onCombine - Combine two items in inventory
 * 6. onOpen - Open containers, doors, unlock
 * 7. onClose - Close containers, doors, lock
 * 8. onMove - Push, pull, slide, shift (reveals hidden items)
 * 9. onBreak - Smash, destroy, damage (without using another item)
 * 10. onRead - Read text on documents, screens, signs
 * 11. onSearch - Look inside/under/behind, rummage through
 * 12. onTalk - Initiate conversation with NPCs
 *
 * SPECIAL HANDLERS (not player-facing):
 * - onUnlock - Password/code validation (triggered by other handlers)
 * - onInput - Text input validation
 * - onEnter/onExit - Location/cell transitions
 */
export type Handlers = {
  // The 12 Core Verbs
  onExamine?: Rule;
  onTake?: Rule;
  onDrop?: Rule;
  onUse?: Rule | OnUseWith[];
  onCombine?: OnUseWith[];  // Combine with another item
  onOpen?: Rule;
  onClose?: Rule;
  onMove?: Rule;
  onBreak?: Rule;
  onRead?: Rule;
  onSearch?: Rule;
  onTalk?: Rule;

  // Special handlers (not player-facing)
  onUnlock?: Rule & { unlocksWith?: { itemId?: string; code?: string; phrase?: string; tag?: string } };
  onInput?: Rule;
  onEnter?: Rule;
  onExit?: Rule;
  onCall?: OnCallHandler[];  // Phone calling handler (for devices like phones)

  // Fallback message if player tries an undefined verb
  defaultFailMessage?: string;
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
  alternateNames?: string[]; // Alternative names for matching player input
  description: string;
  archetype: GameObjectType;

  personal?: boolean; // Personal equipment (phone, badge, etc.) - always accessible, never in scene listings

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
    onRead?: ItemHandler[]; // Can react to multiple items being read with this object
    onSearch?: Handler;
    onBreak?: Handler;

    // Deprecated/specialized handlers
    onRemove?: ItemHandler[]; // DEPRECATED: Use onMove instead
    onInput?: Handler;
    onInsert?: ItemHandler[];
    onReset?: Handler;
    onActivate?: Handler;
    onDeactivate?: Handler;

    // Fallback message
    defaultFailMessage?: string;
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

  // NPCs located near this object (for proximity-based talk restrictions)
  nearbyNpcs?: NpcId[];

  // Optional transition narration when player focuses on this object
  transitionNarration?: string;

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
  alternateNames?: string[]; // Alternative names for matching player input
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
    // The 12 Core Verbs (applicable to items)
    onExamine?: Handler;
    onTake?: Handler;
    onDrop?: Handler;
    onUse?: Handler | ItemHandler[];
    onCombine?: ItemHandler[];
    onRead?: Handler;
    onSearch?: Handler;
    onBreak?: Handler;
    onClose?: Handler;

    // Special/legacy handlers
    onScan?: Handler;
    onAnalyze?: Handler;
    onPhotograph?: Handler;
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

  // Type system for conversation handling
  npcType: 'type1' | 'type2';  // type1 = story-critical with canned answers, type2 = AI-generated flavor
  importance: 'primary' | 'supporting' | 'ambient';
  initialState: {
    stage: 'active' | 'completed' | 'demoted';
    trust: number;
    attitude: 'friendly' | 'neutral' | 'hostile' | 'suspicious';
  };

  dialogueType: 'scripted' | 'freeform' | 'tree';
  persona?: string;  // AI persona for Type 2 NPCs (freeform dialogue)
  welcomeMessage: string;
  goodbyeMessage: string;
  startConversationEffects?: Effect[];

  limits?: {
    maxInteractions?: number;  // For Type 2: typically 5
    cooldownSec?: number;
    interactionLimitResponse?: string;  // Message when limit reached
  };

  // Progressive reveal system (Type 1 NPCs)
  progressiveReveals?: {
    triggerOnInteraction: number;  // Which interaction triggers this (e.g., 2 or 3)
    topicId: string;  // Which topic becomes available
    conditions?: Condition[];  // Optional conditions
  }[];

  demoteRules?: {
    onFlagsAll?: Flag[];  // Demote when all flags are set
    onGiveItemsAny?: ItemId[];  // Demote when any of these items given
    onTopicCompletedAll?: string[];  // Demote when all topics completed
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
    onTalk?: Rule;  // Handler for initial talk attempt (can check proximity)
  };

  topics?: Topic[];  // Type 1: 20+ canned conversation topics

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
  sceneDescription: string; // Brief description used in "look" command
  introMessage?: string; // First-time entry narration (optional, uses sceneDescription if not provided)
  lookAroundPrefix?: string; // Prefix for "look" command (e.g., "You scan the room..."), uses generic if not provided
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
  transitionTemplates?: string[]; // Location-specific atmospheric transitions. Use {entity} placeholder for object/NPC name.
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
  introMessage?: string; // Opening narration when chapter starts (e.g., "The rain hammers down...")
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


// ============================================================================
// System Messages (Content from Cartridge)
// ============================================================================

export type SystemMessages = {
  // Command validation
  needsTarget: {
    examine: string;
    read: string;
    take: string;
    goto: string;
  };

  // Visibility errors
  notVisible: (itemName: string) => string;

  // Inventory
  inventoryEmpty: string;
  inventoryList: (itemNames: string) => string;
  alreadyHaveItem: (itemName: string) => string;

  // Navigation
  cannotGoThere: string;
  chapterIncomplete: (goal: string, locationName: string) => string;
  chapterTransition: (chapterTitle: string) => string;
  locationTransition: (locationName: string) => string;
  noNextChapter: string;

  // Reading
  notReadable: (itemName: string) => string;
  alreadyReadAll: (itemName: string) => string;
  textIllegible: string;

  // Using items
  dontHaveItem: (itemName: string) => string;
  cantUseItem: (itemName: string) => string;
  cantUseOnTarget: (itemName: string, targetName: string) => string;
  noVisibleTarget: (targetName: string) => string;
  useDidntWork: string;

  // Moving objects
  cantMoveObject: (objectName: string) => string;
  movedNothingFound: (objectName: string) => string;

  // Opening
  cantOpen: (targetName: string) => string;

  // Password/Focus system
  needsFocus: string;
  focusSystemError: string;
  noPasswordInput: (objectName: string) => string;
  alreadyUnlocked: (objectName: string) => string;
  wrongPassword: string;

  // Generic errors
  cantDoThat: string;
  somethingWentWrong: string;
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

  // System messages (all fallback/error text)
  systemMessages: SystemMessages;

  // System media (generic images for common actions)
  systemMedia?: {
    take?: {
      success?: ImageDetails;  // Generic "item goes into pocket/inventory" image
      failure?: ImageDetails;  // Generic "can't take this" image
    };
    use?: {
      success?: ImageDetails;
      failure?: ImageDetails;
    };
    open?: {
      success?: ImageDetails;
      failure?: ImageDetails;
    };
    move?: ImageDetails;  // Generic "moving to location/object" image
    actionFailed?: ImageDetails[];  // Pool of random "action failed" images
  };

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

// Serializable version of Game for client components (no functions)
export type SerializableGame = Omit<Game, 'systemMessages' | 'promptContext' | 'objectInteractionPromptContext' | 'storyStyleGuide'>;

/**
 * Convert Game to SerializableGame (removes functions for client components)
 */
export function toSerializableGame(game: Game): SerializableGame {
    const { systemMessages, promptContext, objectInteractionPromptContext, storyStyleGuide, ...serializable } = game;
    return serializable;
}
