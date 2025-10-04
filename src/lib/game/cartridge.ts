
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
                description: 'A bustling downtown cafe.',
                gridPosition: { x: 1, y: 1 },
                objects: ['obj_brown_notebook'] as GameObjectId[],
                npcs: ['npc_barista'] as NpcId[],
            }
        },
        gameObjects: {
            'obj_brown_notebook': {
                id: 'obj_brown_notebook' as GameObjectId,
                name: 'Brown Notebook',
                description: 'A worn, leather-bound notebook. It feels heavy with secrets. It seems to be a brown leather bound notebook filled with news paper clips. A lock prevents it to be opened without the right password. Whatever it hides, it must be utterly important to its owner!',
                items: [],
                isOpenable: true,
                isLocked: true,
                unlocksWithPhrase: 'JUSTICE FOR SILAS BLOOM',
            }
        },
        items: {},
        npcs: {
            'npc_barista': {
                id: 'npc_barista' as NpcId,
                name: 'Barista',
                description: 'A tired-looking barista.',
                mainMessage: "What can I get you?",
            }
        }
    }
  }
};

export function getMediaAssetById(id: string): MediaAsset | undefined {
    return mediaAssets.find(m => m.id === id);
}
