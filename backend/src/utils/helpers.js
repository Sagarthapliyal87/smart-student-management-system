/** Percentage -> 10-point grade point (common Indian college scale). */
function percentageToGradePoint(p) {
  if (p >= 90) return 10;
  if (p >= 80) return 9;
  if (p >= 70) return 8;
  if (p >= 60) return 7;
  if (p >= 50) return 6;
  if (p >= 40) return 5;
  return 0;
}

/** SGPA = equal-weight average of subject grade points (credits are not modelled). */
function computeSGPA(subjectAverages) {
  if (!subjectAverages.length) return 0;
  const sum = subjectAverages.reduce((a, s) => a + percentageToGradePoint(s.percentage), 0);
  return Math.round((sum / subjectAverages.length) * 100) / 100;
}

function computeAttendancePercentage(records) {
  if (!records.length) return 0;
  const present = records.filter((r) => r.status === 'PRESENT').length;
  return Math.round((present / records.length) * 10000) / 100;
}

/** Groups marks by subject and returns [{ subject, percentage, marks }]. */
function groupMarksBySubject(marks) {
  const map = {};
  for (const m of marks) {
    if (!map[m.subjectId]) map[m.subjectId] = { subject: m.subject, marks: [] };
    map[m.subjectId].marks.push(m);
  }
  return Object.values(map).map((s) => {
    const total = s.marks.reduce((a, m) => a + m.score, 0);
    const max = s.marks.reduce((a, m) => a + m.maxScore, 0);
    return { subject: s.subject, marks: s.marks, percentage: max > 0 ? Math.round((total / max) * 10000) / 100 : 0 };
  });
}

const LOW_ATTENDANCE_THRESHOLD = 75;

function generateReceiptNumber() {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `RCPT-${stamp}-${Math.floor(100000 + Math.random() * 900000)}`;
}

module.exports = {
  percentageToGradePoint, computeSGPA, computeAttendancePercentage, groupMarksBySubject,
  LOW_ATTENDANCE_THRESHOLD, generateReceiptNumber,
};
