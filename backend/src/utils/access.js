const prisma = require('../config/db');

/**
 * Checks whether the logged-in user may view data for the given studentId.
 * ADMIN/TEACHER: always. STUDENT: only self. PARENT: only linked children.
 */
async function canViewStudent(user, studentId) {
  if (user.role === 'ADMIN' || user.role === 'TEACHER') return true;
  if (user.role === 'STUDENT') {
    const own = await prisma.student.findUnique({ where: { userId: user.id } });
    return !!own && own.id === studentId;
  }
  if (user.role === 'PARENT') {
    const parent = await prisma.parent.findUnique({ where: { userId: user.id } });
    if (!parent) return false;
    const link = await prisma.studentParent.findUnique({
      where: { studentId_parentId: { studentId, parentId: parent.id } },
    });
    return !!link;
  }
  return false;
}

/** Returns true if the teacher (by userId) is assigned to the subject. */
async function teacherTeachesSubject(userId, subjectId) {
  const teacher = await prisma.teacher.findUnique({ where: { userId } });
  if (!teacher) return null;
  const link = await prisma.teacherSubject.findUnique({
    where: { teacherId_subjectId: { teacherId: teacher.id, subjectId } },
  });
  return link ? teacher : null;
}

module.exports = { canViewStudent, teacherTeachesSubject };
