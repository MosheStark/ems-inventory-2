import { useMemo, useState } from 'react';
import { Eye, Mail, Pencil, Phone, Plus, Save, Trash2, X } from 'lucide-react';
import { createMember, deleteMember, updateMember } from '../lib/api';
import { canDelete, canWrite } from '../lib/utils';
import MemberDetail from './MemberDetail';

const STATUSES = ['Primary', 'Backup', 'Observer', 'Trainee', 'Inactive'];
const CERT_LEVELS = ['None', 'Lay Responder', 'First Responder', 'EMT-B', 'AEMT', 'Paramedic', 'Other'];

const STATUS_BADGE = {
  Primary: 'badge success',
  Backup: 'badge caution',
  Observer: 'badge',
  Trainee: 'badge warning',
  Inactive: 'badge muted',
};

const blank = {
  first_name: '', last_name: '', email: '', phone: '',
  address: '', city: '', state: '', zip: '',
  date_of_birth: '', date_joined: '',
  cert_level: 'None', cert_number: '', cert_expiration: '',
  emergency_contact_name: '', emergency_contact_phone: '',
  status: 'Trainee', notes: '',
  avatar_url: '', number_of_calls: 0, oos: false,
};

function coerceDates(m) {
  return { ...m, date_of_birth: m.date_of_birth || null, date_joined: m.date_joined || null, cert_expiration: m.cert_expiration || null };
}

const sectionHead = {
  gridColumn: 'span 4', fontSize: 12, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '.05em', color: '#64748b',
  borderTop: '1px solid #e2e8f0', paddingTop: 10, marginTop: 4,
};
const fLabel = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, color: '#64748b' };

function Avatar({ url, name, size = 32 }) {
  const initials = name ? name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : '?';
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', background: '#e2e8f0', display: 'grid', placeItems: 'center', flexShrink: 0, fontSize: size / 3, fontWeight: 700, color: '#64748b' }}>
      {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} /> : initials}
    </div>
  );
}

