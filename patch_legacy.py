import re

def fix_active_business_id():
    filepaths = ["src/VoiceExpenseTrackerPreview.jsx", "src/Phase3Ops.jsx"]
    
    legacy_fallback = """
  const resolveActiveBusinessId = () => {
    return (
      (typeof selectedBusiness !== 'undefined' ? selectedBusiness?.id : null) ||
      (typeof activeBusiness !== 'undefined' ? activeBusiness?.id : null) ||
      (typeof userProfile !== 'undefined' ? userProfile?.active_business_id : null) ||
      (typeof authUser !== 'undefined' ? (authUser?.businessId || authUser?.active_business_id) : null) ||
      (typeof profile !== 'undefined' ? profile?.active_business_id : null) ||
      (typeof cloudBusinesses !== 'undefined' && cloudBusinesses?.length > 0 ? cloudBusinesses[0]?.id : null) ||
      (typeof readScopedString === 'function' ? readScopedString('activeBusinessId') : null) ||
      'default'
    );
  };
  const activeBusinessId = resolveActiveBusinessId();
"""
    
    old_pattern = r"const activeBusinessId =.*?null;"

    for filepath in filepaths:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        # Replace old definition with legacy fallback
        content = re.sub(old_pattern, legacy_fallback.strip(), content, flags=re.DOTALL)
        
        if filepath == "src/VoiceExpenseTrackerPreview.jsx":
            # Fix the empty state condition
            content = content.replace(
                "{!activeBusinessId && !['profile-settings', 'company-setup'].includes(activeTab)",
                "{cloudBusinesses.length === 0 && !['profile-settings', 'company-setup'].includes(activeTab)"
            )
            
            # Fix the Quick Add Buttons
            # New Customer
            content = content.replace(
                "setActiveTab('customers'); trackEvent('Customer added'); setStatus('Add Customer drawer coming soon'); setMobileNavOpen(false);",
                "setActiveTab('crm'); window.location.hash = 'crm'; setMobileNavOpen(false);"
            )
            # New Product
            content = content.replace(
                "setActiveTab('inventory'); trackEvent('Product added'); setStatus('Navigate to Inventory to add Product'); setMobileNavOpen(false);",
                "setActiveTab('inventory'); window.location.hash = 'inventory'; setMobileNavOpen(false);"
            )
            # New Employee
            content = content.replace(
                "setActiveTab('employees'); trackEvent('Employee added'); setStatus('Navigate to Employees to add Employee'); setMobileNavOpen(false);",
                "setActiveTab('employees'); window.location.hash = 'employees'; setMobileNavOpen(false);"
            )
            # Make "Go to Profile Settings" CTA use the hash route as well
            content = content.replace(
                "onClick={() => { window.location.hash = 'profile-settings'; setActiveTab('profile-settings'); }}",
                "onClick={() => { window.location.hash = 'company-setup'; setActiveTab('company-setup'); }}"
            )

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
            print(f"Patched {filepath}")

fix_active_business_id()
