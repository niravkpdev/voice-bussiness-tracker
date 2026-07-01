with open('src/hooks/useVoiceManager.ts', 'r', encoding='utf-8') as f:
    content = f.read()

target = """        if (!cleanTranscript) {
          console.warn("Voice command skipped: empty transcript");
          setError("Please speak or enter a command first.");
          setState('idle');
          return;
        }

        const payload = {
          transcript: cleanTranscript,
          command: cleanTranscript,
          text: cleanTranscript,
          userId: null,
          businessId: props.activeBusinessId || "default",
          source: "voice-manager",
          timestamp: new Date().toISOString()
        };

        console.log("parse-voice-command payload:", payload);

        const supabase = getSupabaseClient();
        const { data, error } = await supabase.functions.invoke("parse-voice-command", {"""

replacement = """        if (!cleanTranscript) {
          console.warn("Voice command skipped: empty transcript");
          setError("Please speak or enter a command first.");
          setState('idle');
          return;
        }

        const supabase = getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        if (!userId) {
          console.warn("Voice command skipped: no logged-in user");
          setError("Please log in again before using AI voice.");
          setState('idle');
          return;
        }

        const payload = {
          transcript: cleanTranscript,
          command: cleanTranscript,
          text: cleanTranscript,
          userId,
          businessId: props.activeBusinessId || "default",
          source: "voice-manager",
          timestamp: new Date().toISOString()
        };

        console.log("parse-voice-command payload:", payload);

        const { data, error } = await supabase.functions.invoke("parse-voice-command", {"""

content = content.replace(target, replacement)

with open('src/hooks/useVoiceManager.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated useVoiceManager.ts with session retrieval")
