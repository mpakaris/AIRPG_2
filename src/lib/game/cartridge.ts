
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
        inventory: { items: ['item_newspaper_article'] as ItemId[], capacity: 2, allowTags: [], denyTags: [] },
        children: {
            items: ['item_newspaper_article'] as ItemId[],
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
            onExamine: {
                conditions: [{ type: 'STATE', entityId: 'obj_brown_notebook', key: 'isLocked', equals: true }],
                success: {
                    message: "The leather is worn soft under your fingers, decades pressed into its surface. It smells of old paper, dust, and something darker—leather tanned with secrets. The brass clasp gleams cold, locked tight, guarding what’s inside.\n\nYour fingers trace it, metal biting faintly. No keyhole, no obvious way in—just a mechanism waiting for something it has been expecting. A thrill runs through you. You don’t know what’s inside, and yet its weight presses against your chest, heavy with possibility.\n\nUsually, you feel like the chess player, setting the moves. Now, strangely, you feel like the pawn in someone else’s game—small, exposed, uneasy, and yet drawn irresistibly.\n\nThe notebook radiates threat, subtle and insistent. Every crease and dent seems deliberate, alive with intentions. A flicker of fear curls with excitement, making every nerve tingle.\n\nHolding it, you feel the pulse of history brushing against your own, the quiet danger of secrets someone spent decades guarding. Alone, trembling slightly, you realize this moment—this touch, this weight—is a turning point. You don’t know what’s inside, and that is precisely what makes it irresistible.",
                    media: {
                        url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759242347/Notebook_locked_ngfes0.png',
                        description: 'Locked leather notebook with brass clasp',
                        hint: 'Needs a password phrase...'
                    }
                },
                fail: {
                    message: "Notebook's open. Brass clasp released. Inside: black SD card—modern, out of place against yellowed pages. Next to it, folded newspaper clipping, brown with age. Hidden deliberately.",
                    media: {
                        url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759242346/Notebook_unlocked_fpxqgl.jpg',
                        description: 'Unlocked notebook revealing hidden contents',
                        hint: 'SD card and newspaper clipping'
                    }
                }
            },

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
            onOpen: {
                conditions: [{ type: 'STATE', entityId: 'obj_brown_notebook', key: 'isLocked', equals: false }],
                success: {
                    message: "Notebook's open. Brass clasp unfastened. In the crease: black SD card—modern, cold, out of place. Next to it: newspaper clipping, brown with age. Different eras. Hidden together. Someone archived the past on modern media.",
                    media: {
                        url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759242346/Notebook_unlocked_fpxqgl.jpg',
                        description: 'Open notebook with SD card and clipping',
                        hint: 'Take the contents'
                    },
                    effects: [
                        { type: 'SET_ENTITY_STATE', entityId: 'obj_brown_notebook', patch: { isOpen: true, currentStateId: 'unlocked' } }
                    ]
                },
                fail: {
                    message: "Brass clasp won't budge. Needs a PASSWORD—phrase, not key. Someone made sure this stayed hidden.\n\nUse: /password <your guess>\n\nStuck? https://airpg-minigames.vercel.app/games/the-notebook"
                }
            },

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
            onRead: {
                conditions: [
                    { type: 'STATE', entityId: 'obj_brown_notebook', key: 'isLocked', equals: false },
                    { type: 'STATE', entityId: 'obj_brown_notebook', key: 'isOpen', equals: true }
                ],
                success: {
                    message: "Pages yellowed, ink faded. Most entries illegible. But the hidden items—SD card, newspaper clipping—those are what matter. TAKE them.",
                    effects: []
                },
                fail: {
                    message: "Locked. Can't read it. Needs PASSWORD. Stuck? https://airpg-minigames.vercel.app/games/the-notebook"
                }
            },

            // 11. SEARCH - Search contents
            onSearch: {
                conditions: [{ type: 'STATE', entityId: 'obj_brown_notebook', key: 'isLocked', equals: false }],
                success: {
                    message: "You search the pages. SD card, newspaper clipping—hidden in the center spread. TAKE them."
                },
                fail: {
                    message: "Locked. Can't search. Need the PASSWORD."
                }
            },

            // 12. TALK - Can't talk to notebook
            onTalk: {
                fail: {
                    message: "Notebooks don't talk. Try OPENING it or the PASSWORD."
                }
            },

            // SPECIAL: Password unlock handler
            onUnlock: {
                success: {
                    message: "Brass clasp clicks. Cover swings open, leather creaks. Inside: black SD card—modern, digital, anachronistic. Next to it: newspaper clipping, brown with decades. Past preserved twice. Paper survived seventy years. Data survives longer. Both waiting.",
                    media: {
                        url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759242346/Notebook_unlocked_fpxqgl.jpg',
                        description: 'Unlocked notebook revealing secrets',
                        hint: 'The password worked'
                    },
                    effects: [
                        { type: 'SET_FLAG', flag: 'has_unlocked_notebook' as Flag },
                        { type: 'SET_ENTITY_STATE', entityId: 'obj_brown_notebook', patch: { isLocked: false, isOpen: true, currentStateId: 'unlocked' } },
                        { type: 'REVEAL_ENTITY', entityId: 'obj_sd_card' },
                        { type: 'REVEAL_ENTITY', entityId: 'item_newspaper_article' }
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
            onExamine: {
                success: {
                    message: "The wooden frame leaned crooked, chalk dust clinging to its corners. Brick peered through behind it, cold and stubborn.\n\nToday's special read: 'Three scones for the price of two.'\n\nA deal as sweet as justice.\n\nThat word—justice—hung heavy, deliberate. Someone had been here, leaving breadcrumbs.\n\nThe board didn't sit flush with the wall; a shadow slipped behind it, hiding something patient, waiting. The smell of bread and dust mixed, comforting and uneasy. \n\nIt wasn’t just a menu. It was a message, a lure, a warning -  or was it not?",
                    media: {
                        url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759603706/Chalkboard_h61haz.png',
                        description: 'Chalkboard menu with handwritten specials',
                        hint: 'Not flush with the wall...'
                    }
                }
            },

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
                        { type: 'REVEAL_ENTITY', entityId: 'item_iron_pipe' }
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
        capabilities: { openable: false, lockable: false, breakable: false, movable: false, powerable: false, container: true, readable: false, inputtable: false },
        state: { isOpen: true, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        inventory: { items: [], capacity: null },
        children: { items: ['item_book_deal', 'item_book_time', 'item_book_justice'] as ItemId[] },
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
                        { type: 'REVEAL_ENTITY', entityId: 'item_book_deal' },
                        { type: 'REVEAL_ENTITY', entityId: 'item_book_time' },
                        { type: 'REVEAL_ENTITY', entityId: 'item_book_justice' }
                    ]
                }
            },

            // 2. TAKE - Can't take furniture
            onTake: {
                fail: {
                    message: "It's furniture, not evidence. Try EXAMINING the books or SEARCHING the shelf."
                }
            },

            // 4. USE - No item usage
            onUse: {
                fail: {
                    message: "It's a shelf for books. Try EXAMINING, READING, or SEARCHING it."
                }
            },

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

            // 8. MOVE - Too heavy
            onMove: {
                fail: {
                    message: "Solid oak, heavy. Not moving this alone. Try EXAMINING or READING the books."
                }
            },

            // 9. BREAK - Solid furniture
            onBreak: {
                fail: {
                    message: "Solid oak. You're not smashing this with bare hands. Besides, try EXAMINING the books first."
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
                        { type: 'REVEAL_ENTITY', entityId: 'obj_wall_safe' }
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
            // 1. EXAMINE - Visual inspection
            onExamine: {
                conditions: [{ type: 'NO_FLAG', flag: 'safe_is_unlocked' }],
                success: {
                    message: "Small. Serious. Steel, flush mount, pro install. Cold. Brass keyhole under the handle. Not residential. Someone needed secure storage, hidden behind art. Lock's pristine.",
                    media: {
                        url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761263220/safe_behind_Painting_dbo6qc.png',
                        description: 'Locked wall safe with keyhole',
                        hint: 'Need the key...'
                    }
                },
                fail: {
                    message: "Safe's open. Inside: manila folder. A secret document - There it is again, this spark in your eyes when you discover secret information. What someone hid.",
                    media: {
                        url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761263220/safe_behind_painting_open_tpmf0m.png',
                        description: 'Open safe with secret document',
                        hint: 'A secret file'
                    }
                }
            },

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
                        message: "Key slides in—perfect fit. One turn. Heavy clunk. Door swings. Inside: manila folder in sleeve. CONFIDENTIAL stamped in red. This is what they hid.",
                        media: {
                            url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761263220/safe_behind_painting_open_tpmf0m.png',
                            description: 'Safe unlocked revealing secret document',
                            hint: 'Someone hid this for a reason'
                        },
                        effects: [
                            { type: 'SET_FLAG', flag: 'safe_is_unlocked', value: true },
                            { type: 'SET_ENTITY_STATE', entityId: 'obj_wall_safe', patch: { isLocked: false, isOpen: true, currentStateId: 'unlocked' } },
                            { type: 'REVEAL_ENTITY', entityId: 'item_secret_document' },
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
                    message: "You peer inside. Manila folder in document sleeve. CONFIDENTIAL. TAKE it."
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
                broken: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761211151/coffee_machine_detail_broken_slkpfd.png', description: 'The shattered remains of the coffee machine\'s side panel.', hint: 'broken machine' }
            }
        },
        handlers: {
            // 1. EXAMINE - Visual inspection
            onExamine: {
                conditions: [{ type: 'NO_FLAG', flag: 'machine_is_broken' }],
                success: {
                    message: "Chrome and steel, Italian pride. But wrong—a service panel on the right side, warped. Screws stripped. Someone forced it shut fast. The panel rattles. Wouldn't take much to BREAK it open.",
                    media: {
                        url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761211151/coffee_machine_detail_frexuu.png',
                        description: 'Coffee machine with suspicious service panel',
                        hint: 'That panel looks forced shut...'
                    }
                },
                fail: {
                    message: "Shattered panel, broken plastic. The key's gone. Someone hid it here, didn't want it found easy.",
                    media: {
                        url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761211151/coffee_machine_detail_broken_slkpfd.png',
                        description: 'Broken coffee machine with revealed cavity',
                        hint: 'The hiding spot is exposed'
                    }
                }
            },

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
                            { type: 'SET_FLAG', flag: 'machine_is_broken' as Flag },
                            { type: 'SET_ENTITY_STATE', entityId: 'obj_coffee_machine', patch: { isBroken: true, isOpen: true, currentStateId: 'broken' } },
                            { type: 'REVEAL_ENTITY', entityId: 'item_safe_key' }
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
                            { type: 'SET_FLAG', flag: 'notebook_video_watched' as Flag }
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
                            { type: 'SET_FLAG', flag: 'notebook_video_watched' as Flag }
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
                default: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759604596/FBI_phone_placeholder.png', description: 'FBI-issue smartphone', hint: 'fbi phone' }
            }
        },
        handlers: {
            // EXAMINE - Visual inspection
            onExamine: {
                success: {
                    message: "FBI-issue smartphone. Camera, secure messaging, media slot. Standard kit. Always in your pocket."
                }
            },

            // Fallback
            defaultFailMessage: "The phone's a tool. Try USING it ON something that needs it."
        },
        design: {
            authorNotes: "Universal tool/key for media devices and locked objects throughout the game.",
            tags: ['phone', 'device', 'tool', 'key']
        },
        version: { schema: "1.0", content: "3.0" }
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
                        { type: 'SET_ENTITY_STATE', entityId: 'item_safe_key', patch: { taken: true } }
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
        handlers: {
            // 1. EXAMINE - Visual inspection
            onExamine: {
                success: {
                    message: "Folded newspaper clipping. 1940s. Brittle, yellowed. Headline about Silas Bloom, local musician.",
                    media: {
                        url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759241463/Screenshot_2025-09-30_at_15.51.35_gyj3d5.png',
                        description: 'Folded newspaper article from the 1940s',
                        hint: 'Read it to learn more'
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
                        { type: 'SET_FLAG', flag: 'notebook_article_read' as Flag },
                        { type: 'SET_FLAG', flag: 'notebook_interaction_complete' as Flag }
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
            // 1. EXAMINE
            onExamine: { success: { message: 'Physics book. Famous scientist. Not relevant.' } },
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
            // 10. READ - Uses stateMap for progressive content
            // 11. SEARCH
            onSearch: { fail: { message: "It's a book. Try READING it." } },
            // 12. TALK
            onTalk: { fail: { message: "Books don't talk. Try READING it." } },
            defaultFailMessage: "Romance novel. 'Justice' in the title. Try: EXAMINE or READ it."
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
            // 1. EXAMINE - Visual inspection
            onExamine: {
                success: {
                    message: "Manila folder, thick. CONFIDENTIAL stamped in red. Heavy. Feels like secrets.",
                    media: {
                        url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761263220/Confidential_File_qegnr4.png',
                        description: 'Confidential document folder',
                        hint: 'Read it to uncover secrets'
                    }
                }
            },

            // 2. TAKE - Pick it up
            onTake: {
                success: {
                    message: "File goes in your hands. Heavy. CONFIDENTIAL. This is what they hid.",
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
                    message: "File drops. Confidential pages scatter. Can pick it up later."
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
                    message: "You open it. Dense. Financial reports, shell corporations, offshore accounts. All linked to one holding company. Hours to untangle this web. But one name repeats: Veridian Dynamics. This is big. Bigger than murder.",
                    media: {
                        url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761773132/Screenshot_2025-10-29_at_22.24.23_w9e7vd.png',
                        description: 'Open confidential document revealing financial conspiracy',
                        hint: 'Veridian Dynamics appears repeatedly'
                    },
                    effects: [
                        { type: 'SET_FLAG', flag: 'has_read_secret_document' as Flag }
                    ]
                },
                fail: {
                    message: "Can't read it now."
                }
            },

            // 11. SEARCH - Search through pages
            onSearch: {
                success: {
                    message: "You flip through pages. Financial jargon, legal terms. Veridian Dynamics everywhere. Need time to fully analyze this."
                }
            },

            // 12. TALK - Can't talk to document
            onTalk: {
                fail: {
                    message: "Documents don't talk. Try READING it."
                }
            },

            // Fallback
            defaultFailMessage: "The file's marked CONFIDENTIAL. Try: EXAMINE it, READ it, or SEARCH through it."
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
  - "open the safe with the key" and "use my key to open the safe" both become \`use "Brass Key" on "Wall Safe"\`.
  - "read sd card on phone", "read sd card with phone", "check sd card on my phone" all become \`read "SD Card" on "Phone"\`.
  - "move the painting" or "look behind the art" both become \`move "Wall painting"\`.
  - "go to bookshelf", "move to the safe", "walk over to the barista" all become \`goto "Bookshelf"\`, \`goto "Wall Safe"\`, \`goto "Barista"\` (focus on object/NPC, not location travel).
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
    }
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
