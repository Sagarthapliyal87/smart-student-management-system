const prisma = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const { teacherTeachesSubject } = require('../utils/access');

const uploadMaterial = asyncHandler(async (req, res) => {
  const { subjectId, title } = req.body;
  if (!req.file) return res.status(400).json({ error: 'A file is required.' });
  if (!subjectId || !title) return res.status(400).json({ error: 'subjectId and title are required.' });
  const teacher = await teacherTeachesSubject(req.user.id, Number(subjectId));
  if (!teacher) return res.status(403).json({ error: 'You can only upload material for subjects assigned to you.' });
  const material = await prisma.studyMaterial.create({
    data: { subjectId: Number(subjectId), teacherId: teacher.id, title, filePath: `/uploads/notes/${req.file.filename}` },
    include: { subject: true },
  });
  const students = await prisma.student.findMany({ where: { classId: material.subject.classId }, select: { userId: true } });
  if (students.length) {
    await prisma.notification.createMany({
      data: students.map((s) => ({ userId: s.userId, type: 'NOTES', message: `New study material in ${material.subject.name}: ${title}` })),
    });
  }
  res.status(201).json(material);
});

const listBySubject = asyncHandler(async (req, res) => {
  res.json(await prisma.studyMaterial.findMany({
    where: { subjectId: Number(req.params.subjectId) },
    include: { teacher: { include: { user: { select: { name: true } } } } },
    orderBy: { uploadedAt: 'desc' },
  }));
});

const deleteMaterial = asyncHandler(async (req, res) => {
  const material = await prisma.studyMaterial.findUnique({ where: { id: Number(req.params.id) } });
  const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
  if (!material || !teacher || material.teacherId !== teacher.id) return res.status(404).json({ error: 'Material not found.' });
  await prisma.studyMaterial.delete({ where: { id: material.id } });
  res.json({ message: 'Study material deleted.' });
});

module.exports = { uploadMaterial, listBySubject, deleteMaterial };
