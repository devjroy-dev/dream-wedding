#!/usr/bin/env python3
"""
TDW V5 — patch_plan.py
Run from the tdw-2 repo root in Dev's Codespace:
    python3 patch_plan.py

What it does:
  1. Replaces the static top pill nav (lines 3952-3967) with a wired version
     where ✦ AI navigates to dreamai screen.
  2. Replaces the MuseTab function (lines 3575-3672) with the V5 version
     that includes SURPRISE ME button + results bottom sheet.

No find/replace. Line numbers are exact from commit 86b3393.
Creates a backup at app/(couple)/plan.tsx.bak before writing.
"""

import shutil, sys

TARGET = "app/(couple)/plan.tsx"
BACKUP = "app/(couple)/plan.tsx.bak"

print(f"Reading {TARGET}...")
with open(TARGET, "r", encoding="utf-8") as f:
    lines = f.readlines()

total = len(lines)
print(f"  {total} lines read.")

# Sanity checks — abort if file has shifted unexpectedly
def check(line_idx, expected_fragment, label):
    actual = lines[line_idx].strip()
    if expected_fragment not in actual:
        print(f"\nERROR: {label}")
        print(f"  Expected to find: '{expected_fragment}'")
        print(f"  Got:              '{actual}'")
        print(f"  at line {line_idx + 1}")
        print("Aborting — file may have shifted. Do not apply patch.")
        sys.exit(1)
    print(f"  ✓ {label}")

# Line numbers are 1-based in the file; convert to 0-based for list indexing
check(3951, "Top pill nav", "Pill nav comment at line 3952")
check(3574, "function MuseTab", "MuseTab function start at line 3575")
check(3671, "}", "MuseTab closing brace at line 3672")

print("\nAll sanity checks passed. Creating backup...")
shutil.copy(TARGET, BACKUP)
print(f"  Backup saved to {BACKUP}")

# ── PATCH 1: Top pill nav ─────────────────────────────────────────────────
# Replace lines 3952-3967 (0-based: 3951-3966, inclusive)
# Original: static map over ['PLAN','AI','DISCOVER'] with no onPress handlers
# New: PLAN = non-tappable active view, AI = router.replace to dreamai, DISCOVER = stub

PILL_NAV_NEW = """\
      {/* Top pill nav — PLAN · AI · DISCOVER */}
      <View style={styles.topPillNav}>
        <View style={[styles.topPill, styles.topPillActive]}>
          <Text style={[styles.topPillText, styles.topPillTextActive]}>PLAN</Text>
        </View>
        <TouchableOpacity
          style={styles.topPill}
          activeOpacity={0.85}
          onPress={() => router.replace('/(couple)/dreamai')}
        >
          <Text style={[styles.topPillText, styles.topPillTextAi]}>✦ AI</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.topPill}
          activeOpacity={0.85}
        >
          <Text style={styles.topPillText}>DISCOVER</Text>
        </TouchableOpacity>
      </View>
"""

lines[3951:3967] = [PILL_NAV_NEW]
print("\nPatch 1 applied: top pill nav wired.")

# Re-read line count after first splice (line numbers shifted)
# MuseTab was at 3575-3672 originally. After patch 1 we replaced 16 lines (3952-3967)
# with 1 block — so we lost 15 lines. But MuseTab (3575-3672) is BEFORE the pill nav
# (3952), so MuseTab indices are unchanged.

# ── PATCH 2: MuseTab with SURPRISE ME ────────────────────────────────────
# Replace lines 3575-3672 (0-based: 3574-3671, inclusive)

