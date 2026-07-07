import re

filepath = "src/VoiceExpenseTrackerPreview.jsx"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Fix path: 'customers' in the quick actions array
content = content.replace(
    "{ label: 'New Customer', desc: 'Add client', icon: Users, path: 'customers'",
    "{ label: 'New Customer', desc: 'Add client', icon: Users, path: 'crm'"
)

# Fix "Create Invoice" button
content = content.replace(
    "setActiveTab('invoices'); }><Plus size={16} /> Create Invoice",
    "setActiveTab('invoices'); window.location.hash = 'invoices'; }><Plus size={16} /> Create Invoice"
)

# Fix missing hash updates in the main dashboard quick action loop
# Since the dashboard quick actions probably loop over the array and do setActiveTab(item.path), I'll try to find where it does that.
# Let's search for "setActiveTab(action.path)" or similar in a bit.

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("Patched routing fixes in VoiceExpenseTrackerPreview")
