'use client';
import { useState, useEffect } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

type Mode = 'entry' | 'signup' | 'login' | 'forgot';

export default function VendorLoginPage() {
  const [mode, setMode] = useState<Mode>('entry');
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [prefillCode, setPrefillCode] = useState<string | null>(null);

  // Route post-login to the right surface
  const goToVendorHome = () => {
    const mob = typeof window !== 'undefined' && window.innerWidth < 768;
    window.location.href = mob ? '/vendor/mobile' : '/vendor/dashboard';
  };

  useEffect(() => {
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    try {
      const s = localStorage.getItem('vendor_web_session');
      if (s) {
        const p = JSON.parse(s);
        if (p.vendorId) goToVendorHome();
      }
    } catch {}
    // Read ?code=XXXX from URL — if present, jump straight to signup with code prefilled
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code && code.trim().length > 0) {
        setPrefillCode(code.trim().toUpperCase());
        setMode('signup');
      }
    } catch {}
    return () => window.removeEventListener('resize', check);
  }, []);

  if (!mounted) return null;

  // ──────────────────────────────────────────────────────────
  // LAYOUT WRAPPER
  // ──────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      {!isMobile && (
        <div style={{
          width: '55%', background: '#0F1117',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          padding: '48px 56px',
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '2.5px', color: '#C9A84C', textTransform: 'uppercase' }}>
              THE DREAM WEDDING
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.5px', marginTop: 4 }}>
              Vendor Portal
            </div>
          </div>
          <div>
            <div style={{ fontSize: 38, fontWeight: 300, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.8px', marginBottom: 20 }}>
              Your business, in your pocket.
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.8, maxWidth: 340 }}>
              Clients, calendar, enquiries, payments — everything you need to run your wedding business. Without the bulk.
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 24 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.3px' }}>
              vendor.thedreamwedding.in
            </div>
          </div>
        </div>
      )}

      <div style={{
        width: isMobile ? '100%' : '45%',
        background: isMobile ? '#0F1117' : '#fff',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: isMobile ? '32px 24px' : '56px 64px',
        minHeight: isMobile ? '100vh' : 'auto',
        color: isMobile ? '#fff' : '#0F1117',
      }}>
        {isMobile && (
          <div style={{ marginBottom: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '2.5px', color: '#C9A84C', textTransform: 'uppercase' }}>
              THE DREAM WEDDING
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px', marginTop: 4 }}>
              Vendor Portal
            </div>
          </div>
        )}

        <div style={{ width: '100%', maxWidth: 380 }}>
          {mode === 'entry' && <EntryScreen onSignup={() => setMode('signup')} onLogin={() => setMode('login')} isMobile={isMobile} />}
          {mode === 'signup' && <SignupFlow onBack={() => setMode('entry')} onComplete={goToVendorHome} isMobile={isMobile} prefillCode={prefillCode} />}
          {mode === 'login' && <LoginFlow onBack={() => setMode('entry')} onForgot={() => setMode('forgot')} onComplete={goToVendorHome} isMobile={isMobile} />}
          {mode === 'forgot' && <ForgotFlow onBack={() => setMode('login')} onDone={() => setMode('login')} isMobile={isMobile} />}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLE HELPERS
// ─────────────────────────────────────────────────────────────

function useStyles(isMobile: boolean) {
  const textColor = isMobile ? '#fff' : '#0F1117';
  const mutedColor = isMobile ? 'rgba(255,255,255,0.5)' : '#6B7280';
  const inputBg = isMobile ? 'rgba(255,255,255,0.05)' : '#FAFAFA';
  const inputBorder = isMobile ? 'rgba(255,255,255,0.1)' : '#E5E7EB';

  return {
    textColor,
    mutedColor,
    input: {
      width: '100%', padding: '14px 18px', fontSize: 14,
      fontFamily: 'Inter, sans-serif',
      border: `1.5px solid ${inputBorder}`, borderRadius: 8,
      backgroundColor: inputBg, color: textColor, outline: 'none',
      boxSizing: 'border-box' as const, marginBottom: 12,
    },
    inputWithPrefix: {
      width: '100%', padding: '14px 18px 14px 52px', fontSize: 14,
      fontFamily: 'Inter, sans-serif',
      border: `1.5px solid ${inputBorder}`, borderRadius: 8,
      backgroundColor: inputBg, color: textColor, outline: 'none',
      boxSizing: 'border-box' as const, marginBottom: 12,
    },
    label: {
      fontSize: 11, fontWeight: 500, color: mutedColor,
      letterSpacing: '0.8px', textTransform: 'uppercase' as const,
      display: 'block', marginBottom: 8,
    },
    primaryBtn: (active: boolean): React.CSSProperties => ({
      width: '100%', padding: 15,
      background: active ? '#2C2420' : 'rgba(60,50,45,0.4)',
      color: '#C9A84C',
      fontSize: 11, fontWeight: 500, letterSpacing: '2px', textTransform: 'uppercase' as const,
      fontFamily: 'Inter, sans-serif',
      border: 'none', cursor: active ? 'pointer' : 'default',
      transition: 'all 0.3s ease', marginTop: 4,
    }),
    secondaryBtn: {
      background: 'none', border: 'none', cursor: 'pointer',
      color: isMobile ? 'rgba(255,255,255,0.5)' : '#6B7280',
      fontSize: 12, fontWeight: 400,
      fontFamily: 'Inter, sans-serif',
      textDecoration: 'underline',
      padding: '8px 0',
    } as React.CSSProperties,
    headline: {
      fontFamily: 'Inter, sans-serif', fontSize: 22, fontWeight: 500,
      color: textColor, marginBottom: 8,
    },
    subhead: {
      fontSize: 13, color: mutedColor, marginBottom: 24, lineHeight: 1.6,
    },
    error: {
      fontSize: 12, color: '#DC2626', marginTop: -6, marginBottom: 12,
      fontFamily: 'Inter, sans-serif',
    },
  };
}

