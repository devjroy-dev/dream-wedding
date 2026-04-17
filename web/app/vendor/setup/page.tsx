'use client';
import { useState, useEffect } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

export default function VendorSetupPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
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
    } catch(e) { window.location.href = '/vendor/login'; }
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

  const tierLabel = session?.tier === 'prestige' ? 'Prestige' : 'Signature';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      {!isMobile && (
      <div style={{ width: '55%', background: '#0F1117', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '48px 56px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '2.5px', color: '#C9A84C', textTransform: 'uppercase' }}>THE DREAM WEDDING</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.5px', marginTop: '4px' }}>Vendor Business Portal</div>
        </div>
        <div>
          <div style={{ fontSize: '38px', fontWeight: 300, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.8px', marginBottom: '20px' }}>Welcome aboard.</div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.8, maxWidth: '340px' }}>You have been granted access to the {tierLabel} plan. Set up your credentials to get started.</div>
          {session?.tier && (
            <div style={{ display: 'inline-block', marginTop: '24px', padding: '8px 20px', borderRadius: '50px', border: '1px solid rgba(201,168,76,0.3)', background: 'rgba(201,168,76,0.08)' }}>
              <span style={{ fontSize: '11px', fontWeight: 500, color: '#C9A84C', letterSpacing: '2px', textTransform: 'uppercase' }}>{tierLabel} Trial</span>
            </div>
          )}
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '24px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.3px' }}>vendor.thedreamwedding.in</div>
        </div>
      </div>
      )}
      <div style={{ width: isMobile ? '100%' : '45%', background: isMobile ? '#0F1117' : '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '32px 24px' : '56px 64px', minHeight: isMobile ? '100vh' : 'auto' }}>
        {isMobile && (
          <div style={{ marginBottom: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '2.5px', color: '#C9A84C', textTransform: 'uppercase', marginBottom: '6px' }}>THE DREAM WEDDING</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.5px' }}>Vendor Business Portal</div>
          </div>
        )}
        <div style={{ width: '100%', maxWidth: '360px', background: isMobile ? '#FFFFFF' : 'transparent', borderRadius: isMobile ? '16px' : '0', padding: isMobile ? '28px 24px' : '0' }}>
          <div style={{ marginBottom: '32px' }}>
            <div style={{ fontSize: '22px', fontWeight: 600, color: '#0F1117', marginBottom: '8px', letterSpacing: '-0.3px' }}>Create your account</div>
            <div style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.6 }}>Choose a username and password. You will use these to sign in to your portal.</div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '11px', fontWeight: 500, color: '#6B7280', letterSpacing: '0.8px', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Username</label>
            <input type="text" placeholder="Choose a username" value={username} onChange={(e) => { setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, '')); setError(''); }} style={{ width: '100%', padding: '14px 18px', fontSize: '14px', fontFamily: 'Inter, sans-serif', border: '1.5px solid #E5E7EB', borderRadius: '8px', backgroundColor: '#FAFAFA', color: '#0F1117', outline: 'none', boxSizing: 'border-box' }} onFocus={(e) => e.target.style.border = '1.5px solid #C9A84C'} onBlur={(e) => e.target.style.border = '1.5px solid #E5E7EB'} />
            <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>Lowercase letters, numbers, dots and underscores only</div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '11px', fontWeight: 500, color: '#6B7280', letterSpacing: '0.8px', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Password</label>
            <input type="password" placeholder="Create a password" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} style={{ width: '100%', padding: '14px 18px', fontSize: '14px', fontFamily: 'Inter, sans-serif', border: '1.5px solid #E5E7EB', borderRadius: '8px', backgroundColor: '#FAFAFA', color: '#0F1117', outline: 'none', boxSizing: 'border-box' }} onFocus={(e) => e.target.style.border = '1.5px solid #C9A84C'} onBlur={(e) => e.target.style.border = '1.5px solid #E5E7EB'} />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '11px', fontWeight: 500, color: '#6B7280', letterSpacing: '0.8px', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Confirm Password</label>
            <input type="password" placeholder="Confirm your password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }} onKeyDown={(e) => e.key === 'Enter' && handleCreate()} style={{ width: '100%', padding: '14px 18px', fontSize: '14px', fontFamily: 'Inter, sans-serif', border: '1.5px solid #E5E7EB', borderRadius: '8px', backgroundColor: '#FAFAFA', color: '#0F1117', outline: 'none', boxSizing: 'border-box' }} onFocus={(e) => e.target.style.border = '1.5px solid #C9A84C'} onBlur={(e) => e.target.style.border = '1.5px solid #E5E7EB'} />
          </div>
          {error && <div style={{ fontSize: '12px', color: '#DC2626', marginBottom: '12px' }}>{error}</div>}
          <button onClick={handleCreate} disabled={loading} style={{ width: '100%', background: loading ? '#E5E7EB' : '#0F1117', color: loading ? '#9CA3AF' : '#fff', fontSize: '13px', fontWeight: 600, letterSpacing: '0.5px', fontFamily: 'Inter, sans-serif', padding: '14px 24px', borderRadius: '8px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', marginBottom: '16px' }}>
            {loading ? 'Creating account...' : 'Create Account & Enter Dashboard'}
          </button>
          <div style={{ fontSize: '11px', color: '#9CA3AF', textAlign: 'center', lineHeight: 1.6 }}>You can update your profile, add services, and manage your business from the dashboard.</div>
        </div>
      </div>
    </div>
  );
}
