/**
 * Image optimization script using Sharp.
 * Converts PNG/JPG images in public/ to WebP at 85% quality.
 * Skips already-converted files.
 * Run with: node scripts/optimize-images.mjs
 */

import sharp from 'sharp';
import { readdirSync, statSync, existsSync } from 'fs';
import { join, extname, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');

let converted = 0;
let skipped = 0;
let totalSavedKB = 0;

function getAllImages(dir) {
    const results = [];
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...getAllImages(fullPath));
        } else {
            const ext = extname(entry.name).toLowerCase();
            if (['.png', '.jpg', '.jpeg'].includes(ext)) {
                results.push(fullPath);
            }
        }
    }
    return results;
}

async function optimizeImage(filePath) {
    const ext = extname(filePath).toLowerCase();
    const webpPath = filePath.replace(/\.(png|jpg|jpeg)$/i, '.webp');

    // Skip if WebP already exists
    if (existsSync(webpPath)) {
        skipped++;
        return;
    }

    try {
        const originalSize = statSync(filePath).size;

        const sharpInstance = sharp(filePath);

        // For PNGs with transparency, use lossless=false but high quality
        if (ext === '.png') {
            await sharpInstance
                .webp({ quality: 85, lossless: false })
                .toFile(webpPath);
        } else {
            await sharpInstance
                .webp({ quality: 82 })
                .toFile(webpPath);
        }

        const newSize = statSync(webpPath).size;
        const savedKB = (originalSize - newSize) / 1024;
        totalSavedKB += savedKB;
        converted++;

        const pct = ((1 - newSize / originalSize) * 100).toFixed(1);
        console.log(`✅ ${basename(filePath)} → .webp  (${pct}% smaller, saved ${savedKB.toFixed(0)} KB)`);
    } catch (err) {
        console.error(`❌ Failed: ${filePath}`, err.message);
    }
}

async function main() {
    console.log('🔍 Scanning public/ for images...\n');
    const images = getAllImages(PUBLIC_DIR);
    console.log(`Found ${images.length} images. Converting to WebP...\n`);

    for (const img of images) {
        await optimizeImage(img);
    }

    console.log(`\n✨ Done!`);
    console.log(`   Converted: ${converted} images`);
    console.log(`   Skipped (already WebP): ${skipped}`);
    console.log(`   Total space saved: ${(totalSavedKB / 1024).toFixed(2)} MB`);
}

main();
