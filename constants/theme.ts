/**
 * The Dream Wedding — Centralised Design System
 * 
 * Single source of truth for colors, typography, spacing, radii,
 * shadows, and layout tokens across the entire mobile app.
 * 
 * Usage:  import { TDW } from '../constants/theme';
 *         style={{ backgroundColor: TDW.colors.cream }}
 * 
 * Web portal CSS variables (globals.css) must mirror these values.
 * Supabase column names use snake_case matching TDW.schema.
 */

import { Platform } from 'react-native';

// ── Brand Colors ────────────────────────────────────────────────────────────

const colors = {
  // Core brand
  cream:        '#F5F0E8',
  creamDark:    '#EDE8DF',
  gold:         '#C9A84C',
  dark:         '#2C2420',
  grey:         '#8C7B6E',
  greyLight:    '#C4B8AC',
  greyMuted:    '#B8ADA4',

  // Surfaces
  white:        '#FFFFFF',
  lightGold:    '#FFF8EC',
  goldBorder:   '#E8D9B5',
  border:       '#E8E0D5',

  // Semantic
  success:      '#4CAF50',
  error:        '#E57373',
  errorDark:    '#DC2626',
  whatsapp:     '#25D366',
  google:       '#4285F4',
  apple:        '#000000',

  // Overlays
  overlay:      'rgba(20,12,4,0.42)',
  overlayDark:  'rgba(0,0,0,0.5)',
  overlayLight: 'rgba(255,255,255,0.15)',

  // Shadow base
  shadowColor:  '#2C2420',
} as const;

// ── Typography ──────────────────────────────────────────────────────────────

const fonts = {
  playfair:     'PlayfairDisplay_400Regular',
  playfairBold: 'PlayfairDisplay_600SemiBold',
  sans:         'DMSans_400Regular',
  sansLight:    'DMSans_300Light',
  sansMedium:   'DMSans_500Medium',
} as const;

const typography = {
  hero: {
    fontFamily: fonts.playfair,
    fontSize: 34,
    color: colors.dark,
    letterSpacing: 0.3,
    lineHeight: 42,
  },
  title: {
    fontFamily: fonts.playfair,
    fontSize: 24,
    color: colors.dark,
    letterSpacing: 0.3,
  },
  sectionTitle: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.grey,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },
  heading: {
    fontFamily: fonts.playfair,
    fontSize: 16,
    color: colors.dark,
    letterSpacing: 0.2,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.dark,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontFamily: fonts.sansLight,
    fontSize: 13,
    color: colors.grey,
    letterSpacing: 0.2,
  },
  caption: {
    fontFamily: fonts.sansLight,
    fontSize: 11,
    color: colors.grey,
    letterSpacing: 0.3,
  },
  fieldLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.grey,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
  button: {
    fontFamily: fonts.sansLight,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },
  navLabel: {
    fontFamily: fonts.sansLight,
    fontSize: 11,
    color: colors.grey,
    letterSpacing: 0.3,
  },
  number: {
    fontFamily: fonts.playfairBold,
    fontSize: 22,
    color: colors.gold,
    letterSpacing: 0.5,
  },
} as const;

// ── Spacing ─────────────────────────────────────────────────────────────────

const spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  xxxl: 28,
  page: 24,
  section: 28,
  cardInner: 18,
  rowVertical: 20,
} as const;

// ── Border Radii ────────────────────────────────────────────────────────────

const radii = {
  sm:   8,
  md:   10,
  lg:   12,
  xl:   16,
  pill: 50,
  circle: 9999,
} as const;

// ── Shadows ─────────────────────────────────────────────────────────────────

