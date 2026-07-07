import os
import re

file_path = 'src/Phase2ERP.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern for onCloudRecord
# e.g.:
# const saved = await onCloudRecord?.('inventory', product.id, { ...product, itemId: product.id });
# if (!saved) {
#   throw new Error('Inventory save failed');
# }

# We will use regex to find:
# const (saved|deleted) = await (onCloudRecord|onCloudDelete)\?\.\((.*?)\);
#       if \(!\1\) \{
#         throw new Error\('.*?'\);
#       \}

pattern = re.compile(r"const (saved|deleted) = await (onCloudRecord|onCloudDelete)\?\.\(([\s\S]*?)\);\s+if \(!\1\) \{\s+throw new Error\('.*?'\);\s+\}")

def replacer(match):
    var_name = match.group(1)
    func_name = match.group(2)
    args = match.group(3)
    
    return f"if ({func_name}) {{\n        await {func_name}({args}).catch(console.error);\n      }}"

new_content = pattern.sub(replacer, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Patched Phase2ERP.jsx successfully!")
