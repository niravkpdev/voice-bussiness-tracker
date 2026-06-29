import re

with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'\{\(!profile\?\.setupCompleted && authUser\?\.mode !== \'demo\'\) && \(\s*<SetupWizard\s*profile=\{profile\}\s*onComplete=\{\(didAddDemoData\) => \{\s*setProfile\(\{\.\.\.profile, setupCompleted: true\}\);'

replacement = '''{(!profile?.setupCompleted && authUser?.mode !== 'demo' && !profile?.workspaceSetupCompleted && !profile?.onboardingCompleted && (!cloudBusinesses || cloudBusinesses.length === 0)) && (
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

if re.search(pattern, content):
    content = re.sub(pattern, replacement, content)
    with open('src/VoiceExpenseTrackerPreview.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched SetupWizard successfully.")
else:
    print("Could not find target block.")
