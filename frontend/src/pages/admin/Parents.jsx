import { useState } from 'react';
import { api, getErrorMessage } from '../../services/api';
import { useToast } from '../../components/Toast';
import useFetch from '../../hooks/useFetch';
import Loader from '../../components/Loader';
import ErrorBanner from '../../components/ErrorBanner';
import PageHeader from '../../components/PageHeader';
import Table from '../../components/Table';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';

const EMPTY = { name: '', email: '', password: '', phone: '', occupation: '' };

export default function AdminParents() {
  const { showToast } = useToast();
  const { data, loading, error, reload } = useFetch('/parents');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [toDeactivate, setToDeactivate] = useState(null);
  const [busy, setBusy] = useState(false);

  const create = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return showToast('Name and email are required.', 'error');
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return showToast('Enter a valid email address.', 'error');
    if (form.password.length < 8) return showToast('Password must be at least 8 characters.', 'error');
    setBusy(true);
    try { await api.post('/parents', form); showToast('Parent created. Link them to a student from the Students page.'); setOpen(false); setForm(EMPTY); reload(); }
    catch (err) { showToast(getErrorMessage(err), 'error'); } finally { setBusy(false); }
  };
  const deactivate = async () => {
    setBusy(true);
    try { await api.delete(`/parents/${toDeactivate.id}`); showToast('Parent deactivated.'); setToDeactivate(null); reload(); }
    catch (err) { showToast(getErrorMessage(err), 'error'); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Parents" action={<button className="btn-primary" onClick={() => setOpen(true)}>+ Add parent</button>} />
      <div className="card">
        {loading ? <Loader /> : error ? <ErrorBanner message={error} onRetry={reload} /> : (
          <Table columns={[
            { key: 'name', label: 'Name', render: (p) => p.user.name },
            { key: 'email', label: 'Email', render: (p) => p.user.email },
            { key: 'children', label: 'Children', render: (p) => (p.children.length ? p.children.map((c) => `${c.student.user.name} (${c.relation})`).join(', ') : <span className="text-gray-400">Not linked</span>) },
            { key: 'status', label: 'Status', render: (p) => <Badge status={p.user.isActive ? 'OK' : 'LOW'}>{p.user.isActive ? 'Active' : 'Inactive'}</Badge> },
            { key: 'act', label: '', render: (p) => p.user.isActive && <button className="text-red-600 text-sm hover:underline" onClick={() => setToDeactivate(p)}>Deactivate</button> },
          ]} rows={data} emptyLabel="No parents yet" />
        )}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Add parent">
        <form onSubmit={create} className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="label">Full name *</label><input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="label">Email *</label><input type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><label className="label">Temporary password * (min 8)</label><input type="password" className="input-field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" /></div>
            <div><label className="label">Phone</label><input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="sm:col-span-2"><label className="label">Occupation</label><input className="input-field" value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Create parent'}</button></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!toDeactivate} title="Deactivate parent?" message={`${toDeactivate?.user.name} will no longer be able to log in.`} confirmLabel="Deactivate" busy={busy} onConfirm={deactivate} onCancel={() => setToDeactivate(null)} />
    </>
  );
}
