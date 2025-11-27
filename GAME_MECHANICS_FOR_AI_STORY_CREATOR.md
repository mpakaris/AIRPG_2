# Game Mechanics Guide for AI Story Creators

**Purpose**: This document teaches AI systems how to create compelling 5-chapter narrative adventure games using our text-based engine.

**Last Updated**: 2025-11-25

---

## 🎮 Core Game Architecture

### Game Structure Overview

Your game consists of:
- **5 Chapters**: Story progression milestones
- **Locations**: Physical spaces players explore (rooms, areas)
- **Game Objects**: Interactive environmental objects (doors, containers, furniture, machines)
- **Items**: Takeable objects that go in inventory (keys, documents, tools)
- **NPCs**: Non-player characters with dialogue and knowledge
- **Portals**: Connections between locations

### Player Capabilities

Players can:
- **Navigate**: Move between locations and focus on objects
- **Examine**: Inspect objects, items, NPCs for clues
- **Manipulate**: Open, close, move, break, search objects
- **Collect**: Take items, manage inventory
- **Use**: Use items on objects to solve puzzles
- **Converse**: Talk to NPCs, ask about topics
- **Input**: Enter passwords/phrases on locked objects
- **Read**: Read documents, articles, notes

---

## 📖 Story Structure: 5-Chapter Framework

### Chapter Pacing Model

```
Chapter 1: INTRODUCTION (20% of game)
├─ Introduce setting and initial mystery
├─ 1-2 simple puzzles to teach mechanics
├─ Reveal first major clue
└─ End with hook/question

Chapter 2: INVESTIGATION (20% of game)
├─ Expand the world (2-3 locations)
├─ Introduce key NPCs
├─ 2-3 medium puzzles
└─ Reveal connections between clues

Chapter 3: COMPLICATIONS (20% of game)
├─ Plot twist or complication
├─ More challenging puzzles
├─ NPCs reveal deeper information
└─ Player gains critical tools/knowledge

Chapter 4: REVELATION (20% of game)
├─ Major discovery/breakthrough
├─ Complex multi-step puzzles
├─ All clues come together
└─ Prepare for finale

Chapter 5: RESOLUTION (20% of game)
├─ Final puzzle(s)
├─ Confront antagonist or solve mystery
├─ Tie up loose ends
└─ Satisfying conclusion
```

### Chapter Design Checklist

For each chapter, include:
- [ ] **Entry Point**: Clear location to start
- [ ] **Core Mystery**: What question drives this chapter?
- [ ] **Clue Chain**: 3-5 interconnected clues
- [ ] **Puzzle Variety**: Mix physical (containers) and mental (passwords)
- [ ] **NPC Encounters**: 1-2 meaningful conversations
- [ ] **Rewards**: New items, information, or access
- [ ] **Exit Hook**: Compelling reason to continue

---

## 🔧 Core Mechanics

### 1. Progressive Discovery System

**Principle**: Information and access are revealed gradually, not all at once.

**How It Works**:
```
Player examines painting
  → Finds signature "S.B."
    → Moves painting
      → Reveals wall safe
        → Uses key on safe
          → Opens safe
            → Takes document
              → Reads document (new clue)
```

**Implementation Pattern**:
```typescript
// Parent contains hidden child
'obj_painting': {
  children: { objects: ['obj_wall_safe'] }  // Safe starts hidden
}

// Moving painting reveals safe
onMove: {
  success: {
    effects: [
      { type: 'SET_FLAG', flag: 'has_moved_painting', value: true },
      { type: 'REVEAL_FROM_PARENT', entityId: 'obj_wall_safe', parentId: 'obj_painting' }
    ]
  }
}

// Safe contains document
'obj_wall_safe': {
  state: { isVisible: false },  // Hidden until revealed
  children: { items: ['item_newspaper_article'] }
}
```

**Golden Rule**: Always use `REVEAL_FROM_PARENT` to maintain parent-child relationships. Never make children visible by default.

---

### 2. Container System (Fundamental Puzzle Type)

**Containers are objects that hold items/objects**. They teach players to search and investigate.

**Container Types**:
- **Simple Containers**: Boxes, drawers, bags (no lock)
- **Locked Containers**: Safes, lockboxes (need key)
- **Password Containers**: Electronic locks (need phrase/PIN)
- **Hidden Containers**: Revealed by moving/examining other objects
- **Breakable Containers**: Destroyed to access contents

