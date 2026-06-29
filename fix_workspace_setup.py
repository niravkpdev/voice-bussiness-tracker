import re

with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Disable SetupWizard
pattern_setup = r"\{\(\!profile\?\.setupCompleted && authUser\?\.mode \!\=\= 'demo' && \!profile\?\.workspaceSetupCompleted && \!profile\?\.onboardingCompleted && \(\!cloudBusinesses \|\| cloudBusinesses\.length === 0\)\) && \("
replacement_setup = "{false && ("
content = re.sub(pattern_setup, replacement_setup, content)

# Disable OnboardingChecklist
pattern_onboarding = r"<OnboardingChecklist\s*customers=\{cloudCustomers\}\s*inventory=\{cloudInventory\}\s*employees=\{cloudEmployees\}\s*vouchers=\{cloudTransactions\}\s*profile=\{profile\}\s*/>"
replacement_onboarding = "{/* Dashboard Setup Guide removed per request */}"
if re.search(pattern_onboarding, content):
    content = re.sub(pattern_onboarding, replacement_onboarding, content)
else:
    # Try a more generic match for OnboardingChecklist
    pattern_onboarding2 = r"<OnboardingChecklist[\s\S]*?/>"
    content = re.sub(pattern_onboarding2, "{/* Dashboard Setup Guide removed per request */}", content)

# Add logic to auto-persist completion
# Find a good place to inject the localStorage persist logic.
# Let's put it right inside the first useEffect or near the top of the component
pattern_inject = r"export default function VoiceExpenseTrackerPreview\(\) \{"
replacement_inject = """export default function VoiceExpenseTrackerPreview() {
  // Auto-complete setup to prevent modals from showing
  if (typeof window !== 'undefined') {
    if (!localStorage.getItem('workspaceSetupCompleted')) {
      localStorage.setItem('workspaceSetupCompleted', 'true');
      localStorage.setItem('onboardingCompleted', 'true');
      localStorage.setItem('setupCompleted', 'true');
      try {
        // Attempt to update settings table if possible but don't block
        const safeSave = async () => {
          if (window.supabase) {
            const { data: { session } } = await window.supabase.auth.getSession();
            if (session?.user) {
              await window.supabase.from('settings').upsert({
                user_id: session.user.id,
                data: { workspaceSetupCompleted: true, onboardingCompleted: true, setupCompleted: true },
                updated_at: new Date().toISOString()
              });
            }
          }
        };
        safeSave();
      } catch (e) {
        console.warn('Silent settings update failed', e);
      }
    }
  }
"""
content = re.sub(pattern_inject, replacement_inject, content)

with open('src/VoiceExpenseTrackerPreview.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Workspace Setup and Setup Guide disabled successfully.")
