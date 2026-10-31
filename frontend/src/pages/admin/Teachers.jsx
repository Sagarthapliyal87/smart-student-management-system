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

const EMPTY = { name: '', email: '', password: '', phone: '', department: '', designation: '' };

export default function AdminTeachers() {
  const { showToast } = useToast();
  const { data, loading, error, reload } = useFetch('/teachers');
  const { data: subjects } = useFetch('/academics/subjects');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [selectedId, setSelectedId] = useState(null);
  const [subjectId, setSubjectId] = useState('');
  const [toDeactivate, setToDeactivate] = useState(null);
  const [busy, setBusy] = useState(false);
  const selected = data?.find((t) => t.id === selectedId);

  const close = () => { setModal(null); setSelectedId(null); setForm(EMPTY); };
  const act = async (fn, msg, keepOpen) => {
    setBusy(true);
    try { await fn(); showToast(msg); if (!keepOpen) close(); setToDeactivate(null); await reload(); }
    catch (err) { showToast(getErrorMessage(err), 'error'); } finally { setBusy(false); }
  };

  const create = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.department.trim()) return showToast('Name, email and department are required.', 'error');
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return showToast('Enter a valid email address.', 'error');
    if (form.password.length < 8) return showToast('Password must be at least 8 characters.', 'error');
    act(() => api.post('/teachers', form), 'Teacher created.');
  };
  const edit = (e) => { e.preventDefault(); act(() => api.put(`/teachers/${selectedId}`, form), 'Teacher updated.'); };
  const assignable = (subjects || []).filter((s) => !selected?.subjects.some((x) => x.subjectId === s.id));

  return (
    <>
      <PageHeader title="Teachers" action={<button className="btn-primary" onClick={() => setModal('create')}>+ Add teacher</button>} />
      <div className="card">
        {loading ? <Loader /> : error ? <ErrorBanner message={error} onRetry={reload} /> : (
          <Table columns={[
            { key: 'name', label: 'Name', render: (t) => t.user.name },
            { key: 'email', label: 'Email', render: (t) => t.user.email },
            { key: 'department', label: 'Department' },
            { key: 'subjects', label: 'Subjects', render: (t) => t.subjects.length ? t.subjects.map((s) => s.subject.code).join(', ') : <span className="text-gray-400">None</span> },
            { key: 'status', label: 'Status', render: (t) => <Badge status={t.user.isActive ? 'OK' : 'LOW'}>{t.user.isActive ? 'Active' : 'Inactive'}</Badge> },
            { key: 'act', label: '', render: (t) => (
              <div className="flex gap-3 text-sm">
                <button className="text-brand-600 hover:underline" onClick={() => { setSelectedId(t.id); setForm({ name: t.user.name, phone: t.user.phone || '', department: t.department, designation: t.designation || '' }); setModal('edit'); }}>Edit</button>
                <button className="text-brand-600 hover:underline" onClick={() => { setSelectedId(t.id); setModal('subjects'); }}>Subjects</button>
                {t.user.isActive && <button className="text-red-600 hover:underline" onClick={() => setToDeactivate(t)}>Deactivate</button>}
              </div>) },
          ]} rows={data} emptyLabel="No teachers yet" />
        )}
      </div>

      <Modal open={modal === 'create' || modal === 'edit'} onClose={close} title={modal === 'create' ? 'Add teacher' : 'Edit teacher'}>
        <form onSubmit={modal === 'create' ? create : edit} className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="label">Full name *</label><input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="label">Department *</label><input className="input-field" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
            {modal === 'create' && <><div><label className="label">Email *</label><input type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><label className="label">Temporary password * (min 8)</label><input type="password" className="input-field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" /></div></>}
            <div><label className="label">Phone</label><input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><label className="label">Designation</label><input className="input-field" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={close}>Cancel</button><button className="btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Save'}</button></div>
        </form>
      </Modal>

      <Modal open={modal === 'subjects'} onClose={close} title={`Subjects · ${selected?.user.name || ''}`}>
        <div className="space-y-4">
          {selected?.subjects.length === 0 ? <p className="text-sm text-gray-500">No subjects assigned yet.</p> : (
            <ul className="divide-y divide-gray-100">{selected?.subjects.map(({ subject }) => (
              <li key={subject.id} className="flex justify-between items-center py-2 text-sm"><span>{subject.name} <span className="text-gray-400">({subject.code} · Sem {subject.class.semester} {subject.class.section})</span></span>
                <button className="text-red-600 hover:underline" disabled={busy} onClick={() => act(() => api.delete(`/teachers/${selectedId}/subjects/${subject.id}`), 'Subject removed.', true)}>Remove</button></li>
            ))}</ul>
          )}
          <div className="flex gap-2">
            <select className="input-field" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}><option value="">Assign a subject...</option>{assignable.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code} · Sem {s.class.semester} {s.class.section})</option>)}</select>
            <button className="btn-primary" disabled={busy || !subjectId} onClick={() => act(async () => { await api.post(`/teachers/${selectedId}/subjects`, { subjectId }); setSubjectId(''); }, 'Subject assigned.', true)}>Assign</button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog open={!!toDeactivate} title="Deactivate teacher?" message={`${toDeactivate?.user.name} will no longer be able to log in.`} confirmLabel="Deactivate" busy={busy}
        onConfirm={() => act(() => api.delete(`/teachers/${toDeactivate.id}`), 'Teacher deactivated.')} onCancel={() => setToDeactivate(null)} />
    </>
  );
}
