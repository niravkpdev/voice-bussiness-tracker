import re

with open('src/supabaseClient.js', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r"\} else if \(tableName === 'customers'\) \{"
replacement = "} else if (tableName === 'customers' || tableName === 'suppliers') {"

if re.search(pattern, content):
    content = re.sub(pattern, replacement, content)
    with open('src/supabaseClient.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched supplier mapping in supabaseClient.")
else:
    print("Supplier mapping target not found.")
