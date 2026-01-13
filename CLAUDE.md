# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AIRPG_2 is a text-based adventure game (AI-powered RPG) built with Next.js 15, Firebase, and Google Genkit AI. The game uses natural language processing to interpret player commands and generate dynamic narrative responses. It features a hybrid data architecture where game content ("cartridges") is defined in TypeScript but deployed to Firebase Firestore for production.

---

## 🚨 CRITICAL DEVELOPMENT PRINCIPLES

**FULL DETAILS**: See `DEVELOPMENT-PRINCIPLES.md` for complete guidelines.

### The Golden Rule

> **"Will this solution work for 1000 games, or just this one object?"**

If the answer is "just this one object," STOP. Find the global system that needs fixing.

---

### BEFORE Writing ANY Code - Check These First:

#### 1. Valid Types (ALWAYS CHECK FIRST!)
- **Valid Condition Types** (`src/lib/game/types.ts:242`):
  - `FLAG`, `NO_FLAG`, `HAS_FLAG`
  - `HAS_ITEM`, `STATE`, `LOCATION_IS`, `CHAPTER_IS`, `RANDOM_CHANCE`
  - ❌ DO NOT invent new condition types!

- **Valid Effect Types** (`src/lib/game/types.ts:123`):
  - `ADD_ITEM`, `REMOVE_ITEM`, `SET_FLAG`, `REVEAL_FROM_PARENT`
  - `SET_ENTITY_STATE`, `SET_STATE`, `SHOW_MESSAGE`
  - `LAUNCH_MINIGAME` - Launch interactive puzzle mini-games
  - ❌ DO NOT invent new effect types!

#### 2. Handler Patterns (CHECK BEFORE WRITING HANDLERS!)
Read `src/documentation/handler-resolution-and-media.md` for:
- **Pattern 1 (Binary)**: Simple yes/no states → use `success/fail`
- **Pattern 2 (Multi-State)**: Complex branching → use array of handlers
- **Order matters**: Most specific conditions first, default (no conditions) last

#### 3. Existing Documentation (READ BEFORE CODING!)

| Making changes to... | Read this first |
|---------------------|-----------------|
| Handlers/conditions | `handler-resolution-and-media.md` |
| Parent-child/reveals | `handler-resolution-and-media.md` |
| Focus/navigation | `focus-and-zones.md` |
| Any bug fix | `backlog.md` (check if already documented) |

---

### Key Rules (Never Violate These)

1. **Think Global, Not Local**
   - ❌ NEVER fix issues by modifying a single object/entity
   - ✅ ALWAYS fix the underlying system that all objects use
   - Question: "Will this solution work for 1000 games or just this one object?"

2. **Follow Documented Patterns**
   - Check valid types in `src/lib/game/types.ts` FIRST
   - Check patterns in `src/documentation/handler-resolution-and-media.md`
   - Use Pattern 1 (Binary) for simple yes/no states
   - Use Pattern 2 (Multi-State) for complex branching logic
   - Order conditions: most specific → least specific

3. **Preserve Parent-Child Relationships**
   - Children MUST be revealed via `REVEAL_FROM_PARENT`
   - NEVER break `parentId` connections
   - Verify accessibility chain after changes

4. **Update Documentation (NOT OPTIONAL!)**
   - Code changes → Documentation updates (required)
   - New patterns → Add to `src/documentation/`
   - Bug fixes → Update `src/documentation/backlog.md` (resolved section)

