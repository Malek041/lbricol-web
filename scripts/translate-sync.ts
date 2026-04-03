/**
 * Lbricol Translation Sync Tool (AI-Powered)
 * 
 * Usage:
 * 1. Add new keys to messages/en.json
 * 2. Run this script to find missing translations in fr/ar
 * 3. Use an LLM to generate the missing values and paste them back.
 */

import fs from 'fs';
import path from 'path';

const MESSAGES_DIR = path.join(process.cwd(), 'messages');
const EN_PATH = path.join(MESSAGES_DIR, 'en.json');
const FR_PATH = path.join(MESSAGES_DIR, 'fr.json');
const AR_PATH = path.join(MESSAGES_DIR, 'ar.json');

function sync() {
    const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf-8'));
    const fr = JSON.parse(fs.readFileSync(FR_PATH, 'utf-8'));
    const ar = JSON.parse(fs.readFileSync(AR_PATH, 'utf-8'));

    const missingFr = [];
    const missingAr = [];

    for (const key in en) {
        if (!fr[key] || fr[key] === '') missingFr.push(key);
        if (!ar[key] || ar[key] === '') missingAr.push(key);
    }

    console.log('--- TRANSLATION SYNC STATUS ---');
    console.log(`Total Keys: ${Object.keys(en).length}`);
    console.log(`Missing French: ${missingFr.length}`);
    console.log(`Missing Arabic: ${missingAr.length}`);

    if (missingFr.length > 0 || missingAr.length > 0) {
        console.log('\nPROMPT FOR AI (Copy this):');
        console.log('---------------------------');
        console.log(`Please translate the following ${missingFr.length + missingAr.length} keys for a Moroccan handyman marketplace (Lbricol.ma).`);
        console.log('Use French and Moroccan Arabic where appropriate.');
        
        const payload = {
            context: "Moroccan marketplace for local services/handymen",
            missing: {
                fr: missingFr,
                ar: missingAr
            }
        };
        console.log(JSON.stringify(payload, null, 2));
    } else {
        console.log('\n✅ All translations are in sync!');
    }
}

sync();
