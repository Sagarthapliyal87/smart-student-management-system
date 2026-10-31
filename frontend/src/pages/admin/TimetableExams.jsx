import { useState } from 'react';
import { api, getErrorMessage } from '../../services/api';
import { useToast } from '../../components/Toast';
import useFetch from '../../hooks/useFetch';
import Loader from '../../components/Loader';
import ErrorBanner from '../../components/ErrorBanner';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import Table from '../../components/Table';
import ConfirmDialog from '../../components/ConfirmDialog';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const cn = (c) => `${c.course.name} - Sem ${c.semester} ${c.section}`;

export default function AdminTimetableExams() {
  const { showToast } = useToast();
  const { data: classes } = useFetch('/academics/classes');
  const { data: teachers } = useFetch('/teachers');
  const { data: allSubjects } = useFetch('/academics/subjects');
  const [classId, setClassId] = useState('');
  const { data: slots, loading, error, reload } = useFetch(classId ? `/timetable/class/${classId}` : null);
  const { data: exams, reload: reloadExams } = useFetch('/exams');
  const [slot, setSlot] = useState({ subjectId: '', teacherId: '', dayOfWeek: 'MON', startTime: '09:00', endTime: '10:00', roomNumber: '' });
  const [exam, setExam] = useState({ subjectId: '', title: '', examType: 'END_SEM', examDate: '', startTime: '10:00', room: '' });
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const classSubjects = (allSubjects || []).filter((s) => String(s.classId) === classId);

  const post = async (url, body, ok, after) => {
    setBusy(true);
    try { await api.post(url, body); showToast(ok); after(); }
    catch (err) { showToast(getErrorMessage(err), 'error'); } finally { setBusy(false); }
  };
  const addSlot = (e) => {
    e.preventDefault();
    if (!classId || !slot.subjectId || !slot.teacherId) return showToast('Choose a class, subject and teacher.', 'error');
    if (slot.startTime >= slot.endTime) return showToast('End time must be after start time.', 'error');
    post('/timetable', { ...slot, classId }, 'Slot added.', reload);
  };
  const addExam = (e) => {
    e.preventDefault();
    if (!exam.subjectId || !exam.title.trim() || !exam.examDate) return showToast('Subject, title and date are required.', 'error');
    post('/exams', exam, 'Exam scheduled. Students were notified.', () => { setExam({ ...exam, title: '', examDate: '' }); reloadExams(); });
  };
  const remove = async () => {
    setBusy(true);
    try { await api.delete(`/${toDelete.kind}/${toDelete.id}`); showToast('Removed.'); setToDelete(null); reload(); reloadExams(); }
    catch (err) { showToast(getErrorMessage(err), 'error'); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Timetable & exams" />
      <div className="card"><label className="label">Class</label>
        <select className="input-field max-w-md" value={classId} onChange={(e) => { setClassId(e.target.value); setSlot({ ...slot, subjectId: '' }); }}><option value="">Select a class</option>{(classes || []).map((c) => <option key={c.id} value={c.id}>{cn(c)}</option>)}</select></div>

      {classId && (
        <>
          <form onSubmit={addSlot} className="card grid sm:grid-cols-6 gap-3 items-end">
            <div className="sm:col-span-2"><label className="label">Subject</label><select className="input-field" value={slot.subjectId} onChange={(e) => setSlot({ ...slot, subjectId: e.target.value })}><option value="">Select</option>{classSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div className="sm:col-span-2"><label className="label">Teacher</label><select className="input-field" value={slot.teacherId} onChange={(e) => setSlot({ ...slot, teacherId: e.target.value })}><option value="">Select</option>{(teachers || []).filter((t) => t.user.isActive).map((t) => <option key={t.id} value={t.id}>{t.user.name}</option>)}</select></div>
            <div><label className="label">Day</label><select className="input-field" value={slot.dayOfWeek} onChange={(e) => setSlot({ ...slot, dayOfWeek: e.target.value })}>{DAYS.map((d) => <option key={d}>{d}</option>)}</select></div>
            <div><label className="label">Room</label><input className="input-field" value={slot.roomNumber} onChange={(e) => setSlot({ ...slot, roomNumber: e.target.value })} /></div>
            <div><label className="label">Start</label><input type="time" className="input-field" value={slot.startTime} onChange={(e) => setSlot({ ...slot, startTime: e.target.value })} /></div>
            <div><label className="label">End</label><input type="time" className="input-field" value={slot.endTime} onChange={(e) => setSlot({ ...slot, endTime: e.target.value })} /></div>
            <button className="btn-primary sm:w-fit" disabled={busy}>Add slot</button>
          </form>
          <div className="card">
            {loading ? <Loader /> : error ? <ErrorBanner message={error} onRetry={reload} /> : !slots.length ? <EmptyState title="No timetable slots for this class yet" icon="🗓️" /> : (
              <div className="grid md:grid-cols-2 gap-4">{DAYS.map((d) => {
                const day = slots.filter((s) => s.dayOfWeek === d);
                if (!day.length) return null;
                return (<div key={d}><h3 className="font-semibold text-sm mb-2">{d}</h3><ul className="space-y-1.5">{day.map((s) => (
                  <li key={s.id} className="flex justify-between text-sm border-b border-gray-50 pb-1.5"><span>{s.startTime}-{s.endTime} · {s.subject.name} <span className="text-gray-400">({s.teacher.user.name}{s.roomNumber ? `, ${s.roomNumber}` : ''})</span></span>
                    <button className="text-red-600 hover:underline" onClick={() => setToDelete({ kind: 'timetable', id: s.id, label: `${s.subject.name} on ${d}` })}>Remove</button></li>))}</ul></div>);
              })}</div>
            )}
          </div>
        </>
      )}

      <h2 className="text-lg font-semibold pt-2">Exam schedule</h2>
      <form onSubmit={addExam} className="card grid sm:grid-cols-6 gap-3 items-end">
        <div className="sm:col-span-2"><label className="label">Subject</label><select className="input-field" value={exam.subjectId} onChange={(e) => setExam({ ...exam, subjectId: e.target.value })}><option value="">Select</option>{(allSubjects || []).map((s) => <option key={s.id} value={s.id}>{s.name} ({cn(s.class)})</option>)}</select></div>
        <div className="sm:col-span-2"><label className="label">Title</label><input className="input-field" value={exam.title} onChange={(e) => setExam({ ...exam, title: e.target.value })} placeholder="End Semester - DBMS" /></div>
        <div><label className="label">Type</label><select className="input-field" value={exam.examType} onChange={(e) => setExam({ ...exam, examType: e.target.value })}>{['INTERNAL', 'MID_SEM', 'END_SEM', 'PRACTICAL'].map((x) => <option key={x} value={x}>{x.replace('_', ' ')}</option>)}</select></div>
        <div><label className="label">Date</label><input type="date" className="input-field" value={exam.examDate} onChange={(e) => setExam({ ...exam, examDate: e.target.value })} /></div>
        <div><label className="label">Start</label><input type="time" className="input-field" value={exam.startTime} onChange={(e) => setExam({ ...exam, startTime: e.target.value })} /></div>
        <div className="sm:col-span-2"><label className="label">Room</label><input className="input-field" value={exam.room} onChange={(e) => setExam({ ...exam, room: e.target.value })} /></div>
        <button className="btn-primary sm:w-fit" disabled={busy}>Schedule exam</button>
      </form>
      <div className="card"><Table columns={[
        { key: 'date', label: 'Date', render: (x) => new Date(x.examDate).toLocaleDateString() }, { key: 'title', label: 'Exam' },
        { key: 'subject', label: 'Class', render: (x) => cn(x.subject.class) }, { key: 'time', label: 'Time / room', render: (x) => `${x.startTime || '-'} · ${x.room || '-'}` },
        { key: 'act', label: '', render: (x) => <button className="text-red-600 hover:underline" onClick={() => setToDelete({ kind: 'exams', id: x.id, label: x.title })}>Remove</button> },
      ]} rows={exams} emptyLabel="No upcoming exams scheduled" /></div>
      <ConfirmDialog open={!!toDelete} message={`Remove "${toDelete?.label}"?`} confirmLabel="Remove" busy={busy} onConfirm={remove} onCancel={() => setToDelete(null)} />
    </>
  );
}
