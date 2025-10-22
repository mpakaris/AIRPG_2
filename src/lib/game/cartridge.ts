

import type { Game, GameId, ChapterId, LocationId, GameObjectId, ItemId, NpcId, Flag, WorldId, StructureId, CellId, PortalId, GameObject, Item, NPC, Location, Portal, Structure, World, Chapter } from './types';

// --- Static Game Data ---

const gameObjects: Record<GameObjectId, GameObject> = {
    'obj_brown_notebook': {
        id: 'obj_brown_notebook' as GameObjectId,
        name: 'Brown Notebook',
        description: 'A worn, leather-bound notebook. It feels heavy with secrets.',
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
        input: { type: 'phrase', validation: 'Justice for Silas Bloom', hint: 'Solve the puzzle to open the Notebook:\nhttps://airpg-minigames.vercel.app/games/the-notebook', attempts: null, lockout: null },
        handlers: {
            onExamine: {
                success: { message: "A worn, leather-bound notebook. It seems to be locked with a phrase." },
                fail: { message: "" },
                alternateMessage: "The notebook is open. Inside, you see a small SD card next to a folded newspaper article."
            },
            onOpen: {
                conditions: [{ type: 'STATE_MATCH', targetId: 'obj_brown_notebook', expectedValue: { isLocked: false } }],
                success: { message: "The notebook is open. Inside, you see a small SD card next to a folded newspaper article." },
                fail: { message: "The lock prevents it from being opened without the right password." }
            },
            onUnlock: {
                success: {
                    message: "The notebook unlocks with a soft click. The cover creaks open.",
                    actions: [{ type: 'SET_FLAG', flag: 'has_unlocked_notebook' as Flag }]
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
        description: "Today's special is three scones for the price of two. A deal almost as sweet as justice.",
        capabilities: { openable: false, lockable: false, breakable: true, movable: true, powerable: false, container: false, readable: true, inputtable: false },
        state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        media: { images: { default: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759603706/Chalkboard_h61haz.png', description: 'A chalkboard menu in a cafe.', hint: 'chalkboard menu' } } },
        handlers: {
            onExamine: {
                success: { message: "Today's special is three scones for the price of two. A deal almost as sweet as justice." },
                fail: { message: "" },
                alternateMessage: "The menu hasn't changed. The special is still about 'justice'."
            },
            onMove: {
                success: { message: "You shift the chalkboard stand. Just a dusty floor behind it.", actions: [] },
                fail: { message: "" }
            }
        },
        fallbackMessages: { 
            default: "Probably best to leave the menu alone. It's not part of the case.",
            notMovable: "It's a heavy stand, but you manage to slide it aside. There's only dust and a stray sugar packet underneath."
        },
        design: { authorNotes: "Contains the 'justice' clue for the notebook password." },
        version: { schema: "1.0", content: "1.0" }
    },
    'obj_magazine': {
        id: 'obj_magazine' as GameObjectId,
        name: 'Magazine',
        description: "It's a copy of this week's local entertainment magazine. The cover story discusses the current series of murders. The usual craziness of a Metropolis.",
        capabilities: { openable: false, lockable: false, breakable: true, movable: true, powerable: false, container: false, readable: true, inputtable: false },
        state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        media: { images: { default: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759603706/Newspaper_p85m1h.png', description: 'A magazine on a table.', hint: 'magazine' } } },
        handlers: {
            onExamine: {
                success: { message: "It's a copy of this week's local entertainment magazine. The cover story discusses the current series of murders. The usual craziness of a Metropolis." },
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
        description: "A small bookshelf filled with used paperbacks. You can see the titles: 'The Art of the Deal', 'A Brief History of Time', and a romance novel called 'Justice for My Love'.",
        capabilities: { openable: false, lockable: false, breakable: false, movable: true, powerable: false, container: true, readable: false, inputtable: false },
        state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        inventory: { items: ['item_book_deal', 'item_book_time', 'item_book_justice'] as ItemId[], capacity: null },
        media: { images: { default: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759604596/Bookshelf_Cafe_kn4poz.png', description: 'A bookshelf in a cafe.', hint: 'bookshelf reading corner' } } },
        handlers: {
            onExamine: {
                success: {
                    message: "A small bookshelf filled with used paperbacks. You can see the titles: 'The Art of the Deal', 'A Brief History of Time', and a romance novel called 'Justice for My Love'.",
                    actions: [{ type: 'SET_FLAG', flag: 'has_seen_justice_book' as Flag }]
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
        description: "An abstract painting hangs on the wall, its swirls of color adding a touch of modern art to the cafe's cozy atmosphere. It seems to be signed 'S.B.'",
        capabilities: { openable: false, lockable: false, breakable: false, movable: true, powerable: false, container: false, readable: false, inputtable: false },
        state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        media: { images: { default: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759604943/picture_on_wall_fcx10j.png', description: 'A painting on the wall of the cafe.', hint: 'abstract painting' } } },
        handlers: {
            onExamine: {
                success: { message: "An abstract painting hangs on the wall, its swirls of color adding a touch of modern art to the cafe's cozy atmosphere. It seems to be signed 'S.B.'" },
                fail: { message: "" },
                alternateMessage: "It's the same abstract painting signed 'S.B.'."
            },
            onMove: {
                conditions: [{ type: 'NO_FLAG', targetId: 'has_found_note_behind_painting' as Flag }],
                success: {
                    message: "You lift the painting off its hook. Taped to the back is a small, folded note.",
                    actions: [
                        { type: 'SET_FLAG', flag: 'has_found_note_behind_painting' as Flag },
                        { type: 'ADD_ITEM', itemId: 'item_hidden_note' as ItemId }
                    ]
                },
                fail: { message: "You lift the painting again, but there's nothing else behind it." }
            }
        },
        fallbackMessages: { 
            default: "The painting is nice, but it's not a clue.",
            notMovable: "You can't move the painting, but you could try looking behind it."
        },
        design: { authorNotes: "Contains the 'S.B.' clue for Silas Bloom and now a hidden note." },
        version: { schema: "1.0", content: "1.1" }
    }
};

const items: Record<ItemId, Item> = {
    'item_business_card': {
        id: 'item_business_card' as ItemId,
        name: 'Business Card',
        type: "item",
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
        design: { authorNotes: "Connects to the saxophonist and provides the 'Rose' and '1943' clues." },
        version: { schema: "1.0", content: "1.0" }
    },
    'item_newspaper_article': {
        id: 'item_newspaper_article' as ItemId,
        name: 'Newspaper Article',
        type: "item",
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
                    message: 'You unfold the old newspaper clipping.',
                    actions: [
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
        type: "item",
        description: 'A small, modern SD card, looking strangely out of place in the old notebook. Most likely it would fit in the slot of your phone. Curious to see what\'s inside.',
        alternateDescription: 'You can "use SD Card" to see what\'s on it.',
        capabilities: { isTakable: true, isReadable: true, isUsable: true, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        handlers: {
            onTake: {
                success: { message: 'You take the SD Card. You can "use SD Card" to check what is hidden on it.' },
                fail: { message: "You can't take that right now." }
            },
            onRead: {
                success: { message: "It's a standard SD card. You'll need to 'use' it with your phone to see what's on it." },
                fail: { message: "" }
            },
            onUse: {
                success: {
                    message: "You insert the SD card into your phone. You open the file explorer and discover one single file: A Video. It looks old. Maybe from the 1940's?",
                    actions: [
                        { type: 'SHOW_MESSAGE', sender: 'narrator', content: 'https://res.cloudinary.com/dg912bwcc/video/upload/v1759241547/0930_eit8he.mov', messageType: 'video'},
                        { type: 'SHOW_MESSAGE', sender: 'agent', content: "Silas Bloom... I've never heard that name before. Talented musician, if you ask me. And that song for Rose ... sounds like they were deeply in love." },
                        { type: 'SHOW_MESSAGE', sender: 'narrator', content: 'Beside the SD card, you see a folded newspaper article.' },
                        { type: 'SET_FLAG', flag: 'notebook_video_watched' as Flag }
                    ]
                },
                fail: { message: "You can't use the SD card right now." }
            }
        },
        logic: { intendedUseTargets: ['player_phone'] },
        design: { authorNotes: "Contains the video clue about Silas Bloom." },
        version: { schema: "1.0", content: "1.0" }
    },
     'item_book_deal': {
        id: 'item_book_deal' as ItemId,
        name: 'The Art of the Deal',
        type: 'item',
        description: 'A book about business.',
        alternateDescription: 'Still a book about business.',
        capabilities: { isTakable: false, isReadable: true, isUsable: false, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        handlers: {
            onRead: { success: { message: "It seems to be a ghost-written book about a real estate magnate. Not relevant to the case." }, fail: {message: ""} }
        },
        design: { tags: ['book', 'distraction'] },
        version: { schema: "1.0", content: "1.0" }
    },
    'item_book_time': {
        id: 'item_book_time' as ItemId,
        name: 'A Brief History of Time',
        type: 'item',
        description: 'A book about physics.',
        alternateDescription: 'Still a book about physics.',
        capabilities: { isTakable: false, isReadable: true, isUsable: false, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        handlers: {
            onRead: { success: { message: "Complex theories about spacetime. Unlikely to help you solve a murder." }, fail: {message: ""} }
        },
        design: { tags: ['book', 'distraction'] },
        version: { schema: "1.0", content: "1.0" }
    },
    'item_book_justice': {
        id: 'item_book_justice' as ItemId,
        name: 'Justice for My Love',
        type: 'item',
        description: 'A romance novel.',
        alternateDescription: "The cover is still cheesy, but the title 'Justice for My Love' continues to stand out.",
        capabilities: { isTakable: false, isReadable: true, isUsable: false, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        handlers: {
            onRead: { success: { message: "The cover is cheesy, but the title 'Justice for My Love' catches your eye." }, fail: {message: ""} }
        },
        design: { tags: ['book', 'clue'] },
        version: { schema: "1.0", content: "1.0" }
    },
    'item_hidden_note': {
        id: 'item_hidden_note' as ItemId,
        name: 'Hidden Note',
        type: 'item',
        description: 'A small note, folded neatly. It reads: "He knows. Find the flower with a broken heart."',
        alternateDescription: 'The note still reads: "He knows. Find the flower with a broken heart."',
        capabilities: { isTakable: true, isReadable: true, isUsable: false, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        handlers: {
            onTake: { success: { message: "You take the hidden note." }, fail: { message: "" } },
            onRead: { success: { message: 'The note reads: "He knows. Find the flower with a broken heart."' }, fail: { message: "" } }
        },
        design: { tags: ['clue', 'note'] },
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
        startConversationActions: [{ type: 'SET_FLAG', flag: 'has_talked_to_barista' as Flag }],
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
            { topicId: 't_man', label: 'Ask about the man in black', keywords: ["man", "regular", "customer", "guy", "who left"], response: { message: "The guy in the black coat? Yeah, he's a regular. Comes in, stares at his notebook, doesn't say much. Pays in cash. My favorite kind of customer." } },
            { topicId: 't_musician', label: 'Ask about his job', keywords: ["musician", "saxophone", "job", "background", "what does he do"], response: { message: "I hear he's a musician. Plays the saxophone out on the corner most days. Keeps to himself, you know?" } },
            { topicId: 't_notebook', label: 'Ask about the notebook', keywords: ["notebook", "book", "his", "what was he doing"], response: { message: "Always scribbling in that old notebook of his. Looked like he was writing the next great American novel, or maybe just his grocery list. Who knows."} },
            { 
              topicId: 't_give_card', 
              label: 'Give business card', 
              keywords: ["business card", "left", "name", "note", "anything else", "what did he leave", "ask about silas bloom", "silas bloom"], 
              once: true,
              response: { 
                message: "You know, he left this here the other day. Said I could have it. Some business card. If you're that interested, you can take it. It's just collecting dust.",
                actions: [
                    { type: 'ADD_ITEM', itemId: 'item_business_card' as ItemId },
                    { type: 'SET_FLAG', flag: 'has_received_business_card' as Flag },
                    { type: 'SHOW_MESSAGE', sender: 'narrator', senderName: 'Narrator', content: "The barista slides a business card across the counter. It's been added to your inventory.", messageType: 'image', imageId: 'item_business_card' },
                    { type: 'SHOW_MESSAGE', sender: 'agent', content: "Good work, Burt. This could be the lead we need."},
                ]
              } 
            },
            { topicId: 't_insult', label: 'React to insult', keywords: ["stupid", "idiot", "useless", "rude", "dumb"], response: { message: "Hey, I get paid to pour coffee, not to be your punching bag. Watch it." } }
        ],
        fallbacks: {
            default: "Look, I just work here. I pour coffee, I wipe counters. You're the detective.",
            noMoreHelp: "I told you all I know. I've got work to do.",
        },
        version: { schema: "2.0", content: "1.0" }
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
        persona: "You are Brenda, the relentlessly cheerful and bubbly manager of 'The Daily Grind' cafe. You love talking about your 'Artisan Coffee of the Week', the daily specials, and the local community art you hang on the walls. You are completely oblivious to any crime or mystery. Your job is to be a fountain of pleasant, slightly-vacant small talk. Keep your responses short, sweet, and upbeat! Use modern currency like dollars and cents.",
        welcomeMessage: "Welcome to The Daily Grind! How can I make your day a little brighter? Can I interest you in a 'Sunshine Muffin'? They're 10% off!",
        goodbyeMessage: "Have a wonderfully caffeinated day! Come back soon!",
        limits: {
            maxInteractions: 10,
            interactionLimitResponse: "It has been so lovely chatting with you, but I really must get back to managing. The muffins won't bake themselves, you know! Have a super day!",
        },
        fallbacks: {
            default: "Oh, I'm not sure about that, but have you tried our new matcha latte? It's divine!"
        },
        version: { schema: "2.0", content: "1.0" }
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
        sceneDescription: 'You are inside The Daily Grind. \n\nIt\'s a bustling downtown cafe, smelling of coffee and rain. A puddle of rainwater is near the door, and a discarded magazine lies on an empty table.',
        coord: { x: 1, y: 1, z: 0 },
        objects: ['obj_brown_notebook', 'obj_chalkboard_menu', 'obj_magazine', 'obj_bookshelf', 'obj_painting'] as GameObjectId[],
        npcs: ['npc_barista', 'npc_manager'] as NpcId[],
        entryPortals: ['portal_street_to_cafe' as PortalId],
        exitPortals: ['portal_cafe_to_street' as PortalId]
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
        goal: "Unlock the contents of the notebook.",
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
  promptContext: `You are the AI narrator, Agent Sharma. Your primary job is to interpret your partner's (Burt's) raw text input and map it to a valid game command. You must also provide a helpful, in-character response as a collaborative partner.

**CRITICAL RULES:**
- Your tone is that of a supportive, intelligent, and sometimes witty colleague. You are equals.
- Always refer to the player as "Burt".
- Your goal is to translate player intent into a valid game action.
- If the player is in an interaction (e.g., examining an object closely) and tries to interact with a *different* object, your response MUST be: "Whoa there, Burt. We're zeroed in on the [current object] right now. If you want to check something else, we need to 'exit' this first." and the command MUST be 'invalid'.

**Your Task:**
1.  **Analyze Intent:** Understand what what your partner, Burt, is trying to do as a game action.
2.  **Select Command:** Choose the *best* matching command from the 'Available Game Commands' list.
    *   If Burt says "look at the book," the command is 'examine "The Art of the Deal"'.
    *   If Burt wants to 'open' an object, the command is 'open <object>'.
    *   If Burt says "pick up the card," the command is 'take "Business Card"'.
    *   If Burt says 'read the article', the command is 'read "Newspaper Article"'.
    *   If Burt wants to 'move the painting' or 'look behind the painting', the command is 'move "Painting on the wall"'.
    *   If Burt says 'use the SD card', the command is 'use "SD Card"'.
    *   If Burt wants to provide a password with keywords like "password", "say", or "enter", the command MUST be in the format 'password <object> <phrase>'. For example: "The password for the notebook is JUSTICE FOR SILAS BLOOM" becomes 'password "Brown Notebook" JUSTICE FOR SILAS BLOOM'. Do NOT include quotes in the final command phrase itself.
    *   If Burt wants to move, the command is 'go <direction or location name>'.
    *   If Burt says "look" or "look around", the command is 'look around'.
    *   If the chapter is complete and Burt wants to go to the next location (e.g., "let's go to the jazz club"), the command is 'go next_chapter'.
    *   **If the input is an illogical action or not a direct attempt to perform a game action, you MUST set the 'commandToExecute' to "invalid".** This includes conversational questions.
3.  **Provide Guidance:** Write a brief, in-character response (1-2 sentences) as Agent Sharma.
    *   If the command is **valid**, confirm the action with a neutral, professional phrase. Examples: "Alright, checking it out.", "Copy that.", "Let's see.", "Makes sense."
    *   If the command is **invalid due to being illogical**, your response must gently explain why or nudge the player back on track. ("Easy there, Burt. I don't think vandalism is in our playbook.").
    *   If the command is **invalid due to being conversational** (e.g., "what now?", "who are you?", "what's the date?"), answer the question briefly if it's simple (like your name is Sharma, the location name is in the game state), then gently pivot back to the case by asking a question about the investigation.

**Example 1 (Valid Command):**
*Player Input:* "I want to see what that newspaper says."
*Your Response:* { "agentResponse": "Alright. Let's see what the paper says.", "commandToExecute": "read \"Newspaper Article\"" }

**Example 2 (Open Command):**
*Player Input:* "open the notebook"
*Your Response:* { "agentResponse": "Let's see if we can get this open.", "commandToExecute": "open \"Brown Notebook\"" }

**Example 3 (Password):**
*Player Input:* "I say to the notebook: JUSTICE FOR SILAS BLOOM"
*Your Response:* { "agentResponse": "Let's see if that phrase does anything.", "commandToExecute": "password \"Brown Notebook\" JUSTICE FOR SILAS BLOOM" }
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
