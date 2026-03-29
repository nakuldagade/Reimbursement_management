import { useState, useEffect } from 'react';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState(null);
  const [comments, setComments] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => { fetchPending(); }, []);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await api.get('/approvals/pending');
      setExpenses(res.data.expenses);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleAction = async (expenseId, action) => {
    setProcessing(true);
    try {
      await api.post(`/approvals/${expenseId}/${action}`, { comments });
      setActionModal(null);
      setComments('');
      fetchPending();
    } catch (err) { alert(err.response?.data?.error || 'Action failed'); }
    setProcessing(false);
  };

  const handleOverride = async (expenseId, action) => {
    if (!confirm(`Are you sure you want to override ${action.toLowerCase()} this expense?`)) return;
    try {
      await api.post(`/approvals/${expenseId}/override`, { action, comments: 'Admin override' });
      fetchPending();
    } catch (err) { alert(err.response?.data?.error || 'Override failed'); }
  };

  const baseCurrency = user?.company?.defaultCurrency || 'INR';

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-['Syne'] text-[26px] font-extrabold text-text mb-1">Pending Approvals</h1>
        <p className="text-muted text-[13px]">Review and action expense requests</p>
      </div>

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[4px] z-[100] flex items-center justify-end animate-fadeIn" onClick={e => e.target === e.currentTarget && setActionModal(null)}>
          <div className="w-[520px] h-screen bg-surface border-l border-border overflow-y-auto p-8 animate-slideIn">
            <div className="flex items-center justify-between mb-7">
              <h2 className="font-['Syne'] text-[20px] font-extrabold text-text">
                {actionModal.action === 'approve' ? '✅ Approve' : '❌ Reject'} Expense
              </h2>
              <button onClick={() => { setActionModal(null); setComments(''); }} className="w-8 h-8 rounded-lg bg-surface2 border border-border text-muted cursor-pointer text-[16px] flex items-center justify-center transition-all hover:text-text hover:border-text">✕</button>
            </div>

            <div className="p-5 rounded-xl bg-surface2 border border-border mb-5">
              <p className="text-[13px] text-muted"><strong className="text-text">{actionModal.expense.user?.firstName} {actionModal.expense.user?.lastName}</strong>'s expense</p>
              <p className="text-[20px] font-bold text-text mt-2">{actionModal.expense.currency} {actionModal.expense.amount.toLocaleString()}</p>
              {actionModal.expense.convertedAmount && actionModal.expense.currency !== baseCurrency && (
                <p className="text-[13px] text-accent2">{baseCurrency} {actionModal.expense.convertedAmount.toLocaleString()}</p>
              )}
              <p className="text-[13px] text-muted mt-1">{actionModal.expense.category}</p>
            </div>

            <div className="mb-5">
              <label className="block text-[12px] font-medium text-muted mb-2 uppercase tracking-[0.5px]">Comments (optional)</label>
              <textarea value={comments} onChange={e => setComments(e.target.value)} rows={3}
                className="w-full bg-surface2 border border-border rounded-lg text-text py-3 px-4 text-[14px] outline-none focus:border-accent resize-y min-h-[80px]"
                placeholder="Add a comment..." />
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => { setActionModal(null); setComments(''); }}
                className="flex-1 py-3 rounded-lg bg-transparent border border-border text-text text-[14px] font-semibold cursor-pointer transition-all hover:border-accent hover:text-accent">Cancel</button>
              <button onClick={() => handleAction(actionModal.expense.id, actionModal.action)} disabled={processing}
                className={`flex-1 py-3 rounded-lg text-[14px] font-semibold cursor-pointer border transition-all disabled:opacity-50 ${
                  actionModal.action === 'approve'
                    ? 'bg-[#166534] text-green border-[#15803d] hover:bg-[#15803d] hover:text-white'
                    : 'bg-[#7f1d1d] text-red border-[#991b1b] hover:bg-[#991b1b] hover:text-white'
                }`}>
                {processing ? 'Processing...' : actionModal.action === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="ef-table-wrap">
        <table className="ef-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Converted</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="!text-center !py-14"><div className="w-8 h-8 border-3 border-accent/30 border-t-accent rounded-full animate-spin mx-auto"></div></td></tr>
            ) : expenses.length === 0 ? (
              <tr><td colSpan={6} className="!text-center !py-16">
                <div className="text-[40px] mb-3">🎉</div>
                <p className="text-[13px] text-muted">No pending approvals!</p>
              </td></tr>
            ) : expenses.map(exp => (
              <tr key={exp.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-accent2 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                      {exp.user?.firstName?.[0]}
                    </div>
                    <span className="font-medium text-text">{exp.user?.firstName} {exp.user?.lastName}</span>
                  </div>
                </td>
                <td className="text-muted">{exp.description || exp.category}</td>
                <td className="text-text">{exp.currency} {exp.amount.toLocaleString()}</td>
                <td className="text-accent2 font-semibold">
                  {exp.convertedAmount ? `${exp.baseCurrency} ${exp.convertedAmount.toLocaleString()}` : '—'}
                </td>
                <td className="text-muted">{new Date(exp.expenseDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                <td>
                  <div className="flex gap-2">
                    <button onClick={() => setActionModal({ expense: exp, action: 'approve' })}
                      className="px-4 py-2 rounded-lg bg-[#166534] text-green border border-[#15803d] text-[13px] font-semibold cursor-pointer transition-all hover:bg-[#15803d] hover:text-white">Approve</button>
                    <button onClick={() => setActionModal({ expense: exp, action: 'reject' })}
                      className="px-4 py-2 rounded-lg bg-[#7f1d1d] text-red border border-[#991b1b] text-[13px] font-semibold cursor-pointer transition-all hover:bg-[#991b1b] hover:text-white">Reject</button>
                    {user?.role === 'ADMIN' && (
                      <button onClick={() => handleOverride(exp.id, 'APPROVED')}
                        className="px-4 py-2 rounded-lg bg-transparent border border-border text-amber text-[13px] font-semibold cursor-pointer transition-all hover:border-amber" title="Override">⚡</button>
                    )}
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
