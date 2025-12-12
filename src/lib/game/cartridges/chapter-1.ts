import type { Chapter, ChapterId, Flag, Game, GameId, GameObject, GameObjectId, Item, ItemId, Location, LocationId, NPC, NpcId, Portal, PortalId, Structure, StructureId, WorldId } from './types';

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
        capabilities: { takable: false, consumable: false, readable: false, inputtable: false },
        startingLocation: 'player',
        media: {
            audio: {
                url: '',
                description: 'Colleague briefing about Lili case'
            }
        },
        handlers: {
            onExamine: {
                message: 'An audio message from your colleague. Listen to it to hear the briefing about Lili\'s abduction.',
                media: {
                    url: '',
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
        capabilities: { takable: false, consumable: false, readable: true, inputtable: false },
        startingLocation: 'player',
        media: {
            document: {
                url: '',
                description: 'Official police report on Lili abduction case'
            }
        },
        handlers: {
            onRead: {
                message: 'POLICE REPORT - CASE #2025-0347\n\nVICTIM: Lili Chen, Age 8\nLAST SEEN: Corner of Elm Street and 5th Avenue, 3:45 PM\nWITNESSES: Bus driver reported seeing a gray van nearby\nVEHICLE DESCRIPTION: Gray panel van, no plates visible\nTIRE ANALYSIS: Forensics identified tire tread pattern\n  - Type: P225/60R16 (commercial grade)\n  - Tread depth: 8/32" (relatively new)\n  - Pattern: Diagonal crosshatch\nSTATUS: Active investigation, Amber Alert issued\n\nThe report contains witness statements and a timeline of events.\n\nNote: The tire type P225/60R16 suggests a mid-size commercial vehicle. The specific tread pattern indicates recent purchase.',
                media: {
                    url: '',
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
        capabilities: { takable: true, consumable: false, readable: true, inputtable: false },
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
    },

    'item_crowbar': {
        id: 'item_crowbar' as ItemId,
        name: 'Crowbar',
        description: 'A heavy steel crowbar. Rust-spotted but still solid. Good for prying things open.',
        capabilities: { takable: true, consumable: false, readable: false, inputtable: false },
        startingLocation: 'loc_street' as LocationId,
        parentId: 'obj_tire_stack' as GameObjectId,
        revealMethod: 'REVEAL_FROM_PARENT',
        handlers: {
            onExamine: {
                success: {
                    message: 'Two feet of solid steel. A crowbar—the kind you find in toolboxes, garages, construction sites. One end curves into a claw for pulling nails. The other tapers to a flat wedge for prying.\n\nThe steel is rust-spotted, oxidation blooming in orange patches where the protective coating wore away. But underneath, it\'s still sound. Solid. You test it with your hand—no give, no flex. This thing could pry open a car door, lever up floorboards, shift heavy objects.\n\nIt\'s heavy. Maybe three, four pounds. You feel the weight in your hand, the cold metal warming slowly against your palm.\n\nSomeone hid this in the tire stack. Deliberately wedged it inside where it wouldn\'t be found unless you were looking.\n\nWhy hide a crowbar? What did they need it for?\n\nOr maybe the better question: what do you need it for?',
                    media: undefined
                }
            },
            onUse: {
                fail: {
                    message: 'The crowbar is a tool for leverage—prying, lifting, shifting heavy objects. You need a TARGET to use it on. Try: USE CROWBAR ON [object name].',
                    media: undefined
                }
            },
            onRead: {
                fail: {
                    message: 'It\'s a crowbar. Steel. No text. No markings. Just a tool. If you want to know more about it, try EXAMINING it.',
                    media: undefined
                }
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'item_crumpled_note': {
        id: 'item_crumpled_note' as ItemId,
        name: 'Crumpled Note',
        description: 'A handwritten note, crumpled and stained. Found in the dumpster.',
        capabilities: { takable: true, consumable: false, readable: true, inputtable: false },
        startingLocation: 'loc_street' as LocationId,
        parentId: 'obj_dumpster' as GameObjectId,
        revealMethod: 'REVEAL_FROM_PARENT',
        handlers: {
            onRead: {
                success: {
                    message: 'You smooth out the crumpled paper and read the handwriting. Blue ink, hurried strokes. Someone wrote this fast, under pressure maybe.\n\n"Check where the van was parked. The answer\'s in the tracks."\n\nThat\'s it. Just one sentence. Direct. Specific.\n\nBut below the text, someone scratched out a number. Heavy pen strokes, back and forth, obliterating whatever was written there. You can barely make it out through the scribbles:\n\n~~1940~~\n\nSomeone didn\'t want that number readable. Deliberately obscured it. But why write it down in the first place if you\'re just going to cross it out?\n\nThe message about the van tracks is clear though. Whoever wrote this note knew something. Knew the van left evidence. Knew where to look.\n\nAnd now you know too.',
                    media: undefined
                }
            },
            onExamine: {
                success: {
                    message: 'A piece of lined notebook paper, the kind you buy in cheap spiral notebooks at convenience stores. The edges are torn—ripped out hastily, not carefully removed along the perforations.\n\nIt\'s crumpled. Someone balled it up and threw it away. The creases are sharp, permanent. When you try to flatten it, it springs back into wrinkles.\n\nDirt stains the surface—coffee maybe, or just grime from being in the dumpster. The paper feels slightly damp, like it\'s been exposed to moisture.\n\nThere\'s handwriting on it. Blue ballpoint pen, the cheap kind. The writing is hurried, slanted, pressing hard into the paper. You can feel the indentations on the back where the pen dug in.\n\nWhoever wrote this was in a hurry. Or stressed. Or both.',
                    media: undefined
                }
            },
            onUse: {
                fail: {
                    message: 'It\'s a note. Information. Not a tool. If you want to know what it says, try READING it.',
                    media: undefined
                }
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'item_photo_tire_marks': {
        id: 'item_photo_tire_marks' as ItemId,
        name: 'Photo of Tire Marks',
        description: 'A photograph of tire marks left in the alley. Clear tread pattern visible.',
        capabilities: { takable: false, consumable: false, readable: false, inputtable: false },
        startingLocation: 'player',
        handlers: {
            onExamine: {
                success: {
                    message: 'You pull up the photo on your phone, zooming in to examine the details.\n\nThe tire marks are captured clearly. Two parallel tracks, tread pattern visible in sharp relief against the dirt. The diagonal crosshatch design stands out—commercial-grade tires, heavy-duty.\n\nYou zoom in further. The grooves are deep—you can see the depth even in the photo, shadows cast by the ridges. New rubber. Barely worn.\n\nThis is forensic-quality documentation. Clear enough to match against manufacturer specifications. Clear enough to identify the tire model.\n\nThe police report mentioned tire analysis. They cataloged the van\'s tire type—P225/60R16, forensics identified the tread pattern.\n\nYou should compare this photo to that specification. Match the pattern. Extract the numbers.\n\nThe code is in the tires. You just need to see it.',
                    media: undefined
                }
            },
            onRead: {
                fail: {
                    message: 'It\'s a photograph, not text. There\'s nothing to READ. Try EXAMINING it to analyze the tire tread pattern.',
                    media: undefined
                }
            },
            onUse: {
                fail: {
                    message: 'A photograph is evidence, not a tool. You can\'t USE it. You can EXAMINE it to analyze the details, or compare it to the police report\'s tire specifications.',
                    media: undefined
                }
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    }
};

// =====================================
// GAME OBJECTS
// =====================================

const gameObjects: Record<GameObjectId, GameObject> = {
    // ZONE 1: Bus Station - Main Structure
    'obj_bus_stop': {
        id: 'obj_bus_stop' as GameObjectId,
        name: 'Bus Stop',
        alternateNames: ['bus stop', 'bus station', 'stop', 'shelter', 'bus shelter'],
        archetype: 'Structure',
        description: 'The bus stop where Lili Chen was last seen. A weathered shelter with an old bench, a trash bin, and a timetable board.',
        transitionNarration: 'You approach the bus stop. The rusted shelter looms ahead—the last place Lili Chen was seen before she vanished.',
        capabilities: { openable: false, lockable: false, breakable: false, movable: false, powerable: false, container: true, readable: false, inputtable: false },
        state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        children: {
            items: [],
            objects: ['obj_bench' as GameObjectId, 'obj_info_board' as GameObjectId, 'obj_bus_sign' as GameObjectId]
        },
        handlers: {
            onExamine: {
                message: 'The bus stop stands under a rusted metal shelter. Paint peels from the frame in long, pale strips. An old wooden bench occupies most of the space, its surface stained dark from decades of use. A trash bin leans against one support beam, overflowing with discarded wrappers and newspapers. The information board—scratched plexiglass over faded paper—displays bus routes and a missing person poster.\n\nThis is where it happened. Where an eight-year-old girl vanished in broad daylight. The ordinary becomes sinister when you know what occurred here. Every detail—bench, bin, timetable—takes on weight, significance. One of these elements holds a clue. You just have to find it.',
                media: {
                    url: '',
                    description: 'Bus stop with bench, bin, and information board',
                    hint: 'crime scene location'
                },
                effects: [
                    { type: 'REVEAL_FROM_PARENT', entityId: 'obj_bench', parentId: 'obj_bus_stop' },
                    { type: 'REVEAL_FROM_PARENT', entityId: 'obj_info_board', parentId: 'obj_bus_stop' },
                    { type: 'REVEAL_FROM_PARENT', entityId: 'obj_bus_sign', parentId: 'obj_bus_stop' }
                ]
            },
            onSearch: {
                message: 'You methodically scan the bus stop, detective instincts sharp. The trash bin—nothing unusual, just refuse. The shelter frame—weathered but unremarkable. The information board catches your eye briefly, but it\'s the bench that draws your attention.\n\nAccording to the police report, witnesses mentioned seeing Lili sitting on the bench moments before she disappeared. The florist\'s delivery was at 3:30 PM—the same time as the abduction. Something about that timing feels deliberate. Too precise to be coincidence.\n\nThe bench. Check the bench closer.',
                media: undefined
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_bench': {
        id: 'obj_bench' as GameObjectId,
        name: 'Bench',
        alternateNames: ['bench', 'wooden bench', 'weathered bench', 'seat', 'bus bench'],
        archetype: 'Furniture',
        description: 'A weathered wooden bench at the bus station, its surface darkened by years of use and weather.',
        transitionNarration: 'You move closer to the bench. This is where Lili sat moments before she disappeared.',
        capabilities: { openable: false, lockable: false, breakable: false, movable: true, powerable: false, container: false, readable: false, inputtable: false },
        state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        children: {
            items: ['item_invoice' as ItemId],
            objects: []
        },
        handlers: {
            onExamine: [
                {
                    // Before moving bench - invoice still hidden
                    conditions: [
                        { type: 'NOT_HAS_ITEM', itemId: 'item_invoice' },
                        { type: 'ITEM_IN_WORLD', itemId: 'item_invoice', inWorld: false }
                    ],
                    success: {
                        message: 'The bench is simple—weathered wood bolted to a metal frame. Decades of rain and sun have turned the planks gray-brown, the grain raised like old scars. Names and initials carved into the surface speak of bored teenagers and restless waits.\n\nYou crouch down, examining the legs. One of them—the front-right—has something caught beneath it. A corner of paper, wedged between wood and concrete. The wind must have pushed it there, or maybe someone kicked it aside without noticing.\n\nIt looks like a receipt or invoice. Partially hidden, easy to miss unless you were looking for it.',
                        media: {
                            url: '',
                            description: 'Wooden bench with paper visible under leg',
                            hint: 'receipt partially hidden under bench leg'
                        }
                    }
                },
                {
                    // After moving bench - invoice revealed but not taken
                    conditions: [
                        { type: 'NOT_HAS_ITEM', itemId: 'item_invoice' },
                        { type: 'ITEM_IN_WORLD', itemId: 'item_invoice', inWorld: true }
                    ],
                    success: {
                        message: 'The bench sits slightly askew from where you moved it. The invoice lies on the ground next to the bench leg, fully visible now—wrinkled and dirt-smudged but readable.',
                        media: {
                            url: '',
                            description: 'Bench with invoice lying on ground',
                            hint: 'receipt on ground next to bench'
                        }
                    }
                },
                {
                    // After taking invoice
                    conditions: [
                        { type: 'HAS_ITEM', itemId: 'item_invoice' }
                    ],
                    success: {
                        message: 'The bench sits where you moved it, slightly off-center. The spot where the invoice was is now just bare concrete, a faint dust outline marking where it lay.',
                        media: {
                            url: '',
                            description: 'Bench with empty ground beneath',
                            hint: 'invoice taken, nothing underneath'
                        }
                    }
                },
                {
                    // Default fallback
                    conditions: [],
                    success: {
                        message: 'The bench is worn and weathered, its wood darkened by years of exposure.',
                        media: undefined
                    }
                }
            ],
            onMove: {
                message: 'You grip the bench and shift it to the side. The metal legs scrape against concrete with a harsh sound. The invoice slides free, now fully visible on the ground—crumpled, dirt-stained, but readable.\n\nFlorist Express. Delivery timestamp: 3:30 PM. The same time Lili vanished.',
                media: {
                    url: '',
                    description: 'Bench moved, invoice on ground',
                    hint: 'receipt revealed'
                }
            },
            onSearch: {
                message: 'You run your hands along the bench slats, checking for anything hidden or carved beneath the surface. Nothing. Just smooth wood, worn soft by countless hands. But when you check underneath, you spot it—that corner of paper wedged beneath the front-right leg.',
                media: undefined
            },
            onUse: {
                message: 'You sit down on the bench, the wood hard and slightly uneven beneath you. Not comfortable, but not unbearable either. How many people have sat here? Thousands, probably. Tens of thousands over the decades.\n\nOrdinary people waiting for ordinary buses. Families. Workers. Students. But also—statistically speaking—criminals. Thieves. Maybe even murderers. This bench has held them all, made no distinction. Wood doesn\'t judge.\n\nYou imagine Lili sitting here, eight years old, backpack on her lap. Waiting. Trusting. And then—what? Someone approached. Said something. Offered something. And she went with them. Just like that.\n\nThe ordinariness of it haunts you. Evil doesn\'t announce itself. It wears a familiar face, speaks in calm tones, moves through the world undetected. Until it\'s too late.',
                media: undefined
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_info_board': {
        id: 'obj_info_board' as GameObjectId,
        name: 'Info Board',
        alternateNames: ['info board', 'information board', 'board', 'schedule board', 'bus schedule'],
        archetype: 'Readable',
        description: 'A plastic-covered information board displaying bus schedules and a missing person poster.',
        transitionNarration: 'You step up to the information board. Bus schedules and a missing person poster stare back at you through scratched plexiglass.',
        capabilities: { openable: false, lockable: false, breakable: false, movable: false, powerable: false, container: true, readable: true, inputtable: false },
        state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        children: {
            items: [],
            objects: ['obj_missing_poster' as GameObjectId]
        },
        handlers: {
            onExamine: {
                message: 'The information board is scratched and yellowed, protected by a sheet of cloudy plexiglass. Behind the plastic: bus route maps, timetables, and—prominently displayed—a missing person poster. Lili Chen\'s face stares out from the poster, her school photo recent enough that the resemblance is sharp.',
                media: {
                    url: '',
                    description: 'Bus stop information board with schedules and missing poster',
                    hint: 'information board with timetables'
                }
            },
            onRead: {
                message: 'BUS SCHEDULE - ROUTE 42\nMonday - Friday: Every 30 minutes\n3:00 PM - Elm & 5th (This Stop)\n3:30 PM - Oak & 3rd\n4:00 PM - Maple & 7th\n\nWeekends: Every 45 minutes\n\nThe 3:30 PM bus would have arrived here right around the time Lili disappeared. Did the abductor time it deliberately? Use the crowd, the movement, the distraction of people boarding and departing?',
                media: undefined
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_missing_poster': {
        id: 'obj_missing_poster' as GameObjectId,
        name: 'Missing Poster',
        archetype: 'Readable',
        description: 'A freshly printed missing person poster for Lili Chen.',
        capabilities: { openable: false, lockable: false, breakable: false, movable: false, powerable: false, container: false, readable: true, inputtable: false },
        state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        parentId: 'obj_info_board' as GameObjectId,
        revealMethod: 'REVEAL_FROM_PARENT',
        handlers: {
            onExamine: {
                message: 'MISSING: LILI CHEN, Age 8\n\nThe poster is crisp, recently printed. Lili\'s school photo shows a young girl with dark hair pulled into pigtails, a cautious smile. The text below lists her height, weight, last known clothing. A phone number for tips.\n\n"Last seen: Elm Street & 5th Avenue, 3:45 PM"\n\nBut something about the poster feels... off. The photo is slightly overexposed, washed out. The family\'s plea—"Please help us find our daughter"—reads flat, mechanical. Like it was written by someone going through motions rather than feeling desperation.\n\nWeird. You\'ve seen hundreds of these posters. This one looks cold. Professional, but cold.',
                media: {
                    url: '',
                    description: 'Missing person poster for Lili Chen',
                    hint: 'missing child poster'
                }
            },
            onRead: {
                message: 'You read the details carefully:\n\nMISSING CHILD\nName: Lili Chen\nAge: 8 years old\nHeight: 4\'2"\nLast Seen: 3:45 PM, corner of Elm & 5th\nClothing: Blue backpack, pink jacket, jeans\n\nContact: (555) 0147\n\nThe timestamp bothers you. 3:45 PM. The florist delivery was at 3:30 PM. Fifteen minutes. A narrow window. Everything about this abduction feels choreographed.',
                media: undefined
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_bus_sign': {
        id: 'obj_bus_sign' as GameObjectId,
        name: 'Bus Sign',
        archetype: 'Decoration',
        description: 'A simple metal sign marking the bus stop.',
        transitionNarration: 'You approach the bus sign. Simple, direct—BUS. Nothing more.',
        capabilities: { openable: false, lockable: false, breakable: false, movable: false, powerable: false, container: false, readable: false, inputtable: false },
        state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        handlers: {
            onExamine: {
                message: 'A simple metal sign bolted to the shelter post. White letters on blue background: BUS.\n\nThat\'s it. No route numbers, no additional information. Just BUS.\n\nSomehow, the blunt simplicity of it feels appropriate. This is a bus stop. People wait here. Sometimes they never arrive at their destinations.',
                media: {
                    url: '',
                    description: 'Blue metal sign reading BUS',
                    hint: 'simple bus stop sign'
                }
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    // ZONE 3: Gray Building
    'obj_gray_building_door': {
        id: 'obj_gray_building_door' as GameObjectId,
        name: 'Locked Door',
        alternateNames: ['locked door', 'door', 'gray building', 'gray building door', 'grey building', 'steel door', 'metal door'],
        archetype: 'Door',
        description: 'A heavy metal door on the gray building. It\'s locked tight.',
        transitionNarration: 'You walk over to the gray building. The steel door stands imposing, locked tight. No nameplate, no signage.',
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
        alternateNames: ['florist shop', 'florist', 'flower shop', 'shop', 'flower store', 'florist store'],
        archetype: 'Structure',
        description: 'A small flower shop with a colorful awning. Fresh bouquets line the windows.',
        transitionNarration: 'You move toward the florist shop. The bright colors and fresh flowers contrast sharply with the grim nature of your investigation.',
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

    // ZONE 5: Kiosk - Parent Container
    'obj_kiosk_counter': {
        id: 'obj_kiosk_counter' as GameObjectId,
        name: 'Kiosk',
        alternateNames: ['kiosk', 'counter', 'kiosk counter', 'news stand', 'newsstand', 'vendor stand', 'vendor'],
        archetype: 'Furniture',
        description: 'A small street kiosk with a cluttered counter. The elderly vendor watches you from behind the counter.',
        transitionNarration: 'You approach the kiosk. The elderly vendor looks up from behind his counter cluttered with newspapers and snacks.',
        capabilities: { openable: false, lockable: false, breakable: false, movable: false, powerable: false, container: true, readable: false, inputtable: false },
        state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        children: {
            items: [],
            objects: ['obj_kiosk_drawer' as GameObjectId]
        },
        handlers: {
            onExamine: {
                message: 'The kiosk counter is cluttered with candy bars, lottery tickets, and today\'s newspapers. A cash register sits at one end. Behind the counter, you notice a small wooden drawer—the kind vendors use for receipts and small items.',
                media: {
                    url: '',
                    description: 'Street kiosk with cluttered counter and elderly vendor',
                    hint: 'kiosk counter'
                },
                effects: [
                    { type: 'REVEAL_FROM_PARENT', entityId: 'obj_kiosk_drawer', parentId: 'obj_kiosk_counter' }
                ]
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_kiosk_drawer': {
        id: 'obj_kiosk_drawer' as GameObjectId,
        name: 'Drawer',
        archetype: 'Container',
        description: 'A small drawer behind the kiosk counter.',
        isRevealed: false,
        transitionNarration: 'You lean in closer to inspect the drawer behind the counter.',
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

    // ZONE 6: Side Alley - Main Parent Structure
    'obj_side_alley': {
        id: 'obj_side_alley' as GameObjectId,
        name: 'Side Alley',
        alternateNames: ['side alley', 'alley', 'dark alley', 'narrow alley', 'side street'],
        archetype: 'Structure',
        description: 'A narrow side alley branching off Elm Street. The smell of decay hangs in the air, and shadows obscure the details.',
        transitionNarration: 'You step into the side alley. The narrow passage is darker here, away from the street lights. Crates are stacked against one wall, and a rusted dumpster sits heavily in the shadows.',
        capabilities: { openable: false, lockable: false, breakable: false, movable: false, powerable: false, container: true, readable: false, inputtable: false },
        state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        children: {
            items: [],
            objects: ['obj_crates' as GameObjectId, 'obj_dumpster' as GameObjectId, 'obj_tire_stack' as GameObjectId, 'obj_tire_marks' as GameObjectId, 'obj_brick_walls' as GameObjectId, 'obj_courtyard_door' as GameObjectId]
        },
        handlers: {
            onExamine: {
                success: {
                    message: 'You step into the alley and the smell hits you first—rotting food, stale piss, something sweet and chemical you can\'t quite place. Your shoes stick slightly to the concrete.\n\nYou don\'t want to know what that is.\n\nThe alley is narrow, maybe eight feet across. Brick walls on both sides, stained black with decades of city grime and rain runoff.\n\nOld wooden crates are stacked haphazardly against the left wall, their labels long faded. On the right, a rusted dumpster sits like a sleeping giant, its green paint peeling in long strips. In the corner, a pile of old car tires leans against the wall. And on the ground—fresh tire marks pressed into the grime.\n\nThis is the kind of place people walk past without looking. The kind of place where deals go down, where evidence gets dumped, where someone could disappear and no one would ask questions.\n\nIf you were planning something terrible and needed a place where no one would look, this is exactly where you would circle on the map.\n\nYour gut tells you something is off. This alley is not just neglected—it is forgotten. And in your line of work, forgotten places have a habit of hiding secrets.\n\nYou see:\n📦 Wooden crates\n🗑️ Rusted dumpster\n🛞 Pile of old tires\n🚗 Tire marks on ground\n🧱 Brick walls',
                    media: {
                        url: '',
                        description: 'Dark narrow alley with crates and dumpster',
                        hint: 'side alley with crates'
                    },
                    effects: [
                        { type: 'REVEAL_FROM_PARENT', entityId: 'obj_crates', parentId: 'obj_side_alley' },
                        { type: 'REVEAL_FROM_PARENT', entityId: 'obj_dumpster', parentId: 'obj_side_alley' },
                        { type: 'REVEAL_FROM_PARENT', entityId: 'obj_tire_stack', parentId: 'obj_side_alley' },
                        { type: 'REVEAL_FROM_PARENT', entityId: 'obj_tire_marks', parentId: 'obj_side_alley' },
                        { type: 'REVEAL_FROM_PARENT', entityId: 'obj_brick_walls', parentId: 'obj_side_alley' }
                    ]
                }
            },
            onSearch: {
                message: 'You scan the alley carefully. The crates—ordinary shipping crates, nothing special. The dumpster—heavy, full of trash. But wait... there\'s something odd about how the dumpster is positioned. It\'s not quite flush against the wall. Like it was moved recently.\n\nMaybe you should try moving it.',
                media: undefined
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_crates': {
        id: 'obj_crates' as GameObjectId,
        name: 'Crates',
        alternateNames: ['crates', 'wooden crates', 'boxes', 'stacked crates', 'shipping crates'],
        archetype: 'Container',
        description: 'Stacked wooden crates in the alley. They look abandoned.',
        isRevealed: false,
        transitionNarration: 'You move closer to the stacked crates, examining their weathered surfaces.',
        capabilities: { openable: false, lockable: false, breakable: false, movable: true, powerable: false, container: false, readable: false, inputtable: false },
        state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        handlers: {
            onExamine: [
                {
                    // State 1: UNTOUCHED - Door not revealed yet
                    conditions: [
                        { type: 'OBJECT_IN_WORLD', objectId: 'obj_courtyard_door', inWorld: false }
                    ],
                    success: {
                        message: 'Old wooden crates stacked haphazardly. Some are marked with faded shipping labels—delivery companies from decades ago. The wood is splintered and warped from moisture and age.\n\nThey\'re stacked against the wall, heavy and solid. Too heavy to move by hand. You\'d need leverage—a crowbar, maybe—to shift them.',
                        media: {
                            url: '',
                            description: 'Weathered wooden crates',
                            hint: 'old shipping crates'
                        }
                    }
                },
                {
                    // State 2: REVEALED - Door revealed, crates moved
                    conditions: [],
                    success: {
                        message: 'The crates sit where you moved them, shifted several feet to the side. The hidden door behind them is now fully visible—old, rusted, with that keypad on the frame.',
                        media: undefined
                    }
                }
            ],
            onMove: [
                {
                    // State 1: UNTOUCHED - Trying without crowbar
                    conditions: [
                        { type: 'OBJECT_IN_WORLD', objectId: 'obj_courtyard_door', inWorld: false }
                    ],
                    success: {
                        message: 'You try to shove the crates aside. They don\'t budge. Too heavy. Decades of moisture have made the wood waterlogged, dense.\n\nYou need leverage. Something to pry them loose.',
                        media: undefined
                    }
                },
                {
                    // State 2: REVEALED - Already moved
                    conditions: [],
                    success: {
                        message: 'The crates are already moved. The door is visible behind them.',
                        media: undefined
                    }
                }
            ],
            onSearch: [
                {
                    // State 1: UNTOUCHED - Nothing hidden
                    conditions: [
                        { type: 'OBJECT_IN_WORLD', objectId: 'obj_courtyard_door', inWorld: false }
                    ],
                    success: {
                        message: 'You check between the crates, looking for anything hidden in the gaps. Nothing. Empty spaces, cobwebs, dust.',
                        media: undefined
                    }
                },
                {
                    // State 2: REVEALED - Already searched
                    conditions: [],
                    success: {
                        message: 'You already moved the crates and revealed the door. Nothing else here.',
                        media: undefined
                    }
                }
            ],
            onUse: [
                {
                    // Using crowbar on crates
                    conditions: [
                        { type: 'HAS_ITEM', itemId: 'item_crowbar' },
                        { type: 'OBJECT_IN_WORLD', objectId: 'obj_courtyard_door', inWorld: false }
                    ],
                    success: {
                        message: 'You wedge the crowbar between the wall and the crate stack. Leverage. Physics. You pull.\n\nThe crates groan, wood scraping against brick. You pull harder.\n\nThey shift. Inch by inch, the whole stack slides to the side.\n\nAnd there it is.\n\nBehind the crates, hidden for years: a metal door. Old, rusted, paint peeling. No handle, just a keypad mounted on the frame. Someone deliberately stacked those crates to hide this door.\n\nWhy?',
                        media: undefined,
                        effects: [
                            { type: 'REVEAL_FROM_PARENT', entityId: 'obj_courtyard_door', parentId: 'obj_side_alley' }
                        ]
                    }
                },
                {
                    // Already revealed door
                    conditions: [
                        { type: 'OBJECT_IN_WORLD', objectId: 'obj_courtyard_door', inWorld: true }
                    ],
                    success: {
                        message: 'The crates are already moved. The hidden door is visible behind them.',
                        media: undefined
                    }
                },
                {
                    // No crowbar
                    conditions: [],
                    success: {
                        message: 'You need something to pry these crates loose. They\'re too heavy to move by hand.',
                        media: undefined
                    }
                }
            ],
            onTake: {
                fail: {
                    message: 'These aren\'t your standard cardboard moving boxes. Each crate is solid wood—probably three or four feet on a side—heavy enough that lifting even one would strain your back. The whole stack? Hundreds of pounds, easy. You can\'t take them with you. If you want to move them, you need LEVERAGE. Try: MOVE CRATES or USE [tool] ON CRATES.',
                    media: undefined
                }
            },
            onOpen: {
                fail: {
                    message: 'The crates aren\'t containers you can open. They\'re solid wooden shipping crates—nailed shut decades ago, the wood warped and splintered from moisture. Even if you could pry one open, it would be empty inside. These crates are obstacles, not treasure chests. If you want to see what\'s behind them, you should MOVE them or SEARCH around them.',
                    media: undefined
                }
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_dumpster': {
        id: 'obj_dumpster' as GameObjectId,
        name: 'Dumpster',
        alternateNames: ['dumpster', 'trash bin', 'garbage bin', 'rusted dumpster', 'metal dumpster'],
        archetype: 'Container',
        description: 'A large metal dumpster filled with trash bags and debris.',
        isRevealed: false,
        transitionNarration: 'You approach the rusted dumpster in the alley. The smell hits you before you even get close.',
        capabilities: { openable: true, lockable: false, breakable: false, movable: true, powerable: false, container: true, readable: false, inputtable: false },
        state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        inventory: { items: [], capacity: 10, allowTags: [], denyTags: [] },
        children: {
            items: ['item_crumpled_note' as ItemId],
            objects: []
        },
        handlers: {
            onExamine: [
                {
                    // Before moving dumpster - door still hidden
                    conditions: [
                        { type: 'OBJECT_IN_WORLD', objectId: 'obj_courtyard_door', inWorld: false }
                    ],
                    success: {
                        message: 'A rusted metal dumpster, heavy and imposing. The smell is overpowering—rotting food, mildew, decay. Black garbage bags are visible through gaps in the lid.\n\nThe dumpster is positioned oddly, not quite flush against the wall. There might be a gap behind it.',
                        media: {
                            url: '',
                            description: 'Rusted dumpster not flush against wall',
                            hint: 'dumpster hiding something'
                        }
                    }
                },
                {
                    // After moving dumpster - door revealed
                    conditions: [
                        { type: 'OBJECT_IN_WORLD', objectId: 'obj_courtyard_door', inWorld: true }
                    ],
                    success: {
                        message: 'The dumpster sits where you pushed it, several feet from the wall. The old door behind it is now fully visible—rusted metal, peeling paint, locked tight.',
                        media: {
                            url: '',
                            description: 'Dumpster moved aside, door revealed',
                            hint: 'hidden door exposed'
                        }
                    }
                }
            ],
            onOpen: {
                success: {
                    message: 'You lift the heavy lid. The stench hits you immediately—rotting food and something worse. Black garbage bags, food containers, newspapers.\n\nMostly garbage. But if you want to find something, you should search more carefully.',
                    media: undefined
                }
            },
            onSearch: [
                {
                    // State 3: TAKEN - Note already taken
                    conditions: [
                        { type: 'HAS_ITEM', itemId: 'item_crumpled_note' }
                    ],
                    success: {
                        message: 'You already searched through this dumpster. Found that note. Nothing else of interest here—just garbage, rot, and the smell of decay.',
                        media: undefined
                    }
                },
                {
                    // State 2: REVEALED - Note found but not taken
                    conditions: [
                        { type: 'ITEM_IN_WORLD', itemId: 'item_crumpled_note', inWorld: true }
                    ],
                    success: {
                        message: 'You already dug through the garbage. The crumpled note is right there—you pulled it out. Just take it if you need it.',
                        media: undefined
                    }
                },
                {
                    // Must open dumpster first before searching
                    conditions: [
                        { type: 'STATE', entityId: 'obj_dumpster', key: 'isOpen', equals: false }
                    ],
                    success: {
                        message: 'The dumpster lid is closed. You need to OPEN it before you can search through the contents.',
                        media: undefined
                    }
                },
                {
                    // State 1: UNTOUCHED - Finding the note (fallback/default)
                    conditions: [],
                    success: {
                        message: 'You hold your breath and dig through the trash. Rotting food. Soaked newspapers. Empty bottles.\n\nYour hands plunge deeper. Slime. Mold. Something wet that soaks through your sleeve.\n\nThen—something that doesn\'t belong.\n\nA piece of paper. Crumpled but relatively clean. Like it was thrown away recently, not weeks ago. Deliberately placed, maybe, not just tossed.\n\nYou pull it out carefully, shaking off the grime.\n\nA handwritten note.',
                        media: undefined,
                        effects: [
                            { type: 'REVEAL_FROM_PARENT', entityId: 'item_crumpled_note', parentId: 'obj_dumpster' }
                        ]
                    }
                }
            ],
            onMove: {
                success: {
                    message: 'You grip the dumpster\'s edge and push. It\'s heavy—really heavy—full of trash and years of rust. The metal scrapes against concrete, a harsh grinding sound echoing in the alley.\n\nYou push harder. Inch by inch, it slides away from the wall.\n\nAnd there it is. Behind the dumpster, hidden for who knows how long: an old metal door. Rusted, peeling paint, no handle—just a keyhole. Someone wanted this door hidden.\n\nWhy?',
                    media: {
                        url: '',
                        description: 'Dumpster moved aside revealing hidden door',
                        hint: 'secret door revealed'
                    },
                    effects: [
                        { type: 'REVEAL_FROM_PARENT', entityId: 'obj_courtyard_door', parentId: 'obj_side_alley' }
                    ]
                }
            },
            onTake: {
                fail: {
                    message: 'The dumpster is a massive metal container, probably weighing several hundred pounds even when empty. Full of trash like it is now? Half a ton, easy. You can\'t take it with you. You can MOVE it, OPEN it, or SEARCH through it, but you can\'t carry it away.',
                    media: undefined
                }
            },
            onUse: {
                fail: {
                    message: 'A dumpster isn\'t a tool. It\'s a container for waste. You can OPEN it, SEARCH it, or MOVE it if you need to shift it aside, but you can\'t use it.',
                    media: undefined
                }
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_tire_stack': {
        id: 'obj_tire_stack' as GameObjectId,
        name: 'Tire Stack',
        alternateNames: ['tire stack', 'tires', 'old tires', 'stacked tires', 'car tires', 'pile of tires'],
        archetype: 'Container',
        description: 'A pile of old car tires stacked haphazardly in the corner. Cracked rubber, weeds growing through the centers.',
        transitionNarration: 'You move closer to the pile of old tires. They smell like burnt rubber and decay.',
        capabilities: { openable: false, lockable: false, breakable: false, movable: true, powerable: false, container: true, readable: false, inputtable: false },
        state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        children: {
            items: ['item_crowbar' as ItemId],
            objects: []
        },
        handlers: {
            onExamine: [
                {
                    // State 3: TAKEN - After taking crowbar
                    conditions: [
                        { type: 'HAS_ITEM', itemId: 'item_crowbar' }
                    ],
                    success: {
                        message: 'The tire pile sits where you left it, slightly disturbed from your search. The crowbar is gone—you took it. Just old rubber remains, cracked and weathered, weeds growing through the centers.\n\nNothing else hidden here. You checked.',
                        media: undefined
                    }
                },
                {
                    // State 2: REVEALED - Crowbar found but not taken yet
                    conditions: [
                        { type: 'ITEM_IN_WORLD', itemId: 'item_crowbar', inWorld: true }
                    ],
                    success: {
                        message: 'The tire pile sits slightly disturbed from your search. The crowbar you found is still here, lying where you pulled it out—two feet of rust-spotted steel wedged between the third and fourth tire.\n\nYou should take it. Could be useful.',
                        media: undefined
                    }
                },
                {
                    // State 1: UNTOUCHED - Before finding crowbar (fallback/default)
                    conditions: [],
                    success: {
                        message: 'Five or six old car tires, stacked haphazardly against the brick wall like someone tossed them there and forgot. The rubber is cracked, dry-rotted from years of exposure. Deep fissures run along the treads where the material split and separated. Black flakes dust your fingers when you touch them.\n\nWeeds have colonized the centers—dandelions gone to seed, scraggly grass pushing through the holes. Nature reclaiming what was abandoned.\n\nThe smell is distinct: burnt rubber mixed with decay, that chemical petroleum stench that never fully fades. It clings to the back of your throat.\n\nThey\'re heavier than they look. Decades of moisture absorbed into the rubber, making them dense, waterlogged. Someone would need to roll them aside one by one if they wanted to move them.\n\nBut why would anyone? They\'re just trash. Forgotten debris in a forgotten alley.\n\nUnless they\'re hiding something.',
                        media: undefined
                    }
                }
            ],
            onSearch: [
                {
                    // State 3: TAKEN - Already found and taken
                    conditions: [
                        { type: 'HAS_ITEM', itemId: 'item_crowbar' }
                    ],
                    success: {
                        message: 'You\'ve already searched the tires. The crowbar is gone—you took it. Nothing else here but rubber and weeds.',
                        media: undefined
                    }
                },
                {
                    // State 2: REVEALED - Crowbar found but not taken
                    conditions: [
                        { type: 'ITEM_IN_WORLD', itemId: 'item_crowbar', inWorld: true }
                    ],
                    success: {
                        message: 'You already moved the tires apart. The crowbar is right there—you can see it lying between the rubber. Just take it if you need it.',
                        media: undefined
                    }
                },
                {
                    // State 1: UNTOUCHED - Hint only, don't reveal yet
                    conditions: [],
                    success: {
                        message: 'You crouch down and reach between the tires, fingers probing the gaps. Most are empty—just dead leaves, dirt compacted into paste, spider webs.\n\nBut wait.\n\nYour fingers brush something. Cold. Hard. Metal.\n\nIt\'s wedged tight between the third and fourth tire, deep in the gap. You can feel the shape—long, narrow, maybe two feet. A rod? A pipe?\n\nYou try to pull it out. Can\'t. Stuck. The tires are too heavy, pinning it in place.\n\nYou need to MOVE the tires apart if you want to get at whatever this is.',
                        media: undefined
                    }
                }
            ],
            onMove: [
                {
                    // State 3: TAKEN - Already moved and taken
                    conditions: [
                        { type: 'HAS_ITEM', itemId: 'item_crowbar' }
                    ],
                    success: {
                        message: 'You already moved the tires. The crowbar is gone—you took it. Nothing else here.',
                        media: undefined
                    }
                },
                {
                    // State 2: REVEALED - Already moved, crowbar visible
                    conditions: [
                        { type: 'ITEM_IN_WORLD', itemId: 'item_crowbar', inWorld: true }
                    ],
                    success: {
                        message: 'You already moved the tires apart. The crowbar is lying right there between the rubber. Take it if you need it.',
                        media: undefined
                    }
                },
                {
                    // State 1: UNTOUCHED - Moving reveals the crowbar
                    conditions: [],
                    success: {
                        message: 'You grip the top tire and roll it aside. Heavy. The rubber is slick with grime, waterlogged from years of exposure. It hits the ground with a dull thud.\n\nSecond tire. Roll it away.\n\nThird tire. You pause. This is the one. You felt something metal wedged against it.\n\nYou push it aside, and there it is—\n\nA crowbar.\n\nSteel, about two feet long. Rust-spotted but solid. The curved pry end catches the dim light. The kind of tool you use when you need leverage.\n\nSomeone hid this here. Deliberately. Tucked it between the tires where no casual passerby would find it.\n\nWhy?\n\nYou should take it. Could be useful.',
                        media: undefined,
                        effects: [
                            { type: 'REVEAL_FROM_PARENT', entityId: 'item_crowbar', parentId: 'obj_tire_stack' }
                        ]
                    }
                }
            ],
            onTake: {
                fail: {
                    message: 'The tires are too heavy and awkward to carry. Besides, what would you do with a pile of old rubber? Leave them here.\n\nIf you think something\'s hidden inside them, try SEARCHING first, then MOVE the tires apart to get at it.',
                    media: undefined
                }
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_tire_marks': {
        id: 'obj_tire_marks' as GameObjectId,
        name: 'Tire Marks',
        alternateNames: ['tire marks', 'tire tracks', 'tracks', 'skid marks', 'tread marks', 'van tracks'],
        archetype: 'Evidence',
        description: 'Fresh tire marks on the cracked concrete. Someone drove through here recently.',
        transitionNarration: 'You crouch down to examine the tire marks more closely.',
        capabilities: { openable: false, lockable: false, breakable: false, movable: false, powerable: false, container: false, readable: false, inputtable: false },
        state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        handlers: {
            onExamine: [
                {
                    // After photographing
                    conditions: [
                        { type: 'HAS_ITEM', itemId: 'item_photo_tire_marks' }
                    ],
                    success: {
                        message: 'The tire marks remain pressed into the grime—two parallel tracks with that distinctive diagonal crosshatch tread. You\'ve already photographed them. The pattern\'s documented in your phone.\n\nNow you just need to match it to the police report.',
                        media: undefined
                    }
                },
                {
                    // Before photographing (fallback/default)
                    conditions: [],
                    success: {
                        message: 'You crouch down, knees cracking, and study the marks.\n\nTwo parallel tracks pressed into the layer of dirt and grime coating the alley concrete. The treads are distinct—deep grooves cut in a diagonal crosshatch pattern, the kind of aggressive tread you see on commercial vehicles. Not passenger cars. Something heavier. A van, most likely.\n\nThe marks are fresh. Recent. You can tell by the way the dirt hasn\'t settled back into the grooves yet. A week old, maybe less. Rain would have washed them away if they\'d been here longer.\n\nYou run your finger along one track. The groove is deep—eighth of an inch, maybe more. New tires. Someone replaced them recently, or the vehicle doesn\'t see much mileage.\n\nThe police report mentioned a gray van. Witnesses saw it near the bus stop around the time Lili disappeared. These could be from that van. The timing matches. The location matches.\n\nYou should photograph these. Document the tread pattern. Compare it to the forensic report—they always catalog tire types when there\'s vehicle involvement.\n\nSomething about these tracks bothers you. They\'re too clean. Too perfect. Like someone wanted them found.',
                        media: undefined
                    }
                }
            ],
            onPhotograph: [
                {
                    // Already photographed
                    conditions: [
                        { type: 'HAS_ITEM', itemId: 'item_photo_tire_marks' }
                    ],
                    success: {
                        message: 'You\'ve already photographed the tire marks. The images are stored in your phone—clear shots of the tread pattern.',
                        media: undefined
                    }
                },
                {
                    // First time photographing (fallback/default)
                    conditions: [],
                    success: {
                        message: 'You pull out your phone, angle it to get the best light, and snap several photos. The camera focuses, capturing the tread pattern in sharp detail.\n\nClick. Click. Click.\n\nYou review the images. Clear. Usable. The diagonal crosshatch pattern is visible, the depth of the grooves apparent even in the photo. Good enough for comparison.\n\n*Photo added to evidence.*\n\nNow check the police report. They mentioned tire analysis in the forensics section.',
                        media: undefined,
                        effects: [
                            { type: 'ADD_ITEM_TO_INVENTORY', itemId: 'item_photo_tire_marks' }
                        ]
                    }
                }
            ],
            onSearch: {
                success: {
                    message: 'You examine the ground around the tire marks, looking for anything else. Cigarette butts, footprints, dropped objects—anything that might connect to whoever drove through here.\n\nNothing.\n\nJust the tracks. Clean. Isolated. Almost too perfect.\n\nWhoever left these knew what they were doing.',
                    media: undefined
                }
            },
            onTake: {
                fail: {
                    message: 'You can\'t take tire marks off the ground. They\'re evidence, but they\'re not portable. Try PHOTOGRAPHING them instead—document the pattern so you can compare it to the police report.',
                    media: undefined
                }
            },
            onUse: {
                fail: {
                    message: 'Tire marks aren\'t a tool. They\'re evidence. PHOTOGRAPH them to document the tread pattern, then compare the image to the forensic analysis in the police report.',
                    media: undefined
                }
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_brick_walls': {
        id: 'obj_brick_walls' as GameObjectId,
        name: 'Brick Walls',
        alternateNames: ['brick walls', 'walls', 'brick wall', 'bricks', 'wall', 'graffiti'],
        archetype: 'Decoration',
        description: 'Tall brick walls on both sides of the alley. Stained black with decades of city grime.',
        transitionNarration: 'You step closer to the brick wall, running your hand along its rough surface.',
        capabilities: { openable: false, lockable: false, breakable: false, movable: false, powerable: false, container: false, readable: false, inputtable: false },
        state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        handlers: {
            onExamine: {
                success: {
                    message: 'The brick walls rise on both sides of the alley—tall, imposing, hemming you in. Old industrial construction, probably 1940s or 50s based on the brick pattern and mortar style. Red clay brick beneath layers of black grime, decades of city pollution baked into the surface.\n\nThe mortar is crumbling. You can pick it out with your fingernail in places, the cement degraded to powder. Some bricks are loose, water damage having eroded the adhesive over the years. Rain runoff has left vertical streaks down the wall—clean channels through the filth where water flows during storms.\n\nGraffiti covers the left wall. Layers of it—spray-painted tags, gang symbols, indecipherable scrawls piled over each other like archaeological strata. Each generation adding their mark, covering the previous.\n\nBut three markings stand out.\n\nA wild spray-painted ROSE—red and black, thorny stems curling around the petals. Detailed work. Not a quick tag. Someone spent time on this. Below it, in aggressive tagged style, dripping letters: "JUSTICE." The kind of street art that makes a statement. Protest? Memorial? Gang territory?\n\nAnd beneath both, stenciled in faded white paint: the number "1973."\n\nYou stare at the markings. A rose. Justice. 1973. Could they mean something? A date? A code? A message left for someone?\n\nOr just street art—beautiful, angry, meaningless?\n\nYour detective instincts tell you: sometimes graffiti is just graffiti. Not everything connects to your case.',
                    media: undefined
                }
            },
            onSearch: {
                success: {
                    message: 'You run your hands along the bricks, checking for loose ones, hidden compartments, anything that might conceal evidence. Detective work 101: assume nothing is what it seems.\n\nYou press bricks around the rose graffiti. Pull on them. Check the mortar gaps near the "JUSTICE" tag. Trace your fingers around the "1973" stencil, looking for a hidden switch, a loose brick, anything.\n\nNothing.\n\nSolid wall. Crumbling in places, yes, but just age and weather. No secret passages. No hidden safes. No loose brick revealing a key taped inside.\n\nJust a wall. Old. Dirty. Forgotten.\n\nThe graffiti stares back at you—the rose, the word, the number. Beautiful. Angry. Meaningless.\n\nSometimes a wall is just a wall.',
                    media: undefined
                }
            },
            onTake: {
                fail: {
                    message: 'You can\'t take a brick wall with you. Even if you could pry loose one of the deteriorating bricks, what would you do with it? It\'s just brick. Old clay and mortar. Not evidence.',
                    media: undefined
                }
            },
            onUse: {
                fail: {
                    message: 'A brick wall isn\'t a tool. It\'s a barrier. It defines the alley, contains the space. You can EXAMINE it or SEARCH it if you think there\'s something hidden, but you can\'t use it.',
                    media: undefined
                }
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_courtyard_door': {
        id: 'obj_courtyard_door' as GameObjectId,
        name: 'Courtyard Door',
        alternateNames: ['courtyard door', 'door', 'hidden door', 'metal door', 'rusted door', 'old door'],
        archetype: 'Door',
        description: 'A hidden rusted metal door behind the dumpster. Old, locked, deliberately concealed.',
        isRevealed: false,
        transitionNarration: 'You step closer to the hidden door. Rust flakes off at your touch. This door hasn\'t been opened in years.',
        capabilities: { openable: true, lockable: true, breakable: false, movable: false, powerable: false, container: false, readable: false, inputtable: true },
        state: { isOpen: false, isLocked: true, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        leadsToLocationId: 'loc_courtyard' as LocationId,
        handlers: {
            onExamine: [
                {
                    // Door is locked
                    conditions: [
                        { type: 'OBJECT_STATE', objectId: 'obj_courtyard_door', statePath: 'isLocked', value: true }
                    ],
                    success: {
                        message: 'A heavy metal door, hidden behind the crates. The paint is peeling in long strips, revealing layers of rust beneath. No handle—just a numeric keypad mounted on the frame. Old, weathered, but still functional.\n\nSomeone deliberately hid this door. Someone wanted to keep people out. Or keep something in.\n\nThe door is locked. You need the right code to open it.',
                        media: {
                            url: '',
                            description: 'Rusted locked door with keyhole',
                            hint: 'locked door needs key'
                        }
                    }
                },
                {
                    // Door is unlocked/open
                    conditions: [],
                    success: {
                        message: 'The hidden door stands open now, revealing the dark courtyard beyond.',
                        media: undefined
                    }
                }
            ],
            onOpen: [
                {
                    // Door is locked - can't open
                    conditions: [
                        { type: 'OBJECT_STATE', objectId: 'obj_courtyard_door', statePath: 'isLocked', value: true }
                    ],
                    success: {
                        message: 'You try the door. It doesn\'t budge. Locked tight. The keypad displays a blinking cursor, waiting for input.\n\nYou need the right code to unlock it.',
                        media: undefined
                    }
                },
                {
                    // Door is unlocked - opens successfully
                    conditions: [
                        { type: 'OBJECT_STATE', objectId: 'obj_courtyard_door', statePath: 'isLocked', value: false }
                    ],
                    success: {
                        message: 'The door creaks open on rusted hinges, the sound sharp in the quiet alley. Beyond is a small courtyard—neglected, overgrown, forgotten. Three garage doors line the far wall, each painted a different faded color: blue, red, green.\n\nThis is it. This is where the trail leads.',
                        media: {
                            url: '',
                            description: 'Open door revealing courtyard with garages',
                            hint: 'courtyard with three garages'
                        },
                        effects: [
                            { type: 'REVEAL_LOCATION', locationId: 'loc_courtyard' }
                        ]
                    }
                }
            ],
            onInput: {
                correctPasswords: ['225'],
                onSuccess: {
                    message: 'You punch in the code: 2-2-5.\n\nThe keypad beeps. Green light.\n\nA mechanical click echoes from inside the door. The lock disengages.\n\nThe door is unlocked.',
                    media: undefined,
                    effects: [
                        { type: 'SET_OBJECT_STATE', objectId: 'obj_courtyard_door', statePath: 'isLocked', value: false }
                    ]
                },
                onFailure: {
                    message: 'You enter the code. The keypad beeps. Red light. Wrong code.\n\nThe door remains locked.',
                    media: undefined
                }
            },
            onTake: {
                fail: {
                    message: 'It\'s a door. A heavy metal door bolted into a concrete frame. You can\'t take it with you any more than you could carry away a section of brick wall. It\'s architecture. If you want to get past it, you need to OPEN it or find the right code to UNLOCK it.',
                    media: undefined
                }
            },
            onUse: {
                fail: {
                    message: 'A door isn\'t a tool—it\'s a barrier, a passage. If it\'s locked, you need the right code for the keypad. If it\'s unlocked, you can OPEN it. You can\'t use it.',
                    media: undefined
                }
            },
            onBreak: {
                fail: {
                    message: 'You consider trying to break down the door. Kick it in. Shoulder it. Force it open.\n\nBut this isn\'t some hollow-core apartment door. It\'s solid metal. Industrial grade. Even if you had a battering ram, you\'d make noise loud enough to wake the whole neighborhood.\n\nYou\'re a detective, not a demolition crew. Find the code. That\'s the smart way in.',
                    media: undefined
                }
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    // COURTYARD OBJECTS
    'obj_old_tires': {
        id: 'obj_old_tires' as GameObjectId,
        name: 'Old Tires',
        archetype: 'Decoration',
        description: 'A pile of old car tires stacked in the corner of the courtyard. Weathered, cracked, forgotten.',
        transitionNarration: 'You approach the pile of old tires. They\'re stacked haphazardly, black rubber cracked from years of exposure.',
        capabilities: { openable: false, lockable: false, breakable: false, movable: true, powerable: false, container: false, readable: false, inputtable: false },
        state: { isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        handlers: {
            onExamine: {
                message: 'Old car tires, stacked in a corner. The rubber is cracked and weathered. Some have weeds growing through the center holes.\n\nNothing special here. Just debris from years of neglect.',
                media: undefined
            },
            onMove: {
                message: 'You roll the tires aside. Nothing hidden beneath—just more cracked concrete.',
                media: undefined
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_garage_blue_door': {
        id: 'obj_garage_blue_door' as GameObjectId,
        name: 'Blue Garage Door',
        archetype: 'Door',
        description: 'A garage door painted faded blue. The paint is peeling, revealing rust beneath.',
        transitionNarration: 'You walk up to the blue garage door. Paint flakes off at your touch.',
        capabilities: { openable: true, lockable: true, breakable: false, movable: false, powerable: false, container: false, readable: false, inputtable: true },
        state: { isOpen: false, isLocked: true, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        leadsToLocationId: 'loc_garage_blue' as LocationId,
        handlers: {
            onExamine: {
                message: 'The blue garage door is old and weathered. A small keypad is mounted next to it—requires a code. The paint is so faded you can barely tell it was once blue.',
                media: {
                    url: '',
                    description: 'Faded blue garage door with keypad',
                    hint: 'locked garage needs code'
                }
            },
            onOpen: [
                {
                    conditions: [
                        { type: 'OBJECT_STATE', objectId: 'obj_garage_blue_door', statePath: 'isLocked', value: true }
                    ],
                    success: {
                        message: 'The garage door is locked. The keypad blinks, waiting for a code.',
                        media: undefined
                    }
                },
                {
                    conditions: [],
                    success: {
                        message: 'The garage door rolls open with a grinding mechanical sound. Inside, darkness waits.',
                        media: undefined,
                        effects: [
                            { type: 'REVEAL_LOCATION', locationId: 'loc_garage_blue' }
                        ]
                    }
                }
            ]
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_garage_red_door': {
        id: 'obj_garage_red_door' as GameObjectId,
        name: 'Red Garage Door',
        archetype: 'Door',
        description: 'A garage door painted faded red. Rust stains streak down from the hinges.',
        transitionNarration: 'You step toward the red garage door. Rust flakes fall as you approach.',
        capabilities: { openable: true, lockable: true, breakable: false, movable: false, powerable: false, container: false, readable: false, inputtable: true },
        state: { isOpen: false, isLocked: true, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        leadsToLocationId: 'loc_garage_red' as LocationId,
        handlers: {
            onExamine: {
                message: 'The red garage door is heavily rusted. A keypad sits beside it, its numbers worn smooth from use—or disuse.',
                media: {
                    url: '',
                    description: 'Rusted red garage door with keypad',
                    hint: 'locked garage needs code'
                }
            },
            onOpen: [
                {
                    conditions: [
                        { type: 'OBJECT_STATE', objectId: 'obj_garage_red_door', statePath: 'isLocked', value: true }
                    ],
                    success: {
                        message: 'The garage door won\'t budge. Locked. The keypad awaits input.',
                        media: undefined
                    }
                },
                {
                    conditions: [],
                    success: {
                        message: 'The red garage door groans open, revealing the cluttered space beyond.',
                        media: undefined,
                        effects: [
                            { type: 'REVEAL_LOCATION', locationId: 'loc_garage_red' }
                        ]
                    }
                }
            ]
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_garage_green_door': {
        id: 'obj_garage_green_door' as GameObjectId,
        name: 'Green Garage Door',
        archetype: 'Door',
        description: 'A garage door painted faded green. The cleanest of the three, but still weathered.',
        transitionNarration: 'You approach the green garage door. It looks slightly newer than the others.',
        capabilities: { openable: true, lockable: true, breakable: false, movable: false, powerable: false, container: false, readable: false, inputtable: true },
        state: { isOpen: false, isLocked: true, isBroken: false, isPoweredOn: false, currentStateId: 'default' },
        leadsToLocationId: 'loc_garage_green' as LocationId,
        handlers: {
            onExamine: {
                message: 'The green garage door is the least weathered of the three. Still old, still faded, but maintained—at least compared to the others. A keypad is mounted on the wall.',
                media: {
                    url: '',
                    description: 'Faded green garage door with keypad',
                    hint: 'locked garage needs code'
                }
            },
            onOpen: [
                {
                    conditions: [
                        { type: 'OBJECT_STATE', objectId: 'obj_garage_green_door', statePath: 'isLocked', value: true }
                    ],
                    success: {
                        message: 'Locked. The keypad waits for a code.',
                        media: undefined
                    }
                },
                {
                    conditions: [],
                    success: {
                        message: 'The green garage door opens smoothly—someone oiled these hinges. The empty space inside beckons.',
                        media: undefined,
                        effects: [
                            { type: 'REVEAL_LOCATION', locationId: 'loc_garage_green' }
                        ]
                    }
                }
            ]
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
            'obj_bus_stop' as GameObjectId,
            'obj_gray_building_door' as GameObjectId,
            'obj_florist_shop' as GameObjectId,
            'obj_kiosk_counter' as GameObjectId,
            'obj_side_alley' as GameObjectId
        ],
        npcs: [
            'npc_electrician' as NpcId,
            'npc_florist' as NpcId,
            'npc_kiosk_vendor' as NpcId
        ],
        zones: [
            {
                title: 'Bus Station',
                objectIds: ['obj_bus_stop' as GameObjectId, 'obj_bench' as GameObjectId, 'obj_info_board' as GameObjectId, 'obj_bus_sign' as GameObjectId]
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
                objectIds: ['obj_kiosk_counter' as GameObjectId]
            },
            {
                title: 'Side Alley',
                objectIds: ['obj_side_alley' as GameObjectId]
            }
        ],
        transitionTemplates: [
            'You walk down Elm Street toward the {entity}. The afternoon sun casts long shadows across the pavement.',
            'You move carefully toward the {entity}, scanning the surroundings. This is where she vanished.',
            'Your footsteps echo on the quiet street as you approach the {entity}. No one seems to notice you.',
            'You cross the street toward the {entity}, dodging a puddle from last night\'s rain.',
            'The street is nearly empty as you make your way to the {entity}. A car passes slowly, driver barely glancing your way.',
            'You navigate past a parked delivery truck, heading for the {entity}. The smell of exhaust lingers.',
            'A light breeze carries the scent of flowers from the florist as you approach the {entity}.',
            'You step around cracked pavement, moving toward the {entity}. This neighborhood has seen better days.',
            'The kiosk vendor watches you briefly as you head to the {entity}, then returns to his newspaper.',
            'You walk past faded storefronts toward the {entity}. Elm Street feels frozen in time, stuck somewhere between neglect and normalcy.'
        ],
        spatialMode: 'sprawling' // Large outdoor area - requires navigation between zones
    },

    'loc_courtyard': {
        locationId: 'loc_courtyard' as LocationId,
        name: 'Hidden Courtyard',
        sceneDescription: 'A small neglected courtyard hidden behind the side alley. Cracked concrete, overgrown weeds pushing through the cracks. Three garage doors line the back wall, each painted a different faded color: blue, red, green. The air here feels stagnant, forgotten.',
        introMessage: 'You step through the hidden door into the courtyard. It\'s quiet here—too quiet. The three garage doors stare back at you like closed eyes. What secrets do they hide?',
        objects: [
            'obj_old_tires' as GameObjectId,
            'obj_garage_blue_door' as GameObjectId,
            'obj_garage_red_door' as GameObjectId,
            'obj_garage_green_door' as GameObjectId
        ],
        npcs: [],
        zones: [
            {
                title: 'Courtyard Ground',
                objectIds: ['obj_old_tires' as GameObjectId]
            },
            {
                title: 'Blue Garage',
                objectIds: ['obj_garage_blue_door' as GameObjectId]
            },
            {
                title: 'Red Garage',
                objectIds: ['obj_garage_red_door' as GameObjectId]
            },
            {
                title: 'Green Garage',
                objectIds: ['obj_garage_green_door' as GameObjectId]
            }
        ]
    },

    'loc_garage_blue': {
        locationId: 'loc_garage_blue' as LocationId,
        name: 'Blue Garage Interior',
        sceneDescription: 'The blue garage is dark and musty. Old tools hang on the walls, covered in rust and dust. A workbench sits against the far wall.',
        introMessage: 'You step into the blue garage. The smell of motor oil and decay fills your nostrils.',
        objects: [],
        npcs: [],
        zones: []
    },

    'loc_garage_red': {
        locationId: 'loc_garage_red' as LocationId,
        name: 'Red Garage Interior',
        sceneDescription: 'The red garage is cluttered with boxes and old furniture. Everything is covered in a thick layer of dust.',
        introMessage: 'The red garage opens before you. Shadows loom in the corners.',
        objects: [],
        npcs: [],
        zones: []
    },

    'loc_garage_green': {
        locationId: 'loc_garage_green' as LocationId,
        name: 'Green Garage Interior',
        sceneDescription: 'The green garage is almost empty. Just bare concrete walls and a drain in the center of the floor.',
        introMessage: 'You push open the green garage door. The space inside is eerily empty.',
        objects: [],
        npcs: [],
        zones: []
    }
};

// =====================================
// PORTALS, STRUCTURES, WORLD
// =====================================

const portals: Record<PortalId, Portal> = {
    'portal_street_to_courtyard': {
        id: 'portal_street_to_courtyard' as PortalId,
        fromLocationId: 'loc_street' as LocationId,
        toLocationId: 'loc_courtyard' as LocationId,
        doorObjectId: 'obj_courtyard_door' as GameObjectId,
        isRevealed: false,
        isAccessible: false,
        description: 'A hidden door behind the dumpster in the side alley.',
        transitionMessage: 'You pass through the hidden door into the forgotten courtyard.'
    },
    'portal_courtyard_to_street': {
        id: 'portal_courtyard_to_street' as PortalId,
        fromLocationId: 'loc_courtyard' as LocationId,
        toLocationId: 'loc_street' as LocationId,
        doorObjectId: 'obj_courtyard_door' as GameObjectId,
        isRevealed: true,
        isAccessible: true,
        description: 'The door back to the side alley.',
        transitionMessage: 'You return through the door to the side alley.'
    },
    'portal_courtyard_to_blue_garage': {
        id: 'portal_courtyard_to_blue_garage' as PortalId,
        fromLocationId: 'loc_courtyard' as LocationId,
        toLocationId: 'loc_garage_blue' as LocationId,
        doorObjectId: 'obj_garage_blue_door' as GameObjectId,
        isRevealed: true,
        isAccessible: false,
        description: 'The faded blue garage door.',
        transitionMessage: 'You enter the blue garage.'
    },
    'portal_blue_garage_to_courtyard': {
        id: 'portal_blue_garage_to_courtyard' as PortalId,
        fromLocationId: 'loc_garage_blue' as LocationId,
        toLocationId: 'loc_courtyard' as LocationId,
        doorObjectId: 'obj_garage_blue_door' as GameObjectId,
        isRevealed: true,
        isAccessible: true,
        description: 'The blue garage door back to the courtyard.',
        transitionMessage: 'You step back into the courtyard.'
    },
    'portal_courtyard_to_red_garage': {
        id: 'portal_courtyard_to_red_garage' as PortalId,
        fromLocationId: 'loc_courtyard' as LocationId,
        toLocationId: 'loc_garage_red' as LocationId,
        doorObjectId: 'obj_garage_red_door' as GameObjectId,
        isRevealed: true,
        isAccessible: false,
        description: 'The rusted red garage door.',
        transitionMessage: 'You enter the red garage.'
    },
    'portal_red_garage_to_courtyard': {
        id: 'portal_red_garage_to_courtyard' as PortalId,
        fromLocationId: 'loc_garage_red' as LocationId,
        toLocationId: 'loc_courtyard' as LocationId,
        doorObjectId: 'obj_garage_red_door' as GameObjectId,
        isRevealed: true,
        isAccessible: true,
        description: 'The red garage door back to the courtyard.',
        transitionMessage: 'You step back into the courtyard.'
    },
    'portal_courtyard_to_green_garage': {
        id: 'portal_courtyard_to_green_garage' as PortalId,
        fromLocationId: 'loc_courtyard' as LocationId,
        toLocationId: 'loc_garage_green' as LocationId,
        doorObjectId: 'obj_garage_green_door' as GameObjectId,
        isRevealed: true,
        isAccessible: false,
        description: 'The green garage door.',
        transitionMessage: 'You enter the green garage.'
    },
    'portal_green_garage_to_courtyard': {
        id: 'portal_green_garage_to_courtyard' as PortalId,
        fromLocationId: 'loc_garage_green' as LocationId,
        toLocationId: 'loc_courtyard' as LocationId,
        doorObjectId: 'obj_garage_green_door' as GameObjectId,
        isRevealed: true,
        isAccessible: true,
        description: 'The green garage door back to the courtyard.',
        transitionMessage: 'You step back into the courtyard.'
    }
};

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
    title: 'Walk in Justice - Chapter 1',
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
                url: '',
                description: 'Item goes into pocket',
                hint: 'putting item away'
            }
        }
    },

    systemMessages: {
        needsTarget: {
            examine: "need_target_examine",
            read: "need_target_read",
            take: "need_target_take",
            goto: "need_target_goto",
        },
        notVisible: (itemName: string) => "item_not_visible",
        inventoryEmpty: "inventory_empty",
        inventoryList: (itemNames: string) => `You're carrying:\n${itemNames}`,  // Keep static (structured list)
        alreadyHaveItem: (itemName: string) => "already_have_item",
        cannotGoThere: "cannot_go_there",
        chapterIncomplete: (goal: string, locationName: string) => "chapter_incomplete",
        chapterTransition: (chapterTitle: string) => `━━━ ${chapterTitle} ━━━`,  // Keep static (structured divider)
        locationTransition: (locationName: string) => `You arrive at ${locationName}.`,  // Keep static (simple announcement)
        noNextChapter: "no_next_chapter",
        notReadable: (itemName: string) => "item_not_readable",
        alreadyReadAll: (itemName: string) => "already_read_all",
        textIllegible: "text_illegible",
        dontHaveItem: (itemName: string) => "dont_have_item",
        cantUseItem: (itemName: string) => "cant_use_item",
        cantUseOnTarget: (itemName: string, targetName: string) => "cant_use_item_on_target",
        noVisibleTarget: (targetName: string) => "no_visible_target",
        useDidntWork: "use_didnt_work",
        cantMoveObject: (objectName: string) => "cant_move_object",
        movedNothingFound: (objectName: string) => "moved_nothing_found",
        cantOpen: (targetName: string) => "cant_open",
        needsFocus: "needs_focus",
        focusSystemError: "focus_system_error",
        noPasswordInput: (objectName: string) => "no_password_input",
        alreadyUnlocked: (objectName: string) => "already_unlocked",
        wrongPassword: "wrong_password",
        cantDoThat: "cant_do_that",
        somethingWentWrong: "something_went_wrong",
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
