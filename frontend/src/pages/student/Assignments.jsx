import { useState } from 'react';
import { api, getErrorMessage, UPLOADS_BASE_URL } from '../../services/api';
import { useToast } from '../../components/Toast';
import useFetch from '../../hooks/useFetch';
import Loader from '../../components/Loader';
import ErrorBanner from '../../components/ErrorBanner';
import EmptyState from '../../components/EmptyState';
import Badge from '../../components/Badge';
import PageHeader from '../../components/PageHeader';

const FILTERS = ['ALL', 'PENDING', 'SUBMITTED', 'LATE', 'CHECKED'];

export default function StudentAssignments() {
  const { showToast } = useToast();
  const { data, loading, error, reload } = useFetch('/assignments/my');
  const [filter, setFilter] = useState('ALL');
  const [busyId, setBusyId] = useState(null);

  const submit = async (assignmentId, file) => {
    if (!file) return;
    const fd = new FormData(); fd.append('file', file);
    setBusyId(assignmentId);
    try { await api.post(`/assignments/${assignmentId}/submit`, fd); showToast('Assignment submitted.'); reload(); }
    catch (err) { showToast(getErrorMessage(err), 'error'); }
    finally { setBusyId(null); }
  };

  if (loading) return <Loader label="Loading assignments..." />;
  if (error) return <ErrorBanner message={error} onRetry={reload} />;
  const rows = data.filter((s) => filter === 'ALL' || s.status === filter);

  return (
    <>
      <PageHeader title="Assignments" />
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-full text-sm border ${filter === f ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200'}`}>
            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
      {rows.length === 0 ? <div className="card"><EmptyState title="No assignments here" icon="📝" /></div> : (
        <div className="space-y-4">
          {rows.map((s) => (
            <div key={s.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800">{s.assignment.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{s.assignment.subject.name} · {s.assignment.teacher.user.name}</p>
                  <p className="text-sm text-gray-600 mt-2">{s.assignment.description}</p>
                  <p className="text-xs text-gray-400 mt-2">Deadline: {new Date(s.assignment.deadline).toLocaleString()} · Max marks: {s.assignment.maxMarks}</p>
                </div>
                <Badge status={s.status} />
              </div>
              <div className="mt-4 flex items-center gap-3 flex-wrap">
                {s.assignment.attachmentPath && <a className="text-sm text-brand-600 underline" href={`${UPLOADS_BASE_URL}${s.assignment.attachmentPath}`} target="_blank" rel="noreferrer">Assignment file</a>}
                {s.filePath && <a className="text-sm text-brand-600 underline" href={`${UPLOADS_BASE_URL}${s.filePath}`} target="_blank" rel="noreferrer">My submission</a>}
                {s.marksAwarded != null && <span className="text-sm text-emerald-700 font-medium">Graded: {s.marksAwarded}/{s.assignment.maxMarks}</span>}
                {s.status !== 'CHECKED' && (
                  <label className="btn-secondary cursor-pointer">
                    {busyId === s.assignment.id ? 'Uploading...' : s.filePath ? 'Re-submit' : 'Submit work'}
                    <input type="file" className="hidden" disabled={busyId === s.assignment.id} onChange={(e) => { submit(s.assignment.id, e.target.files[0]); e.target.value = ''; }} />
                  </label>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
