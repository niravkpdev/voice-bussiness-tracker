import re

with open('src/Phase2ERP.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r"console\.log\('\[CRM Filter\] Customers before:', customers\.length, 'After:', filtered\.length, 'ActiveScope:', activeScope\);"

replacement = '''console.log('[CRM Filter] activeBusinessId:', activeBusinessId, 'cloudUserId:', cloudUserId);
    console.log('[CRM Filter] fetched customer count:', customers.length);
    customers.forEach(c => {
      console.log(\[CRM Filter] customer \ - company_id:\, c.company_id, 'business_id:', c.businessId || c.business_id, 'ownerUid:', c.ownerUid);
    });
    console.log('[CRM Filter] mapped customer count / final displayed:', filtered.length);'''

if re.search(pattern, content):
    content = re.sub(pattern, replacement, content)
    with open('src/Phase2ERP.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched CRM logs successfully.")
else:
    print("Could not find CRM logs target block.")
