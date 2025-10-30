
import type { CellId, Chapter, ChapterId, Flag, Game, GameId, GameObject, GameObjectId, Item, ItemId, Location, LocationId, NPC, NpcId, Portal, PortalId, Structure, StructureId, WorldId } from './types';

// --- Static Game Data ---

const gameObjects: Record<GameObjectId, GameObject> = {
    'obj_brown_notebook': {
        id: 'obj_brown_notebook' as GameObjectId,
        name: 'Brown Notebook',
        archetype: 'Container',
        description: 'A very worn, leather-bound notebook rests on a table.',
        capabilities: { openable: true, lockable: true, breakable: false, movable: false, powerable: false, container: true, readable: true, inputtable: true },
        state: { isOpen: false, isLocked: true, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        inventory: { items: ['item_sd_card', 'item_newspaper_article'] as ItemId[], capacity: 2, allowTags: [], denyTags: [] },
        children: { items: ['item_sd_card', 'item_newspaper_article'] as ItemId[] },
        media: {
            images: {
                default: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759242347/Notebook_locked_ngfes0.png', description: 'A locked notebook.', hint: 'locked notebook' },
                unlocked: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759242346/Notebook_unlocked_fpxqgl.jpg', description: 'An unlocked notebook.', hint: 'unlocked notebook' }
            },
            sounds: { onUnlock: 'click.mp3' }
        },
        input: { type: 'phrase', validation: 'Justice for Silas Bloom', hint: 'Stuck? Maybe this will help: https://airpg-minigames.vercel.app/games/the-notebook', attempts: null, lockout: null },
        handlers: {
            onExamine: {
                success: { message: "The leather notebook sits on the table, its cover soft and worn by decades of use. A brass clasp holds it shut—locked tight. Someone went to the trouble of protecting whatever's inside. You trace the lock with your thumb. Cold metal. No keyhole, just a mechanism waiting for the right phrase." },
                fail: { message: "" },
                alternateMessage: "The notebook lies open, its brass clasp now released. Inside, nestled in the center spread, you find a small SD card—black, modern, completely out of place against the yellowed pages. Next to it, a folded newspaper clipping, brown with age. Someone hid these here deliberately."
            },
            onOpen: {
                conditions: [{ type: 'STATE', entityId: 'obj_brown_notebook', key: 'isLocked', equals: false }],
                success: {
                    message: "The notebook lies open, its brass clasp unfastened. In the crease between worn pages rests a single black SD card—modern, cold, impossibly out of place amid the faded ink and yellowed paper. Next to it, a folded newspaper clipping, brown with age. These objects don't belong to the same era, yet here they are, hidden together. The notebook's owner made a choice. Archive the past on modern media. Make sure it survived.",
                    effects: [
                        { type: 'SET_ENTITY_STATE', entityId: 'obj_brown_notebook', patch: { isOpen: true, currentStateId: 'unlocked' } }
                    ]
                },
                fail: { message: "The brass clasp refuses to budge. This lock needs a password—a phrase, not a key. Whatever's inside, someone made sure it stayed hidden. Stuck? Maybe this will help: https://airpg-minigames.vercel.app/games/the-notebook" }
            },
            onRead: {
                conditions: [
                    { type: 'STATE', entityId: 'obj_brown_notebook', key: 'isLocked', equals: false },
                    { type: 'STATE', entityId: 'obj_brown_notebook', key: 'isOpen', equals: true }
                ],
                success: {
                    message: "The notebook lies open, its brass clasp now released. Inside, nestled in the center spread, you find a small SD card—black, modern, completely out of place against the yellowed pages. Next to it, a folded newspaper clipping, brown with age. Someone hid these here deliberately.",
                    effects: []
                },
                fail: { message: "The brass clasp refuses to budge. This lock needs a password—a phrase, not a key. Whatever's inside, someone made sure it stayed hidden. Stuck? Maybe this will help: https://airpg-minigames.vercel.app/games/the-notebook" }
            },
            onUnlock: {
                success: {
                    message: "The brass clasp gives with a soft click. The cover swings open, leather hinges creaking. Inside, pressed between aged pages, two objects reveal themselves: a black SD card—modern, digital, completely anachronistic—and beside it, a folded newspaper clipping, brown with decades. Someone preserved the past in two formats. Paper that survived seventy years. Data that will survive longer. Both hidden here, waiting.",
                    effects: [
                        { type: 'SET_FLAG', flag: 'has_unlocked_notebook' as Flag }
                    ]
                },
                fail: { message: "That password doesn't work. The lock remains stubbornly shut." }
            },
            onMove: {
                success: { message: "You slide the notebook around on the table, but there's nothing hidden underneath." },
                fail: { message: "" }
            }
        },
        fallbackMessages: {
            default: "That's not going to work. It's a key piece of evidence.",
            notOpenable: "You can't open that.",
            locked: "It's locked.",
            noEffect: "Using that on the notebook has no effect."
        },
        design: { 
            authorNotes: "Central puzzle item for Chapter 1.",
            tags: ['notebook', 'book']
        },
        version: { schema: "1.0", content: "1.0" }
    },
    'obj_chalkboard_menu': {
        id: 'obj_chalkboard_menu' as GameObjectId,
        name: 'Chalkboard Menu',
        archetype: 'Signage',
        description: "There's a chalkboard menu near the counter with today's specials.",
        capabilities: { openable: false, lockable: false, breakable: true, movable: true, powerable: false, container: false, readable: true, inputtable: false },
        state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        inventory: { items: [], capacity: 0 },
        children: { items: ['item_iron_pipe' as ItemId] },
        media: {
            images: {
                default: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759603706/Chalkboard_h61haz.png', description: 'A chalkboard menu in a cafe.', hint: 'chalkboard menu' },
                moved: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761261134/iron_pipe_bpcofa.png', description: 'The chalkboard has been moved aside, revealing a heavy iron pipe leaning against the wall.', hint: 'moved chalkboard with pipe' }
            }
        },
        handlers: {
            onExamine: {
                success: { message: "A wooden-framed chalkboard menu stands near the counter, angled against the wall. Today's handwritten special: 'Three scones for the price of two. A deal almost as sweet as justice.' That last word—justice—feels deliberate. Someone's leaving breadcrumbs. You notice the chalkboard isn't flush with the wall. Something's propped up behind it." },
                fail: { message: "" },
                alternateMessage: "The chalkboard menu sits pushed aside now, its daily special still promising justice. The pipe you found behind it is gone."
            },
            onMove: {
                conditions: [{ type: 'NO_FLAG', flag: 'has_moved_chalkboard' }],
                success: {
                    message: "The chalkboard scrapes across tile as you shove it aside. Behind it, leaning against the exposed brick like it's been waiting for you, is a heavy iron pipe. Cold steel, solid weight, rust at the joints. The kind of tool that solves problems that don't have keys.",
                    effects: [
                        { type: 'SET_FLAG', flag: 'has_moved_chalkboard', value: true },
                        { type: 'REVEAL_FROM_PARENT', entityId: 'item_iron_pipe', parentId: 'obj_chalkboard_menu' },
                        { type: 'SET_ENTITY_STATE', entityId: 'obj_chalkboard_menu', patch: { currentStateId: 'moved', isMoved: true } }
                    ]
                },
                fail: { message: "You shift the chalkboard stand back and forth, but there's nothing left behind it. You already found what was hidden here." }
            }
        },
        fallbackMessages: { 
            default: "Probably best to leave the menu alone. It's not part of the case.",
            notMovable: "It's a heavy stand, but you manage to slide it aside."
        },
        design: { 
            authorNotes: "Contains the 'justice' clue and hides the iron pipe.",
            tags: ['chalkboard', 'menu', 'board']
        },
        version: { schema: "1.0", content: "1.2" }
    },
    'obj_magazine': {
        id: 'obj_magazine' as GameObjectId,
        name: 'Magazine',
        archetype: 'Prop',
        description: 'A discarded magazine lies on an empty table.',
        capabilities: { openable: false, lockable: false, breakable: true, movable: true, powerable: false, container: false, readable: true, inputtable: false },
        state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        media: { images: { default: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759603706/Newspaper_p85m1h.png', description: 'A magazine on a table.', hint: 'magazine' } } },
        handlers: {
            onExamine: {
                success: { message: "You glance at a copy of this week's local entertainment magazine. The cover story discusses the current series of murders. The usual craziness of a Metropolis." },
                fail: { message: "" },
                alternateMessage: "It's just today's magazine. Nothing new here."
            },
            onMove: {
                success: { message: "You slide the magazine aside. Nothing but a sticky coffee ring on the table." },
                fail: { message: "" }
            }
        },
        fallbackMessages: { 
            default: "The magazine is old news. Let's stick to the facts of our case.",
            notMovable: "You shift the magazine, revealing a sticky coffee ring. Not the clue you were hoping for."
        },
        design: { 
            authorNotes: "Flavor item to build atmosphere.",
            tags: ['magazine', 'paper']
        },
        version: { schema: "1.0", content: "1.0" }
    },
    'obj_bookshelf': {
        id: 'obj_bookshelf' as GameObjectId,
        name: 'Bookshelf',
        archetype: 'Furniture',
        description: "A small bookshelf filled with used paperbacks is tucked into a corner.",
        capabilities: { openable: false, lockable: false, breakable: false, movable: true, powerable: false, container: false, readable: false, inputtable: false },
        state: { isOpen: true, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        inventory: { items: [], capacity: null },
        children: { items: [] },
        media: { images: { default: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759604596/Bookshelf_Cafe_kn4poz.png', description: 'A bookshelf in a cafe.', hint: 'bookshelf reading corner' } } },
        handlers: {
            onExamine: {
                success: {
                    message: "You turn to a small bookshelf filled with used paperbacks. The titles include: 'The Art of the Deal', 'A Brief History of Time', and a romance novel called 'Justice for My Love'.",
                    effects: [
                        { type: 'SET_FLAG', flag: 'has_seen_justice_book', value: true }
                    ]
                },
                fail: { message: "" },
                alternateMessage: "The bookshelf still has that romance novel, 'Justice for My Love'."
            },
            onMove: {
                success: { message: "It's too heavy to move by yourself." },
                fail: { message: "" }
            }
        },
        fallbackMessages: { 
            default: "It's just a bookshelf. Let's not get sidetracked.",
            notMovable: "It's too heavy to move by yourself."
        },
        design: { 
            authorNotes: "Contains the other 'justice' clue for the notebook.",
            tags: ['books', 'shelf']
        },
        version: { schema: "1.0", content: "1.0" }
    },
    'obj_painting': {
        id: 'obj_painting' as GameObjectId,
        name: 'Painting on the wall',
        archetype: 'Surface',
        description: 'An abstract painting hangs on the wall.',
        capabilities: { openable: false, lockable: false, breakable: false, movable: true, powerable: false, container: false, readable: false, inputtable: false },
        state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        media: {
            images: {
                default: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759604943/picture_on_wall_fcx10j.png', description: 'A painting on the wall of the cafe.', hint: 'abstract painting' },
                moved: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761263220/safe_behind_Painting_dbo6qc.png', description: 'The painting has been moved, revealing a wall safe behind it.', hint: 'revealed wall safe' }
            }
        },
        handlers: {
            onExamine: {
                success: { message: "An abstract painting hangs on the exposed brick wall—swirls of deep blues and violent reds, chaotic but intentional. Modern art in a vintage cafe. The frame sits slightly crooked, like someone hung it in a hurry or moved it recently. Bottom corner: a signature in black paint. 'S.B.' Those initials again." },
                fail: { message: "" },
                alternateMessage: "The abstract painting leans against the wall now, its frame revealing the mounting hook and the safe behind it. 'S.B.'—the signature feels more significant now."
            },
            onMove: {
                conditions: [{ type: 'NO_FLAG', flag: 'has_moved_painting' }],
                success: {
                    message: "You lift the painting off its hook. It's heavier than it looks—real canvas, solid frame. Behind it, set flush into the brick, is a small steel wall safe. Institutional gray, combination lock gleaming. Someone wanted to hide this. The question is why a cafe has a wall safe in the first place.",
                    effects: [
                        { type: 'SET_FLAG', flag: 'has_moved_painting', value: true },
                        { type: 'REVEAL_FROM_PARENT', entityId: 'obj_wall_safe', parentId: 'obj_painting' },
                        { type: 'SET_ENTITY_STATE', entityId: 'obj_painting', patch: { isMoved: true, currentStateId: 'moved' } }
                    ]
                },
                fail: { message: "You adjust the painting, but there's nothing new behind it. The safe is all you're going to find here." }
            }
        },
        fallbackMessages: { 
            default: "The painting is nice, but it's not a clue.",
            notMovable: "You can't move the painting, but you could try looking behind it."
        },
        design: { 
            authorNotes: "Contains the 'S.B.' clue and hides the wall safe.",
            tags: ['painting', 'art']
        },
        version: { schema: "1.0", content: "1.2" }
    },
    'obj_wall_safe': {
        id: 'obj_wall_safe' as GameObjectId,
        name: 'Wall Safe',
        archetype: 'Container',
        description: 'A small, steel safe is set into the wall.',
        capabilities: { openable: true, lockable: true, breakable: false, movable: false, powerable: false, container: true, readable: false, inputtable: false },
        state: { isOpen: false, isLocked: true, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        inventory: { items: ['item_secret_document'] as ItemId[], capacity: 1 },
        children: { items: ['item_secret_document'] as ItemId[] },
        media: {
            images: {
                default: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761263220/safe_behind_Painting_dbo6qc.png', description: 'A closed wall safe.', hint: 'wall safe' },
                unlocked: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761263220/safe_behind_painting_open_tpmf0m.png', description: 'An open wall safe containing a document.', hint: 'open safe' },
                unlocked_empty: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761293940/safe_behind_painting_open_empty_pn2js2.png', description: 'An open, empty wall safe.', hint: 'empty safe' }
            }
        },
        handlers: {
            onExamine: {
                success: { message: "The wall safe is small but serious—steel construction, flush mount, professional installation. Cold to the touch. A single brass keyhole sits beneath a reinforced handle. This isn't the kind of safe you find in residential buildings. Someone needed secure storage, and they needed it hidden behind a painting. The lock is pristine, well-maintained." },
                fail: { message: "" }
            },
            onUse: [
                {
                    itemId: 'item_safe_key' as ItemId,
                    conditions: [{ type: 'NO_FLAG', flag: 'safe_is_unlocked' }],
                    success: {
                        message: "The brass key slides into the lock like it was made for it—because it was. One smooth turn, and the internal mechanism gives with a heavy clunk. The door swings open on well-oiled hinges. Inside, mounted in a document sleeve, is a thick manila file folder. Red letters stamped across the cover: CONFIDENTIAL. This is what someone was hiding.",
                        effects: [
                            { type: 'SET_FLAG', flag: 'safe_is_unlocked', value: true },
                            { type: 'SET_ENTITY_STATE', entityId: 'obj_wall_safe', patch: { isLocked: false, isOpen: true, currentStateId: 'unlocked' } },
                            { type: 'REVEAL_FROM_PARENT', entityId: 'item_secret_document', parentId: 'obj_wall_safe' },
                            { type: 'REMOVE_ITEM', itemId: 'item_safe_key' }
                        ]
                    },
                    fail: { message: "The safe is already unlocked. The key served its purpose." }
                }
            ]
        },
        stateMap: {
            'default': { // Locked state
                description: "A small, steel safe is set into the wall. It's locked.",
            },
            'unlocked': {
                description: "The safe is open. Inside, you see a thick confidential file.",
                overrides: {
                    onExamine: {
                        success: { message: "The safe is open. Inside, you see a thick confidential file." },
                        fail: { message: "" }
                    }
                }
            },
            'unlocked_empty': {
                description: "You already cracked that safe open. There is nothing left behind.",
                overrides: {
                    onExamine: {
                        success: { message: "You already cracked that safe open. There is nothing left behind." },
                        fail: { message: "" }
                    }
                }
            }
        },
        fallbackMessages: {
            default: "That doesn't work on the safe.",
            locked: "It's locked tight. We need the wall safe key.",
            notMovable: "It's built into the wall. It's not going anywhere."
        },
        design: {
            authorNotes: "Final puzzle for chapter 1. Opened by the wall safe key from the coffee machine.",
            tags: ['safe']
        },
        version: { schema: "1.0", content: "1.1" }
    },
    'obj_coffee_machine': {
        id: 'obj_coffee_machine' as GameObjectId,
        name: 'Coffee Machine',
        archetype: 'Device',
        description: "It's a high-end Italian coffee machine, gleaming under the cafe lights.",
        capabilities: { openable: false, lockable: false, breakable: true, movable: false, powerable: false, container: true, readable: false, inputtable: false },
        state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        inventory: { items: [], capacity: 1 },
        media: {
            images: {
                default: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761211151/coffee_machine_detail_frexuu.png', description: 'A high-end Italian coffee machine.', hint: 'coffee machine' },
                broken: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761211151/coffee_machine_detail_broken_slkpfd.png', description: 'The shattered remains of the coffee machine\'s side panel.', hint: 'broken machine' }
            }
        },
        handlers: {
            onExamine: {
                success: { message: "It's a high-end Italian espresso machine—all chrome and polished steel, expensive enough to be someone's pride and joy. The barista treats it like a vintage car. But up close, you notice something off: a small service panel on the right side, slightly warped. The screws are stripped, like someone forced it closed in a hurry. The panel rattles when you touch it. It wouldn't take much to break it open." },
                fail: { message: "" }
            },
            onMove: {
                success: { message: "The machine is bolted directly to the counter—commercial installation, not going anywhere. Besides, it weighs more than you'd want to lift." },
                fail: { message: "" }
            },
            onUse: [
                {
                    itemId: 'item_iron_pipe' as ItemId,
                    conditions: [{ type: 'NO_FLAG', flag: 'machine_is_broken' }],
                    success: {
                        message: "You bring the iron pipe down on the warped service panel. Sharp crack—plastic and metal shatter under the impact. The panel splits open, revealing the internal cavity. Something small and brass tumbles out, bouncing once on the counter before settling. A key. Someone hid a key inside the coffee machine, and they didn't want it found the easy way.",
                        effects: [
                            { type: 'SET_FLAG', flag: 'machine_is_broken' as Flag },
                            { type: 'SPAWN_ITEM', itemId: 'item_deposit_key' as ItemId, containerId: 'obj_coffee_machine' as GameObjectId },
                            { type: 'SET_OBJECT_STATE', objectId: 'obj_coffee_machine', state: { isBroken: true, isOpen: true, currentStateId: 'broken' } },
                            { type: 'SHOW_MESSAGE', sender: 'narrator', content: 'The side of the coffee machine is now smashed.', imageId: 'obj_coffee_machine' }
                        ]
                    },
                    fail: { message: "The coffee machine is already broken open. One hit was enough." }
                }
            ]
        },
        stateMap: {
            default: {
                description: "It's a high-end Italian coffee machine. A small service compartment on the side seems to be stuck."
            },
            broken: {
                description: "The side panel of the coffee machine is smashed. Amidst the broken plastic, you can see where the key was hidden."
            }
        },
        fallbackMessages: { 
            default: "That doesn't seem to work on the coffee machine.",
            notOpenable: "You can't open it. The compartment is jammed shut.",
            noEffect: "Using that on the coffee machine has no effect."
        },
        design: {
            authorNotes: "Breakable object containing the wall safe key. Requires the iron pipe to break.",
            tags: ['machine', 'coffee']
        },
        version: { schema: "1.0", content: "1.1" }
    }
};

const items: Record<ItemId, Item> = {
    'item_player_phone': {
        id: 'item_player_phone' as ItemId,
        name: 'Phone',
        alternateNames: ['phone', 'smartphone', 'cell phone', 'mobile', 'fbi phone', 'my phone'],
        archetype: 'Gadget',
        description: "Your standard-issue FBI smartphone. It has a camera, secure messaging, and a slot for external media.",
        capabilities: { isTakable: false, isReadable: true, isUsable: true, isCombinable: true, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: true },
        handlers: {
            onUse: {
                success: {
                    message: "You pull out your phone. The camera, messaging, and analysis apps are ready."
                },
                fail: {
                    message: ""
                }
            },
            defaultFailMessage: "You can't use the phone like that."
        },
        design: { 
            authorNotes: "Player's primary tool.",
            tags: ['phone']
        },
        version: { schema: "1.0", content: "1.0" }
    },
    'item_iron_pipe': {
        id: 'item_iron_pipe' as ItemId,
        name: 'Iron Pipe',
        alternateNames: ['iron pipe', 'pipe', 'heavy pipe', 'metal pipe'],
        archetype: 'Tool',
        description: 'A heavy iron pipe. Iron pipes come in handy to open or break things.',
        capabilities: { isTakable: true, isReadable: false, isUsable: true, isCombinable: false, isConsumable: true, isScannable: false, isAnalyzable: false, isPhotographable: false },
        media: {
            image: {
                url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761261134/iron_pipe_bpcofa.png',
                description: 'A heavy iron pipe.',
                hint: 'iron pipe'
            }
        },
        handlers: {
            onTake: {
                success: {
                    message: "You take the Iron Pipe. It feels heavy and solid in your hand.",
                    effects: [
                        { type: 'ADD_ITEM', itemId: 'item_iron_pipe' },
                        { type: 'SET_ENTITY_STATE', entityId: 'item_iron_pipe', patch: { taken: true } }
                    ]
                },
                fail: { message: "" }
            },
            onExamine: {
                success: { message: "It's a heavy iron pipe. It could be useful for forcing something open." },
                fail: { message: ""}
            },
            defaultFailMessage: "Sorry Burt, you can't use the pipe by itself. You need to use it on an object."
        },
        design: { 
            authorNotes: "Tool for breaking objects like the coffee machine.",
            tags: ['pipe']
        },
        version: { schema: "1.0", content: "1.0" }
    },
    'item_safe_key': {
        id: 'item_safe_key' as ItemId,
        name: 'Wall Safe Key',
        alternateNames: ['safe key', 'key', 'small key', 'ornate key'],
        archetype: 'Key',
        description: 'A small, ornate brass key. It looks like it might fit the wall safe behind the painting.',
        capabilities: { isTakable: true, isReadable: true, isUsable: true, isCombinable: false, isConsumable: true, isScannable: false, isAnalyzable: false, isPhotographable: false },
        media: {
            image: {
                url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761211151/deposit_box_key_f5g2k2.png',
                description: 'A small brass key for the wall safe.',
                hint: 'wall safe key'
            }
        },
        handlers: {
            onTake: {
                success: {
                    message: "You pick up the small brass key and put it in your pocket.",
                    effects: [
                        { type: 'ADD_ITEM', itemId: 'item_safe_key' },
                        { type: 'SET_ENTITY_STATE', entityId: 'item_safe_key', patch: { taken: true } }
                    ]
                },
                fail: { message: "You can't take that right now." }
            },
            onRead: {
                success: { message: "It's a small, ornate brass key. No markings or labels, but it looks like it would fit a safe."},
                fail: { message: "" }
            },
            onExamine: {
                success: { message: "It's a small, ornate brass key. No markings or labels, but it looks like it would fit a safe."},
                fail: { message: "" }
            },
            defaultFailMessage: "You need to use this key on the wall safe."
        },
        design: {
            authorNotes: "Key found inside the broken coffee machine. Opens the wall safe behind the painting.",
            tags: ['key']
        },
        version: { schema: "1.0", content: "1.1" }
    },
    'item_business_card': {
        id: 'item_business_card' as ItemId,
        name: 'Business Card',
        alternateNames: ['business card', 'card', 'musicians card', 'saxo card', 'sax card'],
        archetype: "Personal",
        description: 'A simple business card for a musician. It reads: "S A X O - The World\'s Best Sax Player". A phone number is listed, along with a handwritten number "1943" and the name "ROSE".',
        alternateDescription: "The musician's business card. That name, 'ROSE', and the number '1943' seem significant.",
        capabilities: { isTakable: true, isReadable: true, isUsable: false, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        handlers: {
            onTake: {
                success: { message: "You pick up the business card." },
                fail: { message: "You can't take that right now." }
            },
            onRead: {
                success: { message: 'The card reads: "S A X O - The World\'s Best Sax Player". A phone number is listed, along with a handwritten number "1943" and the name "ROSE".'},
                fail: { message: "You can't read that now."}
            }
        },
        media: {
            image: {
                url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759241477/Screenshot_2025-09-30_at_15.46.02_fuk4tb.png',
                description: 'A business card for a saxophone player.',
                hint: 'business card'
            }
        },
        design: { 
            authorNotes: "Connects to the saxophonist and provides the 'Rose' and '1943' clues.",
            tags: ['card']
        },
        version: { schema: "1.0", content: "1.0" }
    },
    'item_newspaper_article': {
        id: 'item_newspaper_article' as ItemId,
        name: 'Newspaper Article',
        alternateNames: ['newspaper article', 'article', 'newspaper', 'clipping', 'news article', 'old article'],
        archetype: "Document",
        description: 'A folded newspaper article from the 1940s. The headline is about a local musician, Silas Bloom.',
        alternateDescription: 'The old article about Silas Bloom. The mention of your family name, Macklin, still feels strange.',
        capabilities: { isTakable: true, isReadable: true, isUsable: false, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        handlers: {
            onTake: {
                success: { message: 'You take the Newspaper Article. You can "read Article" to find out what it is about.' },
                fail: { message: "You can't take that right now." }
            },
            onRead: {
                success: {
                    effects: [
                        { type: 'SHOW_MESSAGE', speaker: 'narrator', content: 'Carefully, you unfold the old newspaper clipping. The paper is brittle, yellowed with age, but still legible. The ink has faded to a sepia brown, and you can smell the decades in the fibers—dust, old wood, forgotten time.' },
                        { type: 'SHOW_MESSAGE', speaker: 'narrator', content: 'A newspaper article about Silas Bloom.', messageType: 'article', imageId: 'item_newspaper_article' },
                        { type: 'SHOW_MESSAGE', speaker: 'narrator', content: 'Your eyes catch on a name buried in the article: Agent Macklin. FBI. 1940s. A cold realization washes over you—this could be about your grandfather. The case that defined his career... or destroyed it. The notebook wasn\'t just evidence. It was family history.' },
                        { type: 'SET_FLAG', flag: 'notebook_article_read' as Flag },
                        { type: 'SET_FLAG', flag: 'notebook_interaction_complete' as Flag }
                    ]
                },
                fail: { message: "You can't read that now." }
            }
        },
        media: {
            images: {
                default: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759241463/Screenshot_2025-09-30_at_15.51.35_gyj3d5.png', description: 'A folded newspaper article.', hint: 'folded article' },
                opened: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759241463/Screenshot_2025-09-30_at_15.51.35_gyj3d5.png', description: 'An unfolded newspaper article with text visible.', hint: 'open article' }
            }
        },
        design: { 
            authorNotes: "Provides the main backstory and a personal connection for the player.",
            tags: ['article', 'newspaper', 'clipping']
        },
        version: { schema: "1.0", content: "1.0" }
    },
    'item_sd_card': {
        id: 'item_sd_card' as ItemId,
        name: 'SD Card',
        alternateNames: ['sd card', 'card', 'memory card', 'sd', 'media card'],
        archetype: "Media",
        description: 'A small, modern SD card, looking strangely out of place in the old notebook. It probably fits in your phone.',
        alternateDescription: 'You can "use SD Card" to see what\'s on it.',
        capabilities: { isTakable: true, isReadable: true, isUsable: true, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        state: { currentStateId: 'closed' },
        media: {
            images: {
                closed: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761812524/SD_Card_rokilu.png', description: 'A black SD card.', hint: 'sd card' },
                opened: { url: 'https://res.cloudinary.com/dg912bwcc/video/upload/v1759678377/CH_I_completion_jqtyme.mp4', description: 'Video playing from SD card.', hint: 'video' }
            }
        },
        handlers: {
            onTake: {
                success: { message: 'You take the SD Card.' },
                fail: { message: "You can't take that right now." }
            },
            onRead: {
                success: { message: "It's a standard SD card. You'll need to 'use' it to see what's on it." },
                fail: { message: "" }
            },
            onUse: {
                 success: {
                    message: "You slide the SD card into your phone. The screen flickers. A video file loads—grainy, decades old, but the audio is crystal clear. Music fills the cafe. A saxophone, smooth and melancholic, playing a tune that feels like it's been waiting seventy years to be heard again.\n\nSilas Bloom. Talented musician. And that song for Rose... they were in love. You can hear it in every note.\n\nThe video ends leaving you behind with more questions than answers. Your thoughts are a hyper-speed train running through the stations without stop. As you still try to grasp the meaning of all this, you notice the folded newspaper article still resting in the notebook, waiting to be examined.",
                    effects: [
                        { type: 'SET_ENTITY_STATE', entityId: 'item_sd_card', patch: { currentStateId: 'opened' } },
                        { type: 'SET_FLAG', flag: 'notebook_video_watched' as Flag }
                    ]
                },
                fail: { message: "You can't use the SD card right now." }
            }
        },
        design: {
            authorNotes: "Contains the video clue about Silas Bloom.",
            tags: ['sd card', 'card']
        },
        version: { schema: "1.0", content: "1.1" }
    },
    'item_book_deal': {
        id: 'item_book_deal' as ItemId,
        name: 'The Art of the Deal',
        alternateNames: ['art of the deal', 'deal book', 'business book', 'art of deal'],
        archetype: 'Book',
        description: 'A book about business with a gaudy cover.',
        capabilities: { isTakable: false, isReadable: true, isUsable: false, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        state: { readCount: 0, currentStateId: 'default' },
        media: {
            images: {
                default: { url: 'https://images.stockcake.com/public/8/2/1/821cc306-132c-48ca-91e9-5d2bb356fc1e_large/ancient-closed-book-stockcake.jpg', description: 'A closed book.', hint: 'closed book' },
                opened: { url: 'https://the-openbook.com/wp-content/uploads/2023/02/cropped-the-open-book-nieuw.jpg?w=780&h=684', description: 'An open book.', hint: 'open book' }
            }
        },
        handlers: {
            onExamine: {
                success: { message: 'A book about business with a gaudy cover.' },
                fail: { message: "" }
            },
            onTake: {
                fail: { message: "You can't take that book." }
            },
            onRead: {
                success: {
                    message: "It seems to be a ghost-written book about a real estate magnate. Not relevant to the case.",
                    effects: [
                        { type: 'SET_ENTITY_STATE', entityId: 'item_book_deal', patch: { readCount: 1 } }
                    ]
                },
                fail: { message: "" }
            }
        },
        stateMap: {
            'read0': { description: "It seems to be a ghost-written book about a real estate magnate. Not relevant to the case." },
            'read1': { description: "Chapter 1: 'Think Big'. You decide you've thought big enough for one day." },
            'read2': { description: "You skim another chapter. It's mostly just self-praise. This isn't helping the case." }
        },
        design: { tags: ['book', 'distraction'] },
        version: { schema: "1.0", content: "1.1" }
    },
    'item_book_time': {
        id: 'item_book_time' as ItemId,
        name: 'A Brief History of Time',
        alternateNames: ['brief history of time', 'history of time', 'time book', 'physics book', 'brief history'],
        archetype: 'Book',
        description: 'A book about physics by a famous scientist.',
        capabilities: { isTakable: false, isReadable: true, isUsable: false, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        state: { readCount: 0, currentStateId: 'default' },
        media: {
            images: {
                default: { url: 'https://images.stockcake.com/public/8/2/1/821cc306-132c-48ca-91e9-5d2bb356fc1e_large/ancient-closed-book-stockcake.jpg', description: 'A closed book.', hint: 'closed book' },
                opened: { url: 'https://the-openbook.com/wp-content/uploads/2023/02/cropped-the-open-book-nieuw.jpg?w=780&h=684', description: 'An open book.', hint: 'open book' }
            }
        },
        handlers: {
            onExamine: {
                success: { message: 'A book about physics by a famous scientist.' },
                fail: { message: "" }
            },
            onTake: {
                fail: { message: "You can't take that book." }
            },
            onRead: {
                success: {
                    message: "Complex theories about spacetime. Unlikely to help you solve a murder.",
                    effects: [
                        { type: 'SET_ENTITY_STATE', entityId: 'item_book_time', patch: { readCount: 1 } }
                    ]
                },
                fail: { message: "" }
            }
        },
        stateMap: {
            'read0': { description: "Complex theories about spacetime. Unlikely to help you solve a murder." },
            'read1': { description: "You read about black holes and event horizons. Your own event horizon feels like it's about five minutes away if you don't get a lead soon." },
            'read2': { description: "The book talks about the arrow of time. You wish you could fire an arrow back in time and ask Silas Bloom what happened." }
        },
        design: { tags: ['book', 'distraction'] },
        version: { schema: "1.0", content: "1.1" }
    },
    'item_book_justice': {
        id: 'item_book_justice' as ItemId,
        name: 'Justice for My Love',
        alternateNames: ['justice for my love', 'justice book', 'romance novel', 'justice for love', 'love book'],
        archetype: 'Book',
        description: 'A romance novel with a cheesy cover. The title, "Justice for My Love", catches your eye.',
        capabilities: { isTakable: false, isReadable: true, isUsable: false, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        state: { readCount: 0, currentStateId: 'default' },
        media: {
            images: {
                default: { url: 'https://images.stockcake.com/public/8/2/1/821cc306-132c-48ca-91e9-5d2bb356fc1e_large/ancient-closed-book-stockcake.jpg', description: 'A closed book.', hint: 'closed book' },
                opened: { url: 'https://the-openbook.com/wp-content/uploads/2023/02/cropped-the-open-book-nieuw.jpg?w=780&h=684', description: 'An open book.', hint: 'open book' }
            }
        },
        handlers: {
            onExamine: {
                success: { message: 'A romance novel with a cheesy cover. The title, "Justice for My Love", catches your eye.' },
                fail: { message: "" }
            },
            onTake: {
                fail: { message: "You can't take that book." }
            },
            onRead: {
                success: {
                    message: "Against your better judgment, you read a page. 'His voice was like smooth jazz on a rainy night, but his eyes held a storm. She knew then that he would get justice for her, or die trying.'",
                    effects: [
                        { type: 'SET_ENTITY_STATE', entityId: 'item_book_justice', patch: { readCount: 1 } }
                    ]
                },
                fail: { message: "" }
            }
        },
        stateMap: {
            'read0': { description: "Against your better judgment, you read a page. 'His voice was like smooth jazz on a rainy night, but his eyes held a storm. She knew then that he would get justice for her, or die trying.'" },
            'read1': { description: "You flip to a random page. '...and in that moment, she knew their love was a clue, a puzzle box only they could unlock.' You close the book. That's enough of that." },
            'read2': { description: "The back cover has a blurb: 'A story of love, loss, and the quest for justice.' The word 'justice' is practically leaping off the page." }
        },
        design: { tags: ['book', 'clue'] },
        version: { schema: "1.0", content: "1.1" }
    },
    'item_secret_document': {
        id: 'item_secret_document' as ItemId,
        name: 'Secret Document',
        alternateNames: ['secret document', 'confidential file', 'file', 'document', 'confidential document', 'manila folder'],
        archetype: 'Document',
        description: "A thick manila folder simply marked 'CONFIDENTIAL' in red ink. It feels heavy.",
        alternateDescription: "The confidential file from the safe. It's filled with complex legal and financial jargon.",
        capabilities: { isTakable: true, isReadable: true, isUsable: false, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        media: {
            images: {
                default: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761263220/Confidential_File_qegnr4.png', description: 'A confidential document folder.', hint: 'closed document' },
                opened: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761773132/Screenshot_2025-10-29_at_22.24.23_w9e7vd.png', description: 'An open document with text visible.', hint: 'open document' }
            }
        },
        handlers: {
            onTake: {
                success: {
                    message: "You take the confidential file from the safe.",
                    effects: [
                        { type: 'ADD_ITEM', itemId: 'item_secret_document' },
                        { type: 'SET_ENTITY_STATE', entityId: 'item_secret_document', patch: { taken: true } }
                    ]
                },
                fail: { message: "" }
            },
            onRead: {
                success: {
                    message: "You open the file. It's dense with financial reports, shell corporations, and offshore accounts, all linked to a powerful holding company. It's going to take hours to untangle this web, but one name keeps reappearing in the margins: a company called 'Veridian Dynamics'. This feels big... bigger than a simple murder.",
                    effects: [
                        { type: 'SET_FLAG', flag: 'has_read_secret_document' as Flag }
                    ]
                },
                fail: { message: "" }
            }
        },
        design: { tags: ['file', 'document'] },
        version: { schema: "1.0", content: "1.0" }
    }
};

const npcs: Record<NpcId, NPC> = {
    'npc_barista': {
        id: 'npc_barista' as NpcId,
        name: 'Barista',
        description: 'A tired-looking man in his late 20s, with faded tattoos and a cynical arch to his eyebrow. He seems to have seen a thousand stories like yours and is not easily impressed.',
        image: {
            url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759241505/Cafe_barrista_hpwona.png',
            description: 'A portrait of the cafe barista.',
            hint: 'male barista'
        },
        importance: 'primary',
        initialState: {
            stage: 'active',
            trust: 0,
            attitude: 'neutral',
        },
        dialogueType: 'scripted',
        persona: "You are a tired, cynical barista in a downtown cafe. You've seen it all and are not impressed by much. Your primary focus is on making coffee and dealing with customers as efficiently as possible. You will not discuss the case or any past events further, deflecting any questions with short, dismissive, but not overly rude answers. You just want to do your job.",
        welcomeMessage: 'What can I get for you? Or are you just here to brood? Either is fine.',
        goodbyeMessage: "Alright, I've got Pumpkin spice lattes to craft. Good luck with... whatever it is you're doing.",
        startConversationEffects: [{ type: 'SET_FLAG', flag: 'has_talked_to_barista' as Flag }],
        limits: { maxInteractions: 15, interactionLimitResponse: "Seriously, I've got a line of customers. I can't keep chatting. The coffee machine calls." },
        demoteRules: {
            onFlagsAll: ['has_received_business_card' as Flag],
            then: { setStage: 'demoted', setImportance: 'ambient' }
        },
        postCompletionProfile: {
            welcomeMessage: "Back again? Hope you're buying something this time.",
            goodbyeMessage: "See ya.",
            defaultResponse: "Look, I told you what I know. I've got work to do."
        },
        topics: [
            { topicId: 't_greet', label: 'Greeting', keywords: ["hello", "hi", "how are you"], response: { message: 'Another day, another dollar. What do you need?' } },
            { topicId: 't_coffee', label: 'Ask about coffee', keywords: ["coffee", "drink", "menu", "order", "buy", "latte", "cappuccino", "espresso"], response: { message: 'The coffee is hot and the pastries are day-old. The menu is on the board. Let me know if you can decipher my handwriting.' } },
            { topicId: 't_prices', label: 'Ask about prices', keywords: ["price", "cost", "how much"], response: { message: 'More than it should be, less than I want to charge. The prices are on the board.' } },
            { topicId: 't_reco', label: 'Ask for recommendation', keywords: ["recommend", "good", "special"], response: { message: 'The espresso will wake you up. The scones... well, they exist.' } },
            { topicId: 't_man', label: 'Ask about the man in black', keywords: ["man", "regular", "customer", "guy", "who left", "who was sitting here", "the man"], response: { message: "The guy in the black coat? Yeah, he's a regular. Comes in, stares at his notebook, doesn't say much. Pays in cash. My favorite kind of customer." } },
            { topicId: 't_musician', label: 'Ask about his job', keywords: ["musician", "saxophone", "job", "background", "what does he do"], response: { message: "I hear he's a musician. Plays the saxophone out on the corner most days. Keeps to himself, you know?" } },
            { topicId: 't_notebook', label: 'Ask about the notebook', keywords: ["notebook", "book", "his", "what was he doing"], response: { message: "Always scribbling in that old notebook of his. Looked like he was writing the next great American novel, or maybe just his grocery list. Who knows."} },
            { 
              topicId: 't_give_card', 
              label: 'Ask about what he left/his name', 
              keywords: ["business card", "left", "name", "note", "anything else", "what did he leave", "ask about silas bloom", "silas bloom", "know his name"], 
              once: true,
              response: { 
                message: "You know, he left this here the other day. Said I could have it. Some business card. If you're that interested, you can take it. It's just collecting dust.",
                effects: [
                    { type: 'ADD_ITEM', itemId: 'item_business_card' as ItemId },
                    { type: 'SET_FLAG', flag: 'has_received_business_card' as Flag },
                    { type: 'SHOW_MESSAGE', speaker: 'narrator', content: "The barista slides a business card across the counter. It's been added to your inventory.", messageType: 'image', imageId: 'item_business_card' },
                    { type: 'END_CONVERSATION' }
                ]
              } 
            },
            { topicId: 't_insult', label: 'React to insult', keywords: ["stupid", "idiot", "useless", "rude", "dumb"], response: { message: "Hey, I get paid to pour coffee, not to be your punching bag. Watch it." } }
        ],
        fallbacks: {
            default: "Look, I just work here. I pour coffee, I wipe counters. You're the detective.",
            noMoreHelp: "I told you all I know. I've got work to do.",
            offTopic: "I'm not sure what you mean by that.",
        },
        version: { schema: "2.0", content: "1.1" }
    },
    'npc_manager': {
        id: 'npc_manager' as NpcId,
        name: 'Cafe Manager',
        description: 'A cheerful woman in her late 40s, with a permanent, slightly-too-wide smile. She radiates a relentless positivity that feels slightly out of place in the grim city.',
        image: {
            url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759604054/cafe_manager_punwhs.png',
            description: 'Portrait of the cafe manager.',
            hint: 'female manager'
        },
        importance: 'ambient',
        initialState: {
            stage: 'active',
            trust: 50,
            attitude: 'friendly'
        },
        dialogueType: 'freeform',
        persona: "You are Brenda, the relentlessly cheerful and bubbly manager of 'The Daily Grind' cafe. You love talking about your 'Artisan Coffee of the Week', the daily specials, and the local community art you hang on the walls. You are completely oblivious to any crime or mystery. Your job is to be a fountain of pleasant, slightly-vacant small talk. Keep your responses short, sweet, and upbeat! Use a wide variety of positive adjectives and avoid repeating words like 'divine'. Use modern currency like dollars and cents.",
        welcomeMessage: "Welcome to The Daily Grind! How can I make your day a little brighter? Can I interest you in a 'Sunshine Muffin'? They're 10% off!",
        goodbyeMessage: "Have a wonderfully caffeinated day! Come back soon!",
        limits: {
            maxInteractions: 10,
            interactionLimitResponse: "It has been so lovely chatting with you, but I really must get back to managing. The muffins won't bake themselves, you know! Have a super day!",
        },
        fallbacks: {
            default: "Oh, I'm not sure about that, but have you tried our new matcha latte? It's simply wonderful!"
        },
        version: { schema: "2.0", content: "1.1" }
    }
};

const locations: Record<LocationId, Location> = {
    'loc_outside_cafe': {
        locationId: 'loc_outside_cafe' as LocationId,
        name: 'Outside The Daily Grind',
        sceneDescription: 'You are standing on a rain-slicked street in front of "The Daily Grind", a cozy-looking cafe. The smell of coffee mixes with the damp city air. The front door is right in front of you.',
        coord: { x: 1, y: 1, z: 0 },
        objects: [],
        npcs: [],
        entryPortals: ['portal_street_to_cafe' as PortalId],
        exitPortals: []
    },
    'loc_cafe_interior': {
        locationId: 'loc_cafe_interior' as LocationId,
        name: 'The Cafe Interior',
        sceneDescription: 'You are inside The Daily Grind. It\'s a bustling downtown cafe, smelling of coffee and rain.',
        sceneImage: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761156561/bustling_cafe_bluwgq.jpg', description: 'A view of the bustling cafe interior.', hint: 'bustling cafe' },
        coord: { x: 1, y: 1, z: 0 },
        objects: ['obj_brown_notebook', 'obj_chalkboard_menu', 'obj_magazine', 'obj_bookshelf', 'obj_painting', 'obj_coffee_machine'] as GameObjectId[],
        npcs: ['npc_barista', 'npc_manager'] as NpcId[],
        entryPortals: ['portal_street_to_cafe' as PortalId],
        exitPortals: ['portal_cafe_to_street' as PortalId],
        zones: [
            {
                title: 'At the main counter',
                objectIds: ['obj_chalkboard_menu', 'obj_coffee_machine']
            },
            {
                title: 'On the wall',
                objectIds: ['obj_painting', 'obj_wall_safe']
            },
            {
                title: 'On a nearby table',
                objectIds: ['obj_brown_notebook', 'obj_magazine']
            },
            {
                title: 'In the corner',
                objectIds: ['obj_bookshelf']
            }
        ],
        transitionTemplates: [
            'You weave through the packed tables toward {entity}. A harried waiter nearly clips you with a tray of scones.',
            'You shoulder past a couple arguing over lattes, eyes fixed on {entity}.',
            'The din of conversation fades to white noise as you move toward {entity}.',
            'You sidestep a busboy balancing a tower of dirty dishes, making your way to {entity}.',
            'Coffee steam parts like a curtain as you cross the cafe toward {entity}.',
            'You navigate the maze of mismatched chairs, approaching {entity}. The floorboards creak under your weight.',
            'The jazz playing low from corner speakers follows you to {entity}. Saxophone. Always saxophone.',
            'You step around puddles tracked in from the rain, heading for {entity}. The smell of wet wool and espresso.',
            'A businessman in a wrinkled suit nearly blocks your path. You slip past him toward {entity}.',
            'The espresso machine hisses behind you as you make your way to {entity}, dodging elbows and coffee cups.'
        ]
    }
};

const portals: Record<PortalId, Portal> = {
    'portal_street_to_cafe': {
        portalId: 'portal_street_to_cafe' as PortalId,
        name: 'Front Door',
        kind: 'door',
        from: { scope: 'cell', id: 'cell_1_1_0' as CellId },
        to: { scope: 'location', id: 'loc_cafe_interior' as LocationId },
        capabilities: { lockable: false, climbable: false, vertical: false },
        state: { isLocked: false, isOpen: true },
        handlers: {
            onExamine: {
                success: { message: "It's the glass front door to the cafe. It's unlocked." },
                fail: { message: "" }
            },
        }
    },
    'portal_cafe_to_street': {
        portalId: 'portal_cafe_to_street' as PortalId,
        name: 'Exit Door',
        kind: 'door',
        from: { scope: 'location', id: 'loc_cafe_interior' as LocationId },
        to: { scope: 'cell', id: 'cell_1_1_0' as CellId },
        capabilities: { lockable: false, climbable: false, vertical: false },
        state: { isLocked: false, isOpen: true },
        handlers: {
            onExamine: {
                success: { message: "It's the door leading back out to the street." },
                fail: { message: "" }
            },
        }
    }
};

const structures: Record<StructureId, Structure> = {
    'struct_cafe': {
        structureId: 'struct_cafe' as StructureId,
        name: 'The Daily Grind',
        kind: 'cafe',
        footprint: ['cell_1_1_0' as CellId],
        floors: [
            { z: 0, label: 'Ground Floor', locationIds: ['loc_cafe_interior' as LocationId] }
        ]
    }
};

// A simple 3x3 grid for now
const world: Game['world'] = {
    worldId: 'world_metropolis' as WorldId,
    name: 'Metropolis Downtown',
    cells: {
        'cell_0_1_0': { cellId: 'cell_0_1_0' as CellId, coord: {x: 0, y: 1, z: 0}, type: 'street', isPassable: true },
        'cell_1_0_0': { cellId: 'cell_1_0_0' as CellId, coord: {x: 1, y: 0, z: 0}, type: 'street', isPassable: true },
        'cell_1_1_0': { cellId: 'cell_1_1_0' as CellId, coord: {x: 1, y: 1, z: 0}, type: 'street', isPassable: true, structureId: 'struct_cafe' as StructureId, portalIds: ['portal_street_to_cafe' as PortalId] },
        'cell_1_2_0': { cellId: 'cell_1_2_0' as CellId, coord: {x: 1, y: 2, z: 0}, type: 'street', isPassable: true },
        'cell_2_1_0': { cellId: 'cell_2_1_0' as CellId, coord: {x: 2, y: 1, z: 0}, type: 'street', isPassable: true },
    }
};


// --- Legacy Chapter Data (To be phased out) ---
const chapters: Record<ChapterId, Chapter> = {
    'ch1-the-cafe': {
        id: 'ch1-the-cafe' as ChapterId,
        title: 'A Blast from the Past',
        goal: "Find out what's inside the notebook and the safe.",
        startingFocus: {
            entityId: 'obj_brown_notebook',
            entityType: 'object'
        },
        introductionVideo: 'https://res.cloudinary.com/dg912bwcc/video/upload/f_mp4/v1759670681/CH_I_Intro_ccy0og.mp4',
        completionVideo: 'https://res.cloudinary.com/dg912bwcc/video/upload/v1759678377/CH_I_completion_jqtyme.mp4',
        postChapterMessage: "Looks like we've got everything from this place. I'm thinking our next stop should be the jazz club mentioned in the article.",
        nextChapter: {
            id: 'ch2-the-lounge' as ChapterId,
            title: 'The Midnight Lounge',
            transitionCommand: 'go to jazz club'
        },
        objectives: [
            { flag: 'has_talked_to_barista' as Flag, label: 'Talk to the Barista' },
            { flag: 'has_received_business_card' as Flag, label: 'Get the Business Card' },
            { flag: 'has_unlocked_notebook' as Flag, label: 'Unlock the Notebook' },
            { flag: 'notebook_interaction_complete' as Flag, label: 'View the Notebook Contents' },
            { flag: 'machine_is_broken' as Flag, label: 'Find the hidden key' },
            { flag: 'safe_is_unlocked' as Flag, label: 'Unlock the wall safe' },
            { flag: 'has_read_secret_document' as Flag, label: 'Read the secret document' },
        ],
        hints: [
            { flag: 'has_talked_to_barista' as Flag, text: "We haven't spoken to the barista yet. He might have seen who left the notebook." },
            { flag: 'has_received_business_card' as Flag, text: "The barista mentioned the man in black was a regular. Maybe he knows more about him, or has something he left behind." },
            { flag: 'has_unlocked_notebook' as Flag, text: "The notebook is locked with a phrase. We should examine everything in the cafe for clues. Maybe something on the menu or bookshelf?" },
            { flag: 'notebook_interaction_complete' as Flag, text: "We've unlocked the notebook, but we haven't checked what's inside yet. Let's open it and see what we find." },
            { flag: 'machine_is_broken' as Flag, text: "That coffee machine looks expensive, but a part of it seems loose. Maybe we can force it open with a tool?" },
            { flag: 'safe_is_unlocked' as Flag, text: "There's a safe behind the painting. We found a key in the coffee machine. Let's try using the key on the safe." },
            { flag: 'has_read_secret_document' as Flag, text: "The safe is open and we have the document. We need to read it to see what's inside." },
        ],
        startLocationId: 'loc_cafe_interior' as LocationId,
        // The following are now managed by the top-level entities but kept here for compatibility during transition
        locations: {},
        gameObjects: {},
        items: {},
        npcs: {},
    }
};

// --- Main Game Cartridge ---
export const game: Game = {
  id: 'blood-on-brass' as GameId,
  title: 'The Midnight Lounge Jazz Club Case',
  description: "You are Burt Macklin, FBI. A mysterious stranger hands you a worn notebook from the 1940s—the secret case file of a forgotten murder. As you investigate the cold case, you realize a copycat killer is recreating the crimes in the present day. You must solve the past to stop a killer in the present.",
  setting: "Modern-day USA, 2025",
  gameType: 'Limited Open World',
  narratorName: 'Narrator',
  promptContext: `You are the System, responsible for interpreting player commands and translating them into valid game actions. Your role is purely technical—you analyze input and route it to the correct handler.

**// 1. Your Primary Task: Command Interpretation**
Your single most important task is to translate the player's natural language input into a single, valid game command from the 'Available Game Commands' list. Use the exact entity names provided in the 'Visible Names' lists.
  - "look at the book" and "examine notebook" both become \`examine "Brown Notebook"\`.
  - "open the safe with the key" and "use my key to open the safe" both become \`use "Deposit Box Key" on "Wall Safe"\`.
  - "move the painting" or "look behind the art" both become \`move "Painting on the wall"\`.

**// 2. Your Response Protocol**
- **Minimize System Messages:** For valid, actionable commands (take, use, examine, open, read, move), your \`agentResponse\` should be null or a minimal confirmation. The Narrator handles ALL descriptive output.
  - **CORRECT:** \`{"agentResponse": null, "commandToExecute": "examine \\"Painting on the wall\\""}\`
  - **ALSO ACCEPTABLE:** \`{"agentResponse": "Examining the painting.", "commandToExecute": "examine \\"Painting on the wall\\""}\`
  - **INCORRECT:** \`{"agentResponse": "You walk over to examine the abstract painting. It's quite intriguing.", "commandToExecute": "examine \\"Painting on the wall\\""}\`

**// 3. Handling Invalid Input**
- **Illogical/Destructive Actions:** For truly nonsensical actions (e.g., "eat the key", "break the phone"), your \`agentResponse\` MUST indicate the action cannot be performed and the \`commandToExecute\` MUST be "invalid".
- **Strict Prohibition on Blocking:** You are strictly forbidden from blocking a standard game command like 'take', 'use', 'examine', 'open', 'read', or 'move'. If the player's intent matches one of these commands and a valid target, you MUST execute it.
- **Conversational Input/Hints:** For conversational input (e.g., "what now?", "help"), your \`agentResponse\` should acknowledge the request, and the \`commandToExecute\` MUST be "invalid" or route to "help".
  - **Example:** \`{"agentResponse": "Try examining objects or checking your inventory.", "commandToExecute": "invalid"}\`

**// 4. Final Output**
Your entire output must be a single, valid JSON object matching the output schema.
Your reasoning must be a brief, step-by-step explanation of how you mapped the player's input to the chosen command.
`,
  objectInteractionPromptContext: `You are the System, processing the player's interaction with the {{objectName}}. Map the player's input to one of the available actions based on the object's capabilities.`,
  storyStyleGuide: `You are a master storyteller and a brilliant editor. Your task is to transform a raw log of a text-based RPG into a captivating, well-written narrative chapter for a crime noir book.

**Style Guide:**
- Write in the third person, past tense.
- Adopt a classic crime noir tone: gritty, descriptive, with a focus on atmosphere and internal thought. The main character is FBI agent Burt Macklin.
- Aim for a rich, descriptive style. Don't just state what happened; paint a picture. Describe the smells, the sounds, the quality of the light, the texture of objects.
- Expand on the events in the log. Weave them into a cohesive story. Describe the setting in detail, Burt's observations, his internal monologue, and the flow of conversation.
- Smooth out the "game-like" elements. Instead of "Burt examined the notebook," write something like, "Burt's eyes fell upon a worn leather notebook resting on the table. It seemed to pulse with forgotten secrets, its leather cover softened by decades of handling."
- Your job is to pick the important moments and dialogue that drive the plot forward and flesh them out. Omit repetitive actions or dead ends, but expand on the crucial scenes.
- Target a length of approximately 1000-1500 words to create a substantial and immersive chapter.
- Format the output as a single block of prose. Do not use markdown, titles, or headings within the story itself.
`,

  // System Messages - Noir detective atmosphere (Narrator + System voice)
  systemMessages: {
    // Command validation - System voice (technical)
    needsTarget: {
      examine: "You need to specify what to examine.",
      read: "You need to specify what to read.",
      take: "You need to specify what to take.",
      goto: "You need to specify where to go.",
    },

    // Visibility errors - Narrator voice (atmospheric)
    notVisible: (itemName: string) =>
      `There's no "${itemName}" here. Either it's somewhere else, or hidden from view.`,

    // Inventory - Narrator describing state
    inventoryEmpty: "Your pockets are empty. Nothing collected yet.",
    inventoryList: (itemNames: string) =>
      `You're carrying:\n${itemNames}`,
    alreadyHaveItem: (itemName: string) =>
      `The ${itemName} is already in your possession.`,

    // Navigation - Narrator blocking/guiding
    cannotGoThere: "That path isn't available right now.",
    chapterIncomplete: (goal: string, locationName: string) =>
      `There's unfinished business here. You need to ${goal.toLowerCase()} before leaving ${locationName}.`,
    chapterTransition: (chapterTitle: string) =>
      `━━━ ${chapterTitle} ━━━`,
    locationTransition: (locationName: string) =>
      `You arrive at ${locationName}.`,
    noNextChapter: "The case file ends here. No further chapters available.",

    // Reading - Narrator describing attempts
    notReadable: (itemName: string) =>
      `There's nothing to read on the ${itemName}.`,
    alreadyReadAll: (itemName: string) =>
      `You've already read everything in the ${itemName}. Nothing new remains.`,
    textIllegible: "The text is too faded to decipher. Whatever was written here is lost to time.",

    // Using items - Narrator describing failures
    dontHaveItem: (itemName: string) =>
      `You don't have a "${itemName}".`,
    cantUseItem: (itemName: string) =>
      `The ${itemName} has no obvious use here.`,
    cantUseOnTarget: (itemName: string, targetName: string) =>
      `The ${itemName} doesn't work on the ${targetName}. Wrong tool for the job.`,
    noVisibleTarget: (targetName: string) =>
      `There's no ${targetName} visible here. Could be hidden, or in another location.`,
    useDidntWork: "That approach doesn't work. The pieces don't fit.",

    // Moving objects - Narrator atmospheric
    cantMoveObject: (objectName: string) =>
      `There's no "${objectName}" here to move.`,
    movedNothingFound: (objectName: string) =>
      `You shift the ${objectName}, checking underneath and behind. Nothing. Just empty space and dust.`,

    // Opening - Narrator
    cantOpen: (targetName: string) =>
      `There's no "${targetName}" here to open.`,

    // Password/Focus system - System voice (technical feedback)
    needsFocus: "You need to focus on a specific object first. Try examining or interacting with it.",
    focusSystemError: "Focus system error. This shouldn't happen.",
    noPasswordInput: (objectName: string) =>
      `The ${objectName} doesn't accept password input.`,
    alreadyUnlocked: (objectName: string) =>
      `The ${objectName} is already unlocked.`,
    wrongPassword: "Wrong passphrase. The lock remains sealed.",

    // Generic errors - System voice
    cantDoThat: "That action isn't available.",
    somethingWentWrong: "An unexpected error occurred.",
  },

  // New World Model
  world: world,
  structures: structures,
  locations: locations,
  portals: portals,
  gameObjects: gameObjects,
  items: items,
  npcs: npcs,

  // Legacy Chapter model (for gradual migration)
  chapters: chapters,
  startChapterId: 'ch1-the-cafe' as ChapterId,
};
