
import type { Game, ChapterId, LocationId, ItemId, GameObjectId, NpcId, GameId, Flag } from './types';

export const game: Game = {
  id: 'blood-on-brass' as GameId,
  title: 'The Midnight Lounge Jazz Club Case',
  description: "You are Burt Macklin, FBI. A mysterious stranger hands you a worn notebook from the 1940s—the secret case file of a forgotten murder. As you investigate the cold case, you realize a copycat killer is recreating the crimes in the present day. You must solve the past to stop a killer in the present.",
  gameType: 'Escape Game',
  narratorName: 'Agent Sharma',
  promptContext: `You are Agent Sharma, the partner and "good conscience" of FBI agent Burt Macklin (the player). Your role is to act as a helpful Game Master, providing hints and keeping him on track towards the main goal. You are conversational and supportive. Your response MUST be enclosed in quotation marks. Do not use any markdown formatting like italics or bold.`,
  startChapterId: 'ch1-the-cafe' as ChapterId,
  chapters: {
    'ch1-the-cafe': {
        id: 'ch1-the-cafe' as ChapterId,
        title: 'A Blast from the Past',
        goal: "Unlock the contents of the notebook.",
        introductionVideo: 'https://res.cloudinary.com/dg912bwcc/video/upload/v1759670681/CH_I_Intro_ccy0og.mov',
        completionVideo: 'https://res.cloudinary.com/dg912bwcc/video/upload/v1759591583/Pr%C3%A4sentation1_ke0qg7.mp4',
        postChapterMessage: "Burt, it seems we got all the information here. Maybe we should continue elsewhere.",
        nextChapter: {
            title: 'The Midnight Lounge',
            transitionCommand: 'go to jazz club'
        },
        objectives: [
            { flag: 'has_talked_to_barista' as Flag, label: 'Talk to the Barista' },
            { flag: 'has_received_business_card' as Flag, label: 'Get the Business Card' },
            { flag: 'has_seen_notebook_url' as Flag, label: 'Find the Notebook Minigame' },
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
                description: 'A worn, leather-bound notebook. It feels heavy with secrets. A lock prevents it from being opened without the right password.',
                unlockedDescription: "The notebook is open. Inside, you see a small data chip. You could try to 'watch video'.",
                items: [],
                isOpenable: true,
                isLocked: true,
                unlocksWithPhrase: 'JUSTICE FOR SILAS BLOOM',
                onUnlockActions: [
                    { type: 'SET_FLAG', flag: 'has_unlocked_notebook' as Flag },
                    { type: 'START_INTERACTION', objectId: 'obj_brown_notebook' as GameObjectId, interactionStateId: 'start' }
                ],
                onExamineLockedActions: [
                    { type: 'SET_FLAG', flag: 'has_seen_notebook_url' as Flag }
                ],
                unlocksWithUrl: 'https://6000-firebase-studio-1759162726172.cluster-4cmpbiopffe5oqk7tloeb2ltrk.cloudworkstations.dev/games/the-notebook',
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
                                { type: 'SHOW_MESSAGE', sender: 'agent', senderName: 'Agent Sharma', content: "Silas Bloom? I've never heard of him. But it seems he was a great musician. He wrote an amazing Song for this Rose. They really must have been crazy in love." },
                                { type: 'SHOW_MESSAGE', sender: 'narrator', senderName: 'Narrator', content: "It seems that there is also a newspaper article where the video was." },
                                { type: 'SET_INTERACTION_STATE', state: 'video_watched' },
                                { type: 'SET_FLAG', flag: 'notebook_video_watched' as Flag }
                            ],
                            'exit': [{ type: 'END_INTERACTION' }],
                            'close': [{ type: 'END_INTERACTION' }],
                        }
                    },
                    'video_watched': {
                        id: 'video_watched',
                        description: "You've watched the video. Tucked behind the data chip, you now see a folded newspaper article. You could 'read article' or 'exit'.",
                        commands: {
                            'read article': [
                                { type: 'SHOW_MESSAGE', sender: 'narrator', senderName: 'Narrator', content: 'A newspaper article about Silas Bloom.', messageType: 'article', imageId: 'newspaper_article' },
                                { type: 'SHOW_MESSAGE', sender: 'agent', senderName: 'Agent Sharma', content: "Burt, the article talks about Agent Mackling. Is that coincidence? It cant be. That must be what? Your grandfather? You are in law enforcement for 4 generations. Oh my god, this is huge, Burt!" },
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
                                { type: 'SHOW_MESSAGE', sender: 'agent', senderName: 'Agent Sharma', content: "Silas Bloom? I've never heard of him. But it seems he was a great musician. He wrote an amazing Song for this Rose. They really must have been crazy in love." },
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
                description: "Today's special is three scones for the price of two. A deal almost as sweet as justice.",
                items: [],
                image: {
                    url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759603706/Chalkboard_h61haz.png',
                    description: 'A chalkboard menu in a cafe.',
                    hint: 'chalkboard menu'
                }
            },
            'obj_newspaper': {
                id: 'obj_newspaper' as GameObjectId,
                name: 'Newspaper',
                description: "It's a copy of today's local paper. The main headlines discuss the current series of murders. The usual crazyness of a Metropolis.",
                items: [],
                image: {
                    url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759603706/Newspaper_p85m1h.png',
                    description: 'A newspaper on a table.',
                    hint: 'newspaper'
                }
            },
            'obj_bookshelf': {
                id: 'obj_bookshelf' as GameObjectId,
                name: 'Bookshelf',
                description: 'A small bookshelf in a reading corner, filled with a variety of used paperbacks.',
                items: [],
                image: {
                    url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759604596/Bookshelf_Cafe_kn4poz.png',
                    description: 'A bookshelf in a cafe.',
                    hint: 'bookshelf reading corner'
                }
            },
            'obj_painting': {
                id: 'obj_painting' as GameObjectId,
                name: 'Painting on the wall',
                description: 'An abstract painting hangs on the wall, its swirls of color adding a touch of modern art to the cafe\'s cozy atmosphere.',
                items: [],
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
                description: 'A tired-looking male barista. He seems to have seen a lot in this cafe and is not easily impressed.',
                welcomeMessage: 'Good Morning Sir, how can I help you? Would you like to try our Specialty Coffee today?',
                goodbyeMessage: "I'm sorry, mister. But I do have to return to my work. I wish you all the best.",
                image: {
                    url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759241505/Cafe_barrista_hpwona.png',
                    description: 'A portrait of the cafe barista.',
                    hint: 'male barista'
                },
                startConversationActions: [
                    { type: 'SET_FLAG', flag: 'has_talked_to_barista' as Flag }
                ],
                cannedResponses: [
                    { topic: 'greeting', response: 'Just coffee today, or can I help with something else?' },
                    { topic: 'mystery', response: "The man who just left? Ah, him. He's a regular. Comes in, gets his coffee, doesn't say much." },
                    { topic: 'saxophonist', response: "He's a musician. Plays the saxophone out on the corner most days. Pretty good, too." },
                    {
                        topic: 'clue',
                        response: "You know, he left his business card here once. Said I could have it. If you're that interested, you can take it.",
                        actions: [
                            { type: 'ADD_ITEM', itemId: 'item_business_card' as ItemId },
                            { type: 'SET_FLAG', flag: 'has_received_business_card' as Flag },
                            { type: 'SHOW_MESSAGE', sender: 'narrator', senderName: 'Narrator', content: "The barista hands you a business card. It's been added to your inventory.", messageType: 'image', imageId: 'item_business_card' },
                            { type: 'SHOW_MESSAGE', sender: 'agent', senderName: 'Agent Sharma', content: "Oh Burt you genious! Your instincts won, one more time! Maybe that is the key to open that Notebook!" },
                            { type: 'END_CONVERSATION' }
                        ]
                    },
                    { topic: 'insult', response: "Hey, watch your tone. I'm just here to pour coffee, not take abuse." },
                    { topic: 'default', response: "Sorry, I'm just a barista. I wouldn't know anything about that." }
                ]
            },
            'npc_manager': {
                id: 'npc_manager' as NpcId,
                name: 'Cafe Manager',
                description: 'A cheerful, slightly-too-energetic manager.',
                welcomeMessage: "Welcome! May I interest you in our special today? You get a cheese cake with every Coffee you order!",
                goodbyeMessage: "Have a great day!",
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
