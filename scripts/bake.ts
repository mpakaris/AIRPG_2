import * as fs from 'fs';
import * as path from 'path';

/**
 * This script "bakes" all TypeScript game cartridges into static JSON files.
 * This provides stable, pure-data artifacts that the seed script can use.
 *
 * To run: `npm run db:bake`
 */
async function bakeCartridgesToJson() {
    console.log('🔥 Baking game cartridges to JSON...\n');

    const cartridgesDir = path.resolve(__dirname, '../src/lib/game/cartridges');
    const outputDir = path.resolve(__dirname, '../src/lib/game/cartridges/baked');

    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`✅ Created output directory: ${outputDir}\n`);
    }

    // Find all chapter-*.ts files
    const allFiles = fs.readdirSync(cartridgesDir);
    const cartridgeFiles = allFiles.filter(file =>
        file.startsWith('chapter-') && file.endsWith('.ts')
    );

    if (cartridgeFiles.length === 0) {
        console.log('⚠️  No cartridge files found!');
        return;
    }

    console.log(`📦 Found ${cartridgeFiles.length} cartridge(s):\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const fileName of cartridgeFiles) {
        const chapterName = fileName.replace('.ts', '');
        console.log(`   Processing: ${chapterName}...`);

        try {
            // Dynamically import the cartridge
            const modulePath = path.join(cartridgesDir, fileName);
            const module = await import(modulePath);

            if (!module.game) {
                console.log(`   ❌ Error: No 'game' export found in ${fileName}`);
                errorCount++;
                continue;
            }

            const gameData = module.game;

            // Create JSON output
            const jsonContent = JSON.stringify(gameData, null, 2);
            const outputPath = path.join(outputDir, `${chapterName}.json`);

            fs.writeFileSync(outputPath, jsonContent);

            console.log(`   ✅ Baked to: baked/${chapterName}.json`);
            successCount++;

        } catch (error) {
            console.log(`   ❌ Failed to bake ${fileName}:`, error);
            errorCount++;
        }
    }

    // Also create backward-compatible cartridge.json for chapter-0
    try {
        const chapter0Path = path.join(outputDir, 'chapter-0.json');
        if (fs.existsSync(chapter0Path)) {
            const legacyPath = path.resolve(__dirname, '../src/lib/game/cartridge.json');
            fs.copyFileSync(chapter0Path, legacyPath);
            console.log(`\n📋 Created backward-compatible cartridge.json`);
        }
    } catch (error) {
        console.log(`\n⚠️  Could not create backward-compatible cartridge.json:`, error);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Baking complete!`);
    console.log(`   Success: ${successCount}`);
    if (errorCount > 0) {
        console.log(`   Errors:  ${errorCount}`);
    }
    console.log(`${'='.repeat(60)}\n`);

    if (errorCount > 0) {
        process.exit(1);
    }
}

bakeCartridgesToJson();
