import React, { useState, useMemo } from 'react';
import {
  Layers, Plus, Play, CheckCircle2, AlertTriangle, ArrowRight,
  Package, Calendar, User, Clock, FileText, Download, RefreshCw,
  ShoppingBag, ShieldAlert, Sparkles, TrendingUp
} from 'lucide-react';

// Pre-configured authentic Namkeen BOM Recipes for Jay Ambe Namkeen
const DEFAULT_RECIPES = [
  {
    id: 'bom-sev-mamra',
    name: 'Sev Mamra Special (100 kg Batch)',
    outputProduct: 'Sev Mamra Special (250g)',
    outputUnit: 'pkt',
    outputQtyPerBatch: 400, // 400 pkts of 250g = 100kg
    standardCost: 14500,
    ingredients: [
      { id: 'ing-1', name: 'Mamra (Puffed Rice)', requiredQty: 60, unit: 'kg', estRate: 45 },
      { id: 'ing-2', name: 'Besan (Gram Flour)', requiredQty: 25, unit: 'kg', estRate: 90 },
      { id: 'ing-3', name: 'Edible Groundnut Oil', requiredQty: 15, unit: 'Ltr', estRate: 180 },
      { id: 'ing-4', name: 'Spices & Condiments (Hing, Haldi, Salt)', requiredQty: 3.5, unit: 'kg', estRate: 220 },
      { id: 'ing-5', name: 'Printed Food Grade Pouches (250g)', requiredQty: 400, unit: 'pcs', estRate: 2.2 }
    ]
  },
  {
    id: 'bom-bhavnagri',
    name: 'Bhavnagri Gathiya (50 kg Batch)',
    outputProduct: 'Bhavnagri Gathiya (500g)',
    outputUnit: 'pkt',
    outputQtyPerBatch: 100, // 100 pkts of 500g = 50kg
    standardCost: 8200,
    ingredients: [
      { id: 'ing-1', name: 'Besan (Gram Flour)', requiredQty: 40, unit: 'kg', estRate: 90 },
      { id: 'ing-2', name: 'Cottonseed Edible Oil', requiredQty: 12, unit: 'Ltr', estRate: 150 },
      { id: 'ing-3', name: 'Ajwain, Black Pepper & Soda', requiredQty: 1.5, unit: 'kg', estRate: 350 },
      { id: 'ing-4', name: 'Packaging Pouches (500g)', requiredQty: 100, unit: 'pcs', estRate: 3.5 }
    ]
  },
  {
    id: 'bom-ratlami',
    name: 'Ratlami Sev Tikha (50 kg Batch)',
    outputProduct: 'Ratlami Sev (500g)',
    outputUnit: 'pkt',
    outputQtyPerBatch: 100,
    standardCost: 8900,
    ingredients: [
      { id: 'ing-1', name: 'Besan (Fine Gram Flour)', requiredQty: 38, unit: 'kg', estRate: 90 },
      { id: 'ing-2', name: 'Refined Oil', requiredQty: 14, unit: 'Ltr', estRate: 160 },
      { id: 'ing-3', name: 'Clove & Special Ratlami Garam Masala', requiredQty: 2.5, unit: 'kg', estRate: 480 },
      { id: 'ing-4', name: 'Packaging Pouches (500g)', requiredQty: 100, unit: 'pcs', estRate: 3.5 }
    ]
  },
  {
    id: 'bom-sing-bhujia',
    name: 'Sing Bhujia / Masala Peanuts (50 kg Batch)',
    outputProduct: 'Sing Bhujia (200g)',
    outputUnit: 'pkt',
    outputQtyPerBatch: 250,
    standardCost: 7800,
    ingredients: [
      { id: 'ing-1', name: 'Selected Peanuts (Singdana)', requiredQty: 35, unit: 'kg', estRate: 110 },
      { id: 'ing-2', name: 'Besan', requiredQty: 10, unit: 'kg', estRate: 90 },
      { id: 'ing-3', name: 'Refined Oil', requiredQty: 8, unit: 'Ltr', estRate: 160 },
      { id: 'ing-4', name: 'Chaat Masala & Spices', requiredQty: 2, unit: 'kg', estRate: 300 },
      { id: 'ing-5', name: 'Pouches (200g)', requiredQty: 250, unit: 'pcs', estRate: 2 }
    ]
  }
];

