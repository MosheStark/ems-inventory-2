export function daysUntil(dateString) {
  if (!dateString) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateString + 'T00:00:00');
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

export function statusFor(item) {
  const expDays = daysUntil(item.expiration_date);
  if (!item.active) return { label: 'Inactive', className: 'badge muted', priority: 5 };
  if (expDays !== null && expDays < 0) return { label: 'Expired', className: 'badge danger', priority: 1 };
  if (Number(item.quantity) <= Number(item.min_quantity)) return { label: 'Low Stock', className: 'badge warning', priority: 2 };
  if (expDays !== null && expDays <= 60) return { label: 'Expiring Soon', className: 'badge caution', priority: 3 };
  return { label: 'OK', className: 'badge success', priority: 4 };
}

export function csvEscape(value) {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

export function downloadCsv(filename, rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map((row) => headers.map((h) => csvEscape(row[h])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function canWrite(role) {
  return role === 'admin' || role === 'supply';
}

export function canDelete(role) {
  return role === 'admin';
}
