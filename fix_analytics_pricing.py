import re

with open('src/PricingPage.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r"trackEvent\('Upgrade clicked', \{ plan, billingCycle \}\);"
replacement = "if (typeof window !== 'undefined' && window.trackEvent) window.trackEvent('Upgrade clicked', { plan, billingCycle });"

if re.search(pattern, content):
    content = re.sub(pattern, replacement, content)
    with open('src/PricingPage.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched PricingPage analytics safely.")
else:
    print("Target not found for PricingPage analytics patch.")
