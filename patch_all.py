import re

with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. SetupWizard
setup_target = '''        <div className="workspace">
          {(!profile?.setupCompleted && authUser?.mode !== 'demo') && (
            <SetupWizard 
              profile={profile}
              onComplete={(didAddDemoData) => {
                setProfile({...profile, setupCompleted: true});
                if (didAddDemoData) {'''

setup_replacement = '''        <div className="workspace">
          {(!profile?.setupCompleted && authUser?.mode !== 'demo' && !profile?.workspaceSetupCompleted && !profile?.onboardingCompleted && (!cloudBusinesses || cloudBusinesses.length === 0)) && (
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
                }
                if (didAddDemoData) {'''

if setup_target in content:
    content = content.replace(setup_target, setup_replacement)
    print("SetupWizard patched.")
else:
    print("SetupWizard target not found.")

# 2. Cash Dropdown
cash_target = '''                          <select
                            id="voucher-cash"
                            value={voucherCashId}
                            onChange={(event) => setVoucherCashId(event.target.value)}
                          >
                            {cashLedgers.map((ledger) => (
                              <option key={ledger.id} value={ledger.id}>
                                {ledger.name}
                              </option>
                            ))}
                          </select>'''

cash_replacement = '''                          <select
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

if cash_target in content:
    content = content.replace(cash_target, cash_replacement)
    print("Cash dropdown patched.")
else:
    print("Cash dropdown target not found.")

# 3. CRM Mapping
# Instead of inline IIFE, let's just replace partySummary with ([...(cloudCustomers || []), ...(cloudSuppliers || [])])
crm_target1 = '''{partySummary.length === 0 ? ('''
crm_replacement1 = '''{([...(cloudCustomers || []), ...(cloudSuppliers || [])]).length === 0 ? ('''

crm_target2 = ''') : (
                            partySummary.map((party, i) => {
                              const isDebtor = party.group === 'Sundry Debtors';
                              const balance = party.outstandingAmount;'''
crm_replacement2 = ''') : (
                            ([...(cloudCustomers || []), ...(cloudSuppliers || [])]).map((party, i) => {
                              const isDebtor = party.group === 'Sundry Debtors';
                              const balance = party.balance || party.outstandingAmount || 0;'''

if crm_target1 in content and crm_target2 in content:
    content = content.replace(crm_target1, crm_replacement1)
    content = content.replace(crm_target2, crm_replacement2)
    print("CRM table patched.")
else:
    print("CRM table target not found.")

with open('src/VoiceExpenseTrackerPreview.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
