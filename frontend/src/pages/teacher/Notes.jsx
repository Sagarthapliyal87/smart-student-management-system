import { useEffect, useState } from 'react';
import { api, getErrorMessage, UPLOADS_BASE_URL } from '../../services/api';
import { useToast } from '../../components/Toast';
import useFetch from '../../hooks/useFetch';
import Loader from '../../components/Loader';
import ErrorBanner from '../../components/ErrorBanner';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function TeacherNotes() {
  const { showToast } = useToast();
  const { data: subjects, loading, error } = useFetch('/teachers/me/subjects');
  const [subjectId, setSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const { data: materials, loading: mLoading, reload } = useFetch(subjectId ? `/study-materials/subject/${subjectId}` : null);
  useEffect(() => { if (subjects?.length && !subjectId) setSubjectId(String(subjects[0].id)); }, [subjects]);

  const upload = async (e) => {
    e.preventDefault();
    if (!title.trim() || !file) return showToast('Add a title and choose a file.', 'error');
    const fd = new FormData(); fd.append('subjectId', subjectId); fd.append('title', title); fd.append('file', file);
    setBusy(true);
    try { await api.post('/study-materials', fd); showToast('Uploaded. Students were notified.'); setTitle(''); setFile(null); e.target.reset(); reload(); }
    catch (err) { showToast(getErrorMessage(err), 'error'); } finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true);
    try { await api.delete(`/study-materials/${toDelete.id}`); showToast('Deleted.'); setToDelete(null); reload(); }
    catch (err) { showToast(getErrorMessage(err), 'error'); } finally { setBusy(false); }
  };

  if (loading) return <Loader />;
  if (error) return <ErrorBanner message={error} />;
  if (!subjects.length) return <div className="card"><EmptyState title="No subjects are assigned to you yet" icon="📚" /></div>;

  return (
    <>
      <PageHeader title="Study material" subtitle="PDF, Word or image files up to 10 MB" />
      <form onSubmit={upload} className="card grid sm:grid-cols-4 gap-3 items-end">
        <div><label className="label">Subject</label><select className="input-field" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div className="sm:col-span-2"><label className="label">Title</label><input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Unit 3 - Normalization notes" /></div>
        <div><label className="label">File</label><input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="text-sm w-full" onChange={(e) => setFile(e.target.files[0])} /></div>
        <button className="btn-primary sm:w-auto sm:justify-self-start" disabled={busy}>{busy ? 'Uploading...' : 'Upload'}</button>
      </form>
      <div className="card">
        {mLoading ? <Loader /> : !materials?.length ? <EmptyState title="Nothing uploaded for this subject yet" icon="📄" /> : (
          <ul className="space-y-3">{materials.map((m) => (
            <li key={m.id} className="flex items-center justify-between border-b border-gray-50 last:border-0 pb-2">
              <div><p className="font-medium text-sm">{m.title}</p><p className="text-xs text-gray-400">{m.teacher.user.name} · {new Date(m.uploadedAt).toLocaleDateString()}</p></div>
              <div className="flex gap-4 text-sm"><a className="text-brand-600 underline" href={`${UPLOADS_BASE_URL}${m.filePath}`} target="_blank" rel="noreferrer">Open</a><button className="text-red-600 hover:underline" onClick={() => setToDelete(m)}>Delete</button></div>
            </li>
          ))}</ul>
        )}
      </div>
      <ConfirmDialog open={!!toDelete} message={`Delete "${toDelete?.title}"?`} confirmLabel="Delete" busy={busy} onConfirm={remove} onCancel={() => setToDelete(null)} />
    </>
  );
}
