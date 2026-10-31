export default function EmptyState({ title = 'Nothing here yet', description, icon = '📭' }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center text-gray-500">
      <div className="text-4xl mb-2">{icon}</div>
      <p className="font-medium text-gray-700">{title}</p>
      {description && <p className="text-sm mt-1 max-w-sm">{description}</p>}
    </div>
  );
}
