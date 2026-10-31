import EmptyState from './EmptyState';

/** columns: [{ key, label, render?(row) }] */
export default function Table({ columns, rows, emptyLabel = 'No records found' }) {
  if (!rows || rows.length === 0) return <EmptyState title={emptyLabel} />;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            {columns.map((c) => <th key={c.key} className="py-2 pr-4 font-medium whitespace-nowrap">{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id ?? i} className="border-b border-gray-100 hover:bg-gray-50">
              {columns.map((c) => <td key={c.key} className="py-2.5 pr-4 whitespace-nowrap">{c.render ? c.render(row) : row[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
