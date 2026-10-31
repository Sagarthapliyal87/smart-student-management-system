import { useState } from 'react';
import { api, getErrorMessage } from '../services/api';
import { useToast } from './Toast';

/** Reusable AI tool card: renders children as the form, runs `run()` and shows the result. */
export function AIStatusBanner({ configured }) {
  if (configured !== false) return null;
  return (
    <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm">
      AI is not configured yet. Ask the administrator to set <code className="font-mono">AI_API_KEY</code> in <code className="font-mono">backend/.env</code> and restart the backend. The rest of the app works normally.
    </div>
  );
}

export default function AIBox({ title, description, submitLabel = 'Generate', disabled, buildRequest, children }) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');

  const run = async (e) => {
    e.preventDefault();
    const req = buildRequest();
    if (req.error) return showToast(req.error, 'error');
    setBusy(true); setResult('');
    try {
      const res = req.method === 'GET' ? await api.get(req.url) : await api.post(req.url, req.body);
      setResult(res.data.result);
    } catch (err) { showToast(getErrorMessage(err), 'error'); }
    finally { setBusy(false); }
  };

  return (
    <form onSubmit={run} className="card space-y-3">
      <div><h2 className="font-semibold text-gray-800">{title}</h2><p className="text-sm text-gray-500">{description}</p></div>
      {children}
      <button className="btn-primary" disabled={busy || disabled}>{busy ? 'Working...' : submitLabel}</button>
      {result && <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed">{result}</div>}
    </form>
  );
}
