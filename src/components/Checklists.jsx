import { useState } from 'react';
import { ClipboardCheck, ClipboardList, Pencil, Plus, RotateCcw, Save, Trash2, X } from 'lucide-react';
import { createChecklistItem, deleteChecklistItem, updateChecklistItem } from '../lib/api';
import { canWrite } from '../lib/utils';

const STATUS_BADGE = {
  Primary: 'badge success',
  Backup: 'badge caution',
  Observer: 'badge',
  Trainee: 'badge warning',
  Inactive: 'badge muted',
  Ambulance: 'badge danger',
  QRV: 'badge warning',
  POV: 'badge muted',
};

export default function Checklists({ checklists, profile, refresh }) {
  const [selectedId, setSelectedId] = useState(checklists[0]?.id || null);
  const [reviewMode, setReviewMode] = useState(false);
  const [checked, setChecked] = useState({});
  const [newItem, setNewItem] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [error, setError] = useState('');
  const mayWrite = canWrite(profile.role);

  const memberChecklists = checklists.filter(c => c.target_type === 'member_status');
  const vehicleChecklists = checklists.filter(c => c.target_type === 'vehicle_type');
  const selectedChecklist = checklists.find(c => c.id === selectedId);
  const items = selectedChecklist?.items || [];
  const checkedCount = items.filter(i => checked[i.id]).length;

  function selectChecklist(id) {
    setSelectedId(id);
    setReviewMode(false);
    setChecked({});
    setNewItem('');
    setNewNotes('');
    setEditingItem(null);
    setError('');
  }

  async function addItem(e) {
    e.preventDefault(); setError('');
    if (!newItem.trim() || !selectedId) return;
    try {
      await createChecklistItem(selectedId, newItem.trim(), newNotes.trim() || null);
      setNewItem(''); setNewNotes('');
      await refresh();
    } catch (err) { setError(err.message); }
  }

  async function saveItemEdit() {
    setError('');
    try { await updateChecklistItem(editingItem.id, editingItem); setEditingItem(null); await refresh(); }
    catch (err) { setError(err.message); }
  }

  async function removeItem(item) {
    if (!confirm(`Remove "${item.item_name}"?`)) return;
    await deleteChecklistItem(item.id);
    await refresh();
  }

  function navBtnStyle(id) {
    const active = selectedId === id;
    return {
      width: '100%', textAlign: 'left', cursor: 'pointer', fontSize: 14,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      background: active ? '#eff6ff' : 'transparent',
      color: active ? '#1d4ed8' : '#374151',
      border: active ? '1px solid #bfdbfe' : '1px solid transparent',
      borderRadius: 10, padding: '8px 12px',
    };
  }

  const groupLabel = {
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '.05em', color: '#94a3b8', margin: '8px 0 4px',
  };

  const itemRow = (active) => ({
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
    border: '1px solid #e2e8f0', borderRadius: 12,
    background: active ? '#f0fdf4' : 'white',
    borderColor: active ? '#bbf7d0' : '#e2e8f0',
  });

  return <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16, alignItems: 'start' }}>
    {/* Sidebar */}
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 2, position: 'sticky', top: 20 }}>
      <h2 style={{ margin: '0 0 8px', fontSize: 16 }}>Checklists</h2>
      <div style={groupLabel}>Member Status</div>
      {memberChecklists.map(c =>
        <button key={c.id} style={navBtnStyle(c.id)} onClick={() => selectChecklist(c.id)}>
          <span>{c.target_value}</span>
          <span className={STATUS_BADGE[c.target_value] || 'badge'} style={{ fontSize: 10, padding: '2px 8px' }}>{c.items?.length ?? 0}</span>
        </button>
      )}
      <div style={groupLabel}>Vehicle Type</div>
      {vehicleChecklists.map(c =>
        <button key={c.id} style={navBtnStyle(c.id)} onClick={() => selectChecklist(c.id)}>
          <span>{c.target_value}</span>
          <span className={STATUS_BADGE[c.target_value] || 'badge'} style={{ fontSize: 10, padding: '2px 8px' }}>{c.items?.length ?? 0}</span>
        </button>
      )}
      {checklists.length === 0 && <p className="muted-text" style={{ fontSize: 13 }}>Run the SQL migration to create checklists.</p>}
    </div>

    {/* Detail panel */}
    {selectedChecklist ? <div className="stack">
      {/* Header card */}
      <div className="card">
        <div className="section-head">
          <div>
            <span className={STATUS_BADGE[selectedChecklist.target_value] || 'badge'}>{selectedChecklist.target_value}</span>
            <h2 style={{ margin: '8px 0 2px' }}>{selectedChecklist.name}</h2>
            <p className="muted-text" style={{ margin: 0, fontSize: 14 }}>{items.length} item{items.length !== 1 ? 's' : ''}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {reviewMode && <button className="secondary" onClick={() => setChecked({})}><RotateCcw size={16} /> Reset</button>}
            <button
              className={reviewMode ? 'primary' : 'secondary'}
              onClick={() => { setReviewMode(r => !r); setChecked({}); }}
            >
              {reviewMode ? <><ClipboardCheck size={16} /> Exit Review</> : <><ClipboardList size={16} /> Review</>}
            </button>
          </div>
        </div>
      </div>

      {reviewMode ? (
        /* Review / checklist mode */
        <div className="card stack" style={{ gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span className={checkedCount === items.length && items.length > 0 ? 'badge success' : 'badge caution'}>
              {checkedCount} / {items.length} checked
            </span>
            {checkedCount === items.length && items.length > 0 && <span className="badge success">All clear!</span>}
          </div>
          {items.length === 0
            ? <p className="muted-text">No items in this checklist yet.</p>
            : items.map(item =>
              <label key={item.id} style={{
                ...itemRow(!!checked[item.id]),
                cursor: 'pointer', userSelect: 'none',
              }}>
                <input
                  type="checkbox"
                  style={{ width: 18, height: 18, flexShrink: 0, cursor: 'pointer' }}
                  checked={!!checked[item.id]}
                  onChange={() => setChecked(p => ({ ...p, [item.id]: !p[item.id] }))}
                />
                <div style={{ flex: 1 }}>
                  <span style={{
                    fontWeight: 600,
                    textDecoration: checked[item.id] ? 'line-through' : 'none',
                    color: checked[item.id] ? '#94a3b8' : '#0f172a',
                  }}>{item.item_name}</span>
                  {item.notes && <small style={{ display: 'block', color: '#64748b', marginTop: 2 }}>{item.notes}</small>}
                </div>
              </label>
            )}
        </div>
      ) : (
        /* Edit / manage mode */
        <div className="card stack" style={{ gap: 8 }}>
          {error && <div className="alert danger-text">{error}</div>}
          {mayWrite && (
            <form onSubmit={addItem} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <input style={{ flex: '2 1 180px' }} placeholder="Equipment / item name" value={newItem} onChange={e => setNewItem(e.target.value)} required />
              <input style={{ flex: '1 1 140px' }} placeholder="Notes (optional)" value={newNotes} onChange={e => setNewNotes(e.target.value)} />
              <button style={{
                background: '#2563eb', color: 'white', border: 'none', borderRadius: 12,
                padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', cursor: 'pointer',
              }}><Plus size={16} /> Add Item</button>
            </form>
          )}
          {items.length === 0
            ? <p className="muted-text">No items yet.{mayWrite ? ' Add the first item above.' : ''}</p>
            : items.map(item =>
              <div key={item.id} style={itemRow(false)}>
                {editingItem?.id === item.id ? <>
                  <input style={{ flex: 2 }} value={editingItem.item_name} onChange={e => setEditingItem({ ...editingItem, item_name: e.target.value })} />
                  <input style={{ flex: 1 }} placeholder="Notes" value={editingItem.notes || ''} onChange={e => setEditingItem({ ...editingItem, notes: e.target.value })} />
                  <button className="icon" onClick={saveItemEdit}><Save size={16} /></button>
                  <button className="icon" onClick={() => setEditingItem(null)}><X size={16} /></button>
                </> : <>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600 }}>{item.item_name}</span>
                    {item.notes && <small style={{ display: 'block', color: '#64748b', marginTop: 2 }}>{item.notes}</small>}
                  </div>
                  {mayWrite && <button className="icon" onClick={() => setEditingItem(item)}><Pencil size={16} /></button>}
                  {mayWrite && <button className="icon" onClick={() => removeItem(item)}><Trash2 size={16} /></button>}
                </>}
              </div>
            )}
        </div>
      )}
    </div> : <div className="card"><p className="muted-text">Select a checklist to view its items.</p></div>}
  </div>;
}
