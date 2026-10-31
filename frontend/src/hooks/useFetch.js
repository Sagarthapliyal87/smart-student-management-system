import { useCallback, useEffect, useState } from 'react';
import { api, getErrorMessage } from '../services/api';

/** Loads GET `url` (skips if url is falsy). Returns { data, loading, error, reload }. */
export default function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(url));
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!url) { setData(null); setLoading(false); return Promise.resolve(); }
    setLoading(true);
    setError('');
    return api.get(url)
      .then((res) => setData(res.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [url]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load };
}
