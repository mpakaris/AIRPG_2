import { config } from 'dotenv';
config();

import '@/ai/flows/guide-player-with-narrator.ts';
import '@/ai/flows/select-npc-response.ts';
import '@/ai/flows/interpret-player-commands.ts';
import '@/ai/flows/generate-story-from-logs.ts';
