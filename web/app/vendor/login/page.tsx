'use client';
import { useState, useEffect, useRef } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

// ── Net-a-Porter palette (matches mobile PWA exactly) ──
const C = {
  cream: '#FAF6F0',
  ivory: '#FFFFFF',
  pearl: '#FBF8F2',
  champagne: '#FFFDF7',
  goldSoft: '#FFF8EC',
  goldMist: '#FFF3DB',
  goldBorder: '#E8D9B5',
  border: '#EDE8E0',
  borderSoft: '#F2EDE4',
  dark: '#2C2420',
  gold: '#C9A84C',
  goldDeep: '#B8963A',
  muted: '#8C7B6E',
  light: '#B8ADA4',
  red: '#C65757',
  redSoft: '#FBEEEE',
  redBorder: '#F0CFCF',
};

type Mode = 'entry' | 'signup' | 'login' | 'forgot';

export default function VendorLoginPage() {
  const [mode, setMode] = useState<Mode>('entry');
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [prefillCode, setPrefillCode] = useState<string | null>(null);

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

  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      fontFamily: "'DM Sans', sans-serif",
      background: C.cream,
    }}>
      {!isMobile && (
        <div style={{
          width: '50%',
          background: `linear-gradient(135deg, ${C.champagne} 0%, ${C.goldSoft} 100%)`,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          padding: '56px 64px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -100, right: -100,
            width: 300, height: 300, borderRadius: '50%',
            background: `radial-gradient(circle, ${C.goldMist} 0%, transparent 70%)`,
            opacity: 0.6,
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, letterSpacing: '3px',
              color: C.goldDeep, textTransform: 'uppercase',
              fontFamily: "'DM Sans', sans-serif",
            }}>
              The Dream Wedding
            </div>
            <div style={{
              fontSize: 10, color: C.muted, letterSpacing: '0.5px',
              marginTop: 4, fontFamily: "'DM Sans', sans-serif",
            }}>
              Vendor Portal
            </div>
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 44, fontWeight: 400, color: C.dark,
              lineHeight: 1.15, letterSpacing: '-0.5px',
              margin: 0, marginBottom: 18,
            }}>
              Your business,<br />in your pocket.
            </h1>
            <p style={{
              fontSize: 14, color: C.muted, lineHeight: 1.7,
              maxWidth: 360, margin: 0,
              fontFamily: "'DM Sans', sans-serif", fontWeight: 300,
            }}>
              Clients, calendar, enquiries, payments — everything you need to run your wedding business. Beautifully arranged.
            </p>
          </div>

          <div style={{
            position: 'relative', zIndex: 1,
            borderTop: `1px solid ${C.goldBorder}`, paddingTop: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{
              fontSize: 11, color: C.muted, letterSpacing: '0.3px',
              fontFamily: "'DM Sans', sans-serif",
            }}>
              vendor.thedreamwedding.in
            </div>
            <div style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 11, color: C.goldDeep,
              fontStyle: 'italic',
            }}>
              est. 2026
            </div>
          </div>
        </div>
      )}

      <div style={{
        width: isMobile ? '100%' : '50%',
        background: C.cream,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: isMobile ? '40px 24px max(40px, env(safe-area-inset-bottom))' : '64px',
        minHeight: isMobile ? '100vh' : 'auto',
      }}>
        {isMobile && (
          <div style={{ marginBottom: 36, textAlign: 'center' }}>
            <div style={{
              fontSize: 11, fontWeight: 600, letterSpacing: '3px',
              color: C.goldDeep, textTransform: 'uppercase',
              marginBottom: 4,
            }}>
              The Dream Wedding
            </div>
            <div style={{
              fontSize: 10, color: C.muted, letterSpacing: '0.5px',
            }}>
              Vendor Portal
            </div>
          </div>
        )}

        <div style={{ width: '100%', maxWidth: 380 }}>
          {mode === 'entry' && <EntryScreen onSignup={() => setMode('signup')} onLogin={() => setMode('login')} />}
          {mode === 'signup' && <SignupFlow onBack={() => setMode('entry')} onComplete={goToVendorHome} prefillCode={prefillCode} />}
          {mode === 'login' && <LoginFlow onBack={() => setMode('entry')} onForgot={() => setMode('forgot')} onComplete={goToVendorHome} />}
          {mode === 'forgot' && <ForgotFlow onBack={() => setMode('login')} onDone={() => setMode('login')} />}
        </div>
      </div>
    </div>
  );
}

