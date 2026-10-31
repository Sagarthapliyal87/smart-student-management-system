import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const DEMOS = [
  ['Admin', 'admin@college.edu'], ['Teacher', 'teacher@college.edu'],
  ['Student', 'student@college.edu'], ['Parent', 'parent@college.edu'],
];

export default function Login() {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to={`/${user.role.toLowerCase()}`} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) { setError('Please enter your email and password.'); return; }
    setBusy(true);
    const result = await login(email.trim(), password);
    setBusy(false);
    if (result.success) navigate(`/${result.user.role.toLowerCase()}`, { replace: true });
    else setError(result.error);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-3">S</div>
          <h1 className="text-xl font-bold text-gray-900">Smart Student Management System</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
        </div>
        <form onSubmit={submit} className="card space-y-4" noValidate>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{error}</div>}
          <div>
            <label className="label">Email</label>
            <input type="email" className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@college.edu" autoComplete="email" />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
          </div>
          <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? 'Signing in...' : 'Sign in'}</button>
          <p className="text-xs text-gray-400 text-center">Accounts are created by your administrator.</p>
        </form>
        <div className="card mt-4 text-xs text-gray-500">
          <p className="font-medium text-gray-600 mb-2">Demo accounts (password: Password123!)</p>
          <div className="flex flex-wrap gap-2">
            {DEMOS.map(([label, mail]) => (
              <button key={mail} type="button" className="btn-secondary !py-1 !px-2 !text-xs" onClick={() => { setEmail(mail); setPassword('Password123!'); }}>{label}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
