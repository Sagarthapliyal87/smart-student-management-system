import { useState } from 'react';
import { api, getErrorMessage } from '../../services/api';
import { useToast } from '../../components/Toast';
import useFetch from '../../hooks/useFetch';
import Loader from '../../components/Loader';
import ErrorBanner from '../../components/ErrorBanner';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import Table from '../../components/Table';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import { usePagination } from '../../components/Pagination';

const rs = (n) => `₹${Number(n).toLocaleString()}`;

function printReceipt(fee, payment) {
  const w = window.open('', '_blank', 'width=600,height=700');
  if (!w) return;
  w.document.write(`<html><head><title>Receipt ${payment.receiptNumber}</title><style>body{font-family:Arial;padding:32px}h1{font-size:20px}td{padding:6px 12px 6px 0}</style></head><body>
  <h1>Fee Payment Receipt</h1><p>Smart Student Management System</p><hr/>
  <table><tr><td>Receipt no.</td><td><b>${payment.receiptNumber}</b></td></tr>
  <tr><td>Date</td><td>${new Date(payment.paidAt).toLocaleString()}</td></tr>
  <tr><td>Student</td><td>${fee.student.user.name} (${fee.student.rollNumber})</td></tr>
  <tr><td>Fee type</td><td>${fee.feeType}</td></tr>
  <tr><td>Amount paid</td><td><b>Rs. ${Number(payment.amountPaid).toLocaleString()}</b></td></tr></table>
  <p style="margin-top:40px;font-size:12px;color:#666">This is a computer-generated receipt.</p></body></html>`);
  w.document.close(); w.focus(); w.print();
}

export default function AdminFees() {
  const { showToast } = useToast();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const qs = new URLSearchParams({ ...(status && { status }), ...(search && { search }) }).toString();
  const { data, loading, error, reload } = useFetch(`/fees/all${qs ? `?${qs}` : ''}`);
  const { data: students } = useFetch('/students');
  const [modal, setModal] = useState(null);
  const [fee, setFee] = useState({ studentId: '', feeType: 'TUITION', amount: '', dueDate: '' });
  const [target, setTarget] = useState(null);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const { pageRows, controls } = usePagination(data?.fees, 10);

  const create = async (e) => {
    e.preventDefault();
    if (!fee.studentId || !(Number(fee.amount) > 0) || !fee.dueDate) return showToast('Student, a positive amount and a due date are required.', 'error');
    setBusy(true);
    try { await api.post('/fees', fee); showToast('Fee created.'); setModal(null); setFee({ studentId: '', feeType: 'TUITION', amount: '', dueDate: '' }); reload(); }
    catch (err) { showToast(getErrorMessage(err), 'error'); } finally { setBusy(false); }
  };
  const pay = async (e) => {
    e.preventDefault();
    if (!(Number(amount) > 0) || Number(amount) > target.remaining) return showToast(`Enter an amount between 1 and ${target.remaining}.`, 'error');
    setBusy(true);
    try {
      const res = await api.post(`/fees/${target.id}/pay`, { amountPaid: Number(amount) });
      showToast(`Payment recorded. Receipt ${res.data.payment.receiptNumber}`);
      const t = target; setModal(null); setTarget(null); setAmount(''); reload();
      if (window.confirm('Print the receipt now?')) printReceipt(t, res.data.payment);
    } catch (err) { showToast(getErrorMessage(err), 'error'); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Fees" action={<button className="btn-primary" onClick={() => setModal('create')}>+ Add fee</button>} />
      {data && <div className="grid grid-cols-3 gap-4"><StatCard label="Total billed" value={rs(data.summary.totalDue)} /><StatCard label="Collected" value={rs(data.summary.totalCollected)} tone="good" /><StatCard label="Outstanding" value={rs(data.summary.outstanding)} tone="bad" /></div>}
      <div className="flex flex-wrap gap-3">
        <input className="input-field max-w-xs" placeholder="Search student or roll number..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input-field max-w-[180px]" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option><option value="UNPAID">Unpaid</option><option value="PARTIAL">Partial</option><option value="PAID">Paid</option></select>
      </div>
      <div className="card">
        {loading ? <Loader /> : error ? <ErrorBanner message={error} onRetry={reload} /> : (
          <>
            <Table columns={[
              { key: 'student', label: 'Student', render: (f) => `${f.student.user.name} (${f.student.rollNumber})` },
              { key: 'feeType', label: 'Type', render: (f) => f.feeType.toLowerCase() },
              { key: 'amount', label: 'Amount', render: (f) => rs(f.amount) },
              { key: 'paid', label: 'Paid', render: (f) => rs(f.paid) },
              { key: 'due', label: 'Due date', render: (f) => new Date(f.dueDate).toLocaleDateString() },
              { key: 'status', label: 'Status', render: (f) => <Badge status={f.status} /> },
              { key: 'act', label: '', render: (f) => (
                <div className="flex gap-3 text-sm">
                  {f.remaining > 0 && <button className="text-brand-600 hover:underline" onClick={() => { setTarget(f); setAmount(String(f.remaining)); setModal('pay'); }}>Record payment</button>}
                  {f.payments.length > 0 && <button className="text-gray-600 hover:underline" onClick={() => printReceipt(f, f.payments[f.payments.length - 1])}>Last receipt</button>}
                </div>) },
            ]} rows={pageRows} emptyLabel="No fee records found" />
            {controls}
          </>
        )}
      </div>
      <Modal open={modal === 'create'} onClose={() => setModal(null)} title="Add fee record">
        <form onSubmit={create} className="space-y-3">
          <div><label className="label">Student</label><select className="input-field" value={fee.studentId} onChange={(e) => setFee({ ...fee, studentId: e.target.value })}><option value="">Select student</option>{(students || []).filter((s) => s.user.isActive).map((s) => <option key={s.id} value={s.id}>{s.user.name} ({s.rollNumber})</option>)}</select></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">Type</label><select className="input-field" value={fee.feeType} onChange={(e) => setFee({ ...fee, feeType: e.target.value })}>{['TUITION', 'EXAM', 'HOSTEL', 'TRANSPORT'].map((t) => <option key={t}>{t}</option>)}</select></div>
            <div><label className="label">Amount (₹)</label><input type="number" min="1" className="input-field" value={fee.amount} onChange={(e) => setFee({ ...fee, amount: e.target.value })} /></div>
            <div><label className="label">Due date</label><input type="date" className="input-field" value={fee.dueDate} onChange={(e) => setFee({ ...fee, dueDate: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button><button className="btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Create'}</button></div>
        </form>
      </Modal>
      <Modal open={modal === 'pay'} onClose={() => setModal(null)} title="Record payment">
        {target && <form onSubmit={pay} className="space-y-3">
          <p className="text-sm text-gray-600">{target.student.user.name} · {target.feeType.toLowerCase()} fee · remaining <b>{rs(target.remaining)}</b></p>
          <div><label className="label">Amount received (₹)</label><input type="number" min="1" max={target.remaining} className="input-field" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button><button className="btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Record payment'}</button></div>
        </form>}
      </Modal>
    </>
  );
}
