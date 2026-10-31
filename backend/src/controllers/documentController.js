const prisma = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

const uploadDocument = asyncHandler(async (req, res) => {
  const { title, category } = req.body;
  if (!req.file) return res.status(400).json({ error: 'A file is required.' });
  if (!title || !category) return res.status(400).json({ error: 'title and category are required.' });
  const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
  if (!student) return res.status(403).json({ error: 'Only students can upload personal documents.' });
  res.status(201).json(await prisma.document.create({
    data: { studentId: student.id, title, category, filePath: `/uploads/documents/${req.file.filename}` },
  }));
});

const getMyDocuments = asyncHandler(async (req, res) => {
  const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
  if (!student) return res.status(403).json({ error: 'Only students have personal documents.' });
  res.json(await prisma.document.findMany({ where: { studentId: student.id }, orderBy: { uploadedAt: 'desc' } }));
});

const deleteDocument = asyncHandler(async (req, res) => {
  const doc = await prisma.document.findUnique({ where: { id: Number(req.params.id) } });
  const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
  if (!doc || !student || doc.studentId !== student.id) return res.status(404).json({ error: 'Document not found.' });
  await prisma.document.delete({ where: { id: doc.id } });
  res.json({ message: 'Document deleted.' });
});

module.exports = { uploadDocument, getMyDocuments, deleteDocument };
