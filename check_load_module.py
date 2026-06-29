with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for i in range(1320, 1340):
        print(f"{i+1}: {lines[i].strip()}")
