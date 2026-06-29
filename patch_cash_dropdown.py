import re

with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'''<select\s+id="voucher-cash"\s+value=\{voucherCashId\}\s+onChange=\{\(event\) => setVoucherCashId\(event\.target\.value\)\}\s*>\s*\{cashLedgers\.map\(\(ledger\) => \(\s*<option key=\{ledger\.id\} value=\{ledger\.id\}>\s*\{ledger\.name\}\s*</option>\s*\)\)\}\s*</select>'''

replacement = '''<select
                            id="voucher-cash"
                            className="saas-input"
                            style={{ backgroundColor: '#fff', color: '#111827', zIndex: 10, minHeight: '44px', width: '100%', appearance: 'auto' }}
                            value={voucherCashId || 'ledger-cash'}
                            onChange={(event) => setVoucherCashId(event.target.value)}
                          >
                            {cashLedgers.length > 0 ? cashLedgers.map((ledger) => (
                              <option key={ledger.id} value={ledger.id}>
                                {ledger.name}
                              </option>
                            )) : (
                              <>
                                <option value="ledger-cash">Cash</option>
                                <option value="ledger-bank">Bank</option>
                              </>
                            )}
                          </select>'''

if re.search(pattern, content):
    content = re.sub(pattern, replacement, content)
    with open('src/VoiceExpenseTrackerPreview.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched Cash dropdown successfully.")
else:
    print("Could not find Cash dropdown target block.")
