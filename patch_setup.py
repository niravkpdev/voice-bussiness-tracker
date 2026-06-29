import sys

with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''        <div className="workspace">
          {(!profile?.setupCompleted && authUser?.mode !== 'demo') && (
            <SetupWizard 
              profile={profile}
              onComplete={(didAddDemoData) => {
                setProfile({...profile, setupCompleted: true});
                if (didAddDemoData) {'''

replacement = '''        <div className="workspace">
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

if target in content:
    content = content.replace(target, replacement)
    with open('src/VoiceExpenseTrackerPreview.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched SetupWizard successfully.")
else:
    print("Could not find target block.")
