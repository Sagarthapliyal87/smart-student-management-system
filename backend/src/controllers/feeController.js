const prisma = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const { generateReceiptNumber } = require('../utils/helpers');
const { canViewStudent } = require('../utils/access');

const paidOf = (fee) => fee.payments.reduce((a, p) => a + Number(p.amountPaid), 0);

/** POST /api/fees (Admin) */
const createFee = asyncHandler(async (req, res) => {
  const { studentId, feeType, amount, dueDate } = req.body;
  if (!studentId || !feeType || !amount || !dueDate) return res.status(400).json({ error: 'studentId, feeType, amount and dueDate are required.' });
  if (Number(amount) <= 0) return res.status(400).json({ error: 'Amount must be greater than zero.' });
  const fee = await prisma.fee.create({
    data: { studentId: Number(studentId), feeType, amount: Number(amount), dueDate: new Date(dueDate), status: 'UNPAID' },
    include: { student: true },
  });
  await prisma.notification.create({
    data: { userId: fee.student.userId, type: 'FEE', message: `New ${feeType.toLowerCase()} fee of Rs. ${amount} due on ${new Date(dueDate).toLocaleDateString()}.` },
  });
  res.status(201).json(fee);
});

/** GET /api/fees/student/:studentId */
const getStudentFees = asyncHandler(async (req, res) => {
  const studentId = Number(req.params.studentId);
  if (!(await canViewStudent(req.user, studentId))) return res.status(403).json({ error: 'You are not allowed to view these fees.' });
  res.json(await prisma.fee.findMany({ where: { studentId }, include: { payments: { orderBy: { paidAt: 'desc' } } }, orderBy: { dueDate: 'asc' } }));
});

/** POST /api/fees/:id/pay (Admin) — records a payment, updates status, generates receipt number */
const recordPayment = asyncHandler(async (req, res) => {
  const feeId = Number(req.params.id);
  const amountPaid = Number(req.body.amountPaid);
  if (!amountPaid || amountPaid <= 0) return res.status(400).json({ error: 'A positive amountPaid is required.' });
  const fee = await prisma.fee.findUnique({ where: { id: feeId }, include: { payments: true, student: true } });
  if (!fee) return res.status(404).json({ error: 'Fee record not found.' });
  const remaining = Number(fee.amount) - paidOf(fee);
  if (amountPaid > remaining) return res.status(400).json({ error: `Payment exceeds the remaining balance of Rs. ${remaining}.` });

  const payment = await prisma.feePayment.create({ data: { feeId, amountPaid, receiptNumber: generateReceiptNumber() } });
  const status = paidOf(fee) + amountPaid >= Number(fee.amount) ? 'PAID' : 'PARTIAL';
  await prisma.fee.update({ where: { id: feeId }, data: { status } });
  await prisma.notification.create({
    data: { userId: fee.student.userId, type: 'FEE', message: `Payment of Rs. ${amountPaid} received. Receipt ${payment.receiptNumber}.` },
  });
  res.status(201).json({ payment, newStatus: status });
});

/** GET /api/fees/all?status=&search= (Admin) — fee records with paid/remaining + summary */
const listAllFees = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const where = {};
  if (status) where.status = status;
  if (search) where.student = { OR: [{ rollNumber: { contains: search } }, { user: { name: { contains: search } } }] };
  const fees = await prisma.fee.findMany({
    where, include: { payments: true, student: { include: { user: { select: { name: true } } } } }, orderBy: { dueDate: 'asc' },
  });
  const rows = fees.map((f) => ({ ...f, paid: paidOf(f), remaining: Number(f.amount) - paidOf(f) }));
  const totalDue = rows.reduce((a, f) => a + Number(f.amount), 0);
  const totalCollected = rows.reduce((a, f) => a + f.paid, 0);
  res.json({ fees: rows, summary: { totalDue, totalCollected, outstanding: totalDue - totalCollected } });
});

module.exports = { createFee, getStudentFees, recordPayment, listAllFees };