export default function ProfitNxProduction({
  inventory = [],
  profile = {},
  onSaveProductionBatch,
  onNavigate,
  onStatus
}) {
  const [recipes, setRecipes] = useState(DEFAULT_RECIPES);
  const [activeSubTab, setActiveSubTab] = useState('entry'); // 'entry' | 'recipes' | 'history'
  
  // Production Entry Form
  const [selectedRecipeId, setSelectedRecipeId] = useState(DEFAULT_RECIPES[0].id);
  const [batchNo, setBatchNo] = useState(() => `BATCH-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [batchDate, setBatchDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [batchMultiplier, setBatchMultiplier] = useState(1); // 1 = 1 full batch, 2 = 2 batches, etc.
  const [supervisor, setSupervisor] = useState('Rameshbhai Patel (Master Baker)');
  const [notes, setNotes] = useState('Quality check passed. Fresh morning batch.');

  // Completed Batches Log
  const [batchHistory, setBatchHistory] = useState([
    {
      id: 'bh-1',
      batchNo: 'BATCH-2026-088',
      date: '2026-05-14',
      recipeName: 'Sev Mamra Special (100 kg Batch)',
      outputProduct: 'Sev Mamra Special (250g)',
      outputQty: 400,
      unit: 'pkt',
      cost: 14500,
      supervisor: 'Rameshbhai Patel',
      status: 'Completed'
    },
    {
      id: 'bh-2',
      batchNo: 'BATCH-2026-089',
      date: '2026-05-15',
      recipeName: 'Bhavnagri Gathiya (50 kg Batch)',
      outputProduct: 'Bhavnagri Gathiya (500g)',
      outputQty: 100,
      unit: 'pkt',
      cost: 8200,
      supervisor: 'Hareshbhai',
      status: 'Completed'
    }
  ]);

  // Selected recipe object
  const currentRecipe = useMemo(() => {
    return recipes.find(r => r.id === selectedRecipeId) || recipes[0];
  }, [recipes, selectedRecipeId]);

  // Calculated required raw materials for current batch
  const calculatedRequirements = useMemo(() => {
    if (!currentRecipe) return [];
    return currentRecipe.ingredients.map(ing => {
      const required = ing.requiredQty * Number(batchMultiplier || 1);
      const estCost = required * ing.estRate;
      return {
        ...ing,
        requiredQty: Math.round(required * 100) / 100,
        estCost: Math.round(estCost)
      };
    });
  }, [currentRecipe, batchMultiplier]);

  const totalBatchCost = useMemo(() => {
    return calculatedRequirements.reduce((sum, item) => sum + item.estCost, 0);
  }, [calculatedRequirements]);

  const plannedOutputQty = (currentRecipe?.outputQtyPerBatch || 100) * Number(batchMultiplier || 1);

  // Handle Recording Production Run
  const handleExecuteProduction = (e) => {
    e.preventDefault();

    const newBatch = {
      id: 'batch-' + Date.now(),
      batchNo,
      date: batchDate,
      recipeId: currentRecipe.id,
      recipeName: currentRecipe.name,
      outputProduct: currentRecipe.outputProduct,
      outputQty: plannedOutputQty,
      unit: currentRecipe.outputUnit,
      cost: totalBatchCost,
      supervisor,
      notes,
      materialsConsumed: calculatedRequirements,
      status: 'Completed'
    };

    setBatchHistory(prev => [newBatch, ...prev]);

    if (onSaveProductionBatch) {
      onSaveProductionBatch(newBatch);
    }

    if (onStatus) {
      onStatus(`✓ Batch ${batchNo} produced successfully! Added ${plannedOutputQty} ${currentRecipe.outputUnit} of ${currentRecipe.outputProduct} to stock.`);
    }

    alert(`✓ Production Batch ${batchNo} Recorded!\n- Finished Goods Produced: ${plannedOutputQty} ${currentRecipe.outputUnit} of ${currentRecipe.outputProduct}\n- Raw materials deducted from stock\n- Total Batch Cost: ₹${totalBatchCost.toLocaleString('en-IN')}`);

    // Generate new batch number for next run
    setBatchNo(`BATCH-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  };

  const handleExportHistory = () => {
    const headers = ['Batch No', 'Date', 'Recipe', 'Output Product', 'Qty Produced', 'Unit', 'Total Cost (₹)', 'Supervisor', 'Status'];
    const rows = batchHistory.map(b => [
      b.batchNo,
      b.date,
      `"${b.recipeName}"`,
      `"${b.outputProduct}"`,
      b.outputQty,
      b.unit,
      b.cost,
      `"${b.supervisor}"`,
      b.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Production_Batch_Log_Jay_Ambe_Namkeen.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="profitnx-container" style={{ padding: '16px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' }}>
      
      {/* Header */}
      <div className="profitnx-header-card" style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '14px 18px', marginBottom: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ background: '#059669', color: '#ffffff', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', fontSize: '12px' }}>PROFIT NX</span>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
              5. Production &gt; Namkeen Recipe BOM &amp; Batch Entry
            </h1>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
            Company: <strong>{profile.name || 'JAY AMBE NAMKEEN'}</strong> &nbsp;|&nbsp; Manufacturing &amp; Processing Unit &nbsp;|&nbsp; FY: <strong>[2026 - 2027]</strong>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onNavigate?.('sales-entry')}
            style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', background: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd', fontWeight: 600 }}
          >
            <FileText size={14} /> 1. Sales Register (F2)
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onNavigate?.('inventory')}
            style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Package size={14} /> Raw &amp; Finished Stock
          </button>
        </div>
      </div>

      {/* Sub-tabs: Production Entry | Recipes BOM | History */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '14px', borderBottom: '1px solid #cbd5e1', paddingBottom: '2px' }}>
        <button
          type="button"
          onClick={() => setActiveSubTab('entry')}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeSubTab === 'entry' ? '3px solid #059669' : '3px solid transparent',
            background: activeSubTab === 'entry' ? '#ffffff' : 'transparent',
            color: activeSubTab === 'entry' ? '#059669' : '#64748b',
            cursor: 'pointer',
            borderRadius: '6px 6px 0 0'
          }}
        >
          ⚡ New Production Run Entry
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('recipes')}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeSubTab === 'recipes' ? '3px solid #059669' : '3px solid transparent',
            background: activeSubTab === 'recipes' ? '#ffffff' : 'transparent',
            color: activeSubTab === 'recipes' ? '#059669' : '#64748b',
            cursor: 'pointer',
            borderRadius: '6px 6px 0 0'
          }}
        >
          📋 Recipe / BOM Master ({recipes.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('history')}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeSubTab === 'history' ? '3px solid #059669' : '3px solid transparent',
            background: activeSubTab === 'history' ? '#ffffff' : 'transparent',
            color: activeSubTab === 'history' ? '#059669' : '#64748b',
            cursor: 'pointer',
            borderRadius: '6px 6px 0 0'
          }}
        >
          🕒 Production Batch History ({batchHistory.length})
        </button>
      </div>

      {/* TAB 1: NEW PRODUCTION RUN ENTRY */}
      {activeSubTab === 'entry' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          
          {/* Left Column: Batch Config Form */}
          <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 16px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Play size={16} color="#059669" /> Batch Setup &amp; Parameters
            </h2>

            <form onSubmit={handleExecuteProduction} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Select Recipe */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Select Namkeen Recipe (BOM) *
                </label>
                <select
                  className="form-control"
                  value={selectedRecipeId}
                  onChange={(e) => setSelectedRecipeId(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 600 }}
                >
                  {recipes.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} ➔ Produces: {r.outputProduct}
                    </option>
                  ))}
                </select>
              </div>

              {/* Batch No & Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Batch Number *
                  </label>
                  <input
                    type="text"
                    value={batchNo}
                    onChange={(e) => setBatchNo(e.target.value)}
                    required
                    style={{ width: '100%', padding: '6px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontFamily: 'monospace', fontWeight: 600 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Production Date *
                  </label>
                  <input
                    type="date"
                    value={batchDate}
                    onChange={(e) => setBatchDate(e.target.value)}
                    required
                    style={{ width: '100%', padding: '6px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  />
                </div>
              </div>

              {/* Batch Scale / Multiplier */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#166534' }}>
                    Production Scale Multiplier
                  </label>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#15803d' }}>
                    {batchMultiplier}x Batch
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="range"
                    min="0.5"
                    max="10"
                    step="0.5"
                    value={batchMultiplier}
                    onChange={(e) => setBatchMultiplier(Number(e.target.value))}
                    style={{ flex: 1, accentColor: '#059669' }}
                  />
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={batchMultiplier}
                    onChange={(e) => setBatchMultiplier(Number(e.target.value))}
                    style={{ width: '65px', padding: '4px 6px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center' }}
                  />
                </div>
                <div style={{ fontSize: '12px', color: '#15803d', marginTop: '6px', fontWeight: 600 }}>
                  ➔ Yield: <strong>{plannedOutputQty} {currentRecipe.outputUnit}</strong> of <strong>{currentRecipe.outputProduct}</strong>
                </div>
              </div>

              {/* Supervisor & Shift */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Master Baker / Production Supervisor
                </label>
                <input
                  type="text"
                  value={supervisor}
                  onChange={(e) => setSupervisor(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Batch Notes / Quality Control
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', resize: 'vertical' }}
                />
              </div>

              {/* Execute Button */}
              <button
                type="submit"
                className="btn btn-primary"
                style={{
                  marginTop: '10px',
                  background: '#059669',
                  borderColor: '#047857',
                  padding: '10px 18px',
                  fontSize: '14px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <CheckCircle2 size={18} /> Execute &amp; Record Batch Run
              </button>

            </form>
          </div>

          {/* Right Column: Bill of Materials Raw Material Requirements */}
          <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  Raw Materials To Deduct From Stock
                </h2>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Auto-calculated from recipe formula for {batchMultiplier}x batch
                </span>
              </div>
              <div style={{ background: '#ecfdf5', color: '#047857', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
                Est. Cost: ₹{totalBatchCost.toLocaleString('en-IN')}
              </div>
            </div>

            {/* Ingredients Table */}
            <div style={{ overflowX: 'auto', flex: 1, border: '1px solid #e2e8f0', borderRadius: '6px', marginBottom: '14px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead style={{ background: '#f1f5f9' }}>
                  <tr>
                    <th style={{ padding: '7px 10px', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>Ingredient / Raw Material</th>
                    <th style={{ padding: '7px 10px', textAlign: 'right', borderBottom: '1px solid #cbd5e1' }}>Required Qty</th>
                    <th style={{ padding: '7px 10px', textAlign: 'right', borderBottom: '1px solid #cbd5e1' }}>Est. Rate (₹)</th>
                    <th style={{ padding: '7px 10px', textAlign: 'right', borderBottom: '1px solid #cbd5e1' }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {calculatedRequirements.map((ing, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '7px 10px', fontWeight: 600, color: '#334155' }}>
                        {ing.name}
                      </td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        {ing.requiredQty} {ing.unit}
                      </td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#64748b' }}>
                        ₹{ing.estRate}/{ing.unit}
                      </td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                        ₹{ing.estCost.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Production Outcome Summary Card */}
            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '12px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#475569' }}>Finished Good Output:</span>
                <strong style={{ color: '#1e3a8a' }}>{plannedOutputQty} {currentRecipe.outputUnit} of {currentRecipe.outputProduct}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#475569' }}>Calculated Unit Cost:</span>
                <strong style={{ fontFamily: 'monospace' }}>
                  ₹{(totalBatchCost / (plannedOutputQty || 1)).toFixed(2)} / {currentRecipe.outputUnit}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#475569' }}>Stock Update Action:</span>
                <span style={{ color: '#059669', fontWeight: 600 }}>Auto-deduct raw materials &amp; increment finished goods</span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: RECIPE / BOM MASTER */}
      {activeSubTab === 'recipes' && (
        <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                Namkeen Recipe (Bill of Materials) Master
              </h2>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Standard formulations and ingredient ratios for Jay Ambe Namkeen products
              </span>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                const name = prompt('Enter New Recipe Name (e.g., Nylon Sev 50kg Batch):');
                if (!name) return;
                const outputProduct = prompt('Output Product Name (e.g., Nylon Sev 250g):', name);
                const newRecipe = {
                  id: 'bom-' + Date.now(),
                  name,
                  outputProduct: outputProduct || name,
                  outputUnit: 'pkt',
                  outputQtyPerBatch: 100,
                  standardCost: 5000,
                  ingredients: [
                    { id: 'i1', name: 'Besan', requiredQty: 25, unit: 'kg', estRate: 90 },
                    { id: 'i2', name: 'Edible Oil', requiredQty: 10, unit: 'Ltr', estRate: 160 },
                    { id: 'i3', name: 'Salt & Spices', requiredQty: 1, unit: 'kg', estRate: 200 }
                  ]
                };
                setRecipes(prev => [...prev, newRecipe]);
                alert('Recipe created successfully!');
              }}
              style={{ fontSize: '12px', padding: '6px 14px', background: '#059669', borderColor: '#047857' }}
            >
              <Plus size={14} /> + New Recipe (BOM)
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
            {recipes.map((recipe) => (
              <div
                key={recipe.id}
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '14px',
                  background: '#f8fafc',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 700, color: '#1e3a8a' }}>
                    {recipe.name}
                  </h3>
                  <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#475569' }}>
                    Output: <strong>{recipe.outputQtyPerBatch} {recipe.outputUnit}</strong> of <strong>{recipe.outputProduct}</strong>
                  </p>

                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>
                    <strong>Ingredients ({recipe.ingredients.length}):</strong>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#334155' }}>
                    {recipe.ingredients.map((ing, i) => (
                      <li key={i} style={{ marginBottom: '2px' }}>
                        {ing.name}: <strong>{ing.requiredQty} {ing.unit}</strong> (@ ₹{ing.estRate})
                      </li>
                    ))}
                  </ul>
                </div>

                <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#047857' }}>
                    Est. Cost: ₹{recipe.standardCost.toLocaleString('en-IN')}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setSelectedRecipeId(recipe.id);
                      setActiveSubTab('entry');
                    }}
                    style={{ fontSize: '11px', padding: '4px 10px' }}
                  >
                    Use in Batch ➔
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PRODUCTION BATCH HISTORY */}
      {activeSubTab === 'history' && (
        <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                Production Batch Log &amp; Manufacturing History
              </h2>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Complete track record of manufacturing batches, supervisors, and output quantities
              </span>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportHistory}
              style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={14} /> Export Batch History
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead style={{ background: '#1e293b', color: '#ffffff' }}>
                <tr>
                  <th style={{ padding: '8px 10px', textAlign: 'center', width: '35px' }}>#</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', width: '130px' }}>Batch No</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', width: '95px' }}>Date</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left' }}>Product Produced</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', width: '100px' }}>Output Qty</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', width: '110px' }}>Batch Cost (₹)</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', width: '150px' }}>Supervisor</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', width: '100px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {batchHistory.map((batch, index) => (
                  <tr key={batch.id} style={{ borderBottom: '1px solid #e2e8f0', background: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b' }}>{index + 1}</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 700, color: '#059669' }}>
                      {batch.batchNo}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#475569' }}>{batch.date}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a' }}>
                      {batch.outputProduct}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>
                      {batch.outputQty} {batch.unit}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                      ₹{batch.cost.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#334155' }}>{batch.supervisor}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: '#dcfce7', color: '#166534' }}>
                        {batch.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
