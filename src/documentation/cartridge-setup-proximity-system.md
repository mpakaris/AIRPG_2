# Cartridge Setup: Proximity-Based Navigation System

**Last Updated**: 2025-12-11
**Critical Implementation Guide**

## Overview

The proximity-based navigation system (also called "goto system" or "focus system") is a **CORE GAME MECHANIC** that controls how players move between zones and interact with objects. Players can only interact with objects that are "in proximity"—meaning they must first navigate to an object using `go to`, `goto`, or `move to` commands before they can examine, search, or use it.

This document provides a **step-by-step setup guide** for implementing this system in new cartridges.

---

## Why Proximity Matters

The proximity system creates:
- **Spatial awareness**: Players understand the physical layout of the scene
- **Progressive discovery**: Objects are revealed as players explore different zones
- **Natural pacing**: Investigation feels methodical and realistic
- **Immersive transitions**: Movement includes atmospheric narration

**Example Flow**:
```
Player: "examine bench"
System: "You need to be closer to interact with that. Try: go to bench"

Player: "go to bench"
System: "You move closer to the bench. This is where Lili sat moments before she disappeared."

Player: "examine bench"
System: [Full examination response with details]
```

---

## Automatic Setup Checklist

When creating a new cartridge, follow these steps in order:

### Step 1: Define Location Zones

In your `locations` object, define clear zones that represent different areas within the location.

**Template**:
```typescript
const locations: Record<LocationId, Location> = {
    'loc_your_location': {
        locationId: 'loc_your_location' as LocationId,
        name: 'Location Name',
        sceneDescription: 'Overall scene description...',
        introMessage: 'What players see when they first arrive...',

        // List ALL game objects in this location
        objects: [
            'obj_zone1_main' as GameObjectId,
            'obj_zone1_child' as GameObjectId,
            'obj_zone2_main' as GameObjectId,
            // ... etc
        ],

        // Define spatial zones for organization
        zones: [
            {
                title: 'Zone 1 Name',  // e.g., "Bus Station", "Counter Area"
                objectIds: ['obj_zone1_main', 'obj_zone1_child']
            },
            {
                title: 'Zone 2 Name',
                objectIds: ['obj_zone2_main']
            },
            // ... more zones
        ]
    }
};
```

**Chapter 1 Example**:
```typescript
zones: [
    {
        title: 'Bus Station',
        objectIds: ['obj_bus_stop', 'obj_bench', 'obj_info_board', 'obj_bus_sign']
    },
    {
        title: 'Gray Building',
        objectIds: ['obj_gray_building_door']
    },
    {
        title: 'Florist',
        objectIds: ['obj_florist_shop']
    },
    {
        title: 'Kiosk',
        objectIds: ['obj_kiosk_counter', 'obj_kiosk_drawer']
    },
    {
        title: 'Dark Alley',
        objectIds: ['obj_crates', 'obj_dumpster', 'obj_courtyard_door']
    }
]
```

---

### Step 2: Create Zone Objects with transitionNarration

For **every zone** in your location, create a main object that serves as the navigation target. Each object MUST include a `transitionNarration` field.

**Template**:
```typescript
'obj_zone_name': {
    id: 'obj_zone_name' as GameObjectId,
    name: 'Object Display Name',
    archetype: 'Structure' | 'Furniture' | 'Container' | etc,
    description: 'Static description of the object',

    // CRITICAL: Add transition narration for goto command
    transitionNarration: 'Immersive text shown when player moves to this object',

    capabilities: { /* ... */ },
    state: { /* ... */ },

    // If this object contains other objects/items
    children: {
        items: [],
        objects: ['child_obj_1', 'child_obj_2']
    },

    handlers: { /* ... */ },
    version: { schema: '1.0.0', content: '1.0.0' }
}
```

**Writing Good transitionNarration**:
- Use second person ("You approach...", "You step up to...")
- Include atmospheric details
- Connect to the narrative/investigation
- Keep it brief (1-2 sentences)
- Make it feel like physical movement

**Examples from Chapter 1**:
```typescript
// Zone: Bus Station
transitionNarration: 'You approach the bus stop. The rusted shelter looms ahead—the last place Lili Chen was seen before she vanished.'

// Zone: Florist
transitionNarration: 'You move toward the florist shop. The bright colors and fresh flowers contrast sharply with the grim nature of your investigation.'

// Zone: Dark Alley
transitionNarration: 'You step into the dark alley. The stacked crates loom in the shadows, abandoned and weathered.'

// Zone: Kiosk
transitionNarration: 'You approach the kiosk. The elderly vendor looks up from behind his counter cluttered with newspapers and snacks.'
```

---

### Step 3: Add transitionNarration to Child Objects

