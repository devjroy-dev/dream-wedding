# Theme Migration Guide — The Dream Wedding

## How to import

```tsx
import { TDW } from '../constants/theme';
// or cherry-pick:
import { colors, fonts, spacing, components } from '../constants/theme';
```

## Color Migration Map

| Hardcoded Value | Occurrences | TDW Token |
|---|---|---|
| '#F5F0E8' | 155 | TDW.colors.cream |
| '#C9A84C' | 357 | TDW.colors.gold |
| '#2C2420' | 423 | TDW.colors.dark |
| '#8C7B6E' | 338 | TDW.colors.grey |
| '#E8E0D5' | 207 | TDW.colors.border |
| '#FFFFFF' | 49 | TDW.colors.white |
| '#FFF8EC' | 35 | TDW.colors.lightGold |
| '#E8D9B5' | 29 | TDW.colors.goldBorder |
| '#C4B8AC' | 29 | TDW.colors.greyLight |
| '#4CAF50' | 29 | TDW.colors.success |
| '#E57373' | 6 | TDW.colors.error |
| '#FAF6F0' | 5 | TDW.colors.cream (use cream) |
| '#B8ADA4' | 1 | TDW.colors.greyMuted |
| '#5C4A3A' | 1 | TDW.colors.dark (close enough) |

## Font Migration Map

| Hardcoded Value | TDW Token |
|---|---|
| 'PlayfairDisplay_400Regular' | TDW.fonts.playfair |
| 'PlayfairDisplay_600SemiBold' | TDW.fonts.playfairBold |
| 'DMSans_400Regular' | TDW.fonts.sans |
| 'DMSans_300Light' | TDW.fonts.sansLight |
| 'DMSans_500Medium' | TDW.fonts.sansMedium |

## Component Style Migration — Before/After

### Screen container
BEFORE:  container: { flex: 1, backgroundColor: '#F5F0E8', paddingTop: 60 }
AFTER:   container: { ...TDW.components.screen, paddingTop: TDW.layout.screenPaddingTop }

### Card
BEFORE:  10 lines of backgroundColor, borderRadius, borderWidth, shadow etc.
AFTER:   card: { ...TDW.components.card }

### Category row padding
BEFORE:  paddingVertical: 16
AFTER:   paddingVertical: TDW.spacing.rowVertical (20 — more luxurious)

### Bottom nav
BEFORE:  hardcoded in each screen
AFTER:   bottomNav: { ...TDW.components.bottomNav }

### Typography
BEFORE:  { fontSize: 34, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular', letterSpacing: 0.3, lineHeight: 42 }
AFTER:   { ...TDW.typography.hero }

## Web globals.css — Alignment Update

Key changes to match mobile:
- --dark: #2C2420 (was #111827)
- --border: #E8E0D5 (was #E5E7EB)
- --grey: #8C7B6E (was #6B7280)
- --grey-light: #C4B8AC (was #9CA3AF)
- --green: #4CAF50 (was #16A34A)
- --text-primary: #2C2420 (was #111827)
- --text-muted: #8C7B6E (was #6B7280)
- --btn-primary: #2C2420 (was #111827)
- --btn-primary-text: #F5F0E8 (was #FFFFFF)

## Supabase Schema — Columns to Add to vendor_clients

ALTER TABLE vendor_clients
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS venue TEXT,
ADD COLUMN IF NOT EXISTS package_name TEXT,
ADD COLUMN IF NOT EXISTS total_amount INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'app';

## Bottom Nav Change

Current: Home | Moodboard | Messages | Planner | Spotlight
New:     Home | Moodboard | Messages | Planner | Profile

Spotlight moves to a horizontal scroll section inside Home screen.

## Onboarding Budget Order Fix

Current: 25L, 50L, 10L, 1Cr, 5Cr+, 5L (jumbled)
Fixed ascending order:
- 500000:   5L-10L   Intimate celebration
- 1000000:  10L-25L  Classic wedding
- 2500000:  25L-50L  Premium celebration
- 5000000:  50L-1Cr  Grand affair
- 10000000: 1Cr-5Cr  Luxury and destination
- 50000000: 5Cr+     Ultra luxury
