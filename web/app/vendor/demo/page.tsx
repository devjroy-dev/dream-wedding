'use client';
import { useEffect } from 'react';

export default function DemoPage() {
  useEffect(() => {
    localStorage.setItem('vendor_session', JSON.stringify({
      vendorId: '20792c76-b265-4063-a356-133ea1c6933b',
      vendorName: 'Dev Roy Productions',
      category: 'content-creators',
      city: 'Delhi NCR',
      plan: 'premium',
    }));
    // Small delay to ensure localStorage is set before redirect
    setTimeout(() => {
      window.location.href = '/vendor/dashboard';
    }, 300);
  }, []);

  return (
    <div style={{
      background: '#0F1117',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
    }}>
      <div style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: '13px',
        fontWeight: 700,
        letterSpacing: '2.5px',
        color: '#C9A84C',
        textTransform: 'uppercase',
      }}>
        THE DREAM WEDDING
      </div>
      <div style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: '13px',
        color: 'rgba(255,255,255,0.4)',
      }}>
        Loading demo dashboard...
      </div>
    </div>
  );
}
