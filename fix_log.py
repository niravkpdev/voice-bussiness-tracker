import re

with open('src/Phase2ERP.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'console\.log\(\\\[CRM Filter\] customer \\ - company_id:\\, c\.company_id'
replacement = "console.log('[CRM Filter] customer ' + c.name + ' - company_id:', c.company_id"

if re.search(pattern, content):
    content = re.sub(pattern, replacement, content)
    with open('src/Phase2ERP.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed syntax error.")
else:
    print("Syntax error not found.")
