/**
 * Calls an OpenAI-compatible chat API. If AI_API_KEY is missing, throws a 503
 * "not configured" error that the controllers return cleanly; the rest of the app is unaffected.
 */
const isConfigured = () => Boolean(process.env.AI_API_KEY);

async function chat(systemPrompt, userPrompt) {
  if (!isConfigured()) {
    const err = new Error('AI features are not configured. Ask the administrator to set AI_API_KEY in backend/.env.');
    err.status = 503;
    throw err;
  }
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.AI_API_KEY}` },
    body: JSON.stringify({
      model: process.env.AI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      max_tokens: 900,
    }),
  });
  if (!response.ok) {
    const err = new Error(`The AI provider returned an error (${response.status}). Check your API key and quota.`);
    err.status = 502;
    throw err;
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

module.exports = {
  isConfigured,
  studyAssistant: (q) => chat('You are a helpful, encouraging study assistant for an undergraduate CSE student. Explain clearly and concisely.', q),
  doubtSolver: (q) => chat('You are a patient tutor. Solve the student\'s doubt step by step.', q),
  generateNotes: (text) => chat('Turn the study material into: 1) short notes, 2) key points as bullets, 3) 5 revision questions, 4) 5 MCQs with answers. Use clear headings.', text),
  generateQuestions: (subject, unit, difficulty) => chat(`Generate 8 numbered practice exam questions (no answers). Difficulty: ${difficulty}.`, `Subject: ${subject}\nUnit: ${unit}`),
  studyPlanner: (p) => chat('Create a realistic day-by-day study plan. Be specific about subject/topic per day.', `Exam date: ${p.examDate}\nSubjects: ${p.subjects.join(', ')}\nWeak subjects: ${p.weakSubjects.join(', ') || 'none'}\nStudy hours per day: ${p.availableHoursPerDay}`),
  performanceAnalysis: (summary) => chat('Analyze this student\'s marks data. Give a short, encouraging summary: strengths, weak areas, one concrete suggestion per weak subject.', JSON.stringify(summary)),
};