**Standard Container Pattern**:
```typescript
'obj_metal_box': {
  archetype: 'Container',
  capabilities: {
    openable: true,
    lockable: true,
    container: true
  },
  state: {
    isOpen: false,
    isLocked: true  // Requires unlocking
  },
  children: {
    items: ['item_secret_document']  // Contents
  },
  input: {
    type: 'phrase',
    validation: 'Justice for Silas Bloom',  // Password
    hint: 'A riddle or clue here'
  }
}
```

**Container State Flow**:
```
LOCKED → USE KEY → UNLOCKED → OPEN → TAKE ITEM → EMPTY
```

**Multi-State Display** (shows different images for each state):
```typescript
onExamine: [
  {
    // State 1: Item taken (empty)
    conditions: [{ type: 'HAS_ITEM', itemId: 'item_document' }],
    success: {
      message: "The safe is empty now.",
      media: { url: 'https://.../safe_empty.png' }
    }
  },
  {
    // State 2: Opened but item not taken yet
    conditions: [{ type: 'FLAG', flag: 'safe_is_unlocked', value: true }],
    success: {
      message: "A document gleams inside.",
      media: { url: 'https://.../safe_with_document.png' }
    }
  },
  {
    // State 3: Still locked (default)
    conditions: [],
    success: {
      message: "A locked wall safe.",
      media: { url: 'https://.../safe_locked.png' }
    }
  }
]
```

**Important**: Order conditions from MOST SPECIFIC to LEAST SPECIFIC. First match wins.

---

### 3. Key & Lock Puzzles

**Pattern**: Player finds key → unlocks container → accesses contents

**Key Types**:
- **Physical Keys**: Open doors, safes, lockboxes
- **Keycards**: Electronic access
- **Combinations**: Number sequences
- **Passwords**: Phrases or PINs

**Standard Key Pattern**:
```typescript
// The key (hidden in another container)
'item_safe_key': {
  archetype: 'Tool',
  name: 'Brass Key',
  description: 'A small brass key, worn but functional.'
}

// The lock (uses the key)
'obj_wall_safe': {
  handlers: {
    onUse: [
      {
        itemId: 'item_safe_key',
        conditions: [{ type: 'NO_FLAG', flag: 'safe_is_unlocked' }],
        success: {
          message: "Key slides in—perfect fit. Door swings open.",
          effects: [
            { type: 'SET_FLAG', flag: 'safe_is_unlocked', value: true },
            { type: 'SET_ENTITY_STATE', entityId: 'obj_wall_safe', patch: { isLocked: false, isOpen: true } },
            { type: 'REVEAL_FROM_PARENT', entityId: 'item_newspaper_article', parentId: 'obj_wall_safe' },
            { type: 'REMOVE_ITEM', itemId: 'item_safe_key' }  // Consume key
          ]
        },
        fail: {
          message: "Already unlocked."
        }
      }
    ]
  }
}
```

**Design Tip**: Place keys 1-2 puzzles before their locks. Creates satisfying "aha!" moment when player realizes what the key opens.

---

### 4. Password Puzzles

**Pattern**: Clues scattered around environment → player deduces password → enters it

**Password Input Types**:
```typescript
input: {
  type: 'phrase',           // Full text phrase
  validation: 'Justice for Silas Bloom',
  hint: 'Stuck? Minigame link here',
  attempts: null,          // null = unlimited
  lockout: null
}

// OR

input: {
  type: 'pin',             // Numeric PIN
  validation: '1939',
  hint: 'Check the painting signature',
  attempts: 3,            // Limit attempts
  lockout: 60000          // 60 second lockout
}
```

**Clue Distribution**:
1. **Direct Clue**: "The signature reads: S.B., 1939"
2. **Indirect Clue**: "Three street lamps... symmetrical... precise"
3. **Meta Clue**: Painting shows city scene (location clue)
4. **Confirmation**: After password entry, reference is validated

**Player Commands**:
```
/password Justice for Silas Bloom
password for metal box "Justice for Silas Bloom"
enter "Justice for Silas Bloom"
```

---

### 5. Clue Creation System

**Clues answer questions**. Every mystery needs 5-10 clues leading to solution.

**Clue Types**:

