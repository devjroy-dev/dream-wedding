'use client';
import { useState } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

export default function VendorLoginPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCodeLogin = async () => {
    if (code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API}/api/vendor-login-codes/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        // Store vendor session in localStorage
        localStorage.setItem('vendor_session', JSON.stringify({
          vendorId: data.data.id,
          vendorName: data.data.name,
          category: data.data.category,
          city: data.data.city,
          plan: data.data.plan,
        }));
        window.location.href = '/vendor/dashboard';
      } else {
        setError(data.error || 'Invalid or expired code. Generate a new one from the app.');
      }
    } catch (e) {
      setError('Could not verify code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F5F0E8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <span style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: '22px', fontWeight: 300, color: '#2C2420',
            letterSpacing: '2px', textTransform: 'uppercase',
            display: 'block', marginBottom: '8px',
          }}>The Dream Wedding</span>
          <span style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '12px', color: '#8C7B6E',
            letterSpacing: '0.5px', fontStyle: 'italic',
          }}>Vendor Partner Portal</span>
        </div>

        <div style={{
          background: '#FFFFFF', border: '1px solid #E8E0D5',
          borderRadius: '20px', padding: '48px 40px', textAlign: 'center',
        }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '14px',
            backgroundColor: '#FFF8EC', border: '1px solid #E8D9B5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px', fontSize: '24px',
          }}>✦</div>

          <h1 style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: '28px', fontWeight: 300, color: '#2C2420',
            marginBottom: '10px', letterSpacing: '0.3px',
          }}>Welcome back</h1>

          <p style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '14px', color: '#8C7B6E',
            marginBottom: '36px', lineHeight: 1.6,
          }}>Open The Dream Wedding app → Overview → Generate Web Login Code. Enter it below.</p>

          <div style={{ marginBottom: '16px' }}>
            <input
              type="text"
              maxLength={6}
              placeholder="Enter 6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handleCodeLogin()}
              style={{
                width: '100%',
                padding: '18px 20px',
                fontSize: '28px',
                fontFamily: 'Playfair Display, serif',
                letterSpacing: '12px',
                textAlign: 'center',
                border: '2px solid #C9A84C',
                borderRadius: '12px',
                backgroundColor: '#FFF8EC',
                color: '#2C2420',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <p style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px', color: '#B5303A',
              marginBottom: '16px', lineHeight: 1.5,
            }}>{error}</p>
          )}

          <button
            onClick={handleCodeLogin}
            disabled={loading || code.length !== 6}
            style={{
              width: '100%',
              background: loading || code.length !== 6 ? '#8C7B6E' : '#2C2420',
              color: '#F5F0E8',
              fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
              fontWeight: 500, letterSpacing: '1px',
              padding: '16px 24px', borderRadius: '10px',
              border: 'none', cursor: loading || code.length !== 6 ? 'not-allowed' : 'pointer',
              textTransform: 'uppercase', transition: 'background 0.2s',
            }}
          >
            {loading ? 'Verifying...' : 'Enter Dashboard →'}
          </button>

          <div style={{
            marginTop: '32px', paddingTop: '24px',
            borderTop: '1px solid #E8E0D5',
          }}>
            <p style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px', color: '#8C7B6E', marginBottom: '4px',
            }}>Don't have the app yet?</p>
            <a href="/#download" style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px', color: '#C9A84C', textDecoration: 'none',
            }}>Download The Dream Wedding app →</a>
          </div>
        </div>

        <p style={{
          textAlign: 'center', fontFamily: 'DM Sans, sans-serif',
          fontSize: '12px', color: '#8C7B6E', marginTop: '32px', fontStyle: 'italic',
        }}>The Dream Wedding · vendor.thedreamwedding.in</p>
      </div>
    </div>
  );
}
