with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''        } catch (cloudErr) {
          console.error(`Party Supabase error [${collectionName}]:`, cloudErr);
          setStatus(`Failed to add ${newPartyType}: ${cloudErr.message || 'Unknown error'}`);
          setSecureError(cloudErr.message || 'Unknown error');
          return;
        }    }'''

replacement = '''        } catch (cloudErr) {
          console.error(`Party Supabase error [${collectionName}]:`, cloudErr);
          setStatus(`Failed to add ${newPartyType}: ${cloudErr.message || 'Unknown error'}`);
          setSecureError(cloudErr.message || 'Unknown error');
          return;
        }'''

if target in content:
    content = content.replace(target, replacement)
    with open('src/VoiceExpenseTrackerPreview.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed curly brace.")
else:
    print("Not found.")
