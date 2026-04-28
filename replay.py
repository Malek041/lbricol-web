import json

log_path = '/Users/xProject/.gemini/antigravity/brain/bfdf87e1-c40d-40a3-9a1a-391208bf725a/.system_generated/logs/overview.txt'
target_file = '/Users/xProject/Desktop/Startups/Dev Stuff (Startups)/Lbricol.ma/src/features/hosts/components/PropertySetupWizard.tsx'

with open(log_path, 'r') as f:
    lines = f.readlines()

with open(target_file, 'r') as f:
    content = f.read()

operations = []

for line in lines:
    line = line.strip()
    if not line:
        continue
    try:
        obj = json.loads(line)
        if obj.get('type') in ['TOOL_CALL', 'PLANNER_RESPONSE']:
            for tc in obj.get('tool_calls', []):
                if tc.get('name') in ['multi_replace_file_content', 'replace_file_content']:
                    if 'PropertySetupWizard.tsx' in tc.get('args', {}).get('TargetFile', ''):
                        operations.append(tc['args'])
    except Exception as e:
        pass

print(f"Found {len(operations)} operations.")

success_count = 0
fail_count = 0

for i, op in enumerate(operations):
    chunks = op.get('ReplacementChunks')
    if not chunks and op.get('TargetContent'):
        chunks = [op]
    
    if isinstance(chunks, str):
        try:
            # The string might be JSON
            # Replace actual newlines with \n for json.loads
            chunks_str = chunks.replace('\n', '\\n').replace('\r', '\\r').replace('\t', '\\t')
            chunks = json.loads(chunks_str)
        except Exception as e:
            print(f"Failed to parse chunks for op {i}")
            continue
            
    for chunk in chunks:
        target = chunk.get('TargetContent', '')
        replacement = chunk.get('ReplacementContent', '')
        if target in content:
            content = content.replace(target, replacement)
            success_count += 1
        else:
            print(f"Failed to match chunk in op {i}")
            fail_count += 1

with open(target_file, 'w') as f:
    f.write(content)

print(f"Applied diffs. Success: {success_count}, Failures: {fail_count}")
