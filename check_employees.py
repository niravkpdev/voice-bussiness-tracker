with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for i, line in enumerate(lines):
        if 'loadEmployeeCollection(' in line and 'employees' in line:
            for j in range(i-10, i+15):
                print(f"{j+1}: {lines[j].strip()}")
            break
