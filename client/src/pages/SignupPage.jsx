import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', companyName: '', country: 'India' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const countries = [
    { name: 'India', flag: '🇮🇳', cur: 'INR ₹' },
    { name: 'United States', flag: '🇺🇸', cur: 'USD $' },
    { name: 'United Kingdom', flag: '🇬🇧', cur: 'GBP £' },
    { name: 'Germany', flag: '🇪🇺', cur: 'EUR €' },
    { name: 'Japan', flag: '🇯🇵', cur: 'JPY ¥' },
    { name: 'Singapore', flag: '🇸🇬', cur: 'SGD S$' },
    { name: 'Canada', flag: '🇨🇦', cur: 'CAD $' },
    { name: 'Australia', flag: '🇦🇺', cur: 'AUD $' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const set = (k, v) => setForm({...form, [k]: v});

  return (
    <div className="flex items-center justify-center min-h-screen p-6" style={{ background: 'radial-gradient(ellipse at 30% 20%, #1a1040 0%, #0f0f13 60%)' }}>
      <div className="w-full max-w-[400px] bg-surface border border-border rounded-[20px] p-10 shadow-[0_40px_80px_rgba(0,0,0,0.5)] animate-fadeUp">
        <div className="font-['Syne'] text-[22px] font-extrabold text-accent2 tracking-tight mb-8">
          Expense<span className="text-text">Flow</span>
        </div>

        <h2 className="font-['Syne'] text-[28px] font-extrabold text-text mb-1.5">Create account</h2>
        <p className="text-muted text-[13px] mb-7">Set up your company workspace</p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red/10 border border-red/20 text-red text-[13px]">{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 mb-[18px]">
            <div>
              <label className="block text-[12px] font-medium text-muted mb-[7px] uppercase tracking-[0.5px]">First Name</label>
              <input type="text" value={form.firstName} onChange={e => set('firstName', e.target.value)}
                className="w-full bg-surface2 border border-border rounded-lg text-text py-[11px] px-[14px] text-[14px] outline-none focus:border-accent" placeholder="Arjun" required />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-muted mb-[7px] uppercase tracking-[0.5px]">Last Name</label>
              <input type="text" value={form.lastName} onChange={e => set('lastName', e.target.value)}
                className="w-full bg-surface2 border border-border rounded-lg text-text py-[11px] px-[14px] text-[14px] outline-none focus:border-accent" placeholder="Desai" required />
            </div>
          </div>

          <div className="mb-[18px]">
            <label className="block text-[12px] font-medium text-muted mb-[7px] uppercase tracking-[0.5px]">Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              className="w-full bg-surface2 border border-border rounded-lg text-text py-[11px] px-[14px] text-[14px] outline-none focus:border-accent" placeholder="arjun@acme.com" required />
          </div>

          <div className="mb-[18px]">
            <label className="block text-[12px] font-medium text-muted mb-[7px] uppercase tracking-[0.5px]">Company Name</label>
            <input type="text" value={form.companyName} onChange={e => set('companyName', e.target.value)}
              className="w-full bg-surface2 border border-border rounded-lg text-text py-[11px] px-[14px] text-[14px] outline-none focus:border-accent" placeholder="Acme Inc." required />
          </div>

          <div className="mb-[18px]">
            <label className="block text-[12px] font-medium text-muted mb-[7px] uppercase tracking-[0.5px]">Company Country</label>
            <select value={form.country} onChange={e => set('country', e.target.value)}
              className="w-full bg-surface2 border border-border rounded-lg text-text py-[11px] px-[14px] text-[14px] outline-none focus:border-accent appearance-none">
              {countries.map(c => <option key={c.name} value={c.name} className="bg-surface2">{c.flag} {c.name} ({c.cur})</option>)}
            </select>
          </div>

          <div className="mb-[18px]">
            <label className="block text-[12px] font-medium text-muted mb-[7px] uppercase tracking-[0.5px]">Password</label>
            <input type="password" value={form.password} onChange={e => set('password', e.target.value)}
              className="w-full bg-surface2 border border-border rounded-lg text-text py-[11px] px-[14px] text-[14px] outline-none focus:border-accent" placeholder="••••••••" minLength={6} required />
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-accent text-white text-[14px] font-semibold rounded-lg cursor-pointer border-none transition-all hover:bg-[#6b5ee8] hover:-translate-y-[1px] disabled:opacity-50 mt-1.5">
            {loading ? 'Creating...' : 'Create account & workspace'}
          </button>
        </form>

        <div className="text-center mt-[22px] text-[13px] text-muted">
          Already have an account? <Link to="/login" className="text-accent2 underline">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
