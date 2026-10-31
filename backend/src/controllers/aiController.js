const prisma = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const ai = require('../services/aiService');

const need = (res, cond, msg) => { if (!cond) { res.status(400).json({ error: msg }); return false; } return true; };

const getStatus = asyncHandler(async (req, res) => res.json({ configured: ai.isConfigured() }));

const studyAssistant = asyncHandler(async (req, res) => {
  if (!need(res, req.body.question?.trim(), 'question is required.')) return;
  res.json({ result: await ai.studyAssistant(req.body.question) });
});

const doubtSolver = asyncHandler(async (req, res) => {
  if (!need(res, req.body.question?.trim(), 'question is required.')) return;
  res.json({ result: await ai.doubtSolver(req.body.question) });
});

const notesGenerator = asyncHandler(async (req, res) => {
  if (!need(res, req.body.sourceText?.trim(), 'Paste the material to summarize.')) return;
  res.json({ result: await ai.generateNotes(req.body.sourceText.slice(0, 12000)) });
});

const questionGenerator = asyncHandler(async (req, res) => {
  const { subject, unit, difficulty } = req.body;
  if (!need(res, subject && unit && difficulty, 'subject, unit and difficulty are required.')) return;
  res.json({ result: await ai.generateQuestions(subject, unit, difficulty) });
});

const studyPlanner = asyncHandler(async (req, res) => {
  const { examDate, subjects, weakSubjects, availableHoursPerDay } = req.body;
  if (!need(res, examDate && Array.isArray(subjects) && subjects.length && availableHoursPerDay, 'examDate, subjects and availableHoursPerDay are required.')) return;
  res.json({ result: await ai.studyPlanner({ examDate, subjects, weakSubjects: weakSubjects || [], availableHoursPerDay }) });
});

/** Uses the student's real marks + attendance from the database. */
const performanceAnalysis = asyncHandler(async (req, res) => {
  const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
  if (!student) return res.status(403).json({ error: 'Only students can request their own performance analysis.' });
  const marks = await prisma.mark.findMany({ where: { studentId: student.id }, include: { subject: true }, orderBy: { createdAt: 'asc' } });
  if (!marks.length) return res.json({ result: 'No marks have been recorded yet, so there is nothing to analyze.' });
  const summary = {};
  for (const m of marks) (summary[m.subject.name] ||= []).push({ exam: m.examType, percentage: Math.round((m.score / m.maxScore) * 100) });
  res.json({ result: await ai.performanceAnalysis(summary) });
});

module.exports = { getStatus, studyAssistant, doubtSolver, notesGenerator, questionGenerator, studyPlanner, performanceAnalysis };
