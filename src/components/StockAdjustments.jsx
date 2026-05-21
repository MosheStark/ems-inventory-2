import { useState } from 'react';
import { Save } from 'lucide-react';
import { applyStockMovement } from '../lib/api';
import { canWrite } from '../lib/utils';

export default function StockAdjustments({ data, profile, refresh }) {
  const [itemId, setItemId] = useState('');
  const [movementType, setMovementType] = useState('restock');
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const mayWrite = canWrite(profile.role);

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      await applyStockMovement(itemId, movementType, quantity, note);
      setItemId(''); setMovementType('restock'); setQuantity(1); setNote('');
      await refresh();
    } catch (err) { setError(err.message); }
  }

  return <div className="card">
    <h2>Adjust Stock</h2>
    {error && <div className="alert danger-text">{error}</div>}
    <form className="grid-form" onSubmit={submit}>
      <select disabled={!mayWrite} className="span-2" value={itemId} onChange={(e) => setItemId(e.target.value)} required>
        <option value="">Select item</option>
        {data.items.filter(i => i.active).map(i => <option key={i.id} value={i.id}>{i.name} — {i.locations?.name} — current: {i.quantity}</option>)}
      </select>
      <select disabled={!mayWrite} value={movementType} onChange={(e) => setMovementType(e.target.value)}>
        <option value="restock">Restock / Received</option>
        <option value="usage">Used on Call/Event</option>
        <option value="discard">Discard / Expired</option>
        <option value="correction">Correction / Found</option>
      </select>
      <input disabled={!mayWrite} type="number" min="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
      <input disabled={!mayWrite} className="span-4" placeholder="Reason / note" value={note} onChange={(e) => setNote(e.target.value)} />
      <button disabled={!mayWrite || !itemId} className="primary span-4"><Save size={16}/> Apply Adjustment</button>
    </form>
  </div>;
}
