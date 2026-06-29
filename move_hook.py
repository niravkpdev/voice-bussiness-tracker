import re

with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove the old hook call
old_hook_call = r"(\s*const \{ state, waveRef, startListening, stopListening, error \} = useVoiceManager\(\);\n)"
content = re.sub(old_hook_call, "\n", content)

# 2. Insert the new hook call right after voiceConfirmation
new_hook_call = """
  const { state, waveRef, startListening, stopListening, error } = useVoiceManager({
    activeBusinessId: authUser?.businessId || 'default',
    onCommandParsed: (parsed) => setVoiceConfirmation(parsed)
  });
"""

insert_after = r"(const \[voiceConfirmation, setVoiceConfirmation\] = useState\(null\);)"
if 'activeBusinessId: authUser?.businessId' not in content:
    content = re.sub(insert_after, r"\1\n" + new_hook_call, content)

with open('src/VoiceExpenseTrackerPreview.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Moved useVoiceManager and added props")