export default function Members({ members, profile, refresh }) {
  const [detailId, setDetailId] = useState(null);
  const [form, setForm] = useState(blank);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [outreachStatus, setOutreachStatus] = useState('All');
  const [outreachSubject, setOutreachSubject] = useState('');
  const [showPhones, setShowPhones] = useState(false);
  const mayWrite = canWrite(profile.role);

  const filtered = useMemo(() =>
    members.filter(m => {
      const text = [m.first_name, m.last_name, m.email, m.phone, m.cert_level, m.cert_number].join(' ').toLowerCase();
      return (!query || text.includes(query.toLowerCase())) &&
        (statusFilter === 'All' || m.status === statusFilter);
    }).sort((a, b) => `${a.last_name}${a.first_name}`.localeCompare(`${b.last_name}${b.first_name}`)),
  [members, query, statusFilter]);

  const outreachFiltered = useMemo(() =>
    members.filter(m => outreachStatus === 'All' || m.status === outreachStatus),
  [members, outreachStatus]);

  // Show detail view
  const detailMember = detailId ? members.find(m => m.id === detailId) : null;
  if (detailId && !detailMember) { setDetailId(null); return null; }
  if (detailMember) return <MemberDetail member={detailMember} profile={profile} refresh={refresh} onBack={() => setDetailId(null)} />;

  function setField(f, v) { setForm(p => ({ ...p, [f]: v })); }

  async function add(e) {
    e.preventDefault(); setError('');
    try { await createMember(coerceDates(form)); setForm(blank); await refresh(); }
    catch (err) { setError(err.message); }
  }

  async function saveEdit() {
    setError('');
    try { await updateMember(editing.id, coerceDates(editing)); setEditing(null); await refresh(); }
    catch (err) { setError(err.message); }
  }

  async function remove(m) {
    if (!confirm(`Delete ${m.first_name} ${m.last_name}?`)) return;
    await deleteMember(m.id, `${m.first_name} ${m.last_name}`);
    await refresh();
  }

  function emailMembers() {
    const emails = outreachFiltered.filter(m => m.email).map(m => m.email).join(',');
    if (!emails) return alert('No email addresses found for selected group.');
    const subject = outreachSubject ? `?subject=${encodeURIComponent(outreachSubject)}` : '';
    window.open(`mailto:${emails}${subject}`, '_blank');
  }

  function copyPhones() {
    const lines = outreachFiltered.filter(m => m.phone)
      .map(m => `${m.first_name} ${m.last_name} (${m.status}): ${m.phone}`)
      .join('\n');
    if (!lines) return alert('No phone numbers found for selected group.');
    navigator.clipboard.writeText(lines).then(() => alert('Phone numbers copied to clipboard.'));
  }

  return <div className="stack">
    {/* Add form */}
    <div className="card">
      <h2>Add Member</h2>
      {error && <div className="alert danger-text">{error}</div>}
      <form className="grid-form" onSubmit={add}>
        <div style={sectionHead}>Contact Information</div>
        <input disabled={!mayWrite} placeholder="First name" value={form.first_name} onChange={e => setField('first_name', e.target.value)} required />
        <input disabled={!mayWrite} placeholder="Last name" value={form.last_name} onChange={e => setField('last_name', e.target.value)} required />
        <input disabled={!mayWrite} placeholder="Email" type="email" value={form.email} onChange={e => setField('email', e.target.value)} />
        <input disabled={!mayWrite} placeholder="Phone" value={form.phone} onChange={e => setField('phone', e.target.value)} />
        <input disabled={!mayWrite} className="span-4" placeholder="Address" value={form.address} onChange={e => setField('address', e.target.value)} />
        <input disabled={!mayWrite} placeholder="City" value={form.city} onChange={e => setField('city', e.target.value)} />
        <input disabled={!mayWrite} placeholder="State" value={form.state} onChange={e => setField('state', e.target.value)} />
        <input disabled={!mayWrite} placeholder="ZIP" value={form.zip} onChange={e => setField('zip', e.target.value)} />
        <select disabled={!mayWrite} value={form.status} onChange={e => setField('status', e.target.value)}>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>

        <div style={sectionHead}>EMS Information</div>
        <label style={fLabel}>Date of Birth<input disabled={!mayWrite} type="date" value={form.date_of_birth} onChange={e => setField('date_of_birth', e.target.value)} /></label>
        <label style={fLabel}>Date Joined<input disabled={!mayWrite} type="date" value={form.date_joined} onChange={e => setField('date_joined', e.target.value)} /></label>
        <select disabled={!mayWrite} value={form.cert_level} onChange={e => setField('cert_level', e.target.value)}>
          {CERT_LEVELS.map(l => <option key={l}>{l}</option>)}
        </select>
        <input disabled={!mayWrite} placeholder="Cert. number" value={form.cert_number} onChange={e => setField('cert_number', e.target.value)} />
        <label style={fLabel}>Cert. Expiration<input disabled={!mayWrite} type="date" value={form.cert_expiration} onChange={e => setField('cert_expiration', e.target.value)} /></label>
        <input disabled={!mayWrite} className="span-2" placeholder="Emergency contact name" value={form.emergency_contact_name} onChange={e => setField('emergency_contact_name', e.target.value)} />
        <input disabled={!mayWrite} placeholder="Emergency contact phone" value={form.emergency_contact_phone} onChange={e => setField('emergency_contact_phone', e.target.value)} />

        <div style={sectionHead}>Profile & Stats</div>
        <input disabled={!mayWrite} className="span-2" placeholder="Photo URL (https://...)" value={form.avatar_url} onChange={e => setField('avatar_url', e.target.value)} />
        <input disabled={!mayWrite} type="number" min="0" placeholder="Number of calls" value={form.number_of_calls} onChange={e => setField('number_of_calls', Number(e.target.value))} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 12, cursor: 'pointer', opacity: mayWrite ? 1 : 0.55 }}>
          <input type="checkbox" disabled={!mayWrite} checked={form.oos} onChange={e => setField('oos', e.target.checked)} /> Out of Service
        </label>

        <input disabled={!mayWrite} className="span-4" placeholder="Notes" value={form.notes} onChange={e => setField('notes', e.target.value)} />
        <button disabled={!mayWrite} className="primary span-4"><Plus size={16} /> Add Member</button>
      </form>
    </div>

    {/* Filters */}
    <div className="card filters">
      <input placeholder="Search members" value={query} onChange={e => setQuery(e.target.value)} />
      <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
        <option>All</option>
        {STATUSES.map(s => <option key={s}>{s}</option>)}
      </select>
    </div>

    {/* Table */}
    <div className="card table-wrap">
      <table>
        <thead><tr>
          <th>Name</th><th>Status</th><th>Contact</th>
          <th>Certification</th><th>Cert Exp.</th><th>Calls</th><th>Actions</th>
        </tr></thead>
        <tbody>{filtered.map(m => {
          const row = editing?.id === m.id ? editing : m;
          return <tr key={m.id}>
            <td>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar url={m.avatar_url} name={`${m.first_name} ${m.last_name}`} />
                <div>
                  {editing?.id === m.id
                    ? <><input value={row.first_name} onChange={e => setEditing({ ...row, first_name: e.target.value })} /><input value={row.last_name} onChange={e => setEditing({ ...row, last_name: e.target.value })} /></>
                    : <><b>{m.first_name} {m.last_name}</b>{m.date_joined && <small>Joined {new Date(m.date_joined + 'T00:00:00').toLocaleDateString()}</small>}</>}
                </div>
              </div>
            </td>
            <td>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {editing?.id === m.id
                  ? <select value={row.status} onChange={e => setEditing({ ...row, status: e.target.value })}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select>
                  : <span className={STATUS_BADGE[m.status] || 'badge'}>{m.status}</span>}
                {!editing && m.oos && <span className="badge danger">OOS</span>}
                {editing?.id === m.id && <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!row.oos} onChange={e => setEditing({ ...row, oos: e.target.checked })} /> OOS
                </label>}
              </div>
            </td>
            <td>
              {editing?.id === m.id
                ? <><input value={row.email || ''} onChange={e => setEditing({ ...row, email: e.target.value })} /><input value={row.phone || ''} onChange={e => setEditing({ ...row, phone: e.target.value })} /></>
                : <>{m.email || '—'}<small>{m.phone || ''}</small></>}
            </td>
            <td>
              {editing?.id === m.id
                ? <><select value={row.cert_level || 'None'} onChange={e => setEditing({ ...row, cert_level: e.target.value })}>{CERT_LEVELS.map(l => <option key={l}>{l}</option>)}</select>
                  <input value={row.cert_number || ''} onChange={e => setEditing({ ...row, cert_number: e.target.value })} /></>
                : <>{m.cert_level || '—'}<small>{m.cert_number || ''}</small></>}
            </td>
            <td>
              {editing?.id === m.id
                ? <input type="date" value={row.cert_expiration || ''} onChange={e => setEditing({ ...row, cert_expiration: e.target.value })} />
                : m.cert_expiration || 'N/A'}
            </td>
            <td>
              {editing?.id === m.id
                ? <input type="number" min="0" style={{ width: 70 }} value={row.number_of_calls ?? 0} onChange={e => setEditing({ ...row, number_of_calls: Number(e.target.value) })} />
                : m.number_of_calls || 0}
            </td>
            <td><div className="actions">
              <button className="icon" title="View profile" onClick={() => setDetailId(m.id)}><Eye size={16} /></button>
              {editing?.id === m.id
                ? <><button className="icon" onClick={saveEdit}><Save size={16} /></button><button className="icon" onClick={() => setEditing(null)}><X size={16} /></button></>
                : <><button className="icon" disabled={!mayWrite} onClick={() => setEditing(m)}><Pencil size={16} /></button>
                  <button className="icon" disabled={!canDelete(profile.role)} onClick={() => remove(m)}><Trash2 size={16} /></button></>}
            </div></td>
          </tr>;
        })}</tbody>
      </table>
    </div>

    {/* Outreach */}
    <div className="card">
      <h2>Outreach</h2>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 12 }}>
        <label style={fLabel}>Filter by Status
          <select value={outreachStatus} onChange={e => { setOutreachStatus(e.target.value); setShowPhones(false); }}>
            <option>All</option>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label style={{ ...fLabel, flex: 1, minWidth: 180 }}>Subject (email)
          <input value={outreachSubject} onChange={e => setOutreachSubject(e.target.value)} placeholder="e.g. EMS Training Update" />
        </label>
        <button className="secondary" onClick={emailMembers} style={{ alignSelf: 'flex-end' }}>
          <Mail size={16} /> Email {outreachStatus === 'All' ? 'All' : outreachStatus} Members ({outreachFiltered.filter(m => m.email).length})
        </button>
        <button className="secondary" onClick={() => setShowPhones(p => !p)} style={{ alignSelf: 'flex-end' }}>
          <Phone size={16} /> {showPhones ? 'Hide' : 'Show'} Phone Numbers ({outreachFiltered.filter(m => m.phone).length})
        </button>
        {showPhones && <button className="secondary" onClick={copyPhones} style={{ alignSelf: 'flex-end' }}>Copy All</button>}
      </div>
      {showPhones && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
          {outreachFiltered.filter(m => m.phone).map(m => (
            <div key={m.id} style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 12, background: '#f8fafc' }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{m.first_name} {m.last_name}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{m.status}</div>
              <a href={`tel:${m.phone}`} style={{ fontSize: 14, color: '#2563eb', textDecoration: 'none' }}>{m.phone}</a>
            </div>
          ))}
          {outreachFiltered.filter(m => m.phone).length === 0 && <p className="muted-text">No phone numbers on file for this group.</p>}
        </div>
      )}
    </div>
  </div>;
}
