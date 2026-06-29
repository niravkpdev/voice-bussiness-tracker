import re

with open('src/supabaseClient.js', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'''\s*\} else if \(tableName === 'customers'\) \{\s*normalized = \{\s*\.\.\.normalized,\s*name: normalized\.name,\s*type: normalized\.type,\s*group: normalized\.group,\s*phone: normalized\.phone \|\| normalized\.mobile \|\| '',\s*balance: normalized\.balance \|\| normalized\.opening_balance \|\| 0,\s*\};\s*\} else if \(tableName === 'invoices'\) \{'''

replacement = '''    } else if (tableName === 'customers') {
      normalized = {
        ...normalized,
        name: data.name || data.customerName || data.partyName || "Unnamed",
        type: data.type || "customer",
        group: data.group || "Sundry Debtors",
        phone: data.phone || data.mobile || "",
        balance: Number(data.balance || data.opening_balance || 0),
        company_id: data.company_id || null,
        business_id: data.business_id || "default",
        ownerUid: data.ownerUid || row.user_id,
        createdAt: row.created_at,
        raw: data
      };
    } else if (tableName === 'invoices') {'''

if re.search(pattern, content):
    content = re.sub(pattern, replacement, content)
    with open('src/supabaseClient.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched customers mapping successfully.")
else:
    print("Could not find customers mapping block.")
