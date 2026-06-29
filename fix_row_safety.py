import re

with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern1 = r"<tr key=\{party\.id\} onClick=\{\(\) => setSelectedCrmCustomer\(party\)\} style=\{\{cursor: 'pointer'\}\}>"
replacement1 = "<tr key={party?.id || Math.random()} onClick={() => setSelectedCrmCustomer(party)} style={{cursor: 'pointer'}}>"
content = re.sub(pattern1, replacement1, content)

pattern2 = r"\{party\.name\.charAt\(0\)\.toUpperCase\(\)\}"
replacement2 = "{(party?.name || 'Unnamed').charAt(0).toUpperCase()}"
content = re.sub(pattern2, replacement2, content)

pattern3 = r"\{party\.name\} <span style"
replacement3 = "{party?.name || 'Unnamed'} <span style"
content = re.sub(pattern3, replacement3, content)

with open('src/VoiceExpenseTrackerPreview.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Safe row rendering applied.")
