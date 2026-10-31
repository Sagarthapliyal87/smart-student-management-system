import { useState } from 'react';
import { downloadFile, getErrorMessage } from '../../services/api';
import { useToast } from '../../components/Toast';
import useFetch from '../../hooks/useFetch';
import Loader from '../../components/Loader';
import ErrorBanner from '../../components/ErrorBanner';
import PageHeader from '../../components/PageHeader';
import Table from '../../components/Table';
import Badge from '../../components/Badge';
import { usePagination } from '../../components/Pagination';

const REPORTS = {
  attendance: { label: 'Attendance', cols: [['rollNumber', 'Roll no.'], ['name', 'Name'], ['class', 'Class'], ['totalClasses', 'Classes'], ['attendancePercentage', 'Attendance %'], ['status', 'Status']], classFilter: true },
  marks: { label: 'Marks / performance', cols: [['rollNumber', 'Roll no.'], ['name', 'Name'], ['class', 'Class'], ['subjectsGraded', 'Subjects graded'], ['overallPercentage', 'Overall %']], classFilter: true },
  fees: { label: 'Fees', cols: [['rollNumber', 'Roll no.'], ['student', 'Student'], ['feeType', 'Type'], ['amount', 'Amount'], ['paid', 'Paid'], ['remaining', 'Remaining'], ['status', 'Status'], ['dueDate', 'Due']] },
  department: { label: 'Department / course', cols: [['course', 'Course'], ['classes', 'Classes'], ['students', 'Students'], ['averageAttendance', 'Avg attendance %'], ['averageMarks', 'Avg marks %']] },
};

export default function AdminReports() {
  const { showToast } = useToast();
  const [type, setType] = useState('attendance');
  const [classId, setClassId] = useState('');
  const { data: classes } = useFetch('/academics/classes');
  const cfg = REPORTS[type];
  const url = `/reports/${type}${cfg.classFilter && classId ? `?classId=${classId}` : ''}`;
  const { data, loading, error, reload } = useFetch(url);
  const { pageRows, controls } = usePagination(data, 15);

  const csv = async () => {
    try { await downloadFile(`${url}${url.includes('?') ? '&' : '?'}format=csv`, `${type}_report.csv`); showToast('CSV downloaded. It opens directly in Excel.'); }
    catch (err) { showToast(getErrorMessage(err), 'error'); }
  };

  return (
    <>
      <PageHeader title="Reports" subtitle="Export as CSV (opens in Excel) or print / save as PDF from your browser."
        action={<div className="flex gap-2 print:hidden"><button className="btn-secondary" onClick={() => window.print()}>Print / Save as PDF</button><button className="btn-primary" onClick={csv}>Download CSV</button></div>} />
      <div className="flex flex-wrap gap-2 print:hidden">
        {Object.entries(REPORTS).map(([k, v]) => <button key={k} onClick={() => setType(k)} className={`px-4 py-1.5 rounded-full text-sm border ${type === k ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200'}`}>{v.label}</button>)}
        {cfg.classFilter && <select className="input-field !w-auto" value={classId} onChange={(e) => setClassId(e.target.value)}><option value="">All classes</option>{(classes || []).map((c) => <option key={c.id} value={c.id}>{c.course.name} Sem {c.semester} {c.section}</option>)}</select>}
      </div>
      <div className="card">
        {loading ? <Loader label="Generating report..." /> : error ? <ErrorBanner message={error} onRetry={reload} /> : (
          <>
            <Table columns={cfg.cols.map(([key, label]) => ({ key, label, render: key === 'status' && (type === 'fees' || type === 'attendance') ? (r) => <Badge status={r.status} /> : undefined }))} rows={pageRows} emptyLabel="No data for this report yet" />
            {controls}
          </>
        )}
      </div>
    </>
  );
}
