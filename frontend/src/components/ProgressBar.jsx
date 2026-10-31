export default function ProgressBar({ value, tone = 'brand' }) {
  const colors = { brand: 'bg-brand-500', good: 'bg-emerald-500', bad: 'bg-red-500', warn: 'bg-amber-500' };
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div className={`h-2 rounded-full ${colors[tone]}`} style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} />
    </div>
  );
}
