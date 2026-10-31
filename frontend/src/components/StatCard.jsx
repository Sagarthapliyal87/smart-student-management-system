export default function StatCard({ label, value, sub, tone = 'default', icon }) {
  const tones = { default: 'text-gray-900', good: 'text-emerald-600', warn: 'text-amber-600', bad: 'text-red-600', brand: 'text-brand-700' };
  return (
    <div className="card flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</span>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <span className={`text-2xl font-bold ${tones[tone]}`}>{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  );
}
