import re
import os

filepaths = ["src/Phase2ERP.jsx", "src/Phase3Ops.jsx", "src/VoiceExpenseTrackerPreview.jsx"]

for filepath in filepaths:
    if not os.path.exists(filepath):
        continue
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # We are looking for things like: <td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>No inventory items found. Add one above.</td>
    # or <p className="panel-hint">No vouchers found...</p>
    
    # We will replace them generally. 
    # Let's just fix the CSS for the tables so they are responsive.
    # The prompt also asks to "Improve mobile responsive layout for 360px, 390px, 414px, and tablet."
    
    # Let's add a wrapper `<div style={{ overflowX: 'auto' }}>` around `<table>` tags if it's not already there.
    # Actually, the tables might already have a wrapper. We can check this.
    pass

# We'll just append responsive table CSS to styles.css
css_append = """
/* Responsive Tables for Mobile */
.table-responsive, .table-container, [style*="overflow-x: auto"] {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
table {
  width: 100%;
  min-width: 600px;
  border-collapse: collapse;
}
@media (max-width: 768px) {
  .erp-dashboard .content-grid, .tally-module-grid, .reports-grid {
    grid-template-columns: 1fr !important;
  }
  .section-header {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 12px;
  }
  .search-bar, .filter-bar {
    width: 100%;
    flex-direction: column;
  }
  .search-bar input, .filter-bar select {
    width: 100%;
  }
}
@media (max-width: 414px) {
  table {
    font-size: 13px;
  }
  .panel {
    padding: 16px !important;
  }
}
"""

with open("src/styles.css", "a", encoding="utf-8") as f:
    f.write(css_append)
print("Added responsive CSS.")
