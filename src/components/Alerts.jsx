import { statusFor, daysUntil } from '../lib/utils';

export default function Alerts({ items }) {
  const alerts = items.filter(i => ['Expired', 'Low Stock', 'Expiring Soon'].includes(statusFor(i).label));
  return <div className="card"><h2>Operational Alerts</h2>{alerts.length === 0 && <p className="success-text">No active inventory alerts.</p>}<div className="stack small">{alerts.map(item => { const status = statusFor(item); const days = daysUntil(item.expiration_date); return <div className="alert-row" key={item.id}><div><b>{item.name}</b><p>{item.locations?.name} · Qty {item.quantity} {item.unit} · Min {item.min_quantity} · Expiration {item.expiration_date || 'N/A'}{days !== null ? ` · ${days} days` : ''}</p></div><span className={status.className}>{status.label}</span></div> })}</div></div>;
}
