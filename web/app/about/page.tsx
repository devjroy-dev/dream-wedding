'use client';
import { useState } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

export default function AboutPage() {
  const [wlName, setWlName] = useState('');
  const [wlEmail, setWlEmail] = useState('');
  const [wlPhone, setWlPhone] = useState('');
  const [wlIg, setWlIg] = useState('');
  const [wlCategory, setWlCategory] = useState('');
  const [wlType, setWlType] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!wlName.trim() || !wlEmail.trim()) { setError('Name and email are required'); return; }
    try {
      setLoading(true); setError('');
      await fetch(`${API}/api/waitlist`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: wlName.trim(), email: wlEmail.trim(), phone: wlPhone.trim(),
          instagram: wlIg.trim(), category: wlCategory || null,
          type: wlType || 'dreamer', source: 'about_page',
        }),
      });
      setSuccess(true);
    } catch { setError('Network error'); } finally { setLoading(false); }
  };

  const focusH = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    (e.target as HTMLElement).style.borderBottomColor = '#C9A84C';
  };
  const blurH = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    (e.target as HTMLElement).style.borderBottomColor = '#E8DDD4';
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 0', fontSize: '13px',
    fontFamily: "'DM Sans', sans-serif", fontWeight: 300,
    border: 'none', borderBottom: '1px solid #E8DDD4',
    backgroundColor: 'transparent', color: '#2C2420',
    outline: 'none', letterSpacing: '0.3px',
    transition: 'border-color 0.4s ease',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '9px', fontWeight: 400, color: '#B8ADA4',
    letterSpacing: '2.5px', textTransform: 'uppercase',
    display: 'block', fontFamily: "'DM Sans', sans-serif",
  };

  const sectionTitle: React.CSSProperties = {
    fontFamily: "'Playfair Display', serif",
    fontSize: '24px', fontWeight: 300,
    color: '#2C2420', letterSpacing: '0.5px',
    marginBottom: '16px',
  };

  const bodyText: React.CSSProperties = {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '13px', fontWeight: 300,
    color: '#8C7B6E', lineHeight: 1.9,
    letterSpacing: '0.2px',
  };

  const features = [
    { title: 'Blind Discovery', desc: 'Swipe through vendors without seeing names or prices. Judge the work, not the brand. Use tokens to unlock the ones that move you.' },
    { title: 'Serious Enquiries Only', desc: 'Every enquiry costs tokens. No tyre-kickers, no spam. Only couples who chose your work reach your inbox. If a vendor doesn\'t respond within 24 hours, your token is refunded automatically.' },
    { title: 'Payment Shield', desc: 'Final payment is secured before the wedding day. Cash or digital — vendor chooses, couple commits. Protected by TDW.' },
    { title: 'Verified Only', desc: 'Every vendor is personally vetted. Premium portfolios. Featured photos reviewed by our team before they go live.' },
    { title: 'Complete Business Suite', desc: 'Invoicing with GST, contracts, expense tracking, calendar, team management, analytics. Run your wedding business from one place.' },
    { title: 'Destination Weddings', desc: 'Event managers create curated destination packages. Tag preferred vendors. One listing, one booking, one dream.' },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAF6F0' }}>
      <style>{`
        @keyframes aboutFadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .about-section { animation: aboutFadeIn 0.8s ease forwards; }
        .about-section:nth-child(2) { animation-delay: 0.1s; }
        .about-section:nth-child(3) { animation-delay: 0.2s; }
        .about-feature {
          padding: 28px 0;
          border-bottom: 1px solid #EDE8DF;
        }
        .about-feature:last-child { border-bottom: none; }
        .about-back {
          font-family: 'DM Sans', sans-serif;
          font-size: 9px; font-weight: 300;
          letter-spacing: 2px; text-transform: uppercase;
          color: #C4B8AC; text-decoration: none;
          transition: color 0.3s ease;
        }
        .about-back:hover { color: #8C7B6E; }
        input::placeholder { color: #C4B8AC; font-weight: 300; font-family: 'DM Sans', sans-serif; }
        select option { font-family: 'DM Sans', sans-serif; color: #2C2420; }
        @media (max-width: 600px) {
          .about-container { padding: 40px 24px !important; }
          .about-title { font-size: 22px !important; }
        }
      `}</style>

      <div className="about-container" style={{
        maxWidth: '600px', margin: '0 auto',
        padding: '80px 48px 60px',
      }}>
        {/* Back link */}
        <a href="/" className="about-back">Back</a>

        {/* Header */}
        <div className="about-section" style={{ marginTop: '48px', marginBottom: '64px' }}>
          <h1 className="about-title" style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '28px', fontWeight: 300,
            color: '#2C2420', letterSpacing: '4px',
            textTransform: 'uppercase', lineHeight: 1.3,
            margin: '0 0 20px 0',
          }}>
            The Dream Wedding
          </h1>
          <div style={{
            width: '40px', height: '0.5px',
            backgroundColor: '#C9A84C',
            marginBottom: '24px',
          }} />
          <p style={bodyText}>
            Built from a real wedding. Every frustration, every WhatsApp forward, every
            Excel sheet that shouldn&apos;t exist — we lived it. Then we built the platform
            that should have existed all along.
          </p>
          <p style={{ ...bodyText, marginTop: '16px' }}>
            India&apos;s first premium wedding vendor platform. Curated, verified,
            and designed for the way you actually make decisions.
          </p>
        </div>

        {/* Co-founders */}
        <div className="about-section" style={{ marginBottom: '64px' }}>
          <p style={{ ...bodyText, fontStyle: 'italic', color: '#C9A84C' }}>
            Co-founded by Swati Tomar — Celebrity Makeup Artist, 10+ years industry experience
          </p>
        </div>

        {/* Features */}
        <div className="about-section" style={{ marginBottom: '64px' }}>
          <h2 style={sectionTitle}>How it works</h2>
          {features.map((f, i) => (
            <div key={i} className="about-feature">
              <div style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '11px', fontWeight: 400,
                color: '#2C2420', letterSpacing: '1.5px',
                textTransform: 'uppercase', marginBottom: '8px',
              }}>
                {f.title}
              </div>
              <div style={bodyText}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Founding Vendor Program */}
        <div className="about-section" style={{ marginBottom: '64px' }}>
          <h2 style={sectionTitle}>Founding Vendor Program</h2>
          <p style={bodyText}>
            We are personally selecting our first 50 founding partners.
            Full platform access. Three months free. Price locked forever.
            Limited spots remaining.
          </p>
        </div>

        {/* Waitlist form */}
        <div className="about-section" style={{ marginBottom: '48px' }}>
          <h2 style={sectionTitle}>Join the waitlist</h2>
          <p style={{ ...bodyText, marginBottom: '32px' }}>
            We&apos;re onboarding in curated batches to ensure quality.
            Leave your details and we&apos;ll invite you soon.
          </p>

          {success ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '17px', fontWeight: 300,
                color: '#2C2420', marginBottom: '12px',
              }}>
                We&apos;ll be in touch
              </div>
              <div style={{ ...bodyText, fontSize: '12px' }}>
                Expect to hear from us within 48 hours.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={labelStyle}>I am a</label>
                <select value={wlType} onChange={e => setWlType(e.target.value)} onFocus={focusH as any} onBlur={blurH as any}
                  style={{ ...inputStyle, appearance: 'none', color: wlType ? '#2C2420' : '#C4B8AC', cursor: 'pointer' }}>
                  <option value="">Select</option>
                  <option value="vendor">Vendor</option>
                  <option value="dreamer">Planning a Wedding</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Name</label>
                <input type="text" placeholder="Your name" value={wlName} onChange={e => { setWlName(e.target.value); setError(''); }} onFocus={focusH} onBlur={blurH} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" placeholder="your@email.com" value={wlEmail} onChange={e => { setWlEmail(e.target.value); setError(''); }} onFocus={focusH} onBlur={blurH} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input type="tel" placeholder="Optional" value={wlPhone} onChange={e => setWlPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} onFocus={focusH} onBlur={blurH} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Instagram</label>
                <input type="text" placeholder="@yourhandle" value={wlIg} onChange={e => setWlIg(e.target.value)} onFocus={focusH} onBlur={blurH} style={inputStyle} />
              </div>
              {wlType === 'vendor' && (
                <div>
                  <label style={labelStyle}>Category</label>
                  <select value={wlCategory} onChange={e => { setWlCategory(e.target.value); setError(''); }} onFocus={focusH as any} onBlur={blurH as any}
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
              {error && <div style={{ fontSize: '11px', color: '#C9A84C', fontFamily: "'DM Sans', sans-serif", fontWeight: 300 }}>{error}</div>}
              <button onClick={handleSubmit} disabled={loading} style={{
                width: '100%', padding: '16px', marginTop: '8px',
                background: loading ? '#E8DDD4' : '#2C2420',
                color: loading ? '#B8ADA4' : '#C9A84C',
                fontSize: '9px', fontWeight: 400, letterSpacing: '3px',
                textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif",
                border: 'none', cursor: loading ? 'default' : 'pointer',
                transition: 'all 0.4s ease',
              }}>
                {loading ? 'Submitting' : 'Request an Invite'}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          borderTop: '1px solid #EDE8DF',
          paddingTop: '24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '9px', fontWeight: 300,
            color: '#C4B8AC', letterSpacing: '1.5px',
          }}>
            2026
          </span>
          <a href="/" className="about-back">Home</a>
        </div>
      </div>
    </div>
  );
}
