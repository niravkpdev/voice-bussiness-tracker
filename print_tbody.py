with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('crmParties.map')
if idx != -1:
    end_idx = content.find('</tbody>', idx)
    print(content[idx:end_idx+20])
