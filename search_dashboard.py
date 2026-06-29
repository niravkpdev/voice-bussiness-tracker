import os
import re

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.jsx') or file.endswith('.js'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Search for anything related to Dashboard Entry
            matches = re.finditer(r'Dashboard.*Entry|Entry.*Dashboard|Quick.*Entry|manual.*entry', content, re.IGNORECASE)
            for m in matches:
                start = max(0, m.start() - 50)
                end = min(len(content), m.end() + 50)
                print(f"[{file}] {content[start:end]}")
