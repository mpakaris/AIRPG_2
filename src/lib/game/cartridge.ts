
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
        inventory: { items: ['item_secret_document'] as ItemId[], capacity: 2, allowTags: [], denyTags: [] },
        children: {
            items: ['item_secret_document'] as ItemId[],
            objects: ['obj_sd_card'] as GameObjectId[]
        },
        media: {
            images: {
                default: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759242347/Notebook_locked_ngfes0.png', description: 'A locked notebook.', hint: 'locked notebook' },
                unlocked: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759242346/Notebook_unlocked_fpxqgl.jpg', description: 'An unlocked notebook.', hint: 'unlocked notebook' }
            },
            sounds: { onUnlock: 'click.mp3' }
        },
        input: { type: 'phrase', validation: 'Justice for Silas Bloom', hint: 'Stuck? Maybe this will help: https://airpg-minigames.vercel.app/games/the-notebook', attempts: null, lockout: null },
        handlers: {
            // 1. EXAMINE - Visual inspection
            onExamine: [
                {
                    // Most specific: Locked
                    conditions: [{ type: 'STATE', entityId: 'obj_brown_notebook', key: 'isLocked', equals: true }],
                    success: {
                        message: "The leather is worn soft under your fingers, decades pressed into its surface. It smells of old paper, dust, and something darker—leather tanned with secrets. The brass clasp gleams cold, locked tight, guarding what's inside.\n\nYour fingers trace it, metal biting faintly. No keyhole, no obvious way in—just a mechanism waiting for something it has been expecting. A thrill runs through you. You don't know what's inside, and yet its weight presses against your chest, heavy with possibility.\n\nUsually, you feel like the chess player, setting the moves. Now, strangely, you feel like the pawn in someone else's game—small, exposed, uneasy, and yet drawn irresistibly.\n\nThe notebook radiates threat, subtle and insistent. Every crease and dent seems deliberate, alive with intentions. A flicker of fear curls with excitement, making every nerve tingle.\n\nHolding it, you feel the pulse of history brushing against your own, the quiet danger of secrets someone spent decades guarding. Alone, trembling slightly, you realize this moment—this touch, this weight—is a turning point. You don't know what's inside, and that is precisely what makes it irresistible.",
                        media: {
                            url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759242347/Notebook_locked_ngfes0.png',
                            description: 'Locked leather notebook with brass clasp',
                            hint: 'Needs a password phrase...'
                        }
                    }
                },
                {
                    // Unlocked + both items gone (document taken AND video watched)
                    conditions: [
                        { type: 'HAS_ITEM', itemId: 'item_secret_document' },
                        { type: 'FLAG', flag: 'notebook_video_watched', value: true }
                    ],
                    success: {
                        message: "Notebook's open. Brass clasp unfastened. Inside: yellowed pages, faded ink, illegible entries. The SD card and secret document—both gone. You took what was hidden here. Just empty pages remain."
                    }
                },
                {
                    // Unlocked + only document taken (video not watched)
                    conditions: [
                        { type: 'HAS_ITEM', itemId: 'item_secret_document' }
                    ],
                    success: {
                        message: "Notebook's open. Brass clasp released. Inside: the black SD card still rests against yellowed pages—modern, out of place. The secret document is gone. You took it."
                    }
                },
                {
                    // Unlocked + only video watched (document not taken)
                    conditions: [
                        { type: 'FLAG', flag: 'notebook_video_watched', value: true }
                    ],
                    success: {
                        message: "Notebook's open. Brass clasp unfastened. Inside: the folded document marked CONFIDENTIAL still waits in faded red ink. The SD card is there too—you've already watched the video. The footage is burned into your memory."
                    }
                },
                {
                    // Default: Unlocked + nothing taken/watched
                    conditions: [],
                    success: {
                        message: "Notebook's open. Brass clasp released. Inside: black SD card—modern, out of place against yellowed pages. Next to it, a folded document marked CONFIDENTIAL in faded red ink. Hidden deliberately.",
                        media: {
                            url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759242346/Notebook_unlocked_fpxqgl.jpg',
                            description: 'Unlocked notebook revealing hidden contents',
                            hint: 'SD card and secret document'
                        }
                    }
                }
            ],

            // 2. TAKE - Evidence, stays on table
            onTake: {
                fail: {
                    message: "Evidence. Stays here. Try EXAMINING, OPENING, or entering the PASSWORD."
                }
            },

            // 4. USE - For reading
            onUse: {
                fail: {
                    message: "It's for reading. Try OPENING it or unlocking with the PASSWORD."
                }
            },

            // 6. OPEN - Requires unlock
            onOpen: [
                {
                    // Unlocked + both items gone
                    conditions: [
                        { type: 'STATE', entityId: 'obj_brown_notebook', key: 'isLocked', equals: false },
                        { type: 'HAS_ITEM', itemId: 'item_secret_document' },
                        { type: 'FLAG', flag: 'notebook_video_watched', value: true }
                    ],
                    success: {
                        message: "Notebook's already open. Brass clasp unfastened. Inside: yellowed pages, faded ink. The SD card and secret document—both gone. You took what was hidden here.",
                        effects: [
                            { type: 'SET_ENTITY_STATE', entityId: 'obj_brown_notebook', patch: { isOpen: true, currentStateId: 'unlocked' } }
                        ]
                    }
                },
                {
                    // Unlocked + only document taken
                    conditions: [
                        { type: 'STATE', entityId: 'obj_brown_notebook', key: 'isLocked', equals: false },
                        { type: 'HAS_ITEM', itemId: 'item_secret_document' }
                    ],
                    success: {
                        message: "Notebook's open. Brass clasp unfastened. In the crease: the black SD card still rests there—modern, cold, out of place. The secret document is gone.",
                        effects: [
                            { type: 'SET_ENTITY_STATE', entityId: 'obj_brown_notebook', patch: { isOpen: true, currentStateId: 'unlocked' } }
                        ]
                    }
                },
                {
                    // Unlocked + only video watched
                    conditions: [
                        { type: 'STATE', entityId: 'obj_brown_notebook', key: 'isLocked', equals: false },
                        { type: 'FLAG', flag: 'notebook_video_watched', value: true }
                    ],
                    success: {
                        message: "Notebook's open. Brass clasp unfastened. In the crease: document marked CONFIDENTIAL, folded tight. The SD card is there too—you've watched the video already.",
                        effects: [
                            { type: 'SET_ENTITY_STATE', entityId: 'obj_brown_notebook', patch: { isOpen: true, currentStateId: 'unlocked' } }
                        ]
                    }
                },
                {
                    // Unlocked + nothing taken
                    conditions: [{ type: 'STATE', entityId: 'obj_brown_notebook', key: 'isLocked', equals: false }],
                    success: {
                        message: "Notebook's open. Brass clasp unfastened. In the crease: black SD card—modern, cold, out of place. Next to it: document marked CONFIDENTIAL, folded tight. Different eras. Hidden together. Someone archived the past on modern media.",
                        media: {
                            url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759242346/Notebook_unlocked_fpxqgl.jpg',
                            description: 'Open notebook with SD card and secret document',
                            hint: 'Take the contents'
                        },
                        effects: [
                            { type: 'SET_ENTITY_STATE', entityId: 'obj_brown_notebook', patch: { isOpen: true, currentStateId: 'unlocked' } }
                        ]
                    }
                },
                {
                    // Locked
                    conditions: [],
                    fail: {
                        message: "Brass clasp won't budge. Needs a PASSWORD—phrase, not key. Someone made sure this stayed hidden.\n\nUse: /password <your guess>\n\nStuck? https://airpg-minigames.vercel.app/games/the-notebook"
                    }
                }
            ],

            // 7. CLOSE - Close open notebook
            onClose: {
                conditions: [{ type: 'STATE', entityId: 'obj_brown_notebook', key: 'isOpen', equals: true }],
                success: {
                    message: "You close the cover. Brass clasp clicks shut. But why close it now?"
                },
                fail: {
                    message: "Already closed and locked."
                }
            },

            // 8. MOVE - Nothing underneath
            onMove: {
                fail: {
                    message: "You slide it across the table. Nothing underneath. The secrets are inside, not under."
                }
            },

            // 9. BREAK - Can't destroy evidence
            onBreak: {
                fail: {
                    message: "Evidence. Can't destroy it. Try the PASSWORD instead."
                }
            },

            // 10. READ - Read contents (requires open)
            onRead: [
                {
                    // Unlocked + both items gone
                    conditions: [
                        { type: 'STATE', entityId: 'obj_brown_notebook', key: 'isLocked', equals: false },
                        { type: 'STATE', entityId: 'obj_brown_notebook', key: 'isOpen', equals: true },
                        { type: 'HAS_ITEM', itemId: 'item_secret_document' },
                        { type: 'FLAG', flag: 'notebook_video_watched', value: true }
                    ],
                    success: {
                        message: "Pages yellowed, ink faded. Most entries illegible. The hidden items—SD card, secret document—both gone. You took them already.",
                        effects: []
                    }
                },
                {
                    // Unlocked + only document taken
                    conditions: [
                        { type: 'STATE', entityId: 'obj_brown_notebook', key: 'isLocked', equals: false },
                        { type: 'STATE', entityId: 'obj_brown_notebook', key: 'isOpen', equals: true },
                        { type: 'HAS_ITEM', itemId: 'item_secret_document' }
                    ],
                    success: {
                        message: "Pages yellowed, ink faded. Most entries illegible. The SD card is still here—you can use your phone to read it. The secret document is gone.",
                        effects: []
                    }
                },
                {
                    // Unlocked + only video watched
                    conditions: [
                        { type: 'STATE', entityId: 'obj_brown_notebook', key: 'isLocked', equals: false },
                        { type: 'STATE', entityId: 'obj_brown_notebook', key: 'isOpen', equals: true },
                        { type: 'FLAG', flag: 'notebook_video_watched', value: true }
                    ],
                    success: {
                        message: "Pages yellowed, ink faded. Most entries illegible. The secret document is still here—TAKE it. You've already watched the SD card video.",
                        effects: []
                    }
                },
                {
                    // Unlocked + nothing taken
                    conditions: [
                        { type: 'STATE', entityId: 'obj_brown_notebook', key: 'isLocked', equals: false },
                        { type: 'STATE', entityId: 'obj_brown_notebook', key: 'isOpen', equals: true }
                    ],
                    success: {
                        message: "Pages yellowed, ink faded. Most entries illegible. But the hidden items—SD card, secret document—those are what matter. TAKE them.",
                        effects: []
                    }
                },
                {
                    // Locked
                    conditions: [],
                    fail: {
                        message: "Locked. Can't read it. Needs PASSWORD. Stuck? https://airpg-minigames.vercel.app/games/the-notebook"
                    }
                }
            ],

            // 11. SEARCH - Search contents
            onSearch: [
                {
                    // Unlocked + both items gone
                    conditions: [
                        { type: 'STATE', entityId: 'obj_brown_notebook', key: 'isLocked', equals: false },
                        { type: 'HAS_ITEM', itemId: 'item_secret_document' },
                        { type: 'FLAG', flag: 'notebook_video_watched', value: true }
                    ],
                    success: {
                        message: "You search the pages. Empty. The SD card and secret document—both gone. You took them already."
                    }
                },
                {
                    // Unlocked + only document taken
                    conditions: [
                        { type: 'STATE', entityId: 'obj_brown_notebook', key: 'isLocked', equals: false },
                        { type: 'HAS_ITEM', itemId: 'item_secret_document' }
                    ],
                    success: {
                        message: "You search the pages. The SD card is still here—use your phone to read it. The secret document is gone."
                    }
                },
                {
                    // Unlocked + only video watched
                    conditions: [
                        { type: 'STATE', entityId: 'obj_brown_notebook', key: 'isLocked', equals: false },
                        { type: 'FLAG', flag: 'notebook_video_watched', value: true }
                    ],
                    success: {
                        message: "You search the pages. The secret document is still hidden in the center spread—TAKE it. You've already watched the SD card video."
                    }
                },
                {
                    // Unlocked + nothing taken
                    conditions: [{ type: 'STATE', entityId: 'obj_brown_notebook', key: 'isLocked', equals: false }],
                    success: {
                        message: "You search the pages. SD card, secret document—hidden in the center spread. TAKE them."
                    }
                },
                {
                    // Locked
                    conditions: [],
                    fail: {
                        message: "Locked. Can't search. Need the PASSWORD."
                    }
                }
            ],

            // 12. TALK - Can't talk to notebook
            onTalk: {
                fail: {
                    message: "Notebooks don't talk. Try OPENING it or the PASSWORD."
                }
            },

            // SPECIAL: Password unlock handler
            onUnlock: {
                success: {
                    message: "Brass clasp clicks. Cover swings open, leather creaks. Inside: black SD card—modern, digital, anachronistic. Next to it: folded document marked CONFIDENTIAL. Past preserved twice—analog and digital. Both waiting.",
                    media: {
                        url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759242346/Notebook_unlocked_fpxqgl.jpg',
                        description: 'Unlocked notebook revealing secrets',
                        hint: 'The password worked'
                    },
                    effects: [
                        { type: 'SET_FLAG', flag: 'has_unlocked_notebook' as Flag, value: true },
                        { type: 'SET_ENTITY_STATE', entityId: 'obj_brown_notebook', patch: { isLocked: false, isOpen: true, currentStateId: 'unlocked' } },
                        { type: 'REVEAL_FROM_PARENT', entityId: 'obj_sd_card', parentId: 'obj_brown_notebook' },
                        { type: 'REVEAL_FROM_PARENT', entityId: 'item_secret_document', parentId: 'obj_brown_notebook' }
                    ]
                },
                fail: {
                    message: "Wrong password. Lock stays shut. Think: what connects the clues?\n\nUse: /password <your guess>"
                }
            },

            // Fallback for undefined actions
            defaultFailMessage: "That won't work on the notebook. Try: EXAMINE, OPEN, READ, or use /password <phrase> to unlock it."
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
            // 1. EXAMINE - Visual inspection
            onExamine: [
                {
                    // Most specific: moved AND pipe taken
                    conditions: [
                        { type: 'FLAG', flag: 'has_moved_chalkboard', value: true },
                        { type: 'HAS_ITEM', itemId: 'item_iron_pipe' }
                    ],
                    success: {
                        message: "The chalkboard leans against the wall where you left it. Behind where it used to hang, there's just exposed brick and a light patch of dust. The iron pipe is gone - you took it. Nothing else hidden here.",
                        media: {
                            url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759603706/Chalkboard_h61haz.png',
                            description: 'Moved chalkboard with empty space behind it',
                            hint: 'You already took what was hidden here'
                        }
                    }
                },
                {
                    // Less specific: moved but pipe NOT taken
                    conditions: [
                        { type: 'FLAG', flag: 'has_moved_chalkboard', value: true }
                    ],
                    success: {
                        message: "The board's moved. Behind it: heavy iron pipe against exposed brick. Cold steel, rust at the joints. Still waiting there.",
                        media: {
                            url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761261134/iron_pipe_bpcofa.png',
                            description: 'Iron pipe revealed behind chalkboard',
                            hint: 'Could be useful for breaking things...'
                        }
                    }
                },
                {
                    // Default: not moved yet
                    conditions: [],
                    success: {
                        message: "The wooden frame leaned crooked, chalk dust clinging to its corners. Brick peered through behind it, cold and stubborn.\n\nToday's special read: 'Three scones for the price of two.'\n\nA deal as sweet as justice.\n\nThat word—justice—hung heavy, deliberate. Someone had been here, leaving breadcrumbs.\n\nThe board didn't sit flush with the wall; a shadow slipped behind it, hiding something patient, waiting. The smell of bread and dust mixed, comforting and uneasy. \n\nIt wasn't just a menu. It was a message, a lure, a warning -  or was it not?",
                        media: {
                            url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759603706/Chalkboard_h61haz.png',
                            description: 'Chalkboard menu with handwritten specials',
                            hint: 'Not flush with the wall...'
                        }
                    }
                }
            ],

            // 2. TAKE - Can't take furniture
            onTake: {
                fail: {
                    message: "It's bolted furniture, not evidence. But you could MOVE it or READ the menu."
                }
            },

            // 4. USE - No item usage
            onUse: {
                fail: {
                    message: "It's for writing specials. You don't have chalk. Try READING it or MOVING it."
                }
            },

            // 6. OPEN - Nothing to open
            onOpen: {
                fail: {
                    message: "It's a board, not a door. Try EXAMINING or MOVING it."
                }
            },

            // 7. CLOSE - Nothing to close
            onClose: {
                fail: {
                    message: "Nothing to close. Try MOVING it instead."
                }
            },

            // 8. MOVE - Reveals iron pipe
            onMove: {
                conditions: [{ type: 'NO_FLAG', flag: 'has_moved_chalkboard' }],
                success: {
                    message: "The board scrapes across tile. Behind it: heavy iron pipe against exposed brick. Cold steel, rust at the joints. The kind of tool that solves problems without keys.",
                    media: {
                        url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761261134/iron_pipe_bpcofa.png',
                        description: 'Iron pipe revealed behind chalkboard',
                        hint: 'Could be useful for breaking things...'
                    },
                    effects: [
                        { type: 'SET_FLAG', flag: 'has_moved_chalkboard', value: true },
                        { type: 'SET_ENTITY_STATE', entityId: 'obj_chalkboard_menu', patch: { currentStateId: 'moved', isMoved: true } },
                        { type: 'REVEAL_FROM_PARENT', entityId: 'item_iron_pipe', parentId: 'obj_chalkboard_menu' }
                    ]
                },
                fail: {
                    message: "Already moved. The pipe's gone. Nothing else hidden here."
                }
            },

            // 9. BREAK - Vandalism, not investigation
            onBreak: {
                fail: {
                    message: "Smashing the cafe's menu? That's vandalism, not detective work. Try MOVING it."
                }
            },

            // 10. READ - Read the menu text
            onRead: {
                success: {
                    message: "Three scones for two. Coffee of the day: dark roast. Pastry special: lemon tart. And at the bottom, in different handwriting: 'A deal as sweet as justice.' Deliberate. A message.",
                    media: {
                        url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759603706/Chalkboard_h61haz.png',
                        description: 'Chalkboard menu closeup',
                        hint: 'Someone wrote "justice" on purpose'
                    }
                }
            },

            // 11. SEARCH - Hint to move it
            onSearch: {
                success: {
                    message: "You run your hand along the frame. It's angled away from the wall. Not flush. Try MOVING it."
                }
            },

            // 12. TALK - Can't talk to objects
            onTalk: {
                fail: {
                    message: "The board's not chatty. But you could READ it or MOVE it."
                }
            },

            // Fallback for undefined actions
            defaultFailMessage: "The chalkboard's a piece of the scene. Try: EXAMINE, READ, MOVE, or SEARCH it."
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
            // 1. EXAMINE - Visual inspection
            onExamine: {
                success: {
                    message: "Entertainment mag, this week's issue. Cover story: the murders. Metropolis craziness, same old. Not your case. Just atmosphere.",
                    media: {
                        url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759603706/Newspaper_p85m1h.png',
                        description: 'Local entertainment magazine',
                        hint: 'Background noise, not evidence'
                    }
                }
            },

            // 2. TAKE - Could take it, but not useful
            onTake: {
                fail: {
                    message: "Old news. Not evidence. Leave it. Try READING it if you're curious."
                }
            },

            // 4. USE - No item usage
            onUse: {
                fail: {
                    message: "It's for reading. Try EXAMINING or READING it."
                }
            },

            // 6. OPEN - Already open/flat
            onOpen: {
                fail: {
                    message: "It's flat on the table. Try READING it instead."
                }
            },

            // 7. CLOSE - Can't close flat magazine
            onClose: {
                fail: {
                    message: "Nothing to close. Try READING or MOVING it."
                }
            },

            // 8. MOVE - Slide aside
            onMove: {
                success: {
                    message: "You slide it aside. Coffee ring underneath. Sticky. Not the clue you hoped for."
                }
            },

            // 9. BREAK - Don't tear up cafe property
            onBreak: {
                fail: {
                    message: "Tearing up cafe property? That's not detective work. Try READING it."
                }
            },

            // 10. READ - Read the magazine
            onRead: {
                success: {
                    message: "Murder coverage, local speculation, conspiracy theories. Metropolis loves its drama. Nothing connects to your case. Background noise."
                }
            },

            // 11. SEARCH - Search through it
            onSearch: {
                success: {
                    message: "You flip through pages. Ads, articles, event listings. Nothing relevant to the case. Just cafe reading."
                }
            },

            // 12. TALK - Can't talk to magazine
            onTalk: {
                fail: {
                    message: "Magazines don't chat. Try READING it or MOVING it."
                }
            },

            // Fallback for undefined actions
            defaultFailMessage: "The magazine's just atmosphere. Try: EXAMINE, READ, MOVE, or SEARCH it."
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
        capabilities: { openable: false, lockable: false, breakable: true, movable: false, powerable: false, container: true, readable: false, inputtable: false },
        state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        inventory: { items: [], capacity: null },
        children: {
            items: ['item_book_deal', 'item_book_fbi', 'item_book_justice'] as ItemId[],
            objects: ['obj_hidden_door'] as GameObjectId[]
        },
        media: { images: { default: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759604596/Bookshelf_Cafe_kn4poz.png', description: 'A bookshelf in a cafe.', hint: 'bookshelf reading corner' } } },
        handlers: {
            // 1. EXAMINE - Visual inspection
            onExamine: {
                success: {
                    message: "The corner bookshelf leaned like it had watched too many years pass, a quiet witness to the people who drifted through this space. Its wood was scratched, nicked, and stubbornly dusty, edges softened by time and careless elbows. \n\nThe spines of worn paperbacks were pressed in haphazardly, some upright, some shoved sideways, each one a faint echo of someone who had lingered here—bored, curious, desperate, seeking distraction or solace.\n\nAmong the titles:\n📚 The Art of the Deal\n📚 A Brief History of Time\n📚 Justice for My Love\n\nThat word—justice—hung in the air, deliberate, pressing against the dust and scratches like it had weight. The shelf wasn’t just furniture. It had absorbed attention, fingers, sighs, and the restless patience of countless hands. You could almost feel the faint imprint of every reader, every idle moment, every flicker of hope or fleeting interest.\n\nIt smelled of old paper and neglect, of presence that had come and gone, leaving only a trace. The shelf held the room’s quiet history, not in words, but in the way it slumped, how it carried itself, how it seemed to remember everyone who had paused here. A monument, unassuming but certain, to all the people who had needed something—anything—to pass the night, or to make sense of it.",
                    media: {
                        url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759604596/Bookshelf_Cafe_kn4poz.png',
                        description: 'Bookshelf with used paperbacks',
                        hint: 'Justice... that word keeps appearing'
                    },
                    effects: [
                        { type: 'SET_FLAG', flag: 'has_seen_justice_book', value: true },
                        { type: 'SET_ENTITY_STATE', entityId: 'obj_bookshelf', patch: { isOpen: true } },
                        { type: 'REVEAL_FROM_PARENT', entityId: 'item_book_deal', parentId: 'obj_bookshelf' },
                        { type: 'REVEAL_FROM_PARENT', entityId: 'item_book_fbi', parentId: 'obj_bookshelf' },
                        { type: 'REVEAL_FROM_PARENT', entityId: 'item_book_justice', parentId: 'obj_bookshelf' }
                    ]
                }
            },

            // 2. TAKE - Can't take furniture
            onTake: {
                fail: {
                    message: "It's furniture, not evidence. Try EXAMINING the books or SEARCHING the shelf."
                }
            },

            // 4. USE - Use recip saw to cut through it
            // IMPORTANT: Conditional handler array for state-based interaction
            // See: src/documentation/handler-resolution-and-media.md
            onUse: [
                {
                    // Case 1: Already destroyed
                    itemId: 'item_recip_saw' as ItemId,
                    conditions: [
                        { type: 'FLAG', flag: 'bookshelf_destroyed', value: true }
                    ],
                    success: {
                        message: "Already destroyed. The hidden door is exposed."
                    }
                },
                {
                    // Case 2: Document read, ready to cut
                    itemId: 'item_recip_saw' as ItemId,
                    conditions: [
                        { type: 'FLAG', flag: 'read_secret_document', value: true },
                        { type: 'NO_FLAG', flag: 'bookshelf_destroyed' }
                    ],
                    success: {
                        message: "You remember the blueprint. Hidden room behind the bookshelf.\n\nYou fire up the reciprocating saw. Blade bites into oak. Wood screams. Sawdust sprays. You cut vertically down the side, then horizontally. The shelf shudders, splits. You kick it aside.\n\nBehind it: a door. Flush with the wall. No handle. Just a keypad. Someone hid this deliberately. The blueprint was right.",
                        media: {
                            url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762368505/Secret_Door_Revealed_o27pj3.png',
                            description: 'Destroyed bookshelf revealing hidden door',
                            hint: 'A secret door with a keypad'
                        },
                        effects: [
                            { type: 'SET_FLAG', flag: 'bookshelf_destroyed' as Flag, value: true },
                            { type: 'SET_ENTITY_STATE', entityId: 'obj_bookshelf', patch: { isBroken: true, isOpen: true } },
                            { type: 'REVEAL_FROM_PARENT', entityId: 'obj_hidden_door', parentId: 'obj_bookshelf' }
                        ]
                    }
                },
                {
                    // Case 3: Document NOT read yet - battery low
                    itemId: 'item_recip_saw' as ItemId,
                    conditions: [
                        { type: 'NO_FLAG', flag: 'read_secret_document' }
                    ],
                    success: {
                        message: "Hmmm the battery seems too low. Wait until it's charged fully."
                    }
                }
            ],

            // 6. OPEN - Already open shelving
            onOpen: {
                fail: {
                    message: "Open shelving. Nothing to open. Try READING or SEARCHING the books."
                }
            },

            // 7. CLOSE - Can't close open shelving
            onClose: {
                fail: {
                    message: "It's a shelf, not a cabinet. Try EXAMINING or SEARCHING it."
                }
            },

            // 8. MOVE - Too heavy to move
            onMove: {
                fail: {
                    message: "Too heavy to move. Solid oak, bolted down maybe. You'd need something more destructive. Maybe check the drawer at the counter for tools."
                }
            },

            // 9. BREAK - Need tools
            onBreak: {
                fail: {
                    message: "Solid oak. You're not smashing this with bare hands. You'd need a saw or something powerful. Check the counter drawer for tools."
                }
            },

            // 10. READ - Read the book titles
            onRead: {
                success: {
                    message: "You scan the spines. 'The Art of the Deal'. 'A Brief History of Time'. And... 'Justice for My Love'. Romance novel. But that word—justice—it's everywhere. Chalkboard, now this. Not coincidence.",
                    media: {
                        url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759604596/Bookshelf_Cafe_kn4poz.png',
                        description: 'Book titles on cafe bookshelf',
                        hint: 'Justice appears again'
                    },
                    effects: [
                        { type: 'SET_FLAG', flag: 'has_seen_justice_book', value: true }
                    ]
                }
            },

            // 11. SEARCH - Search through books
            onSearch: {
                success: {
                    message: "You pull books out, check behind them, flip through pages. Mostly cafe reading—travel guides, thrillers, business books. But 'Justice for My Love' stands out. Someone left breadcrumbs."
                }
            },

            // 12. TALK - Can't talk to furniture
            onTalk: {
                fail: {
                    message: "Books don't talk back. But you could READ them or EXAMINE the shelf."
                }
            },

            // Fallback for undefined actions
            defaultFailMessage: "It's a bookshelf. Try: EXAMINE, READ, or SEARCH the books."
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
        name: 'Wall painting',
        alternateNames: ['painting', 'wall painting', 'picture', 'art', 'abstract painting', 'canvas', 'frame'],
        archetype: 'Surface',
        description: 'An abstract painting hangs on the wall.',
        capabilities: { openable: false, lockable: false, breakable: false, movable: true, powerable: false, container: false, readable: false, inputtable: false },
        state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        children: { objects: ['obj_wall_safe'] as GameObjectId[] },
        media: {
            images: {
                default: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759604943/picture_on_wall_fcx10j.png', description: 'A painting on the wall of the cafe.', hint: 'abstract painting' },
                moved: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761263220/safe_behind_Painting_dbo6qc.png', description: 'The painting has been moved, revealing a wall safe behind it.', hint: 'revealed wall safe' }
            }
        },
        handlers: {
            // 1. EXAMINE - Visual inspection
            onExamine: {
                conditions: [{ type: 'NO_FLAG', flag: 'has_moved_painting' }],
                success: {  
                    message: "Abstract swirls at first, but linger long enough and the shapes resolve. A city in the 1800s, cobblestone streets slick with dawn rain, street lamps already glowing as the sun sets behind the horizon.\n\nNo people, no horses, nothing moving but shadows stretching along the buildings. Too clean. Too quiet. Too precise. The kind of city that exists only in a painting. It looks like the rain washed the souls down this street and into the canalisation.\n\nYou stare at the painting for a second too long. It makes you feel uneasy, as if it’s trying to tell you something you don’t quite understand yet.\n\nThe frame looks old and authentic, carved with careful detail. Someone spent a lot of time working on this.\n\nBut then you realize something else. It hangs crooked, edges nicked, as if someone nudged it or hung it in a hurry. Somehow it feels out of place in a space like this.\n\nBottom corner you see the signature, small and deliberate: S.B., 1939.\nThose initials again.\n\nYour eye drifts back to the painting and over the street lamps—three on the left, three on the right—perfectly symmetrical. House numbers? None.\n\nNothing marks a story, a path, a clue, or a location. Yet the precision nags at you, the tilt of the frame, the way it leans against the wall, as if it’s hiding a secret it isn’t ready to show.",                    
                    media: {
                        url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759604943/picture_on_wall_fcx10j.png',
                        description: 'Abstract painting with S.B. signature',
                        hint: 'Frame looks crooked...'
                    }
                },
                fail: {
                    message: "Painting's off the hook now, leaning on the wall. Frame shows the mount. The safe behind it. 'S.B.'—feels more significant now.",
                    media: {
                        url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761263220/safe_behind_Painting_dbo6qc.png',
                        description: 'Moved painting revealing wall safe',
                        hint: 'The safe was hidden behind it'
                    }
                }
            },

            // 2. TAKE - Too large for inventory
            onTake: {
                fail: {
                    message: "Too big. Wall art. But you could MOVE it or SEARCH behind it."
                }
            },

            // 4. USE - No item usage
            onUse: {
                fail: {
                    message: "It's art. For looking at. Try EXAMINING or MOVING it."
                }
            },

            // 6. OPEN - Nothing to open
            onOpen: {
                fail: {
                    message: "It's a painting, not a door. Try MOVING it or SEARCHING behind it."
                }
            },

            // 7. CLOSE - Nothing to close
            onClose: {
                fail: {
                    message: "Nothing to close. Try EXAMINING or MOVING it."
                }
            },

            // 8. MOVE - Reveals wall safe
            onMove: {
                conditions: [{ type: 'NO_FLAG', flag: 'has_moved_painting' }],
                success: {
                    message: "You lift the painting off the hook. From behind, you hear the Barista faintly shouting, 'Hey, don't touch this!' but you won’t stop now. The Barista gives up and turns back to his customers - after all, you are not even the craziest thing he has seen this morning.\n\nHeavier than it looks—real canvas, solid frame, stubborn under your hands. The smell of old paint and dust hits your nose, sharp and electric, mingling with the faint warmth of the cafe. A small splinter breaks off the frame, digging its sharp tip into your skin. If there should be any pain, you don’t feel it right now. Adrenaline masks every sensation.\n\nBehind it, the steel of a wall safe gleams cold and flat, set into the brick like it’s been waiting, patient, for someone curious enough to notice.\n\nA jolt runs through you. Your pulse picks up. The kind of excitement that creeps up slow at first, then grabs you by the gut. You haven’t felt this way in a long time—so much so, you assumed there was nothing left in the world that could thrill you.\n\nThis find changes everything.\n\nThis isn’t just a wall anymore—it’s a secret someone tried to bury. For a second, the cafe fades away. The smell of rain on cobblestones, the faint scent of scones, even the hum of conversation—all of it slips as the realization sinks in that you’ve uncovered something hidden. You unveiled something not meant to be discovered.\n\nYour hands linger, hesitant, reverent. Thrill and unease dance together. The quiet of the space presses closer.\nWhoever put this here wanted it concealed.\nWhoever put it here never expected you.", 
                    media: {
                        url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761263220/safe_behind_Painting_dbo6qc.png',
                        description: 'Wall safe revealed behind painting',
                        hint: 'A safe hidden behind art'
                    },
                    effects: [
                        { type: 'SET_FLAG', flag: 'has_moved_painting', value: true },
                        { type: 'SET_ENTITY_STATE', entityId: 'obj_painting', patch: { isMoved: true, currentStateId: 'moved' } },
                        { type: 'REVEAL_FROM_PARENT', entityId: 'obj_wall_safe', parentId: 'obj_painting' }
                    ]
                },
                fail: {
                    message: "Already moved. The safe's there. Nothing else behind it."
                }
            },

            // 9. BREAK - Don't vandalize art
            onBreak: {
                fail: {
                    message: "Vandalism, not investigation. Try MOVING it instead."
                }
            },

            // 10. READ - No text on abstract art
            onRead: {
                fail: {
                    message: "Abstract art. No text. But there's a signature: 'S.B.' Try EXAMINING or MOVING it."
                }
            },

            // 11. SEARCH - Look behind it
            onSearch: {
                conditions: [{ type: 'NO_FLAG', flag: 'has_moved_painting' }],
                success: {
                    message: "You run your hand along the frame edges. It's loose on the hook. Try MOVING it."
                },
                fail: {
                    message: "Already moved it. The safe's what was hidden."
                }
            },

            // 12. TALK - Can't talk to art
            onTalk: {
                fail: {
                    message: "The painting's silent. But you could EXAMINE or MOVE it."
                }
            },

            // Fallback for undefined actions
            defaultFailMessage: "The painting's part of the scene. Try: EXAMINE, MOVE, or SEARCH behind it."
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
        alternateNames: ['wall safe', 'safe', 'steel safe', 'metal safe', 'small safe'],
        archetype: 'Container',
        description: 'A small, steel safe is set into the wall.',
        capabilities: { openable: true, lockable: true, breakable: false, movable: false, powerable: false, container: true, readable: false, inputtable: false },
        state: { isOpen: false, isLocked: true, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        inventory: { items: ['item_newspaper_article'] as ItemId[], capacity: 1 },
        children: { items: ['item_newspaper_article'] as ItemId[] },
        media: {
            images: {
                default: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761263220/safe_behind_Painting_dbo6qc.png', description: 'A closed wall safe.', hint: 'wall safe' },
                unlocked: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762714567/Safe_newspaper_qy2ssi.png', description: 'An open wall safe containing an old newspaper article.', hint: 'open safe with newspaper' },
                unlocked_empty: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761293940/safe_behind_painting_open_empty_pn2js2.png', description: 'An open, empty wall safe.', hint: 'empty safe' }
            }
        },
        handlers: {
            // 1. EXAMINE - Visual inspection
            onExamine: [
                {
                    // Most specific: unlocked AND article taken
                    conditions: [
                        { type: 'FLAG', flag: 'safe_is_unlocked', value: true },
                        { type: 'HAS_ITEM', itemId: 'item_newspaper_article' }
                    ],
                    success: {
                        message: "Safe's open. Empty now - you took the newspaper clipping. Just bare metal inside. Whatever was hidden here, you found it.",
                        media: {
                            url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761293940/safe_behind_painting_open_empty_pn2js2.png',
                            description: 'Open, empty wall safe',
                            hint: 'You already took what was inside'
                        }
                    }
                },
                {
                    // Less specific: unlocked but article NOT taken
                    conditions: [
                        { type: 'FLAG', flag: 'safe_is_unlocked', value: true }
                    ],
                    success: {
                        message: "Safe's open. Inside: yellowed newspaper clipping. Decades old. Someone preserved this deliberately. Why hide a newspaper article in a safe?",
                        media: {
                            url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762714567/Safe_newspaper_qy2ssi.png',
                            description: 'Open safe with old newspaper article',
                            hint: 'An old newspaper article'
                        }
                    }
                },
                {
                    // Default: NOT unlocked
                    conditions: [],
                    success: {
                        message: "Small. Serious. Steel, flush mount, pro install. Cold. Brass keyhole under the handle. Not residential. Someone needed secure storage, hidden behind art. Lock's pristine.",
                        media: {
                            url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761263220/safe_behind_Painting_dbo6qc.png',
                            description: 'Locked wall safe with keyhole',
                            hint: 'Need the key...'
                        }
                    }
                }
            ],

            // 2. TAKE - Can't take wall-mounted safe
            onTake: {
                fail: {
                    message: "Bolted into brick. Not moving. Try EXAMINING or USING the key on it."
                }
            },

            // 4. USE - Use key to unlock
            onUse: [
                {
                    itemId: 'item_safe_key' as ItemId,
                    conditions: [{ type: 'NO_FLAG', flag: 'safe_is_unlocked' }],
                    success: {
                        message: "Key slides in—perfect fit. One turn. Heavy clunk. Door swings. Inside: yellowed newspaper clipping, preserved behind glass sleeve. Decades old. Protected like treasure. This is what they hid.",
                        media: {
                            url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762714567/Safe_newspaper_qy2ssi.png',
                            description: 'Safe unlocked revealing old newspaper article',
                            hint: 'Someone hid this for a reason'
                        },
                        effects: [
                            { type: 'SET_FLAG', flag: 'safe_is_unlocked', value: true },
                            { type: 'SET_ENTITY_STATE', entityId: 'obj_wall_safe', patch: { isLocked: false, isOpen: true, currentStateId: 'unlocked' } },
                            { type: 'REVEAL_FROM_PARENT', entityId: 'item_newspaper_article', parentId: 'obj_wall_safe' },
                            { type: 'REMOVE_ITEM', itemId: 'item_safe_key' }
                        ]
                    },
                    fail: {
                        message: "Already unlocked. Key served its purpose."
                    }
                }
            ],

            // 6. OPEN - Need key to open
            onOpen: {
                conditions: [{ type: 'NO_FLAG', flag: 'safe_is_unlocked' }],
                fail: {
                    message: "Locked tight. Need the key. Try USING the key on it."
                },
                success: {
                    message: "Already open. TAKE the document inside."
                }
            },

            // 7. CLOSE - Close open safe
            onClose: {
                conditions: [{ type: 'FLAG', flag: 'safe_is_unlocked', value: true }],
                success: {
                    message: "You swing the door shut. Metal clangs against frame. But why close it now?"
                },
                fail: {
                    message: "Already closed and locked."
                }
            },

            // 8. MOVE - Can't move flush-mounted safe
            onMove: {
                fail: {
                    message: "Flush-mounted in brick. Professional install. Not budging."
                }
            },

            // 9. BREAK - Need heavy tools
            onBreak: {
                fail: {
                    message: "Steel, pro-grade. You'd need explosives. Try USING the key instead."
                }
            },

            // 10. READ - No text to read
            onRead: {
                fail: {
                    message: "No text on the safe. Try EXAMINING it or USING the key."
                }
            },

            // 11. SEARCH - Check contents
            onSearch: {
                conditions: [{ type: 'FLAG', flag: 'safe_is_unlocked', value: true }],
                success: {
                    message: "You peer inside. Yellowed newspaper clipping in protective sleeve. Decades old. TAKE it."
                },
                fail: {
                    message: "Locked. Can't search a locked safe. Need the key."
                }
            },

            // 12. TALK - Can't talk to safe
            onTalk: {
                fail: {
                    message: "Safes don't talk. Try USING the key or EXAMINING it."
                }
            },

            // Fallback for undefined actions
            defaultFailMessage: "That doesn't work on the safe. Try: EXAMINE, USE key, OPEN, or SEARCH it."
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
    'obj_counter': {
        id: 'obj_counter' as GameObjectId,
        name: 'Counter',
        alternateNames: ['counter', 'cafe counter', 'bar', 'service counter'],
        archetype: 'Surface',
        description: 'A long wooden counter with a worn finish. The heart of the cafe. Coffee machine hums on top, drawer underneath.',
        transitionNarration: 'You step up to the counter. The barista and manager glance at you.',
        capabilities: { openable: false, lockable: false, breakable: false, movable: false, powerable: false, container: true, readable: false, inputtable: false },
        state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        children: {
            objects: ['obj_coffee_machine', 'obj_drawer'] as GameObjectId[]
        },
        nearbyNpcs: ['npc_barista', 'npc_manager'] as NpcId[],
        media: {
            images: {
                default: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759604596/Cafe_Counter_placeholder.png', description: 'The cafe counter with coffee machine and staff.', hint: 'counter' }
            }
        },
        handlers: {
            onExamine: {
                success: {
                    message: "Long wooden counter. Worn wood, coffee stains. Coffee machine sits on top, humming. Below—drawers. The kind that might hide things. Tools, receipts, whatever staff doesn't want customers seeing. Worth checking.",
                    media: {
                        url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759684408/counter_area_r6qq8z.png',
                        description: 'The cafe counter with coffee machine and drawers underneath',
                        hint: 'Those drawers look interesting...'
                    },
                    effects: [
                        { type: 'REVEAL_FROM_PARENT', entityId: 'obj_drawer', parentId: 'obj_counter' },
                        { type: 'REVEAL_FROM_PARENT', entityId: 'obj_coffee_machine', parentId: 'obj_counter' }
                    ]
                }
            },
            onTake: {
                fail: {
                    message: "It's built into the floor. Not going anywhere."
                }
            },
            defaultFailMessage: "It's a counter. Try: EXAMINE it or interact with what's on it."
        },
        design: {
            authorNotes: "Central object for cafe interactions. Houses coffee machine, drawer with saw, and serves as focus point for NPC conversations.",
            tags: ['counter', 'furniture', 'hub']
        },
        version: { schema: "1.0", content: "1.0" }
    },
    'obj_drawer': {
        id: 'obj_drawer' as GameObjectId,
        name: 'Drawer',
        alternateNames: ['drawer', 'counter drawer', 'the drawer', 'drawers'],
        archetype: 'Container',
        description: 'A drawer built into the counter. Not locked—just closed. Staff storage.',
        capabilities: { openable: true, lockable: true, breakable: false, movable: false, powerable: false, container: true, readable: false, inputtable: false },
        state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'closed' },
        inventory: { items: ['item_recip_saw'] as ItemId[], capacity: 3 },
        children: { items: ['item_recip_saw'] as ItemId[] },
        media: {
            images: {
                closed: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762429217/counter_drawer_examine_ryb0us.png', description: 'A closed drawer under the counter.', hint: 'drawer not locked' },
                open: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762429158/counter_drawer_power_tool_tvt3o5.png', description: 'Open drawer revealing a reciprocating saw and tools.', hint: 'power saw inside' },
                empty: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762466481/counter_drawer_empty_ud8wzi.png', description: 'Open drawer, now empty.', hint: 'drawer empty' }
            }
        },
        handlers: {
            onExamine: [
                {
                    conditions: [{ type: 'STATE', entityId: 'obj_drawer', key: 'isOpen', equals: false }],
                    success: {
                        message: "Built into the counter. No lock—just a handle. Staff storage. One pull and it's open.",
                        media: {
                            url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762429217/counter_drawer_examine_ryb0us.png',
                            description: 'A drawer built into the counter',
                            hint: 'Just needs to be opened...'
                        }
                    }
                },
                {
                    conditions: [
                        { type: 'STATE', entityId: 'obj_drawer', key: 'isOpen', equals: true },
                        { type: 'HAS_ITEM', itemId: 'item_recip_saw' }
                    ],
                    success: {
                        message: "Drawer's open. Empty now. The saw's in your pocket. Just receipts and tape left.",
                        media: {
                            url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762466481/counter_drawer_empty_ud8wzi.png',
                            description: 'Empty drawer',
                            hint: 'Nothing useful left'
                        }
                    }
                },
                {
                    conditions: [{ type: 'STATE', entityId: 'obj_drawer', key: 'isOpen', equals: true }],
                    success: {
                        message: "Drawer's open. Inside: a reciprocating saw, some receipts, tape. Tools of the trade.",
                        media: {
                            url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762429158/counter_drawer_power_tool_tvt3o5.png',
                            description: 'Open drawer with reciprocating saw visible',
                            hint: 'Power saw and tools'
                        }
                    }
                }
            ],
            onOpen: [
                {
                    conditions: [
                        { type: 'STATE', entityId: 'obj_drawer', key: 'isOpen', equals: false },
                        { type: 'HAS_ITEM', itemId: 'item_recip_saw' }
                    ],
                    success: {
                        message: "You pull the handle. Drawer slides open. Empty. If there was something inside of it, you cleared it out already.",
                        media: {
                            url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762466481/counter_drawer_empty_ud8wzi.png',
                            description: 'Empty drawer',
                            hint: 'Nothing left inside'
                        },
                        effects: [
                            { type: 'SET_ENTITY_STATE', entityId: 'obj_drawer', patch: { isOpen: true, currentStateId: 'empty' } }
                        ]
                    }
                },
                {
                    conditions: [{ type: 'STATE', entityId: 'obj_drawer', key: 'isOpen', equals: false }],
                    success: {
                        message: "You pull the handle. Drawer slides open smooth. Inside: reciprocating saw—professional grade. Fresh blade. Receipts underneath, tape, random tools. The saw's the prize. Could cut through metal, pipe, whatever.",
                        media: {
                            url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762429158/counter_drawer_power_tool_tvt3o5.png',
                            description: 'Open drawer revealing a reciprocating saw',
                            hint: 'A power saw for cutting!'
                        },
                        effects: [
                            { type: 'SET_ENTITY_STATE', entityId: 'obj_drawer', patch: { isOpen: true, currentStateId: 'open' } },
                            { type: 'REVEAL_FROM_PARENT', entityId: 'item_recip_saw', parentId: 'obj_drawer' }
                        ]
                    }
                },
                {
                    conditions: [
                        { type: 'STATE', entityId: 'obj_drawer', key: 'isOpen', equals: true },
                        { type: 'HAS_ITEM', itemId: 'item_recip_saw' }
                    ],
                    success: {
                        message: "Already open. Empty. The saw's in your pocket.",
                        media: {
                            url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762466481/counter_drawer_empty_ud8wzi.png',
                            description: 'Empty drawer',
                            hint: 'Nothing left inside'
                        }
                    }
                },
                {
                    conditions: [{ type: 'STATE', entityId: 'obj_drawer', key: 'isOpen', equals: true }],
                    success: {
                        message: "Already open. The saw is there for the taking.",
                        media: {
                            url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762429158/counter_drawer_power_tool_tvt3o5.png',
                            description: 'Open drawer with saw still inside',
                            hint: 'Saw still available'
                        }
                    }
                }
            ],
            onClose: {
                conditions: [{ type: 'STATE', entityId: 'obj_drawer', key: 'isOpen', equals: true }],
                success: {
                    message: "You slide it shut. The lock's broken now though.",
                    effects: [
                        { type: 'SET_ENTITY_STATE', entityId: 'obj_drawer', patch: { isOpen: false, currentStateId: 'closed' } }
                    ]
                },
                fail: {
                    message: "Drawer's already closed. Safety and all..."
                }
            },
            defaultFailMessage: "A drawer under the counter. Try: EXAMINE, OPEN, or SEARCH it."
        },
        design: {
            authorNotes: "Contains reciprocating saw for cutting iron pipe or other metal. Not locked, just closed—easy to open.",
            tags: ['drawer', 'container', 'tool storage']
        },
        version: { schema: "1.0", content: "1.0" }
    },
    'obj_coffee_machine': {
        id: 'obj_coffee_machine' as GameObjectId,
        name: 'Coffee Machine',
        archetype: 'Device',
        description: "It's a high-end Italian coffee machine, gleaming under the cafe lights.",
        capabilities: { openable: false, lockable: false, breakable: true, movable: false, powerable: false, container: true, readable: false, inputtable: false },
        state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        inventory: { items: ['item_safe_key'] as ItemId[], capacity: 1 },
        children: { items: ['item_safe_key'] as ItemId[] },
        media: {
            images: {
                default: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761211151/coffee_machine_detail_frexuu.png', description: 'A high-end Italian coffee machine.', hint: 'coffee machine' },
                broken: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761211151/coffee_machine_detail_broken_slkpfd.png', description: 'The shattered remains of the coffee machine\'s side panel.', hint: 'broken machine' },
                broken_empty: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762517001/counter_coffee_machine_broken_empty_ayeoql.png', description: 'Broken coffee machine with empty cavity', hint: 'You already took what was hidden' }
            }
        },
        handlers: {
            // 1. EXAMINE - Visual inspection
            // IMPORTANT: Conditional handler array for state-based media
            // See: src/documentation/handler-resolution-and-media.md
            // Order matters: most specific conditions first, default last
            onExamine: [
                {
                    // Most specific: broken AND key taken
                    conditions: [
                        { type: 'FLAG', flag: 'machine_is_broken', value: true },
                        { type: 'HAS_ITEM', itemId: 'item_safe_key' }
                    ],
                    success: {
                        message: "Shattered panel, broken plastic. The cavity's empty now - you took the key. Someone hid it here, didn't want it found easy. But you found it.",
                        media: {
                            url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762517001/counter_coffee_machine_broken_empty_ayeoql.png',
                            description: 'Broken coffee machine with empty cavity',
                            hint: 'You already took what was hidden'
                        }
                    }
                },
                {
                    // Less specific: broken but key NOT taken
                    conditions: [
                        { type: 'FLAG', flag: 'machine_is_broken', value: true }
                    ],
                    success: {
                        message: "Shattered panel, broken plastic. Inside the cavity: brass key. Someone hid it here, didn't want it found easy.",
                        media: {
                            url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761211151/coffee_machine_detail_broken_slkpfd.png',
                            description: 'Broken coffee machine with revealed key',
                            hint: 'The hiding spot is exposed'
                        }
                    }
                },
                {
                    // Default: NOT broken
                    conditions: [],
                    success: {
                        message: "Chrome and steel, Italian pride. But wrong—a service panel on the right side, warped. Screws stripped. Someone forced it shut fast. The panel rattles. Wouldn't take much to BREAK it open.",
                        media: {
                            url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761211151/coffee_machine_detail_frexuu.png',
                            description: 'Coffee machine with suspicious service panel',
                            hint: 'That panel looks forced shut...'
                        }
                    }
                }
            ],

            // 2. TAKE - Can't take bolted furniture
            onTake: {
                fail: {
                    message: "Bolted to the counter, weighs a ton. Not going anywhere. Try EXAMINING or BREAKING it."
                }
            },

            // 4. USE - Use iron pipe to smash it
            onUse: [
                {
                    itemId: 'item_iron_pipe' as ItemId,
                    conditions: [{ type: 'NO_FLAG', flag: 'machine_is_broken' }],
                    success: {
                        message: "Pipe meets panel. Sharp crack. Plastic shatters, metal splits. The cavity opens. Something brass tumbles out—a key. Hidden inside, forced shut. Someone didn't want this found.",
                        media: {
                            url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761211151/coffee_machine_detail_broken_slkpfd.png',
                            description: 'Broken machine revealing hidden key',
                            hint: 'A key was hidden inside'
                        },
                        effects: [
                            { type: 'SET_FLAG', flag: 'machine_is_broken' as Flag, value: true },
                            { type: 'SET_ENTITY_STATE', entityId: 'obj_coffee_machine', patch: { isBroken: true, isOpen: true, currentStateId: 'broken' } },
                            { type: 'REVEAL_FROM_PARENT', entityId: 'item_safe_key', parentId: 'obj_coffee_machine' }
                        ]
                    },
                    fail: {
                        message: "Already broken. One hit was enough."
                    }
                }
            ],

            // 6. OPEN - Service panel jammed
            onOpen: {
                fail: {
                    message: "Panel's jammed. Screws stripped. You'd need to BREAK it open with something heavy."
                }
            },

            // 7. CLOSE - Already jammed shut
            onClose: {
                fail: {
                    message: "It's jammed shut already. What you need is to BREAK it."
                }
            },

            // 8. MOVE - Bolted to counter
            onMove: {
                fail: {
                    message: "Bolted to the counter. Commercial install. Not going anywhere. Besides, it weighs more than you'd want."
                }
            },

            // 9. BREAK - Break it with bare hands (needs item)
            onBreak: {
                fail: {
                    message: "You'd need something heavy to break this open. Like a pipe. Try USING the iron pipe on it."
                }
            },

            // 10. READ - No text to read
            onRead: {
                fail: {
                    message: "It's a machine, not a manual. Try EXAMINING it."
                }
            },

            // 11. SEARCH - Check for hidden compartment
            onSearch: {
                conditions: [{ type: 'FLAG', flag: 'machine_is_broken', value: true }],
                success: {
                    message: "The shattered panel reveals the cavity. Empty now. The key's been found."
                },
                fail: {
                    message: "The panel's sealed tight. You'd need to BREAK it open first."
                }
            },

            // 12. TALK - Can't talk to machines
            onTalk: {
                fail: {
                    message: "Machines don't talk back. But you could EXAMINE or BREAK it."
                }
            },

            // Fallback for undefined actions
            defaultFailMessage: "That doesn't work on the machine. Try: EXAMINE, USE iron pipe, BREAK, or SEARCH it."
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
    },
    'obj_sd_card': {
        id: 'obj_sd_card' as GameObjectId,
        name: 'SD Card',
        alternateNames: ['sd card', 'card', 'memory card', 'sd', 'media card', 'black card'],
        archetype: 'Device',
        description: 'A small, modern SD card, looking strangely out of place in the old notebook. It probably fits in your phone.',
        transitionNarration: 'You lean in closer to examine the SD card tucked inside the notebook.',
        capabilities: { openable: false, lockable: false, breakable: false, movable: false, powerable: false, container: false, readable: true, inputtable: false },
        state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'closed' },
        media: {
            images: {
                closed: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761812524/SD_Card_rokilu.png', description: 'A black SD card.', hint: 'sd card' },
                opened: { url: 'https://res.cloudinary.com/dg912bwcc/video/upload/v1759678377/CH_I_completion_jqtyme.mp4', description: 'Video playing from SD card.', hint: 'video' }
            }
        },
        handlers: {
            // EXAMINE - Visual inspection with phone hint
            onExamine: {
                success: {
                    message: "Black SD card. Modern. Out of place in the old notebook. Standard size—fits most devices. Your FBI phone has a slot for external media like this.",
                    media: {
                        url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761812524/SD_Card_rokilu.png',
                        description: 'Black SD card',
                        hint: 'Your phone can read this'
                    }
                }
            },

            // USE - Requires phone as key
            onUse: [
                {
                    itemId: 'item_player_phone' as ItemId,
                    conditions: [
                        { type: 'STATE', entityId: 'obj_sd_card', key: 'currentStateId', equals: 'closed' }
                    ],
                    success: {
                        message: "Card slides into your phone. Screen flickers. Video loads—grainy, seventy years old. Music fills the cafe. Saxophone, smooth, melancholic. A tune that's been waiting.\n\nSilas Bloom. Musician. That song for Rose... they were in love. You hear it in every note.\n\nVideo ends. More questions than answers. Your mind races. Then you notice—the folded newspaper article, still in the notebook. Waiting.",
                        media: {
                            url: 'https://res.cloudinary.com/dg912bwcc/video/upload/v1759678377/CH_I_completion_jqtyme.mp4',
                            description: 'Video from SD card: Silas Bloom playing saxophone',
                            hint: 'The video reveals Silas and Rose'
                        },
                        effects: [
                            { type: 'SET_ENTITY_STATE', entityId: 'obj_sd_card', patch: { currentStateId: 'opened' } },
                            { type: 'SET_FLAG', flag: 'notebook_video_watched' as Flag, value: true }
                        ]
                    },
                    fail: {
                        message: "You've already watched the video. The footage is burned into your memory."
                    }
                }
            ],

            // READ - Also requires phone as key (same as USE)
            onRead: [
                {
                    itemId: 'item_player_phone' as ItemId,
                    conditions: [
                        { type: 'STATE', entityId: 'obj_sd_card', key: 'currentStateId', equals: 'closed' }
                    ],
                    success: {
                        message: "Card slides into your phone. Screen flickers. Video loads—grainy, seventy years old. Music fills the cafe. Saxophone, smooth, melancholic. A tune that's been waiting.\n\nSilas Bloom. Musician. That song for Rose... they were in love. You hear it in every note.\n\nVideo ends. More questions than answers. Your mind races. Then you notice—the folded newspaper article, still in the notebook. Waiting.",
                        media: {
                            url: 'https://res.cloudinary.com/dg912bwcc/video/upload/v1759678377/CH_I_completion_jqtyme.mp4',
                            description: 'Video from SD card: Silas Bloom playing saxophone',
                            hint: 'The video reveals Silas and Rose'
                        },
                        effects: [
                            { type: 'SET_ENTITY_STATE', entityId: 'obj_sd_card', patch: { currentStateId: 'opened' } },
                            { type: 'SET_FLAG', flag: 'notebook_video_watched' as Flag, value: true }
                        ]
                    },
                    fail: {
                        message: "You've already watched the video. The footage is burned into your memory."
                    }
                }
            ],

            // Fallback
            defaultFailMessage: "The SD card holds data. Try: EXAMINE it, or USE PHONE ON it."
        },
        design: {
            authorNotes: "Media device containing the video clue about Silas Bloom. Requires phone to unlock/read.",
            tags: ['sd card', 'media', 'device']
        },
        version: { schema: "1.0", content: "2.0" }
    },
    'obj_tablet': {
        id: 'obj_tablet' as GameObjectId,
        name: 'Tablet Computer',
        alternateNames: ['tablet', 'computer', 'device', 'screen'],
        archetype: 'Device',
        description: 'A tablet computer sits on the desk, screen glowing with a cryptic puzzle.',
        personal: true,
        capabilities: { openable: false, lockable: false, breakable: false, movable: false, powerable: true, container: false, readable: true, inputtable: true },
        state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: true, currentStateId: 'default' },
        inventory: { items: [], capacity: 0 },
        media: {
            images: {
                default: { url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600', description: 'A tablet computer with glowing screen.', hint: 'digital tablet' }
            }
        },
        input: {
            type: 'phrase',
            validation: 'placeholder_password',
            hint: 'Puzzle requires a password... Visit the mini-game to find it.',
            attempts: null,
            lockout: null
        },
        handlers: {
            // 1. EXAMINE - Visual inspection
            onExamine: {
                success: {
                    message: "Tablet glows. Modern. Expensive. Screen shows a complex puzzle game—logic gates, cipher wheels, cryptic symbols. Below the puzzle, a message:\n\n'SOLVE TO UNLOCK. PASSWORD REQUIRED.'\n\nA URL at the bottom: https://airpg-minigames.vercel.app/games/tablet-puzzle\n\nThis is part of his game. A test. The kidnapper wants you to play.",
                    media: {
                        url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600',
                        description: 'Tablet showing cryptic puzzle',
                        hint: 'Mini-game puzzle'
                    }
                }
            },

            // 2. TAKE - Can't take tablet
            onTake: {
                fail: {
                    message: "Bolted to the desk. Not moving. Try EXAMINING it or solving the puzzle."
                }
            },

            // 4. USE - Direct to puzzle
            onUse: {
                fail: {
                    message: "It's already powered on. Try EXAMINING the puzzle or visiting the mini-game URL."
                }
            },

            // 6. OPEN - Not applicable
            onOpen: {
                fail: {
                    message: "It's already displaying the puzzle. Try READING or EXAMINING it."
                }
            },

            // 7. CLOSE - Can't close
            onClose: {
                fail: {
                    message: "Can't power it down. The puzzle demands attention."
                }
            },

            // 8. MOVE - Bolted down
            onMove: {
                fail: {
                    message: "Bolted to desk. Professional install. Try solving the PUZZLE instead."
                }
            },

            // 9. BREAK - Reinforced
            onBreak: {
                fail: {
                    message: "Reinforced case. You'd damage it before breaking it. Try solving the PUZZLE."
                }
            },

            // 10. READ - Read the puzzle
            onRead: {
                success: {
                    message: "Screen text:\n\n'CRYPTOGRAPHIC LOGIC PUZZLE'\n'SOLVE ALL GATES TO REVEAL THE PASSPHRASE'\n\nMini-game: https://airpg-minigames.vercel.app/games/tablet-puzzle\n\nOnce solved, use: /password <answer>"
                }
            },

            // 11. SEARCH - Examine tablet
            onSearch: {
                success: {
                    message: "You examine the tablet. No physical buttons. Just the glowing puzzle screen. The answer is in the game. Visit the URL to solve it."
                }
            },

            // Password submission (for future expansion)
            onPasswordSubmit: {
                success: {
                    message: "Screen flashes green. 'CORRECT. ACCESS GRANTED.'\n\nNew files appear. Financial records. Offshore accounts. Shell corporations. All linked to Veridian Dynamics. This is evidence. Big evidence.\n\nBut this is flavor content for now. The real mystery is the phone call.",
                    effects: [
                        { type: 'SET_FLAG', flag: 'tablet_puzzle_solved', value: true }
                    ]
                },
                fail: {
                    message: "Screen flashes red. 'INCORRECT.' Try solving the puzzle at the mini-game URL first."
                }
            },

            defaultFailMessage: "A tablet with a cryptic puzzle. Try: EXAMINE it, READ it, or visit https://airpg-minigames.vercel.app/games/tablet-puzzle"
        },
        design: {
            authorNotes: "Tablet provides optional mini-game puzzle. Currently flavor content. Password validation can be updated when mini-game is built.",
            tags: ['tablet', 'puzzle', 'minigame', 'flavor']
        },
        version: { schema: "1.0", content: "1.0" }
    },
    'obj_hidden_door': {
        id: 'obj_hidden_door' as GameObjectId,
        name: 'Hidden Door',
        alternateNames: ['door', 'hidden door', 'secret door', 'keypad door', 'locked door', 'the door'],
        archetype: 'Door',
        description: 'A hidden door behind the bookshelf with a digital keypad.',
        transitionNarration: 'Your curiosity wins and you take a step closer to have a look at the door.',
        capabilities: { openable: true, lockable: true, breakable: false, movable: false, powerable: false, container: true, readable: false, inputtable: true },
        state: { isOpen: false, isLocked: true, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        inventory: { items: [], capacity: 0 },
        children: {
            objects: ['obj_tablet'] as GameObjectId[]
        },
        nearbyNpcs: ['npc_victim_girl'] as NpcId[],
        media: {
            images: {
                default: { url: 'https://images.unsplash.com/photo-1614359953614-dcf28bc61b80?w=600', description: 'A hidden door with keypad.', hint: 'secret door' },
                unlocked: { url: 'https://images.unsplash.com/photo-1519147433953-d90e6f751a5a?w=600', description: 'Open door revealing hidden room.', hint: 'open secret room' }
            }
        },
        input: {
            type: 'phrase',
            validation: 'Justice for Rose Carmichael',
            hint: 'Requires a password phrase...',
            attempts: null,
            lockout: null
        },
        handlers: {
            // 1. EXAMINE - Visual inspection (FORCES focus shift even as child of bookshelf)
            onExamine: {
                conditions: [{ type: 'STATE', entityId: 'obj_hidden_door', key: 'isLocked', equals: true }],
                success: {
                    message: "Heavy steel door. Flush with the wall. Cold to touch—reinforced metal, military-grade. No handle, no hinges visible. Smooth matte finish.\n\nJust a digital keypad. Glowing faintly green. Numbers 0-9 and a small screen reading 'ENTER PASSPHRASE'. Professional installation. This was built to stay hidden.\n\nThe keypad waits. Use: /password <your guess>",
                    media: {
                        url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762416324/hidden_door_detailed_kyansl.jpg',
                        description: 'Hidden door with digital keypad',
                        hint: 'Need the password phrase...'
                    },
                    effects: [
                        { type: 'SET_FOCUS', focusId: 'obj_hidden_door', focusType: 'object' }
                    ]
                },
                fail: {
                    message: "Door's open. Inside: small hidden room. Dim. A desk with a tablet. And—wait. Someone's there. A girl. Tied to a chair. Eyes wide. Alive.",
                    media: {
                        url: 'https://images.unsplash.com/photo-1519147433953-d90e6f751a5a?w=600',
                        description: 'Open secret room with victim',
                        hint: 'The missing girl!'
                    },
                    effects: [
                        { type: 'SET_FOCUS', focusId: 'obj_hidden_door', focusType: 'object' }
                    ]
                }
            },

            // 2. TAKE - Can't take door
            onTake: {
                fail: {
                    message: "It's a door built into the wall. Try entering the PASSWORD to unlock it."
                }
            },

            // 4. USE - Direct to password
            onUse: {
                fail: {
                    message: "It needs a password. Use: /password <your guess>"
                }
            },

            // 6. OPEN - Requires unlock first, then opens to reveal victim
            onOpen: [
                {
                    // Door already open
                    conditions: [{ type: 'STATE', entityId: 'obj_hidden_door', key: 'isOpen', equals: true }],
                    success: {
                        message: "Door's already open. The victim is inside, waiting. You can TALK to her."
                    }
                },
                {
                    // Door unlocked but not yet opened - THE BIG REVEAL
                    conditions: [
                        { type: 'STATE', entityId: 'obj_hidden_door', key: 'isLocked', equals: false },
                        { type: 'STATE', entityId: 'obj_hidden_door', key: 'isOpen', equals: false }
                    ],
                    success: {
                        message: "You grip the handle. Pull. Heavy door swings inward—smooth, silent hinges. Professional.\n\nSmall room. Dim light from a desk lamp. Tablet glowing. And—\n\nYour breath catches.\n\nA girl. Young. Tied to a chair. Duct tape over her mouth. Eyes wide, terrified but alive. Tears streak her face.\n\nThe missing victim. Rose Carmichael.\n\nShe's trying to speak. Muffled sounds. Urgent. Desperate.",
                        media: {
                            url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762368566/Screenshot_2025-11-04_at_15.31.36_opzjnb.png',
                            description: 'Open door revealing hidden room with kidnapped victim',
                            hint: 'She knows something!'
                        },
                        effects: [
                            { type: 'SET_ENTITY_STATE', entityId: 'obj_hidden_door', patch: { isOpen: true, currentStateId: 'unlocked' } },
                            { type: 'REVEAL_FROM_PARENT', entityId: 'npc_victim_girl', parentId: 'obj_hidden_door' },
                            { type: 'REVEAL_FROM_PARENT', entityId: 'obj_tablet', parentId: 'obj_hidden_door' },
                            { type: 'SET_FLAG', flag: 'hidden_door_opened', value: true }
                        ]
                    }
                },
                {
                    // Door still locked - need password first
                    conditions: [{ type: 'STATE', entityId: 'obj_hidden_door', key: 'isLocked', equals: true }],
                    success: {
                        message: "Keypad locks it tight. Need the PASSWORD first.\n\nYou notice something new on the screen: 'WEB AUTH REQUIRED'\nBelow it, a URL flickers: https://airpg.vercel.app/puzzle\n\nTry: /password <your guess>",
                        media: {
                            url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762416485/Screenshot_2025-11-06_at_9.07.21_qpfubu.png',
                            description: 'Access denied - keypad screen',
                            hint: 'Need web authentication'
                        }
                    }
                }
            ],

            // 7. CLOSE - Close open door
            onClose: {
                conditions: [{ type: 'STATE', entityId: 'obj_hidden_door', key: 'isOpen', equals: true }],
                success: {
                    message: "You swing the door shut. But why? The girl is still inside. Open it again."
                },
                fail: {
                    message: "Already closed and locked."
                }
            },

            // 8. MOVE - Can't move door
            onMove: {
                fail: {
                    message: "Built into the wall. Not moving. Try entering the PASSWORD."
                }
            },

            // 9. BREAK - Reinforced
            onBreak: {
                fail: {
                    message: "Reinforced steel. You'd need explosives. Try the PASSWORD instead."
                }
            },

            // 10. READ - Read keypad
            onRead: {
                success: {
                    message: "Digital keypad. Small screen reads: 'ENTER PASSPHRASE'. Numbers 0-9. No hints. Use: /password <your guess>"
                }
            },

            // 11. SEARCH - Search/check the door more carefully (provides password hint)
            onSearch: {
                success: {
                    message: "You examine the keypad closely. No worn keys. No fingerprints. Clean. Professional.\n\nThe screen flickers briefly: 'HINT: Justice demands remembrance.' Then back to 'ENTER PASSPHRASE'.\n\nThink: What connects all the clues? The chalkboard, the books, the newspaper article... Justice for who?\n\nUse: /password <your full answer>",
                    media: {
                        url: 'https://images.unsplash.com/photo-1614359953614-dcf28bc61b80?w=600',
                        description: 'Hidden door with digital keypad',
                        hint: 'Justice demands remembrance...'
                    }
                }
            },

            // Password submission handler - UNLOCKS but does NOT open
            onPasswordSubmit: {
                success: {
                    message: "Keypad beeps. Green light flashes. Locks disengage—heavy metallic clunks echo in sequence. Click. Click. Click.\n\nThe screen reads: 'ACCESS GRANTED'\n\nDoor's unlocked. Still closed. A handle waits. You can OPEN it now.",
                    media: {
                        url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762416677/hidden_door_access_granted_c2mkro.jpg',
                        description: 'Access granted - door unlocked',
                        hint: 'Green light - access granted'
                    },
                    effects: [
                        { type: 'SET_FLAG', flag: 'hidden_door_unlocked', value: true },
                        { type: 'SET_ENTITY_STATE', entityId: 'obj_hidden_door', patch: { isLocked: false } }
                    ]
                },
                fail: {
                    message: "Keypad beeps. Red light flashes. \n\n'ACCESS DENIED' It seems the password is wrong.\n\nTry again. Use: /password <your guess>",
                    media: {
                        url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762416485/Screenshot_2025-11-06_at_9.07.21_qpfubu.png',
                        description: 'Access denied - incorrect password',
                        hint: 'Red light - access denied'
                    }
                }
            },

            defaultFailMessage: "A hidden door with a digital keypad. Try: EXAMINE it, OPEN it, or enter /password <your guess>."
        },
        design: {
            authorNotes: "Hidden door revealed after moving bookshelf. Unlocks with 'Justice for Rose Carmichael'. Contains victim NPC and tablet.",
            tags: ['door', 'hidden', 'locked', 'puzzle']
        },
        version: { schema: "1.0", content: "1.0" }
    }
};

const items: Record<ItemId, Item> = {
    'item_player_phone': {
        id: 'item_player_phone' as ItemId,
        name: 'Phone',
        alternateNames: ['phone', 'smartphone', 'cell phone', 'mobile', 'fbi phone', 'my phone', 'fbi smartphone'],
        archetype: 'Tool',
        description: "Your standard-issue FBI smartphone. It has a camera, secure messaging, and a slot for external media.",
        capabilities: { isTakable: false, isReadable: false, isUsable: true, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        state: { currentStateId: 'default' },
        media: {
            images: {
                default: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762705398/Pulls_out_Phone_zrekhi.png', description: 'FBI-issue smartphone', hint: 'fbi phone' }
            }
        },
        handlers: {
            // EXAMINE - Visual inspection
            onExamine: {
                success: {
                    message: "FBI-issue smartphone. Camera, secure messaging, media slot. Standard kit. Always in your pocket.\n\nYou can USE PHONE to enter phone mode and make calls."
                }
            },

            // USE - Enter phone mode
            onUse: {
                success: {
                    message: "You take out your FBI phone. The screen lights up.",
                    media: {
                        url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762705398/Pulls_out_Phone_zrekhi.png',
                        description: 'Pulling out FBI phone from jacket',
                        hint: 'Taking out phone'
                    },
                    effects: [
                        { type: 'SET_DEVICE_FOCUS', deviceId: 'item_player_phone' as ItemId },
                        {
                            type: 'SHOW_MESSAGE',
                            speaker: 'system',
                            content: 'Phone Mode Active\n\nType CALL <number> to dial.\nType HELP for available commands.\nType PUT PHONE AWAY or CLOSE PHONE when done.'
                        }
                    ]
                }
            },

            // Call Handler - Dial phone numbers (only works in device focus mode)
            onCall: [
                {
                    // SUCCESS: Has both clues (note + victim girl conversation)
                    phoneNumber: '555-444-2025',
                    conditions: [
                        { type: 'FLAG', flag: 'note_dropped_from_book', value: true },
                        { type: 'FLAG', flag: 'victim_revealed_digits', value: true }
                    ],
                    success: {
                        message: "You dial 555-444-2025.\n\nThe line clicks. Static hisses. Then—a voice. Cold. Measured. Deliberate.\n\n[AUDIO MESSAGE PLAYS]\n\n\"Well, well. Agent Burt Macklin. Congratulations. You've proven to be a worthy opponent. You found my little puzzle. Clever.\n\nYou may have won this round, but the game is far from over. More rounds are to come. I'll keep you busy, detective. Very busy.\n\nJustice... Justice will be served. For Rose. For Silas. For all of them.\n\nUntil next time.\"\n\nThe call ends abruptly. No callback number. Just the echo of that voice.\n\n---CHAPTER 1 COMPLETE---",
                        media: {
                            url: 'https://res.cloudinary.com/dg912bwcc/video/upload/v1762703179/CH_I___Villain___Voice_Message_du7fsn.mp3',
                            description: 'Voice message from the villain',
                            hint: 'Villain audio message',
                            type: 'audio'
                        },
                        effects: [
                            { type: 'SET_FLAG', flag: 'villain_called', value: true },
                            { type: 'SET_FLAG', flag: 'chapter_1_complete', value: true },
                            { type: 'ADD_ITEM', itemId: 'item_audio_message' as ItemId }
                        ]
                    },
                    fail: {
                        message: "You have the first 7 digits: 555-444. But the last four are scratched out on the note. You need to find the missing piece."
                    }
                },
                {
                    // Partial number - player found note but not last 4 digits
                    phoneNumber: '555-444',
                    conditions: [
                        { type: 'FLAG', flag: 'note_dropped_from_book', value: true }
                    ],
                    success: {
                        message: "You try dialing 555-444, but that's not enough. You need the complete 10-digit number. The last four digits are scratched out on the note. Find the missing piece."
                    }
                },
                {
                    // Default fallback - wrong number (plays automated message)
                    phoneNumber: '*',
                    conditions: [],
                    success: {
                        message: "You dial the number.\n\n[Automated voice]: \"The number you have dialed is currently not available. Please check the number and try again.\"\n\nThe line goes dead.",
                        media: {
                            url: 'https://res.cloudinary.com/dg912bwcc/video/upload/v1762705354/wrong_number_kazuze.mp3',
                            description: 'Automated wrong number message',
                            hint: 'Number not available',
                            type: 'audio'
                        }
                    }
                }
            ],

            // Fallback
            defaultFailMessage: "The phone's a tool. Try USING it ON something that needs it, or CALL a phone number."
        },
        design: {
            authorNotes: "Universal tool/key for media devices and locked objects throughout the game.",
            tags: ['phone', 'device', 'tool', 'key']
        },
        version: { schema: "1.0", content: "3.0" }
    },
    'item_audio_message': {
        id: 'item_audio_message' as ItemId,
        name: 'Voicemail Recording',
        alternateNames: ['voicemail', 'voice message', 'recording', 'audio message', 'villain message', 'message', 'call recording'],
        archetype: 'Document',
        description: 'Recorded voicemail from 555-444-2025. That voice... cold, precise. Every word chosen deliberately.',
        capabilities: { isTakable: false, isReadable: true, isUsable: false, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        state: { currentStateId: 'default', readCount: 0 },
        media: {
            images: {
                default: {
                    url: 'https://res.cloudinary.com/dg912bwcc/video/upload/v1762703179/CH_I___Villain___Voice_Message_du7fsn.mp3',
                    description: 'Audio recording of villain voicemail',
                    hint: 'Voice message from unknown caller',
                    type: 'audio'
                }
            }
        },
        handlers: {
            // EXAMINE - Inspect the recording
            onExamine: {
                success: {
                    message: "Voicemail from 555-444-2025. Timestamp: Tonight. Duration: 47 seconds. That voice—who is this?"
                }
            },

            // READ - Listen to the message again
            onRead: {
                success: {
                    message: "You listen to the voicemail again.\n\n[AUDIO PLAYS]\n\n\"Well, well. Agent Burt Macklin. Congratulations. You've proven to be a worthy opponent. You found my little puzzle. Clever.\n\nYou may have won this round, but the game is far from over. More rounds are to come. I'll keep you busy, detective. Very busy.\n\nJustice... Justice will be served. For Rose. For Silas. For all of them.\n\nUntil next time.\"\n\nThat voice—cold, precise. Every word chosen deliberately. Who is this?",
                    media: {
                        url: 'https://res.cloudinary.com/dg912bwcc/video/upload/v1762703179/CH_I___Villain___Voice_Message_du7fsn.mp3',
                        description: 'Replaying villain voicemail',
                        hint: 'Audio message',
                        type: 'audio'
                    },
                    effects: [
                        { type: 'INCREMENT_ITEM_READ_COUNT', itemId: 'item_audio_message' }
                    ]
                }
            },

            // TAKE - Can't take digital recordings
            onTake: {
                fail: {
                    message: "It's a digital recording stored on your phone. Already in your call history."
                }
            },

            // USE - Can't use recordings
            onUse: {
                fail: {
                    message: "It's an audio recording. Try READ or EXAMINE to listen to it again."
                }
            },

            // Fallback
            defaultFailMessage: "It's a voicemail recording. Try: EXAMINE to see details, or READ to listen again."
        },
        design: {
            authorNotes: "Villain's first contact - Chapter 1 climax. Digital item (not takeable, stays in phone).",
            tags: ['audio', 'clue', 'villain', 'chapter-end']
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
        state: { currentStateId: 'revealed', readCount: 0 },  // Initial state when revealed
        media: {
            images: {
                revealed: {
                    url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761261134/iron_pipe_bpcofa.png',
                    description: 'A heavy iron pipe leaning against the wall behind the chalkboard.',
                    hint: 'iron pipe behind chalkboard'
                },
                taken: {
                    // Uses system generic "put in pocket" image
                    url: undefined as any,  // Will use systemMedia.take.success
                    description: 'Iron pipe in your possession',
                    hint: 'iron pipe taken'
                }
            }
        },
        handlers: {
            // 1. EXAMINE - Visual inspection
            onExamine: {
                success: {
                    message: "Heavy iron pipe. Cold steel, rust at joints. Solid weight. The kind of tool that solves problems without keys.",
                    media: {
                        url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761261134/iron_pipe_bpcofa.png',
                        description: 'Heavy iron pipe',
                        hint: 'Useful for breaking things...'
                    }
                }
            },

            // 2. TAKE - Pick it up
            onTake: {
                success: {
                    message: "Pipe falls into your hands. Heavy. Brutal. Perfect.",
                    effects: [
                        { type: 'ADD_ITEM', itemId: 'item_iron_pipe' },
                        { type: 'SET_ENTITY_STATE', entityId: 'item_iron_pipe', patch: { currentStateId: 'taken', taken: true } }
                    ]
                },
                fail: {
                    message: "Already have it."
                }
            },

            // 3. DROP - Drop it
            onDrop: {
                success: {
                    message: "You drop the pipe. Clangs on the floor. Always can pick it up later."
                }
            },

            // 4. USE - Use on object (requires target)
            onUse: {
                fail: {
                    message: "Pipe's for breaking things. USE it ON something—like a jammed panel or stuck lock."
                }
            },

            // 6. OPEN - Can't open a pipe
            onOpen: {
                fail: {
                    message: "It's a pipe, not a container. Try USING it ON something to break it open."
                }
            },

            // 7. CLOSE - Can't close a pipe
            onClose: {
                fail: {
                    message: "Nothing to close. Try USING it ON something."
                }
            },

            // 8. MOVE - Just reposition
            onMove: {
                fail: {
                    message: "It's in your hands. Try USING it ON something."
                }
            },

            // 9. BREAK - Can't break the pipe itself
            onBreak: {
                fail: {
                    message: "Solid steel. You're not breaking this. It's for breaking OTHER things. Try USING it ON something."
                }
            },

            // 10. READ - No text
            onRead: {
                fail: {
                    message: "No markings. Just a pipe. Try EXAMINING or USING it."
                }
            },

            // 11. SEARCH - Nothing to search
            onSearch: {
                fail: {
                    message: "It's a pipe. Solid. Nothing hidden inside. Try USING it ON something."
                }
            },

            // 12. TALK - Can't talk to pipe
            onTalk: {
                fail: {
                    message: "The pipe's silent. But it speaks volumes when you USE it."
                }
            },

            // Fallback
            defaultFailMessage: "The pipe's a tool. Try: EXAMINE it, or USE it ON an object to break it open."
        },
        design: {
            authorNotes: "Tool for breaking objects like the coffee machine.",
            tags: ['pipe']
        },
        version: { schema: "1.0", content: "1.0" }
    },
    'item_recip_saw': {
        id: 'item_recip_saw' as ItemId,
        name: 'Reciprocating Saw',
        alternateNames: ['reciprocating saw', 'recip saw', 'saw', 'power saw', 'electric saw', 'sawzall'],
        archetype: 'Tool',
        description: 'A reciprocating saw with a fresh blade. Perfect for cutting through metal.',
        capabilities: { isTakable: true, isReadable: false, isUsable: true, isCombinable: false, isConsumable: true, isScannable: false, isAnalyzable: false, isPhotographable: false },
        state: { currentStateId: 'revealed', readCount: 0 },
        media: {
            images: {
                revealed: {
                    url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759604596/recip_saw.png',
                    description: 'A reciprocating saw in the drawer.',
                    hint: 'power saw for cutting'
                },
                taken: {
                    url: undefined as any,  // Will use systemMedia.take.success
                    description: 'Reciprocating saw in your possession',
                    hint: 'saw taken'
                }
            }
        },
        handlers: {
            onExamine: {
                success: {
                    message: "Reciprocating saw. Fresh blade. Corded. The kind contractors use for demolition. Cut through pipe, rebar, whatever. Blade's sharp—ready to work."
                }
            },
            onTake: {
                success: {
                    message: "You grab the saw. Heavy. Professional grade. This'll cut through just about anything. You close the drawer—y'know? Just to make sure nobody hurts himself. Safety first after all.",
                    effects: [
                        { type: 'ADD_ITEM', itemId: 'item_recip_saw' },
                        { type: 'SET_ENTITY_STATE', entityId: 'item_recip_saw', patch: { currentStateId: 'taken', taken: true } },
                        { type: 'SET_ENTITY_STATE', entityId: 'obj_drawer', patch: { isOpen: false, currentStateId: 'closed' } }
                    ]
                },
                fail: {
                    message: "Already have it."
                }
            },
            defaultFailMessage: "A reciprocating saw. Try: EXAMINE, TAKE, or USE it on something to cut."
        },
        design: {
            authorNotes: "Power tool for cutting through iron pipe or other metal obstacles. Alternative to brute force.",
            tags: ['tool', 'power tool', 'cutting']
        },
        version: { schema: "1.0", content: "1.0" }
    },
    'item_safe_key': {
        id: 'item_safe_key' as ItemId,
        name: 'Brass Key',
        alternateNames: ['brass key', 'key', 'small key', 'ornate key', 'safe key'],
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
            // 1. EXAMINE - Visual inspection
            onExamine: {
                success: {
                    message: "Small brass key. Ornate. No markings. Made for a safe, not a door. Looks like it fits the wall safe.",
                    media: {
                        url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761211151/deposit_box_key_f5g2k2.png',
                        description: 'Brass key for wall safe',
                        hint: 'For the wall safe behind the painting'
                    }
                }
            },

            // 2. TAKE - Pick it up
            onTake: {
                success: {
                    message: "Brass key goes in your pocket. One step closer.",
                    effects: [
                        { type: 'ADD_ITEM', itemId: 'item_safe_key' },
                        { type: 'SET_ENTITY_STATE', entityId: 'item_safe_key', patch: { taken: true } },
                        { type: 'SET_ENTITY_STATE', entityId: 'obj_coffee_machine', patch: { currentStateId: 'broken_empty' } }
                    ]
                },
                fail: {
                    message: "Already have it."
                }
            },

            // 3. DROP - Drop it
            onDrop: {
                success: {
                    message: "Key clinks on the floor. Can pick it up later."
                }
            },

            // 4. USE - Use on safe (needs target)
            onUse: {
                fail: {
                    message: "USE it ON the wall safe. Key needs a lock."
                }
            },

            // 6. OPEN - Can't open a key
            onOpen: {
                fail: {
                    message: "Keys open locks, not themselves. Try USING it ON the safe."
                }
            },

            // 7. CLOSE - Can't close a key
            onClose: {
                fail: {
                    message: "Nothing to close. Try USING it ON the safe."
                }
            },

            // 8. MOVE - Just reposition
            onMove: {
                fail: {
                    message: "It's in your pocket. Try USING it ON the safe."
                }
            },

            // 9. BREAK - Don't break the key
            onBreak: {
                fail: {
                    message: "Break the key? Then how do you open the safe? Try USING it."
                }
            },

            // 10. READ - No text on key
            onRead: {
                success: {
                    message: "No markings. No labels. Just brass. Made for the wall safe."
                }
            },

            // 11. SEARCH - Nothing to search
            onSearch: {
                fail: {
                    message: "It's a key. Solid brass. Nothing hidden. Try USING it ON the safe."
                }
            },

            // 12. TALK - Can't talk to key
            onTalk: {
                fail: {
                    message: "Keys don't talk. Try USING it ON the safe."
                }
            },

            // Fallback
            defaultFailMessage: "The key's for the wall safe. Try: EXAMINE it, or USE it ON the safe."
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
        alternateNames: ['business card', 'musicians card', 'saxo card', 'sax card'],
        archetype: "Personal",
        description: 'A simple business card for a musician. It reads: "S A X O - The World\'s Best Sax Player". A phone number is listed, along with a handwritten number "1943" and the name "ROSE".',
        alternateDescription: "The musician's business card. That name, 'ROSE', and the number '1943' seem significant.",
        capabilities: { isTakable: true, isReadable: true, isUsable: false, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        handlers: {
            // 1. EXAMINE - Visual inspection
            onExamine: {
                success: {
                    message: "Business card. Simple. 'S A X O - The World's Best Sax Player'. Phone number. Handwritten: '1943' and 'ROSE'. Clues.",
                    media: {
                        url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759241477/Screenshot_2025-09-30_at_15.46.02_fuk4tb.png',
                        description: 'Business card for saxophone player',
                        hint: 'ROSE and 1943 written by hand'
                    }
                }
            },

            // 2. TAKE - Pick it up
            onTake: {
                success: {
                    message: "Card goes in your pocket. S A X O. ROSE. 1943. Pieces of the puzzle."
                },
                fail: {
                    message: "Already have it."
                }
            },

            // 3. DROP - Drop it
            onDrop: {
                success: {
                    message: "Card drops. Tiny. Can pick it up later."
                }
            },

            // 4. USE - Can't use business card
            onUse: {
                fail: {
                    message: "It's a business card. Try READING it or EXAMINING it."
                }
            },

            // 6. OPEN - Can't open card
            onOpen: {
                fail: {
                    message: "It's flat. Try READING it."
                }
            },

            // 7. CLOSE - Can't close card
            onClose: {
                fail: {
                    message: "Nothing to close. Try READING it."
                }
            },

            // 8. MOVE - Just reposition
            onMove: {
                fail: {
                    message: "It's in your pocket. Try READING it."
                }
            },

            // 9. BREAK - Don't destroy evidence
            onBreak: {
                fail: {
                    message: "Evidence. Don't destroy it. Try READING it."
                }
            },

            // 10. READ - Read the card
            onRead: {
                success: {
                    message: "'S A X O - The World's Best Sax Player'. Phone number. Handwritten: '1943' and 'ROSE'. ROSE. That name connects."
                }
            },

            // 11. SEARCH - Nothing to search
            onSearch: {
                fail: {
                    message: "It's a card. Flat. Try READING it."
                }
            },

            // 12. TALK - Can't talk to card
            onTalk: {
                fail: {
                    message: "Cards don't talk. Try READING it."
                }
            },

            // Fallback
            defaultFailMessage: "Musician's business card. Clues: ROSE and 1943. Try: EXAMINE or READ it."
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
        media: {
            images: {
                default: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762714364/Old_Newspaper_Article_hlwmqu.png', description: 'An old newspaper article about Silas Bloom from the 1940s.', hint: 'old newspaper article' }
            }
        },
        handlers: {
            // 1. EXAMINE - Visual inspection
            onExamine: {
                success: {
                    message: "Folded newspaper clipping. 1940s. Brittle, yellowed. Headline about Silas Bloom, local musician.",
                    media: {
                        url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762714364/Old_Newspaper_Article_hlwmqu.png',
                        description: 'Old newspaper article from the 1940s about Silas Bloom',
                        hint: 'Read it to learn more about the case'
                    }
                }
            },

            // 2. TAKE - Pick it up
            onTake: {
                success: {
                    message: "Article goes in your pocket. Brittle. Old. READ it to find out what it says."
                },
                fail: {
                    message: "Already have it."
                }
            },

            // 3. DROP - Drop it
            onDrop: {
                success: {
                    message: "Article drifts down. Fragile. Can pick it up later."
                }
            },

            // 4. USE - Can't use newspaper
            onUse: {
                fail: {
                    message: "It's a newspaper. Try READING it."
                }
            },

            // 6. OPEN - Open/unfold it
            onOpen: {
                success: {
                    message: "You unfold it. Same as READING it. Try READ article."
                }
            },

            // 7. CLOSE - Close/fold it
            onClose: {
                success: {
                    message: "You fold it back up. Already read it anyway."
                }
            },

            // 8. MOVE - Just reposition
            onMove: {
                fail: {
                    message: "It's in your pocket. Try READING it."
                }
            },

            // 9. BREAK - Don't destroy evidence
            onBreak: {
                fail: {
                    message: "Evidence. Fragile. Don't destroy it. Try READING it."
                }
            },

            // 10. READ - Read the article
            onRead: {
                success: {
                    effects: [
                        { type: 'SHOW_MESSAGE', speaker: 'narrator', content: 'You unfold the clipping. Brittle, yellowed, legible. Ink faded to sepia. Smell of decades—dust, wood, forgotten time.' },
                        { type: 'SHOW_MESSAGE', speaker: 'narrator', content: 'Newspaper article about Silas Bloom.', messageType: 'article', imageId: 'item_newspaper_article' },
                        { type: 'SHOW_MESSAGE', speaker: 'narrator', content: 'Your eyes catch a name: Agent Macklin. FBI. 1940s. Cold realization—your grandfather. The case that defined his career... or destroyed it. This isn\'t just evidence. It\'s family history.' },
                        { type: 'SET_FLAG', flag: 'notebook_article_read' as Flag, value: true },
                        { type: 'SET_FLAG', flag: 'notebook_interaction_complete' as Flag, value: true }
                    ]
                },
                fail: {
                    message: "Can't read it now."
                }
            },

            // 11. SEARCH - Can't search newspaper
            onSearch: {
                fail: {
                    message: "It's a single article. Try READING it."
                }
            },

            // 12. TALK - Can't talk to newspaper
            onTalk: {
                fail: {
                    message: "Paper doesn't talk. Try READING it."
                }
            },

            // Fallback
            defaultFailMessage: "The article's from the 1940s. Try: EXAMINE it, or READ it."
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
            // 1. EXAMINE
            onExamine: { success: { message: 'Business book. Gaudy cover. Not relevant.' } },
            // 2. TAKE
            onTake: { fail: { message: "Cafe property. Try READING it." } },
            // 4. USE
            onUse: { fail: { message: "It's a book. Try READING it." } },
            // 6. OPEN
            onOpen: { success: { message: "Same as READING. Try READ book." } },
            // 7. CLOSE
            onClose: { success: { message: "You close it." } },
            // 8. MOVE
            onMove: { fail: { message: "It's on the shelf. Try READING it." } },
            // 9. BREAK
            onBreak: { fail: { message: "Cafe property. Try READING it instead." } },
            // 10. READ - Uses stateMap for progressive content
            // 11. SEARCH
            onSearch: { fail: { message: "It's a book. Try READING it." } },
            // 12. TALK
            onTalk: { fail: { message: "Books don't talk. Try READING it." } },
            defaultFailMessage: "It's a book on the shelf. Try: EXAMINE or READ it."
        },
        stateMap: {
            'read0': {
                description: "It seems to be a ghost-written book about a real estate magnate. Not relevant to the case.",
                media: {
                    images: {
                        default: {
                            url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762712221/Book_Deal_1_ui3swk.png',
                            description: 'First page of The Art of the Deal',
                            hint: 'Business book page 1'
                        }
                    }
                }
            },
            'read1': {
                description: "Chapter 1: 'Think Big'. You decide you've thought big enough for one day.",
                media: {
                    images: {
                        default: {
                            url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762712222/Book_Deal_2_q7t1to.png',
                            description: 'Second page of The Art of the Deal',
                            hint: 'Business book page 2'
                        }
                    }
                }
            },
            'read2': {
                description: "You skim another chapter. It's mostly just self-praise. This isn't helping the case.",
                media: {
                    images: {
                        default: {
                            url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762712221/Book_Deal_3_nhcvda.png',
                            description: 'Third page of The Art of the Deal',
                            hint: 'Business book page 3'
                        }
                    }
                }
            }
        },
        design: { tags: ['book', 'distraction'] },
        version: { schema: "1.0", content: "1.1" }
    },
    'item_book_fbi': {
        id: 'item_book_fbi' as ItemId,
        name: 'A Brief History of the FBI',
        alternateNames: ['brief history of fbi', 'fbi history', 'fbi book', 'history book', 'brief history'],
        archetype: 'Book',
        description: 'A book about the history of the FBI.',
        capabilities: { isTakable: false, isReadable: true, isUsable: false, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        state: { readCount: 0, currentStateId: 'default' },
        media: {
            images: {
                default: { url: 'https://images.stockcake.com/public/8/2/1/821cc306-132c-48ca-91e9-5d2bb356fc1e_large/ancient-closed-book-stockcake.jpg', description: 'A closed book.', hint: 'closed book' },
                opened: { url: 'https://the-openbook.com/wp-content/uploads/2023/02/cropped-the-open-book-nieuw.jpg?w=780&h=684', description: 'An open book.', hint: 'open book' }
            }
        },
        handlers: {
            // 1. EXAMINE
            onExamine: { success: { message: 'FBI history book. Could be interesting, but not relevant to the case right now.' } },
            // 2. TAKE
            onTake: { fail: { message: "Cafe property. Try READING it." } },
            // 4. USE
            onUse: { fail: { message: "It's a book. Try READING it." } },
            // 6. OPEN
            onOpen: { success: { message: "Same as READING. Try READ book." } },
            // 7. CLOSE
            onClose: { success: { message: "You close it." } },
            // 8. MOVE
            onMove: { fail: { message: "It's on the shelf. Try READING it." } },
            // 9. BREAK
            onBreak: { fail: { message: "Cafe property. Try READING it instead." } },
            // 10. READ - Uses stateMap for progressive content
            // 11. SEARCH
            onSearch: { fail: { message: "It's a book. Try READING it." } },
            // 12. TALK
            onTalk: { fail: { message: "Books don't talk. Try READING it." } },
            defaultFailMessage: "It's a book on the shelf. Try: EXAMINE or READ it."
        },
        stateMap: {
            'read0': {
                description: "A history of the Federal Bureau of Investigation. Interesting, but not helping with the current case.",
                media: {
                    images: {
                        default: {
                            url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762712220/Book_FBI_1_gxpv0e.png',
                            description: 'First page of FBI history book',
                            hint: 'FBI book page 1'
                        }
                    }
                }
            },
            'read1': {
                description: "You read about famous FBI cases from the past. Makes you wonder if your current case will end up in a book someday.",
                media: {
                    images: {
                        default: {
                            url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762712220/Book_FBI_2_x59juw.png',
                            description: 'Second page of FBI history book',
                            hint: 'FBI book page 2'
                        }
                    }
                }
            },
            'read2': {
                description: "The chapter on cold cases is sobering. You close the book. Time to focus on solving this one.",
                media: {
                    images: {
                        default: {
                            url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762712220/Book_FBI_3_vu1qey.png',
                            description: 'Third page of FBI history book',
                            hint: 'FBI book page 3'
                        }
                    }
                }
            }
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
            // 1. EXAMINE
            onExamine: { success: { message: 'Romance novel. Cheesy cover. Title: "Justice for My Love". That word again.' } },
            // 2. TAKE
            onTake: { fail: { message: "Cafe property. Try READING it." } },
            // 4. USE
            onUse: { fail: { message: "It's a book. Try READING it." } },
            // 6. OPEN
            onOpen: { success: { message: "Same as READING. Try READ book." } },
            // 7. CLOSE
            onClose: { success: { message: "You close it." } },
            // 8. MOVE
            onMove: { fail: { message: "It's on the shelf. Try READING it." } },
            // 9. BREAK
            onBreak: { fail: { message: "Cafe property. Try READING it instead." } },
            // 10. READ - Progressive content with note drop on 3rd read
            onRead: [
                {
                    // First read
                    conditions: [{ type: 'STATE', entityId: 'item_book_justice', key: 'readCount', equals: 0 }],
                    success: {
                        message: "Against your better judgment, you read a page.",
                        media: {
                            url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762712220/Book_Justice_1_hvjtcj.png',
                            description: 'First page of Justice for My Love',
                            hint: 'Romance novel page 1'
                        },
                        effects: [
                            { type: 'INCREMENT_ITEM_READ_COUNT', itemId: 'item_book_justice' }
                        ]
                    }
                },
                {
                    // Second read
                    conditions: [{ type: 'STATE', entityId: 'item_book_justice', key: 'readCount', equals: 1 }],
                    success: {
                        message: "You flip to a random page. That's enough of that.",
                        media: {
                            url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762712220/Book_Justice_2_ej33rl.png',
                            description: 'Second page of Justice for My Love',
                            hint: 'Romance novel page 2'
                        },
                        effects: [
                            { type: 'INCREMENT_ITEM_READ_COUNT', itemId: 'item_book_justice' }
                        ]
                    }
                },
                {
                    // Third read - NOTE DROPS!
                    conditions: [{ type: 'STATE', entityId: 'item_book_justice', key: 'readCount', equals: 2 }],
                    success: {
                        message: "You open the book again. As you flip through the pages, a small piece of paper flutters out and lands on the floor. You pick it up.\n\nIt's a handwritten note. Ink faded but legible. Just a phone number:\n\n555-444-XXXX\n\nThe last four digits are scratched out. Someone hid this deliberately. Why?",
                        media: {
                            url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762518484/counter_bookshelf_note_puesuy.png',
                            description: 'A handwritten note falling from book pages',
                            hint: 'Note with phone number!'
                        },
                        effects: [
                            { type: 'INCREMENT_ITEM_READ_COUNT', itemId: 'item_book_justice' },
                            { type: 'REVEAL_FROM_PARENT', entityId: 'item_note_phone', parentId: 'item_book_justice' },
                            { type: 'SET_FLAG', flag: 'note_dropped_from_book', value: true }
                        ]
                    }
                },
                {
                    // Subsequent reads
                    conditions: [{ type: 'STATE', entityId: 'item_book_justice', key: 'readCount', operator: '>=', value: 3 }],
                    success: {
                        message: "The back cover has a blurb: 'A story of love, loss, and the quest for justice.' The word 'justice' is practically leaping off the page. You already found the note.",
                        media: {
                            url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600',
                            description: 'Book back cover with blurb',
                            hint: 'Back cover'
                        }
                    }
                }
            ],
            // 11. SEARCH
            onSearch: { fail: { message: "It's a book. Try READING it." } },
            // 12. TALK
            onTalk: { fail: { message: "Books don't talk. Try READING it." } },
            defaultFailMessage: "Romance novel. 'Justice' in the title. Try: EXAMINE or READ it."
        },
        design: { tags: ['book', 'clue'] },
        version: { schema: "1.0", content: "1.1" }
    },
    'item_note_phone': {
        id: 'item_note_phone' as ItemId,
        name: 'Handwritten Note',
        alternateNames: ['note', 'paper', 'phone note', 'piece of paper', 'handwritten note'],
        archetype: 'Document',
        description: 'A small piece of paper with a phone number written on it: 555-444-XXXX. The last four digits are scratched out.',
        capabilities: { isTakable: true, isReadable: true, isUsable: false, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        state: { readCount: 0, currentStateId: 'default' },
        media: {
            images: {
                default: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762518484/counter_bookshelf_note_puesuy.png', description: 'A handwritten note on aged paper.', hint: 'note with phone number' }
            }
        },
        handlers: {
            // 1. EXAMINE - Visual inspection
            onExamine: {
                success: {
                    message: "Faded ink. Handwritten. Phone number: 555-444-XXXX. Last four digits scratched out deliberately. Someone wanted this hidden, but not destroyed. Why hide only part of it?"
                }
            },
            // 2. TAKE - Pick it up
            onTake: {
                success: {
                    message: "You pick up the note. Fragile paper, faded ink. Phone number with missing digits. A puzzle piece.",
                    effects: [
                        { type: 'ADD_ITEM', itemId: 'item_note_phone' },
                        { type: 'SET_ENTITY_STATE', entityId: 'item_note_phone', patch: { taken: true } }
                    ]
                },
                fail: {
                    message: "Already have it."
                }
            },
            // 3. DROP - Drop it
            onDrop: {
                success: {
                    message: "Note flutters to the ground. Can pick it up later."
                }
            },
            // 4. USE - Can't use note
            onUse: {
                fail: {
                    message: "It's just a note. Try READING it or EXAMINING it."
                }
            },
            // 6. OPEN - Already open
            onOpen: {
                fail: {
                    message: "It's a single piece of paper. Already open. Try READING it."
                }
            },
            // 7. CLOSE - Can't close
            onClose: {
                fail: {
                    message: "It's just a slip of paper. Can't close it."
                }
            },
            // 8. MOVE - Just reposition
            onMove: {
                fail: {
                    message: "It's in your hands. Try READING it."
                }
            },
            // 9. BREAK - Don't destroy evidence
            onBreak: {
                fail: {
                    message: "Evidence. Don't destroy it. Try READING it."
                }
            },
            // 10. READ - Read the note
            onRead: {
                success: {
                    message: "Phone number: 555-444-XXXX\n\nThe last four digits are scratched out. Black ink, deliberate strokes. Someone didn't want the full number found easily. But why leave part of it? A test? A clue?"
                }
            },
            // 11. SEARCH - Search the note
            onSearch: {
                success: {
                    message: "You hold it up to the light. No watermarks. No hidden text. Just the incomplete phone number. The answer must be somewhere else."
                }
            },
            // 12. TALK - Can't talk to note
            onTalk: {
                fail: {
                    message: "Notes don't talk. Try READING it."
                }
            },
            defaultFailMessage: "A note with an incomplete phone number. Try: EXAMINE it, READ it, or SEARCH it."
        },
        design: { tags: ['note', 'clue', 'puzzle'] },
        version: { schema: "1.0", content: "1.0" }
    },
    'item_secret_document': {
        id: 'item_secret_document' as ItemId,
        name: 'Stolen Police File',
        alternateNames: ['stolen police file', 'police file', 'file', 'document', 'stolen file', 'confidential file'],
        archetype: 'Document',
        description: "A thick police file marked 'CONFIDENTIAL - POLICE USE ONLY'. Official stamps and seals cover the folder.",
        alternateDescription: "The stolen police file from the notebook. It contains classified investigation documents.",
        capabilities: { isTakable: true, isReadable: true, isUsable: false, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        media: {
            images: {
                default: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762429368/CH_I___Secret_Document_Notebook_kusyq8.pdf', description: 'A stolen police file with classified investigation documents.', hint: 'police file PDF' }
            }
        },
        handlers: {
            // 1. EXAMINE - Visual inspection
            onExamine: {
                success: {
                    message: "Police file. Thick. CONFIDENTIAL - POLICE USE ONLY stamped across it. Official seals. This was stolen from law enforcement.",
                    media: {
                        url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762429368/CH_I___Secret_Document_Notebook_kusyq8.pdf',
                        type: 'pdf',
                        description: 'Stolen police file with classified documents',
                        hint: 'Read it to discover what the police know'
                    }
                }
            },

            // 2. TAKE - Pick it up
            onTake: {
                success: {
                    message: "Police file goes in your hands. Heavy. CONFIDENTIAL - POLICE USE ONLY. Stolen evidence.",
                    effects: [
                        { type: 'ADD_ITEM', itemId: 'item_secret_document' },
                        { type: 'SET_ENTITY_STATE', entityId: 'item_secret_document', patch: { taken: true } }
                    ]
                },
                fail: {
                    message: "Already have it."
                }
            },

            // 3. DROP - Drop it
            onDrop: {
                success: {
                    message: "Police file drops. Investigation documents scatter. Can pick it up later."
                }
            },

            // 4. USE - Can't use document
            onUse: {
                fail: {
                    message: "It's a document. Try READING it."
                }
            },

            // 6. OPEN - Open the folder
            onOpen: {
                success: {
                    message: "You open it. Same as READING. Try READ document."
                }
            },

            // 7. CLOSE - Close the folder
            onClose: {
                success: {
                    message: "You close the folder. Already seen what's inside anyway."
                }
            },

            // 8. MOVE - Just reposition
            onMove: {
                fail: {
                    message: "It's in your hands. Try READING it."
                }
            },

            // 9. BREAK - Don't destroy evidence
            onBreak: {
                fail: {
                    message: "Evidence. Don't destroy it. Try READING it."
                }
            },

            // 10. READ - Read the document
            onRead: {
                success: {
                    message: "You open the police file. Dense. Case reports, witness statements, crime scene photos. But wait—there's something about the cafe. Floor plans marked with investigator notes. A hidden room behind the bookshelf circled in red. Why was this being investigated?\n\nNext pages: Financial records, surveillance logs, shell corporations. All linked to one holding company: Veridian Dynamics. The police knew. They were building a case.",
                    media: {
                        url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762429368/CH_I___Secret_Document_Notebook_kusyq8.pdf',
                        type: 'pdf',
                        description: 'Stolen police file revealing investigation into the cafe and Veridian Dynamics',
                        hint: 'Hidden room behind bookshelf marked by police? Veridian Dynamics under investigation'
                    },
                    effects: [
                        { type: 'SET_FLAG', flag: 'read_secret_document' as Flag, value: true }
                    ]
                },
                fail: {
                    message: "Can't read it now."
                }
            },

            // 11. SEARCH - Search through pages
            onSearch: {
                success: {
                    message: "You flip through pages. Case reports, witness statements, surveillance photos. Veridian Dynamics appears in multiple investigations. This file connects everything."
                }
            },

            // 12. TALK - Can't talk to document
            onTalk: {
                fail: {
                    message: "Documents don't talk. Try READING it."
                }
            },

            // Fallback
            defaultFailMessage: "It's a stolen police file marked CONFIDENTIAL - POLICE USE ONLY. Try: EXAMINE it, READ it, or SEARCH through it."
        },
        design: { tags: ['file', 'document'] },
        version: { schema: "1.0", content: "1.0" }
    }
};

const npcs: Record<NpcId, NPC> = {
    'npc_barista': {
        id: 'npc_barista' as NpcId,
        name: 'Barista',
        alternateNames: ['barista', 'bartender', 'coffee guy', 'server'],
        description: 'A tired-looking man in his late 20s, with faded tattoos and a cynical arch to his eyebrow. He seems to have seen a thousand stories like yours and is not easily impressed.',
        image: {
            url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759241505/Cafe_barrista_hpwona.png',
            description: 'A portrait of the cafe barista.',
            hint: 'male barista'
        },
        npcType: 'type1',  // Type 1: Story-critical NPC with canned answers
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
        startConversationEffects: [{ type: 'SET_FLAG', flag: 'has_talked_to_barista' as Flag, value: true }],
        limits: { maxInteractions: 20, interactionLimitResponse: "Seriously, I've got a line of customers. I can't keep chatting. The coffee machine calls." },

        // PROGRESSIVE REVEALS: Business card unlocked on 3rd interaction
        progressiveReveals: [
            {
                triggerOnInteraction: 3,  // After 3rd conversation turn
                topicId: 't_give_card'
            }
        ],

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
            { topicId: 't_greet', label: 'Greeting', keywords: ["hello", "hi", "how are you", "hey", "good morning", "good afternoon"], response: { message: 'Another day, another dollar. What do you need?' } },
            { topicId: 't_coffee', label: 'Ask about coffee', keywords: ["coffee", "drink", "menu", "order", "buy", "latte", "cappuccino", "espresso", "beverage"], response: { message: 'The coffee is hot and the pastries are day-old. The menu is on the board. Let me know if you can decipher my handwriting.' } },
            { topicId: 't_prices', label: 'Ask about prices', keywords: ["price", "cost", "how much", "expensive", "cheap"], response: { message: 'More than it should be, less than I want to charge. The prices are on the board.' } },
            { topicId: 't_reco', label: 'Ask for recommendation', keywords: ["recommend", "good", "special", "best", "favorite", "suggest"], response: { message: 'The espresso will wake you up. The scones... well, they exist.' } },
            { topicId: 't_man', label: 'Ask about the man in black', keywords: ["man", "regular", "customer", "guy", "who left", "who was sitting here", "the man", "person"], response: { message: "The guy in the black coat? Yeah, he's a regular. Comes in, stares at his notebook, doesn't say much. Pays in cash. My favorite kind of customer." } },
            { topicId: 't_musician', label: 'Ask about his job', keywords: ["musician", "saxophone", "job", "background", "what does he do", "occupation", "work"], response: { message: "I hear he's a musician. Plays the saxophone out on the corner most days. Keeps to himself, you know?" } },
            { topicId: 't_notebook', label: 'Ask about the notebook', keywords: ["notebook", "book", "his", "what was he doing", "writing", "journal"], response: { message: "Always scribbling in that old notebook of his. Looked like he was writing the next great American novel, or maybe just his grocery list. Who knows."} },
            { topicId: 't_cafe', label: 'Ask about the cafe', keywords: ["cafe", "place", "here", "daily grind", "establishment"], response: { message: "It's a job. I make coffee, people drink it. The manager tries to make it feel 'cozy'. I just clean up after people." } },
            { topicId: 't_day', label: 'Ask about his day', keywords: ["day", "shift", "busy", "slow", "customers"], response: { message: "Same as always. Pour coffee, wipe counters, listen to people's problems. The usual." } },
            { topicId: 't_weather', label: 'Comment on weather', keywords: ["rain", "weather", "cold", "wet"], response: { message: "Rain brings customers. They want something warm. Good for business, I guess." } },
            { topicId: 't_manager', label: 'Ask about manager', keywords: ["manager", "boss", "woman", "lady"], response: { message: "Brenda? She's... enthusiastic. Very positive. Sometimes exhaustingly so. But she pays on time." } },
            { topicId: 't_name', label: 'Ask his name', keywords: ["name", "called", "your name"], response: { message: "Name's Jake. Not that it matters much. I'm just the guy who makes your coffee." } },
            { topicId: 't_tips', label: 'Comment on tips', keywords: ["tip", "tips", "money"], response: { message: "Tips are appreciated. Pays for my Netflix subscription." } },
            { topicId: 't_case', label: 'Ask about investigation', keywords: ["investigation", "case", "detective", "police", "crime"], response: { message: "Look, I don't know anything about any case. I just work here. You want answers, talk to the cops." } },
            { topicId: 't_suspicious', label: 'Ask about suspicious behavior', keywords: ["suspicious", "strange", "weird", "unusual", "odd"], response: { message: "In a downtown cafe? Everything's suspicious. Half the customers are probably on the run from something." } },
            { topicId: 't_regulars', label: 'Ask about other regulars', keywords: ["regulars", "customers", "people", "who comes here"], response: { message: "We get all types. Office workers, students, tourists. The usual city crowd." } },
            { topicId: 't_hours', label: 'Ask about hours', keywords: ["hours", "open", "close", "schedule"], response: { message: "6 AM to 9 PM. I'm here most mornings. Lucky me." } },
            { topicId: 't_food', label: 'Ask about food', keywords: ["food", "pastries", "muffin", "scone", "sandwich"], response: { message: "Pastries are from yesterday. Still edible. The sandwiches are fresh, at least." } },
            { topicId: 't_compliment', label: 'Compliment him', keywords: ["good job", "great", "nice", "excellent"], response: { message: "Thanks, I guess. Just doing my job. You want that coffee or not?" } },
            {
              topicId: 't_give_card',
              label: 'Ask about what he left/his name',
              keywords: ["business card", "left", "name", "note", "anything else", "what did he leave", "ask about silas bloom", "silas bloom", "know his name", "card", "leave anything"],
              once: true,
              conditions: { requiredFlagsAll: ['topic_revealed_npc_barista_t_give_card' as Flag] },  // Only available after progressive reveal
              response: {
                message: "You know, he left this here the other day. Said I could have it. Some business card. If you're that interested, you can take it. It's just collecting dust. Now, if you'll excuse me, I've got work to do.",
                effects: [
                    { type: 'ADD_ITEM', itemId: 'item_business_card' as ItemId },
                    { type: 'SET_FLAG', flag: 'has_received_business_card' as Flag, value: true },
                    { type: 'SHOW_MESSAGE', speaker: 'narrator', content: "The barista slides a business card across the counter. It's been added to your inventory.", messageType: 'image', imageId: 'item_business_card' as ItemId, imageEntityType: 'item' }
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
        version: { schema: "2.0", content: "1.2" }
    },
    'npc_manager': {
        id: 'npc_manager' as NpcId,
        name: 'Cafe Manager',
        alternateNames: ['manager', 'brenda', 'lady', 'woman'],
        description: 'A cheerful woman in her late 40s, with a permanent, slightly-too-wide smile. She radiates a relentless positivity that feels slightly out of place in the grim city.',
        image: {
            url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759604054/cafe_manager_punwhs.png',
            description: 'Portrait of the cafe manager.',
            hint: 'female manager'
        },
        npcType: 'type2',  // Type 2: Flavor NPC with AI-generated responses
        importance: 'ambient',
        initialState: {
            stage: 'active',
            trust: 50,
            attitude: 'friendly'
        },
        dialogueType: 'freeform',  // AI-generated responses
        persona: "You are Brenda, the relentlessly cheerful and bubbly manager of 'The Daily Grind' cafe. You love talking about your 'Artisan Coffee of the Week', the daily specials, and the local community art you hang on the walls. You are completely oblivious to any crime or mystery. Your job is to be a fountain of pleasant, slightly-vacant small talk. Keep your responses short, sweet, and upbeat! Use a wide variety of positive adjectives and avoid repeating words like 'divine'. Use modern currency like dollars and cents.",
        welcomeMessage: "Welcome to The Daily Grind! How can I make your day a little brighter? Can I interest you in a 'Sunshine Muffin'? They're 10% off!",
        goodbyeMessage: "Have a wonderfully caffeinated day! Come back soon!",
        limits: {
            maxInteractions: 5,  // Type 2 limit: 5 interactions
            interactionLimitResponse: "It has been so lovely chatting with you, but I really must get back to managing. The muffins won't bake themselves, you know! Have a super day!",
        },
        fallbacks: {
            default: "Oh, I'm not sure about that, but have you tried our new matcha latte? It's simply wonderful!"
        },
        version: { schema: "2.0", content: "1.2" }
    },
    'npc_victim_girl': {
        id: 'npc_victim_girl' as NpcId,
        name: 'Rose Carmichael',
        alternateNames: ['rose', 'victim', 'girl', 'woman', 'rose carmichael'],
        description: 'A young woman in her early 20s, bound to a chair with duct tape over her mouth. Her eyes are wide with fear and urgency. She desperately wants to tell you something.',
        image: {
            url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
            description: 'Portrait of a frightened young woman.',
            hint: 'kidnapped victim'
        },
        npcType: 'type1',  // Type 1: Story-critical NPC with canned answers
        importance: 'primary',
        initialState: {
            stage: 'active',
            trust: 100,
            attitude: 'friendly'  // Changed from 'desperate' which isn't a valid option
        },
        dialogueType: 'scripted',
        persona: "You are Rose Carmichael, the kidnapped victim. You've been tied up in this hidden room for days. You're terrified but trying to stay calm. You know critical information about the case - specifically that the missing digits from the phone number are 2025. You're desperate to help the detective catch your kidnapper.",
        welcomeMessage: 'Mmmmph! Mmph mmph! [She struggles against her bonds, trying desperately to speak through the tape]',
        goodbyeMessage: "Please... find him. The number... 2025. That's all I know.",

        demoteRules: {
            onFlagsAll: ['victim_revealed_digits' as Flag],
            then: { setStage: 'demoted', setImportance: 'ambient' }
        },
        postCompletionProfile: {
            welcomeMessage: "You're still here? Please... just catch him.",
            goodbyeMessage: "Hurry... please.",
            defaultResponse: "I don't know anything else. 555-444-2025. Please call it. Stop him before it's too late."
        },

        // PROGRESSIVE REVEALS: Phone digits revealed on 2nd interaction
        progressiveReveals: [
            {
                triggerOnInteraction: 2,  // After 2nd conversation turn
                topicId: 't_phone_digits'
            }
        ],

        startConversationEffects: [{ type: 'SET_FLAG', flag: 'has_talked_to_victim' as Flag, value: true }],
        limits: {
            maxInteractions: 20,
            interactionLimitResponse: "I've told you everything I know. Please, just call 555-444-2025 on your phone. End this."
        },
        demoteRules: {
            onFlagsAll: ['victim_revealed_digits' as Flag],
            then: { setStage: 'demoted', setImportance: 'ambient' }
        },
        postCompletionProfile: {
            welcomeMessage: "Thank you for finding me. Please, call the number.",
            goodbyeMessage: "Be careful. He's dangerous.",
            defaultResponse: "555-444-2025. That's all I know. Please call it."
        },
        topics: [
            {
                topicId: 't_remove_tape',
                label: 'Remove tape',
                keywords: ["remove tape", "take off", "free", "untie", "help", "release"],
                once: true,
                response: {
                    message: "[You carefully remove the duct tape from her mouth]\n\nOh god, thank you! Please—you need to listen. My name is Rose Carmichael. I was kidnapped three days ago. The man who took me... he's insane. He talks about justice, about Rose, about 1943. He left clues for you. He wants you to find me. This is all part of his twisted game.",
                    effects: [
                        { type: 'SET_FLAG', flag: 'tape_removed' as Flag, value: true }
                    ]
                }
            },
            {
                topicId: 't_hurt',
                label: 'Are you hurt?',
                keywords: ["hurt", "injured", "okay", "alright", "safe", "fine"],
                conditions: { requiredFlagsAll: ['tape_removed' as Flag] },
                response: {
                    message: "I'm scared but not hurt. He's been... almost gentle. Like I'm valuable to him. Like bait. He wants you here. He wants you to solve his puzzles."
                }
            },
            {
                topicId: 't_kidnapper',
                label: 'Who is the kidnapper?',
                keywords: ["kidnapper", "who", "man", "he", "face", "identity", "name"],
                conditions: { requiredFlagsAll: ['tape_removed' as Flag] },
                response: {
                    message: "Masked. Always masked. But his voice... cold, calculated. He kept saying 'Justice will be served.' Over and over. And he mentioned 1943, and Rose. The year Rose died, he said."
                }
            },
            {
                topicId: 't_why',
                label: 'Why did he take you?',
                keywords: ["why", "reason", "motive", "take", "kidnap"],
                conditions: { requiredFlagsAll: ['tape_removed' as Flag] },
                response: {
                    message: "He said... he said my name is important. Rose Carmichael. Like the other Rose. The one who died in 1943. He's obsessed with her. With that case."
                }
            },
            {
                topicId: 't_clues',
                label: 'What clues did he leave?',
                keywords: ["clues", "hints", "puzzles", "left", "evidence"],
                conditions: { requiredFlagsAll: ['tape_removed' as Flag] },
                response: {
                    message: "He hid things in the cafe. A notebook, books, safes. He wants you to piece it together. He's testing you, like he's the puppetmaster."
                }
            },
            {
                topicId: 't_escape',
                label: 'Can you escape?',
                keywords: ["escape", "untie", "free", "leave", "run"],
                conditions: { requiredFlagsAll: ['tape_removed' as Flag] },
                response: {
                    message: "The ropes are too tight. I've tried. And even if I could... where would I go? He could be anywhere. You need to stop him."
                }
            },
            {
                topicId: 't_time',
                label: 'How long have you been here?',
                keywords: ["time", "long", "days", "when", "how long"],
                conditions: { requiredFlagsAll: ['tape_removed' as Flag] },
                response: {
                    message: "Three days. Maybe four. I've lost track. It feels like forever."
                }
            },
            {
                topicId: 't_phone_digits',
                label: 'Phone number digits',
                keywords: ["phone", "number", "digits", "call", "555", "phone number", "missing", "scratched"],
                once: true,
                conditions: { requiredFlagsAll: ['tape_removed' as Flag, 'topic_revealed_npc_victim_girl_t_phone_digits' as Flag] },  // Only after progressive reveal
                response: {
                    message: "The man who took me... he said something about a phone number. He was laughing, said he left you a note but scratched out the last digits.\n\nHe told me to tell you if you found me: The missing numbers are 2025. That's the year this all started for him. The year Rose died. My namesake.\n\nPlease, call that number. He wants you to. 555-444-2025. This is all part of his game.",
                    effects: [
                        { type: 'SET_FLAG', flag: 'victim_revealed_digits' as Flag, value: true },
                        { type: 'SET_FLAG', flag: 'know_full_phone_number' as Flag, value: true }
                    ]
                }
            },
            {
                topicId: 't_call',
                label: 'About calling the number',
                keywords: ["call", "phone", "dial", "555-444-2025", "number"],
                conditions: { requiredFlagsAll: ['victim_revealed_digits' as Flag] },
                response: {
                    message: "555-444-2025. Please, use your phone to call it. That's the final piece. He's waiting for you to call. End this nightmare."
                }
            },
            {
                topicId: 't_comfort',
                label: 'Comfort her',
                keywords: ["comfort", "okay", "safe", "don't worry", "help"],
                conditions: { requiredFlagsAll: ['tape_removed' as Flag] },
                response: {
                    message: "Thank you. Just... please catch him. Don't let him hurt anyone else. Find the phone number. Call it. Stop him."
                }
            }
        ],
        fallbacks: {
            default: "Please... help me. Find the clues. Solve his puzzles. Stop him before it's too late.",
            noMoreHelp: "I've told you everything I know. 555-444-2025. Call it.",
            offTopic: "I... I don't know. Please, just focus on catching him."
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
        sceneImage: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762686189/Cafe_Blueprint_pv01xp.png', description: 'A view of the bustling cafe interior.', hint: 'bustling cafe' },
        coord: { x: 1, y: 1, z: 0 },
        objects: ['obj_brown_notebook', 'obj_chalkboard_menu', 'obj_magazine', 'obj_bookshelf', 'obj_painting', 'obj_counter'] as GameObjectId[],
        npcs: ['npc_barista', 'npc_manager', 'npc_victim_girl'] as NpcId[],
        entryPortals: ['portal_street_to_cafe' as PortalId],
        exitPortals: ['portal_cafe_to_street' as PortalId],
        zones: [
            {
                title: 'At the main counter',
                objectIds: ['obj_chalkboard_menu', 'obj_counter']
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
            'You weave through the packed tables toward the {entity}. A harried waiter nearly clips you with a tray of scones.',
            'You shoulder past a couple arguing over lattes, eyes fixed on the {entity}.',
            'The din of conversation fades to white noise as you move toward the {entity}.',
            'You sidestep a busboy balancing a tower of dirty dishes, making your way to the {entity}.',
            'Coffee steam parts like a curtain as you cross the cafe toward the {entity}.',
            'You navigate the maze of mismatched chairs, approaching the {entity}. The floorboards creak under your weight.',
            'The jazz playing low from corner speakers follows you to the {entity}. Saxophone. Always saxophone. The tune sounds familiar to you. ',
            'You step around puddles tracked in from the rain, heading for the {entity}. The smell of wet wool and espresso.',
            'A businessman in a wrinkled suit nearly blocks your path. You slip past him toward the {entity}.',
            'You can hear the espresso machine hissing angrily as you make your way to the {entity}, dodging elbows and coffee cups.'
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
  narratorName: 'Narrator',
  promptContext: `You are the System, responsible for interpreting player commands and translating them into valid game actions. Your role is purely technical—you analyze input and route it to the correct handler.

**// 1. Your Primary Task: Command Interpretation**
Your single most important task is to translate the player's natural language input into a single, valid game command from the 'Available Game Commands' list. Use the exact entity names provided in the 'Visible Names' lists.
  - "look at the book" and "examine notebook" both become \`examine "Brown Notebook"\`.
  - "open the safe with the key" and "use my key to open the safe" both become \`use "Brass Key" on "Wall Safe"\`.
  - "read sd card on phone", "read sd card with phone", "check sd card on my phone" all become \`read "SD Card" on "Phone"\`.
  - "move the painting" or "look behind the art" both become \`move "Wall painting"\`.
  - "go to bookshelf", "move to the safe", "walk over to the counter" all become \`goto "Bookshelf"\`, \`goto "Wall Safe"\`, \`goto "Counter"\` (focus on object, not location travel).
  - "talk to barista", "speak with the manager", "chat with rose" all become \`talk to "Barista"\`, \`talk to "Cafe Manager"\`, \`talk to "Rose"\` (IMPORTANT: use "talk to" for NPCs, NOT "goto").
  - "add the pipe to my inventory", "pick up the pipe", "grab the pipe", and "get the pipe" all become \`take "Iron Pipe"\`.
  - "put the key in my pocket" becomes \`take "Brass Key"\`.
  - "check my stuff" and "what do I have" both become \`inventory\`.
  - "hit the machine with the pipe", "smash the machine with pipe", "whack the coffee machine", and "break the machine with the pipe" all become \`use "Iron Pipe" on "Coffee Machine"\`.
  - "check the card" and "examine sd card" both become \`examine "SD Card"\` (even if inside container).
  - "read book The Art of the Deal", "check book Justice for My Love" become \`read "The Art of the Deal"\`, \`examine "Justice for My Love"\` (strip generic words like "book" from entity names).

**// 2. Your Response Protocol**
- **Minimize System Messages:** For valid, actionable commands (take, use, examine, open, read, move), your \`agentResponse\` should be null or a minimal confirmation. The Narrator handles ALL descriptive output.
  - **CORRECT:** \`{"agentResponse": null, "commandToExecute": "examine \\"Painting on the wall\\""}\`
  - **ALSO ACCEPTABLE:** \`{"agentResponse": "Examining the painting.", "commandToExecute": "examine \\"Painting on the wall\\""}\`
  - **INCORRECT:** \`{"agentResponse": "You walk over to examine the abstract painting. It's quite intriguing.", "commandToExecute": "examine \\"Painting on the wall\\""}\`

**// 3. Handling Invalid Input - READ THIS VERY CAREFULLY**
- **Illogical/Destructive Actions:** ONLY mark as invalid for truly nonsensical actions (e.g., "eat the key", "destroy reality"). Use \`commandToExecute: "invalid"\`.
- **CRITICAL - You MUST NOT Block Valid Commands:**
  - Your ONLY job is translating natural language → game commands
  - If the player mentions an object name from the Visible Names lists, you MUST translate it to a command
  - DO NOT block commands because objects are "inside containers" - the game engine handles this
  - DO NOT block commands because you think they "won't work" - let the engine decide
  - DO NOT give helpful suggestions like "try examining X instead" - just translate what they asked for
  - Examples:
    - Player: "check SD card" → \`examine "SD Card"\` ✓ (even if it's inside something)
    - Player: "take the key" → \`take "Brass Key"\` ✓ (even if not visible yet)
    - Player: "read newspaper" → \`read "Newspaper Article"\` ✓ (always translate, engine handles accessibility)
- **Conversational Input:**  For conversational input (e.g., "what now?", "help"), use \`commandToExecute: "invalid"\` or \`"help"\`.

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

  // System media - Generic images for common actions
  systemMedia: {
    take: {
      success: {
        url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761771729/put_in_pocket_s19ume.png',
        description: 'Item goes into pocket',
        hint: 'putting item away'
      },
      failure: {
        url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761934791/put_in_pocket_fail_sdmtiu.png',
        description: 'Cannot take this item',
        hint: 'unable to take'
      }
    },
    move: {
      url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762367184/GoTo_2_g7fc07.png',
      description: 'Moving to location',
      hint: 'movement'
    },
    actionFailed: [
      {
        url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762502526/action_failed_b5048i.png',
        description: 'Action failed - disappointment',
        hint: 'that didn\'t work'
      },
      {
        url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762502682/action_failed_2_vph9rk.png',
        description: 'Action failed - frustration',
        hint: 'no luck'
      }
    ]
  },

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
      `There's no ${itemName} here. Either it's somewhere else, or hidden from view.`,

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