#### A. **Visual Clues** (in descriptions)
```typescript
onExamine: {
  success: {
    message: "Bottom corner: signature 'S.B., 1939'. The same initials from the café sign."
  }
}
```

#### B. **Document Clues** (readable items)
```typescript
'item_newspaper_article': {
  archetype: 'Document',
  name: 'Newspaper Clipping',
  onRead: {
    success: {
      message: "MISSING PERSON - Silas Bloom, 52, disappeared October 12, 1939...",
      effects: [
        { type: 'SET_FLAG', flag: 'knows_silas_bloom_disappeared', value: true }
      ]
    }
  }
}
```

#### C. **NPC Clues** (dialogue topics)
```typescript
topics: [
  {
    topicId: 't_about_owner',
    keywords: ['owner', 'silas', 'bloom', 'building'],
    conditions: {
      requiredFlagsAll: ['knows_silas_bloom_disappeared']  // Only after reading article
    },
    response: {
      message: "Silas Bloom? Yeah, he owned this place before it was a café. Vanished one day, just gone.",
      effects: [
        { type: 'SET_FLAG', flag: 'barista_mentioned_silas', value: true }
      ]
    }
  }
]
```

#### D. **Environmental Clues** (object states)
```typescript
description: "The frame hangs crooked, as if someone moved it recently."
// Clues that painting can be moved
```

#### E. **Audio/Video Clues** (media files)
```typescript
'obj_sd_card': {
  onUse: {
    itemId: 'item_phone',
    success: {
      message: "Video loads. Security footage from October 11, 1939...",
      media: {
        url: 'https://.../security_footage.mp4',
        type: 'video'
      },
      effects: [
        { type: 'SET_FLAG', flag: 'watched_security_video', value: true }
      ]
    }
  }
}
```

**Clue Chain Design**:
```
Examine café sign (S.B. Café)
  → Examine painting (signature S.B., 1939)
    → Read newspaper (Silas Bloom disappeared 1939)
      → Talk to barista (Silas owned building)
        → Find hidden safe (contains police file)
          → Password is "Justice for Silas Bloom"
```

**Design Principle**: Each clue should either:
1. Answer a small question
2. Raise a new question
3. Combine with previous clues to form bigger picture

---

### 6. NPC Conversation System

**NPCs provide information, items, and atmosphere**.

**NPC Lifecycle**:
```
ACTIVE → Complete their purpose → DEMOTED → Ambient chatter
```

**Standard NPC Structure**:
```typescript
'npc_barista': {
  name: 'Barista',
  importance: 'primary',      // Primary story NPC
  stage: 'active',            // Currently relevant
  dialogueType: 'scripted',   // Uses topic system

  welcomeMessage: "What can I get for you?",
  goodbyeMessage: "Come back soon.",

  // Topics available for conversation
  topics: [
    {
      topicId: 't_coffee_order',
      keywords: ['coffee', 'order', 'drink'],
      once: false,  // Can ask multiple times
      response: {
        message: "We've got espresso, cappuccino, americano..."
      }
    },
    {
      topicId: 't_about_building',
      keywords: ['building', 'history', 'owner'],
      conditions: {
        requiredFlagsAll: ['examined_cafe_sign']
      },
      once: true,  // Only ask once
      response: {
        message: "This place has history. Used to be owned by a guy named Silas Bloom.",
        effects: [
          { type: 'SET_FLAG', flag: 'learned_about_silas', value: true }
        ]
      }
    }
  ],

  // Demotion: after giving business card, become ambient
  demoteRules: {
    onFlagsAll: ['received_business_card'],
    then: { setStage: 'demoted', setImportance: 'ambient' }
  },

  // Post-demotion behavior (simple, non-essential)
  postCompletionProfile: {
    welcomeMessage: "Back again?",
    defaultResponse: "I already told you what I know. Got customers to serve."
  }
}
```

**Progressive NPC Reveals**:
```typescript
progressiveReveals: [
  {
    triggerOnInteraction: 3,  // After 3rd conversation
    topicId: 't_secret_info'   // Unlock secret topic
  }
]
```

**NPC Knowledge Distribution**:
- **Chapter 1 NPCs**: Basic info, point to next location
- **Chapter 2-3 NPCs**: Deeper info, require flags/items to talk
- **Chapter 4 NPCs**: Critical info, heavily gated
- **Chapter 5 NPCs**: Confirmation, final pieces

