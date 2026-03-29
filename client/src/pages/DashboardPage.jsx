import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';

function StatCard({ label, value, color, tag, tagType }) {
  const tagStyles = {
    green: 'bg-green/12 text-green',
    amber: 'bg-amber/12 text-amber',
    red: 'bg-red/12 text-red',
    purple: 'bg-accent/12 text-accent2',
  };
  return (
    <div className="ef-stat">
      <div className="text-[11px] uppercase tracking-[0.5px] text-muted mb-3">{label}</div>
      <div className="font-['Syne'] text-[28px] font-extrabold" style={{ color }}>{value}</div>
      {tag && <span className={`inline-block mt-2 text-[11px] px-2.5 py-1 rounded-full ${tagStyles[tagType] || tagStyles.purple}`}>{tag}</span>}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(res => { setStats(res.data.stats); setRecent(res.data.recentExpenses || []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-accent/30 border-t-accent rounded-full animate-spin"></div></div>;

  const currency = user?.company?.defaultCurrency || 'INR';
  const sym = { USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥', SGD: 'S$', CAD: 'C$', AUD: 'A$' }[currency] || '$';

  const renderAdminStats = () => (
    <>
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Submitted" value={stats?.totalExpenses || 0} color="var(--color-accent2)" tag="This month" tagType="purple" />
        <StatCard label="Pending Approval" value={stats?.pendingCount || 0} color="var(--color-amber)" tag="Awaiting action" tagType="amber" />
        <StatCard label="Approved" value={stats?.approvedCount || 0} color="var(--color-green)" tag="Reimbursed" tagType="green" />
        <StatCard label="Total Amount" value={`${sym}${(stats?.totalApprovedAmount || 0).toLocaleString()}`} color="var(--color-text)" tag={`${stats?.userCount || 0} team members`} tagType="green" />
      </div>
      {stats?.categoryBreakdown && Object.keys(stats.categoryBreakdown).length > 0 && (
        <div className="ef-stat mb-8">
          <h3 className="font-['Syne'] font-bold text-[15px] text-text mb-4">Category Breakdown</h3>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(stats.categoryBreakdown).map(([cat, amt]) => (
              <div key={cat} className="flex justify-between items-center py-3 px-4 rounded-lg bg-surface2/50">
                <span className="text-[13px] text-muted">{cat}</span>
                <span className="text-[13px] font-semibold text-text">{sym}{Number(amt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

  const renderManagerStats = () => (
    <div className="grid grid-cols-4 gap-4 mb-8">
      <StatCard label="Team Expenses" value={stats?.teamTotal || 0} color="var(--color-accent2)" tag="This month" tagType="purple" />
      <StatCard label="Pending" value={stats?.teamPending || 0} color="var(--color-amber)" tag="Awaiting action" tagType="amber" />
      <StatCard label="Approved" value={stats?.teamApproved || 0} color="var(--color-green)" tag="Reimbursed" tagType="green" />
      <StatCard label="Team Size" value={stats?.teamSize || 0} color="var(--color-text)" tag="Active members" tagType="purple" />
    </div>
  );

  const renderEmployeeStats = () => (
    <div className="grid grid-cols-4 gap-4 mb-8">
      <StatCard label="Total Submitted" value={stats?.myTotal || 0} color="var(--color-accent2)" tag="This month" tagType="purple" />
      <StatCard label="Pending" value={stats?.myPending || 0} color="var(--color-amber)" tag="Awaiting action" tagType="amber" />
      <StatCard label="Approved" value={stats?.myApproved || 0} color="var(--color-green)" tag="Reimbursed" tagType="green" />
      <StatCard label="Total Reimbursed" value={`${sym}${(stats?.totalSpent || 0).toLocaleString()}`} color="var(--color-text)" tag="+12% vs last month" tagType="green" />
    </div>
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-['Syne'] text-[26px] font-extrabold text-text mb-1">Dashboard</h1>
        <p className="text-muted text-[13px]">Good morning, {user?.firstName}</p>
      </div>

      {user?.role === 'ADMIN' && renderAdminStats()}
      {user?.role === 'MANAGER' && renderManagerStats()}
      {user?.role === 'EMPLOYEE' && renderEmployeeStats()}

      {/* Recent Expenses */}
      <div className="ef-table-wrap">
        <table className="ef-table">
          <thead>
            <tr>
              <th>Expense</th>
              {user?.role !== 'EMPLOYEE' && <th>Employee</th>}
              <th>Amount</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recent.map(exp => (
              <tr key={exp.id}>
                <td>
                  <strong className="text-text">{exp.description || exp.category}</strong><br/>
                  <span className="text-muted text-[12px]">{exp.category}</span>
                </td>
                {user?.role !== 'EMPLOYEE' && <td className="text-muted">{exp.user?.firstName} {exp.user?.lastName}</td>}
                <td className="text-text font-medium">
                  {exp.currency} {exp.amount.toLocaleString()}
                  {exp.convertedAmount && exp.currency !== exp.baseCurrency && (
                    <span className="block text-[12px] text-muted">{exp.baseCurrency} {exp.convertedAmount.toLocaleString()}</span>
                  )}
                </td>
                <td className="text-muted">{new Date(exp.expenseDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                <td><StatusBadge status={exp.status} /></td>
              </tr>
            ))}
            {recent.length === 0 && (
              <tr><td colSpan={5} className="!text-center !py-16">
                <div className="text-[40px] mb-3">📭</div>
                <p className="text-[13px] text-muted">No expenses yet</p>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
