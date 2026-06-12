@AGENTS.md

## Project: Trip Planner PWA (saiparnstt)

Stack: Next.js App Router, React, TypeScript, Supabase, Tailwind v4
Deploy: Vercel + Supabase (ap-southeast-1, Singapore)
Repo: https://github.com/spstt/trip-planner-app

---

### App routes (app/)
```
app/
├── layout.tsx                          — root layout, fonts, PWA meta
├── page.tsx                            — redirect to /dashboard or /login
├── login/page.tsx                      — OAuth login (Google, Apple)
├── auth/callback/route.ts              — exchanges OAuth code for session (server)
├── invite/[token]/page.tsx             — join trip via invite link
└── (app)/
    ├── layout.tsx                      — bottom nav (5 tabs), session guard
    ├── dashboard/page.tsx              — trip list + create modal + theme switcher
    ├── explore/page.tsx                — explore destinations
    ├── packing/page.tsx                — global packing list
    ├── profile/page.tsx                — user profile, payment info
    └── trips/[id]/
        ├── layout.tsx                  — trip tabs (Overview/Plan/Expenses/Checklist/Bookings)
        ├── page.tsx                    — trip overview: banner, countdown, weather, members
        ├── itinerary/page.tsx          — day-by-day itinerary
        ├── expenses/page.tsx           — group expenses + settle up
        ├── checklist/page.tsx          — shared + personal checklist
        └── bookings/page.tsx           — flight/hotel bookings + attachments
```

### Components (components/)
```
trip/
  CreateTripModal.tsx    — create trip form, geocodes destination, auto-creates itinerary days + checklist
  TripCard.tsx           — trip card on dashboard
  CountdownTimer.tsx     — live countdown, CSS-variable themed
  TripReadiness.tsx      — readiness score + smart prompts
  WeatherWidget.tsx      — 7-day forecast, offline badge when cached
  SmartTravelTips.tsx    — weather-based packing advice (4 temp tiers), links to checklist
  InviteButton.tsx       — generates trip_invitations token, copies share link
  DestinationWidget.tsx  — destination info (Wikipedia photo fallback)

itinerary/
  AddItemModal.tsx       — Nominatim location search, inserts itinerary_items
  DayTimeline.tsx        — timeline + Haversine travel-time estimate
  BackupDrawer.tsx       — backup plan items
  ItemComments.tsx       — per-item comments

expenses/
  AddExpenseModal.tsx    — insert expense + participants loop, live FX rate
  EditExpenseModal.tsx   — update/delete expense (owner only), locked/live FX
  ExpenseItem.tsx        — displays expense, pencil button for owner
  SettleUpSheet.tsx      — displays debt settlement, copy payment info

bookings/
  AddBookingModal.tsx    — add booking (flight, hotel, etc.)
  BookingCard.tsx        — displays booking with attachments

map/
  MapView.tsx            — Leaflet map for itinerary items

ui/
  Toast.tsx              — toast notification component
```

### Lib / utilities (lib/)
```
lib/
├── supabase/
│   ├── client.ts        — createBrowserClient (for client components)
│   ├── server.ts        — createServerClient (for Server Components / Route Handlers)
│   └── middleware.ts    — updateSession() called by middleware.ts (root)
├── hooks/
│   └── useTheme.ts      — theme switcher hook: 'dark-slate' | 'warm-pastel', localStorage
├── stores/
│   └── trip-store.ts    — Zustand store (optimistic updates)
└── utils/
    ├── cn.ts            — clsx/tailwind-merge helper
    ├── debt.ts          — calculateDebts() greedy net-balance settle-up algorithm
    ├── destination.ts   — Wikipedia/Nominatim destination info fetch
    ├── offline.ts       — IndexedDB helpers (booking attachments offline)
    └── weather.ts       — Open-Meteo fetch + localStorage offline cache (network-first)
```

### Root files
```
middleware.ts            — Next.js middleware, calls updateSession (session refresh on every request)
types/index.ts           — all TypeScript interfaces mirroring Supabase schema
supabase/
  rls_policies.sql       — ALL RLS policies (run once in SQL Editor — DROP all first if re-running)
  functions/
    join_trip_by_token.sql — RPC function for invite link join (security definer)
```

---

### Supabase — Database Tables

