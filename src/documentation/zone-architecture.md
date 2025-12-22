# Zone Architecture - Spatial Navigation System

**Created**: 2025-12-18
**Status**: ✅ Fully Implemented (Chapter 1)
**Critical System Documentation**

---

## Overview

The Zone Architecture is a **spatial navigation system** that enables realistic detective-style gameplay where players must physically move through crime scenes step-by-step. This system replaces the previous scattered focus-based navigation with a clean, hierarchical zone structure.

### The Core Problem It Solves

**Before:** Players could access distant objects without moving to them, breaking immersion in detective gameplay.

**After:** Players must navigate through spatial zones (street → alley → dumpster) to access objects, creating realistic investigation flow.

---

## 🎯 Core Concepts

### Zone vs Focus (Two-Layer System)

The architecture uses **TWO separate but complementary systems**:

| System | Purpose | Example | Mandatory? |
|--------|---------|---------|------------|
| **Zone** | WHERE you are physically | `zone_at_dumpster` | ✅ Yes (for sprawling locations) |
| **Focus** | WHAT you're examining closely | `obj_trash_bag` | ❌ Optional (attention layer) |

**Example Flow:**
1. Player starts at `zone_street_overview` (WHERE)
2. Player does: `GO TO ALLEY` → moves to `zone_side_alley` (WHERE changes)
3. Player does: `EXAMINE DUMPSTER` → focuses on `obj_dumpster` (WHAT changes)
4. Player is now: **Zone** = `zone_side_alley`, **Focus** = `obj_dumpster`

**Key Insight:** You can be in one zone and focus on different objects within that zone. Zone controls accessibility, focus controls attention.

---

## 📐 Architecture

### 1. Zone Structure (in Cartridge)

Zones are defined in `Location.zones`:

```typescript
zones: [
  {
    id: 'zone_street_overview' as ZoneId,
    isDefault: true,                    // Starting zone for this location
    parent?: ZoneId,                    // Parent zone in hierarchy (none for root)
    title: 'Street Overview',          // Display name
    description?: string,               // Optional description
    objectIds: GameObjectId[],         // Objects in this zone
    transitionNarration?: string,      // Message when entering zone
    requiresAction?: string            // Special action needed (e.g., 'climb')
  },
  {
    id: 'zone_side_alley' as ZoneId,
    parent: 'zone_street_overview',    // Must be in street to access alley
    title: 'Side Alley',
    objectIds: ['obj_side_alley'],
    transitionNarration: 'You step into the narrow alley...'
  },
  {
    id: 'zone_inside_dumpster' as ZoneId,
    parent: 'zone_at_dumpster',
    title: 'Inside the Dumpster',
    objectIds: ['obj_trash_bag', 'obj_pants', 'obj_shoes'],
    requiresAction: 'climb',           // Can't "go to" - must use CLIMB
    transitionNarration: 'You climb into the dumpster...'
  }
]
```

### 2. Entity Zone Assignment

Every game entity (object/item/NPC) has a `zone` property:

```typescript
// Objects
'obj_dumpster': {
  id: 'obj_dumpster',
  name: 'Dumpster',
  zone: 'zone_at_dumpster' as ZoneId,  // Which zone it's in
  // ...
}

// Items
'item_crowbar': {
  id: 'item_crowbar',
  name: 'Crowbar',
  zone: 'zone_at_dumpster' as ZoneId,  // Initial placement
  // After taken → zone ignored, accessible from inventory
}

// NPCs
'npc_vagrant': {
  id: 'npc_vagrant',
  name: 'Vagrant',
  zone: 'zone_inside_dumpster' as ZoneId,  // Must be in zone to talk
}

// Personal Equipment (always accessible)
'item_player_phone': {
  id: 'item_player_phone',
  name: 'Phone',
  zone: 'personal',  // Special value = always accessible
}
```

### 3. Player State

Player's current zone is tracked in `PlayerState`:

```typescript
{
  currentLocationId: 'loc_street',
  currentZoneId: 'zone_at_dumpster',     // NEW: WHERE player is
  currentFocusId: 'obj_trash_bag',       // EXISTING: WHAT player examines
  focusType: 'object',
  inventory: [...],
  // ...
}
```

---

## 🔒 Access Control (ZoneManager)

### Central Validation: `ZoneManager.canAccess()`

**Single source of truth** for all access decisions. Every action handler calls this:

