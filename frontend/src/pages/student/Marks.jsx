import { useState } from 'react';
import { api, getErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import useFetch from '../../hooks/useFetch';
import Loader from '../../components/Loader';
import ErrorBanner from '../../components/ErrorBanner';
import Table from '../../components/Table';
import ProgressBar from '../../components/ProgressBar';
import PageHeader from '../../components/PageHeader';
import { usePagination } from '../../components/Pagination';

export default function StudentMarks() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch(user.student ? `/marks/student/${user.student.id}` : null);
  const [target, setTarget] = useState({ subjectId: '', target: 75, finalMax: 100 });
  const [calc, setCalc] = useState(null);
  const [calcError, setCalcError] = useState('');
  const { pageRows, controls } = usePagination(data?.marks, 10);

  if (!user.student) return <ErrorBanner message="No student profile is linked to your account." />;
  if (loading) return <Loader label="Loading marks..." />;
  if (error) return <ErrorBanner message={error} onRetry={reload} />;

  const runCalc = async (e) => {
    e.preventDefault(); setCalc(null); setCalcError('');
    if (!target.subjectId) return setCalcError('Choose a subject.');
    try {
      const res = await api.get('/marks/target', { params: { studentId: user.student.id, ...target } });
      setCalc(res.data);
    } catch (err) { setCalcError(getErrorMessage(err)); }
  };

  return (
    <>
      <PageHeader title="Marks & Results" />
      <div className="grid grid-cols-2 gap-4">
        <div className="card"><p className="text-sm text-gray-500">Overall percentage</p><p className="text-3xl font-bold">{data.overallPercentage}%</p></div>
        <div className="card"><p className="text-sm text-gray-500">SGPA</p><p className="text-3xl font-bold text-brand-700">{data.sgpa}</p><p className="text-xs text-gray-400">Equal-weight average of subject grade points (10-point scale)</p></div>
      </div>
      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-3">Subject-wise performance</h2>
        {data.bySubject.length === 0 ? <p className="text-sm text-gray-500">No marks recorded yet.</p> : (
          <div className="space-y-4">{data.bySubject.map((s) => (
            <div key={s.subject.id}>
              <div className="flex justify-between text-sm mb-1"><span className="font-medium text-gray-700">{s.subject.name}</span><span>{s.percentage}%</span></div>
              <ProgressBar value={s.percentage} tone={s.percentage < 40 ? 'bad' : 'brand'} />
            </div>
          ))}</div>
        )}
      </div>

      <form onSubmit={runCalc} className="card space-y-3">
        <h2 className="font-semibold text-gray-800">Target calculator</h2>
        <p className="text-sm text-gray-500">How many marks do you need in the end-semester exam to reach your target percentage in a subject?</p>
        <div className="grid sm:grid-cols-4 gap-3">
          <select className="input-field sm:col-span-2" value={target.subjectId} onChange={(e) => setTarget({ ...target, subjectId: e.target.value })}>
            <option value="">Select subject</option>
            {data.bySubject.map((s) => <option key={s.subject.id} value={s.subject.id}>{s.subject.name}</option>)}
          </select>
          <input type="number" min="1" max="100" className="input-field" value={target.target} onChange={(e) => setTarget({ ...target, target: e.target.value })} title="Target %" />
          <input type="number" min="1" className="input-field" value={target.finalMax} onChange={(e) => setTarget({ ...target, finalMax: e.target.value })} title="Final exam maximum marks" />
        </div>
        <p className="text-xs text-gray-400">Fields: subject · target % · final exam maximum marks</p>
        <button className="btn-primary">Calculate</button>
        {calcError && <p className="text-sm text-red-600">{calcError}</p>}
        {calc && (
          <div className={`rounded-lg p-3 text-sm ${calc.achievable ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
            {calc.achievable
              ? `You need approximately ${calc.neededInFinal} out of ${calc.finalMax} marks in the final exam to reach ${calc.target}%. (So far: ${calc.doneScore}/${calc.doneMax}.)`
              : `Reaching ${calc.target}% would need ${calc.neededInFinal} marks, which is more than the ${calc.finalMax} available. Try a lower target.`}
          </div>
        )}
      </form>

      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-3">Detailed history</h2>
        <Table columns={[
          { key: 'subject', label: 'Subject', render: (r) => r.subject.name },
          { key: 'examType', label: 'Exam', render: (r) => r.examType.replace('_', ' ') },
          { key: 'score', label: 'Score', render: (r) => `${r.score} / ${r.maxScore}` },
          { key: 'date', label: 'Date', render: (r) => new Date(r.createdAt).toLocaleDateString() },
        ]} rows={pageRows} emptyLabel="No marks recorded yet" />
        {controls}
      </div>
    </>
  );
}
