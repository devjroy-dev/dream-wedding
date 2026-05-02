'use client';
import { useState, useEffect, useRef } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

const NAVY = '#0C1424';
const NAVY_LIGHT = '#152035';
const NAVY_BORDER = '#1E2D45';
const WHITE = '#FFFFFF';
const OFF_WHITE = '#F7F8FA';
const BORDER = '#E4E7EC';
const TEXT = '#101828';
const MUTED = '#667085';
const MUTED_LIGHT = '#98A2B3';
const GOLD = '#C9A84C';
const GOLD_DEEP = '#B8963A';
const RED = '#D92D20';
const RED_BG = '#FEF3F2';
const RED_BORDER = '#FDA29B';

export default function VendorLoginPage() {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const goToVendorHome = () => {
    const mob = typeof window !== 'undefined' && window.innerWidth < 768;
    window.location.href = mob ? '/vendor/mobile' : '/vendor/dashboard';
  };

  useEffect(() => {
    setMounted(true);
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    try {
      const s = localStorage.getItem('vendor_web_session');
      if (s) { const p = JSON.parse(s); if (p.vendorId) goToVendorHome(); }
    } catch {}
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!mounted) return null;

  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif",
      flexDirection: isMobile ? 'column' : 'row',
    }}>
      {/* LEFT — Navy panel */}
      {!isMobile && (
        <div style={{
          width: '45%', background: NAVY,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px 52px',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Subtle decorative circle */}
          <div style={{
            position: 'absolute', bottom: -120, right: -120,
            width: 380, height: 380, borderRadius: '50%',
            background: NAVY_LIGHT, opacity: 0.6,
          }} />
          <div style={{
            position: 'absolute', top: -80, left: -80,
            width: 240, height: 240, borderRadius: '50%',
            background: NAVY_LIGHT, opacity: 0.4,
          }} />

          {/* Logo */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{
              margin: '0 0 6px', fontSize: 10, color: GOLD,
              fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase',
            }}>The Dream Wedding</p>
            <h1 style={{
              margin: 0, fontSize: 26, color: WHITE,
              fontFamily: "'Georgia', 'Playfair Display', serif",
              fontWeight: 400, lineHeight: '34px',
            }}>Business Portal</h1>
          </div>

          {/* Centre content */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{
              fontSize: 13, color: GOLD, fontStyle: 'italic',
              margin: '0 0 40px', lineHeight: 1.6,
              fontFamily: "'Georgia', serif",
            }}>
              Not just happily married.<br />Getting married happily.
            </p>

            {[
              { icon: '◈', label: 'Client & enquiry management' },
              { icon: '◈', label: 'Revenue tracking & invoicing' },
              { icon: '◈', label: 'Team scheduling & task delegation' },
              { icon: '◈', label: 'Calendar sync & availability' },
              { icon: '◈', label: 'DreamAi — your business co-pilot' },
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <span style={{ color: GOLD, fontSize: 10, flexShrink: 0 }}>{f.icon}</span>
                <span style={{ fontSize: 13, color: '#A8BACE', lineHeight: 1.5 }}>{f.label}</span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ height: 1, background: NAVY_BORDER, marginBottom: 20 }} />
            <p style={{ margin: 0, fontSize: 11, color: '#4A6080', lineHeight: 1.6 }}>
              Access is by invitation only.<br />
              Use the same number registered with TDW.
            </p>
          </div>
        </div>
      )}

      {/* RIGHT — White panel */}
      <div style={{
        flex: 1, background: WHITE,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: isMobile ? '48px 24px' : '48px 64px',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* Mobile-only logo */}
          {isMobile && (
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <p style={{
                margin: '0 0 4px', fontSize: 10, color: GOLD_DEEP,
                fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase',
              }}>The Dream Wedding</p>
              <h1 style={{
                margin: 0, fontSize: 24, color: TEXT,
                fontFamily: "'Georgia', serif", fontWeight: 400,
              }}>Business Portal</h1>
            </div>
          )}

          {/* Heading */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{
              margin: '0 0 8px', fontSize: 22, color: TEXT,
              fontWeight: 600, letterSpacing: '-0.3px', lineHeight: '28px',
            }}>Sign in</h2>
            <p style={{ margin: 0, fontSize: 14, color: MUTED, lineHeight: 1.6 }}>
              Enter your registered phone number to continue.
            </p>
          </div>

          <OTPLoginFlow onSuccess={goToVendorHome} />

          {/* Bottom link */}
          <p style={{
            textAlign: 'center', margin: '28px 0 0',
            fontSize: 12, color: MUTED_LIGHT, lineHeight: 1.6,
          }}>
            Not a vendor yet?{' '}
            <a href="https://thedreamwedding.in" style={{ color: GOLD_DEEP, textDecoration: 'none', fontWeight: 500 }}>
              Apply to join →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div style={{
      background: RED_BG, border: `1px solid ${RED_BORDER}`,
      borderRadius: 8, padding: '10px 14px',
      fontSize: 13, color: RED, marginBottom: 16, lineHeight: 1.5,
    }}>{msg}</div>
  );
}

function PrimaryButton({ label, onTap, disabled }: {
  label: string; onTap: () => void; disabled?: boolean;
}) {
  return (
    <button onClick={onTap} disabled={disabled} style={{
      width: '100%', padding: '13px 24px',
      background: disabled ? OFF_WHITE : NAVY,
      color: disabled ? MUTED_LIGHT : WHITE,
      border: `1px solid ${disabled ? BORDER : NAVY}`,
      borderRadius: 10, fontSize: 14, fontWeight: 600,
      letterSpacing: '0.2px', cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'background 0.15s ease',
      fontFamily: "inherit",
    }}>{label}</button>
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
    <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginBottom: 16 }}>
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
            width: 48, height: 56, background: value[i] ? WHITE : OFF_WHITE,
            border: `1.5px solid ${value[i] ? NAVY : BORDER}`,
            borderRadius: 10, textAlign: 'center',
            fontSize: 22, fontWeight: 600,
            color: TEXT, outline: 'none', boxSizing: 'border-box',
            transition: 'border-color 0.15s',
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
          vendorId: vendor.id, id: vendor.id,
          vendorName: vendor.name || '', name: vendor.name || '',
          category: vendor.category || '', phone: clean,
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
        <label style={{
          display: 'block', fontSize: 13, color: TEXT,
          fontWeight: 500, marginBottom: 6,
        }}>Phone number</label>
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <span style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            fontSize: 14, color: MUTED, fontWeight: 500,
          }}>+91</span>
          <input
            type="tel" value={phone}
            onChange={e => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }}
            placeholder="98765 43210"
            autoFocus inputMode="numeric"
            onKeyDown={e => e.key === 'Enter' && !loading && sendOtp()}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '12px 16px 12px 48px', borderRadius: 10,
              border: `1.5px solid ${BORDER}`, background: OFF_WHITE,
              fontSize: 15, color: TEXT, outline: 'none',
              fontFamily: 'inherit',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => { e.target.style.borderColor = NAVY; e.target.style.background = WHITE; }}
            onBlur={e => { e.target.style.borderColor = BORDER; e.target.style.background = OFF_WHITE; }}
          />
        </div>
        <ErrorBanner msg={error} />
        <PrimaryButton
          label={loading ? 'Sending code…' : 'Send verification code'}
          onTap={sendOtp}
          disabled={loading || phone.replace(/\D/g, '').length !== 10}
        />
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 14, color: MUTED, marginBottom: 20, lineHeight: 1.6 }}>
        We sent a 6-digit code to <strong style={{ color: TEXT }}>+91 {phone.replace(/\D/g, '').slice(-10)}</strong>.
      </p>
      <label style={{
        display: 'block', fontSize: 13, color: TEXT,
        fontWeight: 500, marginBottom: 8,
      }}>Verification code</label>
      <OtpBoxes
        value={otp}
        onChange={v => { setOtp(v); setError(''); }}
        onComplete={v => !loading && verifyOtp(v)}
      />
      <ErrorBanner msg={error} />
      <PrimaryButton
        label={loading ? 'Verifying…' : 'Sign in'}
        onTap={() => verifyOtp()}
        disabled={loading || otp.length < 6}
      />
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <button
          onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
          style={{
            background: 'none', border: 'none', color: MUTED,
            fontSize: 13, cursor: 'pointer', textDecoration: 'underline',
            fontFamily: 'inherit',
          }}
        >Use a different number</button>
      </div>
    </div>
  );
}
