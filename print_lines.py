with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for i in range(3450, 3500):
        if i < len(lines):
            print(f"{i+1}: {lines[i].strip()}")
