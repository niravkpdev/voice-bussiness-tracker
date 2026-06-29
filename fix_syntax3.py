import re

with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern2 = r"console\.error\(Party Supabase error \[\]:, cloudErr\);"
replacement2 = "console.error(`Party Supabase error [${collectionName}]:`, cloudErr);"
if re.search(pattern2, content):
    content = re.sub(pattern2, replacement2, content)

pattern3 = r"setStatus\(Failed to add : \);"
replacement3 = "setStatus(`Failed to add ${newPartyType}: ${cloudErr.message || 'Unknown error'}`);"
if re.search(pattern3, content):
    content = re.sub(pattern3, replacement3, content)

with open('src/VoiceExpenseTrackerPreview.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed more syntax errors.")
