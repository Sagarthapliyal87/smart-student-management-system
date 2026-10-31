import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import useFetch from '../../hooks/useFetch';
import Loader from '../../components/Loader';
import ErrorBanner from '../../components/ErrorBanner';
import StatCard from '../../components/StatCard';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';

export default function TeacherDashboard() {
  const { data, loading, error, reload } = useFetch('/dashboard/teacher');
  if (loading) return <Loader label="Loading your dashboard..." />;
  if (error) return <ErrorBanner message={error} onRetry={reload} />;

  return (
    <>
      <PageHeader title="Teacher dashboard" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Subjects assigned" value={data.classesAssigned} icon="📚" />
        <StatCard label="Classes today" value={data.todaysClasses.length} icon="🗓️" />
        <StatCard label="Attendance to mark" value={data.attendanceTasks.length} tone={data.attendanceTasks.length ? 'warn' : 'good'} icon="📅" />
        <StatCard label="Pending evaluations" value={data.pendingEvaluations} tone={data.pendingEvaluations ? 'warn' : 'good'} icon="📝" />
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold mb-3">Today's classes</h2>
          {data.todaysClasses.length === 0 ? <EmptyState title="No classes today" icon="🎉" /> : (
            <ul className="space-y-2">{data.todaysClasses.map((s) => (
              <li key={s.id} className="flex justify-between text-sm border-b border-gray-50 last:border-0 pb-2">
                <div><p className="font-medium">{s.subject.name}</p><p className="text-xs text-gray-400">{s.class.course.name} Sem {s.class.semester} {s.class.section} · Room {s.roomNumber || '-'}</p></div>
                <span className="text-gray-500">{s.startTime} - {s.endTime}</span>
              </li>
            ))}</ul>
          )}
        </div>
        <div className="card">
          <h2 className="font-semibold mb-3">Attendance tasks</h2>
          {data.attendanceTasks.length === 0 ? <EmptyState title="All of today's attendance is marked (or no classes)" icon="✅" /> : (
            <ul className="space-y-2">{data.attendanceTasks.map((s) => (
              <li key={s.id} className="flex justify-between text-sm"><span>{s.subject.name} · {s.startTime}</span><Link className="text-brand-600 underline" to="/teacher/attendance">Mark now</Link></li>
            ))}</ul>
          )}
        </div>
      </div>
      <div className="card">
        <h2 className="font-semibold mb-3">Student performance overview</h2>
        {data.performance.length === 0 ? <EmptyState title="No subjects assigned yet" icon="📊" /> : (
          <div className="h-64"><ResponsiveContainer>
            <BarChart data={data.performance}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="subject" tick={{ fontSize: 11 }} tickFormatter={(v) => (v.length > 12 ? `${v.slice(0, 12)}…` : v)} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} /><Tooltip formatter={(v) => `${v}%`} /><Legend />
              <Bar dataKey="averageMarks" name="Average marks %" fill="#3366ff" radius={[4, 4, 0, 0]} />
              <Bar dataKey="attendance" name="Attendance %" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer></div>
        )}
      </div>
      <div className="card">
        <h2 className="font-semibold mb-3">Recent notices</h2>
        {data.recentNotices.length === 0 ? <EmptyState title="No notices yet" icon="🔔" /> : (
          <ul className="space-y-3">{data.recentNotices.map((n) => <li key={n.id} className="border-b border-gray-50 last:border-0 pb-2"><p className="font-medium text-sm">{n.title}</p><p className="text-xs text-gray-500 line-clamp-2">{n.content}</p></li>)}</ul>
        )}
      </div>
    </>
  );
}
