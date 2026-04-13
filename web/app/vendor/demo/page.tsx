'use client';
import { useEffect } from 'react';

export default function DemoPage() {
  useEffect(() => {
    localStorage.setItem('vendor_session', JSON.stringify({
      vendorId: '20792c76-b265-4063-a356-133ea1c6933b',
      vendorName: 'Dev Roy Productions',
      category: 'photographers',
      city: 'Delhi NCR',
      plan: 'premium',
    }));
    window.location.href = '/vendor/dashboard';
  }, []);
  return <div style={{background:'#F5F0E8',height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Playfair Display,serif',color:'#C9A84C',fontSize:'18px'}}>Loading demo...</div>;
}
