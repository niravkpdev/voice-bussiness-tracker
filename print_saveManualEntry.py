with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    start = False
    for i, line in enumerate(lines):
        if 'const saveManualEntry' in line:
            start = True
        if start:
            print(line, end='')
            if 'trackEvent(' in line and 'Manual entry saved' in line:
                print(lines[i+1], end='')
                break
