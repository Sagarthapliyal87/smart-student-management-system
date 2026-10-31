import { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../../services/api';
import { useToast } from '../../components/Toast';
import useFetch from '../../hooks/useFetch';
import Loader from '../../components/Loader';
import ErrorBanner from '../../components/ErrorBanner';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import { usePagination } from '../../components/Pagination';

const EXAMS = ['INTERNAL', 'MID_SEM', 'END_SEM', 'PRACTICAL', 'ASSIGNMENT'];

export default function TeacherMarks() {
  const { showToast } = useToast();
  const { data: subjects, loading, error } = useFetch('/teachers/me/subjects');
  const [subjectId, setSubjectId] = useState('');
  const [examType, setExamType] = useState('INTERNAL');
  const [maxScore, setMaxScore] = useState(20);
  const [scores, setScores] = useState({});
  const [saving, setSaving] = useState(false);
  const subject = subjects?.find((s) => String(s.id) === subjectId);
  const { data: students, loading: sLoading } = useFetch(subject ? `/academics/classes/${subject.classId}/students` : null);
  const { data: recent, reload: reloadRecent } = useFetch(subjectId ? `/marks/subject/${subjectId}` : null);
  const [editing, setEditing] = useState(null);
  const { pageRows, controls } = usePagination(recent, 8);

  useEffect(() => { if (subjects?.length && !subjectId) setSubjectId(String(subjects[0].id)); }, [subjects]);
  useEffect(() => setScores({}), [subjectId, examType]);

  const save = async () => {
    const entries = Object.entries(scores).filter(([, v]) => v !== '' && v !== undefined);
    if (!entries.length) return showToast('Enter at least one score.', 'error');
    if (!(Number(maxScore) > 0)) return showToast('Maximum score must be greater than zero.', 'error');
    const bad = entries.find(([, v]) => Number(v) < 0 || Number(v) > Number(maxScore));
    if (bad) return showToast('Scores must be between 0 and the maximum score.', 'error');
    setSaving(true);
    let ok = 0; const failed = [];
    for (const [studentId, score] of entries) {
      try { await api.post('/marks', { studentId: Number(studentId), subjectId: Number(subjectId), examType, score: Number(score), maxScore: Number(maxScore) }); ok++; }
      catch (err) { failed.push(getErrorMessage(err)); }
    }
    setSaving(false);
    if (ok) { showToast(`${ok} mark${ok > 1 ? 's' : ''} saved.`); setScores({}); reloadRecent(); }
    if (failed.length) showToast(`${failed.length} failed: ${failed[0]}`, 'error');
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    try { await api.put(`/marks/${editing.id}`, { score: editing.score, maxScore: editing.maxScore }); showToast('Mark updated.'); setEditing(null); reloadRecent(); }
    catch (err) { showToast(getErrorMessage(err), 'error'); }
  };

  if (loading) return <Loader />;
  if (error) return <ErrorBanner message={error} />;
  if (!subjects.length) return <div className="card"><EmptyState title="No subjects are assigned to you yet" icon="📚" /></div>;

  return (
    <>
      <PageHeader title="Enter marks" />
      <div className="card grid sm:grid-cols-4 gap-3">
        <div className="sm:col-span-2"><label className="label">Subject</label>
          <select className="input-field" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div><label className="label">Exam type</label>
          <select className="input-field" value={examType} onChange={(e) => setExamType(e.target.value)}>{EXAMS.map((x) => <option key={x} value={x}>{x.replace('_', ' ')}</option>)}</select></div>
        <div><label className="label">Maximum score</label><input type="number" min="1" className="input-field" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} /></div>
      </div>
      <div className="card">
        {sLoading ? <Loader /> : !students?.length ? <EmptyState title="No students in this class yet" icon="🎓" /> : (
          <>
            <ul className="divide-y divide-gray-100">{students.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2">
                <div><p className="text-sm font-medium">{s.user.name}</p><p className="text-xs text-gray-400">{s.rollNumber}</p></div>
                <div className="flex items-center gap-2"><input type="number" min="0" max={maxScore} step="0.5" className="input-field !w-24 text-right" placeholder="Score"
                  value={scores[s.id] ?? ''} onChange={(e) => setScores({ ...scores, [s.id]: e.target.value })} /><span className="text-sm text-gray-400">/ {maxScore}</span></div>
              </li>
            ))}</ul>
            <div className="pt-4"><button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save marks'}</button>
              <p className="text-xs text-gray-400 mt-2">Leave a row empty to skip that student. Students are notified when marks are posted.</p></div>
          </>
        )}
      </div>
      <div className="card">
        <h2 className="font-semibold mb-3">Recently entered marks</h2>
        <Table columns={[
          { key: 'student', label: 'Student', render: (r) => r.student.user.name },
          { key: 'examType', label: 'Exam', render: (r) => r.examType.replace('_', ' ') },
          { key: 'score', label: 'Score', render: (r) => `${r.score} / ${r.maxScore}` },
          { key: 'date', label: 'Date', render: (r) => new Date(r.createdAt).toLocaleDateString() },
          { key: 'act', label: '', render: (r) => <button className="text-brand-600 underline" onClick={() => setEditing({ ...r })}>Edit</button> },
        ]} rows={pageRows} emptyLabel="No marks entered for this subject yet" />
        {controls}
      </div>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit mark">
        {editing && (
          <form onSubmit={saveEdit} className="space-y-3">
            <p className="text-sm text-gray-500">{editing.student.user.name} · {editing.examType.replace('_', ' ')}</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Score</label><input type="number" step="0.5" className="input-field" value={editing.score} onChange={(e) => setEditing({ ...editing, score: e.target.value })} /></div>
              <div><label className="label">Maximum</label><input type="number" className="input-field" value={editing.maxScore} onChange={(e) => setEditing({ ...editing, maxScore: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button><button className="btn-primary">Save</button></div>
          </form>
        )}
      </Modal>
    </>
  );
}
