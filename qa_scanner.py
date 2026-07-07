import os
import re

def check_file(filepath):
    issues = []
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')

    # 1. Async onClick without try/catch
    # This is hard to detect perfectly with regex, but we can look for onClick={async () => ...} without try
    for i, line in enumerate(lines):
        if 'onClick={async' in line or 'onSubmit={async' in line:
            # check if there's a try/catch nearby
            context = '\n'.join(lines[max(0, i):min(len(lines), i+10)])
            if 'try {' not in context and 'catch' not in context and '.catch(' not in context:
                issues.append((i+1, "Async handler might be missing try/catch for error handling", line.strip()))

    # 2. Missing .catch on cloud operations if not in try block
    for i, line in enumerate(lines):
        if 'onCloudRecord' in line or 'saveCloudRecord' in line:
            if 'await ' not in line and '.catch' not in line and 'try' not in '\n'.join(lines[max(0, i-5):i+5]):
                issues.append((i+1, "Cloud operation might be unhandled promise", line.strip()))

    # 3. Console.error without user notification (onStatus, setStatus, toast)
    # 4. Dead buttons (already patched mostly, but let's re-verify)
    for i, line in enumerate(lines):
        if 'onClick={() => {}}' in line or 'onClick={(e) => e.preventDefault()}' in line:
            issues.append((i+1, "Empty onClick handler (dead button)", line.strip()))
            
    if issues:
        print(f"\n--- {filepath} ---")
        for line_no, msg, code in issues:
            print(f"L{line_no}: [{msg}] -> {code[:80]}")

for root, dirs, files in os.walk('src'):
    if 'node_modules' in root: continue
    for file in files:
        if file.endswith(('.jsx', '.js', '.tsx', '.ts')):
            check_file(os.path.join(root, file))
