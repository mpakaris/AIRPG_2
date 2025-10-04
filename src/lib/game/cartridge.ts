
import type { Game, Chapter, MediaAsset, ChapterId, LocationId, ItemId, GameObjectId, NpcId } from './types';

export const mediaAssets: MediaAsset[] = [
    {
      id: "MEDIA_SILAS_BLOOM_AUDIO",
      type: "audio",
      url: "https://res.cloudinary.com/dg912bwcc/video/upload/v1759241547/0930_eit8he.mov",
      description: "Audio of the Midnight Lounge Jazz Club announcement for Silas Bloom and Rose Carmichael."
    },
    {
      id: "MEDIA_1943_NEWS_ARTICLE",
      type: "image",
      url: "https://res.cloudinary.com/dg912bwcc/image/upload/v1759241463/Screenshot_2025-09-30_at_15.51.35_gyj3d5.png",
      description: "Newspaper article detailing the murder of Rose and the arrest of Silas Bloom, naming Dean Macklin."
    },
    {
        "id": "MEDIA_BUSINESS_CARD",
        "type": "image",
        "url": "https://images.unsplash.com/photo-1563771649911-1c93716f1a4a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMGNhcmR8ZW58MHx8fHwxNzU5NjcwNjYwfDA&ixlib=rb-4.1.0&q=80&w=1080",
        "description": "A business card for a saxophone player named 'S A X O'."
    }
];

export const game: Game = {
  id: 'the-starlight-murder' as GameId,
  title: 'The Crimson Case',
  description: "You are Burt Macklin, FBI. A mysterious stranger hands you a worn notebook from the 1940s—the secret case file of a forgotten murder. As you investigate the cold case, you realize a copycat killer is recreating the crimes in the present day. You must solve the past to stop a killer in the present.",
  startChapterId: 'ch1-the-cafe' as ChapterId,
  chapters: {
    'ch1-the-cafe': {
        id: 'ch1-the-cafe' as ChapterId,
        title: 'A Stranger in the Rain',
        goal: "Unlock the mysterious notebook.",
        startLocationId: 'loc_cafe' as LocationId,
        locations: {
            'loc_cafe': {
                id: 'loc_cafe' as LocationId,
                name: 'The Cafe',
                description: 'A bustling downtown cafe. A tired-looking barista is cleaning the counter, and a manager is proudly pointing at a chalkboard menu.',
                gridPosition: { x: 1, y: 1 },
                objects: ['obj_brown_notebook'] as GameObjectId[],
                npcs: ['npc_barista', 'npc_manager'] as NpcId[],
            }
        },
        gameObjects: {
            'obj_brown_notebook': {
                id: 'obj_brown_notebook' as GameObjectId,
                name: 'Brown Notebook',
                description: 'A worn, leather-bound notebook. It feels heavy with secrets. A lock prevents it from being opened without the right password. On the cover, a URL is inscribed: https://6000-firebase-studio-1759162726172.cluster-4cmpbiopffe5oqk7tloeb2ltrk.cloudworkstations.dev/games/the-notebook. Whatever it hides, it must be utterly important to its owner!',
                items: [],
                isOpenable: true,
                isLocked: true,
                unlocksWithPhrase: 'JUSTICE FOR SILAS BLOOM',
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
                description: 'A tired-looking barista. They seem to have seen a lot in this cafe.',
                mainMessage: "The mystery man you saw? Plays the saxophone on the corner every day. Real talented. He left his business card here once, if you're interested.",
            },
            'npc_manager': {
                id: 'npc_manager' as NpcId,
                name: 'Cafe Manager',
                description: 'A cheerful, slightly-too-energetic manager.',
                mainMessage: "Welcome! May I interest you in our special today? Three scones for the price of two!",
            }
        }
    }
  }
};

export function getMediaAssetById(id: string): MediaAsset | undefined {
    return mediaAssets.find(m => m.id === id);
}
