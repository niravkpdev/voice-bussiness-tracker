import re

filepath = "src/VoiceExpenseTrackerPreview.jsx"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Rename resolveActiveBusinessId to getActiveBusinessId and ensure it has all fallbacks
old_func = """  const resolveActiveBusinessId = () => {
    return (
      selectedBusiness?.id ||
      activeBusiness?.id ||
      userProfile?.active_business_id ||
      authUser?.active_business_id ||
      profile?.active_business_id ||
      cloudBusinesses?.[0]?.id ||
      localStorage.getItem('trinetr_active_business_id') ||
      'default'
    );
  };
  const activeBusinessId = resolveActiveBusinessId();"""

new_func = """  const getActiveBusinessId = () => {
    return (
      selectedBusiness?.id ||
      activeBusiness?.id ||
      userProfile?.active_business_id ||
      authUser?.active_business_id ||
      profile?.active_business_id ||
      cloudBusinesses?.[0]?.id ||
      localStorage.getItem('trinetr_active_business_id') ||
      'default'
    );
  };
  const activeBusinessId = getActiveBusinessId();"""

content = content.replace(old_func, new_func)
content = content.replace("resolveActiveBusinessId", "getActiveBusinessId")

# 2. Fix the Lock Screen in page-shell
lock_screen_pattern = r"\{cloudBusinesses\.length === 0 && \!\['profile-settings', 'company-setup'\]\.includes\(activeTab\) \? \([\s\S]*?\) : \(\s*<>"
replacement = """{cloudBusinesses.length === 0 && !['profile-settings', 'company-setup'].includes(activeTab) && (
              <section className="panel fade-in" style={{ textAlign: 'center', padding: '32px 24px', gridColumn: '1 / -1', marginBottom: '24px', border: '2px dashed var(--border-subtle)' }}>
                <h2 style={{ marginBottom: '8px' }}>Welcome to Trinetr Business Suite</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Please set up or select a business profile to unlock all features.</p>
                <button 
                  type="button" 
                  className="primary-btn" 
                  onClick={() => { window.location.hash = 'company-setup'; setActiveTab('company-setup'); }}
                >
                  Go to Profile Settings
                </button>
              </section>
            )}"""

content = re.sub(lock_screen_pattern, replacement, content)

# 3. Remove the trailing `</>` and `)}` that closed the ternary
end_pattern = r"<\/section>\s*<\/>\s*\)\}\s*<\/main>"
replacement_end = """</section>
          </main>"""
content = re.sub(end_pattern, replacement_end, content)

# 4. Fix Quick Actions hash mapping
quick_actions_old = """setActiveTab(action.path);
                              if (action.path === 'customers') setStatus('Add Customer drawer coming soon');"""
quick_actions_new = """setActiveTab(action.path);
                              window.location.hash = action.path;
                              if (action.path === 'customers') setStatus('Add Customer drawer coming soon');"""
content = content.replace(quick_actions_old, quick_actions_new)

# Also fix the dropdown quick actions missing window.location.hash
# I did a few before, but let's ensure all are covered.
content = re.sub(
    r"onClick=\{\(\) => \{ setActiveTab\('([a-z-]+)'\); setMobileNavOpen\(false\); \}\}",
    r"onClick={() => { setActiveTab('\1'); window.location.hash = '\1'; setMobileNavOpen(false); }}",
    content
)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("Patched VoiceExpenseTrackerPreview.jsx")
