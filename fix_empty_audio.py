import re

with open('src/hooks/useVoiceManager.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace AUDIO_DATA handling
target = """        if (event.data.type === 'AUDIO_DATA') {
          try {
            const chunks = event.data.data;
            const sampleRate = audioCtxRef.current?.sampleRate || 44100;"""

replacement = """        if (event.data.type === 'AUDIO_DATA') {
          try {
            const chunks = event.data.data;
            if (!chunks || chunks.length === 0) {
              setState('idle');
              setError('Please enter a command first.');
              cleanupAudioGraph();
              return;
            }
            const sampleRate = audioCtxRef.current?.sampleRate || 44100;"""

content = content.replace(target, replacement)

target2 = """          } catch (err: any) {
            console.error('AI Processing Failed:', err);
            setError(err.message || 'Failed to parse voice command');"""

replacement2 = """          } catch (err: any) {
            console.error('AI Processing Failed', err);
            setError('AI service is currently unavailable.');"""

content = content.replace(target2, replacement2)

with open('src/hooks/useVoiceManager.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed useVoiceManager empty chunks and error logging")
