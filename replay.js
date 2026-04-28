const fs = require('fs');
const log = fs.readFileSync('/Users/xProject/.gemini/antigravity/brain/bfdf87e1-c40d-40a3-9a1a-391208bf725a/.system_generated/logs/overview.txt', 'utf8');

let content = fs.readFileSync('/Users/xProject/Desktop/Startups/Dev Stuff (Startups)/Lbricol.ma/src/features/hosts/components/PropertySetupWizard.tsx', 'utf8');

const lines = log.trim().split('\n');
let operations = [];

for (const line of lines) {
    try {
        const obj = JSON.parse(line);
        if (obj.type === 'TOOL_CALL' || obj.type === 'PLANNER_RESPONSE') {
            if (obj.tool_calls) {
                for (const tc of obj.tool_calls) {
                    if (tc.name === 'multi_replace_file_content' || tc.name === 'replace_file_content') {
                        if (tc.args.TargetFile && tc.args.TargetFile.includes('PropertySetupWizard.tsx')) {
                            operations.push(tc.args);
                        }
                    }
                }
            }
        }
    } catch (e) {}
}

console.log('Found', operations.length, 'operations.');

let successCount = 0;
let failCount = 0;

for (let i = 0; i < operations.length; i++) {
    const op = operations[i];
    let chunks = op.ReplacementChunks;
    if (!chunks && op.TargetContent) {
        chunks = [op];
    }
    
    if (typeof chunks === 'string') {
        try {
            // Fix unescaped newlines in JSON string
            chunks = JSON.parse(chunks.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t'));
        } catch(e) {
            try {
                // If strict parse fails, use Function evaluation
                chunks = new Function('return ' + chunks)();
            } catch(e2) {
                console.log('Failed to parse chunks for op', i);
                continue;
            }
        }
    }
    
    for (const chunk of chunks) {
        if (content.includes(chunk.TargetContent)) {
            content = content.replace(chunk.TargetContent, chunk.ReplacementContent);
            successCount++;
        } else {
            console.log('Failed to match chunk in op', i, 'target starting with:', chunk.TargetContent.substring(0, 30).replace(/\n/g, '\\n'));
            failCount++;
        }
    }
}

fs.writeFileSync('/Users/xProject/Desktop/Startups/Dev Stuff (Startups)/Lbricol.ma/src/features/hosts/components/PropertySetupWizard.tsx', content);
console.log('Applied diffs. Success:', successCount, 'Failures:', failCount);
