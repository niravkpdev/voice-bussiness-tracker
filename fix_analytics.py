import re

with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern1 = r"const trackEvent = typeof window !== 'undefined' && window\.trackEvent \? window\.trackEvent : \(\(\) => \{\}\);"
replacement1 = '''const safeTrackEvent = (...args) => {
  try {
    if (typeof window !== 'undefined' && typeof window.trackEvent === 'function') {
      window.trackEvent(...args);
    }
  } catch (e) {
    console.warn("Tracking failed:", e);
  }
};
const trackEvent = safeTrackEvent;'''

if re.search(pattern1, content):
    content = re.sub(pattern1, replacement1, content)
    with open('src/VoiceExpenseTrackerPreview.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched analytics safely.")
else:
    print("Target not found for analytics patch.")
