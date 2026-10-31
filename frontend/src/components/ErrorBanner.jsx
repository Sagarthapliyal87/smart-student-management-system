export default function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-center justify-between gap-4">
      <span>{message}</span>
      {onRetry && <button onClick={onRetry} className="font-medium underline whitespace-nowrap">Try again</button>}
    </div>
  );
}
