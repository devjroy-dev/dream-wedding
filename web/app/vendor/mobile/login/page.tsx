'use client';
import { useState, useEffect } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

// ── Brand Tokens (match PWA) ──────────────────────────────────────────────
const C = {
  cream: '#FAF6F0',
  ivory: '#FFFFFF',
  card: '#FFFFFF',
  dark: '#2C2420',
  gold: '#C9A84C',
  goldSoft: '#FFF8EC',
  goldBorder: '#E8D9B5',
  muted: '#8C7B6E',
  light: '#B8ADA4',
  border: '#EDE8E0',
  red: '#E57373',
};

export default function VendorMobileLoginPage() {
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Signup state
  const [code, setCode] = useState('');
  const [codeData, setCodeData] = useState<any>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Login state
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // Auto-redirect if session exists
  useEffect(() => {
    try {
      const s = localStorage.getItem('vendor_web_session');
      if (s) {
        const p = JSON.parse(s);
        if (p.vendorId) window.location.href = '/vendor/mobile';
      }
    } catch {}
  }, []);

  const handleValidateCode = async () => {
    if (!code.trim()) { setError('Please enter your vendor code'); return; }
    try {
      setLoading(true); setError('');
      const res = await fetch(`${API}/api/signup/validate-code`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        if (data.data.type !== 'vendor') { setError('This is a couple code. Please use thedreamwedding.in/couple/login'); return; }
        setCodeData(data.data); setStep(2);
      } else { setError(data.error || 'Invalid or expired code'); }
    } catch { setError('Network error.'); } finally { setLoading(false); }
  };

  const handleGoToPassword = () => {
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
      const res = await fetch(`${API}/api/signup/complete`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim(), name: name.trim(), phone, email: email.trim(),
          instagram: instagram.trim(), password, code_type: codeData?.type,
          code_id: codeData?.code_id, tier: codeData?.tier,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        localStorage.setItem('vendor_web_session', JSON.stringify({
          vendorId: data.data.id, vendorName: data.data.name,
          category: data.data.category, city: data.data.city,
          tier: data.data.tier, trialEnd: data.data.trial_end,
        }));
        window.location.href = '/vendor/mobile';
      } else { setError(data.error || 'Signup failed'); }
    } catch { setError('Network error.'); } finally { setLoading(false); }
  };

  const handleLogin = async () => {
    if (!loginId.trim()) { setError('Enter your email or phone number'); return; }
    if (!loginPass) { setError('Enter your password'); return; }
    try {
      setLoading(true); setError('');
      const res = await fetch(`${API}/api/signup/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: loginId.trim(), password: loginPass }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        if (data.data.type === 'couple') {
          setError('This is a couple account. Please use thedreamwedding.in/couple/login'); return;
        }
        localStorage.setItem('vendor_web_session', JSON.stringify({
          vendorId: data.data.id, vendorName: data.data.name,
          category: data.data.category, city: data.data.city,
          tier: data.data.tier, teamRole: data.data.team_role || 'owner',
          teamMemberName: data.data.team_member_name || null,
          isTeamMember: data.data.is_team_member || false,
        }));
        window.location.href = '/vendor/mobile';
      } else { setError(data.error || 'Login failed'); }
    } catch { setError('Network error.'); } finally { setLoading(false); }
  };

  // ── Styles ──────────────────────────────────────────────────────────────
  const input: React.CSSProperties = {
    width: '100%', padding: '14px 16px', fontSize: '15px',
    fontFamily: 'DM Sans, sans-serif',
    border: `1px solid ${C.border}`, borderRadius: '10px',
    backgroundColor: C.ivory, color: C.dark, outline: 'none',
    boxSizing: 'border-box',
  };
  const label: React.CSSProperties = {
    fontSize: '11px', fontWeight: 500, color: C.muted,
    display: 'block', marginBottom: '6px', letterSpacing: '0.3px',
  };
  const primaryBtn = (enabled: boolean): React.CSSProperties => ({
    width: '100%',
    background: enabled ? C.dark : C.border,
    color: enabled ? C.gold : C.light,
    fontSize: '14px', fontWeight: 600,
    fontFamily: 'DM Sans, sans-serif',
    padding: '14px 24px', borderRadius: '10px', border: 'none',
    cursor: enabled ? 'pointer' : 'not-allowed',
    marginTop: '4px',
  });
  const backBtn: React.CSSProperties = {
    width: '100%', background: 'transparent', color: C.muted,
    fontSize: '13px', fontFamily: 'DM Sans, sans-serif',
    padding: '12px', borderRadius: '10px',
    border: `1px solid ${C.border}`, cursor: 'pointer', marginTop: '10px',
  };

  const focusIn = (e: any) => {
    e.target.style.border = `1.5px solid ${C.gold}`;
    e.target.style.boxShadow = `0 0 0 3px rgba(201,168,76,0.12)`;
  };
  const focusOut = (e: any) => {
    e.target.style.border = `1px solid ${C.border}`;
    e.target.style.boxShadow = 'none';
  };

  // ── Render Signup Steps ─────────────────────────────────────────────────
  const renderSignupStep1 = () => (
    <>
      <label style={label}>VENDOR CODE</label>
      <input
        type="text" style={input}
        placeholder="e.g. ABKMNQ"
        value={code}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value.toUpperCase())}
        onFocus={focusIn} onBlur={focusOut}
        maxLength={10}
      />
      <div style={{ fontSize: '11px', color: C.muted, marginTop: '8px', marginBottom: '20px' }}>
        Enter the code you received from The Dream Wedding team.
      </div>
      <button
        style={primaryBtn(!!code.trim() && !loading)}
        onClick={handleValidateCode}
        disabled={!code.trim() || loading}
      >
        {loading ? 'Checking…' : 'Continue'}
      </button>
    </>
  );

  const renderSignupStep2 = () => (
    <>
      {codeData && (
        <div style={{
          background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
          borderRadius: '10px', padding: '12px 14px', marginBottom: '18px',
        }}>
          <div style={{ fontSize: '10px', color: C.gold, fontWeight: 600, letterSpacing: '1.2px' }}>
            {(codeData.tier || 'ESSENTIAL').toUpperCase()} VENDOR
          </div>
          <div style={{ fontSize: '13px', color: C.dark, marginTop: '3px' }}>
            Founding vendor — price locked forever.
          </div>
        </div>
      )}

      <label style={label}>BUSINESS NAME (OPTIONAL)</label>
      <input type="text" style={input} placeholder="e.g. Dreamy Frames" value={name}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} onFocus={focusIn} onBlur={focusOut} />

      <div style={{ height: '14px' }} />
      <label style={label}>PHONE NUMBER</label>
      <input type="tel" style={input} placeholder="10-digit phone" value={phone}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
        onFocus={focusIn} onBlur={focusOut} />
      <div style={{ fontSize: '11px', color: C.muted, marginTop: '4px' }}>Login ID.</div>

      <div style={{ height: '14px' }} />
      <label style={label}>EMAIL</label>
      <input type="email" style={input} placeholder="you@example.com" value={email}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} onFocus={focusIn} onBlur={focusOut} />
      <div style={{ fontSize: '11px', color: C.muted, marginTop: '4px' }}>Alternative login ID.</div>

      <div style={{ height: '14px' }} />
      <label style={label}>INSTAGRAM HANDLE</label>
      <input type="text" style={input} placeholder="@yourbusiness" value={instagram}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInstagram(e.target.value)} onFocus={focusIn} onBlur={focusOut} />

      <div style={{ height: '22px' }} />
      <button style={primaryBtn(!loading)} onClick={handleGoToPassword} disabled={loading}>
        Continue
      </button>
      <button style={backBtn} onClick={() => { setStep(1); setError(''); }}>← Back</button>
    </>
  );

  const renderSignupStep3 = () => (
    <>
      <label style={label}>CREATE PASSWORD</label>
      <input type="password" style={input} placeholder="Minimum 6 characters" value={password}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} onFocus={focusIn} onBlur={focusOut} />

      <div style={{ height: '14px' }} />
      <label style={label}>CONFIRM PASSWORD</label>
      <input type="password" style={input} placeholder="Retype password" value={confirmPassword}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)} onFocus={focusIn} onBlur={focusOut} />

      <div style={{ height: '22px' }} />
      <button
        style={primaryBtn(password.length >= 6 && password === confirmPassword && !loading)}
        onClick={handleCompleteSignup}
        disabled={password.length < 6 || password !== confirmPassword || loading}
      >
        {loading ? 'Creating account…' : 'Create account'}
      </button>
      <button style={backBtn} onClick={() => { setStep(2); setError(''); }}>← Back</button>
    </>
  );

  const renderLogin = () => (
    <>
      <label style={label}>EMAIL OR PHONE</label>
      <input type="text" style={input} placeholder="you@example.com or 9876543210"
        value={loginId} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLoginId(e.target.value)}
        onFocus={focusIn} onBlur={focusOut} />

      <div style={{ height: '14px' }} />
      <label style={label}>PASSWORD</label>
      <input type="password" style={input} placeholder="Your password"
        value={loginPass} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLoginPass(e.target.value)}
        onFocus={focusIn} onBlur={focusOut}
        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') handleLogin(); }} />

      <div style={{ height: '22px' }} />
      <button
        style={primaryBtn(!!loginId.trim() && !!loginPass && !loading)}
        onClick={handleLogin}
        disabled={!loginId.trim() || !loginPass || loading}
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </>
  );

  // ── Main Render ─────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100dvh',
      background: C.cream,
      fontFamily: 'DM Sans, sans-serif',
      color: C.dark,
      padding: 'calc(env(safe-area-inset-top) + 24px) 20px calc(env(safe-area-inset-bottom) + 24px)',
      maxWidth: '480px', margin: '0 auto',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* ── Brand Header ── */}
      <div style={{ textAlign: 'center', marginTop: '28px', marginBottom: '36px' }}>
        <div style={{
          fontSize: '11px', letterSpacing: '4px', color: C.gold,
          fontWeight: 500, marginBottom: '12px',
        }}>THE DREAM WEDDING</div>
        <div style={{
          fontSize: '22px', color: C.dark,
          fontFamily: 'Playfair Display, serif',
          lineHeight: 1.3,
        }}>
          {mode === 'signup' ? 'Welcome, Vendor' : 'Welcome back'}
        </div>
        <div style={{
          fontSize: '13px', color: C.muted, fontWeight: 300,
          marginTop: '6px', lineHeight: 1.5,
        }}>
          {mode === 'signup' && step === 1 && 'Enter your invite code to begin'}
          {mode === 'signup' && step === 2 && 'Tell us about your business'}
          {mode === 'signup' && step === 3 && 'Set a password to secure your account'}
          {mode === 'login' && 'Sign in to your account'}
        </div>
      </div>

      {/* ── Mode Toggle (hidden during multi-step signup) ── */}
      {!(mode === 'signup' && step > 1) && (
        <div style={{
          display: 'flex', gap: '4px',
          background: C.ivory, border: `1px solid ${C.border}`,
          borderRadius: '12px', padding: '4px', marginBottom: '28px',
        }}>
          <button
            onClick={() => { setMode('signup'); setStep(1); setError(''); }}
            style={{
              flex: 1, background: mode === 'signup' ? C.dark : 'transparent',
              color: mode === 'signup' ? C.gold : C.muted,
              border: 'none', borderRadius: '9px',
              padding: '10px', fontSize: '12px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.3px',
            }}
          >Sign Up</button>
          <button
            onClick={() => { setMode('login'); setError(''); }}
            style={{
              flex: 1, background: mode === 'login' ? C.dark : 'transparent',
              color: mode === 'login' ? C.gold : C.muted,
              border: 'none', borderRadius: '9px',
              padding: '10px', fontSize: '12px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.3px',
            }}
          >Sign In</button>
        </div>
      )}

      {/* ── Step Indicator ── */}
      {mode === 'signup' && (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '24px', justifyContent: 'center' }}>
          {[1, 2, 3].map(n => (
            <div
              key={n}
              style={{
                width: step === n ? '28px' : '8px',
                height: '4px', borderRadius: '2px',
                background: step >= n ? C.gold : C.border,
                transition: 'width 0.2s ease',
              }}
            />
          ))}
        </div>
      )}

      {/* ── Form Card ── */}
      <div style={{
        background: C.ivory,
        border: `1px solid ${C.border}`,
        borderRadius: '16px',
        padding: '24px 20px',
      }}>
        {mode === 'signup' && step === 1 && renderSignupStep1()}
        {mode === 'signup' && step === 2 && renderSignupStep2()}
        {mode === 'signup' && step === 3 && renderSignupStep3()}
        {mode === 'login' && renderLogin()}

        {error && (
          <div style={{
            background: '#FEF2F2', border: '1px solid #FECACA',
            borderRadius: '8px', padding: '10px 12px', marginTop: '14px',
            fontSize: '12px', color: C.red,
          }}>{error}</div>
        )}
      </div>

      {/* ── Footer: alt options ── */}
      <div style={{ marginTop: '28px', textAlign: 'center' }}>
        {mode === 'signup' && step === 1 && (
          <div style={{ fontSize: '12px', color: C.muted }}>
            Don&apos;t have a code?{' '}
            <a href="/" style={{ color: C.gold, textDecoration: 'none', fontWeight: 600 }}>
              Request access →
            </a>
          </div>
        )}
        <div style={{ marginTop: '14px', display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <a href="/couple/login" style={{ fontSize: '11px', color: C.light, textDecoration: 'none' }}>
            Planning a wedding?
          </a>
          <a href="/vendor/login" style={{ fontSize: '11px', color: C.light, textDecoration: 'none' }}>
            Open business portal
          </a>
        </div>
      </div>

      {/* ── Spacer so form never touches bottom edge ── */}
      <div style={{ flex: 1, minHeight: '20px' }} />
    </div>
  );
}
