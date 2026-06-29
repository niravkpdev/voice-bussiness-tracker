import re

with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'\{activeActionMenuId === party\.id && \(\s*<div className="dropdown-menu'
replacement = '''{activeActionMenuId === party.id && <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99}} onClick={(e) => { e.stopPropagation(); setActiveActionMenuId(null); }} />}
                                    {activeActionMenuId === party.id && (
                                      <div className="dropdown-menu'''

if re.search(pattern, content):
    content = re.sub(pattern, replacement, content)
    with open('src/VoiceExpenseTrackerPreview.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Overlay added successfully.")
else:
    print("Overlay target not found.")