---

### 7. Handler Patterns (Critical!)

**Every interaction uses one of two patterns:**

#### **Pattern 1: Binary (Simple)**
Use when: One action, two outcomes (success/fail)

```typescript
onBreak: {
  conditions: [{ type: 'NO_FLAG', flag: 'machine_broken' }],
  success: {
    message: "Glass shatters. Machine breaks open.",
    effects: [
      { type: 'SET_FLAG', flag: 'machine_broken', value: true },
      { type: 'REVEAL_FROM_PARENT', entityId: 'item_key', parentId: 'obj_machine' }
    ]
  },
  fail: {
    message: "Already broken."
  }
}
```

#### **Pattern 2: Multi-State (Complex)**
Use when: Multiple states, different outcomes for each

```typescript
onExamine: [
  {
    // Most specific: destroyed + item taken
    conditions: [
      { type: 'FLAG', flag: 'bookshelf_destroyed', value: true },
      { type: 'HAS_ITEM', itemId: 'item_key' }
    ],
    success: { message: "Debris. The key is gone. The hidden door is exposed." }
  },
  {
    // Less specific: destroyed but item not taken
    conditions: [{ type: 'FLAG', flag: 'bookshelf_destroyed', value: true }],
    success: { message: "Broken wood. A key gleams in the wreckage. The hidden door behind." }
  },
  {
    // Default: intact
    conditions: [],
    success: { message: "A solid oak bookshelf. Books line the shelves." }
  }
]
```

**Critical**: Always order conditions from MOST SPECIFIC → LEAST SPECIFIC.

---

## 🎯 Puzzle Design Patterns

### Beginner Puzzles (Chapter 1)

**Goal**: Teach mechanics without frustration

**Examples**:
- **Find Key → Open Door**: Simple item acquisition
- **Examine Object → Reveal Item**: Basic discovery
- **Read Document → Get Info**: Information gathering

```typescript
// Simple teaching puzzle
'obj_drawer': {
  capabilities: { openable: true },
  state: { isOpen: false, isLocked: false },  // Not locked
  children: { items: ['item_key'] },
  onOpen: {
    success: {
      message: "You slide the drawer open. Inside: a brass key.",
      effects: [
        { type: 'SET_ENTITY_STATE', entityId: 'obj_drawer', patch: { isOpen: true } },
        { type: 'REVEAL_FROM_PARENT', entityId: 'item_key', parentId: 'obj_drawer' }
      ]
    }
  }
}
```

### Intermediate Puzzles (Chapters 2-3)

**Goal**: Combine mechanics, require thought

**Examples**:
- **Multi-Step**: Find clue → deduce password → unlock container
- **Tool Usage**: Find tool → use on object → reveal hidden area
- **NPC Gating**: Talk to NPC → get item → use elsewhere

```typescript
// Requires knowledge before using tool
onUse: [
  {
    itemId: 'item_reciprocating_saw',
    conditions: [
      { type: 'FLAG', flag: 'read_secret_document', value: true }  // Must know where to cut
    ],
    success: {
      message: "You fire up the saw. Wood screams. Behind it: a hidden door.",
      effects: [
        { type: 'SET_FLAG', flag: 'bookshelf_destroyed', value: true },
        { type: 'REVEAL_FROM_PARENT', entityId: 'obj_hidden_door', parentId: 'obj_bookshelf' }
      ]
    }
  },
  {
    itemId: 'item_reciprocating_saw',
    conditions: [],
    success: {
      message: "Battery's too low. You need more information before attempting this."
    }
  }
]
```

### Advanced Puzzles (Chapters 4-5)

**Goal**: Test player's accumulated knowledge and items

**Examples**:
- **Multi-Item Sequences**: Use A on B → reveals C → use C on D → solution
- **Password Synthesis**: Combine clues from 3+ sources
- **Timed Sequences**: Do X before Y happens
- **Environmental**: Change object states to enable access

