import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import useFetch from '../../hooks/useFetch';
import Loader from '../../components/Loader';
import ErrorBanner from '../../components/ErrorBanner';
import StatCard from '../../components/StatCard';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';

const daysLeft = (d) => Math.max(0, Math.ceil((new Date(d) - new Date().setHours(0, 0, 0, 0)) / 86400000));

export default function StudentDashboard() {
  const { data, loading, error, reload } = useFetch('/dashboard/student');
  if (loading) return <Loader label="Loading your dashboard..." />;
  if (error) return <ErrorBanner message={error} onRetry={reload} />;

  return (
    <>
      <PageHeader title="Your Dashboard" subtitle={data.class ? `${data.class.course.name} · Semester ${data.class.semester} · Section ${data.class.section}` : 'No class assigned yet'} />
      {data.lowAttendanceWarning && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm">
          ⚠️ Your overall attendance is {data.attendancePercentage}%, below the required 75%. <Link to="/student/attendance" className="underline font-medium">View details</Link>
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Attendance" value={`${data.attendancePercentage}%`} tone={data.lowAttendanceWarning ? 'bad' : 'good'} icon="📅" />
        <StatCard label="Average marks" value={`${data.averageMarks}%`} icon="📊" />
        <StatCard label="SGPA" value={data.sgpa} tone="brand" icon="🎓" sub="Equal-weight, 10-point scale" />
        <StatCard label="Semester" value={data.currentSemester ?? '-'} icon="🏛️" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-3">Today's classes</h2>
          {data.todaysClasses.length === 0 ? <EmptyState title="No classes today" icon="🎉" /> : (
            <ul className="space-y-2">
              {data.todaysClasses.map((s) => (
                <li key={s.id} className="flex items-center justify-between text-sm border-b border-gray-50 last:border-0 pb-2">
                  <div><p className="font-medium text-gray-800">{s.subject.name}</p><p className="text-xs text-gray-400">{s.teacher.user.name} · Room {s.roomNumber || '-'}</p></div>
                  <span className="text-gray-500">{s.startTime} - {s.endTime}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-3">Upcoming exams</h2>
          {data.upcomingExams.length === 0 ? <EmptyState title="No upcoming exams" icon="📝" /> : (
            <ul className="space-y-2">
              {data.upcomingExams.map((x) => (
                <li key={x.id} className="flex items-center justify-between text-sm border-b border-gray-50 last:border-0 pb-2">
                  <div><p className="font-medium text-gray-800">{x.subject.name}</p><p className="text-xs text-gray-400">{new Date(x.examDate).toLocaleDateString()} {x.startTime && `· ${x.startTime}`} {x.room && `· ${x.room}`}</p></div>
                  <span className="badge bg-brand-50 text-brand-700">{daysLeft(x.examDate)} days left</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-3">Subject performance</h2>
          {data.subjectPerformance.length === 0 ? <EmptyState title="No marks recorded yet" icon="📊" /> : (
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={data.subjectPerformance}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="subject" tick={{ fontSize: 11 }} tickFormatter={(v) => (v.length > 10 ? `${v.slice(0, 10)}…` : v)} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
                    {data.subjectPerformance.map((s, i) => <Cell key={i} fill={s.percentage < 50 ? '#ef4444' : '#3366ff'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-1">Assignments</h2>
          <p className="text-sm text-gray-500 mb-3"><span className="font-bold text-amber-600">{data.pendingAssignments}</span> pending of {data.totalAssignments}</p>
          {data.pendingList.length === 0 ? <EmptyState title="Nothing pending" icon="✅" /> : (
            <ul className="space-y-2 text-sm">
              {data.pendingList.map((a) => (
                <li key={a.id} className="flex justify-between border-b border-gray-50 last:border-0 pb-2">
                  <span><span className="font-medium">{a.title}</span> <span className="text-gray-400">· {a.subject}</span></span>
                  <span className="text-xs text-gray-500">Due {new Date(a.deadline).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/student/assignments" className="text-sm text-brand-600 underline mt-3 inline-block">Go to assignments</Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-3">Recent notices</h2>
          {data.recentNotices.length === 0 ? <EmptyState title="No notices yet" icon="🔔" /> : (
            <ul className="space-y-3">{data.recentNotices.map((n) => (
              <li key={n.id} className="border-b border-gray-50 last:border-0 pb-2"><p className="font-medium text-sm">{n.title}</p><p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.content}</p></li>
            ))}</ul>
          )}
        </div>
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-3">Recent activity</h2>
          {data.recentActivity.length === 0 ? <EmptyState title="No activity yet" icon="🕒" /> : (
            <ul className="space-y-2 text-sm">{data.recentActivity.map((n) => (
              <li key={n.id} className="border-b border-gray-50 last:border-0 pb-2"><p>{n.message}</p><p className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</p></li>
            ))}</ul>
          )}
        </div>
      </div>
    </>
  );
}