function FloatingField({
  label, value, onChange, type = 'text', required, prefix,
  inputMode, autoComplete, autoFocus, maxLength, helper, error,
  onKeyDown, suffix, disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  prefix?: string;
  inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email';
  autoComplete?: string;
  autoFocus?: boolean;
  maxLength?: number;
  helper?: string;
  error?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  suffix?: React.ReactNode;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const hasValue = value.length > 0;
  const labelFloated = focused || hasValue;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        position: 'relative',
        background: disabled ? C.pearl : C.ivory,
        border: `1.5px solid ${error ? C.red : focused ? C.gold : C.border}`,
        borderRadius: 12,
        transition: 'border-color 0.2s ease',
      }}>
        <label style={{
          position: 'absolute',
          left: prefix && labelFloated ? 14 : prefix ? 50 : 14,
          top: labelFloated ? 6 : '50%',
          transform: labelFloated ? 'none' : 'translateY(-50%)',
          fontSize: labelFloated ? 9 : 13,
          fontWeight: labelFloated ? 600 : 400,
          letterSpacing: labelFloated ? '1.5px' : 'normal',
          textTransform: labelFloated ? 'uppercase' : 'none',
          color: focused ? C.goldDeep : C.muted,
          fontFamily: "'DM Sans', sans-serif",
          pointerEvents: 'none',
          transition: 'all 0.2s ease',
          background: 'transparent',
        }}>
          {label}
          {required && <span style={{ color: C.red, marginLeft: 4 }}>*</span>}
        </label>

        {prefix && (
          <span style={{
            position: 'absolute',
            left: 14,
            top: labelFloated ? 26 : '50%',
            transform: labelFloated ? 'none' : 'translateY(-50%)',
            fontSize: 14,
            color: labelFloated ? C.dark : 'transparent',
            fontFamily: "'DM Sans', sans-serif",
            transition: 'all 0.2s ease',
            pointerEvents: 'none',
            fontWeight: 500,
          }}>
            {prefix}
          </span>
        )}

        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={onKeyDown}
          inputMode={inputMode}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          maxLength={maxLength}
          disabled={disabled}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none', outline: 'none',
            padding: prefix
              ? (labelFloated ? '24px 14px 10px 50px' : '20px 14px 16px 50px')
              : (labelFloated ? '24px 14px 10px 14px' : '20px 14px 16px 14px'),
            fontSize: 14,
            color: C.dark,
            fontFamily: "'DM Sans', sans-serif",
            boxSizing: 'border-box',
            transition: 'padding 0.2s ease',
          }}
        />

        {suffix && (
          <div style={{
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
          }}>
            {suffix}
          </div>
        )}
      </div>
      {helper && (
        <div style={{
          fontSize: 11, color: C.muted, marginTop: 6, paddingLeft: 4,
          fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5,
        }}>
          {helper}
        </div>
      )}
    </div>
  );
}

function OtpInput({ value, onChange, onComplete }: {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (idx: number, char: string) => {
    const digit = char.replace(/[^0-9]/g, '').slice(-1);
    const arr = value.split('');
    arr[idx] = digit;
    while (arr.length < 6) arr.push('');
    const next = arr.join('').slice(0, 6);
    onChange(next);
    if (digit && idx < 5) refs.current[idx + 1]?.focus();
    if (next.length === 6 && next.split('').every(c => /\d/.test(c))) {
      onComplete && onComplete(next);
    }
  };

  const handleKey = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && idx > 0) refs.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (pasted.length > 0) {
      onChange(pasted);
      const focusIdx = Math.min(pasted.length, 5);
      refs.current[focusIdx]?.focus();
      if (pasted.length === 6 && onComplete) onComplete(pasted);
    }
  };

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginBottom: 16 }}>
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          type="tel"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          onPaste={handlePaste}
          autoFocus={i === 0}
          style={{
            width: 46, height: 56,
            background: C.ivory,
            border: `1.5px solid ${value[i] ? C.gold : C.border}`,
            borderRadius: 10,
            textAlign: 'center',
            fontSize: 22,
            fontFamily: "'Playfair Display', serif",
            color: C.dark,
            outline: 'none',
            transition: 'border-color 0.2s ease',
            boxSizing: 'border-box',
          }}
          onFocus={e => e.target.style.borderColor = C.gold}
          onBlur={e => e.target.style.borderColor = value[i] ? C.gold : C.border}
        />
      ))}
    </div>
  );
}

