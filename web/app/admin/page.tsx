'use client';
import { useState, useCallback, useEffect } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';
const DEFAULT_PASSWORD = 'Mira@2551354';

const CODE_TYPES = [
  { value: 'vendor_permanent', label: 'Vendor Permanent', desc: 'Never expires · Full access', color: '#C9A84C' },
  { value: 'vendor_demo', label: 'Vendor Demo — 1hr', desc: 'For live demos', color: '#4CAF50' },
  { value: 'couple_demo', label: 'Couple Demo — 24hr', desc: 'For couple demos', color: '#2196F3' },
];

const PLANS = ['essential', 'signature', 'prestige'];

const TIER_INFO: Record<string, { label: string; rec: string; color: string }> = {
  essential: { label: 'Essential', rec: 'Recommended for Solo Vendors', color: '#8C7B6E' },
  signature: { label: 'Signature', rec: 'Recommended for Established Businesses', color: '#C9A84C' },
  prestige: { label: 'Prestige', rec: 'Invite Only', color: '#2C2420' },
};

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
  { id: 'waitlist', label: '📋 Waitlist' },
  { id: 'profile-tracking', label: '📈 Profile Completion' },
  { id: 'founding', label: '💎 Founding Vendors' },
  { id: 'tdw-ai', label: '✨ Dream Ai Access' },
];

