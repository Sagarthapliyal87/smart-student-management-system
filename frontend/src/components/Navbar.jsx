import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Badge from './Badge';

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    api.get('/notifications').then((res) => { setNotifications(res.data.notifications); setUnread(res.data.unreadCount); }).catch(() => {});
  }, []);

  const toggleNotifications = async () => {
    const opening = !notifOpen;
    setNotifOpen(opening);
    setMenuOpen(false);
    if (opening && unread > 0) {
      try { await api.put('/notifications/read-all'); setUnread(0); } catch { /* non-critical */ }
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="md:hidden text-gray-500 text-xl" aria-label="Open menu">☰</button>
        <span className="font-semibold text-gray-800 hidden sm:block">Welcome, {user?.name?.split(' ')[0]}</span>
        <Badge status={user?.role} />
      </div>
      <div className="flex items-center gap-4 relative">
        <button onClick={toggleNotifications} className="relative text-gray-500 hover:text-gray-700 text-lg" aria-label="Notifications">
          🔔
          {unread > 0 && <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">{unread}</span>}
        </button>
        {notifOpen && (
          <div className="absolute right-0 top-9 w-80 bg-white border border-gray-100 rounded-lg shadow-lg max-h-96 overflow-y-auto">
            <div className="px-4 py-2 border-b border-gray-100 font-medium text-sm">Notifications</div>
            {notifications.length === 0 ? <p className="text-sm text-gray-400 px-4 py-6 text-center">No notifications yet.</p> : notifications.map((n) => (
              <div key={n.id} className="px-4 py-2.5 text-sm border-b border-gray-50 last:border-0">
                <p>{n.message}</p>
                <p className="text-xs text-gray-400 mt-0.5">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
        <div className="relative">
          <button onClick={() => { setMenuOpen((v) => !v); setNotifOpen(false); }} className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center font-semibold text-sm">
            {user?.name?.[0]?.toUpperCase() || '?'}
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-11 w-48 bg-white border border-gray-100 rounded-lg shadow-lg py-1">
              <p className="px-4 py-2 text-xs text-gray-400 border-b border-gray-50 truncate">{user?.email}</p>
              <button onClick={logout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Log out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
