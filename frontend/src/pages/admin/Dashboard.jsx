import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import useFetch from '../../hooks/useFetch';
import Loader from '../../components/Loader';
import ErrorBanner from '../../components/ErrorBanner';
import StatCard from '../../components/StatCard';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';

const COLORS = { PRESENT: '#10b981', ABSENT: '#ef4444', LEAVE: '#f59e0b', PAID: '#10b981', PARTIAL: '#f59e0b', UNPAID: '#ef4444' };

function Donut({ obj }) {
  const rows = Object.entries(obj).map(([name, value]) => ({ name, value })).filter((r) => r.value > 0);
  if (!rows.length) return <EmptyState title="No data yet" icon="📊" />;
  return (
    <div className="h-52"><ResponsiveContainer><PieChart>
      <Pie data={rows} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75}>{rows.map((r) => <Cell key={r.name} fill={COLORS[r.name]} />)}</Pie>
      <Tooltip /><Legend />
    </PieChart></ResponsiveContainer></div>
  );
}

export default function AdminDashboard() {
  const { data, loading, error, reload } = useFetch('/dashboard/admin');
  if (loading) return <Loader label="Loading dashboard..." />;
  if (error) return <ErrorBanner message={error} onRetry={reload} />;
  const f = data.feeOverview;
  const rs = (n) => `₹${Number(n).toLocaleString()}`;

  return (
    <>
      <PageHeader title="Admin dashboard" />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Students" value={data.totalStudents} icon="🎓" />
        <StatCard label="Teachers" value={data.totalTeachers} icon="👨‍🏫" />
        <StatCard label="Parents" value={data.totalParents} icon="👪" />
        <StatCard label="Courses" value={data.totalCourses} icon="🏛️" />
        <StatCard label="Classes" value={data.totalClasses} icon="🏫" />
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card"><h2 className="font-semibold">Attendance overview</h2><p className="text-sm text-gray-500 mb-2">Overall: <b>{data.attendanceOverview.percentage}%</b> ({data.attendanceOverview.totalRecords} records)</p><Donut obj={data.attendanceOverview.breakdown} /></div>
        <div className="card"><h2 className="font-semibold">Fee overview</h2><p className="text-sm text-gray-500 mb-2">Collected {rs(f.totalCollected)} of {rs(f.totalDue)} · Outstanding <b className="text-red-600">{rs(f.outstanding)}</b></p><Donut obj={f.byStatus} /></div>
        <div className="card"><h2 className="font-semibold">Performance overview</h2>
          <p className="text-4xl font-bold text-brand-700 mt-4">{data.performanceOverview.averagePercentage}%</p>
          <p className="text-sm text-gray-500 mt-1">Average across {data.performanceOverview.totalMarksRecorded} recorded marks</p></div>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card"><h2 className="font-semibold mb-3">Recent activity</h2>
          {data.recentActivity.length === 0 ? <EmptyState title="No activity yet" icon="🕒" /> : (
            <ul className="space-y-2 text-sm">{data.recentActivity.map((a, i) => (
              <li key={i} className="flex gap-3 border-b border-gray-50 last:border-0 pb-2"><span className="badge bg-gray-100 text-gray-600 h-fit">{a.type}</span><div><p>{a.text}</p><p className="text-xs text-gray-400">{new Date(a.at).toLocaleString()}</p></div></li>
            ))}</ul>
          )}
        </div>
        <div className="card"><h2 className="font-semibold mb-3">Recent notices</h2>
          {data.recentNotices.length === 0 ? <EmptyState title="No notices yet" icon="🔔" /> : (
            <ul className="space-y-3">{data.recentNotices.map((n) => <li key={n.id} className="border-b border-gray-50 last:border-0 pb-2"><p className="font-medium text-sm">{n.title}</p><p className="text-xs text-gray-400">by {n.postedBy.name} · {new Date(n.createdAt).toLocaleDateString()}</p></li>)}</ul>
          )}
        </div>
      </div>
    </>
  );
}
