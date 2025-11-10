/**
 * TEST CARTRIDGE
 *
 * Minimal game cartridge containing only representative container/interaction types.
 * Used for automated testing to catch regressions.
 *
 * Container Types Represented:
 * 1. Simple Openable - No requirements
 * 2. Item-Locked Container - Requires specific item to unlock
 * 3. Password-Locked Container - Requires correct phrase
 * 4. Movable Object - Reveals hidden object when moved
 * 5. Breakable Object - Reveals item when broken with tool
 * 6. Progressive Reveal - Multi-stage discovery (unlock → open → reveal)
 */

import type { Game, GameId, GameObject, GameObjectId, Item, ItemId, Location, LocationId, Chapter, ChapterId, Portal, PortalId, CellId, WorldId, StructureId, Flag } from '../types';

// ============================================================================
// GAME OBJECTS - Representative Container Types
// ============================================================================

const gameObjects: Record<GameObjectId, GameObject> = {
  // TYPE 1: Simple Openable Container (No Lock)
  'test_obj_box': {
    id: 'test_obj_box' as GameObjectId,
    name: 'Simple Box',
    alternateNames: ['box', 'simple box', 'container'],
    archetype: 'Container',
    description: 'A simple wooden box with no lock.',
    capabilities: { openable: true, lockable: false, breakable: false, movable: false, powerable: false, container: true, readable: false, inputtable: false },
    state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
    inventory: { items: ['test_item_coin'] as ItemId[], capacity: 1 },
    children: { items: ['test_item_coin'] as ItemId[] },
    handlers: {
      onOpen: {
        success: {
          message: 'You open the box.',
          effects: [
            { type: 'SET_ENTITY_STATE', entityId: 'test_obj_box', patch: { isOpen: true } },
            { type: 'REVEAL_FROM_PARENT', entityId: 'test_item_coin', parentId: 'test_obj_box' }
          ]
        }
      },
      onExamine: {
        success: { message: 'A simple wooden box. It can be opened.' }
      }
    },
    design: { tags: ['test', 'simple-container'] },
    version: { schema: "1.0", content: "1.0" }
  },

  // TYPE 2: Item-Locked Container (Safe + Key)
  'test_obj_safe': {
    id: 'test_obj_safe' as GameObjectId,
    name: 'Safe',
    alternateNames: ['safe', 'metal safe', 'locked safe'],
    archetype: 'Container',
    description: 'A metal safe with a keyhole.',
    capabilities: { openable: true, lockable: true, breakable: false, movable: false, powerable: false, container: true, readable: false, inputtable: false },
    state: { isOpen: false, isLocked: true, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
    inventory: { items: ['test_item_document'] as ItemId[], capacity: 1 },
    children: { items: ['test_item_document'] as ItemId[] },
    handlers: {
      onUse: [
        {
          // Correct key
          itemId: 'test_item_key',
          conditions: [
            { type: 'HAS_ITEM', itemId: 'test_item_key' as ItemId },
            { type: 'STATE', entityId: 'test_obj_safe', key: 'isLocked', equals: true }
          ],
          success: {
            message: 'The key turns in the lock. Click. The safe is unlocked.',
            effects: [
              { type: 'SET_ENTITY_STATE', entityId: 'test_obj_safe', patch: { isLocked: false } },
              { type: 'SET_FLAG', flag: 'test_safe_unlocked' as Flag, value: true }
            ]
          },
          fail: {
            message: 'The safe is already unlocked.'
          }
        }
      ],
      onOpen: [
        {
          conditions: [{ type: 'STATE', entityId: 'test_obj_safe', key: 'isLocked', equals: false }],
          success: {
            message: 'You open the safe. Inside is a document.',
            effects: [
              { type: 'SET_ENTITY_STATE', entityId: 'test_obj_safe', patch: { isOpen: true } },
              { type: 'REVEAL_FROM_PARENT', entityId: 'test_item_document', parentId: 'test_obj_safe' }
            ]
          }
        },
        {
          conditions: [],
          fail: { message: 'The safe is locked. You need a key.' }
        }
      ],
      onExamine: {
        success: { message: 'A metal safe with a keyhole. It looks sturdy.' }
      }
    },
    design: { tags: ['test', 'item-locked'] },
    version: { schema: "1.0", content: "1.0" }
  },

  // TYPE 3: Password-Locked Container
  'test_obj_door': {
    id: 'test_obj_door' as GameObjectId,
    name: 'Password Door',
    alternateNames: ['door', 'locked door', 'password door'],
    archetype: 'Portal',
    description: 'A door with a digital keypad. Requires a password phrase.',
    capabilities: { openable: true, lockable: true, breakable: false, movable: false, powerable: false, container: false, readable: false, inputtable: true },
    state: { isOpen: false, isLocked: true, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
    inventory: { items: [], capacity: 0 },
    input: { type: 'phrase', validation: 'open sesame', hint: 'A magic phrase', attempts: null, lockout: null },
    handlers: {
      onUnlock: {
        success: {
          message: 'The keypad beeps. Green light. The door unlocks.',
          effects: [
            { type: 'SET_ENTITY_STATE', entityId: 'test_obj_door', patch: { isLocked: false, isOpen: true } },
            { type: 'SET_FLAG', flag: 'test_door_unlocked' as Flag, value: true }
          ]
        },
        fail: {
          message: 'Wrong password. Red light. The door stays locked.'
        }
      },
      onOpen: {
        conditions: [{ type: 'STATE', entityId: 'test_obj_door', key: 'isLocked', equals: false }],
        success: { message: 'The door is already open.' },
        fail: { message: 'The door is locked. Try /password <phrase>' }
      },
      onExamine: {
        success: { message: 'A door with a digital keypad. It needs a password phrase.' }
      }
    },
    design: { tags: ['test', 'password-locked'] },
    version: { schema: "1.0", content: "1.0" }
  },

  // TYPE 4: Movable Object (Reveals Hidden Object)
  'test_obj_painting': {
    id: 'test_obj_painting' as GameObjectId,
    name: 'Painting',
    alternateNames: ['painting', 'picture', 'wall art'],
    archetype: 'Decoration',
    description: 'A painting hanging on the wall.',
    capabilities: { openable: false, lockable: false, breakable: false, movable: true, powerable: false, container: false, readable: false, inputtable: false },
    state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, isMoved: false, currentStateId: 'default' },
    inventory: { items: [], capacity: 0 },
    children: { objects: ['test_obj_hidden_button'] as GameObjectId[] },
    handlers: {
      onMove: {
        success: {
          message: 'You slide the painting aside. Behind it is a hidden button!',
          effects: [
            { type: 'SET_ENTITY_STATE', entityId: 'test_obj_painting', patch: { isMoved: true } },
            { type: 'REVEAL_FROM_PARENT', entityId: 'test_obj_hidden_button', parentId: 'test_obj_painting' },
            { type: 'SET_FLAG', flag: 'test_button_revealed' as Flag, value: true }
          ]
        }
      },
      onExamine: {
        success: { message: 'A painting on the wall. It looks like it could be moved.' }
      }
    },
    design: { tags: ['test', 'movable'] },
    version: { schema: "1.0", content: "1.0" }
  },

  // Revealed by painting
  'test_obj_hidden_button': {
    id: 'test_obj_hidden_button' as GameObjectId,
    name: 'Hidden Button',
    alternateNames: ['button', 'hidden button', 'red button'],
    archetype: 'Interactive',
    description: 'A red button hidden behind the painting.',
    capabilities: { openable: false, lockable: false, breakable: false, movable: false, powerable: false, container: false, readable: false, inputtable: false },
    state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
    inventory: { items: [], capacity: 0 },
    handlers: {
      onUse: {
        success: {
          message: 'You press the button. A soft click echoes.',
          effects: [
            { type: 'SET_FLAG', flag: 'test_button_pressed' as Flag, value: true }
          ]
        }
      },
      onExamine: {
        success: { message: 'A red button. What does it do?' }
      }
    },
    design: { tags: ['test', 'hidden'] },
    version: { schema: "1.0", content: "1.0" }
  },

  // TYPE 5: Breakable Object (Reveals Item with Tool)
  'test_obj_crate': {
    id: 'test_obj_crate' as GameObjectId,
    name: 'Wooden Crate',
    alternateNames: ['crate', 'wooden crate', 'box'],
    archetype: 'Container',
    description: 'A sturdy wooden crate. Looks like it needs to be broken open.',
    capabilities: { openable: false, lockable: false, breakable: true, movable: false, powerable: false, container: true, readable: false, inputtable: false },
    state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
    inventory: { items: ['test_item_gem'] as ItemId[], capacity: 1 },
    children: { items: ['test_item_gem'] as ItemId[] },
    handlers: {
      onUse: [
        {
          itemId: 'test_item_crowbar',
          conditions: [{ type: 'STATE', entityId: 'test_obj_crate', key: 'isBroken', equals: false }],
          success: {
            message: 'You pry the crate open with the crowbar. Wood splinters. Inside is a gem!',
            effects: [
              { type: 'SET_ENTITY_STATE', entityId: 'test_obj_crate', patch: { isBroken: true } },
              { type: 'REVEAL_FROM_PARENT', entityId: 'test_item_gem', parentId: 'test_obj_crate' },
              { type: 'SET_FLAG', flag: 'test_crate_broken' as Flag, value: true }
            ]
          },
          fail: {
            message: 'The crate is already broken.'
          }
        }
      ],
      onBreak: {
        fail: { message: 'You need a tool to break this crate. Try using something on it.' }
      },
      onExamine: {
        success: { message: 'A sturdy wooden crate. You need a tool to break it open.' }
      }
    },
    design: { tags: ['test', 'breakable'] },
    version: { schema: "1.0", content: "1.0" }
  }
};

// ============================================================================
// ITEMS - Test Items for Interactions
// ============================================================================

const items: Record<ItemId, Item> = {
  // Item inside simple box
  'test_item_coin': {
    id: 'test_item_coin' as ItemId,
    name: 'Gold Coin',
    alternateNames: ['coin', 'gold coin'],
    archetype: 'Treasure',
    description: 'A shiny gold coin.',
    capabilities: { isTakable: true, isReadable: false, isUsable: false, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
    state: { currentStateId: 'default' },
    handlers: {
      onTake: {
        success: {
          message: 'You take the gold coin.',
          effects: [
            { type: 'ADD_ITEM', itemId: 'test_item_coin' },
            { type: 'SET_ENTITY_STATE', entityId: 'test_item_coin', patch: { taken: true } }
          ]
        }
      }
    },
    design: { tags: ['test', 'item'] },
    version: { schema: "1.0", content: "1.0" }
  },

  // Key for safe
  'test_item_key': {
    id: 'test_item_key' as ItemId,
    name: 'Brass Key',
    alternateNames: ['key', 'brass key'],
    archetype: 'Tool',
    description: 'A brass key. It looks like it fits a safe.',
    capabilities: { isTakable: true, isReadable: false, isUsable: true, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
    state: { currentStateId: 'default' },
    handlers: {
      onTake: {
        success: {
          message: 'You take the brass key.',
          effects: [
            { type: 'ADD_ITEM', itemId: 'test_item_key' },
            { type: 'SET_ENTITY_STATE', entityId: 'test_item_key', patch: { taken: true } }
          ]
        }
      }
    },
    design: { tags: ['test', 'key'] },
    version: { schema: "1.0", content: "1.0" }
  },

  // Document inside safe
  'test_item_document': {
    id: 'test_item_document' as ItemId,
    name: 'Secret Document',
    alternateNames: ['document', 'secret document', 'paper'],
    archetype: 'Document',
    description: 'A secret document.',
    capabilities: { isTakable: true, isReadable: true, isUsable: false, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
    state: { currentStateId: 'default' },
    handlers: {
      onTake: {
        success: {
          message: 'You take the secret document.',
          effects: [
            { type: 'ADD_ITEM', itemId: 'test_item_document' },
            { type: 'SET_ENTITY_STATE', entityId: 'test_item_document', patch: { taken: true } }
          ]
        }
      },
      onRead: {
        success: { message: 'The document reads: "The treasure is behind the painting."' }
      }
    },
    design: { tags: ['test', 'document'] },
    version: { schema: "1.0", content: "1.0" }
  },

  // Crowbar for breaking crate
  'test_item_crowbar': {
    id: 'test_item_crowbar' as ItemId,
    name: 'Crowbar',
    alternateNames: ['crowbar', 'pry bar', 'bar'],
    archetype: 'Tool',
    description: 'A heavy iron crowbar. Good for breaking things.',
    capabilities: { isTakable: true, isReadable: false, isUsable: true, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
    state: { currentStateId: 'default' },
    handlers: {
      onTake: {
        success: {
          message: 'You take the crowbar.',
          effects: [
            { type: 'ADD_ITEM', itemId: 'test_item_crowbar' },
            { type: 'SET_ENTITY_STATE', entityId: 'test_item_crowbar', patch: { taken: true } }
          ]
        }
      }
    },
    design: { tags: ['test', 'tool'] },
    version: { schema: "1.0", content: "1.0" }
  },

  // Gem inside crate
  'test_item_gem': {
    id: 'test_item_gem' as ItemId,
    name: 'Ruby Gem',
    alternateNames: ['gem', 'ruby', 'ruby gem'],
    archetype: 'Treasure',
    description: 'A brilliant ruby gem.',
    capabilities: { isTakable: true, isReadable: false, isUsable: false, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
    state: { currentStateId: 'default' },
    handlers: {
      onTake: {
        success: {
          message: 'You take the ruby gem.',
          effects: [
            { type: 'ADD_ITEM', itemId: 'test_item_gem' },
            { type: 'SET_ENTITY_STATE', entityId: 'test_item_gem', patch: { taken: true } }
          ]
        }
      }
    },
    design: { tags: ['test', 'treasure'] },
    version: { schema: "1.0", content: "1.0" }
  }
};

// ============================================================================
// LOCATION - Single Test Room
// ============================================================================

const locations: Record<LocationId, Location> = {
  'test_loc_room': {
    locationId: 'test_loc_room' as LocationId,
    name: 'Test Room',
    sceneDescription: 'A simple test room with various containers and objects.',
    coord: { x: 0, y: 0, z: 0 },
    objects: ['test_obj_box', 'test_obj_safe', 'test_obj_door', 'test_obj_painting', 'test_obj_crate'] as GameObjectId[],
    npcs: [],
    entryPortals: [],
    exitPortals: []
  }
};

// ============================================================================
// CHAPTER - Minimal Chapter
// ============================================================================

const chapters: Record<ChapterId, Chapter> = {
  'test_ch1': {
    id: 'test_ch1' as ChapterId,
    title: 'Test Chapter',
    goal: 'Test all container types',
    objectives: [
      { flag: 'test_safe_unlocked' as Flag, label: 'Unlock the safe' },
      { flag: 'test_door_unlocked' as Flag, label: 'Unlock the door' },
      { flag: 'test_button_revealed' as Flag, label: 'Find hidden button' },
      { flag: 'test_crate_broken' as Flag, label: 'Break the crate' }
    ],
    hints: [],
    startLocationId: 'test_loc_room' as LocationId,
    locations: {},
    gameObjects: {},
    items: {},
    npcs: {}
  }
};

// ============================================================================
// MAIN TEST GAME CARTRIDGE
// ============================================================================

export const testGame: Game = {
  id: 'test-game' as GameId,
  title: 'Test Game Cartridge',
  description: 'Minimal game for automated testing',
  setting: 'Test Environment',
  gameType: 'Test',
  narratorName: 'Test Narrator',
  promptContext: 'Test prompt context',
  startChapterId: 'test_ch1' as ChapterId,

  chapters,
  locations,
  gameObjects,
  items,
  npcs: {},
  portals: {} as Record<PortalId, Portal>,

  world: {
    worldId: 'test_world' as WorldId,
    name: 'Test World',
    cells: {
      'test_cell': {
        cellId: 'test_cell' as CellId,
        coord: { x: 0, y: 0, z: 0 },
        type: 'room',
        isPassable: true
      }
    }
  },

  structures: {},

  systemMessages: {
    notVisible: (name: string) => `You don't see ${name} here.`,
    notTakable: (name: string) => `You can't take ${name}.`,
    notReadable: (name: string) => `You can't read ${name}.`,
    alreadyHave: (name: string) => `You already have ${name}.`,
    alreadyReadAll: (name: string) => `You've already read all of ${name}.`,
    textIllegible: 'The text is illegible.',
    cantUseItem: (itemName: string) => `The ${itemName} has no obvious use here.`,
    cantUseOnTarget: (itemName: string, targetName: string) => `The ${itemName} doesn't work on the ${targetName}. Wrong tool for the job.`,
    noVisibleTarget: (targetName: string) => `You don't see any "${targetName}" here. Perhaps you need to search the Test Room more thoroughly, or it might be somewhere else entirely.`,
    needsTarget: {
      examine: 'What do you want to examine?',
      take: 'What do you want to take?',
      use: 'What do you want to use?',
      read: 'What do you want to read?',
      open: 'What do you want to open?',
      close: 'What do you want to close?',
      move: 'What do you want to move?',
      break: 'What do you want to break?',
      talk: 'Who do you want to talk to?',
      go: 'Where do you want to go?'
    }
  },

  systemMedia: {
    actionFailed: []
  },

  version: { schema: "1.0", content: "1.0" }
};