const shadows = {
  card: {
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  subtle: {
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
} as const;

// ── Common Component Styles ─────────────────────────────────────────────────

const components = {
  screen: {
    flex: 1 as const,
    backgroundColor: colors.cream,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden' as const,
    ...shadows.card,
  },
  cardGold: {
    backgroundColor: colors.lightGold,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    overflow: 'hidden' as const,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.lightGold,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: colors.goldBorder,
  },
  circleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonPrimary: {
    width: '100%' as const,
    backgroundColor: colors.dark,
    borderRadius: radii.md,
    paddingVertical: 16,
    alignItems: 'center' as const,
  },
  buttonDisabled: {
    backgroundColor: colors.greyLight,
  },
  buttonGold: {
    backgroundColor: colors.gold,
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center' as const,
  },
  buttonOutline: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: 15,
    alignItems: 'center' as const,
    backgroundColor: colors.white,
  },
  input: {
    fontSize: 16,
    color: colors.dark,
    fontFamily: fonts.playfair,
    paddingVertical: 4,
    letterSpacing: 0.2,
  },
  searchBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
    ...shadows.subtle,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  modalOverlay: {
    flex: 1 as const,
    justifyContent: 'flex-end' as const,
    backgroundColor: colors.overlayDark,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: 40,
    gap: spacing.md,
  },
  bottomNav: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    paddingVertical: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.cream,
    position: 'absolute' as const,
    bottom: 0,
    width: '100%' as const,
  },
  navDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gold,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.dark,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  pill: {
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
  },
  badge: {
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 11,
    fontFamily: fonts.sansMedium,
  },
} as const;

// ── Icon Sizes ──────────────────────────────────────────────────────────────

const icons = {
  xs:  12,
  sm:  14,
  md:  16,
  lg:  18,
  xl:  20,
  xxl: 24,
} as const;

// ── Bottom Nav Configuration ────────────────────────────────────────────────

const bottomNavTabs = {
  couple: [
    { label: 'Home',      icon: 'home',           route: '/home'        },
    { label: 'Moodboard', icon: 'heart',          route: '/moodboard'   },
    { label: 'Messages',  icon: 'message-circle', route: '/messaging'   },
    { label: 'Planner',   icon: 'calendar',       route: '/bts-planner' },
    { label: 'Profile',   icon: 'user',           route: '/profile'     },
  ],
  vendor: [
    { label: 'Dashboard', icon: 'grid',           route: '/vendor-dashboard' },
    { label: 'Inquiries', icon: 'message-circle', route: null                },
    { label: 'Calendar',  icon: 'calendar',       route: null                },
    { label: 'Tools',     icon: 'tool',           route: null                },
    { label: 'Profile',   icon: 'user',           route: null                },
  ],
} as const;

// ── Canonical Data Schema (Supabase column names) ───────────────────────────

const schema = {
  vendorClient: {
    vendor_id: 'string',
    name: 'string',
    phone: 'string',
    email: 'string',
    wedding_date: 'string',
    city: 'string',
    venue: 'string',
    package_name: 'string',
    total_amount: 'number',
    status: 'string',
    notes: 'string',
    invited: 'boolean',
    source: 'string',
  },
  invoice: {
    vendor_id: 'string',
    client_name: 'string',
    client_phone: 'string',
    amount: 'number',
    total_amount: 'number',
    description: 'string',
    status: 'string',
    tds_applicable: 'boolean',
    tds_deducted_by_client: 'boolean',
  },
  contract: {
    vendor_id: 'string',
    client_name: 'string',
    client_phone: 'string',
    event_type: 'string',
    event_date: 'string',
    venue: 'string',
    services: 'string',
    total_amount: 'number',
    advance_amount: 'number',
    deliverables: 'string',
    cancellation_terms: 'string',
  },
  expense: {
    vendor_id: 'string',
    description: 'string',
    amount: 'number',
    category: 'string',
    client_name: 'string',
  },
  paymentSchedule: {
    vendor_id: 'string',
    client_name: 'string',
    client_phone: 'string',
    total_amount: 'number',
    instalments: 'json',
  },
} as const;

// ── Animations ──────────────────────────────────────────────────────────────

const animation = {
  fast:   200,
  normal: 300,
  slow:   500,
  spring: { tension: 80, friction: 12 },
} as const;

// ── Layout ──────────────────────────────────────────────────────────────────

const layout = {
  screenPaddingTop: 60,
  bottomNavHeight: 80,
  headerHeight: 56,
  scrollBottomPad: 100,
} as const;

// ── Format Helpers ──────────────────────────────────────────────────────────

const formatAmount = (amount: number): string => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount}`;
};

const formatDate = (isoDate: string): string => {
  try {
    return new Date(isoDate).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return isoDate; }
};

// ── Export ───────────────────────────────────────────────────────────────────

export const TDW = {
  colors,
  fonts,
  typography,
  spacing,
  radii,
  shadows,
  components,
  icons,
  bottomNavTabs,
  schema,
  animation,
  layout,
  formatAmount,
  formatDate,
} as const;

export { colors, fonts, typography, spacing, radii, shadows, components, icons, schema };
