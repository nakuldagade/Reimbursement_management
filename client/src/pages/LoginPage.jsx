import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: 'admin@acme.com', password: 'admin123' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setForgotMessage('');
    setPreviewUrl('');
    setLoading(true);
    try {
      // Direct fetch to bypass interceptors if needed, or use existing api context if available. 
      // Assuming api is exported from '../services/api' or similar, but since we don't have it imported, we fetch directly:
      const res = await fetch('http://localhost:5001/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to request password reset');
      setForgotMessage(data.message);
      if (data.previewUrl) setPreviewUrl(data.previewUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-6" style={{ background: 'radial-gradient(ellipse at 30% 20%, #1a1040 0%, #0f0f13 60%)' }}>
      <div className="w-full max-w-[400px] bg-surface border border-border rounded-[20px] p-10 shadow-[0_40px_80px_rgba(0,0,0,0.5)] animate-fadeUp">
        {/* Logo */}
        <div className="font-['Syne'] text-[22px] font-extrabold text-accent2 tracking-tight mb-8">
          Expense<span className="text-text">Flow</span>
        </div>

        <h2 className="font-['Syne'] text-[28px] font-extrabold text-text mb-1.5">
          {isForgotPassword ? 'Reset Password' : 'Welcome back'}
        </h2>
        <p className="text-muted text-[13px] mb-7">
          {isForgotPassword ? "We'll email you a new secure password." : 'Sign in to your workspace'}
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red/10 border border-red/20 text-red text-[13px]">{error}</div>
        )}
        {forgotMessage && (
          <div className="mb-4 p-3 rounded-lg bg-green/10 border border-green/20 text-green text-[13px]">
            {forgotMessage}
            {previewUrl && (
              <div className="mt-2 text-[12px]">
                <a href={previewUrl} target="_blank" rel="noreferrer" className="text-accent2 underline flex items-center gap-1">
                  👁️ Click here to view the Ethereal email simulation
                </a>
              </div>
            )}
          </div>
        )}

        {!isForgotPassword ? (
          <form onSubmit={handleSubmit}>
            <div className="mb-[18px]">
              <label className="block text-[12px] font-medium text-muted mb-[7px] uppercase tracking-[0.5px]">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                className="w-full bg-surface2 border border-border rounded-lg text-text py-[11px] px-[14px] text-[14px] outline-none transition-colors focus:border-accent"
                placeholder="you@company.com" required />
            </div>

            <div className="mb-[18px]">
              <label className="block text-[12px] font-medium text-muted mb-[7px] uppercase tracking-[0.5px]">Password</label>
              <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                className="w-full bg-surface2 border border-border rounded-lg text-text py-[11px] px-[14px] text-[14px] outline-none transition-colors focus:border-accent"
                placeholder="••••••••" required />
            </div>

            {/* Demo accounts hint */}
            <div className="mb-[18px]">
              <p className="text-[12px] text-muted">Demo logins: <strong className="text-accent2">admin@acme.com</strong> / <strong className="text-accent2">manager@acme.com</strong> / <strong className="text-accent2">alice@acme.com</strong></p>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-accent text-white text-[14px] font-semibold rounded-lg cursor-pointer border-none transition-all hover:bg-[#6b5ee8] hover:-translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed mt-1.5">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgotSubmit}>
            <div className="mb-[18px]">
              <label className="block text-[12px] font-medium text-muted mb-[7px] uppercase tracking-[0.5px]">Email Address</label>
              <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                className="w-full bg-surface2 border border-border rounded-lg text-text py-[11px] px-[14px] text-[14px] outline-none transition-colors focus:border-accent"
                placeholder="registered@email.com" required />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-accent text-white text-[14px] font-semibold rounded-lg cursor-pointer border-none transition-all hover:bg-[#6b5ee8] hover:-translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed mt-1.5 flex justify-center">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Send Reset Link'}
            </button>

            <button type="button" onClick={() => { setIsForgotPassword(false); setError(''); setForgotMessage(''); }}
              className="w-full py-3 bg-transparent text-text text-[14px] font-medium rounded-lg cursor-pointer border border-[#2e2e3d] transition-all hover:bg-white/5 mt-3">
              Back to Sign in
            </button>
          </form>
        )}

        {!isForgotPassword && (
          <>
            <div className="text-center mt-6 text-[13px] text-muted">
              Don't have an account? <Link to="/signup" className="text-text hover:text-white transition-colors underline decoration-muted/50 underline-offset-4">Signup</Link>
            </div>
            
            <div className="w-full h-px bg-[#2e2e3d] my-4 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#4a4a6a] to-transparent opacity-50"></div>
            </div>

            <div className="text-center text-[13px]">
              <button 
                onClick={() => { setIsForgotPassword(true); setError(''); }}
                className="bg-transparent border-none text-muted hover:text-white transition-colors cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            {/* Quick demo fill */}
            <div className="mt-8 pt-4 border-t border-border/50">
              <p className="text-[11px] text-subtle text-center mb-3 tracking-wider uppercase font-semibold">Quick login</p>
              <div className="flex flex-col gap-2">
                {[
                  { email: 'admin@acme.com', pass: 'admin123', role: 'Admin' },
                  { email: 'manager@acme.com', pass: 'manager123', role: 'Manager' },
                  { email: 'alice@acme.com', pass: 'employee123', role: 'Employee' },
                ].map(demo => (
                  <button key={demo.email} onClick={() => setForm({ email: demo.email, password: demo.pass })}
                    className="w-full flex justify-between items-center px-4 py-2.5 rounded-[10px] bg-[#1a1a24] border border-[#2e2e3d] hover:border-[#4a4a6a] text-muted hover:text-text transition-all text-[12px] cursor-pointer">
                    <span className="font-medium">{demo.email}</span>
                    <span className="text-accent2 bg-accent2/10 px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wide">{demo.role}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