const s: any = {
  page: { minHeight: '100vh', background: '#F5F0E8', fontFamily: 'system-ui, -apple-system, sans-serif' },
  header: { background: '#2C2420', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  tabBar: { background: '#fff', borderBottom: '1px solid #E8E0D5', padding: '0 12px', display: 'flex', gap: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
  tab: (a: boolean) => ({ padding: '12px 12px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap', color: a ? '#2C2420' : '#8C7B6E', borderBottom: a ? '2px solid #C9A84C' : '2px solid transparent', fontWeight: a ? 500 : 400, flexShrink: 0 }),
  content: { padding: '16px 12px', maxWidth: 1300, margin: '0 auto' },
  card: { background: '#fff', borderRadius: 12, border: '1px solid #E8E0D5', overflow: 'hidden', marginBottom: 16 },
  cardPad: { background: '#fff', borderRadius: 12, border: '1px solid #E8E0D5', padding: '16px 14px', marginBottom: 16 },
  th: { padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#8C7B6E', letterSpacing: 1, textTransform: 'uppercase', fontWeight: 500, background: '#FAFAFA', whiteSpace: 'nowrap' },
  td: { padding: '9px 10px', borderTop: '1px solid #F5F0E8', fontSize: 12, verticalAlign: 'middle' },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 20 },
  statCard: { background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid #E8E0D5' },
  pill: (bg: string, color: string) => ({ fontSize: 11, padding: '3px 9px', borderRadius: 50, background: bg, color, fontWeight: 500, display: 'inline-block' }),
  btnSm: (bg: string, color: string, border: string) => ({ fontSize: 11, padding: '5px 10px', borderRadius: 6, cursor: 'pointer', border: `1px solid ${border}`, background: bg, color, fontWeight: 400 }),
  input: { width: '100%', padding: '11px 14px', borderRadius: 9, border: '1px solid #E8E0D5', fontSize: 14, boxSizing: 'border-box' as const, outline: 'none' },
  primaryBtn: { padding: '12px 20px', background: '#2C2420', color: '#C9A84C', border: 'none', borderRadius: 9, cursor: 'pointer', fontSize: 13, letterSpacing: 1, fontWeight: 500 },
};

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [adminPassword, setAdminPassword] = useState(DEFAULT_PASSWORD);
  const [newPwd, setNewPwd] = useState('');
  const [aiVendors, setAiVendors] = useState<any[]>([]);
  const [foundingVendors, setFoundingVendors] = useState<any[]>([]);
  const [foundingFilter, setFoundingFilter] = useState<'all' | 'active' | 'stalled' | 'never_activated' | 'pending'>('all');
  const [userSearch, setUserSearch] = useState('');
  const loadUsers = async () => {
    try {
      const r = await fetch(API + '/api/users');
      const d = await r.json();
      if (d.success) setUsers(d.data || []);
    } catch {}
  };
  const deleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Delete user "${userName}"? This cannot be undone and will remove all their data (moodboard, planner, messages).`)) return;
    try {
      const r = await fetch(API + '/api/users/' + userId, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_password: 'Mira@2551354' }),
      });
      const d = await r.json();
      if (d.success) { alert('User deleted'); loadUsers(); }
      else alert('Failed: ' + (d.error || 'unknown'));
    } catch { alert('Network error'); }
  };
  const loadAiVendors = async () => {
    try {
      const r = await fetch(API + '/api/ai-access');
      const d = await r.json();
      if (d.success) setAiVendors(d.data || []);
    } catch {}
  };
  const loadFoundingVendors = async () => {
    try {
      const r = await fetch(API + '/api/admin/founding-vendors');
      const d = await r.json();
      if (d.success) setFoundingVendors(d.data || []);
    } catch {}
  };
  const saveFoundingNotes = async (vendorId: string, notes: string) => {
    try {
      await fetch(API + '/api/admin/founding-vendors/' + vendorId + '/notes', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
    } catch {}
  };
  const toggleAiAccess = async (vendor_id: string, enabled: boolean) => {
    try {
      await fetch(API + '/api/ai-access/grant', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id, enabled }) });
      loadAiVendors();
    } catch {}
  };
  const [activeTab, setActiveTab] = useState('dashboard');
  useEffect(() => { if (activeTab === 'tdw-ai') loadAiVendors(); }, [activeTab]);
  useEffect(() => { if (activeTab === 'users') loadUsers(); }, [activeTab]);
  useEffect(() => { if (activeTab === 'founding') loadFoundingVendors(); }, [activeTab]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
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
  const [tierVendorName, setTierVendorName] = useState('');
  const [tierNote, setTierNote] = useState('');
  const [tierGenerating, setTierGenerating] = useState(false);
  const [tierNewCode, setTierNewCode] = useState<any>(null);
  const [tierCodes, setTierCodes] = useState<any[]>([]);
  const [coupleName, setCoupleName] = useState('');
  const [coupleNote, setCoupleNote] = useState('');
  const [coupleGenerating, setCoupleGenerating] = useState(false);
  const [coupleNewCode, setCoupleNewCode] = useState<any>(null);
  const [coupleCodes, setCoupleCodes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [swipeLimit, setSwipeLimit] = useState('20');
  const [saveLimit, setSaveLimit] = useState('3');
  const [enquiryLimit, setEnquiryLimit] = useState('3');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [vendorTierSearch, setVendorTierSearch] = useState('');
  const [vendorTierResults, setVendorTierResults] = useState<any[]>([]);
  const [vendorTierSearching, setVendorTierSearching] = useState(false);
  const [vendorTierUpdating, setVendorTierUpdating] = useState('');
  const [activities, setActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [boardItems, setBoardItems] = useState<any[]>([]);
  const [showAddBoard, setShowAddBoard] = useState(false);
  const [boardType, setBoardType] = useState('spotlight');
  const [boardVendorName, setBoardVendorName] = useState('');
  const [boardTitle, setBoardTitle] = useState('');
  const [boardSubtitle, setBoardSubtitle] = useState('');
  const [boardImage, setBoardImage] = useState('');
  const [boardCategory, setBoardCategory] = useState('');
  const [boardCity, setBoardCity] = useState('');
  const [boardPromoText, setBoardPromoText] = useState('');
  const [boardPromoPrice, setBoardPromoPrice] = useState('');
  const [pendingPackages, setPendingPackages] = useState<any[]>([]);
  const [pendingPhotos, setPendingPhotos] = useState<any[]>([]);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [coupleSearch, setCoupleSearch] = useState('');
  const [coupleResults, setCoupleResults] = useState<any[]>([]);
  const [coupleSearching, setCoupleSearching] = useState(false);
  const [coupleUpdating, setCoupleUpdating] = useState('');
  const [waitlistData, setWaitlistData] = useState<any[]>([]);
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [codesRes, vendorsRes, tierCodesRes, coupleCodesRes] = await Promise.all([
        fetch(`${API}/api/access-codes`).then(r => r.json()).catch(() => ({ success: false })),
        fetch(`${API}/api/vendors`).then(r => r.json()).catch(() => ({ success: false })),
        fetch(`${API}/api/tier-codes`).then(r => r.json()).catch(() => ({ success: false })),
        fetch(`${API}/api/couple-codes`).then(r => r.json()).catch(() => ({ success: false })),
      ]);
      if (codesRes.success) setCodes(codesRes.data || []);
      loadPendingPhotos();
      loadPendingPackages();
      loadBoardItems();
      loadActivities();
      if (vendorsRes.success) setVendors(vendorsRes.data || []);
      if (tierCodesRes.success) setTierCodes(tierCodesRes.data || []);
      if (coupleCodesRes.success) setCoupleCodes(coupleCodesRes.data || []);
      // Load waitlist
      try { const wlRes = await fetch(`${API}/api/waitlist`).then(r => r.json()); if (wlRes.success) setWaitlistData(wlRes.data || []); } catch(e) {}
    } catch (e) {}
    setLoading(false);
  }, []);

  const handleVendorTierSearch = async () => {
    if (!vendorTierSearch.trim()) return;
    setVendorTierSearching(true);
    try {
      const res = await fetch(API + '/api/vendors?search=' + encodeURIComponent(vendorTierSearch.trim()));
      const data = await res.json();
      if (data.success) {
        const filtered = (data.data || []).filter((v: any) => v.name?.toLowerCase().includes(vendorTierSearch.toLowerCase()) || v.email?.toLowerCase().includes(vendorTierSearch.toLowerCase()) || v.phone?.includes(vendorTierSearch));
        setVendorTierResults(filtered.length > 0 ? filtered : data.data?.slice(0, 10) || []);
      } else { setVendorTierResults([]); }
    } catch (e) { setVendorTierResults([]); }
    setVendorTierSearching(false);
  };

  const handleVendorSetTier = async (vendorId: string, tier: string) => {
    setVendorTierUpdating(vendorId);
    try {
      await fetch(API + '/api/subscriptions/' + vendorId + '/tier', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      setVendorTierResults(prev => prev.map(v => v.id === vendorId ? { ...v, currentTier: tier } : v));
      alert('Vendor updated to ' + tier.charAt(0).toUpperCase() + tier.slice(1));
    } catch (e) { alert('Failed to update vendor tier'); }
    setVendorTierUpdating('');
  };

  const loadActivities = async () => {
    setActivitiesLoading(true);
    try {
      const res = await fetch(API + '/api/admin/activities?limit=30');
      const data = await res.json();
      if (data.success) setActivities(data.data || []);
    } catch (e) {}
    setActivitiesLoading(false);
  };

  const loadBoardItems = async () => {
    try {
      const res = await fetch(API + '/api/featured-boards');
      const data = await res.json();
      if (data.success) setBoardItems(data.data || []);
    } catch (e) {}
  };

  const handleCreateBoardItem = async () => {
    if (!boardTitle && !boardVendorName) return;
    try {
      await fetch(API + '/api/featured-boards', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board_type: boardType, vendor_name: boardVendorName, title: boardTitle || boardVendorName, subtitle: boardSubtitle, image_url: boardImage, category: boardCategory, city: boardCity, promo_text: boardPromoText, promo_price: boardPromoPrice }),
      });
      setBoardVendorName(''); setBoardTitle(''); setBoardSubtitle(''); setBoardImage(''); setBoardCategory(''); setBoardCity(''); setBoardPromoText(''); setBoardPromoPrice('');
      setShowAddBoard(false);
      loadBoardItems();
    } catch (e) { alert('Failed'); }
  };

  const handleDeleteBoardItem = async (id: string) => {
    try { await fetch(API + '/api/featured-boards/' + id, { method: 'DELETE' }); setBoardItems(prev => prev.filter(b => b.id !== id)); } catch (e) {}
  };

  const loadPendingPackages = async () => {
    try {
      const res = await fetch(API + '/api/destination-packages/pending');
      const data = await res.json();
      if (data.success) setPendingPackages(data.data || []);
    } catch (e) {}
  };

  const handlePackageApproval = async (pkgId: string, status: string) => {
    try {
      await fetch(API + '/api/destination-packages/' + pkgId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      setPendingPackages(prev => prev.filter(p => p.id !== pkgId));
    } catch (e) { alert('Failed'); }
  };

  const loadPendingPhotos = async () => {
    setPhotoLoading(true);
    try {
      const res = await fetch(API + '/api/ds/photos/pending');
      const data = await res.json();
      if (data.success) setPendingPhotos(data.data || []);
    } catch (e) {}
    setPhotoLoading(false);
  };

  const handlePhotoApproval = async (photoId: string, status: string, vendorId?: string) => {
    try {
      await fetch(API + '/api/ds/photos/' + photoId, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      setPendingPhotos(prev => prev.filter(p => p.id !== photoId));
    } catch (e) { alert('Failed to update photo status'); }
  };

  const handleDeleteCouple = async (userId: string, name: string) => {
    if (!confirm('Delete couple "' + name + '"? This cannot be undone.')) return;
    try {
      await fetch(API + '/api/admin/users/' + userId, { method: 'DELETE' });
      setCoupleResults(prev => prev.filter(u => u.id !== userId));
      alert('Deleted');
    } catch (e) { alert('Failed'); }
  };

  const handleDeleteVendor = async (vendorId: string, name: string) => {
    if (!confirm('Delete vendor "' + name + '"? This removes all their data.')) return;
    try {
      await fetch(API + '/api/admin/vendors/' + vendorId, { method: 'DELETE' });
      setVendorTierResults(prev => prev.filter(v => v.id !== vendorId));
      alert('Deleted');
    } catch (e) { alert('Failed'); }
  };

  const handleCoupleSearch = async () => {
    if (!coupleSearch.trim()) return;
    setCoupleSearching(true);
    try {
      const res = await fetch(API + '/api/admin/users/search?q=' + encodeURIComponent(coupleSearch.trim()));
      const data = await res.json();
      setCoupleResults(data.success ? data.data || [] : []);
    } catch (e) { setCoupleResults([]); }
    setCoupleSearching(false);
  };

  const handleCoupleSetTier = async (userId: string, tier: string) => {
    setCoupleUpdating(userId);
    const tokens = tier === 'elite' ? 9999 : tier === 'premium' ? 15 : 3;
    try {
      await fetch(API + '/api/admin/users/' + userId + '/tier', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couple_tier: tier, token_balance: tokens }),
      });
      setCoupleResults(prev => prev.map(u => u.id === userId ? { ...u, couple_tier: tier, token_balance: tokens } : u));
      alert('Updated to ' + (tier === 'elite' ? 'Platinum' : tier === 'premium' ? 'Gold' : 'Basic'));
    } catch (e) { alert('Failed'); }
    setCoupleUpdating('');
  };

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

  const generateTierCode = async (tier: 'essential' | 'signature' | 'prestige') => {
    // Name/nickname optional
    setTierGenerating(true); setTierNewCode(null);
    try {
      const res = await fetch(`${API}/api/tier-codes/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, vendor_name: tierVendorName || '', note: tierNote || (tierVendorName ? `${tier} trial for ${tierVendorName}` : `${tier} trial code`) }),
      });
      const data = await res.json();
      if (data.success) { setTierNewCode(data.data); setTierVendorName(''); setTierNote(''); loadAll(); }
      else alert('Failed to generate code');
    } catch (e) { alert('Network error'); } finally { setTierGenerating(false); }
  };

  const generateCoupleCode = async (tier: 'basic' | 'gold' | 'platinum') => {
    // Name/nickname optional
    setCoupleGenerating(true); setCoupleNewCode(null);
    try {
      const res = await fetch(`${API}/api/couple-codes/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, couple_name: coupleName || '', note: coupleNote || (coupleName ? `${tier} invite for ${coupleName}` : `${tier} invite code`) }),
      });
      const data = await res.json();
      if (data.success) { setCoupleNewCode(data.data); setCoupleName(''); setCoupleNote(''); loadAll(); }
      else alert('Failed to generate code');
    } catch (e) { alert('Network error'); } finally { setCoupleGenerating(false); }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(code); setTimeout(() => setCopied(''), 2000);
  };

  const updateTier = async (vendorId: string, tier: string) => {
    try {
      await fetch(`${API}/api/subscriptions/${vendorId}/tier`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tier }) });
      alert(`Tier updated to ${tier}`);
    } catch(e) { alert('Failed to update tier'); }
  };
  const toggleFoundingBadge = async (vendorId: string, current: boolean) => {
    try {
      await fetch(`${API}/api/subscriptions/${vendorId}/founding`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ founding_badge: !current }) });
      alert(current ? 'Founding badge removed' : 'Founding badge granted');
    } catch(e) { alert('Failed to update badge'); }
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
        <style>{`
          @media (max-width: 767px) {
            .admin-grid-2 { grid-template-columns: 1fr !important; }
            .admin-grid-3 { grid-template-columns: 1fr !important; }
            .admin-flex-wrap { flex-wrap: wrap !important; }
            .admin-flex-col { flex-direction: column !important; }
            .admin-table-wrap { overflow-x: auto !important; display: block !important; }
            .admin-hide-mobile { display: none !important; }
          }
        `}</style>
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
          <div style={{ display: 'grid', gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth < 768 ? '1fr' : '1fr 1fr', gap: 16 }}>
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
          {/* Tier-Based Vendor Onboarding */}
          <div style={{ ...s.cardPad, border: '2px solid #C9A84C', background: 'linear-gradient(135deg, #FFFDF7, #FFF8EC)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 2, color: '#C9A84C', textTransform: 'uppercase' }}>Vendor Onboarding</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#2C2420', marginBottom: 4 }}>Generate Tier Trial Code</div>
            <div style={{ fontSize: 12, color: '#8C7B6E', marginBottom: 20, lineHeight: 1.6 }}>Create a code for a vendor. They enter it at the login page to access their dashboard. Trial: 3 months or Aug 1, 2026.</div>
            <div className='admin-flex-col' style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <input placeholder="Nickname (optional)" value={tierVendorName} onChange={e => setTierVendorName(e.target.value)} style={{ ...s.input, flex: 1 }} />
              <input placeholder="Note (optional)" value={tierNote} onChange={e => setTierNote(e.target.value)} style={{ ...s.input, flex: 1 }} />
            </div>
            <div className='admin-flex-col' style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => generateTierCode('essential')} disabled={tierGenerating} style={{ flex: 1, padding: '14px 24px', background: '#8C7B6E', color: '#fff', border: 'none', borderRadius: 9, cursor: tierGenerating ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, letterSpacing: 0.5 }}>
                {tierGenerating ? 'Generating...' : 'Generate Essential Code'}
              </button>
              <button onClick={() => generateTierCode('signature')} disabled={tierGenerating} style={{ flex: 1, padding: '14px 24px', background: '#C9A84C', color: '#fff', border: 'none', borderRadius: 9, cursor: tierGenerating ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, letterSpacing: 0.5 }}>
                {tierGenerating ? 'Generating...' : 'Generate Signature Code'}
              </button>
              <button onClick={() => generateTierCode('prestige')} disabled={tierGenerating} style={{ flex: 1, padding: '14px 24px', background: '#2C2420', color: '#C9A84C', border: 'none', borderRadius: 9, cursor: tierGenerating ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, letterSpacing: 0.5 }}>
                {tierGenerating ? 'Generating...' : 'Generate Prestige Code'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <div style={{ fontSize: 11, color: '#8C7B6E' }}>Signature = Essential + GST, Payment Shield, exports, analytics</div>
              <div style={{ fontSize: 11, color: '#8C7B6E' }}>|</div>
              <div style={{ fontSize: 11, color: '#8C7B6E' }}>Prestige = Everything + Deluxe Suite (team, tasks, procurement)</div>
            </div>
            {tierNewCode && (
              <div style={{ marginTop: 16, background: '#2C2420', borderRadius: 10, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 10, color: '#8C7B6E', letterSpacing: 2, marginBottom: 4 }}>VENDOR TRIAL CODE — {(tierNewCode.tier || '').toUpperCase()}</div>
                  <div style={{ fontSize: 26, color: '#C9A84C', letterSpacing: 4, fontWeight: 300 }}>{tierNewCode.code}</div>
                  <div style={{ fontSize: 11, color: '#8C7B6E', marginTop: 4 }}>For: {tierNewCode.vendor_name || 'Vendor'} · Expires {tierNewCode.expires_at ? new Date(tierNewCode.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}</div>
                </div>
                <button onClick={() => copyCode(tierNewCode.code)} style={{ background: copied === tierNewCode.code ? '#4CAF50' : '#C9A84C', color: '#2C2420', border: 'none', borderRadius: 8, padding: '12px 20px', cursor: 'pointer', fontWeight: 500 }}>
                  {copied === tierNewCode.code ? 'Copied!' : 'Copy'}
                </button>
              </div>
            )}
            {tierCodes.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#2C2420', marginBottom: 8 }}>Recent Tier Codes ({tierCodes.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {tierCodes.slice(0, 10).map((tc: any) => {
                    const expired = tc.expires_at && new Date(tc.expires_at) < new Date();
                    return (
                      <div key={tc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: expired ? '#FFF5F5' : '#fff', border: '1px solid #E8E0D5' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 13, letterSpacing: 2, color: '#2C2420' }}>{tc.code}</span>
                          <span style={s.pill(tc.tier === 'prestige' ? '#2C242015' : '#C9A84C15', tc.tier === 'prestige' ? '#2C2420' : '#C9A84C')}>{tc.tier}</span>
                          <span style={{ fontSize: 12, color: '#8C7B6E' }}>{tc.vendor_name || ''}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, color: expired ? '#E57373' : '#8C7B6E' }}>{tc.used ? 'Used' : 'Unused'}</span>
                          <button onClick={() => copyCode(tc.code)} style={s.btnSm(copied === tc.code ? '#4CAF50' : '#fff', copied === tc.code ? '#fff' : '#2C2420', '#E8E0D5')}>{copied === tc.code ? 'Copied!' : 'Copy'}</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Couple Tier Invite Codes */}
          <div style={{ ...s.cardPad, border: '2px solid #E8D9B5', background: 'linear-gradient(135deg, #FAF6F0, #FFF8EC)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 2, color: '#C9A84C', textTransform: 'uppercase' }}>Couple Invites</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#2C2420', marginBottom: 4 }}>Generate Couple Invite Code</div>
            <div style={{ fontSize: 12, color: '#8C7B6E', marginBottom: 20, lineHeight: 1.6 }}>Create a code for a couple. They enter it at thedreamwedding.in/couple/login to access the platform with their assigned tier.</div>
            <div className='admin-flex-col' style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <input placeholder="Nickname (optional)" value={coupleName} onChange={(e: any) => setCoupleName(e.target.value)} style={{ ...s.input, flex: 1 }} />
              <input placeholder="Note (optional)" value={coupleNote} onChange={(e: any) => setCoupleNote(e.target.value)} style={{ ...s.input, flex: 1 }} />
            </div>
            <div className='admin-flex-col' style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => generateCoupleCode('basic')} disabled={coupleGenerating} style={{ flex: 1, padding: '14px 24px', background: '#8C7B6E', color: '#fff', border: 'none', borderRadius: 9, cursor: coupleGenerating ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, letterSpacing: 0.5 }}>
                {coupleGenerating ? 'Generating...' : 'Basic Access'}
              </button>
              <button onClick={() => generateCoupleCode('gold')} disabled={coupleGenerating} style={{ flex: 1, padding: '14px 24px', background: '#C9A84C', color: '#fff', border: 'none', borderRadius: 9, cursor: coupleGenerating ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, letterSpacing: 0.5 }}>
                {coupleGenerating ? 'Generating...' : 'Gold Access'}
              </button>
              <button onClick={() => generateCoupleCode('platinum')} disabled={coupleGenerating} style={{ flex: 1, padding: '14px 24px', background: '#2C2420', color: '#C9A84C', border: 'none', borderRadius: 9, cursor: coupleGenerating ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, letterSpacing: 0.5 }}>
                {coupleGenerating ? 'Generating...' : 'Platinum Access'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <div style={{ fontSize: 11, color: '#8C7B6E' }}>Basic = free access</div>
              <div style={{ fontSize: 11, color: '#8C7B6E' }}>|</div>
              <div style={{ fontSize: 11, color: '#8C7B6E' }}>Gold = paid features unlocked</div>
              <div style={{ fontSize: 11, color: '#8C7B6E' }}>|</div>
              <div style={{ fontSize: 11, color: '#8C7B6E' }}>Platinum = full access incl. Couture & DreamAi</div>
            </div>
            {coupleNewCode && (
              <div style={{ marginTop: 16, background: '#2C2420', borderRadius: 10, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 10, color: '#8C7B6E', letterSpacing: 2, marginBottom: 4 }}>COUPLE INVITE — {(coupleNewCode.tier || '').toUpperCase()}</div>
                  <div style={{ fontSize: 26, color: '#C9A84C', letterSpacing: 4, fontWeight: 300 }}>{coupleNewCode.code}</div>
                  <div style={{ fontSize: 11, color: '#8C7B6E', marginTop: 4 }}>For: {coupleNewCode.vendor_name || 'Couple'} · {(coupleNewCode.tier || 'basic').charAt(0).toUpperCase() + (coupleNewCode.tier || 'basic').slice(1)} access</div>
                </div>
                <button onClick={() => copyCode(coupleNewCode.code)} style={{ background: copied === coupleNewCode.code ? '#4CAF50' : '#C9A84C', color: '#2C2420', border: 'none', borderRadius: 8, padding: '12px 20px', cursor: 'pointer', fontWeight: 500 }}>
                  {copied === coupleNewCode.code ? 'Copied!' : 'Copy'}
                </button>
              </div>
            )}
            {coupleCodes.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#2C2420', marginBottom: 8 }}>Recent Couple Codes ({coupleCodes.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {coupleCodes.slice(0, 10).map((cc: any) => (
                    <div key={cc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: '#fff', border: '1px solid #E8E0D5' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 13, letterSpacing: 2, color: '#2C2420' }}>{cc.code}</span>
                        <span style={s.pill(cc.tier === 'platinum' ? '#2C242015' : cc.tier === 'gold' ? '#C9A84C15' : '#8C7B6E15', cc.tier === 'platinum' ? '#2C2420' : cc.tier === 'gold' ? '#C9A84C' : '#8C7B6E')}>{cc.tier}</span>
                        <span style={{ fontSize: 12, color: '#8C7B6E' }}>{cc.vendor_name || ''}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: '#8C7B6E' }}>{cc.used ? 'Used' : 'Unused'}</span>
                        <button onClick={() => copyCode(cc.code)} style={s.btnSm(copied === cc.code ? '#4CAF50' : '#fff', copied === cc.code ? '#fff' : '#2C2420', '#E8E0D5')}>{copied === cc.code ? 'Copied!' : 'Copy'}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={s.cardPad}>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#2C2420', marginBottom: 18 }}>Generate New Code</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }} className='admin-grid-3'>
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
              <table className='admin-table-wrap' style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
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
              <table className='admin-table-wrap' style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
                <thead><tr>{['Vendor', 'Category', 'City', 'Rating', 'Tier', 'Founding', 'Status', 'Verified', 'Featured', 'Actions'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {filteredVendors.map(v => (
                    <tr key={v.id} style={{ opacity: v.subscription_active ? 1 : 0.55 }}>
                      <td style={s.td}><div style={{ fontWeight: 500, color: '#2C2420' }}>{v.name}</div><div style={{ fontSize: 11, color: '#8C7B6E' }}>{v.review_count} reviews</div></td>
                      <td style={{ ...s.td, color: '#8C7B6E', textTransform: 'capitalize' }}>{v.category?.replace(/-/g, ' ')}</td>
                      <td style={{ ...s.td, color: '#8C7B6E' }}>{v.city}</td>
                      <td style={{ ...s.td, color: '#C9A84C' }}>★ {v.rating || 0}</td>
                      <td style={s.td}>
                        <select value={'essential'} onChange={e => updateTier(v.id, e.target.value)} style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid #E8E0D5', cursor: 'pointer', background: '#fff' }}>
                          <option value="essential">Essential</option><option value="signature">Signature</option><option value="prestige">Prestige</option>
                        </select>
                      </td>
                      <td style={s.td}>
                        <button onClick={() => toggleFoundingBadge(v.id, false)} style={s.btnSm('#FFF8EC', '#C9A84C', '#E8D9B5')}>Grant</button>
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
        {activeTab === 'users' && (<>
          <div style={{ marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
            <input placeholder="Search users by name, phone, email, Instagram..." value={userSearch} onChange={e => setUserSearch(e.target.value)} style={{ ...s.input, flex: 1 }} />
            <button onClick={loadUsers} style={s.btnSm('transparent', '#8C7B6E', '#8C7B6E')}>↻ Refresh</button>
          </div>
          <div style={s.card}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #E8E0D5', fontSize: 14, fontWeight: 500, color: '#2C2420' }}>
              Dreamers ({users.filter((u: any) => {
                const q = userSearch.toLowerCase();
                if (!q) return true;
                return (u.name||'').toLowerCase().includes(q) || (u.phone||'').includes(q) || (u.email||'').toLowerCase().includes(q) || (u.instagram||'').toLowerCase().includes(q);
              }).length} of {users.length})
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className='admin-table-wrap' style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                <thead><tr>{['Name', 'Phone', 'Email', 'Instagram', 'Tier', 'Tokens', 'Joined', 'Actions'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {users.filter((u: any) => {
                    const q = userSearch.toLowerCase();
                    if (!q) return true;
                    return (u.name||'').toLowerCase().includes(q) || (u.phone||'').includes(q) || (u.email||'').toLowerCase().includes(q) || (u.instagram||'').toLowerCase().includes(q);
                  }).map((u: any) => (
                    <tr key={u.id}>
                      <td style={s.td}>
                        <div style={{ fontWeight: 500, color: '#2C2420' }}>{u.name || '—'}</div>
                        <div style={{ fontSize: 10, color: '#8C7B6E' }}>{u.user_type || 'couple'}</div>
                      </td>
                      <td style={{ ...s.td, color: '#8C7B6E', fontSize: 12 }}>{u.phone || '—'}</td>
                      <td style={{ ...s.td, color: '#8C7B6E', fontSize: 12 }}>{u.email || '—'}</td>
                      <td style={{ ...s.td, color: '#8C7B6E', fontSize: 12 }}>{u.instagram || '—'}</td>
                      <td style={s.td}>
                        <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 50, background: u.couple_tier === 'platinum' ? '#C9A84C15' : u.couple_tier === 'gold' ? '#E8D9B515' : '#F5F0E8', color: u.couple_tier === 'platinum' ? '#C9A84C' : u.couple_tier === 'gold' ? '#B8963A' : '#8C7B6E', textTransform: 'capitalize' }}>
                          {u.couple_tier || 'basic'}
                        </span>
                      </td>
                      <td style={{ ...s.td, color: '#C9A84C', fontSize: 13 }}>{u.token_balance ?? 0}</td>
                      <td style={{ ...s.td, color: '#8C7B6E', fontSize: 11 }}>{u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN') : '—'}</td>
                      <td style={s.td}>
                        <button onClick={() => deleteUser(u.id, u.name || 'Unnamed')} style={s.btnSm('#FFF5F5', '#E57373', '#FFCDD2')}>Delete</button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#8C7B6E' }}>No users yet. They'll appear here as couples sign up.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>)}

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
              <table className='admin-table-wrap' style={{ width: '100%', borderCollapse: 'collapse' }}>
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
        {/* Activity Feed */}
        {activeTab === 'dashboard' && activities.length > 0 && (
          <div style={{ ...s.cardPad, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 500, color: '#2C2420' }}>Recent Activity</div>
              <button onClick={loadActivities} style={{ fontSize: 11, color: '#C9A84C', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>{activitiesLoading ? 'Loading...' : 'Refresh'}</button>
            </div>
            <div style={{ border: '1px solid #E8E0D5', borderRadius: 12, overflow: 'hidden', maxHeight: 400, overflowY: 'auto' }}>
              {activities.slice(0, 20).map((act: any, idx: number) => {
                const icon = act.type === 'vendor_registered' ? '🏪' : act.type === 'couple_registered' ? '💑' : act.type === 'photo_approval_requested' ? '📸' : act.type === 'tier_changed' ? '⭐' : '📋';
                const time = act.created_at ? new Date(act.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
                return (
                  <div key={act.id || idx} style={{ padding: '12px 16px', borderBottom: idx < Math.min(activities.length, 20) - 1 ? '1px solid #F5F0E8' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 18 }}>{icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: '#2C2420' }}>{act.description}</div>
                      <div style={{ fontSize: 10, color: '#8C7B6E' }}>{time}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'waitlist' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#2C2420' }}>Waitlist ({waitlistData.length})</div>
              <button onClick={async () => { setWaitlistLoading(true); try { const r = await fetch(`${API}/api/waitlist`).then(r => r.json()); if (r.success) setWaitlistData(r.data || []); } catch(e) {} setWaitlistLoading(false); }} style={{ ...s.btnSm('#2C2420', '#C9A84C', '#2C2420') }}>{waitlistLoading ? 'Loading...' : 'Refresh'}</button>
            </div>
            <div style={s.card}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    <th style={s.th}>Name</th><th style={s.th}>Email</th><th style={s.th}>Phone</th>
                    <th style={s.th}>Instagram</th><th style={s.th}>Type</th><th style={s.th}>Category</th>
                    <th style={s.th}>Source</th><th style={s.th}>Status</th><th style={s.th}>Date</th>
                  </tr></thead>
                  <tbody>
                    {waitlistData.length === 0 && <tr><td colSpan={9} style={{ ...s.td, textAlign: 'center', color: '#8C7B6E', padding: '32px' }}>No waitlist entries yet</td></tr>}
                    {waitlistData.map((w: any) => (
                      <tr key={w.id}>
                        <td style={s.td}>{w.name}</td>
                        <td style={s.td}>{w.email}</td>
                        <td style={s.td}>{w.phone || '—'}</td>
                        <td style={s.td}>{w.instagram || '—'}</td>
                        <td style={s.td}><span style={s.pill(w.type === 'vendor' ? '#C9A84C20' : '#2196F320', w.type === 'vendor' ? '#C9A84C' : '#2196F3')}>{w.type}</span></td>
                        <td style={s.td}>{w.category || '—'}</td>
                        <td style={s.td}>{w.source || '—'}</td>
                        <td style={s.td}><span style={s.pill(w.status === 'pending' ? '#FF980020' : '#4CAF5020', w.status === 'pending' ? '#FF9800' : '#4CAF50')}>{w.status}</span></td>
                        <td style={s.td}>{w.created_at ? new Date(w.created_at).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profile-tracking' && (
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#2C2420', marginBottom: 16 }}>Vendor Profile Completion</div>
            <div style={s.card}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    <th style={s.th}>Vendor</th><th style={s.th}>Category</th><th style={s.th}>City</th>
                    <th style={s.th}>Tier</th><th style={s.th}>Name</th><th style={s.th}>Price</th>
                    <th style={s.th}>Photos</th><th style={s.th}>Bio</th><th style={s.th}>Vibes</th>
                    <th style={s.th}>Instagram</th><th style={s.th}>Completion</th>
                  </tr></thead>
                  <tbody>
                    {vendors.length === 0 && <tr><td colSpan={11} style={{ ...s.td, textAlign: 'center', color: '#8C7B6E', padding: '32px' }}>No vendors yet</td></tr>}
                    {vendors.map((v: any) => {
                      const checks = [!!v.name, !!v.category, !!v.city, !!v.starting_price, (v.portfolio_images?.length || 0) >= 5, (v.portfolio_images?.length || 0) >= 15, !!v.about, (v.vibe_tags?.length || 0) > 0, !!v.instagram_url];
                      const pct = Math.round(checks.filter(Boolean).length / checks.length * 100);
                      const color = pct === 100 ? '#4CAF50' : pct >= 60 ? '#FF9800' : '#E57373';
                      return (
                        <tr key={v.id}>
                          <td style={s.td}>{v.name || '—'}</td>
                          <td style={s.td}>{v.category || '—'}</td>
                          <td style={s.td}>{v.city || '—'}</td>
                          <td style={s.td}><span style={s.pill('#C9A84C20', '#C9A84C')}>{v.tier || 'trial'}</span></td>
                          <td style={s.td}>{v.name ? '✓' : '✗'}</td>
                          <td style={s.td}>{v.starting_price ? '✓' : '✗'}</td>
                          <td style={s.td}>{v.portfolio_images?.length || 0}</td>
                          <td style={s.td}>{v.about ? '✓' : '✗'}</td>
                          <td style={s.td}>{v.vibe_tags?.length || 0}</td>
                          <td style={s.td}>{v.instagram_url ? '✓' : '✗'}</td>
                          <td style={s.td}><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '60px', height: '6px', background: '#F5F0E8', borderRadius: '3px', overflow: 'hidden' }}><div style={{ width: pct + '%', height: '100%', background: color, borderRadius: '3px' }} /></div><span style={{ fontSize: 11, color, fontWeight: 500 }}>{pct}%</span></div></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* FOUNDING VENDORS */}
        {activeTab === 'founding' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: '#2C2420', fontWeight: 400, letterSpacing: 0.5, marginBottom: 4 }}>Founding Vendors</div>
              <div style={{ fontSize: 12, color: '#8C7B6E', marginBottom: 14 }}>
                Live activation tracker for the founding cohort. Filter by status, click a vendor's notes to edit.
              </div>
              {/* Filter pills */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                {([
                  { k: 'all', label: 'All', count: foundingVendors.length },
                  { k: 'active', label: 'Active', count: foundingVendors.filter(v => v.status === 'active').length },
                  { k: 'stalled', label: 'Stalled', count: foundingVendors.filter(v => v.status === 'stalled').length },
                  { k: 'never_activated', label: 'Never activated', count: foundingVendors.filter(v => v.status === 'never_activated').length },
                  { k: 'pending', label: 'Pending', count: foundingVendors.filter(v => v.status === 'pending').length },
                ] as const).map(f => {
                  const sel = foundingFilter === f.k;
                  return (
                    <button key={f.k} onClick={() => setFoundingFilter(f.k as any)} style={{
                      padding: '6px 12px', borderRadius: 50,
                      background: sel ? '#2C2420' : 'transparent',
                      color: sel ? '#C9A84C' : '#8C7B6E',
                      border: sel ? '1px solid #C9A84C' : '1px solid rgba(140,123,110,0.3)',
                      fontSize: 12, cursor: 'pointer', fontWeight: sel ? 500 : 400,
                      letterSpacing: 0.3,
                    }}>{f.label} · {f.count}</button>
                  );
                })}
              </div>
            </div>

            <div style={s.card}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
                  <thead><tr>
                    <th style={s.th}>Vendor</th>
                    <th style={s.th}>Tier</th>
                    <th style={s.th}>Signed up</th>
                    <th style={s.th}>Profile</th>
                    <th style={s.th}>Dream Ai last used</th>
                    <th style={s.th}>Commands</th>
                    <th style={s.th}>Status</th>
                    <th style={s.th}>Swati's Notes</th>
                  </tr></thead>
                  <tbody>
                    {foundingVendors.length === 0 && (
                      <tr><td colSpan={8} style={{ ...s.td, textAlign: 'center', color: '#8C7B6E', padding: '32px' }}>
                        No founding vendors yet. Grant the founding badge from the Vendors tab to start tracking.
                      </td></tr>
                    )}
                    {foundingVendors
                      .filter(v => foundingFilter === 'all' || v.status === foundingFilter)
                      .map(v => {
                        const signedUp = v.created_at ? new Date(v.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—';
                        const lastWa = v.last_whatsapp_activity
                          ? (() => {
                              const diffMs = Date.now() - new Date(v.last_whatsapp_activity).getTime();
                              const h = Math.floor(diffMs / 3600000);
                              const d = Math.floor(h / 24);
                              if (h < 1) return 'Just now';
                              if (h < 24) return h + 'h ago';
                              if (d < 30) return d + 'd ago';
                              return new Date(v.last_whatsapp_activity).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                            })()
                          : 'Never';
                        const profilePctColor = v.profile_pct === 100 ? '#4CAF50' : v.profile_pct >= 60 ? '#C9A84C' : '#E57373';
                        const statusColor = ({
                          active: '#4CAF50',
                          stalled: '#E57373',
                          never_activated: '#FF9800',
                          pending: '#8C7B6E',
                        } as const)[v.status as 'active' | 'stalled' | 'never_activated' | 'pending'] || '#8C7B6E';
                        const statusBg = ({
                          active: '#4CAF5015',
                          stalled: '#E5737315',
                          never_activated: '#FF980015',
                          pending: '#F5F0E8',
                        } as const)[v.status as 'active' | 'stalled' | 'never_activated' | 'pending'] || '#F5F0E8';
                        const statusLabel = ({
                          active: 'Active',
                          stalled: 'Stalled',
                          never_activated: 'Never activated',
                          pending: 'Pending',
                        } as const)[v.status as 'active' | 'stalled' | 'never_activated' | 'pending'] || v.status;
                        return (
                          <tr key={v.id}>
                            <td style={s.td}>
                              <div style={{ fontWeight: 500, color: '#2C2420' }}>{v.name || '—'}</div>
                              <div style={{ fontSize: 11, color: '#8C7B6E' }}>{v.category?.replace(/-/g, ' ') || '—'} · {v.city || '—'}</div>
                            </td>
                            <td style={s.td}>
                              {v.tier === 'prestige' ? (
                                <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: 13, color: '#C9A84C', borderBottom: '1px solid #C9A84C', paddingBottom: 1, letterSpacing: 0.3 }}>Prestige</span>
                              ) : (
                                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', padding: '3px 10px', borderRadius: 50, background: 'transparent', color: v.tier === 'signature' ? '#A88B3A' : '#8C7B6E', border: v.tier === 'signature' ? '1px solid rgba(201,168,76,0.5)' : '1px solid rgba(140,123,110,0.3)' }}>
                                  {v.tier === 'signature' ? 'Signature' : 'Essential'}
                                </span>
                              )}
                            </td>
                            <td style={{ ...s.td, color: '#8C7B6E' }}>{signedUp}</td>
                            <td style={s.td}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 48, height: 5, background: '#F5F0E8', borderRadius: 3, overflow: 'hidden' }}>
                                  <div style={{ width: v.profile_pct + '%', height: '100%', background: profilePctColor }} />
                                </div>
                                <span style={{ fontSize: 11, color: profilePctColor, fontWeight: 500 }}>{v.profile_pct}%</span>
                              </div>
                            </td>
                            <td style={{ ...s.td, color: lastWa === 'Never' ? '#8C7B6E' : '#2C2420', fontSize: 12 }}>{lastWa}</td>
                            <td style={{ ...s.td, color: '#2C2420', fontSize: 12 }}>{v.ai_commands_used || 0}{v.ai_extra_tokens ? ' + ' + v.ai_extra_tokens : ''}</td>
                            <td style={s.td}>
                              <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 50, background: statusBg, color: statusColor, fontWeight: 500, display: 'inline-block' }}>
                                {statusLabel}
                              </span>
                            </td>
                            <td style={{ ...s.td, minWidth: 180 }}>
                              <input
                                type="text"
                                defaultValue={v.admin_notes || ''}
                                placeholder="Add note..."
                                onBlur={(e) => {
                                  if (e.target.value !== (v.admin_notes || '')) {
                                    saveFoundingNotes(v.id, e.target.value);
                                    v.admin_notes = e.target.value;
                                  }
                                }}
                                style={{
                                  width: '100%', padding: '6px 10px', fontSize: 12,
                                  border: '1px solid #E8E0D5', borderRadius: 6,
                                  background: '#FFFDF7', color: '#2C2420',
                                  outline: 'none',
                                }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Dream Ai ACCESS */}
        {activeTab === 'tdw-ai' && (<>
          <div style={{ marginBottom: 16, padding: 20, background: 'linear-gradient(135deg, #1A1410 0%, #2C2420 100%)', borderRadius: 14, border: '1px solid rgba(201,168,76,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ display: 'inline-block', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 50, padding: '3px 10px', fontSize: 9, fontWeight: 600, letterSpacing: 2, color: '#C9A84C', marginBottom: 10 }}>BETA · CONTROL PANEL</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: '#C9A84C', letterSpacing: 1.5, marginBottom: 4 }}>Dream Ai Access</div>
                <div style={{ fontSize: 12, color: 'rgba(250,246,240,0.6)', fontWeight: 300 }}>Grant or revoke WhatsApp AI assistant access per vendor.</div>
              </div>
              <button onClick={loadAiVendors} style={{ ...s.btnSm('transparent', '#C9A84C', '#C9A84C') }}>↻ Refresh</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 12 }}>
              {[
                { label: 'Active', value: aiVendors.filter((v: any) => v.ai_enabled).length, color: '#4CAF50' },
                { label: 'Waitlist', value: aiVendors.filter((v: any) => v.ai_access_requested && !v.ai_enabled).length, color: '#C9A84C' },
                { label: 'Total Commands', value: aiVendors.reduce((sum: number, v: any) => sum + (v.ai_commands_used || 0), 0), color: '#C9A84C' },
                { label: 'Total Vendors', value: aiVendors.length, color: '#8C7B6E' },
              ].map((stat, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 600, color: stat.color, fontFamily: "'Playfair Display', serif" }}>{stat.value}</div>
                  <div style={{ fontSize: 9, color: 'rgba(250,246,240,0.5)', letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Waitlist - vendors who requested access but not granted */}
          {aiVendors.filter((v: any) => v.ai_access_requested && !v.ai_enabled).length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#C9A84C', fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>⏳ Waitlist — Requested Access</div>
              <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(201,168,76,0.3)' }}>
                {aiVendors.filter((v: any) => v.ai_access_requested && !v.ai_enabled).map((v: any, i: number, arr: any[]) => (
                  <div key={v.id} style={{ padding: 14, borderBottom: i < arr.length - 1 ? '1px solid #E8E0D5' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#2C2420' }}>{v.name}</div>
                      <div style={{ fontSize: 11, color: '#8C7B6E', marginTop: 2 }}>{(v.category || '').replace(/-/g, ' ')} · {v.city} · {v.tier || 'Essential'}</div>
                      {v.ai_use_case && <div style={{ fontSize: 10, color: '#8C7B6E', marginTop: 4, fontStyle: 'italic' }}>"{v.ai_use_case}"</div>}
                    </div>
                    <button onClick={() => toggleAiAccess(v.id, true)} style={{ background: '#C9A84C', color: '#2C2420', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer', letterSpacing: 1 }}>GRANT ACCESS</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active users */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#4CAF50', fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>✓ Active Users</div>
            {aiVendors.filter((v: any) => v.ai_enabled).length === 0 ? (
              <div style={{ padding: 24, background: '#fff', borderRadius: 12, textAlign: 'center', color: '#8C7B6E', fontSize: 13 }}>No active users yet. Grant access from the waitlist above or the vendor list below.</div>
            ) : (
              <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(76,175,80,0.3)' }}>
                {aiVendors.filter((v: any) => v.ai_enabled).map((v: any, i: number, arr: any[]) => (
                  <div key={v.id} style={{ padding: 14, borderBottom: i < arr.length - 1 ? '1px solid #E8E0D5' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#2C2420' }}>{v.name}</div>
                      <div style={{ fontSize: 11, color: '#8C7B6E', marginTop: 2 }}>{(v.category || '').replace(/-/g, ' ')} · {v.city} · {v.tier || 'Essential'}</div>
                      <div style={{ fontSize: 10, color: '#4CAF50', marginTop: 4 }}>✓ Active · {v.ai_commands_used || 0} commands used</div>
                    </div>
                    <button onClick={() => { if (confirm('Revoke Dream Ai access for ' + v.name + '?')) toggleAiAccess(v.id, false); }} style={{ background: 'transparent', color: '#E57373', border: '1px solid #E57373', borderRadius: 8, padding: '8px 14px', fontSize: 11, fontWeight: 500, cursor: 'pointer', letterSpacing: 1 }}>REVOKE</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* All vendors - quick grant */}
          <div>
            <div style={{ fontSize: 11, color: '#8C7B6E', fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>All Vendors — Quick Grant</div>
            <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #E8E0D5' }}>
              {aiVendors.filter((v: any) => !v.ai_enabled && !v.ai_access_requested).length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#8C7B6E', fontSize: 13 }}>All vendors are either active or on the waitlist.</div>
              ) : aiVendors.filter((v: any) => !v.ai_enabled && !v.ai_access_requested).map((v: any, i: number, arr: any[]) => (
                <div key={v.id} style={{ padding: 14, borderBottom: i < arr.length - 1 ? '1px solid #E8E0D5' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#2C2420' }}>{v.name}</div>
                    <div style={{ fontSize: 11, color: '#8C7B6E', marginTop: 2 }}>{(v.category || '').replace(/-/g, ' ')} · {v.city} · {v.tier || 'Essential'}</div>
                  </div>
                  <button onClick={() => toggleAiAccess(v.id, true)} style={{ background: 'transparent', color: '#C9A84C', border: '1px solid #C9A84C', borderRadius: 8, padding: '8px 14px', fontSize: 11, fontWeight: 500, cursor: 'pointer', letterSpacing: 1 }}>+ GRANT</button>
                </div>
              ))}
            </div>
          </div>
        </>)}

        {activeTab === 'settings' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className='admin-grid-2'>
            <div style={{ ...s.cardPad, gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 500, color: '#2C2420', marginBottom: 4 }}>Featured Boards</div>
                  <div style={{ fontSize: 12, color: '#8C7B6E' }}>Manage Spotlight, Get Inspired, Look Book, Special Offers</div>
                </div>
                <button onClick={() => setShowAddBoard(!showAddBoard)} style={{ ...s.primaryBtn, whiteSpace: 'nowrap' as any }}>{showAddBoard ? 'Cancel' : '+ Add Item'}</button>
              </div>

              {showAddBoard && (
                <div style={{ border: '1px solid #E8E0D5', borderRadius: 12, padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <select value={boardType} onChange={(e: any) => setBoardType(e.target.value)} style={{ ...s.input }}>
                    <option value="spotlight">Spotlight</option>
                    <option value="get_inspired">Get Inspired</option>
                    <option value="look_book">Look Book</option>
                    <option value="special_offers">Special Offers</option>
                  </select>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }} className='admin-grid-2'>
                    <input placeholder="Vendor name" value={boardVendorName} onChange={(e: any) => setBoardVendorName(e.target.value)} style={{ ...s.input }} />
                    <input placeholder="Title (optional)" value={boardTitle} onChange={(e: any) => setBoardTitle(e.target.value)} style={{ ...s.input }} />
                    <input placeholder="Category" value={boardCategory} onChange={(e: any) => setBoardCategory(e.target.value)} style={{ ...s.input }} />
                    <input placeholder="City" value={boardCity} onChange={(e: any) => setBoardCity(e.target.value)} style={{ ...s.input }} />
                  </div>
                  <input placeholder="Subtitle / description" value={boardSubtitle} onChange={(e: any) => setBoardSubtitle(e.target.value)} style={{ ...s.input }} />
                  <input placeholder="Image URL" value={boardImage} onChange={(e: any) => setBoardImage(e.target.value)} style={{ ...s.input }} />
                  {boardType === 'special_offers' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }} className='admin-grid-2'>
                      <input placeholder="Promo text (e.g. 20% Off)" value={boardPromoText} onChange={(e: any) => setBoardPromoText(e.target.value)} style={{ ...s.input }} />
                      <input placeholder="Promo price" value={boardPromoPrice} onChange={(e: any) => setBoardPromoPrice(e.target.value)} style={{ ...s.input }} />
                    </div>
                  )}
                  <button onClick={handleCreateBoardItem} style={{ ...s.primaryBtn, width: '100%', textAlign: 'center' }}>ADD TO {boardType.replace('_', ' ').toUpperCase()}</button>
                </div>
              )}

              {['spotlight', 'get_inspired', 'look_book', 'special_offers'].map(type => {
                const typeItems = boardItems.filter(b => b.board_type === type);
                if (typeItems.length === 0) return null;
                return (
                  <div key={type} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#C9A84C', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>{type.replace('_', ' ')} ({typeItems.length})</div>
                    {typeItems.map((item: any) => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #F5F0E8' }}>
                        {item.image_url && <img src={item.image_url} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, color: '#2C2420', fontWeight: 500 }}>{item.vendor_name || item.title}</div>
                          <div style={{ fontSize: 11, color: '#8C7B6E' }}>{item.category}{item.city ? ' · ' + item.city : ''}</div>
                        </div>
                        <button onClick={() => handleDeleteBoardItem(item.id)} style={{ fontSize: 11, color: '#E57373', background: 'none', border: '1px solid #E57373', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Remove</button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            <div style={{ ...s.cardPad, gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 16, fontWeight: 500, color: '#2C2420', marginBottom: 4 }}>Destination Package Approvals</div>
              <div style={{ fontSize: 12, color: '#8C7B6E', marginBottom: 16 }}>Review event manager destination wedding packages</div>
              {pendingPackages.length === 0 ? (
                <div style={{ fontSize: 13, color: '#8C7B6E', textAlign: 'center', padding: 20, border: '1px solid #E8E0D5', borderRadius: 12 }}>No pending packages</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {pendingPackages.map((pkg: any) => (
                    <div key={pkg.id} style={{ border: '1px solid #E8E0D5', borderRadius: 12, padding: 16 }}>
                      <div style={{ fontSize: 15, color: '#2C2420', fontWeight: 500, marginBottom: 4 }}>{pkg.package_name}</div>
                      <div style={{ fontSize: 12, color: '#8C7B6E', marginBottom: 4 }}>{pkg.destination} · Rs.{(pkg.base_price || 0).toLocaleString('en-IN')} for {pkg.base_guest_count || 100} guests</div>
                      <div style={{ fontSize: 12, color: '#8C7B6E', marginBottom: 4 }}>By: {pkg.vendor_name || pkg.vendor_id?.slice(0, 8)}</div>
                      {pkg.description && <div style={{ fontSize: 11, color: '#8C7B6E', marginBottom: 4 }}>{pkg.description}</div>}
                      {pkg.inclusions?.length > 0 && <div style={{ fontSize: 11, color: '#C9A84C', marginBottom: 8 }}>{pkg.inclusions.join(' · ')}</div>}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handlePackageApproval(pkg.id, 'approved')} style={{ flex: 1, padding: 8, borderRadius: 8, border: 'none', backgroundColor: '#4CAF50', color: '#fff', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>Approve</button>
                        <button onClick={() => handlePackageApproval(pkg.id, 'rejected')} style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid #E57373', backgroundColor: '#fff', color: '#E57373', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ ...s.cardPad, gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 16, fontWeight: 500, color: '#2C2420', marginBottom: 4 }}>Featured Photo Approvals</div>
              <div style={{ fontSize: 12, color: '#8C7B6E', marginBottom: 16 }}>Review vendor photos submitted for the swipe deck</div>
              {pendingPhotos.length === 0 ? (
                <div style={{ fontSize: 13, color: '#8C7B6E', textAlign: 'center', padding: 20, border: '1px solid #E8E0D5', borderRadius: 12 }}>No pending photos to review</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className='admin-grid-2'>
                  {pendingPhotos.map((photo: any) => (
                    <div key={photo.id} style={{ border: '1px solid #E8E0D5', borderRadius: 12, overflow: 'hidden' }}>
                      {photo.photo_url && <img src={photo.photo_url} alt="" style={{ width: '100%', height: 180, objectFit: 'cover' }} />}
                      <div style={{ padding: 12 }}>
                        <div style={{ fontSize: 13, color: '#2C2420', fontWeight: 500 }}>{photo.description || 'Featured photo'}</div>
                        <div style={{ fontSize: 11, color: '#8C7B6E', marginBottom: 8 }}>Vendor: {photo.vendor_id?.slice(0, 8)}</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => handlePhotoApproval(photo.id, 'approved', photo.vendor_id)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', backgroundColor: '#4CAF50', color: '#fff', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>Approve</button>
                          <button onClick={() => handlePhotoApproval(photo.id, 'revision_needed', photo.vendor_id)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid #E57373', backgroundColor: '#fff', color: '#E57373', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>Reject</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={loadPendingPhotos} style={{ ...s.primaryBtn, width: '100%', textAlign: 'center', marginTop: 12 }}>{photoLoading ? 'Loading...' : 'REFRESH'}</button>
            </div>

            <div style={{ ...s.cardPad, gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 16, fontWeight: 500, color: '#2C2420', marginBottom: 4 }}>Vendor Tier Management</div>
              <div style={{ fontSize: 12, color: '#8C7B6E', marginBottom: 16 }}>Search vendor by name to change their subscription tier</div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <input type="text" placeholder="Search vendor by name..." value={vendorTierSearch} onChange={(e: any) => setVendorTierSearch(e.target.value)} onKeyDown={(e: any) => e.key === 'Enter' && handleVendorTierSearch()} style={{ ...s.input, flex: 1 }} />
                <button onClick={handleVendorTierSearch} disabled={vendorTierSearching} style={{ ...s.primaryBtn, whiteSpace: 'nowrap' as any }}>{vendorTierSearching ? 'Searching...' : 'SEARCH'}</button>
              </div>
              {vendorTierResults.length > 0 && (<div style={{ border: '1px solid #E8E0D5', borderRadius: 12, overflow: 'hidden' }}>{vendorTierResults.map((v: any, idx: number) => (<div key={v.id} style={{ padding: '14px 16px', borderBottom: idx < vendorTierResults.length - 1 ? '1px solid #F5F0E8' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><div style={{ flex: 1 }}><div style={{ fontSize: 14, color: '#2C2420', fontWeight: 500 }}>{v.name || 'No Name'}</div><div style={{ fontSize: 12, color: '#8C7B6E' }}>{v.category || ''} / {v.city || ''}</div><div style={{ fontSize: 11, color: '#C9A84C', marginTop: 2 }}>Current: {v.currentTier || 'essential'}</div></div><div style={{ display: 'flex', gap: 6 }}>{(['essential', 'signature', 'prestige'] as const).map(tier => { const isActive = (v.currentTier || 'essential') === tier; return (<button key={tier} onClick={() => !isActive && handleVendorSetTier(v.id, tier)} disabled={isActive || vendorTierUpdating === v.id} style={{ padding: '6px 14px', borderRadius: 50, border: '1px solid ' + (isActive ? '#C9A84C' : '#E8E0D5'), backgroundColor: isActive ? (tier === 'prestige' ? '#2C2420' : '#C9A84C') : '#FFFFFF', color: isActive ? (tier === 'prestige' ? '#C9A84C' : '#2C2420') : '#8C7B6E', fontSize: 11, fontWeight: 500, cursor: isActive ? 'default' : 'pointer', textTransform: 'capitalize' }}>{tier}</button>); })}</div></div>))}</div>)}
              {vendorTierResults.length === 0 && vendorTierSearch && !vendorTierSearching && (<div style={{ fontSize: 13, color: '#8C7B6E', textAlign: 'center', padding: 20 }}>No vendors found</div>)}
            </div>

            <div style={{ ...s.cardPad, gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 16, fontWeight: 500, color: '#2C2420', marginBottom: 4 }}>Couple Tier Management</div>
              <div style={{ fontSize: 12, color: '#8C7B6E', marginBottom: 16 }}>Search by phone, email, or name to change subscription tier</div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <input type="text" placeholder="Search by phone, email, or name..." value={coupleSearch} onChange={(e: any) => setCoupleSearch(e.target.value)} onKeyDown={(e: any) => e.key === 'Enter' && handleCoupleSearch()} style={{ ...s.input, flex: 1 }} />
                <button onClick={handleCoupleSearch} disabled={coupleSearching} style={{ ...s.primaryBtn, whiteSpace: 'nowrap' as any }}>{coupleSearching ? 'Searching...' : 'SEARCH'}</button>
              </div>
              {coupleResults.length > 0 && (<div style={{ border: '1px solid #E8E0D5', borderRadius: 12, overflow: 'hidden' }}>{coupleResults.map((user: any, idx: number) => (<div key={user.id} style={{ padding: '14px 16px', borderBottom: idx < coupleResults.length - 1 ? '1px solid #F5F0E8' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><div style={{ flex: 1 }}><div style={{ fontSize: 14, color: '#2C2420', fontWeight: 500 }}>{user.name || 'No Name'}</div><div style={{ fontSize: 12, color: '#8C7B6E' }}>{user.phone || ''}{user.email ? ' / ' + user.email : ''}</div><div style={{ fontSize: 11, color: '#C9A84C', marginTop: 2 }}>Current: {user.couple_tier === 'elite' ? 'Platinum' : user.couple_tier === 'premium' ? 'Gold' : 'Basic'} / {user.token_balance ?? 3} tokens</div></div><div style={{ display: 'flex', gap: 6 }}>{(['free', 'premium', 'elite'] as const).map(tier => { const label = tier === 'elite' ? 'Platinum' : tier === 'premium' ? 'Gold' : 'Basic'; const isActive = user.couple_tier === tier || (!user.couple_tier && tier === 'free'); return (<button key={tier} onClick={() => !isActive && handleCoupleSetTier(user.id, tier)} disabled={isActive || coupleUpdating === user.id} style={{ padding: '6px 14px', borderRadius: 50, border: '1px solid ' + (isActive ? '#C9A84C' : '#E8E0D5'), backgroundColor: isActive ? (tier === 'elite' ? '#2C2420' : '#C9A84C') : '#FFFFFF', color: isActive ? (tier === 'elite' ? '#C9A84C' : '#2C2420') : '#8C7B6E', fontSize: 11, fontWeight: 500, cursor: isActive ? 'default' : 'pointer' }}>{label}</button>); })}</div></div>))}</div>)}
              {coupleResults.length === 0 && coupleSearch && !coupleSearching && (<div style={{ fontSize: 13, color: '#8C7B6E', textAlign: 'center', padding: 20 }}>No users found</div>)}
            </div>

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
