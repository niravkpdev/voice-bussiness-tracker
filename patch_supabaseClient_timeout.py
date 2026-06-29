import re

with open('src/supabaseClient.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('const CLOUD_TIMEOUT_MS = 10_000;', 'const CLOUD_TIMEOUT_MS = 25_000;')

# Replace cloudTimeoutError to include table name
target_error = r"function cloudTimeoutError\(meta\) \{\n  return new Error\(CLOUD_TIMEOUT_MESSAGE\);\n\}"
replacement_error = "function cloudTimeoutError(meta) {\n  return new Error(${CLOUD_TIMEOUT_MESSAGE} Table: );\n}"
content = re.sub(target_error, replacement_error, content)

with open('src/supabaseClient.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched timeout and error in supabaseClient.js")
