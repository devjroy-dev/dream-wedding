'use client';
import { useState, useEffect } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

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

export default function VendorSetupPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('vendor_web_session') || '{}');
      if (!s.vendorId) { window.location.href = '/vendor/login'; return; }
      setSession(s);
    } catch (e) { window.location.href = '/vendor/login'; }
  }, []);

  const handleCreate = async () => {
    if (!username.trim()) { setError('Choose a username'); return; }
    if (username.trim().length < 3) { setError('Username must be at least 3 characters'); return; }
    if (!password) { setError('Create a password'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    try {
      setLoading(true); setError('');
      const res = await fetch(`${API}/api/credentials/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: session.vendorId, username: username.trim(), password }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = '/vendor/dashboard';
      } else {
        setError(data.error || 'Could not create account');
      }
    } catch (e) {
      setError('Network error. Please try again.');
    } finally { setLoading(false); }
  };

  if (!mounted) return null;

  const tierLabel = session?.tier === 'prestige' ? 'Prestige' : 'Signature';

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
            }}>
              The Dream Wedding
            </div>
            <div style={{
              fontSize: 10, color: C.muted, letterSpacing: '0.5px',
              marginTop: 4,
            }}>
              Vendor Portal
            </div>
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 40, fontWeight: 400, color: C.dark,
              lineHeight: 1.15, letterSpacing: '-0.5px',
              margin: 0, marginBottom: 18,
            }}>
              Welcome aboard.
            </h1>
            <p style={{
              fontSize: 14, color: C.muted, lineHeight: 1.7,
              maxWidth: 360, margin: 0, fontWeight: 300,
            }}>
              You have been granted access to the {tierLabel} plan. Set up your credentials to get started.
            </p>
            {session?.tier && (
              <div style={{
                display: 'inline-block', marginTop: 24,
                padding: '8px 20px', borderRadius: 50,
                border: `1px solid ${C.goldBorder}`,
                background: C.goldSoft,
              }}>
                <span style={{
                  fontSize: 11, fontWeight: 600, color: C.goldDeep,
                  letterSpacing: '2px', textTransform: 'uppercase',
                }}>{tierLabel} Trial</span>
              </div>
            )}
          </div>

          <div style={{
            position: 'relative', zIndex: 1,
            borderTop: `1px solid ${C.goldBorder}`, paddingTop: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{
              fontSize: 11, color: C.muted, letterSpacing: '0.3px',
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
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 26, fontWeight: 400,
            color: C.dark, letterSpacing: '-0.3px',
            margin: 0, marginBottom: 8, lineHeight: 1.25,
          }}>
            Create your account.
          </h2>
          <p style={{
            fontSize: 13, color: C.muted, lineHeight: 1.6,
            margin: 0, marginBottom: 24,
          }}>
            Choose a username and password. You'll use these to sign in to your portal.
          </p>

          <FloatingField
            label="Username"
            required
            value={username}
            onChange={v => { setUsername(v.toLowerCase().replace(/[^a-z0-9._]/g, '')); setError(''); }}
            autoFocus
            helper="Lowercase letters, numbers, dots and underscores only"
          />

          <FloatingField
            label="Password"
            required
            value={password}
            onChange={v => { setPassword(v); setError(''); }}
            type="password"
            helper="At least 6 characters"
          />

          <FloatingField
            label="Confirm password"
            required
            value={confirmPassword}
            onChange={v => { setConfirmPassword(v); setError(''); }}
            type="password"
            onKeyDown={e => e.key === 'Enter' && !loading && handleCreate()}
          />

          {error && (
            <div style={{
              background: C.redSoft,
              border: `1px solid ${C.redBorder}`,
              borderRadius: 8,
              padding: '10px 12px',
              fontSize: 12, color: C.red,
              marginBottom: 14,
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={loading}
            style={{
              width: '100%',
              padding: '15px 20px',
              background: loading ? C.border : C.dark,
              color: loading ? C.light : C.gold,
              border: 'none',
              borderRadius: 12,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              fontFamily: "'DM Sans', sans-serif",
              transition: 'all 0.2s ease',
              marginBottom: 16,
            }}
          >
            {loading ? 'Creating account…' : 'Create account & enter dashboard'}
          </button>

          <div style={{
            fontSize: 11, color: C.muted,
            textAlign: 'center', lineHeight: 1.6,
          }}>
            You can update your profile, add services, and manage your business from the dashboard.
          </div>
        </div>
      </div>
    </div>
  );
}

function FloatingField({
  label, value, onChange, type = 'text', required,
  autoFocus, helper, onKeyDown,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  autoFocus?: boolean;
  helper?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  const [focused, setFocused] = useState(false);
  const labelFloated = focused || value.length > 0;

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
          {label}
          {required && <span style={{ color: C.red, marginLeft: 4 }}>*</span>}
        </label>
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={onKeyDown}
          autoFocus={autoFocus}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none', outline: 'none',
            padding: labelFloated ? '24px 14px 10px 14px' : '20px 14px 16px 14px',
            fontSize: 14,
            color: C.dark,
            fontFamily: "'DM Sans', sans-serif",
            boxSizing: 'border-box',
            transition: 'padding 0.2s ease',
          }}
        />
      </div>
      {helper && (
        <div style={{
          fontSize: 11, color: C.muted, marginTop: 6, paddingLeft: 4,
          lineHeight: 1.5,
        }}>
          {helper}
        </div>
      )}
    </div>
  );
}
