import { useState } from 'react';
import { createCategory, createLocation, updateProfileRole } from '../lib/api';
import { canWrite } from '../lib/utils';

export default function Settings({ data, profile, refresh }) {
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');
  const mayWrite = canWrite(profile.role);
  const isAdmin = profile.role === 'admin';

  async function addCategory() {
    try { await createCategory(category.trim()); setCategory(''); await refresh(); } catch (err) { setError(err.message); }
  }
  async function addLocation() {
    try { await createLocation(location.trim()); setLocation(''); await refresh(); } catch (err) { setError(err.message); }
  }
  async function setRole(id, role) {
    try { await updateProfileRole(id, role); await refresh(); } catch (err) { setError(err.message); }
  }

  return <div className="grid-2">
    {error && <div className="alert danger-text span-2">{error}</div>}
    <div className="card"><h2>Categories</h2><div className="inline-form"><input disabled={!mayWrite} value={category} onChange={e => setCategory(e.target.value)} placeholder="New category"/><button disabled={!mayWrite || !category.trim()} onClick={addCategory}>Add</button></div><div className="chips">{data.categories.map(c => <span key={c.id}>{c.name}</span>)}</div></div>
    <div className="card"><h2>Locations</h2><div className="inline-form"><input disabled={!mayWrite} value={location} onChange={e => setLocation(e.target.value)} placeholder="New location"/><button disabled={!mayWrite || !location.trim()} onClick={addLocation}>Add</button></div><div className="chips">{data.locations.map(l => <span key={l.id}>{l.name}</span>)}</div></div>
    <div className="card span-2"><h2>Authorized Users</h2><p className="muted-text">Only users with a row in <code>profiles</code> can access inventory data. Admins can change roles here.</p><table><thead><tr><th>Name</th><th>Role</th><th>Created</th></tr></thead><tbody>{data.profiles.map(p => <tr key={p.id}><td>{p.full_name}</td><td><select disabled={!isAdmin || p.id === profile.id} value={p.role} onChange={e => setRole(p.id, e.target.value)}><option value="admin">admin</option><option value="supply">supply</option><option value="member">member</option></select></td><td>{new Date(p.created_at).toLocaleDateString()}</td></tr>)}</tbody></table></div>
  </div>;
}
