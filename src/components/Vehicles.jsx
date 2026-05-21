import { useMemo, useState } from 'react';
import { Eye, Pencil, Plus, Save, Trash2, Truck, X } from 'lucide-react';
import { createVehicle, deleteVehicle, updateVehicle } from '../lib/api';
import { canDelete, canWrite } from '../lib/utils';
import VehicleDetail from './VehicleDetail';

const TYPES = ['Ambulance', 'QRV', 'POV'];

const TYPE_BADGE = {
  Ambulance: 'badge danger',
  QRV: 'badge warning',
  POV: 'badge muted',
};

const blank = {
  call_sign: '', type: 'Ambulance', mileage: '',
  last_service: '', next_service: '',
  purchase_date: '', purchase_price: '',
  description: '',
  license_plate_number: '', driver_license_number: '',
  driver_license_state: '', driver_license_expiration: '',
  avatar_url: '',
};

function coerce(v) {
  return {
    ...v,
    mileage: v.mileage === '' || v.mileage == null ? null : Number(v.mileage),
    purchase_price: v.purchase_price === '' || v.purchase_price == null ? null : Number(v.purchase_price),
    last_service: v.last_service || null,
    next_service: v.next_service || null,
    purchase_date: v.purchase_date || null,
    driver_license_expiration: v.driver_license_expiration || null,
  };
}

const sectionHead = {
  gridColumn: 'span 4', fontSize: 12, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '.05em', color: '#64748b',
  borderTop: '1px solid #e2e8f0', paddingTop: 10, marginTop: 4,
};
const fLabel = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, color: '#64748b' };

function VehicleAvatar({ url, size = 32 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 8, overflow: 'hidden', background: '#e2e8f0', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
      {url
        ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
        : <Truck size={size * 0.5} color="#94a3b8" />}
    </div>
  );
}

