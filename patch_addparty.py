import re

with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r"const payload = \{\s*id: ledger\.id,\s*name: ledger\.name,\s*group: ledger\.group,\s*type: newPartyType,\s*createdAt: new Date\(\)\.toISOString\(\),\s*business_id: 'default'\s*\};\s*const collectionName = newPartyType === 'supplier' \? 'suppliers' : 'customers';\s*console\.log\(\"Party insert payload:\", payload\);\s*let savedToCloud = false;\s*try \{\s*if \(authUser\?\.uid\) \{\s*await saveAuthenticatedCloudRecord\(collectionName, ledger\.id, payload\);"

replacement = '''const payload = {
          id: ledger.id,
          name: ledger.name,
          group: newPartyType === 'supplier' ? 'Sundry Creditors' : 'Sundry Debtors',
          type: newPartyType,
          createdAt: new Date().toISOString(),
          business_id: 'default',
          balance: 0,
          opening_balance: 0
        };
        const collectionName = 'customers'; // Unified table for CRM parties
        
        console.log("Party insert payload:", payload);
        
        let savedToCloud = false;
        try {
          if (authUser?.uid) {
            await saveAuthenticatedCloudRecord(collectionName, ledger.id, payload);'''

if re.search(pattern, content):
    content = re.sub(pattern, replacement, content)
    with open('src/VoiceExpenseTrackerPreview.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched addParty successfully.")
else:
    print("addParty block not found.")
