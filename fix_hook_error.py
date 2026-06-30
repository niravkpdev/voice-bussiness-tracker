import re

with open('src/hooks/useVoiceManager.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Current catch block:
#           } catch (err: any) {
#             console.error('AI Processing Failed:', err);
#             setError(err.message || 'Failed to parse voice command');
#             setState('error');
#           }

new_catch_block = """          } catch (err: any) {
            console.error('AI Processing Failed:', err);
            setError(err.message || 'Failed to parse voice command');
            setState('error');
            setTimeout(() => {
              setState('idle');
              setError(null);
            }, 4000);
          }"""

content = re.sub(
    r"          \} catch \(err: any\) \{\n            console\.error\('AI Processing Failed:', err\);\n            setError\(err\.message \|\| 'Failed to parse voice command'\);\n            setState\('error'\);\n          \}",
    new_catch_block,
    content
)

with open('src/hooks/useVoiceManager.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated hook error state fallback")
