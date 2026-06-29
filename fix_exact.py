with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find("const collectionName = 'customers'; // Unified party table")
if idx != -1:
    end_idx = content.find("return;", idx) + 7
    # get the exact block
    block = content[idx:end_idx+3]
    
    replacement = '''const collectionName = newPartyType === 'supplier' ? 'suppliers' : 'customers';
      
      console.log(Party insert payload for :, payload);
      
      let savedToCloud = false;
      try {
        if (authUser?.uid) {
          savedToCloud = await saveAuthenticatedCloudRecord(collectionName, ledger.id, payload);
        }
      } catch (cloudErr) {
        console.error(Party Supabase error []:, cloudErr);
        setStatus(Failed to add : );
        setSecureError(cloudErr.message || 'Unknown error');
        return;
      }'''
    
    content = content.replace(block, replacement)
    with open('src/VoiceExpenseTrackerPreview.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced exactly.")
else:
    print("Not found.")