function PrimaryButton({ children, onClick, disabled, loading }: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        width: '100%',
        padding: '15px 20px',
        background: (disabled || loading) ? C.border : C.dark,
        color: (disabled || loading) ? C.light : C.gold,
        border: 'none',
        borderRadius: 12,
        cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '2px',
        textTransform: 'uppercase',
        fontFamily: "'DM Sans', sans-serif",
        transition: 'all 0.2s ease',
      }}
    >
      {loading ? 'Please wait…' : children}
    </button>
  );
}

function SecondaryButton({ children, onClick }: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: '15px 20px',
        background: 'transparent',
        color: C.dark,
        border: `1.5px solid ${C.border}`,
        borderRadius: 12,
        cursor: 'pointer',
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '2px',
        textTransform: 'uppercase',
        fontFamily: "'DM Sans', sans-serif",
        transition: 'all 0.2s ease',
      }}
    >
      {children}
    </button>
  );
}

function TextLink({ children, onClick }: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: C.muted,
        fontSize: 12,
        fontWeight: 400,
        fontFamily: "'DM Sans', sans-serif",
        padding: '8px 4px',
        textDecoration: 'underline',
        textDecorationColor: C.borderSoft,
        textUnderlineOffset: 4,
      }}
    >
      {children}
    </button>
  );
}

function Headline({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontFamily: "'Playfair Display', serif",
      fontSize: 26, fontWeight: 400,
      color: C.dark, letterSpacing: '-0.3px',
      margin: 0, marginBottom: 8,
      lineHeight: 1.25,
    }}>
      {children}
    </h2>
  );
}

function Subhead({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 13, color: C.muted, lineHeight: 1.6,
      margin: 0, marginBottom: 24,
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {children}
    </p>
  );
}

function ErrorMsg({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: C.redSoft,
      border: `1px solid ${C.redBorder}`,
      borderRadius: 8,
      padding: '10px 12px',
      fontSize: 12, color: C.red,
      fontFamily: "'DM Sans', sans-serif",
      marginBottom: 14,
    }}>
      {children}
    </div>
  );
}

function Divider() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      margin: '24px 0',
    }}>
      <div style={{ flex: 1, height: 1, background: C.border }} />
      <span style={{
        fontSize: 9, color: C.muted, fontWeight: 600,
        letterSpacing: '2px', textTransform: 'uppercase',
        fontFamily: "'DM Sans', sans-serif",
      }}>Or</span>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );
}

function EntryScreen({ onSignup, onLogin }: {
  onSignup: () => void;
  onLogin: () => void;
}) {
  return (
    <div>
      <Headline>Welcome.</Headline>
      <Subhead>
        Built for vendors who'd rather run their business than manage their business.
      </Subhead>

      <PrimaryButton onClick={onSignup}>New here — Sign up</PrimaryButton>

      <Divider />

      <SecondaryButton onClick={onLogin}>Sign in to your account</SecondaryButton>
    </div>
  );
}

const VENDOR_CATEGORIES = [
  'Photography', 'Videography', 'Makeup Artist', 'Mehendi Artist',
  'Venue', 'Catering', 'Decoration', 'Wedding Planner',
  'DJ / Music', 'Choreography', 'Invitation Designer', 'Couture',
  'Jewellery', 'Priest / Pandit', 'Transportation', 'Other',
];

