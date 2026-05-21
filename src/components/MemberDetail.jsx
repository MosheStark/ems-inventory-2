import { useState } from 'react';
import { ArrowLeft, Pencil, Plus, Save, User, X } from 'lucide-react';
import { createCallLog, deleteCallLog, updateMember } from '../lib/api';
import { canDelete, canWrite } from '../lib/utils';
import { CALL_TYPES, DISPOSITIONS } from './CallLog';

const STATUSES = ['Primary', 'Backup', 'Observer', 'Trainee', 'Inactive'];
const CERT_LEVELS = ['None', 'Lay Responder', 'First Responder', 'EMT-B', 'AEMT', 'Paramedic', 'Other'];

const STATUS_BADGE = {
  Primary: 'badge success',
  Backup: 'badge caution',
  Observer: 'badge',
  Trainee: 'badge warning',
  Inactive: 'badge muted',
};

function coerceDates(m) {
  return { ...m, date_of_birth: m.date_of_birth || null, date_joined: m.date_joined || null, cert_expiration: m.cert_expiration || null };
}

const cardHead = { margin: '0 0 12px', fontSize: 13, textTransform: 'uppercase', letterSpacing: '.04em', color: '#64748b', fontWeight: 700 };
const fLabel = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, color: '#64748b' };
const fValue = { fontWeight: 400, color: '#0f172a', fontSize: 14 };

const blankCall = (memberId) => ({
  member_id: memberId,
  call_date: new Date().toISOString().slice(0, 10),
  call_time: '', incident_number: '', call_type: '',
  location: '', disposition: '', notes: '',
});

