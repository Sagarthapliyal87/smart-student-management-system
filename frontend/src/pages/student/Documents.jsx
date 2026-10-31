import { useState } from 'react';
import { api, getErrorMessage, UPLOADS_BASE_URL } from '../../services/api';
import { useToast } from '../../components/Toast';
import useFetch from '../../hooks/useFetch';
import Loader from '../../components/Loader';
import ErrorBanner from '../../components/ErrorBanner';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import ConfirmDialog from '../../components/ConfirmDialog';

const CATEGORIES = ['ID Card', 'Certificate', 'Mark Sheet', 'Project', 'Other'];

export default function StudentDocuments() {
  const { showToast } = useToast();
  const { data, loading, error, reload } = useFetch('/documents/my');
  const [form, setForm] = useState({ title: '', category: CATEGORIES[0], file: null });
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const upload = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.file) return showToast('Please add a title and choose a file.', 'error');
    const fd = new FormData(); fd.append('title', form.title); fd.append('category', form.category); fd.append('file', form.file);
    setBusy(true);
    try { await api.post('/documents', fd); showToast('Document uploaded.'); setForm({ title: '', category: CATEGORIES[0], file: null }); e.target.reset(); reload(); }
    catch (err) { showToast(getErrorMessage(err), 'error'); } finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true);
    try { await api.delete(`/documents/${toDelete.id}`); showToast('Document deleted.'); setToDelete(null); reload(); }
    catch (err) { showToast(getErrorMessage(err), 'error'); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="My documents" subtitle="PDF, JPG or PNG up to 10 MB" />
      <form onSubmit={upload} className="card grid sm:grid-cols-4 gap-3 items-end">
        <div className="sm:col-span-2"><label className="label">Title</label><input className="input-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div><label className="label">Category</label><select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div><label className="label">File</label><input type="file" accept=".pdf,.jpg,.jpeg,.png" className="text-sm w-full" onChange={(e) => setForm({ ...form, file: e.target.files[0] })} /></div>
        <button className="btn-primary sm:col-span-4 sm:w-auto sm:justify-self-start" disabled={busy}>{busy ? 'Uploading...' : 'Upload document'}</button>
      </form>
      <div className="card">
        {loading ? <Loader /> : error ? <ErrorBanner message={error} onRetry={reload} /> : !data.length ? <EmptyState title="No documents uploaded yet" icon="📁" /> : (
          <ul className="space-y-3">{data.map((d) => (
            <li key={d.id} className="flex items-center justify-between border-b border-gray-50 last:border-0 pb-2">
              <div><p className="font-medium text-sm">{d.title}</p><p className="text-xs text-gray-400">{d.category} · {new Date(d.uploadedAt).toLocaleDateString()}</p></div>
              <div className="flex gap-4 text-sm"><a className="text-brand-600 underline" href={`${UPLOADS_BASE_URL}${d.filePath}`} target="_blank" rel="noreferrer">Open</a><button className="text-red-600 hover:underline" onClick={() => setToDelete(d)}>Delete</button></div>
            </li>
          ))}</ul>
        )}
      </div>
      <ConfirmDialog open={!!toDelete} message={`Delete "${toDelete?.title}"?`} confirmLabel="Delete" busy={busy} onConfirm={remove} onCancel={() => setToDelete(null)} />
    </>
  );
}
