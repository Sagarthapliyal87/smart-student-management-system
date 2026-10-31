import useFetch from '../../hooks/useFetch';
import Loader from '../../components/Loader';
import ErrorBanner from '../../components/ErrorBanner';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';

const DAYS = { MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday' };
const TODAY = ['', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][new Date().getDay()];

export default function StudentTimetable() {
  const { data, loading, error, reload } = useFetch('/timetable/my');
  if (loading) return <Loader label="Loading timetable..." />;
  if (error) return <ErrorBanner message={error} onRetry={reload} />;
  if (!data.length) return <div className="card"><EmptyState title="No timetable published yet" icon="🗓️" /></div>;
  return (
    <>
      <PageHeader title="Class timetable" />
      <div className="grid md:grid-cols-2 gap-4">
        {Object.entries(DAYS).map(([key, label]) => {
          const slots = data.filter((s) => s.dayOfWeek === key);
          if (!slots.length) return null;
          return (
            <div key={key} className={`card ${key === TODAY ? 'ring-2 ring-brand-200' : ''}`}>
              <h2 className="font-semibold text-gray-800 mb-3">{label}{key === TODAY && <span className="badge bg-brand-50 text-brand-700 ml-2">Today</span>}</h2>
              <ul className="space-y-2">{slots.map((s) => (
                <li key={s.id} className="flex justify-between text-sm border-b border-gray-50 last:border-0 pb-2">
                  <div><p className="font-medium text-gray-700">{s.subject.name}</p><p className="text-xs text-gray-400">{s.teacher.user.name} · Room {s.roomNumber || '-'}</p></div>
                  <span className="text-gray-500 whitespace-nowrap">{s.startTime} - {s.endTime}</span>
                </li>
              ))}</ul>
            </div>
          );
        })}
      </div>
    </>
  );
}
