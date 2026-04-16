"""
Session 6 — Patch 1: Nav Collapse (5 → 4 tabs)
Discover · Moodboard · Planner · Inbox
Profile removed from nav (accessible via avatar top-right)
Active nav color changed to gold for luxury feel
"""
import re

# ── 1. Update theme.ts — couple nav tabs ──────────────────────────────────────

with open('constants/theme.ts', 'r') as f:
    content = f.read()

old_couple_tabs = """  couple: [
    { label: 'Home',      icon: 'home',           route: '/home'        },
    { label: 'Moodboard', icon: 'heart',          route: '/moodboard'   },
    { label: 'Messages',  icon: 'message-circle', route: '/messaging'   },
    { label: 'Planner',   icon: 'calendar',       route: '/bts-planner' },
    { label: 'Profile',   icon: 'user',           route: '/profile'     },
  ],"""

new_couple_tabs = """  couple: [
    { label: 'Discover',  icon: 'compass',        route: '/home'        },
    { label: 'Moodboard', icon: 'heart',          route: '/moodboard'   },
    { label: 'Planner',   icon: 'calendar',       route: '/bts-planner' },
    { label: 'Inbox',     icon: 'message-circle', route: '/messaging'   },
  ],"""

assert old_couple_tabs in content, "ERROR: Could not find couple nav tabs in theme.ts"
content = content.replace(old_couple_tabs, new_couple_tabs)

with open('constants/theme.ts', 'w') as f:
    f.write(content)

print("✓ theme.ts — couple nav updated to 4 tabs")

# ── 2. Rewrite BottomNav.tsx ──────────────────────────────────────────────────

bottomnav = """import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { TDW } from '../constants/theme';

const TABS = TDW.bottomNavTabs.couple;

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.nav}>
      {TABS.map((item) => {
        const isActive = item.route === pathname;
        return (
          <TouchableOpacity
            key={item.label}
            style={styles.item}
            onPress={() => {
              if (item.route && item.route !== pathname) {
                router.push(item.route as any);
              }
            }}
          >
            <Feather
              name={item.icon as any}
              size={TDW.icons.xl}
              color={isActive ? TDW.colors.gold : TDW.colors.greyMuted}
            />
            <Text style={[
              styles.label,
              isActive && styles.labelActive,
            ]}>
              {item.label}
            </Text>
            {isActive && <View style={styles.dot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    ...TDW.components.bottomNav as any,
  },
  item: {
    alignItems: 'center',
    gap: 4,
  },
  label: {
    ...TDW.typography.navLabel as any,
  },
  labelActive: {
    color: TDW.colors.gold,
    fontFamily: TDW.fonts.sansMedium,
  },
  dot: {
    ...TDW.components.navDot as any,
  },
});
"""

with open('components/BottomNav.tsx', 'w') as f:
    f.write(bottomnav)

print("✓ BottomNav.tsx — rewritten with gold active state, dynamic pathname matching")
print()
print("PATCH 1 COMPLETE")
print("Run: npx tsc --noEmit -p tsconfig.json")
print("Then check the bottom nav visually — should show 4 tabs with gold active state")
