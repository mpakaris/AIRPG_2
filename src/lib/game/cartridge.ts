import type { Game, Chapter, ChapterId, LocationId, ItemId, GameObjectId, NpcId, GameId } from './types';

export const game: Game = {
  id: 'the-starlight-murder' as GameId,
  title: 'The Crimson Case',
  description: "You are Burt Macklin, FBI. A mysterious stranger hands you a worn notebook from the 1940s—the secret case file of a forgotten murder. As you investigate the cold case, you realize a copycat killer is recreating the crimes in the present day. You must solve the past to stop a killer in the present.",
  gameType: 'Escape Game',
  startChapterId: 'ch1-the-cafe' as ChapterId,
  chapters: {
    'ch1-the-cafe': {
        id: 'ch1-the-cafe' as ChapterId,
        title: 'A Blast from the Past',
        goal: "Unlock the contents of the notebook.",
        objectives: [
            { flag: 'hasTalkedToBarista', label: 'Talk to the Barista' },
            { flag: 'hasReceivedBusinessCard', label: 'Get the Business Card' },
            { flag: 'hasSeenNotebookUrl', label: 'Find the Notebook Minigame' },
            { flag: 'hasUnlockedNotebook', label: 'Unlock the Notebook' },
            { flag: 'notebookInteractionComplete', label: 'View the Notebook Contents' },
        ],
        startLocationId: 'loc_cafe' as LocationId,
        locations: {
            'loc_cafe': {
                id: 'loc_cafe' as LocationId,
                name: 'The Cafe',
                description: 'A bustling downtown cafe, smelling of coffee and rain. The afternoon light is dim. A puddle of rainwater is near the door, and a discarded newspaper lies on an empty table.',
                gridPosition: { x: 1, y: 1 },
                objects: ['obj_brown_notebook', 'obj_chalkboard_menu', 'obj_newspaper'] as GameObjectId[],
                npcs: ['npc_barista', 'npc_manager'] as NpcId[],
            }
        },
        gameObjects: {
            'obj_brown_notebook': {
                id: 'obj_brown_notebook' as GameObjectId,
                name: 'Brown Notebook',
                description: 'A worn, leather-bound notebook. It feels heavy with secrets. A lock prevents it from being opened without the right password.',
                unlockedDescription: "The notebook is open. Inside, you see a folded newspaper article and a small data chip, likely a video or audio recording. You could try to 'read article' or 'watch video'.",
                items: [],
                content: [
                    {
                        id: 'content_article',
                        name: 'article',
                        type: 'article',
                        url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1759241463/Screenshot_2025-09-30_at_15.51.35_gyj3d5.png'
                    },
                    {
                        id: 'content_video',
                        name: 'video',
                        type: 'video',
                        url: 'https://res.cloudinary.com/dg912bwcc/video/upload/v1759241547/0930_eit8he.mov'
                    }
                ],
                isOpenable: true,
                isLocked: true,
                unlocksWithPhrase: 'JUSTICE FOR SILAS BLOOM',
                unlocksWithUrl: 'https://6000-firebase-studio-1759162726172.cluster-4cmpbiopffe5oqk7tloeb2ltrk.cloudworkstations.dev/games/the-notebook'
            },
            'obj_chalkboard_menu': {
                id: 'obj_chalkboard_menu' as GameObjectId,
                name: 'Chalkboard Menu',
                description: "Today's special is three scones for the price of two. A deal almost as sweet as justice.",
                items: [],
            },
            'obj_newspaper': {
                id: 'obj_newspaper' as GameObjectId,
                name: 'Newspaper',
                description: "It's a copy of today's local paper. The main headlines discuss the current series of murders. The usual crazyness of a Metropolis.",
                items: [],
            }
        },
        items: {
            'item_business_card': {
                id: 'item_business_card' as ItemId,
                name: 'Business Card',
                description: 'A simple business card for a musician. It reads: "S A X O - The World\'s Best Sax Player". A phone number is listed, along with a handwritten number "1943" and the name "ROSE".',
                image: 'business_card'
            }
        },
        npcs: {
            'npc_barista': {
                id: 'npc_barista' as NpcId,
                name: 'Barista',
                description: 'A tired-looking male barista. He seems to have seen a lot in this cafe and is not easily impressed.',
                welcomeMessage: 'Good Morning Sir, how can I help you? Would you like to try our Specialty Coffee today?',
                goodbyeMessage: "I'm sorry, mister. But I do have to return to my work. I wish you all the best.",
                image: 'barista',
                cannedResponses: [
                    { topic: 'greeting', response: 'Just coffee today, or can I help with something else?' },
                    { topic: 'mystery', response: "The man who just left? Ah, him. He's a regular. Comes in, gets his coffee, doesn't say much." },
                    { topic: 'saxophonist', response: "He's a musician. Plays the saxophone out on the corner most days. Pretty good, too." },
                    { topic: 'clue', response: "You know, he left his business card here once. Said I could have it. If you're that interested, you can take it." },
                    { topic: 'insult', response: "Hey, watch your tone. I'm just here to pour coffee, not take abuse." },
                    { topic: 'default', response: "Sorry, I'm just a barista. I wouldn't know anything about that." }
                ]
            },
            'npc_manager': {
                id: 'npc_manager' as NpcId,
                name: 'Cafe Manager',
                description: 'A cheerful, slightly-too-energetic manager.',
                welcomeMessage: "Welcome! May I interest you in our special today? You get a cheese cake with every Coffee you order!",
                mainMessage: "Can't talk now, I'm very busy! But if you need anything, just ask.",
                finalMessage: "I really must get back to work now. Let me know if you need anything else!",
                goodbyeMessage: "Have a great day!",
            }
        }
    }
  }
};
