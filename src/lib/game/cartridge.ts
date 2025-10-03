import type { Game, ChapterId, LocationId, ItemId, GameObjectId, NpcId } from './types';

export const game: Game = {
  id: 'detective-chronicles-1' as Game['id'],
  title: 'Detective Chronicles: The Crimson Canary',
  description: 'A thrilling detective story where you must solve the mystery of a stolen artifact.',
  startChapterId: 'chapter-1' as ChapterId,
  chapters: {
    'chapter-1': {
      id: 'chapter-1' as ChapterId,
      title: 'Chapter 1: The Scholar\'s Study',
      goal: 'Find the hidden message left by Professor Albright.',
      startLocationId: 'study' as LocationId,
      locations: {
        'study': {
          id: 'study' as LocationId,
          name: 'The Study',
          description: 'A cozy, wood-paneled study filled with books. A large oak desk sits in the center. The air smells of old paper and leather. A single window looks out onto a rain-slicked street.',
          gridPosition: { x: 1, y: 1 },
          objects: ['desk', 'bookshelf'] as GameObjectId[],
          npcs: ['butler'] as NpcId[],
        },
        'hallway': {
            id: 'hallway' as LocationId,
            name: 'Upstairs Hallway',
            description: 'A long, dimly lit hallway. Doors lead to various rooms. A grandfather clock ticks softly in the corner.',
            gridPosition: { x: 1, y: 0 },
            objects: [] as GameObjectId[],
            npcs: [],
        }
      },
      gameObjects: {
        'desk': {
          id: 'desk' as GameObjectId,
          name: 'Oak Desk',
          description: 'A grand, old oak desk. It has a single, large drawer which appears to be locked.',
          items: ['notebook'] as ItemId[],
          isOpenable: true,
          isLocked: true,
          unlocksWith: 'old-key' as ItemId,
        },
        'bookshelf': {
            id: 'bookshelf' as GameObjectId,
            name: 'Bookshelf',
            description: 'A towering bookshelf filled with leather-bound volumes. One book, "Tales of the Sea", seems slightly out of place.',
            items: ['old-key'] as ItemId[],
            isOpenable: false,
        }
      },
      items: {
        'old-key': {
          id: 'old-key' as ItemId,
          name: 'Old Key',
          description: 'A small, ornate brass key. It looks like it would fit a desk drawer.',
          image: 'old-key',
        },
        'notebook': {
            id: 'notebook' as ItemId,
            name: 'Notebook',
            description: 'A small, leather-bound notebook. The first page contains a hastily scrawled message: "The canary sings at midnight."',
            image: 'notebook'
        }
      },
      npcs: {
        'butler': {
          id: 'butler' as NpcId,
          name: 'Jeeves the Butler',
          description: 'A tall, stern-looking man in a pristine suit. He seems wary of your presence.',
          mainMessage: 'The Professor was a man of routines. He always said, "Everything has its place."',
        },
      },
    },
  },
};
