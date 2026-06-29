import re

with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern1 = r'\{partySummary\.length === 0 \? \('
replacement1 = '{(() => { const crmParties = [...(cloudCustomers || []), ...(cloudSuppliers || [])]; return crmParties.length === 0 ? ('

pattern2 = r'\) : \(\s*partySummary\.map\(\(party, i\) => \{'
replacement2 = ') : (\n                            crmParties.map((party, i) => {'

if re.search(pattern1, content) and re.search(pattern2, content):
    content = re.sub(pattern1, replacement1, content)
    content = re.sub(pattern2, replacement2, content)
    
    # Also replace party.outstandingAmount with (party.balance || 0)
    content = content.replace('const balance = party.outstandingAmount;', 'const balance = party.balance || party.outstandingAmount || 0;')
    
    with open('src/VoiceExpenseTrackerPreview.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched CRM table successfully.")
else:
    print("Could not find CRM table target block.")
