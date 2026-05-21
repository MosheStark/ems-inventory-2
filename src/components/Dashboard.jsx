import { AlertTriangle, CalendarClock, ClipboardList, Package } from 'lucide-react';
import { statusFor } from '../lib/utils';

export default function Dashboard({ items }) {
  const active = items.filter((i) => i.active);
  const totalQty = active.reduce((sum, i) => sum + Number(i.quantity || 0), 0);
  const low = active.filter((i) => statusFor(i).label === 'Low Stock').length;
  const expiring = active.filter((i) => statusFor(i).label === 'Expiring Soon').length;
  const expired = active.filter((i) => statusFor(i).label === 'Expired').length;

  return (
    <div className="metric-grid">
      <Metric title="Active Items" value={active.length} icon={<Package />} />
      <Metric title="Total Units" value={totalQty} icon={<ClipboardList />} />
      <Metric title="Low Stock" value={low} icon={<AlertTriangle />} />
      <Metric title="Expiring ≤ 60 Days" value={expiring} icon={<CalendarClock />} />
      <Metric title="Expired" value={expired} icon={<AlertTriangle />} />
    </div>
  );
}

function Metric({ title, value, icon }) {
  return <div className="card metric"><div><p>{title}</p><strong>{value}</strong></div><span>{icon}</span></div>;
}
