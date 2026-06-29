import re

with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r"console\.log\(Party insert payload for :, payload\);"
replacement = "console.log(`Party insert payload for ${collectionName}:`, payload);"

if re.search(pattern, content):
    content = re.sub(pattern, replacement, content)
    with open('src/VoiceExpenseTrackerPreview.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed syntax error.")
else:
    print("Syntax error not found.")

# Also fix the other one
pattern2 = r"console\.error\(Party Supabase error \[:\], cloudErr\);"
replacement2 = "console.error(`Party Supabase error [${collectionName}]:`, cloudErr);"
if re.search(pattern2, content):
    content = re.sub(pattern2, replacement2, content)
    with open('src/VoiceExpenseTrackerPreview.jsx', 'w', encoding='utf-8') as f:
        f.write(content)

pattern3 = r"setStatus\(Failed to add : \);"
replacement3 = "setStatus(`Failed to add ${newPartyType}: ${cloudErr.message || 'Unknown error'}`);"
if re.search(pattern3, content):
    content = re.sub(pattern3, replacement3, content)
    with open('src/VoiceExpenseTrackerPreview.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
        
pattern4 = r"setStatus\(Failed to add \$\{newPartyType\}: \$\{cloudErr\.message \|\| 'Unknown error'\}\);"
# wait, maybe it was not fully parsed.
