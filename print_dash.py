with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    start = False
    for i, line in enumerate(lines):
        if 'id="dashboard"' in line or "id='dashboard'" in line:
            start = True
        if start:
            print(f"{i+1}: {line}", end='')
            if "</section>" in line:
                break
