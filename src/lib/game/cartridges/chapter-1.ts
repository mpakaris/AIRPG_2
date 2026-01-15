import type { Chapter, ChapterId, Flag, Game, GameId, GameObject, GameObjectId, Item, ItemId, Location, LocationId, NPC, NpcId, Portal, PortalId } from '../types';

// =====================================
// CHAPTER 1: ELM STREET INVESTIGATION
// =====================================
// Goal: Find 3 of 4 evidence pieces proving the abduction was staged
// Location: Elm Street, Bloodhaven
// Estimated Playtime: 90-120 minutes

// =====================================
// ITEMS
// =====================================

const items: Record<ItemId, Item> = {
    // ===== STARTING ITEMS (Player receives these at chapter start) =====

    'item_player_phone': {
        id: 'item_player_phone' as ItemId,
        name: 'Phone',
        alternateNames: ['smartphone', 'cell phone', 'mobile', 'fbi phone', 'my phone', 'fbi smartphone', 'cell', 'mobile phone'],
        archetype: 'Tool',
        description: "Your standard-issue FBI smartphone. It has a camera, secure messaging, and a slot for external media.",
        zone: 'personal', // Always accessible personal equipment
        capabilities: { isTakable: false, isReadable: false, isUsable: true, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        state: { currentStateId: 'default', readCount: 0 },
        media: {
            images: {
                default: { url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762705398/Pulls_out_Phone_zrekhi.png', description: 'FBI-issue smartphone', hint: 'fbi phone' }
            }
        },
        handlers: {
            // EXAMINE - Visual inspection
            onExamine: {
                success: {
                    message: "FBI-issue smartphone. Camera, secure messaging, media slot. Standard kit. Always in your pocket.\n\nYou can USE PHONE to enter phone mode and make calls or take photos."
                }
            },

            // USE - Enter phone mode
            onUse: {
                success: {
                    message: "You take out your FBI phone. The screen lights up.\n\nThe notification LED blinks - you have unread messages.",
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
                            content: 'Phone Mode Active\n\nType CHECK MESSAGES to see voicemails.\nType CHECK EMAILS to read emails.\nType CALL <number> to dial.\nType TAKE PHOTO of ITEM for pictures.\n\nType PUT PHONE AWAY or CLOSE PHONE when done.'
                        }
                    ]
                }
            },

            // Call Handler - Dial phone numbers (only works in device focus mode)
            onCall: [
                {
                    // Default fallback - wrong number (plays automated message)
                    phoneNumber: '*',
                    conditions: [],
                    success: {
                        message: "You dial the number.\n\n[Automated voice]: \"The number you have dialed is currently not available. Please check the number and try again.\"\n\nThe line goes dead.",
                        media: {
                            url: 'https://res.cloudinary.com/dg912bwcc/video/upload/v1762705354/wrong_number_kazuze.mp3',
                            description: 'Automated wrong number message',
                            hint: 'Number not available'
                        }
                    }
                }
            ],

            // Check Messages Handler
            onCheckMessages: [
                {
                    // Already checked messages
                    conditions: [
                        { type: 'HAS_ITEM', itemId: 'item_audio_message' as ItemId }
                    ],
                    success: {
                        message: "You've already listened to your voicemail. Sarah mentioned checking Elm Street for the gray van."
                    }
                },
                {
                    // First time checking - reveal voice message
                    conditions: [],
                    success: {
                        message: "You tap the voicemail icon.\n\n**(1) New Voicemail**\n\nFrom: Sarah Chen (Partner)\nReceived: Today, 8:47 AM\n\nYou play the message.",
                        effects: [
                            { type: 'ADD_ITEM', itemId: 'item_audio_message' as ItemId }
                        ]
                    }
                }
            ],

            // Check Emails Handler
            onCheckEmails: [
                {
                    // Default - no emails
                    conditions: [],
                    success: {
                        message: "You check your email inbox. Mostly spam and routine FBI updates. Nothing urgent.\n\nYou should focus on the voice message from Sarah about the gray van on Elm Street."
                    }
                }
            ],

            // Fallback
            defaultFailMessage: "The phone's a tool. Try USING it ON something that needs it, or CALL a phone number."
        },
        hints: {
            subtle: "Your FBI phone is a versatile tool. It can read media and take photos.",
            medium: "Use your phone to read documents, take photos of objects, or make calls.",
            direct: "Use phone to activate it, then take photos, read documents, or call phone numbers you find."
        },
        design: {
            authorNotes: "Universal tool/key for media devices and locked objects throughout the game.",
            tags: ['phone', 'device', 'tool', 'key']
        },
        version: { schema: "1.0", content: "3.0" }
    },

    'item_audio_message': {
        id: 'item_audio_message' as ItemId,
        name: 'Voice Message',
        alternateNames: ['voice message', 'audio message', 'voicemail', 'message', 'sarah message', 'sarah voice message'],
        description: 'A voice message from Sarah Chen about the gray van sighting.',
        zone: 'personal', // Received via phone - always accessible
        capabilities: { isTakable: false, isReadable: false, isUsable: false, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        revealMethod: 'MANUAL',
        media: {
            audio: {
                url: '',
                description: 'Sarah Chen briefing about gray van sighting'
            }
        },
        handlers: {
            onExamine: {
                success: {
                    message: 'Voice message from Sarah Chen:\n\n"Burt, I tried pulling CCTV from the bus station that night. Cameras were offline. All of them.\n\nI did find something though - a gray van shows up on Elm Street traffic cams. Repeatedly. For weeks before April 15th.\n\nMight be worth checking out. Be careful."\n\nThe message points you to Elm Street to investigate the gray van.',
                    media: {
                        url: '',
                        description: 'Sarah Chen briefing about gray van sighting',
                        hint: 'audio message'
                    }
                }
            }
        },
        version: { schema: '1.0.0', content: '3.0.0' }
    },

    'item_lili_photo': {
        id: 'item_lili_photo' as ItemId,
        name: 'Photo of Lili',
        alternateNames: ['lili photo', 'photo', 'lili picture', 'picture of lili', 'photograph'],
        archetype: 'Evidence',
        description: 'A recent photo of Lili sent by Sarah Chen. Shows Lili\'s face clearly - useful for showing to witnesses.',
        zone: 'personal', // Received via phone from Sarah - always accessible
        capabilities: { isTakable: false, isReadable: false, isUsable: false, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        revealMethod: 'MANUAL',
        tags: ['evidence', 'photo'],
        media: {
            images: {
                default: {
                    url: '',
                    description: 'Recent photo of Lili',
                    hint: 'photo of Lili'
                }
            }
        },
        handlers: {
            onExamine: {
                success: {
                    message: 'A recent photo of Lili that Sarah sent to your phone. Clear facial details, good for showing to potential witnesses.\n\nYou can SHOW this photo TO people you meet to see if they recognize her.',
                    media: {
                        url: '',
                        description: 'Recent photo of Lili',
                        hint: 'photo of Lili'
                    }
                }
            },
            onUse: {
                fail: {
                    message: 'This photo is for showing to witnesses. Try: SHOW PHOTO TO <person name>',
                    media: undefined
                }
            }
        },
        design: {
            authorNotes: "Starting evidence item. Player uses this to trigger Margaret Chen witness statement by showing photo to her. Part of Evidence 3 puzzle.",
            tags: ['starting-item', 'witness-trigger', 'evidence']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    // ===== EVIDENCE ITEMS (4 total - player needs 3 to complete chapter) =====

    'item_cctv_screenshot': {
        id: 'item_cctv_screenshot' as ItemId,
        name: 'CCTV Screenshot',
        alternateNames: ['screenshot', 'cctv photo', 'printed screenshot', 'photo', 'evidence photo'],
        archetype: 'Evidence',
        description: 'Printed screenshot from CCTV footage showing gray van with license plate LKJ-9472 on Elm Street, April 15, 6:15 PM.',
        zone: 'personal',
        parentId: 'obj_cctv_monitor_station' as GameObjectId,
        capabilities: { isTakable: true, isReadable: false, isUsable: false, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: true },
        revealMethod: 'REVEAL_FROM_PARENT',
        tags: ['evidence', 'photo', 'cctv'],
        media: {
            images: {
                default: {
                    url: '',
                    description: 'CCTV screenshot showing gray van, plate LKJ-9472',
                    hint: 'Evidence 1 - Van identification'
                }
            }
        },
        handlers: {
            onExamine: {
                success: {
                    message: 'A printed CCTV screenshot. Date stamp: April 15, 2026 - 6:15 PM. Location: Elm Street.\n\nThe image shows a gray cargo van parked on Elm Street. The license plate is clearly visible: **LKJ-9472**.\n\nThis is concrete proof that a gray van was operating on Elm Street at the exact time Lili claims you abducted her. But this isn\'t your vehicle.\n\nThe numeric portion of the plate - 9472 - might be useful. Security systems often use license plate numbers as access codes.',
                    media: {
                        url: '',
                        description: 'CCTV screenshot showing gray van, plate LKJ-9472',
                        hint: 'Evidence 1'
                    }
                }
            },
            onTake: {
                success: {
                    message: 'You take the printed CCTV screenshot. This is Evidence 1.\n\nLicense plate LKJ-9472 clearly visible. This proves a gray van was on Elm Street during the alleged abduction.',
                    media: undefined,
                    effects: [
                        { type: 'SET_FLAG', flag: 'found_evidence_1' as Flag }
                    ]
                }
            }
        },
        design: {
            authorNotes: "EVIDENCE 1 (EASY) - Found at CCTV Control Building. Provides license plate LKJ-9472. Numeric portion '9472' is PIN for Garage #3 (Evidence 2 location).",
            tags: ['evidence-1', 'cctv', 'pin-source']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'item_van_registration': {
        id: 'item_van_registration' as ItemId,
        name: 'Van Registration Card',
        alternateNames: ['registration', 'registration card', 'van registration', 'vehicle registration'],
        archetype: 'Evidence',
        description: 'Vehicle registration card for gray van (plate LKJ-9472). Owner: Jeremy Miller, 447 Willow Lane, Bloodhaven.',
        zone: 'personal',
        capabilities: { isTakable: true, isReadable: true, isUsable: false, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: true },
        revealMethod: 'MANUAL',
        tags: ['evidence', 'document', 'registration'],
        media: {
            images: {
                default: {
                    url: '',
                    description: 'Vehicle registration card',
                    hint: 'Evidence 2 - Owner identification'
                }
            }
        },
        handlers: {
            onExamine: {
                success: {
                    message: 'Vehicle registration card. Official state document.\n\n**Vehicle**: 2024 Chevrolet Express Cargo Van\n**Color**: Gray\n**License Plate**: LKJ-9472\n**VIN**: 1GCWGAFG8K1234567\n\n**Registered Owner**:\nJeremy Miller\n447 Willow Lane\nBloodhaven, USA\n\nThis registration proves who owns the van that was operating on Elm Street during Lili\'s alleged abduction.\n\nJeremy Miller. 447 Willow Lane. That address sounds familiar... you\'ll need to investigate it.',
                    media: {
                        url: '',
                        description: 'Vehicle registration card',
                        hint: 'Evidence 2'
                    }
                }
            },
            onRead: {
                success: {
                    message: 'You read the registration card:\n\n**VEHICLE REGISTRATION**\nState Registration #: VR-2024-847392\n\nVehicle: 2024 Chevrolet Express Cargo Van (Gray)\nPlate: LKJ-9472\nVIN: 1GCWGAFG8K1234567\n\nOwner: Jeremy Miller\nAddress: 447 Willow Lane, Bloodhaven\n\nIssued: March 12, 2024\nExpires: March 12, 2026\n\nThis identifies the van owner and provides a lead: 447 Willow Lane.',
                    media: undefined
                }
            },
            onTake: {
                success: {
                    message: 'You take the vehicle registration card. This is Evidence 2.\n\nOwner: Jeremy Miller, 447 Willow Lane. This gives you a suspect name and address to investigate.',
                    media: undefined,
                    effects: [
                        { type: 'SET_FLAG', flag: 'found_evidence_2' as Flag }
                    ]
                }
            }
        },
        design: {
            authorNotes: "EVIDENCE 2 (HARD) - Found in Garage #3 glove compartment. Requires solving Alley secret door + using PIN 9472 from Evidence 1. Provides suspect name (Jeremy Miller) and address (447 Willow Lane) for future chapters.",
            tags: ['evidence-2', 'registration', 'suspect-identification']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'item_witness_statement_audio': {
        id: 'item_witness_statement_audio' as ItemId,
        name: 'Recorded Witness Statement',
        alternateNames: ['witness statement', 'audio recording', 'recording', 'margaret statement', 'statement'],
        archetype: 'Evidence',
        description: 'Audio recording of Margaret Chen\'s witness statement about seeing Lili with an obsessed young man.',
        zone: 'personal',
        capabilities: { isTakable: false, isReadable: false, isUsable: false, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        revealMethod: 'MANUAL',
        tags: ['evidence', 'audio', 'witness'],
        media: {
            audio: {
                url: '',
                description: 'Margaret Chen witness statement recording'
            }
        },
        handlers: {
            onExamine: {
                success: {
                    message: 'You review the audio recording on your phone.\n\n**Witness Statement - Margaret Chen**\nRecorded: Today\nLocation: Petal & Stem Florist, Elm Street\n\n[PLAY RECORDING]\n\nMargaret Chen: "My name is Margaret Chen, owner of Petal & Stem Florist on Elm Street. I\'ve seen the woman in this photo - Lili - multiple times over the past two months. She always came with a young man who appeared obsessively devoted to her. She seemed detached, calculating even, but he would do anything she asked. The way he looked at her... it was obsession."\n\n[END RECORDING]\n\nThis statement proves Lili had a relationship with a young man who was obsessed with her. Evidence of collaboration, not abduction.',
                    media: {
                        url: '',
                        description: 'Margaret Chen witness statement',
                        hint: 'Evidence 3'
                    }
                }
            }
        },
        design: {
            authorNotes: "EVIDENCE 3 (MEDIUM) - Obtained by showing Lili's photo to Margaret Chen at Florist Shop. Proves Lili had relationship with obsessed young man, suggesting collaboration not abduction.",
            tags: ['evidence-3', 'witness', 'audio', 'relationship-proof']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'item_hardware_receipt': {
        id: 'item_hardware_receipt' as ItemId,
        name: 'Hardware Store Receipt',
        alternateNames: ['receipt', 'hardware receipt', 'store receipt', 'paper receipt'],
        archetype: 'Evidence',
        description: 'Receipt from hardware store dated April 10, 2026. Purchased by J. Miller: zip ties, duct tape, drop cloth.',
        zone: 'personal',
        parentId: 'obj_electrician_toolbox' as GameObjectId,
        capabilities: { isTakable: true, isReadable: true, isUsable: false, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: true },
        revealMethod: 'REVEAL_FROM_PARENT',
        tags: ['evidence', 'document', 'receipt'],
        media: {
            images: {
                default: {
                    url: '',
                    description: 'Hardware store receipt',
                    hint: 'Evidence 4 - Premeditation proof'
                }
            }
        },
        handlers: {
            onExamine: {
                success: {
                    message: 'A crumpled hardware store receipt. You smooth it out and read the details.\n\n**ACE HARDWARE - BLOODHAVEN**\nReceipt #: 84729\nDate: April 10, 2026 - 3:42 PM\n\n**Items Purchased**:\n- Zip Ties (Heavy Duty, 50-pack) ... $12.99\n- Duct Tape (Industrial, 2-pack) ... $8.49\n- Drop Cloth (Plastic, 9x12) ... $6.99\n\n**Subtotal**: $28.47\n**Tax**: $2.28\n**Total**: $30.75\n\n**Payment**: Credit Card ending in 4429\n**Cardholder**: J. Miller\n\nThis receipt is dated April 10th - five days before Lili\'s alleged abduction on April 15th.\n\nSomeone named "J. Miller" bought abduction supplies in advance. This proves premeditation. And if the registration card is correct, J. Miller is Jeremy Miller - the van owner.',
                    media: {
                        url: '',
                        description: 'Hardware store receipt',
                        hint: 'Evidence 4'
                    }
                }
            },
            onRead: {
                success: {
                    message: 'You read the receipt carefully:\n\n**ACE HARDWARE**\nApril 10, 2026\n\nZip Ties (Heavy Duty) - $12.99\nDuct Tape (Industrial) - $8.49\nDrop Cloth (Plastic) - $6.99\n\nTotal: $30.75\nCard: J. Miller (ending 4429)\n\nAbduction supplies bought 5 days before the incident. Proof of premeditation.',
                    media: undefined
                }
            },
            onTake: {
                success: {
                    message: 'You take the hardware store receipt. This is Evidence 4.\n\nPurchased by J. Miller on April 10th - 5 days before the alleged abduction. Clear proof of premeditation.',
                    media: undefined,
                    effects: [
                        { type: 'SET_FLAG', flag: 'found_evidence_4' as Flag }
                    ]
                }
            }
        },
        design: {
            authorNotes: "EVIDENCE 4 (MEDIUM) - Found in Electrician's truck toolbox (requires distraction puzzle). Date is April 10 (5 days before incident). Name 'J. Miller' matches van registration owner (Jeremy Miller), proving connection.",
            tags: ['evidence-4', 'receipt', 'premeditation-proof']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    // ===== TOOL ITEMS (Collectible tools for puzzles and access) =====

    'item_crowbar': {
        id: 'item_crowbar' as ItemId,
        name: 'Crowbar',
        alternateNames: ['pry bar', 'steel crowbar', 'bar'],
        archetype: 'Tool',
        description: 'A heavy steel crowbar. Rust-spotted but still solid. Good for prying things open.',
        zone: 'personal',
        parentId: 'obj_electrician_toolbox' as GameObjectId,
        capabilities: { isTakable: true, isReadable: false, isUsable: true, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: true },
        revealMethod: 'REVEAL_FROM_PARENT',
        attributes: {
            force: 5,
            prying: 5,
            reusable: true
        },
        tags: ['tool', 'prying'],
        handlers: {
            onExamine: {
                success: {
                    message: 'Two feet of solid steel. A crowbar - the kind you find in toolboxes, garages, construction sites. One end curves into a claw for pulling nails. The other tapers to a flat wedge for prying.\n\nThe steel is rust-spotted, oxidation blooming in orange patches where the protective coating wore away. But underneath, it\'s still sound. Solid. This thing could pry open a door, lever up floorboards, shift heavy objects.\n\nIt\'s heavy. Maybe three, four pounds. The cold metal warms slowly in your hand.\n\nUseful for forcing open locked doors, containers, or anything that needs leverage.',
                    media: undefined
                }
            },
            onUse: {
                fail: {
                    message: 'The crowbar is a tool for leverage - prying, lifting, shifting heavy objects. You need to specify what to use it on.',
                    media: undefined
                }
            },
            onTake: {
                success: {
                    message: 'You take the crowbar. Cold steel. Three, maybe four pounds of rust-spotted persuasion.\n\nIt\'s yours now. A tool for when finesse fails and force is required.',
                    media: undefined
                }
            }
        },
        design: {
            authorNotes: "Found in Electrician's truck toolbox. Use to pry open locked containers, filing cabinets, doors. Alternative to lock pick set for some puzzles.",
            tags: ['tool', 'prying', 'force']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'item_wire_cutters': {
        id: 'item_wire_cutters' as ItemId,
        name: 'Wire Cutters',
        alternateNames: ['cutters', 'pliers', 'wire pliers'],
        archetype: 'Tool',
        description: 'Professional-grade wire cutters with rubber grips. Sharp blades for cutting cables and wires.',
        zone: 'personal',
        parentId: 'obj_electrician_toolbox' as GameObjectId,
        capabilities: { isTakable: true, isReadable: false, isUsable: true, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        revealMethod: 'REVEAL_FROM_PARENT',
        attributes: {
            cutting: 3,
            reusable: true
        },
        tags: ['tool', 'cutting'],
        handlers: {
            onExamine: {
                success: {
                    message: 'Professional wire cutters. Red rubber grips. Sharp hardened steel blades designed for cutting electrical cables, wires, and thin metal.\n\nThe kind electricians carry. Compact, functional, reliable.\n\nUseful for cutting through wiring, opening electrical panels, or bypassing wire-based locks.',
                    media: undefined
                }
            },
            onUse: {
                fail: {
                    message: 'Wire cutters are for cutting cables and wires. You need to specify what to cut.',
                    media: undefined
                }
            },
            onTake: {
                success: {
                    message: 'You take the wire cutters. Professional-grade tool. Could be useful for electrical panels or wire-based locks.',
                    media: undefined
                }
            }
        },
        design: {
            authorNotes: "Found in Electrician's truck. Required for Alley electrical panel puzzle (secret door to garages).",
            tags: ['tool', 'wire-cutting', 'electrical']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'item_lock_pick_set': {
        id: 'item_lock_pick_set' as ItemId,
        name: 'Lock Pick Set',
        alternateNames: ['lock picks', 'picks', 'lockpick set', 'pick set'],
        archetype: 'Tool',
        description: 'Professional lock picking set in a leather case. Contains various picks and tension wrenches.',
        zone: 'personal',
        parentId: 'obj_electrician_toolbox' as GameObjectId,
        capabilities: { isTakable: true, isReadable: false, isUsable: true, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        revealMethod: 'REVEAL_FROM_PARENT',
        attributes: {
            unlocking: 5,
            reusable: true
        },
        tags: ['tool', 'lockpicking', 'permanent'],
        handlers: {
            onExamine: {
                success: {
                    message: 'A professional lock picking set. Black leather case containing an array of stainless steel picks:\n\n- Hook picks (various angles)\n- Rake picks (for speed picking)\n- Diamond picks (for precision)\n- Tension wrenches (multiple sizes)\n\nFBI standard issue for field agents. You\'ve been trained to use these.\n\nUseful for opening mechanical locks, padlocks, door locks, filing cabinets - any standard pin tumbler lock.',
                    media: undefined
                }
            },
            onUse: {
                fail: {
                    message: 'Lock picks require a target. Specify what lock you want to pick.',
                    media: undefined
                }
            },
            onTake: {
                success: {
                    message: 'You take the lock pick set. FBI standard issue. You\'ve used these countless times.\n\nA permanent tool for opening mechanical locks throughout your investigation.',
                    media: undefined
                }
            }
        },
        design: {
            authorNotes: "PERMANENT TOOL - Found in Electrician's truck. Opens mechanical locks via minigame. Used throughout game for padlocks, doors, filing cabinets, etc.",
            tags: ['tool', 'permanent', 'lockpicking']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'item_bolt_cutters': {
        id: 'item_bolt_cutters' as ItemId,
        name: 'Bolt Cutters',
        alternateNames: ['cutters', 'heavy cutters', 'chain cutters'],
        archetype: 'Tool',
        description: 'Heavy-duty bolt cutters with long handles. Designed for cutting chains and heavy padlocks.',
        zone: 'personal',
        capabilities: { isTakable: true, isReadable: false, isUsable: true, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        revealMethod: 'MANUAL',
        attributes: {
            force: 8,
            cutting: 8,
            reusable: true
        },
        tags: ['tool', 'heavy', 'cutting'],
        handlers: {
            onExamine: {
                success: {
                    message: 'Heavy-duty bolt cutters. Three-foot handles provide massive leverage. Hardened steel blades designed to cut through chains, padlocks, metal bars, fencing.\n\nThe kind of tool that doesn\'t ask permission - it just takes what it wants.\n\nUseful for cutting chains, breaking padlocks, or getting through chain-link fences.',
                    media: undefined
                }
            },
            onUse: {
                fail: {
                    message: 'Bolt cutters are for cutting heavy metal - chains, padlocks, fences. Specify what you want to cut.',
                    media: undefined
                }
            },
            onTake: {
                success: {
                    message: 'You take the bolt cutters. Heavy. Solid. The kind of tool that solves problems through sheer force.\n\nUseful for chains, padlocks, and anything else that needs cutting.',
                    media: undefined
                }
            }
        },
        design: {
            authorNotes: "Found at Butcher Shop (Klaus gives freely). Use to cut chains at Hidden Garages, CCTV fence, or as alternative to other lock methods.",
            tags: ['tool', 'force', 'chain-cutting']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'item_safety_vest': {
        id: 'item_safety_vest' as ItemId,
        name: 'Safety Vest',
        alternateNames: ['vest', 'reflective vest', 'high vis vest', 'safety jacket'],
        archetype: 'Tool',
        description: 'Bright orange reflective safety vest. Required for construction site access.',
        parentId: 'obj_construction_tool_shed' as GameObjectId,
        capabilities: { isTakable: true, isReadable: false, isUsable: true, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        revealMethod: 'REVEAL_FROM_PARENT',
        attributes: {
            protective: true,
            reusable: true
        },
        tags: ['safety', 'wearable'],
        handlers: {
            onExamine: {
                success: {
                    message: 'A bright orange safety vest with reflective silver stripes. Standard construction site gear. Velcro straps at the sides for adjustment.\n\nLabel reads: "HIGH VISIBILITY SAFETY APPAREL - CLASS 2"\n\nRequired for entering active construction sites.',
                    media: undefined
                }
            },
            onUse: {
                success: {
                    message: 'You put on the safety vest. The reflective stripes catch the light.\n\nYou look official now. Ready for construction zones.',
                    media: undefined,
                    effects: [
                        { type: 'SET_FLAG', flag: 'wearing_safety_vest' as Flag }
                    ]
                }
            },
            onTake: {
                success: {
                    message: 'You take the safety vest. Bright orange. Highly visible. Might help you blend in at construction sites.',
                    media: undefined
                }
            }
        },
        design: {
            authorNotes: "Found in Construction tool shed. Required (with hard hat) for Construction site access.",
            tags: ['safety', 'construction', 'access']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    // ===== MULTI-PART DRILL (3 parts must be combined) =====

    'item_drill_body': {
        id: 'item_drill_body' as ItemId,
        name: 'Drill Body',
        alternateNames: ['drill', 'power drill body', 'drill frame'],
        archetype: 'Tool',
        description: 'Cordless drill body (Part 1/3). Missing battery and drill bit.',
        zone: 'personal',
        parentId: 'obj_electrician_toolbox' as GameObjectId,
        capabilities: { isTakable: true, isReadable: false, isUsable: false, isCombinable: true, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        revealMethod: 'REVEAL_FROM_PARENT',
        tags: ['tool', 'incomplete', 'drill-part'],
        handlers: {
            onExamine: {
                success: {
                    message: 'A cordless drill body. Black plastic housing with trigger and speed control. Brand: DeWalt.\n\nBut it\'s incomplete:\n- Battery slot is empty (needs battery pack)\n- Chuck is empty (needs drill bit)\n\nYou need to find the battery and drill bit to make this functional.\n\nOnce assembled, this drill could bore through locks, metal plates, or wood barriers.',
                    media: undefined
                }
            },
            onTake: {
                success: {
                    message: 'You take the drill body. Part 1 of 3. Still need battery and drill bit.',
                    media: undefined
                }
            }
        },
        design: {
            authorNotes: "PART 1/3 - Found in Electrician's truck. Combine with battery (Construction) and bit (Construction office) to make functional drill. Use on Garage #3 lock as alternative to PIN.",
            tags: ['drill-part', 'combinable']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'item_drill_battery': {
        id: 'item_drill_battery' as ItemId,
        name: 'Drill Battery',
        alternateNames: ['battery', 'battery pack', 'power battery', 'drill battery pack'],
        archetype: 'Tool',
        description: 'Rechargeable battery pack for cordless drill (Part 2/3).',
        zone: 'personal',
        parentId: 'obj_construction_tool_shed' as GameObjectId,
        capabilities: { isTakable: true, isReadable: false, isUsable: false, isCombinable: true, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        revealMethod: 'REVEAL_FROM_PARENT',
        tags: ['tool', 'incomplete', 'drill-part'],
        handlers: {
            onExamine: {
                success: {
                    message: 'A rechargeable lithium-ion battery pack. DeWalt 20V MAX.\n\nFour green LEDs indicate full charge. This would power a cordless drill.\n\nBut you still need the drill body and a drill bit to make it useful.',
                    media: undefined
                }
            },
            onTake: {
                success: {
                    message: 'You take the drill battery. Part 2 of 3. Fully charged and ready.',
                    media: undefined
                }
            }
        },
        design: {
            authorNotes: "PART 2/3 - Found in Construction tool shed (requires code 1987 from street sign). Combine with drill body and bit.",
            tags: ['drill-part', 'combinable']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'item_drill_bit': {
        id: 'item_drill_bit' as ItemId,
        name: 'Drill Bit',
        alternateNames: ['bit', 'metal bit', 'drill attachment'],
        archetype: 'Tool',
        description: 'Heavy-duty metal drill bit (Part 3/3). For drilling through locks or metal.',
        zone: 'personal',
        parentId: 'obj_construction_office_trailer' as GameObjectId,
        capabilities: { isTakable: true, isReadable: false, isUsable: false, isCombinable: true, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        revealMethod: 'REVEAL_FROM_PARENT',
        tags: ['tool', 'incomplete', 'drill-part'],
        handlers: {
            onExamine: {
                success: {
                    message: 'A heavy-duty drill bit. Hardened steel. Designed for drilling through metal locks, hinges, or plates.\n\nThe cutting edges are sharp and intact. This bit could bore through a padlock shackle or door hinge.\n\nBut you need the drill body and battery to use it.',
                    media: undefined
                }
            },
            onTake: {
                success: {
                    message: 'You take the drill bit. Part 3 of 3. Sharp and ready for metal drilling.',
                    media: undefined
                }
            }
        },
        design: {
            authorNotes: "PART 3/3 - Found in Construction office trailer. Combine all 3 parts (body + battery + bit) to create functional drill. Use drill on Garage #3 as alternative unlock method.",
            tags: ['drill-part', 'combinable']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    // ===== BUS STOP PUZZLE ITEMS =====

    'item_bus_ticket': {
        id: 'item_bus_ticket' as ItemId,
        name: 'Bus Ticket',
        alternateNames: ['ticket', 'old ticket', 'bus pass', 'transit ticket'],
        archetype: 'Evidence',
        description: 'An old bus ticket with a long serial number printed on it.',
        parentId: 'obj_bus_trash_bin' as GameObjectId,
        capabilities: { isTakable: true, isReadable: true, isUsable: false, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: true },
        revealMethod: 'REVEAL_FROM_PARENT',
        tags: ['puzzle', 'bus-stop', 'payphone-code'],
        media: {
            images: {
                default: {
                    url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1/bus-ticket-activation-code',
                    description: 'Old bus ticket with activation code serial number',
                    hint: 'Payphone activation code'
                }
            }
        },
        handlers: {
            onExamine: {
                success: {
                    message: 'An old bus ticket, crumpled and stained. Route 47 - dated weeks ago.\n\nAcross the bottom, a long serial number is printed:\n\n**SERIAL: A-B-C-D-A-C-B-D**\n\n8 characters. All letters A through D.',
                    media: undefined
                }
            },
            onRead: {
                success: {
                    message: 'You examine the bus ticket closely.\n\n**BLOODHAVEN TRANSIT AUTHORITY**\nRoute 47 - Downtown\nDate: March 28, 2026\nFare: $2.75\n\n**SERIAL NUMBER:**\n**A-B-C-D-A-C-B-D**',
                    media: {
                        url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1/bus-ticket-activation-code',
                        description: 'Bus ticket showing serial number: A-B-C-D-A-C-B-D'
                    }
                }
            },
            onTake: {
                success: {
                    message: 'You take the bus ticket.',
                    media: undefined,
                    effects: [
                        { type: 'SET_FLAG', flag: 'found_payphone_activation_code' as Flag, value: true }
                    ]
                }
            }
        },
        design: {
            authorNotes: "Payphone puzzle item 1/2. Found in bus stop trash bin. Contains activation sequence A-B-C-D-A-C-B-D which must be translated via bus schedule (colors) and keypad (numbers).",
            tags: ['payphone-puzzle', 'cipher', 'bus-stop']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'item_quarter': {
        id: 'item_quarter' as ItemId,
        name: 'Quarter',
        alternateNames: ['coin', '25 cents', 'change', 'quarter dollar'],
        archetype: 'Currency',
        description: 'A dirty quarter. Twenty-five cents. Enough for one payphone call.',
        parentId: 'obj_bus_bench' as GameObjectId,
        capabilities: { isTakable: true, isReadable: false, isUsable: true, isCombinable: false, isConsumable: true, isScannable: false, isAnalyzable: false, isPhotographable: false },
        revealMethod: 'REVEAL_FROM_PARENT',
        tags: ['currency', 'consumable', 'payphone'],
        handlers: {
            onExamine: {
                success: {
                    message: 'A quarter. 1998 issue. George Washington\'s profile worn smooth from years of circulation.\n\nTwenty-five cents. The price of a payphone call, back when payphones still existed.',
                    media: undefined
                }
            },
            onTake: {
                success: {
                    message: 'You take the quarter. Clean and functional. One payphone call\'s worth of currency.',
                    media: undefined,
                    effects: [
                        { type: 'SET_FLAG', flag: 'has_payphone_quarter' as Flag, value: true }
                    ]
                }
            }
        },
        design: {
            authorNotes: "Payphone puzzle item 2/2. Required to make calls from payphone after activation. Hidden under bench leg - player must move bench to reveal.",
            tags: ['payphone-puzzle', 'currency', 'consumable']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'item_soda_can': {
        id: 'item_soda_can' as ItemId,
        name: 'Soda Can',
        alternateNames: ['can', 'cola can', 'empty can', 'crushed can'],
        archetype: 'Junk',
        description: 'A crushed aluminum can. Generic brand cola. Empty.',
        parentId: 'obj_bus_trash_bin' as GameObjectId,
        capabilities: { isTakable: true, isReadable: false, isUsable: false, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        revealMethod: 'REVEAL_FROM_PARENT',
        tags: ['junk', 'red-herring'],
        handlers: {
            onExamine: {
                success: {
                    message: 'Generic brand cola. The aluminum is crushed flat. Someone stepped on it.\n\nSticky residue on the rim. No fingerprints - too degraded. Just trash.',
                    media: undefined
                }
            },
            onTake: {
                success: {
                    message: 'You take the crushed soda can. Not sure why. Force of habit - investigating everything.',
                    media: undefined
                }
            }
        },
        design: {
            authorNotes: "Red herring item. Makes trash bin feel more realistic and adds clutter to item list. No puzzle value.",
            tags: ['red-herring', 'trash', 'bus-stop']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'item_food_wrapper': {
        id: 'item_food_wrapper' as ItemId,
        name: 'Food Wrapper',
        alternateNames: ['wrapper', 'candy wrapper', 'chip bag', 'snack wrapper'],
        archetype: 'Junk',
        description: 'A greasy food wrapper. Chips, maybe. Crumpled and stained.',
        parentId: 'obj_bus_trash_bin' as GameObjectId,
        capabilities: { isTakable: true, isReadable: false, isUsable: false, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        revealMethod: 'REVEAL_FROM_PARENT',
        tags: ['junk', 'red-herring'],
        handlers: {
            onExamine: {
                success: {
                    message: 'Greasy wrapper. Potato chips - "BBQ Blast" flavor. The bag is torn open, crumbs stuck to the inside.\n\nSmells like artificial smoke flavoring and regret. Just trash.',
                    media: undefined
                }
            },
            onTake: {
                success: {
                    message: 'You take the food wrapper. Your hands are now slightly greasy. Great.',
                    media: undefined
                }
            }
        },
        design: {
            authorNotes: "Red herring item. Adds realism to trash bin contents and creates decision fatigue. No puzzle value.",
            tags: ['red-herring', 'trash', 'bus-stop']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    // ===== CONSTRUCTION SITE ITEMS =====

    'item_pliers': {
        id: 'item_pliers' as ItemId,
        name: 'Pliers',
        alternateNames: ['pliers', 'pair of pliers', 'cutting pliers', 'wire cutters', 'cutters', 'tool'],
        archetype: 'Tool',
        description: 'Heavy-duty cutting pliers with red rubber grips. Broken - missing spring mechanism.',
        parentId: 'obj_construction_scaffolding' as GameObjectId,
        capabilities: { isTakable: true, isReadable: false, isUsable: true, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        revealMethod: 'REVEAL_FROM_PARENT',
        attributes: {
            cutting: true,
            reusable: true
        },
        tags: ['tool', 'cutting', 'repairable'],
        handlers: {
            // EXAMINE - Shows repair state
            onExamine: [
                {
                    // REPAIRED STATE: Functional pliers
                    conditions: [
                        { type: 'HAS_FLAG', flag: 'pliers_repaired' as Flag }
                    ],
                    success: {
                        message: 'Heavy-duty cutting pliers. Red rubber grips, worn from use. The cutting edge looks sharp - designed for wire, cable ties, zip-ties.\n\nThe handles have good tension - the spring mechanism is working perfectly. These will cut through plastic, wire, anything light-duty.\n\nReady to use.',
                        media: undefined
                    }
                },
                {
                    // BROKEN STATE: Missing spring (default)
                    conditions: [],
                    success: {
                        message: 'Heavy-duty cutting pliers. Red rubber grips, worn from use. The cutting edge looks sharp - designed for wire, cable ties, zip-ties.\n\nBut the handles move freely without resistance. The spring mechanism is missing from the hinge. Without tension, the cutting edges won\'t close properly.\n\nYou\'d need to repair them before they\'re useful.',
                        media: undefined
                    }
                }
            ],
            // USE - Repair with spring
            onUse: [
                {
                    itemId: 'item_spring' as ItemId,
                    conditions: [
                        { type: 'HAS_ITEM', itemId: 'item_spring' as ItemId }
                    ],
                    success: {
                        message: 'You position the coiled spring at the hinge point. Push it into the slot. It clicks into place.\n\nYou test the handles - they snap back now. Spring tension restored. The cutting edges align perfectly when you squeeze.\n\nThe pliers are functional. Ready to cut.',
                        media: undefined,
                        effects: [
                            { type: 'SET_FLAG', flag: 'pliers_repaired' as Flag, value: true },
                            { type: 'REMOVE_ITEM', itemId: 'item_spring' as ItemId }
                        ]
                    },
                    fail: {
                        message: 'The pliers are broken. The spring mechanism is missing. You need to find a replacement spring to repair them.'
                    }
                }
            ],
            // TAKE - Different messages based on repair state
            onTake: [
                {
                    // Already repaired
                    conditions: [
                        { type: 'HAS_FLAG', flag: 'pliers_repaired' as Flag }
                    ],
                    success: {
                        message: 'You take the pliers. Functional cutting tool. Ready to use.',
                        media: undefined
                    }
                },
                {
                    // Broken (default)
                    conditions: [],
                    success: {
                        message: 'You take the pliers. Heavy, but the handles move too freely - broken. Might still be useful if you can repair them.',
                        media: undefined
                    }
                }
            ]
        },
        design: {
            authorNotes: "Found on scaffolding. BROKEN by default (pliers_repaired=false). USE SPRING ON PLIERS to repair (sets pliers_repaired=true). Then USE PLIERS ON ZIP-TIES to free hard hat.",
            tags: ['tool', 'puzzle', 'construction', 'repairable']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'item_spring': {
        id: 'item_spring' as ItemId,
        name: 'Spring',
        alternateNames: ['coil spring', 'metal spring', 'coiled spring', 'tension spring', 'pliers spring'],
        archetype: 'Tool',
        description: 'Small coiled metal spring. Looks like a replacement part for tool mechanisms.',
        parentId: 'obj_construction_scaffolding' as GameObjectId,
        capabilities: { isTakable: true, isReadable: false, isUsable: true, isCombinable: false, isConsumable: true, isScannable: false, isAnalyzable: false, isPhotographable: false },
        revealMethod: 'REVEAL_FROM_PARENT',
        tags: ['spare-part', 'consumable'],
        handlers: {
            onExamine: {
                success: {
                    message: 'Small coiled metal spring. About an inch long, tightly wound. The kind used in tool mechanisms to provide tension - hinges, grips, cutting tools.\n\nIt\'s a spare part. Someone must have dropped it during repairs.',
                    media: undefined
                }
            },
            onUse: [
                {
                    // USE spring ON pliers (reciprocal handler)
                    itemId: 'item_pliers' as ItemId,
                    conditions: [
                        { type: 'HAS_ITEM', itemId: 'item_pliers' as ItemId }
                    ],
                    success: {
                        message: 'You position the coiled spring at the hinge point. Push it into the slot. It clicks into place.\n\nYou test the handles - they snap back now. Spring tension restored. The cutting edges align perfectly when you squeeze.\n\nThe pliers are functional. Ready to cut.',
                        media: undefined,
                        effects: [
                            { type: 'SET_FLAG', flag: 'pliers_repaired' as Flag, value: true },
                            { type: 'REMOVE_ITEM', itemId: 'item_spring' as ItemId }
                        ]
                    },
                    fail: {
                        message: 'You need pliers to attach the spring to.'
                    }
                }
            ],
            onTake: {
                success: {
                    message: 'You take the spring. Small, but it might repair something that needs tension.',
                    media: undefined
                }
            }
        },
        design: {
            authorNotes: "Consumable repair part for pliers. USE SPRING ON PLIERS to fix broken tool.",
            tags: ['spare-part', 'construction', 'consumable']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'item_hard_hat': {
        id: 'item_hard_hat' as ItemId,
        name: 'Hard Hat',
        alternateNames: ['hardhat', 'helmet', 'construction hat', 'safety helmet', 'hat', 'yellow hat'],
        archetype: 'Tool',
        description: 'Yellow hard hat with adjustment straps. Required for construction site access.',
        parentId: 'obj_scaffolding_zip_ties' as GameObjectId,
        capabilities: { isTakable: true, isReadable: false, isUsable: true, isCombinable: false, isConsumable: false, isScannable: false, isAnalyzable: false, isPhotographable: false },
        revealMethod: 'REVEAL_FROM_PARENT',
        attributes: {
            protective: true,
            reusable: true
        },
        tags: ['safety', 'wearable', 'construction'],
        handlers: {
            onExamine: {
                success: {
                    message: 'A bright yellow hard hat. Standard construction safety equipment. Plastic shell with foam padding inside. Adjustment straps for fitting.\n\nSticker on the side reads: "SAFETY FIRST - NO HAT, NO ENTRY"\n\nRequired for entering active construction sites.',
                    media: undefined
                }
            },
            onUse: {
                success: {
                    message: 'You put on the hard hat. It fits snugly.\n\nYou look like you belong on a construction site now. Tony might let you in.',
                    media: undefined,
                    effects: [
                        { type: 'SET_FLAG', flag: 'wearing_hard_hat' as Flag, value: true }
                    ]
                }
            },
            onTake: {
                success: {
                    message: 'You take the hard hat. Yellow, sturdy. Might be useful for accessing construction areas.',
                    media: undefined
                }
            }
        },
        design: {
            authorNotes: "Secured to scaffolding with zip-ties. Player must cut zip-ties with repaired pliers first. Required for Construction site access. Must WEAR (use) to satisfy foreman Tony Greco.",
            tags: ['safety', 'construction', 'access', 'wearable']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    }
};

// ===== GAME OBJECTS =====
const gameObjects: Record<GameObjectId, GameObject> = {
    // ===== ZONE 0: ELM STREET (Hub - Flavor Objects) =====

    'obj_streetlight': {
        id: 'obj_streetlight' as GameObjectId,
        name: 'Streetlight',
        alternateNames: ['light', 'lamp', 'street lamp', 'lamppost'],
        description: 'A tall streetlight casting orange sodium glow across the sidewalk. Flickering. The bulb needs replacing.',
        locationId: 'loc_elm_street' as LocationId,
        archetype: 'LightSource',
        state: { currentStateId: 'default' },
        capabilities: { container: false, lockable: false, movable: false, breakable: false },
        revealMethod: 'AUTO',
        handlers: {
            onExamine: {
                success: {
                    message: "Old sodium lamp. Orange glow, the kind that turns everything sickly. Flickers every few seconds. The city hasn't replaced these in years. Cheaper to let them die slow.\n\nThe bulb buzzes. Ticking down to darkness.",
                    media: undefined
                }
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_sidewalk': {
        id: 'obj_sidewalk' as GameObjectId,
        name: 'Sidewalk',
        alternateNames: ['pavement', 'concrete', 'ground', 'walkway'],
        description: 'Cracked concrete. Gum stains and old graffiti tags.',
        locationId: 'loc_elm_street' as LocationId,
        archetype: 'Surface',
        state: { currentStateId: 'default' },
        capabilities: { container: false, lockable: false, movable: false, breakable: false },
        revealMethod: 'AUTO',
        handlers: {
            onExamine: {
                success: {
                    message: "Concrete worn smooth by years of foot traffic. Cracks spider-web across the surface. Weeds push through, stubborn.\n\nGum stains. Spray paint tags - gang symbols, phone numbers, crude drawings. The usual urban archaeology.",
                    media: undefined
                }
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_street_sign': {
        id: 'obj_street_sign' as GameObjectId,
        name: 'Street Sign',
        alternateNames: ['sign', 'elm street sign', 'street marker'],
        description: 'Green metal sign: "ELM STREET - EST. 1987"',
        locationId: 'loc_elm_street' as LocationId,
        archetype: 'Signage',
        state: { currentStateId: 'default' },
        capabilities: { container: false, lockable: false, movable: false, breakable: false },
        revealMethod: 'AUTO',
        handlers: {
            onExamine: {
                success: {
                    message: "Green metal sign bolted to the lamppost.\n\n**ELM STREET**\nEst. 1987\n\nThe establishment year stands out. 1987. Four digits. The kind of number people use for combination locks.\n\nYou make a mental note.",
                    media: undefined
                }
            }
        },
        design: {
            authorNotes: "Provides hint for Construction tool shed combination lock (code: 1987)",
            tags: ['puzzle-hint', 'combination-code']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_florist_door': {
        id: 'obj_florist_door' as GameObjectId,
        name: 'Florist Shop Door',
        alternateNames: ['florist door', 'flower shop door', 'glass door', 'door', 'chen\'s door'],
        description: 'Glass door with gold lettering: "Chen\'s Flowers". Wind chimes hang above.',
        locationId: 'loc_florist_exterior' as LocationId,
        archetype: 'Portal',
        state: { currentStateId: 'closed' },
        capabilities: { container: false, lockable: false, movable: false, breakable: false },
        revealMethod: 'AUTO',
        handlers: {
            onExamine: [
                {
                    // Door is open
                    conditions: [{ type: 'FLAG', flag: 'florist_door_open' as Flag }],
                    success: {
                        message: "The glass door stands open. Wind chimes sway gently in the breeze. The scent of roses drifts out onto the street.\n\nThrough the doorway you can see Margaret Chen arranging flowers inside.",
                        media: undefined
                    }
                },
                {
                    // Door is closed (default)
                    conditions: [],
                    success: {
                        message: "A glass door with gold lettering reading 'Chen's Flowers - Est. 2003'. Small wind chimes hang from the frame, glinting in the streetlight.\n\nThrough the window you can see colorful flower arrangements inside - roses, lilies, vibrant bunches of color.\n\nThe door appears to be closed but unlocked. You can OPEN it.",
                        media: undefined
                    }
                }
            ],
            onOpen: [
                {
                    // Already open
                    conditions: [{ type: 'FLAG', flag: 'florist_door_open' as Flag }],
                    success: {
                        message: "The door is already open. The wind chimes tinkle softly overhead.",
                        media: undefined
                    }
                },
                {
                    // Open the door (default)
                    conditions: [],
                    success: {
                        message: "You push the door open. The wind chimes jingle overhead - a cheerful, tinkling sound. The scent of fresh roses wafts out, sweet and earthy.\n\nThe door swings wide. You can now GO INSIDE or ENTER to step into the shop.",
                        media: undefined,
                        effects: [
                            { type: 'SET_FLAG', flag: 'florist_door_open' as Flag },
                            { type: 'REVEAL_FROM_PARENT', entityId: 'portal_florist_exterior_to_interior', parentId: 'obj_florist_door' }
                        ]
                    }
                }
            ],
            onClose: [
                {
                    // Door is already closed
                    conditions: [{ type: 'NO_FLAG', flag: 'florist_door_open' as Flag }],
                    success: {
                        message: "The door is already closed.",
                        media: undefined
                    }
                },
                {
                    // Close the door
                    conditions: [{ type: 'FLAG', flag: 'florist_door_open' as Flag }],
                    success: {
                        message: "You close the door. The wind chimes tinkle softly as it swings shut.",
                        media: undefined,
                        effects: [
                            { type: 'SET_FLAG', flag: 'florist_door_open' as Flag, value: false }
                        ]
                    }
                }
            ]
        },
        design: {
            authorNotes: "Door to florist shop. Opening reveals portal to interior. Uses REVEAL_FROM_PARENT pattern for realistic entry mechanics.",
            tags: ['door', 'portal-reveal', 'wind-chimes']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_butcher_door': {
        id: 'obj_butcher_door' as GameObjectId,
        name: 'Butcher Shop Door',
        alternateNames: ['butcher door', 'meat shop door', 'wooden door', 'door', 'richter\'s door', 'red door'],
        description: 'Heavy wooden door with faded red paint. A metal sign reads: "Richter\'s Meats".',
        locationId: 'loc_butcher_exterior' as LocationId,
        archetype: 'Portal',
        state: { currentStateId: 'closed' },
        capabilities: { container: false, lockable: false, movable: false, breakable: false },
        revealMethod: 'AUTO',
        handlers: {
            onExamine: [
                {
                    // Door is open
                    conditions: [{ type: 'FLAG', flag: 'butcher_door_open' as Flag }],
                    success: {
                        message: "The heavy door stands open. Cold air flows out from the refrigerated interior, carrying the metallic scent of fresh meat.\n\nThrough the doorway you can see Klaus Richter at the counter, cleaver in hand.",
                        media: undefined
                    }
                },
                {
                    // Door is closed (default)
                    conditions: [],
                    success: {
                        message: "A thick wooden door with faded red paint, worn from years of use. A metal sign bolted to the frame reads 'Richter's Meats - Family Owned Since 1952'.\n\nThrough the small window you can see meat hooks hanging from the ceiling inside. The door appears to be closed but unlocked. You can OPEN it.",
                        media: undefined
                    }
                }
            ],
            onOpen: [
                {
                    // Already open
                    conditions: [{ type: 'FLAG', flag: 'butcher_door_open' as Flag }],
                    success: {
                        message: "The door is already open. Cold air continues to flow out from the shop's interior.",
                        media: undefined
                    }
                },
                {
                    // Open the door (default)
                    conditions: [],
                    success: {
                        message: "You push the heavy door inward. It swings open with a deep creak - old hinges, well-worn wood. A wave of cold air hits you, carrying the metallic scent of fresh meat mixed with sawdust.\n\nThe door stands open. You can now GO INSIDE or ENTER to step into the shop.",
                        media: undefined,
                        effects: [
                            { type: 'SET_FLAG', flag: 'butcher_door_open' as Flag },
                            { type: 'REVEAL_FROM_PARENT', entityId: 'portal_butcher_exterior_to_interior', parentId: 'obj_butcher_door' }
                        ]
                    }
                }
            ],
            onClose: [
                {
                    // Door is already closed
                    conditions: [{ type: 'NO_FLAG', flag: 'butcher_door_open' as Flag }],
                    success: {
                        message: "The door is already closed.",
                        media: undefined
                    }
                },
                {
                    // Close the door
                    conditions: [{ type: 'FLAG', flag: 'butcher_door_open' as Flag }],
                    success: {
                        message: "You push the heavy door closed. It shuts with a solid thunk, the old wood settling into the frame. The cold air stops flowing.",
                        media: undefined,
                        effects: [
                            { type: 'SET_FLAG', flag: 'butcher_door_open' as Flag, value: false }
                        ]
                    }
                }
            ]
        },
        design: {
            authorNotes: "Door to butcher shop. Opening reveals portal to interior. Heavy wooden door with atmospheric cold air and meat scent.",
            tags: ['door', 'portal-reveal', 'atmospheric']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    // ===== ZONE 1: BUS STOP (Flavor Zone - Type 1) =====

    'obj_bus_shelter': {
        id: 'obj_bus_shelter' as GameObjectId,
        name: 'Bus Shelter',
        alternateNames: ['shelter', 'bus stop structure', 'waiting area', 'glass', 'plexiglass', 'glass panel'],
        description: 'Weathered bus shelter with cracked plexiglass walls. Rain-streaked and tagged with graffiti.',
        locationId: 'loc_bus_stop' as LocationId,
        archetype: 'Structure',
        state: { currentStateId: 'default' },
        capabilities: { container: false, lockable: false, movable: false, breakable: false },
        revealMethod: 'AUTO',
        handlers: {
            onExamine: {
                success: {
                    message: "Metal frame, plexiglass walls. The plastic is cracked - someone's boot, probably. Or a thrown bottle. Rain streaks run vertical down the panels.\n\nGraffiti covers the glass:\n- Gang tags (\"BK\", \"WESTSIDE 13\")\n- Crude hearts with initials\n- \"BLOODHAVEN LOVES NO ONE\" (spraypainted in black)\n- \"555-0147\" (carved deep into the glass)\n- \"555-8891\" (marker, faded)\n- \"FOR A GOOD TIME CALL 555-6969\" (scratched, half-illegible)\n- Profanity\n- Drawings",
                    media: undefined
                }
            }
        },
        design: {
            authorNotes: "Payphone puzzle - displays the phone number to call after payphone is activated. The number 555-0147 is the correct number that triggers the audio message reward.",
            tags: ['payphone-puzzle', 'clue', 'bus-stop']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_bus_bench': {
        id: 'obj_bus_bench' as GameObjectId,
        name: 'Bench',
        alternateNames: ['wooden bench', 'bus bench', 'seat'],
        description: 'Old wooden bench carved with graffiti. "TC + MR 1998" among others.',
        locationId: 'loc_bus_stop' as LocationId,
        archetype: 'Furniture',
        state: { currentStateId: 'unmoved' },
        stateMap: {
            unmoved: {
                overrides: {
                    onExamine: {
                        success: {
                            message: "Wooden slats worn smooth by thousands of waiting bodies. The wood is dark where hands gripped, lighter where rain bleached it.\n\nCarvings cover the surface - names, dates, gang tags, crude drawings. People marking their existence.\n\nBut something feels off. The bench wobbles when you sit. One leg is shorter than the others - uneven. Maybe something underneath?",
                            media: undefined
                        }
                    },
                    onSearch: {
                        success: {
                            message: "You check under the slats, between the cracks. Nothing hidden in the seat itself.\n\nBut when you push on one side, the whole bench shifts slightly. Not bolted down. One leg shorter than the others - something metallic glints underneath.",
                            media: undefined
                        }
                    },
                    onMove: {
                        success: {
                            message: "You grip the bench and shift it to the side. Heavy. Wood scrapes against concrete.\n\nUnderneath where the leg was: a quarter. 1998 issue. Someone wedged it under there to level the bench.",
                            media: undefined,
                            effects: [
                                { type: 'SET_ENTITY_STATE', objectId: 'obj_bus_bench' as GameObjectId, newState: 'moved' },
                                { type: 'REVEAL_FROM_PARENT', entityId: 'item_quarter' as ItemId, parentId: 'obj_bus_bench' as GameObjectId }
                            ]
                        }
                    }
                }
            },
            moved: {
                overrides: {
                    onExamine: {
                        success: {
                            message: "The bench sits askew now, shifted from its original position. The wood is still carved with years of waiting: \"TC + MR 1998\", gang tags, crude drawings.\n\nThe uneven leg is visible - that's where the quarter was wedged.",
                            media: undefined
                        }
                    },
                    onSearch: {
                        success: {
                            message: "You already moved the bench. Nothing else hidden here.",
                            media: undefined
                        }
                    }
                }
            }
        },
        capabilities: { container: false, lockable: false, movable: true, breakable: false },
        revealMethod: 'AUTO',
        design: {
            authorNotes: "Payphone puzzle - hides quarter under leg. Player must MOVE bench to reveal quarter. Adds physical interaction element to puzzle.",
            tags: ['payphone-puzzle', 'movable', 'bus-stop']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_bus_trash_bin': {
        id: 'obj_bus_trash_bin' as GameObjectId,
        name: 'Trash Bin',
        alternateNames: ['trash', 'garbage bin', 'waste bin', 'bin'],
        description: 'Metal trash bin overflowing with coffee cups, candy wrappers, and transit debris.',
        locationId: 'loc_bus_stop' as LocationId,
        archetype: 'Container',
        state: { currentStateId: 'default' },
        capabilities: { container: true, lockable: false, movable: false, breakable: false },
        revealMethod: 'AUTO',
        handlers: {
            onExamine: {
                success: {
                    message: "Metal bin, city-issue green. Overflowing. The city doesn't clean these stops like they used to.\n\nCoffee cups. Candy wrappers. Crumpled receipts. Cigarette butts. The debris of transit - people passing through, leaving traces.",
                    media: undefined
                }
            },
            onSearch: {
                success: {
                    message: "You dig through the trash. Sticky coffee cups. Old receipts with faded ink. Candy wrappers. Cigarette butts.\n\nYour fingers brush against something at the bottom.\n\n**Items found:**\n🥤 Soda Can\n📄 Bus Ticket\n🍟 Food Wrapper",
                    media: undefined,
                    effects: [
                        { type: 'REVEAL_FROM_PARENT', entityId: 'item_soda_can' as ItemId, parentId: 'obj_bus_trash_bin' as GameObjectId },
                        { type: 'REVEAL_FROM_PARENT', entityId: 'item_bus_ticket' as ItemId, parentId: 'obj_bus_trash_bin' as GameObjectId },
                        { type: 'REVEAL_FROM_PARENT', entityId: 'item_food_wrapper' as ItemId, parentId: 'obj_bus_trash_bin' as GameObjectId }
                    ]
                }
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_bus_schedule': {
        id: 'obj_bus_schedule' as GameObjectId,
        name: 'Bus Schedule',
        alternateNames: ['schedule', 'timetable', 'bus times', 'transit schedule'],
        description: 'Laminated bus schedule posted on shelter wall.',
        locationId: 'loc_bus_stop' as LocationId,
        archetype: 'Signage',
        state: { currentStateId: 'default' },
        capabilities: { container: false, lockable: false, movable: false, breakable: false },
        revealMethod: 'AUTO',
        handlers: {
            onExamine: {
                success: {
                    message: "Laminated schedule behind scratched plastic. Someone keyed it - deep gouges obscure half the times.\n\nWhat you can read:\n\n**BUS LINES:**\n- Route 47 (Downtown) - RED LINE = A\n- Route 82 (Harbor) - BLUE LINE = B\n- Route 15 (East Side) - GREEN LINE = C\n- Route 33 (West End) - YELLOW LINE = D\n\nLast bus: 10:45 PM\n\nBelow, handwritten in marker: \"SCHEDULE LIES\"\n\nThe line color codes are highlighted, like someone wanted them noticed. Red=A, Blue=B, Green=C, Yellow=D.",
                    media: undefined
                }
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_payphone': {
        id: 'obj_payphone' as GameObjectId,
        name: 'Payphone',
        alternateNames: ['pay phone', 'phone booth', 'booth', 'payphone booth', 'public phone', 'street phone', 'booth phone'],
        description: 'Old payphone booth. The handset dangles from a metal cord. The phone is deactivated.',
        locationId: 'loc_bus_stop' as LocationId,
        archetype: 'Device',
        state: { currentStateId: 'deactivated' },
        capabilities: { container: false, lockable: false, movable: false, breakable: false },
        revealMethod: 'AUTO',
        stateMap: {
            deactivated: {
                description: "The payphone is deactivated. Someone disabled it deliberately.",
                overrides: {
                    onExamine: {
                        success: {
                            message: "A payphone. You haven't seen one in years. Glass booth, metal phone, coin slot. The handset dangles from a steel cord.\n\nThe glass is covered in grime. Fingerprints. Handprints. The residue of countless calls.\n\nWho still uses payphones? People who don't want their calls traced, that's who.",
                            media: undefined
                        }
                    },
                    onSearch: {
                        success: {
                            message: "You examine the payphone more closely.\n\nYou lift the handset - no dial tone. Dead.\n\nBut wait. This isn't broken. Someone deactivated it deliberately. The 1-line digital display reads:\n\n**[ACTIVATION CODE REQUIRED]**\n\nBelow the display: a 12-button keypad (1-2-3-4-5-6-7-8-9-*-0-#). Each key has a small colored dot in the bottom corner:\n- Key 1: purple dot\n- Key 2: green dot\n- Key 3: orange dot\n- Key 4: red dot\n- Key 5: cyan dot\n- Key 6: pink dot\n- Key 7: yellow dot\n- Key 8: lime dot\n- Key 9: blue dot\n- Key *: indigo dot\n- Key 0: amber dot\n- Key #: teal dot\n\nSomeone color-coded the keys. But which colors matter?",
                            media: undefined,
                            effects: [
                                {
                                    type: 'LAUNCH_MINIGAME',
                                    gameType: 'payphone-activation',
                                    objectId: 'obj_payphone',
                                    solution: '49274297',
                                    successEffects: [
                                        { type: 'SET_ENTITY_STATE', entityId: 'obj_payphone', patch: { currentStateId: 'activated' } },
                                        { type: 'SET_FLAG', flag: 'payphone_activated', value: true },
                                        {
                                            type: 'SHOW_MESSAGE',
                                            speaker: 'narrator',
                                            content: "**PAYPHONE ACTIVATED**\n\nThe digital display flickers. The mechanism inside whirs to life.\n\n*CLICK*\n\nDial tone. The payphone is operational.\n\nYou'll need a quarter to make a call. Check the bench - people sometimes hide coins under wobbly legs to level furniture."
                                        }
                                    ],
                                    data: {
                                        keypadColors: {
                                            '4': 'red',
                                            '9': 'blue',
                                            '2': 'green',
                                            '7': 'yellow',
                                            '1': 'purple',
                                            '3': 'orange',
                                            '5': 'cyan',
                                            '6': 'pink',
                                            '8': 'lime',
                                            '0': 'amber',
                                            '*': 'indigo',
                                            '#': 'teal'
                                        }
                                    }
                                }
                            ]
                        }
                    },
                    onUse: {
                        fail: {
                            message: "The phone is deactivated. No dial tone."
                        }
                    }
                }
            },
            activated: {
                description: "The payphone hums with power. The dial tone is clear. Operational.",
                overrides: {
                    onExamine: {
                        success: {
                            message: "The payphone is working now. The display shows: **[READY]**\n\nDial tone clear. The old circuits hum with life.\n\nYou'll need a quarter to make a call.",
                            media: undefined
                        }
                    },
                    onSearch: {
                        success: {
                            message: "You inspect the payphone closely.\n\nThe **coin slot** gleams. Freshly activated. Ready to accept currency.\n\nThe display reads: **[INSERT 25¢]**\n\nThe handset hums faintly - live voltage running through the circuits. Dial tone waiting. All it needs is a quarter.\n\nYou don't have one on you. Where would someone hide loose change around here? Maybe under furniture that wobbles - people wedge coins under uneven legs to level things.",
                            media: undefined
                        }
                    },
                    onUse: [
                        {
                            itemId: 'item_quarter' as ItemId,
                            conditions: [{ type: 'HAS_ITEM', itemId: 'item_quarter' as ItemId }],
                            success: {
                                message: "You insert the quarter into the coin slot.\n\n*CLINK*\n\nThe coin drops. The phone accepts it. You hear a dial tone.\n\nTime to dial.",
                                effects: [
                                    { type: 'REMOVE_ITEM', itemId: 'item_quarter' as ItemId },
                                    {
                                        type: 'LAUNCH_MINIGAME',
                                        gameType: 'payphone-dialer',
                                        objectId: 'obj_payphone',
                                        solution: '5550147',
                                        successEffects: [
                                            { type: 'SET_ENTITY_STATE', entityId: 'obj_payphone', patch: { currentStateId: 'burned' } },
                                            { type: 'SET_FLAG', flag: 'payphone_call_complete', value: true },
                                            {
                                                type: 'SHOW_MESSAGE',
                                                speaker: 'narrator',
                                                senderName: 'Payphone Recording',
                                                content: "**CALL CONNECTED**\n\nThe line rings once. Twice. Then— *CLICK*\n\nA recorded message plays. Listen carefully.",
                                                messageType: 'audio',
                                                imageUrl: 'https://res.cloudinary.com/dg912bwcc/video/upload/v1736891396/payphone_message_audio_z0tpud.mp3',
                                                imageDescription: 'Payphone Message Recording',
                                                imageHint: 'Evidence from the payphone call'
                                            },
                                            {
                                                type: 'SHOW_MESSAGE',
                                                speaker: 'narrator',
                                                content: "*CLICK*\n\nThe line goes dead. The message ended. The payphone's display reads: **CALL ENDED**\n\nWhatever that was about, it sounded important. The phone is now silent - burned, used up."
                                            }
                                        ],
                                        data: {
                                            expectedNumber: '5550147'
                                        }
                                    }
                                ]
                            },
                            fail: {
                                message: "The payphone needs a quarter. Twenty-five cents. That's the price of a call.\n\nYou don't have one on you. Check the bus stop area - maybe there's loose change hidden somewhere."
                            }
                        }
                    ]
                }
            },
            burned: {
                description: "The payphone is dead. Used up. No more calls.",
                overrides: {
                    onExamine: {
                        success: {
                            message: "The payphone sits silent. The display is dark. **OUT OF SERVICE**\n\nYou already used it. One call, one quarter, one chance. That's how payphones work in this city.\n\nBurned.",
                            media: undefined
                        }
                    },
                    onUse: {
                        fail: {
                            message: "The phone is dead. Burned. No dial tone. It gave you one chance, and that chance is gone."
                        }
                    }
                }
            }
        },
        design: {
            authorNotes: "Payphone puzzle hub. Requires: 1) Find bus ticket (code), 2) /payphone activation mini-game, 3) Find quarter, 4) USE phone, 5) CALL bench number. Rewards: Audio message with evidence/password.",
            tags: ['payphone', 'puzzle', 'mini-game']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    // ===== ZONE 2: ELECTRICIAN TRUCK (Type 2 - Locked - Distraction Needed) =====

    'obj_electrician_truck_exterior': {
        id: 'obj_electrician_truck_exterior' as GameObjectId,
        name: 'Electrician Truck',
        alternateNames: ['van', 'work van', 'truck', 'kowalski van', 'white van'],
        description: 'White work van with "KOWALSKI ELECTRIC" painted in faded blue. License plate: KWL-4429.',
        locationId: 'loc_electrician_truck' as LocationId,
        archetype: 'Vehicle',
        state: { currentStateId: 'default' },
        capabilities: { container: false, lockable: false, movable: false, breakable: false },
        revealMethod: 'AUTO',
        handlers: {
            onExamine: {
                success: {
                    message: "White Ford Transit. Work van, mid-2010s model. \"KOWALSKI ELECTRIC\" painted on the side in blue letters - faded, peeling at the edges.\n\nDented bumper. Mud caked on the wheel wells. Rust blooming at the door seams. The kind of vehicle that's seen hard miles.\n\nLicense plate: **KWL-4429**\n\nMike Kowalski sits in the driver's seat, scrolling his phone. He's not going anywhere soon.",
                    media: undefined
                }
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_electrician_truck_doors': {
        id: 'obj_electrician_truck_doors' as GameObjectId,
        name: 'Truck Back Doors',
        alternateNames: ['back doors', 'van doors', 'rear doors', 'doors'],
        description: 'Back doors of the van, secured with a padlock. Mike watches from the front seat.',
        locationId: 'loc_electrician_truck' as LocationId,
        archetype: 'Container',
        parentId: 'obj_electrician_truck_exterior' as GameObjectId,
        state: { currentStateId: 'locked' },
        capabilities: { container: true, lockable: true, movable: false, breakable: false },
        revealMethod: 'AUTO',
        handlers: {
            onExamine: [
                {
                    // Doors opened (Mike distracted)
                    conditions: [{ type: 'FLAG', flag: 'electrician_distracted' as Flag }],
                    success: {
                        message: "The padlock is open. Mike left in a hurry - he didn't bother locking up.\n\nThe van doors swing open easily. Inside, you see his toolbox resting against the wall.",
                        media: undefined
                    }
                },
                {
                    // Default - locked
                    conditions: [],
                    success: {
                        message: "Heavy padlock secures the back doors. Mike's paranoid about theft - smart in this neighborhood.\n\nYou can't open these while he's watching. You need to distract him first.",
                        media: undefined
                    }
                }
            ],
            onOpen: [
                {
                    // Already opened
                    conditions: [{ type: 'FLAG', flag: 'truck_doors_opened' as Flag }],
                    success: {
                        message: "The doors are already open. The toolbox is visible inside.",
                        media: undefined
                    }
                },
                {
                    // Can open (Mike distracted)
                    conditions: [{ type: 'FLAG', flag: 'electrician_distracted' as Flag }],
                    success: {
                        message: "You pull open the van doors. They swing wide.\n\nInside: toolbox, electrical spools, conduit pipes. The toolbox sits within reach.",
                        media: undefined,
                        effects: [
                            { type: 'SET_FLAG', flag: 'truck_doors_opened' as Flag },
                            { type: 'REVEAL_FROM_PARENT', entityId: 'obj_electrician_toolbox', parentId: 'obj_electrician_truck_doors' }
                        ]
                    }
                },
                {
                    // Default - can't open (Mike watching)
                    conditions: [],
                    success: {
                        message: "The padlock is secure. Mike sits in the driver's seat, watching you.\n\n\"Can't let people in the van,\" he says. \"Too many tools get stolen.\"\n\nYou need to distract him somehow.",
                        media: undefined
                    }
                }
            ]
        },
        design: {
            authorNotes: "Unlocks when Mike Kowalski is distracted (AI-judged puzzle). Reveals toolbox containing tools + Evidence 4.",
            tags: ['container', 'locked', 'distraction-puzzle']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_electrician_toolbox': {
        id: 'obj_electrician_toolbox' as GameObjectId,
        name: 'Toolbox',
        alternateNames: ['tool box', 'box', 'electrician toolbox', 'tools'],
        description: 'Red metal toolbox containing electrician tools and equipment.',
        locationId: 'loc_electrician_truck' as LocationId,
        archetype: 'Container',
        parentId: 'obj_electrician_truck_doors' as GameObjectId,
        state: { currentStateId: 'default' },
        capabilities: { container: true, lockable: false, movable: false, breakable: false },
        revealMethod: 'REVEAL_FROM_PARENT',
        handlers: {
            onExamine: {
                success: {
                    message: "Red metal toolbox. Scratched and dented from years of work. The latch opens easily.\n\nInside, you see:\n- A crowbar (rust-spotted but solid)\n- Wire cutters (professional-grade)\n- Lock pick set (FBI standard issue - interesting...)\n- Drill body (missing battery and bit)\n- Electrical tape\n- A crumpled receipt tucked in the corner\n\nMike's collection. Tools of the trade.",
                    media: undefined
                }
            },
            onOpen: {
                success: {
                    message: "You open the toolbox. Metal hinges creak.\n\nThe tools are yours for the taking. Mike's distracted - he won't notice if a few go missing.",
                    media: undefined,
                    effects: [
                        { type: 'REVEAL_FROM_PARENT', entityId: 'item_crowbar', parentId: 'obj_electrician_toolbox' },
                        { type: 'REVEAL_FROM_PARENT', entityId: 'item_wire_cutters', parentId: 'obj_electrician_toolbox' },
                        { type: 'REVEAL_FROM_PARENT', entityId: 'item_lock_pick_set', parentId: 'obj_electrician_toolbox' },
                        { type: 'REVEAL_FROM_PARENT', entityId: 'item_drill_body', parentId: 'obj_electrician_toolbox' },
                        { type: 'REVEAL_FROM_PARENT', entityId: 'item_hardware_receipt', parentId: 'obj_electrician_toolbox' }
                    ]
                }
            }
        },
        design: {
            authorNotes: "Contains tools (crowbar, wire cutters, lock pick set, drill body) + EVIDENCE 4 (hardware receipt). Revealed when truck doors opened.",
            tags: ['container', 'tools', 'evidence-location']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    // ===== ZONE 3: CCTV BUILDING (Type 2 - Locked - Keypad 1440 or Bolt Cutters) =====

    'obj_cctv_fence': {
        id: 'obj_cctv_fence' as GameObjectId,
        name: 'Chain-Link Fence',
        alternateNames: ['fence', 'chain fence', 'security fence', 'perimeter', 'gate'],
        description: 'Chain-link fence surrounding the CCTV building. Rusted but intact.',
        locationId: 'loc_cctv_exterior' as LocationId,
        archetype: 'Structure',
        state: { currentStateId: 'locked' },
        capabilities: { container: false, lockable: true, movable: false, breakable: false },
        revealMethod: 'AUTO',
        children: {
            objects: ['obj_cctv_keypad' as GameObjectId, 'obj_cctv_monitor_station' as GameObjectId, 'obj_cctv_filing_cabinet' as GameObjectId]
        },
        handlers: {
            onExamine: [
                {
                    // Fence cut
                    conditions: [{ type: 'FLAG', flag: 'cctv_fence_cut' as Flag }],
                    success: {
                        message: "The chain-link fence has been cut. A section hangs loose where you used the bolt cutters.\n\nYou can walk right through. The building is accessible.",
                        media: undefined
                    }
                },
                {
                    // Keypad unlocked
                    conditions: [{ type: 'FLAG', flag: 'cctv_door_unlocked' as Flag }],
                    success: {
                        message: "The fence surrounds the building. But you unlocked the keypad - the gate is open. No need to cut the fence.",
                        media: undefined
                    }
                },
                {
                    // Default - locked
                    conditions: [],
                    success: {
                        message: "Chain-link fence, eight feet high. Rusted at the posts but structurally sound. Surrounds the CCTV control building like a cage.\n\nTwo ways in:\n1. The keypad-controlled gate (need 4-digit code)\n2. Cut through with bolt cutters\n\nYour choice.",
                        media: undefined
                    }
                }
            ],
            onUse: [
                {
                    // Use bolt cutters
                    itemId: 'item_bolt_cutters' as ItemId,
                    conditions: [{ type: 'NO_FLAG', flag: 'cctv_fence_cut' as Flag }],
                    success: {
                        message: "You position the bolt cutters on the chain link. Heavy steel jaws. You squeeze.\n\n*SNAP*\n\nThe chain parts. You cut a vertical line - three feet, four feet. The fence section peels back like a curtain.\n\nYou're in.",
                        media: undefined,
                        effects: [
                            { type: 'SET_FLAG', flag: 'cctv_fence_cut' as Flag },
                            { type: 'SET_FLAG', flag: 'cctv_accessible' as Flag },
                            { type: 'REVEAL_FROM_PARENT', entityId: 'obj_cctv_keypad', parentId: 'obj_cctv_fence' },
                            { type: 'REVEAL_FROM_PARENT', entityId: 'obj_cctv_monitor_station', parentId: 'obj_cctv_fence' },
                            { type: 'REVEAL_FROM_PARENT', entityId: 'obj_cctv_filing_cabinet', parentId: 'obj_cctv_fence' }
                        ]
                    },
                    fail: {
                        message: "You already cut the fence. No need to do it again.",
                        media: undefined
                    }
                }
            ]
        },
        design: {
            authorNotes: "Can be bypassed via keypad (code 1440) OR cut with bolt cutters. Alternative access methods.",
            tags: ['barrier', 'locked', 'alternative-access']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_cctv_keypad': {
        id: 'obj_cctv_keypad' as GameObjectId,
        name: 'Keypad',
        alternateNames: ['door keypad', 'access keypad', 'security keypad', 'code pad'],
        description: 'Rusted keypad mounted beside the gate. Four-digit code required.',
        locationId: 'loc_cctv_exterior' as LocationId,
        archetype: 'Device',
        state: { currentStateId: 'locked' },
        capabilities: { container: false, lockable: true, movable: false, breakable: false },
        revealMethod: 'AUTO',
        handlers: {
            onExamine: [
                {
                    // Already unlocked
                    conditions: [{ type: 'FLAG', flag: 'cctv_door_unlocked' as Flag }],
                    success: {
                        message: "The keypad shows a green light. Access granted. The gate is unlocked.",
                        media: undefined
                    }
                },
                {
                    // Default - locked
                    conditions: [],
                    success: {
                        message: "Old keypad. Weathered by years of rain. Four-digit code entry.\n\nThe numbers are worn where people pressed them most: 1, 4, 0. Common digits.\n\nYou need the exact code to unlock the gate.",
                        media: undefined
                    }
                }
            ]
        },
        design: {
            authorNotes: "Unlocks with code 1440 (found on Kiosk receipt - not yet implemented in Phase 3A). Opens gate to CCTV building.",
            tags: ['keypad', 'puzzle', 'code-lock']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_cctv_monitor_station': {
        id: 'obj_cctv_monitor_station' as GameObjectId,
        name: 'Monitor Station',
        alternateNames: ['monitors', 'monitor', 'control station', 'cctv station', 'screens'],
        description: 'Bank of monitors displaying live CCTV feeds. Recording system accessible.',
        locationId: 'loc_cctv_interior' as LocationId,
        archetype: 'Device',
        parentId: undefined,
        state: { currentStateId: 'default' },
        capabilities: { container: false, lockable: false, movable: false, breakable: false },
        revealMethod: 'AUTO',
        handlers: {
            onExamine: [
                {
                    // Screenshot already taken
                    conditions: [{ type: 'HAS_ITEM', itemId: 'item_cctv_screenshot' as ItemId }],
                    success: {
                        message: "The monitors cycle through camera feeds. You already printed the screenshot you needed - the gray van, April 15th, plate LKJ-9472.\n\nNo need to search again. You have Evidence 1.",
                        media: undefined
                    }
                },
                {
                    // Default - can search
                    conditions: [],
                    success: {
                        message: "Six monitors arranged in two rows. Live feeds from traffic cameras across Bloodhaven. Elm Street. Harbor. Downtown. Industrial district.\n\nBelow the monitors: a control panel. Keyboard, mouse, printer. The system records everything - stores footage for 90 days.\n\nYou can SEARCH the footage for specific dates. Sarah mentioned the gray van appeared repeatedly on Elm Street before April 15th.",
                        media: undefined
                    }
                }
            ],
            onSearch: [
                {
                    // Already found screenshot
                    conditions: [{ type: 'HAS_ITEM', itemId: 'item_cctv_screenshot' as ItemId }],
                    success: {
                        message: "You already have the screenshot. No need to search again.",
                        media: undefined
                    }
                },
                {
                    // Find screenshot (first time)
                    conditions: [],
                    success: {
                        message: "You sit at the control panel. The interface is outdated - Windows XP, clunky menus. But it works.\n\nYou search the Elm Street camera archives:\n- April 10, 2026\n- April 12, 2026\n- April 15, 2026 - 6:15 PM\n\nThere. April 15th. Timestamp matches Lili's alleged abduction.\n\nA gray cargo van parked on Elm Street. The camera angle is perfect - you can see the license plate clearly.\n\n**License Plate: LKJ-9472**\n\nYou hit PRINT. The printer whirs. A photo spits out - clear, dated, timestamped.\n\nThis is evidence.",
                        media: undefined,
                        effects: [
                            { type: 'REVEAL_FROM_PARENT', entityId: 'item_cctv_screenshot', parentId: 'obj_cctv_monitor_station' }
                        ]
                    }
                }
            ]
        },
        design: {
            authorNotes: "EVIDENCE 1 LOCATION - Search footage to find CCTV screenshot showing gray van (plate LKJ-9472). Numeric portion '9472' is PIN for Garage #3.",
            tags: ['evidence-location', 'evidence-1', 'puzzle', 'cctv']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_cctv_filing_cabinet': {
        id: 'obj_cctv_filing_cabinet' as GameObjectId,
        name: 'Filing Cabinet',
        alternateNames: ['cabinet', 'file cabinet', 'files', 'drawer'],
        description: 'Metal filing cabinet. Unlocked. Contains maintenance logs and incident reports.',
        locationId: 'loc_cctv_interior' as LocationId,
        archetype: 'Container',
        state: { currentStateId: 'default' },
        capabilities: { container: true, lockable: false, movable: false, breakable: false },
        revealMethod: 'AUTO',
        handlers: {
            onExamine: {
                success: {
                    message: "Gray metal filing cabinet. Four drawers. The top drawer is unlocked.\n\nLabels on the drawers:\n- MAINTENANCE LOGS\n- INCIDENT REPORTS\n- SYSTEM BACKUPS\n- ARCHIVED FOOTAGE (USB)\n\nBureaucracy in steel.",
                    media: undefined
                }
            },
            onSearch: {
                success: {
                    message: "You search the filing cabinet.\n\nMaintenance logs: Camera repairs, system updates, bulb replacements. Nothing interesting.\n\nIncident reports: Vandalism, camera tampering, brief outages. All minor.\n\nOne entry catches your eye:\n\"April 15, 2026 - Camera 4 (Bus Station) offline 5:50 PM - 7:30 PM. Cause: Unknown.\"\n\nThe same night Lili claims you abducted her. The cameras were offline. Convenient.\n\nBut nothing directly useful here. The real evidence is on the monitors.",
                    media: undefined
                }
            }
        },
        design: {
            authorNotes: "Flavor object. Provides context (bus station cameras offline April 15th) but no items or evidence.",
            tags: ['flavor', 'container', 'lore']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    // ===== ZONE 4: CONSTRUCTION SITE (Type 2 - Locked - Hard Hat + Vest Required) =====

    // ===== CONSTRUCTION SITE EXTERIOR OBJECTS =====

    'obj_construction_scaffolding': {
        id: 'obj_construction_scaffolding' as GameObjectId,
        name: 'Scaffolding',
        alternateNames: ['scaffold', 'metal scaffolding', 'construction scaffolding', 'framework', 'platform'],
        description: 'Metal scaffolding system with platforms. The lowest platform is chest-high, accessible from ground level.',
        locationId: 'loc_construction_exterior' as LocationId,
        archetype: 'Structure',
        state: { currentStateId: 'default', isOpen: false, isLocked: false, isBroken: false, isPoweredOn: false },
        capabilities: { container: false, lockable: false, openable: false, movable: false, breakable: false, powerable: false, readable: false, inputtable: false },
        revealMethod: 'AUTO',
        handlers: {
            onExamine: {
                success: {
                    message: "Metal scaffolding system - the temporary skeleton that lets workers access upper floors during construction. Steel pipes connected with couplers, wooden planks forming platforms every ten feet. Orange safety barriers mark the base.\n\nThe lowest platform is about chest height - accessible from street level. Designed to hold workers, tools, materials. Weight capacity probably 500 pounds per section.\n\nYou can see some items on the lowest platform from here.",
                    media: undefined
                }
            },
            onSearch: [
                {
                    // Everything taken - platform is empty
                    conditions: [
                        { type: 'HAS_ITEM', itemId: 'item_pliers' as ItemId },
                        { type: 'HAS_ITEM', itemId: 'item_spring' as ItemId },
                        { type: 'HAS_ITEM', itemId: 'item_hard_hat' as ItemId }
                    ],
                    success: {
                        message: "You step up onto the orange safety barrier again. Chest-high platform.\n\nYou sweep your hand across the wooden planks. Empty now. You took everything - pliers, spring, hard hat. All in your inventory.\n\nNothing left to find here.",
                        media: undefined
                    }
                },
                {
                    // Tools taken, hard hat remains (either secured or freed)
                    conditions: [
                        { type: 'HAS_ITEM', itemId: 'item_pliers' as ItemId },
                        { type: 'HAS_ITEM', itemId: 'item_spring' as ItemId }
                    ],
                    success: {
                        message: "You step up onto the orange safety barrier again. Chest-high platform.\n\nYou sweep your hand across the wooden planks. The pliers and spring are gone - you took them.\n\nThe hard hat is still here, secured with zip-ties.",
                        media: undefined
                    }
                },
                {
                    // Only pliers taken
                    conditions: [
                        { type: 'HAS_ITEM', itemId: 'item_pliers' as ItemId }
                    ],
                    success: {
                        message: "You step up onto the orange safety barrier again. Chest-high platform.\n\nYou sweep your hand across the wooden planks. The pliers are gone - you took them.\n\nWhat remains:\n\n🔩 Spring\n\nThe hard hat is still here, secured with zip-ties.",
                        media: undefined
                    }
                },
                {
                    // Only spring taken
                    conditions: [
                        { type: 'HAS_ITEM', itemId: 'item_spring' as ItemId }
                    ],
                    success: {
                        message: "You step up onto the orange safety barrier again. Chest-high platform.\n\nYou sweep your hand across the wooden planks. The spring is gone - you took it.\n\nWhat remains:\n\n🔧 Pliers\n\nThe hard hat is still here, secured with zip-ties.",
                        media: undefined
                    }
                },
                {
                    // First search - nothing taken yet
                    conditions: [],
                    success: {
                        message: "You step up onto the orange safety barrier, gripping the cold steel pipe. The metal is rough under your fingers - years of weather, rust forming in the joints where moisture collects. Your boots scrape against the barrier as you stretch upward.\n\nChest-high platform. You sweep your hand across the wooden planks - grit, sawdust, dried mud. The scaffolding sways slightly. You're only five feet up, but the framework groans. Workers trust these things with their lives every day.\n\nYour fingers find items scattered on the platform:\n\n🔩 Spring\n🔧 Pliers\n⚠️ Hard Hat (secured with zip-ties)",
                        media: undefined,
                        effects: [
                            { type: 'REVEAL_FROM_PARENT', entityId: 'obj_scaffolding_zip_ties' as GameObjectId, parentId: 'obj_construction_scaffolding' as GameObjectId },
                            { type: 'REVEAL_FROM_PARENT', entityId: 'item_pliers' as ItemId, parentId: 'obj_construction_scaffolding' as GameObjectId },
                            { type: 'REVEAL_FROM_PARENT', entityId: 'item_spring' as ItemId, parentId: 'obj_construction_scaffolding' as GameObjectId },
                            { type: 'REVEAL_FROM_PARENT', entityId: 'item_hard_hat' as ItemId, parentId: 'obj_scaffolding_zip_ties' as GameObjectId }
                        ]
                    }
                }
            ]
        },
        design: {
            authorNotes: "Accessible BEFORE gate. Search reveals pliers, spring, and zip-ties container with hard hat. Pliers are broken - need spring to repair. Repaired pliers cut zip-ties to free hard hat.",
            tags: ['structure', 'search', 'construction']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_scaffolding_zip_ties': {
        id: 'obj_scaffolding_zip_ties' as GameObjectId,
        name: 'Zip-Ties',
        alternateNames: ['zip ties', 'plastic ties', 'cable ties', 'tie', 'ties', 'zip tie', 'secured equipment', 'secured gear'],
        description: 'Heavy-duty plastic zip-ties securing the hard hat to the scaffolding railing.',
        locationId: 'loc_construction_exterior' as LocationId,
        parentId: 'obj_construction_scaffolding' as GameObjectId,
        archetype: 'Container',
        state: { currentStateId: 'locked', isOpen: true, isLocked: true, isBroken: false, isPoweredOn: false },
        capabilities: { container: true, lockable: true, openable: true, movable: false, breakable: false, powerable: false, readable: false, inputtable: false },
        revealMethod: 'REVEAL_FROM_PARENT',
        handlers: {
            onExamine: [
                {
                    // Already cut
                    conditions: [{ type: 'HAS_FLAG', flag: 'zip_ties_cut' as Flag }],
                    success: {
                        message: "The zip-ties have been cut. Severed plastic ends dangle from the railing.\n\nThe hard hat is now free to take.",
                        media: undefined
                    }
                },
                {
                    // Still secured
                    conditions: [],
                    success: {
                        message: "Industrial-strength plastic zip-ties. Thick, reinforced. Looped through the adjustment straps of a yellow hard hat, securing it to the scaffolding railing.\n\nPulling won't work - they're too tight. You'd need cutting tools. Wire cutters or pliers would do it.",
                        media: undefined
                    }
                }
            ],
            onUse: [
                {
                    itemId: 'item_pliers' as ItemId,
                    conditions: [
                        { type: 'HAS_ITEM', itemId: 'item_pliers' as ItemId },
                        { type: 'HAS_FLAG', flag: 'pliers_repaired' as Flag }
                    ],
                    success: {
                        message: "You position the pliers around the first zip-tie. Squeeze. The cutting edge bites through the plastic. *SNIP*\n\nFirst tie cut.\n\nYou move to the second. *SNIP*\n\nBoth zip-ties fall away, severed ends dangling from the railing.\n\nThe hard hat is now free. You can take it.",
                        media: undefined,
                        effects: [
                            { type: 'SET_FLAG', flag: 'zip_ties_cut' as Flag, value: true },
                            { type: 'SET_ENTITY_STATE', entityId: 'obj_scaffolding_zip_ties' as GameObjectId, patch: { isLocked: false, isOpen: true } },
                            { type: 'REVEAL_FROM_PARENT', entityId: 'item_hard_hat' as ItemId, parentId: 'obj_scaffolding_zip_ties' as GameObjectId }
                        ]
                    },
                    fail: {
                        message: "You try to squeeze the pliers, but the handles move limply. No tension. The cutting edges don't close properly.\n\nThese pliers are broken - the spring mechanism is missing. They won't cut anything like this. You need to repair them first."
                    }
                }
            ]
        },
        design: {
            authorNotes: "Container securing hard hat with zip-ties. Player must USE PLIERS ON ZIP-TIES to cut them and free the hard hat. Puzzle layer before accessing construction site.",
            tags: ['container', 'puzzle', 'locked', 'cutting']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_construction_gate': {
        id: 'obj_construction_gate' as GameObjectId,
        name: 'Construction Gate',
        alternateNames: ['gate', 'fence gate', 'entrance', 'chain link gate'],
        description: 'Chain-link gate blocking construction site entrance. Tony Greco stands guard.',
        locationId: 'loc_construction_exterior' as LocationId,
        archetype: 'Structure',
        state: { currentStateId: 'locked' },
        capabilities: { container: false, lockable: true, movable: false, breakable: false },
        revealMethod: 'AUTO',
        children: {
            objects: ['obj_construction_tool_shed' as GameObjectId, 'obj_construction_office_trailer' as GameObjectId]
        },
        handlers: {
            onExamine: [
                {
                    // Access granted - wearing hard hat
                    conditions: [{ type: 'HAS_FLAG', flag: 'wearing_hard_hat' as Flag }],
                    success: {
                        message: "The gate is open. Tony stepped aside after you put on the hard hat.\n\n\"Alright, you're good. Don't touch anything. We've had enough delays.\"\n\nThe construction site is accessible now.",
                        media: undefined
                    }
                },
                {
                    // Default - blocked
                    conditions: [],
                    success: {
                        message: "Chain-link gate. Closed. Tony Greco stands in front of it, arms crossed, clipboard in hand.\n\n\"Hard hat,\" he says. \"No exceptions. Insurance rules.\"\n\nHe's not budging. You need a hard hat to get in.",
                        media: undefined
                    }
                }
            ]
        },
        design: {
            authorNotes: "Unlocks when player wears hard hat (wearing_hard_hat flag). Tony Greco (NPC) controls access.",
            tags: ['barrier', 'locked', 'npc-controlled']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_construction_tool_shed': {
        id: 'obj_construction_tool_shed' as GameObjectId,
        name: 'Tool Shed',
        alternateNames: ['shed', 'tool storage', 'storage shed'],
        description: 'Portable tool shed with combination lock. Four-digit code required.',
        locationId: 'loc_construction_interior' as LocationId,
        archetype: 'Container',
        state: { currentStateId: 'locked' },
        capabilities: { container: true, lockable: true, movable: false, breakable: false },
        revealMethod: 'AUTO',
        handlers: {
            onExamine: [
                {
                    // Already unlocked
                    conditions: [{ type: 'FLAG', flag: 'tool_shed_unlocked' as Flag }],
                    success: {
                        message: "The combination lock hangs open. The tool shed is accessible.\n\nInside, you can see power tools and equipment.",
                        media: undefined
                    }
                },
                {
                    // Default - locked
                    conditions: [],
                    success: {
                        message: "Metal storage shed. Portable, the kind construction sites use. A four-digit combination lock secures the door.\n\nThe lock is weathered but functional. You need the correct code.\n\nFour digits. You've seen four-digit numbers around Elm Street. The street sign said \"EST. 1987\"...",
                        media: undefined
                    }
                }
            ],
            onSearch: [
                {
                    // Already opened
                    conditions: [{ type: 'FLAG', flag: 'tool_shed_unlocked' as Flag }],
                    success: {
                        message: "You search the tool shed.\n\nPower tools, extension cords, spare parts. Standard construction supplies. Nothing immediately useful for your investigation.",
                        media: undefined,
                        effects: []
                    }
                },
                {
                    // Not yet unlocked
                    conditions: [],
                    success: {
                        message: "The tool shed is locked. You need to unlock the combination lock first.",
                        media: undefined
                    }
                }
            ]
        },
        design: {
            authorNotes: "Placeholder for future puzzle content. Currently empty to keep Construction Site flow simple.",
            tags: ['container', 'combination-lock', 'placeholder']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_construction_office_trailer': {
        id: 'obj_construction_office_trailer' as GameObjectId,
        name: 'Office Trailer',
        alternateNames: ['trailer', 'portable office', 'office', 'foreman office'],
        description: 'Portable office trailer. Door unlocked. Contains desk, filing cabinet, construction plans.',
        locationId: 'loc_construction_interior' as LocationId,
        archetype: 'Container',
        state: { currentStateId: 'default' },
        capabilities: { container: true, lockable: false, movable: false, breakable: false },
        revealMethod: 'AUTO',
        handlers: {
            onExamine: {
                success: {
                    message: "Portable office trailer. White aluminum siding, small windows, metal steps leading to the door.\n\nThe door is unlocked - Tony doesn't bother locking it during work hours.\n\nInside, you can see a desk, filing cabinet, and construction plans pinned to the wall.",
                    media: undefined
                }
            },
            onSearch: {
                success: {
                    message: "You search the office trailer.\n\nDesk: Clipboard with work orders, coffee mug (cold), scattered pens.\n\nFiling cabinet: Permits, blueprints, inspection reports. Bureaucracy.\n\nOn the desk, half-buried under papers: a heavy-duty drill bit. Metal boring bit, the kind for drilling through locks.\n\nYou pocket it. Part 3 of 3 for the drill assembly.",
                    media: undefined,
                    effects: [
                        { type: 'REVEAL_FROM_PARENT', entityId: 'item_drill_bit', parentId: 'obj_construction_office_trailer' }
                    ]
                }
            }
        },
        design: {
            authorNotes: "Contains drill bit (Part 3/3). Search to reveal item.",
            tags: ['container', 'drill-part', 'office']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    // ===== ZONE 6: FLORIST SHOP (Type 1 - Unlocked) =====

    'obj_florist_counter': {
        id: 'obj_florist_counter' as GameObjectId,
        name: 'Display Counter',
        alternateNames: ['counter', 'register', 'checkout counter'],
        description: 'Display counter with cash register, order slips, and business cards.',
        locationId: 'loc_florist_interior' as LocationId,
        archetype: 'Furniture',
        state: { currentStateId: 'default' },
        capabilities: { container: false, lockable: false, movable: false, breakable: false },
        revealMethod: 'AUTO',
        handlers: {
            onExamine: {
                success: {
                    message: "Display counter made of polished wood. Behind it, a cash register - old mechanical type, not digital.\n\nOrder slips are stacked neatly beside the register. Business cards in a small holder: \"Petal & Stem - Fresh Flowers Daily.\"\n\nProfessional. Organized. Margaret runs a tight ship.",
                    media: undefined
                }
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_florist_display': {
        id: 'obj_florist_display' as GameObjectId,
        name: 'Flower Display',
        alternateNames: ['flowers', 'display', 'bouquets', 'arrangements'],
        description: 'Fresh flower displays - roses, lilies, carnations in bright bunches.',
        locationId: 'loc_florist_interior' as LocationId,
        archetype: 'Display',
        state: { currentStateId: 'default' },
        capabilities: { container: false, lockable: false, movable: false, breakable: false },
        revealMethod: 'AUTO',
        handlers: {
            onExamine: {
                success: {
                    message: "Fresh flowers crowd the display cases. Roses - red, white, pink. Lilies. Carnations. Baby's breath. All carefully arranged.\n\nThe scent is strong. Earth and green stems and that sweet floral perfume.\n\nBeautiful, if you're into that sort of thing. You prefer evidence.",
                    media: undefined
                }
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    // ===== ZONE 7: BUTCHER SHOP (Type 1 - Unlocked) =====

    'obj_butcher_counter': {
        id: 'obj_butcher_counter' as GameObjectId,
        name: 'Butcher Block',
        alternateNames: ['counter', 'butcher block', 'cutting board', 'block'],
        description: 'Heavy wooden butcher block. Worn smooth by years of use. Deep knife marks. Bloodstains.',
        locationId: 'loc_butcher_interior' as LocationId,
        archetype: 'Furniture',
        state: { currentStateId: 'default' },
        capabilities: { container: false, lockable: false, movable: false, breakable: false },
        revealMethod: 'AUTO',
        handlers: {
            onExamine: {
                success: {
                    message: "Thick wood. Maple, maybe oak. The surface is scarred - deep cuts from decades of cleavers, knives, bone saws.\n\nBloodstains seep into the grain. Beef, pork, chicken. All the animals that passed through here, reduced to cuts and portions.\n\nThe wood is worn smooth where Klaus's hands grip it. Countless hours of work.",
                    media: undefined
                }
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_butcher_meat_hooks': {
        id: 'obj_butcher_meat_hooks' as GameObjectId,
        name: 'Meat Hooks',
        alternateNames: ['hooks', 'hanging meat', 'sausages'],
        description: 'Metal hooks hanging from ceiling. Sausages, beef cuts, chicken suspended.',
        locationId: 'loc_butcher_interior' as LocationId,
        archetype: 'Fixture',
        state: { currentStateId: 'default' },
        capabilities: { container: false, lockable: false, movable: false, breakable: false },
        revealMethod: 'AUTO',
        handlers: {
            onExamine: {
                success: {
                    message: "Steel hooks bolted to ceiling tracks. Sausages dangle - bratwurst, kielbasa, salami. Beef cuts wrapped in butcher paper. Whole chickens, plucked and pale.\n\nThe hooks sway slightly when you walk past. A quiet creak of metal on metal.\n\nYou've seen interrogation rooms that looked friendlier.",
                    media: undefined
                }
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_butcher_tool_rack': {
        id: 'obj_butcher_tool_rack' as GameObjectId,
        name: 'Tool Rack',
        alternateNames: ['rack', 'tools', 'wall rack'],
        description: 'Wall-mounted tool rack containing cleavers, saws, and bolt cutters.',
        locationId: 'loc_butcher_interior' as LocationId,
        archetype: 'Container',
        state: { currentStateId: 'default' },
        capabilities: { container: true, lockable: false, movable: false, breakable: false },
        revealMethod: 'AUTO',
        handlers: {
            onExamine: {
                success: {
                    message: "Tool rack mounted on the wall. Professional butcher equipment:\n\n- Meat cleavers (various sizes)\n- Bone saws (manual and electric)\n- Fillet knives\n- Heavy-duty bolt cutters (for cutting through bone and chain)\n\nAll clean, well-maintained. Klaus takes pride in his tools.\n\nThe bolt cutters catch your eye. Those would be useful for cutting chains, padlocks, or anything else that needs serious cutting power.",
                    media: undefined
                }
            },
            onSearch: {
                success: {
                    message: "You examine the tool rack more closely.\n\nThe bolt cutters are accessible - Klaus wouldn't mind if you borrowed them. Friendly guy.\n\nYou could take them if you need a tool for cutting heavy metal.",
                    media: undefined,
                    effects: [
                        { type: 'REVEAL_FROM_PARENT', entityId: 'item_bolt_cutters', parentId: 'obj_butcher_tool_rack' }
                    ]
                }
            }
        },
        design: {
            authorNotes: "Contains bolt cutters (freely given by Klaus NPC). Use for garage chains, CCTV fence, or as alternative to other lock methods.",
            tags: ['container', 'tool-source']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    // ===== ZONE 8: KIOSK (Type 1 - Unlocked) =====

    'obj_kiosk_counter': {
        id: 'obj_kiosk_counter' as GameObjectId,
        name: 'Kiosk Counter',
        alternateNames: ['counter', 'checkout', 'register'],
        description: 'Small counter with lottery tickets, scratch-offs, and a tip jar.',
        locationId: 'loc_kiosk' as LocationId,
        archetype: 'Furniture',
        state: { currentStateId: 'default' },
        capabilities: { container: false, lockable: false, movable: false, breakable: false },
        revealMethod: 'AUTO',
        handlers: {
            onExamine: {
                success: {
                    message: "Bright blue counter. Lottery tickets arranged in neat rows - Powerball, Mega Millions, scratch-offs with promises of instant wealth.\n\nA tip jar sits by the register. Few coins inside. People don't tip at kiosks.\n\nRavi keeps everything organized. Optimistic. Hopeful. The American dream in a blue painted box.",
                    media: undefined
                }
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_kiosk_receipt_spike': {
        id: 'obj_kiosk_receipt_spike' as GameObjectId,
        name: 'Receipt Spike',
        alternateNames: ['spike', 'receipt holder', 'receipts'],
        description: 'Metal spike with old receipts impaled on it. Standard kiosk bookkeeping.',
        locationId: 'loc_kiosk' as LocationId,
        archetype: 'Container',
        state: { currentStateId: 'default' },
        capabilities: { container: true, lockable: false, movable: false, breakable: false },
        revealMethod: 'AUTO',
        handlers: {
            onExamine: {
                success: {
                    message: "Metal receipt spike. Old-school bookkeeping - punch each receipt onto the spike when the transaction's done.\n\nA stack of crumpled receipts impales the spike. Coffee sales, lottery tickets, candy bars. The daily business of survival.\n\nOne receipt near the top has handwriting on it. Someone wrote a note.",
                    media: undefined
                }
            },
            onSearch: {
                success: {
                    message: "You flip through the receipts on the spike.\n\nMostly mundane - $2.50 coffee, $5 lottery ticket, $1.99 candy bar.\n\nThen you find it. A receipt with handwritten text on the back:\n\n\"CCTV keypad - 1440\"\n\nSomeone wrote down the CCTV building access code. Sloppy security, but lucky for you.\n\nYou pocket the receipt. This could get you into the CCTV control building.",
                    media: undefined,
                    effects: [
                        { type: 'SET_FLAG', flag: 'found_cctv_code' as Flag }
                    ]
                }
            }
        },
        design: {
            authorNotes: "Contains receipt with CCTV keypad code (1440). Required for CCTV Building access via keypad (alternative to bolt cutters).",
            tags: ['puzzle-hint', 'code-source']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_kiosk_coffee_machine': {
        id: 'obj_kiosk_coffee_machine' as GameObjectId,
        name: 'Coffee Machine',
        alternateNames: ['coffee maker', 'machine', 'coffee pot'],
        description: 'Drip coffee machine with half-full pot. Smells burnt.',
        locationId: 'loc_kiosk' as LocationId,
        archetype: 'Appliance',
        state: { currentStateId: 'default' },
        capabilities: { container: false, lockable: false, movable: false, breakable: false },
        revealMethod: 'AUTO',
        handlers: {
            onExamine: {
                success: {
                    message: "Standard drip coffee maker. Glass carafe half-full of dark liquid. The warming plate keeps it hot - or at least, keeps it from going cold.\n\nThe smell is burnt. Coffee that's been sitting too long. But in this neighborhood, nobody complains.\n\nRavi offers free coffee to regulars. Part of the charm.",
                    media: undefined
                }
            }
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    // ===== ZONE 9: ALLEY (Type 1 - Unlocked, Secret Door is Type 3) =====

    'obj_alley_dumpster': {
        id: 'obj_alley_dumpster' as GameObjectId,
        name: 'Dumpster',
        alternateNames: ['garbage', 'trash', 'bin', 'trash bin'],
        description: 'Large metal dumpster overflowing with trash bags. Lever mechanism on the side.',
        locationId: 'loc_alley' as LocationId,
        archetype: 'Container',
        state: { currentStateId: 'locked' },
        capabilities: { container: true, lockable: true, movable: false, breakable: false },
        revealMethod: 'AUTO',
        handlers: {
            onExamine: [
                {
                    // Already opened
                    conditions: [{ type: 'FLAG', flag: 'dumpster_opened' as Flag, value: true }],
                    success: {
                        message: "The dumpster lid is open. Trash bags spill out. The smell is overwhelming.\n\nYou can see a yellow hard hat partially buried in the garbage. Alternative to the one at the construction site.",
                        media: undefined
                    }
                },
                {
                    // Default - locked
                    conditions: [],
                    success: {
                        message: "Industrial dumpster. Green metal, rust blooming at the corners. Overflowing with black trash bags.\n\nThe lid is secured with an old lever mechanism on the side. Three positions: UP, MIDDLE, DOWN.\n\nYou need the correct sequence to unlock it.",
                        media: undefined
                    }
                }
            ],
            onOpen: [
                {
                    // Already opened
                    conditions: [{ type: 'FLAG', flag: 'dumpster_opened' as Flag, value: true }],
                    success: {
                        message: "The dumpster is already open. You can see the hard hat inside the trash.",
                        media: undefined
                    }
                },
                {
                    // Not yet unlocked
                    conditions: [],
                    success: {
                        message: "The lever mechanism is locked. You need to set the correct sequence: UP-DOWN-UP.\n\nThe homeless man mentioned this if you talked to him.",
                        media: undefined
                    }
                }
            ]
        },
        design: {
            authorNotes: "Lever puzzle: UP-DOWN-UP (hint from homeless Eddie). Contains hard hat (alternative to Construction shed). Flavor container.",
            tags: ['container', 'puzzle', 'lever-sequence']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_alley_electrical_panel': {
        id: 'obj_alley_electrical_panel' as GameObjectId,
        name: 'Electrical Panel',
        alternateNames: ['panel', 'breaker box', 'electrical box', 'fuse box'],
        description: 'Old electrical panel mounted on brick wall. Rusted shut. Seems suspicious.',
        locationId: 'loc_alley' as LocationId,
        archetype: 'Mechanism',
        state: { currentStateId: 'locked' },
        capabilities: { container: false, lockable: true, movable: false, breakable: false },
        revealMethod: 'AUTO',
        handlers: {
            onExamine: [
                {
                    // Secret door opened
                    conditions: [{ type: 'FLAG', flag: 'secret_door_open' as Flag, value: true }],
                    success: {
                        message: "The electrical panel hangs open. Wires disconnected. The brick wall beside it has slid aside, revealing the hidden passage to the garages.\n\nYou solved the puzzle. The door is open.",
                        media: undefined
                    }
                },
                {
                    // Panel opened, cipher solved
                    conditions: [{ type: 'FLAG', flag: 'electrical_panel_opened' as Flag, value: true }],
                    success: {
                        message: "The electrical panel is open. Inside, you see three colored wires - RED, BLUE, YELLOW - connected to numbered terminals (1-9).\n\nThe graffiti cipher gives you the answer: 4 × 8 ÷ 2 = 16.\n\nYou need to rewire the terminals to match the number 16.",
                        media: undefined
                    }
                },
                {
                    // Default - locked
                    conditions: [],
                    success: {
                        message: "An old breaker box mounted on the brick wall. Metal cover rusted shut.\n\nWhy would an electrical panel be in an alley, mounted on a dead-end wall?\n\nSomething's off. You need wire cutters to pry it open.",
                        media: undefined
                    }
                }
            ],
            onUse: [
                {
                    // Use wire cutters to open panel
                    itemId: 'item_wire_cutters' as ItemId,
                    conditions: [{ type: 'FLAG', flag: 'electrical_panel_opened' as Flag, value: false }],
                    success: {
                        message: "You wedge the wire cutters into the panel seam. Pry. The rusted metal groans.\n\n*SNAP*\n\nThe panel swings open. Inside: three colored wires - RED, BLUE, YELLOW - connected to numbered terminals.\n\nThis isn't a normal electrical panel. It's a puzzle. A lock.\n\nYou need to figure out the correct wiring sequence. The graffiti on the wall might have a clue.",
                        media: undefined,
                        effects: [
                            { type: 'SET_FLAG', flag: 'electrical_panel_opened' as Flag }
                        ]
                    }
                }
            ]
        },
        design: {
            authorNotes: "SECRET DOOR PUZZLE - Requires wire cutters + cipher solution (16). Opens passage to Hidden Garages. Cipher clue on obj_alley_graffiti.",
            tags: ['puzzle', 'secret-door', 'cipher']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_alley_graffiti': {
        id: 'obj_alley_graffiti' as GameObjectId,
        name: 'Graffiti Wall',
        alternateNames: ['graffiti', 'wall', 'tags', 'spray paint'],
        description: 'Brick wall covered in graffiti tags, symbols, and crude drawings.',
        locationId: 'loc_alley' as LocationId,
        archetype: 'Signage',
        state: { currentStateId: 'default' },
        capabilities: { container: false, lockable: false, movable: false, breakable: false },
        revealMethod: 'AUTO',
        handlers: {
            onExamine: {
                success: {
                    message: "The brick wall is a canvas of urban art. Spray paint tags layered over each other. Gang symbols. Phone numbers. Crude drawings.\n\nBut one section stands out - a pattern of symbols:\n\n**4 RED EYES** (spray-painted red circles with black dots)\n**8 BLUE STARS** (five-pointed stars in blue)\n**2 YELLOW LIGHTNING BOLTS** (jagged yellow lines)\n\nBelow them, someone wrote in white paint:\n\"RED EYES × BLUE STARS ÷ YELLOW BOLTS = ?\"\n\nA cipher. A math puzzle. The answer unlocks something.\n\n4 × 8 ÷ 2 = **16**",
                    media: undefined
                }
            }
        },
        design: {
            authorNotes: "CIPHER PUZZLE CLUE - Math equation: 4 × 8 ÷ 2 = 16. Answer unlocks electrical panel (secret door). Visual puzzle.",
            tags: ['puzzle-clue', 'cipher', 'readable']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    // ===== ZONE 10: HIDDEN GARAGES (Type 3 - Hidden) =====

    'obj_garage_1': {
        id: 'obj_garage_1' as GameObjectId,
        name: 'Garage Door #1',
        alternateNames: ['garage 1', 'door 1', 'first garage', 'garage one'],
        description: 'Old garage door with mechanical padlock. Weathered paint.',
        locationId: 'loc_hidden_garages' as LocationId,
        archetype: 'Container',
        state: { currentStateId: 'locked' },
        capabilities: { container: true, lockable: true, movable: false, breakable: false },
        revealMethod: 'AUTO',
        handlers: {
            onExamine: [
                {
                    // Already opened
                    conditions: [{ type: 'FLAG', flag: 'garage_1_opened' as Flag, value: true }],
                    success: {
                        message: "Garage #1 is open. The padlock lies on the ground, cut or picked.\n\nInside: old furniture, paint cans, garden tools. Nothing useful. Just storage.",
                        media: undefined
                    }
                },
                {
                    // Default - locked
                    conditions: [],
                    success: {
                        message: "Garage door #1. Old roll-up door, paint peeling. A heavy mechanical padlock secures it.\n\nYou could pick the lock with your lock pick set, or cut it with bolt cutters.",
                        media: undefined
                    }
                }
            ],
            onOpen: [
                {
                    // Already opened
                    conditions: [{ type: 'FLAG', flag: 'garage_1_opened' as Flag, value: true }],
                    success: {
                        message: "Garage #1 is already open. Nothing useful inside.",
                        media: undefined
                    }
                },
                {
                    // Not yet unlocked
                    conditions: [],
                    success: {
                        message: "The garage is locked with a mechanical padlock. You need to pick the lock or cut it with bolt cutters.",
                        media: undefined
                    }
                }
            ],
            onUse: [
                {
                    // Use lock pick set
                    itemId: 'item_lock_pick_set' as ItemId,
                    conditions: [{ type: 'FLAG', flag: 'garage_1_opened' as Flag, value: false }],
                    success: {
                        message: "You insert the lock pick into the padlock. Feel for the pins. Tension wrench steady.\n\n*Click*\n*Click*\n*CLUNK*\n\nThe padlock opens. You pull open the garage door.\n\nInside: old furniture, paint cans, garden tools. Nothing relevant to your investigation.",
                        media: undefined,
                        effects: [
                            { type: 'SET_FLAG', flag: 'garage_1_opened' as Flag }
                        ]
                    }
                },
                {
                    // Use bolt cutters
                    itemId: 'item_bolt_cutters' as ItemId,
                    conditions: [{ type: 'FLAG', flag: 'garage_1_opened' as Flag, value: false }],
                    success: {
                        message: "You position the bolt cutters on the padlock shackle. Squeeze.\n\n*SNAP*\n\nThe shackle parts. The padlock falls to the ground.\n\nYou pull open the garage door. Inside: old furniture, paint cans, garden tools. Nothing useful.",
                        media: undefined,
                        effects: [
                            { type: 'SET_FLAG', flag: 'garage_1_opened' as Flag }
                        ]
                    }
                }
            ]
        },
        design: {
            authorNotes: "Flavor garage - no evidence. Can be opened with lock pick set OR bolt cutters. Alternative methods.",
            tags: ['container', 'flavor', 'locked']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_garage_2': {
        id: 'obj_garage_2' as GameObjectId,
        name: 'Garage Door #2',
        alternateNames: ['garage 2', 'door 2', 'second garage', 'garage two'],
        description: 'Garage door with combination lock. Four-digit dial.',
        locationId: 'loc_hidden_garages' as LocationId,
        archetype: 'Container',
        state: { currentStateId: 'locked' },
        capabilities: { container: true, lockable: true, movable: false, breakable: false },
        revealMethod: 'AUTO',
        handlers: {
            onExamine: {
                success: {
                    message: "Garage door #2. Secured with a four-digit combination lock.\n\nThe dial is weathered but functional. You'd need the correct combination to open it.\n\nOr you could just use bolt cutters and skip the puzzle entirely.",
                    media: undefined
                }
            },
            onOpen: {
                success: {
                    message: "The combination lock is secure. You need the 4-digit code, or use bolt cutters to bypass it.",
                    media: undefined
                }
            }
        },
        design: {
            authorNotes: "Flavor garage - no evidence. Can be opened with combination (flavor puzzle) OR bolt cutters. Optional exploration.",
            tags: ['container', 'flavor', 'locked', 'combination']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_garage_3': {
        id: 'obj_garage_3' as GameObjectId,
        name: 'Garage Door #3',
        alternateNames: ['garage 3', 'door 3', 'third garage', 'garage three'],
        description: 'Modern garage door with digital keypad. Four-digit PIN required.',
        locationId: 'loc_hidden_garages' as LocationId,
        archetype: 'Container',
        state: { currentStateId: 'locked' },
        capabilities: { container: true, lockable: true, movable: false, breakable: false },
        revealMethod: 'AUTO',
        handlers: {
            onExamine: [
                {
                    // Already opened
                    conditions: [{ type: 'FLAG', flag: 'garage_3_opened' as Flag, value: true }],
                    success: {
                        message: "Garage #3 is open. The digital keypad shows green - access granted.\n\nInside, you can see the gray cargo van. License plate: LKJ-9472.\n\nThis is it. The van from the CCTV footage.",
                        media: undefined
                    }
                },
                {
                    // Default - locked
                    conditions: [],
                    success: {
                        message: "Garage door #3. Unlike the others, this one has a modern digital keypad mounted beside it.\n\nFour-digit PIN required. The keypad glows red - locked.\n\nThe license plate from the CCTV screenshot comes to mind: LKJ-**9472**.\n\nMaybe the numeric portion is the PIN?",
                        media: undefined
                    }
                }
            ],
            onOpen: [
                {
                    // Already opened
                    conditions: [{ type: 'FLAG', flag: 'garage_3_opened' as Flag, value: true }],
                    success: {
                        message: "The garage is already open. The gray van waits inside.",
                        media: undefined
                    }
                },
                {
                    // Not yet unlocked
                    conditions: [],
                    success: {
                        message: "The garage is locked. You need to enter the correct 4-digit PIN on the keypad.\n\nThe license plate number from Evidence 1 might be relevant: LKJ-9472. The numeric portion is 9472.",
                        media: undefined
                    }
                }
            ]
        },
        design: {
            authorNotes: "EVIDENCE 2 LOCATION - PIN is 9472 (from license plate LKJ-9472 in Evidence 1). Contains gray van with registration card.",
            tags: ['container', 'evidence-location', 'keypad-lock']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_garage_3_van': {
        id: 'obj_garage_3_van' as GameObjectId,
        name: 'Gray Van',
        alternateNames: ['van', 'cargo van', 'vehicle', 'gray cargo van'],
        description: 'Gray cargo van. License plate: LKJ-9472. Matches CCTV screenshot.',
        locationId: 'loc_hidden_garages' as LocationId,
        archetype: 'Vehicle',
        parentId: 'obj_garage_3' as GameObjectId,
        state: { currentStateId: 'default' },
        capabilities: { container: true, lockable: false, movable: false, breakable: false },
        revealMethod: 'REVEAL_FROM_PARENT',
        handlers: {
            onExamine: {
                success: {
                    message: "Gray cargo van. 2024 Chevrolet Express.\n\nLicense plate: **LKJ-9472**\n\nThis is the van from the CCTV screenshot. The vehicle that was repeatedly spotted on Elm Street before Lili's alleged abduction.\n\nThe doors are unlocked. The glove compartment is accessible.",
                    media: undefined,
                    effects: [
                        { type: 'REVEAL_FROM_PARENT', entityId: 'obj_garage_3_glove_box', parentId: 'obj_garage_3_van' }
                    ]
                }
            }
        },
        design: {
            authorNotes: "Gray van from CCTV footage. Contains glove box with Evidence 2 (registration card). Revealed when Garage #3 opens.",
            tags: ['vehicle', 'evidence-container']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_garage_3_glove_box': {
        id: 'obj_garage_3_glove_box' as GameObjectId,
        name: 'Glove Compartment',
        alternateNames: ['glove box', 'compartment', 'glovebox'],
        description: 'Glove compartment in the gray van. Contains registration documents.',
        locationId: 'loc_hidden_garages' as LocationId,
        archetype: 'Container',
        parentId: 'obj_garage_3_van' as GameObjectId,
        state: { currentStateId: 'default' },
        capabilities: { container: true, lockable: false, movable: false, breakable: false },
        revealMethod: 'REVEAL_FROM_PARENT',
        handlers: {
            onExamine: {
                success: {
                    message: "The glove compartment pops open. Inside:\n\n- Vehicle registration card\n- Owner's manual\n- Tire pressure gauge\n- Old gas receipts\n\nThe registration card is what you need. Evidence.",
                    media: undefined
                }
            },
            onOpen: {
                success: {
                    message: "You open the glove compartment. The registration card is right there.\n\nOwner: Jeremy Miller\nAddress: 447 Willow Lane, Bloodhaven\n\nThis is Evidence 2. Take it.",
                    media: undefined,
                    effects: [
                        { type: 'REVEAL_FROM_PARENT', entityId: 'item_van_registration', parentId: 'obj_garage_3_glove_box' }
                    ]
                }
            }
        },
        design: {
            authorNotes: "EVIDENCE 2 LOCATION - Contains van registration card identifying owner (Jeremy Miller, 447 Willow Lane). Final container in evidence chain.",
            tags: ['container', 'evidence-location']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    // ===== ZONE STORAGE CONTAINERS (for dropped items) =====

    'obj_street_storage': {
        id: 'obj_street_storage' as GameObjectId,
        name: 'Dropped Items',
        alternateNames: ['dropped items', 'items', 'ground', 'floor'],
        description: 'Items you\'ve dropped on Elm Street.',
        locationId: 'loc_elm_street' as LocationId,
        archetype: 'Container',
        state: { currentStateId: 'default' },
        capabilities: { container: true, lockable: false, movable: false, breakable: false },
        revealMethod: 'AUTO',
        handlers: {
            onExamine: {
                success: {
                    message: "Items you've dropped here on Elm Street. You can TAKE them back if needed.",
                    media: undefined
                }
            }
        },
        design: {
            authorNotes: "Zone storage container for Elm Street dropped items.",
            tags: ['storage', 'hidden']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_florist_exterior_storage': {
        id: 'obj_florist_exterior_storage' as GameObjectId,
        name: 'Dropped Items',
        alternateNames: ['dropped items', 'items', 'ground', 'floor'],
        description: 'Items you\'ve dropped outside the florist shop.',
        locationId: 'loc_florist_exterior' as LocationId,
        archetype: 'Container',
        state: { currentStateId: 'default' },
        capabilities: { container: true, lockable: false, movable: false, breakable: false },
        revealMethod: 'AUTO',
        handlers: {
            onExamine: {
                success: {
                    message: "Items you've left outside the florist shop. You can TAKE them back.",
                    media: undefined
                }
            }
        },
        design: {
            authorNotes: "Zone storage container for florist exterior dropped items.",
            tags: ['storage', 'hidden']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_florist_interior_storage': {
        id: 'obj_florist_interior_storage' as GameObjectId,
        name: 'Dropped Items',
        alternateNames: ['dropped items', 'items', 'ground', 'floor'],
        description: 'Items you\'ve dropped inside the florist shop.',
        locationId: 'loc_florist_interior' as LocationId,
        archetype: 'Container',
        state: { currentStateId: 'default' },
        capabilities: { container: true, lockable: false, movable: false, breakable: false },
        revealMethod: 'AUTO',
        handlers: {
            onExamine: {
                success: {
                    message: "Items you've left on the floor of the florist shop. You can TAKE them back.",
                    media: undefined
                }
            }
        },
        design: {
            authorNotes: "Zone storage container for florist shop dropped items.",
            tags: ['storage', 'hidden']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_butcher_exterior_storage': {
        id: 'obj_butcher_exterior_storage' as GameObjectId,
        name: 'Dropped Items',
        alternateNames: ['dropped items', 'items', 'ground', 'floor'],
        description: 'Items you\'ve dropped outside the butcher shop.',
        locationId: 'loc_butcher_exterior' as LocationId,
        archetype: 'Container',
        state: { currentStateId: 'default' },
        capabilities: { container: true, lockable: false, movable: false, breakable: false },
        revealMethod: 'AUTO',
        handlers: {
            onExamine: {
                success: {
                    message: "Items you've left outside the butcher shop. You can TAKE them back.",
                    media: undefined
                }
            }
        },
        design: {
            authorNotes: "Zone storage container for butcher exterior dropped items.",
            tags: ['storage', 'hidden']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_butcher_interior_storage': {
        id: 'obj_butcher_interior_storage' as GameObjectId,
        name: 'Dropped Items',
        alternateNames: ['dropped items', 'items', 'ground', 'floor'],
        description: 'Items you\'ve dropped inside the butcher shop.',
        locationId: 'loc_butcher_interior' as LocationId,
        archetype: 'Container',
        state: { currentStateId: 'default' },
        capabilities: { container: true, lockable: false, movable: false, breakable: false },
        revealMethod: 'AUTO',
        handlers: {
            onExamine: {
                success: {
                    message: "Items you've left on the floor of the butcher shop. You can TAKE them back.",
                    media: undefined
                }
            }
        },
        design: {
            authorNotes: "Zone storage container for butcher shop dropped items.",
            tags: ['storage', 'hidden']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_bus_stop_storage': {
        id: 'obj_bus_stop_storage' as GameObjectId,
        name: 'Dropped Items',
        alternateNames: ['dropped items', 'items', 'ground', 'floor'],
        description: 'Items you\'ve dropped at the bus stop.',
        locationId: 'loc_bus_stop' as LocationId,
        archetype: 'Container',
        state: { currentStateId: 'default' },
        capabilities: { container: true, lockable: false, movable: false, breakable: false },
        revealMethod: 'AUTO',
        handlers: {
            onExamine: {
                success: {
                    message: "Items you've left at the bus stop. You can TAKE them back.",
                    media: undefined
                }
            }
        },
        design: {
            authorNotes: "Zone storage container for bus stop dropped items.",
            tags: ['storage', 'hidden']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    'obj_alley_storage': {
        id: 'obj_alley_storage' as GameObjectId,
        name: 'Dropped Items',
        alternateNames: ['dropped items', 'items', 'ground', 'floor'],
        description: 'Items you\'ve dropped in the alley.',
        locationId: 'loc_alley' as LocationId,
        archetype: 'Container',
        state: { currentStateId: 'default' },
        capabilities: { container: true, lockable: false, movable: false, breakable: false },
        revealMethod: 'AUTO',
        handlers: {
            onExamine: {
                success: {
                    message: "Items you've left in the alley. You can TAKE them back.",
                    media: undefined
                }
            }
        },
        design: {
            authorNotes: "Zone storage container for alley dropped items.",
            tags: ['storage', 'hidden']
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    }
};

// ===== NPCS =====
const npcs: Record<NpcId, NPC> = {
    // ===== NPC 1: MARGARET CHEN (Florist) - Type 1→2, EVIDENCE 3 SOURCE =====
    'npc_margaret_chen': {
        id: 'npc_margaret_chen' as NpcId,
        name: 'Margaret Chen',
        description: 'The owner of Petal & Stem florist. Middle-aged, kind eyes, hands always moving - arranging, trimming, watering. She notices things. The kind of person who remembers faces.',
        image: undefined, // TODO: Add portrait
        zone: 'zone_florist_shop' as ZoneId,
        npcType: 'type1',
        importance: 'primary',
        initialState: {
            stage: 'active',
            trust: 70,
            attitude: 'friendly'
        },
        dialogueType: 'scripted',
        welcomeMessage: 'Margaret looks up from arranging lilies.\n\n"Can I help you find something?"',
        goodbyeMessage: 'Margaret nods. "Take care, Detective."',
        handlers: {
            onGive: [
                {
                    itemId: 'item_lili_photo',
                    conditions: [{ type: 'FLAG', flag: 'margaret_gave_statement', value: true }],
                    success: {
                        message: 'Margaret glances at the photo.\n\n"I already told you everything I know. I hope it helps."'
                    }
                },
                {
                    itemId: 'item_lili_photo',
                    conditions: [],
                    success: {
                        message: 'Margaret takes the photo. Studies it.\n\n"Oh my. Yes. I\'ve seen her."\n\nShe hands it back.\n\n"She comes in sometimes. Not alone, though. Always with a young man. Mid-twenties, I\'d say. Quiet type. But... intense.\n\nThe way he looked at her - completely devoted. Hung on her every word. She seemed more... reserved. Calculating, almost. Always looking over her shoulder.\n\nBut him? He\'d do anything she asked. Anything. I\'ve seen that look before. It\'s... obsession."\n\nYou pull out your phone.\n\n"Can you give a statement? On record?"\n\nMargaret nods. "Of course. If this helps you, Detective, I\'m happy to go on record."',
                        effects: [
                            { type: 'SET_FLAG', flag: 'margaret_gave_statement', value: true },
                            {
                                type: 'CREATE_DYNAMIC_ITEM',
                                item: {
                                    id: 'item_witness_statement_audio' as ItemId,
                                    name: 'Witness Statement (Margaret Chen)',
                                    description: 'Audio recording of Margaret Chen\'s witness statement about Lili Morgenstern and the obsessed young man who always accompanied her.',
                                    itemType: 'Evidence',
                                    media: {
                                        audio: {
                                            url: 'https://placeholder-audio-url/margaret_statement.mp3',
                                            description: 'Margaret Chen witness statement',
                                            transcript: 'My name is Margaret Chen, owner of Petal & Stem Florist on Elm Street. I\'ve seen the woman in this photo - Lili - multiple times over the past two months. She always came with a young man who appeared obsessively devoted to her. She seemed detached, but he would do anything she asked.'
                                        }
                                    },
                                    handlers: {
                                        onExamine: {
                                            success: {
                                                message: 'Audio recording: Margaret Chen witness statement.\n\nRecorded on Elm Street. States Lili was repeatedly seen with an obsessed young man who would "do anything she asked."\n\nThis is Evidence 3.'
                                            }
                                        }
                                    },
                                    design: {
                                        tags: ['evidence', 'audio', 'witness-statement'],
                                        authorNotes: 'EVIDENCE 3 - Proves Lili had relationship with obsessed man (staging collaboration)'
                                    },
                                    version: { schema: '1.0.0', content: '1.0.0' }
                                }
                            },
                            { type: 'ADD_ITEM', itemId: 'item_witness_statement_audio' as ItemId },
                            { type: 'SET_FLAG', flag: 'found_evidence_3', value: true },
                            {
                                type: 'SHOW_MESSAGE',
                                speaker: 'narrator',
                                content: 'EVIDENCE 3 ACQUIRED: Recorded witness statement.\n\nMargaret\'s testimony proves Lili had a relationship with an obsessed young man. This contradicts her claim of random abduction.',
                                messageType: 'text'
                            },
                            // Demote to Type 2
                            { type: 'SET_ENTITY_STATE', entityId: 'npc_margaret_chen', patch: { stage: 'demoted', importance: 'ambient' } }
                        ]
                    }
                }
            ]
        },
        demoteRules: {
            onFlagsAll: ['margaret_gave_statement' as Flag],
            then: {
                setStage: 'demoted',
                setImportance: 'ambient',
                effects: []
            }
        },
        postCompletionProfile: {
            welcomeMessage: 'Margaret smiles. "Back again?"',
            goodbyeMessage: 'Margaret returns to her flowers.',
            defaultResponse: 'Margaret talks about flower meanings, business being slow, the neighborhood changing. Friendly. But her crucial information has been given.',
            topics: [
                {
                    topicId: 'flowers',
                    label: 'Flower meanings',
                    keywords: ['flowers', 'roses', 'lilies', 'meaning'],
                    response: {
                        message: 'Margaret brightens.\n\n"Lilies represent purity. Roses, love. But meanings change with color. Red roses - passion. White - innocence. Yellow - friendship... or sometimes betrayal."\n\nShe arranges stems with practiced hands.'
                    }
                },
                {
                    topicId: 'business',
                    label: 'Business',
                    keywords: ['business', 'shop', 'customers', 'sales'],
                    response: {
                        message: 'Margaret sighs.\n\n"Business has been slow. People don\'t buy flowers like they used to. Supermarkets sell cheap bouquets. Can\'t compete."\n\nShe shrugs. "But I love what I do."'
                    }
                }
            ]
        },
        fallbacks: {
            default: 'Margaret continues arranging flowers, offering polite small talk.',
            offTopic: 'Margaret listens politely but doesn\'t have much to say about that.'
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    // ===== NPC 2: MIKE KOWALSKI (Electrician) - Type 1→2 =====
    'npc_mike_kowalski': {
        id: 'npc_mike_kowalski' as NpcId,
        name: 'Mike Kowalski',
        description: 'Electrician. Mid-forties, work-worn hands, perpetual coffee stain on his thermos. Guards his van like a hawk. Too many tools stolen in this neighborhood. He\'s not leaving.',
        image: undefined, // TODO: Add portrait
        zone: 'zone_electrician_truck' as ZoneId,
        npcType: 'type1',
        importance: 'supporting',
        initialState: {
            stage: 'active',
            trust: 30,
            attitude: 'neutral'
        },
        dialogueType: 'scripted',
        welcomeMessage: 'Mike glances up from his phone.\n\n"Help you?" His tone suggests he\'d rather you didn\'t need help.',
        goodbyeMessage: 'Mike returns to his phone.',
        handlers: {
            // TODO: AI-judged distraction will be implemented later
            // For now, placeholder for creative distraction attempts
            onTalk: {
                conditions: [{ type: 'FLAG', flag: 'distracted_mike', value: true }],
                success: {
                    message: 'Mike is still away checking on that issue you mentioned. His van is unattended.'
                },
                fail: {
                    message: 'Mike is sitting in the driver\'s seat, scrolling his phone, guarding his tools.\n\n"I can\'t leave my van. Too many tools get stolen around here."\n\nYou\'ll need to distract him somehow if you want access to his toolbox.'
                }
            }
        },
        demoteRules: {
            onFlagsAll: ['distracted_mike' as Flag],
            then: {
                setStage: 'demoted',
                setImportance: 'ambient',
                effects: []
            }
        },
        postCompletionProfile: {
            welcomeMessage: 'Mike nods. "Yeah?"',
            goodbyeMessage: 'Mike goes back to his coffee.',
            defaultResponse: 'Mike complains about the construction workers tripping breakers, union dues going up, copper prices making jobs harder. Blue-collar grievances.',
            topics: [
                {
                    topicId: 'union',
                    label: 'Union',
                    keywords: ['union', 'dues', 'workers'],
                    response: {
                        message: 'Mike grunts.\n\n"Union dues keep going up. But what choice do we have? Gotta stick together. Otherwise bosses would screw us even worse."\n\nHe takes a sip of coffee.'
                    }
                },
                {
                    topicId: 'construction',
                    label: 'Construction site',
                    keywords: ['construction', 'site', 'workers', 'building'],
                    response: {
                        message: 'Mike shakes his head.\n\n"Those guys? Always tripping breakers. I fix their electrical, they break it again next week. Job security, I guess."\n\nHe doesn\'t sound thrilled.'
                    }
                }
            ]
        },
        fallbacks: {
            default: 'Mike offers curt responses. He\'s not chatty.',
            offTopic: 'Mike shrugs. "Don\'t know much about that."'
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    // ===== NPC 3: KLAUS RICHTER (Butcher) - Type 2 (Flavor Only) =====
    'npc_klaus_richter': {
        id: 'npc_klaus_richter' as NpcId,
        name: 'Klaus Richter',
        description: 'Owner of Richter\'s Meats. German accent, dark humor, surprisingly friendly. Gives tools freely - bolt cutters, sausage for Eddie. Mentions seeing a gray van by the alley.',
        image: undefined, // TODO: Add portrait
        zone: 'zone_butcher_shop' as ZoneId,
        npcType: 'type2',
        importance: 'supporting',
        initialState: {
            stage: 'active',
            trust: 60,
            attitude: 'friendly'
        },
        dialogueType: 'freeform',
        persona: 'You are Klaus Richter, a German butcher in Bloodhaven. Friendly, makes dark jokes without realizing they sound ominous (e.g., "You look like you\'ve been through the grinder!"). You freely give tools - bolt cutters, sausages - because you like helping people. You saw a gray van parked by the alley yesterday. Speak with slight German accent, warm but with unintentional gallows humor.',
        welcomeMessage: 'Klaus looks up from sharpening his cleaver.\n\n"Ah! Customer! You look like you\'ve been through the grinder! Haha! How can I help?"',
        goodbyeMessage: 'Klaus waves his cleaver cheerfully. "Come back anytime!"',
        limits: {
            maxInteractions: 5,
            interactionLimitResponse: 'Klaus smiles but returns to his work. "Busy day. Come back later, ja?"'
        },
        topics: [
            {
                topicId: 'tools',
                label: 'Tools',
                keywords: ['bolt cutters', 'tools', 'borrow', 'lend'],
                response: {
                    message: 'Klaus gestures to the tool rack.\n\n"Bolt cutters? Sure, take \'em. Just bring back when done, ja? Too many things disappear in this neighborhood."'
                }
            },
            {
                topicId: 'gray_van',
                label: 'Gray van',
                keywords: ['van', 'gray', 'vehicle', 'alley'],
                response: {
                    message: 'Klaus nods.\n\n"Ja, I saw it. Gray cargo van. Parked by the alley yesterday. Odd. Never seen it before. Then gone."\n\nHe shrugs. "Lots of odd things in this neighborhood."'
                }
            }
        ],
        fallbacks: {
            default: 'Klaus talks about meat cuts, smoking techniques, the old country. Friendly, with unintentionally dark jokes.',
            offTopic: 'Klaus chuckles. "Don\'t know about that. I just cut meat!"'
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    // ===== NPC 4: RAVI PATEL (Kiosk Owner) - Type 2 (Flavor Only) =====
    'npc_ravi_patel': {
        id: 'npc_ravi_patel' as NpcId,
        name: 'Ravi Patel',
        description: 'Kiosk owner. Young, friendly, perpetual smile. Sells coffee, lottery tickets, fingerprint powder for his "detective novel hobby." Knows the neighborhood. Hints that receipt has CCTV code.',
        image: undefined, // TODO: Add portrait
        zone: 'zone_kiosk' as ZoneId,
        npcType: 'type2',
        importance: 'supporting',
        initialState: {
            stage: 'active',
            trust: 70,
            attitude: 'friendly'
        },
        dialogueType: 'freeform',
        persona: 'You are Ravi Patel, a friendly kiosk owner in Bloodhaven. Always cheerful, love helping customers. You\'re writing a detective novel as a hobby (bad novel, but enthusiastic). You keep fingerprint powder for "research." You saw a gray van parked by the alley recently. You have a receipt spike with old receipts - one has "CCTV keypad - 1440" written on it. You give items freely: "Take what you need, friend!"',
        welcomeMessage: 'Ravi beams.\n\n"Hey, friend! Coffee? Snacks? Help yourself!"',
        goodbyeMessage: 'Ravi waves. "Come back anytime!"',
        limits: {
            maxInteractions: 5,
            interactionLimitResponse: 'Ravi smiles apologetically. "Sorry, friend, I need to help other customers. Come back later!"'
        },
        topics: [
            {
                topicId: 'novel',
                label: 'Detective novel',
                keywords: ['novel', 'book', 'writing', 'detective', 'story'],
                response: {
                    message: 'Ravi\'s eyes light up.\n\n"I\'m writing a detective novel! It\'s about a kiosk owner who solves crimes! You know, because we see everything in the neighborhood."\n\nHe pulls out a notebook covered in coffee stains. "It\'s terrible, but I love it!"'
                }
            },
            {
                topicId: 'gray_van',
                label: 'Gray van',
                keywords: ['van', 'gray', 'vehicle', 'alley'],
                response: {
                    message: 'Ravi nods.\n\n"Saw it parked by the alley recently. Gray cargo van. Young guy driving. Looked nervous. Kept checking over his shoulder."\n\nHe shrugs. "Weird, right?"'
                }
            }
        ],
        fallbacks: {
            default: 'Ravi chatters about lottery winners, his detective novel, neighborhood gossip. Always friendly.',
            offTopic: 'Ravi smiles. "Don\'t know much about that, friend!"'
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    // ===== NPC 5: EDDIE (Homeless Man) - Type 1→2 =====
    'npc_eddie': {
        id: 'npc_eddie' as NpcId,
        name: 'Eddie',
        description: 'Homeless man living in the alley. Tattered coat, tired eyes. Hungry. Needs food. In exchange for smoked sausage, he gives information about the gray van and the dumpster lever hint.',
        image: undefined, // TODO: Add portrait
        zone: 'zone_alley' as ZoneId,
        npcType: 'type1',
        importance: 'supporting',
        initialState: {
            stage: 'active',
            trust: 50,
            attitude: 'neutral'
        },
        dialogueType: 'scripted',
        welcomeMessage: 'Eddie looks up from his cardboard bed.\n\n"Got anything to eat? Haven\'t had a meal in days..."',
        goodbyeMessage: 'Eddie nods. "Thanks for stopping by."',
        handlers: {
            onGive: [
                {
                    itemId: 'item_smoked_sausage',
                    conditions: [{ type: 'FLAG', flag: 'eddie_fed', value: true }],
                    success: {
                        message: 'Eddie shakes his head.\n\n"Thanks, but I\'m good now. You already helped me."'
                    }
                },
                {
                    itemId: 'item_smoked_sausage',
                    conditions: [],
                    success: {
                        message: 'Eddie takes the sausage. His hands shake.\n\n"Oh man, thank you. You\'re a good person, Detective. I know you didn\'t do what they\'re saying."\n\nHe takes a bite. Chews slowly.\n\n"I\'ve been here for weeks. Seen a gray van come and go. Young guy, always nervous. And that girl from the news? She was here too. With him.\n\nThey didn\'t look like victim and kidnapper to me. More like... partners."\n\nYou lean in.\n\n"Where\'d they go?"\n\nEddie gestures at the brick wall.\n\n"Behind the wall. Secret door. I see everything from my spot here. They thought nobody was watching."\n\nHe points at the dumpster.\n\n"That old dumpster? Lever system. UP-DOWN-UP. That\'s how you open those old models. Found a hard hat in there once."',
                        effects: [
                            { type: 'REMOVE_ITEM', itemId: 'item_smoked_sausage' as ItemId },
                            { type: 'SET_FLAG', flag: 'eddie_fed', value: true },
                            { type: 'SET_FLAG', flag: 'knows_dumpster_sequence', value: true },
                            { type: 'SET_FLAG', flag: 'knows_secret_door', value: true },
                            { type: 'SET_ENTITY_STATE', entityId: 'npc_eddie', patch: { stage: 'demoted', importance: 'ambient' } }
                        ]
                    }
                }
            ]
        },
        demoteRules: {
            onGiveItemsAny: ['item_smoked_sausage' as ItemId],
            then: {
                setStage: 'demoted',
                setImportance: 'ambient',
                effects: []
            }
        },
        postCompletionProfile: {
            welcomeMessage: 'Eddie nods. "Hey, Detective."',
            goodbyeMessage: 'Eddie returns to his cardboard.',
            defaultResponse: 'Eddie tells stories about street life, mentions police searched the alley but missed the wall door, talks about seeing the neighborhood change over the years.',
            topics: [
                {
                    topicId: 'street_life',
                    label: 'Street life',
                    keywords: ['homeless', 'street', 'living', 'survive'],
                    response: {
                        message: 'Eddie sighs.\n\n"You learn to be invisible. People look past you. But that means you see things they don\'t."\n\nHe pulls his coat tighter. "Cold nights are the worst."'
                    }
                },
                {
                    topicId: 'police',
                    label: 'Police search',
                    keywords: ['police', 'search', 'cops', 'investigation'],
                    response: {
                        message: 'Eddie chuckles darkly.\n\n"They searched the alley. Walked right past that wall door. Never even noticed it. Too busy looking for obvious stuff."\n\nHe shakes his head. "You found it though."'
                    }
                }
            ]
        },
        fallbacks: {
            default: 'Eddie shares quiet observations about the street. He\'s seen a lot.',
            offTopic: 'Eddie shrugs. "Don\'t know about that."'
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    },

    // ===== NPC 6: TONY GRECO (Construction Foreman) - Type 1→2 =====
    'npc_tony_greco': {
        id: 'npc_tony_greco' as NpcId,
        name: 'Tony Greco',
        description: 'Construction foreman. Forties, weathered face, union sticker on his hard hat. Blocks the gate. "Hard hat. No exceptions. Insurance." Once you wear a hard hat, he lets you in.',
        image: undefined, // TODO: Add portrait
        npcType: 'type1',
        importance: 'supporting',
        initialState: {
            stage: 'active',
            trust: 40,
            attitude: 'neutral'
        },
        dialogueType: 'scripted',
        welcomeMessage: 'Tony crosses his arms.\n\n"Can\'t let you in without proper gear. Hard hat. No exceptions. Insurance."',
        goodbyeMessage: 'Tony returns to his clipboard.',
        handlers: {
            onTalk: {
                conditions: [
                    { type: 'HAS_FLAG', flag: 'wearing_hard_hat' as Flag }
                ],
                success: {
                    message: 'Tony looks at your hard hat.\n\n"Alright. You\'re good. Don\'t touch anything. We\'ve had enough delays."\n\nHe steps aside.\n\nYou can enter the construction site now.',
                    effects: [
                        { type: 'SET_ENTITY_STATE', entityId: 'npc_tony_greco', patch: { stage: 'demoted', importance: 'ambient' } }
                    ]
                },
                fail: {
                    message: 'Tony doesn\'t budge.\n\n"Hard hat. No exceptions. Insurance rules."\n\nHe taps his clipboard. "Come back when you have proper gear."'
                }
            }
        },
        demoteRules: {
            onFlagsAll: ['wearing_hard_hat' as Flag],
            then: {
                setStage: 'demoted',
                setImportance: 'ambient',
                effects: []
            }
        },
        postCompletionProfile: {
            welcomeMessage: 'Tony nods. "Yeah?"',
            goodbyeMessage: 'Tony goes back to his paperwork.',
            defaultResponse: 'Tony complains about city permits taking forever, inspectors being picky, delays costing money. Typical construction foreman frustrations.',
            topics: [
                {
                    topicId: 'permits',
                    label: 'Permits',
                    keywords: ['permits', 'city', 'bureaucracy', 'paperwork'],
                    response: {
                        message: 'Tony scowls.\n\n"Permits take forever. City inspectors nitpick everything. Meanwhile, we\'re bleeding money on delays."\n\nHe slaps his clipboard. "Bureaucracy."'
                    }
                },
                {
                    topicId: 'delays',
                    label: 'Construction delays',
                    keywords: ['delays', 'construction', 'schedule', 'timeline'],
                    response: {
                        message: 'Tony shakes his head.\n\n"Three weeks behind. Electrical issues, permit delays, weather. Boss is gonna have my head."\n\nHe sounds exhausted.'
                    }
                }
            ]
        },
        fallbacks: {
            default: 'Tony talks about union rules, safety regulations, budget overruns. All business.',
            offTopic: 'Tony shrugs. "Not my department."'
        },
        version: { schema: '1.0.0', content: '1.0.0' }
    }
};

// ===== LOCATIONS =====
const locations: Record<LocationId, Location> = {
    // ===== ZONE 0: ELM STREET (Hub - Always Unlocked) =====
    'loc_elm_street': {
        locationId: 'loc_elm_street' as LocationId,
        name: 'Elm Street',
        sceneDescription: 'You stand on Elm Street, a quiet urban block lined with old brick buildings. The air smells faintly of coffee and exhaust. Streetlights flicker on as dusk approaches, casting long shadows across the cracked sidewalk.\n\nTo the north, a bus stop shelter sits beneath a buzzing fluorescent sign. West, a white electrician\'s van is parked at the curb. East, a narrow alley mouth opens between buildings. South, the construction site\'s orange barriers block off half the sidewalk.\n\nStorefronts line the block:\n- A florist shop with gold-lettered windows\n- A butcher shop with faded red paint\n- Ravi\'s kiosk, its serving window open and glowing warmly',
        introMessage: 'You stand on Elm Street.\n\nThis is where it happened. Where Lili claims you abducted her. April 15th, 6:15 PM. Right here.\n\nBut you weren\'t here. You know that. Sarah knows that. Now you need to prove it.\n\nThe street is quiet. Evening settling in. Streetlights flicker on, casting long noir shadows. You take it in - the bus stop, the shops, the electrician\'s van, the alley. Somewhere here, there\'s evidence. Evidence that will prove the abduction was staged.\n\nTime to investigate.',
        objects: ['obj_streetlight' as GameObjectId, 'obj_sidewalk' as GameObjectId, 'obj_street_sign' as GameObjectId],
        npcs: [],
        items: []
    },

    // ===== ZONE 1: BUS STOP (Flavor Zone - Type 1) =====
    'loc_bus_stop': {
        locationId: 'loc_bus_stop' as LocationId,
        name: 'Bus Stop',
        sceneDescription: 'The bus stop shelter offers little protection from the wind that funnels down Elm Street. A cracked plastic bench sits beneath a flickering fluorescent sign showing routes and schedules.\n\nGraffiti covers the shelter\'s metal frame - tags, doodles, and the occasional phone number. A dented trash bin overflows with newspapers and coffee cups. An old payphone hangs on the back wall, its receiver dangling by the cord.\n\nFrom here, you can see most of the block - the shops to the south, the construction site\'s fence rattling in the wind, and the alley\'s dark mouth to the east. The wind carries the smell of garbage and exhaust.',
        introMessage: 'You step into the bus shelter.\n\nThe bench is old wood, carved with initials and crude drawings. The kind of place people wait, impatient, watching for headlights. The trash bin overflows - the city doesn\'t clean these stops like they used to.\n\nAnd there, at the corner: a payphone booth. You haven\'t seen one in years. Who still uses payphones?\n\nMaybe someone who doesn\'t want their call traced.',
        objects: ['obj_bus_shelter' as GameObjectId, 'obj_bus_bench' as GameObjectId, 'obj_bus_trash_bin' as GameObjectId, 'obj_bus_schedule' as GameObjectId, 'obj_payphone' as GameObjectId],
        npcs: [],
        items: []
    },

    // ===== ZONE 2: ELECTRICIAN TRUCK (Type 2 - Locked - Distraction Needed) =====
    'loc_electrician_truck': {
        locationId: 'loc_electrician_truck' as LocationId,
        name: 'Electrician Truck',
        sceneDescription: 'A white work van parked at the curb. "KOWALSKI ELECTRIC" painted on the side in faded blue letters. The back doors are secured with a padlock. Mike Kowalski sits in the driver\'s seat, scrolling his phone, sipping from a battered thermos. The van\'s old - dented bumper, mud on the tires. License plate: KWL-4429.',
        introMessage: 'You approach the electrician\'s van.\n\nMike Kowalski glances up from his phone. Mid-forties, work-worn hands, coffee-stained thermos. He doesn\'t move from the driver\'s seat.\n\n"Help you?" His tone says he\'d rather you didn\'t need help.\n\nThe back doors are padlocked shut. He\'s guarding his tools. Smart. This neighborhood has a reputation.',
        objects: ['obj_electrician_truck_exterior' as GameObjectId, 'obj_electrician_truck_doors' as GameObjectId],
        npcs: ['npc_mike_kowalski' as NpcId],
        items: []
    },

    // ===== ZONE 3A: CCTV BUILDING EXTERIOR (Outside Fence) =====
    'loc_cctv_exterior': {
        locationId: 'loc_cctv_exterior' as LocationId,
        name: 'CCTV Control Building',
        sceneDescription: 'You stand outside a small concrete building surrounded by a chain-link fence. Security cameras watch the perimeter like silent sentinels. Through the fence, you can see a heavy metal door with a rusted keypad mounted beside it.\n\nInside the fence, through dusty windows, server racks blink with LEDs. The building hums with the sound of cooling fans.\n\nThe fence gate is locked. You\'ll need to get through it first.',
        introMessage: 'You approach the CCTV control building.\n\nThis is where the city\'s traffic cameras are monitored. Where footage is stored. Where the truth might be hiding.\n\nA chain-link fence surrounds the building. The gate is locked. You need to get past this fence before you can reach the door.',
        objects: ['obj_cctv_fence' as GameObjectId],
        npcs: [],
        items: []
    },

    // ===== ZONE 3B: CCTV BUILDING INTERIOR (Inside Building) =====
    'loc_cctv_interior': {
        locationId: 'loc_cctv_interior' as LocationId,
        name: 'CCTV Control Building (Inside)',
        sceneDescription: 'Inside the CCTV control building, rows of server racks line the walls, blinking with status LEDs. Cooling fans hum constantly. The air smells of warm electronics and dust.\n\nMonitor stations sit dark - most equipment looks abandoned. But the servers are still running. Still recording.\n\nA filing cabinet stands against the far wall, metal drawers labeled by year.',
        introMessage: 'You step inside the CCTV building.\n\nThe hum of servers fills the space. Rows of black equipment, blinking lights in the darkness. The city\'s eyes and ears, still watching even though no one\'s monitoring.\n\nThis is where the footage is stored. Somewhere in these racks is the truth about that gray van.',
        objects: ['obj_cctv_monitor_station' as GameObjectId, 'obj_cctv_filing_cabinet' as GameObjectId],
        npcs: [],
        items: []
    },

    // ===== ZONE 4A: CONSTRUCTION SITE EXTERIOR (Outside Gate) =====
    'loc_construction_exterior': {
        locationId: 'loc_construction_exterior' as LocationId,
        name: 'Construction Site',
        sceneDescription: 'A three-story building wrapped in scaffolding and caution tape rises before you. A chain-link fence surrounds the perimeter, orange safety barriers blocking the sidewalk. Through the fence, you can see idle equipment - generators, concrete mixers, tool carts.\n\nTony Greco, the foreman, stands at the locked gate. Arms crossed, clipboard in hand, hard hat with a union sticker. He eyes you skeptically.\n\nThe gate is locked. Tony controls access.\n\nOutside the fence, metal scaffolding rises against the building facade - platforms accessible from street level.',
        introMessage: 'You approach the construction site.\n\nTony Greco blocks the gate. Forties, weathered face, no-nonsense expression. He looks at you wearing no safety gear.\n\n"Can\'t let you in without proper gear. Hard hat. No exceptions. Insurance."\n\nHis tone is flat. He\'s said this a thousand times. Rules are rules.\n\nYou notice scaffolding along the building exterior - accessible even from outside the fence.',
        objects: ['obj_construction_scaffolding' as GameObjectId, 'obj_construction_gate' as GameObjectId],
        npcs: ['npc_tony_greco' as NpcId],
        items: []
    },

    // ===== ZONE 4B: CONSTRUCTION SITE INTERIOR (Inside Site) =====
    'loc_construction_interior': {
        locationId: 'loc_construction_interior' as LocationId,
        name: 'Construction Site (Inside)',
        sceneDescription: 'Inside the construction site, equipment sits idle. The air smells of concrete dust and machine oil. Orange barriers and caution tape mark hazard zones. Scaffolding towers overhead, casting geometric shadows.\n\nA portable office trailer sits in the corner, door ajar. Nearby, a metal tool shed with a combination lock.\n\nThe building itself rises three stories, wrapped in safety netting and steel beams. Work stopped weeks ago.',
        introMessage: 'You step into the construction site.\n\nThe place is quiet. No workers, no machinery running. Just the occasional creak of scaffolding in the wind.\n\nYou look around:\n\n🏚️ Tool Shed (locked with combination)\n🏢 Office Trailer (door ajar)\n\nBoth look searchable.',
        objects: ['obj_construction_tool_shed' as GameObjectId, 'obj_construction_office_trailer' as GameObjectId],
        npcs: [],
        items: []
    },

    // ===== ZONE 5A: FLORIST SHOP EXTERIOR (Type 1 - Street Level) =====
    'loc_florist_exterior': {
        locationId: 'loc_florist_exterior' as LocationId,
        name: 'Florist Shop',
        sceneDescription: 'You stand before a small florist shop. The storefront window displays colorful flower arrangements - roses, lilies, bright bunches arranged in ceramic vases. Gold lettering on the glass reads "Chen\'s Flowers - Est. 2003".\n\nA glass door with small wind chimes hanging above stands closed but unlocked. Through the window, you can see someone moving inside among the flowers.\n\nThe faint scent of roses drifts through the doorway.',
        introMessage: 'You approach the florist shop.\n\nThe window display is cheerful - bright flowers, carefully arranged. The kind of shop that seems out of place in this rough neighborhood. But it\'s survived. Someone\'s made it work.\n\nThe door is closed. You\'ll need to open it to enter.',
        objects: ['obj_florist_door' as GameObjectId],
        npcs: [],
        items: []
    },

    // ===== ZONE 5B: FLORIST SHOP INTERIOR (Behind Door) =====
    'loc_florist_interior': {
        locationId: 'loc_florist_interior' as LocationId,
        name: 'Florist Shop (Inside)',
        sceneDescription: 'Inside the florist shop, the air is thick with the perfume of roses, lilies, and fresh greenery. Sunlight filters through the front window, illuminating dust motes floating above colorful arrangements.\n\nMargaret Chen stands behind a wooden counter, trimming stems with practiced precision. Flower displays line the walls - reds, yellows, purples bursting from ceramic vases. A small radio plays soft classical music from somewhere in the back.\n\nThe shop is cool and humid, like a greenhouse. Water drips quietly from freshly-cut stems.',
        introMessage: 'You step inside the florist shop.\n\nThe smell of flowers is almost overwhelming - roses, lilies, that earthy green scent of cut stems. It\'s a small shop, cheerful, intimate.\n\nMargaret Chen looks up from her work. Friendly face, tired eyes. She\'s been running this shop for years, you can tell. The kind of person who notices things.\n\n"Can I help you find something?"\n\nMaybe she can help you find more than flowers.',
        objects: ['obj_florist_counter' as GameObjectId, 'obj_florist_display' as GameObjectId],
        npcs: ['npc_margaret_chen' as NpcId],
        items: []
    },

    // ===== ZONE 6A: BUTCHER SHOP EXTERIOR (Type 1 - Street Level) =====
    'loc_butcher_exterior': {
        locationId: 'loc_butcher_exterior' as LocationId,
        name: 'Butcher Shop',
        sceneDescription: 'You stand before a traditional butcher shop. The window displays hanging sausages and a hand-painted sign reading "Richter\'s Meats - Family Owned Since 1952". The glass is slightly fogged from the cold interior.\n\nA heavy wooden door with faded red paint stands closed. A metal sign bolted to the frame confirms the name. Through the small window in the door, you can see white tile walls and hanging meat hooks.\n\nThe faint smell of smoked meat drifts from the shop.',
        introMessage: 'You approach the butcher shop.\n\nOld-school. Family business. The kind of place that\'s been here longer than you\'ve been alive. The paint is faded, the sign is weathered, but it\'s still open. Still serving the neighborhood.\n\nThe door is closed. You\'ll need to open it to enter.',
        objects: ['obj_butcher_door' as GameObjectId],
        npcs: [],
        items: []
    },

    // ===== ZONE 6B: BUTCHER SHOP INTERIOR (Behind Door) =====
    'loc_butcher_interior': {
        locationId: 'loc_butcher_interior' as LocationId,
        name: 'Butcher Shop (Inside)',
        sceneDescription: 'The butcher shop is cold - your breath mists in the chilled air. Meat hooks dangle from ceiling tracks, some empty, some holding cuts wrapped in white paper. The walls are white tile, scrubbed clean but showing age in the grout lines.\n\nKlaus Richter works behind the counter, a cleaver in hand. The metallic scent of fresh meat mixes with the faint tang of bleach. A vintage cash register sits on the counter, its brass keys gleaming under fluorescent lights.\n\nThe hum of refrigeration is constant. Somewhere in the back, a compressor kicks on with a mechanical groan.',
        introMessage: 'You step inside the butcher shop.\n\nThe cold air hits you immediately. The smell - smoked meat, blood, sawdust. Klaus Richter glances up from sharpening his cleaver. Sixties, thick accent, hands like slabs of beef.\n\n"Guten Tag! You need meat?" He grins. The kind of grin that doesn\'t realize how dark it looks when you\'re holding a cleaver.\n\nBehind him, a tool rack on the wall - cleavers, saws, and something that catches your eye: bolt cutters.\n\nFriendly guy. Probably give you the bolt cutters if you asked.',
        objects: ['obj_butcher_counter' as GameObjectId, 'obj_butcher_meat_hooks' as GameObjectId, 'obj_butcher_tool_rack' as GameObjectId],
        npcs: ['npc_klaus_richter' as NpcId],
        items: []
    },

    // ===== ZONE 7: KIOSK (Type 1 - Unlocked) =====
    'loc_kiosk': {
        locationId: 'loc_kiosk' as LocationId,
        name: 'Convenience Kiosk',
        sceneDescription: 'A small convenience kiosk painted bright blue. Magazines and snacks fill the window display. Lottery tickets, tabloid newspapers, energy drinks. Behind the counter, Ravi arranges scratch-off tickets in neat rows. The smell of cheap coffee and sugar.',
        introMessage: 'You step up to the kiosk.\n\nBright blue paint, cheerful in a way that feels forced. Ravi stands behind the counter, arranging lottery tickets. Young guy, friendly face, perpetual smile.\n\n"Hey, friend! Coffee? Snacks? Help yourself!"\n\nThe kind of place that sells everything and nothing. Lottery dreams and sugar highs. But Ravi\'s the kind of guy who sees the neighborhood. Who notices things.\n\nMaybe he noticed a gray van.',
        objects: ['obj_kiosk_counter' as GameObjectId, 'obj_kiosk_receipt_spike' as GameObjectId, 'obj_kiosk_coffee_machine' as GameObjectId],
        npcs: ['npc_ravi_patel' as NpcId],
        items: []
    },

    // ===== ZONE 8: ALLEY (Type 1 - Unlocked, but Secret Door is Type 3 Hidden) =====
    'loc_alley': {
        locationId: 'loc_alley' as LocationId,
        name: 'Side Alley',
        sceneDescription: 'The alley is narrow and dim, even in daylight. Brick walls rise on both sides, stained with water damage and old graffiti. The air smells of wet concrete and something sour - maybe garbage, maybe something worse.\n\nA large dumpster sits against the south wall, its lid half-open. An electrical panel is mounted on the north wall, its metal cover rusted and tagged with spray paint. The graffiti is fresh - red eyes, blue stars, yellow lightning bolts arranged in a pattern.\n\nEddie sits on a folded cardboard mat near the dumpster, wrapped in an army surplus jacket. He doesn\'t look up as you enter. Water drips somewhere in the darkness.',
        introMessage: 'You step into the alley.\n\nBrick walls on both sides, tagged with graffiti - names, symbols, threats. The dumpster overflows. The smell of rot and old food. A homeless man sits on cardboard, watching you. Not hostile. Just watching.\n\nThe alley ends at a brick wall. Dead end.\n\nBut wait. The ground near the wall - fresh scrape marks. Like something heavy has been moved recently.\n\nAnd there, mounted on the brick: an old electrical panel. Rusted shut.',
        objects: ['obj_alley_dumpster' as GameObjectId, 'obj_alley_electrical_panel' as GameObjectId, 'obj_alley_graffiti' as GameObjectId],
        npcs: ['npc_eddie' as NpcId],
        items: []
    },

    // ===== ZONE 9: HIDDEN GARAGES (Type 3 - Hidden - Revealed via Alley Secret Door) =====
    'loc_hidden_garages': {
        locationId: 'loc_hidden_garages' as LocationId,
        name: 'Hidden Garages',
        sceneDescription: 'A hidden courtyard behind the brick wall. Three garage doors stand in a row, numbered 1, 2, and 3. Oil stains mark the concrete. Weeds push through cracks. The air smells of motor oil and rust. This place was overlooked during the police search - too well hidden.',
        introMessage: 'The brick wall slides open.\n\nYou step through into a hidden courtyard. Three garage doors, numbered 1, 2, 3. Old. Forgotten. The kind of place the city forgot about years ago.\n\nOil stains on the concrete. Weeds pushing through cracks. The smell of rust and motor oil.\n\nThe police never found this place. Too well hidden. But you did.\n\nSomewhere in these garages, there might be answers.',
        objects: ['obj_garage_1' as GameObjectId, 'obj_garage_2' as GameObjectId, 'obj_garage_3' as GameObjectId, 'obj_garage_3_van' as GameObjectId, 'obj_garage_3_glove_box' as GameObjectId],
        npcs: [],
        items: []
    }
};

// ===== PORTALS =====
const portals: Record<PortalId, Portal> = {
    // Elm Street → Bus Stop (north)
    'portal_elm_to_bus': {
        id: 'portal_elm_to_bus' as PortalId,
        fromLocationId: 'loc_elm_street' as LocationId,
        toLocationId: 'loc_bus_stop' as LocationId,
        direction: 'north',
        alternateNames: ['bus stop', 'shelter', 'north', 'bus'],
        description: 'The weathered bus stop shelter stands to the north, its rusted frame casting long shadows.',
        requirements: { conditions: [] }
    },
    // Bus Stop → Elm Street (south) - Hidden from look around (already on Elm Street)
    'portal_bus_to_elm': {
        id: 'portal_bus_to_elm' as PortalId,
        fromLocationId: 'loc_bus_stop' as LocationId,
        toLocationId: 'loc_elm_street' as LocationId,
        direction: 'south',
        alternateNames: ['street', 'south', 'back', 'elm street', 'elm'],
        description: 'Elm Street stretches south, back toward the heart of the investigation.',
        requirements: { conditions: [] },
        hideInLookAround: true  // Don't show in look around - player is already on Elm Street
    },

    // Bus Stop → Side Alley (outdoor hub - can see street-level locations)
    'portal_bus_to_alley': {
        id: 'portal_bus_to_alley' as PortalId,
        fromLocationId: 'loc_bus_stop' as LocationId,
        toLocationId: 'loc_alley' as LocationId,
        direction: 'east',
        alternateNames: ['alley', 'alleyway', 'east', 'side alley', 'narrow alley'],
        description: 'A narrow alley opens to the east, between the old buildings.',
        requirements: { conditions: [] }
    },
    // Bus Stop → Florist Exterior
    'portal_bus_to_florist': {
        id: 'portal_bus_to_florist' as PortalId,
        fromLocationId: 'loc_bus_stop' as LocationId,
        toLocationId: 'loc_florist_exterior' as LocationId,
        direction: 'approach',
        alternateNames: ['florist', 'flower shop', 'florist shop', 'petal', 'stem'],
        description: 'Approach the florist shop with its gold-lettered windows.',
        requirements: { conditions: [] }
    },
    // Bus Stop → Butcher Exterior
    'portal_bus_to_butcher': {
        id: 'portal_bus_to_butcher' as PortalId,
        fromLocationId: 'loc_bus_stop' as LocationId,
        toLocationId: 'loc_butcher_exterior' as LocationId,
        direction: 'approach',
        alternateNames: ['butcher', 'butcher shop', 'meat shop', 'richter'],
        description: 'Approach the butcher shop with its faded red door.',
        requirements: { conditions: [] }
    },
    // Bus Stop → Kiosk
    'portal_bus_to_kiosk': {
        id: 'portal_bus_to_kiosk' as PortalId,
        fromLocationId: 'loc_bus_stop' as LocationId,
        toLocationId: 'loc_kiosk' as LocationId,
        direction: 'enter',
        alternateNames: ['kiosk', 'convenience', 'blue kiosk', 'shop'],
        description: 'The bright blue kiosk stands nearby, magazines and snacks in the window.',
        requirements: { conditions: [] }
    },
    // Bus Stop → CCTV Exterior
    'portal_bus_to_cctv': {
        id: 'portal_bus_to_cctv' as PortalId,
        fromLocationId: 'loc_bus_stop' as LocationId,
        toLocationId: 'loc_cctv_exterior' as LocationId,
        direction: 'approach',
        alternateNames: ['cctv', 'cctv building', 'control building', 'security building'],
        description: 'Approach the CCTV control building surrounded by its chain-link fence.',
        requirements: { conditions: [] }
    },
    // Bus Stop → Construction Exterior
    'portal_bus_to_construction': {
        id: 'portal_bus_to_construction' as PortalId,
        fromLocationId: 'loc_bus_stop' as LocationId,
        toLocationId: 'loc_construction_exterior' as LocationId,
        direction: 'approach',
        alternateNames: ['construction site', 'construction', 'site', 'scaffolding'],
        description: 'Approach the construction site with its orange barriers and scaffolding.',
        requirements: { conditions: [] }
    },
    // Bus Stop → Electrician Truck
    'portal_bus_to_truck': {
        id: 'portal_bus_to_truck' as PortalId,
        fromLocationId: 'loc_bus_stop' as LocationId,
        toLocationId: 'loc_electrician_truck' as LocationId,
        direction: 'west',
        alternateNames: ['truck', 'van', 'electrician truck', 'vehicle', 'white van'],
        description: 'The white electrician\'s van is parked along the street.',
        requirements: { conditions: [] }
    },

    // Elm Street → Electrician Truck (west)
    'portal_elm_to_truck': {
        id: 'portal_elm_to_truck' as PortalId,
        fromLocationId: 'loc_elm_street' as LocationId,
        toLocationId: 'loc_electrician_truck' as LocationId,
        direction: 'west',
        alternateNames: ['truck', 'van', 'west', 'electrician truck', 'vehicle'],
        description: 'A white electrician\'s van sits parked to the west, its paint faded and worn.',
        requirements: { conditions: [] }
    },
    // Electrician Truck → Elm Street (east)
    'portal_truck_to_elm': {
        id: 'portal_truck_to_elm' as PortalId,
        fromLocationId: 'loc_electrician_truck' as LocationId,
        toLocationId: 'loc_elm_street' as LocationId,
        direction: 'east',
        alternateNames: ['street', 'east', 'back', 'elm street', 'elm'],
        description: 'Elm Street lies to the east, the shops and foot traffic continuing their daily rhythm.',
        requirements: { conditions: [] }
    },


    // Elm Street → Alley (east)
    'portal_elm_to_alley': {
        id: 'portal_elm_to_alley' as PortalId,
        fromLocationId: 'loc_elm_street' as LocationId,
        toLocationId: 'loc_alley' as LocationId,
        direction: 'east',
        alternateNames: ['alley', 'alleyway', 'east', 'side alley', 'narrow alley'],
        description: 'A narrow alley cuts between buildings to the east, dark and uninviting.',
        requirements: { conditions: [] }
    },
    // Alley → Elm Street (west)
    'portal_alley_to_elm': {
        id: 'portal_alley_to_elm' as PortalId,
        fromLocationId: 'loc_alley' as LocationId,
        toLocationId: 'loc_elm_street' as LocationId,
        direction: 'west',
        alternateNames: ['street', 'west', 'back', 'elm street', 'elm', 'out'],
        description: 'The mouth of the alley opens west onto Elm Street, back into the light.',
        requirements: { conditions: [] }
    },

    // Elm Street → Florist Exterior (always visible)
    'portal_elm_to_florist_exterior': {
        id: 'portal_elm_to_florist_exterior' as PortalId,
        fromLocationId: 'loc_elm_street' as LocationId,
        toLocationId: 'loc_florist_exterior' as LocationId,
        direction: 'approach',
        alternateNames: ['florist', 'flower shop', 'florist shop', 'enter florist', 'go to florist'],
        description: 'Approach the florist shop with its gold-lettered windows.',
        requirements: { conditions: [] }
    },
    // Florist Exterior → Elm Street (return)
    'portal_florist_exterior_to_elm': {
        id: 'portal_florist_exterior_to_elm' as PortalId,
        fromLocationId: 'loc_florist_exterior' as LocationId,
        toLocationId: 'loc_elm_street' as LocationId,
        direction: 'back',
        alternateNames: ['back', 'street', 'elm street', 'leave', 'return'],
        description: 'Step back onto Elm Street.',
        requirements: { conditions: [] }
    },

    // Florist Exterior → Interior (hidden until door opens)
    'portal_florist_exterior_to_interior': {
        id: 'portal_florist_exterior_to_interior' as PortalId,
        fromLocationId: 'loc_florist_exterior' as LocationId,
        toLocationId: 'loc_florist_interior' as LocationId,
        direction: 'enter',
        alternateNames: ['inside', 'in', 'enter', 'enter shop', 'go inside', 'go in'],
        description: 'Through the open door into the florist shop interior.',
        requirements: { conditions: [] },
        isRevealed: false  // Revealed when obj_florist_door is opened
    },
    // Florist Interior → Exterior (exit)
    'portal_florist_interior_to_exterior': {
        id: 'portal_florist_interior_to_exterior' as PortalId,
        fromLocationId: 'loc_florist_interior' as LocationId,
        toLocationId: 'loc_florist_exterior' as LocationId,
        direction: 'exit',
        alternateNames: ['exit', 'leave', 'out', 'outside', 'door'],
        description: 'Back through the door to the shop entrance.',
        requirements: { conditions: [] }
    },

    // Elm Street → Butcher Exterior (always visible)
    'portal_elm_to_butcher_exterior': {
        id: 'portal_elm_to_butcher_exterior' as PortalId,
        fromLocationId: 'loc_elm_street' as LocationId,
        toLocationId: 'loc_butcher_exterior' as LocationId,
        direction: 'approach',
        alternateNames: ['butcher', 'butcher shop', 'meat shop', 'enter butcher', 'go to butcher'],
        description: 'Approach the butcher shop with its faded red door.',
        requirements: { conditions: [] }
    },
    // Butcher Exterior → Elm Street (return)
    'portal_butcher_exterior_to_elm': {
        id: 'portal_butcher_exterior_to_elm' as PortalId,
        fromLocationId: 'loc_butcher_exterior' as LocationId,
        toLocationId: 'loc_elm_street' as LocationId,
        direction: 'back',
        alternateNames: ['back', 'street', 'elm street', 'leave', 'return'],
        description: 'Step back onto Elm Street.',
        requirements: { conditions: [] }
    },

    // Butcher Exterior → Interior (hidden until door opens)
    'portal_butcher_exterior_to_interior': {
        id: 'portal_butcher_exterior_to_interior' as PortalId,
        fromLocationId: 'loc_butcher_exterior' as LocationId,
        toLocationId: 'loc_butcher_interior' as LocationId,
        direction: 'enter',
        alternateNames: ['inside', 'in', 'enter', 'enter shop', 'go inside', 'go in'],
        description: 'Through the open door into the butcher shop interior.',
        requirements: { conditions: [] },
        isRevealed: false  // Revealed when obj_butcher_door is opened
    },
    // Butcher Interior → Exterior (exit)
    'portal_butcher_interior_to_exterior': {
        id: 'portal_butcher_interior_to_exterior' as PortalId,
        fromLocationId: 'loc_butcher_interior' as LocationId,
        toLocationId: 'loc_butcher_exterior' as LocationId,
        direction: 'exit',
        alternateNames: ['exit', 'leave', 'out', 'outside', 'door'],
        description: 'Back through the door to the shop entrance.',
        requirements: { conditions: [] }
    },

    // Elm Street → CCTV Exterior (always visible)
    'portal_elm_to_cctv_exterior': {
        id: 'portal_elm_to_cctv_exterior' as PortalId,
        fromLocationId: 'loc_elm_street' as LocationId,
        toLocationId: 'loc_cctv_exterior' as LocationId,
        direction: 'approach',
        alternateNames: ['cctv', 'cctv building', 'control building', 'security building'],
        description: 'Approach the CCTV control building surrounded by its chain-link fence.',
        requirements: { conditions: [] }
    },
    // CCTV Exterior → Elm Street (return)
    'portal_cctv_exterior_to_elm': {
        id: 'portal_cctv_exterior_to_elm' as PortalId,
        fromLocationId: 'loc_cctv_exterior' as LocationId,
        toLocationId: 'loc_elm_street' as LocationId,
        direction: 'back',
        alternateNames: ['back', 'street', 'elm street', 'leave', 'return'],
        description: 'Step back onto Elm Street.',
        requirements: { conditions: [] }
    },

    // CCTV Exterior → Interior (hidden until fence/door opens)
    'portal_cctv_exterior_to_interior': {
        id: 'portal_cctv_exterior_to_interior' as PortalId,
        fromLocationId: 'loc_cctv_exterior' as LocationId,
        toLocationId: 'loc_cctv_interior' as LocationId,
        direction: 'enter',
        alternateNames: ['inside', 'in', 'enter', 'enter building', 'go inside', 'go in'],
        description: 'Through the fence and door into the CCTV building interior.',
        requirements: { conditions: [] },
        isRevealed: false  // Revealed when fence is unlocked
    },
    // CCTV Interior → Exterior (exit)
    'portal_cctv_interior_to_exterior': {
        id: 'portal_cctv_interior_to_exterior' as PortalId,
        fromLocationId: 'loc_cctv_interior' as LocationId,
        toLocationId: 'loc_cctv_exterior' as LocationId,
        direction: 'exit',
        alternateNames: ['exit', 'leave', 'out', 'outside'],
        description: 'Back outside through the door to the fence area.',
        requirements: { conditions: [] }
    },

    // Elm Street → Construction Exterior (always visible)
    'portal_elm_to_construction_exterior': {
        id: 'portal_elm_to_construction_exterior' as PortalId,
        fromLocationId: 'loc_elm_street' as LocationId,
        toLocationId: 'loc_construction_exterior' as LocationId,
        direction: 'approach',
        alternateNames: ['construction', 'construction site', 'site', 'building site'],
        description: 'Approach the construction site with its orange barriers and scaffolding.',
        requirements: { conditions: [] }
    },
    // Construction Exterior → Elm Street (return)
    'portal_construction_exterior_to_elm': {
        id: 'portal_construction_exterior_to_elm' as PortalId,
        fromLocationId: 'loc_construction_exterior' as LocationId,
        toLocationId: 'loc_elm_street' as LocationId,
        direction: 'back',
        alternateNames: ['back', 'street', 'elm street', 'leave', 'return'],
        description: 'Step back onto Elm Street.',
        requirements: { conditions: [] }
    },

    // Construction Exterior → Interior (blocked until wearing hard hat)
    'portal_construction_exterior_to_interior': {
        id: 'portal_construction_exterior_to_interior' as PortalId,
        fromLocationId: 'loc_construction_exterior' as LocationId,
        toLocationId: 'loc_construction_interior' as LocationId,
        direction: 'enter',
        alternateNames: ['inside', 'in', 'enter', 'enter site', 'go inside', 'go in', 'construction site inside', 'interior'],
        description: 'Through the gate into the construction site interior.',
        blockedMessage: 'Tony blocks the gate.\n\n"Hard hat. No exceptions. Insurance rules."\n\nYou need to wear a hard hat before entering.',
        requirements: {
            conditions: [
                { type: 'HAS_FLAG', flag: 'wearing_hard_hat' as Flag }
            ]
        }
    },
    // Construction Interior → Exterior (exit)
    'portal_construction_interior_to_exterior': {
        id: 'portal_construction_interior_to_exterior' as PortalId,
        fromLocationId: 'loc_construction_interior' as LocationId,
        toLocationId: 'loc_construction_exterior' as LocationId,
        direction: 'exit',
        alternateNames: ['exit', 'leave', 'out', 'outside', 'gate'],
        description: 'Back through the gate to the street entrance.',
        requirements: { conditions: [] }
    },

    // Elm Street → Kiosk (enter)
    'portal_elm_to_kiosk': {
        id: 'portal_elm_to_kiosk' as PortalId,
        fromLocationId: 'loc_elm_street' as LocationId,
        toLocationId: 'loc_kiosk' as LocationId,
        direction: 'enter',
        alternateNames: ['kiosk', 'newsstand', 'news stand', 'enter kiosk', 'go to kiosk'],
        description: 'The small kiosk stands open for business, magazines and newspapers on display.',
        requirements: { conditions: [] }
    },
    // Kiosk → Elm Street (exit)
    'portal_kiosk_to_elm': {
        id: 'portal_kiosk_to_elm' as PortalId,
        fromLocationId: 'loc_kiosk' as LocationId,
        toLocationId: 'loc_elm_street' as LocationId,
        direction: 'exit',
        alternateNames: ['exit', 'leave', 'out', 'outside', 'street', 'elm street'],
        description: 'The street awaits just beyond the kiosk counter.',
        requirements: { conditions: [] }
    },


    // Alley → Hidden Garages (SECRET - requires flag)
    'portal_alley_to_garages': {
        id: 'portal_alley_to_garages' as PortalId,
        fromLocationId: 'loc_alley' as LocationId,
        toLocationId: 'loc_hidden_garages' as LocationId,
        direction: 'enter',
        alternateNames: ['secret door', 'hidden door', 'brick wall', 'garages', 'hidden garages', 'through door', 'enter door'],
        description: 'The hidden door in the brick wall stands open, revealing darkness beyond.',
        requirements: {
            conditions: [
                { type: 'FLAG', flag: 'secret_door_open' }
            ]
        }
    },
    // Hidden Garages → Alley (back)
    'portal_garages_to_alley': {
        id: 'portal_garages_to_alley' as PortalId,
        fromLocationId: 'loc_hidden_garages' as LocationId,
        toLocationId: 'loc_alley' as LocationId,
        direction: 'back',
        alternateNames: ['back', 'alley', 'out', 'exit', 'leave', 'door'],
        description: 'The secret door leads back to the alley.',
        requirements: { conditions: [] }
    }
};

// ===== CHAPTERS =====
const chapters: Record<ChapterId, Chapter> = {
    'chapter_1': {
        id: 'chapter_1' as ChapterId,
        title: 'Chapter 1: The Investigation Begins',
        goal: 'Investigate the alleged abduction of Lili Morgenstern and gather evidence proving it was staged.',
        objectives: [
            { flag: 'found_evidence_1' as Flag, label: 'Find Evidence 1: CCTV Screenshot (gray van plate LKJ-9472)' },
            { flag: 'found_evidence_2' as Flag, label: 'Find Evidence 2: Van Registration (owner: Jeremy Miller)' },
            { flag: 'found_evidence_3' as Flag, label: 'Find Evidence 3: Witness Statement (Lili with obsessed man)' },
            { flag: 'found_evidence_4' as Flag, label: 'Find Evidence 4: Hardware Receipt (abduction supplies)' }
        ],
        hints: [
            'Start by using your phone to check messages from Sarah.',
            'Look around Elm Street to see all the zones and talk to people.',
            'Show Lili\'s photo to witnesses who might recognize her.',
            'The license plate number from the CCTV footage might be useful as a PIN code.',
            'You need to collect 3 of 4 evidence pieces to complete the chapter.'
        ],
        startLocationId: 'loc_elm_street' as LocationId,
        introMessage: 'Sarah sends you a photo of Lili Morgenstern and a brief voice message about a gray van spotted repeatedly on Elm Street before the alleged abduction.\n\nThis is where it happened. This quiet street is where Lili claims you abducted her. Time to prove the truth - that it was staged.\n\nYou stand on Elm Street. Streetlights cast long shadows. Time to investigate.',
        locations,
        gameObjects,
        items,
        npcs
    }
};

// ===== MAIN GAME =====
export const game: Game = {
    id: 'chapter-1-investigation' as GameId,
    title: 'Walk in Justice - Chapter 1',
    description: 'The investigation deepens. You must prove the abduction of Lili Morgenstern was staged by gathering concrete evidence on Elm Street.',
    setting: 'Modern-day USA, 2025 - Elm Street, Bloodhaven',
    gameType: 'Limited Open World',
    narratorName: 'Narrator',
    promptContext: `You are the System Narrator for "Walk in Justice", a noir detective game.

**Player Character**: Burt Macklin, former FBI agent, falsely accused of abducting Lili Morgenstern
**Setting**: Elm Street, Bloodhaven - investigating the staged abduction
**Tone**: Hard-boiled noir, cynical, atmospheric, Raymond Chandler style
**Mission**: Find evidence proving the abduction was staged (need 3 of 4 evidence pieces)

**Narrative Style**:
- Short, punchy sentences. Noir atmosphere.
- Vivid sensory details (sights, sounds, smells)
- Internal monologue showing Burt's detective instincts
- Cynical observations about human nature
- No hand-holding - player must think and explore

**Evidence Locations** (don't reveal directly):
1. CCTV Screenshot - CCTV Building (easy)
2. Van Registration - Hidden Garages (hard, requires Evidence 1 PIN)
3. Witness Statement - Florist Shop (medium, show photo to Margaret)
4. Hardware Receipt - Electrician Truck (medium, distraction puzzle)

Player wins by collecting ANY 3 evidence pieces and sending them to Sarah Chen via phone.`,
    initialFlags: [],
    initialInventory: ['item_player_phone' as ItemId, 'item_lili_photo' as ItemId],
    startChapterId: 'chapter_1' as ChapterId,

    systemMessages: {
        needsTarget: {
            examine: "need_target_examine",
            read: "need_target_read",
            take: "need_target_take",
            goto: "need_target_goto",
        },
        notVisible: (itemName: string) => "item_not_visible",
        inventoryEmpty: "inventory_empty",
        inventoryList: (itemNames: string) => `You're carrying:\n${itemNames}`,
        alreadyHaveItem: (itemName: string) => "already_have_item",
        cannotGoThere: "cannot_go_there",
        chapterIncomplete: (goal: string, locationName: string) => "chapter_incomplete",
        chapterTransition: (chapterTitle: string) => `━━━ ${chapterTitle} ━━━`,
        locationTransition: (locationName: string) => `You arrive at ${locationName}.`,
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

    chapters,
    locations,
    items,
    gameObjects,
    npcs,
    portals
};