```typescript
// Complex multi-condition puzzle
onUse: [
  {
    itemId: 'item_master_key',
    conditions: [
      { type: 'FLAG', flag: 'knows_door_combination', value: true },
      { type: 'FLAG', flag: 'has_authorization', value: true },
      { type: 'NO_FLAG', flag: 'door_opened' }
    ],
    success: {
      message: "Key and code together. The vault door unlocks with a heavy clunk.",
      effects: [
        { type: 'SET_FLAG', flag: 'door_opened', value: true },
        { type: 'SET_ENTITY_STATE', entityId: 'obj_vault_door', patch: { isLocked: false, isOpen: true } },
        { type: 'REVEAL_FROM_PARENT', entityId: 'obj_evidence_box', parentId: 'obj_vault_door' }
      ]
    }
  }
]
```

---

## 🗺️ Location Design

### Location Purposes

Each location should serve a purpose:

1. **Hub Locations**: Central areas that connect to multiple places
2. **Puzzle Locations**: Contain specific puzzles/challenges
3. **Story Locations**: Reveal major plot points
4. **Atmospheric Locations**: Build mood and world
5. **Reward Locations**: Hidden areas with payoff

### Location Structure

```typescript
'loc_cafe': {
  name: 'S.B. Café',
  description: 'A small café. Morning light through dusty windows. Counter to your left, tables scattered around.',

  // What's here by default
  objectIds: ['obj_counter', 'obj_painting', 'obj_tables'],
  npcIds: ['npc_barista'],

  // What players can examine
  examinables: [
    { keywords: ['window', 'windows'], description: 'Dusty. Haven't been cleaned in years.' },
    { keywords: ['light', 'sunlight'], description: 'Morning sun cuts through the dust.' }
  ],

  // Available directions
  availableDirections: {
    north: 'loc_storage_room',
    east: 'loc_street'
  }
}
```

### Location Flow Design

```
CHAPTER 1: Single location (café)
  ├─ Teaches examine, take, use
  └─ Points to next location

CHAPTER 2: 2-3 locations (café + storage + street)
  ├─ Hub location (café) connects to others
  └─ Each location has 1-2 puzzles

CHAPTER 3: 4-5 locations
  ├─ Exploration opens up
  └─ Some locations gated by puzzles

CHAPTER 4: 5-6 locations
  ├─ Complex navigation
  └─ Some locations require items/knowledge

CHAPTER 5: Return to key locations
  ├─ Full access to game world
  └─ Final location unlocked
```

---

## 💡 Story Creation Workflow

### Step 1: Define Your Mystery

**Central Question**: What is the player trying to solve/discover/accomplish?

**Examples**:
- "Who killed the café owner 80 years ago?"
- "Where is the stolen artifact hidden?"
- "How do I escape this locked facility?"

### Step 2: Break Into 5 Chapters

**For each chapter, answer**:
1. What does the player learn?
2. What puzzle do they solve?
3. What new area/NPC do they access?
4. What question does it end on?

**Example: "The Missing Owner"**

```
Ch1: Introduction
  Learn: Café used to be owned by Silas Bloom (disappeared 1939)
  Puzzle: Move painting → find safe → enter password
  Access: Safe with newspaper article
  Question: What happened to Silas Bloom?

Ch2: Investigation
  Learn: Silas was accused of a crime he didn't commit
  Puzzle: Find key → open storage room → find police file
  Access: Storage room, Officer NPC
  Question: Who framed Silas?

Ch3: Revelation
  Learn: Business partner framed Silas, took the building
  Puzzle: Decode ledger → find witness statement
  Access: Hidden basement, Witness NPC
  Question: Where is the evidence?

Ch4: Evidence
  Learn: Evidence hidden in walls of basement
  Puzzle: Use tools → break wall → find documents
  Access: Secret room, full evidence
  Question: What do we do with this?

Ch5: Resolution
  Learn: Present evidence to descendant of partner
  Puzzle: Convince them → clear Silas's name
  Access: Modern-day conclusion
  Question: [Resolved]
```

### Step 3: Design Clue Distribution

**Create Clue Map**:
```
Question: "What is the password?"
  ├─ Clue 1: Painting signature (S.B., 1939)
  ├─ Clue 2: Café sign (S.B. Café)
  ├─ Clue 3: Newspaper article (Silas Bloom)
  ├─ Clue 4: Barista dialogue ("Bloom disappeared")
  └─ Solution: "Justice for Silas Bloom" or "Silas Bloom 1939"
```

**For each major question, create 3-5 clues** distributed across:
- Visual descriptions (50%)
- Documents (25%)
- NPC dialogue (25%)

