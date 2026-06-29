import re

with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. SetupWizard
pattern1 = r'\{\(!profile\?\.setupCompleted && authUser\?\.mode !== \'demo\'\) && \(\s*<SetupWizard\s*profile=\{profile\}\s*onComplete=\{\(didAddDemoData\) => \{\s*setProfile\(\{\.\.\.profile, setupCompleted: true\}\);'
replacement1 = '''{(!profile?.setupCompleted && authUser?.mode !== 'demo' && !profile?.workspaceSetupCompleted && !profile?.onboardingCompleted && (!cloudBusinesses || cloudBusinesses.length === 0)) && (
          <SetupWizard 
            profile={profile}
            onComplete={(didAddDemoData) => {
              const updatedProfile = {...profile, setupCompleted: true, onboardingCompleted: true, workspaceSetupCompleted: true};
              setProfile(updatedProfile);
              if (authUser?.uid) {
                saveAuthenticatedCloudRecord('settings', 'profile', updatedProfile);
                try {
                  localStorage.setItem('TRINETR_PROFILE', JSON.stringify(updatedProfile));
                } catch (e) {}
              }'''
if re.search(pattern1, content):
    content = re.sub(pattern1, replacement1, content)
    print("SetupWizard patched.")
else:
    print("SetupWizard target not found.")

# 2. Cash Dropdown
pattern2 = r'''<select\s+id="voucher-cash"\s+value=\{voucherCashId\}\s+onChange=\{\(event\) => setVoucherCashId\(event\.target\.value\)\}\s*>\s*\{cashLedgers\.map\(\(ledger\) => \(\s*<option key=\{ledger\.id\} value=\{ledger\.id\}>\s*\{ledger\.name\}\s*</option>\s*\)\)\}\s*</select>'''
replacement2 = '''<select
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
if re.search(pattern2, content):
    content = re.sub(pattern2, replacement2, content)
    print("Cash dropdown patched.")
else:
    print("Cash dropdown target not found.")

# 3. CRM Mapping
pattern3a = r'\{partySummary\.length === 0 \? \('
replacement3a = '{([...(cloudCustomers || []), ...(cloudSuppliers || [])]).length === 0 ? ('
pattern3b = r'\) : \(\s*partySummary\.map\(\(party, i\) => \{\s*const isDebtor = party\.group === \'Sundry Debtors\';\s*const balance = party\.outstandingAmount;'
replacement3b = ''') : (
                            ([...(cloudCustomers || []), ...(cloudSuppliers || [])]).map((party, i) => {
                              const isDebtor = party.group === 'Sundry Debtors';
                              const balance = party.balance || party.outstandingAmount || 0;'''
if re.search(pattern3a, content) and re.search(pattern3b, content):
    content = re.sub(pattern3a, replacement3a, content)
    content = re.sub(pattern3b, replacement3b, content)
    print("CRM table patched.")
else:
    print("CRM table target not found.")

with open('src/VoiceExpenseTrackerPreview.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
