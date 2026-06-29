import re

with open('src/Phase2ERP.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

safe_money_def = "const safeMoney = (val) => { const n = Number(val); return Number.isFinite(n) ? n : 0; };\n"
if "const safeMoney =" not in content:
    # Inject near the top inside Phase2ERP component or top of file
    content = content.replace("export default function Phase2ERP", safe_money_def + "export default function Phase2ERP")

pattern = r"const balance = isCustomer \? item\.outstandingAmount \?\? item\.outstanding \?\? 0 : item\.payableAmount \|\| 0;"
replacement = "const balance = isCustomer ? safeMoney(item.outstandingAmount ?? item.outstanding ?? item.balance ?? 0) : safeMoney(item.payableAmount || item.balance || 0);"
content = re.sub(pattern, replacement, content)

with open('src/Phase2ERP.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched Phase2ERP with safeMoney.")
