'use client';
import { useState, useEffect } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

export default function VendorLoginPage() {
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [code, setCode] = useState('');
  const [codeData, setCodeData] = useState<any>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check(); window.addEventListener('resize', check);
    try { const s = localStorage.getItem('vendor_web_session'); if (s) { const p = JSON.parse(s); if (p.vendorId) window.location.href = '/vendor/dashboard'; } } catch {}
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleValidateCode = async () => {
    if (!code.trim()) { setError('Please enter your vendor code'); return; }
    try {
      setLoading(true); setError('');
      const res = await fetch(`${API}/api/signup/validate-code`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: code.trim() }) });
      const data = await res.json();
      if (data.success && data.data) {
        if (data.data.type !== 'vendor') { setError('This is a couple code. Please use thedreamwedding.in/couple/login'); return; }
        setCodeData(data.data); setStep(2);
      } else { setError(data.error || 'Invalid or expired code'); }
    } catch { setError('Network error.'); } finally { setLoading(false); }
  };

  const handleGoToPassword = () => {
    // Business name optional
    if (!phone || phone.length < 10) { setError('Valid 10-digit phone required'); return; }
    if (!email || !email.includes('@')) { setError('Valid email required'); return; }
    if (!instagram.trim()) { setError('Instagram handle required'); return; }
    setError(''); setStep(3);
  };

  const handleCompleteSignup = async () => {
    if (!password || password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    try {
      setLoading(true); setError('');
      const res = await fetch(`${API}/api/signup/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), name: name.trim(), phone, email: email.trim(), instagram: instagram.trim(), password, code_type: codeData?.type, code_id: codeData?.code_id, tier: codeData?.tier }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        localStorage.setItem('vendor_web_session', JSON.stringify({ vendorId: data.data.id, vendorName: data.data.name, category: data.data.category, city: data.data.city, tier: data.data.tier, trialEnd: data.data.trial_end }));
        window.location.href = '/vendor/dashboard';
      } else { setError(data.error || 'Signup failed'); }
    } catch { setError('Network error.'); } finally { setLoading(false); }
  };

  const handleLogin = async () => {
    if (!loginId.trim()) { setError('Enter your email or phone number'); return; }
    if (!loginPass) { setError('Enter your password'); return; }
    try {
      setLoading(true); setError('');
      const res = await fetch(`${API}/api/signup/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: loginId.trim(), password: loginPass }) });
      const data = await res.json();
      if (data.success && data.data) {
        if (data.data.type === 'couple') { setError('This is a couple account. Please use thedreamwedding.in/couple/login'); return; }
        localStorage.setItem('vendor_web_session', JSON.stringify({ vendorId: data.data.id, vendorName: data.data.name, category: data.data.category, city: data.data.city, tier: data.data.tier, teamRole: data.data.team_role || 'owner', teamMemberName: data.data.team_member_name || null, isTeamMember: data.data.is_team_member || false }));
        window.location.href = '/vendor/dashboard';
      } else { setError(data.error || 'Login failed'); }
    } catch { setError('Network error.'); } finally { setLoading(false); }
  };

  const iS: React.CSSProperties = { width: '100%', padding: '12px 16px', fontSize: '14px', fontFamily: 'Inter, sans-serif', border: '1px solid #E2E8F0', borderRadius: '6px', backgroundColor: '#FFFFFF', color: '#0F172A', outline: 'none', boxSizing: 'border-box' };
  const lS: React.CSSProperties = { fontSize: '12px', fontWeight: 500, color: '#475569', display: 'block', marginBottom: '6px' };
  const bS = (a: boolean): React.CSSProperties => ({ width: '100%', background: a ? '#0F172A' : '#E2E8F0', color: a ? '#FFFFFF' : '#94A3B8', fontSize: '14px', fontWeight: 500, fontFamily: 'Inter, sans-serif', padding: '12px 24px', borderRadius: '6px', border: 'none', cursor: a ? 'pointer' : 'not-allowed', marginBottom: '16px' });
  const backBtn: React.CSSProperties = { width: '100%', background: 'transparent', color: '#8C7B6E', fontSize: '12px', fontFamily: 'Inter, sans-serif', padding: '10px', borderRadius: '8px', border: '1px solid #E8DDD4', cursor: 'pointer', marginTop: '8px' };
  const foc = (e: any) => { e.target.style.border = '1px solid #0F172A'; e.target.style.boxShadow = '0 0 0 3px rgba(15,23,42,0.08)'; };
  const blr = (e: any) => { e.target.style.border = '1.5px solid #E5E7EB'; };

  const renderSignup = () => {
    if (step === 1) return (<>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '18px', fontWeight: 600, color: '#0F1117', marginBottom: '6px' }}>Sign Up</div>
        <div style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.6 }}>Enter the vendor code provided by The Dream Wedding team.</div>
      </div>
      <div style={{ marginBottom: '12px' }}>
        <label style={lS}>Vendor Code</label>
        <input type="text" placeholder="e.g. SIG-A3KF9M" value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }} onKeyDown={e => e.key === 'Enter' && handleValidateCode()} style={{ ...iS, letterSpacing: '3px', textAlign: 'center', textTransform: 'uppercase', fontSize: '16px' }} onFocus={foc} onBlur={blr} />
      </div>
      {error && <div style={{ fontSize: '12px', color: '#DC2626', marginBottom: '12px' }}>{error}</div>}
      <button onClick={handleValidateCode} disabled={loading || !code.trim()} style={bS(!loading && !!code.trim())}>{loading ? 'Verifying...' : 'Continue'}</button>
      <div style={{ fontSize: '11px', color: '#9CA3AF', textAlign: 'center', lineHeight: 1.6 }}>This code was provided during your onboarding with The Dream Wedding team.</div>
    </>);

    if (step === 2) return (<>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '18px', fontWeight: 600, color: '#0F1117', marginBottom: '6px' }}>Business Details</div>
        <div style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.6 }}>
          Set up your vendor profile. All fields are required.
          {codeData?.tier && <span style={{ marginLeft: '6px', background: 'rgba(201,168,76,0.1)', color: '#C9A84C', padding: '2px 8px', borderRadius: '50px', fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>{codeData.tier}</span>}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
        <div><label style={lS}>Business Name (optional)</label><input type="text" placeholder="Your business name" value={name} onChange={e => { setName(e.target.value); setError(''); }} style={iS} onFocus={foc} onBlur={blr} /></div>
        <div><label style={lS}>Phone Number *</label><div style={{ display: 'flex', gap: '8px' }}><div style={{ padding: '14px 12px', background: '#FAFAFA', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', color: '#6B7280', fontFamily: 'Inter' }}>+91</div><input type="tel" placeholder="10-digit number" value={phone} onChange={e => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }} style={{ ...iS, flex: 1 }} onFocus={foc} onBlur={blr} /></div><div style={{ fontSize: '10px', color: '#B8ADA4', marginTop: '4px', fontStyle: 'italic' }}>This will be your login ID</div></div>
        <div><label style={lS}>Email Address *</label><input type="email" placeholder="business@email.com" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} style={iS} onFocus={foc} onBlur={blr} /><div style={{ fontSize: '10px', color: '#B8ADA4', marginTop: '4px', fontStyle: 'italic' }}>Or use this to log in</div></div>
        <div><label style={lS}>Instagram Handle</label><input type="text" placeholder="@yourbusiness" value={instagram} onChange={e => { setInstagram(e.target.value.replace(/\s/g, '')); setError(''); }} style={iS} onFocus={foc} onBlur={(e: any) => { blr(e); const h = instagram.replace('@','').trim(); if (h.length > 0 && h.length < 3) setError('Instagram handle must be at least 3 characters'); else if (h && !/^[a-zA-Z0-9._]+$/.test(h)) setError('Instagram handle can only contain letters, numbers, periods and underscores'); }} /><div style={{ fontSize: '10px', color: '#B8ADA4', marginTop: '4px', fontStyle: 'italic' }}>Optional — leave blank if you don't have Instagram</div></div>
      </div>
      {error && <div style={{ fontSize: '12px', color: '#DC2626', marginBottom: '12px' }}>{error}</div>}
      <button onClick={handleGoToPassword} style={bS(true)}>Continue</button>
      <button onClick={() => { setStep(1); setError(''); }} style={backBtn}>Back</button>
    </>);

    if (step === 3) return (<>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '18px', fontWeight: 600, color: '#0F1117', marginBottom: '6px' }}>Create Password</div>
        <div style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.6 }}>Your email ({email}) or phone ({phone}) will be your username.</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
        <div><label style={lS}>Password</label><input type="password" placeholder="Minimum 6 characters" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} style={iS} onFocus={foc} onBlur={blr} /></div>
        <div><label style={lS}>Confirm Password</label><input type="password" placeholder="Confirm your password" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setError(''); }} onKeyDown={e => e.key === 'Enter' && handleCompleteSignup()} style={iS} onFocus={foc} onBlur={blr} /></div>
      </div>
      {error && <div style={{ fontSize: '12px', color: '#DC2626', marginBottom: '12px' }}>{error}</div>}
      <button onClick={handleCompleteSignup} disabled={loading} style={bS(!loading)}>{loading ? 'Creating Account...' : 'Create Account & Go Live'}</button>
      <button onClick={() => { setStep(2); setError(''); }} style={backBtn}>Back</button>
    </>);
  };

  const renderLogin = () => (<>
    <div style={{ marginBottom: '24px' }}>
      <div style={{ fontSize: '18px', fontWeight: 600, color: '#0F1117', marginBottom: '6px' }}>Log In</div>
      <div style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.6 }}>Enter your email or phone number and password.</div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
      <div><label style={lS}>Email or Phone Number</label><input type="text" placeholder="business@email.com or 9876543210" value={loginId} onChange={e => { setLoginId(e.target.value); setError(''); }} onKeyDown={e => e.key === 'Enter' && document.getElementById('vlp')?.focus()} style={iS} onFocus={foc} onBlur={blr} /></div>
      <div><label style={lS}>Password</label><input type="password" id="vlp" placeholder="Your password" value={loginPass} onChange={e => { setLoginPass(e.target.value); setError(''); }} onKeyDown={e => e.key === 'Enter' && handleLogin()} style={iS} onFocus={foc} onBlur={blr} /></div>
    </div>
    {error && <div style={{ fontSize: '12px', color: '#DC2626', marginBottom: '12px' }}>{error}</div>}
    <button onClick={handleLogin} disabled={loading || !loginId.trim() || !loginPass} style={bS(!loading && !!loginId.trim() && !!loginPass)}>{loading ? 'Signing in...' : 'Sign In'}</button>
  </>);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      {/* ── Left Panel: Business Portal showcase (desktop only) ── */}
      {!isMobile && (
        <div style={{ width: '55%', background: '#0F172A', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '48px 56px' }}>
          {/* Brand */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '3px', color: '#FFFFFF', textTransform: 'uppercase' }}>THE DREAM WEDDING</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.5px', marginTop: '4px' }}>Business Portal</div>
          </div>

          {/* Hero tagline + features */}
          <div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '42px', fontWeight: 300, color: '#FFFFFF', lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: '16px' }}>
              The business<br/>behind the dream.
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', lineHeight: 1.8, maxWidth: '340px', marginBottom: '48px' }}>
              The complete operating system<br/>for wedding professionals.
            </div>

            {/* Feature showcase */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {[
                { title: 'Dream Ai', desc: 'Run your entire business from WhatsApp.' },
                { title: 'Financial Operations', desc: 'GST invoicing, TDS tracking, expense management.' },
                { title: 'Team & Event Control', desc: 'Multi-event dashboards, delegation, procurement.' },
                { title: 'Couple Discovery', desc: 'They find you through your work, not your brand.' },
              ].map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.3)', marginTop: '6px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', fontWeight: 500, marginBottom: '2px' }}>{f.title}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.22)', fontWeight: 300, lineHeight: 1.5 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{ borderTop: '1px solid rgba(201,168,76,0.12)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.15)', letterSpacing: '0.3px' }}>vendor.thedreamwedding.in</div>
            <div style={{ fontSize: '10px', color: 'rgba(201,168,76,0.3)', letterSpacing: '0.3px' }}>2026</div>
          </div>
        </div>
      )}

      {/* ── Right Panel: Auth forms ── */}
      <div style={{ width: isMobile ? '100%' : '45%', background: isMobile ? '#0F172A' : '#FAFAFA', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: isMobile ? 'flex-start' : 'center', padding: isMobile ? '32px 24px' : '56px 64px', minHeight: isMobile ? '100vh' : 'auto', overflowY: 'auto', paddingTop: isMobile ? '48px' : '56px' }}>
        {isMobile && (<div style={{ marginBottom: '28px', textAlign: 'center' }}><div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '3px', color: '#FFFFFF', textTransform: 'uppercase', marginBottom: '4px' }}>THE DREAM WEDDING</div><div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Business Portal</div></div>)}
        <div style={{ width: '100%', maxWidth: '380px', background: isMobile ? '#FFFFFF' : 'transparent', borderRadius: isMobile ? '16px' : '0', padding: isMobile ? '28px 24px' : '0' }}>
          {/* Sign In only — signups happen at thedreamwedding.in */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '20px', fontWeight: 600, color: '#0F172A', marginBottom: '6px', letterSpacing: '-0.02em' }}>Sign in</div>
            <div style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.6 }}>Enter your email or phone number and password.</div>
          </div>
          {renderLogin()}
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #E2E8F0', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '8px' }}>Don't have an account?</div>
            <a href="/" style={{ fontSize: '12px', color: '#0F172A', textDecoration: 'none', fontWeight: 500 }}>Sign up at thedreamwedding.in →</a>
          </div>
        </div>
      </div>
    </div>
  );
}
