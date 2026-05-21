import { useState } from 'react';
import { ArrowLeft, Pencil, Save, Truck, X } from 'lucide-react';
import { updateVehicle } from '../lib/api';
import { canWrite } from '../lib/utils';

const TYPES = ['Ambulance', 'QRV', 'POV'];
const TYPE_BADGE = { Ambulance: 'badge danger', QRV: 'badge warning', POV: 'badge muted' };

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

const cardHead = { margin: '0 0 12px', fontSize: 13, textTransform: 'uppercase', letterSpacing: '.04em', color: '#64748b', fontWeight: 700 };
const fLabel = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, color: '#64748b' };
const fValue = { fontWeight: 400, color: '#0f172a', fontSize: 14 };

export default function VehicleDetail({ vehicle, profile, refresh, onBack }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...vehicle });
  const [error, setError] = useState('');
  const mayWrite = canWrite(profile.role);

  function f(key) { return editing ? form[key] : vehicle[key]; }
  function set(key, val) { setForm(p => ({ ...p, [key]: val })); }

  function startEdit() { setForm({ ...vehicle }); setEditing(true); setError(''); }
  function cancelEdit() { setEditing(false); setError(''); }

  async function save() {
    setError('');
    try { await updateVehicle(vehicle.id, coerce(form)); setEditing(false); await refresh(); }
    catch (err) { setError(err.message); }
  }

  function field(key, type = 'text', opts = {}) {
    if (!editing) return <span style={fValue}>{vehicle[key] || '—'}</span>;
    if (type === 'select') return <select value={form[key] || ''} onChange={e => set(key, e.target.value)}>{opts.options.map(o => <option key={o}>{o}</option>)}</select>;
    if (type === 'textarea') return <textarea value={form[key] || ''} onChange={e => set(key, e.target.value)} style={{ width: '100%', minHeight: 80, border: '1px solid #cbd5e1', borderRadius: 12, padding: '10px 12px', font: 'inherit', resize: 'vertical' }} />;
    return <input type={type} value={form[key] ?? ''} onChange={e => set(key, type === 'number' ? e.target.value : e.target.value)} />;
  }

  return <div className="stack">
    {/* Toolbar */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <button className="secondary" onClick={onBack}><ArrowLeft size={16} /> Back to Vehicles</button>
      {!editing && mayWrite && <button className="secondary" onClick={startEdit}><Pencil size={16} /> Edit</button>}
      {editing && <><button className="primary" onClick={save}><Save size={16} /> Save</button><button className="secondary" onClick={cancelEdit}><X size={16} /> Cancel</button></>}
    </div>

    {error && <div className="alert danger-text">{error}</div>}

    {/* Header */}
    <div className="card">
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ width: 100, height: 100, borderRadius: 16, overflow: 'hidden', background: '#e2e8f0', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          {f('avatar_url')
            ? <img src={f('avatar_url')} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
            : <Truck size={40} color="#94a3b8" />}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          {editing
            ? <input style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }} value={form.call_sign} onChange={e => set('call_sign', e.target.value)} />
            : <h2 style={{ margin: '0 0 8px' }}>{vehicle.call_sign}</h2>}
          {editing
            ? <select value={form.type} onChange={e => set('type', e.target.value)}>{TYPES.map(t => <option key={t}>{t}</option>)}</select>
            : <span className={TYPE_BADGE[vehicle.type] || 'badge'}>{vehicle.type}</span>}
          <div style={{ marginTop: 10, display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 14, color: '#64748b' }}>
            {vehicle.mileage != null && <span>Mileage: <b style={{ color: '#0f172a' }}>{Number(vehicle.mileage).toLocaleString()} mi</b></span>}
            {vehicle.license_plate_number && <span>Plate: <b style={{ color: '#0f172a' }}>{vehicle.license_plate_number}</b></span>}
            {vehicle.next_service && <span>Next Svc: <b style={{ color: '#0f172a' }}>{vehicle.next_service}</b></span>}
          </div>
          {editing && <label style={{ ...fLabel, marginTop: 12 }}>Photo URL<input value={form.avatar_url || ''} onChange={e => set('avatar_url', e.target.value)} placeholder="https://..." /></label>}
        </div>
      </div>
    </div>

    <div className="grid-2">
      {/* Vehicle Info */}
      <div className="card">
        <h3 style={cardHead}>Vehicle Information</h3>
        <div className="stack" style={{ gap: 10 }}>
          <label style={fLabel}>Mileage
            {editing ? <input type="number" min="0" value={form.mileage ?? ''} onChange={e => set('mileage', e.target.value)} /> : <span style={fValue}>{vehicle.mileage != null ? `${Number(vehicle.mileage).toLocaleString()} mi` : '—'}</span>}
          </label>
          <label style={fLabel}>License Plate Number{field('license_plate_number')}</label>
          <label style={fLabel}>Description{field('description', 'textarea')}</label>
        </div>
      </div>

      {/* Driver Info */}
      <div className="card">
        <h3 style={cardHead}>Driver Information</h3>
        <div className="stack" style={{ gap: 10 }}>
          <label style={fLabel}>Driver License Number{field('driver_license_number')}</label>
          <label style={fLabel}>Driver License State{field('driver_license_state')}</label>
          <label style={fLabel}>Driver License Expiration{field('driver_license_expiration', 'date')}</label>
        </div>
      </div>

      {/* Maintenance */}
      <div className="card">
        <h3 style={cardHead}>Maintenance</h3>
        <div className="stack" style={{ gap: 10 }}>
          <label style={fLabel}>Last Service{field('last_service', 'date')}</label>
          <label style={fLabel}>Next Service{field('next_service', 'date')}</label>
        </div>
      </div>

      {/* Purchase */}
      <div className="card">
        <h3 style={cardHead}>Purchase Information</h3>
        <div className="stack" style={{ gap: 10 }}>
          <label style={fLabel}>Purchase Date{field('purchase_date', 'date')}</label>
          <label style={fLabel}>Purchase Price
            {editing
              ? <input type="number" min="0" step="0.01" value={form.purchase_price ?? ''} onChange={e => set('purchase_price', e.target.value)} />
              : <span style={fValue}>{vehicle.purchase_price != null ? `$${Number(vehicle.purchase_price).toLocaleString()}` : '—'}</span>}
          </label>
        </div>
      </div>
    </div>
  </div>;
}
