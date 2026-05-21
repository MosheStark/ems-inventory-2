import { useEffect, useState } from 'react';
import { LogOut, RefreshCcw, ShieldCheck } from 'lucide-react';
import { getAllData, getMyProfile, loadSession, onAuthChange, signOut } from './lib/api';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Members from './components/Members';
import Vehicles from './components/Vehicles';
import Checklists from './components/Checklists';
import Hospitals from './components/Hospitals';
import CallLog from './components/CallLog';
import StockAdjustments from './components/StockAdjustments';
import Alerts from './components/Alerts';
import History from './components/History';
import Settings from './components/Settings';
import Reports from './components/Reports';

const emptyData = { profiles: [], categories: [], locations: [], items: [], movements: [], auditLog: [], members: [], vehicles: [], checklists: [], hospitals: [], callLog: [] };

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [data, setData] = useState(emptyData);
  const [activeTab, setActiveTab] = useState('inventory');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSession().then(setSession).finally(() => setLoading(false));
    const { data: sub } = onAuthChange(setSession);
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) refresh();
    else { setProfile(null); setData(emptyData); }
  }, [session]);

  async function refresh() {
    setError(''); setLoading(true);
    try {
      const myProfile = await getMyProfile();
      const allData = await getAllData();
      setProfile(myProfile); setData(allData);
    } catch (err) {
      setError(err.message || 'Unable to load data. Confirm this user has a profile row and RLS policies are installed.');
    } finally { setLoading(false); }
  }

  if (loading && !profile) return <div className="loading">Loading EMS Inventory...</div>;
  if (!session) return <Login />;
  if (error && !profile) return <div className="login-shell"><div className="login-card"><h1>Access Not Authorized</h1><p>{error}</p><button className="primary" onClick={() => signOut()}>Sign Out</button></div></div>;
  if (!profile) return null;

  return <main className="app-shell">
    <header className="topbar">
      <img src="/images/MLH Logo 1.png" className="logo" />
      <div><p className="eyebrow">MAIN LINE HATZOLAH</p><h1>Inventory Management</h1><p>Supabase-backed, gated inventory system with role-based access and audit trails.</p></div>
      <div className="user-box"><ShieldCheck size={18}/><span>{profile.full_name}</span><b>{profile.role}</b><button className="secondary" onClick={refresh}><RefreshCcw size={16}/> Refresh</button><button className="secondary" onClick={() => signOut()}><LogOut size={16}/> Sign Out</button></div>
    </header>
    {error && <div className="alert danger-text">{error}</div>}
    <Dashboard items={data.items} />
    <nav className="tabs">{[['inventory','Inventory'],['members','Members'],['vehicles','Vehicles'],['hospitals','Hospitals'],['calllog','Call Log'],['checklists','Checklists'],['adjust','Adjust Stock'],['alerts','Alerts'],['history','Movement History'],['audit','Audit Log'],['reports','Reports'],['settings','Settings']].map(([k,l]) => <button key={k} className={activeTab===k?'active':''} onClick={() => setActiveTab(k)}>{l}</button>)}</nav>
    {activeTab === 'inventory' && <Inventory data={data} profile={profile} refresh={refresh} />}
    {activeTab === 'members' && <Members members={data.members} callLog={data.callLog} profile={profile} refresh={refresh} />}
    {activeTab === 'calllog' && <CallLog callLog={data.callLog} members={data.members} profile={profile} refresh={refresh} />}
    {activeTab === 'vehicles' && <Vehicles vehicles={data.vehicles} profile={profile} refresh={refresh} />}
    {activeTab === 'hospitals' && <Hospitals hospitals={data.hospitals} profile={profile} refresh={refresh} />}
    {activeTab === 'checklists' && <Checklists checklists={data.checklists} profile={profile} refresh={refresh} />}
    {activeTab === 'adjust' && <StockAdjustments data={data} profile={profile} refresh={refresh} />}
    {activeTab === 'alerts' && <Alerts items={data.items} />}
    {activeTab === 'history' && <History rows={data.movements} />}
    {activeTab === 'audit' && <History rows={data.auditLog} type="audit" />}
    {activeTab === 'reports' && <Reports callLog={data.callLog} members={data.members} />}
    {activeTab === 'settings' && <Settings data={data} profile={profile} refresh={refresh} />}
  </main>;
}
