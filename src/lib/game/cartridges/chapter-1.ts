import type { CellId, Chapter, ChapterId, Flag, Game, GameId, GameObject, GameObjectId, Item, ItemId, Location, LocationId, NPC, NpcId, Portal, PortalId, Structure, StructureId, WorldId } from './types';

// --- Chapter 1: The Investigation Begins ---
// The player starts at a street location investigating the abduction of Lili

// =====================================
// ITEMS
// =====================================

const items: Record<ItemId, Item> = {
    // Starting items given to player on chapter start
    'item_audio_message': {
        id: 'item_audio_message' as ItemId,
        name: 'Audio Message',
        description: 'A voice message from your colleague about the Lili abduction case.',
        capabilities: { takeable: false, consumable: false, readable: false, inputtable: false },
        startingLocation: 'player',
        media: {
            audio: {
                url: 'https://example.com/audio/colleague-message.mp3',
                description: 'Colleague briefing about Lili case'
            }
        },
        handlers: {
            onExamine: {
                message: 'An audio message from your colleague. Listen to it to hear the briefing about Lili\'s abduction.',
                media: {
                    url: 'https://example.com/audio/colleague-message.mp3',
                    description: 'Colleague briefing about Lili case',
                    hint: 'audio message'
                }
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'item_police_report': {
        id: 'item_police_report' as ItemId,
        name: 'Police Report',
        description: 'Police report PDF about Lili\'s abduction. Received via email attachment.',
        capabilities: { takeable: false, consumable: false, readable: true, inputtable: false },
        startingLocation: 'player',
        media: {
            document: {
                url: 'https://example.com/documents/lili-police-report.pdf',
                description: 'Official police report on Lili abduction case'
            }
        },
        handlers: {
            onRead: {
                message: 'POLICE REPORT - CASE #2025-0347\n\nVICTIM: Lili Chen, Age 8\nLAST SEEN: Corner of Elm Street and 5th Avenue, 3:45 PM\nWITNESSES: Bus driver reported seeing a gray van nearby\nDESCRIPTION: White panel van, no plates visible\nSTATUS: Active investigation, Amber Alert issued\n\nThe report contains witness statements and a timeline of events.',
                media: {
                    url: 'https://example.com/documents/lili-police-report.pdf',
                    description: 'Police report details',
                    hint: 'official report'
                }
            },
            onExamine: {
                message: 'A detailed police report in PDF format. The case file is marked urgent.',
                media: undefined
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'item_invoice': {
        id: 'item_invoice' as ItemId,
        name: 'Invoice',
        description: 'A crumpled invoice lying near the bus station bench.',
        capabilities: { takeable: true, consumable: false, readable: true, inputtable: false },
        startingLocation: 'loc_street' as LocationId,
        parentId: 'obj_bench' as GameObjectId,
        revealMethod: 'REVEAL_FROM_PARENT',
        handlers: {
            onRead: {
                message: 'INVOICE #8847\nFlorist Express - Fresh Bouquets Daily\n47 Elm Street\nDelivery: 3:30 PM\nRecipient: [Smudged]\n\nThe invoice is dated today. Someone ordered flowers delivered to this street around the time Lili disappeared.',
                media: undefined
            },
            onExamine: {
                message: 'A crumpled piece of paper. It looks like a florist\'s invoice.',
                media: undefined
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    }
};

// =====================================
// GAME OBJECTS
// =====================================

const gameObjects: Record<GameObjectId, GameObject> = {
    // ZONE 1: Bus Station
    'obj_bench': {
        id: 'obj_bench' as GameObjectId,
        name: 'Bench',
        archetype: 'Furniture',
        description: 'A weathered wooden bench at the bus station. Someone left a piece of paper underneath it.',
        capabilities: { openable: false, lockable: false, breakable: false, movable: false, powerable: false, container: false, readable: false, inputtable: false },
        state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        children: {
            items: ['item_invoice' as ItemId],
            objects: []
        },
        handlers: {
            onExamine: {
                message: 'A simple wooden bench, worn from years of use. There\'s a crumpled piece of paper wedged underneath it.',
                media: undefined
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_info_board': {
        id: 'obj_info_board' as GameObjectId,
        name: 'Info Board',
        archetype: 'Readable',
        description: 'A bus schedule information board with timetables and route maps.',
        capabilities: { openable: false, lockable: false, breakable: false, movable: false, powerable: false, container: false, readable: true, inputtable: false },
        state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        handlers: {
            onRead: {
                message: 'BUS SCHEDULE - ROUTE 42\nMonday - Friday\n3:00 PM - Bus Stop A\n3:30 PM - Bus Stop B\n4:00 PM - Bus Stop C\n\nThe 3:30 PM bus would have been here around the time Lili disappeared.',
                media: undefined
            },
            onExamine: {
                message: 'A faded information board listing bus routes and schedules. The glass is scratched and dirty.',
                media: undefined
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    // ZONE 3: Gray Building
    'obj_gray_building_door': {
        id: 'obj_gray_building_door' as GameObjectId,
        name: 'Locked Door',
        archetype: 'Door',
        description: 'A heavy metal door on the gray building. It\'s locked tight.',
        capabilities: { openable: true, lockable: true, breakable: false, movable: false, powerable: false, container: false, readable: false, inputtable: false },
        state: { isOpen: false, isLocked: true, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        handlers: {
            onExamine: {
                message: 'A solid steel door painted gray. There\'s no nameplate or signage. The lock looks industrial-grade.',
                media: undefined
            },
            onOpen: {
                message: 'The door is locked. You\'ll need a key or another way to get inside.',
                media: undefined
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    // ZONE 4: Florist
    'obj_florist_shop': {
        id: 'obj_florist_shop' as GameObjectId,
        name: 'Florist Shop',
        archetype: 'Structure',
        description: 'A small flower shop with a colorful awning. Fresh bouquets line the windows.',
        capabilities: { openable: false, lockable: false, breakable: false, movable: false, powerable: false, container: false, readable: false, inputtable: false },
        state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        handlers: {
            onExamine: {
                message: 'The shop is bright and cheerful. Roses, lilies, and daisies fill the window display. A florist tends to the flowers inside.',
                media: undefined
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    // ZONE 5: Kiosk
    'obj_kiosk_counter': {
        id: 'obj_kiosk_counter' as GameObjectId,
        name: 'Counter',
        archetype: 'Furniture',
        description: 'The kiosk counter displays newspapers, snacks, and cigarettes.',
        capabilities: { openable: false, lockable: false, breakable: false, movable: false, powerable: false, container: false, readable: false, inputtable: false },
        state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        handlers: {
            onExamine: {
                message: 'The counter is cluttered with candy bars, lottery tickets, and today\'s newspapers. A cash register sits at one end.',
                media: undefined
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_kiosk_drawer': {
        id: 'obj_kiosk_drawer' as GameObjectId,
        name: 'Drawer',
        archetype: 'Container',
        description: 'A small drawer behind the kiosk counter.',
        capabilities: { openable: true, lockable: false, breakable: false, movable: false, powerable: false, container: true, readable: false, inputtable: false },
        state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        inventory: { items: [], capacity: 5, allowTags: [], denyTags: [] },
        handlers: {
            onExamine: {
                message: 'A simple wooden drawer. The kiosk vendor keeps receipts and papers in here.',
                media: undefined
            },
            onOpen: {
                message: 'You pull open the drawer. It\'s mostly empty—just some old receipts and a rubber band.',
                media: undefined
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    // ZONE 6: Dark Alley
    'obj_crates': {
        id: 'obj_crates' as GameObjectId,
        name: 'Crates',
        archetype: 'Container',
        description: 'Stacked wooden crates in the alley. They look abandoned.',
        capabilities: { openable: false, lockable: false, breakable: false, movable: true, powerable: false, container: false, readable: false, inputtable: false },
        state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        handlers: {
            onExamine: {
                message: 'Old wooden crates stacked haphazardly. Some are marked with faded shipping labels.',
                media: undefined
            },
            onMove: {
                message: 'You shove the crates aside. Nothing interesting behind them—just more dirt and grime.',
                media: undefined
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_dumpster': {
        id: 'obj_dumpster' as GameObjectId,
        name: 'Dumpster',
        archetype: 'Container',
        description: 'A large metal dumpster filled with trash bags and debris.',
        capabilities: { openable: true, lockable: false, breakable: false, movable: false, powerable: false, container: true, readable: false, inputtable: false },
        state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        inventory: { items: [], capacity: 10, allowTags: [], denyTags: [] },
        handlers: {
            onExamine: {
                message: 'A rusted metal dumpster. The smell is overpowering. Black garbage bags are piled inside.',
                media: undefined
            },
            onOpen: {
                message: 'You lift the heavy lid. The stench hits you immediately—rotting food and something worse. Nothing useful inside, just garbage.',
                media: undefined
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_courtyard_door': {
        id: 'obj_courtyard_door' as GameObjectId,
        name: 'Courtyard Door',
        archetype: 'Door',
        description: 'A rusted metal door at the end of the alley. It leads to a courtyard.',
        capabilities: { openable: true, lockable: false, breakable: false, movable: false, powerable: false, container: false, readable: false, inputtable: false },
        state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        handlers: {
            onExamine: {
                message: 'A weathered door covered in peeling paint. The courtyard beyond is barely visible through the gap.',
                media: undefined
            },
            onOpen: {
                message: 'The door creaks open on rusty hinges. Beyond is a small, neglected courtyard.',
                media: undefined
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    }
};

// =====================================
// NPCs
// =====================================

const npcs: Record<NpcId, NPC> = {
    'npc_electrician': {
        id: 'npc_electrician' as NpcId,
        name: 'Electrician',
        archetype: 'Type1-Scripted',
        description: 'A middle-aged man in work coveralls standing by his van.',
        personality: 'Gruff but helpful. He keeps to himself but notices everything on this street.',
        location: 'loc_street' as LocationId,
        image: {
            url: '',
            description: 'Electrician in work clothes',
            hint: 'electrician worker'
        },
        proximity: { minDistance: 0, maxDistance: 10 },
        topics: [
            {
                topicId: 'topic_greeting',
                keywords: ['hello', 'hi', 'hey'],
                response: 'The electrician nods. "Help you with something? I\'m just finishing up a job here."',
                once: false
            },
            {
                topicId: 'topic_lili',
                keywords: ['lili', 'girl', 'missing', 'abduction'],
                response: 'He frowns. "Yeah, I heard about that. Saw a gray van parked here earlier, around 3:30. Didn\'t think much of it at the time."',
                once: true
            }
        ],
        handlers: {
            onTalk: {
                message: 'The electrician wipes his hands on a rag and looks up. "Yeah? What do you need?"'
            }
        },
        npcType: 'type1',
        importance: 'key',
        initialState: {
            stage: 'active',
            isRevealed: true
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'npc_florist': {
        id: 'npc_florist' as NpcId,
        name: 'Florist',
        archetype: 'Type1-Scripted',
        description: 'A friendly woman in an apron, arranging flowers in the shop window.',
        personality: 'Warm and chatty. She notices the comings and goings on the street.',
        location: 'loc_street' as LocationId,
        image: {
            url: '',
            description: 'Florist with apron',
            hint: 'flower shop owner'
        },
        proximity: { minDistance: 0, maxDistance: 10 },
        topics: [
            {
                topicId: 'topic_greeting',
                keywords: ['hello', 'hi', 'hey'],
                response: 'She smiles warmly. "Good afternoon! Can I help you with anything?"',
                once: false
            },
            {
                topicId: 'topic_delivery',
                keywords: ['delivery', 'invoice', 'flowers', 'bouquet'],
                response: 'Her eyes light up. "Oh yes! I made a delivery around 3:30 today. Beautiful roses—someone ordered them for this street. The customer was very specific about the time."',
                once: true
            }
        ],
        handlers: {
            onTalk: {
                message: 'The florist looks up from her work and smiles. "Hello there! Beautiful day for flowers, isn\'t it?"'
            }
        },
        npcType: 'type1',
        importance: 'key',
        initialState: {
            stage: 'active',
            isRevealed: true
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'npc_kiosk_vendor': {
        id: 'npc_kiosk_vendor' as NpcId,
        name: 'Kiosk Vendor',
        archetype: 'Type1-Scripted',
        description: 'An elderly man running the neighborhood kiosk. He sells newspapers and snacks.',
        personality: 'Grumpy but observant. He\'s been running this kiosk for decades.',
        location: 'loc_street' as LocationId,
        image: {
            url: '',
            description: 'Elderly kiosk vendor',
            hint: 'old newspaper seller'
        },
        proximity: { minDistance: 0, maxDistance: 10 },
        topics: [
            {
                topicId: 'topic_greeting',
                keywords: ['hello', 'hi', 'hey'],
                response: 'He grunts. "You buying something or just wasting my time?"',
                once: false
            },
            {
                topicId: 'topic_van',
                keywords: ['van', 'gray', 'vehicle', 'suspicious'],
                response: 'He squints. "Gray van? Yeah, I saw it. Parked right there by the gray building. Driver didn\'t get out. Just sat there watching."',
                once: true
            }
        ],
        handlers: {
            onTalk: {
                message: 'The vendor looks up from his newspaper. "What do you want?"'
            }
        },
        npcType: 'type1',
        importance: 'key',
        initialState: {
            stage: 'active',
            isRevealed: true
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    }
};

// =====================================
// LOCATIONS
// =====================================

const locations: Record<LocationId, Location> = {
    'loc_street': {
        locationId: 'loc_street' as LocationId,
        name: 'Elm Street',
        sceneDescription: 'Elm Street is a quiet urban neighborhood. Bus stops, small shops, and residential buildings line both sides of the street. This is where Lili was last seen.',
        introMessage: 'You arrive at Elm Street, the last place Lili Chen was spotted before she disappeared. The street is quiet now, but the feeling of something wrong lingers in the air.',
        objects: [
            'obj_bench' as GameObjectId,
            'obj_info_board' as GameObjectId,
            'obj_gray_building_door' as GameObjectId,
            'obj_florist_shop' as GameObjectId,
            'obj_kiosk_counter' as GameObjectId,
            'obj_kiosk_drawer' as GameObjectId,
            'obj_crates' as GameObjectId,
            'obj_dumpster' as GameObjectId,
            'obj_courtyard_door' as GameObjectId
        ],
        npcs: [
            'npc_electrician' as NpcId,
            'npc_florist' as NpcId,
            'npc_kiosk_vendor' as NpcId
        ],
        zones: [
            {
                title: 'Bus Station',
                objectIds: ['obj_bench' as GameObjectId, 'obj_info_board' as GameObjectId]
            },
            {
                title: 'Electrician Van',
                objectIds: []
            },
            {
                title: 'Gray Building',
                objectIds: ['obj_gray_building_door' as GameObjectId]
            },
            {
                title: 'Florist',
                objectIds: ['obj_florist_shop' as GameObjectId]
            },
            {
                title: 'Kiosk',
                objectIds: ['obj_kiosk_counter' as GameObjectId, 'obj_kiosk_drawer' as GameObjectId]
            },
            {
                title: 'Dark Alley',
                objectIds: ['obj_crates' as GameObjectId, 'obj_dumpster' as GameObjectId, 'obj_courtyard_door' as GameObjectId]
            }
        ]
    }
};

// =====================================
// PORTALS, STRUCTURES, WORLD
// =====================================

const portals: Record<PortalId, Portal> = {};

const structures: Record<StructureId, Structure> = {};

const world = {
    worldId: 'world_chapter1' as WorldId,
    name: 'Chapter 1 World',
    cells: {},
    navEdges: []
};

// =====================================
// CHAPTERS
// =====================================

const chapters: Record<ChapterId, Chapter> = {
    'chapter_1': {
        id: 'chapter_1' as ChapterId,
        title: 'Chapter 1: The Investigation Begins',
        goal: 'Investigate the abduction of Lili Chen and gather evidence.',
        objectives: [
            { flag: 'received_case_files' as Flag, label: 'Review the case files' },
            { flag: 'talked_to_witnesses' as Flag, label: 'Interview witnesses on Elm Street' },
            { flag: 'found_first_clue' as Flag, label: 'Discover the first clue' },
        ],
        hints: [
            'Start by examining the audio message and police report.',
            'Look around the street to see all the zones.',
            'Talk to the people on the street—they might have seen something.',
            'Check the bus station area where Lili was last seen.'
        ],
        startLocationId: 'loc_street' as LocationId,
        introMessage: 'The case files arrive as you stand on Elm Street. An audio message from your colleague plays, briefing you on Lili Chen\'s abduction. An email attachment contains the full police report.\n\nThis is where it happened. This quiet street is where an 8-year-old girl vanished in broad daylight. Time to find out what really happened here.',
        locations: {},
        gameObjects: {},
        items: {},
        npcs: {},
    }
};

// =====================================
// MAIN GAME CARTRIDGE
// =====================================

export const game: Game = {
    id: 'chapter-1-investigation' as GameId,
    title: 'The Midnight Lounge Jazz Club Case - Chapter 1',
    description: 'The investigation deepens. After uncovering the metal box and its dark secrets, you must now connect the dots between a 1940s cold case and a modern-day copycat killer. The abduction of Lili Chen is just the beginning.',
    setting: 'Modern-day USA, 2025 - Elm Street',
    gameType: 'Limited Open World',
    narratorName: 'Narrator',
    promptContext: `You are the System, responsible for interpreting player commands and translating them into valid game actions. Your role is purely technical—you analyze input and route it to the correct handler.

**// 1. Your Primary Task: Command Interpretation**
Your single most important task is to translate the player's natural language input into a single, valid game command from the 'Available Game Commands' list. Use the exact entity names provided in the 'Visible Names' lists.

**// 2. Your Response Protocol**
- **NO System Messages for Valid Commands:** For ALL valid, actionable commands (take, use, examine, open, read, move, break, etc.), your \`agentResponse\` MUST ALWAYS be null. The Narrator handles ALL descriptive output.

**// 3. Handling Invalid Input**
- **Illogical/Destructive Actions:** ONLY mark as invalid for truly nonsensical actions. Use \`commandToExecute: "invalid"\`.
- **CRITICAL - You MUST NOT Block Valid Commands:** Your ONLY job is translating natural language → game commands.

**// 4. Final Output**
Your entire output must be a single, valid JSON object matching the output schema.
`,
    objectInteractionPromptContext: `You are the System, processing the player's interaction with the {{objectName}}. Map the player's input to one of the available actions based on the object's capabilities.`,
    storyStyleGuide: `You are a master storyteller transforming a text-based RPG log into a captivating crime noir chapter. Write in third person, past tense, focusing on FBI agent Burt Macklin. Use rich, descriptive noir style with atmosphere and internal thought.`,

    systemMedia: {
        take: {
            success: {
                url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761771729/put_in_pocket_s19ume.png',
                description: 'Item goes into pocket',
                hint: 'putting item away'
            }
        }
    },

    systemMessages: {
        needsTarget: {
            examine: 'What do you want to examine?',
            read: 'What do you want to read?',
            take: 'What do you want to take?',
            goto: 'Where do you want to go?',
        },
        notVisible: (itemName: string) => `You don't see any '${itemName}' here.`,
        inventoryEmpty: 'Your pockets are empty.',
        inventoryList: (itemNames: string) => `You have: ${itemNames}`,
        alreadyHaveItem: (itemName: string) => `You already have the ${itemName}.`,
        cannotGoThere: 'You can\'t go there.',
        chapterIncomplete: (goal: string, locationName: string) => `You haven't completed the chapter objective yet: ${goal}. You're still at ${locationName}.`,
        chapterTransition: (chapterTitle: string) => `=== ${chapterTitle} ===`,
        locationTransition: (locationName: string) => `You move to ${locationName}.`,
        noNextChapter: 'You\'ve completed this chapter. Stay tuned for the next one!',
        notReadable: (itemName: string) => `The ${itemName} isn't something you can read.`,
        alreadyReadAll: (itemName: string) => `You've already read everything in the ${itemName}.`,
        textIllegible: 'The text is too faded to read.',
        dontHaveItem: (itemName: string) => `You don't have the ${itemName}.`,
        cantUseItem: (itemName: string) => `You can't use the ${itemName} right now.`,
        cantUseOnTarget: (itemName: string, targetName: string) => `You can't use the ${itemName} on the ${targetName}.`,
        noVisibleTarget: (targetName: string) => `You don't see any ${targetName} here.`,
        useDidntWork: 'That didn\'t work.',
        cantMoveObject: (objectName: string) => `You can't move the ${objectName}.`,
        movedNothingFound: (objectName: string) => `You moved the ${objectName}, but found nothing.`,
        cantOpen: (targetName: string) => `You can't open the ${targetName}.`,
        needsFocus: 'You need to be closer to that object first. Try using "goto [object]".',
        focusSystemError: 'Something went wrong with the focus system.',
        noPasswordInput: (objectName: string) => `To unlock the ${objectName}, use: /password <your guess>`,
        alreadyUnlocked: (objectName: string) => `The ${objectName} is already unlocked.`,
        wrongPassword: 'Wrong password. Try again.',
        cantDoThat: 'You can\'t do that.',
        somethingWentWrong: 'Something went wrong.',
    },

    world: world,
    structures: structures,
    locations: locations,
    portals: portals,
    gameObjects: gameObjects,
    items: items,
    npcs: npcs,
    chapters: chapters,
    startChapterId: 'chapter_1' as ChapterId,
};
