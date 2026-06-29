import re

with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''const collectionName = 'customers'; // Unified party table
        
        console.log("Party insert payload:", payload);
        
        let savedToCloud = false;
        try {
          savedToCloud = await saveAuthenticatedCloudRecord(collectionName, ledger.id, payload);
        } catch (cloudErr) {
          console.error("Party Supabase error:", cloudErr);
          setStatus(\Party "\" already exists or could not be saved to cloud.\);
          setSecureError(cloudErr.message || 'Party already exists or cloud error');
          return;
        }'''

replacement = '''const collectionName = newPartyType === 'supplier' ? 'suppliers' : 'customers';
        
        console.log(\Party insert payload for \:\, payload);
        
        let savedToCloud = false;
        try {
          savedToCloud = await saveAuthenticatedCloudRecord(collectionName, ledger.id, payload);
        } catch (cloudErr) {
          console.error(\Party Supabase error [\]:\, cloudErr);
          setStatus(\Failed to add \: \\);
          setSecureError(cloudErr.message || 'Unknown error');
          return;
        }'''

if target in content:
    content = content.replace(target, replacement)
    with open('src/VoiceExpenseTrackerPreview.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched addParty routing logic.")
else:
    print("addParty routing block not found. Checking for exact string mismatch.")
    print(content[content.find("const collectionName = 'customers';"):content.find("const collectionName = 'customers';")+500])