If a zone has child objects (objects that belong to a parent), **also add transitionNarration to children**. This allows players to say "go to bench" instead of just "go to bus stop".

**Why This Matters**:
- Players use natural language—they might say "go to drawer" instead of "go to counter"
- The system automatically focuses on the parent but uses the child's transition text
- Creates more flexible, player-friendly navigation

**Example**:
```typescript
// Parent object
'obj_counter': {
    id: 'obj_counter' as GameObjectId,
    name: 'Counter',
    transitionNarration: 'You step up to the counter. The barista glances at you.',
    children: {
        objects: ['obj_drawer', 'obj_coffee_machine']
    }
}

// Child objects also get transitionNarration
'obj_drawer': {
    id: 'obj_drawer' as GameObjectId,
    name: 'Drawer',
    parentId: 'obj_counter' as GameObjectId,
    transitionNarration: 'You lean in closer to examine the drawer behind the counter.',
    // ... rest of object
}

'obj_coffee_machine': {
    id: 'obj_coffee_machine' as GameObjectId,
    name: 'Coffee Machine',
    parentId: 'obj_counter' as GameObjectId,
    transitionNarration: 'You move to the coffee machine at the edge of the counter.',
    // ... rest of object
}
```

**What Happens**:
- Player: "go to drawer"
- System focuses on `obj_counter` (parent)
- System shows: "You lean in closer to examine the drawer behind the counter."
- Player can now interact with all objects on the counter

---

### Step 4: Link Children to Parents

Ensure parent-child relationships are properly defined in **both directions**:

1. **Parent → Children**: Use `children` property
2. **Child → Parent**: Use `parentId` property and `revealMethod`

**Template**:
```typescript
// Parent
'obj_parent': {
    id: 'obj_parent' as GameObjectId,
    children: {
        items: ['item_child1' as ItemId],
        objects: ['obj_child1' as GameObjectId]
    },
    handlers: {
        onExamine: {
            effects: [
                { type: 'REVEAL_FROM_PARENT', entityId: 'obj_child1', parentId: 'obj_parent' },
                { type: 'REVEAL_FROM_PARENT', entityId: 'item_child1', parentId: 'obj_parent' }
            ]
        }
    }
}

// Children
'obj_child1': {
    id: 'obj_child1' as GameObjectId,
    parentId: 'obj_parent' as GameObjectId,
    revealMethod: 'REVEAL_FROM_PARENT',
    transitionNarration: '...',
    // ... rest
}
```

---

### Step 5: Test Navigation Flow

After setting up, test the following scenarios:

**Test Cases**:
1. ✅ "go to [main zone object]" - should work
2. ✅ "go to [child object]" - should focus parent, use child's transition
3. ✅ "examine [object]" before going to it - should prompt to move closer
4. ✅ "go to [same zone twice]" - should say "already there"
5. ❌ "go to [NPC name]" - should fail (NPCs are not zones)
6. ✅ Transition messages are atmospheric and contextual

---

## Technical Implementation Details

### How handle-goto.ts Works

The system is already fully implemented in `src/lib/game/actions/handle-goto.ts`. You don't need to modify this file—just follow the cartridge setup steps above.

**Key Behaviors**:
1. **Local Search First**: Searches current location for target
2. **Global Search**: If not found locally, searches all locations
3. **Parent Focus**: If target is a child, focuses on parent instead
4. **Transition Message**: Uses `transitionNarration` from object
5. **Focus State**: Updates `currentFocusId` in player state
6. **Already There Check**: Prevents redundant movement

**Focus State Fields**:
```typescript
{
    currentFocusId: string | undefined,     // ID of focused object
    focusType: 'object' | 'item' | undefined,
    previousFocusId: string | undefined     // For "go back" functionality
}
```

### Integration with Other Systems

**FocusResolver** (`src/lib/game/engine/FocusResolver.ts`):
- `findEntity()`: Searches with focus awareness
- `getTransitionNarration()`: Gets transition text from object
- `getOutOfFocusMessage()`: Error messages when out of focus

**GameStateManager**:
- Manages focus state via `SET_FOCUS` effect
- Handles `CLEAR_FOCUS` effect
- `getParent()`: Returns parent object ID

---

## Common Patterns

### Pattern 1: Simple Zone (No Children)

```typescript
'obj_door': {
    id: 'obj_door' as GameObjectId,
    name: 'Door',
    archetype: 'Door',
    description: 'A heavy metal door.',
    transitionNarration: 'You walk over to the door.',
    capabilities: { openable: true, lockable: true, /* ... */ },
    // ... rest
}
```

### Pattern 2: Container Zone with Children

