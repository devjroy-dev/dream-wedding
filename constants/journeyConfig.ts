/**
 * The Dream Wedding — Journey Phases & Budget Tier Config
 * 
 * Phases organized by emotional moment, not function.
 * Budget tiers personalize copy and defaults without forking UI.
 */

// ── Budget Tier Detection ────────────────────────────────────────────────────

export type BudgetTier = 'essential' | 'signature' | 'luxe';

export const getBudgetTier = (budget: number): BudgetTier => {
  if (budget >= 5000000) return 'luxe';
  if (budget >= 1500000) return 'signature';
  return 'essential';
};

// ── Journey Phases ───────────────────────────────────────────────────────────

export type PhaseId = 'foundation' | 'search' | 'team' | 'coordination' | 'final' | 'wedding_week';

export interface PlannerTool {
  id: string;
  label: string;
  icon: string;
  route: string;
  platinumOnly?: boolean;
  comingSoon?: boolean;
}

export interface JourneyPhase {
  id: PhaseId;
  label: string;
  subtitle: string;
  icon: string;
  activatesAt: number;
  tools: PlannerTool[];
}

export const JOURNEY_PHASES: JourneyPhase[] = [
  {
    id: 'foundation',
    label: 'Set your foundation',
    subtitle: 'The essentials that shape everything',
    icon: 'compass',
    activatesAt: 999,
    tools: [
      { id: 'budget',    label: 'Budget',     icon: 'pie-chart',    route: 'budget' },
      { id: 'guests',    label: 'Guest List', icon: 'users',        route: 'guests' },
      { id: 'checklist', label: 'Checklist',  icon: 'check-circle', route: 'checklist' },
    ],
  },
  {
    id: 'search',
    label: 'Begin the search',
    subtitle: 'Discover vendors who bring your vision to life',
    icon: 'search',
    activatesAt: 365,
    tools: [
      { id: 'discover',    label: 'Discover Vendors', icon: 'compass', route: 'discover' },
      { id: 'inspiration', label: 'Moodboard',        icon: 'heart',   route: 'moodboard' },
      { id: 'destination', label: 'Destinations',     icon: 'map-pin', route: 'destination' },
    ],
  },
  {
    id: 'team',
    label: 'Build your team',
    subtitle: 'Assemble the people who make the dream real',
    icon: 'users',
    activatesAt: 300,
    tools: [
      { id: 'my-vendors',   label: 'My Vendors',   icon: 'briefcase',   route: 'my-vendors' },
      { id: 'decision-log', label: 'Decision Log', icon: 'book-open',   route: 'decision-log' },
      { id: 'payments',     label: 'Payments',     icon: 'credit-card', route: 'payments' },
    ],
  },
  {
    id: 'coordination',
    label: 'Coordinate the details',
    subtitle: 'Every detail, beautifully managed',
    icon: 'clipboard',
    activatesAt: 120,
    tools: [
      { id: 'registry', label: 'Registry',        icon: 'gift',  route: 'registry' },
      { id: 'website',  label: 'Wedding Website', icon: 'globe', route: 'website' },
      { id: 'dream-ai', label: 'DreamAi',         icon: 'zap',   route: 'dream-ai', platinumOnly: true },
    ],
  },
  {
    id: 'final',
    label: 'Final touches',
    subtitle: 'Almost there — make it perfect',
    icon: 'star',
    activatesAt: 30,
    tools: [
      { id: 'seating', label: 'Seating Chart',   icon: 'layout', route: 'seating', comingSoon: true },
      { id: 'day-of',  label: 'Day-of Timeline', icon: 'clock',  route: 'day-of',  comingSoon: true },
    ],
  },
  {
    id: 'wedding_week',
    label: 'Your wedding week',
    subtitle: 'This is your moment',
    icon: 'heart',
    activatesAt: 7,
    tools: [
      { id: 'memory-box', label: 'Memory Box', icon: 'camera', route: 'memory-box', platinumOnly: true, comingSoon: true },
    ],
  },
];

// ── Quick Access Tools (for returning users) ─────────────────────────────────

export const QUICK_ACCESS_TOOLS: PlannerTool[] = [
  { id: 'budget',       label: 'Budget',       icon: 'pie-chart',    route: 'budget' },
  { id: 'guests',       label: 'Guest List',   icon: 'users',        route: 'guests' },
  { id: 'checklist',    label: 'Checklist',    icon: 'check-circle', route: 'checklist' },
  { id: 'my-vendors',   label: 'My Vendors',   icon: 'briefcase',    route: 'my-vendors' },
  { id: 'decision-log', label: 'Decision Log', icon: 'book-open',    route: 'decision-log' },
  { id: 'payments',     label: 'Payments',     icon: 'credit-card',  route: 'payments' },
  { id: 'registry',     label: 'Registry',     icon: 'gift',         route: 'registry' },
  { id: 'website',      label: 'Website',      icon: 'globe',        route: 'website' },
  { id: 'dream-ai',     label: 'DreamAi',      icon: 'zap',          route: 'dream-ai' },
];