```typescript
const { ZoneManager } = await import('@/lib/game/engine');
const accessCheck = ZoneManager.canAccess(
  targetId,      // 'obj_pants'
  targetType,    // 'object'
  state,         // Current player state
  game           // Game data
);

if (!accessCheck.allowed) {
  return [{
    type: 'SHOW_MESSAGE',
    content: accessCheck.reason  // "The pants are too far away. Try: GO TO DUMPSTER"
  }];
}
```

### Access Rules (Priority Order)

ZoneManager applies these rules **in order**:

1. **Inventory items** → ✅ Always accessible (you're carrying them)
2. **Personal equipment** (`zone: 'personal'`) → ✅ Always accessible (phone, badge)
3. **No zone system in location** → ✅ Allow (Chapter 0 compatibility)
4. **Target in current zone** → ✅ Accessible
5. **Item in open container in current zone** → ✅ Accessible
6. **Target in different zone** → ❌ Not accessible (show navigation hint)

### Navigation Validation: `ZoneManager.canNavigateToZone()`

Controls zone-to-zone movement based on spatial hierarchy:

```typescript
const canNavigate = ZoneManager.canNavigateToZone(
  targetZoneId,    // 'zone_inside_dumpster'
  currentZoneId,   // 'zone_street_overview'
  location         // Location data
);

// Returns: { allowed: false, reason: "You need to go to At the Dumpster first" }
```

**Navigation Rules:**
- **Compact mode** (`spatialMode: 'compact'`): Can navigate to any zone directly
- **Sprawling mode** (`spatialMode: 'sprawling'`):
  - Can navigate to **direct children** of current zone
  - Can navigate **back to parent** zone
  - Can navigate to **sibling zones** (same parent)
  - **Cannot skip levels** in hierarchy

**Example Hierarchy:**
```
zone_street_overview (root)
├─ zone_side_alley (child)
│  └─ zone_at_dumpster (grandchild)
│     └─ zone_inside_dumpster (great-grandchild, requiresAction: 'climb')
```

**Valid Navigation:**
- From `street_overview` → `side_alley` ✅ (direct child)
- From `side_alley` → `at_dumpster` ✅ (direct child)
- From `at_dumpster` → `side_alley` ✅ (back to parent)
- From `street_overview` → `at_dumpster` ❌ (skipping level - must go through alley first)
- From `street_overview` → `inside_dumpster` ❌ (requires special action 'climb')

---

## 🎮 Player Commands

### Navigation Commands

**Primary:**
- `GO TO [zone/object]` - Navigate to a zone (by zone name or object in zone)
- `CLIMB [object]` - Enter zones requiring special action

**Examples:**
```
> GO TO ALLEY
You step into the side alley...
[Zone changes to: zone_side_alley]

> GO TO DUMPSTER
You approach the large dumpster.
[Zone changes to: zone_at_dumpster]

> CLIMB INTO DUMPSTER
You haul yourself up and climb into the dumpster...
[Zone changes to: zone_inside_dumpster]

> EXAMINE PANTS
[Zone check: pants are in zone_inside_dumpster]
[Player is in zone_inside_dumpster]
✅ Access allowed → shows pants description
```

### Out-of-Zone Error Messages

When player tries to access something outside their zone:

```
> EXAMINE PANTS
(Player in zone_street_overview, pants in zone_inside_dumpster)

❌ "The Pants are too far away. Try: GO TO INSIDE THE DUMPSTER"
```

---

## 🏗️ Implementation Files

### Core Components

| File | Purpose |
|------|---------|
| `src/lib/game/types.ts` | Type definitions (`ZoneId`, `Zone`, zone properties) |
| `src/lib/game/engine/ZoneManager.ts` | **Central access validation** |
| `src/lib/game/engine/GameStateManager.ts` | State management (SET_ZONE effect) |
| `src/lib/game-state.ts` | Initial state (sets starting zone) |
| `src/lib/game/actions/handle-go.ts` | **Zone-based navigation** |
| `src/lib/game/actions/handle-examine.ts` | Zone access check |
| `src/lib/game/actions/handle-take.ts` | Zone access check |

### Type Definitions

```typescript
// src/lib/game/types.ts

export type ZoneId = string & { readonly __brand: 'ZoneId' };

export type Zone = {
  id: ZoneId;
  isDefault?: boolean;
  parent?: ZoneId;
  title: string;
  description?: string;
  objectIds: GameObjectId[];
  transitionNarration?: string;
  requiresAction?: string;
};

export type Location = {
  locationId: LocationId;
  zones?: Zone[];  // NEW: Explicit zone definitions
  spatialMode?: 'compact' | 'sprawling';  // Controls navigation strictness
  // ...
};

export type PlayerState = {
  currentZoneId?: ZoneId;  // NEW: WHERE player is
  currentFocusId?: string;  // EXISTING: WHAT player examines
  // ...
};

export type GameObject = {
  id: GameObjectId;
  zone?: ZoneId | 'personal';  // NEW: Which zone object is in
  // ...
};

export type Item = {
  id: ItemId;
  zone?: ZoneId | 'personal';  // NEW: Initial zone (ignored after taken)
  // ...
};

export type NPC = {
  id: NpcId;
  zone?: ZoneId;  // NEW: Which zone NPC is in
  // ...
};
```

### Effects

```typescript
// NEW effect for zone navigation
{ type: 'SET_ZONE'; zoneId: ZoneId; transitionMessage?: string }

// Processed by GameStateManager:
case 'SET_ZONE':
  newState.currentZoneId = effect.zoneId;
  // Shows transition message if provided
  break;
```

---

## 🔄 Migration Guide

### For New Cartridges (Chapter 1+)

**Step 1:** Define zones in location:

```typescript
locations: {
  'loc_crime_scene': {
    locationId: 'loc_crime_scene',
    name: 'Crime Scene',
    spatialMode: 'sprawling',  // Enable step-by-step navigation
    zones: [
      {
        id: 'zone_entrance' as ZoneId,
        isDefault: true,  // Starting zone
        title: 'Entrance',
        objectIds: ['obj_door', 'obj_security_desk']
      },
      {
        id: 'zone_main_room' as ZoneId,
        parent: 'zone_entrance',
        title: 'Main Room',
        objectIds: ['obj_desk', 'obj_bookshelf'],
        transitionNarration: 'You step into the main room...'
      }
    ],
    // ...
  }
}
```

**Step 2:** Add zone property to all entities:

```typescript
gameObjects: {
  'obj_desk': {
    id: 'obj_desk',
    zone: 'zone_main_room' as ZoneId,  // ← Add this
    // ...
  }
}

items: {
  'item_key': {
    id: 'item_key',
    zone: 'zone_main_room' as ZoneId,  // ← Add this (initial placement)
    // ...
  }
}

npcs: {
  'npc_receptionist': {
    id: 'npc_receptionist',
    zone: 'zone_entrance' as ZoneId,  // ← Add this
    // ...
  }
}
```

**Step 3:** Mark personal equipment:

```typescript
'item_phone': {
  id: 'item_phone',
  zone: 'personal',  // ← Special marker for always-accessible items
  // ...
}
```

### For Existing Cartridges (Chapter 0)

**No changes required!** The system auto-detects missing zones and provides full backward compatibility:

- `ZoneManager.canAccess()` returns `allowed: true` if no zones defined
- `GameStateManager` skips zone initialization if `location.zones` is empty
- All existing gameplay continues working unchanged

---

## 🎨 Design Patterns

### Pattern 1: Linear Progression

```typescript
// Crime scene with linear progression
zones: [
  { id: 'zone_outside', isDefault: true, parent: null },
  { id: 'zone_hallway', parent: 'zone_outside' },
  { id: 'zone_bedroom', parent: 'zone_hallway' },
  { id: 'zone_closet', parent: 'zone_bedroom' }
]
```

Player must progress: outside → hallway → bedroom → closet

### Pattern 2: Hub and Spokes

```typescript
// Central area with multiple accessible zones
zones: [
  { id: 'zone_plaza', isDefault: true, parent: null },       // Hub
  { id: 'zone_cafe', parent: 'zone_plaza' },                // Spoke 1
  { id: 'zone_shop', parent: 'zone_plaza' },                // Spoke 2
  { id: 'zone_alley', parent: 'zone_plaza' }                // Spoke 3
]
```

Player can go: plaza → cafe, plaza → shop, plaza → alley (any order)

### Pattern 3: Special Entry

```typescript
zones: [
  { id: 'zone_outside', isDefault: true },
  {
    id: 'zone_inside_container',
    parent: 'zone_outside',
    requiresAction: 'climb',  // Can't use GO TO - must CLIMB
    transitionNarration: 'You squeeze through the opening...'
  }
]
```

Player must use specific command: `CLIMB CONTAINER` (not `GO TO CONTAINER`)

---

## 🧪 Testing Checklist

When implementing zones in a new cartridge:

- [ ] Define all zones with proper hierarchy (parent relationships)
- [ ] Set one zone as `isDefault: true`
- [ ] Add `zone` property to all objects in location
- [ ] Add `zone` property to all items in location (initial placement)
- [ ] Add `zone` property to all NPCs in location
- [ ] Mark personal equipment with `zone: 'personal'`
- [ ] Test navigation: can player reach all zones via proper parent hierarchy?
- [ ] Test accessibility: can player only interact with entities in current zone?
- [ ] Test special actions: zones with `requiresAction` block normal GO TO?
- [ ] Test inventory: items work after being taken regardless of zone?
- [ ] Test error messages: helpful hints when trying to access out-of-zone entities?

---

## 🚀 Performance & Best Practices

### Do's ✅

1. **Keep zone hierarchies shallow** (max 3-4 levels)
2. **Use descriptive zone IDs** (`zone_crime_scene_main_room` not `zone_1`)
3. **Group related objects in zones** (all desk items in `zone_at_desk`)
4. **Mark personal equipment** with `zone: 'personal'`
5. **Use spatialMode: 'compact'** for small, indoor locations (cafe, office)
6. **Use spatialMode: 'sprawling'** for large, outdoor locations (street, park)

### Don'ts ❌

1. **Don't create too many zones** (5-8 per location is ideal)
2. **Don't skip zone property on entities** (breaks access validation)
3. **Don't make NPCs zones** (they're IN zones, not zones themselves)
4. **Don't use zones for purely narrative structure** (use chapters/locations instead)
5. **Don't forget transition narration** (enhances immersion)