function PhoneInput({ value, onChange, styles, placeholder, disabled }: {
  value: string; onChange: (v: string) => void; styles: any; placeholder?: string; disabled?: boolean;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <span style={{
        position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)',
        fontSize: 14, color: styles.mutedColor, fontFamily: 'Inter, sans-serif',
      }}>+91</span>
      <input
        type="tel" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder || '98765 43210'}
        autoComplete="tel"
        disabled={disabled}
        style={styles.inputWithPrefix}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ENTRY (signup vs login choice)
// ─────────────────────────────────────────────────────────────

function EntryScreen({ onSignup, onLogin, isMobile }: {
  onSignup: () => void; onLogin: () => void; isMobile: boolean;
}) {
  const s = useStyles(isMobile);
  return (
    <div>
      <div style={s.headline}>Welcome.</div>
      <div style={s.subhead}>
        Built for vendors who'd rather run their business than manage their business.
      </div>

      <button onClick={onSignup} style={s.primaryBtn(true)}>New here — sign up</button>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        margin: '24px 0 16px',
      }}>
        <div style={{ flex: 1, height: 1, background: isMobile ? 'rgba(255,255,255,0.1)' : '#E5E7EB' }} />
        <span style={{
          fontSize: 10, color: s.mutedColor, fontWeight: 500,
          letterSpacing: 2, textTransform: 'uppercase' as const,
        }}>Or</span>
        <div style={{ flex: 1, height: 1, background: isMobile ? 'rgba(255,255,255,0.1)' : '#E5E7EB' }} />
      </div>

      <button onClick={onLogin} style={{
        ...s.primaryBtn(true),
        background: 'transparent',
        border: `1.5px solid ${isMobile ? 'rgba(255,255,255,0.15)' : '#E5E7EB'}`,
        color: s.textColor,
      }}>Sign in to your account</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SIGNUP — 5 steps
// 1. Code → 2. Business details → 3. Phone → 4. OTP → 5. Password
// ─────────────────────────────────────────────────────────────

const VENDOR_CATEGORIES = [
  'Photography', 'Videography', 'Makeup Artist', 'Mehendi Artist',
  'Venue', 'Catering', 'Decoration', 'Wedding Planner',
  'DJ / Music', 'Choreography', 'Invitation Designer', 'Couture',
  'Jewellery', 'Priest / Pandit', 'Transportation', 'Other',
];

