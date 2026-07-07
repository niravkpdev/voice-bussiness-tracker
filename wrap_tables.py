import re
import os

filepaths = ["src/Phase2ERP.jsx", "src/Phase3Ops.jsx", "src/VoiceExpenseTrackerPreview.jsx"]

for filepath in filepaths:
    if not os.path.exists(filepath):
        continue
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Replace <table with <div className="table-responsive"><table
    # and </table> with </table></div>
    # But we need to make sure we don't double wrap.
    if 'className="table-responsive"' not in content:
        content = re.sub(r'(<table[^>]*>)', r'<div className="table-responsive">\n\1', content)
        content = re.sub(r'(</table>)', r'\1\n</div>', content)

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
        
print("Tables wrapped in table-responsive.")
