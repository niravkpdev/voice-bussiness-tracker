import re

files = ["src/Phase3Ops.jsx", "src/Phase2ERP.jsx"]

for filepath in files:
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    content = content.replace("resolveActiveBusinessId", "getActiveBusinessId")
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

print("Renamed resolveActiveBusinessId to getActiveBusinessId in Phase2 and Phase3")
