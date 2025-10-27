# Phase 2 Status Report

## ✅ Completed (So Far)

### Core Engine Services (100% Complete)
All Phase 1 services are complete and committed:
- ✅ GameStateManager - Central effect reducer
- ✅ Validator - Capability and condition checking
- ✅ VisibilityResolver - Parent-child visibility logic
- ✅ AIContextBuilder - Filtered state for LLM
- ✅ HandlerResolver - StateMap composition (**NEW in Phase 2**)

### Refactored Handler Files (2/15 Complete)
- ✅ **handle-move.ts** - Returns Effect[], uses new architecture
- ✅ **handle-open.ts** - Returns Effect[], uses new architecture
- ⏳ handle-examine.ts - Not started
- ⏳ handle-take.ts - Not started
- ⏳ handle-use.ts - Not started (CRITICAL for safe unlock)
- ⏳ handle-read.ts - Not started
- ⏳ handle-talk.ts - Not started
- ⏳ handle-go.ts - Not started
- ⏳ handle-inventory.ts - Not started
- ⏳ handle-conversation.ts - Not started
- ⏳ handle-help.ts - Not started
- ⏳ handle-look.ts - Not started
- ⏳ process-password.ts - Not started

### Integration Work (0% Complete)
- ⏳ **actions.ts:processCommand()** - CRITICAL: Wire handlers to GameStateManager
- ⏳ Fix type incompatibilities (CommandResult → Effect[])
- ⏳ Update all handler invocations in processCommand()
- ⏳ Test end-to-end pipeline

---

## 🚧 What Needs to Be Done Next

### Priority 1: Critical Path (Required for Basic Functionality)

#### 1. Update processCommand() in actions.ts
**Current Flow:**
```typescript
const result = await handleMove(state, target, game); // Returns CommandResult
await saveState(result.newState);
await saveMessages(result.messages);
```

**New Flow:**
```typescript
const effects = await handleMove(state, target, game); // Returns Effect[]
const result = GameStateManager.applyAll(effects, state, messages);
await saveState(result.state);
await saveMessages(result.messages);
```

**Steps:**
1. Import GameStateManager
2. Update each handler call to get Effect[]
3. Call GameStateManager.applyAll() to apply effects
4. Save the resulting state

#### 2. Refactor Critical Handlers
These handlers are used in the painting→safe→file chain:
- **handle-use.ts** - For using key on safe (CRITICAL)
- **handle-examine.ts** - For examining objects
- **handle-take.ts** - For taking file from safe

#### 3. Fix Type Errors
- Update all references to CommandResult
- Ensure Effect[] is returned consistently
- Fix any type mismatches

### Priority 2: Complete Handler Migration
Refactor remaining handlers to use new architecture:
- handle-read.ts
- handle-talk.ts
- handle-go.ts
- handle-inventory.ts
- handle-conversation.ts
- handle-help.ts
- handle-look.ts
- process-password.ts

### Priority 3: Testing
1. Run TypeScript type checker: `npm run typecheck`
2. Test painting→safe→file chain manually
3. Test in browser
4. Fix runtime errors
5. Test all game functionality

---

## 📋 Step-by-Step Guide to Complete Phase 2

### Step 1: Refactor handle-use.ts
This is CRITICAL for the safe unlock mechanism.