export default function Vehicles({ vehicles, profile, refresh }) {
  const [detailId, setDetailId] = useState(null);
  const [form, setForm] = useState(blank);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const mayWrite = canWrite(profile.role);

  const filtered = useMemo(() =>
    vehicles.filter(v => {
      const text = [v.call_sign, v.type, v.description, v.license_plate_number].join(' ').toLowerCase();
      return (!query || text.includes(query.toLowerCase())) &&
        (typeFilter === 'All' || v.type === typeFilter);
    }).sort((a, b) => a.call_sign.localeCompare(b.call_sign)),
  [vehicles, query, typeFilter]);

  const detailVehicle = detailId ? vehicles.find(v => v.id === detailId) : null;
  if (detailId && !detailVehicle) { setDetailId(null); return null; }
  if (detailVehicle) return <VehicleDetail vehicle={detailVehicle} profile={profile} refresh={refresh} onBack={() => setDetailId(null)} />;

  function setField(f, v) { setForm(p => ({ ...p, [f]: v })); }

  async function add(e) {
    e.preventDefault(); setError('');
    try { await createVehicle(coerce(form)); setForm(blank); await refresh(); }
    catch (err) { setError(err.message); }
  }

  async function saveEdit() {
    setError('');
    try { await updateVehicle(editing.id, coerce(editing)); setEditing(null); await refresh(); }
    catch (err) { setError(err.message); }
  }

  async function remove(v) {
    if (!confirm(`Delete ${v.call_sign}?`)) return;
    await deleteVehicle(v.id, v.call_sign);
    await refresh();
  }

  return <div className="stack">
    <div className="card">
      <h2>Add Vehicle</h2>
      {error && <div className="alert danger-text">{error}</div>}
      <form className="grid-form" onSubmit={add}>
        <div style={sectionHead}>Vehicle Information</div>
        <input disabled={!mayWrite} placeholder="Call sign" value={form.call_sign} onChange={e => setField('call_sign', e.target.value)} required />
        <select disabled={!mayWrite} value={form.type} onChange={e => setField('type', e.target.value)}>
          {TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <input disabled={!mayWrite} placeholder="License plate number" value={form.license_plate_number} onChange={e => setField('license_plate_number', e.target.value)} />
        <input disabled={!mayWrite} type="number" min="0" placeholder="Mileage" value={form.mileage} onChange={e => setField('mileage', e.target.value)} />
        <input disabled={!mayWrite} className="span-4" placeholder="Description" value={form.description} onChange={e => setField('description', e.target.value)} />
        <input disabled={!mayWrite} className="span-2" placeholder="Photo URL (https://...)" value={form.avatar_url} onChange={e => setField('avatar_url', e.target.value)} />

        <div style={sectionHead}>Driver Information</div>
        <input disabled={!mayWrite} placeholder="Driver license number" value={form.driver_license_number} onChange={e => setField('driver_license_number', e.target.value)} />
        <input disabled={!mayWrite} placeholder="DL State" value={form.driver_license_state} onChange={e => setField('driver_license_state', e.target.value)} />
        <label style={fLabel}>DL Expiration<input disabled={!mayWrite} type="date" value={form.driver_license_expiration} onChange={e => setField('driver_license_expiration', e.target.value)} /></label>

        <div style={sectionHead}>Maintenance & Purchase</div>
        <label style={fLabel}>Last Service<input disabled={!mayWrite} type="date" value={form.last_service} onChange={e => setField('last_service', e.target.value)} /></label>
        <label style={fLabel}>Next Service<input disabled={!mayWrite} type="date" value={form.next_service} onChange={e => setField('next_service', e.target.value)} /></label>
        <label style={fLabel}>Purchase Date<input disabled={!mayWrite} type="date" value={form.purchase_date} onChange={e => setField('purchase_date', e.target.value)} /></label>
        <input disabled={!mayWrite} type="number" min="0" step="0.01" placeholder="Purchase price ($)" value={form.purchase_price} onChange={e => setField('purchase_price', e.target.value)} />

        <button disabled={!mayWrite} className="primary span-4"><Plus size={16} /> Add Vehicle</button>
      </form>
    </div>

    <div className="card filters">
      <input placeholder="Search vehicles" value={query} onChange={e => setQuery(e.target.value)} />
      <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
        <option>All</option>
        {TYPES.map(t => <option key={t}>{t}</option>)}
      </select>
    </div>

    <div className="card table-wrap">
      <table>
        <thead><tr>
          <th>Call Sign</th><th>Type</th><th>License Plate</th><th>Mileage</th>
          <th>Last Service</th><th>Next Service</th><th>Actions</th>
        </tr></thead>
        <tbody>{filtered.map(v => {
          const row = editing?.id === v.id ? editing : v;
          return <tr key={v.id}>
            <td>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <VehicleAvatar url={v.avatar_url} />
                {editing?.id === v.id
                  ? <input value={row.call_sign} onChange={e => setEditing({ ...row, call_sign: e.target.value })} />
                  : <b>{v.call_sign}</b>}
              </div>
            </td>
            <td>
              {editing?.id === v.id
                ? <select value={row.type} onChange={e => setEditing({ ...row, type: e.target.value })}>{TYPES.map(t => <option key={t}>{t}</option>)}</select>
                : <span className={TYPE_BADGE[v.type] || 'badge'}>{v.type}</span>}
            </td>
            <td>
              {editing?.id === v.id
                ? <input value={row.license_plate_number || ''} onChange={e => setEditing({ ...row, license_plate_number: e.target.value })} />
                : v.license_plate_number || '—'}
            </td>
            <td>
              {editing?.id === v.id
                ? <input type="number" value={row.mileage ?? ''} onChange={e => setEditing({ ...row, mileage: e.target.value })} />
                : v.mileage != null ? `${Number(v.mileage).toLocaleString()} mi` : '—'}
            </td>
            <td>
              {editing?.id === v.id
                ? <input type="date" value={row.last_service || ''} onChange={e => setEditing({ ...row, last_service: e.target.value })} />
                : v.last_service || '—'}
            </td>
            <td>
              {editing?.id === v.id
                ? <input type="date" value={row.next_service || ''} onChange={e => setEditing({ ...row, next_service: e.target.value })} />
                : v.next_service || '—'}
            </td>
            <td><div className="actions">
              <button className="icon" title="View details" onClick={() => setDetailId(v.id)}><Eye size={16} /></button>
              {editing?.id === v.id
                ? <><button className="icon" onClick={saveEdit}><Save size={16} /></button><button className="icon" onClick={() => setEditing(null)}><X size={16} /></button></>
                : <><button className="icon" disabled={!mayWrite} onClick={() => setEditing(v)}><Pencil size={16} /></button>
                  <button className="icon" disabled={!canDelete(profile.role)} onClick={() => remove(v)}><Trash2 size={16} /></button></>}
            </div></td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  </div>;
}
