import re

with open('src/supabaseClient.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = r"function pathFor\(uid, tableName, id = ''\) \{\s*if \(tableName === 'settings'\) \{\s*return `users/\$\{uid\}/settings/\$\{id \|\| 'profile'\}`;\s*\}\s*if \(tableName === 'debug_tests'\) \{\s*return `users/\$\{uid\}/debug/\$\{id \|\| 'test'\}`;\s*\}\s*return `users/\$\{uid\}/\$\{tableName\}\$\{id \? `/\$\{id\}` : ''\}`;\s*\}"

replacement = """function pathFor(uid, tableName, id = '') {
    if (tableName === 'settings') {
      return `settings/${uid}/${id || 'profile'}`;
    }
    if (tableName === 'debug_tests') {
      return `debug_tests/${uid}/${id || 'test'}`;
    }
    return `${tableName}/${uid}${id ? `/${id}` : ''}`;
  }"""

content = re.sub(target, replacement, content)

with open('src/supabaseClient.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched pathFor in supabaseClient.js")