**Pattern:**
```typescript
export async function handleUse(
  state: PlayerState,
  itemName: string,
  targetName: string,
  game: Game
): Promise<Effect[]> {
  // 1. Find item in inventory
  const itemId = state.inventory.find(id => ...);
  if (!itemId) return [showMessage('You don't have that.')];

  // 2. Find target object
  const targetId = findVisibleObject(targetName, state, game);
  if (!targetId) return [showMessage('You don't see that.')];

  // 3. Get target and check for onUse handlers
  const target = game.gameObjects[targetId];
  const onUseHandlers = target.handlers?.onUse;

  if (!Array.isArray(onUseHandlers)) {
    return [showMessage(`You can't use that here.`)];
  }

  // 4. Find matching item handler
  const matchingHandler = onUseHandlers.find(h => h.itemId === itemId);
  if (!matchingHandler) {
    return [showMessage(`That doesn't work.`)];
  }

  // 5. Evaluate conditions
  const conditionsMet = Validator.evaluateConditions(
    matchingHandler.conditions,
    state,
    game
  );
  const outcome = conditionsMet ? matchingHandler.success : matchingHandler.fail;

  // 6. Build effects
  const effects: Effect[] = [];
  if (outcome.message) {
    effects.push({
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: outcome.message
    });
  }
  if (outcome.effects) {
    effects.push(...outcome.effects);
  }

  return effects;
}
```

### Step 2: Update processCommand() in actions.ts

**Current Code (around line 200-400):**
```typescript
export async function processCommand(
  userId: string,
  command: string
): Promise<CommandResult> {
  // ... load state and game ...

  // Parse command with AI
  const parsed = await interpretCommand(...);

  // Route to handlers
  switch (parsed.verb) {
    case 'move':
      return await handleMove(state, parsed.target, game); // OLD
    case 'open':
      return await handleOpen(state, parsed.target, game); // OLD
    // ... etc
  }
}
```

**New Code:**
```typescript
export async function processCommand(
  userId: string,
  command: string
): Promise<CommandResult> {
  // ... load state and game ...

  // Parse command with AI
  const parsed = await interpretCommand(...);

  // Route to handlers (now they return Effect[])
  let effects: Effect[] = [];
  switch (parsed.verb) {
    case 'move':
      effects = await handleMove(state, parsed.target, game); // NEW
      break;
    case 'open':
      effects = await handleOpen(state, parsed.target, game); // NEW
      break;
    case 'use':
      effects = await handleUse(state, parsed.item, parsed.target, game); // NEW
      break;
    // ... etc
  }

  // Apply effects through reducer
  const currentMessages = /* load from DB or state */;
  const result = GameStateManager.applyAll(effects, state, currentMessages);

  // Save new state
  await savePlayerState(userId, result.state);
  await saveMessages(userId, result.messages);

  return { newState: result.state, messages: result.messages };
}
```

### Step 3: Test the Pipeline

**Test Sequence:**
```
1. "move painting" → should reveal safe
   - Check: obj_wall_safe.isVisible === true
   - Check: flag 'has_moved_painting' === true

2. "examine safe" → should show locked message
   - Check: Returns description of locked safe

3. "use deposit key on safe" → should open safe
   - Check: obj_wall_safe.isLocked === false
   - Check: obj_wall_safe.isOpen === true
   - Check: item_secret_document.isVisible === true

4. "take document" → should add to inventory
   - Check: item_secret_document in inventory

5. "read document" → should display content
   - Check: Returns document content
```

---

## 🎯 Success Criteria

Phase 2 is complete when:
1. ✅ All handlers return Effect[]
2. ✅ processCommand() uses GameStateManager.applyAll()
3. ✅ No TypeScript errors
4. ✅ Painting→safe→file chain works end-to-end
5. ✅ Game runs in browser without errors
6. ✅ All tests pass

---

## 📊 Current Progress

- **Phase 1 (Core Engine):** 100% ✅
- **Phase 2 (Handler Migration):** ~15% ⏳
  - Core services: 100% ✅
  - Handlers refactored: 2/15 (13%)
  - Integration work: 0% ⏳
  - Testing: 0% ⏳

---

## 🔧 Commands to Run

```bash
# Type check
npm run typecheck

# Run dev server
npm run dev

# Build (will show type errors)
npm run build

# Run tests (if any)
npm test
```

---

## 📝 Notes for Next Session

1. Start with handle-use.ts - it's critical for the safe unlock
2. Then update processCommand() - this wires everything together
3. Test immediately after processCommand() is updated
4. Fix errors incrementally
5. Once basic flow works, refactor remaining handlers

The foundation is solid. We just need to wire up the handlers to the reducer and test!

🤖 Generated with Claude Code
