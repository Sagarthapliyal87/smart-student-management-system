const TONES = {
  PRESENT: 'bg-emerald-100 text-emerald-700', ABSENT: 'bg-red-100 text-red-700', LEAVE: 'bg-amber-100 text-amber-700',
  PAID: 'bg-emerald-100 text-emerald-700', UNPAID: 'bg-red-100 text-red-700', PARTIAL: 'bg-amber-100 text-amber-700',
  PENDING: 'bg-gray-100 text-gray-700', SUBMITTED: 'bg-blue-100 text-blue-700', LATE: 'bg-red-100 text-red-700', CHECKED: 'bg-emerald-100 text-emerald-700',
  ADMIN: 'bg-purple-100 text-purple-700', TEACHER: 'bg-blue-100 text-blue-700', STUDENT: 'bg-brand-100 text-brand-700', PARENT: 'bg-teal-100 text-teal-700',
  LOW: 'bg-red-100 text-red-700', OK: 'bg-emerald-100 text-emerald-700',
};
export default function Badge({ status, children }) {
  return <span className={`badge ${TONES[status] || 'bg-gray-100 text-gray-700'}`}>{children || status}</span>;
}
