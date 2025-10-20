
import type { Game, ChapterId, LocationId, ItemId, GameObjectId, NpcId, GameId, Flag } from './types';

export const game: Game = {
  id: 'blood-on-brass' as GameId,
  title: 'The Midnight Lounge Jazz Club Case',
  description: "You are Burt Macklin, FBI. A mysterious stranger hands you a worn notebook from the 1940s—the secret case file of a forgotten murder. As you investigate the cold case, you realize a copycat killer is recreating the crimes in the present day. You must solve the past to stop a killer in the present.",
  setting: "Modern-day USA, 2025",
  gameType: 'Escape Game',
  narratorName: 'Agent Sharma',
  promptContext: `You are the AI narrator, Agent Sharma. Your primary job is to interpret your partner's (Agent Macklin's) raw text input and map it to a valid game command. You must also provide a helpful, in-character response as a collaborative partner.

**CRITICAL RULES:**
- Your tone is that of a supportive, intelligent, and sometimes witty colleague. You are equals.
- Always refer to the player as "Macklin".
- Your goal is to translate player intent into a valid game action.

**Your Task:**

1.  **Analyze Intent:** Understand what your partner, Agent Macklin, is trying to do as a game action.
2.  **Select Command:** Choose the *best* matching command from the 'Available Game Commands' list.
    *   If Macklin says "look at the book," the command is 'examine brown notebook'.
    *   If Macklin says "pick up the card," the command is 'take business card'.
    *   If Macklin wants to provide a password with keywords like "password", "say", or "enter", the command MUST be in the format 'password <object> <phrase>'. For example: "The password for the notebook is JUSTICE FOR SILAS BLOOM" becomes 'password brown notebook JUSTICE FOR SILAS BLOOM'. Do NOT include quotes in the final command.
    *   If Macklin wants to move, the command is 'go <direction or location>'.
    *   If Macklin says "look" or "look around", the command is 'look around'.
    *   If Macklin wants to 'look behind' an object, the command is 'look behind <object>'.
    *   If the chapter is complete and Macklin wants to go to the next location (e.g., "let's go to the jazz club"), the command is 'go next_chapter'.
    *   **If the input is an illogical action or not a direct attempt to perform a game action, you MUST set the 'commandToExecute' to "invalid".** This includes conversational questions.
3.  **Provide Guidance:** Write a brief, in-character response (1-2 sentences) as Agent Sharma.
    *   If the command is **valid**, confirm the action with a neutral, professional phrase. Examples: "Alright, checking it out.", "Copy that.", "Good call.", "Smart move."
    *   If the command is **invalid due to being illogical**, your response must gently explain why or nudge the player back on track. ("Easy there, Macklin. I don't think vandalism is in our playbook.").
    *   If the command is **invalid due to being conversational** (e.g., "what now?", "who are you?", "what's the date?"), answer the question briefly if it's simple (like your name is Sharma, the location name is in the game state), then gently pivot back to the case by asking a question about the investigation.

**Example 1 (Valid Command):**
*Player Input:* "I want to see what that newspaper says."
*Your Response:* { "agentResponse": "Good call. Let's see what the paper says.", "commandToExecute": "examine newspaper" }

**Example 2 (Invalid Action):**
*Player Input:* "I smash the coffee machine."
*Your Response:* { "agentResponse": "Easy there, Macklin. I don't think wrecking the place is going to help us.", "commandToExecute": "invalid coffee machine" }

**Example 3 (Conversational/Off-Topic):**
*Player Input:* "Who are you?"
*YourResponse:* { "agentResponse": "Agent Sharma, at your service. Now, where were we? Anything here catch your eye?", "commandToExecute": "invalid" }

**Example 4 (Password):**
*Player Input:* "I say to the notebook: JUSTICE FOR SILAS BLOOM"
*Your Response:* { "agentResponse": "Let's see if that phrase does anything.", "commandToExecute": "password brown notebook JUSTICE FOR SILAS BLOOM" }
`,
  objectInteractionPromptContext: `You are Agent Sharma, observing your partner Macklin as he inspects the {{objectName}}. Your job is to map his input to one of the available actions, while maintaining your persona as a supportive and curious colleague. Ask questions to guide him. Example: "What do you make of that, Macklin?"`,
  startChapterId: 'ch1-the-cafe' as ChapterId,
  chapters: {
    'ch1-the-cafe': {
        id: 'ch1-the-cafe' as ChapterId,
        title: 'A Blast from the Past',
        goal: "Unlock the contents of the notebook.",
        introductionVideo: 'https://res.cloudinary.com/dg912bwcc/video/upload/v1759670681/CH_I_Intro_ccy0og.mov',
        completionVideo: 'https://res.cloudinary.com/dg912bwcc/video/upload/v1759678377/CH_I_completion_jqtyme.mp4',
        postChapterMessage: "Looks like we've got everything from this place. I'm thinking our next stop should be the jazz club mentioned in the article.",
        storyGenerationDetails: "The story for this chapter takes place entirely within 'The Cafe', a bustling downtown coffee shop. Key events include Agent Macklin receiving the locked notebook, interacting with the male barista, and unlocking the notebook to discover the initial clues about Silas Bloom.",
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
        startLocationId: 'loc_cafe' as LocationId,
        locations: {
            'loc_cafe': {
                id: 'loc_cafe' as LocationId,
                name: 'The Cafe',
                description: 'A bustling downtown cafe, smelling of coffee and rain. A puddle of rainwater is near the door, and a discarded newspaper lies on an empty table.',
                gridPosition: { x: 1, y: 1 },
                objects: ['obj_brown_notebook', 'obj_chalkboard_menu', 'obj_newspaper', 'obj_bookshelf', 'obj_painting'] as GameObjectId[],
                npcs: ['npc_barista', 'npc_manager'] as NpcId[],
            }
        },
        gameObjects: {
            'obj_brown_notebook': {
                id: 'obj_brown_notebook' as GameObjectId,
                name: 'Brown Notebook',
                description: 'A worn, leather-bound notebook. It feels heavy with secrets.',
                alternateDescription: "It's the same locked notebook. We still need that password.",
                items: [],
                isOpenable: true,
                isLocked: true,
                unlocksWithPhrase: 'Justice for Silas Bloom',
                onExamine: {
                    locked: {
                        message: "A lock prevents it from being opened without the right password. A mini-game opens on your device.",
                        actions: [
                            { type: 'SET_FLAG', flag: 'has_seen_notebook_url' as Flag },
                            { type: 'SHOW_MESSAGE', sender: 'narrator', senderName: 'Narrator', content: 'Minigame: https://airpg-minigames.vercel.app/games/the-notebook'}
                        ]
                    },
                    unlocked: {
                        message: "The notebook is open. Inside, you see a small data chip. You could try to 'watch video'.",
                        actions: [
                             { type: 'START_INTERACTION', objectId: 'obj_brown_notebook' as GameObjectId, interactionStateId: 'start' }
                        ]
                    },
                    alternate: {
                        message: "It's the same locked notebook. We still need that password."
                    }
                },
                onUnlock: {
                    successMessage: "The notebook unlocks with a soft click. The cover creaks open.",
                    failMessage: "That password doesn't work. The lock remains stubbornly shut.",
                    actions: [
                         { type: 'SET_FLAG', flag: 'has_unlocked_notebook' as Flag },
                         { type: 'START_INTERACTION', objectId: 'obj_brown_notebook' as GameObjectId, interactionStateId: 'start' }
                    ]
                },
                onFailure: {
                    default: "That's not going to work. It's a key piece of evidence.",
                    break: "You hammer on the notebook, but the old leather is surprisingly tough. The lock doesn't budge.",
                    destroy: "You consider destroying the notebook, but that would defeat the whole purpose of being here. There must be a more subtle way.",
                    open: "You try to force the lock, but it's no use. You'll need the correct password.",
                    move: "You slide the notebook around on the table. It doesn't reveal anything.",
                    "look behind": "It's a notebook on a table. There's nothing behind it."
                },
                image: {
                    url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759242347/Notebook_locked_ngfes0.png',
                    description: 'A locked notebook.',
                    hint: 'locked notebook'
                },
                unlockedImage: {
                    url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759242346/Notebook_unlocked_fpxqgl.jpg',
                    description: 'An unlocked notebook.',
                    hint: 'unlocked notebook'
                },
                defaultInteractionStateId: 'start',
                interactionStates: {
                    'start': {
                        id: 'start',
                        description: "The notebook is open. You see a small data chip. You could 'watch video'.",
                        commands: {
                            'watch video': [
                                { type: 'SHOW_MESSAGE', sender: 'narrator', senderName: 'Narrator', content: 'https://res.cloudinary.com/dg912bwcc/video/upload/v1759241547/0930_eit8he.mov', messageType: 'video' },
                                { type: 'SHOW_MESSAGE', sender: 'agent', senderName: 'Agent Sharma', content: "Silas Bloom... I've never heard that name before. He seemed like a talented musician. And that song for Rose... sounds like they were deeply in love." },
                                { type: 'SHOW_MESSAGE', sender: 'narrator', senderName: 'Narrator', content: "Beside the data chip, you see a folded newspaper article." },
                                { type: 'SET_INTERACTION_STATE', state: 'video_watched' },
                                { type: 'SET_FLAG', flag: 'notebook_video_watched' as Flag }
                            ],
                            'exit': [{ type: 'END_INTERACTION' }],
                            'close': [{ type: 'END_INTERACTION' }],
                        }
                    },
                    'video_watched': {
                        id: 'video_watched',
                        description: "You've watched the video. The folded newspaper article is still there. You could 'read article' or 'exit'.",
                        commands: {
                            'read article': [
                                { type: 'SHOW_MESSAGE', sender: 'narrator', senderName: 'Narrator', content: 'A newspaper article about Silas Bloom.', messageType: 'article', imageId: 'newspaper_article' },
                                { type: 'SHOW_MESSAGE', sender: 'agent', senderName: 'Agent Sharma', content: "Wait a second, Macklin... the article mentions an Agent Macklin. That can't be a coincidence. Is he related to you? This could be about your own family." },
                                { type: 'SET_INTERACTION_STATE', state: 'article_read' },
                                { type: 'SET_FLAG', flag: 'notebook_article_read' as Flag },
                                { type: 'SET_FLAG', flag: 'notebook_interaction_complete' as Flag }
                            ],
                             'exit': [{ type: 'END_INTERACTION' }],
                             'close': [{ type: 'END_INTERACTION' }],
                        }
                    },
                    'article_read': {
                        id: 'article_read',
                        description: "You've read the article. The video is still here. You could try to 'watch video' again or 'exit'.",
                        commands: {
                            'watch video': [
                                { type: 'SHOW_MESSAGE', sender: 'narrator', senderName: 'Narrator', content: 'https://res.cloudinary.com/dg912bwcc/video/upload/v1759241547/0930_eit8he.mov', messageType: 'video' },
                                { type: 'SHOW_MESSAGE', sender: 'agent', senderName: 'Agent Sharma', content: "I can't get that song out of my head. It's beautiful, but haunting." },
                                { type: 'SET_INTERACTION_STATE', state: 'complete' }
                            ],
                             'exit': [{ type: 'END_INTERACTION' }],
                             'close': [{ type: 'END_INTERACTION' }],
                        }
                    },
                    'complete': {
                        id: 'complete',
                        description: "You've examined the contents of the notebook. Type 'exit' to stop examining it.",
                        commands: {
                            'exit': [{ type: 'END_INTERACTION' }],
                            'close': [{ type: 'END_INTERACTION' }],
                        }
                    }
                }
            },
            'obj_chalkboard_menu': {
                id: 'obj_chalkboard_menu' as GameObjectId,
                name: 'Chalkboard Menu',
                description: "A simple chalkboard menu.",
                alternateDescription: "The menu hasn't changed. The special is still about 'justice'.",
                items: [],
                onExamine: {
                   default: { message: "Today's special is three scones for the price of two. A deal almost as sweet as justice." },
                   alternate: { message: "The menu hasn't changed. The special is still about 'justice'."}
                },
                onFailure: {
                    default: "Probably best to leave the menu alone. It's not part of the case.",
                    break: "You could probably smash the chalkboard, but that would just make a mess and draw unwanted attention.",
                    destroy: "It's just a menu, Macklin. Let's focus on the case.",
                    move: "You shift the chalkboard stand an inch to the left. Nothing of interest is revealed.",
                    "look behind": "You peek behind the chalkboard. Just a dusty wall and a stray sugar packet."
                },
                image: {
                    url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759603706/Chalkboard_h61haz.png',
                    description: 'A chalkboard menu in a cafe.',
                    hint: 'chalkboard menu'
                }
            },
            'obj_newspaper': {
                id: 'obj_newspaper' as GameObjectId,
                name: 'Newspaper',
                description: "A discarded local newspaper.",
                alternateDescription: "It's just today's paper. Nothing new here.",
                items: [],
                 onExamine: {
                   default: { message: "It's a copy of today's local paper. The main headlines discuss the current series of murders. The usual crazyness of a Metropolis." },
                   alternate: { message: "It's just today's paper. Nothing new here." }
                },
                onFailure: {
                    default: "The newspaper is old news. Let's stick to the facts of our case.",
                    take: "You could take it, but you have no reason to. It's just today's paper.",
                    destroy: "Tearing up the newspaper won't help you solve any crimes."
                },
                image: {
                    url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759603706/Newspaper_p85m1h.png',
                    description: 'A newspaper on a table.',
                    hint: 'newspaper'
                }
            },
            'obj_bookshelf': {
                id: 'obj_bookshelf' as GameObjectId,
                name: 'Bookshelf',
                description: 'A small bookshelf in a reading corner.',
                alternateDescription: "The bookshelf still has that romance novel, 'Justice for My Love'. That seems important.",
                items: [],
                 onExamine: {
                   default: { 
                        message: "A small bookshelf filled with used paperbacks. You scan the titles: 'The Art of the Deal', 'A Brief History of Time', 'How to Win Friends and Influence People', and a romance novel titled 'Justice for My Love'. The word 'Justice' rings a bell..." ,
                        actions: [
                            { type: 'SET_FLAG', flag: 'has_seen_justice_book' as Flag }
                        ]
                    },
                   alternate: { message: "The bookshelf still has that romance novel, 'Justice for My Love'. That seems important."}
                },
                onFailure: {
                    default: "It's just a bookshelf. Let's not get sidetracked.",
                    take: "You can't take the whole bookshelf, Burt.",
                    "take book": "That book seems important, but you can't take it. Maybe the title is the clue.",
                    move: "It's too heavy to move by yourself."
                },
                image: {
                    url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759604596/Bookshelf_Cafe_kn4poz.png',
                    description: 'A bookshelf in a cafe.',
                    hint: 'bookshelf reading corner'
                }
            },
            'obj_painting': {
                id: 'obj_painting' as GameObjectId,
                name: 'Painting on the wall',
                description: "A colorful abstract painting.",
                alternateDescription: "It's the same abstract painting signed 'S.B.'.",
                items: [],
                onExamine: {
                   default: { message: "An abstract painting hangs on the wall, its swirls of color adding a touch of modern art to the cafe's cozy atmosphere. It seems to be signed 'S.B.'" },
                   alternate: { message: "It's the same abstract painting signed 'S.B.'." }
                },
                onFailure: {
                    default: "The painting is nice, but it's not a clue.",
                    take: "The painting is securely fastened to the wall.",
                    "look behind": "You try to look behind the painting, but it's flush against the wall."
                },
                image: {
                    url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759604943/picture_on_wall_fcx10j.png',
                    description: 'A painting on the wall of the cafe.',
                    hint: 'abstract painting'
                }
            }
        },
        items: {
            'item_business_card': {
                id: 'item_business_card' as ItemId,
                name: 'Business Card',
                description: 'A simple business card for a musician. It reads: "S A X O - The World\'s Best Sax Player". A phone number is listed, along with a handwritten number "1943" and the name "ROSE".',
                alternateDescription: "The musician's business card. That name, 'ROSE', and the number '1943' seem significant.",
                isTakable: true,
                onTake: {
                    successMessage: "You pick up the business card.",
                    failMessage: "You can't take that right now."
                },
                image: {
                    url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759241477/Screenshot_2025-09-30_at_15.46.02_fuk4tb.png',
                    description: 'A business card for a saxophone player.',
                    hint: 'business card'
                }
            },
             'newspaper_article': {
                id: 'newspaper_article' as ItemId,
                name: 'Newspaper Article',
                description: 'A newspaper article about Silas Bloom.',
                isTakable: false,
                image: {
                    url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759241463/Screenshot_2025-09-30_at_15.51.35_gyj3d5.png',
                    description: 'A newspaper article about Silas Bloom.',
                    hint: 'newspaper article'
                }
            }
        },
        npcs: {
            'npc_barista': {
                id: 'npc_barista' as NpcId,
                name: 'Barista',
                description: 'A tired-looking man in his late 20s, with faded tattoos and a cynical arch to his eyebrow. He seems to have seen a thousand stories like yours and is not easily impressed.',
                dialogueType: 'scripted',
                welcomeMessage: 'What can I get for you? Or are you just here to brood? Either is fine.',
                goodbyeMessage: "Alright, I've got Pumpkin spice lattes to craft. Good luck with... whatever it is you're doing.",
                completionFlag: 'has_received_business_card' as Flag,
                finalResponse: "Look, I told you all I know. I've got work to do.",
                persona: "You are a tired, cynical barista in a downtown cafe. You've seen it all and are not impressed by much. Your primary focus is on making coffee and dealing with customers as efficiently as possible. You will not discuss the case or any past events further, deflecting any questions with short, dismissive, but not overly rude answers. You just want to do your job.",
                maxInteractions: 8,
                interactionLimitResponse: "Seriously, I've got a line of customers. I can't keep chatting. The coffee machine calls.",
                image: {
                    url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759241505/Cafe_barrista_hpwona.png',
                    description: 'A portrait of the cafe barista.',
                    hint: 'male barista'
                },
                startConversationActions: [
                    { type: 'SET_FLAG', flag: 'has_talked_to_barista' as Flag }
                ],
                cannedResponses: [
                    { topic: 'greeting', keywords: "hello, hi, how are you", response: 'Another day, another dollar. What do you need?' },
                    { topic: 'coffee', keywords: "coffee, drink, menu, order, buy, latte, cappuccino, espresso", response: 'The coffee is hot and the pastries are day-old. The menu is on the board. Let me know if you can decipher my handwriting.' },
                    { topic: 'prices', keywords: "price, cost, how much", response: 'More than it should be, less than I want to charge. The prices are on the board.' },
                    { topic: 'recommendation', keywords: "recommend, good, special", response: 'The espresso will wake you up. The scones... well, they exist.' },
                    { topic: 'man_in_black', keywords: "man, regular, customer, guy, who left", response: "The guy in the black coat? Yeah, he's a regular. Comes in, stares at his notebook, doesn't say much. Pays in cash. My favorite kind of customer." },
                    { topic: 'musician', keywords: "musician, saxophone, job, background, what does he do", response: "I hear he's a musician. Plays the saxophone out on the corner most days. Keeps to himself, you know?" },
                    { topic: 'his_notebook', keywords: "notebook, book, his, what was he doing", response: "Always scribbling in that old notebook of his. Looked like he was writing the next great American novel, or maybe just his grocery list. Who knows."},
                    {
                        topic: 'give_business_card',
                        keywords: "business card, left, name, note, anything else, what did he leave",
                        response: "You know, he left this here the other day. Said I could have it. Some business card. If you're that interested, you can take it. It's just collecting dust.",
                        actions: [
                            { type: 'ADD_ITEM', itemId: 'item_business_card' as ItemId },
                            { type: 'SET_FLAG', flag: 'has_received_business_card' as Flag },
                            { type: 'SHOW_MESSAGE', sender: 'narrator', senderName: 'Narrator', content: "The barista slides a business card across the counter. It's been added to your inventory.", messageType: 'image', imageId: 'item_business_card' },
                            { type: 'END_CONVERSATION' }
                        ]
                    },
                    { topic: 'insult', keywords: "stupid, idiot, useless, rude, dumb", response: "Hey, I get paid to pour coffee, not to be your punching bag. Watch it." },
                    { topic: 'default', keywords: "default", response: "Look, I just work here. I pour coffee, I wipe counters. You're the detective." }
                ]
            },
            'npc_manager': {
                id: 'npc_manager' as NpcId,
                name: 'Cafe Manager',
                description: 'A cheerful woman in her late 40s, with a permanent, slightly-too-wide smile. She radiates a relentless positivity that feels slightly out of place in the grim city.',
                dialogueType: 'freeform',
                persona: "You are Brenda, the relentlessly cheerful and bubbly manager of 'The Daily Grind' cafe. You see the best in everyone and everything. You love talking about your 'Artisan Coffee of the Week', the daily specials, and the local community art you hang on the walls. You are completely oblivious to any crime or mystery. Your job is to be a fountain of pleasant, slightly-vacant small talk. You must not, under any circumstances, talk about the case, murders, or anything negative. Keep your responses short, sweet, and upbeat! Use modern currency like dollars and cents.",
                welcomeMessage: "Welcome to The Daily Grind! How can I make your day a little brighter? Can I interest you in a 'Sunshine Muffin'? They're 10% off!",
                goodbyeMessage: "Have a wonderfully caffeinated day! Come back soon!",
                maxInteractions: 10,
                interactionLimitResponse: "It has been so lovely chatting with you, but I really must get back to managing. The muffins won't bake themselves, you know! Have a super day!",
                image: {
                    url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759604054/cafe_manager_punwhs.png',
                    description: 'Portrait of the cafe manager.',
                    hint: 'female manager'
                }
            }
        }
    }
  }
};

    
