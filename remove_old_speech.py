import re

with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r"\s*startVoiceRecognition\(\);", "", content)

with open('src/VoiceExpenseTrackerPreview.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Removed startVoiceRecognition from UI block")
