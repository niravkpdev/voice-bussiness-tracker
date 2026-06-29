import re

with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r"business_id: 'default',\s*balance: 0,\s*opening_balance: 0\s*\};\s*const collectionName = 'customers'; // Unified party table\s*console\.log\(\"Party insert payload:\", payload\);\s*let savedToCloud = false;\s*try \{\s*if \(authUser\?\.uid\) \{\s*await saveAuthenticatedCloudRecord\(collectionName, ledger\.id, payload\);\s*\}"
replacement = '''business_id: 'default',
          balance: 0,
          opening_balance: 0
        };
        const collectionName = newPartyType === 'supplier' ? 'suppliers' : 'customers';
        
        console.log(Party insert payload for :, payload);
        
        let savedToCloud = false;
        try {
          if (authUser?.uid) {
            await saveAuthenticatedCloudRecord(collectionName, ledger.id, payload);
          }
        } catch (cloudErr) {
          console.error(Party Supabase error []:, cloudErr);
          setStatus(Failed to add : );
          setSecureError(cloudErr.message || 'Unknown error');
          return;
        }'''

if re.search(pattern, content):
    content = re.sub(pattern, replacement, content)
    with open('src/VoiceExpenseTrackerPreview.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched addParty routing logic.")
else:
    print("addParty routing block not found.")
