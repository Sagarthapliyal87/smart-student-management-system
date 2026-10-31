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
import { usePagination } from '../../components/Pagination';

const EMPTY = { name: '', email: '', password: '', phone: '', rollNumber: '', classId: '', admissionDate: '', address: '' };
const className = (c) => `${c.course.name} - Sem ${c.semester} ${c.section}`;

export default function AdminStudents() {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const qs = new URLSearchParams({ ...(search && { search }), ...(classFilter && { classId: classFilter }) }).toString();
  const { data, loading, error, reload } = useFetch(`/students${qs ? `?${qs}` : ''}`);
  const { data: classes } = useFetch('/academics/classes');
  const { data: parents } = useFetch('/parents');
  const [modal, setModal] = useState(null); // 'create' | 'edit' | 'parent'
  const [form, setForm] = useState(EMPTY);
  const [selected, setSelected] = useState(null);
  const [link, setLink] = useState({ parentId: '', relation: 'Father' });
  const [toDeactivate, setToDeactivate] = useState(null);
  const [busy, setBusy] = useState(false);
  const { pageRows, controls } = usePagination(data, 10);

  const close = () => { setModal(null); setSelected(null); setForm(EMPTY); };
  const openEdit = (s) => { setSelected(s); setForm({ name: s.user.name, phone: s.user.phone || '', rollNumber: s.rollNumber, classId: s.classId || '', address: s.address || '' }); setModal('edit'); };

  const run = async (fn, okMsg) => {
    setBusy(true);
    try { await fn(); showToast(okMsg); close(); setToDeactivate(null); reload(); }
    catch (err) { showToast(getErrorMessage(err), 'error'); } finally { setBusy(false); }
  };

  const create = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.rollNumber.trim()) return showToast('Name, email and roll number are required.', 'error');
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return showToast('Enter a valid email address.', 'error');
    if (form.password.length < 8) return showToast('Password must be at least 8 characters.', 'error');
    run(() => api.post('/students', form), 'Student created.');
  };
  const edit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.rollNumber.trim()) return showToast('Name and roll number are required.', 'error');
    run(() => api.put(`/students/${selected.id}`, form), 'Student updated.');
  };

  const fields = (isCreate) => (
    <div className="grid sm:grid-cols-2 gap-3">
      <div><label className="label">Full name *</label><input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
      <div><label className="label">Roll number *</label><input className="input-field" value={form.rollNumber} onChange={(e) => setForm({ ...form, rollNumber: e.target.value })} /></div>
      {isCreate && <><div><label className="label">Email *</label><input type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div><label className="label">Temporary password * (min 8)</label><input type="password" className="input-field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" /></div></>}
      <div><label className="label">Phone</label><input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
      <div><label className="label">Class</label>
        <select className="input-field" value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}><option value="">Not assigned</option>{(classes || []).map((c) => <option key={c.id} value={c.id}>{className(c)}</option>)}</select></div>
      {isCreate && <div><label className="label">Admission date</label><input type="date" className="input-field" value={form.admissionDate} onChange={(e) => setForm({ ...form, admissionDate: e.target.value })} /></div>}
      <div className="sm:col-span-2"><label className="label">Address</label><textarea rows={2} className="input-field" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
    </div>
  );

  return (
    <>
      <PageHeader title="Students" action={<button className="btn-primary" onClick={() => setModal('create')}>+ Add student</button>} />
      <div className="flex flex-wrap gap-3">
        <input className="input-field max-w-xs" placeholder="Search name or roll number..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input-field max-w-xs" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}><option value="">All classes</option>{(classes || []).map((c) => <option key={c.id} value={c.id}>{className(c)}</option>)}</select>
      </div>
      <div className="card">
        {loading ? <Loader /> : error ? <ErrorBanner message={error} onRetry={reload} /> : (
          <>
            <Table columns={[
              { key: 'rollNumber', label: 'Roll no.' },
              { key: 'name', label: 'Name', render: (s) => s.user.name },
              { key: 'email', label: 'Email', render: (s) => s.user.email },
              { key: 'class', label: 'Class', render: (s) => (s.class ? className(s.class) : '-') },
              { key: 'status', label: 'Status', render: (s) => <Badge status={s.user.isActive ? 'OK' : 'LOW'}>{s.user.isActive ? 'Active' : 'Inactive'}</Badge> },
              { key: 'act', label: '', render: (s) => (
                <div className="flex gap-3 text-sm">
                  <button className="text-brand-600 hover:underline" onClick={() => openEdit(s)}>Edit</button>
                  <button className="text-brand-600 hover:underline" onClick={() => { setSelected(s); setModal('parent'); }}>Link parent</button>
                  {s.user.isActive && <button className="text-red-600 hover:underline" onClick={() => setToDeactivate(s)}>Deactivate</button>}
                </div>) },
            ]} rows={pageRows} emptyLabel="No students found" />
            {controls}
          </>
        )}
      </div>

      <Modal open={modal === 'create'} onClose={close} title="Add student"><form onSubmit={create} className="space-y-4">{fields(true)}<div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={close}>Cancel</button><button className="btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Create student'}</button></div></form></Modal>
      <Modal open={modal === 'edit'} onClose={close} title="Edit student"><form onSubmit={edit} className="space-y-4">{fields(false)}<div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={close}>Cancel</button><button className="btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Save changes'}</button></div></form></Modal>
      <Modal open={modal === 'parent'} onClose={close} title={`Link a parent to ${selected?.user.name || ''}`}>
        <form onSubmit={(e) => { e.preventDefault(); if (!link.parentId) return showToast('Choose a parent.', 'error'); run(() => api.post(`/students/${selected.id}/parents`, link), 'Parent linked.'); }} className="space-y-3">
          <div><label className="label">Parent</label><select className="input-field" value={link.parentId} onChange={(e) => setLink({ ...link, parentId: e.target.value })}><option value="">Select parent</option>{(parents || []).map((p) => <option key={p.id} value={p.id}>{p.user.name} ({p.user.email})</option>)}</select></div>
          <div><label className="label">Relation</label><select className="input-field" value={link.relation} onChange={(e) => setLink({ ...link, relation: e.target.value })}><option>Father</option><option>Mother</option><option>Guardian</option></select></div>
          <div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={close}>Cancel</button><button className="btn-primary" disabled={busy}>Link</button></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!toDeactivate} title="Deactivate student?" message={`${toDeactivate?.user.name} will no longer be able to log in. Their academic records are kept.`} confirmLabel="Deactivate" busy={busy}
        onConfirm={() => run(() => api.delete(`/students/${toDeactivate.id}`), 'Student deactivated.')} onCancel={() => setToDeactivate(null)} />
    </>
  );
}
