import { useState } from 'react';
import useFetch from '../../hooks/useFetch';
import AIBox, { AIStatusBanner } from '../../components/AIBox';
import PageHeader from '../../components/PageHeader';

export default function TeacherAITools() {
  const { data: status } = useFetch('/ai/status');
  const { data: subjects } = useFetch('/teachers/me/subjects');
  const [q, setQ] = useState({ subject: '', unit: '', difficulty: 'Medium' });
  const [source, setSource] = useState('');
  const off = status && !status.configured;

  return (
    <>
      <PageHeader title="AI tools" subtitle="Generated content should be reviewed before use." />
      <AIStatusBanner configured={status?.configured} />
      <AIBox title="AI question generator" description="Select subject, unit and difficulty to generate practice questions." disabled={off}
        buildRequest={() => (!q.subject || !q.unit.trim() ? { error: 'Choose a subject and enter a unit.' } : { url: '/ai/question-generator', body: q })}>
        <div className="grid sm:grid-cols-3 gap-3">
          <select className="input-field" value={q.subject} onChange={(e) => setQ({ ...q, subject: e.target.value })}>
            <option value="">Subject</option>{(subjects || []).map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}</select>
          <input className="input-field" placeholder="Unit (e.g. Unit 3 - Normalization)" value={q.unit} onChange={(e) => setQ({ ...q, unit: e.target.value })} />
          <select className="input-field" value={q.difficulty} onChange={(e) => setQ({ ...q, difficulty: e.target.value })}><option>Easy</option><option>Medium</option><option>Hard</option></select>
        </div>
      </AIBox>
      <AIBox title="AI notes generator" description="Paste material to get short notes, key points, revision questions and MCQs." disabled={off}
        buildRequest={() => (source.trim().length > 50 ? { url: '/ai/notes-generator', body: { sourceText: source } } : { error: 'Paste at least a few sentences.' })}>
        <textarea rows={6} className="input-field" value={source} onChange={(e) => setSource(e.target.value)} placeholder="Paste text here..." />
      </AIBox>
    </>
  );
}
