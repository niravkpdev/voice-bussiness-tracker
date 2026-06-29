import re

with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

import_statement = "import { useVoiceManager } from './hooks/useVoiceManager';\n"
if 'useVoiceManager' not in content[:1000]:  # Ensure it's not already near the top
    content = import_statement + content
    
    with open('src/VoiceExpenseTrackerPreview.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Import injected.")
else:
    print("Import seems to already exist.")
