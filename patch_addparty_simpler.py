import re

with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r"business_id: 'default'\s*};\s*const collectionName = newPartyType === 'supplier' \? 'suppliers' : 'customers';"
replacement = '''business_id: 'default',
          balance: 0,
          opening_balance: 0
        };
        const collectionName = 'customers'; // Unified party table'''

if re.search(pattern, content):
    content = re.sub(pattern, replacement, content)
    # also update group: ledger.group,
    content = content.replace("group: ledger.group,", "group: newPartyType === 'supplier' ? 'Sundry Creditors' : 'Sundry Debtors',")
    with open('src/VoiceExpenseTrackerPreview.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched addParty successfully.")
else:
    print("addParty block not found.")
