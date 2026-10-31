import { useState } from 'react';
import { api, getErrorMessage } from '../../services/api';
import { useToast } from '../../components/Toast';
import useFetch from '../../hooks/useFetch';
import Loader from '../../components/Loader';
import ErrorBanner from '../../components/ErrorBanner';
import PageHeader from '../../components/PageHeader';
import Table from '../../components/Table';
import ConfirmDialog from '../../components/ConfirmDialog';

const TABS = ['courses', 'classes', 'subjects'];

export default function AdminAcademics() {
  const { showToast } = useToast();
  const [tab, setTab] = useState('courses');
  const courses = useFetch('/academics/courses');
  const classes = useFetch('/academics/classes');
  const subjects = useFetch('/academics/subjects');
  const [course, setCourse] = useState({ name: '', durationYears: 4 });
  const [cls, setCls] = useState({ courseId: '', semester: 1, section: '' });
  const [sub, setSub] = useState({ name: '', code: '', classId: '' });
  const [toDelete, setToDelete] = useState(null); // { kind, id, label }
  const [busy, setBusy] = useState(false);

  const submit = async (e, url, body, valid, reload, ok, reset) => {
    e.preventDefault();
    if (valid) return showToast(valid, 'error');
    setBusy(true);
    try { await api.post(url, body); showToast(ok); reset(); reload(); if (url.includes('classes')) classes.reload(); }
    catch (err) { showToast(getErrorMessage(err), 'error'); } finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true);
    try { await api.delete(`/academics/${toDelete.kind}/${toDelete.id}`); showToast('Deleted.'); setToDelete(null); courses.reload(); classes.reload(); subjects.reload(); }
    catch (err) { showToast(getErrorMessage(err), 'error'); setToDelete(null); } finally { setBusy(false); }
  };
  const del = (kind, id, label) => <button className="text-red-600 text-sm hover:underline" onClick={() => setToDelete({ kind, id, label })}>Delete</button>;
  const cn = (c) => `${c.course.name} - Sem ${c.semester} ${c.section}`;

  return (
    <>
      <PageHeader title="Courses, classes & subjects" subtitle="A class is one section of one semester of a course." />
      <div className="flex gap-2">{TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-full text-sm border capitalize ${tab === t ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200'}`}>{t}</button>)}</div>

      {tab === 'courses' && (
        <>
          <form className="card grid sm:grid-cols-3 gap-3 items-end" onSubmit={(e) => submit(e, '/academics/courses', course, !course.name.trim() ? 'Course name is required.' : !(Number(course.durationYears) > 0) ? 'Duration must be at least 1 year.' : '', courses.reload, 'Course added.', () => setCourse({ name: '', durationYears: 4 }))}>
            <div className="sm:col-span-2"><label className="label">Course name</label><input className="input-field" value={course.name} onChange={(e) => setCourse({ ...course, name: e.target.value })} placeholder="B.Tech Computer Science" /></div>
            <div><label className="label">Duration (years)</label><input type="number" min="1" max="8" className="input-field" value={course.durationYears} onChange={(e) => setCourse({ ...course, durationYears: e.target.value })} /></div>
            <button className="btn-primary sm:w-fit" disabled={busy}>Add course</button>
          </form>
          <div className="card">{courses.loading ? <Loader /> : courses.error ? <ErrorBanner message={courses.error} onRetry={courses.reload} /> : (
            <Table columns={[{ key: 'name', label: 'Course' }, { key: 'durationYears', label: 'Years' }, { key: 'n', label: 'Classes', render: (c) => c.classes.length }, { key: 'act', label: '', render: (c) => del('courses', c.id, c.name) }]} rows={courses.data} emptyLabel="No courses yet" />)}</div>
        </>
      )}

      {tab === 'classes' && (
        <>
          <form className="card grid sm:grid-cols-4 gap-3 items-end" onSubmit={(e) => submit(e, '/academics/classes', cls, !cls.courseId ? 'Choose a course.' : !cls.section.trim() ? 'Section is required.' : '', classes.reload, 'Class added.', () => setCls({ ...cls, section: '' }))}>
            <div className="sm:col-span-2"><label className="label">Course</label><select className="input-field" value={cls.courseId} onChange={(e) => setCls({ ...cls, courseId: e.target.value })}><option value="">Select course</option>{(courses.data || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className="label">Semester</label><input type="number" min="1" max="12" className="input-field" value={cls.semester} onChange={(e) => setCls({ ...cls, semester: e.target.value })} /></div>
            <div><label className="label">Section</label><input className="input-field" value={cls.section} onChange={(e) => setCls({ ...cls, section: e.target.value.toUpperCase() })} placeholder="A" maxLength={5} /></div>
            <button className="btn-primary sm:w-fit" disabled={busy}>Add class</button>
          </form>
          <div className="card">{classes.loading ? <Loader /> : classes.error ? <ErrorBanner message={classes.error} onRetry={classes.reload} /> : (
            <Table columns={[{ key: 'name', label: 'Class', render: cn }, { key: 's', label: 'Students', render: (c) => c._count.students }, { key: 'sub', label: 'Subjects', render: (c) => c._count.subjects }, { key: 'act', label: '', render: (c) => del('classes', c.id, cn(c)) }]} rows={classes.data} emptyLabel="No classes yet" />)}</div>
        </>
      )}

      {tab === 'subjects' && (
        <>
          <form className="card grid sm:grid-cols-4 gap-3 items-end" onSubmit={(e) => submit(e, '/academics/subjects', sub, !sub.name.trim() || !sub.code.trim() ? 'Subject name and code are required.' : !sub.classId ? 'Choose a class.' : '', subjects.reload, 'Subject added.', () => setSub({ name: '', code: '', classId: sub.classId }))}>
            <div className="sm:col-span-2"><label className="label">Subject name</label><input className="input-field" value={sub.name} onChange={(e) => setSub({ ...sub, name: e.target.value })} /></div>
            <div><label className="label">Code</label><input className="input-field" value={sub.code} onChange={(e) => setSub({ ...sub, code: e.target.value.toUpperCase() })} placeholder="CSE505" /></div>
            <div><label className="label">Class</label><select className="input-field" value={sub.classId} onChange={(e) => setSub({ ...sub, classId: e.target.value })}><option value="">Select class</option>{(classes.data || []).map((c) => <option key={c.id} value={c.id}>{cn(c)}</option>)}</select></div>
            <button className="btn-primary sm:w-fit" disabled={busy}>Add subject</button>
          </form>
          <div className="card">{subjects.loading ? <Loader /> : subjects.error ? <ErrorBanner message={subjects.error} onRetry={subjects.reload} /> : (
            <Table columns={[{ key: 'code', label: 'Code' }, { key: 'name', label: 'Subject' }, { key: 'class', label: 'Class', render: (s) => cn(s.class) }, { key: 't', label: 'Teachers', render: (s) => (s.teachers.length ? s.teachers.map((t) => t.teacher.user.name).join(', ') : <span className="text-gray-400">None</span>) }, { key: 'act', label: '', render: (s) => del('subjects', s.id, s.name) }]} rows={subjects.data} emptyLabel="No subjects yet" />)}</div>
        </>
      )}
      <ConfirmDialog open={!!toDelete} message={`Delete "${toDelete?.label}"? This cannot be undone. Items that are still in use cannot be deleted.`} confirmLabel="Delete" busy={busy} onConfirm={remove} onCancel={() => setToDelete(null)} />
    </>
  );
}