function SignupFlow({ onBack, onComplete, prefillCode }: {
  onBack: () => void;
  onComplete: () => void;
  prefillCode?: string | null;
}) {
  const [step, setStep] = useState(prefillCode ? 2 : 1);
  const [code, setCode] = useState(prefillCode || '');
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sessionInfo, setSessionInfo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tier, setTier] = useState<string | null>(null);

  const verifyCode = async () => {
    if (!code.trim()) { setError('Enter your invite code'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/vendor-codes/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const d = await res.json();
      if (!d.success) { setError(d.error || 'Invalid code'); setLoading(false); return; }
      setTier(d.tier);
      setStep(2);
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  const submitBusiness = () => {
    if (!businessName.trim()) { setError('Enter your business name'); return; }
    if (!category) { setError('Pick a category'); return; }
    if (!city.trim()) { setError('Enter your city'); return; }
    setError('');
    setStep(3);
  };

  const sendOtp = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 10) { setError('Enter a valid 10-digit phone number'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '+91' + cleaned }),
      });
      const d = await res.json();
      if (!d.success) { setError(d.error || 'Could not send OTP'); setLoading(false); return; }
      setSessionInfo(d.sessionInfo);
      setStep(4);
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  const verifyOtp = async (otpVal?: string) => {
    const codeVal = otpVal || otp;
    if (!codeVal || codeVal.length < 6) { setError('Enter the 6-digit code'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionInfo, code: codeVal }),
      });
      const d = await res.json();
      if (!d.success) { setError(d.error || 'Invalid code'); setLoading(false); return; }
      setStep(5);
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  const createAccount = async () => {
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true); setError('');
    try {
      const cleaned = phone.replace(/\D/g, '');
      const res = await fetch(`${API}/api/vendor-signup-v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          business_name: businessName.trim(),
          category, city: city.trim(),
          phone: '+91' + cleaned,
          password,
        }),
      });
      const d = await res.json();
      if (!d.success) { setError(d.error || 'Could not create account'); setLoading(false); return; }
      try {
        localStorage.setItem('vendor_web_session', JSON.stringify({
          vendorId: d.vendorId,
          vendorName: businessName.trim(),
          category, city: city.trim(),
          tier: d.tier || tier,
        }));
      } catch {}
      onComplete();
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div style={{
        display: 'flex', gap: 4, marginBottom: 28,
      }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i <= step ? C.gold : C.border,
            transition: 'background 0.3s ease',
          }} />
        ))}
      </div>

      {step === 1 && (
        <>
          <Headline>Your invite code.</Headline>
          <Subhead>Enter the code you received from The Dream Wedding.</Subhead>
          <FloatingField
            label="Invite code"
            required
            value={code}
            onChange={v => { setCode(v.toUpperCase()); setError(''); }}
            autoFocus
            onKeyDown={e => e.key === 'Enter' && !loading && verifyCode()}
          />
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <PrimaryButton onClick={verifyCode} loading={loading} disabled={!code.trim()}>Continue</PrimaryButton>
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <TextLink onClick={onBack}>Back</TextLink>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <Headline>About your business.</Headline>
          <Subhead>Tell us a little about what you do.</Subhead>
          <FloatingField label="Business name" required value={businessName} onChange={setBusinessName} autoFocus />
          <CategorySelect value={category} onChange={setCategory} />
          <FloatingField label="City" required value={city} onChange={setCity} onKeyDown={e => e.key === 'Enter' && submitBusiness()} />
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <PrimaryButton onClick={submitBusiness}>Continue</PrimaryButton>
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <TextLink onClick={() => setStep(1)}>Back</TextLink>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <Headline>Your phone.</Headline>
          <Subhead>We'll send a 6-digit code to verify it's really you.</Subhead>
          <FloatingField
            label="Mobile number"
            required
            value={phone}
            onChange={v => { setPhone(v.replace(/\D/g, '').slice(0, 10)); setError(''); }}
            prefix="+91"
            inputMode="numeric"
            type="tel"
            autoComplete="tel"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && !loading && sendOtp()}
          />
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <PrimaryButton onClick={sendOtp} loading={loading} disabled={phone.replace(/\D/g, '').length !== 10}>
            Send code
          </PrimaryButton>
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <TextLink onClick={() => setStep(2)}>Back</TextLink>
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <Headline>Enter the code.</Headline>
          <Subhead>We sent a 6-digit code to +91 {phone.slice(-10)}.</Subhead>
          <OtpInput
            value={otp}
            onChange={v => { setOtp(v); setError(''); }}
            onComplete={(v) => !loading && verifyOtp(v)}
          />
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <PrimaryButton onClick={() => verifyOtp()} loading={loading} disabled={otp.length < 6}>
            Verify
          </PrimaryButton>
          <div style={{ textAlign: 'center', marginTop: 14, display: 'flex', gap: 16, justifyContent: 'center' }}>
            <TextLink onClick={() => { setOtp(''); setError(''); setStep(3); }}>Didn't get it? Resend</TextLink>
          </div>
        </>
      )}

      {step === 5 && (
        <>
          <Headline>Set a password.</Headline>
          <Subhead>You'll use this to sign in from any device.</Subhead>
          <FloatingField
            label="Password"
            required
            value={password}
            onChange={v => { setPassword(v); setError(''); }}
            type="password"
            autoFocus
            helper="At least 8 characters"
          />
          <FloatingField
            label="Confirm password"
            required
            value={confirmPassword}
            onChange={v => { setConfirmPassword(v); setError(''); }}
            type="password"
            onKeyDown={e => e.key === 'Enter' && !loading && createAccount()}
          />
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <PrimaryButton onClick={createAccount} loading={loading} disabled={password.length < 8 || password !== confirmPassword}>
            Create account
          </PrimaryButton>
        </>
      )}
    </div>
  );
}

function CategorySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false);
  const labelFloated = focused || !!value;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        position: 'relative',
        background: C.ivory,
        border: `1.5px solid ${focused ? C.gold : C.border}`,
        borderRadius: 12,
        transition: 'border-color 0.2s ease',
      }}>
        <label style={{
          position: 'absolute',
          left: 14,
          top: labelFloated ? 6 : '50%',
          transform: labelFloated ? 'none' : 'translateY(-50%)',
          fontSize: labelFloated ? 9 : 13,
          fontWeight: labelFloated ? 600 : 400,
          letterSpacing: labelFloated ? '1.5px' : 'normal',
          textTransform: labelFloated ? 'uppercase' : 'none',
          color: focused ? C.goldDeep : C.muted,
          fontFamily: "'DM Sans', sans-serif",
          pointerEvents: 'none',
          transition: 'all 0.2s ease',
        }}>
          Category<span style={{ color: C.red, marginLeft: 4 }}>*</span>
        </label>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none', outline: 'none',
            padding: labelFloated ? '24px 14px 10px 14px' : '20px 14px 16px 14px',
            fontSize: 14,
            color: C.dark,
            fontFamily: "'DM Sans', sans-serif",
            appearance: 'none',
            cursor: 'pointer',
            boxSizing: 'border-box',
          }}
        >
          <option value="">{labelFloated ? 'Select your category' : ''}</option>
          {VENDOR_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{
          position: 'absolute', right: 14, top: '50%',
          transform: 'translateY(-50%)', pointerEvents: 'none',
          color: C.muted, fontSize: 12,
        }}>▾</div>
      </div>
    </div>
  );
}

function LoginFlow({ onBack, onForgot, onComplete }: {
  onBack: () => void;
  onForgot: () => void;
  onComplete: () => void;
}) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 10) { setError('Enter a valid 10-digit phone'); return; }
    if (!password) { setError('Enter your password'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/vendor-login-v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '+91' + cleaned, password }),
      });
      const d = await res.json();
      if (!d.success) { setError(d.error || 'Could not sign in'); setLoading(false); return; }
      try {
        localStorage.setItem('vendor_web_session', JSON.stringify({
          vendorId: d.vendor.id,
          vendorName: d.vendor.business_name,
          category: d.vendor.category,
          city: d.vendor.city,
          tier: d.vendor.tier,
        }));
      } catch {}
      onComplete();
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <Headline>Welcome back.</Headline>
      <Subhead>Sign in with the phone you used to register.</Subhead>

      <FloatingField
        label="Mobile number"
        required
        value={phone}
        onChange={v => { setPhone(v.replace(/\D/g, '').slice(0, 10)); setError(''); }}
        prefix="+91"
        inputMode="numeric"
        type="tel"
        autoComplete="tel"
        autoFocus
      />

      <FloatingField
        label="Password"
        required
        value={password}
        onChange={v => { setPassword(v); setError(''); }}
        type={showPassword ? 'text' : 'password'}
        autoComplete="current-password"
        onKeyDown={e => e.key === 'Enter' && !loading && submit()}
        suffix={
          <button
            onClick={() => setShowPassword(!showPassword)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11, color: C.muted, padding: 4,
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: '0.5px',
            }}
          >{showPassword ? 'Hide' : 'Show'}</button>
        }
      />

      {error && <ErrorMsg>{error}</ErrorMsg>}

      <PrimaryButton onClick={submit} loading={loading} disabled={phone.replace(/\D/g, '').length !== 10 || !password}>
        Sign in
      </PrimaryButton>

      <div style={{ textAlign: 'center', marginTop: 16, display: 'flex', justifyContent: 'space-between' }}>
        <TextLink onClick={onBack}>Back</TextLink>
        <TextLink onClick={onForgot}>Forgot password?</TextLink>
      </div>
    </div>
  );
}

function ForgotFlow({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sessionInfo, setSessionInfo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sendOtp = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 10) { setError('Enter a valid 10-digit phone'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '+91' + cleaned }),
      });
      const d = await res.json();
      if (!d.success) { setError(d.error || 'Could not send OTP'); setLoading(false); return; }
      setSessionInfo(d.sessionInfo);
      setStep(2);
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  const verifyOtp = async (otpVal?: string) => {
    const codeVal = otpVal || otp;
    if (codeVal.length < 6) { setError('Enter the 6-digit code'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionInfo, code: codeVal }),
      });
      const d = await res.json();
      if (!d.success) { setError(d.error || 'Invalid code'); setLoading(false); return; }
      setStep(3);
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  const resetPassword = async () => {
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true); setError('');
    try {
      const cleaned = phone.replace(/\D/g, '');
      const res = await fetch(`${API}/api/vendor-reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '+91' + cleaned, password }),
      });
      const d = await res.json();
      if (!d.success) { setError(d.error || 'Could not reset'); setLoading(false); return; }
      onDone();
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      {step === 1 && (
        <>
          <Headline>Reset your password.</Headline>
          <Subhead>Enter your registered phone — we'll send a verification code.</Subhead>
          <FloatingField
            label="Mobile number"
            required
            value={phone}
            onChange={v => { setPhone(v.replace(/\D/g, '').slice(0, 10)); setError(''); }}
            prefix="+91"
            inputMode="numeric"
            type="tel"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && !loading && sendOtp()}
          />
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <PrimaryButton onClick={sendOtp} loading={loading} disabled={phone.replace(/\D/g, '').length !== 10}>
            Send code
          </PrimaryButton>
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <TextLink onClick={onBack}>Back to sign in</TextLink>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <Headline>Enter the code.</Headline>
          <Subhead>Code sent to +91 {phone.slice(-10)}.</Subhead>
          <OtpInput
            value={otp}
            onChange={v => { setOtp(v); setError(''); }}
            onComplete={v => !loading && verifyOtp(v)}
          />
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <PrimaryButton onClick={() => verifyOtp()} loading={loading} disabled={otp.length < 6}>
            Verify
          </PrimaryButton>
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <TextLink onClick={() => { setOtp(''); setStep(1); }}>Back</TextLink>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <Headline>New password.</Headline>
          <Subhead>Pick something you'll remember.</Subhead>
          <FloatingField
            label="New password"
            required
            value={password}
            onChange={v => { setPassword(v); setError(''); }}
            type="password"
            autoFocus
            helper="At least 8 characters"
          />
          <FloatingField
            label="Confirm password"
            required
            value={confirmPassword}
            onChange={v => { setConfirmPassword(v); setError(''); }}
            type="password"
            onKeyDown={e => e.key === 'Enter' && !loading && resetPassword()}
          />
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <PrimaryButton onClick={resetPassword} loading={loading} disabled={password.length < 8 || password !== confirmPassword}>
            Update password
          </PrimaryButton>
        </>
      )}
    </div>
  );
}
