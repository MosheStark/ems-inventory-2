import { useMemo, useState } from 'react';

const STATUSES = ['Primary', 'Backup', 'Observer', 'Trainee', 'Inactive'];

const STATUS_BADGE = {
  Primary: 'badge success',
  Backup: 'badge caution',
  Observer: 'badge',
  Trainee: 'badge warning',
  Inactive: 'badge muted',
};

const fLabel = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, color: '#64748b' };

function Bar({ value, max, color = '#2563eb' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width .3s' }} />
      </div>
      <span style={{ fontSize: 12, color: '#64748b', minWidth: 28, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function StatCard({ label, value, small }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '20px 16px' }}>
      <div style={{ fontSize: small ? 16 : 28, fontWeight: 700, color: '#0f172a', marginBottom: 4, lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
    </div>
  );
}

export default function Reports({ callLog, members }) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filtered = useMemo(() =>
    callLog.filter(c =>
      (!dateFrom || c.call_date >= dateFrom) &&
      (!dateTo || c.call_date <= dateTo)
    ),
  [callLog, dateFrom, dateTo]);

  const scopedMembers = useMemo(() =>
    statusFilter === 'All' ? members : members.filter(m => m.status === statusFilter),
  [members, statusFilter]);

  const memberStats = useMemo(() => {
    const map = {};
    for (const m of scopedMembers) {
      map[m.id] = { member: m, total: 0, types: {}, lastCall: null };
    }
    for (const c of filtered) {
      if (!map[c.member_id]) continue;
      map[c.member_id].total++;
      if (c.call_type) map[c.member_id].types[c.call_type] = (map[c.member_id].types[c.call_type] || 0) + 1;
      if (!map[c.member_id].lastCall || c.call_date > map[c.member_id].lastCall) {
        map[c.member_id].lastCall = c.call_date;
      }
    }
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filtered, scopedMembers]);

  const typeCounts = useMemo(() => {
    const map = {};
    for (const c of filtered) {
      const t = c.call_type || 'Unspecified';
      map[t] = (map[t] || 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const dispCounts = useMemo(() => {
    const map = {};
    for (const c of filtered) {
      const d = c.disposition || 'Unspecified';
      map[d] = (map[d] || 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const monthlyCounts = useMemo(() => {
    const map = {};
    for (const c of filtered) {
      const month = c.call_date?.slice(0, 7);
      if (month) map[month] = (map[month] || 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 24);
  }, [filtered]);

  const total = filtered.length;
  const activeMembers = memberStats.filter(s => s.total > 0).length;
  const maxCalls = memberStats[0]?.total || 0;
  const maxType = typeCounts[0]?.[1] || 0;
  const maxDisp = dispCounts[0]?.[1] || 0;
  const maxMonthly = monthlyCounts[0]?.[1] || 0;
  const hasFilters = dateFrom || dateTo || statusFilter !== 'All';

  return (
    <div className="stack">
      {/* Filters */}
      <div className="card" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={fLabel}>From<input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></label>
        <label style={fLabel}>To<input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></label>
        <label style={fLabel}>Member Status
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option>All</option>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </label>
        {hasFilters && (
          <button className="secondary" style={{ alignSelf: 'flex-end' }}
            onClick={() => { setDateFrom(''); setDateTo(''); setStatusFilter('All'); }}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
        <StatCard label="Total Calls" value={total} />
        <StatCard label="Active Members" value={activeMembers} />
        <StatCard label="Top Call Type" value={typeCounts[0]?.[0] || '—'} small />
        <StatCard label="Top Disposition" value={dispCounts[0]?.[0] || '—'} small />
      </div>

      {/* Per-member table */}
      <div className="card">
        <h2 style={{ marginBottom: 16 }}>Calls per Member</h2>
        {memberStats.length === 0
          ? <p className="muted-text">No members to show.</p>
          : <div className="table-wrap">
            <table>
              <thead><tr>
                <th>#</th><th>Member</th><th>Status</th>
                <th>Total</th><th style={{ minWidth: 160 }}>Activity</th>
                <th>Top Call Type</th><th>Last Call</th>
              </tr></thead>
              <tbody>{memberStats.map((s, i) => {
                const top = Object.entries(s.types).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
                return (
                  <tr key={s.member.id}>
                    <td style={{ color: '#94a3b8', fontWeight: 600 }}>{i + 1}</td>
                    <td><b>{s.member.last_name}, {s.member.first_name}</b></td>
                    <td><span className={STATUS_BADGE[s.member.status] || 'badge'}>{s.member.status}</span></td>
                    <td><b>{s.total}</b></td>
                    <td><Bar value={s.total} max={maxCalls} /></td>
                    <td style={{ fontSize: 13, color: '#64748b' }}>{top}</td>
                    <td style={{ fontSize: 13 }}>{s.lastCall || <span className="muted-text">—</span>}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>}
      </div>

      <div className="grid-2">
        {/* By call type */}
        <div className="card">
          <h2 style={{ marginBottom: 16 }}>By Call Type</h2>
          {typeCounts.length === 0
            ? <p className="muted-text">No data.</p>
            : <div className="stack" style={{ gap: 12 }}>
              {typeCounts.map(([type, count]) => (
                <div key={type}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{type}</span>
                    <span style={{ color: '#64748b' }}>{total > 0 ? Math.round(count / total * 100) : 0}%</span>
                  </div>
                  <Bar value={count} max={maxType} color="#0ea5e9" />
                </div>
              ))}
            </div>}
        </div>

        {/* By disposition */}
        <div className="card">
          <h2 style={{ marginBottom: 16 }}>By Disposition</h2>
          {dispCounts.length === 0
            ? <p className="muted-text">No data.</p>
            : <div className="stack" style={{ gap: 12 }}>
              {dispCounts.map(([disp, count]) => (
                <div key={disp}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{disp}</span>
                    <span style={{ color: '#64748b' }}>{total > 0 ? Math.round(count / total * 100) : 0}%</span>
                  </div>
                  <Bar value={count} max={maxDisp} color="#8b5cf6" />
                </div>
              ))}
            </div>}
        </div>

        {/* Monthly activity */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h2 style={{ marginBottom: 16 }}>Monthly Activity</h2>
          {monthlyCounts.length === 0
            ? <p className="muted-text">No data.</p>
            : <div className="stack" style={{ gap: 10 }}>
              {monthlyCounts.map(([month, count]) => {
                const [yr, mo] = month.split('-');
                const label = new Date(Number(yr), Number(mo) - 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
                return (
                  <div key={month}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600 }}>{label}</span>
                      <span style={{ color: '#64748b' }}>{count} call{count !== 1 ? 's' : ''}</span>
                    </div>
                    <Bar value={count} max={maxMonthly} color="#10b981" />
                  </div>
                );
              })}
            </div>}
        </div>
      </div>
    </div>
  );
}
