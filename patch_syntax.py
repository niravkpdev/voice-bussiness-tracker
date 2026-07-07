import re

filepath = "src/VoiceExpenseTrackerPreview.jsx"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

fixes = [
    ("onClick={() => setActiveTab('app-settings'); window.location.hash = 'app-settings';}", "onClick={() => { setActiveTab('app-settings'); window.location.hash = 'app-settings'; }}"),
    ("onClick={() => setActiveTab('billing'); window.location.hash = 'billing';}", "onClick={() => { setActiveTab('billing'); window.location.hash = 'billing'; }}"),
    ("onClick={() => setActiveTab('analytics'); window.location.hash = 'analytics';}", "onClick={() => { setActiveTab('analytics'); window.location.hash = 'analytics'; }}"),
]

for old, new_ in fixes:
    content = content.replace(old, new_)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed JS syntax in VoiceExpenseTrackerPreview")
