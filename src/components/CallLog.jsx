import { useMemo, useState } from 'react';
import { Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { createCallLog, deleteCallLog, updateCallLog } from '../lib/api';
import { canDelete, canWrite } from '../lib/utils';

export const CALL_TYPES = ['Medical Emergency', 'Cardiac Arrest', 'Trauma', 'MVA', 'Fire / Rescue', 'Standby', 'Transfer', 'Other'];
export const DISPOSITIONS = ['Transported', 'Treated & Refused', 'DOA', 'Cancelled', 'No Patient Found', 'Assist Only', 'Other'];

const fLabel = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, color: '#64748b' };

function blankEntry(memberId = '') {
  return {
    member_id: memberId,
    call_date: new Date().toISOString().slice(0, 10),
    call_time: '',
    incident_number: '',
    call_type: '',
    location: '',
    disposition: '',
    notes: '',
  };
}

function coerce(e) {
  return {
    ...e,
    call_time: e.call_time || null,
    incident_number: e.incident_number || null,
    call_type: e.call_type || null,
    location: e.location || null,
    disposition: e.disposition || null,
    notes: e.notes || null,
  };
}

export default function CallLog({ callLog, members, profile, refresh }) {
  const [form, setForm] = useState(blankEntry());
  const [memberFilter, setMemberFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const mayWrite = canWrite(profile.role);

  const filtered = useMemo(() => callLog.filter(c =>
    (!memberFilter || c.member_id === memberFilter) &&
    (!typeFilter || c.call_type === typeFilter) &&
    (!dateFrom || c.call_date >= dateFrom) &&
    (!dateTo || c.call_date <= dateTo)
  ), [callLog, memberFilter, typeFilter, dateFrom, dateTo]);

  function setField(f, v) { setForm(p => ({ ...p, [f]: v })); }

  async function add(e) {
    e.preventDefault(); setError('');
    try { await createCallLog(coerce(form)); setForm(blankEntry()); await refresh(); }
    catch (err) { setError(err.message); }
  }

  async function saveEdit() {
    setError('');
    try { await updateCallLog(editing.id, coerce(editing)); setEditing(null); await refresh(); }
    catch (err) { setError(err.message); }
  }

  async function remove(c) {
    const name = c.members ? `${c.members.first_name} ${c.members.last_name}` : 'this member';
    if (!confirm(`Delete call log entry for ${name} on ${c.call_date}?`)) return;
    await deleteCallLog(c.id);
    await refresh();
  }

  const sortedMembers = [...members].sort((a, b) => a.last_name.localeCompare(b.last_name));

  return <div className="stack">
    {/* Add form */}
    <div className="card">
      <h2>Log a Call</h2>
      {error && <div className="alert danger-text">{error}</div>}
      <form className="grid-form" onSubmit={add}>
        <select disabled={!mayWrite} value={form.member_id} onChange={e => setField('member_id', e.target.value)} required>
          <option value="">Select member…</option>
          {sortedMembers.map(m => <option key={m.id} value={m.id}>{m.last_name}, {m.first_name} ({m.status})</option>)}
        </select>
        <label style={fLabel}>Date<input disabled={!mayWrite} type="date" value={form.call_date} onChange={e => setField('call_date', e.target.value)} required /></label>
        <label style={fLabel}>Time<input disabled={!mayWrite} type="time" value={form.call_time} onChange={e => setField('call_time', e.target.value)} /></label>
        <input disabled={!mayWrite} placeholder="Incident #" value={form.incident_number} onChange={e => setField('incident_number', e.target.value)} />
        <select disabled={!mayWrite} value={form.call_type} onChange={e => setField('call_type', e.target.value)}>
          <option value="">Call type…</option>
          {CALL_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <select disabled={!mayWrite} value={form.disposition} onChange={e => setField('disposition', e.target.value)}>
          <option value="">Disposition…</option>
          {DISPOSITIONS.map(d => <option key={d}>{d}</option>)}
        </select>
        <input disabled={!mayWrite} className="span-2" placeholder="Location / Address" value={form.location} onChange={e => setField('location', e.target.value)} />
        <input disabled={!mayWrite} className="span-4" placeholder="Notes" value={form.notes} onChange={e => setField('notes', e.target.value)} />
        <button disabled={!mayWrite} className="primary span-4"><Plus size={16} /> Log Call</button>
      </form>
    </div>

    {/* Filters */}
    <div className="card" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12 }}>
      <select value={memberFilter} onChange={e => setMemberFilter(e.target.value)}>
        <option value="">All Members</option>
        {sortedMembers.map(m => <option key={m.id} value={m.id}>{m.last_name}, {m.first_name}</option>)}
      </select>
      <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
        <option value="">All Types</option>
        {CALL_TYPES.map(t => <option key={t}>{t}</option>)}
      </select>
      <label style={fLabel}>From<input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></label>
      <label style={fLabel}>To<input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></label>
    </div>

    <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '0 4px' }}>
      <span className="muted-text" style={{ fontSize: 14 }}>{filtered.length} call{filtered.length !== 1 ? 's' : ''} shown</span>
      {(memberFilter || typeFilter || dateFrom || dateTo) &&
        <button className="secondary" style={{ fontSize: 13, padding: '6px 12px' }}
          onClick={() => { setMemberFilter(''); setTypeFilter(''); setDateFrom(''); setDateTo(''); }}>
          Clear Filters
        </button>}
    </div>

    {/* Table */}
    <div className="card table-wrap">
      <table>
        <thead><tr>
          <th>Date / Time</th><th>Member</th><th>Incident #</th>
          <th>Type</th><th>Location</th><th>Disposition</th><th>Notes</th><th>Actions</th>
        </tr></thead>
        <tbody>{filtered.map(c => {
          const row = editing?.id === c.id ? editing : c;
          const memberName = c.members ? `${c.members.last_name}, ${c.members.first_name}` : '—';
          return <tr key={c.id}>
            <td>
              {editing?.id === c.id
                ? <><input type="date" value={row.call_date || ''} onChange={e => setEditing({ ...row, call_date: e.target.value })} />
                  <input type="time" value={row.call_time || ''} onChange={e => setEditing({ ...row, call_time: e.target.value })} /></>
                : <><b>{c.call_date}</b><small>{c.call_time || ''}</small></>}
            </td>
            <td>
              {editing?.id === c.id
                ? <select value={row.member_id} onChange={e => setEditing({ ...row, member_id: e.target.value })}>
                  {sortedMembers.map(m => <option key={m.id} value={m.id}>{m.last_name}, {m.first_name}</option>)}
                </select>
                : memberName}
            </td>
            <td>
              {editing?.id === c.id
                ? <input value={row.incident_number || ''} onChange={e => setEditing({ ...row, incident_number: e.target.value })} />
                : c.incident_number || '—'}
            </td>
            <td>
              {editing?.id === c.id
                ? <select value={row.call_type || ''} onChange={e => setEditing({ ...row, call_type: e.target.value })}>
                  <option value="">—</option>{CALL_TYPES.map(t => <option key={t}>{t}</option>)}</select>
                : c.call_type || '—'}
            </td>
            <td>
              {editing?.id === c.id
                ? <input value={row.location || ''} onChange={e => setEditing({ ...row, location: e.target.value })} />
                : c.location || '—'}
            </td>
            <td>
              {editing?.id === c.id
                ? <select value={row.disposition || ''} onChange={e => setEditing({ ...row, disposition: e.target.value })}>
                  <option value="">—</option>{DISPOSITIONS.map(d => <option key={d}>{d}</option>)}</select>
                : c.disposition || '—'}
            </td>
            <td>
              {editing?.id === c.id
                ? <input value={row.notes || ''} onChange={e => setEditing({ ...row, notes: e.target.value })} />
                : c.notes || ''}
            </td>
            <td><div className="actions">
              {editing?.id === c.id
                ? <><button className="icon" onClick={saveEdit}><Save size={16} /></button><button className="icon" onClick={() => setEditing(null)}><X size={16} /></button></>
                : <><button className="icon" disabled={!mayWrite} onClick={() => setEditing(c)}><Pencil size={16} /></button>
                  <button className="icon" disabled={!canDelete(profile.role)} onClick={() => remove(c)}><Trash2 size={16} /></button></>}
            </div></td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  </div>;
}
