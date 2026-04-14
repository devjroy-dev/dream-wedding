'use client';
import { useState, useCallback, useEffect } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';
const DEFAULT_PASSWORD = 'TDW@2026!Dev';

const CODE_TYPES = [
  { value: 'vendor_permanent', label: 'Vendor Permanent', desc: 'Never expires · Full access', color: '#C9A84C' },
  { value: 'vendor_demo', label: 'Vendor Demo — 1hr', desc: 'For live demos', color: '#4CAF50' },
  { value: 'couple_demo', label: 'Couple Demo — 24hr', desc: 'For couple demos', color: '#2196F3' },
];

const PLANS = ['basic', 'premium', 'elite', 'founding'];

const TABS = [
  { id: 'dashboard', label: '📊 Dashboard' },
  { id: 'codes', label: '🔑 Access Codes' },
  { id: 'vendors', label: '🏢 Vendors' },
  { id: 'users', label: '👥 Users' },
  { id: 'featured', label: '⭐ Featured' },
  { id: 'messages', label: '💬 Messages' },
  { id: 'flagged', label: '🚩 Flagged' },
  { id: 'notifications', label: '📣 Broadcast' },
  { id: 'settings', label: '⚙️ Settings' },
];

const s: any = {
  page: { minHeight: '100vh', background: '#F5F0E8', fontFamily: 'system-ui, -apple-system, sans-serif' },
  header: { background: '#2C2420', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  tabBar: { background: '#fff', borderBottom: '1px solid #E8E0D5', padding: '0 24px', display: 'flex', gap: 0, overflowX: 'auto' },
  tab: (a: boolean) => ({ padding: '12px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap', color: a ? '#2C2420' : '#8C7B6E', borderBottom: a ? '2px solid #C9A84C' : '2px solid transparent', fontWeight: a ? 500 : 400 }),
  content: { padding: 28, maxWidth: 1300, margin: '0 auto' },
  card: { background: '#fff', borderRadius: 12, border: '1px solid #E8E0D5', overflow: 'hidden', marginBottom: 20 },
  cardPad: { background: '#fff', borderRadius: 12, border: '1px solid #E8E0D5', padding: 24, marginBottom: 20 },
  th: { padding: '10px 14px', textAlign: 'left', fontSize: 11, color: '#8C7B6E', letterSpacing: 1, textTransform: 'uppercase', fontWeight: 500, background: '#FAFAFA', whiteSpace: 'nowrap' },
  td: { padding: '11px 14px', borderTop: '1px solid #F5F0E8', fontSize: 13, verticalAlign: 'middle' },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 },
  statCard: { background: '#fff', borderRadius: 12, padding: '18px 20px', border: '1px solid #E8E0D5' },
  pill: (bg: string, color: string) => ({ fontSize: 11, padding: '3px 9px', borderRadius: 50, background: bg, color, fontWeight: 500, display: 'inline-block' }),
  btnSm: (bg: string, color: string, border: string) => ({ fontSize: 12, padding: '5px 12px', borderRadius: 6, cursor: 'pointer', border: `1px solid ${border}`, background: bg, color, fontWeight: 400 }),
  input: { width: '100%', padding: '11px 14px', borderRadius: 9, border: '1px solid #E8E0D5', fontSize: 14, boxSizing: 'border-box' as const, outline: 'none' },
  primaryBtn: { padding: '12px 24px', background: '#2C2420', color: '#C9A84C', border: 'none', borderRadius: 9, cursor: 'pointer', fontSize: 13, letterSpacing: 1, fontWeight: 500 },
};

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [adminPassword, setAdminPassword] = useState(DEFAULT_PASSWORD);
  const [newPwd, setNewPwd] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [codes, setCodes] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState('vendor_permanent');
  const [note, setNote] = useState('');
  const [newCode, setNewCode] = useState<any>(null);
  const [copied, setCopied] = useState('');
  const [search, setSearch] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [swipeLimit, setSwipeLimit] = useState('20');
  const [saveLimit, setSaveLimit] = useState('3');
  const [enquiryLimit, setEnquiryLimit] = useState('3');
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [codesRes, vendorsRes] = await Promise.all([
        fetch(`${API}/api/access-codes`).then(r => r.json()).catch(() => ({ success: false })),
        fetch(`${API}/api/vendors`).then(r => r.json()).catch(() => ({ success: false })),
      ]);
      if (codesRes.success) setCodes(codesRes.data || []);
      if (vendorsRes.success) setVendors(vendorsRes.data || []);
    } catch (e) {}
    setLoading(false);
  }, []);

  const handleLogin = () => {
    if (password === adminPassword) { setAuthed(true); loadAll(); }
    else alert('Incorrect password');
  };

  const generateCode = async () => {
    setGenerating(true); setNewCode(null);
    try {
      const res = await fetch(`${API}/api/access-codes/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: selectedType, note: note || 'Admin panel' }),
      });
      const data = await res.json();
      if (data.success) { setNewCode(data.data); setNote(''); loadAll(); }
      else alert('Failed to generate code');
    } catch (e) { alert('Network error'); } finally { setGenerating(false); }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(code); setTimeout(() => setCopied(''), 2000);
  };

  const updateVendor = async (id: string, payload: any) => {
    await fetch(`${API}/api/vendors/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    loadAll();
  };

  const deleteVendor = async (id: string, name: string) => {
    if (!confirm(`Permanently delete ${name}?`)) return;
    await fetch(`${API}/api/vendors/${id}`, { method: 'DELETE' });
    loadAll();
  };

  const sendBroadcast = async () => {
    if (!broadcastTitle || !broadcastBody) { alert('Fill in title and message'); return; }
    setBroadcastSending(true);
    await new Promise(r => setTimeout(r, 1500));
    alert(`Broadcast sent to all users!\nTitle: ${broadcastTitle}\nMessage: ${broadcastBody}`);
    setBroadcastTitle(''); setBroadcastBody('');
    setBroadcastSending(false);
  };

  const filteredVendors = vendors.filter(v =>
    !search || v.name?.toLowerCase().includes(search.toLowerCase()) ||
    v.city?.toLowerCase().includes(search.toLowerCase()) ||
    v.category?.toLowerCase().includes(search.toLowerCase())
  );

  const flaggedVendors = vendors.filter(v => (v.rating > 0 && v.rating < 3.5) || (!v.is_verified && v.review_count > 10));
  const activeVendors = vendors.filter(v => v.subscription_active);
  const foundingPartners = vendors.filter(v => v.plan === 'founding');
  const featuredVendors = vendors.filter(v => v.is_featured);

  if (!authed) return (
    <div style={{ minHeight: '100vh', background: '#F5F0E8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 40, width: 360, boxShadow: '0 4px 40px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 10, color: '#8C7B6E', letterSpacing: 4, textTransform: 'uppercase', marginBottom: 8 }}>The Dream Wedding</div>
          <div style={{ fontSize: 30, color: '#2C2420', fontWeight: 300 }}>Admin Panel</div>
          <div style={{ height: 1, width: 40, background: '#C9A84C', margin: '10px auto 0' }} />
        </div>
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()} style={{ ...s.input, marginBottom: 12 }} />
        <button onClick={handleLogin} style={{ ...s.primaryBtn, width: '100%', textAlign: 'center' }}>ENTER</button>
      </div>
    </div>
  );

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <div style={{ fontSize: 10, color: '#C9A84C', letterSpacing: 4, textTransform: 'uppercase' }}>The Dream Wedding</div>
          <div style={{ fontSize: 20, color: '#F5F0E8', fontWeight: 300 }}>Admin Panel</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#8C7B6E' }}>{loading ? '⟳ Loading...' : `${vendors.length} vendors`}</span>
          <button onClick={loadAll} style={{ ...s.btnSm('transparent', '#8C7B6E', '#8C7B6E') }}>↻ Refresh</button>
          <button onClick={() => { setAuthed(false); setPassword(''); }} style={{ ...s.btnSm('transparent', '#E57373', '#E57373') }}>Sign Out</button>
        </div>
      </div>

      <div style={s.tabBar}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={s.tab(activeTab === tab.id)}>
            {tab.label}
            {tab.id === 'flagged' && flaggedVendors.length > 0 && (
              <span style={{ marginLeft: 5, background: '#E57373', color: '#fff', fontSize: 9, padding: '1px 5px', borderRadius: 50 }}>{flaggedVendors.length}</span>
            )}
          </button>
        ))}
      </div>

      <div style={s.content}>

        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (<>
          <div style={s.statGrid}>
            {[
              { l: 'Total Vendors', v: vendors.length, c: '#C9A84C' },
              { l: 'Active', v: activeVendors.length, c: '#4CAF50' },
              { l: 'Founding Partners', v: foundingPartners.length, c: '#C9A84C' },
              { l: 'Featured', v: featuredVendors.length, c: '#2196F3' },
              { l: 'Access Codes', v: codes.length, c: '#9C27B0' },
              { l: 'Flagged', v: flaggedVendors.length, c: '#E57373' },
            ].map(stat => (
              <div key={stat.l} style={s.statCard}>
                <div style={{ fontSize: 10, color: '#8C7B6E', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>{stat.l}</div>
                <div style={{ fontSize: 34, color: stat.c, fontWeight: 300 }}>{stat.v}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={s.cardPad}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#2C2420', marginBottom: 14 }}>Vendors by Category</div>
              {['photographers', 'mua', 'venues', 'designers', 'dj', 'choreographers', 'event-managers', 'jewellery', 'content-creators'].map(cat => {
                const count = vendors.filter(v => v.category === cat).length;
                return count > 0 ? (
                  <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #F5F0E8', fontSize: 13 }}>
                    <span style={{ color: '#8C7B6E', textTransform: 'capitalize' }}>{cat.replace(/-/g, ' ')}</span>
                    <span style={{ color: '#2C2420', fontWeight: 500 }}>{count}</span>
                  </div>
                ) : null;
              })}
            </div>
            <div style={{ background: '#2C2420', borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 10, color: '#C9A84C', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 14 }}>Platform Status</div>
              {[
                ['Backend', 'Railway', '#4CAF50'],
                ['Database', 'Supabase — Mumbai', '#4CAF50'],
                ['Web Portal', 'Vercel', '#4CAF50'],
                ['Domain', 'thedreamwedding.in', '#4CAF50'],
                ['Access Gate', 'Removed — Add back post-investor', '#9E9E9E'],
                ['Contact Filter', 'Active', '#4CAF50'],
                ['Freemium Gate', 'Removed — Add back post-investor', '#9E9E9E'],
                ['Play Store', 'Not Published Yet', '#C9A84C'],
              ].map(([label, val, color]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
                  <span style={{ color: '#8C7B6E' }}>{label}</span>
                  <span style={{ color }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </>)}

        {/* ACCESS CODES */}
        {activeTab === 'codes' && (<>
          <div style={s.cardPad}>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#2C2420', marginBottom: 18 }}>Generate New Code</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
              {CODE_TYPES.map(type => (
                <div key={type.value} onClick={() => setSelectedType(type.value)} style={{ padding: 16, borderRadius: 10, border: `2px solid ${selectedType === type.value ? type.color : '#E8E0D5'}`, background: selectedType === type.value ? type.color + '12' : '#FAFAFA', cursor: 'pointer' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#2C2420', marginBottom: 3 }}>{type.label}</div>
                  <div style={{ fontSize: 12, color: '#8C7B6E' }}>{type.desc}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <input placeholder="Note — vendor name, purpose..." value={note} onChange={e => setNote(e.target.value)} style={{ ...s.input, flex: 1 }} />
              <button onClick={generateCode} disabled={generating} style={s.primaryBtn}>{generating ? 'Generating...' : 'GENERATE'}</button>
            </div>
            {newCode && (
              <div style={{ marginTop: 16, background: '#2C2420', borderRadius: 10, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 10, color: '#8C7B6E', letterSpacing: 2, marginBottom: 4 }}>NEW CODE</div>
                  <div style={{ fontSize: 26, color: '#C9A84C', letterSpacing: 4, fontWeight: 300 }}>{newCode.code}</div>
                  {newCode.expires_at && <div style={{ fontSize: 11, color: '#8C7B6E', marginTop: 4 }}>Expires {new Date(newCode.expires_at).toLocaleString('en-IN')}</div>}
                </div>
                <button onClick={() => copyCode(newCode.code)} style={{ background: copied === newCode.code ? '#4CAF50' : '#C9A84C', color: '#2C2420', border: 'none', borderRadius: 8, padding: '12px 20px', cursor: 'pointer', fontWeight: 500 }}>
                  {copied === newCode.code ? 'Copied!' : 'Copy'}
                </button>
              </div>
            )}
          </div>
          <div style={s.card}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #E8E0D5', fontSize: 14, fontWeight: 500, color: '#2C2420' }}>All Codes ({codes.length})</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                <thead><tr>{['Code', 'Type', 'Note', 'Used', 'Expires', 'Action'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {codes.map(code => {
                    const expired = code.expires_at && new Date(code.expires_at) < new Date();
                    return (
                      <tr key={code.id} style={{ background: expired ? '#FFF5F5' : '#fff' }}>
                        <td style={s.td}><span style={{ fontFamily: 'monospace', fontSize: 14, letterSpacing: 2, color: '#2C2420' }}>{code.code}</span></td>
                        <td style={s.td}><span style={s.pill('#C9A84C20', '#C9A84C')}>{code.type?.replace(/_/g, ' ')}</span></td>
                        <td style={{ ...s.td, color: '#8C7B6E', maxWidth: 200 }}>{code.note || '—'}</td>
                        <td style={{ ...s.td, color: code.used_count > 0 ? '#4CAF50' : '#8C7B6E' }}>{code.used_count || 0}×</td>
                        <td style={{ ...s.td, color: expired ? '#E57373' : '#8C7B6E', fontSize: 12 }}>{code.expires_at ? new Date(code.expires_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '∞ Never'}</td>
                        <td style={s.td}><button onClick={() => copyCode(code.code)} style={s.btnSm(copied === code.code ? '#4CAF50' : '#fff', copied === code.code ? '#fff' : '#2C2420', '#E8E0D5')}>{copied === code.code ? 'Copied!' : 'Copy'}</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>)}

        {/* VENDORS */}
        {activeTab === 'vendors' && (<>
          <div style={{ marginBottom: 14 }}>
            <input placeholder="Search by name, city, category..." value={search} onChange={e => setSearch(e.target.value)} style={s.input} />
          </div>
          <div style={s.card}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #E8E0D5', fontSize: 14, fontWeight: 500, color: '#2C2420' }}>
              Vendors ({filteredVendors.length} of {vendors.length})
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
                <thead><tr>{['Vendor', 'Category', 'City', 'Rating', 'Plan', 'Status', 'Verified', 'Featured', 'Actions'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {filteredVendors.map(v => (
                    <tr key={v.id} style={{ opacity: v.subscription_active ? 1 : 0.55 }}>
                      <td style={s.td}><div style={{ fontWeight: 500, color: '#2C2420' }}>{v.name}</div><div style={{ fontSize: 11, color: '#8C7B6E' }}>{v.review_count} reviews</div></td>
                      <td style={{ ...s.td, color: '#8C7B6E', textTransform: 'capitalize' }}>{v.category?.replace(/-/g, ' ')}</td>
                      <td style={{ ...s.td, color: '#8C7B6E' }}>{v.city}</td>
                      <td style={{ ...s.td, color: '#C9A84C' }}>★ {v.rating || 0}</td>
                      <td style={s.td}>
                        <select value={v.plan || 'basic'} onChange={e => updateVendor(v.id, { plan: e.target.value })} style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid #E8E0D5', cursor: 'pointer', background: '#fff' }}>
                          {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </td>
                      <td style={s.td}>
                        <button onClick={() => updateVendor(v.id, { subscription_active: !v.subscription_active })} style={s.btnSm(v.subscription_active ? '#4CAF5015' : '#E5737315', v.subscription_active ? '#4CAF50' : '#E57373', 'transparent')}>
                          {v.subscription_active ? 'Active' : 'Blocked'}
                        </button>
                      </td>
                      <td style={s.td}>
                        <button onClick={() => updateVendor(v.id, { is_verified: !v.is_verified })} style={s.btnSm(v.is_verified ? '#C9A84C15' : '#F5F0E8', v.is_verified ? '#C9A84C' : '#8C7B6E', 'transparent')}>
                          {v.is_verified ? '✓ Verified' : 'Verify'}
                        </button>
                      </td>
                      <td style={s.td}>
                        <button onClick={() => updateVendor(v.id, { is_featured: !v.is_featured })} style={s.btnSm(v.is_featured ? '#2196F315' : '#F5F0E8', v.is_featured ? '#2196F3' : '#8C7B6E', 'transparent')}>
                          {v.is_featured ? '★ Yes' : 'Feature'}
                        </button>
                      </td>
                      <td style={s.td}>
                        <button onClick={() => deleteVendor(v.id, v.name)} style={s.btnSm('#FFF5F5', '#E57373', '#FFCDD2')}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>)}

        {/* USERS */}
        {activeTab === 'users' && (
          <div style={s.cardPad}>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#2C2420', marginBottom: 8 }}>Couple Accounts</div>
            <div style={{ fontSize: 13, color: '#8C7B6E', lineHeight: 1.8, marginBottom: 16 }}>
              User data is stored in Supabase. To view all users, go to your Supabase dashboard → Table Editor → users table.
              User blocking can be done from the Supabase dashboard or via Firebase Authentication console.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <a href="https://supabase.com/dashboard" target="_blank" style={{ display: 'block', padding: 16, background: '#1C1C1C', borderRadius: 10, textDecoration: 'none', color: '#4CAF50', fontWeight: 500, textAlign: 'center' }}>Open Supabase Dashboard →</a>
              <a href="https://console.firebase.google.com" target="_blank" style={{ display: 'block', padding: 16, background: '#FF6D00', borderRadius: 10, textDecoration: 'none', color: '#fff', fontWeight: 500, textAlign: 'center' }}>Open Firebase Console →</a>
            </div>
          </div>
        )}

        {/* FEATURED */}
        {activeTab === 'featured' && (<>
          <div style={s.cardPad}>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#2C2420', marginBottom: 6 }}>Editorial Featured Slots (4 max)</div>
            <div style={{ fontSize: 13, color: '#8C7B6E', marginBottom: 20 }}>These 4 vendors appear on the couple home screen as full-width editorial cards. Rs.4,999/month each.</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {featuredVendors.slice(0, 4).map((v, i) => (
                <div key={v.id} style={{ background: '#2C2420', borderRadius: 12, padding: 20 }}>
                  <div style={{ fontSize: 10, color: '#C9A84C', letterSpacing: 2, marginBottom: 4 }}>SLOT {i + 1}</div>
                  <div style={{ fontSize: 18, color: '#F5F0E8', fontWeight: 300 }}>{v.name}</div>
                  <div style={{ fontSize: 12, color: '#8C7B6E', marginTop: 4, marginBottom: 12 }}>{v.category} · {v.city}</div>
                  <button onClick={() => updateVendor(v.id, { is_featured: false })} style={s.btnSm('transparent', '#E57373', '#E57373')}>Remove from featured</button>
                </div>
              ))}
              {Array.from({ length: Math.max(0, 4 - featuredVendors.length) }).map((_, i) => (
                <div key={i} style={{ borderRadius: 12, padding: 20, border: '1px dashed #E8E0D5', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 100 }}>
                  <div style={{ fontSize: 13, color: '#8C7B6E', textAlign: 'center' }}>Empty slot<br /><span style={{ fontSize: 11 }}>Go to Vendors → click Feature</span></div>
                </div>
              ))}
            </div>
          </div>
          <div style={s.cardPad}>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#2C2420', marginBottom: 16 }}>Spotlight Score Leaderboard</div>
            {[...vendors].sort((a, b) => (b.review_count || 0) - (a.review_count || 0)).slice(0, 10).map((v, i) => (
              <div key={v.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F5F0E8', gap: 14 }}>
                <div style={{ fontSize: 20, color: i < 3 ? '#C9A84C' : '#8C7B6E', fontWeight: 300, width: 28 }}>#{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: '#2C2420', fontWeight: 500 }}>{v.name}</div>
                  <div style={{ fontSize: 12, color: '#8C7B6E' }}>{v.category} · {v.city}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, color: '#C9A84C' }}>★ {v.rating}</div>
                  <div style={{ fontSize: 11, color: '#8C7B6E' }}>{v.review_count} reviews</div>
                </div>
              </div>
            ))}
          </div>
        </>)}

        {/* MESSAGES */}
        {activeTab === 'messages' && (
          <div style={s.cardPad}>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#2C2420', marginBottom: 8 }}>Message Moderation</div>
            <div style={{ fontSize: 13, color: '#8C7B6E', lineHeight: 1.8, marginBottom: 20 }}>
              The contact filter is active and running on every message. Phone numbers, email addresses, Instagram handles and WhatsApp links are automatically replaced with <strong>[ contact hidden ]</strong> before storage.
            </div>
            <div style={{ background: '#2C2420', borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: '#C9A84C', letterSpacing: 2, marginBottom: 10 }}>CONTACT FILTER STATUS</div>
              {['Indian phone numbers (10 digit)', 'International format (+91...)', 'Email addresses', '@Instagram handles', 'WhatsApp links (wa.me)', 'Telegram mentions'].map(item => (
                <div key={item} style={{ fontSize: 13, color: '#4CAF50', lineHeight: 2 }}>✓ {item} — filtered</div>
              ))}
            </div>
            <div style={{ fontSize: 13, color: '#8C7B6E' }}>
              Contact details are shared automatically when a booking is confirmed. Payment Shield protects the vendor's final payment before the wedding day.
            </div>
            <div style={{ marginTop: 16 }}>
              <a href="https://supabase.com/dashboard" target="_blank" style={{ display: 'inline-block', padding: '10px 20px', background: '#1C1C1C', borderRadius: 9, textDecoration: 'none', color: '#4CAF50', fontWeight: 500, fontSize: 13 }}>View All Messages in Supabase →</a>
            </div>
          </div>
        )}

        {/* FLAGGED */}
        {activeTab === 'flagged' && (<>
          <div style={{ ...s.cardPad, background: '#FFF5F5', border: '1px solid #FFCDD2', marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#E57373', marginBottom: 8 }}>Auto-Flagging Criteria</div>
            <div style={{ fontSize: 13, color: '#8C7B6E', lineHeight: 1.8 }}>
              • Rating below 3.5 with existing reviews<br />
              • Unverified vendor with more than 10 reviews (suspicious)<br />
              • Coming soon: high decline rate, slow response time, auto-refunded bookings
            </div>
          </div>
          {flaggedVendors.length === 0 ? (
            <div style={{ ...s.cardPad, textAlign: 'center', color: '#4CAF50', fontSize: 14 }}>✓ No flagged vendors. Platform is clean.</div>
          ) : (
            <div style={s.card}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['Vendor', 'Rating', 'Reviews', 'Flag Reason', 'Actions'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {flaggedVendors.map(v => (
                    <tr key={v.id}>
                      <td style={s.td}><div style={{ fontWeight: 500, color: '#2C2420' }}>{v.name}</div><div style={{ fontSize: 11, color: '#8C7B6E' }}>{v.category} · {v.city}</div></td>
                      <td style={{ ...s.td, color: '#E57373' }}>★ {v.rating}</td>
                      <td style={{ ...s.td, color: '#8C7B6E' }}>{v.review_count}</td>
                      <td style={s.td}><span style={s.pill('#E5737320', '#E57373')}>{v.rating < 3.5 ? 'Low rating' : 'Review anomaly'}</span></td>
                      <td style={s.td}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => updateVendor(v.id, { subscription_active: false })} style={s.btnSm('#FFF5F5', '#E57373', '#FFCDD2')}>Block</button>
                          <button onClick={() => updateVendor(v.id, { plan: 'basic' })} style={s.btnSm('#fff', '#8C7B6E', '#E8E0D5')}>Downgrade</button>
                          <button onClick={() => updateVendor(v.id, { is_verified: false })} style={s.btnSm('#fff', '#8C7B6E', '#E8E0D5')}>Unverify</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>)}

        {/* BROADCAST */}
        {activeTab === 'notifications' && (
          <div style={{ maxWidth: 560 }}>
            <div style={s.cardPad}>
              <div style={{ fontSize: 16, fontWeight: 500, color: '#2C2420', marginBottom: 20 }}>Broadcast Notification</div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: '#8C7B6E', letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Title</label>
                <input placeholder="e.g. New feature live!" value={broadcastTitle} onChange={e => setBroadcastTitle(e.target.value)} style={s.input} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: '#8C7B6E', letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Message</label>
                <textarea placeholder="Your message to all users..." value={broadcastBody} onChange={e => setBroadcastBody(e.target.value)} rows={4}
                  style={{ ...s.input, resize: 'vertical' as const, fontFamily: 'inherit' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                {['All Users', 'Vendors Only', 'Couples Only'].map(target => (
                  <div key={target} style={{ padding: 12, borderRadius: 9, border: '1px solid #E8E0D5', textAlign: 'center', cursor: 'pointer', fontSize: 13, color: '#8C7B6E' }}>{target}</div>
                ))}
              </div>
              <button onClick={sendBroadcast} disabled={broadcastSending} style={{ ...s.primaryBtn, width: '100%', textAlign: 'center' }}>
                {broadcastSending ? 'Sending...' : 'SEND BROADCAST'}
              </button>
              <div style={{ fontSize: 12, color: '#8C7B6E', marginTop: 10, textAlign: 'center' }}>
                Push notifications require Expo push token setup. Coming fully in Build 2.
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {activeTab === 'settings' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={s.cardPad}>
              <div style={{ fontSize: 16, fontWeight: 500, color: '#2C2420', marginBottom: 20 }}>Change Admin Password</div>
              <input type="password" placeholder="New password (min 6 chars)" value={newPwd} onChange={e => setNewPwd(e.target.value)} style={{ ...s.input, marginBottom: 12 }} />
              <button onClick={() => {
                if (newPwd.length < 6) { alert('Min 6 characters'); return; }
                setAdminPassword(newPwd); setNewPwd('');
                alert('Password updated for this session.');
              }} style={{ ...s.primaryBtn, width: '100%', textAlign: 'center' }}>UPDATE PASSWORD</button>
              <div style={{ fontSize: 11, color: '#8C7B6E', marginTop: 8, textAlign: 'center' }}>Resets on server restart. For permanent change, update the code.</div>
            </div>

            <div style={s.cardPad}>
              <div style={{ fontSize: 16, fontWeight: 500, color: '#2C2420', marginBottom: 20 }}>Freemium Limits</div>
              {[
                { label: 'Daily Swipe Limit', value: swipeLimit, set: setSwipeLimit },
                { label: 'Moodboard Save Limit', value: saveLimit, set: setSaveLimit },
                { label: 'Enquiry Limit', value: enquiryLimit, set: setEnquiryLimit },
              ].map(item => (
                <div key={item.label} style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, color: '#8C7B6E', display: 'block', marginBottom: 5 }}>{item.label}</label>
                  <input type="number" value={item.value} onChange={e => item.set(e.target.value)} style={{ ...s.input }} />
                </div>
              ))}
              <button onClick={() => alert('Limits saved! (In production, these will update the database)')} style={{ ...s.primaryBtn, width: '100%', textAlign: 'center' }}>SAVE LIMITS</button>
            </div>

            <div style={s.cardPad}>
              <div style={{ fontSize: 16, fontWeight: 500, color: '#2C2420', marginBottom: 20 }}>Platform Controls</div>
              {[
                { label: 'Access Gate (Invite Only)', status: 'REMOVED', color: '#9E9E9E' },
                { label: 'Contact Filter', status: 'ON', color: '#4CAF50' },
                { label: 'Freemium Gating', status: 'REMOVED', color: '#9E9E9E' },
                { label: 'Play Store', status: 'Not Published', color: '#C9A84C' },
                { label: 'App Store / TestFlight', status: 'Not Configured', color: '#C9A84C' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F5F0E8' }}>
                  <span style={{ fontSize: 13, color: '#2C2420' }}>{item.label}</span>
                  <span style={s.pill(item.color + '20', item.color)}>{item.status}</span>
                </div>
              ))}
            </div>

            <div style={s.cardPad}>
              <div style={{ fontSize: 16, fontWeight: 500, color: '#2C2420', marginBottom: 20 }}>Quick Links</div>
              {[
                { label: 'Supabase Dashboard', url: 'https://supabase.com/dashboard', color: '#1C1C1C', textColor: '#4CAF50' },
                { label: 'Firebase Console', url: 'https://console.firebase.google.com', color: '#FF6D00', textColor: '#fff' },
                { label: 'Railway Dashboard', url: 'https://railway.app', color: '#0B0D0E', textColor: '#fff' },
                { label: 'Vercel Dashboard', url: 'https://vercel.com', color: '#000', textColor: '#fff' },
                { label: 'Cloudinary Console', url: 'https://cloudinary.com/console', color: '#3448C5', textColor: '#fff' },
                { label: 'Razorpay Dashboard', url: 'https://dashboard.razorpay.com', color: '#2D81F7', textColor: '#fff' },
              ].map(link => (
                <a key={link.label} href={link.url} target="_blank" style={{ display: 'block', padding: '10px 14px', background: link.color, borderRadius: 8, textDecoration: 'none', color: link.textColor, fontWeight: 500, fontSize: 13, marginBottom: 8 }}>
                  {link.label} →
                </a>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
