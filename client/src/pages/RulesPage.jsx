import { useState, useEffect } from 'react';
import api from '../services/api';

export default function RulesPage() {
  const [chains, setChains] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);

  // Editable chain state
  const [managerFirst, setManagerFirst] = useState(true);
  const [steps, setSteps] = useState([]);
  const [editingStep, setEditingStep] = useState(null);
  const [stepForm, setStepForm] = useState({ role: '', email: '' });

  // Conditional rules state
  const [minApprovalPct, setMinApprovalPct] = useState(60);
  const [autoApproveRole, setAutoApproveRole] = useState('');
  const [hybridMode, setHybridMode] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rulesRes, chainsRes, usersRes] = await Promise.all([
        api.get('/rules'),
        api.get('/approvals/chain'),
        api.get('/users').catch(() => ({ data: { users: [] } })),
      ]);
      setRules(rulesRes.data.rules);
      setChains(chainsRes.data.chains);
      setUsers(usersRes.data.users || []);

      // Populate chain steps from existing data
      if (chainsRes.data.chains.length > 0) {
        const chain = chainsRes.data.chains[0];
        const existingSteps = chain.steps.map((s, i) => ({
          id: s.id,
          role: s.approverRole || 'Custom',
          email: s.approver ? s.approver.email : (s.approverRole === 'MANAGER' ? '' : ''),
          name: s.approverRole === 'MANAGER' ? 'Manager' : (s.approver ? `${s.approver.firstName} ${s.approver.lastName}` : s.approverRole || `Step ${i + 1}`),
          isManager: s.approverRole === 'MANAGER',
        }));
        // Check if first step is manager
        if (existingSteps.length > 0 && existingSteps[0].isManager) {
          setManagerFirst(true);
        }
        setSteps(existingSteps);
      } else {
        // Default steps matching the reference
        setSteps([
          { id: 'default-1', role: 'MANAGER', email: '', name: 'Manager', isManager: true },
          { id: 'default-2', role: 'Finance', email: 'finance@acme.com', name: 'Finance', isManager: false },
          { id: 'default-3', role: 'Director', email: 'director@acme.com', name: 'Director', isManager: false },
        ]);
      }

      // Populate conditional rules from existing
      const percentRule = rulesRes.data.rules.find(r => r.type === 'PERCENTAGE');
      if (percentRule) {
        setMinApprovalPct(percentRule.config?.requiredApprovalPercentage || 60);
        setAutoApproveRole(percentRule.config?.autoApproveRole || '');
        setHybridMode(percentRule.config?.hybrid || false);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const addStep = () => {
    setSteps(prev => [...prev, {
      id: `new-${Date.now()}`,
      role: 'Custom',
      email: '',
      name: `Step ${prev.length + 1}`,
      isManager: false,
    }]);
  };

  const removeStep = (idx) => {
    setSteps(prev => prev.filter((_, i) => i !== idx));
  };

  const startEdit = (idx) => {
    const step = steps[idx];
    setEditingStep(idx);
    setStepForm({ role: step.name, email: step.email });
  };

  const saveStepEdit = () => {
    if (editingStep === null) return;
    setSteps(prev => prev.map((s, i) =>
      i === editingStep ? { ...s, name: stepForm.role, email: stepForm.email } : s
    ));
    setEditingStep(null);
    setStepForm({ role: '', email: '' });
  };

  const handleSaveRules = async () => {
    setSaving(true);
    try {
      // Save/update the percentage rule
      const existingRule = rules.find(r => r.type === 'PERCENTAGE');
      const ruleData = {
        name: 'Approval Configuration',
        type: 'PERCENTAGE',
        config: {
          requiredApprovalPercentage: minApprovalPct,
          autoApproveRole: autoApproveRole,
          hybrid: hybridMode,
        },
      };
      if (existingRule) {
        await api.put(`/rules/${existingRule.id}`, ruleData);
      } else {
        await api.post('/rules', ruleData);
      }
      fetchData();
    } catch (err) { alert(err.response?.data?.error || 'Failed to save'); }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-accent/30 border-t-accent rounded-full animate-spin"></div></div>;

  const approverRoles = ['Manager', 'Finance', 'Director', 'Admin'];

  return (
    <div>
      <div className="mb-7">
        <h1 className="font-['Syne'] text-[24px] font-extrabold text-text mb-1">Approval Rules</h1>
        <p className="text-muted text-[13px]">Configure multi-level and conditional approval flows</p>
      </div>

      {/* ═══ Sequential Approver Chain ═══ */}
      <div className="bg-[#19191f] border border-[#2a2a38] rounded-2xl p-6 mb-4">
        <h3 className="font-['DM_Sans'] text-[15px] font-bold text-text mb-[3px]">Sequential Approver Chain</h3>
        <p className="text-muted text-[12.5px] mb-5">Expense moves to the next approver only after current one acts</p>

        {/* Manager checkbox */}
        <label className="flex items-center gap-2.5 mb-5 cursor-pointer select-none pb-4 border-b border-[#222230]">
          <div className="relative">
            <input type="checkbox" checked={managerFirst} onChange={e => setManagerFirst(e.target.checked)}
              className="sr-only peer" />
            <div className="w-[18px] h-[18px] rounded-[4px] bg-[#1e1e2a] border border-[#333348] peer-checked:bg-accent peer-checked:border-accent transition-all flex items-center justify-center">
              {managerFirst && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
            </div>
          </div>
          <span className="text-[13px] font-medium text-text">IS MANAGER APPROVER <span className="text-muted font-normal">— employee's direct manager approves first</span></span>
        </label>

        {/* Approver Steps */}
        <div className="flex flex-col gap-2.5 mb-5">
          {steps.map((step, i) => (
            <div key={step.id} className="flex items-center gap-3.5 px-4 py-3 bg-[#1a1a24] border border-[#27273a] rounded-xl">
              <div className="w-7 h-7 rounded-full bg-accent/90 text-white text-[12px] font-bold flex items-center justify-center shrink-0">{i + 1}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-semibold text-text leading-tight">{step.name}</div>
                <div className="text-[11.5px] text-muted leading-tight mt-0.5">{step.isManager ? 'Direct manager of employee' : step.email || 'Not configured'}</div>
              </div>
              {step.isManager ? (
                <span className="bg-[#2d1f07] text-amber border border-amber/20 text-[11.5px] px-3 py-1 rounded-full font-semibold italic whitespace-nowrap">Auto (from user record)</span>
              ) : (
                <button onClick={() => startEdit(i)}
                  className="px-4 py-1.5 rounded-lg bg-[#1e1e2a] border border-[#2e2e40] text-[#c0c0d8] text-[12.5px] font-semibold cursor-pointer transition-all hover:border-accent/60 hover:text-accent">Edit</button>
              )}
            </div>
          ))}
        </div>

        <button onClick={addStep}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-transparent border border-[#2e2e40] text-muted text-[13px] font-medium cursor-pointer transition-all hover:border-accent/60 hover:text-accent">
          + Add Approver Step
        </button>
      </div>

      {/* ═══ Conditional Approval Rules ═══ */}
      <div className="bg-[#19191f] border border-[#2a2a38] rounded-2xl p-6">
        <h3 className="font-['DM_Sans'] text-[15px] font-bold text-text mb-[3px]">Conditional Approval Rules</h3>
        <p className="text-muted text-[12.5px] mb-6">Define how the final approval decision is reached</p>

        {/* Min approval % */}
        <div className="flex items-center gap-4 mb-4">
          <span className="text-[13px] text-muted w-44 shrink-0">Minimum approval %</span>
          <input type="number" min="1" max="100" value={minApprovalPct} onChange={e => setMinApprovalPct(Number(e.target.value))}
            className="w-20 bg-[#1a1a24] border border-[#27273a] rounded-lg text-text py-2 px-3 text-[14px] outline-none focus:border-accent text-center" />
          <span className="text-[13px] text-muted">% of approvers must approve</span>
        </div>

        {/* Auto-approve role */}
        <div className="flex items-center gap-4 mb-5">
          <span className="text-[13px] text-muted w-44 shrink-0">Auto-approve if approver</span>
          <select value={autoApproveRole} onChange={e => setAutoApproveRole(e.target.value)}
            className="flex-1 bg-[#1a1a24] border border-[#27273a] rounded-lg text-text py-2 px-3 text-[14px] outline-none focus:border-accent appearance-none cursor-pointer">
            <option value="">— Select —</option>
            {approverRoles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <span className="text-[13px] text-muted whitespace-nowrap">approves → instant approval</span>
        </div>

        {/* Hybrid checkbox */}
        <label className="flex items-center gap-2.5 mb-6 cursor-pointer select-none">
          <div className="relative">
            <input type="checkbox" checked={hybridMode} onChange={e => setHybridMode(e.target.checked)}
              className="sr-only peer" />
            <div className="w-[18px] h-[18px] rounded-[4px] bg-[#1e1e2a] border border-[#333348] peer-checked:bg-accent peer-checked:border-accent transition-all flex items-center justify-center">
              {hybridMode && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
            </div>
          </div>
          <span className="text-[13px] text-text">Hybrid — <span className="text-muted">either condition (% OR specific approver) is sufficient</span></span>
        </label>

        <button onClick={handleSaveRules} disabled={saving}
          className="px-6 py-2.5 rounded-lg bg-accent text-white text-[13.5px] font-semibold cursor-pointer border-none transition-all hover:bg-[#6b5ee8] disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Rules'}
        </button>
      </div>

      {/* ═══ Edit Step Drawer ═══ */}
      {editingStep !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[4px] z-[100] flex items-center justify-end animate-fadeIn" onClick={e => e.target === e.currentTarget && setEditingStep(null)}>
          <div className="w-[440px] h-screen bg-surface border-l border-border overflow-y-auto p-8 animate-slideIn">
            <div className="flex items-center justify-between mb-7">
              <h2 className="font-['Syne'] text-[20px] font-extrabold text-text">Edit Approver Step</h2>
              <button onClick={() => setEditingStep(null)} className="w-8 h-8 rounded-lg bg-surface2 border border-border text-muted cursor-pointer text-[16px] flex items-center justify-center transition-all hover:text-text hover:border-text">✕</button>
            </div>

            <div className="mb-5">
              <label className="block text-[12px] font-medium text-muted mb-2 uppercase tracking-[0.5px]">Role / Name</label>
              <input type="text" value={stepForm.role} onChange={e => setStepForm({...stepForm, role: e.target.value})}
                className="w-full bg-surface2 border border-border rounded-lg text-text py-3 px-4 text-[14px] outline-none focus:border-accent" placeholder="e.g. Finance" />
            </div>
            <div className="mb-5">
              <label className="block text-[12px] font-medium text-muted mb-2 uppercase tracking-[0.5px]">Email / Identifier</label>
              <input type="text" value={stepForm.email} onChange={e => setStepForm({...stepForm, email: e.target.value})}
                className="w-full bg-surface2 border border-border rounded-lg text-text py-3 px-4 text-[14px] outline-none focus:border-accent" placeholder="finance@acme.com" />
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditingStep(null)}
                className="flex-1 py-3 rounded-lg bg-transparent border border-border text-text text-[14px] font-semibold cursor-pointer transition-all hover:border-accent hover:text-accent">Cancel</button>
              <button onClick={saveStepEdit}
                className="flex-1 py-3 rounded-lg bg-accent text-white text-[14px] font-semibold cursor-pointer border-none transition-all hover:bg-[#6b5ee8]">Save</button>
            </div>

            {!steps[editingStep]?.isManager && (
              <button onClick={() => { removeStep(editingStep); setEditingStep(null); }}
                className="w-full mt-4 py-3 rounded-lg bg-transparent border border-red/30 text-red text-[13px] font-semibold cursor-pointer transition-all hover:bg-red/10">
                Remove this step
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
