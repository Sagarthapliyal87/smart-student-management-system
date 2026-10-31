import { useAuth } from '../../context/AuthContext';
import useFetch from '../../hooks/useFetch';
import Loader from '../../components/Loader';
import ErrorBanner from '../../components/ErrorBanner';
import EmptyState from '../../components/EmptyState';
import Badge from '../../components/Badge';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';

export default function StudentFees() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch(user.student ? `/fees/student/${user.student.id}` : null);
  if (!user.student) return <ErrorBanner message="No student profile is linked to your account." />;
  if (loading) return <Loader label="Loading fee details..." />;
  if (error) return <ErrorBanner message={error} onRetry={reload} />;

  const paidOf = (f) => f.payments.reduce((a, p) => a + Number(p.amountPaid), 0);
  const total = data.reduce((a, f) => a + Number(f.amount), 0);
  const paid = data.reduce((a, f) => a + paidOf(f), 0);

  return (
    <>
      <PageHeader title="Fees" />
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total" value={`₹${total.toLocaleString()}`} />
        <StatCard label="Paid" value={`₹${paid.toLocaleString()}`} tone="good" />
        <StatCard label="Outstanding" value={`₹${(total - paid).toLocaleString()}`} tone={total - paid > 0 ? 'bad' : 'good'} />
      </div>
      {data.length === 0 ? <div className="card"><EmptyState title="No fee records yet" icon="💰" /></div> : (
        <div className="space-y-4">{data.map((fee) => (
          <div key={fee.id} className="card">
            <div className="flex items-center justify-between">
              <div><p className="font-semibold text-gray-800 capitalize">{fee.feeType.toLowerCase()} fee</p><p className="text-sm text-gray-500">Due: {new Date(fee.dueDate).toLocaleDateString()}</p></div>
              <div className="text-right"><p className="font-bold">₹{Number(fee.amount).toLocaleString()}</p><Badge status={fee.status} /></div>
            </div>
            {fee.payments.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-50">
                <p className="text-xs font-medium text-gray-500 mb-1">Payment history</p>
                <ul className="text-sm space-y-1">{fee.payments.map((p) => (
                  <li key={p.id} className="flex justify-between text-gray-600"><span className="font-mono text-xs">{p.receiptNumber}</span><span>₹{Number(p.amountPaid).toLocaleString()} · {new Date(p.paidAt).toLocaleDateString()}</span></li>
                ))}</ul>
              </div>
            )}
          </div>
        ))}</div>
      )}
    </>
  );
}
