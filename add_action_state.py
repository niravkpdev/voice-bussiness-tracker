import re

with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r"const \[activeTab, setActiveTab\] = useState\('dashboard'\);"
replacement = "const [activeTab, setActiveTab] = useState('dashboard');\n  const [activeActionMenuId, setActiveActionMenuId] = useState(null);"

if "activeActionMenuId" not in content:
    content = re.sub(pattern, replacement, content)
    with open('src/VoiceExpenseTrackerPreview.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added activeActionMenuId state.")
else:
    print("State already exists.")
