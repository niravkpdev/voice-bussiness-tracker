with open('src/supabaseClient.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    start = False
    for i, line in enumerate(lines):
        if 'export async function loadCloudCollection' in line:
            start = True
        if start:
            print(f"{i+1}: {line.strip()}")
            if 'return' in line and 'map(' in line:
                print(f"{i+2}: {lines[i+1].strip()}")
                break
