import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';

const categories = ['Food & Beverage', 'Travel', 'Software', 'Office Supplies', 'Accommodation', 'Training', 'Equipment', 'Other'];
const currencies = [
  { code: 'INR', label: 'INR ₹' }, { code: 'USD', label: 'USD $' }, { code: 'EUR', label: 'EUR €' },
  { code: 'GBP', label: 'GBP £' }, { code: 'SGD', label: 'SGD S$' }, { code: 'JPY', label: 'JPY ¥' },
];

export default function ExpensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ amount: '', currency: user?.company?.defaultCurrency || 'INR', category: 'Food & Beverage', description: '', expenseDate: new Date().toISOString().split('T')[0], remarks: '' });
  const [receipt, setReceipt] = useState(null);
  const [ocrState, setOcrState] = useState('idle');
  const [submitting, setSubmitting] = useState(false);
  const [detailDrawer, setDetailDrawer] = useState(null);

  useEffect(() => { fetchExpenses(); }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const url = user?.role === 'ADMIN' ? '/expenses/all' : '/expenses';
      const res = await api.get(url);
      setExpenses(res.data.expenses);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const filtered = filter === 'all' ? expenses : expenses.filter(e => e.status === filter.toUpperCase());

  const handleOCR = async (file) => {
    setOcrState('scanning');
    try {
      const fd = new FormData();
      fd.append('receipt', file);
      const res = await api.post('/ocr/parse', fd);
      if (res.data.data) {
        const d = res.data.data;
        setForm(prev => ({
          ...prev,
          description: d.vendor || prev.description,
          amount: d.amount ? String(d.amount) : prev.amount,
          expenseDate: d.date ? new Date(d.date).toISOString().split('T')[0] : prev.expenseDate,
        }));
      }
      setOcrState('done');
    } catch (err) {
      console.error('OCR failed:', err);
      setOcrState('idle');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setReceipt(file);
      if (file.type.startsWith('image/')) handleOCR(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('amount', form.amount);
      fd.append('currency', form.currency);
      fd.append('category', form.category);
      fd.append('description', form.description);
      fd.append('expenseDate', form.expenseDate);
      if (receipt) fd.append('receipt', receipt);
      await api.post('/expenses', fd);
      closeDrawer();
      fetchExpenses();
    } catch (err) { alert(err.response?.data?.error || 'Failed to submit'); }
    setSubmitting(false);
  };

  const closeDrawer = () => {
    setShowDrawer(false);
    setOcrState('idle');
    setReceipt(null);
    setForm({ amount: '', currency: user?.company?.defaultCurrency || 'INR', category: 'Food & Beverage', description: '', expenseDate: new Date().toISOString().split('T')[0], remarks: '' });
  };

  const baseCurrency = user?.company?.defaultCurrency || 'INR';

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-['Syne'] text-[26px] font-extrabold text-text mb-1">My Expenses</h1>
          <p className="text-muted text-[13px]">Submit and track your reimbursements</p>
        </div>
        <div className="flex gap-3">
          <a href="/api/expenses/export" target="_blank"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-[14px] font-semibold cursor-pointer border border-border bg-transparent text-text no-underline transition-all hover:border-accent hover:text-accent">
            📥 Export
          </a>
          {(user?.role === 'EMPLOYEE' || user?.role === 'ADMIN') && (
            <button onClick={() => setShowDrawer(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-accent text-white text-[14px] font-semibold cursor-pointer border-none transition-all hover:bg-[#6b5ee8] hover:-translate-y-px">
              + New Expense
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#1a1a24] border border-[#2e2e3d] rounded-xl p-1.5 w-fit mb-8 gap-2">
        {['all', 'pending', 'approved', 'rejected'].map(tab => (
          <button key={tab} onClick={() => setFilter(tab)}
            className={`cursor-pointer border-none transition-all whitespace-nowrap px-6 py-2 text-[13px] rounded-lg ${
              filter === tab 
                ? 'bg-[#7c6fff] text-white font-semibold shadow-sm' 
                : 'bg-transparent text-[#8b8b9e] font-medium hover:text-white hover:bg-white/5'
            }`}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="border border-[#2e2e3d] rounded-[16px] bg-[#1a1a24] overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#2e2e3d]">
              <th className="py-4 px-6 text-[11px] font-bold text-[#6b6b7d] uppercase tracking-[1px]">Description</th>
              <th className="py-4 px-6 text-[11px] font-bold text-[#6b6b7d] uppercase tracking-[1px]">Category</th>
              <th className="py-4 px-6 text-[11px] font-bold text-[#6b6b7d] uppercase tracking-[1px]">Amount</th>
              <th className="py-4 px-6 text-[11px] font-bold text-[#6b6b7d] uppercase tracking-[1px]">Date</th>
              <th className="py-4 px-6 text-[11px] font-bold text-[#6b6b7d] uppercase tracking-[1px]">Approver</th>
              <th className="py-4 px-6 text-[11px] font-bold text-[#6b6b7d] uppercase tracking-[1px]">Status</th>
              <th className="py-4 px-6"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="!text-center py-14"><div className="w-8 h-8 border-3 border-accent/30 border-t-accent rounded-full animate-spin mx-auto"></div></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="!text-center py-16">
                <div className="text-[40px] mb-3">📭</div>
                <p className="text-[13px] text-muted">No expenses found</p>
              </td></tr>
            ) : filtered.map(exp => (
              <tr key={exp.id} className="border-b border-[#2e2e3d] last:border-b-0 hover:bg-white/[0.03] transition-colors">
                <td className="py-[18px] px-6 text-[14px] font-semibold text-white">{exp.description || exp.category}</td>
                <td className="py-[18px] px-6 text-[14px] text-[#e2e2e2]">{exp.category}</td>
                <td className="py-[18px] px-6">
                  <div className="text-[14px] font-medium text-white mb-0.5">
                    {exp.currency === 'INR' ? '₹' : exp.currency === 'USD' ? '$' : exp.currency}{exp.amount.toLocaleString()}
                  </div>
                  <div className="text-[12px] text-[#8b8b9e]">
                    ${(exp.amount / 84).toFixed(0)} USD
                  </div>
                </td>
                <td className="py-[18px] px-6 text-[14px] text-[#e2e2e2]">{new Date(exp.expenseDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                <td className="py-[18px] px-6 text-[14px] text-[#e2e2e2]">{exp.approvalLogs?.[0]?.approver?.firstName ? `${exp.approvalLogs[0].approver.firstName} ${exp.approvalLogs[0].approver.lastName[0]}.` : '—'}</td>
                <td className="py-[18px] px-6"><StatusBadge status={exp.status} /></td>
                <td className="py-[18px] px-6 text-right">
                  <button onClick={() => setDetailDrawer(exp)}
                    className="px-4 py-1.5 rounded-[8px] border border-[#3e3e4e] bg-transparent text-white text-[13px] font-medium cursor-pointer transition-all hover:bg-white/10">
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Expense Drawer */}
      {showDrawer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[4px] z-[100] flex items-center justify-end animate-fadeIn" onClick={e => e.target === e.currentTarget && closeDrawer()}>
          <div className="w-[520px] h-screen bg-surface border-l border-border overflow-y-auto p-8 animate-slideIn">
            <div className="flex items-center justify-between mb-7">
              <h2 className="font-['Syne'] text-[20px] font-extrabold text-text">New Expense</h2>
              <button onClick={closeDrawer} className="w-8 h-8 rounded-lg bg-surface2 border border-border text-muted cursor-pointer text-[16px] flex items-center justify-center transition-all hover:text-text hover:border-text">✕</button>
            </div>

            {/* OCR Zone */}
            <label className={`block border-2 border-dashed rounded-xl p-6 text-center mb-5 cursor-pointer transition-all ${
              ocrState === 'done' ? 'border-green bg-green/[0.04]' : 'border-border hover:border-accent hover:bg-accent/[0.04]'
            }`}>
              <div className="text-[28px] mb-2">{ocrState === 'scanning' ? '⏳' : ocrState === 'done' ? '✅' : '📄'}</div>
              <div className="text-muted text-[13px]">
                {ocrState === 'scanning' ? 'Reading receipt...' : ocrState === 'done' ? 'Receipt scanned — fields auto-filled!' : <><span className="text-accent2">Scan receipt</span> — OCR will auto-fill fields</>}
              </div>
              <input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" />
            </label>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 mb-4">
                  <label className="block text-[12px] font-medium text-muted mb-2 uppercase tracking-[0.5px]">Description</label>
                  <input type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                    className="w-full bg-surface2 border border-border rounded-lg text-text py-3 px-4 text-[14px] outline-none focus:border-accent" placeholder="e.g. Team lunch at The Table" required />
                </div>

                <div className="mb-4">
                  <label className="block text-[12px] font-medium text-muted mb-2 uppercase tracking-[0.5px]">Category</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                    className="w-full bg-surface2 border border-border rounded-lg text-text py-3 px-4 text-[14px] outline-none focus:border-accent appearance-none">
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-[12px] font-medium text-muted mb-2 uppercase tracking-[0.5px]">Expense Date</label>
                  <input type="date" value={form.expenseDate} onChange={e => setForm({...form, expenseDate: e.target.value})}
                    className="w-full bg-surface2 border border-border rounded-lg text-text py-3 px-4 text-[14px] outline-none focus:border-accent" required />
                </div>

                <div className="mb-4">
                  <label className="block text-[12px] font-medium text-muted mb-2 uppercase tracking-[0.5px]">Currency</label>
                  <select value={form.currency} onChange={e => setForm({...form, currency: e.target.value})}
                    className="w-full bg-surface2 border border-border rounded-lg text-text py-3 px-4 text-[14px] outline-none focus:border-accent appearance-none">
                    {currencies.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-[12px] font-medium text-muted mb-2 uppercase tracking-[0.5px]">Total Amount</label>
                  <input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})}
                    className="w-full bg-surface2 border border-border rounded-lg text-text py-3 px-4 text-[14px] outline-none focus:border-accent" placeholder="0.00" required />
                </div>

                {form.amount && form.currency !== baseCurrency && (
                  <div className="col-span-2 mb-4">
                    <p className="text-[12px] text-muted">Converted: <span className="text-accent2 font-semibold">≈ {baseCurrency} (at today's rate)</span></p>
                  </div>
                )}

                <div className="col-span-2 mb-4">
                  <label className="block text-[12px] font-medium text-muted mb-2 uppercase tracking-[0.5px]">Remarks</label>
                  <textarea value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})} rows={3}
                    className="w-full bg-surface2 border border-border rounded-lg text-text py-3 px-4 text-[14px] outline-none focus:border-accent resize-y min-h-[80px]"
                    placeholder="Any additional context..." />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={closeDrawer}
                  className="flex-1 py-3 rounded-lg bg-transparent border border-border text-text text-[14px] font-semibold cursor-pointer transition-all hover:border-accent hover:text-accent">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-3 rounded-lg bg-accent text-white text-[14px] font-semibold cursor-pointer border-none transition-all hover:bg-[#6b5ee8] disabled:opacity-50">
                  {submitting ? 'Submitting...' : 'Submit Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {detailDrawer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[4px] z-[100] flex items-center justify-end animate-fadeIn" onClick={e => e.target === e.currentTarget && setDetailDrawer(null)}>
          <div className="w-[520px] h-screen bg-surface border-l border-border overflow-y-auto p-8 animate-slideIn">
            <div className="flex items-center justify-between mb-7">
              <h2 className="font-['Syne'] text-[20px] font-extrabold text-text">{detailDrawer.description || detailDrawer.category}</h2>
              <button onClick={() => setDetailDrawer(null)} className="w-8 h-8 rounded-lg bg-surface2 border border-border text-muted cursor-pointer text-[16px] flex items-center justify-center transition-all hover:text-text hover:border-text">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-5 mb-6">
              <div><div className="text-[11px] uppercase tracking-[0.5px] text-muted mb-1">Category</div><div className="text-[14px] text-text">{detailDrawer.category}</div></div>
              <div><div className="text-[11px] uppercase tracking-[0.5px] text-muted mb-1">Date</div><div className="text-[14px] text-text">{new Date(detailDrawer.expenseDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div></div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.5px] text-muted mb-1">Amount</div>
                <div className="text-[20px] font-bold text-text">{detailDrawer.currency} {detailDrawer.amount.toLocaleString()}</div>
                {detailDrawer.convertedAmount && detailDrawer.currency !== detailDrawer.baseCurrency && (
                  <span className="text-[13px] text-accent2">{detailDrawer.baseCurrency} {detailDrawer.convertedAmount.toLocaleString()}</span>
                )}
              </div>
              <div><div className="text-[11px] uppercase tracking-[0.5px] text-muted mb-1">Status</div><div className="mt-1.5"><StatusBadge status={detailDrawer.status} /></div></div>
              {detailDrawer.receiptUrl && (
                <div className="col-span-2"><div className="text-[11px] uppercase tracking-[0.5px] text-muted mb-1">Receipt</div><a href={detailDrawer.receiptUrl} target="_blank" rel="noreferrer" className="text-accent2 text-[14px]">View Receipt →</a></div>
              )}
            </div>

            {/* Approval Trail */}
            {detailDrawer.approvalLogs?.length > 0 && (
              <div className="ef-table-wrap mt-5">
                <div className="py-3.5 px-5 border-b border-border text-[12px] font-semibold uppercase tracking-[0.5px] text-muted">Approval Trail</div>
                {detailDrawer.approvalLogs.map((log, i) => (
                  <div key={i} className="flex items-center py-3.5 px-5 border-b border-border last:border-b-0 gap-4">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#6b5ee8] to-accent2 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                      {log.approver?.firstName?.[0]}
                    </div>
                    <div className="flex-1 text-[13px] font-medium text-text">{log.approver?.firstName} {log.approver?.lastName}</div>
                    <StatusBadge status={log.action} />
                    <div className="text-[11px] text-muted">{new Date(log.createdAt).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