---

## 📊 Example: Chapter 1 Implementation

### Zone Hierarchy

```
loc_street (spatialMode: 'sprawling')
├─ zone_street_overview (default)
│  ├─ zone_bus_stop
│  ├─ zone_gray_building
│  ├─ zone_florist
│  ├─ zone_kiosk
│  └─ zone_side_alley
│     └─ zone_at_dumpster
│        └─ zone_inside_dumpster (requiresAction: 'climb')
```

### Full Flow

```
Player starts: zone_street_overview

> GO TO ALLEY
✅ Allowed (direct child of current zone)
→ Now in: zone_side_alley

> GO TO DUMPSTER
✅ Allowed (direct child of current zone)
→ Now in: zone_at_dumpster

> EXAMINE PANTS
❌ "The Pants are too far away. Try: GO TO INSIDE THE DUMPSTER"
(pants in zone_inside_dumpster, player in zone_at_dumpster)

> GO TO INSIDE DUMPSTER
❌ "You need to CLIMB to get there. Try: CLIMB DUMPSTER"
(zone requires special action)

> CLIMB INTO DUMPSTER
✅ Allowed (special action executed)
→ Now in: zone_inside_dumpster

> EXAMINE PANTS
✅ Allowed (same zone)
→ Shows pants description

> TAKE PANTS
✅ Allowed (same zone)
→ Pants added to inventory

> GO TO STREET
✅ Allowed (navigating back to ancestor zone)
→ Now in: zone_street_overview

> EXAMINE PANTS
✅ Allowed (in inventory - zone ignored)
→ Shows pants description
```

---

## 🔗 Related Documentation

- `focus-and-zones.md` - Original focus system (now complementary to zones)
- `handler-resolution-and-media.md` - Handler patterns for zone-specific behaviors
- `engine-features.md` - Effect system including SET_ZONE

---

## 📝 Version History

**2025-12-18:** Initial implementation
- Created Zone architecture
- Implemented ZoneManager for access validation
- Updated all core systems (types, state management, navigation)
- Full Chapter 1 implementation with 8 zones
- Backward compatibility layer for Chapter 0

---

## 🎓 Summary

The Zone Architecture provides:

- ✅ **Realistic spatial navigation** for detective gameplay
- ✅ **Clean separation** of concerns (Zone = WHERE, Focus = WHAT)
- ✅ **Centralized access control** via ZoneManager
- ✅ **Hierarchical zone structure** with parent-child relationships
- ✅ **Flexible navigation modes** (compact vs sprawling)
- ✅ **Full backward compatibility** with existing cartridges
- ✅ **Clear, actionable error messages** for players

**Result:** A robust, immersive spatial navigation system that makes players feel like they're physically moving through crime scenes, approaching evidence, and investigating step-by-step.