### Step 4: Design Puzzle Sequence

**Linear → Branching → Linear**

```
CHAPTER START (Linear)
  ├─ Core puzzle that teaches mechanic
  └─ Leads to exploration phase

EXPLORATION (Branching)
  ├─ Puzzle A → Item/Info A ┐
  ├─ Puzzle B → Item/Info B ├─ All needed for...
  └─ Puzzle C → Item/Info C ┘

CONVERGENCE (Linear)
  └─ Final puzzle requires A+B+C
      └─ Chapter conclusion
```

### Step 5: Place Items & Keys

**Golden Rule**: Key is always 1-2 puzzles before its lock

**Example Flow**:
```
Puzzle 1: Open drawer → Get KEY
Puzzle 2: Examine painting → Get CLUE about safe
Puzzle 3: Use KEY on safe → Get DOCUMENT
Puzzle 4: Read DOCUMENT → Get PASSWORD
Puzzle 5: Use PASSWORD on door → Access next chapter
```

### Step 6: Write NPC Dialogue

**For each NPC, define**:
1. **Purpose**: What info/item do they provide?
2. **Gating**: What must player have done first?
3. **Personality**: How do they speak?
4. **Progression**: Do they have multiple stages?

**Example**:
```typescript
{
  name: 'Officer Martinez',
  purpose: 'Provides police file on Silas Bloom case',
  gating: 'Player must have newspaper article',
  personality: 'Gruff, suspicious, but fair',
  progression: [
    'Stage 1: Refuses to talk (no article)',
    'Stage 2: Shares police file (has article)',
    'Stage 3: Demoted to ambient after file given'
  ]
}
```

---

## ✅ Quality Checklist

### Per Chapter

- [ ] **1 Core Mystery**: Clear question driving player forward
- [ ] **3-5 Puzzles**: Mix of container, password, tool-use
- [ ] **5-7 Clues**: Distributed across examine, read, talk
- [ ] **1-2 NPCs**: Provide info or items
- [ ] **2-3 Locations**: If not Chapter 1
- [ ] **Pacing**: 15-20 minutes of gameplay
- [ ] **Exit Hook**: Compelling reason to continue

### Per Puzzle

- [ ] **Clear Goal**: Player knows what they're trying to achieve
- [ ] **Fair Clues**: At least 2 clues pointing to solution
- [ ] **Testable**: Can be solved with available info
- [ ] **Rewarding**: Provides item, access, or information
- [ ] **Integrated**: Connects to overall story

### Per Location

- [ ] **Purpose**: Has specific role in story
- [ ] **Atmosphere**: Description sets mood
- [ ] **Objects**: 3-5 interactive objects
- [ ] **Connections**: Clear paths to other locations
- [ ] **Rewards**: Contains items or clues

### Per NPC

- [ ] **Purpose**: Provides specific info/item
- [ ] **Personality**: Distinct voice and manner
- [ ] **Gating**: Requires appropriate flags/items
- [ ] **Topics**: 3-5 conversation topics
- [ ] **Conclusion**: Clear demotion point

---

## 🎨 Creating Compelling Stories

### Mystery Types That Work Well

1. **Murder Mystery**: Who killed X? Why?
2. **Theft Investigation**: Where is stolen Y? Who took it?
3. **Disappearance**: What happened to missing person Z?
4. **Conspiracy**: Who is behind organization A?
5. **Escape**: How do I get out of locked location B?

### Clue Integration Techniques

**The Document Chain**:
```
Letter mentions address → Address leads to location → Location has diary → Diary reveals password
```

**The Witness Network**:
```
NPC A knows about NPC B → NPC B knows about location C → Location C has evidence
```

**The Visual Puzzle**:
```
Painting shows street → Street name is clue → Clue unlocks safe → Safe has next clue
```

### Creating Atmosphere

**Use Multi-Sensory Descriptions**:
- **Visual**: "Dust motes drift in morning light"
- **Sound**: "The old floorboards creak beneath your feet"
- **Smell**: "Stale coffee and old paper"
- **Touch**: "The metal is cold, rust flaking under your fingers"
- **Emotion**: "A chill runs down your spine"

**Layer Time**:
- **Present**: What player sees now
- **Past**: What happened here before
- **Future**: What player anticipates

