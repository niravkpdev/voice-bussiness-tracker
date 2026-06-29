import re

with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add safeMoney at the top
safe_money_def = "const safeMoney = (val) => { const n = Number(val); return Number.isFinite(n) ? n : 0; };\n"
if "const safeMoney =" not in content:
    content = content.replace("const safeTrackEvent", safe_money_def + "const safeTrackEvent")

# Fix CRM map loop
pattern = r"const balance = party\.balance \|\| party\.outstandingAmount \|\| 0;"
replacement = '''const balance = safeMoney(party.balance || party.outstandingAmount || party.opening_balance || 0);
                              const ltv = safeMoney(party.lifetimeValue || party.ltv || party.totalSales || 0);'''
content = re.sub(pattern, replacement, content)

# Fix LTV display
pattern2 = r"\{formatCurrency\(party\.totalSales \+ party\.totalPayments\)\}"
replacement2 = "{formatCurrency(ltv)}"
content = re.sub(pattern2, replacement2, content)

# Fix Selected CRM Customer Profile LTV display
pattern3 = r"\{formatCurrency\(selectedCrmCustomer\.totalSales \+ selectedCrmCustomer\.totalPayments\)\}"
replacement3 = "{formatCurrency(safeMoney(selectedCrmCustomer.lifetimeValue || selectedCrmCustomer.ltv || selectedCrmCustomer.totalSales || 0))}"
content = re.sub(pattern3, replacement3, content)

# Add Date/ID to CRM table
# Find: <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>{party.name}</div>
pattern4 = r"<div style=\{\{ fontWeight: '600', color: 'var\(--text-primary\)', marginBottom: '4px' \}\}>\{party\.name\}</div>\s*<div style=\{\{ fontSize: '12px', color: 'var\(--text-secondary\)' \}\}>\{isDebtor \? 'Customer' : 'Supplier'\} • ID: \{party\.id\.slice\(0,6\)\}</div>"
replacement4 = '''<div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                                          {party.name} <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'normal', marginLeft: '4px' }}>#{party.id?.slice(0,4)}</span>
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                          {isDebtor ? 'Customer' : 'Supplier'} • Added: {party.createdAt ? new Date(party.createdAt).toLocaleDateString() : 'N/A'}
                                        </div>'''
content = re.sub(pattern4, replacement4, content)

with open('src/VoiceExpenseTrackerPreview.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched CRM with safeMoney and duplicates.")
