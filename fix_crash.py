import re

with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r"const \[aiQuestion, setAiQuestion\] = useState\(''\);"
replacement = "const [aiQuestion, setAiQuestion] = useState('');\n  const [activeActionMenuId, setActiveActionMenuId] = useState(null);"

if re.search(pattern, content):
    content = re.sub(pattern, replacement, content)
    with open('src/VoiceExpenseTrackerPreview.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Injected state successfully.")
else:
    print("Target not found for state injection.")

