import { useState, useEffect } from 'react';
import api from '../services/api';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'EMPLOYEE', managerId: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try { const res = await api.get('/users'); setUsers(res.data.users); }
    catch (err) { console.error(err); }
    setLoading(false);
  };

  const managers = users.filter(u => u.role === 'MANAGER' || u.role === 'ADMIN');

  const openCreate = () => { setEditUser(null); setForm({ firstName: '', lastName: '', email: '', password: '', role: 'EMPLOYEE', managerId: '' }); setShowDrawer(true); };
  const openEdit = (u) => { setEditUser(u); setForm({ firstName: u.firstName, lastName: u.lastName, email: u.email, password: '', role: u.role, managerId: u.managerId || '' }); setShowDrawer(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editUser) { const { email, password, ...data } = form; await api.put(`/users/${editUser.id}`, data); }
      else { await api.post('/users', form); }
      setShowDrawer(false);
      fetchUsers();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to remove this user?')) return;
    try { await api.delete(`/users/${id}`); fetchUsers(); }
    catch (err) { alert(err.response?.data?.error || 'Delete failed'); }
  };

  const roleColors = {
    ADMIN: 'bg-accent/12 text-accent2',
    MANAGER: 'bg-amber/12 text-amber',
    EMPLOYEE: 'bg-green/12 text-green',
  };

  const avatarGradients = [
    'linear-gradient(135deg, #7c6fff, #a78bfa)',
    'linear-gradient(135deg, #166534, #22c55e)',
    'linear-gradient(135deg, #1e40af, #3b82f6)',
    'linear-gradient(135deg, #7c2d12, #ea580c)',
    'linear-gradient(135deg, #0f766e, #14b8a6)',
  ];

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-['Syne'] text-[26px] font-extrabold text-text mb-1">User Management</h1>
          <p className="text-muted text-[13px]">Manage employees & managers</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-accent text-white text-[14px] font-semibold cursor-pointer border-none transition-all hover:bg-[#6b5ee8] hover:-translate-y-px">+ New User</button>
      </div>

      {/* User Drawer */}
      {showDrawer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[4px] z-[100] flex items-center justify-end animate-fadeIn" onClick={e => e.target === e.currentTarget && setShowDrawer(false)}>
          <div className="w-[520px] h-screen bg-surface border-l border-border overflow-y-auto p-8 animate-slideIn">
            <div className="flex items-center justify-between mb-7">
              <h2 className="font-['Syne'] text-[20px] font-extrabold text-text">{editUser ? 'Edit User' : 'New User'}</h2>
              <button onClick={() => setShowDrawer(false)} className="w-8 h-8 rounded-lg bg-surface2 border border-border text-muted cursor-pointer text-[16px] flex items-center justify-center transition-all hover:text-text hover:border-text">✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="mb-5">
                <label className="block text-[12px] font-medium text-muted mb-2 uppercase tracking-[0.5px]">First Name</label>
                <input type="text" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})}
                  className="w-full bg-surface2 border border-border rounded-lg text-text py-3 px-4 text-[14px] outline-none focus:border-accent" required />
              </div>
              <div className="mb-5">
                <label className="block text-[12px] font-medium text-muted mb-2 uppercase tracking-[0.5px]">Last Name</label>
                <input type="text" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})}
                  className="w-full bg-surface2 border border-border rounded-lg text-text py-3 px-4 text-[14px] outline-none focus:border-accent" required />
              </div>
              {!editUser && (
                <>
                  <div className="mb-5">
                    <label className="block text-[12px] font-medium text-muted mb-2 uppercase tracking-[0.5px]">Email</label>
                    <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                      className="w-full bg-surface2 border border-border rounded-lg text-text py-3 px-4 text-[14px] outline-none focus:border-accent" placeholder="priya@acme.com" required />
                  </div>
                  <div className="mb-5">
                    <label className="block text-[12px] font-medium text-muted mb-2 uppercase tracking-[0.5px]">Password</label>
                    <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                      className="w-full bg-surface2 border border-border rounded-lg text-text py-3 px-4 text-[14px] outline-none focus:border-accent" minLength={6} required />
                  </div>
                </>
              )}
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="block text-[12px] font-medium text-muted mb-2 uppercase tracking-[0.5px]">Role</label>
                  <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}
                    className="w-full bg-surface2 border border-border rounded-lg text-text py-3 px-4 text-[14px] outline-none focus:border-accent appearance-none">
                    <option value="EMPLOYEE">Employee</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-muted mb-2 uppercase tracking-[0.5px]">Manager</label>
                  <select value={form.managerId} onChange={e => setForm({...form, managerId: e.target.value})}
                    className="w-full bg-surface2 border border-border rounded-lg text-text py-3 px-4 text-[14px] outline-none focus:border-accent appearance-none">
                    <option value="">— (None)</option>
                    {managers.map(m => <option key={m.id} value={m.id}>{m.firstName} {m.lastName} ({m.role})</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowDrawer(false)}
                  className="flex-1 py-3 rounded-lg bg-transparent border border-border text-text text-[14px] font-semibold cursor-pointer transition-all hover:border-accent hover:text-accent">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-3 rounded-lg bg-accent text-white text-[14px] font-semibold cursor-pointer border-none transition-all hover:bg-[#6b5ee8] disabled:opacity-50">
                  {submitting ? 'Saving...' : editUser ? 'Update' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="ef-table-wrap">
        <table className="ef-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Manager</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="!text-center !py-14"><div className="w-8 h-8 border-3 border-accent/30 border-t-accent rounded-full animate-spin mx-auto"></div></td></tr>
            ) : users.map((u, i) => (
              <tr key={u.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: avatarGradients[i % avatarGradients.length] }}>
                      {u.firstName[0]}
                    </div>
                    <span className="font-medium text-text">{u.firstName} {u.lastName}</span>
                  </div>
                </td>
                <td className="text-muted">{u.email}</td>
                <td>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold ${roleColors[u.role]}`}>{u.role}</span>
                </td>
                <td className="text-muted">{u.manager ? `${u.manager.firstName} ${u.manager.lastName}` : '—'}</td>
                <td>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(u)} className="px-4 py-2 rounded-lg bg-transparent border border-border text-text text-[13px] font-semibold cursor-pointer transition-all hover:border-accent hover:text-accent">Edit</button>
                    <button onClick={() => handleDelete(u.id)} className="px-4 py-2 rounded-lg bg-[#7f1d1d] text-red border border-[#991b1b] text-[13px] font-semibold cursor-pointer transition-all hover:bg-[#991b1b] hover:text-white">Remove</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