| Table | Key columns | Notes |
|---|---|---|
| `profiles` | id (= auth.uid), display_name, avatar_url, default_currency, bank_account, promptpay | Created on user signup via trigger |
| `trips` | id, name, destination, destination_lat/lng, cover_image_url, start_date, end_date, is_international, created_by, locked_rates (jsonb), rates_locked_at | `locked_rates` = `{JPY: 0.24, ...}` THB per 1 foreign unit |
| `trip_members` | id, trip_id, user_id, role ('host'\|'member'), joined_at | RLS recursive — uses security definer functions |
| `trip_invitations` | id, trip_id, token, created_by, expires_at, max_uses, use_count | Joined via `join_trip_by_token` RPC |
| `itinerary_days` | id, trip_id, day_number, date, title | Auto-created by CreateTripModal on trip insert |
| `itinerary_items` | id, trip_id, day_id, title, location_name, lat, lng, start_time, duration_min, is_backup, sort_order, created_by | Realtime enabled |
| `item_comments` | id, item_id, trip_id, user_id, body, reactions (jsonb) | Per itinerary item |
| `checklist_items` | id, trip_id, title, is_shared, owner_id, is_checked, checked_by, checked_at, sort_order, created_by | Realtime enabled |
| `expenses` | id, trip_id, title, category, amount_foreign, currency, exchange_rate, amount_thb, split_type, paid_at, created_by | Realtime enabled |
| `expense_participants` | id, expense_id, trip_id, user_id, role ('payer'\|'splitter'), amount_thb | Realtime enabled |
| `bookings` | id, trip_id, category, title, booking_ref, provider, checkin_at, checkout_at, location, created_by | |
| `booking_attachments` | id, booking_id, trip_id, file_name, file_type, storage_path, file_size_bytes, uploaded_by | Files in Supabase Storage bucket `trip-covers` |
| `emergency_meetups` | id, trip_id, day_id, title, lat, lng, description, set_by | |

### Supabase — Storage Buckets
| Bucket | Usage |
|---|---|
| `trip-covers` | Trip banner cover images (uploaded by host) |

### Supabase — RLS summary
- **trips**: select = `is_trip_member OR created_by = auth.uid()`, insert = `auth.uid() = created_by`
- **trip_members**: uses `is_trip_member()` / `is_trip_host()` security definer functions to avoid infinite recursion
- **itinerary_items, checklist_items, expenses**: members can select/insert; creator can update/delete
- **All policies**: in `supabase/rls_policies.sql` — drop all existing policies on a table before re-running

### Supabase — Realtime
```sql
alter publication supabase_realtime add table
  itinerary_items, checklist_items, expenses, expense_participants, trip_members;
```

### Supabase — Security Definer Functions
```sql
-- ป้องกัน infinite recursion ใน trip_members policies
is_trip_member(trip_uuid uuid) returns boolean
is_trip_host(trip_uuid uuid) returns boolean

-- join ด้วย invite token
join_trip_by_token(p_token text) returns jsonb
```

### Supabase — Auth
- OAuth providers: Google, Apple
- Callback: `app/auth/callback/route.ts` (exchanges code → session via server client)
- Session stored in **cookies** via `@supabase/ssr`
- Middleware (`middleware.ts`) refreshes session on every request

---

### Design system
- CSS variables: `--bg`, `--s0/s1/s2` (surfaces), `--b0/b1` (borders), `--t1/t2/t3` (text hierarchy)
- Accents: `--indigo`, `--violet`, `--pink`, `--indigo-glow`
- Themes: default = **Dark Slate**; `[data-theme="warm-pastel"]` overrides all variables
- Utility classes: `.glass`, `.shimmer`, `.pressable`, `.btn-primary`, `.spring-enter`, `.fade-up`, `.input`, `.bottom-sheet`, `.scroll-container`
- Body is `position: fixed` (PWA) — scrollable areas use `.scroll-container`
- Bottom nav height: `var(--nav-height)`; safe area: `var(--safe-bottom)`

### External APIs
| API | Usage | Auth |
|---|---|---|
| Open-Meteo | Weather forecast (fetchWeather in lib/utils/weather.ts) | None (free) |
| Nominatim / OpenStreetMap | Geocoding destination & location search | None (free) |
| open.er-api.com | Live FX rates | None (free) |
| Wikipedia / Wikimedia | Destination image + description | None (free) |

---

### Features done
- Theme switcher: Dark Slate / Warm Pastel — bottom sheet on dashboard, persists in localStorage
- Trip banner: priority = cover_image_url (host upload) > Wikipedia photo > gradient fallback
- SmartTravelTips: reads Open-Meteo avg temp → 4 clothing tiers, umbrella if rainy ≥ 2 days
- Real-time member list: supabase.channel on trip_members reloads on any change
- Offline weather cache: writeCache on success, readCache (any age) as fallback on network error
- FX rate lock: host can lock rates per trip; locked rate used in AddExpenseModal automatically
- Expense edit/delete: EditExpenseModal, owner-only pencil button in ExpenseItem
- Settle-up: calculateDebts() — net balance per user → greedy creditor/debtor matching
- Invite system: InviteButton generates token, join_trip_by_token RPC handles joining

### Known issues / in progress
- **trips INSERT RLS**: `auth.uid()` appears null in RLS evaluation despite user being logged in
  - Symptom: HTTP 403 on `POST /rest/v1/trips`, `Authorization: Bearer` header may be missing
  - Added `refreshSession()` before insert in CreateTripModal as workaround — awaiting confirmation
  - Root cause suspect: JWT not sent in request headers from createBrowserClient