**Example**:
```
"The café stands quiet now, tables empty, chairs tucked. But you can almost hear the echo of conversations long silenced. The walls remember what happened here in 1939. You're about to uncover what they've kept hidden."
```

### Building Tension

**Chapter Progression**:
- **Ch 1**: Curiosity → "What is this place?"
- **Ch 2**: Investigation → "What happened here?"
- **Ch 3**: Discovery → "Oh no..."
- **Ch 4**: Urgency → "I need to solve this."
- **Ch 5**: Resolution → "Finally, the truth."

---

## 🔍 Technical Best Practices

### Naming Conventions

**IDs**:
```
Locations:  loc_cafe, loc_storage_room, loc_basement
Objects:    obj_painting, obj_safe, obj_door
Items:      item_key, item_newspaper, item_document
NPCs:       npc_barista, npc_officer, npc_witness
Chapters:   ch1-title, ch2-title, ch3-title
Flags:      has_moved_painting, knows_password, completed_chapter_1
```

**Always use descriptive IDs**, not generic ones like `obj_1` or `item_thing`.

### Flag Management

**Flag Naming**:
```
has_{action}_{object}:     has_moved_painting
knows_{information}:       knows_silas_disappeared
completed_{milestone}:     completed_chapter_1
{object}_is_{state}:       safe_is_unlocked
talked_to_{npc}:           talked_to_barista
```

**Flag Cleanup**: In Chapter 5, use flags from previous chapters:
```typescript
conditions: [
  { type: 'FLAG', flag: 'completed_chapter_1', value: true },
  { type: 'FLAG', flag: 'knows_silas_disappeared', value: true },
  { type: 'FLAG', flag: 'has_police_file', value: true }
]
```

### Media Integration

**Every important object/item should have media**:
```typescript
media: {
  images: {
    default: { url: 'https://.../painting.png', description: 'Abstract painting', hint: 'crooked frame' },
    moved: { url: 'https://.../safe_revealed.png', description: 'Safe behind painting', hint: 'hidden safe' }
  }
}
```

**Media Types**:
- **Images**: .png, .jpg (descriptions, objects, NPCs)
- **Videos**: .mp4 (security footage, cutscenes)
- **Audio**: .mp3, .wav (voice messages, ambient sound)
- **PDFs**: .pdf (documents, reports, newspapers)

---

## 📚 Example Story Template

```typescript
// CHAPTER 1: THE DISCOVERY
// Mystery: Who owned this café before?
// Puzzle: Move painting → find safe → enter password
// Clues: Signature (S.B.), newspaper article, barista info
// Reward: Access to storage room

Location: S.B. Café
  Objects:
    - Counter (NPC barista is here)
    - Painting (can be moved, reveals safe)
    - Wall Safe (password protected, contains article)
    - Tables (decorative, searchable)
  Items:
    - Newspaper Article (in safe)
  NPCs:
    - Barista (gives info about Silas Bloom)

// CHAPTER 2: THE PAST
// Mystery: What happened to Silas Bloom?
// Puzzle: Find key → open storage → discover police file
// Clues: Police file, witness statement, photos
// Reward: Access to basement

Location: Storage Room
  Objects:
    - Filing Cabinet (locked, contains police file)
    - Boxes (searchable, contain key)
    - Old Radio (atmospheric)
  Items:
    - Storage Key (in boxes)
    - Police File (in filing cabinet)
  NPCs:
    - None (discovered through documents)

// ... Continue for Chapters 3, 4, 5
```

---

## 🎯 Final Reminders for AI Story Creators

1. **Always use Progressive Discovery**: Hide, then reveal
2. **Follow Handler Patterns**: Binary or Multi-State, nothing custom
3. **Distribute Clues Fairly**: 3+ clues for every password
4. **Gate with Flags**: Use conditions to control access
5. **Use Parent-Child**: REVEAL_FROM_PARENT for all hidden content
6. **Test Sequences**: Can player solve with available info?
7. **Write Atmospheric Prose**: Make the world feel real
8. **Create Satisfying Arcs**: Each chapter has beginning/middle/end
9. **Respect Player Intelligence**: Don't over-explain
10. **End Strong**: Resolution should feel earned

---

## Version History

| Date | Changes |
|------|---------|
| 2025-11-25 | Initial creation: Complete game mechanics guide for AI story creators |
