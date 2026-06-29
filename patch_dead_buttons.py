import re

with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern1 = r'onClick=\{\(\) => \{\}\}'
replacement1 = "onClick={() => setStatus('Coming soon')}"
content = re.sub(pattern1, replacement1, content)

# Check href="#"
pattern2 = r'href="#"\s+onClick=\{\(e\)\s*=>\s*e\.preventDefault\(\)\}'
replacement2 = "href=\"#\" onClick={(e) => { e.preventDefault(); setStatus('Coming soon'); }}"
content = re.sub(pattern2, replacement2, content)

with open('src/VoiceExpenseTrackerPreview.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

with open('src/Phase2ERP.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

replacement1_p2 = "onClick={() => onStatus('Coming soon')}"
content = re.sub(pattern1, replacement1_p2, content)

replacement2_p2 = "href=\"#\" onClick={(e) => { e.preventDefault(); onStatus('Coming soon'); }}"
content = re.sub(pattern2, replacement2_p2, content)

with open('src/Phase2ERP.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched dead buttons.")
