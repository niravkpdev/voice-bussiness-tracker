import os

file_path = 'src/Phase2ERP.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = [
    (
        "        for (let prod of newProducts) {\n          const saved = await onCloudRecord?.('inventory', prod.id, { ...prod, itemId: prod.id });\n          if (!saved) throw new Error(`Failed to save ${prod.name}`);\n        }",
        "        for (let prod of newProducts) {\n          if (onCloudRecord) await onCloudRecord('inventory', prod.id, { ...prod, itemId: prod.id }).catch(console.error);\n        }"
    ),
    (
        "      const saved = await onCloudRecord?.('notifications', notification.id, notification);\n      if (!saved) {\n        throw new Error('Notification save failed');\n      }",
        "      if (onCloudRecord) await onCloudRecord('notifications', notification.id, notification).catch(console.error);"
    ),
    (
        "      const saved = await onCloudRecord?.('inventory', product.id, {\n        ...product,\n        itemId: product.id,\n      });\n      if (!saved) {\n        throw new Error('Inventory save failed');\n      }",
        "      if (onCloudRecord) await onCloudRecord('inventory', product.id, {\n        ...product,\n        itemId: product.id,\n      }).catch(console.error);"
    ),
    (
        "      const deleted = await onCloudDelete?.('inventory', product.id);\n      if (!deleted) {\n        throw new Error('Product delete failed');\n      }",
        "      if (onCloudDelete) await onCloudDelete('inventory', product.id).catch(console.error);"
    ),
    (
        "        const saved = await onCloudRecord?.('inventory', updatedProduct.id, {\n          ...updatedProduct,\n          itemId: updatedProduct.id,\n        });\n        if (!saved) {\n          throw new Error('Stock update failed');\n        }",
        "        if (onCloudRecord) await onCloudRecord('inventory', updatedProduct.id, {\n          ...updatedProduct,\n          itemId: updatedProduct.id,\n        }).catch(console.error);"
    ),
    (
        "        const stockSaved = await onCloudRecord?.('stock_transactions', stockEntry.id, stockEntry);\n        if (!stockSaved) {\n          throw new Error('Stock transaction save failed');\n        }",
        "        if (onCloudRecord) await onCloudRecord('stock_transactions', stockEntry.id, stockEntry).catch(console.error);"
    ),
    (
        "      const saved = await onCloudRecord?.(collectionName, id, person);\n      if (!saved) {\n        throw new Error(`Supabase save failed for ${path}`);\n      }",
        "      if (onCloudRecord) await onCloudRecord(collectionName, id, person).catch(console.error);"
    ),
    (
        "      const deleted = await onCloudDelete?.(collectionName, person.id);\n      if (!deleted) {\n        throw new Error(`Supabase delete failed for ${path}`);\n      }",
        "      if (onCloudDelete) await onCloudDelete(collectionName, person.id).catch(console.error);"
    ),
    (
        "        const invoiceSaved = await onCloudRecord?.('invoices', invoice.id, invoice);\n        if (!invoiceSaved) {\n          throw new Error('Invoice legacy upsert returned falsy');\n        }",
        "        if (onCloudRecord) await onCloudRecord('invoices', invoice.id, invoice).catch(console.error);"
    ),
    (
        "          const saved = await onCloudRecord?.('inventory', product.id, {\n            ...product,\n            currentStock: newStock,\n            itemId: product.id,\n          });\n          if (!saved) {\n            console.warn('Invoice stock update failed for product:', product.id);\n          }",
        "          if (onCloudRecord) await onCloudRecord('inventory', product.id, {\n            ...product,\n            currentStock: newStock,\n            itemId: product.id,\n          }).catch(console.error);"
    ),
    (
        "      const deleted = await onCloudDelete?.('invoices', invoiceId);\n      if (!deleted) {\n        throw new Error('Invoice delete failed');\n      }",
        "      if (onCloudDelete) await onCloudDelete('invoices', invoiceId).catch(console.error);"
    )
]

for old_str, new_str in replacements:
    if old_str in content:
        content = content.replace(old_str, new_str)
        print("Replaced:", old_str[:50].replace('\n', ' '))
    else:
        print("NOT FOUND:", old_str[:50].replace('\n', ' '))

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
