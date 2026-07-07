import os
import re

files_to_process = [
    "src/supabaseClient.js",
    "src/Phase2ERP.jsx",
    "src/Phase3Ops.jsx",
    "src/VoiceExpenseTrackerPreview.jsx",
    "src/hooks/useVoiceManager.ts",
    "src/__tests__/cloudPersistence.test.js"
]

for filepath in files_to_process:
    if not os.path.exists(filepath):
        continue
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace variants like: || 'default' or || "default"
    content = re.sub(r"\s*\|\|\s*['\"]default['\"]", "", content)
    
    # Replace businessId: 'default' with businessId: null
    content = re.sub(r"businessId:\s*['\"]default['\"]", "businessId: null", content)
    content = re.sub(r"business_id:\s*['\"]default['\"]", "business_id: null", content)
    content = re.sub(r"company_id:\s*['\"]default['\"]", "company_id: null", content)
    
    # Also default default assignments like (businessId = 'default')
    content = re.sub(r"businessId\s*=\s*['\"]default['\"]", "businessId", content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Processed {filepath}")
