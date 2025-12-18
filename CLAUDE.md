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

- **Valid Effect Types** (`src/lib/game/types.ts:66`):
  - `ADD_ITEM`, `REMOVE_ITEM`, `SET_FLAG`, `REVEAL_FROM_PARENT`
  - `SET_ENTITY_STATE`, `SET_STATE`, `SHOW_MESSAGE`
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
- `handle-examine.ts` - Examine objects/items
- `handle-go.ts` - Navigate between locations
- `handle-help.ts` - Show available commands
- `handle-inventory.ts` - Show player inventory
- `handle-look.ts` - Look around current location
- `handle-move.ts` - Move within cells (world system)
- `handle-open.ts` - Open containers/doors
- `handle-read.ts` - Read documents/articles
- `handle-take.ts` - Pick up items
- `handle-talk.ts` - Initiate NPC conversation
- `handle-use.ts` - Use items on objects
- `process-password.ts` - Password/phrase validation

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
