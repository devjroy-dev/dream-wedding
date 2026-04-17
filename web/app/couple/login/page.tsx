'use client';
import { useState, useEffect } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

export default function CoupleLoginPage() {
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
  const [dreamerType, setDreamerType] = useState('');

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check(); window.addEventListener('resize', check);
    try { const s = localStorage.getItem('couple_session'); if (s) { const p = JSON.parse(s); if (p.id) window.location.href = '/couple'; } } catch {}
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleValidateCode = async () => {
    if (!code.trim()) { setError('Please enter your invite or referral code'); return; }
    try {
      setLoading(true); setError('');
      const res = await fetch(`${API}/api/signup/validate-code`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: code.trim() }) });
      const data = await res.json();
      if (data.success && data.data) { setCodeData(data.data); setStep(2); }
      else { setError(data.error || 'Invalid or expired code'); }
    } catch { setError('Network error.'); } finally { setLoading(false); }
  };

  const handleGoToPassword = () => {
    if (!name.trim()) { setError('Name is required'); return; }
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
        body: JSON.stringify({ code: code.trim(), name: name.trim(), phone, email: email.trim(), instagram: instagram.trim(), password, code_type: codeData?.type, code_id: codeData?.code_id, tier: codeData?.tier, vendor_id: codeData?.vendor_id, referral_code: codeData?.referral_code, dreamer_type: dreamerType }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        if (data.data.type === 'vendor') {
          localStorage.setItem('vendor_web_session', JSON.stringify({ vendorId: data.data.id, vendorName: data.data.name, category: data.data.category, city: data.data.city, tier: data.data.tier, trialEnd: data.data.trial_end }));
          window.location.href = '/vendor/dashboard';
        } else {
          localStorage.setItem('couple_session', JSON.stringify({ id: data.data.id, name: data.data.name, couple_tier: data.data.couple_tier, tier_label: data.data.tier_label, tokens: data.data.tokens }));
          window.location.href = '/couple';
        }
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
        if (data.data.type === 'vendor') {
          localStorage.setItem('vendor_web_session', JSON.stringify({ vendorId: data.data.id, vendorName: data.data.name, category: data.data.category, city: data.data.city, tier: data.data.tier }));
          window.location.href = '/vendor/dashboard';
        } else {
          localStorage.setItem('couple_session', JSON.stringify({ id: data.data.id, name: data.data.name, couple_tier: data.data.couple_tier, tier_label: data.data.tier_label, tokens: data.data.tokens }));
          window.location.href = '/couple';
        }
      } else { setError(data.error || 'Login failed'); }
    } catch { setError('Network error.'); } finally { setLoading(false); }
  };

  const iS: React.CSSProperties = { width: '100%', padding: '14px 18px', fontSize: '14px', fontFamily: 'Inter, sans-serif', border: '1.5px solid #E5E7EB', borderRadius: '8px', backgroundColor: '#FAFAFA', color: '#0F1117', outline: 'none', boxSizing: 'border-box' };
  const lS: React.CSSProperties = { fontSize: '11px', fontWeight: 500, color: '#6B7280', letterSpacing: '0.8px', textTransform: 'uppercase', display: 'block', marginBottom: '8px' };
  const bS = (a: boolean): React.CSSProperties => ({ width: '100%', background: a ? '#2C2420' : '#E5E7EB', color: a ? '#C9A84C' : '#9CA3AF', fontSize: '13px', fontWeight: 600, letterSpacing: '0.5px', fontFamily: 'Inter, sans-serif', padding: '14px 24px', borderRadius: '8px', border: 'none', cursor: a ? 'pointer' : 'not-allowed', marginBottom: '16px' });
  const backBtn: React.CSSProperties = { width: '100%', background: 'transparent', color: '#6B7280', fontSize: '12px', fontFamily: 'Inter, sans-serif', padding: '10px', borderRadius: '8px', border: '1px solid #E5E7EB', cursor: 'pointer', marginTop: '8px' };
  const foc = (e: any) => { e.target.style.border = '1.5px solid #C9A84C'; };
  const blr = (e: any) => { e.target.style.border = '1.5px solid #E5E7EB'; };

  const renderSignup = () => {
    if (step === 1) return (<>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '18px', fontWeight: 600, color: '#0F1117', marginBottom: '6px' }}>Sign Up</div>
        <div style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.6 }}>Enter your invite code or referral code to get started.</div>
      </div>
      <div style={{ marginBottom: '12px' }}>
        <label style={lS}>Invite / Referral Code</label>
        <input type="text" placeholder="e.g. GLD-A3KF9M or JOSEA4B2" value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }} onKeyDown={e => e.key === 'Enter' && handleValidateCode()} style={{ ...iS, letterSpacing: '3px', textAlign: 'center', textTransform: 'uppercase', fontSize: '16px' }} onFocus={foc} onBlur={blr} />
      </div>
      {error && <div style={{ fontSize: '12px', color: '#DC2626', marginBottom: '12px' }}>{error}</div>}
      <button onClick={handleValidateCode} disabled={loading || !code.trim()} style={bS(!loading && !!code.trim())}>{loading ? 'Verifying...' : 'Continue'}</button>
      <div style={{ fontSize: '11px', color: '#9CA3AF', textAlign: 'center', lineHeight: 1.6 }}>This code was shared by The Dream Wedding team or a vendor you know.</div>
    </>);

    if (step === 2) return (<>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '18px', fontWeight: 600, color: '#0F1117', marginBottom: '6px' }}>Your Details</div>
        <div style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.6 }}>
          {codeData?.type === 'vendor' ? 'Set up your vendor profile.' : 'Tell us about yourself.'}
          {codeData?.tier && <span style={{ marginLeft: '6px', background: 'rgba(201,168,76,0.1)', color: '#C9A84C', padding: '2px 8px', borderRadius: '50px', fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>{codeData.tier}</span>}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
        <div><label style={lS}>Full Name *</label><input type="text" placeholder="Your full name" value={name} onChange={e => { setName(e.target.value); setError(''); }} style={iS} onFocus={foc} onBlur={blr} /></div>
        <div><label style={lS}>I am a *</label><div style={{ display: 'flex', gap: '8px' }}>{['Couple', 'Family', 'Friend'].map(t => (<button key={t} onClick={() => setDreamerType(t.toLowerCase())} style={{ flex: 1, padding: '12px 8px', borderRadius: '8px', border: dreamerType === t.toLowerCase() ? '1.5px solid #C9A84C' : '1.5px solid #E5E7EB', background: dreamerType === t.toLowerCase() ? 'rgba(201,168,76,0.08)' : '#FAFAFA', color: dreamerType === t.toLowerCase() ? '#C9A84C' : '#6B7280', fontSize: '13px', fontFamily: 'Inter, sans-serif', cursor: 'pointer', fontWeight: dreamerType === t.toLowerCase() ? 500 : 400 }}>{t}</button>))}</div></div>
        <div><label style={lS}>Phone Number *</label><div style={{ display: 'flex', gap: '8px' }}><div style={{ padding: '14px 12px', background: '#FAFAFA', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', color: '#6B7280', fontFamily: 'Inter' }}>+91</div><input type="tel" placeholder="10-digit number" value={phone} onChange={e => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }} style={{ ...iS, flex: 1 }} onFocus={foc} onBlur={blr} /></div><div style={{ fontSize: '10px', color: '#B8ADA4', marginTop: '4px', fontStyle: 'italic' }}>This will be your login ID</div></div>
        <div><label style={lS}>Email Address *</label><input type="email" placeholder="your@email.com" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} style={iS} onFocus={foc} onBlur={blr} /><div style={{ fontSize: '10px', color: '#B8ADA4', marginTop: '4px', fontStyle: 'italic' }}>Or use this to log in</div></div>
        <div><label style={lS}>Instagram Handle *</label><input type="text" placeholder="@yourhandle" value={instagram} onChange={e => { setInstagram(e.target.value); setError(''); }} style={iS} onFocus={foc} onBlur={async (e: any) => { blr(e); const h = instagram.replace('@','').trim(); if (h.length > 2) { try { const r = await fetch('https://dream-wedding-production-89ae.up.railway.app/api/verify/check-instagram', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ handle: h }) }); const d = await r.json(); if (d.success && d.exists === false) setError('Instagram handle not found'); } catch {} } }} /></div>
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
      <button onClick={handleCompleteSignup} disabled={loading} style={bS(!loading)}>{loading ? 'Creating Account...' : 'Create Account'}</button>
      <button onClick={() => { setStep(2); setError(''); }} style={backBtn}>Back</button>
    </>);
  };

  const renderLogin = () => (<>
    <div style={{ marginBottom: '24px' }}>
      <div style={{ fontSize: '18px', fontWeight: 600, color: '#0F1117', marginBottom: '6px' }}>Log In</div>
      <div style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.6 }}>Enter your email or phone number and password.</div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
      <div><label style={lS}>Email or Phone Number</label><input type="text" placeholder="your@email.com or 9876543210" value={loginId} onChange={e => { setLoginId(e.target.value); setError(''); }} onKeyDown={e => e.key === 'Enter' && document.getElementById('lp')?.focus()} style={iS} onFocus={foc} onBlur={blr} /></div>
      <div><label style={lS}>Password</label><input type="password" id="lp" placeholder="Your password" value={loginPass} onChange={e => { setLoginPass(e.target.value); setError(''); }} onKeyDown={e => e.key === 'Enter' && handleLogin()} style={iS} onFocus={foc} onBlur={blr} /></div>
    </div>
    {error && <div style={{ fontSize: '12px', color: '#DC2626', marginBottom: '12px' }}>{error}</div>}
    <button onClick={handleLogin} disabled={loading || !loginId.trim() || !loginPass} style={bS(!loading && !!loginId.trim() && !!loginPass)}>{loading ? 'Signing in...' : 'Sign In'}</button>
  </>);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      {!isMobile && (
        <div style={{ width: '55%', background: '#FAF6F0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '48px 56px' }}>
          <div><div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '2.5px', color: '#C9A84C', textTransform: 'uppercase' }}>THE DREAM WEDDING</div><div style={{ fontSize: '11px', color: '#8C7B6E', letterSpacing: '0.5px', marginTop: '4px' }}>For Couples</div></div>
          <div><div style={{ fontFamily: 'Playfair Display, serif', fontSize: '38px', fontWeight: 300, color: '#2C2420', lineHeight: 1.2, marginBottom: '20px' }}>Not just happily<br/>married.</div><div style={{ fontFamily: 'Playfair Display, serif', fontSize: '38px', fontWeight: 300, color: '#C9A84C', lineHeight: 1.2, marginBottom: '20px' }}>Getting married<br/>happily.</div><div style={{ fontSize: '13px', color: '#8C7B6E', lineHeight: 1.8, maxWidth: '340px' }}>Discover verified photographers, venues, designers and more — through a curated experience built for the way you actually make decisions.</div></div>
          <div style={{ borderTop: '1px solid #E8E0D5', paddingTop: '24px' }}><div style={{ fontSize: '11px', color: '#B8ADA4' }}>thedreamwedding.in</div></div>
        </div>
      )}
      <div style={{ width: isMobile ? '100%' : '45%', background: isMobile ? '#FAF6F0' : '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: isMobile ? 'flex-start' : 'center', padding: isMobile ? '32px 24px' : '56px 64px', minHeight: isMobile ? '100vh' : 'auto', overflowY: 'auto', paddingTop: isMobile ? '48px' : '56px' }}>
        {isMobile && (<div style={{ marginBottom: '28px', textAlign: 'center' }}><div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '2.5px', color: '#C9A84C', textTransform: 'uppercase', marginBottom: '4px' }}>THE DREAM WEDDING</div><div style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', fontWeight: 300, color: '#2C2420', marginTop: '12px', lineHeight: 1.2 }}>Getting married<br/>happily.</div></div>)}
        <div style={{ width: '100%', maxWidth: '380px', background: isMobile ? '#FFFFFF' : 'transparent', borderRadius: isMobile ? '16px' : '0', padding: isMobile ? '28px 24px' : '0' }}>
          <div style={{ display: 'flex', marginBottom: '24px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
            <button onClick={() => { setMode('signup'); setStep(1); setError(''); }} style={{ flex: 1, padding: '12px', fontSize: '12px', fontWeight: mode === 'signup' ? 600 : 400, fontFamily: 'Inter, sans-serif', background: mode === 'signup' ? '#2C2420' : '#fff', color: mode === 'signup' ? '#C9A84C' : '#6B7280', border: 'none', cursor: 'pointer', letterSpacing: '0.5px' }}>Sign Up</button>
            <button onClick={() => { setMode('login'); setError(''); }} style={{ flex: 1, padding: '12px', fontSize: '12px', fontWeight: mode === 'login' ? 600 : 400, fontFamily: 'Inter, sans-serif', background: mode === 'login' ? '#2C2420' : '#fff', color: mode === 'login' ? '#C9A84C' : '#6B7280', border: 'none', cursor: 'pointer', borderLeft: '1px solid #E5E7EB', letterSpacing: '0.5px' }}>Log In</button>
          </div>
          {mode === 'signup' ? renderSignup() : renderLogin()}
          <div style={{ marginTop: '20px', textAlign: 'center' }}><a href="/vendor/login" style={{ fontSize: '12px', color: '#8C7B6E', textDecoration: 'underline' }}>Vendor? Sign in here</a></div>
        </div>
      </div>
    </div>
  );
}
