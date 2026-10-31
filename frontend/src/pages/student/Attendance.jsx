import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import useFetch from '../../hooks/useFetch';
import Loader from '../../components/Loader';
import ErrorBanner from '../../components/ErrorBanner';
import Badge from '../../components/Badge';
import Table from '../../components/Table';
import ProgressBar from '../../components/ProgressBar';
import PageHeader from '../../components/PageHeader';
import { usePagination } from '../../components/Pagination';

/** Also used by the parent dashboard link-through via the studentId prop. */
export default function StudentAttendance() {
  const { user } = useAuth();
  const [subjectId, setSubjectId] = useState('');
  const base = `/attendance/student/${user.student?.id}`;
  const { data, loading, error, reload } = useFetch(user.student ? base : null);
  const filtered = data?.records.filter((r) => !subjectId || String(r.subjectId) === subjectId) || [];
  const { pageRows, controls } = usePagination(filtered, 10);

  if (!user.student) return <ErrorBanner message="No student profile is linked to your account." />;
  if (loading) return <Loader label="Loading attendance..." />;
  if (error) return <ErrorBanner message={error} onRetry={reload} />;

  return (
    <>
      <PageHeader title="Attendance" />
      <div className="card flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Overall attendance</p>
          <p className={`text-3xl font-bold ${data.lowAttendanceWarning ? 'text-red-600' : 'text-emerald-600'}`}>{data.overallPercentage}%</p>
        </div>
        {data.lowAttendanceWarning && <span className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">Below required {data.threshold}%</span>}
      </div>
      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-3">Subject-wise attendance</h2>
        {data.bySubject.length === 0 ? <p className="text-sm text-gray-500">No attendance recorded yet.</p> : (
          <div className="space-y-4">
            {data.bySubject.map((s) => (
              <div key={s.subject.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{s.subject.name}</span>
                  <span className={s.isLow ? 'text-red-600 font-medium' : 'text-gray-600'}>{s.percentage}% ({s.present}/{s.total}){s.isLow && ' · Low'}</span>
                </div>
                <ProgressBar value={s.percentage} tone={s.isLow ? 'bad' : 'good'} />
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="card">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h2 className="font-semibold text-gray-800">Daily record</h2>
          <select className="input-field !w-auto" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">All subjects</option>
            {data.bySubject.map((s) => <option key={s.subject.id} value={s.subject.id}>{s.subject.name}</option>)}
          </select>
        </div>
        <Table columns={[
          { key: 'date', label: 'Date', render: (r) => new Date(r.date).toLocaleDateString() },
          { key: 'subject', label: 'Subject', render: (r) => r.subject.name },
          { key: 'status', label: 'Status', render: (r) => <Badge status={r.status} /> },
        ]} rows={pageRows} emptyLabel="No attendance recorded yet" />
        {controls}
      </div>
    </>
  );
}
