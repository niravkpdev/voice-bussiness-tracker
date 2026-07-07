import re

filepath = "src/VoiceExpenseTrackerPreview.jsx"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Remove the leftover </>\n          )} that causes the syntax error
bad_syntax = """          )}
                </>
          )}
        </main>"""

good_syntax = """          )}
        </main>"""

content = content.replace(bad_syntax, good_syntax)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed syntax error")
