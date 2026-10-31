import axios from 'axios';

export const UPLOADS_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export const api = axios.create({ baseURL: `${UPLOADS_BASE_URL}/api` });

// Attach the JWT to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sms_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// An invalid/expired token on a protected call forces a clean logout.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const isLoginCall = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginCall) {
      localStorage.removeItem('sms_token');
      localStorage.removeItem('sms_user');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(err) {
  if (err?.response?.data?.error) return err.response.data.error;
  if (err?.code === 'ERR_NETWORK') return 'Cannot reach the server. Make sure the backend is running on port 5000.';
  return err?.message || 'Something went wrong. Please try again.';
}

/** Downloads a CSV/other file from an authenticated endpoint. */
export async function downloadFile(url, filename) {
  const res = await api.get(url, { responseType: 'blob' });
  const href = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = href; a.download = filename; a.click();
  URL.revokeObjectURL(href);
}
