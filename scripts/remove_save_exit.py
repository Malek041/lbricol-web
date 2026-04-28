import re

filepath = 'src/features/hosts/components/PropertySetupWizard.tsx'

with open(filepath, 'r') as f:
    content = f.read()

before_count = len(re.findall(r'Enregistrer et quitter', content))

# Pattern: any wrapping div containing ONLY the save & exit button (both variants)
# Variant 1: flex flex-col items-start
# Variant 2: flex flex-col items-start gap-2 pb-6
pattern = (
    r'\n[ \t]*<div className="flex flex-col items-start[^"]*">\s*'
    r'<button onClick=\{onClose\}[^>]+>\s*'
    r'\{t\(\{[^}]+Enregistrer et quitter[^}]+\}\)\}\s*'
    r'</button>\s*'
    r'</div>'
)

cleaned = re.sub(pattern, '', content, flags=re.MULTILINE)

after_count = len(re.findall(r'Enregistrer et quitter', cleaned))
print(f'Removed {before_count - after_count} inline Save & exit blocks')
print(f'Remaining: {after_count} (should be 3: step1_detail, step2_detail, global top bar)')

with open(filepath, 'w') as f:
    f.write(cleaned)

print('Done')
