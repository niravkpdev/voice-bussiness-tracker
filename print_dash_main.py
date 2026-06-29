with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    start = False
    for i, line in enumerate(lines):
        if 'className="dashboard-main-column"' in line:
            start = True
        if start:
            print(f"{i+1}: {line}", end='')
            if 'className="dashboard-side-column"' in line:
                break
