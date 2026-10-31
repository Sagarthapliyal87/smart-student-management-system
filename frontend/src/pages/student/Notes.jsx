import { useEffect, useState } from 'react';
import { UPLOADS_BASE_URL } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import useFetch from '../../hooks/useFetch';
import Loader from '../../components/Loader';
import ErrorBanner from '../../components/ErrorBanner';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';

export default function StudentNotes() {
  const { user } = useAuth();
  const classId = user.student?.classId;
  const { data: subjects, loading, error } = useFetch(classId ? `/academics/subjects?classId=${classId}` : null);
  const [subjectId, setSubjectId] = useState(null);
  useEffect(() => { if (subjects?.length && !subjectId) setSubjectId(subjects[0].id); }, [subjects]);
  const { data: materials, loading: mLoading, error: mError } = useFetch(subjectId ? `/study-materials/subject/${subjectId}` : null);

  if (loading) return <Loader label="Loading subjects..." />;
  if (error) return <ErrorBanner message={error} />;
  if (!subjects?.length) return <div className="card"><EmptyState title="You are not assigned to a class yet" icon="📚" /></div>;

  return (
    <>
      <PageHeader title="Notes & study material" />
      <div className="flex gap-2 flex-wrap">
        {subjects.map((s) => (
          <button key={s.id} onClick={() => setSubjectId(s.id)} className={`px-3 py-1.5 rounded-full text-sm border ${subjectId === s.id ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200'}`}>{s.name}</button>
        ))}
      </div>
      <div className="card">
        {mLoading ? <Loader label="Loading materials..." /> : mError ? <ErrorBanner message={mError} /> : !materials?.length ? (
          <EmptyState title="No study material uploaded for this subject yet" icon="📄" />
        ) : (
          <ul className="space-y-3">{materials.map((m) => (
            <li key={m.id} className="flex items-center justify-between border-b border-gray-50 last:border-0 pb-2">
              <div><p className="font-medium text-sm text-gray-800">{m.title}</p><p className="text-xs text-gray-400">By {m.teacher.user.name} · {new Date(m.uploadedAt).toLocaleDateString()}</p></div>
              <a href={`${UPLOADS_BASE_URL}${m.filePath}`} target="_blank" rel="noreferrer" className="text-sm text-brand-600 underline">Open</a>
            </li>
          ))}</ul>
        )}
      </div>
    </>
  );
}
