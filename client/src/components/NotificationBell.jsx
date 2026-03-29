import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications.slice(0, 5));
      setUnreadCount(res.data.unreadCount);
    } catch (err) { /* ignore */ }
  };

  const markRead = async (id) => {
    await api.put(`/notifications/${id}/read`);
    fetchNotifications();
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="relative p-2 text-muted hover:text-text transition-colors cursor-pointer">
        <span className="text-[18px]">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] bg-red text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-fadeIn">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <h3 className="font-['Syne'] font-bold text-text text-[14px]">Notifications</h3>
            <button onClick={() => { navigate('/notifications'); setOpen(false); }} className="text-[12px] text-accent2 hover:text-accent cursor-pointer bg-transparent border-none">View All</button>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-center text-[13px] text-subtle">No notifications</p>
            ) : notifications.map(n => (
              <div key={n.id} onClick={() => markRead(n.id)}
                className={`p-3 border-b border-border cursor-pointer hover:bg-surface2/50 transition-colors ${!n.isRead ? 'bg-accent/[0.04]' : ''}`}>
                <p className="text-[13px] text-muted">{n.message}</p>
                <p className="text-[11px] text-subtle mt-1">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
