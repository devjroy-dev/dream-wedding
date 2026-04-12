'use client';
import { signIn } from 'next-auth/react';

export default function VendorLoginPage() {
  const handleGoogleLogin = async () => {
    await signIn('google', { callbackUrl: '/vendor/dashboard' });
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
            fontSize: '22px',
            fontWeight: 300,
            color: '#2C2420',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            display: 'block',
            marginBottom: '8px',
          }}>The Dream Wedding</span>
          <span style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '12px',
            color: '#8C7B6E',
            letterSpacing: '0.5px',
            fontStyle: 'italic',
          }}>Vendor Partner Portal</span>
        </div>

        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E8E0D5',
          borderRadius: '20px',
          padding: '48px 40px',
          textAlign: 'center',
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
          }}>Sign in with your Google account to access your vendor dashboard.</p>

          <button
            onClick={handleGoogleLogin}
            style={{
              width: '100%', background: '#2C2420', color: '#F5F0E8',
              fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
              fontWeight: 500, letterSpacing: '1px',
              padding: '16px 24px', borderRadius: '10px',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '12px',
              textTransform: 'uppercase',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div style={{
            marginTop: '32px', paddingTop: '24px',
            borderTop: '1px solid #E8E0D5',
          }}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#8C7B6E', marginBottom: '12px' }}>
              Not a vendor yet?
            </p>
            <a href="/#download" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#C9A84C', textDecoration: 'none' }}>
              Download the app to get started →
            </a>
          </div>
        </div>

        <p style={{
          textAlign: 'center', fontFamily: 'DM Sans, sans-serif',
          fontSize: '12px', color: '#8C7B6E', marginTop: '32px', fontStyle: 'italic',
        }}>The Dream Wedding · thedreamwedding.in</p>
      </div>
    </div>
  );
}
