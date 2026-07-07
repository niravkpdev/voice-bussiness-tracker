import re

filepath = "src/VoiceExpenseTrackerPreview.jsx"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

fixes = [
    ("setActiveTab('app-settings')", "setActiveTab('app-settings'); window.location.hash = 'app-settings';"),
    ("setActiveTab('billing')", "setActiveTab('billing'); window.location.hash = 'billing';"),
    ("setActiveTab('analytics')", "setActiveTab('analytics'); window.location.hash = 'analytics';"),
    ("onClick={() => setActiveTab('company-setup')}>", "onClick={() => { setActiveTab('company-setup'); window.location.hash = 'company-setup'; }}>"),
    ("setActiveTab('invoices'); }>", "setActiveTab('invoices'); window.location.hash = 'invoices'; }>")
]

for old, new_ in fixes:
    content = content.replace(old, new_)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("Applied remaining hash route fixes.")
