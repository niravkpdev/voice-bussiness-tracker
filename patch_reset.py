import os
import re

def patch_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'event.currentTarget.reset()' not in content:
        return False
        
    lines = content.split('\n')
    new_lines = []
    
    modified = False
    
    for line in lines:
        if re.search(r'const \w+ = async \((?:event)\) => \{', line) or re.search(r'const \w+ = async function\((?:event)\) \{', line):
            new_lines.append(line)
            indent = len(line) - len(line.lstrip())
            new_lines.append(' ' * indent + '  const targetForm = event.currentTarget;')
            modified = True
            continue
            
        if 'event.currentTarget.reset()' in line:
            line = line.replace('event.currentTarget.reset()', 'if (targetForm) targetForm.reset(); else if (event && event.target && event.target.reset) event.target.reset();')
            modified = True
            
        new_lines.append(line)

    if modified:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write('\n'.join(new_lines))
        return True
    return False

files = [
    'src/Phase2ERP.jsx',
    'src/Phase3Ops.jsx',
    'src/VoiceExpenseTrackerPreview.jsx'
]

for f in files:
    if os.path.exists(f):
        if patch_file(f):
            print(f"Patched {f}")
        else:
            print(f"No changes for {f}")
    else:
        print(f"Not found: {f}")
