'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

export default function CoJoinPage() {
  const params = useParams();
  const code = (params?.code as string || '').toUpperCase();
  const [step, setStep] = useState<'loading' | 'form' | 'done' | 'error'>('loading');
  const [primaryName, setPrimaryName] = useState('');
  const [inviteId, setInviteId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!code) { setStep('error'); return; }
    fetch(`${API}/api/co-planner/validate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) })
      .then(r => r.json()).then(d => {
        if (d.success) { setPrimaryName(d.data.primary_name); setInviteId(d.data.invite_id); setStep('form'); }
        else { setError(d.error || 'Invalid invite'); setStep('error'); }
      }).catch(() => { setError('Network error'); setStep('error'); });
  }, [code]);

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    if (!phone || phone.length < 10) { setError('Valid 10-digit phone required'); return; }
    if (!password || password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true); setError('');
    try {
      const r = await fetch(`${API}/api/co-planner/accept`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: code, name: name.trim(), phone, email: email.trim() || null, instagram: instagram.trim() || null, password }) });
      const d = await r.json();
      if (d.success) {
        localStorage.setItem('couple_session', JSON.stringify({ id: d.data.id, name: d.data.name, couple_tier: 'co_planner', tier_label: 'co_planner', tokens: 0, primary_user_id: d.data.primary_user_id }));
        setStep('done');
      } else { setError(d.error || 'Signup failed'); }
    } catch { setError('Network error'); }
    setLoading(false);
  };

  const iS: React.CSSProperties = { width: '100%', padding: '14px 18px', fontSize: '14px', fontFamily: 'Inter, sans-serif', border: '1.5px solid #E5E7EB', borderRadius: '8px', backgroundColor: '#FAFAFA', color: '#0F1117', outline: 'none', boxSizing: 'border-box' as const };
  const lS: React.CSSProperties = { fontSize: '11px', fontWeight: 500, color: '#6B7280', letterSpacing: '0.8px', textTransform: 'uppercase' as const, display: 'block', marginBottom: '8px' };
  const foc = (e: any) => { e.target.style.border = '1.5px solid #C9A84C'; };
  const blr = (e: any) => { e.target.style.border = '1.5px solid #E5E7EB'; };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', background: '#FAF6F0', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '2.5px', color: '#C9A84C', textTransform: 'uppercase', marginBottom: '4px' }}>THE DREAM WEDDING</div>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '11px', color: '#8C7B6E', marginTop: '4px' }}>Getting married happily.</div>
        </div>

        {step === 'loading' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: '14px', color: '#8C7B6E' }}>Verifying invite...</div>
          </div>
        )}

        {step === 'error' && (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', color: '#2C2420', marginBottom: '8px' }}>Invite not found</div>
            <div style={{ fontSize: '13px', color: '#8C7B6E', lineHeight: 1.6, marginBottom: '24px' }}>{error || 'This invite link may have expired or already been used.'}</div>
            <a href="/" style={{ fontSize: '12px', color: '#C9A84C', textDecoration: 'underline' }}>Go to The Dream Wedding</a>
          </div>
        )}

        {step === 'form' && (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px 24px' }}>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', color: '#2C2420', marginBottom: '6px' }}>Join as Co-Planner</div>
              <div style={{ fontSize: '13px', color: '#8C7B6E', lineHeight: 1.6 }}>{primaryName} invited you to help plan their wedding.</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={lS}>Your Name *</label>
                <input type="text" placeholder="Full name" value={name} onChange={e => { setName(e.target.value); setError(''); }} style={iS} onFocus={foc} onBlur={blr} />
              </div>
              <div>
                <label style={lS}>Phone Number *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ padding: '14px 12px', background: '#FAFAFA', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', color: '#6B7280', fontFamily: 'Inter' }}>+91</div>
                  <input type="tel" placeholder="10-digit number" value={phone} onChange={e => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }} style={{ ...iS, flex: 1 }} onFocus={foc} onBlur={blr} />
                </div>
                <div style={{ fontSize: '10px', color: '#B8ADA4', marginTop: '4px', fontStyle: 'italic' }}>This will be your login ID</div>
              </div>
              <div>
                <label style={lS}>Email Address <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#B8ADA4' }}>(optional)</span></label>
                <input type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} style={iS} onFocus={foc} onBlur={blr} />
                <div style={{ fontSize: '10px', color: '#B8ADA4', marginTop: '4px', fontStyle: 'italic' }}>Or use this to log in</div>
              </div>
              <div>
                <label style={lS}>Instagram <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#B8ADA4' }}>(optional)</span></label>
                <input type="text" placeholder="@yourhandle" value={instagram} onChange={e => setInstagram(e.target.value)} style={iS} onFocus={foc} onBlur={blr} />
              </div>
              <div>
                <label style={lS}>Create Password *</label>
                <input type="password" placeholder="Minimum 6 characters" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} style={iS} onFocus={foc} onBlur={blr} />
              </div>
              <div>
                <label style={lS}>Confirm Password *</label>
                <input type="password" placeholder="Confirm password" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setError(''); }} onKeyDown={e => e.key === 'Enter' && handleSubmit()} style={iS} onFocus={foc} onBlur={blr} />
              </div>
            </div>
            {error && <div style={{ fontSize: '12px', color: '#DC2626', marginBottom: '12px' }}>{error}</div>}
            <button onClick={handleSubmit} disabled={loading} style={{
              width: '100%', background: loading ? '#E5E7EB' : '#2C2420', color: loading ? '#9CA3AF' : '#C9A84C',
              fontSize: '13px', fontWeight: 600, fontFamily: 'Inter, sans-serif', padding: '14px 24px',
              borderRadius: '8px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '0.5px',
            }}>{loading ? 'Joining...' : 'Join as Co-Planner'}</button>
          </div>
        )}

        {step === 'done' && (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(76,175,80,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <span style={{ color: '#4CAF50', fontSize: '24px' }}>&#10003;</span>
            </div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', color: '#2C2420', marginBottom: '8px' }}>You're in</div>
            <div style={{ fontSize: '13px', color: '#8C7B6E', lineHeight: 1.6, marginBottom: '24px' }}>You can now help {primaryName} plan their wedding.</div>
            <a href="/couple" style={{
              display: 'block', width: '100%', background: '#2C2420', color: '#C9A84C',
              fontSize: '13px', fontWeight: 600, fontFamily: 'Inter, sans-serif', padding: '14px',
              borderRadius: '8px', textDecoration: 'none', textAlign: 'center', letterSpacing: '0.5px',
            }}>Open Planner</a>
          </div>
        )}
      </div>
    </div>
  );
}
