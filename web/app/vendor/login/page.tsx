'use client';
import { useState } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

export default function VendorLoginPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'tier' | 'app'>('tier');

  const handleTierCodeLogin = async () => {
    if (!code.trim()) { setError('Please enter your vendor code'); return; }
    try {
      setLoading(true); setError('');
      const res = await fetch(`${API}/api/tier-codes/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        localStorage.setItem('vendor_web_session', JSON.stringify({
          vendorId: data.data.id,
          vendorName: data.data.name,
          category: data.data.category,
          city: data.data.city,
          tier: data.data.tier,
          trialEnd: data.data.trial_end,
        }));
        window.location.href = '/vendor/dashboard';
      } else {
        setError(data.error || 'Invalid or expired code.');
      }
    } catch (e) {
      setError('Could not verify code. Please try again.');
    } finally { setLoading(false); }
  };

  const handleAppCodeLogin = async () => {
    if (code.length !== 6) { setError('Please enter a 6-digit code'); return; }
    try {
      setLoading(true); setError('');
      const res = await fetch(`${API}/api/vendor-login-codes/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        localStorage.setItem('vendor_web_session', JSON.stringify({
          vendorId: data.data.id,
          vendorName: data.data.name,
          category: data.data.category,
          city: data.data.city,
          tier: data.data.tier || 'essential',
        }));
        window.location.href = '/vendor/dashboard';
      } else {
        setError(data.error || 'Invalid or expired code.');
      }
    } catch (e) {
      setError('Could not verify code. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>

      {/* Left panel */}
      <div style={{
        width: '55%', background: '#0F1117',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px 56px',
      }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '2.5px', color: '#C9A84C', textTransform: 'uppercase' }}>
            THE DREAM WEDDING
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.5px', marginTop: '4px' }}>
            Vendor Business Portal
          </div>
        </div>

        <div>
          <div style={{ fontSize: '38px', fontWeight: 300, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.8px', marginBottom: '20px' }}>
            The business<br />behind the magic.
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.8, maxWidth: '340px' }}>
            India's wedding professionals<br />run their business here.
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '24px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.3px' }}>
            vendor.thedreamwedding.in
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={{
        width: '45%', background: '#fff',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '56px 64px',
      }}>
        <div style={{ width: '100%', maxWidth: '360px' }}>

          <div style={{ marginBottom: '32px' }}>
            <div style={{ fontSize: '22px', fontWeight: 600, color: '#0F1117', marginBottom: '8px', letterSpacing: '-0.3px' }}>
              Welcome to your portal
            </div>
            <div style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.6 }}>
              Enter the code provided by The Dream Wedding team to access your dashboard.
            </div>
          </div>

          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: '0', marginBottom: '24px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
            <button onClick={() => { setMode('tier'); setCode(''); setError(''); }} style={{
              flex: 1, padding: '10px', fontSize: '12px', fontWeight: mode === 'tier' ? 600 : 400, fontFamily: 'Inter, sans-serif',
              background: mode === 'tier' ? '#0F1117' : '#fff',
              color: mode === 'tier' ? '#C9A84C' : '#6B7280',
              border: 'none', cursor: 'pointer',
            }}>Vendor Code</button>
            <button onClick={() => { setMode('app'); setCode(''); setError(''); }} style={{
              flex: 1, padding: '10px', fontSize: '12px', fontWeight: mode === 'app' ? 600 : 400, fontFamily: 'Inter, sans-serif',
              background: mode === 'app' ? '#0F1117' : '#fff',
              color: mode === 'app' ? '#C9A84C' : '#6B7280',
              border: 'none', cursor: 'pointer', borderLeft: '1px solid #E5E7EB',
            }}>App Login Code</button>
          </div>

          {mode === 'tier' ? (
            <>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: 500, color: '#6B7280', letterSpacing: '0.8px', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  Vendor Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. SIG-A3KF9M"
                  value={code}
                  onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleTierCodeLogin()}
                  style={{
                    width: '100%', padding: '14px 18px', fontSize: '16px', fontFamily: 'Inter, sans-serif',
                    letterSpacing: '3px', textAlign: 'center',
                    border: error ? '1.5px solid #DC2626' : '1.5px solid #E5E7EB',
                    borderRadius: '8px', backgroundColor: '#FAFAFA', color: '#0F1117',
                    outline: 'none', boxSizing: 'border-box', textTransform: 'uppercase',
                  }}
                  onFocus={(e) => { if (!error) e.target.style.border = '1.5px solid #C9A84C'; }}
                  onBlur={(e) => { if (!error) e.target.style.border = '1.5px solid #E5E7EB'; }}
                />
              </div>
              {error && <div style={{ fontSize: '12px', color: '#DC2626', marginBottom: '12px' }}>{error}</div>}
              <button onClick={handleTierCodeLogin} disabled={loading || !code.trim()} style={{
                width: '100%', background: loading || !code.trim() ? '#E5E7EB' : '#0F1117',
                color: loading || !code.trim() ? '#9CA3AF' : '#fff',
                fontSize: '13px', fontWeight: 600, letterSpacing: '0.5px', fontFamily: 'Inter, sans-serif',
                padding: '14px 24px', borderRadius: '8px', border: 'none',
                cursor: loading || !code.trim() ? 'not-allowed' : 'pointer', marginBottom: '16px',
              }}>
                {loading ? 'Verifying...' : 'Enter Dashboard'}
              </button>
              <div style={{ fontSize: '11px', color: '#9CA3AF', textAlign: 'center', lineHeight: 1.6 }}>
                This code was provided during your onboarding with The Dream Wedding team. It gives you access to your personalized CRM dashboard.
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: 500, color: '#6B7280', letterSpacing: '0.8px', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  6-Digit Login Code
                </label>
                <input
                  type="text" maxLength={6} placeholder="— — — — — —"
                  value={code}
                  onChange={(e) => { setCode(e.target.value.replace(/[^0-9]/g, '')); setError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAppCodeLogin()}
                  style={{
                    width: '100%', padding: '14px 18px', fontSize: '24px', fontFamily: 'Inter, sans-serif',
                    letterSpacing: '12px', textAlign: 'center',
                    border: error ? '1.5px solid #DC2626' : '1.5px solid #E5E7EB',
                    borderRadius: '8px', backgroundColor: '#FAFAFA', color: '#0F1117',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { if (!error) e.target.style.border = '1.5px solid #C9A84C'; }}
                  onBlur={(e) => { if (!error) e.target.style.border = '1.5px solid #E5E7EB'; }}
                />
              </div>
              {error && <div style={{ fontSize: '12px', color: '#DC2626', marginBottom: '12px' }}>{error}</div>}
              <button onClick={handleAppCodeLogin} disabled={loading || code.length !== 6} style={{
                width: '100%', background: loading || code.length !== 6 ? '#E5E7EB' : '#0F1117',
                color: loading || code.length !== 6 ? '#9CA3AF' : '#fff',
                fontSize: '13px', fontWeight: 600, letterSpacing: '0.5px', fontFamily: 'Inter, sans-serif',
                padding: '14px 24px', borderRadius: '8px', border: 'none',
                cursor: loading || code.length !== 6 ? 'not-allowed' : 'pointer', marginBottom: '16px',
              }}>
                {loading ? 'Verifying...' : 'Enter Dashboard'}
              </button>
              <div style={{ fontSize: '11px', color: '#9CA3AF', textAlign: 'center', lineHeight: 1.6 }}>
                Open the app, go to Overview, tap Generate Web Login Code, then enter it above.
              </div>
            </>
          )}

        </div>
      </div>

    </div>
  );
}
