with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for i in range(3500, 3550):
        if i < len(lines):
            print(f"{i+1}: {lines[i].strip()}")
