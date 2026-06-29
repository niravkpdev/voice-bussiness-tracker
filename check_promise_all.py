with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    start = False
    for i, line in enumerate(lines):
        if 'loadModuleCollection(' in line and 'transactions' in line:
            for j in range(i-10, i+25):
                print(f"{j+1}: {lines[j].strip()}")
            break