// ── Phase Detection ──────────────────────────────────────────────────────────

export const getCurrentPhase = (daysToWedding: number): PhaseId => {
  if (daysToWedding <= 7) return 'wedding_week';
  if (daysToWedding <= 30) return 'final';
  if (daysToWedding <= 120) return 'coordination';
  if (daysToWedding <= 270) return 'team';
  if (daysToWedding <= 365) return 'search';
  return 'foundation';
};

export const PROGRESS_LABELS = ['Engaged', 'Planning', 'Booking', 'Coordination', 'Wedding Week'];

export const getProgressIndex = (daysToWedding: number): number => {
  if (daysToWedding <= 7) return 4;
  if (daysToWedding <= 30) return 3;
  if (daysToWedding <= 120) return 3;
  if (daysToWedding <= 270) return 2;
  if (daysToWedding <= 365) return 1;
  return 0;
};

// ── Budget Tier Content Variants ─────────────────────────────────────────────

interface TierContent {
  greeting: string;
  budgetDefaults: { category: string; amount: number; icon: string }[];
}

export const TIER_CONTENT: Record<BudgetTier, TierContent> = {
  essential: {
    greeting: 'Every detail matters, and it will be beautiful.',
    budgetDefaults: [
      { category: 'Venue',           amount: 200000, icon: 'home' },
      { category: 'Photography',     amount: 60000,  icon: 'camera' },
      { category: 'Makeup Artist',   amount: 25000,  icon: 'scissors' },
      { category: 'Designer',        amount: 80000,  icon: 'star' },
      { category: 'Choreographer',   amount: 20000,  icon: 'music' },
      { category: 'Content Creator', amount: 15000,  icon: 'video' },
      { category: 'DJ & Music',      amount: 30000,  icon: 'headphones' },
      { category: 'Catering',        amount: 150000, icon: 'coffee' },
      { category: 'Decor',           amount: 80000,  icon: 'sun' },
      { category: 'Invitations',     amount: 15000,  icon: 'mail' },
    ],
  },
  signature: {
    greeting: 'Balance quality across every moment.',
    budgetDefaults: [
      { category: 'Venue',           amount: 600000,  icon: 'home' },
      { category: 'Photography',     amount: 200000,  icon: 'camera' },
      { category: 'Makeup Artist',   amount: 80000,   icon: 'scissors' },
      { category: 'Designer',        amount: 250000,  icon: 'star' },
      { category: 'Choreographer',   amount: 60000,   icon: 'music' },
      { category: 'Content Creator', amount: 40000,   icon: 'video' },
      { category: 'DJ & Music',      amount: 80000,   icon: 'headphones' },
      { category: 'Event Manager',   amount: 200000,  icon: 'briefcase' },
      { category: 'Catering',        amount: 400000,  icon: 'coffee' },
      { category: 'Decor',           amount: 250000,  icon: 'sun' },
      { category: 'Invitations',     amount: 40000,   icon: 'mail' },
    ],
  },
  luxe: {
    greeting: 'This will be remarkable.',
    budgetDefaults: [
      { category: 'Venue',           amount: 2500000, icon: 'home' },
      { category: 'Photography',     amount: 500000,  icon: 'camera' },
      { category: 'Makeup Artist',   amount: 200000,  icon: 'scissors' },
      { category: 'Designer',        amount: 800000,  icon: 'star' },
      { category: 'Choreographer',   amount: 150000,  icon: 'music' },
      { category: 'Content Creator', amount: 100000,  icon: 'video' },
      { category: 'DJ & Music',      amount: 200000,  icon: 'headphones' },
      { category: 'Event Manager',   amount: 500000,  icon: 'briefcase' },
      { category: 'Catering',        amount: 1500000, icon: 'coffee' },
      { category: 'Decor',           amount: 800000,  icon: 'sun' },
      { category: 'Invitations',     amount: 100000,  icon: 'mail' },
      { category: 'Hospitality',     amount: 500000,  icon: 'map-pin' },
    ],
  },
};

// ── Vendor Categories (for My Vendors import) ────────────────────────────────

export const VENDOR_CATEGORIES = [
  'Venue', 'Photographer', 'Makeup Artist', 'Designer', 'DJ & Music',
  'Choreographer', 'Event Manager', 'Caterer', 'Decorator', 'Pandit',
  'Jeweller', 'Content Creator', 'Florist', 'Invitation Designer',
  'Mehendi Artist', 'Other',
];

// ── WhatsApp Invite Template ─────────────────────────────────────────────────

export const getVendorInviteMessage = (vendorName: string, coupleName: string): string =>
  `Hi ${vendorName}, I'm planning my wedding using The Dream Wedding app and I've added you as one of my vendors. They have a free tool for managing bookings, invoices and client communication — thought it might be useful for you too. No pressure at all! — ${coupleName}`;
