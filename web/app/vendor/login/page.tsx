'use client';
import { useState, useEffect, useRef } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

const C = {
  cream: '#FAF6F0',
  ivory: '#FFFFFF',
  border: '#EDE8E0',
  goldBorder: '#E8D9B5',
  dark: '#2C2420',
  gold: '#C9A84C',
  goldDeep: '#B8963A',
  muted: '#8C7B6E',
  mutedLight: '#B8ADA4',
  red: '#C65757',
  redSoft: '#FBEEEE',
  redBorder: '#F0CFCF',
};

export default function VendorLoginPage() {
  const [mounted, setMounted] = useState(false);

  const goToVendorHome = () => {
    const mob = typeof window !== 'undefined' && window.innerWidth < 768;
    window.location.href = mob ? '/vendor/mobile' : '/vendor/dashboard';
  };

  useEffect(() => {
    setMounted(true);
    try {
      const s = localStorage.getItem('vendor_web_session');
      if (s) {
        const p = JSON.parse(s);
        if (p.vendorId) goToVendorHome();
      }
    } catch {}
  }, []);

  if (!mounted) return null;

  return (
    <div style={{
      minHeight: '100vh', background: C.cream,
      fontFamily: "'DM Sans', sans-serif",
      padding: '56px 24px max(24px, env(safe-area-inset-bottom))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ maxWidth: 420, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <p style={{
            margin: '0 0 4px', fontSize: 10, color: C.goldDeep, fontWeight: 500,
            letterSpacing: '3px', textTransform: 'uppercase',
          }}>The Dream Wedding</p>
          <h1 style={{
            margin: '0 0 8px', fontSize: 28, color: C.dark,
            fontFamily: "'Playfair Display', serif", fontWeight: 400, lineHeight: '34px',
          }}>Business Portal</h1>
          <p style={{
            margin: 0, fontSize: 13, color: C.muted,
            fontWeight: 300, lineHeight: '20px',
          }}>
            Sign in with your registered phone number.
          </p>
        </div>

        <OTPLoginFlow onSuccess={goToVendorHome} />
      </div>
    </div>
  );
}

function FormLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      display: 'block', fontSize: 11, color: C.muted,
      fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase',
      marginBottom: 6, fontFamily: "'DM Sans', sans-serif",
    }}>{children}</label>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div style={{
      background: C.redSoft, border: `1px solid ${C.redBorder}`,
      borderRadius: 8, padding: '10px 12px',
      fontSize: 12, color: C.red, marginBottom: 14,
    }}>
      {msg}
    </div>
  );
}

function GoldButton({ label, onTap, disabled }: {
  label: string; onTap: () => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={onTap}
      disabled={disabled}
      style={{
        width: '100%', padding: '14px 24px',
        background: disabled ? C.border : C.dark,
        color: disabled ? C.mutedLight : C.gold,
        border: 'none', borderRadius: 12,
        fontSize: 12, fontWeight: 600, letterSpacing: '1.8px', textTransform: 'uppercase',
        fontFamily: "'DM Sans', sans-serif",
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >{label}</button>
  );
}

function OtpBoxes({ value, onChange, onComplete }: {
  value: string; onChange: (v: string) => void; onComplete?: (v: string) => void;
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
    if (next.length === 6 && next.split('').every(c => /\d/.test(c))) onComplete && onComplete(next);
  };
  const handleKey = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[idx] && idx > 0) refs.current[idx - 1]?.focus();
  };
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (pasted.length > 0) {
      onChange(pasted);
      refs.current[Math.min(pasted.length, 5)]?.focus();
      if (pasted.length === 6 && onComplete) onComplete(pasted);
    }
  };
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginBottom: 14 }}>
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          type="tel" inputMode="numeric" maxLength={1}
          value={value[i] || ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          onPaste={handlePaste}
          autoFocus={i === 0}
          style={{
            width: 44, height: 52, background: C.ivory,
            border: `1px solid ${value[i] ? C.gold : C.border}`,
            borderRadius: 10, textAlign: 'center',
            fontSize: 20, fontFamily: "'Playfair Display', serif",
            color: C.dark, outline: 'none', boxSizing: 'border-box',
          }}
        />
      ))}
    </div>
  );
}

