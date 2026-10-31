import { useState } from 'react';
import { api, getErrorMessage, UPLOADS_BASE_URL } from '../../services/api';
import { useToast } from '../../components/Toast';
import useFetch from '../../hooks/useFetch';
import Loader from '../../components/Loader';
import ErrorBanner from '../../components/ErrorBanner';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';

const EMPTY = { subjectId: '', title: '', description: '', deadline: '', maxMarks: 20, file: null };

export default function TeacherAssignments() {
  const { showToast } = useToast();
  const { data: subjects } = useFetch('/teachers/me/subjects');
  const { data: list, loading, error, reload } = useFetch('/assignments/mine');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState(null);
  const { data: subs, loading: subsLoading, reload: reloadSubs } = useFetch(viewing ? `/assignments/${viewing.id}/submissions` : null);
  const [grades, setGrades] = useState({});

  const create = async (e) => {
    e.preventDefault();
    if (!form.subjectId || !form.title.trim() || !form.description.trim() || !form.deadline) return showToast('Please fill in all required fields.', 'error');
    if (!(Number(form.maxMarks) > 0)) return showToast('Maximum marks must be greater than zero.', 'error');
    const fd = new FormData();
    ['subjectId', 'title', 'description', 'deadline', 'maxMarks'].forEach((k) => fd.append(k, form[k]));
    if (form.file) fd.append('attachment', form.file);
    setBusy(true);
    try { await api.post('/assignments', fd); showToast('Assignment created. Students were notified.'); setOpen(false); setForm(EMPTY); reload(); }
    catch (err) { showToast(getErrorMessage(err), 'error'); } finally { setBusy(false); }
  };

  const grade = async (sub) => {
    try {
      await api.put(`/assignments/submissions/${sub.id}/grade`, { marksAwarded: grades[sub.id] });
      showToast('Graded.'); reloadSubs(); reload();
    } catch (err) { showToast(getErrorMessage(err), 'error'); }
  };

  return (
    <>
      <PageHeader title="Assignments" action={<button className="btn-primary" onClick={() => setOpen(true)} disabled={!subjects?.length}>+ New assignment</button>} />
      {loading ? <Loader /> : error ? <ErrorBanner message={error} onRetry={reload} /> : !list.length ? <div className="card"><EmptyState title="You have not created any assignments yet" icon="📝" /></div> : (
        <div className="space-y-3">{list.map((a) => {
          const count = (s) => a.submissions.filter((x) => x.status === s).length;
          return (
            <div key={a.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{a.title}</p>
                <p className="text-sm text-gray-500">{a.subject.name} · Due {new Date(a.deadline).toLocaleString()} · {a.maxMarks} marks</p>
                <p className="text-xs text-gray-400 mt-1">Submitted {count('SUBMITTED') + count('LATE') + count('CHECKED')} / {a.submissions.length} · Awaiting grading {count('SUBMITTED') + count('LATE')}</p>
              </div>
              <button className="btn-secondary" onClick={() => { setViewing(a); setGrades({}); }}>View submissions</button>
            </div>
          );
        })}</div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Create assignment">
        <form onSubmit={create} className="space-y-3">
          <div><label className="label">Subject *</label>
            <select className="input-field" value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
              <option value="">Select subject</option>{(subjects || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div><label className="label">Title *</label><input className="input-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><label className="label">Description *</label><textarea rows={3} className="input-field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Deadline *</label><input type="datetime-local" className="input-field" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
            <div><label className="label">Max marks *</label><input type="number" min="1" className="input-field" value={form.maxMarks} onChange={(e) => setForm({ ...form, maxMarks: e.target.value })} /></div>
          </div>
          <div><label className="label">Attachment (optional)</label><input type="file" className="text-sm" onChange={(e) => setForm({ ...form, file: e.target.files[0] })} /></div>
          <div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary" disabled={busy}>{busy ? 'Creating...' : 'Create'}</button></div>
        </form>
      </Modal>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing ? `Submissions · ${viewing.title}` : ''}>
        {subsLoading ? <Loader /> : !subs?.length ? <EmptyState title="No students in this class" /> : (
          <ul className="divide-y divide-gray-100">{subs.map((s) => (
            <li key={s.id} className="py-3 space-y-2">
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">{s.student.user.name}</p><p className="text-xs text-gray-400">{s.student.rollNumber}</p></div><Badge status={s.status} /></div>
              {s.filePath && (
                <div className="flex items-center gap-2 flex-wrap">
                  <a className="text-sm text-brand-600 underline" href={`${UPLOADS_BASE_URL}${s.filePath}`} target="_blank" rel="noreferrer">Open submission</a>
                  <input type="number" min="0" max={viewing.maxMarks} step="0.5" className="input-field !w-24" placeholder={`/ ${viewing.maxMarks}`} value={grades[s.id] ?? s.marksAwarded ?? ''} onChange={(e) => setGrades({ ...grades, [s.id]: e.target.value })} />
                  <button className="btn-secondary" onClick={() => grade(s)}>{s.status === 'CHECKED' ? 'Update grade' : 'Grade'}</button>
                </div>
              )}
            </li>
          ))}</ul>
        )}
      </Modal>
    </>
  );
}
