with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    start = False
    for i, line in enumerate(lines):
        if 'const saveVoucherEntry =' in line:
            start = True
        if start:
            print(f"{i+1}: {line.strip()}")
            if 'saveVoucher(voucher);' in line or 'return true;' in line or 'setStatus(\'Saved\'' in line:
                pass
            if '};' in line and i > 3100:
                break
