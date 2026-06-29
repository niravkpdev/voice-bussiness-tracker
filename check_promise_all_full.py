with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for j in range(1350, 1450):
        if j < len(lines):
            print(f"{j+1}: {lines[j].strip()}")
