'use client';
import { useEffect, useState } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

type UserType = null | 'vendor' | 'dreamer';
type AuthMode = 'signup' | 'login';
type SignupPath = null | 'invite' | 'waitlist';

export default function HomePage() {
  const [userType, setUserType] = useState<UserType>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('signup');
  const [signupPath, setSignupPath] = useState<SignupPath>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showFoundingForm, setShowFoundingForm] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [formVisible, setFormVisible] = useState(false);

  // Signup fields
  const [code, setCode] = useState('');
  const [codeData, setCodeData] = useState<any>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Login fields
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // Waitlist fields
  const [wlName, setWlName] = useState('');
  const [wlEmail, setWlEmail] = useState('');
  const [wlPhone, setWlPhone] = useState('');
  const [wlIg, setWlIg] = useState('');
  const [wlCategory, setWlCategory] = useState('');
  const [dreamerType, setDreamerType] = useState('');

  useEffect(() => {
    setMounted(true);
    try {
      const vs = localStorage.getItem('vendor_web_session');
      if (vs) { const p = JSON.parse(vs); if (p.vendorId) { window.location.href = '/vendor/mobile'; return; } }
      const cs = localStorage.getItem('couple_session');
      if (cs) { const p = JSON.parse(cs); if (p.id) { window.location.href = '/couple'; return; } }
    } catch {}
  }, []);

  const resetForm = () => {
    setStep(1); setSignupPath(null); setError(''); setSuccess(false);
    setCode(''); setCodeData(null); setName(''); setPhone(''); setEmail('');
    setInstagram(''); setPassword(''); setConfirmPassword('');
    setLoginId(''); setLoginPass('');
    setWlName(''); setWlEmail(''); setWlPhone(''); setWlIg(''); setWlCategory('');
  };

  const switchUserType = (type: UserType) => {
    if (type === userType) { setUserType(null); setFormVisible(false); resetForm(); return; }
    setFormVisible(false);
    resetForm();
    setAuthMode('signup');
    setTimeout(() => { setUserType(type); setFormVisible(true); }, 150);
  };

  // ─── API handlers ───
  const handleValidateCode = async () => {
    if (!code.trim()) { setError('Please enter your code'); return; }
    try {
      setLoading(true); setError('');
      const res = await fetch(`${API}/api/signup/validate-code`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        if (userType === 'vendor' && data.data.type !== 'vendor') { setError('This is not a vendor code'); return; }
        if (userType === 'dreamer' && data.data.type === 'vendor') { setError('This is a vendor code'); return; }
        setCodeData(data.data); setStep(2);
      } else { setError(data.error || 'Invalid or expired code'); }
    } catch { setError('Network error'); } finally { setLoading(false); }
  };

  const handleGoToPassword = () => {
    if (!name.trim()) { setError(userType === 'vendor' ? 'Business name is required' : 'Your name is required'); return; }
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
          instagram: instagram.trim(), password,
          code_type: codeData?.type, code_id: codeData?.code_id,
          tier: codeData?.tier, vendor_id: codeData?.vendor_id,
          referral_code: codeData?.referral_code,
          dreamer_type: userType === 'dreamer' ? dreamerType : undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        if (data.data.type === 'vendor' || userType === 'vendor') {
          localStorage.setItem('vendor_web_session', JSON.stringify({
            vendorId: data.data.id, vendorName: data.data.name,
            category: data.data.category, city: data.data.city,
            tier: data.data.tier, trialEnd: data.data.trial_end,
          }));
          window.location.href = '/vendor/mobile';
        } else {
          localStorage.setItem('couple_session', JSON.stringify({
            id: data.data.id, name: data.data.name,
            couple_tier: data.data.couple_tier, tier_label: data.data.tier_label,
            tokens: data.data.tokens,
          }));
          window.location.href = '/couple';
        }
      } else { setError(data.error || 'Signup failed'); }
    } catch { setError('Network error'); } finally { setLoading(false); }
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
        if (data.data.type === 'vendor') {
          localStorage.setItem('vendor_web_session', JSON.stringify({
            vendorId: data.data.id, vendorName: data.data.name,
            category: data.data.category, city: data.data.city, tier: data.data.tier,
          }));
          window.location.href = '/vendor/mobile';
        } else {
          localStorage.setItem('couple_session', JSON.stringify({
            id: data.data.id, name: data.data.name,
            couple_tier: data.data.couple_tier, tier_label: data.data.tier_label,
            tokens: data.data.tokens,
          }));
          window.location.href = '/couple';
        }
      } else { setError(data.error || 'Login failed'); }
    } catch { setError('Network error'); } finally { setLoading(false); }
  };

  const handleWaitlist = async () => {
    if (!wlName.trim() || !wlEmail.trim()) { setError('Name and email are required'); return; }
    if (userType === 'vendor' && !wlCategory) { setError('Please select your category'); return; }
    try {
      setLoading(true); setError('');
      await fetch(`${API}/api/waitlist`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: wlName.trim(), email: wlEmail.trim(), phone: wlPhone.trim(),
          instagram: wlIg.trim(), category: wlCategory || null,
          type: userType, source: 'landing_page',
        }),
      });
      setSuccess(true);
    } catch { setError('Network error'); } finally { setLoading(false); }
  };

  // ─── Shared styles ───
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 0', fontSize: '13px',
    fontFamily: "'DM Sans', sans-serif", fontWeight: 300,
    border: 'none', borderBottom: '1px solid #E8DDD4',
    backgroundColor: 'transparent', color: '#2C2420',
    outline: 'none', letterSpacing: '0.3px',
    transition: 'border-color 0.4s ease',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '9px', fontWeight: 400, color: '#5C4A3A',
    letterSpacing: '2.5px', textTransform: 'uppercase',
    display: 'block', marginBottom: '0px',
    fontFamily: "'DM Sans', sans-serif",
  };

  const primaryBtn = (active: boolean): React.CSSProperties => ({
    width: '100%', background: active ? '#2C2420' : '#E8DDD4',
    color: active ? '#C9A84C' : '#6B5E52', fontSize: '9px',
    fontWeight: 400, letterSpacing: '3px', fontFamily: "'DM Sans', sans-serif",
    padding: '16px 24px', border: 'none',
    cursor: active ? 'pointer' : 'default',
    textTransform: 'uppercase', transition: 'all 0.4s ease',
    marginTop: '8px',
  });

  const secondaryBtn: React.CSSProperties = {
    width: '100%', background: 'transparent',
    color: '#8C7B6E', fontSize: '9px', fontWeight: 300,
    letterSpacing: '2px', fontFamily: "'DM Sans', sans-serif",
    padding: '12px', border: 'none', cursor: 'pointer',
    textTransform: 'uppercase', marginTop: '4px',
    transition: 'color 0.3s ease',
  };

  const errorStyle: React.CSSProperties = {
    fontSize: '11px', color: '#C9A84C', fontFamily: "'DM Sans', sans-serif",
    fontWeight: 300, letterSpacing: '0.3px', marginTop: '8px', marginBottom: '4px',
  };

  const focusHandler = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    (e.target as HTMLElement).style.borderBottomColor = '#C9A84C';
  };
  const blurHandler = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    (e.target as HTMLElement).style.borderBottomColor = '#E8DDD4';
  };

  // ─── Invite code step ───
  const renderCodeStep = () => (
    <div style={{ animation: 'tdwFadeUp 0.5s ease forwards' }}>
      <div style={{ marginBottom: '28px' }}>
        <label style={labelStyle}>Invite Code</label>
        <input
          type="text" placeholder="Enter your code"
          value={code}
          onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleValidateCode()}
          onFocus={focusHandler} onBlur={blurHandler}
          style={{ ...inputStyle, letterSpacing: '4px', textTransform: 'uppercase', fontSize: '15px', textAlign: 'center' }}
        />
      </div>
      {error && <div style={errorStyle}>{error}</div>}
      <button onClick={handleValidateCode} disabled={loading || !code.trim()} style={primaryBtn(!loading && !!code.trim())}>
        {loading ? 'Verifying' : 'Continue'}
      </button>
      <button onClick={() => { setSignupPath(null); setError(''); }} style={secondaryBtn}>Back</button>
    </div>
  );

  // ─── Details step ───
  const renderDetailsStep = () => (
    <div style={{ animation: 'tdwFadeUp 0.5s ease forwards' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '12px' }}>
        <div>
          <label style={labelStyle}>{userType === 'vendor' ? 'Business Name' : 'Full Name'}</label>
          <input type="text" placeholder={userType === 'vendor' ? 'Your business name' : 'Your name'} value={name} onChange={e => { setName(e.target.value); setError(''); }} onFocus={focusHandler} onBlur={blurHandler} style={inputStyle} />
        </div>
        {userType === 'dreamer' && (
          <div>
            <label style={labelStyle}>I am a</label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              {['Couple', 'Family', 'Friend'].map(t => (
                <button key={t} onClick={() => setDreamerType(t.toLowerCase())} style={{
                  flex: 1, padding: '12px 0', border: 'none', cursor: 'pointer',
                  borderBottom: dreamerType === t.toLowerCase() ? '1px solid #C9A84C' : '1px solid #E8DDD4',
                  background: 'transparent', fontFamily: "'DM Sans', sans-serif",
                  fontSize: '12px', fontWeight: dreamerType === t.toLowerCase() ? 400 : 300,
                  color: dreamerType === t.toLowerCase() ? '#2C2420' : '#6B5D52',
                  letterSpacing: '1px', transition: 'all 0.3s ease',
                }}>{t}</button>
              ))}
            </div>
          </div>
        )}
        <div>
          <label style={labelStyle}>Phone</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: '#B8ADA4', fontFamily: "'DM Sans', sans-serif", fontWeight: 300, paddingTop: '12px' }}>+91</span>
            <input type="tel" placeholder="10-digit number" value={phone} onChange={e => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }} onFocus={focusHandler} onBlur={blurHandler} style={{ ...inputStyle, flex: 1 }} />
          </div>
          <div style={{ fontSize: '9px', color: '#8C7B6E', fontFamily: "'DM Sans', sans-serif", marginTop: '4px', letterSpacing: '0.3px' }}>This will be your login ID</div>
        </div>
        <div>
          <label style={labelStyle}>Email</label>
          <input type="email" placeholder="your@email.com" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} onFocus={focusHandler} onBlur={blurHandler} style={inputStyle} />
          <div style={{ fontSize: '9px', color: '#8C7B6E', fontFamily: "'DM Sans', sans-serif", marginTop: '4px', letterSpacing: '0.3px' }}>Or use this to log in</div>
        </div>
        <div>
          <label style={labelStyle}>Instagram</label>
          <input type="text" placeholder="@yourhandle" value={instagram} onChange={e => { setInstagram(e.target.value); setError(''); }} onFocus={focusHandler} onBlur={blurHandler} style={inputStyle} />
        </div>
      </div>
      {error && <div style={errorStyle}>{error}</div>}
      <button onClick={handleGoToPassword} style={primaryBtn(true)}>Continue</button>
      <button onClick={() => { setStep(1); setError(''); }} style={secondaryBtn}>Back</button>
    </div>
  );

  // ─── Password step ───
  const renderPasswordStep = () => (
    <div style={{ animation: 'tdwFadeUp 0.5s ease forwards' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '12px' }}>
        <div>
          <label style={labelStyle}>Password</label>
          <input type="password" placeholder="Minimum 6 characters" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} onFocus={focusHandler} onBlur={blurHandler} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Confirm Password</label>
          <input type="password" placeholder="Confirm your password" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setError(''); }} onKeyDown={e => e.key === 'Enter' && handleCompleteSignup()} onFocus={focusHandler} onBlur={blurHandler} style={inputStyle} />
        </div>
      </div>
      {error && <div style={errorStyle}>{error}</div>}
      <button onClick={handleCompleteSignup} disabled={loading} style={primaryBtn(!loading)}>
        {loading ? 'Creating Account' : 'Create Account'}
      </button>
      <button onClick={() => { setStep(2); setError(''); }} style={secondaryBtn}>Back</button>
    </div>
  );

  // ─── Waitlist form ───
  const renderWaitlist = () => {
    if (success) return (
      <div style={{ animation: 'tdwFadeUp 0.5s ease forwards', textAlign: 'center', padding: '20px 0' }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '17px', fontWeight: 300, color: '#2C2420', marginBottom: '12px', letterSpacing: '0.5px' }}>
          We&apos;ll be in touch
        </div>
        <div style={{ fontSize: '12px', color: '#8C7B6E', fontFamily: "'DM Sans', sans-serif", fontWeight: 300, lineHeight: 1.8 }}>
          We&apos;re onboarding in curated batches to ensure quality.<br />Expect to hear from us within 48 hours.
        </div>
      </div>
    );

    return (
      <div style={{ animation: 'tdwFadeUp 0.5s ease forwards' }}>
        <div style={{ fontSize: '12px', color: '#8C7B6E', fontFamily: "'DM Sans', sans-serif", fontWeight: 300, lineHeight: 1.8, marginBottom: '24px', textAlign: 'center' }}>
          We&apos;re onboarding in curated batches to ensure quality.<br />Leave your details and we&apos;ll invite you soon.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '12px' }}>
          <div>
            <label style={labelStyle}>Name</label>
            <input type="text" placeholder="Your name" value={wlName} onChange={e => { setWlName(e.target.value); setError(''); }} onFocus={focusHandler} onBlur={blurHandler} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" placeholder="your@email.com" value={wlEmail} onChange={e => { setWlEmail(e.target.value); setError(''); }} onFocus={focusHandler} onBlur={blurHandler} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Phone</label>
            <input type="tel" placeholder="Optional" value={wlPhone} onChange={e => { setWlPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); }} onFocus={focusHandler} onBlur={blurHandler} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Instagram</label>
            <input type="text" placeholder="@yourhandle" value={wlIg} onChange={e => { setWlIg(e.target.value); }} onFocus={focusHandler} onBlur={blurHandler} style={inputStyle} />
          </div>
          {userType === 'vendor' && (
            <div>
              <label style={labelStyle}>Category</label>
              <select value={wlCategory} onChange={e => { setWlCategory(e.target.value); setError(''); }} onFocus={focusHandler as any} onBlur={blurHandler as any}
                style={{ ...inputStyle, appearance: 'none', color: wlCategory ? '#2C2420' : '#C4B8AC', cursor: 'pointer' }}>
                <option value="">Select your category</option>
                <option value="photographers">Photographer</option>
                <option value="makeup-artists">Makeup Artist</option>
                <option value="venues">Venue</option>
                <option value="designers">Designer</option>
                <option value="jewellery">Jewellery</option>
                <option value="choreographers">Choreographer</option>
                <option value="djs">DJ / Music</option>
                <option value="content-creators">Content Creator</option>
                <option value="event-managers">Event Manager</option>
              </select>
            </div>
          )}
        </div>
        {error && <div style={errorStyle}>{error}</div>}
        <button onClick={handleWaitlist} disabled={loading} style={primaryBtn(!loading)}>
          {loading ? 'Submitting' : 'Request an Invite'}
        </button>
        <button onClick={() => { setSignupPath(null); setError(''); }} style={secondaryBtn}>Back</button>
      </div>
    );
  };

  // ─── Login form ───
  const renderLogin = () => (
    <div style={{ animation: 'tdwFadeUp 0.5s ease forwards' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '12px' }}>
        <div>
          <label style={labelStyle}>Email or Phone</label>
          <input type="text" placeholder="your@email.com or 9876543210" value={loginId} onChange={e => { setLoginId(e.target.value); setError(''); }} onKeyDown={e => e.key === 'Enter' && document.getElementById('tdw-lp')?.focus()} onFocus={focusHandler} onBlur={blurHandler} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Password</label>
          <input type="password" id="tdw-lp" placeholder="Your password" value={loginPass} onChange={e => { setLoginPass(e.target.value); setError(''); }} onKeyDown={e => e.key === 'Enter' && handleLogin()} onFocus={focusHandler} onBlur={blurHandler} style={inputStyle} />
        </div>
      </div>
      {error && <div style={errorStyle}>{error}</div>}
      <button onClick={handleLogin} disabled={loading || !loginId.trim() || !loginPass} style={primaryBtn(!loading && !!loginId.trim() && !!loginPass)}>
        {loading ? 'Signing in' : 'Sign In'}
      </button>
    </div>
  );

  // ─── "Do you have an invite?" ───
  const renderInviteQuestion = () => (
    <div style={{ animation: 'tdwFadeUp 0.5s ease forwards', textAlign: 'center' }}>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '17px', fontWeight: 300, color: '#2C2420', marginBottom: '28px', letterSpacing: '0.5px' }}>
        Do you have an invite?
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button onClick={() => setSignupPath('invite')} style={{
          width: '100%', padding: '15px', background: '#2C2420', color: '#C9A84C',
          fontSize: '9px', fontWeight: 400, letterSpacing: '3px', textTransform: 'uppercase',
          fontFamily: "'DM Sans', sans-serif", border: 'none', cursor: 'pointer',
          transition: 'all 0.3s ease',
        }}>Yes</button>
        <button onClick={() => setSignupPath('waitlist')} style={{
          width: '100%', padding: '15px', background: 'transparent', color: '#8C7B6E',
          fontSize: '9px', fontWeight: 300, letterSpacing: '3px', textTransform: 'uppercase',
          fontFamily: "'DM Sans', sans-serif", border: '1px solid #E8DDD4', cursor: 'pointer',
          transition: 'all 0.3s ease',
        }}>No</button>
      </div>
    </div>
  );

  // ─── Signup router ───
  const renderSignup = () => {
    if (!signupPath) return renderInviteQuestion();
    if (signupPath === 'waitlist') return renderWaitlist();
    if (step === 1) return renderCodeStep();
    if (step === 2) return renderDetailsStep();
    if (step === 3) return renderPasswordStep();
    return null;
  };

  // ─── Form area ───
  const renderForm = () => {
    if (!userType) return null;
    return (
      <div style={{
        opacity: formVisible ? 1 : 0,
        transform: formVisible ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
        width: '100%', maxWidth: '320px', margin: '0 auto',
      }}>
        {/* Sign Up / Log In toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', marginBottom: '32px' }}>
          <button onClick={() => { setAuthMode('signup'); resetForm(); }} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 6px 0',
            fontSize: '9px', fontWeight: 400, letterSpacing: '2.5px', textTransform: 'uppercase',
            fontFamily: "'DM Sans', sans-serif",
            color: authMode === 'signup' ? '#2C2420' : '#6B5D52',
            borderBottom: authMode === 'signup' ? '1px solid #C9A84C' : '1px solid transparent',
            transition: 'all 0.3s ease',
          }}>Sign Up</button>
          <button onClick={() => { setAuthMode('login'); resetForm(); }} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 6px 0',
            fontSize: '9px', fontWeight: 400, letterSpacing: '2.5px', textTransform: 'uppercase',
            fontFamily: "'DM Sans', sans-serif",
            color: authMode === 'login' ? '#2C2420' : '#6B5D52',
            borderBottom: authMode === 'login' ? '1px solid #C9A84C' : '1px solid transparent',
            transition: 'all 0.3s ease',
          }}>Log In</button>
        </div>

        {authMode === 'signup' ? renderSignup() : renderLogin()}
      </div>
    );
  };

  if (!mounted) return null;

  return (
    <div style={{
      height: '100vh', overflow: 'hidden',
      backgroundColor: '#FAF6F0',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px',
      position: 'relative',
    }}>
      <style>{`
        @keyframes tdwFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes tdwFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .tdw-landing { animation: tdwFadeIn 1.2s ease forwards; }
        .tdw-tab {
          background: none; border: none; cursor: pointer;
          padding: 8px 0; position: relative;
          font-family: 'DM Sans', sans-serif;
          font-size: 10px; font-weight: 300;
          letter-spacing: 3px; text-transform: uppercase;
          transition: color 0.4s ease;
        }
        .tdw-tab::after {
          content: '';
          position: absolute; bottom: 0; left: 50%; width: 0; height: 0.5px;
          background: #C9A84C; transition: all 0.4s ease;
          transform: translateX(-50%);
        }
        .tdw-tab.active { color: #2C2420; font-weight: 400; }
        .tdw-tab.active::after { width: 100%; }
        .tdw-tab.inactive { color: #6B5D52; }
        .tdw-tab.inactive:hover { color: #2C2420; }
        .tdw-bottom-link {
          font-family: 'DM Sans', sans-serif;
          font-size: 9px; font-weight: 300;
          text-transform: uppercase;
          color: #6B5D52; text-decoration: none;
          transition: color 0.3s ease; cursor: pointer;
          letter-spacing: 2px;
        }
        .tdw-bottom-link:hover { color: #2C2420; }
        input::placeholder, select { font-family: 'DM Sans', sans-serif; }
        input::placeholder { color: #8C7B6E; font-weight: 300; }
        select option { font-family: 'DM Sans', sans-serif; color: #2C2420; }
        @media (max-width: 480px) {
          .tdw-brand-name { font-size: 22px !important; letter-spacing: 6px !important; }
          .tdw-tagline { font-size: 11px !important; }
          .tdw-tab { font-size: 9px !important; letter-spacing: 2.5px !important; }
        }
        @media (max-height: 700px) {
          .tdw-form-scroll { max-height: 42vh; overflow-y: auto; padding-right: 4px; }
          .tdw-form-scroll::-webkit-scrollbar { width: 2px; }
          .tdw-form-scroll::-webkit-scrollbar-thumb { background: #E8DDD4; border-radius: 1px; }
        }
      `}</style>

      {/* ─── Main content ─── */}
      <div className="tdw-landing" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        width: '100%', maxWidth: '420px',
      }}>

        {/* Brand name */}
        <h1 className="tdw-brand-name" style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '28px', fontWeight: 300,
          color: '#2C2420', letterSpacing: '8px',
          textTransform: 'uppercase', textAlign: 'center',
          margin: 0, lineHeight: 1.3,
        }}>
          The Dream<br />Wedding
        </h1>

        {/* Tagline */}
        <p className="tdw-tagline" style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '12px', fontWeight: 300, fontStyle: 'italic',
          color: '#5C4A3A', letterSpacing: '1px',
          marginTop: '16px', marginBottom: '0',
          textAlign: 'center',
        }}>
          Not just happily married. Getting married happily.
        </p>

        {/* Thin gold accent line */}
        <div style={{
          width: '40px', height: '0.5px',
          backgroundColor: '#C9A84C',
          margin: '28px auto 16px',
        }} />

        {/* Powered by Dream Ai */}
        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '12px',
          fontStyle: 'italic',
          fontWeight: 400,
          color: 'rgba(201,168,76,0.75)',
          letterSpacing: '0.8px',
          textAlign: 'center',
          marginBottom: '24px',
        }}>
          Powered by Dream Ai
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '40px', marginBottom: '36px', position: 'relative' }}>
          <button
            className={`tdw-tab ${userType === 'vendor' ? 'active' : 'inactive'}`}
            onClick={() => switchUserType('vendor')}
          >
            I&apos;m a Vendor
          </button>
          <button
            className={`tdw-tab ${userType === 'dreamer' ? 'active' : 'inactive'}`}
            onClick={() => switchUserType('dreamer')}
          >
            Planning a Wedding
          </button>
        </div>

        {/* Form area */}
        <div className="tdw-form-scroll" style={{ width: '100%' }}>
          {renderForm()}
        </div>
      </div>

      {/* ─── Bottom links ─── */}
      <div style={{
        position: 'absolute', bottom: '28px', left: 0, right: 0,
        display: 'flex', justifyContent: 'center', gap: '32px',
        animation: 'tdwFadeIn 1.8s ease forwards',
      }}>
        {userType === 'vendor' && (
          <a href="https://vendor.thedreamwedding.in/vendor/login" className="tdw-bottom-link" style={{ textDecoration: 'none' }}>Business Portal</a>
        )}
        <button onClick={() => { switchUserType('vendor'); setAuthMode('signup'); setSignupPath('waitlist'); window.scrollTo(0,0); }} className="tdw-bottom-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Founding Vendor Program</button>
        <a href="/about" className="tdw-bottom-link">About The Dream Wedding</a>
      </div>

      {/* ─── Year ─── */}
      <div style={{
        position: 'absolute', bottom: '12px', left: 0, right: 0,
        textAlign: 'center',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '8px', fontWeight: 300,
        color: '#D4CBC2', letterSpacing: '1.5px',
      }}>
        2026
      </div>
    </div>
  );
}
