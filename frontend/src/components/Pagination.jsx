import { useState } from 'react';

/** Client-side pagination helper: const { pageRows, controls } = usePagination(rows, 10) */
export function usePagination(rows, pageSize = 10) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil((rows?.length || 0) / pageSize));
  const safePage = Math.min(page, pages);
  const pageRows = (rows || []).slice((safePage - 1) * pageSize, safePage * pageSize);
  const controls = pages > 1 && (
    <div className="flex items-center justify-between pt-3 text-sm text-gray-500">
      <span>Page {safePage} of {pages}</span>
      <div className="flex gap-2">
        <button className="btn-secondary" disabled={safePage === 1} onClick={() => setPage(safePage - 1)}>Previous</button>
        <button className="btn-secondary" disabled={safePage === pages} onClick={() => setPage(safePage + 1)}>Next</button>
      </div>
    </div>
  );
  return { pageRows, controls, setPage };
}
