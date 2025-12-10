import type { CellId, Chapter, ChapterId, Flag, Game, GameId, GameObject, GameObjectId, Item, ItemId, Location, LocationId, NPC, NpcId, Portal, PortalId, Structure, StructureId, WorldId } from './types';

// --- Chapter 1: Placeholder Structure ---
// TODO: Fill in with actual game content

const gameObjects: Record<GameObjectId, GameObject> = {
    'obj_placeholder_desk': {
        id: 'obj_placeholder_desk' as GameObjectId,
        name: 'Detective\'s Desk',
        archetype: 'Furniture',
        description: 'A sturdy oak desk covered with case files and coffee stains. Your workspace.',
        capabilities: { openable: false, lockable: false, breakable: false, movable: false, powerable: false, container: false, readable: false, inputtable: false },
        state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        handlers: {
            onExamine: {
                message: 'The desk is cluttered with files from Chapter 0. The metal box case is closed, but the mystery lingers in your mind.',
                media: undefined
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    }
};

const items: Record<ItemId, Item> = {
    'item_placeholder_badge': {
        id: 'item_placeholder_badge' as ItemId,
        name: 'FBI Badge',
        description: 'Your FBI identification badge. Burt Macklin, Special Agent.',
        capabilities: { takeable: true, consumable: false, readable: false, inputtable: false },
        startingLocation: 'player',
        handlers: {
            onExamine: {
                message: 'Your badge gleams under the light. FEDERAL BUREAU OF INVESTIGATION. SPECIAL AGENT BURT MACKLIN. It\'s seen better days, but it still opens doors.',
                media: undefined
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    }
};

const npcs: Record<NpcId, NPC> = {
    'npc_placeholder_receptionist': {
        id: 'npc_placeholder_receptionist' as NpcId,
        name: 'Office Receptionist',
        archetype: 'Type1-Scripted',
        description: 'A friendly receptionist at the FBI field office.',
        personality: 'Professional and helpful, she knows everyone in the building.',
        location: 'loc_office' as LocationId,
        image: {
            url: '',
            description: 'FBI office receptionist',
            hint: 'receptionist'
        },
        proximity: { minDistance: 0, maxDistance: 10 },
        topics: [
            {
                topicId: 'topic_greeting',
                keywords: ['hello', 'hi', 'hey'],
                response: 'Good morning, Agent Macklin. How can I help you today?',
                once: false
            }
        ],
        handlers: {
            onTalk: {
                message: 'The receptionist looks up from her computer and smiles. "Agent Macklin, good to see you. What can I do for you?"'
            }
        },
        npcType: 'type1',
        importance: 'ambient',
        initialState: {
            stage: 'active',
            isRevealed: true
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    }
};

const locations: Record<LocationId, Location> = {
    'loc_office': {
        locationId: 'loc_office' as LocationId,
        name: 'FBI Field Office',
        sceneDescription: 'The FBI field office is a maze of desks, filing cabinets, and fluorescent lights. The air smells of coffee and stale cigarettes.',
        introMessage: 'You push through the glass doors into the field office. The familiar buzz of activity washes over you—phones ringing, keyboards clacking, agents moving with purpose.',
        objects: ['obj_placeholder_desk' as GameObjectId],
        npcs: ['npc_placeholder_receptionist' as NpcId],
        zones: [
            {
                title: 'At your desk',
                objectIds: ['obj_placeholder_desk' as GameObjectId]
            }
        ]
    }
};

const portals: Record<PortalId, Portal> = {};

const structures: Record<StructureId, Structure> = {};

const world = {
    worldId: 'world_chapter1' as WorldId,
    name: 'Chapter 1 World',
    cells: {},
    navEdges: []
};

const chapters: Record<ChapterId, Chapter> = {
    'chapter_1': {
        id: 'chapter_1' as ChapterId,
        title: 'Chapter 1: The Investigation Begins',
        goal: 'Begin investigating the cold case and the copycat killer.',
        objectives: [
            { flag: 'chapter_1_intro_complete' as Flag, label: 'Start the investigation' },
        ],
        hints: [],
        startLocationId: 'loc_office' as LocationId,
        introMessage: 'The metal box case from the cafe haunts you. The connection between the 1940s murder and the present-day copycat killer is undeniable. It\'s time to dig deeper.',
        locations: {},
        gameObjects: {},
        items: {},
        npcs: {},
    }
};

// --- Main Game Cartridge ---
export const game: Game = {
    id: 'chapter-1-investigation' as GameId,
    title: 'The Midnight Lounge Jazz Club Case - Chapter 1',
    description: 'The investigation deepens. After uncovering the metal box and its dark secrets, you must now connect the dots between a 1940s cold case and a modern-day copycat killer.',
    setting: 'Modern-day USA, 2025 - FBI Field Office',
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