function OTPLoginFlow({ onSuccess }: { onSuccess: () => void }) {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sendOtp = async () => {
    const clean = phone.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) { setError('Enter a valid 10-digit phone number'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/v2/vendor/auth/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: clean }),
      });
      const d = await res.json();
      if (!d.success) { setError(d.error || 'Could not send OTP'); setLoading(false); return; }
      setStep('otp');
    } catch { setError('Network error. Please try again.'); }
    setLoading(false);
  };

  const verifyOtp = async (otpVal?: string) => {
    const code = otpVal || otp;
    if (code.length < 6) { setError('Enter the 6-digit code'); return; }
    const clean = phone.replace(/\D/g, '').slice(-10);
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/v2/vendor/auth/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: clean, code }),
      });
      const d = await res.json();
      if (!d.success) { setError(d.error || 'Incorrect code'); setLoading(false); return; }
      const vendor = d.vendor;
      if (!vendor || !vendor.id) {
        setError('No vendor account found for this number. Please contact TDW team.');
        setLoading(false); return;
      }
      try {
        const session = {
          vendorId: vendor.id,
          id: vendor.id,
          vendorName: vendor.name || '',
          name: vendor.name || '',
          category: vendor.category || '',
          phone: clean,
          pin_set: vendor.pin_set || false,
        };
        localStorage.setItem('vendor_web_session', JSON.stringify(session));
      } catch {}
      onSuccess();
    } catch { setError('Network error. Please try again.'); }
    setLoading(false);
  };

  if (step === 'phone') {
    return (
      <div>
        <FormLabel>Phone number</FormLabel>
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <span style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            fontSize: 15, color: C.muted, fontFamily: "'DM Sans', sans-serif",
          }}>+91</span>
          <input
            type="tel" value={phone}
            onChange={e => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }}
            placeholder="98765 43210"
            autoFocus
            inputMode="numeric"
            onKeyDown={e => e.key === 'Enter' && !loading && sendOtp()}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '12px 16px 12px 46px', borderRadius: 10,
              border: `1px solid ${C.border}`, background: C.ivory,
              fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: C.dark, outline: 'none',
            }}
          />
        </div>
        <ErrorBanner msg={error} />
        <GoldButton
          label={loading ? 'Sending code…' : 'Send verification code'}
          onTap={sendOtp}
          disabled={loading || phone.replace(/\D/g, '').length !== 10}
        />
        <p style={{
          textAlign: 'center', margin: '20px 0 0',
          fontSize: 11, color: C.mutedLight, lineHeight: 1.6,
        }}>
          Business portal access is by invitation only.<br />
          Use the same number registered with The Dream Wedding.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.6 }}>
        We sent a 6-digit code to +91 {phone.replace(/\D/g, '').slice(-10)}.
      </p>
      <FormLabel>Verification code</FormLabel>
      <OtpBoxes value={otp} onChange={v => { setOtp(v); setError(''); }} onComplete={v => !loading && verifyOtp(v)} />
      <ErrorBanner msg={error} />
      <GoldButton
        label={loading ? 'Verifying…' : 'Sign in'}
        onTap={() => verifyOtp()}
        disabled={loading || otp.length < 6}
      />
      <div style={{ textAlign: 'center', marginTop: 14 }}>
        <button
          onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
          style={{
            background: 'none', border: 'none', color: C.muted,
            fontSize: 12, fontFamily: "'DM Sans', sans-serif",
            cursor: 'pointer', textDecoration: 'underline',
          }}
        >Use a different number</button>
      </div>
    </div>
  );
}