```typescript
'obj_counter': {
    id: 'obj_counter' as GameObjectId,
    name: 'Counter',
    transitionNarration: 'You step up to the counter.',
    children: {
        objects: ['obj_drawer', 'obj_machine']
    },
    handlers: {
        onExamine: {
            effects: [
                { type: 'REVEAL_FROM_PARENT', entityId: 'obj_drawer', parentId: 'obj_counter' },
                { type: 'REVEAL_FROM_PARENT', entityId: 'obj_machine', parentId: 'obj_counter' }
            ]
        }
    }
}

'obj_drawer': {
    id: 'obj_drawer' as GameObjectId,
    name: 'Drawer',
    parentId: 'obj_counter' as GameObjectId,
    revealMethod: 'REVEAL_FROM_PARENT',
    transitionNarration: 'You lean in to examine the drawer.',
    // ... rest
}
```

### Pattern 3: Multi-Level Hierarchy

```typescript
// Level 1: Main structure
'obj_bus_stop': {
    transitionNarration: 'You approach the bus stop.',
    children: {
        objects: ['obj_bench', 'obj_info_board']
    }
}

// Level 2: Sub-structures
'obj_info_board': {
    parentId: 'obj_bus_stop' as GameObjectId,
    transitionNarration: 'You step up to the information board.',
    children: {
        objects: ['obj_missing_poster']
    }
}

// Level 3: Details
'obj_missing_poster': {
    parentId: 'obj_info_board' as GameObjectId,
    revealMethod: 'REVEAL_FROM_PARENT',
    // Poster is readable but doesn't need separate focus
}
```

---

## Validation Checklist

Before finalizing your cartridge:

- [ ] Every zone in `location.zones` has a corresponding object
- [ ] Every main zone object has `transitionNarration`
- [ ] Child objects have `transitionNarration`, `parentId`, and `revealMethod`
- [ ] Parent objects list children in `children.objects` or `children.items`
- [ ] Parent handlers include `REVEAL_FROM_PARENT` effects
- [ ] Tested "go to" commands for all zones
- [ ] Transition messages are immersive and contextual
- [ ] NPCs are NOT included as focus targets

---

## Quick Reference

### Commands Players Use
- `go to [object]`
- `goto [object]`
- `move to [object]`
- `approach [object]`

### Required Object Fields
```typescript
{
    id: GameObjectId,
    name: string,
    archetype: string,
    description: string,
    transitionNarration: string,  // ← CRITICAL
    capabilities: { /* ... */ },
    state: { /* ... */ },
    children?: { objects?, items? },
    parentId?: GameObjectId,
    revealMethod?: 'REVEAL_FROM_PARENT',
    handlers: { /* ... */ }
}
```

### Effects for Parent-Child
```typescript
handlers: {
    onExamine: {
        effects: [
            {
                type: 'REVEAL_FROM_PARENT',
                entityId: 'child_id',
                parentId: 'parent_id'
            }
        ]
    }
}
```

---

## Examples from Existing Cartridges

### Chapter 0: Cafe Interior

**Zones**:
- Counter (with drawer, coffee machine)
- Bookshelf (with books, hidden door)
- Stage (with piano, microphone)
- Wall (with painting, wall safe)

**Implementation**:
```typescript
'obj_counter': {
    transitionNarration: 'You step up to the counter. The barista and manager glance at you.',
    children: {
        objects: ['obj_drawer', 'obj_coffee_machine']
    }
}

'obj_bookshelf': {
    transitionNarration: 'You move to the bookshelf. Rows of old books, dust, dim light.',
    children: {
        objects: ['obj_hidden_door', 'item_notebook']
    }
}
```

### Chapter 1: Elm Street

**Zones**:
- Bus Station (with bench, info board, sign)
- Gray Building (with locked door)
- Florist Shop
- Kiosk (with counter, drawer)
- Dark Alley (with crates, dumpster, door)

**Implementation**:
```typescript
'obj_bus_stop': {
    transitionNarration: 'You approach the bus stop. The rusted shelter looms ahead—the last place Lili Chen was seen before she vanished.',
    children: {
        objects: ['obj_bench', 'obj_info_board', 'obj_bus_sign']
    }
}

'obj_bench': {
    parentId: 'obj_bus_stop' as GameObjectId,
    transitionNarration: 'You move closer to the bench. This is where Lili sat moments before she disappeared.',
}
```

---

## Related Documentation

- `focus-and-zones.md` - Deep dive into focus system architecture
- `handler-resolution-and-media.md` - Handler patterns and media resolution
- `game-object-schema.md` - Complete object structure
- `engine-features.md` - Effect types and system features

---

## Version History

**2025-12-11**: Initial documentation
- Created comprehensive cartridge setup guide
- Documented proximity-based navigation system
- Added step-by-step setup process with templates
- Included validation checklist and examples
- Designed for automated cartridge setup
