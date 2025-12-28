# Zone Creation Cookbook

**VERSION**: 1.0
**DATE**: 2025-12-22
**STATUS**: Complete

**PURPOSE**: Step-by-step guide to creating zones, containers, and items without breaking anything.

**READ THIS BEFORE**: Creating new zones, modifying containers, or debugging zone issues.

---

## Table of Contents

1. [Core Principles](#1-core-principles)
2. [Zone Architecture Patterns](#2-zone-architecture-patterns)
3. [Container & Parent-Child Relationships](#3-container--parent-child-relationships)
4. [Progressive Discovery Patterns](#4-progressive-discovery-patterns)
5. [Common Mistakes & How to Avoid Them](#5-common-mistakes--how-to-avoid-them)
6. [Step-by-Step Workflows](#6-step-by-step-workflows)
7. [Validation Checklist](#7-validation-checklist)
8. [Troubleshooting Guide](#8-troubleshooting-guide)
9. [Appendix: Reference Examples](#appendix-reference-examples)

---

## 1. Core Principles

### The Golden Rule

> **"Will this solution work for 1000 games, or just this one object?"**
>
> If the answer is "just this one object" → STOP. Fix the system, not the object.

### Zone Architecture Rules

#### RULE 1: Objects Define Zones, Not the Other Way Around

**Correct**:
```typescript
'obj_dumpster': {
  zone: 'zone_at_dumpster',  // ✅ Object HAS zone property (defines spatial position)
}

// In location zones:
{
  id: 'zone_inside_dumpster',
  objectIds: ['obj_suitcase', 'obj_backpack']  // ✅ Zone lists its contents
}
```

**Incorrect**:
```typescript
'obj_suitcase': {
  parentId: 'obj_dumpster',
  zone: 'zone_inside_dumpster',  // ❌ Contained objects should NOT have zone property
}
```

**Why**: Zone property indicates WHERE an object defines a spatial position. Objects inside containers inherit position from their parent.

---

#### RULE 2: Parent-Child Chains Must Be Continuous

**Correct chain** (key → pocket → coat → backpack → dumpster):
```typescript
'item_tiny_key': {
  parentId: 'obj_pocket'  // ✅ Points to immediate parent
}

'obj_pocket': {
  parentId: 'obj_coat'  // ✅ Points to immediate parent
}

'obj_coat': {
  parentId: 'obj_backpack'  // ✅ Points to immediate parent
}

'obj_backpack': {
  parentId: 'obj_dumpster'  // ✅ Points to immediate parent
}
```

**Why**: ZoneManager walks up the parent chain recursively to check accessibility. Breaking the chain = items become inaccessible.

---

#### RULE 3: Zone Access = Spatial Position, Focus = Attention

- **Zone**: WHERE you physically are (your body's location)
- **Focus**: WHAT you're examining closely (optional attention layer)

**NEVER confuse these concepts**. See `src/documentation/focus-and-zones.md` for details.

---

#### RULE 4: Only Top-Level Containers in zone.objectIds

**Correct**:
```typescript
{
  id: 'zone_inside_dumpster',
  objectIds: ['obj_backpack']  // ✅ Only the top-level container
}

// Backpack contains coat → coat contains pocket → pocket contains key
// ALL are accessible via recursive parent checking
```

**Incorrect**:
```typescript
{
  id: 'zone_inside_dumpster',
  objectIds: [
    'obj_backpack',
    'obj_coat',      // ❌ No! This is inside backpack
    'obj_pocket',    // ❌ No! This is inside coat
    'item_key'       // ❌ No! This is inside pocket
  ]
}
```

**Why**: Recursive checking handles nested containers automatically. Listing everything creates conflicts.

---

### ZoneManager.canAccess() Priority Order

**DO NOT CHANGE THIS ORDER**:

1. **Items in inventory** → Always accessible
2. **Personal equipment** (`zone: 'personal'`) → Always accessible
3. **No zone system** → Backward compatibility (Chapter 0)
4. **Target in current zone** → Target's zone property matches player's zone
5. **Items in containers** → Recursive parent check up to zone
6. **Objects in zone.objectIds** → Explicit listing in zone definition
7. **Objects inside containers** → Recursive parent check up to zone

**CRITICAL**: Steps 5 and 7 use `isContainerInZoneRecursive()` which walks up the ENTIRE parent chain until finding a container in the zone.

---

## 2. Zone Architecture Patterns

### Pattern A: Simple Zone (No Children)

**Use when**: Single area with no sub-zones

```typescript
zones: [
  {
    id: 'zone_street' as ZoneId,
    title: 'Elm Street',
    isDefault: true,
    objectIds: [
      'obj_lamppost' as GameObjectId,
      'obj_bench' as GameObjectId,
      'obj_trash_can' as GameObjectId
    ]
  }
]
```

**Objects in zone**:
```typescript
// Option 1: Listed in objectIds (NO zone property on object)
'obj_lamppost': {
  id: 'obj_lamppost' as GameObjectId,
  // NO zone property
}

// Option 2: Has zone property (NOT listed in objectIds)
'obj_bench': {
  id: 'obj_bench' as GameObjectId,
  zone: 'zone_street' as ZoneId
}
```

**Both work, but prefer Option 1** for consistency.

---

### Pattern B: Parent-Child Zones (Hierarchical)

**Use when**: Areas within areas (street → alley → dumpster → inside dumpster)

```typescript
zones: [
  {
    id: 'zone_street' as ZoneId,
    title: 'Elm Street',
    isDefault: true,
    objectIds: ['obj_lamppost' as GameObjectId]
  },
  {
    id: 'zone_alley' as ZoneId,
    parent: 'zone_street' as ZoneId,
    title: 'Side Alley',
    objectIds: ['obj_dumpster' as GameObjectId, 'obj_tire_pile' as GameObjectId]
  },
  {
    id: 'zone_at_dumpster' as ZoneId,
    parent: 'zone_alley' as ZoneId,
    title: 'At the Dumpster',
    objectIds: []  // Empty - dumpster object itself defines this zone
  },
  {
    id: 'zone_inside_dumpster' as ZoneId,
    parent: 'zone_at_dumpster' as ZoneId,
    requiresAction: 'climb',
    title: 'Inside the Dumpster',
    transitionNarration: 'You climb into the dumpster, surrounded by garbage',
    objectIds: [
      'obj_suitcase' as GameObjectId,
      'obj_backpack' as GameObjectId,
      'obj_carton' as GameObjectId
    ]
  }
]
```

**Navigation object** (dumpster defines zone_at_dumpster):
```typescript
'obj_dumpster': {
  id: 'obj_dumpster' as GameObjectId,
  zone: 'zone_at_dumpster' as ZoneId,  // ✅ Dumpster DEFINES this zone
  capabilities: { openable: true, container: true },
  handlers: {
    onClimb: {
      success: {
        message: 'You climb into the dumpster...',
        effects: [
          { type: 'SET_FLAG', flag: 'dumpster_climbed', value: true },
          { type: 'SET_ZONE', zoneId: 'zone_inside_dumpster' as ZoneId }  // ✅ Changes player zone
        ]
      }
    }
  }
}
```

**Container objects INSIDE zone_inside_dumpster**:
```typescript
'obj_suitcase': {
  id: 'obj_suitcase' as GameObjectId,
  parentId: 'obj_dumpster' as GameObjectId,
  // ❌ NO zone property!
  // ✅ Listed in zone_inside_dumpster.objectIds
}
```

---

### Pattern C: Nested Containers (4+ Levels Deep)

**Use when**: Items hidden inside multiple containers

**Example**: key → pocket → coat → backpack → dumpster (5 levels)

```typescript
// ============================================================
// LEVEL 1: Backpack (in zone objectIds)
// ============================================================
'obj_backpack': {
  id: 'obj_backpack' as GameObjectId,
  parentId: 'obj_dumpster' as GameObjectId,
  revealMethod: 'REVEAL_FROM_PARENT',
  isRevealed: false,
  // ❌ NO zone property
  children: {
    items: [],
    objects: ['obj_coat' as GameObjectId]
  },
  handlers: {
    onSearch: {
      success: {
        message: 'You find: pants, shoes, coat',
        effects: [
          { type: 'REVEAL_FROM_PARENT', entityId: 'obj_coat', parentId: 'obj_backpack' }
        ]
      }
    }
  }
}

// ============================================================
// LEVEL 2: Coat (inside backpack)
// ============================================================
'obj_coat': {
  id: 'obj_coat' as GameObjectId,
  parentId: 'obj_backpack' as GameObjectId,  // ✅ Maintains chain
  revealMethod: 'REVEAL_FROM_PARENT',
  isRevealed: false,
  // ❌ NO zone property
  children: {
    items: [],
    objects: ['obj_pocket' as GameObjectId]
  },
  handlers: {
    onSearch: {
      success: {
        message: 'You find a hidden pocket in the lining',
        effects: [
          { type: 'REVEAL_FROM_PARENT', entityId: 'obj_pocket', parentId: 'obj_coat' }
        ]
      }
    }
  }
}

// ============================================================
// LEVEL 3: Pocket (inside coat)
// ============================================================
'obj_pocket': {
  id: 'obj_pocket' as GameObjectId,
  parentId: 'obj_coat' as GameObjectId,  // ✅ Maintains chain
  revealMethod: 'REVEAL_FROM_PARENT',
  isRevealed: false,
  // ❌ NO zone property
  children: {
    items: ['item_tiny_silver_key' as ItemId],
    objects: []
  },
  handlers: {
    onSearch: {
      success: {
        message: 'You find a tiny silver key at the bottom',
        effects: [
          { type: 'REVEAL_FROM_PARENT', entityId: 'item_tiny_silver_key', parentId: 'obj_pocket' }
        ]
      }
    }
  }
}

// ============================================================
// LEVEL 4: Key (inside pocket)
// ============================================================
'item_tiny_silver_key': {
  id: 'item_tiny_silver_key' as ItemId,
  parentId: 'obj_pocket' as GameObjectId,  // ✅ Maintains chain
  revealMethod: 'REVEAL_FROM_PARENT',
  isRevealed: false
  // ❌ NO zone property
}
```

**How ZoneManager handles this**:

1. Player in `zone_inside_dumpster`
2. Player tries: `TAKE TINY KEY`
3. Engine checks: Is key's parent (`obj_pocket`) in zone? **No**
4. Is pocket's parent (`obj_coat`) in zone? **No**
5. Is coat's parent (`obj_backpack`) in zone? **YES** (in objectIds)
6. ✅ Key is accessible

**CRITICAL**: Only `obj_backpack` needs to be in `zone_inside_dumpster.objectIds`. Everything else is handled by recursive checking.

---

## 3. Container & Parent-Child Relationships

### Container Types

#### Type 1: Openable Container

**Use when**: Container can be opened/closed (doors, boxes, suitcases)

```typescript
'obj_suitcase': {
  capabilities: {
    openable: true,
    lockable: true,
    container: true
  },
  state: {
    isOpen: false,
    isLocked: true
  },
  children: {
    items: ['item_picture_frame' as ItemId, 'item_candle' as ItemId],
    objects: []
  },
  handlers: {
    onOpen: [
      {
        conditions: [
          { type: 'STATE', entityId: 'obj_suitcase', key: 'isLocked', equals: true }
        ],
        success: {
          message: 'The suitcase is locked. You need a key.'
        }
      },
      {
        conditions: [],
        success: {
          message: 'You open the suitcase.',
          effects: [
            { type: 'SET_ENTITY_STATE', entityId: 'obj_suitcase', patch: { isOpen: true } }
          ]
        }
      }
    ],
    onSearch: [
      {
        conditions: [
          { type: 'STATE', entityId: 'obj_suitcase', key: 'isOpen', equals: true }
        ],
        success: {
          message: 'Inside you find: picture frame, candle, box cutter',
          effects: [
            { type: 'REVEAL_FROM_PARENT', entityId: 'item_picture_frame', parentId: 'obj_suitcase' },
            { type: 'REVEAL_FROM_PARENT', entityId: 'item_candle', parentId: 'obj_suitcase' }
          ]
        }
      },
      {
        conditions: [],
        success: {
          message: 'The suitcase is closed. You need to open it first.'
        }
      }
    ]
  }
}
```

**Key points**:
- `openable: true` allows OPEN command
- `isOpen: false` initial state
- Search handler checks `isOpen` condition
- Items only revealed when open

---

#### Type 2: Breakable Container

**Use when**: Container must be broken to access contents (bags, cartons, windows)

```typescript
'obj_backpack': {
  capabilities: {
    breakable: true,
    container: true,
    openable: false  // Can't be opened normally - zipper broken
  },
  state: {
    isOpen: false,
    isBroken: false
  },
  children: {
    objects: ['obj_coat' as GameObjectId]
  },
  handlers: {
    onBreak: [
      {
        conditions: [
          { type: 'STATE', entityId: 'obj_backpack', key: 'isOpen', equals: true }
        ],
        success: {
          message: 'Already torn open. Canvas ripped apart.'
        }
      },
      {
        conditions: [],
        success: {
          message: 'You grip the torn canvas and pull. The fabric tears open with a harsh ripping sound.',
          effects: [
            { type: 'SET_ENTITY_STATE', entityId: 'obj_backpack', patch: { isOpen: true } }
          ]
        }
      }
    ],
    onOpen: [
      {
        conditions: [
          { type: 'STATE', entityId: 'obj_backpack', key: 'isOpen', equals: true }
        ],
        success: {
          message: 'The backpack is already torn open. Contents are accessible.'
        }
      },
      {
        conditions: [],
        fail: {
          message: 'The zipper is broken. You need to tear the bag open.'
        }
      }
    ]
  }
}
```

**Key points**:
- `breakable: true` allows BREAK/RIP/TEAR commands
- `openable: false` prevents normal opening
- BREAK sets `isOpen: true` (not `isBroken`)
- OPEN handler provides helpful hint when not yet broken

---

#### Type 3: Non-Container Parent

**Use when**: Object holds children but isn't a physical container (locations, surfaces)

```typescript
'obj_coat': {
  capabilities: {
    container: false  // Not a true container
  },
  children: {
    objects: ['obj_pocket' as GameObjectId]
  },
  handlers: {
    onSearch: {
      success: {
        message: 'You check the lining and find a hidden pocket.',
        effects: [
          { type: 'REVEAL_FROM_PARENT', entityId: 'obj_pocket', parentId: 'obj_coat' }
        ]
      }
    }
  }
}
```

**Key points**:
- `container: false` - not a physical container
- Still has `children` property
- Still uses `REVEAL_FROM_PARENT`
- No open/closed state

---

### Parent-Child Declaration (Both Directions)

**ALWAYS declare relationship in BOTH objects**:

```typescript
// Parent declares children
'obj_coat': {
  children: {
    objects: ['obj_pocket' as GameObjectId]  // ✅ Parent lists child
  }
}

// Child declares parent
'obj_pocket': {
  parentId: 'obj_coat' as GameObjectId  // ✅ Child points to parent
}
```

**Why**: Engine needs both directions for different operations:
- Parent → Child: For revealing/listing contents
- Child → Parent: For accessibility checking (recursive walk up)

---

## 4. Progressive Discovery Patterns

### Pattern: Search → Reveal Children

**The Standard Flow**:

1. Player searches container
2. Handler checks conditions (is open? already searched?)
3. Reveals children via `REVEAL_FROM_PARENT`
4. Sets flag to prevent re-revealing

```typescript
onSearch: [
  {
    // First time searching
    conditions: [
      { type: 'NO_FLAG', flag: 'suitcase_searched' }
    ],
    success: {
      message: 'You search through the suitcase. You find:\n\n📷 Picture Frame\n🕯️ Candle\n🔪 Box Cutter',
      effects: [
        { type: 'REVEAL_FROM_PARENT', entityId: 'item_picture_frame', parentId: 'obj_suitcase' },
        { type: 'REVEAL_FROM_PARENT', entityId: 'item_candle', parentId: 'obj_suitcase' },
        { type: 'REVEAL_FROM_PARENT', entityId: 'item_box_cutter', parentId: 'obj_suitcase' },
        { type: 'SET_FLAG', flag: 'suitcase_searched', value: true }
      ]
    }
  },
  {
    // Already searched
    conditions: [],
    success: {
      message: 'You already searched through everything. Just the picture frame, candle, and box cutter.'
    }
  }
]
```

**Key points**:
- Use `NO_FLAG` condition for first-time reveals
- Always set flag after revealing
- Provide different message for subsequent searches
- List all items being revealed

---

### Pattern: State-Based Reveals

**Use when**: Reveal depends on object state (open, broken, powered on)

```typescript
onSearch: [
  {
    // Container is closed
    conditions: [
      { type: 'STATE', entityId: 'obj_box', key: 'isOpen', equals: false }
    ],
    success: {
      message: 'The box is sealed shut. You can\'t see inside without opening it first.'
    }
  },
  {
    // Container is open, first search
    conditions: [
      { type: 'STATE', entityId: 'obj_box', key: 'isOpen', equals: true },
      { type: 'NO_FLAG', flag: 'box_searched' }
    ],
    success: {
      message: 'You dig through the box and find: crowbar, rope, flashlight',
      effects: [
        { type: 'REVEAL_FROM_PARENT', entityId: 'item_crowbar', parentId: 'obj_box' },
        { type: 'REVEAL_FROM_PARENT', entityId: 'item_rope', parentId: 'obj_box' },
        { type: 'REVEAL_FROM_PARENT', entityId: 'item_flashlight', parentId: 'obj_box' },
        { type: 'SET_FLAG', flag: 'box_searched', value: true }
      ]
    }
  },
  {
    // Already searched
    conditions: [],
    success: {
      message: 'Nothing else in the box.'
    }
  }
]
```

**Handler order matters**: Most specific conditions FIRST, default (no conditions) LAST.

---

### Pattern: Multi-Step Discovery Chain

**Use when**: Discovery requires multiple actions

**Example**: Tire pile → requires moving tires → reveals crowbar

```typescript
onExamine: [
  {
    // State 3: Already took crowbar
    conditions: [
      { type: 'HAS_ITEM', itemId: 'item_crowbar' }
    ],
    success: {
      message: 'The tire pile sits disturbed. The crowbar is gone—you took it.'
    }
  },
  {
    // State 2: Searched, crowbar visible but not taken
    conditions: [
      { type: 'FLAG', flag: 'tire_pile_searched' }
    ],
    success: {
      message: 'The tires are scattered. You can see the crowbar wedged in the gap.'
    }
  },
  {
    // State 1: Not yet searched
    conditions: [],
    success: {
      message: 'Old tires stacked haphazardly. Something might be hidden underneath.'
    }
  }
],
onSearch: [
  {
    conditions: [
      { type: 'NO_FLAG', flag: 'tire_pile_searched' }
    ],
    success: {
      message: 'You pull at the tires, shifting them aside. In the gap underneath: a crowbar.',
      effects: [
        { type: 'REVEAL_FROM_PARENT', entityId: 'item_crowbar', parentId: 'obj_tire_pile' },
        { type: 'SET_FLAG', flag: 'tire_pile_searched', value: true }
      ]
    }
  },
  {
    conditions: [],
    success: {
      message: 'You already found the crowbar. Nothing else hidden here.'
    }
  }
]
```

**Key points**:
- Examine handler shows different descriptions based on state
- Search reveals item and sets flag
- Future examines acknowledge what player did

---

## 5. Common Mistakes & How to Avoid Them

### ❌ MISTAKE 1: Giving Contained Objects Zone Properties

**WRONG**:
```typescript
'obj_suitcase': {
  parentId: 'obj_dumpster',
  zone: 'zone_inside_dumpster',  // ❌ NO! Contained objects should not have zones
}
```

**RIGHT**:
```typescript
'obj_suitcase': {
  parentId: 'obj_dumpster',
  // NO zone property
}

// In location zones:
{
  id: 'zone_inside_dumpster',
  objectIds: ['obj_suitcase' as GameObjectId]  // ✅ List it here instead
}
```

**Why**: Zone property = spatial position. Objects inside containers inherit position from parent through recursive checking.

**How to detect**: If object has BOTH `parentId` AND `zone` → probably wrong (unless it's a navigable sub-zone like dumpster itself).

---

### ❌ MISTAKE 2: Forgetting SET_ZONE in Navigation Handlers

**WRONG**:
```typescript
onClimb: {
  success: {
    message: 'You climb into the dumpster.',
    effects: [
      { type: 'SET_FLAG', flag: 'climbed_dumpster', value: true }
      // ❌ Missing SET_ZONE effect!
    ]
  }
}
```

**RIGHT**:
```typescript
onClimb: {
  success: {
    message: 'You climb into the dumpster.',
    effects: [
      { type: 'SET_FLAG', flag: 'climbed_dumpster', value: true },
      { type: 'SET_ZONE', zoneId: 'zone_inside_dumpster' as ZoneId }  // ✅
    ]
  }
}
```

**Why**: Handler shows narration but player zone doesn't actually change. Items in new zone remain "too far away."

**How to detect**: Navigation works narratively but items in new zone are inaccessible.

---

### ❌ MISTAKE 3: Breaking Parent Chain

**WRONG**:
```typescript
'obj_pocket': {
  // ❌ NO parentId! Chain is broken
  children: { items: ['item_key' as ItemId] }
}
```

**RIGHT**:
```typescript
'obj_pocket': {
  parentId: 'obj_coat' as GameObjectId,  // ✅ Maintains continuous chain
  children: { items: ['item_key' as ItemId] }
}
```

**Why**: Recursive checking walks up the chain. If chain breaks, items become inaccessible even if top-level parent is in zone.

**How to detect**: Item shows "too far away" despite top-level container being in zone. Check if every object in chain has `parentId`.

---

### ❌ MISTAKE 4: Too Many Similar Sub-Objects

**PROBLEM**: Player confusion with name matching

```typescript
// BAD: 3 pockets with similar names
'obj_left_pocket': { name: 'Left Pocket' }
'obj_right_pocket': { name: 'Right Pocket' }
'obj_inner_pocket': { name: 'Inner Pocket' }

// Player types: SEARCH POCKET
// Engine matches all three - confusion!
```

**SOLUTION**: Keep it simple

```typescript
// GOOD: Just one pocket
'obj_pocket': {
  name: 'Pocket',
  alternateNames: ['pocket', 'coat pocket', 'hidden pocket']
}
```

**Why**: Name matching gets ambiguous with many similar items. Players get frustrated.

**Design principle**: If sub-objects don't add gameplay value, merge them into one.

---

### ❌ MISTAKE 5: Non-Recursive Container Checking

**OLD (WRONG)** - ZoneManager before fix:
```typescript
const containerZone = getEntityZone(containerId);
if (containerZone !== currentZone) {
  return { allowed: false };  // ❌ Only checks immediate parent
}
```

**NEW (RIGHT)** - Current ZoneManager:
```typescript
const containerInZone = isContainerInZoneRecursive(
  containerId,
  currentZone,
  location,
  game
);  // ✅ Checks entire parent chain recursively
```

**Why**: With nested containers (4+ levels), immediate parent might not be in zone, but grandparent might be.

**See**: `src/lib/game/engine/ZoneManager.ts` lines 26-54 for implementation.

**This is already fixed in the engine** - just documenting for awareness.

---

### ❌ MISTAKE 6: Using Examine Instead of Search for Reveals

**WRONG**:
```typescript
onExamine: {
  success: {
    message: 'You see items inside',
    effects: [
      { type: 'REVEAL_FROM_PARENT', entityId: 'item_key', parentId: 'obj_box' }  // ❌ Don't reveal in examine
    ]
  }
}
```

**RIGHT**:
```typescript
onExamine: {
  success: {
    message: 'A wooden box. Looks like it contains items.'
  }
},
onSearch: {
  success: {
    message: 'You dig through the box and find a key',
    effects: [
      { type: 'REVEAL_FROM_PARENT', entityId: 'item_key', parentId: 'obj_box' }  // ✅ Reveal in search
    ]
  }
}
```

**Why**:
- EXAMINE = passive observation ("I look at it")
- SEARCH = active investigation ("I dig through it")
- Players expect search to reveal hidden items, not examine

---

### ❌ MISTAKE 7: Forgetting isRevealed: false on Hidden Items

**WRONG**:
```typescript
'item_crowbar': {
  parentId: 'obj_tire_pile',
  // ❌ Missing isRevealed property - item visible immediately!
}
```

**RIGHT**:
```typescript
'item_crowbar': {
  parentId: 'obj_tire_pile',
  revealMethod: 'REVEAL_FROM_PARENT',
  isRevealed: false  // ✅ Hidden until search reveals it
}
```

**Why**: Without `isRevealed: false`, item is visible from the start. Defeats progressive discovery.

---

## 6. Step-by-Step Workflows

### Workflow A: Creating a New Sub-Zone

**EXAMPLE**: Creating "Inside Shipping Container" zone

**STEP 1: Define the zone**
```typescript
{
  id: 'zone_inside_container' as ZoneId,
  parent: 'zone_loading_dock' as ZoneId,
  requiresAction: 'open',
  title: 'Inside Shipping Container',
  transitionNarration: 'You step inside the dark container',
  objectIds: [
    'obj_metal_shelf' as GameObjectId,
    'obj_tarp' as GameObjectId
  ]
}
```

**STEP 2: Create navigation object** (container that defines the zone)
```typescript
'obj_shipping_container': {
  id: 'obj_shipping_container' as GameObjectId,
  zone: 'zone_loading_dock' as ZoneId,  // Container is IN parent zone
  capabilities: { openable: true, lockable: true },
  state: { isOpen: false, isLocked: false },
  handlers: {
    onOpen: {
      success: {
        message: 'You pull open the heavy metal doors. Darkness inside.',
        effects: [
          { type: 'SET_ENTITY_STATE', entityId: 'obj_shipping_container', patch: { isOpen: true } },
          { type: 'SET_ZONE', zoneId: 'zone_inside_container' as ZoneId }  // ✅ Change player zone
        ]
      }
    }
  }
}
```

**STEP 3: Create objects inside the zone**
```typescript
'obj_metal_shelf': {
  id: 'obj_metal_shelf' as GameObjectId,
  parentId: 'obj_shipping_container' as GameObjectId,
  // NO zone property
  children: {
    items: ['item_police_badge' as ItemId]
  }
}
```

**STEP 4: Validation**
- ☐ Zone has unique ID
- ☐ Parent zone exists
- ☐ requiresAction matches handler (requiresAction: 'open' → onOpen handler)
- ☐ Navigation object includes SET_ZONE effect
- ☐ Objects in objectIds exist and have correct parentId
- ☐ NO objects in objectIds have zone property

---

### Workflow B: Creating Nested Containers (4+ Levels)

**EXAMPLE**: Creating key → lockbox → safe → desk → office

**STEP 1: Design the hierarchy** (bottom-up)
```
zone_office
  └─ obj_desk (in objectIds)
      └─ obj_safe (parentId: desk)
          └─ obj_lockbox (parentId: safe)
              └─ item_key (parentId: lockbox)
```

**STEP 2: Create items/objects from deepest to shallowest**

```typescript
// ============================================================
// LEVEL 4: Key (deepest)
// ============================================================
'item_key': {
  id: 'item_key' as ItemId,
  parentId: 'obj_lockbox' as GameObjectId,
  revealMethod: 'REVEAL_FROM_PARENT',
  isRevealed: false
}

// ============================================================
// LEVEL 3: Lockbox (contains key)
// ============================================================
'obj_lockbox': {
  id: 'obj_lockbox' as GameObjectId,
  parentId: 'obj_safe' as GameObjectId,
  revealMethod: 'REVEAL_FROM_PARENT',
  isRevealed: false,
  capabilities: { openable: true },
  state: { isOpen: false },
  children: {
    items: ['item_key' as ItemId]
  },
  handlers: {
    onOpen: {
      success: {
        effects: [
          { type: 'SET_ENTITY_STATE', entityId: 'obj_lockbox', patch: { isOpen: true } }
        ]
      }
    },
    onSearch: {
      success: {
        message: 'Inside the lockbox: a small brass key',
        effects: [
          { type: 'REVEAL_FROM_PARENT', entityId: 'item_key', parentId: 'obj_lockbox' }
        ]
      }
    }
  }
}

// ============================================================
// LEVEL 2: Safe (contains lockbox)
// ============================================================
'obj_safe': {
  id: 'obj_safe' as GameObjectId,
  parentId: 'obj_desk' as GameObjectId,
  revealMethod: 'REVEAL_FROM_PARENT',
  isRevealed: false,
  capabilities: { openable: true },
  state: { isOpen: false },
  children: {
    objects: ['obj_lockbox' as GameObjectId]
  },
  handlers: {
    onSearch: {
      success: {
        message: 'Inside the safe: a small lockbox',
        effects: [
          { type: 'REVEAL_FROM_PARENT', entityId: 'obj_lockbox', parentId: 'obj_safe' }
        ]
      }
    }
  }
}

// ============================================================
// LEVEL 1: Desk (top level, in zone objectIds)
// ============================================================
'obj_desk': {
  id: 'obj_desk' as GameObjectId,
  // NO parentId (top level)
  // NO zone property (listed in objectIds)
  children: {
    objects: ['obj_safe' as GameObjectId]
  },
  handlers: {
    onSearch: {
      success: {
        message: 'Under the desk: a hidden safe',
        effects: [
          { type: 'REVEAL_FROM_PARENT', entityId: 'obj_safe', parentId: 'obj_desk' }
        ]
      }
    }
  }
}
```

**STEP 3: Add to zone**
```typescript
{
  id: 'zone_office' as ZoneId,
  objectIds: ['obj_desk' as GameObjectId]  // ✅ Only top-level!
}
```

**STEP 4: Verify chain integrity**
- ☐ Every child has `parentId` pointing to immediate parent
- ☐ Every parent lists child in `children.items` or `children.objects`
- ☐ Only top-level object (desk) in `zone.objectIds`
- ☐ All hidden objects have `isRevealed: false`
- ☐ All use `REVEAL_FROM_PARENT` in search handlers

**Player experience**:
```
SEARCH DESK → reveals safe
OPEN SAFE
SEARCH SAFE → reveals lockbox
OPEN LOCKBOX
SEARCH LOCKBOX → reveals key
TAKE KEY → ✅ Works (recursive check: lockbox → safe → desk → zone)
```

---

### Workflow C: Adding Progressive Discovery to Existing Object

**EXAMPLE**: Make tire pile hide crowbar instead of showing it immediately

**BEFORE**:
```typescript
'obj_tire_pile': {
  children: {
    items: ['item_crowbar' as ItemId]
  }
}

'item_crowbar': {
  parentId: 'obj_tire_pile'
  // NO isRevealed property - visible immediately!
}
```

**AFTER**:
```typescript
'obj_tire_pile': {
  children: {
    items: ['item_crowbar' as ItemId]
  },
  handlers: {
    onSearch: [
      {
        conditions: [
          { type: 'NO_FLAG', flag: 'tire_pile_searched' }
        ],
        success: {
          message: 'You pull at the tires, shifting them aside. In the gap: a crowbar.',
          effects: [
            { type: 'REVEAL_FROM_PARENT', entityId: 'item_crowbar', parentId: 'obj_tire_pile' },
            { type: 'SET_FLAG', flag: 'tire_pile_searched', value: true }
          ]
        }
      },
      {
        conditions: [],
        success: {
          message: 'You already found the crowbar. Nothing else here.'
        }
      }
    ]
  }
}

'item_crowbar': {
  parentId: 'obj_tire_pile',
  revealMethod: 'REVEAL_FROM_PARENT',  // ✅ Add this
  isRevealed: false  // ✅ Add this
}
```

**Changes needed**:
1. Add `isRevealed: false` to hidden item
2. Add `revealMethod: 'REVEAL_FROM_PARENT'` to hidden item
3. Add search handler to parent with `REVEAL_FROM_PARENT` effect
4. Add flag to prevent re-revealing

---

## 7. Validation Checklist

### Before Baking Cartridge

Run through this checklist to catch errors:

#### Zone Structure
- ☐ All zones have unique IDs
- ☐ Parent zones exist (if `parent` specified)
- ☐ At least one zone has `isDefault: true`
- ☐ All `objectIds` reference objects that exist
- ☐ `requiresAction` matches handler type (e.g., 'climb' → onClimb exists)

#### Objects
- ☐ Objects with `zone` property are NOT in another object's `children`
- ☐ Objects in `zone.objectIds` exist
- ☐ All `parentId` references point to existing objects
- ☐ No circular parent references (A → B → A)
- ☐ All objects in `zone.objectIds` have NO `zone` property (or are navigation objects)

#### Containers
- ☐ Containers have `container: true` capability
- ☐ Children are listed in `children.items` or `children.objects`
- ☐ Children have matching `parentId`
- ☐ All hidden children have `isRevealed: false`
- ☐ All hidden children have `revealMethod: 'REVEAL_FROM_PARENT'`

#### Navigation
- ☐ Navigation handlers include `SET_ZONE` effect
- ☐ `SET_ZONE` points to valid zone ID
- ☐ Zone transitions have narration (in zone or handler)
- ☐ `requiresAction` matches handler name

#### Progressive Discovery
- ☐ Search handlers use `REVEAL_FROM_PARENT` effects
- ☐ Hidden items have `isRevealed: false`
- ☐ Handlers check conditions before revealing (NO_FLAG, STATE)
- ☐ Subsequent search handlers provide different message

#### Parent Chains
- ☐ All nested items/objects have continuous parentId chain
- ☐ Top-level parent is in zone.objectIds
- ☐ No broken chains (missing parentId in middle)

---

## 8. Troubleshooting Guide

### Problem: "Item too far away" despite being in correct zone

**SYMPTOMS**:
- Player in zone_inside_dumpster
- Item (tiny key) shows "too far away" error
- Top-level container (backpack) IS in zone.objectIds

**CAUSES**:
1. Item's parent container not in zone.objectIds
2. Parent chain broken (missing parentId)
3. Engine not using recursive checking (old bug)

**DEBUGGING**:
```typescript
// Check the parent chain:
item_tiny_key.parentId → 'obj_pocket' ✓
obj_pocket.parentId → 'obj_coat' ✓
obj_coat.parentId → 'obj_backpack' ✓
obj_backpack in zone.objectIds → YES ✓

// Chain is complete!
```

**SOLUTION**:
1. Verify zone.objectIds includes top-level container (backpack)
2. Verify parent chain is continuous (no missing parentIds)
3. Ensure ZoneManager uses `isContainerInZoneRecursive()` (should already be fixed)

**Verify fix**:
- Check `src/lib/game/engine/ZoneManager.ts` line 115-121
- Should call `isContainerInZoneRecursive()` not direct zone check

---

### Problem: Zone navigation works narratively but items still inaccessible

**SYMPTOMS**:
- CLIMB DUMPSTER shows success message
- But items inside still show "too far away"
- Player zone didn't actually change

**CAUSE**: Handler missing `SET_ZONE` effect

**DEBUGGING**:
```typescript
// Check handler effects:
onClimb: {
  effects: [
    { type: 'SET_FLAG', flag: 'climbed', value: true }
    // ❌ No SET_ZONE effect!
  ]
}
```

**SOLUTION**: Add SET_ZONE effect
```typescript
onClimb: {
  effects: [
    { type: 'SET_FLAG', flag: 'climbed', value: true },
    { type: 'SET_ZONE', zoneId: 'zone_inside_dumpster' }  // ✅ Add this
  ]
}
```

---

### Problem: Items not revealed after searching container

**SYMPTOMS**:
- SEARCH BOX shows message "You find items"
- But items don't appear in inventory or examine
- No items listed when you LOOK

**CAUSES**:
1. Missing `REVEAL_FROM_PARENT` effect
2. Wrong parentId in effect
3. Condition preventing handler from firing
4. Item missing `isRevealed: false` in definition

**DEBUGGING**:
```typescript
// Check handler:
onSearch: {
  success: {
    message: 'You find items',
    effects: []  // ❌ No REVEAL_FROM_PARENT effects!
  }
}

// Check item:
'item_crowbar': {
  parentId: 'obj_box',
  // ❌ Missing isRevealed: false
}
```

**SOLUTION**:
```typescript
onSearch: {
  success: {
    message: 'You find a crowbar',
    effects: [
      { type: 'REVEAL_FROM_PARENT', entityId: 'item_crowbar', parentId: 'obj_box' }  // ✅ Add this
    ]
  }
}

'item_crowbar': {
  parentId: 'obj_box',
  revealMethod: 'REVEAL_FROM_PARENT',
  isRevealed: false  // ✅ Add this
}
```

---

### Problem: Search reveals items every time (duplicates)

**SYMPTOMS**:
- First SEARCH BOX → "You find crowbar"
- Second SEARCH BOX → "You find crowbar" (again!)
- Items duplicate in visible list

**CAUSE**: Missing flag to track search completion

**DEBUGGING**:
```typescript
onSearch: {
  success: {
    effects: [
      { type: 'REVEAL_FROM_PARENT', entityId: 'item_crowbar', parentId: 'obj_box' }
      // ❌ No flag set - will reveal every time
    ]
  }
}
```

**SOLUTION**: Add conditional handler with flag
```typescript
onSearch: [
  {
    conditions: [
      { type: 'NO_FLAG', flag: 'box_searched' }  // ✅ Only first time
    ],
    success: {
      message: 'You find a crowbar',
      effects: [
        { type: 'REVEAL_FROM_PARENT', entityId: 'item_crowbar', parentId: 'obj_box' },
        { type: 'SET_FLAG', flag: 'box_searched', value: true }  // ✅ Prevent re-reveal
      ]
    }
  },
  {
    conditions: [],  // Default - already searched
    success: {
      message: 'Nothing else in the box.'
    }
  }
]
```

---

### Problem: Container shows as closed after breaking it

**SYMPTOMS**:
- BREAK BACKPACK → "You tear it open"
- OPEN BACKPACK → "The zipper is broken, can't open it"
- Items inside still not accessible

**CAUSE**: `onBreak` handler doesn't set `isOpen: true`

**DEBUGGING**:
```typescript
onBreak: {
  success: {
    message: 'You tear the bag open',
    effects: [
      { type: 'SET_ENTITY_STATE', entityId: 'obj_backpack', patch: { isBroken: true } }
      // ❌ Sets isBroken but not isOpen!
    ]
  }
}
```

**SOLUTION**: Set `isOpen: true` instead (or in addition)
```typescript
onBreak: {
  success: {
    message: 'You tear the bag open',
    effects: [
      { type: 'SET_ENTITY_STATE', entityId: 'obj_backpack', patch: { isOpen: true } }  // ✅ Set isOpen
    ]
  }
}
```

**Why**: ZoneManager checks `isOpen` to determine if container contents are accessible. `isBroken` is just flavor.

---

### Problem: Name matching confusion (multiple similar objects)

**SYMPTOMS**:
- SEARCH POCKET → matches left pocket
- SEARCH INNER POCKET → still matches left pocket
- Player frustrated, can't access specific pocket

**CAUSE**: Too many objects with "pocket" in name

**DEBUGGING**:
```
'obj_left_pocket': { name: 'Left Pocket', alternateNames: ['left pocket', 'pocket'] }
'obj_right_pocket': { name: 'Right Pocket', alternateNames: ['right pocket', 'pocket'] }
'obj_inner_pocket': { name: 'Inner Pocket', alternateNames: ['inner pocket', 'pocket'] }

// All have "pocket" - name matching gets confused
```

**SOLUTION**: Simplify to one pocket
```typescript
// REMOVE left_pocket and right_pocket
// KEEP only one:
'obj_pocket': {
  name: 'Pocket',
  alternateNames: ['pocket', 'coat pocket', 'hidden pocket']
}
```

**Design principle**: If similar sub-objects don't add gameplay value, merge into one.

---

## Appendix: Reference Examples

### Example 1: Complete Dumpster Zone (Chapter 1)

**Zone hierarchy**:
```
zone_street (default)
  └─ zone_alley
      └─ zone_at_dumpster
          └─ zone_inside_dumpster (requiresAction: 'climb')
```

**Zone definitions**:
```typescript
zones: [
  {
    id: 'zone_street' as ZoneId,
    title: 'Elm Street',
    isDefault: true,
    objectIds: []
  },
  {
    id: 'zone_alley' as ZoneId,
    parent: 'zone_street' as ZoneId,
    title: 'Side Alley',
    transitionNarration: 'You move into the narrow side alley',
    objectIds: ['obj_dumpster' as GameObjectId, 'obj_tire_pile' as GameObjectId]
  },
  {
    id: 'zone_at_dumpster' as ZoneId,
    parent: 'zone_alley' as ZoneId,
    title: 'At the Dumpster',
    objectIds: []
  },
  {
    id: 'zone_inside_dumpster' as ZoneId,
    parent: 'zone_at_dumpster' as ZoneId,
    requiresAction: 'climb',
    title: 'Inside the Dumpster',
    transitionNarration: 'You climb into the dumpster, surrounded by garbage',
    objectIds: [
      'obj_old_suitcase' as GameObjectId,
      'obj_paper_carton' as GameObjectId,
      'obj_backpack' as GameObjectId
    ]
  }
]
```

**Navigation object (dumpster)**:
```typescript
'obj_dumpster': {
  id: 'obj_dumpster' as GameObjectId,
  zone: 'zone_at_dumpster' as ZoneId,
  capabilities: { openable: true, container: true },
  handlers: {
    onClimb: {
      success: {
        message: 'You climb into the dumpster...',
        effects: [
          { type: 'SET_FLAG', flag: 'dumpster_climbed', value: true },
          { type: 'SET_ZONE', zoneId: 'zone_inside_dumpster' as ZoneId }
        ]
      }
    }
  }
}
```

**Nested containers (4 levels deep)**:
```
obj_backpack (in objectIds)
  └─ obj_coat (parentId: backpack)
      └─ obj_pocket (parentId: coat)
          └─ item_tiny_key (parentId: pocket)
```

**Key accessibility flow**:
1. Player in zone_inside_dumpster
2. SEARCH BACKPACK → reveals coat
3. SEARCH COAT → reveals pocket
4. SEARCH POCKET → reveals key
5. TAKE KEY → ✅ Works (recursive: pocket → coat → backpack → zone)

---

### Example 2: Tire Pile (Simple Progressive Discovery)

```typescript
'obj_tire_pile': {
  id: 'obj_tire_pile' as GameObjectId,
  children: {
    items: ['item_crowbar' as ItemId]
  },
  handlers: {
    onExamine: [
      {
        conditions: [
          { type: 'HAS_ITEM', itemId: 'item_crowbar' }
        ],
        success: {
          message: 'Tires scattered where you moved them. Crowbar gone—you took it.'
        }
      },
      {
        conditions: [
          { type: 'FLAG', flag: 'tire_pile_searched' }
        ],
        success: {
          message: 'Tires shifted aside. Crowbar visible in the gap.'
        }
      },
      {
        conditions: [],
        success: {
          message: 'Old tires stacked haphazardly. Something might be hidden underneath.'
        }
      }
    ],
    onSearch: [
      {
        conditions: [
          { type: 'NO_FLAG', flag: 'tire_pile_searched' }
        ],
        success: {
          message: 'You pull at the tires. In the gap: a crowbar.',
          effects: [
            { type: 'REVEAL_FROM_PARENT', entityId: 'item_crowbar', parentId: 'obj_tire_pile' },
            { type: 'SET_FLAG', flag: 'tire_pile_searched', value: true }
          ]
        }
      },
      {
        conditions: [],
        success: {
          message: 'You already found the crowbar. Nothing else here.'
        }
      }
    ]
  }
}

'item_crowbar': {
  id: 'item_crowbar' as ItemId,
  parentId: 'obj_tire_pile' as GameObjectId,
  revealMethod: 'REVEAL_FROM_PARENT',
  isRevealed: false
}
```

**Player experience**:
1. EXAMINE TIRE PILE → "Something might be hidden"
2. SEARCH TIRE PILE → Reveals crowbar
3. EXAMINE TIRE PILE → "Crowbar visible in gap"
4. TAKE CROWBAR
5. EXAMINE TIRE PILE → "Crowbar gone—you took it"

---

### Example 3: Suitcase (Locked Container with Item Usage)

```typescript
'obj_old_suitcase': {
  id: 'obj_old_suitcase' as GameObjectId,
  capabilities: { openable: true, lockable: true, container: true },
  state: { isOpen: false, isLocked: true },
  children: {
    items: [
      'item_picture_frame' as ItemId,
      'item_candle' as ItemId,
      'item_box_cutter' as ItemId
    ]
  },
  handlers: {
    onOpen: [
      {
        conditions: [
          { type: 'STATE', entityId: 'obj_old_suitcase', key: 'isLocked', equals: true }
        ],
        success: {
          message: 'The suitcase is locked. You need a key.'
        }
      },
      {
        conditions: [],
        success: {
          message: 'You open the suitcase.',
          effects: [
            { type: 'SET_ENTITY_STATE', entityId: 'obj_old_suitcase', patch: { isOpen: true } }
          ]
        }
      }
    ],
    onUse: [
      {
        itemId: 'item_tiny_silver_key',
        conditions: [
          { type: 'STATE', entityId: 'obj_old_suitcase', key: 'isLocked', equals: true }
        ],
        success: {
          message: 'You insert the tiny key. Click. The lock releases.',
          effects: [
            { type: 'SET_ENTITY_STATE', entityId: 'obj_old_suitcase', patch: { isLocked: false } }
          ]
        }
      }
    ],
    onSearch: [
      {
        conditions: [
          { type: 'STATE', entityId: 'obj_old_suitcase', key: 'isOpen', equals: false }
        ],
        success: {
          message: 'The suitcase is closed. Open it first.'
        }
      },
      {
        conditions: [
          { type: 'NO_FLAG', flag: 'suitcase_searched' }
        ],
        success: {
          message: 'Inside: picture frame, candle, box cutter',
          effects: [
            { type: 'REVEAL_FROM_PARENT', entityId: 'item_picture_frame', parentId: 'obj_old_suitcase' },
            { type: 'REVEAL_FROM_PARENT', entityId: 'item_candle', parentId: 'obj_old_suitcase' },
            { type: 'REVEAL_FROM_PARENT', entityId: 'item_box_cutter', parentId: 'obj_old_suitcase' },
            { type: 'SET_FLAG', flag: 'suitcase_searched', value: true }
          ]
        }
      },
      {
        conditions: [],
        success: {
          message: 'Nothing else in the suitcase.'
        }
      }
    ]
  }
}
```

**Player flow**:
1. EXAMINE SUITCASE → "Locked. You need a key"
2. (Find tiny key in coat pocket)
3. USE KEY ON SUITCASE → "Lock releases"
4. OPEN SUITCASE → "You open it"
5. SEARCH SUITCASE → Reveals 3 items
6. TAKE ITEMS

---

## Summary

**Core Workflow**:
1. Design zone hierarchy (parent → child relationships)
2. Create zones with proper parent references
3. Create objects from bottom-up (deepest first)
4. Set parentId on every child
5. List ONLY top-level objects in zone.objectIds
6. Add SET_ZONE to navigation handlers
7. Use REVEAL_FROM_PARENT for progressive discovery
8. Set isRevealed: false on hidden items
9. Validate with checklist
10. Test complete flow

**Golden Rules**:
- Zone property = spatial position (only on navigation objects)
- Parent chains must be continuous (no gaps)
- Only top-level containers in zone.objectIds
- Navigation handlers MUST include SET_ZONE
- Hidden items MUST have isRevealed: false
- Use REVEAL_FROM_PARENT for discovery

**When in doubt**: Reference the dumpster zone (Chapter 1) as canonical example.

---

**END OF COOKBOOK**
