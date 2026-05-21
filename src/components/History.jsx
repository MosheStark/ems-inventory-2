export default function History({ rows, type }) {
  return <div className="card"><h2>{type === 'audit' ? 'Audit Log' : 'Movement History'}</h2>{rows.length === 0 && <p>No records yet.</p>}<div className="stack small">{rows.map(r => <div className="timeline-row" key={r.id}><div><b>{r.action || r.movement_type} {r.items?.name ? `— ${r.items.name}` : ''}</b><p>{r.detail || `${r.movement_type}: ${r.quantity} (${r.previous_quantity} → ${r.new_quantity}) · ${r.note || 'No note'}`}</p><small>{new Date(r.created_at).toLocaleString()}</small></div></div>)}</div></div>;
}
