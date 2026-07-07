import sys

filepath = "src/styles.css"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

empty_state_css = """
/* Empty State & Loading State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  background: var(--bg-primary);
  border: 1px dashed var(--border-subtle);
  border-radius: var(--radius-lg);
  margin: 16px 0;
}
.empty-state-icon {
  font-size: 32px;
  margin-bottom: 12px;
  opacity: 0.5;
}
.empty-state h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-primary);
}
.empty-state p {
  font-size: 13px;
  color: var(--text-secondary);
  max-width: 300px;
}
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: var(--text-secondary);
  font-size: 14px;
}
"""

if "empty-state" not in content:
    content += "\n" + empty_state_css
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print("Added empty state CSS.")
else:
    print("Empty state CSS already exists.")
