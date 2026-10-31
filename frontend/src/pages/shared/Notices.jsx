import { useState } from 'react';
import { api, getErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import useFetch from '../../hooks/useFetch';
import Loader from '../../components/Loader';
import ErrorBanner from '../../components/ErrorBanner';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { usePagination } from '../../components/Pagination';

const EMPTY = { title: '', content: '', targetRole: 'ALL', targetClassId: '' };

export default function Notices() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const { data: notices, loading, error, reload } = useFetch(`/notices${search ? `?search=${encodeURIComponent(search)}` : ''}`);
  const { data: classes } = useFetch(user.role === 'ADMIN' || user.role === 'TEACHER' ? '/academics/classes' : null);
  const canPost = user.role === 'ADMIN' || user.role === 'TEACHER';
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const { pageRows, controls } = usePagination(notices, 8);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return showToast('Title and content are required.', 'error');
    setBusy(true);
    try {
      await api.post('/notices', form);
      showToast('Notice published.'); setOpen(false); setForm(EMPTY); reload();
    } catch (err) { showToast(getErrorMessage(err), 'error'); } finally { setBusy(false); }
  };

  const remove = async () => {
    setBusy(true);
    try { await api.delete(`/notices/${toDelete.id}`); showToast('Notice deleted.'); setToDelete(null); reload(); }
    catch (err) { showToast(getErrorMessage(err), 'error'); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Notices" subtitle="Announcements relevant to you"
        action={canPost && <button className="btn-primary" onClick={() => setOpen(true)}>+ New notice</button>} />
      <input className="input-field max-w-sm" placeholder="Search notices..." value={search} onChange={(e) => setSearch(e.target.value)} />
      {loading ? <Loader label="Loading notices..." /> : error ? <ErrorBanner message={error} onRetry={reload} /> : !notices?.length ? (
        <div className="card"><EmptyState title="No notices found" icon="🔔" /></div>
      ) : (
        <div className="space-y-3">
          {pageRows.map((n) => (
            <div key={n.id} className="card">
              <div className="flex justify-between items-start gap-3">
                <p className="font-semibold text-gray-800">{n.title}</p>
                <span className="text-xs text-gray-400 whitespace-nowrap">{new Date(n.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{n.content}</p>
              <div className="flex justify-between items-center mt-3 text-xs text-gray-400">
                <span>Posted by {n.postedBy.name} · For {n.targetClass ? `${n.targetClass.course.name} Sem ${n.targetClass.semester} ${n.targetClass.section}` : n.targetRole === 'ALL' ? 'everyone' : n.targetRole.toLowerCase() + 's'}</span>
                {canPost && (user.role === 'ADMIN' || n.postedBy.id === user.id) && (
                  <button className="text-red-600 hover:underline" onClick={() => setToDelete(n)}>Delete</button>
                )}
              </div>
            </div>
          ))}
          {controls}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Publish a notice">
        <form onSubmit={submit} className="space-y-4">
          <div><label className="label">Title</label><input className="input-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><label className="label">Content</label><textarea rows={4} className="input-field" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Audience</label>
              <select className="input-field" value={form.targetRole} onChange={(e) => setForm({ ...form, targetRole: e.target.value })}>
                <option value="ALL">Everyone</option><option value="STUDENT">Students</option><option value="TEACHER">Teachers</option><option value="PARENT">Parents</option>
              </select></div>
            <div><label className="label">Only for class (optional)</label>
              <select className="input-field" value={form.targetClassId} onChange={(e) => setForm({ ...form, targetClassId: e.target.value })}>
                <option value="">All classes</option>
                {(classes || []).map((c) => <option key={c.id} value={c.id}>{c.course.name} Sem {c.semester} {c.section}</option>)}
              </select></div>
          </div>
          <p className="text-xs text-gray-400">Selecting a class sends the notice to the students of that class.</p>
          <div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary" disabled={busy}>{busy ? 'Publishing...' : 'Publish'}</button></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!toDelete} message={`Delete the notice "${toDelete?.title}"?`} confirmLabel="Delete" busy={busy} onConfirm={remove} onCancel={() => setToDelete(null)} />
    </>
  );
}