function SignupFlow({ onBack, onComplete, isMobile, prefillCode }: {
  onBack: () => void; onComplete: () => void; isMobile: boolean;
  prefillCode?: string | null;
}) {
  const s = useStyles(isMobile);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [code, setCode] = useState(prefillCode || '');
  const [codeData, setCodeData] = useState<{ tier: string } | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [instagram, setInstagram] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sessionInfo, setSessionInfo] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // If a prefill code arrived via URL, auto-validate and jump to step 2
  useEffect(() => {
    if (!prefillCode) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/api/vendor-codes/validate`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: prefillCode.trim().toUpperCase() }),
        });
        const d = await res.json();
        if (cancelled) return;
        if (d.success) {
          setCodeData(d.data);
          setStep(2);
        } else {
          // invalid or consumed — stay on step 1 with error
          setError(d.error || 'Invalid code');
        }
      } catch {
        if (!cancelled) setError('Network error. Enter your code manually.');
      }
    })();
    return () => { cancelled = true; };
  }, [prefillCode]);

  // Step 1 — validate code
  const validateCode = async () => {
    if (!code.trim()) { setError('Enter your invite code'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/vendor-codes/validate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const d = await res.json();
      if (!d.success) { setError(d.error || 'Invalid code'); setLoading(false); return; }
      setCodeData(d.data);
      setStep(2);
    } catch { setError('Network error. Try again.'); }
    setLoading(false);
  };

  // Step 2 → 3 — business details
  const goToPhone = () => {
    if (!name.trim()) { setError('Business name required'); return; }
    if (!category) { setError('Pick a category'); return; }
    if (!city.trim()) { setError('City required'); return; }
    setError('');
    setStep(3);
  };

  // Step 3 — send OTP
  const sendOtp = async () => {
    const clean = phone.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) { setError('Enter a valid 10-digit phone'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/auth/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: clean }),
      });
      const d = await res.json();
      if (!d.success) { setError(d.error || 'Could not send OTP'); setLoading(false); return; }
      setSessionInfo(d.sessionInfo || '');
      setOtpSent(true);
      setStep(4);
    } catch { setError('Network error. Try again.'); }
    setLoading(false);
  };

  // Step 4 — verify OTP
  const verifyOtp = async () => {
    if (!otp || otp.length < 4) { setError('Enter the OTP'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/auth/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionInfo, code: otp }),
      });
      const d = await res.json();
      if (!d.success) { setError(d.error || 'Invalid OTP'); setLoading(false); return; }
      setStep(5);
    } catch { setError('Network error. Try again.'); }
    setLoading(false);
  };

  // Step 5 — set password + finalize
  const completeSignup = async () => {
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== passwordConfirm) { setError('Passwords do not match'); return; }
    setLoading(true); setError('');
    const clean = phone.replace(/\D/g, '').slice(-10);
    try {
      const res = await fetch(`${API}/api/vendor/onboard`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: '+91' + clean,
          email: email.trim() || null,
          category,
          city: city.trim(),
          instagram: instagram.trim() || null,
          access_code: code.trim().toUpperCase(),
          password,
        }),
      });
      const d = await res.json();
      if (!d.success) { setError(d.error || 'Could not create account'); setLoading(false); return; }
      // Save session
      localStorage.setItem('vendor_web_session', JSON.stringify({
        vendorId: d.data.id,
        vendorName: d.data.name,
        category,
        city: city.trim(),
        tier: d.data.tier || codeData?.tier || 'essential',
      }));
      onComplete();
    } catch { setError('Network error. Try again.'); setLoading(false); }
  };

  return (
    <div>
      <div style={{ fontSize: 10, color: s.mutedColor, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 500, marginBottom: 8 }}>
        Step {step} of 5
      </div>

      {step === 1 && (
        <>
          <div style={s.headline}>Your invite.</div>
          <div style={s.subhead}>Enter the code you received from The Dream Wedding team.</div>
          <label style={s.label}>Invite code</label>
          <input type="text" value={code}
            onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && !loading && validateCode()}
            placeholder="ABCD1234" style={s.input} autoFocus />
          {error && <div style={s.error}>{error}</div>}
          <button onClick={validateCode} disabled={loading || !code.trim()} style={s.primaryBtn(!loading && !!code.trim())}>
            {loading ? 'Verifying…' : 'Continue'}
          </button>
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button onClick={onBack} style={s.secondaryBtn}>Back</button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div style={s.headline}>About your business.</div>
          <div style={s.subhead}>Tell us the essentials — you can change any of this later.</div>

          <label style={s.label}>Business name</label>
          <input type="text" value={name} onChange={e => { setName(e.target.value); setError(''); }}
            placeholder="e.g. Makeup by Swati Roy" style={s.input} autoFocus />

          <label style={s.label}>Category</label>
          <select value={category} onChange={e => { setCategory(e.target.value); setError(''); }} style={s.input}>
            <option value="">Choose a category</option>
            {VENDOR_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <label style={s.label}>City</label>
          <input type="text" value={city} onChange={e => { setCity(e.target.value); setError(''); }}
            placeholder="e.g. Delhi" style={s.input} />

          <label style={s.label}>Email (optional)</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com" style={s.input} />

          <label style={s.label}>Instagram (optional)</label>
          <input type="text" value={instagram} onChange={e => setInstagram(e.target.value)}
            placeholder="@yourhandle" style={s.input} />

          {error && <div style={s.error}>{error}</div>}
          <button onClick={goToPhone} style={s.primaryBtn(true)}>Continue</button>
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button onClick={() => { setStep(1); setError(''); }} style={s.secondaryBtn}>Back</button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div style={s.headline}>Your phone number.</div>
          <div style={s.subhead}>We'll send a one-time code to verify it's you. This will be your login.</div>
          <label style={s.label}>Phone</label>
          <PhoneInput value={phone} onChange={v => { setPhone(v); setError(''); }} styles={s} />
          {error && <div style={s.error}>{error}</div>}
          <button onClick={sendOtp} disabled={loading} style={s.primaryBtn(!loading)}>
            {loading ? 'Sending…' : 'Send code'}
          </button>
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button onClick={() => { setStep(2); setError(''); }} style={s.secondaryBtn}>Back</button>
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <div style={s.headline}>Enter the code.</div>
          <div style={s.subhead}>We sent a 6-digit code to +91 {phone.replace(/\D/g, '').slice(-10)}.</div>
          <label style={s.label}>6-digit code</label>
          <input type="tel" value={otp} onChange={e => { setOtp(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && !loading && verifyOtp()}
            placeholder="123456" style={s.input} autoFocus />
          {error && <div style={s.error}>{error}</div>}
          <button onClick={verifyOtp} disabled={loading} style={s.primaryBtn(!loading)}>
            {loading ? 'Verifying…' : 'Continue'}
          </button>
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button onClick={() => { setOtpSent(false); setOtp(''); setError(''); setStep(3); }} style={s.secondaryBtn}>
              Didn't get it? Try again
            </button>
          </div>
        </>
      )}

      {step === 5 && (
        <>
          <div style={s.headline}>Set a password.</div>
          <div style={s.subhead}>You'll use this to sign in from any device. At least 8 characters.</div>

          <label style={s.label}>Password</label>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <input type={showPassword ? 'text' : 'password'} value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              placeholder="At least 8 characters" autoComplete="new-password"
              style={{ ...s.input, paddingRight: 60, marginBottom: 0 }} />
            <button type="button" onClick={() => setShowPassword(v => !v)}
              style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: s.mutedColor, fontSize: 11, fontWeight: 500,
              }}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          <label style={s.label}>Confirm password</label>
          <input type={showPassword ? 'text' : 'password'} value={passwordConfirm}
            onChange={e => { setPasswordConfirm(e.target.value); setError(''); }}
            placeholder="Type it again" autoComplete="new-password" style={s.input} />

          {error && <div style={s.error}>{error}</div>}
          <button onClick={completeSignup} disabled={loading} style={s.primaryBtn(!loading)}>
            {loading ? 'Setting up…' : 'Complete signup'}
          </button>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LOGIN — phone + password
// ─────────────────────────────────────────────────────────────

function LoginFlow({ onBack, onForgot, onComplete, isMobile }: {
  onBack: () => void; onForgot: () => void; onComplete: () => void; isMobile: boolean;
}) {
  const s = useStyles(isMobile);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    const clean = phone.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) { setError('Enter a valid 10-digit phone'); return; }
    if (!password) { setError('Enter your password'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/vendor/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '+91' + clean, password }),
      });
      const d = await res.json();
      if (!d.success) { setError(d.error || 'Could not sign in'); setLoading(false); return; }
      localStorage.setItem('vendor_web_session', JSON.stringify({
        vendorId: d.data.id,
        vendorName: d.data.name,
        category: d.data.category,
        city: d.data.city,
        tier: d.data.tier,
      }));
      onComplete();
    } catch { setError('Network error. Try again.'); setLoading(false); }
  };

  return (
    <div>
      <div style={s.headline}>Welcome back.</div>
      <div style={s.subhead}>Sign in with the phone you used to register.</div>

      <label style={s.label}>Phone</label>
      <PhoneInput value={phone} onChange={v => { setPhone(v); setError(''); }} styles={s} />

      <label style={s.label}>Password</label>
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <input type={showPassword ? 'text' : 'password'} value={password}
          onChange={e => { setPassword(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && !loading && handleLogin()}
          placeholder="Your password" autoComplete="current-password"
          style={{ ...s.input, paddingRight: 60, marginBottom: 0 }} />
        <button type="button" onClick={() => setShowPassword(v => !v)}
          style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: s.mutedColor, fontSize: 11, fontWeight: 500,
          }}>
          {showPassword ? 'Hide' : 'Show'}
        </button>
      </div>

      {error && <div style={s.error}>{error}</div>}
      <button onClick={handleLogin} disabled={loading} style={s.primaryBtn(!loading)}>
        {loading ? 'Signing in…' : 'Sign in'}
      </button>

      <div style={{ textAlign: 'center', marginTop: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button onClick={onForgot} style={s.secondaryBtn}>Forgot password?</button>
        <button onClick={onBack} style={s.secondaryBtn}>Back</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FORGOT PASSWORD — phone → OTP → new password
// ─────────────────────────────────────────────────────────────

function ForgotFlow({ onBack, onDone, isMobile }: {
  onBack: () => void; onDone: () => void; isMobile: boolean;
}) {
  const s = useStyles(isMobile);
  const [step, setStep] = useState<'phone' | 'otp' | 'password' | 'done'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sessionInfo, setSessionInfo] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sendOtp = async () => {
    const clean = phone.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) { setError('Enter a valid 10-digit phone'); return; }
    setLoading(true); setError('');
    try {
      await fetch(`${API}/api/vendor/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '+91' + clean }),
      });
      const res = await fetch(`${API}/api/auth/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: clean }),
      });
      const d = await res.json();
      if (!d.success) { setError(d.error || 'Could not send OTP'); setLoading(false); return; }
      setSessionInfo(d.sessionInfo || '');
      setStep('otp');
    } catch { setError('Network error. Try again.'); }
    setLoading(false);
  };

  const verifyOtp = async () => {
    if (!otp || otp.length < 4) { setError('Enter the OTP'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/auth/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionInfo, code: otp }),
      });
      const d = await res.json();
      if (!d.success) { setError(d.error || 'Invalid OTP'); setLoading(false); return; }
      setStep('password');
    } catch { setError('Network error. Try again.'); }
    setLoading(false);
  };

  const resetPassword = async () => {
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true); setError('');
    const clean = phone.replace(/\D/g, '').slice(-10);
    try {
      const res = await fetch(`${API}/api/vendor/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '+91' + clean,
          new_password: newPassword,
          otp_verified: true,
        }),
      });
      const d = await res.json();
      if (!d.success) { setError(d.error || 'Could not reset password'); setLoading(false); return; }
      setStep('done');
    } catch { setError('Network error. Try again.'); setLoading(false); }
  };

  return (
    <div>
      <div style={s.headline}>Reset password.</div>

      {step === 'phone' && (
        <>
          <div style={s.subhead}>Enter your phone number. We'll send you a code.</div>
          <label style={s.label}>Phone</label>
          <PhoneInput value={phone} onChange={v => { setPhone(v); setError(''); }} styles={s} />
          {error && <div style={s.error}>{error}</div>}
          <button onClick={sendOtp} disabled={loading} style={s.primaryBtn(!loading)}>
            {loading ? 'Sending…' : 'Send code'}
          </button>
        </>
      )}

      {step === 'otp' && (
        <>
          <div style={s.subhead}>We sent a 6-digit code to +91 {phone.replace(/\D/g, '').slice(-10)}.</div>
          <label style={s.label}>6-digit code</label>
          <input type="tel" value={otp} onChange={e => { setOtp(e.target.value); setError(''); }}
            placeholder="123456" style={s.input} autoFocus />
          {error && <div style={s.error}>{error}</div>}
          <button onClick={verifyOtp} disabled={loading} style={s.primaryBtn(!loading)}>
            {loading ? 'Verifying…' : 'Verify'}
          </button>
        </>
      )}

      {step === 'password' && (
        <>
          <div style={s.subhead}>Set a new password. At least 8 characters.</div>
          <label style={s.label}>New password</label>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <input type={showPassword ? 'text' : 'password'} value={newPassword}
              onChange={e => { setNewPassword(e.target.value); setError(''); }}
              autoComplete="new-password"
              style={{ ...s.input, paddingRight: 60, marginBottom: 0 }} />
            <button type="button" onClick={() => setShowPassword(v => !v)}
              style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: s.mutedColor, fontSize: 11, fontWeight: 500,
              }}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <label style={s.label}>Confirm password</label>
          <input type={showPassword ? 'text' : 'password'} value={confirmPassword}
            onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
            autoComplete="new-password" style={s.input} />
          {error && <div style={s.error}>{error}</div>}
          <button onClick={resetPassword} disabled={loading} style={s.primaryBtn(!loading)}>
            {loading ? 'Saving…' : 'Reset password'}
          </button>
        </>
      )}

      {step === 'done' && (
        <>
          <div style={s.subhead}>Password reset. You can sign in with your new password.</div>
          <button onClick={onDone} style={s.primaryBtn(true)}>Back to sign in</button>
        </>
      )}

      {step !== 'done' && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button onClick={onBack} style={s.secondaryBtn}>Back</button>
        </div>
      )}
    </div>
  );
}
