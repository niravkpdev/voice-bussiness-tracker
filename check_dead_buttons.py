import os
import re

def check_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    dead_patterns = [
        r'onClick=\{\(\)\s*=>\s*\{\}\}',
        r'onClick=\{\(e\)\s*=>\s*e\.preventDefault\(\)\}',
        r'onClick=\{\(\)\s*=>\s*console\.log\([^)]*\)\}'
    ]
    
    found = False
    for i, pattern in enumerate(dead_patterns):
        matches = re.finditer(pattern, content)
        for match in matches:
            if not found:
                print(f'\n--- {filepath} ---')
                found = True
            
            line_no = content[:match.start()].count('\n') + 1
            print(f'Line {line_no}: Match {i+1} -> {match.group(0)}')
            
    buttons = re.finditer(r'<button([^>]*)>', content)
    for match in buttons:
        attrs = match.group(1)
        if 'onClick' not in attrs and 'type="submit"' not in attrs:
            if not found:
                print(f'\n--- {filepath} ---')
                found = True
            line_no = content[:match.start()].count('\n') + 1
            print(f'Line {line_no}: <button> w/o onClick -> {match.group(0).strip()}')

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith(('.jsx', '.tsx', '.js', '.ts')):
            try:
                check_file(os.path.join(root, file))
            except Exception as e:
                pass