MUSE_TAB_NEW = """\
function MuseTab({ userId }: { userId: string }) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<MuseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState('');
  const [surpriseLoading, setSurpriseLoading] = useState(false);
  const [surpriseResults, setSurpriseResults] = useState<string[]>([]);
  const [surpriseSheetOpen, setSurpriseSheetOpen] = useState(false);
  const [savingFromSurprise, setSavingFromSurprise] = useState<string | null>(null);

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }

  useEffect(() => {
    setLoading(true);
    fetch(`${RAILWAY_URL}/api/couple/muse/${userId}`)
      .then(r => r.json())
      .then(d => { setItems(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId]);

  async function handleRemove(id: string) {
    setRemoving(id);
    await fetch(`${RAILWAY_URL}/api/couple/muse/${id}`, { method: 'DELETE' }).catch(() => {});
    setItems(prev => prev.filter(i => i.id !== id));
    setRemoving(null);
  }

  async function handleCameraCapture() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission denied', 'Enable Camera access in Settings.'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
    if (result.canceled || !result.assets?.[0]) return;
    setUploading(true);
    showToast('Uploading to Muse...');
    try {
      const cloudUrl = await uploadToCloudinary(result.assets[0].uri);
      const res = await fetch(`${RAILWAY_URL}/api/couple/muse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couple_id: userId, image_url: cloudUrl, vendor_id: null, function_tag: 'inspiration' }),
      });
      const json = await res.json();
      if (json.success !== false) {
        fetch(`${RAILWAY_URL}/api/couple/muse/${userId}`).then(r => r.json()).then(d => setItems(d.data || []));
        showToast('Saved to Muse ✓');
      } else { showToast('Could not save image'); }
    } catch { showToast('Upload failed'); }
    finally { setUploading(false); }
  }

  async function handleSurpriseMe() {
    if (surpriseLoading || items.length === 0) return;
    setSurpriseLoading(true);
    try {
      const saves = items.slice(0, 10).map(item => item.image_url || item.source_url || '').filter(Boolean);
      const res = await fetch(`${RAILWAY_URL}/api/v2/dreamai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          userType: 'couple',
          message: `Based on these ${saves.length} images from my Muse board: ${saves.join(', ')} — describe my wedding aesthetic in one sentence, then find 3-5 similar inspiration images via web search. Respond ONLY with valid JSON: {"aesthetic": "...", "urls": ["...", "..."]}`,
          context: null,
        }),
      });
      const json = await res.json();
      const text = json.reply || '';
      const match = text.match(/\\{[\\s\\S]*"urls"[\\s\\S]*\\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        setSurpriseResults(parsed.urls || []);
        setSurpriseSheetOpen(true);
      } else {
        showToast('DreamAi could not find inspiration right now.');
      }
    } catch {
      showToast('Something went wrong. Please try again.');
    } finally {
      setSurpriseLoading(false);
    }
  }

  async function saveSurpriseUrl(url: string) {
    setSavingFromSurprise(url);
    try {
      const res = await fetch(`${RAILWAY_URL}/api/couple/muse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couple_id: userId, image_url: url, vendor_id: null, function_tag: 'inspiration' }),
      });
      const json = await res.json();
      if (json.success !== false) {
        fetch(`${RAILWAY_URL}/api/couple/muse/${userId}`).then(r => r.json()).then(d => setItems(d.data || []));
        showToast('Saved to Muse ✓');
      }
    } catch {
      showToast('Could not save.');
    } finally {
      setSavingFromSurprise(null);
    }
  }

  if (loading) return (
    <View style={{ paddingTop: 12 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {[0,1,2,3].map(i => <Shimmer key={i} height={160} width="48%" borderRadius={12} />)}
      </View>
    </View>
  );

  if (items.length === 0) return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>Your board is empty.</Text>
      <Text style={styles.emptyStateBody}>Save vendors from Discover, or use the camera to capture inspiration.</Text>
      <TouchableOpacity onPress={handleCameraCapture} disabled={uploading} style={{ borderWidth: 0.5, borderColor: '#E2DED8', borderRadius: 100, paddingVertical: 6, paddingHorizontal: 14, marginTop: 16 }} activeOpacity={0.8}>
        <Text style={{ fontFamily: 'DMSans_300Light', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: uploading ? '#C9A84C' : '#888580' }}>
          {uploading ? 'UPLOADING...' : '📷 TAKE PHOTO'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontFamily: 'DMSans_300Light', fontSize: 10, letterSpacing: 1.8, textTransform: 'uppercase', color: '#C8C4BE' }}>{items.length} SAVED</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity
              onPress={handleSurpriseMe}
              disabled={surpriseLoading || items.length === 0}
              style={{ borderWidth: 0.5, borderColor: '#C9A84C', borderRadius: 100, paddingVertical: 4, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 10 }}>✦</Text>
              <Text style={{ fontFamily: 'DMSans_300Light', fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: '#C9A84C' }}>
                {surpriseLoading ? '...' : 'SURPRISE ME'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCameraCapture} disabled={uploading} style={{ borderWidth: 0.5, borderColor: '#E2DED8', borderRadius: 100, paddingVertical: 4, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }} activeOpacity={0.8}>
              <Text style={{ fontSize: 12 }}>{uploading ? '⏳' : '📷'}</Text>
              <Text style={{ fontFamily: 'DMSans_300Light', fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: uploading ? '#C9A84C' : '#888580' }}>
                {uploading ? 'UPLOADING' : 'TAKE PHOTO'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2-column grid with native gesture interaction */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {items.map(item => (
            <MuseCard
              key={item.id}
              item={item}
              onRemove={() => handleRemove(item.id)}
              removing={removing === item.id}
            />
          ))}
        </View>
      </ScrollView>

      {/* SURPRISE ME results bottom sheet */}
      <Modal visible={surpriseSheetOpen} transparent animationType="slide" onRequestClose={() => setSurpriseSheetOpen(false)}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setSurpriseSheetOpen(false)} />
        <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 48 }}>
          <Text style={{ fontFamily: 'CormorantGaramond_300Light', fontSize: 20, fontStyle: 'italic', color: '#111111', marginBottom: 4 }}>Your aesthetic, expanded.</Text>
          <Text style={{ fontFamily: 'DMSans_300Light', fontSize: 13, color: '#8C8480', marginBottom: 20 }}>DreamAi found these based on your board. Tap any to save.</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {surpriseResults.map((url, i) => (
              <TouchableOpacity
                key={i}
                activeOpacity={0.85}
                onPress={() => saveSurpriseUrl(url)}
                disabled={savingFromSurprise === url}
                style={{ width: '46%', height: 140, borderRadius: 12, overflow: 'hidden', borderWidth: 0.5, borderColor: '#E2DED8', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F7F5' }}
              >
                {savingFromSurprise === url
                  ? <Text style={{ fontFamily: 'DMSans_300Light', fontSize: 10, color: '#C9A84C' }}>SAVING...</Text>
                  : <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                }
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {toast ? <View style={styles.toast} pointerEvents="none"><Text style={styles.toastText}>{toast}</Text></View> : null}
    </>
  );
}
"""

lines[3574:3672] = [MUSE_TAB_NEW]
print("Patch 2 applied: MuseTab with SURPRISE ME.")

# ── Write output ──────────────────────────────────────────────────────────
print(f"\nWriting patched file to {TARGET}...")
with open(TARGET, "w", encoding="utf-8") as f:
    f.writelines(lines)

print(f"Done. Backup is at {BACKUP}")
print("\nNext step: run `eas update --branch production --message \"V5: DreamAi + SURPRISE ME pill nav wired\"`")
