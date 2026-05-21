import { useState } from 'react';
import { Lock } from 'lucide-react';
import { signIn } from '../lib/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="login-icon"><Lock size={28} /></div>
        <h1>EMS Inventory</h1>
        <p>Authorized users only. Please sign in to access inventory records.</p>
        <form onSubmit={handleSubmit} className="form-stack">
          <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required /></label>
          <label>Password<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required /></label>
          {error && <div className="alert danger-text">{error}</div>}
          <button className="primary" disabled={busy}>{busy ? 'Signing in...' : 'Sign In'}</button>
        </form>
      </section>
    </main>
  );
}
