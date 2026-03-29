import { useState, useEffect } from 'react';
import api from '../services/api';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try { const res = await api.get('/notifications'); setNotifications(res.data.notifications); }
    catch (err) { console.error(err); }
    setLoading(false);
  };

  const markRead = async (id) => { await api.put(`/notifications/${id}/read`); fetchNotifications(); };
  const markAllRead = async () => { await api.put('/notifications/read-all'); fetchNotifications(); };

  const getIcon = (type) => {
    if (type?.includes('APPROVED')) return '✅';
    if (type?.includes('REJECTED')) return '❌';
    if (type?.includes('SUBMITTED') || type?.includes('REQUESTED')) return '💰';
    return '🔔';
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="font-['Syne'] text-[26px] font-extrabold text-text mb-1">Notifications</h1>
          <p className="text-muted text-[13px]">Stay updated on expense activities</p>
        </div>
        <button onClick={markAllRead}
          className="px-5 py-3 rounded-lg bg-transparent border border-border text-text text-[14px] font-semibold cursor-pointer transition-all hover:border-accent hover:text-accent">
          Mark All Read
        </button>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-3 border-accent/30 border-t-accent rounded-full animate-spin"></div></div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center text-muted">
            <div className="text-[40px] mb-3">🔔</div>
            <p className="text-[13px]">No notifications yet</p>
          </div>
        ) : (
          <div>
            {notifications.map(n => (
              <div key={n.id} onClick={() => !n.isRead && markRead(n.id)}
                className={`flex items-start gap-4 p-5 border-b border-border last:border-b-0 cursor-pointer hover:bg-white/[0.015] transition-colors ${!n.isRead ? 'bg-accent/[0.03]' : ''}`}>
                <div className="text-[18px] mt-0.5">{getIcon(n.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[13.5px] ${!n.isRead ? 'text-text font-medium' : 'text-muted'}`}>{n.message}</p>
                  <p className="text-[11px] text-subtle mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                {!n.isRead && <span className="w-2.5 h-2.5 rounded-full bg-accent mt-2 shrink-0"></span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
