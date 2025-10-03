import { config } from 'dotenv';
config();

import '@/ai/flows/guide-player-with-narrator.ts';
import '@/ai/flows/generate-npc-responses.ts';
import '@/ai/flows/interpret-player-commands.ts';