export default function MemberDetail({ member, callLog, profile, refresh, onBack }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...member });
  const [error, setError] = useState('');
  const [addingCall, setAddingCall] = useState(false);
  const [callForm, setCallForm] = useState(blankCall(member.id));
  const [callError, setCallError] = useState('');
  const mayWrite = canWrite(profile.role);
  const memberCalls = (callLog || []).filter(c => c.member_id === member.id);

  function f(key) { return editing ? form[key] : member[key]; }
  function set(key, val) { setForm(p => ({ ...p, [key]: val })); }

  function startEdit() { setForm({ ...member }); setEditing(true); setError(''); }
  function cancelEdit() { setEditing(false); setError(''); }

  async function save() {
    setError('');
    try { await updateMember(member.id, coerceDates(form)); setEditing(false); await refresh(); }
    catch (err) { setError(err.message); }
  }

  function field(key, type = 'text', opts = {}) {
    if (!editing) return <span style={fValue}>{member[key] || '—'}</span>;
    if (type === 'select') return <select value={form[key] || ''} onChange={e => set(key, e.target.value)}>{opts.options.map(o => <option key={o}>{o}</option>)}</select>;
    if (type === 'checkbox') return <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 400, cursor: 'pointer' }}><input type="checkbox" checked={!!form[key]} onChange={e => set(key, e.target.checked)} />{opts.label}</label>;
    if (type === 'textarea') return <textarea value={form[key] || ''} onChange={e => set(key, e.target.value)} style={{ width: '100%', minHeight: 90, border: '1px solid #cbd5e1', borderRadius: 12, padding: '10px 12px', font: 'inherit', resize: 'vertical' }} />;
    return <input type={type} value={form[key] ?? ''} onChange={e => set(key, type === 'number' ? Number(e.target.value) : e.target.value)} />;
  }

  return <div className="stack">
    {/* Toolbar */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <button className="secondary" onClick={onBack}><ArrowLeft size={16} /> Back to Members</button>
      {!editing && mayWrite && <button className="secondary" onClick={startEdit}><Pencil size={16} /> Edit</button>}
      {editing && <><button className="primary" onClick={save}><Save size={16} /> Save</button><button className="secondary" onClick={cancelEdit}><X size={16} /> Cancel</button></>}
    </div>

    {error && <div className="alert danger-text">{error}</div>}

    {/* Profile header */}
    <div className="card">
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ width: 100, height: 100, borderRadius: '50%', overflow: 'hidden', background: '#e2e8f0', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          {f('avatar_url')
            ? <img src={f('avatar_url')} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
            : <User size={40} color="#94a3b8" />}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          {editing
            ? <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <input style={{ flex: 1, fontSize: 18, fontWeight: 700 }} value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="First name" />
                <input style={{ flex: 1, fontSize: 18, fontWeight: 700 }} value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Last name" />
              </div>
            : <h2 style={{ margin: '0 0 8px' }}>{member.first_name} {member.last_name}</h2>}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
            {editing
              ? <select value={form.status} onChange={e => set('status', e.target.value)}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select>
              : <span className={STATUS_BADGE[member.status] || 'badge'}>{member.status}</span>}
            {!editing && member.oos && <span className="badge danger">OOS</span>}
            {editing && <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              <input type="checkbox" checked={!!form.oos} onChange={e => set('oos', e.target.checked)} /> Out of Service
            </label>}
          </div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 14, color: '#64748b' }}>
            <span>Calls: {editing
              ? <input type="number" min="0" style={{ width: 70, display: 'inline-block', padding: '2px 8px' }} value={form.number_of_calls ?? 0} onChange={e => set('number_of_calls', Number(e.target.value))} />
              : <b style={{ color: '#0f172a' }}>{member.number_of_calls || 0}</b>}
            </span>
            {member.date_joined && <span>Joined: <b style={{ color: '#0f172a' }}>{new Date(member.date_joined + 'T00:00:00').toLocaleDateString()}</b></span>}
            {member.cert_expiration && <span>Cert Exp: <b style={{ color: '#0f172a' }}>{member.cert_expiration}</b></span>}
          </div>
          {editing && <label style={{ ...fLabel, marginTop: 12 }}>Photo URL<input value={form.avatar_url || ''} onChange={e => set('avatar_url', e.target.value)} placeholder="https://..." /></label>}
        </div>
      </div>
    </div>

    <div className="grid-2">
      {/* Contact */}
      <div className="card">
        <h3 style={cardHead}>Contact Information</h3>
        <div className="stack" style={{ gap: 10 }}>
          <label style={fLabel}>Email{field('email', 'email')}</label>
          <label style={fLabel}>Phone{field('phone')}</label>
          <label style={fLabel}>Address{field('address')}</label>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8 }}>
            <label style={fLabel}>City{field('city')}</label>
            <label style={fLabel}>State{field('state')}</label>
            <label style={fLabel}>ZIP{field('zip')}</label>
          </div>
        </div>
      </div>

      {/* EMS */}
      <div className="card">
        <h3 style={cardHead}>EMS Information</h3>
        <div className="stack" style={{ gap: 10 }}>
          <label style={fLabel}>Date of Birth{field('date_of_birth', 'date')}</label>
          <label style={fLabel}>Certification Level{field('cert_level', 'select', { options: CERT_LEVELS })}</label>
          <label style={fLabel}>Certification Number{field('cert_number')}</label>
          <label style={fLabel}>Certification Expiration{field('cert_expiration', 'date')}</label>
          <label style={fLabel}>Date Joined{field('date_joined', 'date')}</label>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="card">
        <h3 style={cardHead}>Emergency Contact</h3>
        <div className="stack" style={{ gap: 10 }}>
          <label style={fLabel}>Name{field('emergency_contact_name')}</label>
          <label style={fLabel}>Phone{field('emergency_contact_phone')}</label>
        </div>
      </div>

      {/* Notes */}
      <div className="card">
        <h3 style={cardHead}>Notes</h3>
        {editing
          ? field('notes', 'textarea')
          : <p style={{ margin: 0, color: member.notes ? '#0f172a' : '#94a3b8', whiteSpace: 'pre-wrap', fontSize: 14 }}>{member.notes || 'No notes.'}</p>}
      </div>
    </div>

    {/* Call History */}
    <div className="card">
      <div className="section-head">
        <h2 style={{ margin: 0 }}>Call History <span className="badge muted" style={{ fontSize: 13, marginLeft: 8 }}>{memberCalls.length}</span></h2>
        {mayWrite && !addingCall && (
          <button className="secondary" onClick={() => { setCallForm(blankCall(member.id)); setAddingCall(true); setCallError(''); }}>
            <Plus size={16} /> Log Call
          </button>
        )}
      </div>

      {addingCall && (
        <form className="grid-form" style={{ marginTop: 16 }} onSubmit={async e => {
          e.preventDefault(); setCallError('');
          try {
            await createCallLog({ ...callForm, call_time: callForm.call_time || null, incident_number: callForm.incident_number || null, call_type: callForm.call_type || null, location: callForm.location || null, disposition: callForm.disposition || null, notes: callForm.notes || null });
            setAddingCall(false); await refresh();
          } catch (err) { setCallError(err.message); }
        }}>
          {callError && <div className="alert danger-text" style={{ gridColumn: 'span 4' }}>{callError}</div>}
          <label style={fLabel}>Date<input type="date" value={callForm.call_date} onChange={e => setCallForm(p => ({ ...p, call_date: e.target.value }))} required /></label>
          <label style={fLabel}>Time<input type="time" value={callForm.call_time} onChange={e => setCallForm(p => ({ ...p, call_time: e.target.value }))} /></label>
          <input placeholder="Incident #" value={callForm.incident_number} onChange={e => setCallForm(p => ({ ...p, incident_number: e.target.value }))} />
          <select value={callForm.call_type} onChange={e => setCallForm(p => ({ ...p, call_type: e.target.value }))}>
            <option value="">Call type…</option>{CALL_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <select value={callForm.disposition} onChange={e => setCallForm(p => ({ ...p, disposition: e.target.value }))}>
            <option value="">Disposition…</option>{DISPOSITIONS.map(d => <option key={d}>{d}</option>)}
          </select>
          <input className="span-2" placeholder="Location / Address" value={callForm.location} onChange={e => setCallForm(p => ({ ...p, location: e.target.value }))} />
          <input className="span-4" placeholder="Notes" value={callForm.notes} onChange={e => setCallForm(p => ({ ...p, notes: e.target.value }))} />
          <div style={{ gridColumn: 'span 4', display: 'flex', gap: 8 }}>
            <button className="primary"><Save size={16} /> Save Call</button>
            <button type="button" className="secondary" onClick={() => setAddingCall(false)}><X size={16} /> Cancel</button>
          </div>
        </form>
      )}

      {memberCalls.length === 0 && !addingCall
        ? <p className="muted-text" style={{ marginTop: 12 }}>No calls logged yet.</p>
        : <div className="table-wrap" style={{ marginTop: 16 }}>
          <table style={{ minWidth: 600 }}>
            <thead><tr><th>Date</th><th>Time</th><th>Incident #</th><th>Type</th><th>Location</th><th>Disposition</th><th>Notes</th><th>Actions</th></tr></thead>
            <tbody>{memberCalls.map(c => (
              <tr key={c.id}>
                <td><b>{c.call_date}</b></td>
                <td>{c.call_time || '—'}</td>
                <td>{c.incident_number || '—'}</td>
                <td>{c.call_type || '—'}</td>
                <td>{c.location || '—'}</td>
                <td>{c.disposition || '—'}</td>
                <td>{c.notes || ''}</td>
                <td><div className="actions">
                  {canDelete(profile.role) && (
                    <button className="icon" onClick={async () => {
                      if (!confirm(`Delete call on ${c.call_date}?`)) return;
                      await deleteCallLog(c.id); await refresh();
                    }}><X size={16} /></button>
                  )}
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>}
    </div>
  </div>;
}
