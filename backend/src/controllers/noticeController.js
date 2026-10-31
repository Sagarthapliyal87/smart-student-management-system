const prisma = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

/** POST /api/notices — Admin/Teacher; fans out in-app notifications */
const createNotice = asyncHandler(async (req, res) => {
  const { title, content, targetRole, targetClassId } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'title and content are required.' });
  const notice = await prisma.notice.create({
    data: { title, content, postedById: req.user.id, targetRole: targetRole || 'ALL', targetClassId: targetClassId ? Number(targetClassId) : null },
  });

  try {
    let userIds;
    if (notice.targetClassId) {
      const students = await prisma.student.findMany({ where: { classId: notice.targetClassId }, select: { userId: true } });
      userIds = students.map((s) => s.userId);
    } else {
      const users = await prisma.user.findMany({
        where: { isActive: true, ...(notice.targetRole === 'ALL' ? {} : { role: notice.targetRole }) }, select: { id: true },
      });
      userIds = users.map((u) => u.id);
    }
    userIds = userIds.filter((id) => id !== req.user.id);
    if (userIds.length) {
      await prisma.notification.createMany({ data: userIds.map((userId) => ({ userId, type: 'NOTICE', message: `New notice: ${title}` })) });
    }
  } catch (e) { console.error('Notice notification fan-out failed (non-fatal):', e.message); }

  res.status(201).json(notice);
});

/** GET /api/notices?search= — role-aware feed */
const listNotices = asyncHandler(async (req, res) => {
  const or = [{ targetRole: 'ALL', targetClassId: null }];
  if (req.user.role === 'ADMIN') or.push({});
  else or.push({ targetRole: req.user.role, targetClassId: null });
  if (req.user.role === 'STUDENT') {
    const s = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (s?.classId) or.push({ targetClassId: s.classId });
  }
  if (req.user.role === 'PARENT') {
    const p = await prisma.parent.findUnique({ where: { userId: req.user.id }, include: { children: { include: { student: true } } } });
    const ids = (p?.children || []).map((c) => c.student.classId).filter(Boolean);
    if (ids.length) or.push({ targetClassId: { in: ids } });
  }
  const search = req.query.search;
  res.json(await prisma.notice.findMany({
    where: { AND: [{ OR: or }, search ? { OR: [{ title: { contains: search } }, { content: { contains: search } }] } : {}] },
    include: { postedBy: { select: { id: true, name: true, role: true } }, targetClass: { include: { course: true } } },
    orderBy: { createdAt: 'desc' }, take: 100,
  }));
});

/** DELETE /api/notices/:id — admin any; teacher only own */
const deleteNotice = asyncHandler(async (req, res) => {
  const notice = await prisma.notice.findUnique({ where: { id: Number(req.params.id) } });
  if (!notice) return res.status(404).json({ error: 'Notice not found.' });
  if (req.user.role === 'TEACHER' && notice.postedById !== req.user.id) return res.status(403).json({ error: 'You can only delete your own notices.' });
  await prisma.notice.delete({ where: { id: notice.id } });
  res.json({ message: 'Notice deleted.' });
});

module.exports = { createNotice, listNotices, deleteNotice };
