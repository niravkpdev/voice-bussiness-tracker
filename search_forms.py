import os
import re

with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Search for any form tag
forms = re.finditer(r'<form\b[^>]*>', content)
for m in forms:
    print(m.group(0))
