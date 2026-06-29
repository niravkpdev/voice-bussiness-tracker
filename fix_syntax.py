import re

with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the syntax error
content = content.replace(')})()}</tbody>', '})()()}</tbody>')
# wait, what exactly is the correct syntax?
