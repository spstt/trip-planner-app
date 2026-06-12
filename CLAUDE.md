@AGENTS.md

## Project: Trip Planner PWA (saiparnstt)

Stack: Next.js App Router, React, TypeScript, Supabase, Tailwind v4
Deploy: Vercel + Supabase (ap-southeast-1, Singapore)

### Key paths
- Trip overview:    app/(app)/trips/[id]/page.tsx
- Itinerary:        app/(app)/trips/[id]/itinerary/page.tsx
- Expenses:         app/(app)/trips/[id]/expenses/page.tsx
- Checklist:        app/(app)/trips/[id]/checklist/page.tsx
- Dashboard:        app/(app)/dashboard/page.tsx
- Bottom nav:       app/(app)/layout.tsx
- Trip layout/tabs: app/(app)/trips/[id]/layout.tsx
- Invite page:      app/invite/[token]/page.tsx
- Design tokens:    app/globals.css (CSS variables + [data-theme="warm-pastel"])
- Types:            types/index.ts
- Weather util:     lib/utils/weather.ts (network-first + localStorage offline cache)
- Debt algorithm:   lib/utils/debt.ts (greedy net-balance settle-up)
- Theme hook:       lib/hooks/useTheme.ts (localStorage, sets data-theme on <html>)

### Key components
- components/trip/SmartTravelTips.tsx   — weather-based packing advice, links to checklist
- components/trip/WeatherWidget.tsx     — 7-day forecast, shows offline badge from cache
- components/trip/InviteButton.tsx      — generates trip_invitations token, copies link
- components/trip/CountdownTimer.tsx    — live countdown using CSS variables (theme-aware)
- components/trip/TripReadiness.tsx     — readiness score + smart prompts (all CSS vars)
- components/itinerary/AddItemModal.tsx — Nominatim location search + insert itinerary_items
- components/itinerary/DayTimeline.tsx  — timeline + Haversine travel-time estimate
- components/expenses/AddExpenseModal.tsx  — insert expenses + participants loop, live FX
- components/expenses/EditExpenseModal.tsx — update/delete expense (owner only)
- components/expenses/ExpenseItem.tsx   — shows edit button only to creator
- components/expenses/SettleUpSheet.tsx — displays debts, copy payment info

### Supabase tables
trips, trip_members, trip_invitations,
itinerary_days, itinerary_items,
checklist_items,
expenses, expense_participants,
bookings, booking_attachments,
profiles, item_comments, emergency_meetups

### Supabase config
- RLS policies:  supabase/rls_policies.sql  (run once in SQL Editor)
- Invite RPC:    supabase/functions/join_trip_by_token.sql
- Realtime:      itinerary_items, checklist_items, expenses, expense_participants, trip_members
- itinerary_days auto-created by DB trigger on trips INSERT

### Features done
- Theme switcher: Dark Slate / Warm Pastel — bottom sheet on dashboard, persists in localStorage
- Trip banner: priority = cover_image_url (host upload) > Wikipedia photo > gradient fallback
- SmartTravelTips: reads Open-Meteo avg temp → 4 clothing tiers, umbrella if rainy days ≥ 2
- Real-time member list: supabase.channel on trip_members reloads on any change
- Offline weather cache: writeCache on success, readCache (any age) as fallback on network error
- FX rate lock: host can lock rates per trip; locked rate used in AddExpenseModal automatically
- Expense edit/delete: EditExpenseModal, owner-only pencil button in ExpenseItem
- Settle-up: calculateDebts() — net balance per user → greedy creditor/debtor matching

### Design system
- CSS variables: --bg, --s0/s1/s2 (surfaces), --b0/b1 (borders), --t1/t2/t3 (text hierarchy)
- --indigo, --violet, --pink, --indigo-glow (accent palette)
- Warm Pastel overrides: [data-theme="warm-pastel"] in globals.css
- Utility classes: .glass, .shimmer, .pressable, .btn-primary, .spring-enter, .fade-up
- Body is position:fixed (PWA) — scrollable areas use .scroll-container
