/**
 * Replace ALL remaining .png / .jpg / .jpeg that appear in /Images/ paths
 * in TSX source files with .webp — handles spaces, single/double quotes.
 */

import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC_DIR = join(ROOT, 'src');

function getAllFiles(dir, exts) {
    const results = [];
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fp = join(dir, entry.name);
        if (entry.isDirectory()) results.push(...getAllFiles(fp, exts));
        else if (exts.includes(extname(entry.name))) results.push(fp);
    }
    return results;
}

function replaceAll(content) {
    let count = 0;
    // Match /Images/ followed by anything NOT a quote, up to a .extensions
    const updated = content.replace(
        /(\/Images\/[^"'`]*?)\.(png|jpg|jpeg)/g,
        (_match, p, _ext) => {
            count++;
            return `${p}.webp`;
        }
    );
    return { updated, count };
}

let modified = 0;
let total = 0;

for (const file of getAllFiles(SRC_DIR, ['.tsx', '.ts', '.js', '.jsx'])) {
    const orig = readFileSync(file, 'utf8');
    const { updated, count } = replaceAll(orig);
    if (count > 0) {
        writeFileSync(file, updated, 'utf8');
        modified++;
        total += count;
        console.log(`✅ ${file.replace(ROOT + '/', '')}  (${count} replacements)`);
    }
}

console.log(`\n✨ Done! ${total} replacements across ${modified} files.`);
