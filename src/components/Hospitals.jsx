import { useState } from 'react';
import { ExternalLink, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { createHospital, deleteHospital, updateHospital } from '../lib/api';
import { canDelete, canWrite } from '../lib/utils';

const blank = {
  name: '', address: '', city: '', state: '', zip: '',
  phone: '', fax: '', email: '', website: '',
  specialties: '', access_code: '',
  latitude: '', longitude: '', notes: '',
};

function coerce(h) {
  return {
    ...h,
    latitude: h.latitude === '' || h.latitude == null ? null : Number(h.latitude),
    longitude: h.longitude === '' || h.longitude == null ? null : Number(h.longitude),
  };
}

const sectionHead = {
  gridColumn: 'span 4',
  fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '.05em', color: '#64748b',
  borderTop: '1px solid #e2e8f0', paddingTop: 10, marginTop: 4,
};
const fLabel = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, color: '#64748b' };

function mapsUrl(h) {
  if (h.latitude && h.longitude) return `https://www.google.com/maps?q=${h.latitude},${h.longitude}`;
  if (h.address && h.city) return `https://www.google.com/maps/search/${encodeURIComponent([h.address, h.city, h.state, h.zip].filter(Boolean).join(', '))}`;
  return null;
}

export default function Hospitals({ hospitals, profile, refresh }) {
  const [form, setForm] = useState(blank);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [showCode, setShowCode] = useState({});
  const [error, setError] = useState('');
  const mayWrite = canWrite(profile.role);

  const filtered = hospitals.filter(h => {
    const text = [h.name, h.city, h.state, h.specialties].join(' ').toLowerCase();
    return !query || text.includes(query.toLowerCase());
  });

  function setField(f, v) { setForm(p => ({ ...p, [f]: v })); }

  async function add(e) {
    e.preventDefault(); setError('');
    try { await createHospital(coerce(form)); setForm(blank); await refresh(); }
    catch (err) { setError(err.message); }
  }

  async function saveEdit() {
    setError('');
    try { await updateHospital(editing.id, coerce(editing)); setEditing(null); await refresh(); }
    catch (err) { setError(err.message); }
  }

  async function remove(h) {
    if (!confirm(`Delete ${h.name}?`)) return;
    await deleteHospital(h.id, h.name);
    await refresh();
  }

  return <div className="stack">
    <div className="card">
      <h2>Add Hospital</h2>
      {error && <div className="alert danger-text">{error}</div>}
      <form className="grid-form" onSubmit={add}>
        <input disabled={!mayWrite} className="span-2" placeholder="Hospital name" value={form.name} onChange={e => setField('name', e.target.value)} required />
        <input disabled={!mayWrite} placeholder="Phone" value={form.phone} onChange={e => setField('phone', e.target.value)} />
        <input disabled={!mayWrite} placeholder="Fax" value={form.fax} onChange={e => setField('fax', e.target.value)} />
        <input disabled={!mayWrite} className="span-4" placeholder="Address" value={form.address} onChange={e => setField('address', e.target.value)} />
        <input disabled={!mayWrite} placeholder="City" value={form.city} onChange={e => setField('city', e.target.value)} />
        <input disabled={!mayWrite} placeholder="State" value={form.state} onChange={e => setField('state', e.target.value)} />
        <input disabled={!mayWrite} placeholder="ZIP" value={form.zip} onChange={e => setField('zip', e.target.value)} />
        <input disabled={!mayWrite} placeholder="Email" type="email" value={form.email} onChange={e => setField('email', e.target.value)} />

        <div style={sectionHead}>Additional Information</div>
        <input disabled={!mayWrite} className="span-2" placeholder="Specialties (e.g. Trauma, Cardiac, Stroke)" value={form.specialties} onChange={e => setField('specialties', e.target.value)} />
        <input disabled={!mayWrite} placeholder="Access code" value={form.access_code} onChange={e => setField('access_code', e.target.value)} />
        <input disabled={!mayWrite} placeholder="Website" value={form.website} onChange={e => setField('website', e.target.value)} />
        <label style={fLabel}>Latitude<input disabled={!mayWrite} type="number" step="any" placeholder="40.7128" value={form.latitude} onChange={e => setField('latitude', e.target.value)} /></label>
        <label style={fLabel}>Longitude<input disabled={!mayWrite} type="number" step="any" placeholder="-74.0060" value={form.longitude} onChange={e => setField('longitude', e.target.value)} /></label>
        <input disabled={!mayWrite} className="span-4" placeholder="Notes" value={form.notes} onChange={e => setField('notes', e.target.value)} />
        <button disabled={!mayWrite} className="primary span-4"><Plus size={16} /> Add Hospital</button>
      </form>
    </div>

    <div className="card filters" style={{ gridTemplateColumns: '1fr' }}>
      <input placeholder="Search hospitals" value={query} onChange={e => setQuery(e.target.value)} />
    </div>

    <div className="card table-wrap">
      <table>
        <thead><tr>
          <th>Name</th><th>Address</th><th>Contact</th>
          <th>Specialties</th><th>Access Code</th><th>Map</th><th>Actions</th>
        </tr></thead>
        <tbody>{filtered.map(h => {
          const row = editing?.id === h.id ? editing : h;
          const mapUrl = mapsUrl(h);
          return <tr key={h.id}>
            <td>
              {editing?.id === h.id
                ? <input value={row.name} onChange={e => setEditing({ ...row, name: e.target.value })} />
                : <b>{h.name}</b>}
            </td>
            <td>
              {editing?.id === h.id
                ? <><input value={row.address || ''} onChange={e => setEditing({ ...row, address: e.target.value })} />
                  <input value={row.city || ''} onChange={e => setEditing({ ...row, city: e.target.value })} />
                  <input value={row.state || ''} onChange={e => setEditing({ ...row, state: e.target.value })} />
                  <input value={row.zip || ''} onChange={e => setEditing({ ...row, zip: e.target.value })} /></>
                : <>{[h.address, h.city, h.state, h.zip].filter(Boolean).join(', ') || '—'}</>}
            </td>
            <td>
              {editing?.id === h.id
                ? <><input value={row.phone || ''} onChange={e => setEditing({ ...row, phone: e.target.value })} />
                  <input value={row.email || ''} onChange={e => setEditing({ ...row, email: e.target.value })} /></>
                : <>{h.phone || '—'}<small>{h.email || ''}</small></>}
            </td>
            <td>
              {editing?.id === h.id
                ? <input value={row.specialties || ''} onChange={e => setEditing({ ...row, specialties: e.target.value })} />
                : h.specialties || '—'}
            </td>
            <td>
              {editing?.id === h.id
                ? <input value={row.access_code || ''} onChange={e => setEditing({ ...row, access_code: e.target.value })} />
                : h.access_code
                  ? <span style={{ cursor: 'pointer', fontFamily: 'monospace' }} onClick={() => setShowCode(p => ({ ...p, [h.id]: !p[h.id] }))}>
                    {showCode[h.id] ? h.access_code : '••••••'}
                  </span>
                  : '—'}
            </td>
            <td>
              {editing?.id === h.id
                ? <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <input type="number" step="any" placeholder="Lat" value={row.latitude ?? ''} onChange={e => setEditing({ ...row, latitude: e.target.value })} />
                  <input type="number" step="any" placeholder="Lon" value={row.longitude ?? ''} onChange={e => setEditing({ ...row, longitude: e.target.value })} />
                </div>
                : mapUrl
                  ? <a href={mapUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#2563eb', fontSize: 13 }}>Map <ExternalLink size={12} /></a>
                  : '—'}
            </td>
            <td><div className="actions">
              {editing?.id === h.id
                ? <><button className="icon" onClick={saveEdit}><Save size={16} /></button><button className="icon" onClick={() => setEditing(null)}><X size={16} /></button></>
                : <><button className="icon" disabled={!mayWrite} onClick={() => setEditing(h)}><Pencil size={16} /></button><button className="icon" disabled={!canDelete(profile.role)} onClick={() => remove(h)}><Trash2 size={16} /></button></>}
            </div></td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  </div>;
}
