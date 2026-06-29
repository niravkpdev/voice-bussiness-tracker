import re

with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'\)\s*\}\s*</tbody>'
replacement = ')})()}</tbody>'

if re.search(pattern, content):
    content = re.sub(pattern, replacement, content, count=1)
    with open('src/VoiceExpenseTrackerPreview.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched IIFE close successfully.")
else:
    print("Could not find tbody close block.")
