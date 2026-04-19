'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Home, BookOpen, Users, Heart, ChevronRight, X,
  Compass, CheckSquare, PieChart, Briefcase, Bell,
  Zap, ArrowRight, Sparkles, Phone, Eye, EyeOff,
  Plus, Trash2, Clock, AlertCircle, Check, Edit3, Circle,
  Camera, Paperclip, Image as ImageIcon, Gift, Upload,
  Link as LinkIcon, Share2, ExternalLink, Smartphone,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const API = 'https://dream-wedding-production-89ae.up.railway.app';

const CLOUDINARY_CLOUD  = 'dccso5ljv';
const CLOUDINARY_PRESET = 'dream_wedding_uploads';

const C = {
  cream:      '#FAF6F0',
  ivory:      '#FFFFFF',
  pearl:      '#FBF8F2',
  goldSoft:   '#FFF8EC',
  goldBorder: '#E8D9B5',
  border:     '#EDE8E0',
  dark:       '#2C2420',
  gold:       '#C9A84C',
  goldDeep:   '#B8963A',
  muted:      '#8C7B6E',
  mutedLight: '#C4B8AC',
  blush:      '#FDF6F0',
};

// ─────────────────────────────────────────────────────────────
// COSHARE PERMISSION MATRIX
// All tool screens in future turns call canEdit() / canView().
// Never gate manually inside a tool — always use these helpers.
// ─────────────────────────────────────────────────────────────

type CoShareRole = 'owner' | 'core_duo' | 'inner_circle' | 'bridesmaid' | 'viewer';

const PERMISSIONS: Record<CoShareRole, Record<string, { view: boolean; edit: boolean }>> = {
  owner: {
    checklist:     { view: true,  edit: true  },
    budget:        { view: true,  edit: true  },
    shagun:        { view: true,  edit: true  },
    payment_trail: { view: true,  edit: true  },
    guests:        { view: true,  edit: true  },
    moodboard:     { view: true,  edit: true  },
    vendors:       { view: true,  edit: true  },
    circle:        { view: true,  edit: true  },
  },
  core_duo: {
    checklist:     { view: true,  edit: true  },
    budget:        { view: true,  edit: true  },
    shagun:        { view: true,  edit: true  },
    payment_trail: { view: true,  edit: true  },
    guests:        { view: true,  edit: true  },
    moodboard:     { view: true,  edit: true  },
    vendors:       { view: true,  edit: true  },
    circle:        { view: true,  edit: false },
  },
  inner_circle: {
    checklist:     { view: true,  edit: true  },
    budget:        { view: true,  edit: false },
    shagun:        { view: false, edit: false },
    payment_trail: { view: true,  edit: true  },
    guests:        { view: true,  edit: true  },
    moodboard:     { view: true,  edit: false },
    vendors:       { view: true,  edit: false },
    circle:        { view: true,  edit: false },
  },
  bridesmaid: {
    checklist:     { view: true,  edit: false },
    budget:        { view: false, edit: false },
    shagun:        { view: false, edit: false },
    payment_trail: { view: false, edit: false },
    guests:        { view: false, edit: false },
    moodboard:     { view: true,  edit: false },
    vendors:       { view: false, edit: false },
    circle:        { view: true,  edit: false },
  },
  viewer: {
    checklist:     { view: true,  edit: false },
    budget:        { view: false, edit: false },
    shagun:        { view: false, edit: false },
    payment_trail: { view: false, edit: false },
    guests:        { view: false, edit: false },
    moodboard:     { view: true,  edit: false },
    vendors:       { view: false, edit: false },
    circle:        { view: true,  edit: false },
  },
};

function canEdit(role: CoShareRole, tool: string): boolean {
  return PERMISSIONS[role]?.[tool]?.edit ?? false;
}
function canView(role: CoShareRole, tool: string): boolean {
  return PERMISSIONS[role]?.[tool]?.view ?? false;
}

// ─────────────────────────────────────────────────────────────
// SESSION
// ─────────────────────────────────────────────────────────────

interface CoupleSession {
  id: string;
  name: string;
  partnerName: string;
  weddingDate: string;
  events: string[];
  couple_tier: string;
  coShareRole: CoShareRole;
  foundingBride: boolean;
  token_balance: number;
}

function getSession(): CoupleSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('couple_session');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveSession(s: CoupleSession) {
  try { localStorage.setItem('couple_session', JSON.stringify(s)); } catch {}
}

function clearSession() {
  try { localStorage.removeItem('couple_session'); } catch {}
}

function daysToGo(weddingDate: string): number {
  const d = new Date(weddingDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((d.getTime() - now.getTime()) / 86400000));
}

// ─────────────────────────────────────────────────────────────
// GREETING COPY
// ─────────────────────────────────────────────────────────────

function getGreetingCopy(name: string, days: number): { line1: string; line2: string } {
  const n = name || 'there';
  if (days >= 365) return {
    line1: `The journey begins, ${n}.`,
    line2: "No rush — but let's start well. Here's what matters today.",
  };
  if (days >= 180) return {
    line1: `You're in the planning sweet spot, ${n}.`,
    line2: 'Plenty of time, but momentum matters. Here\'s what to focus on.',
  };
  if (days >= 90) return {
    line1: `Things are picking up, ${n}.`,
    line2: "Let's keep you ahead of it. Here's what needs your attention.",
  };
  if (days >= 30) return {
    line1: `It's getting close, ${n}.`,
    line2: 'The final stretch. Here\'s what still needs to happen.',
  };
  if (days >= 7) return {
    line1: `Almost there, ${n}.`,
    line2: "Just the final pieces now. You've got this.",
  };
  return {
    line1: `This is it, ${n}.`,
    line2: 'Everything else can wait. Today is what matters.',
  };
}

// ─────────────────────────────────────────────────────────────
// TOOL DEFINITIONS
// ─────────────────────────────────────────────────────────────

const TOOLS = [
  { id: 'checklist', label: 'Checklist',   Icon: CheckSquare, tool: 'checklist', tagline: 'Tasks across all your events'       },
  { id: 'budget',    label: 'Budget',       Icon: PieChart,    tool: 'budget',    tagline: 'Envelopes, expenses, Payment Trail' },
  { id: 'guests',    label: 'Guest Ledger', Icon: Users,       tool: 'guests',    tagline: "Who's coming to what"               },
  { id: 'moodboard', label: 'Moodboard',    Icon: Heart,       tool: 'moodboard', tagline: 'Per-event inspiration boards'       },
  { id: 'vendors',   label: 'My Vendors',   Icon: Briefcase,   tool: 'vendors',   tagline: 'Booked, confirmed, paid'            },
];

// ─────────────────────────────────────────────────────────────
// CHECKLIST TEMPLATES — Indian wedding specific
// Each task: { event, daysBefore (due N days before wedding), text, priority }
// Filtered at seed time by the events the bride has selected.
// Tasks with daysBefore > days-to-go are dropped (past due irrelevance).
// ─────────────────────────────────────────────────────────────

interface TaskTemplate {
  event: string;
  daysBefore: number;
  text: string;
  priority: 'urgent' | 'normal';
}

const CHECKLIST_TEMPLATES: TaskTemplate[] = [
  // ── Reception ─────────────────────────────────────────────
  { event: 'Reception', daysBefore: 180, text: 'Finalise venue and confirm booking date',                     priority: 'urgent' },
  { event: 'Reception', daysBefore: 150, text: 'Book photographer and videographer',                          priority: 'urgent' },
  { event: 'Reception', daysBefore: 120, text: 'Shortlist caterers and finalise menu',                        priority: 'urgent' },
  { event: 'Reception', daysBefore: 120, text: 'Book decorator and discuss themes',                           priority: 'normal' },
  { event: 'Reception', daysBefore: 90,  text: 'Finalise bridal outfit and begin fittings',                   priority: 'urgent' },
  { event: 'Reception', daysBefore: 90,  text: 'Send out invitations (physical and WhatsApp)',                priority: 'urgent' },
  { event: 'Reception', daysBefore: 60,  text: 'Book DJ and confirm song list',                               priority: 'normal' },
  { event: 'Reception', daysBefore: 45,  text: 'Confirm MUA booking and trial date',                          priority: 'urgent' },
  { event: 'Reception', daysBefore: 30,  text: 'Arrange transport for out-of-station guests',                 priority: 'normal' },
  { event: 'Reception', daysBefore: 21,  text: 'Finalise guest headcount with caterer',                       priority: 'urgent' },
  { event: 'Reception', daysBefore: 14,  text: 'Brief MC on run of show and announcements',                   priority: 'normal' },
  { event: 'Reception', daysBefore: 10,  text: 'Confirm photographer arrival time and shot list',             priority: 'urgent' },
  { event: 'Reception', daysBefore: 7,   text: 'Confirm DJ playlist and no-play list',                        priority: 'urgent' },
  { event: 'Reception', daysBefore: 5,   text: 'Arrange welcome drinks station',                              priority: 'normal' },
  { event: 'Reception', daysBefore: 3,   text: 'Confirm venue setup time with decorator',                     priority: 'urgent' },
  { event: 'Reception', daysBefore: 2,   text: 'Pack outfit, accessories, and emergency kit',                 priority: 'urgent' },

  // ── Sangeet ───────────────────────────────────────────────
  { event: 'Sangeet',   daysBefore: 120, text: 'Book venue or confirm home setup for Sangeet',                priority: 'urgent' },
  { event: 'Sangeet',   daysBefore: 90,  text: 'Plan dance choreographies and book choreographer',            priority: 'normal' },
  { event: 'Sangeet',   daysBefore: 75,  text: 'Finalise outfits for Sangeet (bride, groom, family)',         priority: 'normal' },
  { event: 'Sangeet',   daysBefore: 45,  text: 'Book DJ and confirm song requests for performances',          priority: 'urgent' },
  { event: 'Sangeet',   daysBefore: 30,  text: 'Plan games and ice-breakers for the evening',                 priority: 'normal' },
  { event: 'Sangeet',   daysBefore: 21,  text: 'Confirm decorator and lighting setup',                        priority: 'normal' },
  { event: 'Sangeet',   daysBefore: 14,  text: 'Begin Sangeet dance rehearsals',                              priority: 'urgent' },
  { event: 'Sangeet',   daysBefore: 7,   text: 'Final rehearsal with all performers',                         priority: 'urgent' },
  { event: 'Sangeet',   daysBefore: 3,   text: 'Check sound system and stage setup',                          priority: 'urgent' },

  // ── Mehendi ───────────────────────────────────────────────
  { event: 'Mehendi',   daysBefore: 90,  text: 'Book mehendi artist and confirm design references',           priority: 'urgent' },
  { event: 'Mehendi',   daysBefore: 60,  text: 'Finalise mehendi outfit and jewellery',                       priority: 'normal' },
  { event: 'Mehendi',   daysBefore: 45,  text: 'Confirm mehendi venue or home arrangement',                   priority: 'normal' },
  { event: 'Mehendi',   daysBefore: 30,  text: 'Plan seating and comfort setup for guests',                   priority: 'normal' },
  { event: 'Mehendi',   daysBefore: 21,  text: 'Order snacks, drinks, and refreshments for guests',           priority: 'normal' },
  { event: 'Mehendi',   daysBefore: 14,  text: 'Brief photographer on key moments to capture',                priority: 'normal' },
  { event: 'Mehendi',   daysBefore: 7,   text: 'Do a trial mehendi to test the colour',                       priority: 'urgent' },
  { event: 'Mehendi',   daysBefore: 3,   text: 'Confirm mehendi artist arrival time',                         priority: 'urgent' },

  // ── Haldi ─────────────────────────────────────────────────
  { event: 'Haldi',     daysBefore: 60,  text: 'Plan Haldi venue or home setup',                              priority: 'normal' },
  { event: 'Haldi',     daysBefore: 45,  text: 'Finalise Haldi outfit (yellow/pastel)',                       priority: 'normal' },
  { event: 'Haldi',     daysBefore: 30,  text: 'Arrange Haldi paste ingredients with family',                 priority: 'normal' },
  { event: 'Haldi',     daysBefore: 21,  text: 'Plan flower arrangements and decor',                          priority: 'normal' },
  { event: 'Haldi',     daysBefore: 14,  text: 'Arrange towels and change of clothes',                        priority: 'normal' },
  { event: 'Haldi',     daysBefore: 7,   text: 'Confirm photographer and coverage plan',                      priority: 'urgent' },
  { event: 'Haldi',     daysBefore: 3,   text: 'Arrange seating for elders during ceremony',                  priority: 'normal' },

  // ── Baraat ────────────────────────────────────────────────
  { event: 'Baraat',    daysBefore: 75,  text: 'Plan baraat route and timing',                                priority: 'normal' },
  { event: 'Baraat',    daysBefore: 45,  text: 'Book baraat band, dhol, or DJ setup',                         priority: 'urgent' },
  { event: 'Baraat',    daysBefore: 30,  text: 'Arrange transport (horse, car, or procession vehicles)',      priority: 'urgent' },
  { event: 'Baraat',    daysBefore: 21,  text: 'Confirm baraat start location and route clearance',           priority: 'normal' },
  { event: 'Baraat',    daysBefore: 14,  text: 'Plan welcome ceremony at the venue',                          priority: 'normal' },
  { event: 'Baraat',    daysBefore: 7,   text: 'Confirm groom\u2019s outfit, sehra, and accessories',         priority: 'urgent' },
  { event: 'Baraat',    daysBefore: 3,   text: 'Coordinate baraat arrival time with venue',                   priority: 'urgent' },
];

// ─────────────────────────────────────────────────────────────
// TASK HELPERS
// ─────────────────────────────────────────────────────────────

interface ChecklistTask {
  id: string;
  couple_id: string;
  event: string;
  text: string;
  is_complete: boolean;
  priority: 'urgent' | 'normal';
  assigned_to: string | null;
  due_date: string | null;
  is_custom: boolean;
  seeded_from_template: boolean;
  created_at: string;
  completed_at: string | null;
}

// Build template seed tasks for the couple — filters by their events +
// drops tasks whose due date is already in the past.
function buildSeedTasks(events: string[], weddingDate: string) {
  const wedding = new Date(weddingDate);
  const now = new Date();
  const daysRemaining = Math.ceil((wedding.getTime() - now.getTime()) / 86400000);
  const seeds: Array<{ event: string; text: string; priority: string; due_date: string }> = [];
  for (const tpl of CHECKLIST_TEMPLATES) {
    if (!events.includes(tpl.event)) continue;
    if (tpl.daysBefore > daysRemaining + 7) continue; // drop way-past-due
    const due = new Date(wedding);
    due.setDate(due.getDate() - tpl.daysBefore);
    seeds.push({
      event: tpl.event,
      text: tpl.text,
      priority: tpl.priority,
      due_date: due.toISOString().slice(0, 10),
    });
  }
  return seeds;
}

// Sort: urgent first, then by due_date asc (nulls last), then by created_at asc
function sortTasks(tasks: ChecklistTask[]): ChecklistTask[] {
  return [...tasks].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority === 'urgent' ? -1 : 1;
    const ad = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
    const bd = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
    if (ad !== bd) return ad - bd;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

// Top 3 tasks for the Home "Today" card
function getTodayTasks(tasks: ChecklistTask[]): ChecklistTask[] {
  const incomplete = tasks.filter(t => !t.is_complete);
  return sortTasks(incomplete).slice(0, 3);
}

// Progress summary per event — used on My Wedding tile
function getChecklistProgress(tasks: ChecklistTask[]): { done: number; total: number } {
  return {
    done: tasks.filter(t => t.is_complete).length,
    total: tasks.length,
  };
}

function formatDueDate(d: string | null): string {
  if (!d) return '';
  const date = new Date(d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff < 7) return `In ${diff}d`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ─────────────────────────────────────────────────────────────
// BUDGET / EXPENSE / SHAGUN TYPES
// ─────────────────────────────────────────────────────────────

interface CoupleBudget {
  id: string;
  couple_id: string;
  total_budget: number;
  event_envelopes: Record<string, number>;
  updated_at: string;
}

interface Expense {
  id: string;
  couple_id: string;
  event: string;
  category: string;
  description: string | null;
  vendor_name: string | null;
  planned_amount: number;
  actual_amount: number;
  shadow_amount: number;
  payment_status: 'paid' | 'partial' | 'pending';
  receipt_url: string | null;
  receipt_uploaded_by: string | null;
  receipt_uploaded_by_name: string | null;
  notes: string | null;
  created_at: string;
}

interface ShagunEntry {
  id: string;
  couple_id: string;
  giver_name: string;
  relation: string | null;
  event: string | null;
  amount: number;
  gift_description: string | null;
  return_gift_sent: boolean;
  notes: string | null;
  created_at: string;
}

const EXPENSE_CATEGORIES = [
  'Venue', 'Catering', 'Decor', 'Photography', 'Videography',
  'Outfits & Jewellery', 'MUA & Hair', 'Music & DJ',
  'Transport', 'Invitations', 'Pandit & Ceremony',
  'Gifts & Favours', 'Miscellaneous',
];

// Format INR currency — tight display (₹4.2L, ₹45K, ₹5.1Cr)
function fmtINR(n: number): string {
  if (!n || n === 0) return '₹0';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(n % 10000000 === 0 ? 0 : 1)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`;
  if (n >= 1000)     return `₹${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return `₹${n.toFixed(0)}`;
}

// Full INR format for detail views (₹ 4,20,000)
function fmtINRFull(n: number): string {
  if (!n || n === 0) return '₹0';
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

// Compute committed (actual + shadow) per event
function eventCommitted(expenses: Expense[], event: string): number {
  return expenses
    .filter(e => e.event === event)
    .reduce((sum, e) => sum + (e.actual_amount || 0) + (e.shadow_amount || 0), 0);
}

// Compute committed across all events
function totalCommitted(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + (e.actual_amount || 0) + (e.shadow_amount || 0), 0);
}

// Overall health level for the pulse indicator
type HealthLevel = 'green' | 'amber' | 'red' | 'unset';
function getBudgetHealth(totalBudget: number, committed: number): HealthLevel {
  if (!totalBudget || totalBudget === 0) return 'unset';
  const pct = committed / totalBudget;
  if (pct < 0.8)  return 'green';
  if (pct < 0.95) return 'amber';
  return 'red';
}

const HEALTH_COLORS: Record<HealthLevel, { bg: string; border: string; text: string; label: string }> = {
  green:  { bg: '#EBF5EB', border: '#B8D9B8', text: '#2D6A2D', label: 'On track' },
  amber:  { bg: '#FFF8E1', border: '#F0D88C', text: '#8B6914', label: 'Getting close' },
  red:    { bg: '#FEEAEA', border: '#F0B8B8', text: '#A33636', label: 'Over budget' },
  unset:  { bg: '#FBF8F2', border: '#EDE8E0', text: '#8C7B6E', label: 'Set your budget' },
};

// ─────────────────────────────────────────────────────────────
// GUEST LEDGER TYPES + HELPERS
// ─────────────────────────────────────────────────────────────

type GuestSide = 'bride' | 'groom';
type Dietary = 'veg' | 'non-veg' | 'jain' | 'allergy' | null;
type RSVPStatus = 'pending' | 'confirmed' | 'declined';

interface EventInvite {
  invited: boolean;
  rsvp: RSVPStatus;
}

interface Guest {
  id: string;
  couple_id: string;
  name: string;
  side: GuestSide;
  relation: string | null;
  phone: string | null;
  email: string | null;
  household_count: number;
  is_household_head: boolean;
  household_head_id: string | null;
  dietary: Dietary;
  dietary_notes: string | null;
  event_invites: Record<string, EventInvite>;
  notes: string | null;
  nudge_sent_at: string | null;
  added_by: string | null;
  added_by_name: string | null;
  created_at: string;
}

const DIETARY_LABELS: Record<string, string> = {
  'veg':     'Veg',
  'non-veg': 'Non-veg',
  'jain':    'Jain',
  'allergy': 'Allergy',
};

// Headcount for a given event — counts household_count for each invited guest
// who is a head or has no head (standalone). Non-head members are skipped so
// families aren't double-counted.
function eventHeadcount(guests: Guest[], event: string, filter?: 'confirmed' | 'pending' | 'declined' | 'invited'): number {
  let count = 0;
  for (const g of guests) {
    // Skip non-head members of households — they're counted in their head's household_count
    if (g.household_head_id && !g.is_household_head) continue;
    const invite = g.event_invites?.[event];
    if (!invite?.invited) continue;
    if (filter === 'confirmed' && invite.rsvp !== 'confirmed') continue;
    if (filter === 'pending'   && invite.rsvp !== 'pending')   continue;
    if (filter === 'declined'  && invite.rsvp !== 'declined')  continue;
    count += (g.household_count || 1);
  }
  return count;
}

// Total headcount across all events (= confirmed on ANY event)
function totalConfirmed(guests: Guest[], events: string[]): number {
  let count = 0;
  for (const g of guests) {
    if (g.household_head_id && !g.is_household_head) continue;
    const anyConfirmed = events.some(ev => g.event_invites?.[ev]?.rsvp === 'confirmed');
    if (anyConfirmed) count += (g.household_count || 1);
  }
  return count;
}

// Pending nudges — guests with at least one pending RSVP on an invited event
function pendingNudgeCount(guests: Guest[]): number {
  return guests.filter(g => {
    if (g.household_head_id && !g.is_household_head) return false;
    return Object.values(g.event_invites || {}).some(inv => inv.invited && inv.rsvp === 'pending');
  }).length;
}

// Total guests (heads + standalone, counting household sizes)
function totalGuestCount(guests: Guest[]): { headcount: number; households: number } {
  let headcount = 0;
  let households = 0;
  for (const g of guests) {
    if (g.household_head_id && !g.is_household_head) continue;
    headcount += (g.household_count || 1);
    households += 1;
  }
  return { headcount, households };
}

// ─────────────────────────────────────────────────────────────
// MOODBOARD TYPES + HELPERS
// ─────────────────────────────────────────────────────────────

type PinType = 'upload' | 'link' | 'note';

interface MoodboardPin {
  id: string;
  couple_id: string;
  event: string;
  pin_type: PinType;
  image_url: string | null;
  source_url: string | null;
  source_domain: string | null;
  title: string | null;
  note: string | null;
  is_curated: boolean;
  is_suggestion: boolean;
  added_by: string | null;
  added_by_name: string | null;
  created_at: string;
}

interface OGPreview {
  og_image: string | null;
  og_title: string | null;
  og_description: string | null;
  source_domain: string;
}

function pinsForEvent(pins: MoodboardPin[], event: string): MoodboardPin[] {
  if (event === 'All') return pins.filter(p => !p.is_suggestion);
  return pins.filter(p => p.event === event && !p.is_suggestion);
}

function suggestionCount(pins: MoodboardPin[]): number {
  return pins.filter(p => p.is_suggestion).length;
}

// ─────────────────────────────────────────────────────────────
// VENDOR TYPES + HELPERS
// ─────────────────────────────────────────────────────────────

type VendorStatus = 'enquired' | 'quoted' | 'booked' | 'confirmed' | 'completed';

interface Vendor {
  id: string;
  couple_id: string;
  name: string;
  category: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  events: string[];
  status: VendorStatus;
  quoted_total: number;
  balance_due_date: string | null;
  contract_url: string | null;
  contract_uploaded_by: string | null;
  contract_uploaded_by_name: string | null;
  booked_slot: string | null;
  notes: string | null;
  added_by: string | null;
  added_by_name: string | null;
  created_at: string;
}

const VENDOR_STATUSES: { id: VendorStatus; label: string; color: string; bg: string; border: string }[] = [
  { id: 'enquired',  label: 'Enquired',  color: '#8C7B6E', bg: '#FBF8F2', border: '#EDE8E0' },
  { id: 'quoted',    label: 'Quoted',    color: '#8B6914', bg: '#FFF8E1', border: '#F0D88C' },
  { id: 'booked',    label: 'Booked',    color: '#A8742C', bg: '#FBEEDD', border: '#E4C896' },
  { id: 'confirmed', label: 'Confirmed', color: '#2D6A2D', bg: '#EBF5EB', border: '#B8D9B8' },
  { id: 'completed', label: 'Completed', color: '#2C2420', bg: '#EDE8E0', border: '#C9BCA8' },
];

function statusStyle(s: VendorStatus) {
  return VENDOR_STATUSES.find(v => v.id === s) || VENDOR_STATUSES[0];
}

// Expenses linked to a vendor by name (case-insensitive match)
function expensesForVendor(expenses: Expense[], vendorName: string): Expense[] {
  const target = vendorName.trim().toLowerCase();
  if (!target) return [];
  return expenses.filter(e => (e.vendor_name || '').trim().toLowerCase() === target);
}

function vendorPaidTotal(expenses: Expense[], vendorName: string): number {
  return expensesForVendor(expenses, vendorName)
    .reduce((sum, e) => sum + (e.actual_amount || 0) + (e.shadow_amount || 0), 0);
}

function vendorBalanceDue(vendor: Vendor, expenses: Expense[]): number {
  if (!vendor.quoted_total) return 0;
  const paid = vendorPaidTotal(expenses, vendor.name);
  return Math.max(0, vendor.quoted_total - paid);
}

// Conflict detection — two vendors booked for the same slot
function findConflicts(vendors: Vendor[]): Record<string, Vendor[]> {
  const byEventSlot: Record<string, Vendor[]> = {};
  for (const v of vendors) {
    if (!v.booked_slot) continue;
    if (v.status !== 'booked' && v.status !== 'confirmed') continue;
    const key = v.booked_slot;
    if (!byEventSlot[key]) byEventSlot[key] = [];
    byEventSlot[key].push(v);
  }
  // Only return slots with 2+ vendors
  const conflicts: Record<string, Vendor[]> = {};
  for (const [slot, vs] of Object.entries(byEventSlot)) {
    if (vs.length >= 2) conflicts[slot] = vs;
  }
  return conflicts;
}

function vendorStatusCounts(vendors: Vendor[]): Record<VendorStatus, number> {
  const counts: Record<VendorStatus, number> = {
    enquired: 0, quoted: 0, booked: 0, confirmed: 0, completed: 0,
  };
  for (const v of vendors) counts[v.status] = (counts[v.status] || 0) + 1;
  return counts;
}

// ─────────────────────────────────────────────────────────────
// WHATSAPP TEMPLATE SYSTEM
// Templates use {curly_braces} for variables. At send time we
// resolve vars against the context object and open wa.me.
// ─────────────────────────────────────────────────────────────

type TemplateContext = 'guest' | 'vendor' | 'moodboard' | 'invite';

interface WATemplate {
  id: string;
  couple_id: string;
  context: TemplateContext;
  template_key: string | null;
  label: string;
  body: string;
  is_default: boolean;
  is_custom: boolean;
  sort_order: number;
}

// Default templates seeded on first use
const DEFAULT_WA_TEMPLATES: Array<Partial<WATemplate> & { context: TemplateContext; label: string; body: string }> = [
  // Guest templates
  {
    context: 'guest', template_key: 'rsvp_nudge', label: 'RSVP reminder', is_default: true, sort_order: 0,
    body: "Hi {guest_name}! 💛 Gentle reminder — {couple_name} would love to have you at {events}{wedding_date_suffix}. Could you let us know if you'll be able to join? 🙏",
  },
  {
    context: 'guest', template_key: 'wedding_details', label: 'Share wedding details', sort_order: 1,
    body: "Hi {guest_name}! We can't wait to have you at {couple_name}'s wedding. Here are the details:\n\n{events_list}\n\n{wedding_date_suffix_clean}\nVenue: {venue}\n\nPlease do let us know if you have any questions. Looking forward to celebrating with you! 💛",
  },
  {
    context: 'guest', template_key: 'thank_you', label: 'Post-wedding thank you', sort_order: 2,
    body: "Dear {guest_name}, thank you so much for being part of {couple_name}'s special day. Your presence and blessings meant the world to us. We're so grateful. 💛",
  },

  // Vendor templates
  {
    context: 'vendor', template_key: 'vendor_greet', label: 'Initial outreach', is_default: true, sort_order: 0,
    body: "Hi {vendor_name} team,\n\n{couple_name} is planning their wedding and came across your work. Would love to chat about availability and a quote.\n\nEvent: {event}\nDate: {wedding_date}\n\nLooking forward to hearing from you!",
  },
  {
    context: 'vendor', template_key: 'vendor_quote_request', label: 'Ask for quote', sort_order: 1,
    body: "Hi {vendor_name} team, could you please share a detailed quote for {event}? We'd love to understand your packages and options. Thank you!",
  },
  {
    context: 'vendor', template_key: 'vendor_payment_reminder', label: 'Payment reminder', sort_order: 2,
    body: "Hi {vendor_name} team, just a friendly note — the next payment of approximately {balance_due} is due soon. Please let me know if you'd like to confirm a date. Thank you!",
  },

  // Moodboard templates
  {
    context: 'moodboard', template_key: 'curated_share', label: 'Share curated view', is_default: true, sort_order: 0,
    body: "✨ {couple_name}'s vision for {event}\n\nCome take a look at the moodboard we've curated — a few pieces that feel just right.\n\nWith love,\n{bride_name}",
  },

  // Invite templates
  {
    context: 'invite', template_key: 'invite_core_duo', label: 'Core Duo invite', is_default: true, sort_order: 0,
    body: "Hi! 💛 I'm planning our wedding on The Dream Wedding and would love for you to plan it with me as my Core Duo. You'll have full access to everything.\n\nTap to join: {magic_link}",
  },
  {
    context: 'invite', template_key: 'invite_inner_circle', label: 'Inner Circle invite', sort_order: 1,
    body: "Hi! 💛 I'm planning our wedding on The Dream Wedding and would love your help. I'm giving you Inner Circle access — you'll see most things (except sensitive budget details).\n\nTap to join: {magic_link}",
  },
  {
    context: 'invite', template_key: 'invite_bridesmaid', label: 'Bridesmaid invite', sort_order: 2,
    body: "Hi! 💛 You're officially on my bridesmaid squad! I'd love you to help me build out the moodboard and keep tabs on the checklist. Tap to join:\n\n{magic_link}",
  },
];

// Context to variable list — used in Settings UI
const TEMPLATE_VARIABLES: Record<TemplateContext, string[]> = {
  guest:     ['{guest_name}', '{couple_name}', '{bride_name}', '{groom_name}', '{events}', '{events_list}', '{wedding_date}', '{wedding_date_suffix}', '{wedding_date_suffix_clean}', '{venue}'],
  vendor:    ['{vendor_name}', '{couple_name}', '{bride_name}', '{groom_name}', '{event}', '{balance_due}', '{wedding_date}'],
  moodboard: ['{couple_name}', '{bride_name}', '{groom_name}', '{event}', '{pin_count}'],
  invite:    ['{inviter_name}', '{role}', '{magic_link}', '{couple_name}'],
};

// Resolve template variables. Unknown vars pass through unchanged.
function renderTemplate(body: string, vars: Record<string, string | undefined>): string {
  return body.replace(/\{(\w+)\}/g, (_m, key) => vars[key] ?? '');
}

// Get the default template for a given context, else the first one
function getDefaultTemplate(templates: WATemplate[], context: TemplateContext): WATemplate | null {
  const inCtx = templates.filter(t => t.context === context);
  if (inCtx.length === 0) return null;
  return inCtx.find(t => t.is_default) || inCtx[0];
}

function templatesForContext(templates: WATemplate[], context: TemplateContext): WATemplate[] {
  return templates
    .filter(t => t.context === context)
    .sort((a, b) => a.sort_order - b.sort_order);
}

// Format phone for wa.me — add 91 country code if missing
function phoneForWhatsApp(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  if (digits.length === 10) return '91' + digits;
  return digits;
}

// Build wedding date pretty string + events list for template vars
function buildCoupleVars(session: CoupleSession): Record<string, string> {
  const coupleName = session.partnerName ? `${session.name} & ${session.partnerName}` : session.name;
  const dateStr = session.weddingDate
    ? new Date(session.weddingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  return {
    couple_name: coupleName,
    bride_name: session.name,
    groom_name: session.partnerName || '',
    wedding_date: dateStr,
    wedding_date_suffix: dateStr ? ` on ${dateStr}` : '',
    wedding_date_suffix_clean: dateStr ? `Date: ${dateStr}` : '',
    events: session.events.join(', '),
    events_list: session.events.map(e => `• ${e}`).join('\n'),
    venue: (session as any).venue || '',
  };
}

// Open WhatsApp with a rendered template
function openWhatsApp(phone: string | null, message: string) {
  const p = phoneForWhatsApp(phone);
  const base = p ? `https://wa.me/${p}` : `https://wa.me/`;
  window.open(`${base}?text=${encodeURIComponent(message)}`, '_blank');
}

// ─────────────────────────────────────────────────────────────
// SHARED UI
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// WHATSAPP BUTTON — smart default picker
// If only one template exists, opens WhatsApp immediately.
// If 2+, shows picker sheet first.
// ─────────────────────────────────────────────────────────────

interface WhatsAppButtonProps {
  context: TemplateContext;
  templates: WATemplate[];
  phone?: string | null;             // If null, uses generic wa.me (user picks contact)
  vars: Record<string, string>;      // All variable values for this use
  // Optional presentation overrides — each usage site can style differently
  children?: React.ReactNode;        // If provided, renders as a wrapper around children
  label?: string;                    // Button text (default: "WhatsApp")
  compact?: boolean;                 // Small icon-only mode
  iconOnly?: boolean;                // Just the icon, no label
  style?: React.CSSProperties;       // Extra style override
  onBeforeSend?: () => void | Promise<void>; // Called before WhatsApp opens
}

function WhatsAppButton({
  context, templates, phone, vars, children, label = 'WhatsApp',
  compact, iconOnly, style, onBeforeSend,
}: WhatsAppButtonProps) {
  const [showPicker, setShowPicker] = useState(false);
  const ctxTemplates = templatesForContext(templates, context);

  const send = async (template: WATemplate) => {
    if (onBeforeSend) await onBeforeSend();
    const message = renderTemplate(template.body, vars);
    openWhatsApp(phone || null, message);
  };

  const handleTap = async () => {
    if (ctxTemplates.length === 0) {
      // No templates yet — send blank or with minimal greeting
      if (onBeforeSend) await onBeforeSend();
      openWhatsApp(phone || null, '');
      return;
    }
    if (ctxTemplates.length === 1) {
      await send(ctxTemplates[0]);
      return;
    }
    // 2+ templates → picker
    setShowPicker(true);
  };

  // Wrapper-style usage — clickable children
  if (children) {
    return (
      <>
        <div onClick={handleTap} style={{ cursor: 'pointer' }}>{children}</div>
        {showPicker && (
          <TemplatePickerSheet
            templates={ctxTemplates}
            vars={vars}
            onPick={async t => { setShowPicker(false); await send(t); }}
            onClose={() => setShowPicker(false)}
          />
        )}
      </>
    );
  }

  // Default button rendering
  if (iconOnly) {
    return (
      <>
        <button onClick={handleTap} style={{
          width: 44, background: C.goldSoft,
          border: 'none', borderLeft: `1px solid ${C.border}`,
          cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, ...style,
        }}>
          <Phone size={15} color={C.gold} />
        </button>
        {showPicker && (
          <TemplatePickerSheet
            templates={ctxTemplates}
            vars={vars}
            onPick={async t => { setShowPicker(false); await send(t); }}
            onClose={() => setShowPicker(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleTap}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: compact ? '8px 12px' : '10px 14px', borderRadius: 10,
          background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
          cursor: 'pointer', ...style,
        }}
      >
        <Phone size={compact ? 12 : 13} color={C.gold} />
        <span style={{
          fontSize: compact ? 11 : 12, color: C.goldDeep,
          fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
        }}>
          {label}
        </span>
      </button>
      {showPicker && (
        <TemplatePickerSheet
          templates={ctxTemplates}
          vars={vars}
          onPick={async t => { setShowPicker(false); await send(t); }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}

// Template picker bottom sheet
function TemplatePickerSheet({ templates, vars, onPick, onClose }: {
  templates: WATemplate[];
  vars: Record<string, string>;
  onPick: (t: WATemplate) => void;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(44,36,32,0.5)',
        zIndex: 210, display: 'flex', alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.cream, borderRadius: '20px 20px 0 0',
          padding: '20px 20px max(20px, env(safe-area-inset-bottom))',
          width: '100%', maxWidth: 480, margin: '0 auto',
          boxSizing: 'border-box' as const, maxHeight: '70vh',
          overflowY: 'auto' as const,
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 16px' }} />
        <p style={{ margin: '0 0 4px', fontSize: 18, color: C.dark, fontFamily: 'Playfair Display, serif' }}>
          Pick a message
        </p>
        <p style={{ margin: '0 0 16px', fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
          Edit any of these in Settings → Templates.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
          {templates.map(t => {
            const preview = renderTemplate(t.body, vars).slice(0, 100);
            return (
              <button
                key={t.id}
                onClick={() => onPick(t)}
                style={{
                  display: 'flex', flexDirection: 'column' as const,
                  background: C.ivory, border: `1px solid ${t.is_default ? C.goldBorder : C.border}`,
                  borderRadius: 12, padding: '12px 14px',
                  cursor: 'pointer', textAlign: 'left' as const,
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                    {t.label}
                  </span>
                  {t.is_default && (
                    <span style={{
                      fontSize: 9, color: C.goldDeep, background: C.goldSoft,
                      border: `1px solid ${C.goldBorder}`, borderRadius: 6,
                      padding: '1px 5px', fontFamily: 'DM Sans, sans-serif',
                      fontWeight: 500, letterSpacing: '0.3px', textTransform: 'uppercase' as const,
                    }}>Default</span>
                  )}
                </div>
                <p style={{
                  margin: 0, fontSize: 11, color: C.muted,
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 300,
                  lineHeight: '15px',
                  overflow: 'hidden' as const,
                  display: '-webkit-box' as any,
                  WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any,
                }}>
                  {preview}{preview.length >= 100 ? '…' : ''}
                </p>
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 16 }}>
          <GhostButton label="Cancel" onTap={onClose} />
        </div>
      </div>
    </div>
  );
}

function GoldButton({ label, onTap, fullWidth = false }: {
  label: string; onTap: () => void; fullWidth?: boolean;
}) {
  return (
    <button onClick={onTap} style={{
      width: fullWidth ? '100%' : 'auto',
      background: C.dark, border: 'none', borderRadius: 12, cursor: 'pointer',
      padding: '14px 28px', color: C.gold,
      fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 400,
      letterSpacing: '1.5px', textTransform: 'uppercase' as const,
    }}>{label}</button>
  );
}

function GhostButton({ label, onTap }: { label: string; onTap: () => void }) {
  return (
    <button onClick={onTap} style={{
      background: 'none', border: 'none', cursor: 'pointer',
      color: C.muted, fontFamily: 'DM Sans, sans-serif',
      fontSize: 13, fontWeight: 300, padding: '8px',
    }}>{label}</button>
  );
}

function InputField({ label, value, onChange, type = 'text', placeholder = '', required }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean;
}) {
  const [showPw, setShowPw] = useState(false);
  const isPw = type === 'password';
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: 'block', fontSize: 11, color: C.muted,
        fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
        letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
      }}>{label}{required && <span style={{ color: '#C65757', marginLeft: 4 }}>*</span>}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={isPw && !showPw ? 'password' : isPw ? 'text' : type}
          value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%', boxSizing: 'border-box' as const,
            padding: isPw ? '12px 44px 12px 16px' : '12px 16px',
            borderRadius: 10, border: `1px solid ${C.border}`,
            background: C.ivory, fontFamily: 'DM Sans, sans-serif',
            fontSize: 15, color: C.dark, outline: 'none',
          }}
        />
        {isPw && (
          <button onClick={() => setShowPw(p => !p)} style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', padding: 4,
          }}>
            {showPw ? <EyeOff size={16} color={C.muted} /> : <Eye size={16} color={C.muted} />}
          </button>
        )}
      </div>
    </div>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div style={{
      background: '#FEF2F2', border: '1px solid #FECACA',
      borderRadius: 10, padding: '10px 14px', marginBottom: 16,
    }}>
      <p style={{ margin: 0, fontSize: 13, color: '#B91C1C', fontFamily: 'DM Sans, sans-serif' }}>{msg}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SHARED DATA HOOK
// Single source of truth for checklist tasks across Home, My
// Wedding grid, and the Checklist tool. Future turns will add
// budget, guests, vendors, moodboard to this same hook so all
// screens stay in sync without refetching.
// ─────────────────────────────────────────────────────────────

function useCoupleData(session: CoupleSession | null) {
  const [tasks, setTasks] = useState<ChecklistTask[]>([]);
  const [budget, setBudget] = useState<CoupleBudget | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [shagun, setShagun] = useState<ShagunEntry[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [pins, setPins] = useState<MoodboardPin[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [waTemplates, setWaTemplates] = useState<WATemplate[]>([]);
  const [showFoundingIntro, setShowFoundingIntro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [seeded, setSeeded] = useState(false);

  const refreshTasks = async () => {
    if (!session?.id) return;
    try {
      const res = await fetch(`${API}/api/couple/checklist/${session.id}`);
      const d = await res.json();
      if (d.success) setTasks(d.data || []);
    } catch {}
  };

  const refreshBudget = async () => {
    if (!session?.id) return;
    try {
      const [bRes, eRes, sRes] = await Promise.all([
        fetch(`${API}/api/couple/budget/${session.id}`).then(r => r.json()),
        fetch(`${API}/api/couple/expenses/${session.id}`).then(r => r.json()),
        fetch(`${API}/api/couple/shagun/${session.id}`).then(r => r.json()),
      ]);
      if (bRes.success) setBudget(bRes.data);
      if (eRes.success) setExpenses(eRes.data || []);
      if (sRes.success) setShagun(sRes.data || []);
    } catch {}
  };

  const refreshGuests = async () => {
    if (!session?.id) return;
    try {
      const res = await fetch(`${API}/api/couple/guests/${session.id}`);
      const d = await res.json();
      if (d.success) setGuests(d.data || []);
    } catch {}
  };

  // Initial load + one-time template seed if bride has never seeded.
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!session?.id) { setLoading(false); return; }
      try {
        // Check whether user has already been seeded
        const userRes = await fetch(`${API}/api/users/${session.id}`);
        const userD = await userRes.json();
        const alreadySeeded = !!userD?.data?.checklist_seeded;

        // Parallel load: checklist, budget, expenses, shagun, guests, moodboard, vendors, templates
        const [checklistRes, budgetRes, expensesRes, shagunRes, guestsRes, pinsRes, vendorsRes, templatesRes] = await Promise.all([
          fetch(`${API}/api/couple/checklist/${session.id}`).then(r => r.json()),
          fetch(`${API}/api/couple/budget/${session.id}`).then(r => r.json()),
          fetch(`${API}/api/couple/expenses/${session.id}`).then(r => r.json()),
          fetch(`${API}/api/couple/shagun/${session.id}`).then(r => r.json()),
          fetch(`${API}/api/couple/guests/${session.id}`).then(r => r.json()),
          fetch(`${API}/api/couple/moodboard/${session.id}`).then(r => r.json()),
          fetch(`${API}/api/couple/vendors/${session.id}`).then(r => r.json()),
          fetch(`${API}/api/couple/wa-templates/${session.id}`).then(r => r.json()),
        ]);

        // Seed WhatsApp templates if user has never been seeded
        const templatesSeeded = !!userD?.data?.wa_templates_seeded;
        let finalTemplates: WATemplate[] = templatesRes.success ? (templatesRes.data || []) : [];
        if (!templatesSeeded && finalTemplates.length === 0) {
          try {
            const seedRes = await fetch(`${API}/api/couple/wa-templates/bulk`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ couple_id: session.id, templates: DEFAULT_WA_TEMPLATES }),
            });
            const seedD = await seedRes.json();
            if (seedD.success) finalTemplates = seedD.data || [];
          } catch {}
        }

        // Check if founding bride intro should show
        if (mounted && userD?.data?.founding_bride && !userD?.data?.founding_intro_shown) {
          setShowFoundingIntro(true);
        }

        const existing: ChecklistTask[] = checklistRes.success ? (checklistRes.data || []) : [];

        // Seed checklist if needed
        if (!alreadySeeded && existing.length === 0 && session.events?.length && session.weddingDate) {
          const seeds = buildSeedTasks(session.events, session.weddingDate);
          if (seeds.length > 0) {
            const bulkRes = await fetch(`${API}/api/couple/checklist/bulk`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ couple_id: session.id, tasks: seeds }),
            });
            const bulkD = await bulkRes.json();
            if (mounted && bulkD.success) setTasks(bulkD.data || []);
          }
          if (mounted) setSeeded(true);
        } else {
          if (mounted) { setTasks(existing); setSeeded(alreadySeeded); }
        }

        // Budget/expenses/shagun/guests/moodboard/vendors/templates
        if (mounted && budgetRes.success)   setBudget(budgetRes.data);
        if (mounted && expensesRes.success) setExpenses(expensesRes.data || []);
        if (mounted && shagunRes.success)   setShagun(shagunRes.data || []);
        if (mounted && guestsRes.success)   setGuests(guestsRes.data || []);
        if (mounted && pinsRes.success)     setPins(pinsRes.data || []);
        if (mounted && vendorsRes.success)  setVendors(vendorsRes.data || []);
        if (mounted)                        setWaTemplates(finalTemplates);
      } catch (e) {
        // Network failure — fall through silently
      }
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  const toggleComplete = async (id: string, nextValue: boolean) => {
    setTasks(prev => prev.map(t => t.id === id
      ? { ...t, is_complete: nextValue, completed_at: nextValue ? new Date().toISOString() : null }
      : t));
    try {
      await fetch(`${API}/api/couple/checklist/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_complete: nextValue }),
      });
    } catch {}
  };

  const updateTask = async (id: string, patch: Partial<ChecklistTask>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...patch } as ChecklistTask : t));
    try {
      await fetch(`${API}/api/couple/checklist/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
    } catch {}
  };

  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    try {
      await fetch(`${API}/api/couple/checklist/${id}`, { method: 'DELETE' });
    } catch {}
  };

  const addTask = async (payload: { event: string; text: string; priority: 'urgent' | 'normal'; due_date: string | null }) => {
    if (!session?.id) return;
    try {
      const res = await fetch(`${API}/api/couple/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, couple_id: session.id, is_custom: true }),
      });
      const d = await res.json();
      if (d.success && d.data) setTasks(prev => [...prev, d.data]);
    } catch {}
  };

  // ── Budget mutations ────────────────────────────────────────

  const updateBudget = async (patch: { total_budget?: number; event_envelopes?: Record<string, number> }) => {
    if (!session?.id) return;
    // Optimistic
    setBudget(prev => prev ? { ...prev, ...patch } : prev);
    try {
      const res = await fetch(`${API}/api/couple/budget/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const d = await res.json();
      if (d.success && d.data) setBudget(d.data);
    } catch {}
  };

  // ── Expense mutations ───────────────────────────────────────

  const addExpense = async (payload: Partial<Expense>) => {
    if (!session?.id) return null;
    try {
      const res = await fetch(`${API}/api/couple/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, couple_id: session.id }),
      });
      const d = await res.json();
      if (d.success && d.data) {
        setExpenses(prev => [d.data, ...prev]);
        return d.data as Expense;
      }
    } catch {}
    return null;
  };

  const updateExpense = async (id: string, patch: Partial<Expense>) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...patch } as Expense : e));
    try {
      const res = await fetch(`${API}/api/couple/expenses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const d = await res.json();
      if (d.success && d.data) {
        setExpenses(prev => prev.map(e => e.id === id ? d.data : e));
      }
    } catch {}
  };

  const deleteExpense = async (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    try {
      await fetch(`${API}/api/couple/expenses/${id}`, { method: 'DELETE' });
    } catch {}
  };

  // ── Shagun mutations ────────────────────────────────────────

  const addShagun = async (payload: Partial<ShagunEntry>) => {
    if (!session?.id) return;
    try {
      const res = await fetch(`${API}/api/couple/shagun`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, couple_id: session.id }),
      });
      const d = await res.json();
      if (d.success && d.data) setShagun(prev => [d.data, ...prev]);
    } catch {}
  };

  const updateShagun = async (id: string, patch: Partial<ShagunEntry>) => {
    setShagun(prev => prev.map(s => s.id === id ? { ...s, ...patch } as ShagunEntry : s));
    try {
      await fetch(`${API}/api/couple/shagun/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
    } catch {}
  };

  const deleteShagun = async (id: string) => {
    setShagun(prev => prev.filter(s => s.id !== id));
    try {
      await fetch(`${API}/api/couple/shagun/${id}`, { method: 'DELETE' });
    } catch {}
  };

  // ── Guest mutations ─────────────────────────────────────────

  const addGuest = async (payload: Partial<Guest>) => {
    if (!session?.id) return null;
    try {
      const res = await fetch(`${API}/api/couple/guests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          couple_id: session.id,
          added_by: session.id,
          added_by_name: session.name,
        }),
      });
      const d = await res.json();
      if (d.success && d.data) {
        setGuests(prev => [...prev, d.data]);
        return d.data as Guest;
      }
    } catch {}
    return null;
  };

  const updateGuest = async (id: string, patch: Partial<Guest>) => {
    setGuests(prev => prev.map(g => g.id === id ? { ...g, ...patch } as Guest : g));
    try {
      const res = await fetch(`${API}/api/couple/guests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const d = await res.json();
      if (d.success && d.data) setGuests(prev => prev.map(g => g.id === id ? d.data : g));
    } catch {}
  };

  const deleteGuest = async (id: string) => {
    // Un-link any household members client-side (backend does same)
    setGuests(prev => prev
      .filter(g => g.id !== id)
      .map(g => g.household_head_id === id ? { ...g, household_head_id: null } : g));
    try {
      await fetch(`${API}/api/couple/guests/${id}`, { method: 'DELETE' });
    } catch {}
  };

  // ── Moodboard mutations ─────────────────────────────────────

  const fetchOGPreview = async (url: string): Promise<OGPreview | null> => {
    try {
      const res = await fetch(`${API}/api/couple/moodboard/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const d = await res.json();
      if (d.success && d.data) return d.data;
    } catch {}
    return null;
  };

  const addPin = async (payload: Partial<MoodboardPin>) => {
    if (!session?.id) return null;
    try {
      const res = await fetch(`${API}/api/couple/moodboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          couple_id: session.id,
          added_by: session.id,
          added_by_name: session.name,
        }),
      });
      const d = await res.json();
      if (d.success && d.data) {
        setPins(prev => [d.data, ...prev]);
        return d.data as MoodboardPin;
      }
    } catch {}
    return null;
  };

  const updatePin = async (id: string, patch: Partial<MoodboardPin>) => {
    setPins(prev => prev.map(p => p.id === id ? { ...p, ...patch } as MoodboardPin : p));
    try {
      await fetch(`${API}/api/couple/moodboard/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
    } catch {}
  };

  const deletePin = async (id: string) => {
    setPins(prev => prev.filter(p => p.id !== id));
    try {
      await fetch(`${API}/api/couple/moodboard/${id}`, { method: 'DELETE' });
    } catch {}
  };

  // ── Vendor mutations ────────────────────────────────────────

  const addVendor = async (payload: Partial<Vendor>) => {
    if (!session?.id) return null;
    try {
      const res = await fetch(`${API}/api/couple/vendors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          couple_id: session.id,
          added_by: session.id,
          added_by_name: session.name,
        }),
      });
      const d = await res.json();
      if (d.success && d.data) {
        setVendors(prev => [d.data, ...prev]);
        return d.data as Vendor;
      }
    } catch {}
    return null;
  };

  const updateVendor = async (id: string, patch: Partial<Vendor>) => {
    setVendors(prev => prev.map(v => v.id === id ? { ...v, ...patch } as Vendor : v));
    try {
      const res = await fetch(`${API}/api/couple/vendors/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const d = await res.json();
      if (d.success && d.data) setVendors(prev => prev.map(v => v.id === id ? d.data : v));
    } catch {}
  };

  const deleteVendor = async (id: string) => {
    setVendors(prev => prev.filter(v => v.id !== id));
    try {
      await fetch(`${API}/api/couple/vendors/${id}`, { method: 'DELETE' });
    } catch {}
  };

  // ── WhatsApp template mutations ─────────────────────────────

  const addTemplate = async (payload: Partial<WATemplate>) => {
    if (!session?.id) return null;
    try {
      const res = await fetch(`${API}/api/couple/wa-templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, couple_id: session.id }),
      });
      const d = await res.json();
      if (d.success && d.data) {
        setWaTemplates(prev => [...prev, d.data]);
        return d.data as WATemplate;
      }
    } catch {}
    return null;
  };

  const updateTemplate = async (id: string, patch: Partial<WATemplate>) => {
    // Local optimistic update — handle is_default toggle (unset siblings)
    setWaTemplates(prev => prev.map(t => {
      if (t.id === id) return { ...t, ...patch } as WATemplate;
      if (patch.is_default === true) {
        const target = prev.find(x => x.id === id);
        if (target && t.context === target.context) return { ...t, is_default: false };
      }
      return t;
    }));
    try {
      const res = await fetch(`${API}/api/couple/wa-templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const d = await res.json();
      if (d.success && d.data) {
        // Refetch to ensure server-side default-unset is reflected
        const listRes = await fetch(`${API}/api/couple/wa-templates/${session?.id}`);
        const listD = await listRes.json();
        if (listD.success) setWaTemplates(listD.data || []);
      }
    } catch {}
  };

  const deleteTemplate = async (id: string) => {
    setWaTemplates(prev => prev.filter(t => t.id !== id));
    try {
      await fetch(`${API}/api/couple/wa-templates/${id}`, { method: 'DELETE' });
    } catch {}
  };

  // Submit feedback
  const submitFeedback = async (payload: { rating: string; message: string; screen: string }) => {
    if (!session?.id) return false;
    try {
      const res = await fetch(`${API}/api/couple/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, couple_id: session.id }),
      });
      const d = await res.json();
      return !!d.success;
    } catch {
      return false;
    }
  };

  // Mark founding bride intro as shown
  const dismissFoundingIntro = async () => {
    setShowFoundingIntro(false);
    if (!session?.id) return;
    try {
      await fetch(`${API}/api/couple/mark-founding-intro/${session.id}`, { method: 'PATCH' });
    } catch {}
  };

  return {
    tasks, loading, seeded, refreshTasks, toggleComplete, updateTask, deleteTask, addTask,
    budget, expenses, shagun, refreshBudget,
    updateBudget, addExpense, updateExpense, deleteExpense,
    addShagun, updateShagun, deleteShagun,
    guests, addGuest, updateGuest, deleteGuest, refreshGuests,
    pins, fetchOGPreview, addPin, updatePin, deletePin,
    vendors, addVendor, updateVendor, deleteVendor,
    waTemplates, addTemplate, updateTemplate, deleteTemplate,
    submitFeedback,
    showFoundingIntro, dismissFoundingIntro,
  };
}

// ─────────────────────────────────────────────────────────────
// BOTTOM NAV
// ─────────────────────────────────────────────────────────────

type MainTab = 'home' | 'plan' | 'circle';

function BottomNav({ active, onNav }: { active: MainTab; onNav: (t: MainTab) => void }) {
  const tabs: { id: MainTab; label: string; Icon: any }[] = [
    { id: 'home',   label: 'Home',       Icon: Home     },
    { id: 'plan',   label: 'My Wedding', Icon: BookOpen },
    { id: 'circle', label: 'Circle',     Icon: Users    },
  ];
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: C.ivory, borderTop: `1px solid ${C.border}`,
      display: 'flex', justifyContent: 'space-around',
      padding: 'max(8px, env(safe-area-inset-bottom)) 0 8px',
      zIndex: 50, maxWidth: 480, margin: '0 auto',
    }}>
      {tabs.map(t => {
        const a = active === t.id;
        return (
          <button key={t.id} onClick={() => onNav(t.id)} style={{
            display: 'flex', flexDirection: 'column' as const,
            alignItems: 'center', gap: 2,
            background: 'none', border: 'none', cursor: 'pointer', padding: '4px 16px',
          }}>
            <t.Icon size={20} color={a ? C.gold : C.mutedLight} />
            <span style={{
              fontSize: 10, fontWeight: a ? 500 : 300,
              color: a ? C.gold : C.mutedLight,
              fontFamily: 'DM Sans, sans-serif',
            }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODE TOGGLE
// Plan = full planner. Discover = Phase 3 (launching soon).
// Architecture note: when Discover is built, this toggle will
// switch the entire nav + UI. The wiring stays identical —
// only DiscoverTeaser gets replaced with the real browse UI.
// ─────────────────────────────────────────────────────────────

type AppMode = 'plan' | 'discover';

function ModeToggle({ mode, onSwitch }: { mode: AppMode; onSwitch: (m: AppMode) => void }) {
  return (
    <div style={{
      display: 'flex', background: C.cream,
      borderRadius: 20, border: `1px solid ${C.border}`, padding: 3,
    }}>
      {(['plan', 'discover'] as AppMode[]).map(m => (
        <button key={m} onClick={() => onSwitch(m)} style={{
          padding: '5px 16px', borderRadius: 16, border: 'none',
          background: mode === m ? C.dark : 'transparent',
          color: mode === m ? C.gold : C.muted,
          fontSize: 12, fontWeight: mode === m ? 500 : 400,
          fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
          letterSpacing: '0.3px', transition: 'all 0.15s',
        }}>
          {m === 'plan' ? 'Plan' : 'Discover'}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TOP BAR
// ─────────────────────────────────────────────────────────────

function TopBar({ mode, onSwitch, session, onProfileTap }: {
  mode: AppMode; onSwitch: (m: AppMode) => void;
  session: CoupleSession | null; onProfileTap: () => void;
}) {
  const initial = session?.name?.[0]?.toUpperCase() || '?';
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40,
      background: C.cream, borderBottom: `1px solid ${C.border}`,
      padding: 'max(12px, env(safe-area-inset-top)) 20px 10px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      maxWidth: 480, margin: '0 auto',
    }}>
      <span style={{
        fontFamily: 'Playfair Display, serif', fontSize: 15,
        color: C.gold, fontWeight: 400, letterSpacing: '1px',
      }}>TDW</span>
      <ModeToggle mode={mode} onSwitch={onSwitch} />
      <button onClick={onProfileTap} style={{
        width: 32, height: 32, borderRadius: 16,
        background: C.dark, border: 'none', cursor: 'pointer',
        color: C.gold, fontSize: 13, fontWeight: 500,
        fontFamily: 'DM Sans, sans-serif',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{initial}</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DISCOVER TEASER
// ─────────────────────────────────────────────────────────────

function DiscoverTeaser({ session, cNavPush, onBackToPlan }: { session: CoupleSession | null; cNavPush: (layer: string) => void; onBackToPlan: () => void }) {
  // ── Access gating ──
  const [accessStatus, setAccessStatus] = useState<'loading' | 'granted' | 'pending' | 'denied' | 'expired'>('loading');
  const [requestSent, setRequestSent] = useState(false);
  const [requestReason, setRequestReason] = useState('');

  // ── Layer: feed (default landing) or dash (back-swipe from feed) ──
  type Layer = 'feed' | 'dash';
  const [layer, setLayer] = useState<Layer>(() => {
    if (typeof window === 'undefined') return 'feed';
    return (localStorage.getItem('tdw_discover_layer') as Layer) || 'feed';
  });

  // ── Browse mode ──
  type BrowseMode = 'scroll' | 'carousel' | 'swipe';
  const [browseMode, setBrowseMode] = useState<BrowseMode>(() => {
    if (typeof window === 'undefined') return 'scroll';
    return (localStorage.getItem('tdw_discover_mode') as BrowseMode) || 'scroll';
  });
  const [blindMode, setBlindMode] = useState(false);

  // ── Feed filters (active session filters) ──
  const [feedCategory, setFeedCategory] = useState<string>('');
  const [feedCategories, setFeedCategories] = useState<string[]>([]); // for multi-select from dash layover
  const [feedBudgetMin, setFeedBudgetMin] = useState(0);
  const [feedBudgetMax, setFeedBudgetMax] = useState(5000000);
  const [feedCity, setFeedCity] = useState('');
  const [feedDate, setFeedDate] = useState('');

  // ── Vendors ──
  const [vendors, setVendors] = useState<any[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0);

  // ── Category layover (Dash → Feed) ──
  const [showCategoryLayover, setShowCategoryLayover] = useState(false);
  const [layoverCategories, setLayoverCategories] = useState<string[]>([]);
  const [layoverBudgetMin, setLayoverBudgetMin] = useState(0);
  const [layoverBudgetMax, setLayoverBudgetMax] = useState(5000000);
  const [layoverCity, setLayoverCity] = useState('');
  const [layoverDate, setLayoverDate] = useState('');

  // ── Filter sheet (from Feed via filter button) ──
  const [showFilter, setShowFilter] = useState(false);

  // ── Moodboard saves ──
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [undoVendor, setUndoVendor] = useState<any>(null);
  const saveToastTimer = useRef<any>(null);

  // ── Vendor profile slide-up ──
  const [profileVendor, setProfileVendor] = useState<any>(null);
  const [profileVisible, setProfileVisible] = useState(false);
  const profileContentRef = useRef<HTMLDivElement>(null);
  const profileStartY = useRef(0);
  const profileDeltaY = useRef(0);
  const [profileOffset, setProfileOffset] = useState(0);

  // ── Gesture state for Feed card transitions ──
  const [gestureOffset, setGestureOffset] = useState({ x: 0, y: 0 });
  const [isGesturing, setIsGesturing] = useState(false);
  const gestureStart = useRef({ x: 0, y: 0 });
  const gestureDelta = useRef({ x: 0, y: 0 });
  const lastTapTime = useRef(0);

  // ── Featured boards ──
  const [boardItems, setBoardItems] = useState<any[]>([]);

  // ── Sticky per-category filter state ──
  type CategoryFilter = { budget_min: number; budget_max: number; city: string; date: string };
  const getStickyFilters = (): Record<string, CategoryFilter> => {
    if (typeof window === 'undefined') return {};
    try {
      return JSON.parse(localStorage.getItem('tdw_discover_category_filters') || '{}');
    } catch { return {}; }
  };
  const setStickyFilters = (next: Record<string, CategoryFilter>) => {
    try { localStorage.setItem('tdw_discover_category_filters', JSON.stringify(next)); } catch {}
  };
  const saveToSticky = (categories: string[], filter: CategoryFilter) => {
    if (categories.length === 0) return;
    const all = getStickyFilters();
    for (const cat of categories) { all[cat] = { ...filter }; }
    setStickyFilters(all);
  };
  const readFromSticky = (category: string): CategoryFilter | null => {
    const all = getStickyFilters();
    return all[category] || null;
  };

  const CATEGORIES = [
    { id: 'venues', label: 'Venues' },
    { id: 'photographers', label: 'Photographers' },
    { id: 'mua', label: 'Makeup Artists' },
    { id: 'designers', label: 'Designers' },
    { id: 'jewellery', label: 'Jewellery' },
    { id: 'choreographers', label: 'Choreographers' },
    { id: 'content-creators', label: 'Content Creators' },
    { id: 'dj', label: 'DJ & Music' },
    { id: 'event-managers', label: 'Event Managers' },
    { id: 'bridal-wellness', label: 'Bridal Wellness' },
  ];

  const CITIES = ['Delhi NCR', 'Mumbai', 'Bangalore', 'Jaipur', 'Udaipur', 'Kolkata', 'Chennai', 'Hyderabad', 'Lucknow', 'Goa', 'Chandigarh', 'Pune'];

  // ── Check access on mount ──
  useEffect(() => {
    if (!session?.id) { setAccessStatus('denied'); return; }
    fetch(`${API}/api/discover/status?user_id=${session.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.enabled) setAccessStatus('granted');
        else if (d.pending_request) setAccessStatus('pending');
        else if (d.reason === 'expired') setAccessStatus('expired');
        else setAccessStatus('denied');
      })
      .catch(() => setAccessStatus('denied'));
  }, [session?.id]);

  // Persist layer
  useEffect(() => {
    try { localStorage.setItem('tdw_discover_layer', layer); } catch {}
  }, [layer]);

  // ── Load vendors when filters change ──
  useEffect(() => {
    if (accessStatus !== 'granted') return;
    loadVendors();
  }, [accessStatus, feedCategory, feedCategories, feedCity, feedBudgetMin, feedBudgetMax]);

  // Load featured boards once
  useEffect(() => {
    if (accessStatus !== 'granted') return;
    loadBoards();
  }, [accessStatus]);

  const loadVendors = async () => {
    setVendorsLoading(true);
    try {
      let url = `${API}/api/vendors?`;
      if (feedCategory) url += `category=${feedCategory}&`;
      if (feedCity) url += `city=${encodeURIComponent(feedCity)}&`;
      const res = await fetch(url);
      const d = await res.json();
      let list = d.data || [];
      // Multi-category filter (applied client-side)
      if (feedCategories.length > 0 && !feedCategory) {
        list = list.filter((v: any) => feedCategories.includes(v.category));
      }
      if (feedBudgetMin > 0) list = list.filter((v: any) => (v.starting_price || 0) >= feedBudgetMin);
      if (feedBudgetMax < 5000000) list = list.filter((v: any) => (v.starting_price || 0) <= feedBudgetMax);
      // Shuffle for freshness
      list.sort(() => Math.random() - 0.5);
      setVendors(list);
      setCurrentIndex(0);
      currentIndexRef.current = 0;
    } catch { setVendors([]); }
    setVendorsLoading(false);
  };

  const loadBoards = async () => {
    try {
      const res = await fetch(`${API}/api/featured-boards`);
      const d = await res.json();
      if (d.success) setBoardItems(d.data || []);
    } catch {}
  };

  // ── Back-swipe handler ──
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === 'discover-profile') closeProfile();
      else if (detail === 'discover-filter') setShowFilter(false);
      else if (detail === 'discover-layover') setShowCategoryLayover(false);
      else if (detail === 'discover-feed-to-dash') setLayer('dash');
    };
    window.addEventListener('tdw-discover-back', handler);
    return () => window.removeEventListener('tdw-discover-back', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When entering Feed layer, push history so back-swipe goes to Dash (not Plan)
  useEffect(() => {
    if (accessStatus === 'granted' && layer === 'feed') {
      cNavPush('discover-feed-to-dash');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessStatus, layer === 'feed']);

  // ── Mode switch ──
  const cycleMode = () => {
    const modes: BrowseMode[] = ['scroll', 'carousel', 'swipe'];
    const next = modes[(modes.indexOf(browseMode) + 1) % 3];
    setBrowseMode(next);
    localStorage.setItem('tdw_discover_mode', next);
    // Reset gesture state on mode change
    setGestureOffset({ x: 0, y: 0 });
    setIsGesturing(false);
  };

  const modeIcon = browseMode === 'scroll' ? '↕' : browseMode === 'carousel' ? '↔' : '↗';
  const modeLabel = browseMode === 'scroll' ? 'Scroll' : browseMode === 'carousel' ? 'Carousel' : 'Swipe';

  // ── Save / skip ──
  const handleSave = (vendor: any) => {
    if (!vendor || savedIds.has(vendor.id)) return;
    setSavedIds(prev => new Set(prev).add(vendor.id));
    if (session?.id) {
      fetch(`${API}/api/couple/moodboard`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couple_id: session.id, vendor_id: vendor.id, vendor_name: vendor.name, vendor_category: vendor.category, vendor_image: vendor.portfolio_images?.[0] || '', event: 'general' }),
      }).catch(() => {});
    }
    showSaveToast(blindMode ? 'Saved to moodboard' : `${vendor.name} saved`);
  };

  const handleSkip = (vendor: any) => {
    setUndoVendor(vendor);
    showSaveToast('Skipped — Undo');
    goNext();
  };

  const handleUndo = () => {
    if (!undoVendor) return;
    setCurrentIndex(prev => Math.max(0, prev - 1));
    currentIndexRef.current = Math.max(0, currentIndexRef.current - 1);
    setUndoVendor(null);
    setSaveToast(null);
  };

  const goNext = () => {
    setCurrentIndex(prev => {
      const n = Math.min(vendors.length - 1, prev + 1);
      currentIndexRef.current = n;
      return n;
    });
  };

  const goPrev = () => {
    setCurrentIndex(prev => {
      const n = Math.max(0, prev - 1);
      currentIndexRef.current = n;
      return n;
    });
  };

  const showSaveToast = (msg: string) => {
    setSaveToast(msg);
    if (saveToastTimer.current) clearTimeout(saveToastTimer.current);
    saveToastTimer.current = setTimeout(() => { setSaveToast(null); setUndoVendor(null); }, 3000);
  };

  // ── Double-tap handler ──
  const handleCardTap = (vendor: any) => {
    const now = Date.now();
    if (now - lastTapTime.current < 300) {
      handleSave(vendor);
      lastTapTime.current = 0;
    } else {
      lastTapTime.current = now;
    }
  };

  // ── Unified gesture handling for Feed ──
  const handleCardTouchStart = (e: React.TouchEvent) => {
    gestureStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    gestureDelta.current = { x: 0, y: 0 };
  };

  const handleCardTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - gestureStart.current.x;
    const dy = e.touches[0].clientY - gestureStart.current.y;
    gestureDelta.current = { x: dx, y: dy };

    if (browseMode === 'scroll') {
      // Vertical only — ignore horizontal movement once vertical intent is clear
      if (Math.abs(dy) > 10) {
        setIsGesturing(true);
        setGestureOffset({ x: 0, y: dy });
      }
    } else if (browseMode === 'carousel') {
      if (Math.abs(dx) > 10) {
        setIsGesturing(true);
        setGestureOffset({ x: dx, y: 0 });
      }
    } else if (browseMode === 'swipe') {
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
        setIsGesturing(true);
        setGestureOffset({ x: dx, y: 0 });
      }
    }
  };

  const handleCardTouchEnd = () => {
    const { x: dx, y: dy } = gestureDelta.current;
    const threshold = 80;

    if (browseMode === 'scroll') {
      if (dy < -threshold) goNext();
      else if (dy > threshold) goPrev();
    } else if (browseMode === 'carousel') {
      if (dx < -threshold) goNext();
      else if (dx > threshold) goPrev();
    } else if (browseMode === 'swipe') {
      if (dx > threshold) { handleSave(vendors[currentIndex]); goNext(); }
      else if (dx < -threshold) { handleSkip(vendors[currentIndex]); }
    }

    // Reset
    setGestureOffset({ x: 0, y: 0 });
    setIsGesturing(false);
    gestureDelta.current = { x: 0, y: 0 };
  };

  // ── Profile slide-down dismissal ──
  const handleProfileTouchStart = (e: React.TouchEvent) => {
    // Only listen near top of profile content (the handle area or when at scroll 0)
    const scrollTop = profileContentRef.current?.scrollTop || 0;
    if (scrollTop > 5) return;
    profileStartY.current = e.touches[0].clientY;
    profileDeltaY.current = 0;
  };

  const handleProfileTouchMove = (e: React.TouchEvent) => {
    if (profileStartY.current === 0) return;
    const dy = e.touches[0].clientY - profileStartY.current;
    if (dy > 0) {
      profileDeltaY.current = dy;
      setProfileOffset(dy);
    }
  };

  const handleProfileTouchEnd = () => {
    if (profileDeltaY.current > 100) {
      closeProfile();
    }
    setProfileOffset(0);
    profileStartY.current = 0;
    profileDeltaY.current = 0;
  };

  // ── Open / close profile ──
  const openProfile = (vendor: any) => {
    setProfileVendor(vendor);
    setProfileVisible(true);
    cNavPush('discover-profile');
  };

  const closeProfile = () => {
    setProfileVisible(false);
    setTimeout(() => setProfileVendor(null), 300);
  };

  // ── Category tap from Dash → layover ──
  const openCategoryLayover = (category: string) => {
    const sticky = readFromSticky(category);
    setLayoverCategories([category]);
    setLayoverBudgetMin(sticky?.budget_min ?? 0);
    setLayoverBudgetMax(sticky?.budget_max ?? 5000000);
    setLayoverCity(sticky?.city ?? '');
    setLayoverDate(sticky?.date ?? '');
    setShowCategoryLayover(true);
    cNavPush('discover-layover');
  };

  // ── Multi-category layover from Dash "Start browsing" ──
  const openMultiLayover = () => {
    setLayoverCategories([]);
    setLayoverBudgetMin(0);
    setLayoverBudgetMax(5000000);
    setLayoverCity('');
    setLayoverDate('');
    setShowCategoryLayover(true);
    cNavPush('discover-layover');
  };

  const applyLayoverFilters = () => {
    // Save to sticky
    saveToSticky(layoverCategories, {
      budget_min: layoverBudgetMin,
      budget_max: layoverBudgetMax,
      city: layoverCity,
      date: layoverDate,
    });
    // Apply to feed
    if (layoverCategories.length === 1) {
      setFeedCategory(layoverCategories[0]);
      setFeedCategories([]);
    } else {
      setFeedCategory('');
      setFeedCategories(layoverCategories);
    }
    setFeedBudgetMin(layoverBudgetMin);
    setFeedBudgetMax(layoverBudgetMax);
    setFeedCity(layoverCity);
    setFeedDate(layoverDate);
    setShowCategoryLayover(false);
    setLayer('feed');
  };

  const browseAllFromLayover = () => {
    // Apply categories only, no other filters
    if (layoverCategories.length === 1) {
      setFeedCategory(layoverCategories[0]);
      setFeedCategories([]);
    } else if (layoverCategories.length > 1) {
      setFeedCategory('');
      setFeedCategories(layoverCategories);
    } else {
      // No category picked → all vendors
      setFeedCategory('');
      setFeedCategories([]);
    }
    setFeedBudgetMin(0);
    setFeedBudgetMax(5000000);
    setFeedCity('');
    setFeedDate('');
    setShowCategoryLayover(false);
    setLayer('feed');
  };

  // ── Feed filter sheet apply (saves to sticky if single category active) ──
  const applyFeedFilters = () => {
    if (feedCategory) {
      saveToSticky([feedCategory], {
        budget_min: feedBudgetMin,
        budget_max: feedBudgetMax,
        city: feedCity,
        date: feedDate,
      });
    }
    setShowFilter(false);
  };

  const clearFeedFilters = () => {
    setFeedCategory('');
    setFeedCategories([]);
    setFeedBudgetMin(0);
    setFeedBudgetMax(5000000);
    setFeedCity('');
    setFeedDate('');
    setShowFilter(false);
  };

  const hasActiveFilters = feedCategory || feedCategories.length > 0 || feedBudgetMin > 0 || feedBudgetMax < 5000000 || feedCity;

  // ── Request access ──
  const submitAccessRequest = async () => {
    if (!session?.id) return;
    try {
      await fetch(`${API}/api/discover/request-access`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: session.id, reason: requestReason || null }),
      });
      setRequestSent(true);
      setAccessStatus('pending');
    } catch {}
  };

  // ── Format price ──
  const fmtPrice = (p: number) => {
    if (!p) return '';
    if (p >= 100000) return `₹${(p / 100000).toFixed(p % 100000 === 0 ? 0 : 1)}L`;
    if (p >= 1000) return `₹${(p / 1000).toFixed(0)}K`;
    return `₹${p}`;
  };

  // ══════════════════════════════════════════════════════════════
  // ACCESS GATE — invite-only teaser
  // ══════════════════════════════════════════════════════════════
  if (accessStatus === 'loading') {
    return (
      <div style={{ padding: '120px 28px', textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, border: `2px solid ${C.goldBorder}`, borderTopColor: C.gold, borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (accessStatus !== 'granted') {
    return (
      <div style={{ padding: '80px 28px 100px', textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 20,
          background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <Compass size={28} color={C.gold} />
        </div>
        <h2 style={{
          fontFamily: 'Playfair Display, serif', fontSize: 26,
          color: C.dark, margin: '0 0 10px', fontWeight: 400,
        }}>Discover is in beta.</h2>
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: C.muted,
          fontWeight: 300, lineHeight: '22px', margin: '0 0 28px',
        }}>
          A curated marketplace for your wedding. Book India's finest photographers,
          decorators, and artists — handpicked by us. Currently available by invitation.
        </p>

        {accessStatus === 'pending' || requestSent ? (
          <div style={{
            background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
            borderRadius: 12, padding: '14px 20px', maxWidth: 300, margin: '0 auto',
          }}>
            <p style={{ margin: 0, fontSize: 14, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 400 }}>
              You're on the list. We'll notify you when your access is ready.
            </p>
          </div>
        ) : (
          <div style={{ maxWidth: 320, margin: '0 auto' }}>
            <textarea
              value={requestReason}
              onChange={e => setRequestReason(e.target.value)}
              placeholder="Tell us about your wedding (optional)"
              rows={2}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                border: `1px solid ${C.border}`, background: C.ivory,
                fontFamily: 'DM Sans, sans-serif', fontSize: 13,
                color: C.dark, outline: 'none', resize: 'none', marginBottom: 12,
                boxSizing: 'border-box' as const,
              }}
            />
            <button onClick={submitAccessRequest} style={{
              width: '100%', padding: '14px', borderRadius: 10, background: C.dark,
              border: 'none', cursor: 'pointer', color: C.gold,
              fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 500,
              letterSpacing: '0.5px',
            }}>Request Early Access</button>
            <p style={{ margin: '10px 0 0', fontSize: 11, color: C.mutedLight, fontFamily: 'DM Sans, sans-serif' }}>
              No spam. Just a message when we're ready.
            </p>
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // HELPERS FOR FEED RENDER
  // ══════════════════════════════════════════════════════════════
  const getHeroImage = (v: any) => {
    const imgs = v?.featured_photos?.length > 0 ? v.featured_photos : v?.portfolio_images;
    return imgs?.[0] || '';
  };

  const vendor = vendors[currentIndex];
  const nextVendor = vendors[currentIndex + 1];
  const prevVendor = currentIndex > 0 ? vendors[currentIndex - 1] : null;

  // Preload next vendor image
  useEffect(() => {
    if (nextVendor && typeof window !== 'undefined') {
      const img = new Image();
      img.src = getHeroImage(nextVendor);
    }
  }, [currentIndex, nextVendor]);

  // ══════════════════════════════════════════════════════════════
  // DISCOVER DASH — landing after back-swipe from Feed
  // ══════════════════════════════════════════════════════════════
  if (layer === 'dash') {
    const editorPicks = boardItems.filter(b => b.board_type === 'spotlight' || b.board_type === 'look_book');
    const offers = boardItems.filter(b => b.board_type === 'special_offers');
    const savedVendorsList = vendors.filter(v => savedIds.has(v.id)).slice(0, 10);

    return (
      <div style={{ minHeight: 'calc(100vh - 60px)', background: C.cream, paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>

        {/* Hero / greeting */}
        <div style={{ padding: '24px 20px 12px' }}>
          <p style={{ margin: '0 0 4px', fontSize: 11, color: C.gold, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, letterSpacing: '3px', textTransform: 'uppercase' as const }}>
            Discover
          </p>
          <h2 style={{ margin: 0, fontSize: 24, color: C.dark, fontFamily: 'Playfair Display, serif', fontWeight: 400, lineHeight: '30px' }}>
            Find the people behind your perfect day.
          </h2>
        </div>

        {/* Start browsing CTA */}
        <div style={{ padding: '8px 20px 20px' }}>
          <button onClick={openMultiLayover} style={{
            width: '100%', padding: '16px 20px', borderRadius: 14,
            background: C.dark, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            color: C.gold, fontSize: 14, fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Compass size={16} color={C.gold} />
              Start browsing
            </span>
            <ChevronRight size={16} color={C.gold} />
          </button>
        </div>

        {/* Categories */}
        <div style={{ padding: '0 20px 24px' }}>
          <p style={{ margin: '0 0 12px', fontSize: 10, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, letterSpacing: '3px', textTransform: 'uppercase' as const }}>
            Browse by category
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {CATEGORIES.map(cat => {
              const sticky = readFromSticky(cat.id);
              const hasSticky = sticky && (sticky.budget_max < 5000000 || sticky.budget_min > 0 || sticky.city || sticky.date);
              return (
                <button key={cat.id} onClick={() => openCategoryLayover(cat.id)} style={{
                  padding: '16px 14px', borderRadius: 12,
                  background: C.ivory, border: `1px solid ${C.border}`, cursor: 'pointer',
                  textAlign: 'left' as const, position: 'relative' as const,
                }}>
                  <p style={{ margin: '0 0 2px', fontSize: 14, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                    {cat.label}
                  </p>
                  {hasSticky && (
                    <p style={{ margin: 0, fontSize: 10, color: C.gold, fontFamily: 'DM Sans, sans-serif', fontWeight: 400 }}>
                      ● Saved filters
                    </p>
                  )}
                  {!hasSticky && (
                    <p style={{ margin: 0, fontSize: 10, color: C.mutedLight, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
                      Tap to browse
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Editor's Picks */}
        {editorPicks.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ margin: '0 0 12px', padding: '0 20px', fontSize: 10, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, letterSpacing: '3px', textTransform: 'uppercase' as const }}>
              Editor's picks
            </p>
            <div style={{ display: 'flex', gap: 12, overflow: 'auto', padding: '0 20px', scrollbarWidth: 'none' as const }}>
              {editorPicks.map(item => (
                <div key={item.id} onClick={() => {
                  if (item.vendor_id) {
                    const v = vendors.find(vv => vv.id === item.vendor_id);
                    if (v) { setLayer('feed'); setTimeout(() => openProfile(v), 100); }
                  }
                }} style={{
                  minWidth: 240, maxWidth: 240, borderRadius: 14, overflow: 'hidden',
                  background: C.ivory, border: `1px solid ${C.border}`, cursor: 'pointer',
                  flexShrink: 0,
                }}>
                  <div style={{
                    height: 150, background: item.image_url ? `url(${item.image_url}) center/cover` : C.goldSoft,
                  }} />
                  <div style={{ padding: '12px 14px' }}>
                    <p style={{ margin: '0 0 2px', fontSize: 14, color: C.dark, fontFamily: 'Playfair Display, serif', fontWeight: 400 }}>
                      {item.vendor_name || item.title}
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
                      {item.subtitle || item.category}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Special Offers */}
        {offers.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ margin: '0 0 12px', padding: '0 20px', fontSize: 10, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, letterSpacing: '3px', textTransform: 'uppercase' as const }}>
              Special offers
            </p>
            <div style={{ display: 'flex', gap: 12, overflow: 'auto', padding: '0 20px', scrollbarWidth: 'none' as const }}>
              {offers.map(item => (
                <div key={item.id} onClick={() => {
                  if (item.vendor_id) {
                    const v = vendors.find(vv => vv.id === item.vendor_id);
                    if (v) { setLayer('feed'); setTimeout(() => openProfile(v), 100); }
                  }
                }} style={{
                  minWidth: 240, maxWidth: 240, borderRadius: 14, overflow: 'hidden',
                  background: C.ivory, border: `1px solid ${C.border}`, cursor: 'pointer',
                  flexShrink: 0,
                }}>
                  <div style={{
                    height: 150, background: item.image_url ? `url(${item.image_url}) center/cover` : C.goldSoft,
                    position: 'relative' as const,
                  }}>
                    {item.promo_text && (
                      <div style={{
                        position: 'absolute', bottom: 8, left: 8, background: C.gold,
                        borderRadius: 6, padding: '3px 8px', fontSize: 10, color: C.dark,
                        fontWeight: 500, fontFamily: 'DM Sans, sans-serif',
                      }}>{item.promo_text}</div>
                    )}
                  </div>
                  <div style={{ padding: '12px 14px' }}>
                    <p style={{ margin: '0 0 2px', fontSize: 14, color: C.dark, fontFamily: 'Playfair Display, serif', fontWeight: 400 }}>
                      {item.vendor_name || item.title}
                    </p>
                    {item.promo_price && (
                      <p style={{ margin: 0, fontSize: 12, color: C.gold, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                        {item.promo_price}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recently saved */}
        {savedVendorsList.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ margin: '0 0 12px', padding: '0 20px', fontSize: 10, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, letterSpacing: '3px', textTransform: 'uppercase' as const }}>
              Recently saved
            </p>
            <div style={{ display: 'flex', gap: 12, overflow: 'auto', padding: '0 20px', scrollbarWidth: 'none' as const }}>
              {savedVendorsList.map(v => (
                <div key={v.id} onClick={() => { setLayer('feed'); setTimeout(() => openProfile(v), 100); }} style={{
                  minWidth: 140, maxWidth: 140, cursor: 'pointer', flexShrink: 0,
                }}>
                  <div style={{
                    width: '100%', aspectRatio: '3/4', borderRadius: 12,
                    background: `url(${getHeroImage(v)}) center/cover`,
                    marginBottom: 8, border: `1px solid ${C.border}`,
                  }} />
                  <p style={{ margin: 0, fontSize: 12, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 400, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {v.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CATEGORY LAYOVER (also appears here) */}
        {showCategoryLayover && renderCategoryLayover()}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // FEED — full-screen immersive browse
  // ══════════════════════════════════════════════════════════════
  if (vendorsLoading) {
    return (
      <div style={{ height: 'calc(100vh - 60px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.cream }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: `2px solid ${C.goldBorder}`, borderTopColor: C.gold, borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ fontSize: 13, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>Finding vendors for you...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (vendors.length === 0) {
    return (
      <div style={{ height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 28px', textAlign: 'center' }}>
        <Compass size={40} color={C.goldBorder} />
        <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, color: C.dark, margin: '16px 0 8px', fontWeight: 400 }}>No vendors match your filters</h3>
        <p style={{ fontSize: 13, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300, marginBottom: 20 }}>Try widening your search or go back to browse more</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={clearFeedFilters} style={{
            background: C.ivory, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 20px',
            color: C.dark, fontSize: 12, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer',
          }}>Clear filters</button>
          <button onClick={() => setLayer('dash')} style={{
            background: C.dark, border: 'none', borderRadius: 10, padding: '12px 20px',
            color: C.gold, fontSize: 12, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer',
          }}>Go to Dash</button>
        </div>
      </div>
    );
  }

  // End of stack for swipe mode
  if (currentIndex >= vendors.length && browseMode === 'swipe') {
    return (
      <div style={{ height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 28px', textAlign: 'center' }}>
        <Check size={40} color={C.gold} />
        <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, color: C.dark, margin: '16px 0 8px', fontWeight: 400 }}>
          You've seen everyone
        </h3>
        <p style={{ fontSize: 13, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300, marginBottom: 20 }}>
          {savedIds.size > 0 ? `${savedIds.size} vendor${savedIds.size !== 1 ? 's' : ''} saved to your Moodboard` : 'Try adjusting your filters for more options'}
        </p>
        <button onClick={() => { setCurrentIndex(0); currentIndexRef.current = 0; }} style={{
          background: C.dark, border: 'none', borderRadius: 10, padding: '12px 24px',
          color: C.gold, fontSize: 12, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer',
        }}>Start over</button>
      </div>
    );
  }

  // ── Render card content (shared between current/next/prev) ──
  const renderCardContent = (v: any, isActive: boolean) => {
    if (!v) return null;
    const isSaved = savedIds.has(v.id);
    return (
      <>
        <img src={getHeroImage(v)} alt={blindMode ? '' : v.name}
          loading="eager" decoding="async"
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center',
          }}
        />
        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%',
          background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
          pointerEvents: 'none',
        }} />

        {isActive && (
          <>
            {/* Top overlay row — counter + controls */}
            <div style={{
              position: 'absolute',
              top: 'max(12px, env(safe-area-inset-top))',
              left: 12, right: 12,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 5,
            }}>
              <span style={{
                background: 'rgba(0,0,0,0.45)', borderRadius: 20, padding: '5px 11px',
                fontSize: 11, color: '#fff', fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
                backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
              }}>
                {currentIndex + 1} / {vendors.length}
              </span>

              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={e => { e.stopPropagation(); setBlindMode(!blindMode); }} style={{
                  background: blindMode ? C.gold : 'rgba(0,0,0,0.45)', border: 'none',
                  borderRadius: 20, padding: '6px 11px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                  backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
                }}>
                  {blindMode ? <EyeOff size={12} color={C.dark} /> : <Eye size={12} color="#fff" />}
                  <span style={{ fontSize: 10, color: blindMode ? C.dark : '#fff', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>Blind</span>
                </button>

                <button onClick={e => { e.stopPropagation(); cycleMode(); }} style={{
                  background: 'rgba(0,0,0,0.45)', border: 'none',
                  borderRadius: 20, padding: '6px 11px', cursor: 'pointer',
                  backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <span style={{ fontSize: 11, color: '#fff' }}>{modeIcon}</span>
                  <span style={{ fontSize: 10, color: '#fff', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>{modeLabel}</span>
                </button>

                <button onClick={e => { e.stopPropagation(); setShowFilter(true); cNavPush('discover-filter'); }} style={{
                  background: hasActiveFilters ? C.gold : 'rgba(0,0,0,0.45)', border: 'none',
                  borderRadius: 20, width: 30, height: 28, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
                }}>
                  <Zap size={12} color={hasActiveFilters ? C.dark : '#fff'} />
                </button>
              </div>
            </div>

            {/* Swipe mode overlays */}
            {browseMode === 'swipe' && gestureOffset.x > 50 && (
              <div style={{
                position: 'absolute', top: '40%', left: 24, zIndex: 10,
                background: 'rgba(201,168,76,0.9)', borderRadius: 12, padding: '8px 20px',
                transform: 'rotate(-12deg)',
              }}>
                <span style={{ fontSize: 22, fontWeight: 600, color: C.dark, fontFamily: 'Playfair Display, serif', letterSpacing: 2 }}>SAVE</span>
              </div>
            )}
            {browseMode === 'swipe' && gestureOffset.x < -50 && (
              <div style={{
                position: 'absolute', top: '40%', right: 24, zIndex: 10,
                background: 'rgba(198,87,87,0.9)', borderRadius: 12, padding: '8px 20px',
                transform: 'rotate(12deg)',
              }}>
                <span style={{ fontSize: 22, fontWeight: 600, color: '#fff', fontFamily: 'Playfair Display, serif', letterSpacing: 2 }}>SKIP</span>
              </div>
            )}

            {/* Saved indicator */}
            {isSaved && (
              <div style={{ position: 'absolute', top: 'max(52px, calc(env(safe-area-inset-top) + 44px))', left: '50%', transform: 'translateX(-50%)', zIndex: 6 }}>
                <div style={{ background: C.gold, borderRadius: 20, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Heart size={10} color={C.dark} fill={C.dark} />
                  <span style={{ fontSize: 10, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>Saved</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Bottom info */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '24px 20px max(20px, env(safe-area-inset-bottom))',
          zIndex: 5,
        }}>
          {blindMode ? (
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 11, color: C.gold, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, letterSpacing: '2px', textTransform: 'uppercase' as const }}>Blind mode — judge the work</p>
              <p style={{ margin: '0 0 10px', fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
                {v.category?.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
              </p>
              {v.vibe_tags?.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                  {v.vibe_tags.slice(0, 3).map((t: string) => (
                    <span key={t} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '3px 10px', fontSize: 11, color: '#fff', fontFamily: 'DM Sans, sans-serif', backdropFilter: 'blur(4px)' }}>{t}</span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: 22, color: '#fff', fontFamily: 'Playfair Display, serif', fontWeight: 400 }}>{v.name}</h3>
              <p style={{ margin: '0 0 8px', fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
                {v.category?.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} · {v.city}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const }}>
                {v.starting_price > 0 && (
                  <span style={{ background: 'rgba(201,168,76,0.2)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 20, padding: '3px 10px', fontSize: 12, color: C.gold, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                    {fmtPrice(v.starting_price)} onwards
                  </span>
                )}
                {v.vibe_tags?.slice(0, 2).map((t: string) => (
                  <span key={t} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '3px 10px', fontSize: 11, color: '#fff', fontFamily: 'DM Sans, sans-serif' }}>{t}</span>
                ))}
                {v.rating > 0 && (
                  <span style={{ fontSize: 12, color: C.gold, fontFamily: 'DM Sans, sans-serif' }}>★ {v.rating}</span>
                )}
              </div>
            </div>
          )}

          {isActive && (
            <button onClick={e => { e.stopPropagation(); openProfile(v); }} style={{
              marginTop: 14, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 10, padding: '10px 16px', cursor: 'pointer', width: '100%',
              color: '#fff', fontSize: 12, fontFamily: 'DM Sans, sans-serif', fontWeight: 400,
              backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
              letterSpacing: '0.3px',
            }}>
              View profile
            </button>
          )}
        </div>
      </>
    );
  };

  // ── Swipe mode action buttons ──
  const renderSwipeActions = () => {
    if (browseMode !== 'swipe' || !vendor) return null;
    return (
      <div style={{
        position: 'absolute', bottom: 'max(100px, calc(env(safe-area-inset-bottom) + 90px))',
        left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 20, zIndex: 6,
      }}>
        <button onClick={e => { e.stopPropagation(); handleSkip(vendor); }} style={{
          width: 48, height: 48, borderRadius: 24, background: 'rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        }}>
          <X size={20} color="#fff" />
        </button>
        <button onClick={e => { e.stopPropagation(); openProfile(vendor); }} style={{
          width: 48, height: 48, borderRadius: 24, background: 'rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        }}>
          <Eye size={18} color="#fff" />
        </button>
        <button onClick={e => { e.stopPropagation(); handleSave(vendor); goNext(); }} style={{
          width: 56, height: 56, borderRadius: 28, background: C.gold,
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Heart size={24} color={C.dark} />
        </button>
      </div>
    );
  };

  // ── Compute transforms for card stack (manual gesture transitions) ──
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800;
  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 400;

  let currentTransform = 'translate3d(0,0,0)';
  let nextTransform = 'translate3d(0,100%,0)';
  let prevTransform = 'translate3d(0,-100%,0)';

  if (browseMode === 'scroll') {
    currentTransform = `translate3d(0, ${gestureOffset.y}px, 0)`;
    nextTransform = `translate3d(0, calc(100% + ${gestureOffset.y}px), 0)`;
    prevTransform = `translate3d(0, calc(-100% + ${gestureOffset.y}px), 0)`;
  } else if (browseMode === 'carousel') {
    currentTransform = `translate3d(${gestureOffset.x}px, 0, 0)`;
    nextTransform = `translate3d(calc(100% + ${gestureOffset.x}px), 0, 0)`;
    prevTransform = `translate3d(calc(-100% + ${gestureOffset.x}px), 0, 0)`;
  } else if (browseMode === 'swipe') {
    const rotate = gestureOffset.x * 0.03;
    currentTransform = `translate3d(${gestureOffset.x}px, 0, 0) rotate(${rotate}deg)`;
    nextTransform = 'scale(0.95) translate3d(0,0,0)';
  }

  // ══════════════════════════════════════════════════════════════
  // CATEGORY LAYOVER — shared render function
  // ══════════════════════════════════════════════════════════════
  function renderCategoryLayover() {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end',
      }} onClick={() => setShowCategoryLayover(false)}>
        <div onClick={e => e.stopPropagation()} style={{
          width: '100%', maxWidth: 480, margin: '0 auto',
          background: C.cream, borderRadius: '20px 20px 0 0',
          padding: '20px 20px max(24px, env(safe-area-inset-bottom))',
          maxHeight: '85vh', overflow: 'auto',
          overscrollBehavior: 'contain' as const,
        }}>
          <div style={{ padding: '6px 0 12px', textAlign: 'center' as const }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border, margin: '0 auto' }} />
          </div>

          <h3 style={{ margin: '0 0 4px', fontSize: 20, fontFamily: 'Playfair Display, serif', color: C.dark, fontWeight: 400 }}>
            Tell us what you're looking for
          </h3>
          <p style={{ margin: '0 0 20px', fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
            All optional. We'll remember your choices.
          </p>

          {/* Categories */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: '0 0 10px', fontSize: 10, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, letterSpacing: '2px', textTransform: 'uppercase' as const }}>Categories</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
              <button onClick={() => setLayoverCategories([])} style={{
                padding: '7px 14px', borderRadius: 20,
                background: layoverCategories.length === 0 ? C.dark : C.ivory,
                border: `1px solid ${layoverCategories.length === 0 ? C.dark : C.border}`,
                color: layoverCategories.length === 0 ? C.gold : C.dark,
                fontSize: 12, fontFamily: 'DM Sans, sans-serif', fontWeight: 400, cursor: 'pointer',
              }}>All</button>
              {CATEGORIES.map(cat => {
                const active = layoverCategories.includes(cat.id);
                return (
                  <button key={cat.id} onClick={() => {
                    setLayoverCategories(prev =>
                      active ? prev.filter(c => c !== cat.id) : [...prev, cat.id]
                    );
                  }} style={{
                    padding: '7px 14px', borderRadius: 20,
                    background: active ? C.dark : C.ivory,
                    border: `1px solid ${active ? C.dark : C.border}`,
                    color: active ? C.gold : C.dark,
                    fontSize: 12, fontFamily: 'DM Sans, sans-serif', fontWeight: 400, cursor: 'pointer',
                  }}>{cat.label}</button>
                );
              })}
            </div>
          </div>

          {/* Budget */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: '0 0 10px', fontSize: 10, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, letterSpacing: '2px', textTransform: 'uppercase' as const }}>Budget range</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, minWidth: 50 }}>{fmtPrice(layoverBudgetMin)}</span>
              <span style={{ fontSize: 11, color: C.muted }}>to</span>
              <span style={{ fontSize: 13, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, minWidth: 50 }}>{fmtPrice(layoverBudgetMax)}</span>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 10, color: C.muted, fontFamily: 'DM Sans, sans-serif' }}>Min</label>
              <input type="range" min={0} max={5000000} step={50000} value={layoverBudgetMin}
                onChange={e => setLayoverBudgetMin(Math.min(parseInt(e.target.value), layoverBudgetMax - 50000))}
                style={{ width: '100%', accentColor: C.gold }} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: C.muted, fontFamily: 'DM Sans, sans-serif' }}>Max</label>
              <input type="range" min={0} max={5000000} step={50000} value={layoverBudgetMax}
                onChange={e => setLayoverBudgetMax(Math.max(parseInt(e.target.value), layoverBudgetMin + 50000))}
                style={{ width: '100%', accentColor: C.gold }} />
            </div>
          </div>

          {/* Destination */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: '0 0 10px', fontSize: 10, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, letterSpacing: '2px', textTransform: 'uppercase' as const }}>Destination</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
              <button onClick={() => setLayoverCity('')} style={{
                padding: '7px 14px', borderRadius: 20,
                background: layoverCity === '' ? C.dark : C.ivory,
                border: `1px solid ${layoverCity === '' ? C.dark : C.border}`,
                color: layoverCity === '' ? C.gold : C.dark,
                fontSize: 12, fontFamily: 'DM Sans, sans-serif', fontWeight: 400, cursor: 'pointer',
              }}>Any</button>
              {CITIES.map(city => (
                <button key={city} onClick={() => setLayoverCity(layoverCity === city ? '' : city)} style={{
                  padding: '7px 14px', borderRadius: 20,
                  background: layoverCity === city ? C.dark : C.ivory,
                  border: `1px solid ${layoverCity === city ? C.dark : C.border}`,
                  color: layoverCity === city ? C.gold : C.dark,
                  fontSize: 12, fontFamily: 'DM Sans, sans-serif', fontWeight: 400, cursor: 'pointer',
                }}>{city}</button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div style={{ marginBottom: 24 }}>
            <p style={{ margin: '0 0 10px', fontSize: 10, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, letterSpacing: '2px', textTransform: 'uppercase' as const }}>Wedding date</p>
            <input type="date" value={layoverDate} onChange={e => setLayoverDate(e.target.value)} style={{
              width: '100%', padding: '12px 14px', borderRadius: 10,
              border: `1px solid ${C.border}`, background: C.ivory,
              fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: C.dark, outline: 'none',
              boxSizing: 'border-box' as const,
            }} />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={browseAllFromLayover} style={{
              flex: 1, padding: '14px', borderRadius: 10, background: C.ivory,
              border: `1px solid ${C.border}`, color: C.dark, fontSize: 13,
              fontFamily: 'DM Sans, sans-serif', fontWeight: 400, cursor: 'pointer',
            }}>Just browsing</button>
            <button onClick={applyLayoverFilters} style={{
              flex: 2, padding: '14px', borderRadius: 10, background: C.dark,
              border: 'none', color: C.gold, fontSize: 13,
              fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer',
            }}>Apply filters</button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // FEED RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <div style={{ position: 'relative' }}>

      {/* Card viewport — fixed height, manual gesture */}
      <div
        style={{
          height: 'calc(100vh - 60px)',
          position: 'relative', overflow: 'hidden',
          background: C.dark,
          touchAction: 'none',
          overscrollBehavior: 'contain' as const,
        }}
        onTouchStart={handleCardTouchStart}
        onTouchMove={handleCardTouchMove}
        onTouchEnd={handleCardTouchEnd}
        onClick={() => vendor && handleCardTap(vendor)}
      >
        {/* Previous card (pre-rendered for back-gesture visual only — scroll/carousel) */}
        {prevVendor && browseMode !== 'swipe' && (
          <div style={{
            position: 'absolute', inset: 0,
            transform: prevTransform,
            transition: isGesturing ? 'none' : 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
            willChange: isGesturing ? 'transform' : 'auto',
          }}>
            {renderCardContent(prevVendor, false)}
          </div>
        )}

        {/* Next card (behind current) */}
        {nextVendor && (
          <div style={{
            position: 'absolute', inset: 0,
            transform: nextTransform,
            transition: isGesturing ? 'none' : 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
            opacity: browseMode === 'swipe' ? 0.5 : 1,
            willChange: isGesturing ? 'transform' : 'auto',
          }}>
            {renderCardContent(nextVendor, false)}
          </div>
        )}

        {/* Current card */}
        <div style={{
          position: 'absolute', inset: 0,
          transform: currentTransform,
          transition: isGesturing ? 'none' : 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
          willChange: isGesturing ? 'transform' : 'auto',
        }}>
          {renderCardContent(vendor, true)}
        </div>

        {renderSwipeActions()}
      </div>

      {/* SAVE TOAST / UNDO */}
      {saveToast && (
        <div style={{
          position: 'fixed', bottom: 'max(90px, calc(env(safe-area-inset-bottom) + 80px))',
          left: '50%', transform: 'translateX(-50%)', zIndex: 50,
          background: C.dark, borderRadius: 12, padding: '10px 20px',
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          <span style={{ fontSize: 13, color: '#fff', fontFamily: 'DM Sans, sans-serif', fontWeight: 400 }}>{saveToast}</span>
          {undoVendor && (
            <button onClick={handleUndo} style={{
              background: C.gold, border: 'none', borderRadius: 6, padding: '4px 10px',
              fontSize: 11, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer',
            }}>Undo</button>
          )}
        </div>
      )}

      {/* CATEGORY LAYOVER */}
      {showCategoryLayover && renderCategoryLayover()}

      {/* FILTER SHEET (from filter button in Feed) */}
      {showFilter && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 60,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end',
        }} onClick={() => setShowFilter(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 480, margin: '0 auto',
            background: C.cream, borderRadius: '20px 20px 0 0',
            padding: '20px 20px max(24px, env(safe-area-inset-bottom))',
            maxHeight: '85vh', overflow: 'auto',
            overscrollBehavior: 'contain' as const,
          }}>
            <div style={{ padding: '6px 0 12px', textAlign: 'center' as const }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border, margin: '0 auto' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontFamily: 'Playfair Display, serif', color: C.dark, fontWeight: 400 }}>Refine your search</h3>
              <button onClick={() => setShowFilter(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={18} color={C.muted} />
              </button>
            </div>

            {/* Category */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ margin: '0 0 10px', fontSize: 10, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, letterSpacing: '2px', textTransform: 'uppercase' as const }}>Category</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                {CATEGORIES.map(cat => (
                  <button key={cat.id} onClick={() => setFeedCategory(feedCategory === cat.id ? '' : cat.id)} style={{
                    padding: '7px 14px', borderRadius: 20,
                    background: feedCategory === cat.id ? C.dark : C.ivory,
                    border: `1px solid ${feedCategory === cat.id ? C.dark : C.border}`,
                    color: feedCategory === cat.id ? C.gold : C.dark,
                    fontSize: 12, fontFamily: 'DM Sans, sans-serif', fontWeight: 400, cursor: 'pointer',
                  }}>{cat.label}</button>
                ))}
              </div>
            </div>

            {/* City */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ margin: '0 0 10px', fontSize: 10, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, letterSpacing: '2px', textTransform: 'uppercase' as const }}>City</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                {CITIES.map(city => (
                  <button key={city} onClick={() => setFeedCity(feedCity === city ? '' : city)} style={{
                    padding: '7px 14px', borderRadius: 20,
                    background: feedCity === city ? C.dark : C.ivory,
                    border: `1px solid ${feedCity === city ? C.dark : C.border}`,
                    color: feedCity === city ? C.gold : C.dark,
                    fontSize: 12, fontFamily: 'DM Sans, sans-serif', fontWeight: 400, cursor: 'pointer',
                  }}>{city}</button>
                ))}
              </div>
            </div>

            {/* Budget range */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ margin: '0 0 10px', fontSize: 10, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, letterSpacing: '2px', textTransform: 'uppercase' as const }}>Budget range</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, minWidth: 50 }}>{fmtPrice(feedBudgetMin)}</span>
                <span style={{ fontSize: 11, color: C.muted }}>to</span>
                <span style={{ fontSize: 13, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, minWidth: 50 }}>{fmtPrice(feedBudgetMax)}</span>
              </div>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 10, color: C.muted, fontFamily: 'DM Sans, sans-serif' }}>Min</label>
                <input type="range" min={0} max={5000000} step={50000} value={feedBudgetMin}
                  onChange={e => setFeedBudgetMin(Math.min(parseInt(e.target.value), feedBudgetMax - 50000))}
                  style={{ width: '100%', accentColor: C.gold }} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: C.muted, fontFamily: 'DM Sans, sans-serif' }}>Max</label>
                <input type="range" min={0} max={5000000} step={50000} value={feedBudgetMax}
                  onChange={e => setFeedBudgetMax(Math.max(parseInt(e.target.value), feedBudgetMin + 50000))}
                  style={{ width: '100%', accentColor: C.gold }} />
              </div>
            </div>

            {/* Date */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ margin: '0 0 10px', fontSize: 10, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, letterSpacing: '2px', textTransform: 'uppercase' as const }}>Wedding date</p>
              <input type="date" value={feedDate} onChange={e => setFeedDate(e.target.value)} style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                border: `1px solid ${C.border}`, background: C.ivory,
                fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: C.dark, outline: 'none',
                boxSizing: 'border-box' as const,
              }} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={clearFeedFilters} style={{
                flex: 1, padding: '14px', borderRadius: 10, background: C.ivory,
                border: `1px solid ${C.border}`, color: C.dark, fontSize: 13,
                fontFamily: 'DM Sans, sans-serif', fontWeight: 400, cursor: 'pointer',
              }}>Clear all</button>
              <button onClick={applyFeedFilters} style={{
                flex: 2, padding: '14px', borderRadius: 10, background: C.dark,
                border: 'none', color: C.gold, fontSize: 13,
                fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer',
              }}>Show results</button>
            </div>
          </div>
        </div>
      )}

      {/* VENDOR PROFILE SLIDE-UP */}
      {profileVendor && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 55,
          background: profileVisible ? 'rgba(0,0,0,0.5)' : 'transparent',
          transition: 'background 0.3s',
          pointerEvents: profileVisible ? 'auto' : 'none',
        }} onClick={closeProfile}>
          <div
            ref={profileContentRef}
            onClick={e => e.stopPropagation()}
            onTouchStart={handleProfileTouchStart}
            onTouchMove={handleProfileTouchMove}
            onTouchEnd={handleProfileTouchEnd}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              maxWidth: 480, margin: '0 auto',
              background: C.cream, borderRadius: '20px 20px 0 0',
              height: '92vh',
              transform: profileVisible ? `translateY(${profileOffset}px)` : 'translateY(100%)',
              transition: profileOffset === 0 ? 'transform 0.3s ease' : 'none',
              overflow: 'auto',
              overscrollBehavior: 'contain' as const,
            }}>
            <div style={{ padding: '10px 0 4px', textAlign: 'center', position: 'sticky', top: 0, background: C.cream, borderRadius: '20px 20px 0 0', zIndex: 2 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border, margin: '0 auto' }} />
            </div>

            <div style={{
              height: 300,
              background: `url(${getHeroImage(profileVendor)}) center/cover`,
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
              }} />
              <div style={{ position: 'absolute', bottom: 20, left: 20, right: 20 }}>
                <h2 style={{ margin: '0 0 4px', fontSize: 24, color: '#fff', fontFamily: 'Playfair Display, serif', fontWeight: 400 }}>{profileVendor.name}</h2>
                <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
                  {profileVendor.category?.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} · {profileVendor.city}
                </p>
              </div>
            </div>

            <div style={{ padding: '20px 20px max(24px, env(safe-area-inset-bottom))' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <p style={{ margin: '0 0 2px', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>Starting from</p>
                  <p style={{ margin: 0, fontSize: 20, color: C.gold, fontFamily: 'Playfair Display, serif', fontWeight: 400 }}>{fmtPrice(profileVendor.starting_price)}</p>
                </div>
                {profileVendor.rating > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: C.goldSoft, border: `1px solid ${C.goldBorder}`, borderRadius: 20, padding: '6px 12px' }}>
                    <span style={{ fontSize: 14, color: C.gold }}>★</span>
                    <span style={{ fontSize: 14, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>{profileVendor.rating}</span>
                  </div>
                )}
              </div>

              {profileVendor.vibe_tags?.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginBottom: 20 }}>
                  {profileVendor.vibe_tags.map((t: string) => (
                    <span key={t} style={{ background: C.goldSoft, border: `1px solid ${C.goldBorder}`, borderRadius: 20, padding: '4px 12px', fontSize: 12, color: C.dark, fontFamily: 'DM Sans, sans-serif' }}>{t}</span>
                  ))}
                </div>
              )}

              {profileVendor.about && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ margin: '0 0 8px', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, letterSpacing: '2px', textTransform: 'uppercase' as const }}>About</p>
                  <p style={{ margin: 0, fontSize: 14, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 300, lineHeight: '22px' }}>{profileVendor.about}</p>
                </div>
              )}

              {profileVendor.portfolio_images?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ margin: '0 0 10px', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, letterSpacing: '2px', textTransform: 'uppercase' as const }}>Portfolio</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, borderRadius: 10, overflow: 'hidden' }}>
                    {profileVendor.portfolio_images.slice(0, 9).map((img: string, i: number) => (
                      <div key={i} style={{ aspectRatio: '1', background: `url(${img}) center/cover` }} />
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
                <p style={{ margin: '0 0 10px', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, letterSpacing: '2px', textTransform: 'uppercase' as const }}>Details</p>
                <div style={{ background: C.ivory, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                  {[
                    profileVendor.city && { k: 'Location', v: profileVendor.city },
                    profileVendor.instagram && { k: 'Instagram', v: profileVendor.instagram },
                    profileVendor.equipment && { k: 'Equipment', v: profileVendor.equipment },
                    profileVendor.delivery_time && { k: 'Delivery', v: profileVendor.delivery_time },
                  ].filter(Boolean).map((d: any, i: number) => (
                    <div key={i} style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 400 }}>{d.k}</span>
                      <span style={{ fontSize: 12, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, textAlign: 'right' as const, maxWidth: '60%' }}>{d.v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: C.goldSoft, border: `1px solid ${C.goldBorder}`, borderRadius: 12, padding: '16px 20px', marginBottom: 24, textAlign: 'center' }}>
                <p style={{ margin: '0 0 4px', fontSize: 13, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>Packages coming soon</p>
                <p style={{ margin: 0, fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>Detailed pricing and deliverables will be available here</p>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => handleSave(profileVendor)} style={{
                  flex: 1, padding: '14px', borderRadius: 10, background: C.ivory,
                  border: `1px solid ${C.border}`, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  color: savedIds.has(profileVendor.id) ? C.gold : C.dark, fontSize: 13,
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
                }}>
                  <Heart size={14} fill={savedIds.has(profileVendor.id) ? C.gold : 'none'} color={savedIds.has(profileVendor.id) ? C.gold : C.dark} />
                  {savedIds.has(profileVendor.id) ? 'Saved' : 'Save'}
                </button>
                <button onClick={() => {
                  const phone = profileVendor.phone?.replace(/\D/g, '').slice(-10);
                  if (phone) window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(`Hi ${profileVendor.name}! I found you on The Dream Wedding and I'm interested in your services for my wedding.`)}`, '_blank');
                }} style={{
                  flex: 2, padding: '14px', borderRadius: 10, background: C.dark,
                  border: 'none', cursor: 'pointer', color: C.gold, fontSize: 13,
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
                }}>Enquire</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



// ─────────────────────────────────────────────────────────────
// HOME SCREEN
// ─────────────────────────────────────────────────────────────

function HomeScreen({ session, onNavTo, tasks, loading, onToggleComplete, budget, expenses, guests, vendors }: {
  session: CoupleSession;
  onNavTo: (tab: MainTab, tool?: string) => void;
  tasks: ChecklistTask[];
  loading: boolean;
  onToggleComplete: (id: string, next: boolean) => void;
  budget: CoupleBudget | null;
  expenses: Expense[];
  guests: Guest[];
  vendors: Vendor[];
}) {
  const days = daysToGo(session.weddingDate);
  const copy = getGreetingCopy(session.name?.split(' ')[0] || '', days);
  const todayTasks = getTodayTasks(tasks);
  const progress = getChecklistProgress(tasks);
  const committed = totalCommitted(expenses);
  const totalBudget = budget?.total_budget || 0;
  const health = getBudgetHealth(totalBudget, committed);
  const healthColor = HEALTH_COLORS[health];
  const guestTotal = totalGuestCount(guests);
  const guestConfirmed = totalConfirmed(guests, session.events);
  const guestPending = pendingNudgeCount(guests);
  const vStatus = vendorStatusCounts(vendors);
  const vendorsBooked = vStatus.booked + vStatus.confirmed + vStatus.completed;

  return (
    <div style={{ padding: '72px 24px 100px' }}>

      {session.foundingBride && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
          borderRadius: 20, padding: '4px 12px', marginBottom: 20,
        }}>
          <Sparkles size={12} color={C.gold} />
          <span style={{ fontSize: 11, color: C.goldDeep, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
            Founding Bride
          </span>
        </div>
      )}

      {/* Greeting */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontFamily: 'Playfair Display, serif', fontSize: 26,
          color: C.dark, margin: '0 0 6px', fontWeight: 400, lineHeight: '34px',
        }}>{copy.line1}</h1>
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: C.muted,
          fontWeight: 300, lineHeight: '22px', margin: 0,
        }}>{copy.line2}</p>
      </div>

      {/* Days to go */}
      <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, marginBottom: 28 }}>
        <span style={{
          fontFamily: 'Playfair Display, serif', fontSize: 36,
          color: C.gold, fontWeight: 600,
        }}>{days}</span>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: C.muted, fontWeight: 300 }}>
          days to your wedding
        </span>
      </div>

      {/* Today */}
      <p style={{
        fontSize: 10, color: C.muted, fontWeight: 500, letterSpacing: '3px',
        textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif', margin: '0 0 10px',
      }}>Today</p>

      {loading ? (
        <div style={{
          background: C.ivory, borderRadius: 14, border: `1px solid ${C.border}`,
          padding: '16px 18px', marginBottom: 24,
        }}>
          <p style={{ margin: 0, fontSize: 13, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
            Loading your checklist…
          </p>
        </div>
      ) : todayTasks.length === 0 && progress.total === 0 ? (
        <div style={{
          background: C.ivory, borderRadius: 14, border: `1px solid ${C.border}`,
          padding: '16px 18px', marginBottom: 24,
        }}>
          <p style={{ margin: 0, fontSize: 14, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300, lineHeight: '22px' }}>
            Open your checklist to get started.
          </p>
          <button onClick={() => onNavTo('plan', 'checklist')} style={{
            marginTop: 12, display: 'flex', alignItems: 'center', gap: 4,
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          }}>
            <span style={{ fontSize: 12, color: C.gold, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
              Start checklist
            </span>
            <ArrowRight size={12} color={C.gold} />
          </button>
        </div>
      ) : todayTasks.length === 0 ? (
        <div style={{
          background: C.goldSoft, borderRadius: 14, border: `1px solid ${C.goldBorder}`,
          padding: '16px 18px', marginBottom: 24,
        }}>
          <p style={{ margin: 0, fontSize: 14, color: C.dark, fontFamily: 'Playfair Display, serif', fontWeight: 400 }}>
            You're ahead of it today, {session.name?.split(' ')[0] || 'love'}.
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
            Nothing urgent. Enjoy that.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8, marginBottom: 24 }}>
          {todayTasks.map(t => (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              background: C.ivory, borderRadius: 12,
              border: `1px solid ${t.priority === 'urgent' ? C.goldBorder : C.border}`,
              padding: '12px 14px',
            }}>
              <button
                onClick={() => onToggleComplete(t.id, !t.is_complete)}
                style={{
                  width: 22, height: 22, borderRadius: 11, flexShrink: 0,
                  background: C.cream, border: `1.5px solid ${C.goldBorder}`,
                  cursor: 'pointer', padding: 0, marginTop: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {t.is_complete && <Check size={12} color={C.gold} />}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  margin: 0, fontSize: 14, color: C.dark, fontFamily: 'DM Sans, sans-serif',
                  lineHeight: '20px', wordBreak: 'break-word' as const,
                }}>{t.text}</p>
                <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
                  <span style={{
                    fontSize: 10, color: C.goldDeep, fontFamily: 'DM Sans, sans-serif',
                    fontWeight: 500, letterSpacing: '0.5px',
                  }}>{t.event.toUpperCase()}</span>
                  {t.due_date && (
                    <>
                      <span style={{ fontSize: 10, color: C.mutedLight }}>·</span>
                      <span style={{ fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
                        {formatDueDate(t.due_date)}
                      </span>
                    </>
                  )}
                  {t.priority === 'urgent' && (
                    <>
                      <span style={{ fontSize: 10, color: C.mutedLight }}>·</span>
                      <span style={{ fontSize: 11, color: '#C2410C', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                        Urgent
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
          <button onClick={() => onNavTo('plan', 'checklist')} style={{
            alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 4,
            background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
          }}>
            <span style={{ fontSize: 12, color: C.gold, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
              View full checklist
            </span>
            <ArrowRight size={12} color={C.gold} />
          </button>
        </div>
      )}

      {/* Pulse strip */}
      <p style={{
        fontSize: 10, color: C.muted, fontWeight: 500, letterSpacing: '3px',
        textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif', margin: '0 0 10px',
      }}>At a glance</p>
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8, marginBottom: 24 }}>
        {/* Budget tile — live */}
        <button onClick={() => onNavTo('plan', 'budget')} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: C.ivory, borderRadius: 12, border: `1px solid ${C.border}`,
          padding: '14px 16px', cursor: 'pointer', textAlign: 'left' as const,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 14, color: C.dark, fontFamily: 'DM Sans, sans-serif' }}>Budget</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
              {totalBudget > 0
                ? `${fmtINR(committed)} of ${fmtINR(totalBudget)} committed`
                : 'Set your budget to track spending'}
            </p>
          </div>
          {totalBudget > 0 && (
            <span style={{
              fontSize: 10, color: healthColor.text, fontWeight: 500,
              letterSpacing: '0.5px', padding: '3px 8px', borderRadius: 10,
              background: healthColor.bg, border: `1px solid ${healthColor.border}`,
              fontFamily: 'DM Sans, sans-serif', marginLeft: 8, flexShrink: 0,
            }}>{healthColor.label}</span>
          )}
          <ChevronRight size={14} color={C.mutedLight} style={{ marginLeft: 8, flexShrink: 0 }} />
        </button>

        {/* Guests tile — live */}
        <button onClick={() => onNavTo('plan', 'guests')} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: C.ivory, borderRadius: 12, border: `1px solid ${C.border}`,
          padding: '14px 16px', cursor: 'pointer', textAlign: 'left' as const,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 14, color: C.dark, fontFamily: 'DM Sans, sans-serif' }}>Guests</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
              {guestTotal.headcount > 0
                ? `${guestTotal.headcount} guests · ${guestConfirmed} confirmed${guestPending > 0 ? ` · ${guestPending} pending` : ''}`
                : 'Add guests to track confirmations'}
            </p>
          </div>
          <ChevronRight size={14} color={C.mutedLight} style={{ flexShrink: 0 }} />
        </button>

        {/* Vendors tile — live */}
        <button onClick={() => onNavTo('plan', 'vendors')} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: C.ivory, borderRadius: 12, border: `1px solid ${C.border}`,
          padding: '14px 16px', cursor: 'pointer', textAlign: 'left' as const,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 14, color: C.dark, fontFamily: 'DM Sans, sans-serif' }}>Vendors</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
              {vendors.length > 0
                ? `${vendors.length} vendor${vendors.length !== 1 ? 's' : ''}${vendorsBooked > 0 ? ` · ${vendorsBooked} booked` : ''}`
                : 'Log your vendors to track confirmations'}
            </p>
          </div>
          <ChevronRight size={14} color={C.mutedLight} style={{ flexShrink: 0 }} />
        </button>
      </div>

      {/* Events ribbon */}
      {session.events?.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{
            fontSize: 10, color: C.muted, fontWeight: 500, letterSpacing: '3px',
            textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif', margin: '0 0 10px',
          }}>Your events</p>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
            {session.events.map(ev => (
              <span key={ev} style={{
                padding: '5px 12px', borderRadius: 16,
                background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
                fontSize: 12, color: C.goldDeep, fontFamily: 'DM Sans, sans-serif',
              }}>{ev}</span>
            ))}
          </div>
        </div>
      )}

      {/* DreamAi */}
      <div style={{
        background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
        borderRadius: 14, padding: '16px 18px',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: C.ivory, border: `1px solid ${C.goldBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Zap size={18} color={C.gold} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: '0 0 2px', fontSize: 14, color: C.dark, fontFamily: 'Playfair Display, serif' }}>Need help?</p>
          <p style={{ margin: 0, fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
            Ask DreamAi anything on WhatsApp.
          </p>
        </div>
        <a
          href="https://wa.me/14155238886?text=Hi%20DreamAi%2C%20I%20need%20help%20with%20my%20wedding%20planning"
          target="_blank" rel="noreferrer"
          style={{
            width: 32, height: 32, borderRadius: 16, background: C.dark,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, textDecoration: 'none',
          }}
        >
          <ArrowRight size={14} color={C.gold} />
        </a>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MY WEDDING SCREEN
// ─────────────────────────────────────────────────────────────

function MyWeddingScreen({ session, onToolOpen, tasks, budget, expenses, guests, pins, vendors }: {
  session: CoupleSession;
  onToolOpen: (id: string) => void;
  tasks: ChecklistTask[];
  budget: CoupleBudget | null;
  expenses: Expense[];
  guests: Guest[];
  pins: MoodboardPin[];
  vendors: Vendor[];
}) {
  const days = daysToGo(session.weddingDate);
  const progress = getChecklistProgress(tasks);
  const committed = totalCommitted(expenses);
  const totalBudget = budget?.total_budget || 0;
  const budgetHealth = getBudgetHealth(totalBudget, committed);
  const guestTotal = totalGuestCount(guests);
  const guestConfirmed = totalConfirmed(guests, session.events);
  const nonSuggestionPins = pins.filter(p => !p.is_suggestion);
  const pinSuggestions = pins.filter(p => p.is_suggestion).length;
  const vStatus = vendorStatusCounts(vendors);
  const vendorsBooked = vStatus.booked + vStatus.confirmed + vStatus.completed;

  const progressLabels: Record<string, string> = {
    checklist: progress.total > 0 ? `${progress.done} of ${progress.total} done` : 'Tasks across all your events',
    budget: totalBudget > 0
      ? `${fmtINR(committed)} of ${fmtINR(totalBudget)} · ${HEALTH_COLORS[budgetHealth].label}`
      : 'Envelopes, expenses, Payment Trail',
    guests: guestTotal.headcount > 0
      ? `${guestTotal.headcount} guests · ${guestConfirmed} confirmed`
      : "Who's coming to what",
    moodboard: nonSuggestionPins.length > 0
      ? `${nonSuggestionPins.length} pin${nonSuggestionPins.length !== 1 ? 's' : ''}${pinSuggestions > 0 ? ` · ${pinSuggestions} suggestion${pinSuggestions !== 1 ? 's' : ''}` : ''}`
      : 'Per-event inspiration boards',
    vendors: vendors.length > 0
      ? `${vendors.length} vendor${vendors.length !== 1 ? 's' : ''}${vendorsBooked > 0 ? ` · ${vendorsBooked} booked` : ''}`
      : 'Booked, confirmed, paid',
  };
  return (
    <div style={{ padding: '72px 24px 100px' }}>
      <h1 style={{
        fontFamily: 'Playfair Display, serif', fontSize: 24,
        color: C.dark, margin: '0 0 4px', fontWeight: 400,
      }}>My Wedding</h1>
      <p style={{ margin: '0 0 24px', fontSize: 13, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
        <span style={{ fontSize: 18, color: C.gold, fontFamily: 'Playfair Display, serif', fontWeight: 600 }}>{days}</span>
        {' '}days to go
      </p>
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
        {TOOLS.map(t => (
          <button
            key={t.id}
            onClick={() => canView(session.coShareRole, t.tool) ? onToolOpen(t.id) : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: 16,
              background: C.ivory, borderRadius: 16,
              border: `1px solid ${C.border}`, padding: '18px 20px',
              cursor: canView(session.coShareRole, t.tool) ? 'pointer' : 'default',
              textAlign: 'left' as const,
              opacity: canView(session.coShareRole, t.tool) ? 1 : 0.4,
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 13,
              background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <t.Icon size={20} color={C.gold} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{
                margin: '0 0 3px', fontSize: 16, color: C.dark,
                fontFamily: 'Playfair Display, serif', fontWeight: 400,
              }}>{t.label}</p>
              <p style={{ margin: 0, fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
                {progressLabels[t.tool] || t.tagline}
              </p>
            </div>
            {!canEdit(session.coShareRole, t.tool) && canView(session.coShareRole, t.tool) && (
              <span style={{ fontSize: 10, color: C.mutedLight, fontFamily: 'DM Sans, sans-serif' }}>View only</span>
            )}
            <ChevronRight size={14} color={C.mutedLight} />
          </button>
        ))}
      </div>
      <div style={{
        marginTop: 20, padding: '14px 18px',
        background: C.pearl, border: `1px solid ${C.border}`, borderRadius: 12,
      }}>
        <p style={{
          margin: 0, fontSize: 13, color: C.muted, fontFamily: 'DM Sans, sans-serif',
          fontWeight: 300, lineHeight: '20px',
        }}>
          {'💛 Tap '}
          <strong style={{ fontWeight: 500, color: C.dark }}>Circle</strong>
          {' to invite your partner, parents, or bridesmaids to collaborate.'}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TOOL PLACEHOLDER (replaced turn by turn)
// ─────────────────────────────────────────────────────────────

function ToolPlaceholder({ toolId, session, onBack }: {
  toolId: string; session: CoupleSession; onBack: () => void;
}) {
  const tool = TOOLS.find(t => t.id === toolId);
  if (!tool) return null;

  const msgs: Record<string, { title: string; body: string }> = {
    checklist: { title: 'Your checklist is ready.',      body: "We'll pre-fill tasks based on your wedding date. Coming in the next update."                               },
    budget:    { title: 'Budget tracking, coming next.', body: 'Set envelopes per event, track every expense, and keep your Payment Trail in one place.'                  },
    guests:    { title: 'Your guest ledger.',            body: "Everyone in one place — who's coming to what, and who still needs a nudge."                                },
    moodboard: { title: 'Your moodboard.',               body: 'Per-event inspiration boards. Pin images, URLs, or just ideas in words.'                                  },
    vendors:   { title: 'Your vendors.',                 body: 'Every person making your wedding happen — their status, payments, and notes, all here.'                   },
  };
  const msg = msgs[toolId] || { title: tool.label, body: 'Coming soon.' };

  return (
    <div style={{ padding: '0 0 100px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '72px 20px 16px', borderBottom: `1px solid ${C.border}`,
      }}>
        <button onClick={onBack} style={{
          width: 36, height: 36, borderRadius: 18, background: C.ivory,
          border: `1px solid ${C.border}`, display: 'flex',
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <ChevronRight size={16} color={C.dark} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <span style={{ fontSize: 18, color: C.dark, fontFamily: 'Playfair Display, serif' }}>{tool.label}</span>
      </div>
      <div style={{ padding: '48px 28px', textAlign: 'center' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 18,
          background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <tool.Icon size={24} color={C.gold} />
        </div>
        <h2 style={{
          fontFamily: 'Playfair Display, serif', fontSize: 20,
          color: C.dark, margin: '0 0 8px', fontWeight: 400,
        }}>{msg.title}</h2>
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: 14,
          color: C.muted, fontWeight: 300, lineHeight: '22px', margin: 0,
        }}>{msg.body}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CHECKLIST TOOL
// ─────────────────────────────────────────────────────────────

function ChecklistTool({
  session, tasks, loading, onToggleComplete, onUpdate, onDelete, onAdd, onBack,
}: {
  session: CoupleSession;
  tasks: ChecklistTask[];
  loading: boolean;
  onToggleComplete: (id: string, next: boolean) => void;
  onUpdate: (id: string, patch: Partial<ChecklistTask>) => void;
  onDelete: (id: string) => void;
  onAdd: (payload: { event: string; text: string; priority: 'urgent' | 'normal'; due_date: string | null }) => void;
  onBack: () => void;
}) {
  const [activeEvent, setActiveEvent] = useState<string>('All');
  const [showAdd, setShowAdd] = useState(false);
  const [editingTask, setEditingTask] = useState<ChecklistTask | null>(null);
  const canEditTool = canEdit(session.coShareRole, 'checklist');

  const eventTabs = ['All', ...session.events];
  const filtered = activeEvent === 'All' ? tasks : tasks.filter(t => t.event === activeEvent);
  const sorted = sortTasks(filtered);
  const incomplete = sorted.filter(t => !t.is_complete);
  const complete = sorted.filter(t => t.is_complete);

  // Group by event when "All" is selected
  const grouped: Record<string, ChecklistTask[]> = {};
  if (activeEvent === 'All') {
    for (const t of incomplete) {
      if (!grouped[t.event]) grouped[t.event] = [];
      grouped[t.event].push(t);
    }
  }

  return (
    <div style={{ padding: '0 0 120px' }}>

      {/* Back header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '72px 20px 16px', background: C.cream,
        position: 'sticky' as const, top: 0, zIndex: 30,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{
            width: 36, height: 36, borderRadius: 18, background: C.ivory,
            border: `1px solid ${C.border}`, display: 'flex',
            alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <ChevronRight size={16} color={C.dark} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <div>
            <p style={{ margin: 0, fontSize: 18, color: C.dark, fontFamily: 'Playfair Display, serif' }}>Checklist</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
              {tasks.filter(t => t.is_complete).length} of {tasks.length} done
            </p>
          </div>
        </div>
        {canEditTool && (
          <button onClick={() => setShowAdd(true)} style={{
            width: 36, height: 36, borderRadius: 18, background: C.dark,
            border: 'none', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Plus size={16} color={C.gold} />
          </button>
        )}
      </div>

      {/* Event filter chips */}
      <div style={{
        display: 'flex', gap: 8, padding: '12px 20px',
        overflowX: 'auto' as const, WebkitOverflowScrolling: 'touch' as any,
        background: C.cream, borderBottom: `1px solid ${C.border}`,
      }}>
        {eventTabs.map(ev => {
          const active = ev === activeEvent;
          const eventTasks = ev === 'All' ? tasks : tasks.filter(t => t.event === ev);
          const pendingCount = eventTasks.filter(t => !t.is_complete).length;
          return (
            <button key={ev} onClick={() => setActiveEvent(ev)} style={{
              padding: '6px 14px', borderRadius: 18, whiteSpace: 'nowrap' as const,
              background: active ? C.dark : C.ivory,
              border: `1px solid ${active ? C.dark : C.border}`,
              color: active ? C.gold : C.muted,
              fontSize: 12, fontWeight: active ? 500 : 400,
              fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
              flexShrink: 0,
            }}>
              {ev}{pendingCount > 0 && ` · ${pendingCount}`}
            </button>
          );
        })}
      </div>

      {/* Task list */}
      <div style={{ padding: '16px 20px' }}>

        {loading ? (
          <p style={{ fontSize: 13, color: C.muted, fontFamily: 'DM Sans, sans-serif', textAlign: 'center', padding: '32px 0' }}>
            Loading your checklist…
          </p>
        ) : tasks.length === 0 ? (
          <div style={{
            background: C.ivory, border: `1px solid ${C.border}`,
            borderRadius: 14, padding: '32px 20px', textAlign: 'center',
          }}>
            <CheckSquare size={28} color={C.goldBorder} style={{ marginBottom: 10 }} />
            <p style={{ margin: '0 0 6px', fontSize: 16, color: C.dark, fontFamily: 'Playfair Display, serif' }}>
              No tasks yet.
            </p>
            <p style={{ margin: 0, fontSize: 13, color: C.muted, fontWeight: 300, fontFamily: 'DM Sans, sans-serif', lineHeight: '20px' }}>
              {canEditTool ? 'Tap + above to add your first task.' : 'Your checklist is empty.'}
            </p>
          </div>
        ) : incomplete.length === 0 && complete.length > 0 ? (
          <div style={{
            background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
            borderRadius: 14, padding: '24px 20px', textAlign: 'center', marginBottom: 20,
          }}>
            <Sparkles size={24} color={C.gold} style={{ marginBottom: 8 }} />
            <p style={{ margin: '0 0 4px', fontSize: 16, color: C.dark, fontFamily: 'Playfair Display, serif' }}>
              Everything done.
            </p>
            <p style={{ margin: 0, fontSize: 12, color: C.muted, fontWeight: 300, fontFamily: 'DM Sans, sans-serif' }}>
              {activeEvent === 'All' ? 'Across all your events.' : `For ${activeEvent}.`}
            </p>
          </div>
        ) : null}

        {/* Grouped by event when All */}
        {activeEvent === 'All' && Object.keys(grouped).map(ev => (
          <div key={ev} style={{ marginBottom: 24 }}>
            <p style={{
              fontSize: 10, color: C.goldDeep, fontWeight: 500, letterSpacing: '2px',
              textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif', margin: '0 0 10px',
            }}>{ev}</p>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
              {grouped[ev].map(t => (
                <TaskRow
                  key={t.id}
                  task={t}
                  canEdit={canEditTool}
                  onToggleComplete={() => onToggleComplete(t.id, !t.is_complete)}
                  onEdit={() => setEditingTask(t)}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Flat list when specific event selected */}
        {activeEvent !== 'All' && incomplete.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8, marginBottom: 24 }}>
            {incomplete.map(t => (
              <TaskRow
                key={t.id}
                task={t}
                canEdit={canEditTool}
                onToggleComplete={() => onToggleComplete(t.id, !t.is_complete)}
                onEdit={() => setEditingTask(t)}
              />
            ))}
          </div>
        )}

        {/* Completed collapsed section */}
        {complete.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <p style={{
              fontSize: 10, color: C.muted, fontWeight: 500, letterSpacing: '2px',
              textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif', margin: '0 0 10px',
            }}>Done · {complete.length}</p>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
              {complete.map(t => (
                <TaskRow
                  key={t.id}
                  task={t}
                  canEdit={canEditTool}
                  onToggleComplete={() => onToggleComplete(t.id, !t.is_complete)}
                  onEdit={() => setEditingTask(t)}
                  compact
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add task modal */}
      {showAdd && (
        <TaskEditor
          mode="add"
          events={session.events}
          defaultEvent={activeEvent === 'All' ? session.events[0] : activeEvent}
          onClose={() => setShowAdd(false)}
          onSave={payload => { onAdd(payload); setShowAdd(false); }}
        />
      )}

      {/* Edit task modal */}
      {editingTask && canEditTool && (
        <TaskEditor
          mode="edit"
          events={session.events}
          task={editingTask}
          defaultEvent={editingTask.event}
          onClose={() => setEditingTask(null)}
          onSave={payload => { onUpdate(editingTask.id, payload); setEditingTask(null); }}
          onDelete={() => { onDelete(editingTask.id); setEditingTask(null); }}
        />
      )}
    </div>
  );
}

function TaskRow({ task, canEdit: canEditRow, onToggleComplete, onEdit, compact }: {
  task: ChecklistTask; canEdit: boolean;
  onToggleComplete: () => void; onEdit: () => void; compact?: boolean;
}) {
  const isUrgent = task.priority === 'urgent' && !task.is_complete;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      background: task.is_complete ? C.pearl : C.ivory,
      borderRadius: 12,
      border: `1px solid ${isUrgent ? C.goldBorder : C.border}`,
      padding: compact ? '10px 12px' : '12px 14px',
      opacity: task.is_complete ? 0.7 : 1,
    }}>
      <button
        onClick={onToggleComplete}
        disabled={!canEditRow}
        style={{
          width: 22, height: 22, borderRadius: 11, flexShrink: 0,
          background: task.is_complete ? C.gold : C.cream,
          border: `1.5px solid ${C.goldBorder}`,
          cursor: canEditRow ? 'pointer' : 'default', padding: 0, marginTop: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {task.is_complete && <Check size={12} color={C.cream} />}
      </button>
      <button
        onClick={canEditRow ? onEdit : undefined}
        style={{
          flex: 1, minWidth: 0, background: 'none', border: 'none',
          cursor: canEditRow ? 'pointer' : 'default', padding: 0, textAlign: 'left' as const,
        }}
      >
        <p style={{
          margin: 0, fontSize: compact ? 13 : 14, color: C.dark,
          fontFamily: 'DM Sans, sans-serif',
          lineHeight: compact ? '18px' : '20px',
          textDecoration: task.is_complete ? 'line-through' : 'none',
          wordBreak: 'break-word' as const,
        }}>{task.text}</p>
        {!compact && (
          <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' as const }}>
            {task.due_date && (
              <span style={{ fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
                {formatDueDate(task.due_date)}
              </span>
            )}
            {isUrgent && (
              <>
                {task.due_date && <span style={{ fontSize: 10, color: C.mutedLight }}>·</span>}
                <span style={{ fontSize: 11, color: '#C2410C', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                  Urgent
                </span>
              </>
            )}
          </div>
        )}
      </button>
    </div>
  );
}

// Shared add/edit modal
function TaskEditor({
  mode, events, task, defaultEvent, onClose, onSave, onDelete,
}: {
  mode: 'add' | 'edit';
  events: string[];
  task?: ChecklistTask;
  defaultEvent: string;
  onClose: () => void;
  onSave: (payload: { event: string; text: string; priority: 'urgent' | 'normal'; due_date: string | null }) => void;
  onDelete?: () => void;
}) {
  const [text, setText] = useState(task?.text || '');
  const [event, setEvent] = useState(task?.event || defaultEvent);
  const [priority, setPriority] = useState<'urgent' | 'normal'>(task?.priority || 'normal');
  const [dueDate, setDueDate] = useState(task?.due_date || '');

  const handleSave = () => {
    if (!text.trim()) return;
    onSave({
      event,
      text: text.trim(),
      priority,
      due_date: dueDate || null,
    });
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(44,36,32,0.5)',
        zIndex: 200, display: 'flex', alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.cream, borderRadius: '20px 20px 0 0',
          padding: '20px 20px max(20px, env(safe-area-inset-bottom))',
          width: '100%', maxWidth: 480, margin: '0 auto',
          boxSizing: 'border-box' as const, maxHeight: '85vh',
          overflowY: 'auto' as const,
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 16px' }} />

        <p style={{
          margin: '0 0 16px', fontSize: 18, color: C.dark,
          fontFamily: 'Playfair Display, serif',
        }}>
          {mode === 'add' ? 'Add a task' : 'Edit task'}
        </p>

        {/* Text */}
        <label style={{
          display: 'block', fontSize: 11, color: C.muted,
          fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
          letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
        }}>Task<span style={{ color: '#C65757', marginLeft: 4 }}>*</span></label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="What needs to happen?"
          rows={2}
          style={{
            width: '100%', boxSizing: 'border-box' as const,
            padding: '12px 16px', borderRadius: 10,
            border: `1px solid ${C.border}`, background: C.ivory,
            fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: C.dark,
            outline: 'none', marginBottom: 14, resize: 'vertical' as const,
          }}
        />

        {/* Event */}
        <label style={{
          display: 'block', fontSize: 11, color: C.muted,
          fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
          letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
        }}>Event</label>
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 14 }}>
          {events.map(ev => (
            <button key={ev} onClick={() => setEvent(ev)} style={{
              padding: '6px 12px', borderRadius: 16,
              background: event === ev ? C.dark : C.ivory,
              border: `1px solid ${event === ev ? C.dark : C.border}`,
              color: event === ev ? C.gold : C.muted,
              fontSize: 12, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
            }}>{ev}</button>
          ))}
        </div>

        {/* Priority */}
        <label style={{
          display: 'block', fontSize: 11, color: C.muted,
          fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
          letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
        }}>Priority</label>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {(['normal', 'urgent'] as const).map(p => (
            <button key={p} onClick={() => setPriority(p)} style={{
              flex: 1, padding: '10px 12px', borderRadius: 10,
              background: priority === p ? C.dark : C.ivory,
              border: `1px solid ${priority === p ? C.dark : C.border}`,
              color: priority === p ? C.gold : C.muted,
              fontSize: 13, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
              textTransform: 'capitalize' as const,
            }}>{p}</button>
          ))}
        </div>

        {/* Due date */}
        <label style={{
          display: 'block', fontSize: 11, color: C.muted,
          fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
          letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
        }}>Due date</label>
        <input
          type="date" value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box' as const,
            padding: '12px 16px', borderRadius: 10,
            border: `1px solid ${C.border}`, background: C.ivory,
            fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: C.dark,
            outline: 'none', marginBottom: 18,
          }}
        />

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {mode === 'edit' && onDelete && (
            <button onClick={onDelete} style={{
              width: 44, height: 44, borderRadius: 12,
              background: '#FEF2F2', border: '1px solid #FECACA',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}>
              <Trash2 size={16} color="#B91C1C" />
            </button>
          )}
          <div style={{ flex: 1 }}>
            <GhostButton label="Cancel" onTap={onClose} />
          </div>
          <button onClick={handleSave} disabled={!text.trim()} style={{
            padding: '12px 24px', borderRadius: 12,
            background: C.dark, border: 'none',
            cursor: text.trim() ? 'pointer' : 'default',
            color: C.gold, fontFamily: 'DM Sans, sans-serif',
            fontSize: 13, fontWeight: 400, letterSpacing: '1.5px',
            textTransform: 'uppercase' as const,
            opacity: text.trim() ? 1 : 0.4,
          }}>
            {mode === 'add' ? 'Add' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CLOUDINARY UPLOAD
// Uploads a File to Cloudinary and returns the secure_url.
// Returns null on failure — caller can handle gracefully.
// ─────────────────────────────────────────────────────────────

async function uploadReceipt(file: File): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
      method: 'POST', body: formData,
    });
    const data = await res.json();
    return data?.secure_url || null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// BUDGET TOOL
// Three surfaces: Expenses tab, Shagun tab, Payment Trail view.
// Payment Trail is a filtered view of Expenses (only those with
// receipts attached). No separate data store.
// ─────────────────────────────────────────────────────────────

type BudgetSubTab = 'expenses' | 'shagun' | 'trail';

function BudgetTool({
  session, budget, expenses, shagun, loading,
  onUpdateBudget, onAddExpense, onUpdateExpense, onDeleteExpense,
  onAddShagun, onUpdateShagun, onDeleteShagun, onBack,
}: {
  session: CoupleSession;
  budget: CoupleBudget | null;
  expenses: Expense[];
  shagun: ShagunEntry[];
  loading: boolean;
  onUpdateBudget: (patch: { total_budget?: number; event_envelopes?: Record<string, number> }) => Promise<void>;
  onAddExpense: (payload: Partial<Expense>) => Promise<Expense | null>;
  onUpdateExpense: (id: string, patch: Partial<Expense>) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
  onAddShagun: (payload: Partial<ShagunEntry>) => Promise<void>;
  onUpdateShagun: (id: string, patch: Partial<ShagunEntry>) => Promise<void>;
  onDeleteShagun: (id: string) => Promise<void>;
  onBack: () => void;
}) {
  const [subTab, setSubTab] = useState<BudgetSubTab>('expenses');
  const [activeEvent, setActiveEvent] = useState<string>('All');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showAddShagun, setShowAddShagun] = useState(false);
  const [editingShagun, setEditingShagun] = useState<ShagunEntry | null>(null);
  const [showBudgetEditor, setShowBudgetEditor] = useState(false);
  const [viewReceipt, setViewReceipt] = useState<Expense | null>(null);

  const canEditExpenses = canEdit(session.coShareRole, 'budget');
  const canSeeShagun    = canView(session.coShareRole, 'shagun');
  const canSeeTrail     = canView(session.coShareRole, 'payment_trail');
  const canEditTrail    = canEdit(session.coShareRole, 'payment_trail');

  const totalBudget = budget?.total_budget || 0;
  const envelopes   = budget?.event_envelopes || {};
  const committed   = totalCommitted(expenses);
  const health      = getBudgetHealth(totalBudget, committed);
  const healthColor = HEALTH_COLORS[health];

  // Expenses filter
  const filteredExpenses = activeEvent === 'All'
    ? expenses
    : expenses.filter(e => e.event === activeEvent);

  // Payment trail = expenses with receipts
  const trailExpenses = expenses.filter(e => !!e.receipt_url);
  const filteredTrail = activeEvent === 'All'
    ? trailExpenses
    : trailExpenses.filter(e => e.event === activeEvent);

  // Build sub-tabs available to this role
  const availableTabs: { id: BudgetSubTab; label: string; count?: number }[] = [
    { id: 'expenses', label: 'Expenses', count: expenses.length },
  ];
  if (canSeeTrail)  availableTabs.push({ id: 'trail',   label: 'Payment Trail', count: trailExpenses.length });
  if (canSeeShagun) availableTabs.push({ id: 'shagun',  label: 'Shagun',        count: shagun.length });

  return (
    <div style={{ padding: '0 0 120px' }}>

      {/* Sticky header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '72px 20px 16px', background: C.cream,
        position: 'sticky' as const, top: 0, zIndex: 30,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{
            width: 36, height: 36, borderRadius: 18, background: C.ivory,
            border: `1px solid ${C.border}`, display: 'flex',
            alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <ChevronRight size={16} color={C.dark} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <div>
            <p style={{ margin: 0, fontSize: 18, color: C.dark, fontFamily: 'Playfair Display, serif' }}>Budget</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
              {totalBudget > 0 ? `${fmtINR(committed)} of ${fmtINR(totalBudget)} committed` : 'Set your total budget to begin'}
            </p>
          </div>
        </div>
        {canEditExpenses && (
          <button onClick={() => {
            if (subTab === 'expenses' || subTab === 'trail') setShowAddExpense(true);
            else if (subTab === 'shagun') setShowAddShagun(true);
          }} style={{
            width: 36, height: 36, borderRadius: 18, background: C.dark,
            border: 'none', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Plus size={16} color={C.gold} />
          </button>
        )}
      </div>

      {/* Health pulse bar */}
      <div style={{ padding: '14px 20px 0' }}>
        <button
          onClick={() => canEditExpenses && setShowBudgetEditor(true)}
          disabled={!canEditExpenses}
          style={{
            width: '100%', background: healthColor.bg,
            border: `1px solid ${healthColor.border}`,
            borderRadius: 12, padding: '12px 14px',
            cursor: canEditExpenses ? 'pointer' : 'default',
            textAlign: 'left' as const,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 11, color: healthColor.text, fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif' }}>
              {healthColor.label}
            </span>
            {totalBudget > 0 && (
              <span style={{ fontSize: 11, color: healthColor.text, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                {Math.round((committed / totalBudget) * 100)}%
              </span>
            )}
          </div>
          {/* Progress track */}
          <div style={{ height: 6, background: C.ivory, borderRadius: 3, marginTop: 8, overflow: 'hidden' as const }}>
            <div style={{
              height: '100%',
              width: totalBudget > 0 ? `${Math.min(100, (committed / totalBudget) * 100)}%` : '0%',
              background: healthColor.text,
              transition: 'width 0.3s ease',
            }} />
          </div>
          {totalBudget === 0 && canEditExpenses && (
            <p style={{ margin: '8px 0 0', fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
              Tap to set your total budget and event envelopes.
            </p>
          )}
        </button>
      </div>

      {/* Sub tabs */}
      <div style={{ display: 'flex', gap: 6, padding: '14px 20px 12px', overflowX: 'auto' as const, WebkitOverflowScrolling: 'touch' as any }}>
        {availableTabs.map(t => {
          const active = subTab === t.id;
          return (
            <button key={t.id} onClick={() => setSubTab(t.id)} style={{
              padding: '7px 14px', borderRadius: 18, whiteSpace: 'nowrap' as const,
              background: active ? C.dark : C.ivory,
              border: `1px solid ${active ? C.dark : C.border}`,
              color: active ? C.gold : C.muted,
              fontSize: 12, fontWeight: active ? 500 : 400,
              fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', flexShrink: 0,
            }}>
              {t.label}{t.count !== undefined && t.count > 0 ? ` · ${t.count}` : ''}
            </button>
          );
        })}
      </div>

      {/* Event filter (only for expenses + trail tabs) */}
      {(subTab === 'expenses' || subTab === 'trail') && (
        <div style={{ display: 'flex', gap: 6, padding: '0 20px 12px', overflowX: 'auto' as const, WebkitOverflowScrolling: 'touch' as any, borderBottom: `1px solid ${C.border}` }}>
          {['All', ...session.events].map(ev => {
            const active = activeEvent === ev;
            return (
              <button key={ev} onClick={() => setActiveEvent(ev)} style={{
                padding: '5px 12px', borderRadius: 14, whiteSpace: 'nowrap' as const,
                background: active ? C.goldSoft : 'transparent',
                border: `1px solid ${active ? C.goldBorder : C.border}`,
                color: active ? C.goldDeep : C.muted,
                fontSize: 11, fontWeight: active ? 500 : 400,
                fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', flexShrink: 0,
              }}>{ev}</button>
            );
          })}
        </div>
      )}

      {/* Tab content */}
      <div style={{ padding: '16px 20px' }}>

        {/* EXPENSES TAB */}
        {subTab === 'expenses' && (
          <>
            {loading ? (
              <p style={{ fontSize: 13, color: C.muted, fontFamily: 'DM Sans, sans-serif', textAlign: 'center', padding: '32px 0' }}>
                Loading…
              </p>
            ) : filteredExpenses.length === 0 ? (
              <div style={{
                background: C.ivory, border: `1px solid ${C.border}`,
                borderRadius: 14, padding: '32px 20px', textAlign: 'center',
              }}>
                <PieChart size={28} color={C.goldBorder} style={{ marginBottom: 10 }} />
                <p style={{ margin: '0 0 6px', fontSize: 16, color: C.dark, fontFamily: 'Playfair Display, serif' }}>
                  {expenses.length === 0 ? 'No expenses yet.' : `No expenses for ${activeEvent}.`}
                </p>
                <p style={{ margin: 0, fontSize: 13, color: C.muted, fontWeight: 300, fontFamily: 'DM Sans, sans-serif', lineHeight: '20px' }}>
                  {canEditExpenses ? 'Tap + above to log your first one.' : 'Nothing tracked yet.'}
                </p>
              </div>
            ) : (
              <>
                {/* Event envelopes summary */}
                {activeEvent === 'All' && session.events.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <p style={{
                      fontSize: 10, color: C.muted, fontWeight: 500, letterSpacing: '2px',
                      textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif', margin: '0 0 10px',
                    }}>By event</p>
                    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                      {session.events.map(ev => {
                        const envAllocated = envelopes[ev] || 0;
                        const envCommitted = eventCommitted(expenses, ev);
                        const pct = envAllocated > 0 ? Math.min(100, (envCommitted / envAllocated) * 100) : 0;
                        const over = envAllocated > 0 && envCommitted > envAllocated;
                        return (
                          <div key={ev} style={{
                            background: C.ivory, border: `1px solid ${C.border}`,
                            borderRadius: 10, padding: '10px 12px',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <span style={{ fontSize: 13, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>{ev}</span>
                              <span style={{ fontSize: 12, color: over ? '#A33636' : C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: over ? 500 : 300 }}>
                                {fmtINR(envCommitted)}{envAllocated > 0 ? ` / ${fmtINR(envAllocated)}` : ''}
                              </span>
                            </div>
                            {envAllocated > 0 && (
                              <div style={{ height: 3, background: C.cream, borderRadius: 1.5, marginTop: 6, overflow: 'hidden' as const }}>
                                <div style={{
                                  height: '100%', width: `${pct}%`,
                                  background: over ? '#A33636' : C.gold,
                                  transition: 'width 0.3s ease',
                                }} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Expense list */}
                <p style={{
                  fontSize: 10, color: C.muted, fontWeight: 500, letterSpacing: '2px',
                  textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif', margin: '0 0 10px',
                }}>All expenses</p>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                  {filteredExpenses.map(exp => (
                    <ExpenseRow
                      key={exp.id}
                      expense={exp}
                      canEdit={canEditExpenses}
                      onTap={() => setEditingExpense(exp)}
                      onReceiptTap={() => exp.receipt_url ? setViewReceipt(exp) : setEditingExpense(exp)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* PAYMENT TRAIL TAB */}
        {subTab === 'trail' && canSeeTrail && (
          <>
            {filteredTrail.length === 0 ? (
              <div style={{
                background: C.ivory, border: `1px solid ${C.border}`,
                borderRadius: 14, padding: '32px 20px', textAlign: 'center',
              }}>
                <Paperclip size={28} color={C.goldBorder} style={{ marginBottom: 10 }} />
                <p style={{ margin: '0 0 6px', fontSize: 16, color: C.dark, fontFamily: 'Playfair Display, serif' }}>
                  No receipts yet.
                </p>
                <p style={{ margin: 0, fontSize: 13, color: C.muted, fontWeight: 300, fontFamily: 'DM Sans, sans-serif', lineHeight: '20px' }}>
                  Attach photos to your expenses and they'll show up here.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {filteredTrail.map(exp => (
                  <button key={exp.id} onClick={() => setViewReceipt(exp)} style={{
                    background: C.ivory, border: `1px solid ${C.border}`,
                    borderRadius: 12, padding: 0, cursor: 'pointer',
                    overflow: 'hidden' as const, textAlign: 'left' as const,
                  }}>
                    <div style={{
                      width: '100%', aspectRatio: '1 / 1',
                      backgroundImage: `url(${exp.receipt_url})`,
                      backgroundSize: 'cover', backgroundPosition: 'center',
                      background: `${C.goldSoft} url(${exp.receipt_url}) center/cover no-repeat`,
                    }} />
                    <div style={{ padding: '8px 10px' }}>
                      <p style={{ margin: 0, fontSize: 13, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                        {fmtINR(exp.actual_amount + exp.shadow_amount)}
                      </p>
                      <p style={{
                        margin: '2px 0 0', fontSize: 10, color: C.muted,
                        fontFamily: 'DM Sans, sans-serif', fontWeight: 300,
                        overflow: 'hidden' as const, textOverflow: 'ellipsis' as const,
                        whiteSpace: 'nowrap' as const,
                      }}>
                        {exp.vendor_name || exp.description || exp.category}
                      </p>
                      <p style={{
                        margin: '2px 0 0', fontSize: 9, color: C.goldDeep,
                        fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
                        letterSpacing: '0.5px', textTransform: 'uppercase' as const,
                      }}>
                        {exp.event}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* SHAGUN TAB */}
        {subTab === 'shagun' && canSeeShagun && (
          <>
            {/* Shagun summary */}
            {shagun.length > 0 && (
              <div style={{
                background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
                borderRadius: 12, padding: '14px 16px', marginBottom: 16,
              }}>
                <p style={{
                  margin: 0, fontSize: 11, color: C.goldDeep, fontWeight: 500,
                  letterSpacing: '1px', textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
                }}>Total shagun received</p>
                <p style={{
                  margin: '4px 0 0', fontSize: 22, color: C.dark,
                  fontFamily: 'Playfair Display, serif', fontWeight: 600,
                }}>
                  {fmtINRFull(shagun.reduce((sum, s) => sum + (s.amount || 0), 0))}
                </p>
                <p style={{
                  margin: '4px 0 0', fontSize: 11, color: C.muted,
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 300,
                }}>
                  {shagun.length} {shagun.length === 1 ? 'entry' : 'entries'} · {shagun.filter(s => s.return_gift_sent).length} return gifts sent
                </p>
              </div>
            )}

            {shagun.length === 0 ? (
              <div style={{
                background: C.ivory, border: `1px solid ${C.border}`,
                borderRadius: 14, padding: '32px 20px', textAlign: 'center',
              }}>
                <Gift size={28} color={C.goldBorder} style={{ marginBottom: 10 }} />
                <p style={{ margin: '0 0 6px', fontSize: 16, color: C.dark, fontFamily: 'Playfair Display, serif' }}>
                  No shagun tracked yet.
                </p>
                <p style={{ margin: 0, fontSize: 13, color: C.muted, fontWeight: 300, fontFamily: 'DM Sans, sans-serif', lineHeight: '20px' }}>
                  Log incoming cash envelopes and gifts so return-gift planning is painless later.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                {shagun.map(s => (
                  <button
                    key={s.id}
                    onClick={() => canEditExpenses && setEditingShagun(s)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      background: C.ivory, border: `1px solid ${C.border}`,
                      borderRadius: 12, padding: '12px 14px',
                      cursor: canEditExpenses ? 'pointer' : 'default',
                      textAlign: 'left' as const, width: '100%',
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 18,
                      background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Gift size={15} color={C.gold} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontSize: 14, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const, whiteSpace: 'nowrap' as const }}>
                          {s.giver_name}
                        </span>
                        {s.amount > 0 && (
                          <span style={{ fontSize: 13, color: C.goldDeep, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, flexShrink: 0 }}>
                            {fmtINR(s.amount)}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' as const, alignItems: 'center' }}>
                        {s.relation && (
                          <span style={{ fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>{s.relation}</span>
                        )}
                        {s.event && (
                          <>
                            {s.relation && <span style={{ fontSize: 10, color: C.mutedLight }}>·</span>}
                            <span style={{ fontSize: 11, color: C.goldDeep, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, letterSpacing: '0.5px' }}>
                              {s.event}
                            </span>
                          </>
                        )}
                        {s.gift_description && (
                          <>
                            <span style={{ fontSize: 10, color: C.mutedLight }}>·</span>
                            <span style={{ fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
                              {s.gift_description}
                            </span>
                          </>
                        )}
                      </div>
                      {s.return_gift_sent && (
                        <p style={{ margin: '4px 0 0', fontSize: 10, color: '#2D6A2D', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                          ✓ Return gift sent
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showAddExpense && (
        <ExpenseEditor
          session={session}
          mode="add"
          events={session.events}
          defaultEvent={activeEvent === 'All' ? session.events[0] : activeEvent}
          onClose={() => setShowAddExpense(false)}
          onSave={async payload => {
            await onAddExpense(payload);
            setShowAddExpense(false);
          }}
        />
      )}
      {editingExpense && canEditExpenses && (
        <ExpenseEditor
          session={session}
          mode="edit"
          events={session.events}
          expense={editingExpense}
          defaultEvent={editingExpense.event}
          onClose={() => setEditingExpense(null)}
          onSave={async payload => {
            await onUpdateExpense(editingExpense.id, payload);
            setEditingExpense(null);
          }}
          onDelete={async () => {
            await onDeleteExpense(editingExpense.id);
            setEditingExpense(null);
          }}
        />
      )}
      {showAddShagun && (
        <ShagunEditor
          mode="add"
          events={session.events}
          onClose={() => setShowAddShagun(false)}
          onSave={async payload => {
            await onAddShagun(payload);
            setShowAddShagun(false);
          }}
        />
      )}
      {editingShagun && canEditExpenses && (
        <ShagunEditor
          mode="edit"
          events={session.events}
          entry={editingShagun}
          onClose={() => setEditingShagun(null)}
          onSave={async payload => {
            await onUpdateShagun(editingShagun.id, payload);
            setEditingShagun(null);
          }}
          onDelete={async () => {
            await onDeleteShagun(editingShagun.id);
            setEditingShagun(null);
          }}
        />
      )}
      {showBudgetEditor && canEditExpenses && (
        <BudgetEditor
          budget={budget}
          events={session.events}
          expenses={expenses}
          onClose={() => setShowBudgetEditor(false)}
          onSave={async patch => {
            await onUpdateBudget(patch);
            setShowBudgetEditor(false);
          }}
        />
      )}
      {viewReceipt && (
        <ReceiptViewer
          expense={viewReceipt}
          canEdit={canEditTrail}
          onClose={() => setViewReceipt(null)}
          onEdit={() => {
            setEditingExpense(viewReceipt);
            setViewReceipt(null);
          }}
        />
      )}
    </div>
  );
}

// Single expense row
function ExpenseRow({ expense, canEdit: canEditRow, onTap, onReceiptTap }: {
  expense: Expense; canEdit: boolean;
  onTap: () => void; onReceiptTap: () => void;
}) {
  const amount = expense.actual_amount + expense.shadow_amount;
  const statusColor: Record<string, string> = {
    paid:    '#2D6A2D',
    partial: '#8B6914',
    pending: C.muted,
  };
  return (
    <div style={{
      display: 'flex', alignItems: 'stretch', gap: 10,
      background: C.ivory, border: `1px solid ${C.border}`,
      borderRadius: 12, overflow: 'hidden' as const,
    }}>
      <button
        onClick={canEditRow ? onTap : undefined}
        style={{
          flex: 1, minWidth: 0, background: 'none', border: 'none',
          cursor: canEditRow ? 'pointer' : 'default',
          padding: '12px 14px', textAlign: 'left' as const,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <span style={{
            fontSize: 14, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
            overflow: 'hidden' as const, textOverflow: 'ellipsis' as const, whiteSpace: 'nowrap' as const,
          }}>
            {expense.description || expense.vendor_name || expense.category}
          </span>
          <span style={{ fontSize: 14, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, flexShrink: 0 }}>
            {fmtINR(amount)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' as const, alignItems: 'center' }}>
          <span style={{
            fontSize: 10, color: C.goldDeep, fontFamily: 'DM Sans, sans-serif',
            fontWeight: 500, letterSpacing: '0.5px',
          }}>{expense.event.toUpperCase()}</span>
          <span style={{ fontSize: 10, color: C.mutedLight }}>·</span>
          <span style={{ fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
            {expense.category}
          </span>
          <span style={{ fontSize: 10, color: C.mutedLight }}>·</span>
          <span style={{
            fontSize: 11, color: statusColor[expense.payment_status] || C.muted,
            fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
            textTransform: 'capitalize' as const,
          }}>
            {expense.payment_status}
          </span>
          {expense.shadow_amount > 0 && (
            <>
              <span style={{ fontSize: 10, color: C.mutedLight }}>·</span>
              <span style={{ fontSize: 11, color: '#8B6914', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                +{fmtINR(expense.shadow_amount)} shadow
              </span>
            </>
          )}
        </div>
      </button>
      <button
        onClick={onReceiptTap}
        style={{
          width: 44, background: expense.receipt_url ? C.goldSoft : C.cream,
          border: 'none', borderLeft: `1px solid ${C.border}`,
          cursor: canEditRow || expense.receipt_url ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {expense.receipt_url
          ? <ImageIcon size={16} color={C.gold} />
          : <Paperclip size={15} color={C.mutedLight} />}
      </button>
    </div>
  );
}

// Expense editor — covers add + edit, with receipt attachment
function ExpenseEditor({
  session, mode, events, expense, defaultEvent, onClose, onSave, onDelete,
}: {
  session: CoupleSession;
  mode: 'add' | 'edit';
  events: string[];
  expense?: Expense;
  defaultEvent: string;
  onClose: () => void;
  onSave: (payload: Partial<Expense>) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [description, setDescription] = useState(expense?.description || '');
  const [vendorName, setVendorName]   = useState(expense?.vendor_name || '');
  const [event, setEvent]             = useState(expense?.event || defaultEvent);
  const [category, setCategory]       = useState(expense?.category || EXPENSE_CATEGORIES[0]);
  const [actualAmount, setActualAmount] = useState(expense?.actual_amount ? String(expense.actual_amount) : '');
  const [shadowAmount, setShadowAmount] = useState(expense?.shadow_amount ? String(expense.shadow_amount) : '');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'partial' | 'pending'>(expense?.payment_status || 'pending');
  const [notes, setNotes]             = useState(expense?.notes || '');
  const [receiptUrl, setReceiptUrl]   = useState(expense?.receipt_url || '');
  const [uploading, setUploading]     = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReceiptUpload = async (file: File) => {
    setUploading(true); setUploadError('');
    const url = await uploadReceipt(file);
    if (url) {
      setReceiptUrl(url);
    } else {
      setUploadError('Could not upload. Try again.');
    }
    setUploading(false);
  };

  const handleSave = async () => {
    const actual = parseFloat(actualAmount) || 0;
    const shadow = parseFloat(shadowAmount) || 0;
    const payload: Partial<Expense> = {
      event,
      category,
      description: description.trim() || null,
      vendor_name: vendorName.trim() || null,
      actual_amount: actual,
      shadow_amount: shadow,
      payment_status: paymentStatus,
      notes: notes.trim() || null,
    };
    // Only set receipt fields if we have a URL or we're clearing
    if (receiptUrl !== (expense?.receipt_url || '')) {
      payload.receipt_url = receiptUrl || null;
      if (receiptUrl && !expense?.receipt_url) {
        payload.receipt_uploaded_by = session.id;
        payload.receipt_uploaded_by_name = session.name;
      } else if (!receiptUrl) {
        payload.receipt_uploaded_by = null;
        payload.receipt_uploaded_by_name = null;
      }
    }
    await onSave(payload);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(44,36,32,0.5)',
        zIndex: 200, display: 'flex', alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.cream, borderRadius: '20px 20px 0 0',
          padding: '20px 20px max(20px, env(safe-area-inset-bottom))',
          width: '100%', maxWidth: 480, margin: '0 auto',
          boxSizing: 'border-box' as const, maxHeight: '92vh',
          overflowY: 'auto' as const,
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 16px' }} />

        <p style={{ margin: '0 0 16px', fontSize: 18, color: C.dark, fontFamily: 'Playfair Display, serif' }}>
          {mode === 'add' ? 'Add an expense' : 'Edit expense'}
        </p>

        {/* Amount — hero field */}
        <label style={{
          display: 'block', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
          fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
        }}>Amount<span style={{ color: '#C65757', marginLeft: 4 }}>*</span></label>
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <span style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            fontSize: 18, color: C.muted, fontFamily: 'Playfair Display, serif',
          }}>₹</span>
          <input
            type="number" inputMode="decimal" value={actualAmount}
            onChange={e => setActualAmount(e.target.value)}
            placeholder="0"
            style={{
              width: '100%', boxSizing: 'border-box' as const,
              padding: '14px 16px 14px 34px', borderRadius: 10,
              border: `1px solid ${C.border}`, background: C.ivory,
              fontFamily: 'Playfair Display, serif', fontSize: 20, color: C.dark, outline: 'none',
            }}
          />
        </div>

        {/* Shadow amount */}
        <label style={{
          display: 'block', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
          fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
        }}>Shadow (tips, extras — optional)</label>
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <span style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            fontSize: 14, color: C.muted, fontFamily: 'DM Sans, sans-serif',
          }}>₹</span>
          <input
            type="number" inputMode="decimal" value={shadowAmount}
            onChange={e => setShadowAmount(e.target.value)}
            placeholder="0"
            style={{
              width: '100%', boxSizing: 'border-box' as const,
              padding: '10px 16px 10px 30px', borderRadius: 10,
              border: `1px solid ${C.border}`, background: C.ivory,
              fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: C.dark, outline: 'none',
            }}
          />
        </div>

        {/* Description */}
        <label style={{
          display: 'block', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
          fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
        }}>What's this for?<span style={{ color: '#C65757', marginLeft: 4 }}>*</span></label>
        <input
          type="text" value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="e.g. Caterer advance"
          style={{
            width: '100%', boxSizing: 'border-box' as const,
            padding: '12px 16px', borderRadius: 10,
            border: `1px solid ${C.border}`, background: C.ivory,
            fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: C.dark,
            outline: 'none', marginBottom: 14,
          }}
        />

        {/* Vendor */}
        <label style={{
          display: 'block', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
          fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
        }}>Vendor</label>
        <input
          type="text" value={vendorName}
          onChange={e => setVendorName(e.target.value)}
          placeholder="e.g. Madhu Caterers"
          style={{
            width: '100%', boxSizing: 'border-box' as const,
            padding: '12px 16px', borderRadius: 10,
            border: `1px solid ${C.border}`, background: C.ivory,
            fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: C.dark,
            outline: 'none', marginBottom: 14,
          }}
        />

        {/* Event chips */}
        <label style={{
          display: 'block', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
          fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
        }}>Event</label>
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 14 }}>
          {events.map(ev => (
            <button key={ev} onClick={() => setEvent(ev)} style={{
              padding: '6px 12px', borderRadius: 16,
              background: event === ev ? C.dark : C.ivory,
              border: `1px solid ${event === ev ? C.dark : C.border}`,
              color: event === ev ? C.gold : C.muted,
              fontSize: 12, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
            }}>{ev}</button>
          ))}
        </div>

        {/* Category chips */}
        <label style={{
          display: 'block', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
          fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
        }}>Category</label>
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 14 }}>
          {EXPENSE_CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)} style={{
              padding: '5px 11px', borderRadius: 14,
              background: category === cat ? C.goldSoft : C.ivory,
              border: `1px solid ${category === cat ? C.goldBorder : C.border}`,
              color: category === cat ? C.goldDeep : C.muted,
              fontSize: 11, fontWeight: category === cat ? 500 : 400,
              fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
            }}>{cat}</button>
          ))}
        </div>

        {/* Payment status */}
        <label style={{
          display: 'block', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
          fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
        }}>Payment status</label>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {(['pending', 'partial', 'paid'] as const).map(s => (
            <button key={s} onClick={() => setPaymentStatus(s)} style={{
              flex: 1, padding: '10px 12px', borderRadius: 10,
              background: paymentStatus === s ? C.dark : C.ivory,
              border: `1px solid ${paymentStatus === s ? C.dark : C.border}`,
              color: paymentStatus === s ? C.gold : C.muted,
              fontSize: 13, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
              textTransform: 'capitalize' as const,
            }}>{s}</button>
          ))}
        </div>

        {/* Receipt attachment */}
        <label style={{
          display: 'block', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
          fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
        }}>Receipt</label>
        <input
          ref={fileInputRef}
          type="file" accept="image/*" capture="environment"
          style={{ display: 'none' }}
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) handleReceiptUpload(file);
          }}
        />
        {receiptUrl ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
            borderRadius: 10, padding: 10, marginBottom: 14,
          }}>
            <img src={receiptUrl} alt="Receipt" style={{
              width: 48, height: 48, objectFit: 'cover' as const, borderRadius: 6,
            }} />
            <span style={{ flex: 1, fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif' }}>
              Receipt attached
            </span>
            <button onClick={() => setReceiptUrl('')} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 6,
            }}>
              <X size={14} color={C.muted} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              width: '100%', background: C.ivory, border: `1px dashed ${C.goldBorder}`,
              borderRadius: 10, padding: '14px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              marginBottom: 14,
            }}
          >
            <Camera size={16} color={C.gold} />
            <span style={{ fontSize: 13, color: C.goldDeep, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
              {uploading ? 'Uploading…' : 'Take photo or attach receipt'}
            </span>
          </button>
        )}
        {uploadError && <ErrorBanner msg={uploadError} />}

        {/* Notes */}
        <label style={{
          display: 'block', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
          fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
        }}>Notes</label>
        <textarea
          value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Anything you want to remember about this…"
          rows={2}
          style={{
            width: '100%', boxSizing: 'border-box' as const,
            padding: '10px 14px', borderRadius: 10,
            border: `1px solid ${C.border}`, background: C.ivory,
            fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: C.dark,
            outline: 'none', marginBottom: 18, resize: 'vertical' as const,
          }}
        />

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {mode === 'edit' && onDelete && (
            <button onClick={() => onDelete()} style={{
              width: 44, height: 44, borderRadius: 12,
              background: '#FEF2F2', border: '1px solid #FECACA',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}>
              <Trash2 size={16} color="#B91C1C" />
            </button>
          )}
          <div style={{ flex: 1 }}>
            <GhostButton label="Cancel" onTap={onClose} />
          </div>
          <button onClick={handleSave} style={{
            padding: '12px 24px', borderRadius: 12,
            background: C.dark, border: 'none', cursor: 'pointer',
            color: C.gold, fontFamily: 'DM Sans, sans-serif',
            fontSize: 13, fontWeight: 400, letterSpacing: '1.5px',
            textTransform: 'uppercase' as const,
          }}>
            {mode === 'add' ? 'Add' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Shagun editor
function ShagunEditor({ mode, events, entry, onClose, onSave, onDelete }: {
  mode: 'add' | 'edit';
  events: string[];
  entry?: ShagunEntry;
  onClose: () => void;
  onSave: (payload: Partial<ShagunEntry>) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [giverName, setGiverName]       = useState(entry?.giver_name || '');
  const [relation, setRelation]         = useState(entry?.relation || '');
  const [event, setEvent]               = useState(entry?.event || '');
  const [amount, setAmount]             = useState(entry?.amount ? String(entry.amount) : '');
  const [giftDescription, setGiftDescription] = useState(entry?.gift_description || '');
  const [returnGiftSent, setReturnGiftSent]   = useState(!!entry?.return_gift_sent);
  const [notes, setNotes]               = useState(entry?.notes || '');

  const handleSave = async () => {
    if (!giverName.trim()) return;
    await onSave({
      giver_name: giverName.trim(),
      relation: relation.trim() || null,
      event: event || null,
      amount: parseFloat(amount) || 0,
      gift_description: giftDescription.trim() || null,
      return_gift_sent: returnGiftSent,
      notes: notes.trim() || null,
    });
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(44,36,32,0.5)',
        zIndex: 200, display: 'flex', alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.cream, borderRadius: '20px 20px 0 0',
          padding: '20px 20px max(20px, env(safe-area-inset-bottom))',
          width: '100%', maxWidth: 480, margin: '0 auto',
          boxSizing: 'border-box' as const, maxHeight: '90vh',
          overflowY: 'auto' as const,
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 16px' }} />

        <p style={{ margin: '0 0 16px', fontSize: 18, color: C.dark, fontFamily: 'Playfair Display, serif' }}>
          {mode === 'add' ? 'Add shagun' : 'Edit shagun'}
        </p>

        <InputField label="Who gave it" value={giverName} onChange={setGiverName} placeholder="e.g. Sharma Uncle" />
        <InputField label="Relation" value={relation} onChange={setRelation} placeholder="e.g. Mama, college friend" />

        {/* Amount */}
        <label style={{
          display: 'block', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
          fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
        }}>Amount<span style={{ color: '#C65757', marginLeft: 4 }}>*</span></label>
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <span style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            fontSize: 16, color: C.muted, fontFamily: 'DM Sans, sans-serif',
          }}>₹</span>
          <input
            type="number" inputMode="decimal" value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0"
            style={{
              width: '100%', boxSizing: 'border-box' as const,
              padding: '12px 16px 12px 32px', borderRadius: 10,
              border: `1px solid ${C.border}`, background: C.ivory,
              fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: C.dark, outline: 'none',
            }}
          />
        </div>

        <InputField label="Gift description" value={giftDescription} onChange={setGiftDescription} placeholder="e.g. Silver diya set" />

        {/* Event chips */}
        <label style={{
          display: 'block', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
          fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
        }}>Event</label>
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 14 }}>
          <button onClick={() => setEvent('')} style={{
            padding: '6px 12px', borderRadius: 16,
            background: event === '' ? C.dark : C.ivory,
            border: `1px solid ${event === '' ? C.dark : C.border}`,
            color: event === '' ? C.gold : C.muted,
            fontSize: 12, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
          }}>None</button>
          {events.map(ev => (
            <button key={ev} onClick={() => setEvent(ev)} style={{
              padding: '6px 12px', borderRadius: 16,
              background: event === ev ? C.dark : C.ivory,
              border: `1px solid ${event === ev ? C.dark : C.border}`,
              color: event === ev ? C.gold : C.muted,
              fontSize: 12, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
            }}>{ev}</button>
          ))}
        </div>

        {/* Return gift toggle */}
        <button
          onClick={() => setReturnGiftSent(v => !v)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
            background: returnGiftSent ? C.goldSoft : C.ivory,
            border: `1px solid ${returnGiftSent ? C.goldBorder : C.border}`,
            borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
            textAlign: 'left' as const, marginBottom: 14,
          }}
        >
          <div style={{
            width: 20, height: 20, borderRadius: 10, flexShrink: 0,
            background: returnGiftSent ? C.gold : C.cream,
            border: `1.5px solid ${C.goldBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {returnGiftSent && <Check size={12} color={C.cream} />}
          </div>
          <span style={{ fontSize: 13, color: C.dark, fontFamily: 'DM Sans, sans-serif' }}>
            Return gift sent
          </span>
        </button>

        {/* Notes */}
        <label style={{
          display: 'block', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
          fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
        }}>Notes</label>
        <textarea
          value={notes} onChange={e => setNotes(e.target.value)}
          rows={2}
          style={{
            width: '100%', boxSizing: 'border-box' as const,
            padding: '10px 14px', borderRadius: 10,
            border: `1px solid ${C.border}`, background: C.ivory,
            fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: C.dark,
            outline: 'none', marginBottom: 18, resize: 'vertical' as const,
          }}
        />

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {mode === 'edit' && onDelete && (
            <button onClick={() => onDelete()} style={{
              width: 44, height: 44, borderRadius: 12,
              background: '#FEF2F2', border: '1px solid #FECACA',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}>
              <Trash2 size={16} color="#B91C1C" />
            </button>
          )}
          <div style={{ flex: 1 }}>
            <GhostButton label="Cancel" onTap={onClose} />
          </div>
          <button onClick={handleSave} disabled={!giverName.trim()} style={{
            padding: '12px 24px', borderRadius: 12,
            background: C.dark, border: 'none',
            cursor: giverName.trim() ? 'pointer' : 'default',
            color: C.gold, fontFamily: 'DM Sans, sans-serif',
            fontSize: 13, fontWeight: 400, letterSpacing: '1.5px',
            textTransform: 'uppercase' as const,
            opacity: giverName.trim() ? 1 : 0.4,
          }}>
            {mode === 'add' ? 'Add' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Budget setup modal — set total budget + event envelopes
function BudgetEditor({ budget, events, expenses, onClose, onSave }: {
  budget: CoupleBudget | null;
  events: string[];
  expenses: Expense[];
  onClose: () => void;
  onSave: (patch: { total_budget?: number; event_envelopes?: Record<string, number> }) => Promise<void>;
}) {
  const [total, setTotal] = useState(budget?.total_budget ? String(budget.total_budget) : '');
  const [envs, setEnvs]   = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const ev of events) {
      const v = budget?.event_envelopes?.[ev];
      init[ev] = v ? String(v) : '';
    }
    return init;
  });

  const envSum = Object.values(envs).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const totalNum = parseFloat(total) || 0;

  const handleSave = async () => {
    const envelopes: Record<string, number> = {};
    for (const ev of events) {
      const v = parseFloat(envs[ev] || '');
      if (v > 0) envelopes[ev] = v;
    }
    await onSave({
      total_budget: totalNum,
      event_envelopes: envelopes,
    });
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(44,36,32,0.5)',
        zIndex: 200, display: 'flex', alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.cream, borderRadius: '20px 20px 0 0',
          padding: '20px 20px max(20px, env(safe-area-inset-bottom))',
          width: '100%', maxWidth: 480, margin: '0 auto',
          boxSizing: 'border-box' as const, maxHeight: '92vh',
          overflowY: 'auto' as const,
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 16px' }} />

        <p style={{ margin: '0 0 4px', fontSize: 18, color: C.dark, fontFamily: 'Playfair Display, serif' }}>
          Your budget
        </p>
        <p style={{ margin: '0 0 18px', fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
          Set your total budget and split it across events. You can edit any time.
        </p>

        {/* Total */}
        <label style={{
          display: 'block', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
          fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
        }}>Total budget</label>
        <div style={{ position: 'relative', marginBottom: 18 }}>
          <span style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            fontSize: 20, color: C.muted, fontFamily: 'Playfair Display, serif',
          }}>₹</span>
          <input
            type="number" inputMode="decimal" value={total}
            onChange={e => setTotal(e.target.value)}
            placeholder="e.g. 1500000"
            style={{
              width: '100%', boxSizing: 'border-box' as const,
              padding: '14px 16px 14px 36px', borderRadius: 10,
              border: `1px solid ${C.goldBorder}`, background: C.goldSoft,
              fontFamily: 'Playfair Display, serif', fontSize: 22, color: C.dark,
              outline: 'none', fontWeight: 600,
            }}
          />
        </div>

        {/* Per-event envelopes */}
        <p style={{
          fontSize: 10, color: C.muted, fontWeight: 500, letterSpacing: '2px',
          textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif', margin: '0 0 10px',
        }}>Per-event envelopes</p>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10, marginBottom: 14 }}>
          {events.map(ev => (
            <div key={ev} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: C.ivory, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: '10px 12px',
            }}>
              <span style={{ flex: 1, fontSize: 13, color: C.dark, fontFamily: 'DM Sans, sans-serif' }}>{ev}</span>
              <div style={{ position: 'relative', width: 140 }}>
                <span style={{
                  position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 13, color: C.muted, fontFamily: 'DM Sans, sans-serif',
                }}>₹</span>
                <input
                  type="number" inputMode="decimal"
                  value={envs[ev] || ''}
                  onChange={e => setEnvs(prev => ({ ...prev, [ev]: e.target.value }))}
                  placeholder="0"
                  style={{
                    width: '100%', boxSizing: 'border-box' as const,
                    padding: '8px 10px 8px 24px', borderRadius: 8,
                    border: `1px solid ${C.border}`, background: C.cream,
                    fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: C.dark,
                    outline: 'none', textAlign: 'right' as const,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Envelope vs total reconciliation */}
        {totalNum > 0 && envSum > 0 && (
          <div style={{
            background: envSum > totalNum ? '#FEEAEA' : C.pearl,
            border: `1px solid ${envSum > totalNum ? '#F0B8B8' : C.border}`,
            borderRadius: 10, padding: '10px 14px', marginBottom: 16,
          }}>
            <p style={{
              margin: 0, fontSize: 12,
              color: envSum > totalNum ? '#A33636' : C.muted,
              fontFamily: 'DM Sans, sans-serif',
            }}>
              Envelopes total {fmtINR(envSum)} {envSum > totalNum ? '— over your budget by ' : 'of '}
              <strong>{fmtINR(envSum > totalNum ? envSum - totalNum : totalNum)}</strong>
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <GhostButton label="Cancel" onTap={onClose} />
          </div>
          <button onClick={handleSave} style={{
            padding: '12px 24px', borderRadius: 12,
            background: C.dark, border: 'none', cursor: 'pointer',
            color: C.gold, fontFamily: 'DM Sans, sans-serif',
            fontSize: 13, fontWeight: 400, letterSpacing: '1.5px',
            textTransform: 'uppercase' as const,
          }}>Save</button>
        </div>
      </div>
    </div>
  );
}

// Receipt full-image viewer
function ReceiptViewer({ expense, canEdit, onClose, onEdit }: {
  expense: Expense;
  canEdit: boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  if (!expense.receipt_url) return null;
  const amount = expense.actual_amount + expense.shadow_amount;
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(44,36,32,0.92)',
        zIndex: 250, display: 'flex', flexDirection: 'column' as const,
      }}
      onClick={onClose}
    >
      {/* Header */}
      <div style={{
        padding: 'max(16px, env(safe-area-inset-top)) 20px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: 18,
          background: 'rgba(255,255,255,0.15)', border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <X size={16} color={C.cream} />
        </button>
        {canEdit && (
          <button onClick={e => { e.stopPropagation(); onEdit(); }} style={{
            padding: '8px 14px', borderRadius: 18,
            background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer',
            fontSize: 12, color: C.cream, fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
          }}>
            Edit
          </button>
        )}
      </div>

      {/* Image */}
      <div onClick={e => e.stopPropagation()} style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px',
      }}>
        <img
          src={expense.receipt_url}
          alt="Receipt"
          style={{
            maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' as const,
            borderRadius: 8,
          }}
        />
      </div>

      {/* Info footer */}
      <div onClick={e => e.stopPropagation()} style={{
        padding: '16px 20px max(20px, env(safe-area-inset-bottom))',
        background: 'rgba(44,36,32,0.9)', color: C.cream,
      }}>
        <p style={{ margin: 0, fontSize: 20, color: C.gold, fontFamily: 'Playfair Display, serif', fontWeight: 600 }}>
          {fmtINRFull(amount)}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: C.cream, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
          {expense.description || expense.vendor_name || expense.category}
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' as const, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: C.gold, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, letterSpacing: '0.5px' }}>
            {expense.event.toUpperCase()}
          </span>
          <span style={{ fontSize: 10, color: C.mutedLight }}>·</span>
          <span style={{ fontSize: 11, color: C.cream, fontFamily: 'DM Sans, sans-serif', fontWeight: 300, opacity: 0.8 }}>
            {expense.category}
          </span>
          {expense.receipt_uploaded_by_name && (
            <>
              <span style={{ fontSize: 10, color: C.mutedLight }}>·</span>
              <span style={{ fontSize: 11, color: C.cream, fontFamily: 'DM Sans, sans-serif', fontWeight: 300, opacity: 0.7 }}>
                Uploaded by {expense.receipt_uploaded_by_name}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// GUEST LEDGER TOOL
// Sticky header with headcount. Filter chips for side + RSVP.
// Per-event invite matrix inside the editor.
// Multi-level household management: one person RSVPs for many.
// ─────────────────────────────────────────────────────────────

type GuestFilter = 'all' | 'bride' | 'groom' | 'pending' | 'confirmed' | 'declined';

function GuestTool({
  session, guests, loading, templates,
  onAdd, onUpdate, onDelete, onRefresh, onBack,
}: {
  session: CoupleSession;
  guests: Guest[];
  loading: boolean;
  templates: WATemplate[];
  onAdd: (payload: Partial<Guest>) => Promise<Guest | null>;
  onUpdate: (id: string, patch: Partial<Guest>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  onBack: () => void;
}) {
  const [filter, setFilter] = useState<GuestFilter>('all');
  const [activeEvent, setActiveEvent] = useState<string>('All');
  const [showAdd, setShowAdd] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [contactImport, setContactImport] = useState<Array<{ name: string; phone: string }> | null>(null);
  const [contactsSupported, setContactsSupported] = useState(false);
  const [importing, setImporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showWhatsAppImport, setShowWhatsAppImport] = useState(false);

  // Detect Contact Picker API (Android Chrome) — hidden on iOS
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window) {
      setContactsSupported(true);
    }
  }, []);

  const canEditTool = canEdit(session.coShareRole, 'guests');

  const total = totalGuestCount(guests);
  const pendingNudges = pendingNudgeCount(guests);
  const confirmed = totalConfirmed(guests, session.events);

  // Pick contacts from phonebook
  const pickContacts = async () => {
    try {
      setImporting(true);
      // @ts-ignore — Contact Picker API not in standard TS lib yet
      const contacts = await (navigator as any).contacts.select(['name', 'tel'], { multiple: true });
      if (!contacts || contacts.length === 0) { setImporting(false); return; }
      const mapped = contacts
        .map((c: any) => ({
          name: (c.name?.[0] || '').trim(),
          phone: (c.tel?.[0] || '').replace(/\s+/g, ''),
        }))
        .filter((c: any) => c.name);
      setContactImport(mapped);
    } catch (e) {
      // User cancelled or permission denied — silent
    }
    setImporting(false);
  };

  // Filter logic
  const filteredGuests = guests.filter(g => {
    // Never show non-head household members in the main list
    if (g.household_head_id && !g.is_household_head) return false;

    // Event filter
    if (activeEvent !== 'All') {
      const invite = g.event_invites?.[activeEvent];
      if (!invite?.invited) return false;
    }

    // Status filter
    if (filter === 'bride') return g.side === 'bride';
    if (filter === 'groom') return g.side === 'groom';
    if (filter === 'pending' || filter === 'confirmed' || filter === 'declined') {
      const invites = Object.values(g.event_invites || {});
      if (invites.length === 0) return filter === 'pending';
      if (filter === 'pending')   return invites.some(i => i.invited && i.rsvp === 'pending');
      if (filter === 'confirmed') return invites.some(i => i.invited && i.rsvp === 'confirmed');
      if (filter === 'declined')  return invites.some(i => i.invited && i.rsvp === 'declined');
    }
    return true;
  });

  return (
    <div style={{ padding: '0 0 120px' }}>

      {/* Sticky header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '72px 20px 16px', background: C.cream,
        position: 'sticky' as const, top: 0, zIndex: 30,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{
            width: 36, height: 36, borderRadius: 18, background: C.ivory,
            border: `1px solid ${C.border}`, display: 'flex',
            alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <ChevronRight size={16} color={C.dark} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <div>
            <p style={{ margin: 0, fontSize: 18, color: C.dark, fontFamily: 'Playfair Display, serif' }}>
              Guest Ledger
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
              {total.headcount > 0
                ? `${total.headcount} guests · ${confirmed} confirmed · ${pendingNudges} pending`
                : 'Your people, all in one place'}
            </p>
          </div>
        </div>
        {canEditTool && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={async () => {
                setRefreshing(true);
                await onRefresh();
                setRefreshing(false);
              }}
              disabled={refreshing}
              style={{
                width: 36, height: 36, borderRadius: 18, background: C.ivory,
                border: `1px solid ${C.border}`, cursor: refreshing ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: refreshing ? 0.5 : 1,
                fontSize: 15, color: C.muted, fontFamily: 'DM Sans, sans-serif',
              }}
              title="Refresh"
            >
              <span style={{ transform: refreshing ? 'rotate(180deg)' : 'none', transition: 'transform 300ms' }}>↻</span>
            </button>
            {/* WhatsApp import — always available */}
            <button
              onClick={() => setShowWhatsAppImport(true)}
              style={{
                width: 36, height: 36, borderRadius: 18, background: C.ivory,
                border: `1px solid ${C.goldBorder}`, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              title="Import via WhatsApp"
            >
              <Phone size={14} color={C.gold} />
            </button>
            {contactsSupported && (
              <button
                onClick={pickContacts}
                disabled={importing}
                style={{
                  width: 36, height: 36, borderRadius: 18, background: C.ivory,
                  border: `1px solid ${C.goldBorder}`, cursor: importing ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: importing ? 0.5 : 1,
                }}
                title="Import from phonebook"
              >
                <Smartphone size={14} color={C.gold} />
              </button>
            )}
            <button onClick={() => setShowAdd(true)} style={{
              width: 36, height: 36, borderRadius: 18, background: C.dark,
              border: 'none', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Plus size={16} color={C.gold} />
            </button>
          </div>
        )}
      </div>

      {/* Per-event headcount summary (only if guests exist) */}
      {guests.length > 0 && session.events.length > 0 && (
        <div style={{
          display: 'flex', gap: 8, padding: '14px 20px',
          overflowX: 'auto' as const, WebkitOverflowScrolling: 'touch' as any,
        }}>
          {session.events.map(ev => {
            const confirmedCount = eventHeadcount(guests, ev, 'confirmed');
            const invitedCount   = eventHeadcount(guests, ev, 'invited');
            return (
              <div key={ev} style={{
                flexShrink: 0, background: C.ivory, border: `1px solid ${C.border}`,
                borderRadius: 12, padding: '10px 14px', minWidth: 96,
              }}>
                <p style={{
                  margin: 0, fontSize: 9, color: C.goldDeep, fontWeight: 500,
                  letterSpacing: '0.5px', textTransform: 'uppercase' as const,
                  fontFamily: 'DM Sans, sans-serif',
                }}>{ev}</p>
                <p style={{
                  margin: '4px 0 0', fontSize: 20, color: C.dark,
                  fontFamily: 'Playfair Display, serif', fontWeight: 600, lineHeight: '22px',
                }}>{confirmedCount}</p>
                <p style={{
                  margin: '2px 0 0', fontSize: 10, color: C.muted,
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 300,
                }}>of {invitedCount} invited</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Filter chips */}
      <div style={{
        display: 'flex', gap: 6, padding: '0 20px 12px',
        overflowX: 'auto' as const, WebkitOverflowScrolling: 'touch' as any,
      }}>
        {([
          ['all',       'All'],
          ['bride',     "Bride's side"],
          ['groom',     "Groom's side"],
          ['pending',   'Pending'],
          ['confirmed', 'Confirmed'],
          ['declined',  'Declined'],
        ] as [GuestFilter, string][]).map(([f, label]) => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 14px', borderRadius: 18, whiteSpace: 'nowrap' as const,
            background: filter === f ? C.dark : C.ivory,
            border: `1px solid ${filter === f ? C.dark : C.border}`,
            color: filter === f ? C.gold : C.muted,
            fontSize: 12, fontWeight: filter === f ? 500 : 400,
            fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', flexShrink: 0,
          }}>{label}</button>
        ))}
      </div>

      {/* Event filter */}
      {guests.length > 0 && (
        <div style={{
          display: 'flex', gap: 6, padding: '0 20px 12px',
          overflowX: 'auto' as const, WebkitOverflowScrolling: 'touch' as any,
          borderBottom: `1px solid ${C.border}`,
        }}>
          {['All', ...session.events].map(ev => {
            const active = activeEvent === ev;
            return (
              <button key={ev} onClick={() => setActiveEvent(ev)} style={{
                padding: '5px 12px', borderRadius: 14, whiteSpace: 'nowrap' as const,
                background: active ? C.goldSoft : 'transparent',
                border: `1px solid ${active ? C.goldBorder : C.border}`,
                color: active ? C.goldDeep : C.muted,
                fontSize: 11, fontWeight: active ? 500 : 400,
                fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', flexShrink: 0,
              }}>{ev}</button>
            );
          })}
        </div>
      )}

      {/* Guest list */}
      <div style={{ padding: '16px 20px' }}>
        {loading ? (
          <p style={{ fontSize: 13, color: C.muted, fontFamily: 'DM Sans, sans-serif', textAlign: 'center', padding: '32px 0' }}>
            Loading…
          </p>
        ) : guests.length === 0 ? (
          <div style={{
            background: C.ivory, border: `1px solid ${C.border}`,
            borderRadius: 14, padding: '32px 20px', textAlign: 'center',
          }}>
            <Users size={28} color={C.goldBorder} style={{ marginBottom: 10 }} />
            <p style={{ margin: '0 0 6px', fontSize: 16, color: C.dark, fontFamily: 'Playfair Display, serif' }}>
              No guests yet.
            </p>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: C.muted, fontWeight: 300, fontFamily: 'DM Sans, sans-serif', lineHeight: '20px' }}>
              {canEditTool
                ? 'Start with the people you\u2019re most excited to have there.'
                : 'Nothing tracked yet.'}
            </p>
            {canEditTool && contactsSupported && (
              <button
                onClick={pickContacts}
                disabled={importing}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '10px 18px', borderRadius: 10,
                  background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
                  color: C.goldDeep, fontFamily: 'DM Sans, sans-serif',
                  fontSize: 12, fontWeight: 500,
                  cursor: importing ? 'default' : 'pointer',
                  opacity: importing ? 0.5 : 1,
                }}
              >
                <Smartphone size={13} color={C.gold} />
                Import from phonebook
              </button>
            )}
          </div>
        ) : filteredGuests.length === 0 ? (
          <div style={{
            background: C.pearl, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: '20px', textAlign: 'center',
          }}>
            <p style={{ margin: 0, fontSize: 13, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
              No matches for this filter.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
            {filteredGuests.map(g => (
              <GuestRow
                key={g.id}
                guest={g}
                events={session.events}
                canEdit={canEditTool}
                session={session}
                templates={templates}
                onTap={() => setEditingGuest(g)}
                onNudgeSent={async () => {
                  await onUpdate(g.id, { nudge_sent_at: new Date().toISOString() });
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAdd && (
        <GuestEditor
          mode="add"
          events={session.events}
          onClose={() => setShowAdd(false)}
          onSave={async payload => {
            await onAdd(payload);
            setShowAdd(false);
          }}
        />
      )}
      {editingGuest && canEditTool && (
        <GuestEditor
          mode="edit"
          events={session.events}
          guest={editingGuest}
          onClose={() => setEditingGuest(null)}
          onSave={async payload => {
            await onUpdate(editingGuest.id, payload);
            setEditingGuest(null);
          }}
          onDelete={async () => {
            await onDelete(editingGuest.id);
            setEditingGuest(null);
          }}
        />
      )}
      {contactImport && (
        <ContactImportModal
          contacts={contactImport}
          events={session.events}
          onClose={() => setContactImport(null)}
          onSave={async (selected) => {
            // Bulk-add each selected contact as a guest
            for (const c of selected) {
              await onAdd({
                name: c.name,
                phone: c.phone || null,
                side: c.side,
                household_count: c.householdCount,
                is_household_head: c.householdCount > 1,
                event_invites: c.invites,
              });
            }
            setContactImport(null);
          }}
        />
      )}
      {showWhatsAppImport && (
        <WhatsAppImportModal
          onClose={() => setShowWhatsAppImport(false)}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}

// Single guest row
function GuestRow({ guest, events, canEdit: canEditRow, session, templates, onTap, onNudgeSent }: {
  guest: Guest; events: string[]; canEdit: boolean;
  session: CoupleSession; templates: WATemplate[];
  onTap: () => void; onNudgeSent: () => void;
}) {
  const invites = guest.event_invites || {};
  const invitedEvents = events.filter(ev => invites[ev]?.invited);
  const pendingCount = invitedEvents.filter(ev => invites[ev]?.rsvp === 'pending').length;
  const confirmedCount = invitedEvents.filter(ev => invites[ev]?.rsvp === 'confirmed').length;
  const declinedCount = invitedEvents.filter(ev => invites[ev]?.rsvp === 'declined').length;

  const sideColor = guest.side === 'bride' ? '#B8629E' : '#5A8CA8';
  const hasPhone = !!(guest.phone && guest.phone.replace(/\D/g, '').length >= 10);
  const canNudge = hasPhone && pendingCount > 0 && canEditRow;

  // Build template vars for this guest
  const coupleVars = buildCoupleVars(session);
  const pendingEvents = events.filter(ev => invites[ev]?.invited && invites[ev]?.rsvp === 'pending');
  const vars = {
    ...coupleVars,
    guest_name: guest.name,
    events: pendingEvents.length > 0 ? pendingEvents.join(', ') : invitedEvents.join(', '),
    events_list: (pendingEvents.length > 0 ? pendingEvents : invitedEvents).map(e => `• ${e}`).join('\n'),
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'stretch', gap: 0,
      background: C.ivory, border: `1px solid ${C.border}`,
      borderRadius: 12, overflow: 'hidden' as const,
    }}>
      <button
        onClick={canEditRow ? onTap : undefined}
        style={{
          flex: 1, minWidth: 0, background: 'none', border: 'none',
          cursor: canEditRow ? 'pointer' : 'default',
          padding: '12px 14px', textAlign: 'left' as const,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <span style={{
            fontSize: 14, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
            overflow: 'hidden' as const, textOverflow: 'ellipsis' as const, whiteSpace: 'nowrap' as const,
          }}>
            {guest.name}
          </span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
            {guest.household_count > 1 && (
              <span style={{
                fontSize: 10, color: C.goldDeep, fontFamily: 'DM Sans, sans-serif',
                fontWeight: 500, background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
                borderRadius: 8, padding: '1px 5px',
              }}>
                +{guest.household_count - 1}
              </span>
            )}
            <span style={{
              width: 6, height: 6, borderRadius: 3, background: sideColor, display: 'inline-block' as const,
            }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' as const, alignItems: 'center' }}>
          {guest.relation && (
            <span style={{ fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
              {guest.relation}
            </span>
          )}
          {guest.dietary && (
            <>
              {guest.relation && <span style={{ fontSize: 10, color: C.mutedLight }}>·</span>}
              <span style={{ fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
                {DIETARY_LABELS[guest.dietary] || ''}
              </span>
            </>
          )}
          {invitedEvents.length > 0 && (
            <>
              {(guest.relation || guest.dietary) && <span style={{ fontSize: 10, color: C.mutedLight }}>·</span>}
              <span style={{ fontSize: 11, color: C.goldDeep, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                {invitedEvents.length} event{invitedEvents.length !== 1 ? 's' : ''}
              </span>
            </>
          )}
        </div>
        {/* RSVP mini-summary */}
        {invitedEvents.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
            {confirmedCount > 0 && (
              <span style={{
                fontSize: 10, color: '#2D6A2D', fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
              }}>
                ✓ {confirmedCount}
              </span>
            )}
            {pendingCount > 0 && (
              <span style={{
                fontSize: 10, color: '#8B6914', fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
              }}>
                ⋯ {pendingCount} pending
              </span>
            )}
            {declinedCount > 0 && (
              <span style={{
                fontSize: 10, color: '#A33636', fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
              }}>
                ✗ {declinedCount}
              </span>
            )}
          </div>
        )}
      </button>
      {canNudge && (
        <WhatsAppButton
          context="guest"
          templates={templates}
          phone={guest.phone}
          vars={vars}
          iconOnly
          onBeforeSend={onNudgeSent}
        />
      )}
    </div>
  );
}

// Guest add/edit modal
function GuestEditor({ mode, events, guest, onClose, onSave, onDelete }: {
  mode: 'add' | 'edit';
  events: string[];
  guest?: Guest;
  onClose: () => void;
  onSave: (payload: Partial<Guest>) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [name, setName]         = useState(guest?.name || '');
  const [side, setSide]         = useState<GuestSide>(guest?.side || 'bride');
  const [relation, setRelation] = useState(guest?.relation || '');
  const [phone, setPhone]       = useState(guest?.phone || '');
  const [householdCount, setHouseholdCount] = useState(guest?.household_count || 1);
  const [dietary, setDietary]   = useState<Dietary>(guest?.dietary || null);
  const [dietaryNotes, setDietaryNotes] = useState(guest?.dietary_notes || '');
  const [notes, setNotes]       = useState(guest?.notes || '');

  // event_invites state — initialised per event
  const [invites, setInvites] = useState<Record<string, EventInvite>>(() => {
    const init: Record<string, EventInvite> = {};
    for (const ev of events) {
      const existing = guest?.event_invites?.[ev];
      init[ev] = existing || { invited: true, rsvp: 'pending' };
    }
    return init;
  });

  const setInviteForEvent = (ev: string, patch: Partial<EventInvite>) => {
    setInvites(prev => ({ ...prev, [ev]: { ...prev[ev], ...patch } }));
  };

  const inviteAllEvents = () => {
    const next: Record<string, EventInvite> = {};
    for (const ev of events) next[ev] = { invited: true, rsvp: invites[ev]?.rsvp || 'pending' };
    setInvites(next);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    await onSave({
      name: name.trim(),
      side,
      relation: relation.trim() || null,
      phone: phone.trim() || null,
      household_count: householdCount,
      is_household_head: householdCount > 1,
      dietary: dietary || null,
      dietary_notes: dietaryNotes.trim() || null,
      event_invites: invites,
      notes: notes.trim() || null,
    });
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(44,36,32,0.5)',
        zIndex: 200, display: 'flex', alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.cream, borderRadius: '20px 20px 0 0',
          padding: '20px 20px max(20px, env(safe-area-inset-bottom))',
          width: '100%', maxWidth: 480, margin: '0 auto',
          boxSizing: 'border-box' as const, maxHeight: '92vh',
          overflowY: 'auto' as const,
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 16px' }} />

        <p style={{ margin: '0 0 16px', fontSize: 18, color: C.dark, fontFamily: 'Playfair Display, serif' }}>
          {mode === 'add' ? 'Add a guest' : 'Edit guest'}
        </p>

        {/* Name */}
        <InputField label="Name" value={name} onChange={setName} placeholder="e.g. Sharma Mama" required />

        {/* Side toggle */}
        <label style={{
          display: 'block', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
          fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
        }}>Side</label>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {(['bride', 'groom'] as GuestSide[]).map(s => (
            <button key={s} onClick={() => setSide(s)} style={{
              flex: 1, padding: '10px 12px', borderRadius: 10,
              background: side === s ? C.dark : C.ivory,
              border: `1px solid ${side === s ? C.dark : C.border}`,
              color: side === s ? C.gold : C.muted,
              fontSize: 13, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
              textTransform: 'capitalize' as const,
            }}>{s}'s side</button>
          ))}
        </div>

        <InputField label="Relation" value={relation} onChange={setRelation} placeholder="e.g. Mama, College friend" />
        <InputField label="Phone (for WhatsApp nudge)" value={phone} onChange={setPhone} type="tel" placeholder="+91 98765 43210" />

        {/* Household count */}
        <label style={{
          display: 'block', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
          fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
        }}>Household size (incl. this person)</label>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: C.ivory, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: '10px 14px', marginBottom: 14,
        }}>
          <button
            onClick={() => setHouseholdCount(Math.max(1, householdCount - 1))}
            style={{
              width: 32, height: 32, borderRadius: 16,
              background: C.cream, border: `1px solid ${C.border}`, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: C.dark, fontSize: 16, fontFamily: 'DM Sans, sans-serif',
            }}
          >−</button>
          <div style={{ flex: 1, textAlign: 'center' as const }}>
            <p style={{ margin: 0, fontSize: 20, color: C.dark, fontFamily: 'Playfair Display, serif', fontWeight: 600 }}>
              {householdCount}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 10, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
              {householdCount === 1 ? 'Just this person' : `Including ${householdCount - 1} other${householdCount > 2 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={() => setHouseholdCount(householdCount + 1)}
            style={{
              width: 32, height: 32, borderRadius: 16,
              background: C.dark, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: C.gold, fontSize: 16, fontFamily: 'DM Sans, sans-serif',
            }}
          >+</button>
        </div>

        {/* Dietary */}
        <label style={{
          display: 'block', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
          fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
        }}>Dietary preference</label>
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 14 }}>
          {(['veg', 'non-veg', 'jain', 'allergy'] as const).map(d => (
            <button key={d} onClick={() => setDietary(dietary === d ? null : d)} style={{
              padding: '6px 12px', borderRadius: 16,
              background: dietary === d ? C.goldSoft : C.ivory,
              border: `1px solid ${dietary === d ? C.goldBorder : C.border}`,
              color: dietary === d ? C.goldDeep : C.muted,
              fontSize: 12, fontWeight: dietary === d ? 500 : 400,
              fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
            }}>{DIETARY_LABELS[d]}</button>
          ))}
        </div>
        {dietary === 'allergy' && (
          <InputField label="Allergy details" value={dietaryNotes} onChange={setDietaryNotes} placeholder="e.g. Nuts, dairy" />
        )}

        {/* Event invites matrix */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8,
        }}>
          <label style={{
            fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
            fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const,
          }}>Events + RSVP</label>
          <button onClick={inviteAllEvents} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: C.gold, fontSize: 11, fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
            padding: '2px 0',
          }}>Invite to all</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8, marginBottom: 14 }}>
          {events.map(ev => {
            const inv = invites[ev] || { invited: false, rsvp: 'pending' as RSVPStatus };
            return (
              <div key={ev} style={{
                background: C.ivory, border: `1px solid ${C.border}`,
                borderRadius: 10, padding: '10px 12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: inv.invited ? 8 : 0 }}>
                  <button
                    onClick={() => setInviteForEvent(ev, { invited: !inv.invited })}
                    style={{
                      width: 22, height: 22, borderRadius: 11,
                      background: inv.invited ? C.gold : C.cream,
                      border: `1.5px solid ${C.goldBorder}`,
                      cursor: 'pointer', padding: 0, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {inv.invited && <Check size={12} color={C.cream} />}
                  </button>
                  <span style={{ flex: 1, fontSize: 13, color: C.dark, fontFamily: 'DM Sans, sans-serif' }}>
                    {ev}
                  </span>
                </div>
                {inv.invited && (
                  <div style={{ display: 'flex', gap: 4, paddingLeft: 32 }}>
                    {(['pending', 'confirmed', 'declined'] as RSVPStatus[]).map(s => {
                      const active = inv.rsvp === s;
                      const colors = {
                        pending:   { active: '#8B6914', bg: '#FFF8E1' },
                        confirmed: { active: '#2D6A2D', bg: '#EBF5EB' },
                        declined:  { active: '#A33636', bg: '#FEEAEA' },
                      }[s];
                      return (
                        <button
                          key={s}
                          onClick={() => setInviteForEvent(ev, { rsvp: s })}
                          style={{
                            flex: 1, padding: '5px 8px', borderRadius: 8,
                            background: active ? colors.bg : C.cream,
                            border: `1px solid ${active ? colors.active : C.border}`,
                            color: active ? colors.active : C.muted,
                            fontSize: 11, fontWeight: active ? 500 : 400,
                            fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
                            textTransform: 'capitalize' as const,
                          }}
                        >{s}</button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Notes */}
        <label style={{
          display: 'block', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
          fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
        }}>Notes</label>
        <textarea
          value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="e.g. Must sit near AC, needs wheelchair, don't seat near Taya-ji"
          rows={2}
          style={{
            width: '100%', boxSizing: 'border-box' as const,
            padding: '10px 14px', borderRadius: 10,
            border: `1px solid ${C.border}`, background: C.ivory,
            fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: C.dark,
            outline: 'none', marginBottom: 18, resize: 'vertical' as const,
          }}
        />

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {mode === 'edit' && onDelete && (
            <button onClick={() => onDelete()} style={{
              width: 44, height: 44, borderRadius: 12,
              background: '#FEF2F2', border: '1px solid #FECACA',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}>
              <Trash2 size={16} color="#B91C1C" />
            </button>
          )}
          <div style={{ flex: 1 }}>
            <GhostButton label="Cancel" onTap={onClose} />
          </div>
          <button onClick={handleSave} disabled={!name.trim()} style={{
            padding: '12px 24px', borderRadius: 12,
            background: C.dark, border: 'none',
            cursor: name.trim() ? 'pointer' : 'default',
            color: C.gold, fontFamily: 'DM Sans, sans-serif',
            fontSize: 13, fontWeight: 400, letterSpacing: '1.5px',
            textTransform: 'uppercase' as const,
            opacity: name.trim() ? 1 : 0.4,
          }}>
            {mode === 'add' ? 'Add' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CONTACT IMPORT MODAL
// Review imported contacts, set side + events + household count
// per contact, then bulk-create as guests.
// ─────────────────────────────────────────────────────────────

interface ImportedContactRow {
  name: string;
  phone: string;
  side: GuestSide;
  householdCount: number;
  invites: Record<string, EventInvite>;
  selected: boolean;
}

// ─────────────────────────────────────────────────────────────
// WHATSAPP CONTACT IMPORT MODAL
// Explains flow, opens WhatsApp with prefilled instructions.
// ─────────────────────────────────────────────────────────────

function WhatsAppImportModal({ onClose, onRefresh }: {
  onClose: () => void;
  onRefresh: () => Promise<void>;
}) {
  const TWILIO_NUMBER = '14155238886';
  const SANDBOX_JOIN_CODE = 'join acres-eventually';
  const [refreshing, setRefreshing] = useState(false);

  const openWhatsAppImport = () => {
    const msg = `I'd like to import contacts for my Guest Ledger.`;
    window.open(
      `https://wa.me/${TWILIO_NUMBER}?text=${encodeURIComponent(msg)}`,
      '_blank'
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(44,36,32,0.5)',
        zIndex: 200, display: 'flex', alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.cream, borderRadius: '20px 20px 0 0',
          padding: '20px 20px max(20px, env(safe-area-inset-bottom))',
          width: '100%', maxWidth: 480, margin: '0 auto',
          boxSizing: 'border-box' as const, maxHeight: '90vh',
          overflowY: 'auto' as const,
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 16px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Phone size={16} color={C.gold} />
          </div>
          <p style={{ margin: 0, fontSize: 18, color: C.dark, fontFamily: 'Playfair Display, serif' }}>
            Import via WhatsApp
          </p>
        </div>
        <p style={{
          margin: '0 0 18px', fontSize: 12, color: C.muted,
          fontFamily: 'DM Sans, sans-serif', fontWeight: 300, lineHeight: '18px',
        }}>
          Works on iPhone and Android. Forward us your guest contacts via WhatsApp and we'll add them to your Guest Ledger automatically.
        </p>

        {/* Step-by-step */}
        <div style={{
          background: C.ivory, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: '14px 16px', marginBottom: 14,
        }}>
          <p style={{
            margin: '0 0 10px', fontSize: 10, color: C.muted, fontWeight: 500,
            letterSpacing: '2px', textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
          }}>How it works</p>
          {[
            'Tap "Open WhatsApp" below',
            'In WhatsApp, tap the attach icon (📎 or +)',
            'Choose "Contact" and select who to add',
            'Send the contacts',
            'We reply with a confirmation and add them here',
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 6, alignItems: 'flex-start' }}>
              <span style={{
                flexShrink: 0, width: 20, height: 20, borderRadius: 10,
                background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
                fontSize: 10, color: C.goldDeep, fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{i + 1}</span>
              <span style={{
                fontSize: 12, color: C.dark, fontFamily: 'DM Sans, sans-serif',
                fontWeight: 300, lineHeight: '18px', paddingTop: 1,
              }}>{step}</span>
            </div>
          ))}
        </div>

        <button onClick={openWhatsAppImport} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: C.dark, border: 'none',
          borderRadius: 12, padding: '14px', cursor: 'pointer',
          color: C.gold, fontFamily: 'DM Sans, sans-serif',
          fontSize: 13, fontWeight: 400, letterSpacing: '1.5px',
          textTransform: 'uppercase' as const, marginBottom: 10,
        }}>
          <Phone size={13} color={C.gold} />
          Open WhatsApp
        </button>

        {/* After you send, come back and refresh */}
        <div style={{
          background: C.pearl, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: '10px 14px', marginBottom: 10,
        }}>
          <p style={{
            margin: '0 0 8px', fontSize: 11, color: C.dark,
            fontFamily: 'DM Sans, sans-serif', fontWeight: 500, lineHeight: '16px',
          }}>
            After you send the contacts…
          </p>
          <p style={{
            margin: '0 0 10px', fontSize: 11, color: C.muted,
            fontFamily: 'DM Sans, sans-serif', fontWeight: 300, lineHeight: '16px',
          }}>
            Come back here and tap refresh to see them in your list.
          </p>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              padding: '6px 14px', borderRadius: 10,
              background: refreshing ? C.pearl : C.goldSoft,
              border: `1px solid ${C.goldBorder}`,
              cursor: refreshing ? 'default' : 'pointer',
              color: C.goldDeep, fontFamily: 'DM Sans, sans-serif',
              fontSize: 11, fontWeight: 500, letterSpacing: '0.5px',
              opacity: refreshing ? 0.6 : 1,
            }}
          >
            {refreshing ? 'Refreshing…' : '↻ Refresh now'}
          </button>
        </div>

        {/* First-time users — Twilio sandbox opt-in */}
        <div style={{
          background: C.pearl, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: '10px 14px', marginBottom: 14,
        }}>
          <p style={{
            margin: 0, fontSize: 10, color: C.muted, fontWeight: 500,
            letterSpacing: '1px', textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
          }}>First time?</p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300, lineHeight: '16px' }}>
            You'll need to connect once. Send <span style={{ fontWeight: 500, color: C.dark }}>{SANDBOX_JOIN_CODE}</span> to <span style={{ fontWeight: 500, color: C.dark }}>+1 {TWILIO_NUMBER.slice(0, 3)}-{TWILIO_NUMBER.slice(3, 6)}-{TWILIO_NUMBER.slice(6)}</span> from your WhatsApp.
          </p>
        </div>

        <GhostButton label="Done" onTap={onClose} />
      </div>
    </div>
  );
}

function ContactImportModal({ contacts, events, onClose, onSave }: {
  contacts: Array<{ name: string; phone: string }>;
  events: string[];
  onClose: () => void;
  onSave: (selected: ImportedContactRow[]) => Promise<void>;
}) {
  // Initial state: all selected, bride's side, household 1, all events invited
  const [rows, setRows] = useState<ImportedContactRow[]>(() =>
    contacts.map(c => {
      const invites: Record<string, EventInvite> = {};
      for (const ev of events) invites[ev] = { invited: true, rsvp: 'pending' };
      return {
        name: c.name,
        phone: c.phone,
        side: 'bride',
        householdCount: 1,
        invites,
        selected: true,
      };
    })
  );
  const [saving, setSaving] = useState(false);

  // Bulk actions
  const [bulkSide, setBulkSide] = useState<GuestSide | null>(null);

  const updateRow = (i: number, patch: Partial<ImportedContactRow>) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  };

  const selectAll = () => setRows(prev => prev.map(r => ({ ...r, selected: true })));
  const selectNone = () => setRows(prev => prev.map(r => ({ ...r, selected: false })));

  const applyBulkSide = (side: GuestSide) => {
    setRows(prev => prev.map(r => r.selected ? { ...r, side } : r));
    setBulkSide(side);
  };

  const selectedCount = rows.filter(r => r.selected).length;

  const handleSave = async () => {
    setSaving(true);
    await onSave(rows.filter(r => r.selected));
    setSaving(false);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(44,36,32,0.5)',
        zIndex: 200, display: 'flex', alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.cream, borderRadius: '20px 20px 0 0',
          padding: '20px 20px max(20px, env(safe-area-inset-bottom))',
          width: '100%', maxWidth: 480, margin: '0 auto',
          boxSizing: 'border-box' as const, maxHeight: '92vh',
          overflowY: 'auto' as const,
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 16px' }} />

        <p style={{ margin: '0 0 4px', fontSize: 18, color: C.dark, fontFamily: 'Playfair Display, serif' }}>
          Imported {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
        </p>
        <p style={{ margin: '0 0 14px', fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300, lineHeight: '18px' }}>
          Review before adding. You can edit any of them later.
        </p>

        {/* Bulk controls */}
        <div style={{
          display: 'flex', gap: 6, padding: '10px 12px', marginBottom: 12,
          background: C.ivory, border: `1px solid ${C.border}`, borderRadius: 10,
          alignItems: 'center', flexWrap: 'wrap' as const,
        }}>
          <span style={{ fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, marginRight: 'auto' }}>
            {selectedCount} of {rows.length} selected
          </span>
          <button onClick={selectAll} style={bulkBtnStyle(false)}>All</button>
          <button onClick={selectNone} style={bulkBtnStyle(false)}>None</button>
          <span style={{ width: 1, height: 16, background: C.border, margin: '0 4px' }} />
          <button onClick={() => applyBulkSide('bride')} style={bulkBtnStyle(bulkSide === 'bride')}>Bride's</button>
          <button onClick={() => applyBulkSide('groom')} style={bulkBtnStyle(bulkSide === 'groom')}>Groom's</button>
        </div>

        {/* Rows */}
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8, marginBottom: 18 }}>
          {rows.map((r, i) => (
            <div key={i} style={{
              background: r.selected ? C.ivory : C.pearl,
              border: `1px solid ${r.selected ? C.border : C.border}`,
              borderRadius: 12, padding: '10px 12px',
              opacity: r.selected ? 1 : 0.5,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => updateRow(i, { selected: !r.selected })}
                  style={{
                    width: 22, height: 22, borderRadius: 11,
                    background: r.selected ? C.gold : C.cream,
                    border: `1.5px solid ${C.goldBorder}`,
                    cursor: 'pointer', padding: 0, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {r.selected && <Check size={12} color={C.cream} />}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    margin: 0, fontSize: 14, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
                    overflow: 'hidden' as const, textOverflow: 'ellipsis' as const, whiteSpace: 'nowrap' as const,
                  }}>
                    {r.name}
                  </p>
                  {r.phone && (
                    <p style={{
                      margin: '2px 0 0', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300,
                    }}>
                      {r.phone}
                    </p>
                  )}
                </div>
              </div>

              {r.selected && (
                <div style={{ display: 'flex', gap: 6, marginTop: 10, paddingLeft: 32, flexWrap: 'wrap' as const, alignItems: 'center' }}>
                  {(['bride', 'groom'] as GuestSide[]).map(s => (
                    <button key={s} onClick={() => updateRow(i, { side: s })} style={{
                      padding: '4px 10px', borderRadius: 12,
                      background: r.side === s ? C.dark : C.ivory,
                      border: `1px solid ${r.side === s ? C.dark : C.border}`,
                      color: r.side === s ? C.gold : C.muted,
                      fontSize: 11, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
                    }}>{s === 'bride' ? "Bride's" : "Groom's"}</button>
                  ))}
                  <span style={{ width: 1, height: 14, background: C.border }} />
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: C.ivory, border: `1px solid ${C.border}`,
                    borderRadius: 12, padding: '2px 4px 2px 8px',
                  }}>
                    <span style={{ fontSize: 10, color: C.muted, fontFamily: 'DM Sans, sans-serif' }}>+{r.householdCount - 1}</span>
                    <button
                      onClick={() => updateRow(i, { householdCount: Math.max(1, r.householdCount - 1) })}
                      style={{
                        width: 20, height: 20, borderRadius: 10,
                        background: C.cream, border: `1px solid ${C.border}`,
                        cursor: 'pointer', padding: 0, fontSize: 11, color: C.dark,
                      }}
                    >−</button>
                    <button
                      onClick={() => updateRow(i, { householdCount: r.householdCount + 1 })}
                      style={{
                        width: 20, height: 20, borderRadius: 10,
                        background: C.dark, border: 'none',
                        cursor: 'pointer', padding: 0, fontSize: 11, color: C.gold,
                      }}
                    >+</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <GhostButton label="Cancel" onTap={onClose} />
          </div>
          <button
            onClick={handleSave}
            disabled={selectedCount === 0 || saving}
            style={{
              padding: '12px 24px', borderRadius: 12,
              background: C.dark, border: 'none',
              cursor: selectedCount > 0 && !saving ? 'pointer' : 'default',
              color: C.gold, fontFamily: 'DM Sans, sans-serif',
              fontSize: 12, fontWeight: 400, letterSpacing: '1.5px',
              textTransform: 'uppercase' as const,
              opacity: selectedCount > 0 && !saving ? 1 : 0.4,
            }}
          >
            {saving ? 'Adding…' : `Add ${selectedCount > 0 ? selectedCount : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function bulkBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: '4px 10px', borderRadius: 12,
    background: active ? C.dark : C.ivory,
    border: `1px solid ${active ? C.dark : C.border}`,
    color: active ? C.gold : C.muted,
    fontSize: 11, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
  };
}

// ─────────────────────────────────────────────────────────────
// MOODBOARD TOOL
// Pure image wall per event. Pins show images only on the board;
// tapping opens full viewer with notes, source link, vendor tag.
// ─────────────────────────────────────────────────────────────

function MoodboardTool({
  session, pins, loading, templates,
  onFetchPreview, onAdd, onUpdate, onDelete, onBack,
}: {
  session: CoupleSession;
  pins: MoodboardPin[];
  loading: boolean;
  templates: WATemplate[];
  onFetchPreview: (url: string) => Promise<OGPreview | null>;
  onAdd: (payload: Partial<MoodboardPin>) => Promise<MoodboardPin | null>;
  onUpdate: (id: string, patch: Partial<MoodboardPin>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onBack: () => void;
}) {
  const [activeEvent, setActiveEvent] = useState<string>(session.events[0] || 'All');
  const [showAdd, setShowAdd] = useState(false);
  const [showCurate, setShowCurate] = useState(false);
  const [viewPin, setViewPin] = useState<MoodboardPin | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const canEditBoard = canEdit(session.coShareRole, 'moodboard');
  const isBridesmaid = session.coShareRole === 'bridesmaid';

  const visiblePins = pinsForEvent(pins, activeEvent);
  const suggestionsAll = pins.filter(p => p.is_suggestion);

  return (
    <div style={{ padding: '0 0 120px' }}>

      {/* Sticky header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '72px 20px 16px', background: C.cream,
        position: 'sticky' as const, top: 0, zIndex: 30,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{
            width: 36, height: 36, borderRadius: 18, background: C.ivory,
            border: `1px solid ${C.border}`, display: 'flex',
            alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <ChevronRight size={16} color={C.dark} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <div>
            <p style={{ margin: 0, fontSize: 18, color: C.dark, fontFamily: 'Playfair Display, serif' }}>
              Moodboard
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
              {pins.length > 0 ? `${pins.filter(p => !p.is_suggestion).length} pins across your events` : 'Your wedding vision, all in one place'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {canEditBoard && suggestionsAll.length > 0 && (
            <button onClick={() => setShowSuggestions(true)} style={{
              position: 'relative', width: 36, height: 36, borderRadius: 18,
              background: C.ivory, border: `1px solid ${C.goldBorder}`,
              cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Bell size={14} color={C.gold} />
              <span style={{
                position: 'absolute', top: -4, right: -4,
                minWidth: 16, height: 16, borderRadius: 8,
                background: C.gold, color: C.cream,
                fontSize: 10, fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 4px',
              }}>{suggestionsAll.length}</span>
            </button>
          )}
          {(canEditBoard || isBridesmaid) && (
            <button onClick={() => setShowAdd(true)} style={{
              width: 36, height: 36, borderRadius: 18, background: C.dark,
              border: 'none', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Plus size={16} color={C.gold} />
            </button>
          )}
        </div>
      </div>

      {/* Event tabs */}
      <div style={{
        display: 'flex', gap: 6, padding: '12px 20px',
        overflowX: 'auto' as const, WebkitOverflowScrolling: 'touch' as any,
        borderBottom: `1px solid ${C.border}`,
      }}>
        {['All', ...session.events].map(ev => {
          const active = activeEvent === ev;
          const count = ev === 'All'
            ? pinsForEvent(pins, 'All').length
            : pins.filter(p => p.event === ev && !p.is_suggestion).length;
          return (
            <button key={ev} onClick={() => setActiveEvent(ev)} style={{
              padding: '6px 14px', borderRadius: 18, whiteSpace: 'nowrap' as const,
              background: active ? C.dark : C.ivory,
              border: `1px solid ${active ? C.dark : C.border}`,
              color: active ? C.gold : C.muted,
              fontSize: 12, fontWeight: active ? 500 : 400,
              fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', flexShrink: 0,
            }}>
              {ev}{count > 0 ? ` · ${count}` : ''}
            </button>
          );
        })}
      </div>

      {/* Action bar — Share curated view */}
      {canEditBoard && activeEvent !== 'All' && visiblePins.length >= 3 && (
        <div style={{ padding: '12px 20px 0' }}>
          <button onClick={() => setShowCurate(true)} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
            borderRadius: 10, padding: '10px 14px', cursor: 'pointer',
          }}>
            <Share2 size={14} color={C.gold} />
            <span style={{ fontSize: 12, color: C.goldDeep, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
              Share a curated view with family
            </span>
          </button>
        </div>
      )}

      {/* Share-from-anywhere teaser */}
      {canEditBoard && (
        <div style={{ padding: '12px 20px 0' }}>
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            background: C.pearl, border: `1px dashed ${C.goldBorder}`,
            borderRadius: 10, padding: '10px 14px',
          }}>
            <Smartphone size={16} color={C.gold} style={{ marginTop: 2, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 12, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                Sharing from web and apps launching soon
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300, lineHeight: '16px' }}>
                Soon you'll be able to share straight from Instagram, Pinterest, or any website into your moodboard.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Board */}
      <div style={{ padding: '16px 12px' }}>
        {loading ? (
          <p style={{ fontSize: 13, color: C.muted, fontFamily: 'DM Sans, sans-serif', textAlign: 'center', padding: '32px 0' }}>
            Loading…
          </p>
        ) : visiblePins.length === 0 ? (
          <div style={{
            background: C.ivory, border: `1px solid ${C.border}`,
            borderRadius: 14, padding: '40px 24px', textAlign: 'center', margin: '0 8px',
          }}>
            <Heart size={28} color={C.goldBorder} style={{ marginBottom: 10 }} />
            <p style={{ margin: '0 0 6px', fontSize: 16, color: C.dark, fontFamily: 'Playfair Display, serif' }}>
              {pins.length === 0 ? 'Start pinning your vision.' : `Nothing pinned for ${activeEvent} yet.`}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: C.muted, fontWeight: 300, fontFamily: 'DM Sans, sans-serif', lineHeight: '20px' }}>
              {canEditBoard || isBridesmaid
                ? 'Tap + above. Photos, Pinterest links, Instagram — it all lives here.'
                : 'The bride hasn\u2019t pinned anything yet.'}
            </p>
          </div>
        ) : (
          // Masonry-esque grid — 2 columns on narrow, pure image wall
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
          }}>
            {visiblePins.map(pin => (
              <PinThumb
                key={pin.id}
                pin={pin}
                onTap={() => setViewPin(pin)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAdd && (
        <PinEditor
          mode="add"
          isSuggestion={isBridesmaid}
          events={session.events}
          defaultEvent={activeEvent === 'All' ? session.events[0] : activeEvent}
          onFetchPreview={onFetchPreview}
          onClose={() => setShowAdd(false)}
          onSave={async payload => {
            await onAdd(payload);
            setShowAdd(false);
          }}
        />
      )}
      {viewPin && (
        <PinViewer
          pin={viewPin}
          canEdit={canEditBoard}
          onClose={() => setViewPin(null)}
          onToggleCurate={async () => {
            await onUpdate(viewPin.id, { is_curated: !viewPin.is_curated });
            setViewPin({ ...viewPin, is_curated: !viewPin.is_curated });
          }}
          onDelete={async () => {
            await onDelete(viewPin.id);
            setViewPin(null);
          }}
        />
      )}
      {showCurate && (
        <CuratedShareModal
          session={session}
          pins={pins.filter(p => p.event === activeEvent && !p.is_suggestion)}
          event={activeEvent}
          templates={templates}
          onUpdatePin={onUpdate}
          onClose={() => setShowCurate(false)}
        />
      )}
      {showSuggestions && (
        <SuggestionsModal
          suggestions={suggestionsAll}
          onApprove={async id => { await onUpdate(id, { is_suggestion: false }); }}
          onReject={async id => { await onDelete(id); }}
          onClose={() => setShowSuggestions(false)}
        />
      )}
    </div>
  );
}

// Single pin thumbnail — image only, no text clutter
function PinThumb({ pin, onTap }: { pin: MoodboardPin; onTap: () => void }) {
  const hasImage = !!pin.image_url;
  return (
    <button
      onClick={onTap}
      style={{
        position: 'relative', background: hasImage ? C.cream : C.pearl,
        border: `1px solid ${pin.is_curated ? C.goldBorder : C.border}`,
        borderRadius: 12, overflow: 'hidden' as const, cursor: 'pointer',
        padding: 0, width: '100%', aspectRatio: '3 / 4',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {hasImage ? (
        <img
          src={pin.image_url || ''}
          alt=""
          style={{
            width: '100%', height: '100%', objectFit: 'cover' as const,
            display: 'block' as const,
          }}
          loading="lazy"
          onError={e => {
            // Fallback if image 404s — show note/title instead
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div style={{
          display: 'flex', flexDirection: 'column' as const,
          alignItems: 'center', justifyContent: 'center',
          padding: 16, textAlign: 'center' as const,
        }}>
          {pin.pin_type === 'link'
            ? <LinkIcon size={20} color={C.gold} style={{ marginBottom: 8 }} />
            : <Edit3 size={20} color={C.gold} style={{ marginBottom: 8 }} />}
          <p style={{
            margin: 0, fontSize: 11, color: C.dark, fontFamily: 'Playfair Display, serif',
            lineHeight: '16px',
            display: '-webkit-box' as any,
            WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' as any,
            overflow: 'hidden' as const,
          }}>
            {pin.note || pin.title || pin.source_domain || 'Note'}
          </p>
        </div>
      )}

      {/* Curated badge */}
      {pin.is_curated && (
        <div style={{
          position: 'absolute', top: 6, right: 6,
          width: 22, height: 22, borderRadius: 11,
          background: C.gold, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
        }}>
          <Sparkles size={11} color={C.cream} />
        </div>
      )}

      {/* Source domain chip — bottom left if it's a link with image */}
      {hasImage && pin.pin_type === 'link' && pin.source_domain && (
        <div style={{
          position: 'absolute', bottom: 6, left: 6,
          padding: '2px 7px', borderRadius: 10,
          background: 'rgba(44,36,32,0.7)', color: C.cream,
          fontSize: 9, fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
          letterSpacing: '0.3px',
          display: 'flex', alignItems: 'center', gap: 3,
        }}>
          <LinkIcon size={8} color={C.cream} />
          <span>{pin.source_domain.slice(0, 16)}</span>
        </div>
      )}
    </button>
  );
}

// Full-screen pin viewer
function PinViewer({ pin, canEdit: canEditPin, onClose, onToggleCurate, onDelete }: {
  pin: MoodboardPin;
  canEdit: boolean;
  onClose: () => void;
  onToggleCurate: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(44,36,32,0.94)',
        zIndex: 250, display: 'flex', flexDirection: 'column' as const,
      }}
      onClick={onClose}
    >
      {/* Top bar */}
      <div style={{
        padding: 'max(16px, env(safe-area-inset-top)) 16px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: 18,
          background: 'rgba(255,255,255,0.15)', border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <X size={16} color={C.cream} />
        </button>
        {canEditPin && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={e => { e.stopPropagation(); onToggleCurate(); }}
              style={{
                padding: '8px 14px', borderRadius: 18,
                background: pin.is_curated ? C.gold : 'rgba(255,255,255,0.15)',
                border: 'none', cursor: 'pointer',
                fontSize: 12, color: pin.is_curated ? C.dark : C.cream,
                fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <Sparkles size={12} color={pin.is_curated ? C.dark : C.cream} />
              {pin.is_curated ? 'Curated' : 'Curate'}
            </button>
            <button
              onClick={e => {
                e.stopPropagation();
                if (confirm('Remove this pin?')) onDelete();
              }}
              style={{
                width: 36, height: 36, borderRadius: 18,
                background: 'rgba(255,255,255,0.15)', border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Trash2 size={14} color={C.cream} />
            </button>
          </div>
        )}
      </div>

      {/* Image */}
      <div
        onClick={e => e.stopPropagation()}
        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}
      >
        {pin.image_url ? (
          <img
            src={pin.image_url}
            alt=""
            style={{
              maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' as const,
              borderRadius: 8,
            }}
          />
        ) : (
          <div style={{
            maxWidth: 320, padding: 32, background: C.cream,
            borderRadius: 14, textAlign: 'center' as const,
          }}>
            {pin.pin_type === 'link'
              ? <LinkIcon size={28} color={C.gold} style={{ marginBottom: 12 }} />
              : <Edit3 size={28} color={C.gold} style={{ marginBottom: 12 }} />}
            <p style={{
              margin: 0, fontSize: 16, color: C.dark, fontFamily: 'Playfair Display, serif', lineHeight: '24px',
            }}>
              {pin.note || pin.title || pin.source_url || 'Note'}
            </p>
          </div>
        )}
      </div>

      {/* Info footer */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          padding: '16px 20px max(20px, env(safe-area-inset-bottom))',
          background: 'rgba(44,36,32,0.92)',
        }}
      >
        <p style={{
          margin: 0, fontSize: 10, color: C.gold, fontFamily: 'DM Sans, sans-serif',
          fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const,
        }}>
          {pin.event}
        </p>
        {pin.note && (
          <p style={{ margin: '6px 0 0', fontSize: 14, color: C.cream, fontFamily: 'DM Sans, sans-serif', lineHeight: '20px' }}>
            {pin.note}
          </p>
        )}
        {pin.pin_type === 'link' && pin.source_url && (
          <a
            href={pin.source_url}
            target="_blank" rel="noreferrer"
            onClick={e => e.stopPropagation()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              marginTop: 10, padding: '6px 12px', borderRadius: 14,
              background: 'rgba(255,255,255,0.15)',
              textDecoration: 'none', color: C.cream,
              fontSize: 11, fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
            }}
          >
            <ExternalLink size={11} color={C.cream} />
            <span>Open on {pin.source_domain || 'source'}</span>
          </a>
        )}
        {pin.added_by_name && (
          <p style={{ margin: '10px 0 0', fontSize: 10, color: C.cream, opacity: 0.6, fontFamily: 'DM Sans, sans-serif' }}>
            Added by {pin.added_by_name}
          </p>
        )}
      </div>
    </div>
  );
}

// Pin add modal — upload, URL, or note
function PinEditor({ mode, isSuggestion, events, defaultEvent, onFetchPreview, onClose, onSave }: {
  mode: 'add' | 'edit';
  isSuggestion: boolean;
  events: string[];
  defaultEvent: string;
  onFetchPreview: (url: string) => Promise<OGPreview | null>;
  onClose: () => void;
  onSave: (payload: Partial<MoodboardPin>) => Promise<void>;
}) {
  type Step = 'type' | 'upload' | 'link' | 'note';
  const [step, setStep] = useState<Step>('type');

  const [event, setEvent] = useState(defaultEvent);
  const [note, setNote] = useState('');

  // Upload state
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Link state
  const [sourceUrl, setSourceUrl] = useState('');
  const [preview, setPreview] = useState<OGPreview | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const handleUpload = async (file: File) => {
    setUploading(true); setUploadError('');
    const url = await uploadReceipt(file);
    if (url) setImageUrl(url);
    else setUploadError('Could not upload. Try again.');
    setUploading(false);
  };

  const handleFetchPreview = async () => {
    if (!sourceUrl.trim()) return;
    setFetching(true); setFetchError('');
    // Normalise — add https if missing
    let url = sourceUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    const p = await onFetchPreview(url);
    if (p) {
      setPreview(p);
      setSourceUrl(url);
    } else {
      setFetchError('Could not load preview. You can still save the link.');
    }
    setFetching(false);
  };

  const saveUpload = async () => {
    if (!imageUrl) return;
    await onSave({
      event,
      pin_type: 'upload',
      image_url: imageUrl,
      note: note.trim() || null,
      is_suggestion: isSuggestion,
    });
  };

  const saveLink = async () => {
    if (!sourceUrl.trim()) return;
    let url = sourceUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

    // If no preview was fetched yet, try once silently
    let p = preview;
    if (!p) {
      p = await onFetchPreview(url);
    }

    await onSave({
      event,
      pin_type: 'link',
      source_url: url,
      source_domain: p?.source_domain || new URL(url).hostname.replace(/^www\./, ''),
      image_url: p?.og_image || null,
      title: p?.og_title || null,
      note: note.trim() || null,
      is_suggestion: isSuggestion,
    });
  };

  const saveNote = async () => {
    if (!note.trim()) return;
    await onSave({
      event,
      pin_type: 'note',
      note: note.trim(),
      is_suggestion: isSuggestion,
    });
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(44,36,32,0.5)',
        zIndex: 200, display: 'flex', alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.cream, borderRadius: '20px 20px 0 0',
          padding: '20px 20px max(20px, env(safe-area-inset-bottom))',
          width: '100%', maxWidth: 480, margin: '0 auto',
          boxSizing: 'border-box' as const, maxHeight: '92vh',
          overflowY: 'auto' as const,
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 16px' }} />

        {step === 'type' && (
          <>
            <p style={{ margin: '0 0 4px', fontSize: 18, color: C.dark, fontFamily: 'Playfair Display, serif' }}>
              Add to your moodboard
            </p>
            <p style={{ margin: '0 0 20px', fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
              {isSuggestion ? 'Your suggestion will be sent to the bride for approval.' : 'Pick how you want to add.'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
              <TypeChoice icon={<Camera size={18} color={C.gold} />} label="Photo or upload" sub="Take a photo or pick from your gallery" onTap={() => setStep('upload')} />
              <TypeChoice icon={<LinkIcon size={18} color={C.gold} />} label="Paste a link" sub="Instagram, Pinterest, any website" onTap={() => setStep('link')} />
              <TypeChoice icon={<Edit3 size={18} color={C.gold} />} label="Just an idea" sub="Text-only note" onTap={() => setStep('note')} />
            </div>
            <div style={{ marginTop: 20 }}>
              <GhostButton label="Cancel" onTap={onClose} />
            </div>
          </>
        )}

        {step !== 'type' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <button onClick={() => setStep('type')} style={{
                width: 32, height: 32, borderRadius: 16, background: C.ivory,
                border: `1px solid ${C.border}`, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ChevronRight size={14} color={C.dark} style={{ transform: 'rotate(180deg)' }} />
              </button>
              <p style={{ margin: 0, fontSize: 18, color: C.dark, fontFamily: 'Playfair Display, serif' }}>
                {step === 'upload' ? 'Add a photo' : step === 'link' ? 'Paste a link' : 'Your idea'}
              </p>
            </div>

            {/* Event picker — shared across all modes */}
            <label style={{
              display: 'block', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
              fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
            }}>Which event?</label>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 14 }}>
              {events.map(ev => (
                <button key={ev} onClick={() => setEvent(ev)} style={{
                  padding: '6px 12px', borderRadius: 16,
                  background: event === ev ? C.dark : C.ivory,
                  border: `1px solid ${event === ev ? C.dark : C.border}`,
                  color: event === ev ? C.gold : C.muted,
                  fontSize: 12, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
                }}>{ev}</button>
              ))}
            </div>

            {/* Upload mode */}
            {step === 'upload' && (
              <>
                <input
                  ref={fileInputRef}
                  type="file" accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file);
                  }}
                />
                {imageUrl ? (
                  <div style={{
                    position: 'relative', width: '100%', aspectRatio: '3 / 4',
                    background: C.pearl, borderRadius: 12, overflow: 'hidden' as const,
                    marginBottom: 14,
                  }}>
                    <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' as const }} />
                    <button onClick={() => setImageUrl('')} style={{
                      position: 'absolute', top: 8, right: 8,
                      width: 28, height: 28, borderRadius: 14,
                      background: 'rgba(44,36,32,0.7)', border: 'none',
                      cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <X size={12} color={C.cream} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={{
                      width: '100%', aspectRatio: '3 / 4',
                      background: C.ivory, border: `2px dashed ${C.goldBorder}`,
                      borderRadius: 12, cursor: 'pointer',
                      display: 'flex', flexDirection: 'column' as const,
                      alignItems: 'center', justifyContent: 'center', gap: 8,
                      marginBottom: 14,
                    }}
                  >
                    <Camera size={28} color={C.gold} />
                    <span style={{ fontSize: 13, color: C.goldDeep, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                      {uploading ? 'Uploading…' : 'Tap to add photo'}
                    </span>
                  </button>
                )}
                {uploadError && <ErrorBanner msg={uploadError} />}

                <label style={{
                  display: 'block', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
                }}>Note</label>
                <textarea
                  value={note} onChange={e => setNote(e.target.value)}
                  placeholder="What do you love about this?"
                  rows={2}
                  style={{
                    width: '100%', boxSizing: 'border-box' as const,
                    padding: '10px 14px', borderRadius: 10,
                    border: `1px solid ${C.border}`, background: C.ivory,
                    fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: C.dark,
                    outline: 'none', marginBottom: 18, resize: 'vertical' as const,
                  }}
                />
                <button
                  onClick={saveUpload} disabled={!imageUrl}
                  style={{
                    width: '100%', padding: '14px', borderRadius: 12,
                    background: C.dark, border: 'none',
                    cursor: imageUrl ? 'pointer' : 'default',
                    color: C.gold, fontFamily: 'DM Sans, sans-serif',
                    fontSize: 13, fontWeight: 400, letterSpacing: '1.5px',
                    textTransform: 'uppercase' as const,
                    opacity: imageUrl ? 1 : 0.4,
                  }}
                >Add to moodboard</button>
              </>
            )}

            {/* Link mode */}
            {step === 'link' && (
              <>
                <label style={{
                  display: 'block', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
                }}>URL</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  <input
                    type="url" value={sourceUrl}
                    onChange={e => { setSourceUrl(e.target.value); setPreview(null); setFetchError(''); }}
                    placeholder="instagram.com/p/..."
                    style={{
                      flex: 1, boxSizing: 'border-box' as const,
                      padding: '12px 14px', borderRadius: 10,
                      border: `1px solid ${C.border}`, background: C.ivory,
                      fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: C.dark, outline: 'none',
                    }}
                  />
                  <button
                    onClick={handleFetchPreview} disabled={!sourceUrl.trim() || fetching}
                    style={{
                      padding: '12px 16px', borderRadius: 10,
                      background: C.ivory, border: `1px solid ${C.goldBorder}`,
                      color: C.goldDeep, fontFamily: 'DM Sans, sans-serif',
                      fontSize: 12, fontWeight: 500, cursor: sourceUrl.trim() && !fetching ? 'pointer' : 'default',
                      whiteSpace: 'nowrap' as const,
                      opacity: sourceUrl.trim() && !fetching ? 1 : 0.4,
                    }}
                  >{fetching ? '…' : 'Preview'}</button>
                </div>

                {preview && (
                  <div style={{
                    background: C.ivory, border: `1px solid ${C.border}`,
                    borderRadius: 12, overflow: 'hidden' as const, marginBottom: 14,
                  }}>
                    {preview.og_image ? (
                      <div style={{ width: '100%', aspectRatio: '16 / 10', background: C.pearl }}>
                        <img src={preview.og_image} alt="" style={{
                          width: '100%', height: '100%', objectFit: 'cover' as const, display: 'block' as const,
                        }} />
                      </div>
                    ) : (
                      <div style={{
                        padding: 20, background: C.pearl, textAlign: 'center' as const,
                      }}>
                        <LinkIcon size={20} color={C.muted} />
                        <p style={{ margin: '6px 0 0', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
                          No preview image — will save as link
                        </p>
                      </div>
                    )}
                    <div style={{ padding: 10 }}>
                      <p style={{ margin: 0, fontSize: 10, color: C.goldDeep, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                        {preview.source_domain}
                      </p>
                      {preview.og_title && (
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: C.dark, fontFamily: 'DM Sans, sans-serif', lineHeight: '16px' }}>
                          {preview.og_title}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {fetchError && (
                  <p style={{ margin: '0 0 12px', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif' }}>
                    {fetchError}
                  </p>
                )}

                <label style={{
                  display: 'block', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
                }}>Note</label>
                <textarea
                  value={note} onChange={e => setNote(e.target.value)}
                  placeholder="Your thoughts on this?"
                  rows={2}
                  style={{
                    width: '100%', boxSizing: 'border-box' as const,
                    padding: '10px 14px', borderRadius: 10,
                    border: `1px solid ${C.border}`, background: C.ivory,
                    fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: C.dark,
                    outline: 'none', marginBottom: 18, resize: 'vertical' as const,
                  }}
                />
                <button
                  onClick={saveLink} disabled={!sourceUrl.trim()}
                  style={{
                    width: '100%', padding: '14px', borderRadius: 12,
                    background: C.dark, border: 'none',
                    cursor: sourceUrl.trim() ? 'pointer' : 'default',
                    color: C.gold, fontFamily: 'DM Sans, sans-serif',
                    fontSize: 13, fontWeight: 400, letterSpacing: '1.5px',
                    textTransform: 'uppercase' as const,
                    opacity: sourceUrl.trim() ? 1 : 0.4,
                  }}
                >Add to moodboard</button>
              </>
            )}

            {/* Note mode */}
            {step === 'note' && (
              <>
                <label style={{
                  display: 'block', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
                }}>Your idea</label>
                <textarea
                  value={note} onChange={e => setNote(e.target.value)}
                  placeholder="e.g. Marigold strings over the mandap…"
                  rows={5}
                  autoFocus
                  style={{
                    width: '100%', boxSizing: 'border-box' as const,
                    padding: '12px 14px', borderRadius: 10,
                    border: `1px solid ${C.border}`, background: C.ivory,
                    fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: C.dark,
                    outline: 'none', marginBottom: 18, resize: 'vertical' as const, lineHeight: '20px',
                  }}
                />
                <button
                  onClick={saveNote} disabled={!note.trim()}
                  style={{
                    width: '100%', padding: '14px', borderRadius: 12,
                    background: C.dark, border: 'none',
                    cursor: note.trim() ? 'pointer' : 'default',
                    color: C.gold, fontFamily: 'DM Sans, sans-serif',
                    fontSize: 13, fontWeight: 400, letterSpacing: '1.5px',
                    textTransform: 'uppercase' as const,
                    opacity: note.trim() ? 1 : 0.4,
                  }}
                >Add to moodboard</button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TypeChoice({ icon, label, sub, onTap }: { icon: React.ReactNode; label: string; sub: string; onTap: () => void }) {
  return (
    <button onClick={onTap} style={{
      display: 'flex', alignItems: 'center', gap: 14,
      background: C.ivory, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
      textAlign: 'left' as const, width: '100%',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 14, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>{label}</p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>{sub}</p>
      </div>
      <ChevronRight size={14} color={C.mutedLight} />
    </button>
  );
}

// Curated share modal — pick pins, get shareable text summary
function CuratedShareModal({ session, pins, event, templates, onUpdatePin, onClose }: {
  session: CoupleSession;
  pins: MoodboardPin[];
  event: string;
  templates: WATemplate[];
  onUpdatePin: (id: string, patch: Partial<MoodboardPin>) => Promise<void>;
  onClose: () => void;
}) {
  const MAX_CURATED = 6;
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(pins.filter(p => p.is_curated).map(p => p.id))
  );

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_CURATED) next.add(id);
      return next;
    });
  };

  const coupleVars = buildCoupleVars(session);
  const vars = {
    ...coupleVars,
    event,
    pin_count: String(selected.size),
  };

  const persistCurated = async () => {
    for (const p of pins) {
      const shouldBe = selected.has(p.id);
      if (p.is_curated !== shouldBe) {
        await onUpdatePin(p.id, { is_curated: shouldBe });
      }
    }
  };
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(44,36,32,0.5)',
        zIndex: 200, display: 'flex', alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.cream, borderRadius: '20px 20px 0 0',
          padding: '20px 20px max(20px, env(safe-area-inset-bottom))',
          width: '100%', maxWidth: 480, margin: '0 auto',
          boxSizing: 'border-box' as const, maxHeight: '92vh',
          overflowY: 'auto' as const,
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 16px' }} />

        <p style={{ margin: '0 0 4px', fontSize: 18, color: C.dark, fontFamily: 'Playfair Display, serif' }}>
          Curate a view
        </p>
        <p style={{ margin: '0 0 18px', fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300, lineHeight: '18px' }}>
          Pick up to {MAX_CURATED} pins that capture your vision for {event}. Family sees a clean, focused view — no opinion fatigue.
        </p>

        <p style={{
          fontSize: 11, color: C.goldDeep, fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
          marginBottom: 10,
        }}>
          {selected.size} of {MAX_CURATED} selected
        </p>

        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
          marginBottom: 18,
        }}>
          {pins.map(p => {
            const isSelected = selected.has(p.id);
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                style={{
                  position: 'relative', padding: 0,
                  background: C.ivory,
                  border: `2px solid ${isSelected ? C.gold : C.border}`,
                  borderRadius: 12, overflow: 'hidden' as const,
                  cursor: 'pointer', width: '100%', aspectRatio: '3 / 4',
                  opacity: !isSelected && selected.size >= MAX_CURATED ? 0.4 : 1,
                }}
              >
                {p.image_url ? (
                  <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' as const }} />
                ) : (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '100%', height: '100%', padding: 10, background: C.pearl,
                  }}>
                    <p style={{
                      margin: 0, fontSize: 10, color: C.dark, fontFamily: 'Playfair Display, serif',
                      textAlign: 'center' as const, lineHeight: '14px',
                      display: '-webkit-box' as any,
                      WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' as any,
                      overflow: 'hidden' as const,
                    }}>
                      {p.note || p.title || ''}
                    </p>
                  </div>
                )}
                {isSelected && (
                  <div style={{
                    position: 'absolute', top: 6, right: 6,
                    width: 24, height: 24, borderRadius: 12, background: C.gold,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Check size={14} color={C.cream} />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <GhostButton label="Cancel" onTap={onClose} />
          </div>
          <div style={{ opacity: selected.size > 0 ? 1 : 0.4, pointerEvents: selected.size > 0 ? 'auto' : 'none' }}>
            <WhatsAppButton
              context="moodboard"
              templates={templates}
              vars={vars}
              label="Share"
              style={{
                padding: '12px 24px', borderRadius: 12,
                background: C.dark, border: 'none',
              }}
              onBeforeSend={async () => {
                await persistCurated();
                onClose();
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Suggestions inbox modal (owner/core_duo view)
function SuggestionsModal({ suggestions, onApprove, onReject, onClose }: {
  suggestions: MoodboardPin[];
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(44,36,32,0.5)',
        zIndex: 200, display: 'flex', alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.cream, borderRadius: '20px 20px 0 0',
          padding: '20px 20px max(20px, env(safe-area-inset-bottom))',
          width: '100%', maxWidth: 480, margin: '0 auto',
          boxSizing: 'border-box' as const, maxHeight: '92vh',
          overflowY: 'auto' as const,
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 16px' }} />

        <p style={{ margin: '0 0 4px', fontSize: 18, color: C.dark, fontFamily: 'Playfair Display, serif' }}>
          Suggestions from your Circle
        </p>
        <p style={{ margin: '0 0 18px', fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
          Approve what you love. Dismiss what doesn't fit. Your vision stays yours.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
          {suggestions.map(s => (
            <div key={s.id} style={{
              display: 'flex', gap: 12,
              background: C.ivory, border: `1px solid ${C.border}`,
              borderRadius: 12, padding: 10,
            }}>
              <div style={{
                width: 80, height: 80, flexShrink: 0, borderRadius: 8,
                background: C.pearl, overflow: 'hidden' as const,
              }}>
                {s.image_url ? (
                  <img src={s.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' as const }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {s.pin_type === 'link'
                      ? <LinkIcon size={14} color={C.gold} />
                      : <Edit3 size={14} color={C.gold} />}
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' as const }}>
                <p style={{
                  margin: 0, fontSize: 10, color: C.goldDeep, fontWeight: 500,
                  letterSpacing: '1px', textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
                }}>{s.event}</p>
                <p style={{
                  margin: '2px 0 0', fontSize: 12, color: C.dark, fontFamily: 'DM Sans, sans-serif',
                  lineHeight: '16px',
                  display: '-webkit-box' as any,
                  WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any,
                  overflow: 'hidden' as const,
                }}>
                  {s.note || s.title || s.source_domain || 'Suggestion'}
                </p>
                <p style={{
                  margin: 'auto 0 0', fontSize: 10, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300,
                }}>
                  From {s.added_by_name || 'your Circle'}
                </p>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <button onClick={() => onApprove(s.id)} style={{
                    flex: 1, padding: '6px 10px', borderRadius: 8,
                    background: C.dark, border: 'none', cursor: 'pointer',
                    color: C.gold, fontFamily: 'DM Sans, sans-serif',
                    fontSize: 11, fontWeight: 500, letterSpacing: '0.5px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}>
                    <Check size={11} color={C.gold} />
                    Approve
                  </button>
                  <button onClick={() => onReject(s.id)} style={{
                    flex: 1, padding: '6px 10px', borderRadius: 8,
                    background: C.ivory, border: `1px solid ${C.border}`, cursor: 'pointer',
                    color: C.muted, fontFamily: 'DM Sans, sans-serif',
                    fontSize: 11, fontWeight: 400,
                  }}>
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 18 }}>
          <GhostButton label="Close" onTap={onClose} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MY VENDORS TOOL
// Status pipeline at top, list below, detail sheet on tap.
// Payments are EXPENSES — vendor page queries them, never stores.
// ─────────────────────────────────────────────────────────────

function VendorTool({
  session, vendors, expenses, loading, templates,
  onAdd, onUpdate, onDelete,
  onAddExpense, onUpdateExpense, onDeleteExpense,
  onBack,
}: {
  session: CoupleSession;
  vendors: Vendor[];
  expenses: Expense[];
  loading: boolean;
  templates: WATemplate[];
  onAdd: (payload: Partial<Vendor>) => Promise<Vendor | null>;
  onUpdate: (id: string, patch: Partial<Vendor>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddExpense: (payload: Partial<Expense>) => Promise<Expense | null>;
  onUpdateExpense: (id: string, patch: Partial<Expense>) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
  onBack: () => void;
}) {
  const [statusFilter, setStatusFilter] = useState<VendorStatus | 'all'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [viewingVendor, setViewingVendor] = useState<Vendor | null>(null);

  const canEditTool = canEdit(session.coShareRole, 'vendors');
  const canSeeMoney = canView(session.coShareRole, 'vendor_money');

  const statusCounts = vendorStatusCounts(vendors);
  const conflicts = findConflicts(vendors);

  const filtered = vendors.filter(v => statusFilter === 'all' || v.status === statusFilter);

  // Total quoted across all booked+confirmed vendors
  const totalQuoted = vendors
    .filter(v => v.status === 'booked' || v.status === 'confirmed' || v.status === 'completed')
    .reduce((sum, v) => sum + (v.quoted_total || 0), 0);

  return (
    <div style={{ padding: '0 0 120px' }}>

      {/* Sticky header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '72px 20px 16px', background: C.cream,
        position: 'sticky' as const, top: 0, zIndex: 30,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{
            width: 36, height: 36, borderRadius: 18, background: C.ivory,
            border: `1px solid ${C.border}`, display: 'flex',
            alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <ChevronRight size={16} color={C.dark} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <div>
            <p style={{ margin: 0, fontSize: 18, color: C.dark, fontFamily: 'Playfair Display, serif' }}>
              My Vendors
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
              {vendors.length === 0
                ? 'Track your vendor journey, from enquiry to done'
                : canSeeMoney && totalQuoted > 0
                  ? `${vendors.length} vendor${vendors.length !== 1 ? 's' : ''} · ${fmtINR(totalQuoted)} committed`
                  : `${vendors.length} vendor${vendors.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        {canEditTool && (
          <button onClick={() => setShowAdd(true)} style={{
            width: 36, height: 36, borderRadius: 18, background: C.dark,
            border: 'none', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Plus size={16} color={C.gold} />
          </button>
        )}
      </div>

      {/* Status pipeline */}
      {vendors.length > 0 && (
        <div style={{
          display: 'flex', gap: 8, padding: '14px 20px',
          overflowX: 'auto' as const, WebkitOverflowScrolling: 'touch' as any,
        }}>
          {VENDOR_STATUSES.map(s => {
            const count = statusCounts[s.id];
            const active = statusFilter === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setStatusFilter(active ? 'all' : s.id)}
                style={{
                  flexShrink: 0,
                  background: active ? s.bg : C.ivory,
                  border: `1px solid ${active ? s.border : C.border}`,
                  borderRadius: 12, padding: '10px 14px', minWidth: 96,
                  cursor: 'pointer', textAlign: 'left' as const,
                }}
              >
                <p style={{
                  margin: 0, fontSize: 9, color: active ? s.color : C.muted,
                  fontWeight: 500, letterSpacing: '1px',
                  textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
                }}>{s.label}</p>
                <p style={{
                  margin: '4px 0 0', fontSize: 20,
                  color: active ? s.color : C.dark,
                  fontFamily: 'Playfair Display, serif', fontWeight: 600, lineHeight: '22px',
                }}>{count}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Conflict alert */}
      {Object.keys(conflicts).length > 0 && (
        <div style={{ padding: '0 20px 12px' }}>
          <div style={{
            background: '#FEEAEA', border: '1px solid #F0B8B8',
            borderRadius: 10, padding: '10px 14px',
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <AlertCircle size={16} color="#A33636" style={{ marginTop: 1, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 12, color: '#A33636', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                Double-booking detected
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#A33636', fontFamily: 'DM Sans, sans-serif', fontWeight: 300, lineHeight: '16px' }}>
                {Object.entries(conflicts).map(([slot, vs]) =>
                  `${vs.map(v => v.name).join(' and ')} both booked for ${slot}`
                ).join(' · ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div style={{ padding: '16px 20px' }}>
        {loading ? (
          <p style={{ fontSize: 13, color: C.muted, fontFamily: 'DM Sans, sans-serif', textAlign: 'center', padding: '32px 0' }}>
            Loading…
          </p>
        ) : vendors.length === 0 ? (
          <div style={{
            background: C.ivory, border: `1px solid ${C.border}`,
            borderRadius: 14, padding: '32px 20px', textAlign: 'center',
          }}>
            <Briefcase size={28} color={C.goldBorder} style={{ marginBottom: 10 }} />
            <p style={{ margin: '0 0 6px', fontSize: 16, color: C.dark, fontFamily: 'Playfair Display, serif' }}>
              No vendors tracked yet.
            </p>
            <p style={{ margin: 0, fontSize: 13, color: C.muted, fontWeight: 300, fontFamily: 'DM Sans, sans-serif', lineHeight: '20px' }}>
              {canEditTool
                ? 'Add your caterer, photographer, decorator — we\u2019ll track the rest.'
                : 'Nothing tracked yet.'}
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            background: C.pearl, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: '20px', textAlign: 'center',
          }}>
            <p style={{ margin: 0, fontSize: 13, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
              No vendors in this stage.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
            {filtered.map(v => (
              <VendorRow
                key={v.id}
                vendor={v}
                expenses={expenses}
                canSeeMoney={canSeeMoney}
                onTap={() => setViewingVendor(v)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add modal */}
      {showAdd && (
        <VendorEditor
          mode="add"
          session={session}
          events={session.events}
          onClose={() => setShowAdd(false)}
          onSave={async payload => {
            await onAdd(payload);
            setShowAdd(false);
          }}
        />
      )}

      {/* Detail sheet */}
      {viewingVendor && (
        <VendorDetailSheet
          session={session}
          vendor={viewingVendor}
          expenses={expensesForVendor(expenses, viewingVendor.name)}
          canEdit={canEditTool}
          canSeeMoney={canSeeMoney}
          templates={templates}
          onClose={() => setViewingVendor(null)}
          onUpdate={async (patch) => {
            await onUpdate(viewingVendor.id, patch);
            setViewingVendor({ ...viewingVendor, ...patch } as Vendor);
          }}
          onDelete={async () => {
            await onDelete(viewingVendor.id);
            setViewingVendor(null);
          }}
          onAddExpense={async (payload) => {
            // Auto-fill vendor_name so it links
            await onAddExpense({ ...payload, vendor_name: viewingVendor.name });
          }}
          onUpdateExpense={onUpdateExpense}
          onDeleteExpense={onDeleteExpense}
        />
      )}
    </div>
  );
}

// Single vendor row
function VendorRow({ vendor, expenses, canSeeMoney, onTap }: {
  vendor: Vendor; expenses: Expense[]; canSeeMoney: boolean; onTap: () => void;
}) {
  const style = statusStyle(vendor.status);
  const paid = canSeeMoney ? vendorPaidTotal(expenses, vendor.name) : 0;
  const balanceDue = canSeeMoney ? vendorBalanceDue(vendor, expenses) : 0;

  return (
    <button
      onClick={onTap}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        background: C.ivory, border: `1px solid ${C.border}`,
        borderRadius: 12, padding: '12px 14px',
        cursor: 'pointer', textAlign: 'left' as const, width: '100%',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <span style={{
            fontSize: 14, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
            overflow: 'hidden' as const, textOverflow: 'ellipsis' as const, whiteSpace: 'nowrap' as const,
          }}>
            {vendor.name}
          </span>
          <span style={{
            fontSize: 9, color: style.color, background: style.bg,
            border: `1px solid ${style.border}`, borderRadius: 8,
            padding: '2px 7px', fontFamily: 'DM Sans, sans-serif',
            fontWeight: 500, letterSpacing: '0.5px', flexShrink: 0,
            textTransform: 'uppercase' as const,
          }}>
            {style.label}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' as const, alignItems: 'center' }}>
          {vendor.category && (
            <span style={{ fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
              {vendor.category}
            </span>
          )}
          {vendor.events.length > 0 && (
            <>
              {vendor.category && <span style={{ fontSize: 10, color: C.mutedLight }}>·</span>}
              <span style={{ fontSize: 11, color: C.goldDeep, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, letterSpacing: '0.3px' }}>
                {vendor.events.join(', ')}
              </span>
            </>
          )}
        </div>

        {/* Money line */}
        {canSeeMoney && vendor.quoted_total > 0 && (
          <div style={{ display: 'flex', gap: 10, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' as const }}>
            <span style={{ fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
              Quoted <strong style={{ color: C.dark, fontWeight: 500 }}>{fmtINR(vendor.quoted_total)}</strong>
            </span>
            <span style={{ fontSize: 11, color: '#2D6A2D', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
              Paid {fmtINR(paid)}
            </span>
            {balanceDue > 0 && (
              <span style={{ fontSize: 11, color: '#A33636', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                Due {fmtINR(balanceDue)}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

// Vendor add/edit modal
function VendorEditor({ mode, session, events, vendor, onClose, onSave, onDelete }: {
  mode: 'add' | 'edit';
  session: CoupleSession;
  events: string[];
  vendor?: Vendor;
  onClose: () => void;
  onSave: (payload: Partial<Vendor>) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [name, setName] = useState(vendor?.name || '');
  const [category, setCategory] = useState(vendor?.category || EXPENSE_CATEGORIES[0]);
  const [phone, setPhone] = useState(vendor?.phone || '');
  const [email, setEmail] = useState(vendor?.email || '');
  const [website, setWebsite] = useState(vendor?.website || '');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(vendor?.events || []);
  const [status, setStatus] = useState<VendorStatus>(vendor?.status || 'enquired');
  const [quotedTotal, setQuotedTotal] = useState(vendor?.quoted_total ? String(vendor.quoted_total) : '');
  const [balanceDueDate, setBalanceDueDate] = useState(vendor?.balance_due_date || '');
  const [bookedSlot, setBookedSlot] = useState(vendor?.booked_slot || '');
  const [contractUrl, setContractUrl] = useState(vendor?.contract_url || '');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [notes, setNotes] = useState(vendor?.notes || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSeeMoney = canView(session.coShareRole, 'vendor_money');

  const toggleEvent = (ev: string) => {
    setSelectedEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]);
  };

  const handleContractUpload = async (file: File) => {
    setUploading(true); setUploadError('');
    const url = await uploadReceipt(file);
    if (url) setContractUrl(url);
    else setUploadError('Could not upload. Try again.');
    setUploading(false);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    const payload: Partial<Vendor> = {
      name: name.trim(),
      category: category || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      website: website.trim() || null,
      events: selectedEvents,
      status,
      quoted_total: parseFloat(quotedTotal) || 0,
      balance_due_date: balanceDueDate || null,
      booked_slot: bookedSlot.trim() || null,
      notes: notes.trim() || null,
    };
    if (contractUrl !== (vendor?.contract_url || '')) {
      payload.contract_url = contractUrl || null;
      if (contractUrl && !vendor?.contract_url) {
        payload.contract_uploaded_by = session.id;
        payload.contract_uploaded_by_name = session.name;
      } else if (!contractUrl) {
        payload.contract_uploaded_by = null;
        payload.contract_uploaded_by_name = null;
      }
    }
    await onSave(payload);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(44,36,32,0.5)',
        zIndex: 200, display: 'flex', alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.cream, borderRadius: '20px 20px 0 0',
          padding: '20px 20px max(20px, env(safe-area-inset-bottom))',
          width: '100%', maxWidth: 480, margin: '0 auto',
          boxSizing: 'border-box' as const, maxHeight: '92vh',
          overflowY: 'auto' as const,
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 16px' }} />

        <p style={{ margin: '0 0 16px', fontSize: 18, color: C.dark, fontFamily: 'Playfair Display, serif' }}>
          {mode === 'add' ? 'Add a vendor' : 'Edit vendor'}
        </p>

        <InputField label="Vendor name" value={name} onChange={setName} placeholder="e.g. Madhu Caterers" required />

        {/* Category */}
        <label style={{
          display: 'block', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
          fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
        }}>Category</label>
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 14 }}>
          {EXPENSE_CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)} style={{
              padding: '5px 11px', borderRadius: 14,
              background: category === cat ? C.goldSoft : C.ivory,
              border: `1px solid ${category === cat ? C.goldBorder : C.border}`,
              color: category === cat ? C.goldDeep : C.muted,
              fontSize: 11, fontWeight: category === cat ? 500 : 400,
              fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
            }}>{cat}</button>
          ))}
        </div>

        <InputField label="Phone" value={phone} onChange={setPhone} type="tel" placeholder="+91 98765 43210" />
        <InputField label="Email" value={email} onChange={setEmail} placeholder="hello@madhucaterers.com" />
        <InputField label="Website or Instagram" value={website} onChange={setWebsite} placeholder="@madhucaterers" />

        {/* Events served */}
        <label style={{
          display: 'block', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
          fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
        }}>Events they serve</label>
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 14 }}>
          {events.map(ev => {
            const on = selectedEvents.includes(ev);
            return (
              <button key={ev} onClick={() => toggleEvent(ev)} style={{
                padding: '6px 12px', borderRadius: 16,
                background: on ? C.dark : C.ivory,
                border: `1px solid ${on ? C.dark : C.border}`,
                color: on ? C.gold : C.muted,
                fontSize: 12, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
              }}>{ev}</button>
            );
          })}
        </div>

        {/* Status */}
        <label style={{
          display: 'block', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
          fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
        }}>Stage</label>
        <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexWrap: 'wrap' as const }}>
          {VENDOR_STATUSES.map(s => (
            <button key={s.id} onClick={() => setStatus(s.id)} style={{
              flex: 1, minWidth: 80, padding: '8px 6px', borderRadius: 10,
              background: status === s.id ? s.bg : C.ivory,
              border: `1px solid ${status === s.id ? s.border : C.border}`,
              color: status === s.id ? s.color : C.muted,
              fontSize: 11, fontFamily: 'DM Sans, sans-serif',
              fontWeight: status === s.id ? 500 : 400, cursor: 'pointer',
            }}>{s.label}</button>
          ))}
        </div>

        {/* Money — only for Owner/Core Duo */}
        {canSeeMoney && (
          <>
            <label style={{
              display: 'block', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
              fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
            }}>Quoted total</label>
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <span style={{
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                fontSize: 16, color: C.muted, fontFamily: 'DM Sans, sans-serif',
              }}>₹</span>
              <input
                type="number" inputMode="decimal" value={quotedTotal}
                onChange={e => setQuotedTotal(e.target.value)}
                placeholder="0"
                style={{
                  width: '100%', boxSizing: 'border-box' as const,
                  padding: '12px 16px 12px 32px', borderRadius: 10,
                  border: `1px solid ${C.border}`, background: C.ivory,
                  fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: C.dark, outline: 'none',
                }}
              />
            </div>

            <label style={{
              display: 'block', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
              fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
            }}>Next payment due</label>
            <input
              type="date" value={balanceDueDate}
              onChange={e => setBalanceDueDate(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box' as const,
                padding: '12px 16px', borderRadius: 10,
                border: `1px solid ${C.border}`, background: C.ivory,
                fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: C.dark,
                outline: 'none', marginBottom: 14,
              }}
            />
          </>
        )}

        {/* Booked slot — for conflict detection */}
        <InputField
          label="Booked time slot"
          value={bookedSlot}
          onChange={setBookedSlot}
          placeholder="e.g. 2026-11-15 7pm"
        />

        {/* Contract upload */}
        {canSeeMoney && (
          <>
            <label style={{
              display: 'block', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
              fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
            }}>Contract / quote</label>
            <input
              ref={fileInputRef}
              type="file" accept="image/*,application/pdf"
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleContractUpload(file);
              }}
            />
            {contractUrl ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
                borderRadius: 10, padding: 10, marginBottom: 14,
              }}>
                <Paperclip size={14} color={C.gold} />
                <a
                  href={contractUrl} target="_blank" rel="noreferrer"
                  style={{
                    flex: 1, fontSize: 12, color: C.goldDeep, fontFamily: 'DM Sans, sans-serif',
                    fontWeight: 500, textDecoration: 'none',
                  }}
                >View contract</a>
                <button onClick={() => setContractUrl('')} style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 6,
                }}>
                  <X size={14} color={C.muted} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{
                  width: '100%', background: C.ivory, border: `1px dashed ${C.goldBorder}`,
                  borderRadius: 10, padding: '12px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  marginBottom: 14,
                }}
              >
                <Upload size={14} color={C.gold} />
                <span style={{ fontSize: 12, color: C.goldDeep, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                  {uploading ? 'Uploading…' : 'Upload contract / quote PDF or photo'}
                </span>
              </button>
            )}
            {uploadError && <ErrorBanner msg={uploadError} />}
          </>
        )}

        {/* Notes */}
        <label style={{
          display: 'block', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
          fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
        }}>Notes</label>
        <textarea
          value={notes} onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="Anything you want to remember"
          style={{
            width: '100%', boxSizing: 'border-box' as const,
            padding: '10px 14px', borderRadius: 10,
            border: `1px solid ${C.border}`, background: C.ivory,
            fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: C.dark,
            outline: 'none', marginBottom: 18, resize: 'vertical' as const,
          }}
        />

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {mode === 'edit' && onDelete && (
            <button onClick={() => onDelete()} style={{
              width: 44, height: 44, borderRadius: 12,
              background: '#FEF2F2', border: '1px solid #FECACA',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}>
              <Trash2 size={16} color="#B91C1C" />
            </button>
          )}
          <div style={{ flex: 1 }}>
            <GhostButton label="Cancel" onTap={onClose} />
          </div>
          <button onClick={handleSave} disabled={!name.trim()} style={{
            padding: '12px 24px', borderRadius: 12,
            background: C.dark, border: 'none',
            cursor: name.trim() ? 'pointer' : 'default',
            color: C.gold, fontFamily: 'DM Sans, sans-serif',
            fontSize: 13, fontWeight: 400, letterSpacing: '1.5px',
            textTransform: 'uppercase' as const,
            opacity: name.trim() ? 1 : 0.4,
          }}>
            {mode === 'add' ? 'Add' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Vendor detail sheet — shows vendor + their linked expenses + quick payment log
function VendorDetailSheet({
  session, vendor, expenses, canEdit: canEditVendor, canSeeMoney, templates,
  onClose, onUpdate, onDelete,
  onAddExpense, onUpdateExpense, onDeleteExpense,
}: {
  session: CoupleSession;
  vendor: Vendor;
  expenses: Expense[];
  canEdit: boolean;
  canSeeMoney: boolean;
  templates: WATemplate[];
  onClose: () => void;
  onUpdate: (patch: Partial<Vendor>) => Promise<void>;
  onDelete: () => Promise<void>;
  onAddExpense: (payload: Partial<Expense>) => Promise<void>;
  onUpdateExpense: (id: string, patch: Partial<Expense>) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
}) {
  const [showEdit, setShowEdit] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const style = statusStyle(vendor.status);
  const paid = vendorPaidTotal(expenses, vendor.name);
  const balanceDue = vendorBalanceDue(vendor, expenses);
  const hasPhone = !!(vendor.phone && vendor.phone.replace(/\D/g, '').length >= 10);

  // Build template vars for this vendor
  const coupleVars = buildCoupleVars(session);
  const vars = {
    ...coupleVars,
    vendor_name: vendor.name,
    event: vendor.events.join(', ') || 'our wedding',
    balance_due: balanceDue > 0 ? fmtINRFull(balanceDue) : '',
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(44,36,32,0.5)',
        zIndex: 200, display: 'flex', alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.cream, borderRadius: '20px 20px 0 0',
          padding: '20px 20px max(20px, env(safe-area-inset-bottom))',
          width: '100%', maxWidth: 480, margin: '0 auto',
          boxSizing: 'border-box' as const, maxHeight: '92vh',
          overflowY: 'auto' as const,
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 16px' }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 20, color: C.dark, fontFamily: 'Playfair Display, serif' }}>
              {vendor.name}
            </p>
            <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' as const }}>
              {vendor.category && (
                <span style={{ fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
                  {vendor.category}
                </span>
              )}
              <span style={{
                fontSize: 9, color: style.color, background: style.bg,
                border: `1px solid ${style.border}`, borderRadius: 8,
                padding: '2px 7px', fontFamily: 'DM Sans, sans-serif',
                fontWeight: 500, letterSpacing: '0.5px',
                textTransform: 'uppercase' as const,
              }}>
                {style.label}
              </span>
            </div>
          </div>
          {canEditVendor && (
            <button onClick={() => setShowEdit(true)} style={{
              width: 36, height: 36, borderRadius: 18, background: C.ivory,
              border: `1px solid ${C.border}`, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Edit3 size={14} color={C.dark} />
            </button>
          )}
        </div>

        {/* Quick actions */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' as const }}>
          {hasPhone && (
            <div style={{ flex: 1, minWidth: 120 }}>
              <WhatsAppButton
                context="vendor"
                templates={templates}
                phone={vendor.phone}
                vars={vars}
                label="WhatsApp"
                style={{ width: '100%' }}
              />
            </div>
          )}
          {vendor.website && (
            <a
              href={vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website.replace(/^@/, 'instagram.com/')}`}
              target="_blank" rel="noreferrer"
              style={{
                flex: 1, minWidth: 120, padding: '10px 12px', borderRadius: 10,
                background: C.ivory, border: `1px solid ${C.border}`,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                textDecoration: 'none',
              }}
            >
              <ExternalLink size={13} color={C.muted} />
              <span style={{ fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>Web</span>
            </a>
          )}
        </div>

        {/* Money summary — Owner/Core Duo only */}
        {canSeeMoney && vendor.quoted_total > 0 && (
          <div style={{
            background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
            borderRadius: 12, padding: '14px 16px', marginBottom: 18,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 11, color: C.goldDeep, fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif' }}>
                Quoted
              </span>
              <span style={{ fontSize: 18, color: C.dark, fontFamily: 'Playfair Display, serif', fontWeight: 600 }}>
                {fmtINRFull(vendor.quoted_total)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ fontSize: 12, color: '#2D6A2D', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                Paid {fmtINRFull(paid)}
              </span>
              {balanceDue > 0 && (
                <span style={{ fontSize: 12, color: '#A33636', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                  Due {fmtINRFull(balanceDue)}
                </span>
              )}
            </div>
            {vendor.balance_due_date && balanceDue > 0 && (
              <p style={{ margin: '6px 0 0', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
                Next payment by {formatDueDate(vendor.balance_due_date)}
              </p>
            )}
          </div>
        )}

        {/* Contract link */}
        {canSeeMoney && vendor.contract_url && (
          <a
            href={vendor.contract_url} target="_blank" rel="noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: C.ivory, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: '12px 14px', marginBottom: 18,
              textDecoration: 'none',
            }}
          >
            <Paperclip size={14} color={C.gold} />
            <span style={{ flex: 1, fontSize: 13, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
              View contract
            </span>
            {vendor.contract_uploaded_by_name && (
              <span style={{ fontSize: 10, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
                by {vendor.contract_uploaded_by_name}
              </span>
            )}
          </a>
        )}

        {/* Payment history — from expenses */}
        {canSeeMoney && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <p style={{
                margin: 0, fontSize: 10, color: C.muted, fontWeight: 500,
                letterSpacing: '2px', textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
              }}>Payments</p>
              {canEditVendor && (
                <button onClick={() => setShowAddPayment(true)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: C.gold, fontSize: 12, fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
                  padding: 0,
                }}>+ Log payment</button>
              )}
            </div>
            {expenses.length === 0 ? (
              <div style={{
                background: C.pearl, border: `1px solid ${C.border}`,
                borderRadius: 10, padding: '14px 16px', marginBottom: 18, textAlign: 'center' as const,
              }}>
                <p style={{ margin: 0, fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
                  No payments logged yet.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6, marginBottom: 18 }}>
                {expenses.map(exp => {
                  const amt = exp.actual_amount + exp.shadow_amount;
                  return (
                    <button key={exp.id} onClick={() => setEditingExpense(exp)} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8,
                      background: C.ivory, border: `1px solid ${C.border}`,
                      borderRadius: 10, padding: '10px 14px',
                      cursor: 'pointer', textAlign: 'left' as const,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          margin: 0, fontSize: 13, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
                          overflow: 'hidden' as const, textOverflow: 'ellipsis' as const, whiteSpace: 'nowrap' as const,
                        }}>
                          {exp.description || exp.category}
                        </p>
                        <p style={{
                          margin: '2px 0 0', fontSize: 10, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300,
                        }}>
                          {exp.event} · {exp.payment_status}
                          {exp.receipt_url && ' · receipt attached'}
                        </p>
                      </div>
                      <span style={{ fontSize: 14, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, flexShrink: 0 }}>
                        {fmtINR(amt)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Notes */}
        {vendor.notes && (
          <>
            <p style={{
              margin: '0 0 10px', fontSize: 10, color: C.muted, fontWeight: 500,
              letterSpacing: '2px', textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
            }}>Notes</p>
            <div style={{
              background: C.ivory, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: '12px 14px', marginBottom: 18,
            }}>
              <p style={{ margin: 0, fontSize: 13, color: C.dark, fontFamily: 'DM Sans, sans-serif', lineHeight: '20px', fontWeight: 300 }}>
                {vendor.notes}
              </p>
            </div>
          </>
        )}

        {/* Close */}
        <GhostButton label="Close" onTap={onClose} />

        {/* Nested edit modal */}
        {showEdit && (
          <VendorEditor
            mode="edit"
            session={session}
            events={session.events}
            vendor={vendor}
            onClose={() => setShowEdit(false)}
            onSave={async payload => {
              await onUpdate(payload);
              setShowEdit(false);
            }}
            onDelete={async () => {
              await onDelete();
              setShowEdit(false);
            }}
          />
        )}

        {/* Log payment — uses ExpenseEditor with vendor_name pre-filled */}
        {showAddPayment && (
          <ExpenseEditor
            session={session}
            mode="add"
            events={session.events}
            defaultEvent={vendor.events[0] || session.events[0]}
            onClose={() => setShowAddPayment(false)}
            onSave={async payload => {
              await onAddExpense({
                ...payload,
                vendor_name: vendor.name,
                category: payload.category || vendor.category || 'Miscellaneous',
              });
              setShowAddPayment(false);
            }}
          />
        )}

        {/* Edit payment */}
        {editingExpense && (
          <ExpenseEditor
            session={session}
            mode="edit"
            events={session.events}
            expense={editingExpense}
            defaultEvent={editingExpense.event}
            onClose={() => setEditingExpense(null)}
            onSave={async payload => {
              await onUpdateExpense(editingExpense.id, payload);
              setEditingExpense(null);
            }}
            onDelete={async () => {
              await onDeleteExpense(editingExpense.id);
              setEditingExpense(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CIRCLE SCREEN
// ─────────────────────────────────────────────────────────────

function CircleScreen({ session, templates }: { session: CoupleSession; templates: WATemplate[] }) {
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [generatedInvite, setGeneratedInvite] = useState<{ link: string; role: string; template_key: string } | null>(null);

  const refreshCollaborators = async () => {
    try {
      const res = await fetch(`${API}/api/co-planner/list/${session.id}`);
      const d = await res.json();
      if (d.success) setCollaborators(d.data || []);
    } catch {}
  };

  useEffect(() => {
    refreshCollaborators().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id]);

  const generateInvite = async (role: 'core_duo' | 'inner_circle' | 'bridesmaid') => {
    setInviting(true); setInviteError('');
    try {
      const res = await fetch(`${API}/api/co-planner/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: session.id }),
      });
      const d = await res.json();
      if (!d.success) {
        setInviteError(d.error || 'Could not generate invite');
        setInviting(false);
        return;
      }
      const templateKey = role === 'core_duo' ? 'invite_core_duo'
        : role === 'inner_circle' ? 'invite_inner_circle'
        : 'invite_bridesmaid';
      setGeneratedInvite({ link: d.data.link, role, template_key: templateKey });
      await refreshCollaborators();
    } catch (e) {
      setInviteError('Network error. Try again.');
    }
    setInviting(false);
  };

  const closeInviteFlow = () => {
    setShowInvite(false);
    setGeneratedInvite(null);
    setInviteError('');
  };

  const roleLabels: Record<string, string> = {
    core_duo: 'Core Duo', inner_circle: 'Inner Circle',
    bridesmaid: 'Bridesmaid', viewer: 'Viewer',
  };

  return (
    <div style={{ padding: '72px 20px 100px' }}>
      <h1 style={{
        fontFamily: 'Playfair Display, serif', fontSize: 24,
        color: C.dark, margin: '0 0 4px', fontWeight: 400,
      }}>Your Circle</h1>
      <p style={{ margin: '0 0 24px', fontSize: 13, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
        The people helping you plan.
      </p>

      {/* Invite button */}
      <button
        onClick={() => setShowInvite(true)}
        style={{
          width: '100%', padding: '14px', borderRadius: 12,
          background: C.dark, border: 'none', cursor: 'pointer',
          color: C.gold, fontFamily: 'DM Sans, sans-serif',
          fontSize: 13, fontWeight: 400, letterSpacing: '1.5px',
          textTransform: 'uppercase' as const, marginBottom: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        <Plus size={14} color={C.gold} />
        Invite someone
      </button>

      {/* Role explainer */}
      <div style={{
        background: C.pearl, border: `1px solid ${C.border}`,
        borderRadius: 14, padding: '16px 18px', marginBottom: 24,
      }}>
        <p style={{
          margin: '0 0 10px', fontSize: 10, color: C.muted, fontWeight: 500,
          letterSpacing: '2px', textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
        }}>Roles</p>
        {[
          { role: 'Core Duo',     desc: 'Full access. For your partner.'                                  },
          { role: 'Inner Circle', desc: 'Most things, not sensitive budget details. For parents.'         },
          { role: 'Bridesmaid',   desc: 'Moodboard suggestions and checklist view. For close friends.'    },
        ].map(r => (
          <div key={r.role} style={{ marginBottom: 8, display: 'flex', gap: 10 }}>
            <span style={{ fontSize: 12, color: C.goldDeep, fontWeight: 500, fontFamily: 'DM Sans, sans-serif', minWidth: 96 }}>{r.role}</span>
            <span style={{ fontSize: 12, color: C.muted, fontWeight: 300, fontFamily: 'DM Sans, sans-serif', flex: 1 }}>{r.desc}</span>
          </div>
        ))}
      </div>

      {/* Collaborator list */}
      {loading ? (
        <p style={{ fontSize: 13, color: C.muted, fontFamily: 'DM Sans, sans-serif' }}>Loading…</p>
      ) : collaborators.length === 0 ? (
        <div style={{
          background: C.ivory, border: `1px solid ${C.border}`,
          borderRadius: 14, padding: '28px 20px', textAlign: 'center',
        }}>
          <Users size={28} color={C.goldBorder} style={{ marginBottom: 10 }} />
          <p style={{ margin: '0 0 6px', fontSize: 16, color: C.dark, fontFamily: 'Playfair Display, serif' }}>
            No one in your Circle yet.
          </p>
          <p style={{ margin: 0, fontSize: 13, color: C.muted, fontWeight: 300, fontFamily: 'DM Sans, sans-serif', lineHeight: '20px' }}>
            Invite your partner first — they get full access to everything.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
          {collaborators.map((c: any) => (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: C.ivory, borderRadius: 12,
              border: `1px solid ${C.border}`, padding: '14px 16px',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 18,
                background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, color: C.gold, fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
              }}>{(c.name || '?')[0].toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 14, color: C.dark, fontFamily: 'DM Sans, sans-serif' }}>{c.name || 'Invited'}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
                  {roleLabels[c.role] || 'Co-planner'} · {c.status === 'active' ? 'Active' : 'Invite sent'}
                </p>
              </div>
              {c.status === 'pending' && c.invite_code && (
                <button
                  onClick={() => {
                    const link = `https://thedreamwedding.in/join/${c.invite_code}`;
                    navigator.clipboard?.writeText(link);
                  }}
                  style={{
                    padding: '6px 10px', borderRadius: 8,
                    background: C.ivory, border: `1px solid ${C.border}`, cursor: 'pointer',
                    fontSize: 10, color: C.muted, fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  Copy link
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Invite modal */}
      {showInvite && (
        <InviteModal
          session={session}
          templates={templates}
          generated={generatedInvite}
          inviting={inviting}
          error={inviteError}
          onGenerate={generateInvite}
          onClose={closeInviteFlow}
        />
      )}
    </div>
  );
}

// Invite generation modal — role pick + template-driven share
function InviteModal({
  session, templates, generated, inviting, error, onGenerate, onClose,
}: {
  session: CoupleSession;
  templates: WATemplate[];
  generated: { link: string; role: string; template_key: string } | null;
  inviting: boolean;
  error: string;
  onGenerate: (role: 'core_duo' | 'inner_circle' | 'bridesmaid') => Promise<void>;
  onClose: () => void;
}) {
  const roleOptions: Array<{ id: 'core_duo' | 'inner_circle' | 'bridesmaid'; label: string; desc: string }> = [
    { id: 'core_duo',     label: 'Core Duo',     desc: 'Full access. Usually your partner.' },
    { id: 'inner_circle', label: 'Inner Circle', desc: 'Most things, not sensitive budget details.' },
    { id: 'bridesmaid',   label: 'Bridesmaid',   desc: 'Moodboard suggestions, checklist view.' },
  ];

  const coupleVars = buildCoupleVars(session);

  // If we have a generated invite, find the matching template
  const inviteTemplates = templates.filter(t => t.context === 'invite');
  const matchedTemplate = generated
    ? inviteTemplates.find(t => t.template_key === generated.template_key) || inviteTemplates[0]
    : null;

  const shareVars = generated ? {
    ...coupleVars,
    inviter_name: session.name,
    role: roleOptions.find(r => r.id === generated.role)?.label || 'collaborator',
    magic_link: generated.link,
  } : {};

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(44,36,32,0.5)',
        zIndex: 200, display: 'flex', alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.cream, borderRadius: '20px 20px 0 0',
          padding: '20px 20px max(20px, env(safe-area-inset-bottom))',
          width: '100%', maxWidth: 480, margin: '0 auto',
          boxSizing: 'border-box' as const, maxHeight: '92vh',
          overflowY: 'auto' as const,
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 16px' }} />

        {!generated ? (
          <>
            <p style={{ margin: '0 0 4px', fontSize: 18, color: C.dark, fontFamily: 'Playfair Display, serif' }}>
              Who are you inviting?
            </p>
            <p style={{ margin: '0 0 18px', fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
              Pick their role. You can always change it later.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
              {roleOptions.map(r => (
                <button
                  key={r.id}
                  onClick={() => onGenerate(r.id)}
                  disabled={inviting}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    background: C.ivory, border: `1px solid ${C.border}`,
                    borderRadius: 12, padding: '14px 16px', cursor: inviting ? 'default' : 'pointer',
                    textAlign: 'left' as const, width: '100%',
                    opacity: inviting ? 0.5 : 1,
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Users size={16} color={C.gold} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 14, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>{r.label}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>{r.desc}</p>
                  </div>
                  <ChevronRight size={14} color={C.mutedLight} />
                </button>
              ))}
            </div>

            {error && <div style={{ marginTop: 14 }}><ErrorBanner msg={error} /></div>}

            <div style={{ marginTop: 18 }}>
              <GhostButton label="Cancel" onTap={onClose} />
            </div>
          </>
        ) : (
          <>
            <p style={{ margin: '0 0 4px', fontSize: 18, color: C.dark, fontFamily: 'Playfair Display, serif' }}>
              Invite ready.
            </p>
            <p style={{ margin: '0 0 18px', fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
              Share it with them on WhatsApp, or copy the link.
            </p>

            <div style={{
              background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
              borderRadius: 10, padding: '12px 14px', marginBottom: 14,
            }}>
              <p style={{
                margin: 0, fontSize: 10, color: C.goldDeep, fontWeight: 500,
                letterSpacing: '1px', textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
              }}>Magic link</p>
              <p style={{
                margin: '4px 0 0', fontSize: 13, color: C.dark, fontFamily: 'monospace' as const,
                wordBreak: 'break-all' as const, lineHeight: '18px',
              }}>
                {generated.link}
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <button
                onClick={() => navigator.clipboard?.writeText(generated.link)}
                style={{
                  flex: 1, padding: '12px', borderRadius: 10,
                  background: C.ivory, border: `1px solid ${C.border}`, cursor: 'pointer',
                  color: C.dark, fontFamily: 'DM Sans, sans-serif',
                  fontSize: 12, fontWeight: 500,
                }}
              >
                Copy link
              </button>
              <div style={{ flex: 1 }}>
                <WhatsAppButton
                  context="invite"
                  templates={matchedTemplate ? [matchedTemplate] : inviteTemplates}
                  vars={shareVars}
                  label="Share on WhatsApp"
                  style={{ width: '100%' }}
                  onBeforeSend={onClose}
                />
              </div>
            </div>

            <GhostButton label="Done" onTap={onClose} />
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TEMPLATES SETTINGS SCREEN
// ─────────────────────────────────────────────────────────────

function TemplatesScreen({
  session, templates,
  onUpdate, onAdd, onDelete, onBack,
}: {
  session: CoupleSession;
  templates: WATemplate[];
  onUpdate: (id: string, patch: Partial<WATemplate>) => Promise<void>;
  onAdd: (payload: Partial<WATemplate>) => Promise<WATemplate | null>;
  onDelete: (id: string) => Promise<void>;
  onBack: () => void;
}) {
  const [editingTemplate, setEditingTemplate] = useState<WATemplate | null>(null);
  const [addContext, setAddContext] = useState<TemplateContext | null>(null);

  const contexts: { id: TemplateContext; label: string; description: string }[] = [
    { id: 'guest',     label: 'Guests',    description: 'RSVP nudges, details, thank-yous' },
    { id: 'vendor',    label: 'Vendors',   description: 'Outreach, quotes, payment reminders' },
    { id: 'moodboard', label: 'Moodboard', description: 'Curated vision shares' },
    { id: 'invite',    label: 'Circle',    description: 'CoShare invites by role' },
  ];

  return (
    <div style={{ padding: '0 0 60px' }}>
      {/* Sticky header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '72px 20px 16px', background: C.cream,
        position: 'sticky' as const, top: 0, zIndex: 30,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <button onClick={onBack} style={{
          width: 36, height: 36, borderRadius: 18, background: C.ivory,
          border: `1px solid ${C.border}`, display: 'flex',
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <ChevronRight size={16} color={C.dark} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <div>
          <p style={{ margin: 0, fontSize: 18, color: C.dark, fontFamily: 'Playfair Display, serif' }}>
            Message templates
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
            Personalise what goes out on WhatsApp
          </p>
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {contexts.map(ctx => {
          const list = templatesForContext(templates, ctx.id);
          return (
            <div key={ctx.id} style={{ marginBottom: 24 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'baseline', marginBottom: 8,
              }}>
                <div>
                  <p style={{
                    margin: 0, fontSize: 10, color: C.goldDeep, fontWeight: 500,
                    letterSpacing: '2px', textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
                  }}>{ctx.label}</p>
                  <p style={{
                    margin: '2px 0 0', fontSize: 11, color: C.muted,
                    fontFamily: 'DM Sans, sans-serif', fontWeight: 300,
                  }}>{ctx.description}</p>
                </div>
                <button onClick={() => setAddContext(ctx.id)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: C.gold, fontSize: 12, fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
                  padding: '4px 0',
                }}>+ Add</button>
              </div>
              {list.length === 0 ? (
                <div style={{
                  background: C.pearl, border: `1px dashed ${C.border}`,
                  borderRadius: 10, padding: '12px 14px', textAlign: 'center' as const,
                }}>
                  <p style={{ margin: 0, fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
                    No templates yet.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                  {list.map(t => (
                    <button key={t.id} onClick={() => setEditingTemplate(t)} style={{
                      background: C.ivory,
                      border: `1px solid ${t.is_default ? C.goldBorder : C.border}`,
                      borderRadius: 10, padding: '10px 14px',
                      cursor: 'pointer', textAlign: 'left' as const, width: '100%',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                          {t.label}
                        </span>
                        {t.is_default && (
                          <span style={{
                            fontSize: 9, color: C.goldDeep, background: C.goldSoft,
                            border: `1px solid ${C.goldBorder}`, borderRadius: 6,
                            padding: '1px 5px', fontFamily: 'DM Sans, sans-serif',
                            fontWeight: 500, letterSpacing: '0.3px', textTransform: 'uppercase' as const,
                          }}>Default</span>
                        )}
                        {t.is_custom && (
                          <span style={{
                            fontSize: 9, color: C.muted, background: C.cream,
                            border: `1px solid ${C.border}`, borderRadius: 6,
                            padding: '1px 5px', fontFamily: 'DM Sans, sans-serif',
                            fontWeight: 500, letterSpacing: '0.3px', textTransform: 'uppercase' as const,
                          }}>Custom</span>
                        )}
                      </div>
                      <p style={{
                        margin: 0, fontSize: 11, color: C.muted,
                        fontFamily: 'DM Sans, sans-serif', fontWeight: 300,
                        lineHeight: '15px',
                        display: '-webkit-box' as any,
                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any,
                        overflow: 'hidden' as const,
                      }}>
                        {t.body.slice(0, 140)}{t.body.length > 140 ? '…' : ''}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editingTemplate && (
        <TemplateEditor
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onSave={async patch => {
            await onUpdate(editingTemplate.id, patch);
            setEditingTemplate(null);
          }}
          onDelete={editingTemplate.is_custom
            ? async () => { await onDelete(editingTemplate.id); setEditingTemplate(null); }
            : undefined
          }
        />
      )}

      {addContext && (
        <TemplateEditor
          newContext={addContext}
          onClose={() => setAddContext(null)}
          onSave={async patch => {
            await onAdd({ ...patch, context: addContext, is_custom: true });
            setAddContext(null);
          }}
        />
      )}
    </div>
  );
}

function TemplateEditor({ template, newContext, onClose, onSave, onDelete }: {
  template?: WATemplate;
  newContext?: TemplateContext;
  onClose: () => void;
  onSave: (patch: Partial<WATemplate>) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const context = template?.context || newContext!;
  const [label, setLabel] = useState(template?.label || '');
  const [body, setBody] = useState(template?.body || '');
  const [isDefault, setIsDefault] = useState(template?.is_default || false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const vars = TEMPLATE_VARIABLES[context];

  const insertVar = (v: string) => {
    const textarea = textareaRef.current;
    if (!textarea) { setBody(body + v); return; }
    const start = textarea.selectionStart || body.length;
    const end = textarea.selectionEnd || body.length;
    const next = body.slice(0, start) + v + body.slice(end);
    setBody(next);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + v.length, start + v.length);
    }, 0);
  };

  const handleSave = async () => {
    if (!label.trim() || !body.trim()) return;
    const patch: Partial<WATemplate> = {
      label: label.trim(),
      body: body.trim(),
    };
    if (template) patch.is_default = isDefault;
    await onSave(patch);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(44,36,32,0.5)',
        zIndex: 200, display: 'flex', alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.cream, borderRadius: '20px 20px 0 0',
          padding: '20px 20px max(20px, env(safe-area-inset-bottom))',
          width: '100%', maxWidth: 480, margin: '0 auto',
          boxSizing: 'border-box' as const, maxHeight: '92vh',
          overflowY: 'auto' as const,
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 16px' }} />

        <p style={{ margin: '0 0 16px', fontSize: 18, color: C.dark, fontFamily: 'Playfair Display, serif' }}>
          {template ? 'Edit template' : 'Add template'}
        </p>

        <InputField label="Name" value={label} onChange={setLabel} placeholder="e.g. Payment reminder" />

        <label style={{
          display: 'block', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
          fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
        }}>Message</label>
        <textarea
          ref={textareaRef}
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={6}
          placeholder="Hi {guest_name}, ..."
          style={{
            width: '100%', boxSizing: 'border-box' as const,
            padding: '12px 14px', borderRadius: 10,
            border: `1px solid ${C.border}`, background: C.ivory,
            fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: C.dark,
            outline: 'none', marginBottom: 10, resize: 'vertical' as const, lineHeight: '18px',
          }}
        />

        {/* Variable chips */}
        <label style={{
          display: 'block', fontSize: 10, color: C.muted, fontFamily: 'DM Sans, sans-serif',
          fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
        }}>Tap to insert</label>
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4, marginBottom: 14 }}>
          {vars.map(v => (
            <button
              key={v}
              onClick={() => insertVar(v)}
              style={{
                padding: '4px 10px', borderRadius: 12,
                background: C.ivory, border: `1px solid ${C.goldBorder}`,
                color: C.goldDeep, fontSize: 11,
                fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
              }}
            >{v}</button>
          ))}
        </div>

        {/* Set as default (only for existing templates) */}
        {template && (
          <button
            onClick={() => setIsDefault(v => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              background: isDefault ? C.goldSoft : C.ivory,
              border: `1px solid ${isDefault ? C.goldBorder : C.border}`,
              borderRadius: 10, padding: '10px 14px', cursor: 'pointer',
              textAlign: 'left' as const, marginBottom: 14,
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: 10, flexShrink: 0,
              background: isDefault ? C.gold : C.cream,
              border: `1.5px solid ${C.goldBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isDefault && <Check size={12} color={C.cream} />}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 12, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                Set as default
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 10, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
                Used when there's no picker
              </p>
            </div>
          </button>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {onDelete && (
            <button onClick={onDelete} style={{
              width: 44, height: 44, borderRadius: 12,
              background: '#FEF2F2', border: '1px solid #FECACA',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}>
              <Trash2 size={16} color="#B91C1C" />
            </button>
          )}
          <div style={{ flex: 1 }}>
            <GhostButton label="Cancel" onTap={onClose} />
          </div>
          <button onClick={handleSave} disabled={!label.trim() || !body.trim()} style={{
            padding: '12px 24px', borderRadius: 12,
            background: C.dark, border: 'none',
            cursor: label.trim() && body.trim() ? 'pointer' : 'default',
            color: C.gold, fontFamily: 'DM Sans, sans-serif',
            fontSize: 13, fontWeight: 400, letterSpacing: '1.5px',
            textTransform: 'uppercase' as const,
            opacity: label.trim() && body.trim() ? 1 : 0.4,
          }}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DREAMAI ACTION SHEET
// Bottom sheet with example prompts + "start fresh" option.
// First-time users see Twilio sandbox opt-in copy.
// ─────────────────────────────────────────────────────────────

function DreamAiSheet({ session, onClose }: {
  session: CoupleSession;
  onClose: () => void;
}) {
  const TWILIO_NUMBER = '14155238886';
  const SANDBOX_JOIN_CODE = 'join acres-eventually';

  const prompts = [
    {
      icon: '💐',
      label: 'Find me a Mehendi artist',
      body: "Hi DreamAi! I'm looking for a Mehendi artist for my wedding. Can you suggest some top-rated ones?",
    },
    {
      icon: '💰',
      label: "How's my budget looking?",
      body: "Hi DreamAi! Can you tell me how my wedding budget is tracking and where I'm overspending?",
    },
    {
      icon: '💌',
      label: 'Draft a thank-you note',
      body: "Hi DreamAi! Can you help me draft a warm thank-you note to send to my aunt who's been helping with wedding plans?",
    },
    {
      icon: '✨',
      label: 'Suggest mandap decor ideas',
      body: "Hi DreamAi! I need creative mandap decor ideas. My wedding is a traditional Indian ceremony — any suggestions?",
    },
  ];

  const openPrompt = (body: string) => {
    window.open(`https://wa.me/${TWILIO_NUMBER}?text=${encodeURIComponent(body)}`, '_blank');
    onClose();
  };

  const openFresh = () => {
    window.open(`https://wa.me/${TWILIO_NUMBER}`, '_blank');
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(44,36,32,0.5)',
        zIndex: 220, display: 'flex', alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.cream, borderRadius: '20px 20px 0 0',
          padding: '20px 20px max(20px, env(safe-area-inset-bottom))',
          width: '100%', maxWidth: 480, margin: '0 auto',
          boxSizing: 'border-box' as const, maxHeight: '85vh',
          overflowY: 'auto' as const,
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 16px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 16,
            background: C.dark, border: `1px solid ${C.goldBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={14} color={C.gold} />
          </div>
          <p style={{ margin: 0, fontSize: 18, color: C.dark, fontFamily: 'Playfair Display, serif' }}>
            DreamAi
          </p>
        </div>
        <p style={{ margin: '0 0 16px', fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300, lineHeight: '18px' }}>
          Your wedding planning assistant, right inside WhatsApp. Pick a starting point or start fresh.
        </p>

        <p style={{
          margin: '0 0 8px', fontSize: 10, color: C.muted, fontWeight: 500,
          letterSpacing: '2px', textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
        }}>Quick starts</p>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8, marginBottom: 16 }}>
          {prompts.map((p, i) => (
            <button key={i} onClick={() => openPrompt(p.body)} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: C.ivory, border: `1px solid ${C.border}`,
              borderRadius: 12, padding: '12px 14px',
              cursor: 'pointer', textAlign: 'left' as const, width: '100%',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0,
              }}>
                <span>{p.icon}</span>
              </div>
              <span style={{
                flex: 1, fontSize: 13, color: C.dark,
                fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
              }}>{p.label}</span>
              <ChevronRight size={14} color={C.mutedLight} />
            </button>
          ))}
        </div>

        <button onClick={openFresh} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: C.dark, border: 'none',
          borderRadius: 12, padding: '14px', cursor: 'pointer',
          color: C.gold, fontFamily: 'DM Sans, sans-serif',
          fontSize: 13, fontWeight: 400, letterSpacing: '1.5px',
          textTransform: 'uppercase' as const, marginBottom: 12,
        }}>
          <Phone size={13} color={C.gold} />
          Start fresh in WhatsApp
        </button>

        {/* First-time opt-in footer */}
        <div style={{
          background: C.pearl, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: '10px 14px',
        }}>
          <p style={{
            margin: 0, fontSize: 10, color: C.muted, fontWeight: 500,
            letterSpacing: '1px', textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
          }}>First time?</p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300, lineHeight: '16px' }}>
            Send <span style={{ fontWeight: 500, color: C.dark }}>{SANDBOX_JOIN_CODE}</span> to <span style={{ fontWeight: 500, color: C.dark }}>+1 {TWILIO_NUMBER.slice(0, 3)}-{TWILIO_NUMBER.slice(3, 6)}-{TWILIO_NUMBER.slice(6)}</span> from WhatsApp to connect.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FEEDBACK SHEET
// ─────────────────────────────────────────────────────────────

function FeedbackSheet({ session, onSubmit, onClose, activeTab }: {
  session: CoupleSession;
  onSubmit: (payload: { rating: string; message: string; screen: string }) => Promise<boolean>;
  onClose: () => void;
  activeTab: string;
}) {
  const [rating, setRating] = useState<'great' | 'ok' | 'bad' | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!rating && !message.trim()) return;
    setSubmitting(true);
    const ok = await onSubmit({
      rating: rating || '',
      message: message.trim(),
      screen: activeTab,
    });
    setSubmitting(false);
    if (ok) {
      setSubmitted(true);
      setTimeout(onClose, 1500);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(44,36,32,0.5)',
        zIndex: 220, display: 'flex', alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.cream, borderRadius: '20px 20px 0 0',
          padding: '20px 20px max(20px, env(safe-area-inset-bottom))',
          width: '100%', maxWidth: 480, margin: '0 auto',
          boxSizing: 'border-box' as const, maxHeight: '85vh',
          overflowY: 'auto' as const,
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 16px' }} />

        {submitted ? (
          <div style={{ textAlign: 'center' as const, padding: '30px 10px' }}>
            <Sparkles size={28} color={C.gold} style={{ marginBottom: 10 }} />
            <p style={{ margin: '0 0 4px', fontSize: 18, color: C.dark, fontFamily: 'Playfair Display, serif' }}>
              Thank you, {session.name?.split(' ')[0] || 'love'}.
            </p>
            <p style={{ margin: 0, fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
              Every bit of feedback makes this better.
            </p>
          </div>
        ) : (
          <>
            <p style={{ margin: '0 0 4px', fontSize: 18, color: C.dark, fontFamily: 'Playfair Display, serif' }}>
              How's this feeling?
            </p>
            <p style={{ margin: '0 0 18px', fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300, lineHeight: '18px' }}>
              You're one of the first to use TDW. Tell us what's working, what's not, anything at all.
            </p>

            {/* Rating */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, justifyContent: 'center' }}>
              {([
                ['great', '😍', 'Love it'],
                ['ok',    '🙂', 'It\'s okay'],
                ['bad',   '😕', 'Not great'],
              ] as const).map(([val, emoji, label]) => (
                <button
                  key={val}
                  onClick={() => setRating(val)}
                  style={{
                    flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
                    background: rating === val ? C.goldSoft : C.ivory,
                    border: `1px solid ${rating === val ? C.goldBorder : C.border}`,
                    borderRadius: 12, padding: '12px 8px',
                    cursor: 'pointer', gap: 4,
                  }}
                >
                  <span style={{ fontSize: 24 }}>{emoji}</span>
                  <span style={{
                    fontSize: 11, color: rating === val ? C.goldDeep : C.muted,
                    fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
                  }}>{label}</span>
                </button>
              ))}
            </div>

            <label style={{
              display: 'block', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
              fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
            }}>Anything else?</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Something you loved, something broken, something missing..."
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box' as const,
                padding: '10px 14px', borderRadius: 10,
                border: `1px solid ${C.border}`, background: C.ivory,
                fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: C.dark,
                outline: 'none', marginBottom: 14, resize: 'vertical' as const, lineHeight: '18px',
              }}
            />

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <GhostButton label="Cancel" onTap={onClose} />
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting || (!rating && !message.trim())}
                style={{
                  padding: '12px 24px', borderRadius: 12,
                  background: C.dark, border: 'none',
                  cursor: (rating || message.trim()) && !submitting ? 'pointer' : 'default',
                  color: C.gold, fontFamily: 'DM Sans, sans-serif',
                  fontSize: 13, fontWeight: 400, letterSpacing: '1.5px',
                  textTransform: 'uppercase' as const,
                  opacity: (rating || message.trim()) && !submitting ? 1 : 0.4,
                }}
              >
                {submitting ? '…' : 'Send'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FOUNDING BRIDE INTRO
// ─────────────────────────────────────────────────────────────

function FoundingBrideIntro({ name, onDismiss }: {
  name: string;
  onDismiss: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(44,36,32,0.6)',
        zIndex: 260, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          background: C.cream, borderRadius: 20,
          padding: 28, maxWidth: 400, width: '100%',
          border: `1px solid ${C.goldBorder}`,
          boxShadow: '0 24px 64px rgba(44,36,32,0.25)',
          textAlign: 'center' as const,
        }}
      >
        <div style={{
          width: 56, height: 56, borderRadius: 28,
          background: C.dark, border: `2px solid ${C.goldBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <Sparkles size={24} color={C.gold} />
        </div>
        <p style={{
          margin: '0 0 6px', fontSize: 12, color: C.goldDeep, fontWeight: 500,
          letterSpacing: '3px', textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
        }}>Welcome, Founding Bride</p>
        <p style={{
          margin: '0 0 12px', fontSize: 22, color: C.dark,
          fontFamily: 'Playfair Display, serif', lineHeight: '28px',
        }}>
          {name?.split(' ')[0] || 'You\'re'}, you're one of our first.
        </p>
        <p style={{
          margin: '0 0 20px', fontSize: 13, color: C.muted,
          fontFamily: 'DM Sans, sans-serif', fontWeight: 300, lineHeight: '20px',
        }}>
          You get lifetime Platinum — every tool, every feature, at no charge. Ever.
          <br /><br />
          In exchange, tell us what works and what doesn't. Tap the beta button anytime.
        </p>
        <button
          onClick={onDismiss}
          style={{
            width: '100%', padding: '14px', borderRadius: 12,
            background: C.dark, border: 'none', cursor: 'pointer',
            color: C.gold, fontFamily: 'DM Sans, sans-serif',
            fontSize: 12, fontWeight: 400, letterSpacing: '2px',
            textTransform: 'uppercase' as const,
          }}
        >
          Let's plan
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ERROR BOUNDARY
// Prevents a crash in one tool from blanking the whole app.
// ─────────────────────────────────────────────────────────────

class ToolErrorBoundary extends React.Component<
  { children: React.ReactNode; onReset: () => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; onReset: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error) {
    console.error('Tool error:', error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '120px 20px' }}>
          <div style={{
            background: C.ivory, border: `1px solid ${C.border}`,
            borderRadius: 14, padding: '28px 20px', textAlign: 'center' as const,
          }}>
            <AlertCircle size={28} color={'#A33636'} style={{ marginBottom: 10 }} />
            <p style={{ margin: '0 0 6px', fontSize: 16, color: C.dark, fontFamily: 'Playfair Display, serif' }}>
              Something went wrong.
            </p>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300, lineHeight: '18px' }}>
              Your data is safe. Head back and try again.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                this.props.onReset();
              }}
              style={{
                padding: '12px 24px', borderRadius: 12,
                background: C.dark, border: 'none', cursor: 'pointer',
                color: C.gold, fontFamily: 'DM Sans, sans-serif',
                fontSize: 12, fontWeight: 400, letterSpacing: '1.5px',
                textTransform: 'uppercase' as const,
              }}
            >
              Back to home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─────────────────────────────────────────────────────────────
// PWA INSTALL PROMPT
// Android/Chrome: intercepts beforeinstallprompt event.
// iOS Safari: shows manual add-to-home-screen instructions.
// Shows once after 3+ visits; dismiss persists.
// ─────────────────────────────────────────────────────────────

function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<'android' | 'ios' | 'other'>('other');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Already installed — running in standalone mode
    const isStandalone =
      (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches) ||
      (typeof navigator !== 'undefined' && (navigator as any).standalone === true);
    if (isStandalone) return;

    // Previously dismissed
    const dismissed = typeof localStorage !== 'undefined' && localStorage.getItem('tdw_install_dismissed');
    if (dismissed) return;

    // Visit counter — only show on 3rd+ session
    let visits = 1;
    try {
      const existing = parseInt(localStorage.getItem('tdw_visit_count') || '0', 10);
      visits = existing + 1;
      localStorage.setItem('tdw_visit_count', String(visits));
    } catch {}

    if (visits < 3) return;

    // Platform detection
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isAndroid = /Android/.test(ua);

    if (isIOS) {
      setPlatform('ios');
      setVisible(true);
    } else if (isAndroid) {
      setPlatform('android');
      const handler = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setVisible(true);
      };
      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }
  }, []);

  const dismiss = () => {
    try { localStorage.setItem('tdw_install_dismissed', '1'); } catch {}
    setVisible(false);
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      try { await deferredPrompt.userChoice; } catch {}
      setDeferredPrompt(null);
    }
    dismiss();
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 'calc(max(8px, env(safe-area-inset-bottom)) + 72px)',
      left: 16, right: 16,
      maxWidth: 448, margin: '0 auto',
      background: C.cream, border: `1px solid ${C.goldBorder}`,
      borderRadius: 14, padding: '14px 16px',
      boxShadow: '0 8px 24px rgba(44,36,32,0.18)',
      zIndex: 55,
      display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Smartphone size={16} color={C.gold} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0, fontSize: 13, color: C.dark,
          fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
        }}>
          Add to your home screen
        </p>
        <p style={{
          margin: '2px 0 0', fontSize: 11, color: C.muted,
          fontFamily: 'DM Sans, sans-serif', fontWeight: 300, lineHeight: '15px',
        }}>
          {platform === 'ios'
            ? 'Tap the share icon in Safari, then "Add to Home Screen".'
            : 'Install TDW for quick access and offline use.'}
        </p>
        {platform === 'android' && (
          <button onClick={handleInstall} style={{
            marginTop: 8, padding: '6px 14px', borderRadius: 10,
            background: C.dark, border: 'none', cursor: 'pointer',
            color: C.gold, fontFamily: 'DM Sans, sans-serif',
            fontSize: 11, fontWeight: 500, letterSpacing: '1px',
            textTransform: 'uppercase' as const,
          }}>Install</button>
        )}
      </div>
      <button onClick={dismiss} style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 4,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <X size={14} color={C.muted} />
      </button>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────
// PROFILE OVERLAY
// ─────────────────────────────────────────────────────────────

function ProfileOverlay({ session, onClose, onLogout, onOpenTemplates }: {
  session: CoupleSession;
  onClose: () => void;
  onLogout: () => void;
  onOpenTemplates: () => void;
}) {
  const tierLabel: Record<string, string> = { free: 'Basic', premium: 'Gold', elite: 'Platinum' };
  const days = daysToGo(session.weddingDate);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(44,36,32,0.5)',
      zIndex: 200, display: 'flex', alignItems: 'flex-end',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.cream, borderRadius: '20px 20px 0 0',
        padding: 'max(24px, env(safe-area-inset-bottom)) 24px 24px',
        width: '100%', maxWidth: 480, margin: '0 auto',
        boxSizing: 'border-box' as const,
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 20px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 26, background: C.dark,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, color: C.gold, fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
          }}>{session.name?.[0]?.toUpperCase() || '?'}</div>
          <div>
            <p style={{ margin: 0, fontSize: 18, color: C.dark, fontFamily: 'Playfair Display, serif' }}>
              {session.name}{session.partnerName ? ` & ${session.partnerName}` : ''}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
              {tierLabel[session.couple_tier] || 'Basic'} · {days} days to go
            </p>
          </div>
        </div>
        {session.foundingBride && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
            borderRadius: 20, padding: '4px 12px', marginBottom: 16,
          }}>
            <Sparkles size={12} color={C.gold} />
            <span style={{ fontSize: 11, color: C.goldDeep, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
              Founding Bride · Platinum Lifetime
            </span>
          </div>
        )}
        {session.events?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{
              fontSize: 10, color: C.muted, letterSpacing: '2px',
              textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, margin: '0 0 8px',
            }}>Your events</p>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
              {session.events.map(ev => (
                <span key={ev} style={{
                  padding: '4px 10px', borderRadius: 14,
                  background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
                  fontSize: 12, color: C.goldDeep, fontFamily: 'DM Sans, sans-serif',
                }}>{ev}</span>
              ))}
            </div>
          </div>
        )}
        <div style={{ height: 1, background: C.border, margin: '4px 0 16px' }} />

        {/* Settings */}
        <p style={{
          fontSize: 10, color: C.muted, letterSpacing: '2px',
          textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, margin: '0 0 8px',
        }}>Settings</p>
        <button
          onClick={onOpenTemplates}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: C.ivory, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
            width: '100%', textAlign: 'left' as const, marginBottom: 12,
          }}
        >
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 13, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
              Message templates
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
              Customise your WhatsApp messages
            </p>
          </div>
          <ChevronRight size={14} color={C.mutedLight} />
        </button>

        <div style={{ height: 1, background: C.border, margin: '16px 0' }} />

        <GhostButton label="Sign out" onTap={onLogout} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ENTRY SCREEN
// Shown when there's no invite code in the URL and no active session.
// Inline: sign-in for returning users + access waitlist for newcomers.
// ─────────────────────────────────────────────────────────────

function EntryScreen({ onSessionRestore }: {
  onSessionRestore: (s: CoupleSession) => void;
}) {
  const [mode, setMode] = useState<'login' | 'forgot' | 'waitlist'>('login');

  return (
    <div style={{
      minHeight: '100vh', background: C.cream,
      fontFamily: 'DM Sans, sans-serif',
      padding: '56px 24px max(24px, env(safe-area-inset-bottom))',
    }}>
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center' as const, marginBottom: 32 }}>
          <p style={{
            margin: '0 0 4px', fontSize: 10, color: C.goldDeep, fontWeight: 500,
            letterSpacing: '3px', textTransform: 'uppercase' as const,
            fontFamily: 'DM Sans, sans-serif',
          }}>The Dream Wedding</p>
          <h1 style={{
            margin: 0, fontSize: 28, color: C.dark,
            fontFamily: 'Playfair Display, serif', fontWeight: 400, lineHeight: '34px',
          }}>Plan your wedding, beautifully.</h1>
          <p style={{
            margin: '10px 0 0', fontSize: 13, color: C.muted,
            fontFamily: 'DM Sans, sans-serif', fontWeight: 300, lineHeight: '20px',
          }}>
            Everything you need in one elegant place.
          </p>
        </div>

        {mode === 'login' && (
          <LoginForm
            onSuccess={onSessionRestore}
            onForgotPassword={() => setMode('forgot')}
            onRequestInvite={() => setMode('waitlist')}
          />
        )}
        {mode === 'forgot' && (
          <ForgotPasswordFlow
            onDone={() => setMode('login')}
            onBack={() => setMode('login')}
          />
        )}
        {mode === 'waitlist' && (
          <AccessWaitlistForm
            onBack={() => setMode('login')}
          />
        )}

        {/* Footer */}
        <p style={{
          textAlign: 'center' as const,
          margin: '28px 0 0', fontSize: 10, color: C.mutedLight,
          fontFamily: 'DM Sans, sans-serif', fontWeight: 300, letterSpacing: '0.3px',
        }}>
          Invites are sent personally by our team.
        </p>
      </div>
    </div>
  );
}

function LoginForm({ onSuccess, onForgotPassword, onRequestInvite }: {
  onSuccess: (s: CoupleSession) => void;
  onForgotPassword: () => void;
  onRequestInvite: () => void;
}) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    const clean = phone.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) { setError('Enter a valid 10-digit phone'); return; }
    if (password.length < 1) { setError('Enter your password'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/couple/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '+91' + clean, password }),
      });
      const d = await res.json();
      if (!d.success) {
        setError(d.error || 'Could not sign in');
        setLoading(false);
        return;
      }
      const newSession: CoupleSession = {
        id: d.data.id,
        name: d.data.name || '',
        partnerName: d.data.partner_name || '',
        weddingDate: d.data.wedding_date || '',
        events: d.data.events || [],
        couple_tier: d.data.couple_tier || 'free',
        coShareRole: 'owner',
        foundingBride: !!d.data.founding_bride,
        token_balance: d.data.token_balance || 0,
      };
      saveSession(newSession);
      onSuccess(newSession);
    } catch {
      setError('Network error. Try again.');
    }
    setLoading(false);
  };

  return (
    <div>
      <p style={{
        margin: '0 0 12px', fontSize: 10, color: C.muted, fontWeight: 500,
        letterSpacing: '2px', textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
      }}>Sign in</p>

      <label style={{
        display: 'block', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
        fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
      }}>Phone</label>
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <span style={{
          position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
          fontSize: 15, color: C.muted, fontFamily: 'DM Sans, sans-serif',
        }}>+91</span>
        <input
          type="tel" value={phone} onChange={e => setPhone(e.target.value)}
          placeholder="98765 43210"
          autoComplete="tel"
          style={{
            width: '100%', boxSizing: 'border-box' as const,
            padding: '12px 16px 12px 46px', borderRadius: 10,
            border: `1px solid ${C.border}`, background: C.ivory,
            fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: C.dark, outline: 'none',
          }}
        />
      </div>

      <label style={{
        display: 'block', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
        fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
      }}>Password</label>
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <input
          type={showPassword ? 'text' : 'password'}
          value={password} onChange={e => setPassword(e.target.value)}
          placeholder="Your password"
          autoComplete="current-password"
          style={{
            width: '100%', boxSizing: 'border-box' as const,
            padding: '12px 52px 12px 16px', borderRadius: 10,
            border: `1px solid ${C.border}`, background: C.ivory,
            fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: C.dark, outline: 'none',
          }}
        />
        <button
          onClick={() => setShowPassword(v => !v)}
          style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            padding: '6px 10px', borderRadius: 8,
            background: 'none', border: 'none', cursor: 'pointer',
            color: C.muted, fontSize: 11, fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
          }}
          type="button"
        >{showPassword ? 'Hide' : 'Show'}</button>
      </div>

      <ErrorBanner msg={error} />

      <GoldButton fullWidth label={loading ? 'Signing in…' : 'Sign in'} onTap={handleLogin} />

      <div style={{ textAlign: 'center' as const, margin: '14px 0 20px' }}>
        <button
          onClick={onForgotPassword}
          style={{
            background: 'none', border: 'none', color: C.muted,
            fontSize: 12, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >Forgot password?</button>
      </div>

      {/* Divider */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0 20px',
      }}>
        <div style={{ flex: 1, height: 1, background: C.border }} />
        <span style={{
          fontSize: 10, color: C.mutedLight, fontWeight: 500,
          letterSpacing: '2px', textTransform: 'uppercase' as const,
          fontFamily: 'DM Sans, sans-serif',
        }}>New here?</span>
        <div style={{ flex: 1, height: 1, background: C.border }} />
      </div>

      <button
        onClick={onRequestInvite}
        style={{
          width: '100%', padding: '14px', borderRadius: 12,
          background: C.ivory, border: `1px solid ${C.goldBorder}`,
          cursor: 'pointer',
          color: C.goldDeep, fontFamily: 'DM Sans, sans-serif',
          fontSize: 13, fontWeight: 500, letterSpacing: '1.5px',
          textTransform: 'uppercase' as const,
        }}
      >
        Request an invite
      </button>
    </div>
  );
}

function ForgotPasswordFlow({ onDone, onBack }: {
  onDone: () => void;
  onBack: () => void;
}) {
  const [step, setStep] = useState<'phone' | 'otp' | 'new-password' | 'done'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sessionInfo, setSessionInfo] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async () => {
    const clean = phone.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) { setError('Enter a valid 10-digit phone'); return; }
    setLoading(true); setError('');
    try {
      // Check if phone exists (but always advance regardless — don't leak existence)
      await fetch(`${API}/api/couple/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '+91' + clean }),
      });
      const res = await fetch(`${API}/api/auth/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: clean }),
      });
      const d = await res.json();
      if (d.success) {
        setSessionInfo(d.sessionInfo || '');
        setStep('otp');
      } else {
        setError(d.error || 'Could not send OTP');
      }
    } catch {
      setError('Network error. Try again.');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 4) { setError('Enter the OTP'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/auth/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionInfo, code: otp }),
      });
      const d = await res.json();
      if (d.success) setStep('new-password');
      else setError(d.error || 'Invalid OTP');
    } catch {
      setError('Network error. Try again.');
    }
    setLoading(false);
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true); setError('');
    const clean = phone.replace(/\D/g, '').slice(-10);
    try {
      const res = await fetch(`${API}/api/couple/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '+91' + clean,
          new_password: newPassword,
          otp_verified: true,
        }),
      });
      const d = await res.json();
      if (d.success) setStep('done');
      else setError(d.error || 'Could not reset password');
    } catch {
      setError('Network error. Try again.');
    }
    setLoading(false);
  };

  return (
    <div>
      <p style={{
        margin: '0 0 12px', fontSize: 10, color: C.muted, fontWeight: 500,
        letterSpacing: '2px', textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
      }}>Reset password</p>

      {step === 'phone' && (
        <>
          <p style={{
            margin: '0 0 20px', fontSize: 13, color: C.muted,
            fontFamily: 'DM Sans, sans-serif', fontWeight: 300, lineHeight: '20px',
          }}>
            Enter your phone number and we'll send you a code.
          </p>
          <label style={{
            display: 'block', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
            fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
          }}>Phone</label>
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <span style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
              fontSize: 15, color: C.muted, fontFamily: 'DM Sans, sans-serif',
            }}>+91</span>
            <input
              type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="98765 43210"
              style={{
                width: '100%', boxSizing: 'border-box' as const,
                padding: '12px 16px 12px 46px', borderRadius: 10,
                border: `1px solid ${C.border}`, background: C.ivory,
                fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: C.dark, outline: 'none',
              }}
            />
          </div>
          <ErrorBanner msg={error} />
          <div style={{ display: 'flex', gap: 10 }}>
            <GhostButton label="Back" onTap={onBack} />
            <div style={{ flex: 1 }}>
              <GoldButton fullWidth label={loading ? 'Sending…' : 'Send code'} onTap={handleSendOtp} />
            </div>
          </div>
        </>
      )}

      {step === 'otp' && (
        <>
          <p style={{
            margin: '0 0 20px', fontSize: 13, color: C.muted,
            fontFamily: 'DM Sans, sans-serif', fontWeight: 300, lineHeight: '20px',
          }}>
            We sent a 6-digit code to +91 {phone.replace(/\D/g, '').slice(-10)}.
          </p>
          <InputField label="6-digit code" value={otp} onChange={setOtp} type="tel" placeholder="123456" />
          <ErrorBanner msg={error} />
          <GoldButton fullWidth label={loading ? 'Verifying…' : 'Verify'} onTap={handleVerifyOtp} />
          <div style={{ textAlign: 'center' as const, marginTop: 12 }}>
            <button onClick={() => { setStep('phone'); setOtp(''); setError(''); }} style={{
              background: 'none', border: 'none', color: C.muted,
              fontSize: 12, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
            }}>Back</button>
          </div>
        </>
      )}

      {step === 'new-password' && (
        <>
          <p style={{
            margin: '0 0 20px', fontSize: 13, color: C.muted,
            fontFamily: 'DM Sans, sans-serif', fontWeight: 300, lineHeight: '20px',
          }}>
            Set a new password. At least 8 characters.
          </p>
          <label style={{
            display: 'block', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
            fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
          }}>New password</label>
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword} onChange={e => setNewPassword(e.target.value)}
              autoComplete="new-password"
              style={{
                width: '100%', boxSizing: 'border-box' as const,
                padding: '12px 52px 12px 16px', borderRadius: 10,
                border: `1px solid ${C.border}`, background: C.ivory,
                fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: C.dark, outline: 'none',
              }}
            />
            <button
              onClick={() => setShowPassword(v => !v)}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                padding: '6px 10px', borderRadius: 8,
                background: 'none', border: 'none', cursor: 'pointer',
                color: C.muted, fontSize: 11, fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
              }}
              type="button"
            >{showPassword ? 'Hide' : 'Show'}</button>
          </div>
          <label style={{
            display: 'block', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
            fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
          }}>Confirm new password</label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            style={{
              width: '100%', boxSizing: 'border-box' as const,
              padding: '12px 16px', borderRadius: 10,
              border: `1px solid ${C.border}`, background: C.ivory,
              fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: C.dark,
              outline: 'none', marginBottom: 14,
            }}
          />
          <ErrorBanner msg={error} />
          <GoldButton fullWidth label={loading ? 'Saving…' : 'Reset password'} onTap={handleResetPassword} />
        </>
      )}

      {step === 'done' && (
        <div style={{ textAlign: 'center' as const, padding: '20px 10px' }}>
          <Check size={28} color={C.gold} style={{ marginBottom: 10 }} />
          <p style={{ margin: '0 0 8px', fontSize: 18, color: C.dark, fontFamily: 'Playfair Display, serif' }}>
            Password reset.
          </p>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
            You can sign in with your new password.
          </p>
          <GoldButton fullWidth label="Back to sign in" onTap={onDone} />
        </div>
      )}
    </div>
  );
}

function AccessWaitlistForm({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [weddingDate, setWeddingDate] = useState('');
  const [referralSource, setReferralSource] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Please enter your name'); return; }
    const clean = phone.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) { setError('Enter a valid 10-digit phone'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/couple/access-waitlist`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: '+91' + clean,
          wedding_date: weddingDate || null,
          referral_source: referralSource.trim() || null,
        }),
      });
      const d = await res.json();
      if (d.success) setSubmitted(true);
      else setError(d.error || 'Could not submit');
    } catch {
      setError('Network error. Try again.');
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div style={{ textAlign: 'center' as const, padding: '20px 10px' }}>
        <Sparkles size={28} color={C.gold} style={{ marginBottom: 10 }} />
        <p style={{ margin: '0 0 8px', fontSize: 18, color: C.dark, fontFamily: 'Playfair Display, serif' }}>
          You're on the list.
        </p>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300, lineHeight: '20px' }}>
          We'll reach out personally when an invite is ready for you.
        </p>
        <GhostButton label="Back" onTap={onBack} />
      </div>
    );
  }

  return (
    <div>
      <p style={{
        margin: '0 0 12px', fontSize: 10, color: C.muted, fontWeight: 500,
        letterSpacing: '2px', textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
      }}>Request an invite</p>
      <p style={{
        margin: '0 0 20px', fontSize: 13, color: C.muted,
        fontFamily: 'DM Sans, sans-serif', fontWeight: 300, lineHeight: '20px',
      }}>
        TDW is invite-only for now. Share a few details and we'll reach out when a spot opens up.
      </p>

      <InputField label="Your name" value={name} onChange={setName} placeholder="e.g. Priya Sharma" />

      <label style={{
        display: 'block', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
        fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
      }}>Phone</label>
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <span style={{
          position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
          fontSize: 15, color: C.muted, fontFamily: 'DM Sans, sans-serif',
        }}>+91</span>
        <input
          type="tel" value={phone} onChange={e => setPhone(e.target.value)}
          placeholder="98765 43210"
          autoComplete="tel"
          style={{
            width: '100%', boxSizing: 'border-box' as const,
            padding: '12px 16px 12px 46px', borderRadius: 10,
            border: `1px solid ${C.border}`, background: C.ivory,
            fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: C.dark, outline: 'none',
          }}
        />
      </div>

      <label style={{
        display: 'block', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
        fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
      }}>Wedding date</label>
      <input
        type="date"
        value={weddingDate}
        onChange={e => setWeddingDate(e.target.value)}
        style={{
          width: '100%', boxSizing: 'border-box' as const,
          padding: '12px 16px', borderRadius: 10,
          border: `1px solid ${C.border}`, background: C.ivory,
          fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: C.dark,
          outline: 'none', marginBottom: 14,
        }}
      />

      <InputField
        label="How did you hear about us?"
        value={referralSource}
        onChange={setReferralSource}
        placeholder="Instagram, a friend, etc."
      />

      <ErrorBanner msg={error} />

      <div style={{ display: 'flex', gap: 10 }}>
        <GhostButton label="Back" onTap={onBack} />
        <div style={{ flex: 1 }}>
          <GoldButton fullWidth label={loading ? 'Submitting…' : 'Request invite'} onTap={handleSubmit} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ONBOARDING
// ─────────────────────────────────────────────────────────────

const DEFAULT_EVENTS = ['Mehendi', 'Haldi', 'Sangeet', 'Baraat', 'Reception'];

function OnboardingFlow({ prefillCode, onComplete }: {
  prefillCode: string | null; onComplete: (s: CoupleSession) => void;
}) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([...DEFAULT_EVENTS]);
  const [customEvent, setCustomEvent] = useState('');
  const [weddingDate, setWeddingDate] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [codeData, setCodeData] = useState<any>(null);

  useEffect(() => {
    if (!prefillCode) return;
    fetch(`${API}/api/couple-codes/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: prefillCode }),
    }).then(r => r.json()).then(d => { if (d.success) setCodeData(d.data); }).catch(() => {});
  }, [prefillCode]);

  const toggleEvent = (ev: string) =>
    setSelectedEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]);

  const addCustomEvent = () => {
    const t = customEvent.trim();
    if (t && !selectedEvents.includes(t)) setSelectedEvents(prev => [...prev, t]);
    setCustomEvent('');
  };

  const [sessionInfo, setSessionInfo] = useState('');

  const handleSendOtp = async () => {
    const clean = phone.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) { setError('Please enter a valid 10-digit phone number'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/auth/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: clean }),
      });
      const d = await res.json();
      if (d.success) { setSessionInfo(d.sessionInfo || ''); setOtpSent(true); }
      else setError(d.error || 'Could not send OTP. Please try again.');
    } catch { setError('Network error. Please try again.'); }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 4) { setError('Please enter the OTP'); return; }
    setLoading(true); setError('');
    try {
      const verRes = await fetch(`${API}/api/auth/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionInfo, code: otp }),
      });
      const verD = await verRes.json();
      if (!verD.success) { setError(verD.error || 'Invalid OTP'); setLoading(false); return; }
      // OTP good — advance to password step
      setStep(5);
    } catch { setError('Network error. Please try again.'); }
    setLoading(false);
  };

  const handleCompleteOnboarding = async () => {
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== passwordConfirm) { setError('Passwords do not match'); return; }
    setLoading(true); setError('');
    const clean = phone.replace(/\D/g, '').slice(-10);
    try {
      const isFoundingBride = !!(prefillCode && codeData?.couple_tier === 'elite');
      const userRes = await fetch(`${API}/api/couple/onboard`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(), partner_name: partnerName.trim(),
          phone: '+91' + clean, wedding_date: weddingDate,
          events: selectedEvents,
          couple_tier: codeData?.couple_tier || 'free',
          founding_bride: isFoundingBride,
          access_code: prefillCode || null,
          password,
        }),
      });
      const ud = await userRes.json();
      if (!ud.success) { setError(ud.error || 'Could not create account'); setLoading(false); return; }

      const newSession: CoupleSession = {
        id: ud.data.id,
        name: name.trim(),
        partnerName: partnerName.trim(),
        weddingDate,
        events: selectedEvents,
        couple_tier: ud.data.couple_tier || 'free',
        coShareRole: 'owner',
        foundingBride: isFoundingBride || !!ud.data.founding_bride,
        token_balance: ud.data.token_balance || 0,
      };
      saveSession(newSession);
      onComplete(newSession);
    } catch { setError('Network error. Please try again.'); }
    setLoading(false);
  };

  const progressPct = (step / 5) * 100;

  return (
    <div style={{ minHeight: '100vh', background: C.cream, fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ padding: '52px 24px 0', maxWidth: 480, margin: '0 auto' }}>
        <div style={{ height: 2, background: C.border, borderRadius: 1, marginBottom: 36 }}>
          <div style={{ height: 2, background: C.gold, borderRadius: 1, width: `${progressPct}%`, transition: 'width 0.3s ease' }} />
        </div>

        {/* Step 1 — Name */}
        {step === 1 && (
          <div>
            <p style={{ fontSize: 10, color: C.muted, letterSpacing: '3px', textTransform: 'uppercase' as const, fontWeight: 500, margin: '0 0 12px' }}>Step 1 of 4</p>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, color: C.dark, margin: '0 0 8px', fontWeight: 400 }}>
              {"What's your name?"}
            </h2>
            <p style={{ fontSize: 14, color: C.muted, fontWeight: 300, margin: '0 0 28px', lineHeight: '22px' }}>
              Just your first name is fine.
            </p>
            <InputField label="Your name" value={name} onChange={setName} placeholder="Priya" />
            <ErrorBanner msg={error} />
            <GoldButton fullWidth label="Continue" onTap={() => {
              if (!name.trim()) { setError('Please tell us your name'); return; }
              setError(''); setStep(2);
            }} />
          </div>
        )}

        {/* Step 2 — Partner + Events */}
        {step === 2 && (
          <div>
            <p style={{ fontSize: 10, color: C.muted, letterSpacing: '3px', textTransform: 'uppercase' as const, fontWeight: 500, margin: '0 0 12px' }}>Step 2 of 4</p>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, color: C.dark, margin: '0 0 8px', fontWeight: 400 }}>
              {"And your partner's name?"}
            </h2>
            <p style={{ fontSize: 14, color: C.muted, fontWeight: 300, margin: '0 0 20px', lineHeight: '22px' }}>
              And which events are you planning?
            </p>
            <InputField label="Partner's name" value={partnerName} onChange={setPartnerName} placeholder="Arjun" />
            <p style={{ fontSize: 11, color: C.muted, fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, margin: '4px 0 10px' }}>
              Your events
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8, marginBottom: 12 }}>
              {DEFAULT_EVENTS.map(ev => (
                <button key={ev} onClick={() => toggleEvent(ev)} style={{
                  padding: '7px 14px', borderRadius: 20,
                  background: selectedEvents.includes(ev) ? C.dark : C.ivory,
                  border: `1px solid ${selectedEvents.includes(ev) ? C.dark : C.border}`,
                  color: selectedEvents.includes(ev) ? C.gold : C.muted,
                  fontSize: 13, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
                }}>{ev}</button>
              ))}
              {selectedEvents.filter(e => !DEFAULT_EVENTS.includes(e)).map(ev => (
                <button key={ev} onClick={() => toggleEvent(ev)} style={{
                  padding: '7px 14px', borderRadius: 20, background: C.dark,
                  border: `1px solid ${C.dark}`, color: C.gold,
                  fontSize: 13, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
                }}>{ev} ×</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              <input
                type="text" value={customEvent} onChange={e => setCustomEvent(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addCustomEvent(); }}
                placeholder="Add another event…"
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 10,
                  border: `1px solid ${C.border}`, background: C.ivory,
                  fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: C.dark, outline: 'none',
                }}
              />
              <button onClick={addCustomEvent} style={{
                padding: '10px 14px', borderRadius: 10,
                background: C.ivory, border: `1px solid ${C.border}`,
                color: C.muted, fontFamily: 'DM Sans, sans-serif', fontSize: 13, cursor: 'pointer',
              }}>Add</button>
            </div>
            <ErrorBanner msg={error} />
            <div style={{ display: 'flex', gap: 10 }}>
              <GhostButton label="Back" onTap={() => setStep(1)} />
              <div style={{ flex: 1 }}>
                <GoldButton fullWidth label="Continue" onTap={() => {
                  if (!partnerName.trim()) { setError("Please add your partner's name"); return; }
                  if (selectedEvents.length === 0) { setError('Please select at least one event'); return; }
                  setError(''); setStep(3);
                }} />
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Wedding date */}
        {step === 3 && (
          <div>
            <p style={{ fontSize: 10, color: C.muted, letterSpacing: '3px', textTransform: 'uppercase' as const, fontWeight: 500, margin: '0 0 12px' }}>Step 3 of 4</p>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, color: C.dark, margin: '0 0 8px', fontWeight: 400 }}>
              {"When's the big day?"}
            </h2>
            <p style={{ fontSize: 14, color: C.muted, fontWeight: 300, margin: '0 0 28px', lineHeight: '22px' }}>
              We use this to personalise your checklist and plan ahead with you.
            </p>
            <InputField label="Wedding date" value={weddingDate} onChange={setWeddingDate} type="date" />
            <ErrorBanner msg={error} />
            <div style={{ display: 'flex', gap: 10 }}>
              <GhostButton label="Back" onTap={() => setStep(2)} />
              <div style={{ flex: 1 }}>
                <GoldButton fullWidth label="Continue" onTap={() => {
                  if (!weddingDate) { setError('Please select your wedding date'); return; }
                  setError(''); setStep(4);
                }} />
              </div>
            </div>
          </div>
        )}

        {/* Step 4 — Phone + OTP */}
        {step === 4 && (
          <div>
            <p style={{ fontSize: 10, color: C.muted, letterSpacing: '3px', textTransform: 'uppercase' as const, fontWeight: 500, margin: '0 0 12px' }}>Step 4 of 5</p>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, color: C.dark, margin: '0 0 8px', fontWeight: 400 }}>
              {!otpSent ? 'Your phone number.' : 'Enter the code.'}
            </h2>
            <p style={{ fontSize: 14, color: C.muted, fontWeight: 300, margin: '0 0 28px', lineHeight: '22px' }}>
              {!otpSent
                ? "We'll send a one-time code to verify it's you."
                : `We sent a 6-digit code to +91 ${phone.replace(/\D/g, '').slice(-10)}.`}
            </p>
            {!otpSent ? (
              <>
                <div style={{ position: 'relative', marginBottom: 16 }}>
                  <span style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 15, color: C.muted, fontFamily: 'DM Sans, sans-serif',
                  }}>+91</span>
                  <input
                    type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="98765 43210"
                    style={{
                      width: '100%', boxSizing: 'border-box' as const,
                      padding: '12px 16px 12px 46px', borderRadius: 10,
                      border: `1px solid ${C.border}`, background: C.ivory,
                      fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: C.dark, outline: 'none',
                    }}
                  />
                </div>
                <ErrorBanner msg={error} />
                <div style={{ display: 'flex', gap: 10 }}>
                  <GhostButton label="Back" onTap={() => setStep(3)} />
                  <div style={{ flex: 1 }}>
                    <GoldButton fullWidth label={loading ? 'Sending…' : 'Send code'} onTap={handleSendOtp} />
                  </div>
                </div>
              </>
            ) : (
              <>
                <InputField label="6-digit code" value={otp} onChange={setOtp} type="tel" placeholder="123456" />
                <ErrorBanner msg={error} />
                <GoldButton fullWidth label={loading ? 'Verifying…' : 'Continue'} onTap={handleVerifyOtp} />
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <button onClick={() => { setOtpSent(false); setOtp(''); setError(''); }} style={{
                    background: 'none', border: 'none', color: C.muted,
                    fontSize: 12, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
                  }}>{"Didn't get it? Try again"}</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 5 — Set password */}
        {step === 5 && (
          <div>
            <p style={{ fontSize: 10, color: C.muted, letterSpacing: '3px', textTransform: 'uppercase' as const, fontWeight: 500, margin: '0 0 12px' }}>Step 5 of 5</p>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, color: C.dark, margin: '0 0 8px', fontWeight: 400 }}>
              Set a password.
            </h2>
            <p style={{ fontSize: 14, color: C.muted, fontWeight: 300, margin: '0 0 28px', lineHeight: '22px' }}>
              You'll use this to sign in from other devices. At least 8 characters.
            </p>
            <label style={{
              display: 'block', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
              fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
            }}>Password</label>
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                style={{
                  width: '100%', boxSizing: 'border-box' as const,
                  padding: '12px 52px 12px 16px', borderRadius: 10,
                  border: `1px solid ${C.border}`, background: C.ivory,
                  fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: C.dark, outline: 'none',
                }}
              />
              <button
                onClick={() => setShowPassword(v => !v)}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  padding: '6px 10px', borderRadius: 8,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: C.muted, fontSize: 11, fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
                }}
                type="button"
              >{showPassword ? 'Hide' : 'Show'}</button>
            </div>
            <label style={{
              display: 'block', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif',
              fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
            }}>Confirm password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)}
              placeholder="Type it again"
              autoComplete="new-password"
              style={{
                width: '100%', boxSizing: 'border-box' as const,
                padding: '12px 16px', borderRadius: 10,
                border: `1px solid ${C.border}`, background: C.ivory,
                fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: C.dark,
                outline: 'none', marginBottom: 14,
              }}
            />
            <ErrorBanner msg={error} />
            <GoldButton fullWidth
              label={loading ? 'Setting up…' : 'Complete'}
              onTap={handleCompleteOnboarding}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN APP — all hooks before any early return
// ─────────────────────────────────────────────────────────────

export default function CoupleApp() {
  const [session, setSession] = useState<CoupleSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [appMode, setAppMode] = useState<AppMode>(() => {
    if (typeof window === 'undefined') return 'plan';
    return (localStorage.getItem('tdw_app_mode') as AppMode) || 'plan';
  });
  useEffect(() => {
    try { localStorage.setItem('tdw_app_mode', appMode); } catch {}
  }, [appMode]);
  const [activeTab, setActiveTab] = useState<MainTab>('home');
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showDreamAi, setShowDreamAi] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [prefillCode, setPrefillCode] = useState<string | null>(null);

  // ── Back-swipe / browser back / Android hardware back ─────────────────
  const coupleNavRef = useRef<string[]>([]);
  const coupleBackExitRef = useRef(false);
  const coupleBackTimer = useRef<any>(null);
  const [backToast, setBackToast] = useState<string | null>(null);

  const cNavPush = (layer: string) => {
    coupleNavRef.current.push(layer);
    window.history.pushState({ tdw: layer }, '');
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.history.pushState({ tdw: 'root' }, '');

    const handlePop = () => {
      const layer = coupleNavRef.current.pop();
      if (!layer) {
        if (coupleBackExitRef.current) return;
        coupleBackExitRef.current = true;
        setBackToast('Tap back again to exit');
        if (coupleBackTimer.current) clearTimeout(coupleBackTimer.current);
        coupleBackTimer.current = setTimeout(() => { coupleBackExitRef.current = false; setBackToast(null); }, 2000);
        window.history.pushState({ tdw: 'root' }, '');
        return;
      }
      window.history.pushState({ tdw: 'restore' }, '');
      if (layer === 'profile') setShowProfile(false);
      else if (layer === 'templates') setShowTemplates(false);
      else if (layer === 'dreamai') setShowDreamAi(false);
      else if (layer === 'feedback') setShowFeedback(false);
      else if (layer === 'tool') setActiveTool(null);
      else if (layer === 'discover-profile' || layer === 'discover-filter' || layer === 'discover-layover' || layer === 'discover-feed-to-dash') {
        window.dispatchEvent(new CustomEvent('tdw-discover-back', { detail: layer }));
      }
    };

    window.addEventListener('popstate', handlePop);
    return () => {
      window.removeEventListener('popstate', handlePop);
      if (coupleBackTimer.current) clearTimeout(coupleBackTimer.current);
    };
  }, []);

  // Shared data hook — declared here so all children render against the
  // same tasks state. Hook is called on every render regardless of
  // whether session exists (hook-order discipline).
  const checklist = useCoupleData(session);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) setPrefillCode(code.toUpperCase().trim());
    const s = getSession();
    setSession(s);
    setLoading(false);
  }, []);

  const navTo = (tab: MainTab, tool?: string) => {
    setActiveTab(tab);
    setActiveTool(tool || null);
    if (tool) cNavPush('tool');
    window.scrollTo(0, 0);
  };

  const handleTabNav = (tab: MainTab) => {
    setActiveTab(tab);
    setActiveTool(null);
    window.scrollTo(0, 0);
  };

  const handleLogout = () => {
    clearSession();
    setSession(null);
    setShowProfile(false);
  };

  // Early returns — ALL hooks already declared above
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: C.cream,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: C.gold }}>
          The Dream Wedding
        </p>
      </div>
    );
  }

  if (!session) {
    if (prefillCode) {
      return <OnboardingFlow prefillCode={prefillCode} onComplete={s => setSession(s)} />;
    }
    return <EntryScreen onSessionRestore={s => setSession(s)} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: C.cream, fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', position: 'relative', minHeight: '100vh' }}>

        <TopBar
          mode={appMode}
          onSwitch={m => { setAppMode(m); setActiveTool(null); }}
          session={session}
          onProfileTap={() => { setShowProfile(true); cNavPush('profile'); }}
        />

        {appMode === 'discover' && <DiscoverTeaser session={session} cNavPush={cNavPush} onBackToPlan={() => setAppMode('plan')} />}

        {appMode === 'plan' && (
          <>
            {activeTool && (
              <ToolErrorBoundary onReset={() => setActiveTool(null)}>
                {activeTool === 'checklist' && (
                  <ChecklistTool
                    session={session}
                    tasks={checklist.tasks}
                    loading={checklist.loading}
                    onToggleComplete={checklist.toggleComplete}
                    onUpdate={checklist.updateTask}
                    onDelete={checklist.deleteTask}
                    onAdd={checklist.addTask}
                    onBack={() => setActiveTool(null)}
                  />
                )}
                {activeTool === 'budget' && (
                  <BudgetTool
                    session={session}
                    budget={checklist.budget}
                    expenses={checklist.expenses}
                    shagun={checklist.shagun}
                    loading={checklist.loading}
                    onUpdateBudget={checklist.updateBudget}
                    onAddExpense={checklist.addExpense}
                    onUpdateExpense={checklist.updateExpense}
                    onDeleteExpense={checklist.deleteExpense}
                    onAddShagun={checklist.addShagun}
                    onUpdateShagun={checklist.updateShagun}
                    onDeleteShagun={checklist.deleteShagun}
                    onBack={() => setActiveTool(null)}
                  />
                )}
                {activeTool === 'guests' && (
                  <GuestTool
                    session={session}
                    guests={checklist.guests}
                    loading={checklist.loading}
                    templates={checklist.waTemplates}
                    onAdd={checklist.addGuest}
                    onUpdate={checklist.updateGuest}
                    onDelete={checklist.deleteGuest}
                    onRefresh={checklist.refreshGuests}
                    onBack={() => setActiveTool(null)}
                  />
                )}
                {activeTool === 'moodboard' && (
                  <MoodboardTool
                    session={session}
                    pins={checklist.pins}
                    loading={checklist.loading}
                    templates={checklist.waTemplates}
                    onFetchPreview={checklist.fetchOGPreview}
                    onAdd={checklist.addPin}
                    onUpdate={checklist.updatePin}
                    onDelete={checklist.deletePin}
                    onBack={() => setActiveTool(null)}
                  />
                )}
                {activeTool === 'vendors' && (
                  <VendorTool
                    session={session}
                    vendors={checklist.vendors}
                    expenses={checklist.expenses}
                    loading={checklist.loading}
                    templates={checklist.waTemplates}
                    onAdd={checklist.addVendor}
                    onUpdate={checklist.updateVendor}
                    onDelete={checklist.deleteVendor}
                    onAddExpense={checklist.addExpense}
                    onUpdateExpense={checklist.updateExpense}
                    onDeleteExpense={checklist.deleteExpense}
                    onBack={() => setActiveTool(null)}
                  />
                )}
                {activeTool !== 'checklist' && activeTool !== 'budget' && activeTool !== 'guests' && activeTool !== 'moodboard' && activeTool !== 'vendors' && (
                  <ToolPlaceholder toolId={activeTool} session={session} onBack={() => setActiveTool(null)} />
                )}
              </ToolErrorBoundary>
            )}
            {!activeTool && activeTab === 'home' && (
              <HomeScreen
                session={session}
                onNavTo={navTo}
                tasks={checklist.tasks}
                loading={checklist.loading}
                onToggleComplete={checklist.toggleComplete}
                budget={checklist.budget}
                expenses={checklist.expenses}
                guests={checklist.guests}
                vendors={checklist.vendors}
              />
            )}
            {!activeTool && activeTab === 'plan' && (
              <MyWeddingScreen
                session={session}
                onToolOpen={id => { setActiveTool(id); cNavPush('tool'); }}
                tasks={checklist.tasks}
                budget={checklist.budget}
                expenses={checklist.expenses}
                guests={checklist.guests}
                pins={checklist.pins}
                vendors={checklist.vendors}
              />
            )}
            {!activeTool && activeTab === 'circle' && (
              <CircleScreen session={session} templates={checklist.waTemplates} />
            )}
          </>
        )}

        {/* Bottom nav — plan mode, no tool open */}
        {appMode === 'plan' && !activeTool && (
          <BottomNav active={activeTab} onNav={handleTabNav} />
        )}

        {/* Back bar — when inside a tool */}
        {appMode === 'plan' && activeTool && (
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            background: C.ivory, borderTop: `1px solid ${C.border}`,
            padding: 'max(8px, env(safe-area-inset-bottom)) 24px 8px',
            zIndex: 50, maxWidth: 480, margin: '0 auto',
          }}>
            <button onClick={() => setActiveTool(null)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}>
              <ChevronRight size={14} color={C.muted} style={{ transform: 'rotate(180deg)' }} />
              <span style={{ fontSize: 13, color: C.muted, fontFamily: 'DM Sans, sans-serif' }}>My Wedding</span>
            </button>
          </div>
        )}

        {/* DreamAi FAB */}
        {appMode === 'plan' && !activeTool && (
          <button
            onClick={() => { setShowDreamAi(true); cNavPush('dreamai'); }}
            style={{
              position: 'fixed',
              bottom: 'calc(max(8px, env(safe-area-inset-bottom)) + 64px)',
              right: 20, width: 48, height: 48, borderRadius: 24,
              background: C.dark, border: `1px solid ${C.goldBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(44,36,32,0.18)',
              cursor: 'pointer', zIndex: 45, padding: 0,
            }}
          >
            <Zap size={20} color={C.gold} />
          </button>
        )}

        {/* PAi FAB — visible on tool screens (not Home, not Discover) */}
        {appMode === 'plan' && activeTool && session && (
          <CouplePaiFloatingButton session={session} />
        )}

        {showDreamAi && (
          <DreamAiSheet
            session={session}
            onClose={() => setShowDreamAi(false)}
          />
        )}

        {/* Feedback button — floating, only in Plan mode, not inside tools */}
        {appMode === 'plan' && !activeTool && (
          <button
            onClick={() => setShowFeedback(true)}
            style={{
              position: 'fixed',
              bottom: 'calc(max(8px, env(safe-area-inset-bottom)) + 64px)',
              left: 20, padding: '6px 12px', borderRadius: 16,
              background: C.ivory, border: `1px solid ${C.goldBorder}`,
              cursor: 'pointer', zIndex: 45,
              fontSize: 11, color: C.goldDeep,
              fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
              letterSpacing: '0.5px',
              boxShadow: '0 2px 8px rgba(44,36,32,0.08)',
            }}
          >
            Beta · feedback
          </button>
        )}

        {showFeedback && (
          <FeedbackSheet
            session={session}
            onSubmit={checklist.submitFeedback}
            onClose={() => setShowFeedback(false)}
            activeTab={activeTab}
          />
        )}

        {checklist.showFoundingIntro && (
          <FoundingBrideIntro
            name={session.name}
            onDismiss={checklist.dismissFoundingIntro}
          />
        )}

        {!activeTool && <InstallPrompt />}

        {showProfile && (
          <ProfileOverlay
            session={session}
            onClose={() => setShowProfile(false)}
            onLogout={handleLogout}
            onOpenTemplates={() => { setShowProfile(false); setShowTemplates(true); }}
          />
        )}
        {showTemplates && (
          <TemplatesScreen
            session={session}
            templates={checklist.waTemplates}
            onBack={() => setShowTemplates(false)}
            onAdd={checklist.addTemplate}
            onUpdate={checklist.updateTemplate}
            onDelete={checklist.deleteTemplate}
          />
        )}
      </div>
      {backToast && (
        <div style={{
          position: 'fixed', bottom: 'calc(92px + env(safe-area-inset-bottom))', left: '50%',
          transform: 'translateX(-50%)',
          background: '#2C2420', color: '#FAF6F0',
          padding: '11px 18px', borderRadius: '50px',
          fontSize: '12px', fontFamily: 'DM Sans, sans-serif',
          letterSpacing: '0.3px', maxWidth: 'calc(100% - 40px)',
          boxShadow: '0 4px 20px rgba(26,20,16,0.3)',
          zIndex: 300, textAlign: 'center',
        }}>{backToast}</div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// PAi — Personal Assistant AI (couple side, Turn 9E)
// Invite-only during beta. Draggable FAB that lives on tool screens.
// ══════════════════════════════════════════════════════════════════════════

interface PaiStatusC {
  enabled: boolean;
  reason?: string;
  expires_at?: string | null;
  daily_cap?: number;
  daily_used?: number;
  daily_remaining?: number;
  pending_request?: any;
}

function CouplePaiFloatingButton({ session }: { session: CoupleSession }) {
  const storageKey = 'tdw_couple_pai_pos';
  const BTN_SIZE = 48;
  const MARGIN = 16;
  const BOTTOM_NAV_HEIGHT = 72;

  const [pos, setPos] = useState<{ x: number; y: number; edge: 'left' | 'right' | 'top' | 'bottom' }>(() => {
    if (typeof window === 'undefined') return { x: 0, y: 0, edge: 'right' };
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    const w = window.innerWidth;
    const h = window.innerHeight;
    return { x: w - BTN_SIZE - MARGIN, y: h - BTN_SIZE - BOTTOM_NAV_HEIGHT - MARGIN, edge: 'right' };
  });
  const [dragging, setDragging] = useState(false);
  const [livePos, setLivePos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; btnX: number; btnY: number; moved: boolean }>({
    startX: 0, startY: 0, btnX: 0, btnY: 0, moved: false,
  });
  const btnRef = useRef<HTMLButtonElement | null>(null);

  const [paiStatus, setPaiStatus] = useState<PaiStatusC | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [showRequest, setShowRequest] = useState(false);

  const userId = session.id;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetch(`${API}/api/pai/status?user_type=couple&user_id=${userId}`)
      .then(r => r.json())
      .then(d => { if (!cancelled && d.success) setPaiStatus(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const check = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (pos.x > w - BTN_SIZE || pos.y > h - BTN_SIZE) {
        setPos({ x: w - BTN_SIZE - MARGIN, y: h - BTN_SIZE - BOTTOM_NAV_HEIGHT - MARGIN, edge: 'right' });
      }
    };
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [pos.x, pos.y]);

  const snapToEdge = (x: number, y: number) => {
    if (typeof window === 'undefined') return { x, y, edge: 'right' as const };
    const w = window.innerWidth;
    const h = window.innerHeight;
    const distLeft = x;
    const distRight = w - (x + BTN_SIZE);
    const distTop = y;
    const distBottom = h - (y + BTN_SIZE);
    const min = Math.min(distLeft, distRight, distTop, distBottom);
    if (min === distLeft)   return { x: MARGIN, y: Math.min(Math.max(y, MARGIN), h - BTN_SIZE - MARGIN), edge: 'left' as const };
    if (min === distRight)  return { x: w - BTN_SIZE - MARGIN, y: Math.min(Math.max(y, MARGIN), h - BTN_SIZE - MARGIN), edge: 'right' as const };
    if (min === distTop)    return { x: Math.min(Math.max(x, MARGIN), w - BTN_SIZE - MARGIN), y: MARGIN + 60, edge: 'top' as const };
    return { x: Math.min(Math.max(x, MARGIN), w - BTN_SIZE - MARGIN), y: h - BTN_SIZE - BOTTOM_NAV_HEIGHT - MARGIN, edge: 'bottom' as const };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!btnRef.current) return;
    btnRef.current.setPointerCapture(e.pointerId);
    const rect = btnRef.current.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX, startY: e.clientY,
      btnX: rect.left, btnY: rect.top,
      moved: false,
    };
    setDragging(true);
    setLivePos({ x: rect.left, y: rect.top });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) dragRef.current.moved = true;
    setLivePos({
      x: dragRef.current.btnX + dx,
      y: dragRef.current.btnY + dy,
    });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging) return;
    setDragging(false);
    if (dragRef.current.moved && livePos) {
      const snapped = snapToEdge(livePos.x, livePos.y);
      setPos(snapped);
      if (typeof window !== 'undefined') {
        try { localStorage.setItem(storageKey, JSON.stringify(snapped)); } catch {}
      }
    } else {
      // Optimistic open — tolerate null paiStatus (loading state handled in render)
      if (paiStatus && !paiStatus.enabled) setShowRequest(true);
      else setShowSheet(true);
    }
    setLivePos(null);
    if (btnRef.current) btnRef.current.releasePointerCapture(e.pointerId);
  };

  const showBeta = paiStatus?.enabled;
  const renderX = dragging && livePos ? livePos.x : pos.x;
  const renderY = dragging && livePos ? livePos.y : pos.y;

  return (
    <>
      <button
        ref={btnRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onContextMenu={e => e.preventDefault()}
        aria-label="Open PAi"
        style={{
          position: 'fixed',
          top: renderY,
          left: renderX,
          width: BTN_SIZE, height: BTN_SIZE, borderRadius: BTN_SIZE / 2,
          background: C.dark, border: `1px solid ${C.goldBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: dragging ? '0 8px 24px rgba(44,36,32,0.3)' : '0 4px 16px rgba(44,36,32,0.18)',
          cursor: dragging ? 'grabbing' : 'pointer',
          zIndex: 45, padding: 0,
          touchAction: 'none',
          transition: dragging ? 'none' : 'top 0.2s ease, left 0.2s ease, box-shadow 0.2s ease',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
        } as any}
      >
        <Sparkles size={18} color={C.gold} strokeWidth={1.75} />
        {showBeta && (
          <span style={{
            position: 'absolute', bottom: -5, right: -4,
            background: C.goldDeep, color: '#fff',
            fontSize: 7, fontWeight: 700, letterSpacing: '0.5px',
            padding: '2px 5px', borderRadius: 8,
            fontFamily: 'DM Sans, sans-serif',
            pointerEvents: 'none' as const,
          }}>BETA</span>
        )}
      </button>

      {showSheet && (
        paiStatus === null ? (
          <CouplePaiLoadingSheet onClose={() => setShowSheet(false)} />
        ) : paiStatus.enabled ? (
          <CouplePaiSheet
            userId={userId}
            status={paiStatus}
            onClose={() => setShowSheet(false)}
            onSaved={() => {
              fetch(`${API}/api/pai/status?user_type=couple&user_id=${userId}`)
                .then(r => r.json()).then(d => { if (d.success) setPaiStatus(d); }).catch(() => {});
            }}
          />
        ) : (
          <CouplePaiRequestSheet
            userId={userId}
            hasPending={!!paiStatus.pending_request}
            onClose={() => setShowSheet(false)}
            onSubmitted={() => {
              fetch(`${API}/api/pai/status?user_type=couple&user_id=${userId}`)
                .then(r => r.json()).then(d => { if (d.success) setPaiStatus(d); }).catch(() => {});
            }}
          />
        )
      )}

      {showRequest && paiStatus && !paiStatus.enabled && (
        <CouplePaiRequestSheet
          userId={userId}
          hasPending={!!paiStatus?.pending_request}
          onClose={() => setShowRequest(false)}
          onSubmitted={() => {
            fetch(`${API}/api/pai/status?user_type=couple&user_id=${userId}`)
              .then(r => r.json()).then(d => { if (d.success) setPaiStatus(d); }).catch(() => {});
          }}
        />
      )}
    </>
  );
}

function CouplePaiOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(44,36,32,0.5)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.ivory,
          borderRadius: '18px 18px 0 0',
          padding: '20px 20px 24px',
          maxWidth: 480, width: '100%',
          maxHeight: '85vh', overflowY: 'auto',
          boxShadow: '0 -8px 24px rgba(44,36,32,0.15)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function CouplePaiHeader({ eyebrow, title, onClose }: { eyebrow: string; title: string; onClose: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
      <div>
        <div style={{
          fontSize: 9, fontWeight: 600, letterSpacing: '2.5px',
          color: C.goldDeep, textTransform: 'uppercase' as const,
        }}>{eyebrow}</div>
        <div style={{
          fontFamily: "'Playfair Display', serif", fontSize: 20,
          color: C.dark, fontWeight: 400, marginTop: 4, letterSpacing: '0.3px',
        }}>{title}</div>
      </div>
      <button onClick={onClose} style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: C.muted, padding: 4, fontFamily: 'inherit',
      }}>✕</button>
    </div>
  );
}

function CouplePaiLoadingSheet({ onClose }: { onClose: () => void }) {
  return (
    <CouplePaiOverlay onClose={onClose}>
      <CouplePaiHeader eyebrow="PAi · Beta" title="Checking access…" onClose={onClose} />
      <div style={{
        padding: 24, textAlign: 'center' as const,
        fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif',
      }}>
        One moment.
      </div>
    </CouplePaiOverlay>
  );
}

function CouplePaiSheet({ userId, status, onClose, onSaved }: {
  userId: string;
  status: PaiStatusC;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [input, setInput] = useState('');
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');
  const [parsed, setParsed] = useState<any>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [listening, setListening] = useState(false);
  const remaining = status.daily_remaining ?? 5;

  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Voice input is not supported on this browser.'); return; }
    const rec = new SR();
    rec.lang = 'en-IN';
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setInput(prev => prev ? prev + ' ' + text : text);
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  };

  const handleParse = async () => {
    if (!input.trim()) return;
    if (remaining <= 0) { setError('Daily cap reached. Come back tomorrow.'); return; }
    setParsing(true); setError(''); setParsed(null);
    try {
      const r = await fetch(`${API}/api/pai/parse`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_type: 'couple', user_id: userId, input_text: input.trim() }),
      });
      const d = await r.json();
      if (!d.success) { setError(d.error || 'Could not parse.'); setParsing(false); return; }
      if (d.parsed?.intent === 'unknown') {
        setError(d.parsed.preview_summary || 'Be more specific, please.');
        setParsing(false); return;
      }
      setParsed(d.parsed);
      setEventId(d.event_id || null);
    } catch { setError('Network error.'); } finally { setParsing(false); }
  };

  const handleConfirm = async () => {
    if (!parsed) return;
    setConfirming(true); setError('');
    try {
      const r = await fetch(`${API}/api/pai/confirm`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId, user_type: 'couple', user_id: userId,
          intent: parsed.intent, data: parsed.data,
        }),
      });
      const d = await r.json();
      if (!d.success) {
        setError(d.error === 'daily_cap_reached' ? 'Daily cap reached.' : (d.error || 'Could not save.'));
        setConfirming(false); return;
      }
      onSaved(); onClose();
    } catch { setError('Network error.'); setConfirming(false); }
  };

  const intentLabel: Record<string, string> = {
    create_checklist_item: 'Checklist Item',
    create_expense: parsed?.data?.kind === 'shagun' ? 'Shagun' : 'Expense',
    create_guest: 'Guest',
    create_moodboard_pin: 'Moodboard',
    update_vendor_stage: 'Vendor Update',
  };

  return (
    <CouplePaiOverlay onClose={onClose}>
      <CouplePaiHeader
        eyebrow={`PAi · Beta · ${remaining}/5 today`}
        title={parsed ? 'Does this look right?' : 'What would you like to add?'}
        onClose={onClose}
      />

      {!parsed ? (
        <>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <textarea
              value={input}
              onChange={e => { setInput(e.target.value); setError(''); }}
              placeholder="e.g. Add mom's dupattas to checklist"
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box' as const,
                padding: '12px 44px 12px 14px', borderRadius: 10,
                border: `1px solid ${C.border}`, background: C.pearl,
                fontSize: 14, fontFamily: 'inherit',
                outline: 'none', resize: 'none' as const,
              }}
            />
            <button
              onClick={startVoice}
              disabled={listening}
              aria-label="Voice input"
              style={{
                position: 'absolute' as const, top: 10, right: 10,
                width: 28, height: 28, borderRadius: 14,
                background: listening ? C.gold : 'transparent',
                border: `1px solid ${listening ? C.goldDeep : C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', padding: 0, fontSize: 12,
              }}
            >🎙</button>
          </div>

          {error && (
            <div style={{
              padding: '10px 12px', borderRadius: 8, marginBottom: 12,
              background: 'rgba(229,115,115,0.08)', border: '1px solid rgba(229,115,115,0.22)',
              color: '#C65757', fontSize: 12,
            }}>{error}</div>
          )}

          <button
            onClick={handleParse}
            disabled={parsing || !input.trim() || remaining <= 0}
            style={{
              width: '100%', padding: 14, borderRadius: 10,
              background: (parsing || !input.trim() || remaining <= 0) ? C.pearl : C.dark,
              color: C.gold, border: 'none',
              cursor: (parsing || !input.trim() || remaining <= 0) ? 'default' : 'pointer',
              fontSize: 12, fontWeight: 500, letterSpacing: '2px',
              textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
              opacity: (parsing || !input.trim() || remaining <= 0) ? 0.6 : 1,
            }}
          >{parsing ? 'Thinking…' : 'Parse'}</button>

          <div style={{
            marginTop: 12, padding: '10px 12px',
            background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
            borderRadius: 10, fontSize: 10, color: C.goldDeep, lineHeight: 1.5,
          }}>
            <strong>PAi is in Beta.</strong> 5 actions per day, 5-day access.
          </div>
        </>
      ) : (
        <>
          <div style={{
            padding: '14px 16px', borderRadius: 12,
            background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
            marginBottom: 14,
          }}>
            <div style={{
              fontSize: 9, fontWeight: 600, letterSpacing: '2px',
              color: C.goldDeep, textTransform: 'uppercase' as const, marginBottom: 6,
            }}>{intentLabel[parsed.intent] || parsed.intent}</div>
            <div style={{
              fontFamily: "'Playfair Display', serif", fontSize: 15,
              color: C.dark, fontWeight: 500, lineHeight: 1.4,
            }}>{parsed.preview_summary}</div>
          </div>

          <div style={{
            background: C.ivory, border: `1px solid ${C.border}`,
            borderRadius: 10, overflow: 'hidden', marginBottom: 14,
          }}>
            {Object.entries(parsed.data || {}).filter(([, v]) => v !== null && v !== undefined && v !== '').map(([k, v], i, arr) => (
              <div key={k} style={{
                padding: '10px 14px',
                borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none',
                display: 'flex', alignItems: 'flex-start', gap: 10,
              }}>
                <span style={{
                  fontSize: 10, color: C.muted, fontWeight: 500, letterSpacing: '0.5px',
                  textTransform: 'uppercase' as const, flexShrink: 0, minWidth: 90,
                }}>{k.replace(/_/g, ' ')}</span>
                <span style={{ fontSize: 12, color: C.dark, flex: 1, wordBreak: 'break-word' as const }}>
                  {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                </span>
              </div>
            ))}
          </div>

          {error && (
            <div style={{
              padding: '10px 12px', borderRadius: 8, marginBottom: 12,
              background: 'rgba(229,115,115,0.08)', border: '1px solid rgba(229,115,115,0.22)',
              color: '#C65757', fontSize: 12,
            }}>{error}</div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setParsed(null)} disabled={confirming} style={{
              flex: 1, padding: 12, borderRadius: 10,
              background: 'transparent', color: C.muted,
              border: `1px solid ${C.border}`, cursor: 'pointer',
              fontSize: 11, fontWeight: 500, letterSpacing: '1.5px',
              textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
            }}>Edit</button>
            <button onClick={handleConfirm} disabled={confirming} style={{
              flex: 2, padding: 12, borderRadius: 10,
              background: confirming ? C.pearl : C.dark, color: C.gold,
              border: 'none', cursor: confirming ? 'default' : 'pointer',
              fontSize: 11, fontWeight: 500, letterSpacing: '1.5px',
              textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
              opacity: confirming ? 0.6 : 1,
            }}>{confirming ? 'Saving…' : 'Confirm & Save'}</button>
          </div>
        </>
      )}
    </CouplePaiOverlay>
  );
}

function CouplePaiRequestSheet({ userId, hasPending, onClose, onSubmitted }: {
  userId: string;
  hasPending: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(hasPending);

  const submit = async () => {
    setSubmitting(true);
    try {
      await fetch(`${API}/api/pai/request-access`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_type: 'couple', user_id: userId, reason: reason.trim() || null }),
      });
      setDone(true);
      onSubmitted();
    } catch {} finally { setSubmitting(false); }
  };

  return (
    <CouplePaiOverlay onClose={onClose}>
      <CouplePaiHeader
        eyebrow="PAi · Beta"
        title={done ? 'Request received' : 'Request access to PAi'}
        onClose={onClose}
      />

      {done ? (
        <>
          <div style={{
            padding: '14px 16px', borderRadius: 12, marginBottom: 14,
            background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
          }}>
            <div style={{
              fontFamily: "'Playfair Display', serif", fontSize: 15,
              color: C.dark, fontWeight: 500, marginBottom: 4,
            }}>Thanks — we'll be in touch.</div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
              PAi is currently invite-only. We're granting access to a small group of founding couples during beta.
            </div>
          </div>
          <button onClick={onClose} style={{
            width: '100%', padding: 14, borderRadius: 10,
            background: C.dark, color: C.gold, border: 'none',
            cursor: 'pointer', fontSize: 12, fontWeight: 500,
            letterSpacing: '2px', textTransform: 'uppercase' as const,
            fontFamily: 'DM Sans, sans-serif',
          }}>Close</button>
        </>
      ) : (
        <>
          <div style={{ marginBottom: 14, fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
            <strong style={{ color: C.dark }}>PAi</strong> is your personal assistant. Type or speak what you want added — PAi handles the rest.
            <br /><br />
            "Add mom's dupattas to my checklist"
            <br />
            "Bua gave ₹21,000 shagun for sangeet"
            <br /><br />
            Invite-only during beta.
          </div>

          <div style={{
            fontSize: 10, color: C.muted, fontWeight: 500, letterSpacing: '1px',
            textTransform: 'uppercase' as const, marginBottom: 6,
          }}>Why you'd like PAi</div>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="I'm juggling so many details and want to capture them fast…"
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box' as const,
              padding: '12px 14px', borderRadius: 10,
              border: `1px solid ${C.border}`, background: C.pearl,
              fontSize: 14, fontFamily: 'inherit',
              outline: 'none', resize: 'none' as const, marginBottom: 14,
            }}
          />

          <button onClick={submit} disabled={submitting} style={{
            width: '100%', padding: 14, borderRadius: 10,
            background: submitting ? C.pearl : C.dark, color: C.gold,
            border: 'none', cursor: submitting ? 'default' : 'pointer',
            fontSize: 12, fontWeight: 500, letterSpacing: '2px',
            textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
            opacity: submitting ? 0.6 : 1,
          }}>{submitting ? 'Submitting…' : 'Request access'}</button>
        </>
      )}
    </CouplePaiOverlay>
  );
}
