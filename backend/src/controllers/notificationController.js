const prisma = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

const getMyNotifications = asyncHandler(async (req, res) => {
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.notification.count({ where: { userId: req.user.id, isRead: false } }),
  ]);
  res.json({ notifications, unreadCount });
});

const markAllAsRead = asyncHandler(async (req, res) => {
  await prisma.notification.updateMany({ where: { userId: req.user.id, isRead: false }, data: { isRead: true } });
  res.json({ message: 'All notifications marked as read.' });
});

const markAsRead = asyncHandler(async (req, res) => {
  await prisma.notification.updateMany({ where: { id: Number(req.params.id), userId: req.user.id }, data: { isRead: true } });
  res.json({ message: 'Marked as read.' });
});

module.exports = { getMyNotifications, markAllAsRead, markAsRead };
