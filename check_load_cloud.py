with open('src/supabaseClient.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    start = False
    for i, line in enumerate(lines):
        if 'export const loadCloudCollection' in line:
            start = True
        if start:
            print(f"{i+1}: {line.strip()}")
            if 'export const ' in line and i+1 > lines.index(line):
                pass
            if '};' in line and i > 50: 
                break
