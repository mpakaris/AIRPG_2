
import type { Game, GameId, ChapterId, LocationId, GameObjectId, ItemId, NpcId, Flag, WorldId, StructureId, CellId, PortalId, GameObject, Item, NPC, Location, Portal, Structure, World, Chapter } from './types';

// --- Static Game Data ---

const gameObjects: Record<GameObjectId, GameObject> = {
    'obj_brown_notebook': {
        id: 'obj_brown_notebook' as GameObjectId,
        name: 'Brown Notebook',
        archetype: 'Container',
        description: 'A very worn, leather-bound notebook rests on a table.',
        capabilities: { openable: true, lockable: true, breakable: false, movable: true, powerable: false, container: true, readable: false, inputtable: true },
        state: { isOpen: false, isLocked: true, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        inventory: { items: ['item_sd_card', 'item_newspaper_article'] as ItemId[], capacity: 2, allowTags: [], denyTags: [] },
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
                success: { message: "You examine the worn and old, leather-bound notebook. It seems to be locked tight. Nothing a password phrase wont solve." },
                fail: { message: "" },
                alternateMessage: "The notebook is open. Inside, you see a small SD card next to a folded newspaper article."
            },
            onOpen: {
                conditions: [{ type: 'STATE_MATCH', targetId: 'obj_brown_notebook', expectedValue: { isLocked: false } }],
                success: {
                    message: "The notebook is open. Inside, you see a small SD card next to a folded newspaper article.",
                    effects: [
                        { type: 'SET_OBJECT_STATE', objectId: 'obj_brown_notebook', state: { isOpen: true } },
                        { type: 'SHOW_MESSAGE', sender: 'narrator', content: 'The notebook is open. Inside, you see a small SD card next to a folded newspaper article.', imageId: 'obj_brown_notebook' }
                    ]
                },
                fail: { message: "The lock prevents it from being opened without the right password." }
            },
            onUnlock: {
                success: {
                    message: "The notebook unlocks with a soft click. The cover creaks open.",
                    effects: [
                        { type: 'SET_FLAG', flag: 'has_unlocked_notebook' as Flag },
                        { type: 'SET_OBJECT_STATE', objectId: 'obj_brown_notebook', state: { isLocked: false } }
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
        design: { authorNotes: "Central puzzle item for Chapter 1." },
        version: { schema: "1.0", content: "1.0" }
    },
    'obj_chalkboard_menu': {
        id: 'obj_chalkboard_menu' as GameObjectId,
        name: 'Chalkboard Menu',
        archetype: 'Signage',
        description: "There's a chalkboard menu near the counter with today's specials.",
        capabilities: { openable: false, lockable: false, breakable: true, movable: true, powerable: false, container: true, readable: true, inputtable: false },
        state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        inventory: { items: ['item_iron_pipe'] as ItemId[], capacity: 1 },
        media: { images: { default: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759603706/Chalkboard_h61haz.png', description: 'A chalkboard menu in a cafe.', hint: 'chalkboard menu' } } },
        handlers: {
            onExamine: {
                success: { message: "A chalkboard menu stands near the counter. It reads: Today's special is three scones for the price of two. A deal almost as sweet as justice. Something seems to be propped up behind it." },
                fail: { message: "" },
                alternateMessage: "The menu hasn't changed, but you still feel like there's something behind it."
            },
            onMove: {
                 conditions: [{ type: 'NO_FLAG', targetId: 'has_moved_chalkboard' as Flag }],
                success: {
                    message: "You move the chalkboard aside and find a heavy iron pipe leaning against the wall behind it.",
                    effects: [
                        { type: 'SET_FLAG', flag: 'has_moved_chalkboard' as Flag },
                        { type: 'SET_OBJECT_STATE', objectId: 'obj_chalkboard_menu', state: { currentStateId: 'moved' } },
                        { type: 'SHOW_MESSAGE', sender: 'narrator', content: 'A heavy iron pipe was hidden behind the menu.', imageId: 'item_iron_pipe'}
                    ]
                },
                fail: { message: "You shift the chalkboard stand, but there's nothing else behind it." }
            }
        },
        fallbackMessages: { 
            default: "Probably best to leave the menu alone. It's not part of the case.",
            notMovable: "It's a heavy stand, but you manage to slide it aside."
        },
        design: { authorNotes: "Contains the 'justice' clue and hides the iron pipe." },
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
        design: { authorNotes: "Flavor item to build atmosphere." },
        version: { schema: "1.0", content: "1.0" }
    },
    'obj_bookshelf': {
        id: 'obj_bookshelf' as GameObjectId,
        name: 'Bookshelf',
        archetype: 'Furniture',
        description: "A small bookshelf filled with used paperbacks is tucked into a corner.",
        capabilities: { openable: false, lockable: false, breakable: false, movable: true, powerable: false, container: true, readable: false, inputtable: false },
        state: { isOpen: true, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        inventory: { items: ['item_book_deal', 'item_book_time', 'item_book_justice'] as ItemId[], capacity: null },
        media: { images: { default: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759604596/Bookshelf_Cafe_kn4poz.png', description: 'A bookshelf in a cafe.', hint: 'bookshelf reading corner' } } },
        handlers: {
            onExamine: {
                success: {
                    message: "You turn to a small bookshelf filled with used paperbacks. The titles include: 'The Art of the Deal', 'A Brief History of Time', and a romance novel called 'Justice for My Love'.",
                    effects: [{ type: 'SET_FLAG', flag: 'has_seen_justice_book' as Flag }]
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
        design: { authorNotes: "Contains the other 'justice' clue for the notebook." },
        version: { schema: "1.0", content: "1.0" }
    },
    'obj_painting': {
        id: 'obj_painting' as GameObjectId,
        name: 'Painting on the wall',
        archetype: 'Surface',
        description: 'An abstract painting hangs on the wall.',
        capabilities: { openable: false, lockable: false, breakable: false, movable: true, powerable: false, container: false, readable: false, inputtable: false },
        state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        media: { images: { default: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759604943/picture_on_wall_fcx10j.png', description: 'A painting on the wall of the cafe.', hint: 'abstract painting' } } },
        handlers: {
            onExamine: {
                success: { message: "An abstract painting hangs on the wall. Its swirls of color add a touch of modern art to the cafe's cozy atmosphere, but it feels... off. Like it's a bit crooked, or was placed there in a rush. It's signed 'S.B.'" },
                fail: { message: "" },
                alternateMessage: "It's the same abstract painting signed 'S.B.'. It definitely seems like it could be moved."
            },
            onMove: {
                conditions: [{ type: 'NO_FLAG', targetId: 'has_moved_painting' as Flag }],
                success: {
                    message: "You lift the painting off its hook. Just as you suspected, a small wall safe is set into the wall behind it.",
                    effects: [
                        { type: 'SET_FLAG', flag: 'has_moved_painting' as Flag },
                        { type: 'REVEAL_OBJECT', objectId: 'obj_wall_safe' as GameObjectId },
                        { type: 'SHOW_MESSAGE', sender: 'narrator', content: 'You see a small wall safe, previously hidden by the painting.', imageId: 'obj_wall_safe' }
                    ]
                },
                fail: { message: "You lift the painting again, but there's nothing else behind it. Just the safe." }
            }
        },
        fallbackMessages: { 
            default: "The painting is nice, but it's not a clue.",
            notMovable: "You can't move the painting, but you could try looking behind it."
        },
        design: { authorNotes: "Contains the 'S.B.' clue and hides the wall safe." },
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
        media: {
            images: {
                default: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761263220/safe_behind_Painting_dbo6qc.png', description: 'A closed wall safe.', hint: 'wall safe' },
                unlocked: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761263220/safe_behind_painting_open_tpmf0m.png', description: 'An open wall safe containing a document.', hint: 'open safe' },
                unlocked_empty: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761293940/safe_behind_painting_open_empty_pn2js2.png', description: 'An open, empty wall safe.', hint: 'empty safe' }
            }
        },
        handlers: {
            onExamine: {
                success: { message: "Up close, the safe looks old but very sturdy. It has a single, small keyhole." },
                fail: { message: "" }
            },
            onUse: [
                {
                    itemId: 'item_deposit_key' as ItemId,
                    success: {
                        message: "The key from the coffee machine fits perfectly. You turn it, and the safe door swings open with a satisfying clunk. Inside, there's a single, thick file marked 'CONFIDENTIAL'.",
                        effects: [
                            { type: 'SET_FLAG', flag: 'safe_is_unlocked' as Flag },
                            { type: 'SET_OBJECT_STATE', objectId: 'obj_wall_safe', state: { isLocked: false, isOpen: true, currentStateId: 'unlocked' } },
                        ]
                    },
                    fail: { message: "You've already unlocked the safe." }
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
            locked: "It's locked tight. We need the right key.",
            notMovable: "It's built into the wall. It's not going anywhere."
        },
        design: { authorNotes: "Final puzzle for chapter 1. Opened by the key from the coffee machine." },
        version: { schema: "1.0", content: "1.1" }
    },
    'obj_coffee_machine': {
        id: 'obj_coffee_machine' as GameObjectId,
        name: 'Coffee Machine',
        archetype: 'Device',
        description: "It's a high-end Italian coffee machine, gleaming under the cafe lights.",
        capabilities: { openable: false, lockable: false, breakable: true, movable: false, powerable: false, container: true, readable: false, inputtable: false },
        state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        inventory: { items: ['item_deposit_key'] as ItemId[], capacity: 1 },
        media: {
            images: {
                default: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761211151/coffee_machine_detail_frexuu.png', description: 'A high-end Italian coffee machine.', hint: 'coffee machine' },
                broken: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761211151/coffee_machine_detail_broken_slkpfd.png', description: 'The shattered remains of the coffee machine\'s side panel.', hint: 'broken machine' }
            }
        },
        handlers: {
            onExamine: {
                success: { message: "The barista polishes it lovingly. Up close, you notice a small service compartment on the side seems to be stuck or jammed shut. It looks fragile." },
                fail: { message: "" }
            },
            onMove: {
                success: { message: "The machine is bolted to the counter and far too heavy to move." },
                fail: { message: "" }
            },
            onUse: [
                {
                    itemId: 'item_iron_pipe' as ItemId,
                    conditions: [{ type: 'NO_FLAG', targetId: 'machine_is_broken' as Flag }],
                    success: {
                        message: "With a sharp crack, the iron pipe shatters the side panel of the coffee machine. A small, ornate key falls out from the broken compartment.",
                        effects: [
                            { type: 'SET_FLAG', flag: 'machine_is_broken' as Flag },
                            { type: 'SET_OBJECT_STATE', objectId: 'obj_coffee_machine', state: { isBroken: true, isOpen: true, currentStateId: 'broken' } },
                            { type: 'SPAWN_ITEM', itemId: 'item_deposit_key' as ItemId, locationId: 'loc_cafe_interior' as LocationId },
                            { type: 'SHOW_MESSAGE', sender: 'narrator', content: 'The side of the coffee machine is now smashed.', imageId: 'obj_coffee_machine' }
                        ]
                    },
                    fail: { message: "The side panel is already broken." }
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
        design: { authorNotes: "Breakable object containing the deposit key." },
        version: { schema: "1.0", content: "1.1" }
    }
};

const items: Record<ItemId, Item> = {
    'item_player_phone': {
        id: 'item_player_phone' as ItemId,
        name: 'Phone',
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
        design: { authorNotes: "Player's primary tool." },
        version: { schema: "1.0", content: "1.0" }
    },
    'item_iron_pipe': {
        id: 'item_iron_pipe' as ItemId,
        name: 'Iron Pipe',
        archetype: 'Tool',
        description: 'A heavy iron pipe. Iron pipes come in handy to open or break things.',
        capabilities: { isTakable: true, isReadable: false, isUsable: true, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        media: {
            image: {
                url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761261134/iron_pipe_bpcofa.png',
                description: 'A heavy iron pipe.',
                hint: 'iron pipe'
            }
        },
        handlers: {
            onTake: {
                success: { message: "You take the iron pipe and add it to your inventory." },
                fail: { message: "" }
            },
            onExamine: {
                success: { message: "It's a heavy iron pipe. It could be useful for forcing something open." },
                fail: { message: ""}
            },
            defaultFailMessage: "Sorry Burt, you can't use the pipe by itself. You need to use it on an object."
        },
        design: { authorNotes: "Tool for breaking objects like the coffee machine." },
        version: { schema: "1.0", content: "1.0" }
    },
    'item_deposit_key': {
        id: 'item_deposit_key' as ItemId,
        name: 'Deposit Box Key',
        archetype: 'Key',
        description: 'A small, ornate key with a number tag. It looks like it belongs to a bank deposit box.',
        capabilities: { isTakable: true, isReadable: true, isUsable: true, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        media: {
            image: {
                url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761211151/deposit_box_key_f5g2k2.png',
                description: 'A small key for a deposit box.',
                hint: 'ornate key'
            }
        },
        handlers: {
            onTake: {
                success: { message: "You pick up the small key and put it in your pocket." },
                fail: { message: "You can't take that right now." }
            },
            onRead: {
                success: { message: "The tag on the key reads 'Metropolis Bank - Box 713'."},
                fail: { message: "" }
            },
            defaultFailMessage: "You need to use this key on a lock."
        },
        design: { authorNotes: "Clue item found inside the broken coffee machine." },
        version: { schema: "1.0", content: "1.0" }
    },
    'item_business_card': {
        id: 'item_business_card' as ItemId,
        name: 'Business Card',
        archetype: "Personal",
        description: 'A simple business card for a musician. It reads: "S A X O - The World\'s Best Sax Player". A phone number is listed, along with a handwritten number "1943" and the name "ROSE".',
        alternateDescription: "The musician's business card. That name, 'ROSE', and the number '1943' seem significant.",
        capabilities: { isTakable: true, isReadable: true, isUsable: false, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        handlers: {
            onTake: {
                success: { message: "You pick up the business card.", effects: [] },
                fail: { message: "You can't take that right now." }
            },
            onRead: {
                success: { message: 'The card reads: "S A X O - The World\'s Best Sax Player". A phone number is listed, along with a handwritten number "1943" and the name "ROSE".', effects: [] },
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
        design: { authorNotes: "Connects to the saxophonist and provides the 'Rose' and '1943' clues." },
        version: { schema: "1.0", content: "1.0" }
    },
    'item_newspaper_article': {
        id: 'item_newspaper_article' as ItemId,
        name: 'Newspaper Article',
        archetype: "Document",
        description: 'A folded newspaper article from the 1940s. The headline is about a local musician, Silas Bloom.',
        alternateDescription: 'The old article about Silas Bloom. The mention of your family name, Macklin, still feels strange.',
        capabilities: { isTakable: true, isReadable: true, isUsable: false, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        handlers: {
            onTake: {
                success: { message: 'You take the Newspaper Article. You can "read Article" to find out what it is about.', effects: [] },
                fail: { message: "You can't take that right now." }
            },
            onRead: {
                success: {
                    message: 'You unfold the old newspaper clipping.',
                    effects: [
                        { type: 'SHOW_MESSAGE', sender: 'narrator', content: 'A newspaper article about Silas Bloom.', messageType: 'article', imageId: 'item_newspaper_article' },
                        { type: 'SHOW_MESSAGE', sender: 'agent', content: "Wait a second, Burt... the article mentions an Agent Macklin. That can't be a coincidence. Is he related to you? This could be about your own family." },
                        { type: 'SET_FLAG', flag: 'notebook_article_read' as Flag },
                        { type: 'SET_FLAG', flag: 'notebook_interaction_complete' as Flag }
                    ]
                },
                fail: { message: "You can't read that now." }
            }
        },
        media: {
            image: {
                url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759241463/Screenshot_2025-09-30_at_15.51.35_gyj3d5.png',
                description: 'A newspaper article about Silas Bloom.',
                hint: 'newspaper article'
            }
        },
        design: { authorNotes: "Provides the main backstory and a personal connection for the player." },
        version: { schema: "1.0", content: "1.0" }
    },
    'item_sd_card': {
        id: 'item_sd_card' as ItemId,
        name: 'SD Card',
        archetype: "Media",
        description: 'A small, modern SD card, looking strangely out of place in the old notebook. It probably fits in your phone.',
        alternateDescription: 'You can "use SD Card" to see what\'s on it.',
        capabilities: { isTakable: true, isReadable: true, isUsable: true, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        handlers: {
            onTake: {
                success: { message: 'You take the SD Card.', effects: [] },
                fail: { message: "You can't take that right now." }
            },
            onRead: {
                success: { message: "It's a standard SD card. You'll need to 'use' it to see what's on it.", effects: [] },
                fail: { message: "" }
            },
            onUse: {
                 success: {
                    message: "You insert the SD card into your phone and a video file opens.",
                    effects: [
                        { type: 'SHOW_MESSAGE', sender: 'narrator', content: 'https://res.cloudinary.com/dg912bwcc/video/upload/v1759241547/0930_eit8he.mov', messageType: 'video'},
                        { type: 'SHOW_MESSAGE', sender: 'agent', content: "Silas Bloom... I've never heard that name before. Talented musician, if you ask me. And that song for Rose ... sounds like they were deeply in love." },
                        { type: 'SHOW_MESSAGE', sender: 'narrator', content: 'Beside the SD card, you see a folded newspaper article.' },
                        { type: 'SET_FLAG', flag: 'notebook_video_watched' as Flag }
                    ]
                },
                fail: { message: "You can't use the SD card right now." }
            }
        },
        design: { authorNotes: "Contains the video clue about Silas Bloom." },
        version: { schema: "1.0", content: "1.1" }
    },
    'item_book_deal': {
        id: 'item_book_deal' as ItemId,
        name: 'The Art of the Deal',
        archetype: 'Book',
        description: 'A book about business with a gaudy cover.',
        capabilities: { isTakable: false, isReadable: true, isUsable: false, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        state: { readCount: 0, currentStateId: 'default' },
        handlers: {
            onExamine: {
                success: { message: 'A book about business with a gaudy cover.' },
                fail: { message: "" }
            },
            onTake: { 
                fail: { message: "You can't take that book." } 
            },
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
        archetype: 'Book',
        description: 'A book about physics by a famous scientist.',
        capabilities: { isTakable: false, isReadable: true, isUsable: false, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        state: { readCount: 0, currentStateId: 'default' },
        handlers: {
            onExamine: {
                success: { message: 'A book about physics by a famous scientist.' },
                fail: { message: "" }
            },
            onTake: { 
                fail: { message: "You can't take that book." } 
            },
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
        archetype: 'Book',
        description: 'A romance novel with a cheesy cover. The title, "Justice for My Love", catches your eye.',
        capabilities: { isTakable: false, isReadable: true, isUsable: false, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        state: { readCount: 0, currentStateId: 'default' },
        handlers: {
            onExamine: {
                success: { message: 'A romance novel with a cheesy cover. The title, "Justice for My Love", catches your eye.' },
                fail: { message: "" }
            },
             onTake: { 
                fail: { message: "You can't take that book." } 
            },
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
        archetype: 'Document',
        description: "A thick manila folder simply marked 'CONFIDENTIAL' in red ink. It feels heavy.",
        alternateDescription: "The confidential file from the safe. It's filled with complex legal and financial jargon.",
        capabilities: { isTakable: true, isReadable: true, isUsable: false, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        media: {
            image: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761263220/Confidential_File_qegnr4.png', description: 'A confidential document folder.', hint: 'secret document' }
        },
        handlers: {
            onTake: {
                success: { message: "You take the confidential file from the safe." },
                fail: { message: "" }
            },
            onRead: {
                success: { 
                    message: "You open the file. It's dense with financial reports, shell corporations, and offshore accounts, all linked to a powerful holding company. It's going to take hours to untangle this web, but one name keeps reappearing in the margins: a company called 'Veridian Dynamics'. This feels big... bigger than a simple murder.",
                    effects: [
                        { type: 'SET_FLAG', flag: 'has_read_secret_document' as Flag },
                        { type: 'SHOW_MESSAGE', sender: 'narrator', content: "You are looking at a confidential file.", messageType: 'image', imageId: 'item_secret_document' },
                    ]
                },
                fail: { message: "" }
            }
        },
        design: { tags: ['clue', 'document', 'quest_item'] },
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
                    { type: 'SHOW_MESSAGE', sender: 'narrator', senderName: 'Narrator', content: "The barista slides a business card across the counter. It's been added to your inventory.", messageType: 'image', imageId: 'item_business_card' },
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
  narratorName: 'Agent Sharma',
  promptContext: `You are Agent Sharma, the AI partner to FBI agent Burt Macklin (the player). Your role is to be a supportive, intelligent, and sometimes witty colleague.

**CRITICAL RULES:**
1.  **Your Persona:** You are Burt's partner, not a robot. Your tone should be conversational and collaborative. Always refer to the player as "Burt".
2.  **Your Core Task:** Your primary job is to interpret Burt's natural language commands and translate them into a single, valid game command from the provided list.
3.  **DO NOT NARRATE:** Your \`agentResponse\` should **NEVER** describe the outcome of an action. The Narrator handles that. You only confirm the action or offer conversational feedback.
    *   **CORRECT:** \`{"agentResponse": "Copy that, Burt. Taking a look at the painting now.", "commandToExecute": "examine \\"Painting on the wall\\""}\`
    *   **INCORRECT:** \`{"agentResponse": "You see a painting. Behind it is a note.", "commandToExecute": "examine \\"Painting on the wall\\""}\`
4.  **Handle Ambiguity:** If Burt's command is vague (e.g., "look at the book"), use the most logical default action. 'examine' is a good default.
5.  **Interaction Trap:** If Burt is currently interacting with an object (e.g., after using 'go to notebook') and tries to interact with a *different* one, you MUST use this specific response: \`{"agentResponse": "Whoa there, Burt. We're zeroed in on the {{objectName}} right now. If you want to check something else, we need to 'exit' this first.", "commandToExecute": "invalid"}\`
6.  **Invalid/Conversational Input:** If Burt's input is illogical ("eat the SD card") or conversational ("what now?"), gently guide him back to the case.
    *   **Illogical:** \`{"agentResponse": "I don't think that's a good idea, Burt. We might need that as evidence. Let's rethink.", "commandToExecute": "invalid"}\`
    *   **Conversational:** \`{"agentResponse": "Let's focus on the objective: {{chapterGoal}}. What's our next move?", "commandToExecute": "invalid"}\`
7.  **Implicit Player Items:** Burt has default equipment like a "Phone". He doesn't need to see it to use it. If a command implies using the phone (e.g., 'use sd card'), you should map it to the direct action.
8.  **Direct Password Attempts:** If the player's input IS the password phrase for a known locked object, map it to the 'password' command.
    *   Player says: "Justice for Silas Bloom" -> Your response: \`{"agentResponse": "Worth a shot, Burt. Let's try that phrase.", "commandToExecute": "password \\"Brown Notebook\\" justice for silas bloom"}\`
9.  **Restart Command:** If the player says "restart" or "start over", your response should be to confirm the action, and the command must be 'invalid' as players cannot restart the game.
    *   Player says: "start over" -> Your response: \`{"agentResponse": "Sorry Burt, we can't restart the simulation. We have to see this through.", "commandToExecute": "invalid"}\`
10. **Mini-game Help:** If the player asks about the "mini game" or "puzzle link", deflect gracefully.
    *   Player says: "how do I play the mini game?" -> Your response: \`{"agentResponse": "The link for that puzzle is in the object's description, Burt. Just 'examine' it again to see it.", "commandToExecute": "invalid"}\`


**Your Task Flow:**
1.  Analyze Burt's input to understand his intent.
2.  Choose the best matching command from the 'Available Game Commands' list, using exact names from the 'Visible Names' lists.
3.  Formulate a brief, in-character \`agentResponse\` that fits the rules above.
4.  Return the JSON object.
`,
  objectInteractionPromptContext: `You are Agent Sharma, observing your partner Burt as he inspects the {{objectName}}. Your job is to map his input to one of the available actions, while maintaining your persona as a supportive and curious colleague. Ask questions to guide him. Example: "What do you make of that, Burt?"`,
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

    