with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    start = False
    for i, line in enumerate(lines):
        if 'const saveManualEntry' in line:
            start = True
        if start:
            print(f"{i+1}: {line.strip()}")
            if 'const fillManualTemplate' in line:
                break
