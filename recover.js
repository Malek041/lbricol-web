const fs = require('fs');
const log = fs.readFileSync('/Users/xProject/.gemini/antigravity/brain/bfdf87e1-c40d-40a3-9a1a-391208bf725a/.system_generated/logs/overview.txt', 'utf8');

const matches = [...log.matchAll(/Showing lines 200 to 3381\n([\s\S]*?)The above content does NOT show the entire file contents/g)];
if (matches.length > 0) {
    const lastMatch = matches[matches.length - 1][1];
    // Remove the line numbers added by view_file
    const cleaned = lastMatch.split('\n').map(line => {
        const idx = line.indexOf(': ');
        if (idx !== -1 && !isNaN(parseInt(line.substring(0, idx)))) {
            return line.substring(idx + 2);
        }
        return line;
    }).join('\n');
    fs.writeFileSync('recovered.tsx', cleaned);
    console.log("Recovered file to recovered.tsx");
} else {
    console.log("Could not find the view_file block in the log.");
}
