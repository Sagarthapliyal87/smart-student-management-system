import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import useFetch from '../../hooks/useFetch';
import Loader from '../../components/Loader';
import ErrorBanner from '../../components/ErrorBanner';
import StatCard from '../../components/StatCard';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import Badge from '../../components/Badge';
import ProgressBar from '../../components/ProgressBar';

function ChildDetails({ id }) {
  const { data: att, loading: aLoading } = useFetch(`/attendance/student/${id}`);
  const { data: fees, loading: fLoading } = useFetch(`/fees/student/${id}`);
  if (aLoading || fLoading) return <Loader />;
  return (
    <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-gray-100 mt-4">
      <div>
        <h3 className="font-medium text-sm mb-2">Subject-wise attendance</h3>
        {!att?.bySubject.length ? <p className="text-sm text-gray-500">No attendance recorded yet.</p> : att.bySubject.map((s) => (
          <div key={s.subject.id} className="mb-3">
            <div className="flex justify-between text-sm mb-1"><span>{s.subject.name}</span><span className={s.isLow ? 'text-red-600' : ''}>{s.percentage}%</span></div>
            <ProgressBar value={s.percentage} tone={s.isLow ? 'bad' : 'good'} />
          </div>
        ))}
      </div>
      <div>
        <h3 className="font-medium text-sm mb-2">Fees</h3>
        {!fees?.length ? <p className="text-sm text-gray-500">No fee records.</p> : fees.map((f) => (
          <div key={f.id} className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
            <span className="capitalize">{f.feeType.toLowerCase()} · due {new Date(f.dueDate).toLocaleDateString()}</span>
            <span>₹{Number(f.amount).toLocaleString()} <Badge status={f.status} /></span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ParentDashboard() {
  const { data, loading, error, reload } = useFetch('/dashboard/parent');
  const [open, setOpen] = useState(null);
  if (loading) return <Loader label="Loading your dashboard..." />;
  if (error) return <ErrorBanner message={error} onRetry={reload} />;

  return (
    <>
      <PageHeader title="Parent dashboard" subtitle="Academic progress of your child" />
      {data.children.length === 0 && <div className="card"><EmptyState title="No student is linked to your account" description="Ask the administrator to link your child's record." icon="👪" /></div>}
      {data.children.map((c) => (
        <div key={c.student.id} className="space-y-4">
          <div className="card">
            <div className="flex flex-wrap justify-between items-start gap-2">
              <div>
                <p className="text-lg font-semibold">{c.student.name}</p>
                <p className="text-sm text-gray-500">{c.relation} · Roll {c.student.rollNumber} · {c.student.class ? `${c.student.class.course.name}, Sem ${c.student.class.semester} ${c.student.class.section}` : 'No class assigned'}</p>
              </div>
              <button className="btn-secondary" onClick={() => setOpen(open === c.student.id ? null : c.student.id)}>{open === c.student.id ? 'Hide details' : 'View attendance & fees'}</button>
            </div>
            {c.lowAttendanceWarning && <div className="mt-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2 text-sm">⚠️ Attendance is {c.attendancePercentage}%, below the required 75%.</div>}
            {open === c.student.id && <ChildDetails id={c.student.id} />}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Attendance" value={`${c.attendancePercentage}%`} tone={c.lowAttendanceWarning ? 'bad' : 'good'} icon="📅" />
            <StatCard label="Average marks" value={`${c.averageMarks}%`} sub={`SGPA ${c.sgpa}`} icon="📊" />
            <StatCard label="Pending assignments" value={c.pendingAssignments} tone={c.pendingAssignments ? 'warn' : 'good'} icon="📝" sub={`of ${c.totalAssignments}`} />
            <StatCard label="Fees outstanding" value={`₹${Math.max(c.outstandingFees, 0).toLocaleString()}`} tone={c.outstandingFees > 0 ? 'bad' : 'good'} icon="💰" />
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="font-semibold mb-3">Subject performance</h2>
              {c.subjectPerformance.length === 0 ? <EmptyState title="No marks yet" icon="📊" /> : (
                <div className="h-52"><ResponsiveContainer><BarChart data={c.subjectPerformance}><CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="subject" tick={{ fontSize: 11 }} tickFormatter={(v) => (v.length > 10 ? `${v.slice(0, 10)}…` : v)} /><YAxis domain={[0, 100]} tick={{ fontSize: 11 }} /><Tooltip formatter={(v) => `${v}%`} />
                  <Bar dataKey="percentage" fill="#3366ff" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
              )}
            </div>
            <div className="card">
              <h2 className="font-semibold mb-3">Upcoming exams</h2>
              {c.upcomingExams.length === 0 ? <EmptyState title="No upcoming exams" icon="📝" /> : (
                <ul className="space-y-2">{c.upcomingExams.map((x) => (
                  <li key={x.id} className="flex justify-between text-sm border-b border-gray-50 last:border-0 pb-2"><span className="font-medium">{x.subject.name}</span><span className="text-gray-500">{new Date(x.examDate).toLocaleDateString()} {x.startTime || ''}</span></li>
                ))}</ul>
              )}
              {c.pendingList.length > 0 && <><h3 className="font-medium text-sm mt-4 mb-2">Assignments due</h3>
                <ul className="space-y-1 text-sm">{c.pendingList.map((a) => <li key={a.id} className="flex justify-between"><span>{a.title} · {a.subject}</span><span className="text-gray-500">{new Date(a.deadline).toLocaleDateString()}</span></li>)}</ul></>}
            </div>
          </div>
        </div>
      ))}
      <div className="card">
        <h2 className="font-semibold mb-3">Recent notices</h2>
        {data.recentNotices.length === 0 ? <EmptyState title="No notices yet" icon="🔔" /> : (
          <ul className="space-y-3">{data.recentNotices.map((n) => <li key={n.id} className="border-b border-gray-50 last:border-0 pb-2"><p className="font-medium text-sm">{n.title}</p><p className="text-xs text-gray-500 line-clamp-2">{n.content}</p></li>)}</ul>
        )}
      </div>
    </>
  );
}
