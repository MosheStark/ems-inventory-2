import { useMemo, useState } from 'react';
import { Download, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { createItem, deleteItem, updateItem } from '../lib/api';
import { canDelete, canWrite, downloadCsv, statusFor } from '../lib/utils';

const blank = {
  sku: '', name: '', category_id: '', location_id: '', quantity: 0, min_quantity: 0,
  expiration_date: '', unit: 'each', vendor: '', lot_number: '', notes: '', active: true
};

export default function Inventory({ data, profile, refresh }) {
  const [form, setForm] = useState(blank);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [location, setLocation] = useState('All');
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const mayWrite = canWrite(profile.role);

  const filtered = useMemo(() => {
    return data.items.filter((i) => {
      const text = [i.name, i.sku, i.vendor, i.lot_number, i.notes, i.categories?.name, i.locations?.name].join(' ').toLowerCase();
      return (!query || text.includes(query.toLowerCase())) &&
        (category === 'All' || i.category_id === category) &&
        (location === 'All' || i.location_id === location);
    }).sort((a, b) => statusFor(a).priority - statusFor(b).priority || a.name.localeCompare(b.name));
  }, [data.items, query, category, location]);

  function setField(field, value) {
    setForm((p) => ({ ...p, [field]: ['quantity', 'min_quantity'].includes(field) ? Number(value) : value }));
  }

  async function addItem(e) {
    e.preventDefault();
    setError('');
    try {
      await createItem({ ...form, expiration_date: form.expiration_date || null });
      setForm(blank);
      await refresh();
    } catch (err) { setError(err.message); }
  }

  async function saveEdit() {
    setError('');
    try {
      await updateItem(editing.id, { ...editing, expiration_date: editing.expiration_date || null });
      setEditing(null);
      await refresh();
    } catch (err) { setError(err.message); }
  }

  async function remove(item) {
    if (!confirm(`Delete ${item.name}?`)) return;
    await deleteItem(item.id, item.name);
    await refresh();
  }

  function exportRows() {
    downloadCsv('ems-inventory.csv', data.items.map((i) => ({
      name: i.name, sku: i.sku, category: i.categories?.name, location: i.locations?.name,
      quantity: i.quantity, min_quantity: i.min_quantity, expiration_date: i.expiration_date,
      status: statusFor(i).label, unit: i.unit, vendor: i.vendor, lot_number: i.lot_number, notes: i.notes
    })));
  }

  return <div className="stack">
    <div className="card">
      <div className="section-head"><h2>Add Inventory Item</h2><button onClick={exportRows} className="secondary"><Download size={16}/> Export CSV</button></div>
      {error && <div className="alert danger-text">{error}</div>}
      <form className="grid-form" onSubmit={addItem}>
        <input disabled={!mayWrite} placeholder="Item name" value={form.name} onChange={(e) => setField('name', e.target.value)} required />
        <input disabled={!mayWrite} placeholder="SKU" value={form.sku} onChange={(e) => setField('sku', e.target.value)} />
        <select disabled={!mayWrite} value={form.category_id} onChange={(e) => setField('category_id', e.target.value)} required><option value="">Category</option>{data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select disabled={!mayWrite} value={form.location_id} onChange={(e) => setField('location_id', e.target.value)} required><option value="">Location</option>{data.locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
        <input disabled={!mayWrite} type="number" min="0" placeholder="Quantity" value={form.quantity} onChange={(e) => setField('quantity', e.target.value)} />
        <input disabled={!mayWrite} type="number" min="0" placeholder="Minimum" value={form.min_quantity} onChange={(e) => setField('min_quantity', e.target.value)} />
        <input disabled={!mayWrite} type="date" value={form.expiration_date || ''} onChange={(e) => setField('expiration_date', e.target.value)} />
        <input disabled={!mayWrite} placeholder="Unit" value={form.unit} onChange={(e) => setField('unit', e.target.value)} />
        <input disabled={!mayWrite} placeholder="Vendor" value={form.vendor} onChange={(e) => setField('vendor', e.target.value)} />
        <input disabled={!mayWrite} placeholder="Lot number" value={form.lot_number} onChange={(e) => setField('lot_number', e.target.value)} />
        <input disabled={!mayWrite} className="span-2" placeholder="Notes" value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
        <button disabled={!mayWrite} className="primary span-4"><Plus size={16}/> Add Item</button>
      </form>
    </div>

    <div className="card filters">
      <input placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
      <select value={category} onChange={(e) => setCategory(e.target.value)}><option>All</option>{data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <select value={location} onChange={(e) => setLocation(e.target.value)}><option>All</option>{data.locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
    </div>

    <div className="card table-wrap">
      <table><thead><tr><th>Item</th><th>Category</th><th>Location</th><th>Qty</th><th>Min</th><th>Exp.</th><th>Status</th><th>Vendor / Lot</th><th>Notes</th><th>Actions</th></tr></thead>
      <tbody>{filtered.map(item => {
        const row = editing?.id === item.id ? editing : item;
        const status = statusFor(item);
        return <tr key={item.id}>
          <td>{editing?.id === item.id ? <><input value={row.name} onChange={e => setEditing({...row, name:e.target.value})}/><input value={row.sku || ''} onChange={e => setEditing({...row, sku:e.target.value})}/></> : <><b>{item.name}</b><small>{item.sku || 'No SKU'}</small></>}</td>
          <td>{editing?.id === item.id ? <select value={row.category_id || ''} onChange={e => setEditing({...row, category_id:e.target.value})}>{data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select> : item.categories?.name}</td>
          <td>{editing?.id === item.id ? <select value={row.location_id || ''} onChange={e => setEditing({...row, location_id:e.target.value})}>{data.locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select> : item.locations?.name}</td>
          <td>{editing?.id === item.id ? <input type="number" value={row.quantity} onChange={e => setEditing({...row, quantity:Number(e.target.value)})}/> : `${item.quantity} ${item.unit}`}</td>
          <td>{editing?.id === item.id ? <input type="number" value={row.min_quantity} onChange={e => setEditing({...row, min_quantity:Number(e.target.value)})}/> : item.min_quantity}</td>
          <td>{editing?.id === item.id ? <input type="date" value={row.expiration_date || ''} onChange={e => setEditing({...row, expiration_date:e.target.value})}/> : item.expiration_date || 'N/A'}</td>
          <td><span className={status.className}>{status.label}</span></td>
          <td>{editing?.id === item.id ? <><input value={row.vendor || ''} onChange={e => setEditing({...row, vendor:e.target.value})}/><input value={row.lot_number || ''} onChange={e => setEditing({...row, lot_number:e.target.value})}/></> : <>{item.vendor || '—'}<small>Lot: {item.lot_number || '—'}</small></>}</td>
          <td>{editing?.id === item.id ? <input value={row.notes || ''} onChange={e => setEditing({...row, notes:e.target.value})}/> : item.notes}</td>
          <td><div className="actions">{editing?.id === item.id ? <><button className="icon" onClick={saveEdit}><Save size={16}/></button><button className="icon" onClick={() => setEditing(null)}><X size={16}/></button></> : <><button className="icon" disabled={!mayWrite} onClick={() => setEditing(item)}><Pencil size={16}/></button><button className="icon" disabled={!canDelete(profile.role)} onClick={() => remove(item)}><Trash2 size={16}/></button></>}</div></td>
        </tr>
      })}</tbody></table>
    </div>
  </div>;
}
