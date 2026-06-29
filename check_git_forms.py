import subprocess

out = subprocess.check_output(['git', 'log', '-p', '-20', 'src/VoiceExpenseTrackerPreview.jsx']).decode('utf-8')
for line in out.split('\n'):
    if line.startswith('-') and '<form' in line:
        print(line)
