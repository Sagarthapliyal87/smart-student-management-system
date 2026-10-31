import { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../../services/api';
import { useToast } from '../../components/Toast';
import useFetch from '../../hooks/useFetch';
import Loader from '../../components/Loader';
import ErrorBanner from '../../components/ErrorBanner';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';

const STATUSES = [['PRESENT', 'P', 'bg-emerald-600'], ['ABSENT', 'A', 'bg-red-600'], ['LEAVE', 'L', 'bg-amber-500']];
const todayStr = () => new Date().toISOString().slice(0, 10);

export default function TeacherAttendance() {
  const { showToast } = useToast();
  const { data: subjects, loading, error } = useFetch('/teachers/me/subjects');
  const [subjectId, setSubjectId] = useState('');
  const [date, setDate] = useState(todayStr());
  const [roster, setRoster] = useState([]);
  const [rLoading, setRLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { if (subjects?.length && !subjectId) setSubjectId(String(subjects[0].id)); }, [subjects]);

  useEffect(() => {
    if (!subjectId || !date) return;
    setRLoading(true);
    api.get('/attendance/roster', { params: { subjectId, date } })
      .then((res) => setRoster(res.data.map((r) => ({ ...r, status: r.status || 'PRESENT' }))))
      .catch((err) => showToast(getErrorMessage(err), 'error'))
      .finally(() => setRLoading(false));
  }, [subjectId, date]);

  const setStatus = (id, status) => setRoster((r) => r.map((x) => (x.studentId === id ? { ...x, status } : x)));
  const markAll = (status) => setRoster((r) => r.map((x) => ({ ...x, status })));

  const save = async () => {
    setSaving(true);
    try {
      await api.post('/attendance', { subjectId: Number(subjectId), date, records: roster.map((r) => ({ studentId: r.studentId, status: r.status })) });
      showToast('Attendance saved.');
    } catch (err) { showToast(getErrorMessage(err), 'error'); } finally { setSaving(false); }
  };

  if (loading) return <Loader />;
  if (error) return <ErrorBanner message={error} />;
  if (!subjects.length) return <div className="card"><EmptyState title="No subjects are assigned to you yet" description="Ask the administrator to assign subjects to your account." icon="📚" /></div>;

  const shown = roster.filter((r) => !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.rollNumber.toLowerCase().includes(search.toLowerCase()));
  const counts = STATUSES.map(([s]) => [s, roster.filter((r) => r.status === s).length]);

  return (
    <>
      <PageHeader title="Mark attendance" />
      <div className="card grid sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2"><label className="label">Subject</label>
          <select className="input-field" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.class.course.name} Sem {s.class.semester} {s.class.section})</option>)}
          </select></div>
        <div><label className="label">Date</label><input type="date" max={todayStr()} className="input-field" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      </div>
      <div className="card">
        {rLoading ? <Loader label="Loading class list..." /> : roster.length === 0 ? <EmptyState title="No students in this class yet" icon="🎓" /> : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <input className="input-field max-w-xs" placeholder="Search student..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <div className="flex gap-2 items-center text-sm">
                <button className="btn-secondary" onClick={() => markAll('PRESENT')}>All present</button>
                <button className="btn-secondary" onClick={() => markAll('ABSENT')}>All absent</button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-2">{counts.map(([s, n]) => `${s.charAt(0) + s.slice(1).toLowerCase()}: ${n}`).join(' · ')}</p>
            <ul className="divide-y divide-gray-100">
              {shown.map((r) => (
                <li key={r.studentId} className="flex items-center justify-between py-2.5">
                  <div><p className="text-sm font-medium">{r.name}</p><p className="text-xs text-gray-400">{r.rollNumber}</p></div>
                  <div className="flex gap-1">{STATUSES.map(([s, label, color]) => (
                    <button key={s} onClick={() => setStatus(r.studentId, s)} title={s}
                      className={`w-9 h-9 rounded-lg text-sm font-semibold border ${r.status === s ? `${color} text-white border-transparent` : 'bg-white text-gray-500 border-gray-200'}`}>{label}</button>
                  ))}</div>
                </li>
              ))}
            </ul>
            <div className="pt-4"><button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save attendance'}</button></div>
          </>
        )}
      </div>
    </>
  );
}
