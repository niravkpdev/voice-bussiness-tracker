import re

with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r"const collectionName = 'customers'; // Unified party table\s*console\.log\(\"Party insert payload:\", payload\);\s*let savedToCloud = false;\s*try \{\s*savedToCloud = await saveAuthenticatedCloudRecord\(collectionName, ledger\.id, payload\);\s*\} catch \(cloudErr\) \{\s*console\.error\(\"Party Supabase error:\", cloudErr\);\s*setStatus\(Party \"\$\{ledger\.name\}\" already exists or could not be saved to cloud\.\);\s*setSecureError\(cloudErr\.message \|\| 'Party already exists or cloud error'\);\s*return;\s*\}"

replacement = '''const collectionName = newPartyType === 'supplier' ? 'suppliers' : 'customers';
        
        console.log(Party insert payload for :, payload);
        
        let savedToCloud = false;
        try {
          savedToCloud = await saveAuthenticatedCloudRecord(collectionName, ledger.id, payload);
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
