import type { Game, Chapter, ChapterId, LocationId, ItemId, GameObjectId, NpcId, GameId } from './types';

export const game: Game = {
  id: 'the-starlight-murder' as GameId,
  title: 'The Crimson Case',
  description: "You are Burt Macklin, FBI. A mysterious stranger hands you a worn notebook from the 1940s—the secret case file of a forgotten murder. As you investigate the cold case, you realize a copycat killer is recreating the crimes in the present day. You must solve the past to stop a killer in the present.",
  startChapterId: 'ch1-the-cafe' as ChapterId,
  chapters: {
    'ch1-the-cafe': {
        id: 'ch1-the-cafe' as ChapterId,
        title: 'A Blast from the Past',
        goal: "Unlock the contents of the notebook.",
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
                unlockedDescription: 'The notebook is now unlocked. Upon first glance, you find an old Audio/Video Message and a Newspaper Article from the past.\n\n- Read Article: https://1drv.ms/i/c/e7d3aeb87385d8a2/EYUcIv6_9MNHuqnzyMXYrpMBodwu6VeeaJ7-2RZ854N5Qw?e=g3lbfF\n- Watch Video: https://1drv.ms/v/c/e7d3aeb87385d8a2/EcgZlhJvCjhFlfCqCo7hVyQBeLOu4BrqNEhYgbZmEuNY2w?e=KDZkSd',
                items: [],
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
                mainMessage: "The mystery man you saw? Plays the saxophone on the corner every day. Real talented. He left his business card here once, if you're interested.",
                finalMessage: "Sorry Sir, I've told you all I know. Do you still want a coffee or can I get back to my work?",
                goodbyeMessage: "Happy to help, sir.",
                image: 'barista'
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
