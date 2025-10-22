
import * as fs from 'fs';
import * as path from 'path';
import { game as gameCartridge } from '../src/lib/game/cartridge';

/**
 * This script "bakes" the TypeScript game cartridge into a static JSON file.
 * This provides a stable, pure-data artifact that the seed script can use,
 * avoiding the complexities and potential errors of parsing TypeScript directly
 * or dealing with environment-specific module loading issues.
 *
 * To run: `npm run db:bake`
 */
async function bakeCartridgeToJson() {
    console.log('Baking game cartridge to JSON...');

    try {
        const jsonContent = JSON.stringify(gameCartridge, null, 2);
        const outputPath = path.resolve(__dirname, '../src/lib/game/cartridge.json');
        
        fs.writeFileSync(outputPath, jsonContent);

        console.log(`Successfully baked cartridge to: ${outputPath}`);
    } catch (error) {
        console.error('Failed to bake cartridge:', error);
        process.exit(1);
    }
}

bakeCartridgeToJson();