5. **Maintain Architectural Consistency**
   - NPCs are NOT zones (see `src/documentation/focus-and-zones.md`)
   - Explicit media takes priority over entity-based (see handler-resolution-and-media.md)
   - Progressive discovery must be consistent (backlog.md #001)

---

### Pre-Commit Validation Checklist

Before committing:
- [ ] Is this a global fix or local workaround? (Must be global)
- [ ] Did I check valid types in `src/lib/game/types.ts`?
- [ ] Does it follow documented patterns in `handler-resolution-and-media.md`?
- [ ] Are parent-child relationships intact?
- [ ] Is documentation updated (backlog.md if bug fix)?
- [ ] Tested on multiple objects/entities?

---

## ⛔ CRITICAL: Server and Process Management

**NEVER RUN THESE COMMANDS:**
- ❌ `npm run dev` - User runs the server manually
- ❌ `npm run start` - User runs the server manually
- ❌ `npm run genkit:dev` - User runs Genkit manually
- ❌ ANY command with `run_in_background: true` parameter

**ONLY USE BASH FOR:**
- ✅ `npm run db:bake` - Converting TypeScript to JSON
- ✅ `npm run db:seed` - Seeding database
- ✅ Git operations (status, add, commit, checkout, etc.)
- ✅ Simple file checks (ls, grep, etc.)

**WHY:** The user manages their own development server. Running servers or background processes causes port conflicts and requires manual cleanup. This rule applies across ALL conversation sessions, regardless of context summaries.

---

## Development Commands

### Running the application
```bash
npm run dev              # Start Next.js dev server on port 9002
```

### Database management
```bash
npm run db:bake          # Convert TypeScript cartridge to JSON
npm run db:seed          # Bake + seed entire database (game + user + player state)
npm run db:seed:game     # Bake + seed only game data (no user/state)
```

**Important**: Always run `npm run db:bake` before `npm run db:seed` if you've modified `src/lib/game/cartridge.ts`. The seed scripts read from the generated `cartridge.json` file, not the TypeScript source.

### Development checkpoints

Use the **🧪 Dev Checkpoints** button in the bottom-right of the game UI to jump to specific game states for testing.

**To add new checkpoints**:
1. Add checkpoint definition to `src/app/actions.ts` in the `applyDevCheckpoint` function (as Effect array)
2. Add UI entry to `src/components/game/DevControls.tsx` in the `allCheckpoints` object

Current Chapter 1 checkpoints:
- `chapter_1_intro_complete` - Chapter intro finished
- `opened_trashbag` - Inside dumpster, trash bag torn open, ready to examine coat/pants/shoes
- `side_alley_find_crowbar` - At tire pile, ready to take crowbar

### AI development
```bash
npm run genkit:dev       # Start Genkit developer UI
npm run genkit:watch     # Start Genkit with auto-reload
```

### Build and type checking
```bash
npm run build            # Production build
npm run start            # Start production server
npm run lint             # Run ESLint
npm run typecheck        # Run TypeScript type checker
```

Note: Build ignores TypeScript and ESLint errors (see `next.config.ts`).

## Inventory System

**Core Concept**: The inventory system enforces a maximum capacity to create meaningful player choices about which items to carry.

### Capacity Rules

- **Maximum Size**: 6 items total (1 permanent + 5 usable slots)
- **Permanent Items**: Phone (`item_player_phone`) cannot be dropped - always in inventory
- **Constants**: Defined in `src/lib/game/types.ts`:
  ```typescript
  export const INVENTORY_MAX_SIZE = 6;
  export const INVENTORY_PERMANENT_ITEMS: ItemId[] = ['item_player_phone' as ItemId];
  ```

### Behavior

**Taking Items** (`handle-take.ts`):
- Checks capacity before adding items
- If inventory full (6/6): Shows error message, prevents taking
- Shows capacity warning with every TAKE: `[Inventory: 3/6 items]`
- When full: `[Inventory: 6/6 items - Full! Drop items if needed.]`

**Dropping Items** (`handle-drop.ts`):
- Permanent items (phone) cannot be dropped
- Dropped items go to **zone storage containers** - a "hybrid storage" approach
- **Hybrid Storage**: Items stay in the current zone (not returned to origin, not scattered on floor)
  - Each location has a designated "Dropped Items" container
  - `obj_street_storage` - Street location
  - `obj_side_alley_storage` - Side Alley location
  - `obj_dark_alley_storage` - Dark Alley location
- Mapping: `src/lib/game/utils/zone-storage.ts`
- Storage containers are:
  - Hidden by default (`isRevealed: false`)
  - Automatically revealed when first item is dropped
  - Named "Dropped Items" (NOT "Ground" to avoid items being overlooked)
  - Accessible via: EXAMINE dropped items, TAKE [item] from dropped items
- **Design Goal**: Avoid player frustration from items being "lost on the floor" or requiring return to distant zones

### Design Principles

1. **No Item Loss**: Dropped items are never lost - they go to zone storage
2. **One of Each Type**: Each chapter should have only ONE of each item type
   - ✅ ONE crowbar per chapter
   - ✅ ONE invoice (if multiple, rename: "purchase receipt", "cleaning invoice", etc.)
   - ❌ Never duplicate item names - confuses player and engine
3. **Tool Placement**: Tools should be 1-2 zones away from their primary use
   - Promotes backtracking with purpose
   - Creates "aha!" moments
   - Avoids frustration (not 3+ zones away)

### Implementation Files

- `src/lib/game/types.ts` - Constants and types
- `src/lib/game/actions/handle-take.ts` - Capacity checking
- `src/lib/game/actions/handle-drop.ts` - Zone storage logic
- `src/lib/game/utils/zone-storage.ts` - Location→Storage mapping
- `src/lib/game/cartridges/chapter-1.ts` - Storage containers (obj_*_storage)

## Bus Stop Payphone Puzzle (Chapter 1)

**Design Pattern**: Multi-object three-layer cipher puzzle requiring players to translate information across multiple sources to derive a numeric code.

### Puzzle Overview

The Bus Stop area contains a **deactivated payphone** that requires an 8-digit activation code. Players must discover clues scattered across multiple objects and perform a three-step translation:

```
Letters (A-B-C-D) → Colors (Red/Blue/Green/Yellow) → Numbers (4-9-2-7)
```

### Cipher Layers

**Layer 1: Letter Sequence**
- Source: Bus ticket found in trash bin
- Contains serial number: `A-B-C-D-A-C-B-D` (8 characters)
- Clue text: "The serial number stands out. Eight characters, all letters A through D. Too deliberate to be random."

**Layer 2: Color Code Translation**
- Source: Bus schedule on wall
- Shows line color assignments:
  - Red Line = A
  - Blue Line = B
  - Green Line = C
  - Yellow Line = D
- Translation: A→Red, B→Blue, C→Green, D→Yellow
- Result: Red-Blue-Green-Yellow-Red-Green-Blue-Yellow

**Layer 3: Numeric Keypad Mapping**
- Source: Payphone keypad (visible on examine)
- Keys have colored dots in bottom corner:
  - Key 4 = red dot
  - Key 9 = blue dot
  - Key 2 = green dot
  - Key 7 = yellow dot
- Translation: Red→4, Blue→9, Green→2, Yellow→7
- **Final Code**: `4-9-2-7-4-2-9-7`

### Puzzle Flow

1. **Discovery Phase**:
   - **Search trash bin** → Reveals bus ticket, soda can, food wrapper (red herrings)
     - Items displayed as icon list: 📄 Bus Ticket, 🥤 Soda Can, 🍟 Food Wrapper
   - **Examine bus ticket** → See letter sequence A-B-C-D-A-C-B-D
   - **Examine bus schedule** → Learn color codes (Red=A, Blue=B, etc.)
   - **Examine bus shelter glass** → See phone number **555-0147** carved prominently
   - **Examine payphone** → Learn about deactivated state, see keypad with colored dots

2. **Quarter Discovery**:
   - **Examine bench** → Notice uneven leg that wobbles
   - **Move bench** → Reveal quarter hidden under leg (used to level the bench)
   - **Take quarter** → Obtain currency for payphone call

3. **Activation Phase**:
   - Type `/payphone activation` → Triggers mini-game UI
   - Enter code `49274297` using keypad
   - Success → Payphone state changes to 'activated'

4. **Usage Phase**:
   - **Use quarter on activated payphone** → Get dial tone
   - **Dial 555-0147** (from bus shelter glass) → Receive audio message (clue/evidence)

### Implementation Components

**Game Objects** (in `chapter-1.ts`):
- `obj_bus_trash_bin` - Container holding puzzle items and red herrings
  - Search handler reveals: bus ticket, soda can, food wrapper
  - Items shown as icon list in search results
- `obj_bus_schedule` - Shows color-coded bus line information
  - Examine text includes: "RED LINE = A", "BLUE LINE = B", etc.
- `obj_bus_shelter` - Shows phone number on glass walls
  - Examine reveals **555-0147** carved prominently on plexiglass
  - Correct number to call after payphone activation
- `obj_bus_bench` - Movable furniture hiding quarter
  - State system: unmoved/moved
  - Examine (unmoved): Hints at uneven leg
  - Move action: Reveals quarter underneath, changes state to moved
- `obj_payphone` - State-based object (deactivated/activated)
  - Deactivated state: Shows activation code prompt, instructs `/payphone activation`
  - Activated state: Accepts quarter, allows dialing

**Items** (in `chapter-1.ts`):
- `item_bus_ticket` (lines 751-803)
  - Parent: `obj_bus_trash_bin`
  - Read handler shows full serial number with visual media
  - RevealMethod: `REVEAL_FROM_PARENT`
- `item_quarter` (lines 805-838)
  - Parent: `obj_bus_bench` (hidden under leg)
  - Consumable currency for payphone calls
  - Take handler sets `has_payphone_quarter` flag
- `item_soda_can` (lines 840-870) - **Red herring**
  - Parent: `obj_bus_trash_bin`
  - No puzzle value, adds realism
- `item_food_wrapper` (lines 872-902) - **Red herring**
  - Parent: `obj_bus_trash_bin`
  - No puzzle value, creates decision fatigue

**Special Command**:
- `/payphone activation` - Triggers React mini-game component
  - Shows digital display (1 line, 8 digits max)
  - Shows 12-button keypad with colored dots
  - Validates input against solution
  - Success → Changes payphone state to 'activated'

**Flags**:
- `has_payphone_quarter` - Set when quarter is taken
- `payphone_call_ready` - Set when quarter is used on activated phone

### Design Principles

1. **Multi-Object Discovery**: Clues distributed across 5+ objects encourage thorough exploration
2. **Progressive Complexity**: Each layer adds cognitive load (letters → colors → numbers)
3. **Physical Interaction**: Quarter requires moving bench, adding tactile puzzle element
4. **Red Herrings**: Trash bin contains junk items (soda can, food wrapper) to create realistic clutter
5. **Clear Signaling**: Each clue explicitly states its role ("The serial number stands out", "One number stands out - carved deep")
6. **Icon-Based Display**: Item lists shown with icons (📄 📱 🥤) for visual clarity
7. **Spatial Distribution**: Quarter hidden separately from other clues, requires different action (MOVE vs SEARCH)

### Files Modified

- `src/lib/game/cartridges/chapter-1.ts`:
  - Lines 751-803: Added `item_bus_ticket` (serial number A-B-C-D-A-C-B-D)
  - Lines 805-838: Added `item_quarter` (parent changed to `obj_bus_bench`)
  - Lines 840-870: Added `item_soda_can` (red herring)
  - Lines 872-902: Added `item_food_wrapper` (red herring)
  - Lines 1138-1161: Updated `obj_bus_shelter` with phone number **555-0147** on glass
  - Lines 1163-1210: Rewrote `obj_bus_bench` with state system (unmoved/moved) and move handler
  - Lines 1229-1239: Updated trash bin search to show icon list (📄 🥤 🍟)
  - Lines 1243-1266: Updated bus schedule with color codes
  - Lines 1268-1332: Rewrote payphone with state system

**TODO**: Create `/src/components/game/PayphoneActivationGame.tsx` for mini-game UI.

## Mini-Game System (Interactive Puzzles)

**Core Concept**: The mini-game system allows cartridges to launch interactive puzzle components (keypads, lock combinations, circuit boards, etc.) that require player input beyond natural language commands.

### Design Pattern: Cartridge-Driven Mini-Games

The mini-game system follows the **effect-based architecture** - everything is driven by the cartridge, and the engine knows nothing about specific mini-games.

### How It Works

1. **Cartridge defines** (in handler effects):
   ```typescript
   effects: [
     {
       type: 'LAUNCH_MINIGAME',
       gameType: 'payphone-activation',        // Identifies which UI component to load
       objectId: 'obj_payphone',                // What object this mini-game affects
       solution: '49274297',                    // The correct answer
       successEffects: [                        // What happens when player succeeds
         { type: 'SET_ENTITY_STATE', entityId: 'obj_payphone', patch: { currentStateId: 'activated' } },
         { type: 'SET_FLAG', flag: 'payphone_activated', value: true },
         { type: 'SHOW_MESSAGE', speaker: 'narrator', content: "**SUCCESS!** ..." }
       ],
       data: {                                  // Game-specific data (keypad colors, etc.)
         keypadColors: { '4': 'red', '9': 'blue', ... }
       }
     }
   ]
   ```

2. **Engine processes** (`GameStateManager.ts:380`):
   - Creates a message with `type: 'minigame'`
   - Attaches all mini-game data (solution, successEffects, custom data)
   - No hardcoded knowledge of specific mini-games

3. **UI renders** (`GameScreen.tsx:262`):
   - Checks `message.minigame.gameType`
   - Loads appropriate React component (e.g., `PayphoneActivationGame`)
   - Component handles player interaction

4. **Player completes**:
   - UI calls `onCommandSubmit('/minigame-complete <gameType> <playerInput>')`
   - Example: `/minigame-complete payphone-activation 49274297`

5. **Engine validates** (`actions.ts:972`):
   - Finds most recent minigame message of that type
   - Extracts solution and successEffects from message data
   - Compares player input to solution
   - If correct: applies successEffects from cartridge
   - **Fully generic** - no hardcoded object IDs, solutions, or effects

### Key Principles

1. **Effect-Based**: Mini-games are launched via `LAUNCH_MINIGAME` effect, not special commands
2. **Cartridge-Driven**: All logic (solution, effects, data) defined in cartridge handlers
3. **Generic Engine**: Engine has zero knowledge of specific puzzles or objects
4. **Reusable**: Same pattern works for any interactive puzzle (locks, keypads, terminals, etc.)

### Example: Payphone Activation Puzzle

**Cartridge** (`chapter-1.ts:1296`):
```typescript
onSearch: {
  success: {
    message: "You examine the payphone more closely...",
    effects: [
      {
        type: 'LAUNCH_MINIGAME',
        gameType: 'payphone-activation',
        objectId: 'obj_payphone',
        solution: '49274297',
        successEffects: [
          { type: 'SET_ENTITY_STATE', entityId: 'obj_payphone', patch: { currentStateId: 'activated' } },
          { type: 'SHOW_MESSAGE', speaker: 'narrator', content: "**PAYPHONE ACTIVATED** ..." }
        ],
        data: { keypadColors: { '4': 'red', '9': 'blue', ... } }
      }
    ]
  }
}
```

**Player Flow**:
1. Player: `SEARCH PAYPHONE` (when in 'deactivated' state)
2. Engine: Processes LAUNCH_MINIGAME effect → Creates minigame message
3. UI: Renders `<PayphoneActivationGame>` with keypad
4. Player: Enters code `4-9-2-7-4-2-9-7`
5. UI: Calls `/minigame-complete payphone-activation 49274297`
6. Engine: Validates, applies successEffects (changes state to 'activated', shows success message)

### Adding New Mini-Games

To add a new mini-game type:

1. **Create UI Component** (`src/components/game/YourMiniGame.tsx`):
   ```typescript
   export function YourMiniGame({ solution, data, onComplete }) {
     // Render interactive puzzle
     // Call onComplete(success, playerInput) when done
   }
   ```

2. **Add to GameScreen.tsx**:
   ```typescript
   {message.minigame.gameType === 'your-minigame-type' && (
     <YourMiniGame
       solution={message.minigame.data?.solution || ''}
       data={message.minigame.data}
       onComplete={(success, input) => {
         if (success) {
           onCommandSubmit(`/minigame-complete your-minigame-type ${input}`);
         }
       }}
     />
   )}
   ```

3. **Use in Cartridge**:
   ```typescript
   effects: [
     {
       type: 'LAUNCH_MINIGAME',
       gameType: 'your-minigame-type',
       objectId: 'obj_whatever',
       solution: 'the-correct-answer',
       successEffects: [ /* what happens on success */ ],
       data: { /* game-specific data */ }
     }
   ]
   ```

**No engine changes needed** - the system is fully generic!

### Implementation Files

- `src/lib/game/types.ts:166` - LAUNCH_MINIGAME effect type
- `src/lib/game/engine/GameStateManager.ts:380` - Effect processing
- `src/app/actions.ts:972` - Generic completion handler `/minigame-complete`
- `src/components/game/GameScreen.tsx:262` - UI rendering
- `src/components/game/PayphoneActivationGame.tsx` - Example mini-game component
- `src/lib/game/cartridges/chapter-1.ts:1296` - Example usage in cartridge

## Architecture

### Game Cartridge System

The game content is defined in `src/lib/game/cartridge.ts` as a structured TypeScript object containing:
- Game metadata (title, description, narrator name)
- Chapters and objectives
- Locations (rooms/areas players can visit)
- Game Objects (interactive objects like doors, containers, furniture)
- Items (takeable objects with descriptions and media)
- NPCs (non-player characters with conversation flows)
- Portals (connections between locations)

**Data Flow**:
1. Edit `src/lib/game/cartridge.ts` (TypeScript source of truth)
2. Run `npm run db:bake` to generate `src/lib/game/cartridge.json`
3. Run `npm run db:seed` or `npm run db:seed:game` to deploy to Firestore
4. In development mode, the app loads from `cartridge.ts` directly
5. In production, the app loads from Firestore collections

### Firebase Structure

**Collections**:
- `games/{gameId}` - Game metadata
  - `chapters/{chapterId}` - Chapter definitions
  - `locations/{locationId}` - Location/room definitions
  - `game_objects/{objectId}` - Interactive objects
  - `items/{itemId}` - Takeable items
  - `npcs/{npcId}` - NPCs and conversation trees
  - `portals/{portalId}` - Location connections
- `users/{userId}` - User profiles and purchased games
- `player_states/{userId}_{gameId}` - Player progress/inventory/flags
- `logs/{userId}_{gameId}` - Message history

### Game Engine (src/lib/game/actions/)

The game engine uses an **effect system** to process player commands:
1. Player input → AI interpretation (`src/ai/flows/interpret-player-commands.ts`)
2. Command routing to handlers (`handle-*.ts` files)
3. Handlers return `Effect[]` arrays describing state changes
4. `process-effects.ts` applies effects to game state
5. Results persisted to Firestore

**Handler files**:
- `handle-conversation.ts` - NPC dialogue system
- `handle-examine.ts` - Examine objects/items (focus changes silently)
- `handle-go.ts` - Navigate between locations (includes auto-routing)
- `handle-help.ts` - Show available commands
- `handle-inventory.ts` - Show player inventory
- `handle-look.ts` - Look around current location
- `handle-move.ts` - Move within cells (world system)
- `handle-open.ts` - Open containers/doors
- `handle-read.ts` - Read documents/articles (focus changes silently)
- `handle-search.ts` - Search through objects (requires focus)
- `handle-take.ts` - Pick up items
- `handle-talk.ts` - Initiate NPC conversation
- `handle-use.ts` - Use items on objects
- `process-password.ts` - Password/phrase validation

**Focus Behavior**:
- EXAMINE and READ change focus **silently** - the description is the message
- Other actions (GO, SEARCH, USE, TALK, OPEN) show explicit focus transition messages like "You move toward..."
- This prevents duplicate narrator messages where both the description and a separate "You focus on X" message appear

### Navigation System

The game uses a **two-layer navigation system**:

#### Layer 1: Location-to-Location Navigation (Portals)

**Portal System**:
- Locations are connected via **portals** defined in the cartridge
- Chapter 1 uses a **hub-and-spokes model** with `loc_elm_street` and `loc_bus_stop` as hubs
- Each portal defines: `fromLocationId`, `toLocationId`, `direction`, `alternateNames`, `requirements`

**Street-Level Auto-Routing** (NEW):
- Players can navigate directly between street-level locations without manual hub traversal
- Example: "GO TO KIOSK" from Butcher Exterior automatically routes through Elm Street
- **Street-level locations** (defined in `handle-go.ts:121-131` and `handle-look.ts:37-47`):
  - `loc_elm_street`, `loc_bus_stop`
  - `loc_florist_exterior`, `loc_butcher_exterior`, `loc_kiosk`
  - `loc_cctv_exterior`, `loc_construction_exterior`
  - `loc_electrician_truck`, `loc_alley`
- **Interior locations** (require explicit exit):
  - `loc_florist_interior`, `loc_butcher_interior`
  - `loc_cctv_interior`, `loc_construction_interior`
- Auto-routing only applies when **both** current and target locations are street-level
- **AI Awareness**: When at street-level, "look around" shows ALL street-level locations (not just direct portals) so the AI interpreter knows they're reachable

**Implementation**:
- Navigation handler: `src/lib/game/actions/handle-go.ts` (lines 117-183)
- Look-around handler: `src/lib/game/actions/handle-look.ts` (lines 36-117)
- AI context builder: `src/app/actions.ts` (lines 1077-1117) - tells AI which locations are reachable

#### Layer 2: Zone-Based Navigation (Within Locations)

**Zone System**:
- Controls movement **within** a single location (e.g., street → alley → dumpster)
- Uses hierarchical parent-child zone relationships
- Enforced by `ZoneManager` for spatial realism in detective gameplay
- Two modes: `compact` (any-to-any) and `sprawling` (step-by-step)

**See**: `src/documentation/zone-architecture.md` for complete zone system documentation

### AI Flows (src/ai/flows/)

The game uses Google Genkit flows for AI processing:
- `interpret-player-commands.ts` - Parse natural language into structured commands
- `guide-player-with-narrator.ts` - Generate narrative responses
- `select-npc-response.ts` - Choose appropriate NPC dialogue
- `generate-story-from-logs.ts` - Create chapter summaries from logs
- `generate-npc-chatter.ts` - Generate ambient NPC dialogue

All flows are re-exported through `src/ai/index.ts`.

### Server Actions (src/app/actions.ts)

Main server actions:
- `getGameData(gameId)` - Load game from Firestore or local cartridge
- `processCommand(userId, command)` - Process player input and update state
- `resetGame(userId)` - Reset player progress
- `findOrCreateUser(userId)` - User initialization
- `createInitialMessages()` - Generate opening narration

### Environment-Specific Behavior

**Development mode** (`NEXT_PUBLIC_NODE_ENV === 'development'`):
- Loads game data from `src/lib/game/cartridge.ts` directly
- Uses `NEXT_PUBLIC_DEV_USER_ID` for automatic login
- Bypasses Firestore reads for game data (still writes player state)

**Production mode**:
- Loads all game data from Firestore
- Requires user authentication
- Full Firebase integration

### Type System

The codebase uses **branded types** for type safety (see `src/lib/game/types.ts`):
- `GameId`, `ChapterId`, `LocationId`, `ItemId`, `NpcId`, etc.
- Prevents mixing up different ID types
- Cast with `'id' as GameId` when creating IDs

### Component Structure

**Client Components** (`src/components/game/`):
- `GameClient.tsx` - Main game container with state management
- `GameScreen.tsx` - Message display and command input
- `GameSidebar.tsx` - Inventory, objectives, map

**UI Components** (`src/components/ui/`):
- Shadcn/ui components (Radix UI primitives + Tailwind)

### Path Aliases

Use `@/*` to import from `src/*`:
```typescript
import { Game } from '@/lib/game/types';
import { GameClient } from '@/components/game/GameClient';
```

## Important Notes

- **Firebase credentials**: Required environment variables are defined in `next.config.ts` and must be set in `.env`
- **TypeScript strict mode**: Enabled but build ignores errors
- **Genkit configuration**: See `src/ai/genkit.ts` for AI model setup
- **WhatsApp integration**: `src/lib/whinself-service.ts` provides optional WhatsApp message dispatch
- **Game constants**: Available commands defined in `src/lib/game/commands.ts`
- **Documentation**: Entity schemas in `src/documentation/` describe game object structure
  - `engine-features.md` - Effect types, NPC behaviors, initialization, special commands
  - `npc-schema.md` - NPC structure, demotion, progressive reveals, topics
  - `handler-resolution-and-media.md` - Handler patterns and media resolution
